/**
 * dash.js
 *
 * This file is used to build the dash views (html & json)
 * Each exported method should expect the `next` callback
 */

/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var Q = require('q');

var db = require('./db');

module.exports = {
  appAndApi : appAndApi,
  appOnly : appOnly
};

/**
 * Sends back most recent set of App and API data
 * @param  {Function} next Callback. Should accept (appData, apiData)
 */
function appAndApi(next, fail) {
  Q.all([db.app.current(), db.api.current()]).then(function(results) {
    next(results[0], results[1]);
  }, fail);
}

/**
 * Sends back the most recent set of just App data
 * @param  {Function} next Callback. Should accept (appData)
 */
function appOnly(next, fail) {
  db.app.current().then(function(appData) {
    next(appData);
  }, fail);
}
