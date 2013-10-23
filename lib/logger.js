/**
 * logger.js
 *
 * This file is the intake for all log-posting requests.
 */

/**
 * TODO: move the heroku actions, and mailer actions OUT of this controller. Into a different file at the very least.
 *
 */


/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var Q = require('q')
  , bson = require('bson')
  , HerokuAPI = require('heroku.js')
  , sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

var db = require('./mongoClient')
  , config = require('./config')
  , debug = require('debug')('logger')
  , debug_2 = require('debug')('changelog')
  , change = require('./change_log')
  , util = require('./util')
  , heroku;

try {
  heroku = new HerokuAPI({"email" : process.env.HEROKU_EMAIL, "apiToken" : process.env.HEROKU_API_TOKEN});
} catch (e) {
  // No penalty if Heroku configuration isn't defined
}

module.exports = logger;

/**
 * Parses req.body into the required log formats
 * @param  {Object}   content req.body from the log resource
 * @param  {Function} next    Callback. Should accept only status code
 */
function logger(content, next) {
  // console.log(content);
  var alertTitle = content.alert_title.replace(/\./g, ':')
    , timestamp = new Date().getTime()
    , timeBucket = Math.floor(timestamp/config.bucketLength) // This should create buckets at 5-minute intervals
    , dfds = []
    , type , i, l, _rel;

  // These are the ONLY req.body.alert_title we accept
  switch (alertTitle) {
  case 'status:dashboard:frontier:mem_response':
    type = 'app';
    break;
  case 'status:dashboard:frontier:api:flat_response_data':
    type = 'api';
    break;
  case 'status:dashboard:frontier:heroku_errors':
    type = 'herokuErrors';
    break;
  case 'status:dashboard:frontier:app_to_api_map':
    type = 'appToApiMap';
    break;
  default:
    // Anything else invokes "stranger danger"
    console.warn("I NEED AN ADULT!!!");
    console.info(content);
    return next(400);
  }

  // Sometimes the req.body.data needs a little extra massaging
  if (typeof content.data === 'string') {
    try {
      content.data = JSON.parse(content.data);
    } catch (e) {
      console.warn(e);
      return next(500);
    }
  }

  // We want to save off the RAW log with just a timestamp
  dfds.push(createRawStatus(content, timestamp));
  // We also want to save off the log using the raw buckets of
  // everything we've gotten in this bucket-time
  dfds.push(createRawBucket(alertTitle, content.data, timeBucket));

  /**
   * If we're looking at Heroku errors, we want to stick them
   * into the appBuckets, but we need to format them first to
   * match the other App-level data (mem_response)
   */


  if (type === 'herokuErrors') {
    content.data = restructureHerokuErrors(content.data);
    for (i=0, l=content.data.length; i<l; i++) {
      dfds.push(createAppBucket(alertTitle, content.data[i], timeBucket, type));
    }
  }

  // Apps are saved in buckets
  if (type === 'app') {
    for (i=0, l=content.data.length; i<l; i++) {
      dfds.push(createAppBucket(alertTitle, content.data[i], timeBucket, type));
    }
  }

  // API information is a one-shot, so no bucket necessary
  if (type === 'api') {
    for (i=0, l=content.data.length; i<l; i++) {
      _rel = content.data[i];
      dfds.push(createApiStatus(alertTitle, _rel, timestamp));
    }
  }

  if (type === 'appToApiMap') {
    dfds.push(db.saveApiMap(content.data));
  }

  // After all the simultaneous stores, send back "created"
  Q.all(dfds).then(function() {
    next(201);
  });
}


/**
 * Simply resolves the deferred objects
 * @param  {Q.defer} dfd  Q deferred object
 */
function getAsyncResolve(dfd) {
  return function () {
    dfd.resolve();
  };
}

/**
 * Saves the raw record with just a timestamp
 * This is site-wide data
 * @param  {Object} data       Full req.body, probably
 * @param  {Number} timestamp  Epoch timestamp
 * @return {Promise}           Q.defer().promise
 */
function createRawStatus(data, timestamp) {
  var dfd = Q.defer();
  data.timestamp = timestamp;
  data.created_at = bson.Timestamp(Date.now()); //creates BSON timestamp that allows mongo to auto-expire base on INDEX
  db.mongo.rawStatus.save(data, getAsyncResolve(dfd));
  return dfd.promise;
}

/**
 * Saves the record with other  records in the same timeBucket
 * @param  {string} alertTitle  req.body.alert_title
 * @param  {Object} data        Full req.body, probably
 * @param  {Number} timeBucket  Timestamp/timeBucketSize
 * @return {Promise}            Q.defer().promise
 */
function createRawBucket(alertTitle, data, timeBucket) {
  var dfd = Q.defer();
  db.mongo.rawBucket.findOne({ "timeBucket" : timeBucket }, function(err, doc) {
    doc = doc || { "timeBucket" : timeBucket, "created_at": bson.Timestamp(Date.now()) }; //creates BSON timestamp that allows mongo to auto-expire base on INDEX
    doc[alertTitle] = data;
    db.mongo.rawBucket.save(doc, getAsyncResolve(dfd));
  });
  return dfd.promise;
}

/**
 * Stores the app data in a bucket by timeBucket
 * @param  {String} alertTitle  req.body.alert_title
 * @param  {Object} data        The app data
 * @param  {Number} timeBucket  The timestamp/timeBucketSize
 * @param  {String} type        herokuErrors | app
 * @return {Promise}            Q.defer().promise
 */
function createAppBucket(alertTitle, data, timeBucket, type) {
  var appName = data.fs_host
    , dfd = Q.defer();

  debug("appName | timeBucket: " + appName + " | " + timeBucket);

  //get the 2 most recent docs, so we can compare uptime_status
  //get the current timeBucket, and 1 older, and sort by newest first
  db.mongo.appBucket.find({ "timeBucket" : { $lte: timeBucket }, "appName" : appName }).sort({"timeBucket": -1}).limit(2, function(err, docs) {

    //if the first returned doesn't match the current time, it hasn't been created yet.
    //then we should create a new one
    if( timeBucket !== docs[0].timeBucket) {
      docs[1] = docs[0]; //assign the first as second, so it'll be treated as the previous bucket
      docs[0] = false; //wipe out the first return
    }

    var doc = docs[0] || {
      "timeBucket" : timeBucket,
      "appName" : appName,
      "status:dashboard:frontier:mem_response" : {},
      "status:dashboard:frontier:heroku_errors" : {},
      "created_at": bson.Timestamp(Date.now()) //generates BSON timestamp so we can auto expire using mongoDB index
    };

    doc[alertTitle] = data;
    //set and attach the uptime status now, since we have the data we need. (FIXME: what happens when there isn't data?)

    //if app type (not heroku_errors), calc & set the uptime status. AND prepare pretty app stats
    if (type === "app") { //TODO: seems to be too busy here. Pull this out somewhere else? Maybe to the prep app stats?
      doc["uptime_status"] = util.getStatus(doc["status:dashboard:frontier:mem_response"], "app");
      // //set the previous status
      doc["uptime_status_prev"] = util.getStatus(docs[1]["status:dashboard:frontier:mem_response"], "app");

      //if there was a status change, log it to the change_log Q: Is this the right place?
      logStatusChange(doc["uptime_status"], doc["uptime_status_prev"], appName);

      //prepare some pretty stats data from the raw data (this will add a .stats {} obj to the doc)
      doc = prepAppStats(doc);
    } else if (type === "herokuErrors") {
      //add the heroku errors to .stats {}
      doc.stats = doc.stats || {}; //get stats if exists, else create it
      doc.stats.heroku_errors = doc["status:dashboard:frontier:heroku_errors"];
    }


    //console.log('current', doc);
    // console.log('current', docs[1].timeBucket);
    db.mongo.appBucket.save(doc, function(err, docs) {
      if (err) {
        debug('error saving appBucket: ' + err);
      } else {
        debug('saved app bucket', doc);
      }

      getAsyncResolve(dfd)(); //resolved
    });



  });

  return dfd.promise;
}

/**
 * Prepares the 'stats' properties from the data, that will be used for display in the views
 * TODO: add a function to 're-generate' the stats, and uptime status in case rules change for existing data...
 * @param  {Obj} doc    document with raw data ready to be injected into DB
 * @return {Obj} doc    document with added '.stats {}' property with pretty stats ready for views
 */
function prepAppStats(doc) {
  //get the stats data we care about...
  var _data = doc["status:dashboard:frontier:mem_response"];

  doc.stats = { //take normal values and do any processing necessary
    uptime_status: util.getStatus(_data, 'app'),
    memory_avg: parseInt(_data['mem:avg'], 10) || 0,
    memory_max: parseInt(_data['mem:max'], 10) || 0,
    p95: _data['time:p95'],
    status_2xx: _data['status:2xx'],
    status_3xx: _data['status:3xx'],
    status_4xx: _data['status:4xx'],
    status_5xx: _data['status:5xx'],
    status_total: _data['status:total'],
    error_rate: parseInt(_data['status:5xx'] / _data['status:total'] * 100),
    timestamp: util.getUnixStamp(doc.timeBucket)
  };

  return doc;
}

/**
 * Prepares the 'stats' properties from the data, that will be used for display in the views
 * TODO: add a function to 're-generate' the stats, and uptime status in case rules change for existing data...
 * @param  {Obj} doc    document with raw data ready to be injected into DB
 * @return {Obj} doc    document with added '.stats {}' property with pretty stats ready for views
 */
function prepAPIStats(doc) {
  //prep the pretty stats
  doc.stats = {
    uptime_status: util.getStatus(doc, 'api'),
    p95: doc['time:p95'],
    status_2xx: doc['status:2xx'],
    status_3xx: doc['status:3xx'],
    status_4xx: doc['status:4xx'],
    status_5xx: doc['status:5xx'],
    status_total: doc['status:total'],
    error_rate: parseInt(doc['status:5xx'] / doc['status:total'] * 100),
    timestamp: util.getUnixStamp(doc.timestamp)
  };

  return doc;
}

/**
 * Stores the API data in a bucket by timeBucket
 * @param  {String} alertTitle  req.body.alert_title
 * @param  {Object} data        The API data
 * @param  {Number} timestamp   Epoch timestamp
 * @return {Promise}            Q.defer().promise
 */
function createApiStatus(alertTitle, data, timestamp) {
  var dfd = Q.defer();

  data.alertTitle = alertTitle;
  data.timestamp = timestamp;
  // console.log("timestamp - API STATUS: ", timestamp);
  data.created_at = bson.Timestamp(Date.now()); //creates BSON timestamp that allows mongo to auto-expire base on INDEX
  // console.log("data.created_at ", data.created_at);
  data = prepAPIStats(data); //generate the .stats {} property

  db.mongo.apiStatus.save(data, getAsyncResolve(dfd)); //save

  return dfd.promise;
}


/**
 * Determines if there was an uptime status change. If so, log it to the change log.
 * TODO: (Later) Fire and alert / action at this point
 * @param  {String} status_current  Current uptime status
 * @param  {String} status_prev  Previous uptime status
 * @param  {String} app_name  Name of the app
 */
function logStatusChange(status_current, status_prev, app_name) {
  debug_2("logStatusChange", status_prev, app_name);
  if (status_current !== status_prev) {

    //only log if current OR previous was DOWN (or else too much noise, at least until we have filtering...)
    if (status_current !== "down" &&  status_prev !== "down") return;

    //log the status change in the change_log
    //Q: Should this send a timestamp along with it?
    change.save({
      payload: { //matches webhook standard.
        data : {
          app_name : app_name,
          uptime_status: status_current,
          uptime_status_prev: status_prev
        },
        src: "marrow",
        type: "marrow info:statusChange"
      }

    }, function() { debug_2("logStatusChange:save", "saved");}, "marrow");
  }
}


/**
 * Regenerates the 'stats' properties of the APP and API buckets. This is an admin task
 * that can help regenerate every time the rules for uptime change (or similar changes).
 * FIXME: should this be moved to a standalone script? Calling this from an endpoint just doesn't make sense.
 */
function regenerateAppStats() {
  //raw mongo query to regen the data
  db.mongo.appBucket.find().sort({"timeBucket": -1}, function(err, docs) {
    console.log("regenerateAppStats LENGTH", docs.length);


  });

    //since this is an one-off admin task, shouldn't this just be done from the command line?

    //regenerate stats




    //purge docs older than 1 week

}

/**
 * Reformats the Heroku Errors into
 * AppData-structured data. This allows it to
 * be injected into the "createAppBucket" method
 * @param  {Object} data Heroku data
 * @return {Object}      New Heroku data in appData format
 */
function restructureHerokuErrors(data) {
  var i, l, _rel, _hRel, appName
    , herokuErrors = {}
    , newData = []
    , toRestart = [];
  for (i=0, l=data.length; i<l; i++) {
    _rel = data[i];
    _hRel = herokuErrors[_rel.fs_host];
    if (! herokuErrors[_rel.fs_host]) {
      _hRel = herokuErrors[_rel.fs_host] = {
        "fs_host" : _rel.fs_host,
        "codes" : []
      };
    }
    // We want to restart apps on R14
    if (_rel.code === 'R14') {
      toRestart.push(_rel.fs_host);
    }
    delete _rel.fs_host;
    _hRel.codes.push(_rel);
  }
  for (appName in herokuErrors) {
    if (! herokuErrors.hasOwnProperty(appName)) continue;
    newData.push(herokuErrors[appName]);
  }
  restartHerokuApps(toRestart);
  return newData;
}

function restartHerokuApps(appList) {
  var appNames = [];
  if (! appList.length) return;
  appList = appList.filter(function(name) {
    if (appNames.indexOf(name) === -1) {
      appNames.push(name);
      restartHerokuApp(name);
      return true;
    }
    return false;
  });

  return;
}

function restartHerokuApp(appName) {
  // No penalty if Heroku configuration isn't defined
  if (! (heroku && appName)) return;

  heroku.restart(appName, function(err, resp) {
    if (err) return console.error(err);

    //Q: Should this send a timestamp along with it?
    change.save({
      payload: { //matches webhook standard.
        data : {
          app_name : appName
        },
        src: "marrow",
        type: "marrow restart"
      }

    }, function() {}, "marrow");

    sendgrid.send({
      to: process.env.RESTART_EMAIL_TO,
      from: process.env.RESTART_EMAIL_FROM,
      subject: 'Automatic app restart',
      text: 'The Heroku app "' + appName + '" has been automatically restarted. Be advised.'
    }, function(err, json) {
      if (err) return console.error(err);
      // console.info(json);
    });
  });
}
