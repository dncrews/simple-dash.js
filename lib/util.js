/**
 * util.js
 *
 * This file has all of the methods that are used all over the place.
 *
 * TODO: The DB stuff should be extracted into the `DB` library.
 */

/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var Q = require('q');

var db = require('./mongoClient')
  , config = require('./config');

module.exports = {
  getUXDate : getUXDate,
  getStatus : getStatus
};

function getUXDate(timestamp) {
  var date, dd, hours, minutes, seconds;
  if ((timestamp.toString()).length < 13) {
    // We're working with a timeBucket
    timestamp = timestamp * config.bucketLength;
  }

  date = new Date(timestamp);
  dd = date.getDate();
  hours = date.getHours();
  minutes = date.getMinutes();
  seconds = date.getSeconds();

  function pad(unit) {
    var s = unit.toString();

    while (s.length < 2) {
      s += '0';
    }

    return s;
  }

  return '' + hours + ':' + pad(minutes) + ':' + pad(seconds) || '';
}


/**
 * Returns the status of the app
 *
 * Requires ['time:p95'], ['status:5xx'], ['status:total']
 *
 * @param  {Object} data The log of the app at that time.
 * @param  {String} type Either 'app' or 'api', at the moment
 * @return {String}      Status of the app
 */
function getStatus(data, type){
  var slow = {
    'app' : 5000,
    'api' : 1000
  };
  if (! slow[type]) type = 'app';
  var p95 = parseInt(data['time:p95'], 10) || 0
    , s5xx = parseInt(data['status:5xx'], 10) || 0
    , sTotal = parseInt(data['status:total'], 10) || 0;

  // if (!sTotal) return 'unknown'; // if there was no traffic
  if ((s5xx / sTotal ) > 0.5) return 'down'; //if error rate > 50%
  if (p95 > slow[type]) return 'slow'; //if response time is slower than 5 secs

  return "good"; //if no error flags were thrown, set status to 'good'
}
