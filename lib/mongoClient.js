/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var Q = require('q');

var databaseUrl = process.env.databaseUrl || process.env.MONGOHQ_URL
  , collections = [ 'appBucket', 'apiStatus', 'rawBucket', 'rawStatus' ]
  , mongo = require('mongojs').connect(databaseUrl, collections);

module.exports = {
  mongo : mongo,
  getApiRecent : getApiRecent,
  getRecent : getRecent,
  getAppBucket : getAppBucket,
  getAPIBucket : getAPIBucket
};


function getApiRecent() {
  var dfd = Q.defer()
    , apiNames = [];

  // Get all (200 most recent) time buckets for all apps
  mongo.apiStatus.find().sort({ "timestamp" : -1, "api": 1 }).limit(200, function(err, docs) {
    // Remove all duplicate apiNames
    docs = docs.filter(function(el) {
      if (apiNames.indexOf(el.api) === -1) {
        apiNames.push(el.api);
        return true;
      }
      return false;
    });
    dfd.resolve(docs);
  });

  return dfd.promise;
}

function getRecent() {
  var dfd = Q.defer()
    , appNames = [];

  // Get all (200 most recent) time buckets for all apps
  mongo.appBucket.find().sort({ "timeBucket" : -1, "appName": 1 }).limit(200, function(err, docs) {
    if (err) {
      console.warn(err);
      dfd.reject();
    }
    // Remove all duplicate appNames
    docs = docs && docs.filter(function(el) {
      if (appNames.indexOf(el.appName) === -1) {
        appNames.push(el.appName);
        return true;
      }
      return false;
    });
    dfd.resolve(docs);
  });

  return dfd.promise;
}

function getAppBucket(appName) {
  var dfd = Q.defer();
  mongo.appBucket.find({ "appName" : appName }).sort({ timeBucket : -1 }, function(err, docs) {
    if (err) {
      return dfd.reject(err);
    }
    dfd.resolve(docs);
  });
  return dfd.promise;
}

function getAPIBucket(apiName) {
  var dfd = Q.defer();
  mongo.apiStatus.find({ "api" : apiName }).sort({ timestamp : -1 }, function(err, docs) {
    if (err) {
      return dfd.reject(err);
    }
    dfd.resolve(docs);
  });
  return dfd.promise;
}
