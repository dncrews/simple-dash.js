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
  , util = require('./util');

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
    db.getApiRecent()
  ]).then(function (results) {
    var docs = results[0]
      , apiDocs = results[1]
      , DATA_KEY = 'status:dashboard:frontier:mem_response'
      , current = docs[0][DATA_KEY]
      , ERROR_KEY = 'status:dashboard:frontier:heroku_errors'
      , current_errors = docs[0][ERROR_KEY].codes
      , _rel, _data, status_data;

    current.timestamp = docs[0].timestamp;

    //TODO: keep history that is TODAY
    //TODO: show history by 5 min increments and output time

    var status_history = [];
    //parse the docs for a status timeline
    for(var i=0; i< docs.length; i++) {
      _rel = docs[i];
      _data = _rel[DATA_KEY];
      //if timestamp is available, use get the time data
      status_data = {
        time: {
          raw: _rel.timeBucket,
          pretty: util.getUXDate(_rel.timeBucket)
        },
        memory: parseInt(_data['mem:avg'], 10) || 0,
        status: util.getStatus(_data, 'app')
      };

      //add to the status_history array
      status_history.push(status_data);
    } //for()

    next({
      api_data: apiDocs,
      app_id: appName,
      status_history: status_history,
      current: current,
      heroku_errors: current_errors,
      page_type: "app",
      updated : docs[0].timeBucket
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
      , _rel, status_data;
    //parse the docs for a status timeline
    for(var i=0; i< docs.length; i++) {
      _rel = docs[i];
      //prep status obj
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
      status_history: status_history,
      current : current,
      page_type: "api",
      updated : docs[0].timestamp
    });
  });
}
