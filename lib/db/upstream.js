/**********************
 *
 * Api-specific Stuff
 *
 *********************/

/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var mongo = require('./mongo')
  , Q = require('q')
  , request = require('superagent')
  , debug = require('debug')('db:upstream');

// If we rename db collections, I don't want to have to keep changing that everywhere
var db = mongo.upstream_status;

module.exports = {
  log: log
};


function errHandler(logs, dfd, err) {
  debug.apply(debug, logs);
  dfd.reject(err);
}

/**
 * Log all upstreams that we know/care about
 * @return {promise} Q.promise
 */
function log() {
  var dfd = Q.defer();
  logHerokuStatus().then(dfd.resolve);
  return dfd.promise;
}


/**
 * Get and log Heroku Status
 * @return {promise} Q.promise
 */
function logHerokuStatus() {
  var dfd = Q.defer();

  request
    .get('https://status.heroku.com/api/v3/current-status')
    .set('Accept', 'application/json')
    .end(function(res){
      // if any errors, abort.
      if (!res.ok) {
        console.log('Oh no! error checking for heroku status: ' + res.text);
        return dfd.reject();
      }

      // hit heroku with the status
      var doc = {
        data: res.body,
        created_at: new Date(),
        src: "heroku_status_api"
      };
      debug('Logging Heroku Status', doc);

      //save the status to mongo
      mongo.upstream_status.save(doc, function(err, resp) {
        if (err) return errHandler(['logHerokuStatus err: ', err], dfd, err);
        debug('logHerokuStatus success');
        dfd.resolve(resp);
      });

    });

  return dfd.promise;

}
