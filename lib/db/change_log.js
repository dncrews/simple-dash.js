/******************
 *
 * Change Log Stuff
 *
 ******************/

/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var mongo = require('./mongo')
  , Q = require('q')
  , debug = require('debug')('db:change_log');

var db = mongo.change_log;

module.exports = {
  save: addLog,
  history: getHistory,
  appHistory: getHistoryByApp
};


function errHandler(logs, dfd, err) {
  debug.apply(debug, logs);
  dfd.reject(err);
}

function addLog(doc) {
  var dfd = Q.defer();

  db.insert(doc, function(err, resp) {
    if (err) return errHandler(['addLog save failed: ', err], dfd, err);
    debug('addLog save success: ', doc);
    dfd.resolve();
  });

  return dfd.promise;
}

/**
 * Get most recent [20] change log entries
 * TODO: this should be limited by date rather than count
 * @return {promise} Q.promise
 */
function getHistory() {
  var dfd = Q.defer();

  db.find()
    .sort({ "timestamp" : -1})
    .limit(20, function(err, docs) {
      if (err) return errHandler(['getHistory err: ', err], dfd, err);
      debug('getHistory docs: ', docs.length);
      dfd.resolve(docs);
    });

  return dfd.promise;
}

/**
 * Get most recent [20] change log entries
 * @return {promise} Q.promise
 */
function getHistoryByApp(appName) {
  var dfd = Q.defer()
    , appNames = [];

  //FIXME: this data-sanitization here feels dirty. Should we normalize this in the DB?
  //strip out the -prod|-test for the changelog
  var app_name_clean = appName.match(/(fs-\w+)/i)[1];
  //if it's a repo, just extract the 'photos'. Ignore suffix and prefix
  var repo_name = appName.match(/fs-(\w+)/i)[1];

  debug('getHistoryByApp app_name_clean: ' + app_name_clean);
  debug('getHistoryByApp repo_name: ' + repo_name);

  //find the app by repo_name OR app_name
  db.find({
      $or: [
        { "data.repo_name": repo_name },
        { "data.app_name": app_name_clean }
      ]
    })
    .sort({ "timestamp" : -1})
    .limit(20, function(err, docs) {
      if (err) return errHandler(['getHistoryByApp err: ', err], dfd, err);
      debug('getHistoryByApp docs: ', docs.length);
      dfd.resolve(docs);
    });

  return dfd.promise;
}
