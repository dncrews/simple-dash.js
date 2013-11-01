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
  , HerokuAPI = require('heroku.js')
  , request = require('superagent')
  , sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

var db = require('./db')
  , config = require('./config')
  , debug = require('debug')('logger')
  , debug_2 = require('debug')('changelog')
  , change = require('./change_log')
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
    //save the heroku status
    dfds.push(db.upstream.log()); //FIXME: does this go here? Placing here to ensure this happens only once every 5 min or so.

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
    dfds.push(db.api.updateMap(content.data));
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
  Q.all([
    db.app.getBucket(appName, timeBucket), // results[0]
    db.app.getPreviousStatus(appName, timeBucket) // results[1]
  ])
    .then(function(results) {
      var doc = results[0]
        , prevStatus = results[1];

      doc = doc || {
        "timeBucket" : timeBucket,
        "appName" : appName,
        "status:dashboard:frontier:mem_response" : {},
        "status:dashboard:frontier:heroku_errors" : {},
        "created_at": new Date() //generates BSON timestamp (driver auto-converts) so we can auto expire using mongoDB index
      };

      doc[alertTitle] = data;
      if (! doc.uptime_status_prev) doc.uptime_status_prev = prevStatus;
      doc = db.app.generateStats(doc);

      logStatusChange(doc.uptime_status, doc.uptime_status_prev, appName);
      db.app
        .save(doc)
        .then(function(){
          debug('saved appBucket', doc);
          dfd.resolve();
        }, function(err){
          debug('error saving appBucket: ' + err);
          dfd.reject(err);
        });
    }, function fail(err) {
      console.error(arguments);
      dfd.reject(err);
    });

  return dfd.promise;
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
  data.created_at = new Date(); //creates BSON timestamp (driver auto-converts) that allows mongo to auto-expire base on INDEX
  // console.log("data.created_at ", data.created_at);
  data = db.api.generateStats(data); //generate the .stats {} property

  db.api.save(data).then(dfd.resolve, dfd.reject);

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

    }, "marrow").then(function() {
      debug_2("logStatusChange:save", "saved");
    });
  }
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

    }, "marrow");

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
