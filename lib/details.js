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

var db = require('./db')
  , config = require('./config');

module.exports = {
  app : appDetail,
  api : apiDetail,
  upstream: upstreamDetail
};

/**
 * Sends back this App's most recent data
 * @param  {string}   appName The name of the app
 * @param  {Function} next    Callback. Should accept object to render
 */
function appDetail(appName, next) {

  Q.all([
    db.app.history(appName),
    db.api.appCurrent(appName),
    db.change_log.appHistory(appName)
  ]).then(function (results) {
    var docs = results[0]
      , apiDocs = results[1]
      , events = results[2]
      , DATA_KEY = 'status:dashboard:frontier:mem_response'
      , current = docs[0].stats
      , ERROR_KEY = 'status:dashboard:frontier:heroku_errors'
      , current_errors = docs[0][ERROR_KEY].codes
      , _rel, _data, _errors, status_data;

    docs[0].timestamp = docs[0].timestamp;


    next({
      app_history: docs,
      api_data: apiDocs,
      app_id: appName,
      events: events,
      //status_history: status_history,
      current: current,
      heroku_errors: current_errors,
      page_type: "app",
      updated : docs[0].timeBucket * config.bucketLength
    });
  }, function fail() {
    console.log(arguments);
  });
}

/**
 * Sends back this API's most recent data
 * @param  {string}   apiName The name of the API
 * @param  {Function} next    Callback. Should accept object to render
 */
function apiDetail(apiName, next) {
  db.api.history(apiName).then(function(docs) {
    //TODO: keep history that is TODAY
    //TODO: show history by 5 min increments and output time

    var status_history = []
      , current = docs[0]
      , app_history = docs
      , _rel, status_data;

    next({
      app_id: apiName,
      app_history: docs,
      // status_history: status_history,
      current : docs[0].stats,
      page_type: "api",
      updated : docs[0].timestamp
    });
  });
}

/**
 * Sends back this Upstream's most recent data
 * @param  {string}   upstream The name of the API
 * @param  {Function} next     Callback. Should accept object to render
 */
function upstreamDetail(upstream, next) {
  db.upstream.history(upstream).then(function(docs) {
    //TODO: keep history that is TODAY
    //TODO: show history by 5 min increments and output time

    var current = docs[0]
      , history = docs
      , _rel, status_data;

    next({
      app_id: upstream,
      history: docs,
      current : docs[0],
      updated : docs[0].created_at
    });
  });
}
