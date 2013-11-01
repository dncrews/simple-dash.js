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

module.exports = fetchData;

/**
 * Sends back most recent set of App and API data
 * @param  {Function} next Callback. Should accept (appData, apiData)
 */
function fetchData(next, fail) {
  Q.all([db.app.current(), db.api.current(), db.upstream.current()]).then(function(results) {
    next(results[0], results[1], results[2]);
  }, fail);
}
