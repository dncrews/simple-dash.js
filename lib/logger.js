/**
 * logger.js
 *
 * This file is the intake for all log-posting requests.
 */

/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var Q = require('q')
  , HerokuAPI = require('heroku.js')
  , sendgrid = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

var db = require('./mongoClient')
  , config = require('./config')
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
  var alertTitle = content.alert_title.replace(/\./g, ':')
    , timestamp = new Date().getTime()
    , timeBucket = Math.floor(timestamp/config.bucketLength) // This should create buckets at 5-minute intervals
    , dfds = []
    , type , i, l, _rel, herokuErrors, _hRel, appName;

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
    type = 'app';
  }

  // Apps are saved in buckets
  if (type === 'app') {
    for (i=0, l=content.data.length; i<l; i++) {
      _rel = content.data[i];
      dfds.push(createAppBucket(alertTitle, _rel, timeBucket));
    }
  }

  // API information is a one-shot, so no bucket necessary
  if (type === 'api') {
    for (i=0, l=content.data.length; i<l; i++) {
      _rel = content.data[i];
      dfds.push(createApiStatus(alertTitle, _rel, timestamp));
    }
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
    doc = doc || { "timeBucket" : timeBucket };
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
 * @return {Promise}            Q.defer().promise
 */
function createAppBucket(alertTitle, data, timeBucket) {
  var appName = data.fs_host
    , dfd = Q.defer();

  db.mongo.appBucket.findOne({ "timeBucket" : timeBucket, "appName" : appName }, function(err, doc) {
    doc = doc || {
      "timeBucket" : timeBucket,
      "appName" : appName,
      "status:dashboard:frontier:mem_response" : {},
      "status:dashboard:frontier:heroku_errors" : {}
    };

    doc[alertTitle] = data;
    db.mongo.appBucket.save(doc, getAsyncResolve(dfd));
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
  db.mongo.apiStatus.save(data, getAsyncResolve(dfd));

  return dfd.promise;
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
    var to = process.env.RESTART_EMAIL_TO
      , from = process.env.RESTART_EMAIL_FROM;

    // Attempt to parse an array literal
    try {
      to = JSON.parse(to);
    } catch (e) {
      to = process.env.RESTART_EMAIL_TO;
    }

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
