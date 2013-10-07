/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var Q = require('q');

var databaseUrl = process.env.databaseUrl || process.env.MONGOHQ_URL
  , config = require('./config')
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
    , apiNames = []
    , day1 = new Date();

  day1.setDate(day1.getDate() - 2);
  day1 = day1.getTime();

  // Get all (200 most recent) time buckets for all apps
  mongo.apiStatus.find({timestamp:{$gte: day1}}).sort({ "timestamp" : -1, "api": 1 }).limit(200, function(err, docs) {
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
    , appNames = []
    , day1 = new Date();

  day1.setDate(day1.getDate() - 2);
  day1 = day1.getTime();
  day1 = Math.floor(day1/config.bucketLength);

  // Get all (200 most recent) time buckets for all apps
  mongo.appBucket.find({timeBucket:{$gte: day1}}).sort({ "timeBucket" : -1, "appName": 1 }).limit(200, function(err, docs) {
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
  var dfd = Q.defer()
    , day1 = new Date();

  day1.setDate(day1.getDate() - 2);
  day1 = day1.getTime();
  day1 = Math.floor(day1/config.bucketLength);

  mongo.appBucket.find({ "appName" : appName, timeBucket:{$gte: day1} }).sort({ timeBucket : -1 }, function(err, docs) {
    if (err) {
      return dfd.reject(err);
    }
    dfd.resolve(docs);
  });
  return dfd.promise;
}

function getAPIBucket(apiName) {
  var dfd = Q.defer()
    , day1 = new Date();

  day1.setDate(day1.getDate() - 2);
  day1 = day1.getTime();
  mongo.apiStatus.find({ "api" : apiName, timestamp:{$gte: day1} }).sort({ timestamp : -1 }, function(err, docs) {
    if (err) {
      return dfd.reject(err);
    }
    dfd.resolve(docs);
  });
  return dfd.promise;
}
