/**
 * details.js
 *
 * This file is used to build the details views (html)
 * Each exported method should expect the <type>Name
 * (currently appName, apiName) and the `next` callback
 */

/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var Q = require('q');

var db = require('./mongoClient')
  , util = require('./util')
  , config = require('./config');

module.exports = {
  app : appDetail,
  api : apiDetail
};

/**
 * Sends back this App's most recent data
 * @param  {string}   appName The name of the app
 * @param  {Function} next    Callback. Should accept object to render
 */
function appDetail(appName, next) {

  Q.all([
    db.getAppBucket(appName),
    db.getAppApiRecent(appName),
    db.getRecentEvents(appName)
  ]).then(function (results) {
    var docs = results[0]
      , apiDocs = results[1]
      , events = results[2]
      , DATA_KEY = 'status:dashboard:frontier:mem_response'
      , current = docs[0][DATA_KEY]
      , ERROR_KEY = 'status:dashboard:frontier:heroku_errors'
      , current_errors = docs[0][ERROR_KEY].codes
      , _rel, _data, _errors, status_data;

    current.timestamp = docs[0].timestamp;

    //TODO: keep history that is TODAY
    //TODO: show history by 5 min increments and output time

    var status_history = [];
    //parse the docs for a status timeline
    for(var i=0; i< docs.length; i++) {
      _rel = docs[i];
      _data = _rel[DATA_KEY];
      _errors = _rel[ERROR_KEY];
      //if timestamp is available, use get the time data

      //attach uptime status (we calc that based on business rules)
      _rel.stats = { //take normal values and do any processing necessary
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
        heroku_errors: _errors.codes,
        timestamp: util.getUnixStamp(_rel.timeBucket)
      };

      //we don't really need this anymore. TODO: Deprecate & REMOVE
      status_data = {
        time: {
          raw: _rel.timeBucket,
          pretty: util.getUXDate(_rel.timeBucket)
        },
        memory: parseInt(_data['mem:avg'], 10) || 0,
        status: util.getStatus(_data, 'app'),
        p95: _data['time:p95'],
        error_rate: parseInt(_data['status:5xx'] / _data['status:total'] * 100),
        heroku_errors: JSON.stringify(_errors.codes)
      };

      //add to the status_history array
      status_history.push(status_data);
    } //for()

    next({
      app_history: docs,
      api_data: apiDocs,
      app_id: appName,
      events: events,
      status_history: status_history,
      current: current,
      heroku_errors: current_errors,
      page_type: "app",
      updated : docs[0].timeBucket * config.bucketLength
    });
  });
}

/**
 * Sends back this API's most recent data
 * @param  {string}   apiName The name of the API
 * @param  {Function} next    Callback. Should accept object to render
 */
function apiDetail(apiName, next) {
  db.getAPIBucket(apiName).then(function(docs) {
    //TODO: keep history that is TODAY
    //TODO: show history by 5 min increments and output time

    var status_history = []
      , current = docs[0]
      , app_history = docs
      , _rel, status_data;
    //parse the docs for a status timeline
    for(var i=0; i< docs.length; i++) {
      _rel = docs[i];
      //prep status obj
      app_history[i].stats = {
        uptime_status: util.getStatus(_rel, 'api'),
        p95: _rel['time:p95'],
        status_2xx: _rel['status:2xx'],
        status_3xx: _rel['status:3xx'],
        status_4xx: _rel['status:4xx'],
        status_5xx: _rel['status:5xx'],
        status_total: _rel['status:total'],
        error_rate: parseInt(_rel['status:5xx'] / _rel['status:total'] * 100),
        timestamp: util.getUnixStamp(_rel.timestamp)
      };


      status_data = {
        time: {
          raw: _rel.timestamp,
          pretty: util.getUXDate(_rel.timestamp)
        },
        status: util.getStatus(_rel, 'api')
      };

      //add to the status_history array
      status_history.push(status_data);
    } //for()

    next({
      app_id: apiName,
      app_history: app_history,
      status_history: status_history,
      current : current,
      page_type: "api",
      updated : docs[0].timestamp
    });
  });
}
