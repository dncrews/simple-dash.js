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
  , debug_changes = require('debug')('logger:changelog')
  , change = require('./change_log')
  , heroku;

try {
  heroku = new HerokuAPI({"email" : process.env.HEROKU_EMAIL, "apiToken" : process.env.HEROKU_API_TOKEN});
} catch (e) {
  // No penalty if Heroku configuration isn't defined
}

module.exports = Logger;

/**
 * Parses req.body into the required log formats
 * @param  {Object}   content req.body from the log resource
 * @param  {Function} next    Callback. Should accept only status code
 */
function Logger (content) {
  this.title = content.alert_title.replace(/\./g, ':');
  this.date = new Date();
  this.timestamp = this.date.getTime();
  this.bucket = Math.floor(this.timestamp/config.bucketLength); // This should create buckets at 5-minute intervals
  this.dfds = [];

  // Sometimes the req.body.data needs a little extra massaging
  if (typeof content.data === 'string') {
    try {
      content.data = JSON.parse(content.data);
    } catch (e) {
      console.warn(e);
      this.parseFailed = true;
      return this;
    }
  }

  this.content = content;
  this.data = content.data;
  return this;
}

Logger.prototype.log = function log(next) {
  if (this.parseFailed === true) {
    return next(500);
  }
  var title = this.title;

  if (typeof this[title] === 'undefined') {
    // Anything else invokes "stranger danger"
    console.warn("I NEED AN ADULT!!!");
    console.info(this.content);
    return next(400);
  }

  this[title]();

  // After all the simultaneous stores, send back "created"
  Q.all(this.dfds).then(function() {
    next(201);
  }, function failure () {
    console.error(arguments);
    next(500);
  });
};

Logger.prototype['status:dashboard:frontier:mem_response'] = function appLogger() {
  var i, l, data = this.data;
  for (i=0, l=data.length; i<l; i++) {
    this.createApiStatus(data[i]);
  }
};

Logger.prototype['status:dashboard:frontier:api:flat_response_data'] = function apiLogger() {
  var i, l, data = this.data;
  for (i=0, l=data.length; i<l; i++) {
    this.createApiStatus(data[i]);
  }
};

Logger.prototype['status:dashboard:frontier:heroku_errors'] = function herokuErrorLogger() {
  var i, l
    , data = restructureHerokuErrors(this.data);

  for (i=0, l=data.length; i<l; i++) {
    this.createAppBucket(data[i]);
  }
};

Logger.prototype['status:dashboard:frontier:app_to_api_map'] =   function mapLogger() {
  this.dfds.push(db.api.updateMap(this.data));
};

Logger.prototype['status:dashboard:frontier:ha_proxy_status_codes'] =   function haProxyLogger() {
  this.dfds.push(db.upstream.haProxy(this.content));
};


/**
 * Stores the API data by timestamp and adds
 * a the Deferred object to this.dfds
 *
 * @param  {Object} data        The individual API data
 * @return null
 */
Logger.prototype.createApiStatus = function createApiStatus(doc) {
  var dfd = Q.defer();
  this.dfds.push(dfd.promise);

  doc.alertTitle = this.title;
  doc.timestamp = this.timestamp;
  doc.created_at = this.date;
  doc = db.api.generateStats(doc);
  db.api.save(doc).then(dfd.resolve, dfd.reject);
};

/**
 * Stores the app data in a bucket by timeBucket
 * and adds a the Deferred object to this.dfds
 *
 * @param  {Object} data        The individual app data
 * @return null
 */
Logger.prototype.createAppBucket = function createAppBucket(data) {
  var appName = data.fs_host
    , timeBucket = this.bucket
    , dfd = Q.defer()
    , _this = this;
  this.dfds.push(dfd.promise);

  debug("appName | timeBucket: " + appName + " | " + timeBucket);

  // Get current app bucket, and get status from the previous one
  Q.all([
    db.app.getBucket(appName, timeBucket), // results[0]
    db.app.getPreviousStatus(appName, timeBucket) // results[1]
  ])
    .then(function(results) {
      var doc
        , prevStatus = results[1];

      doc = results[0] || {
        "timeBucket" : timeBucket,
        "appName" : appName,
        "status:dashboard:frontier:mem_response" : {},
        "status:dashboard:frontier:heroku_errors" : {},
        "created_at": _this.date //generates BSON timestamp (driver auto-converts) so we can auto expire using mongoDB index
      };

      doc[_this.title] = data;
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
};

/**
 * Reformats the Heroku Errors into
 * AppData-structured data. This allows it to
 * be injected into the "createAppBucket" method
 *
 * @param  {Object} data Heroku data
 * @return {Object}      Reformatted Heroku data
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

/**
 * Determines if there was an uptime status change. If so, log it to the change log.
 * TODO: (Later) Fire and alert / action at this point
 *
 * @param  {String} status_current  Current uptime status
 * @param  {String} status_prev  Previous uptime status
 * @param  {String} app_name  Name of the app
 */
function logStatusChange(current, prev, app_name) {
  if (current !== prev) {
    debug_changes("logStatusChange (" + app_name + "); From: " + prev + " To: " + current);

    //only log if current OR previous was DOWN (or else too much noise, at least until we have filtering...)
    if (current !== "down" &&  prev !== "down") return;

    //log the status change in the change_log
    //Q: Should this send a timestamp along with it?
    change.save({
      payload: { //matches webhook standard.
        data : {
          app_name : app_name,
          uptime_status: current,
          uptime_status_prev: prev
        },
        src: "marrow",
        type: "marrow info:statusChange"
      }

    }, "marrow").then(function() {
      debug_changes("logStatusChange:save", "saved");
    }, function() {
      debug_changes("logStatusChange:save", "failed");
    });
  }
}

/**
 * Accepts a list of apps to restart. Filters them for
 * duplicates. Calls to restart each app
 *
 * @param  {Array} appList  List of apps that need to restart
 * @return null
 */
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

/**
 * Restarts the Heroku app if heroku information is set
 *
 * @param  {String} appName Name of the Heroku app
 * @return null
 */
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
