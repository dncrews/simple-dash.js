/**********************
 *
 * Api-specific Stuff
 *
 *********************/

/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var mongo = require('./mongo')
  , mongojs = require('mongojs')
  , Q = require('q')
  , debug = require('debug')('db:api');

var config = require('../config')
  // If we rename db collections, I don't want to have to keep changing that everywhere
  , db = {
    status : mongo.api_status,
    map : mongo.api_map
  };

module.exports = {
  save: save,
  history: getHistory,
  current: getCurrent,
  appCurrent: getCurrentByApp,
  map: getMap,
  updateMap: updateApiMap,
  generateStats: generateStats,
  regenerateStats: regenerateStats
};


function errHandler(logs, dfd, err) {
  debug.apply(debug, logs);
  dfd.resolve();
}

function save(doc) {
  var dfd = Q.defer();
  db.status
    .save(doc, function(err, resp) {
      if (err) return errHandler(['save Err: ', err], dfd, err);
      debug('Api save succes: ', doc);
      dfd.resolve();
    });
  return dfd.promise;
}

function getCurrent() {
  var dfd = Q.defer();

  // Get all (200 most recent) time buckets for all apis
  db.status
    .find()
    .sort({
      "timestamp" : -1,
      "api": 1
    })
    .limit(200, function(err, docs) {
      if (err) return errHandler(['getCurrent err: ', err], dfd, err);
      var apiNames = [];
      debug('getCurrent results: ', docs.length);
      // Remove all duplicate apiNames
      docs = docs.filter(function(el) {
        if (apiNames.indexOf(el.api) === -1) {
          apiNames.push(el.api);
          return true;
        }
        return false;
      });
      debug('getCurrent filtered results: ', docs.length);
      dfd.resolve(docs);
    });

  return dfd.promise;
}

function getCurrentByApp(appName) {
  var dfd = Q.defer()
    , apiNames = [];

  getMap(appName).done(function(list) {
    db.status
      .find({ "api": { $in: list } })
      .sort({
        "timestamp" : -1,
        "api": 1
      })
      .limit(200, function(err, docs) {
        if (err) return errHandler(['getCurrentByApp err: ', err], dfd, err);

        debug('getCurrentByApp results: ', docs.length);
        // Remove all duplicate apiNames
        docs = (docs || []).filter(function(el) {
          if (apiNames.indexOf(el.api) === -1) {
            apiNames.push(el.api);
            return true;
          }
          return false;
        });
        debug('getCurrentByApp filtered results: ', docs.length);
        dfd.resolve(docs);
      });
  });

  return dfd.promise;
}

function getHistory(apiName) {
  var dfd = Q.defer()
    , begin = new Date();

  begin.setDate(begin.getDate() - config.detailsDayCount);
  begin = begin.getTime();
  db.status
    .find({
      "api" : apiName,
      "timestamp": {
        $gte: begin
      }
    })
    .sort({ "timestamp" : -1 }, function(err, docs) {
      if (err) return errHandler(['getHistory err: ', err], dfd, err);
      debug('getHistory results: ', docs.length);
      dfd.resolve(docs);
    });
  return dfd.promise;
}

function getMap(appName) {
  var dfd = Q.defer(), list;

  db.map.findOne(function(err, doc) {
    if (err) return errHandler(['getMap err: ', err], dfd, err);
    if (appName) {
      list = doc[appName] || [];
      debug('getMap (' + appName + ') results: ', list);
      return dfd.resolve(list);
    }
    debug('getMap (noApp) results: ', doc);
    return dfd.resolve(doc);
  });

  return dfd.promise;
}

function updateApiMap(list) {
  var dfd = Q.defer();

  db.map.findOne(function(err, doc) {
    if (err) return errHandler(['updateApiMap err: ', err], dfd, err);
    var i, l, _rel, appName, apis;
    doc = doc || {};
    debug('updateApiMap result: ', doc);
    for (i=0, l=list.length; i<l; i++) {
      _rel = list[i];
      appName = _rel.fs_host;
      if (! doc[appName]) {
        doc[appName] = [];
      }
      apis = doc[appName];
      if (apis.indexOf(_rel.api) === -1) {
        apis.push(_rel.api);
      }
    }
    debug('updateApiMap filtered result: ', doc);
    db.map.save(doc, dfd.resolve);
  });

  return dfd.promise;
}

/**
 * Generates the 'stats' properties from the data, that will be used for display in the views
 * TODO: add a function to 're-generate' the stats, and uptime status in case rules change for existing data...
 * @param  {Obj} doc    document with raw data ready to be injected into DB
 * @return {Obj} doc    document with added '.stats {}' property with pretty stats ready for views
 */
function generateStats(doc) {
  debug('Generating Stats: ', doc);
  //prep the pretty stats
  doc.stats = {
    uptime_status: getStatus(doc, 'api'),
    p95: doc['time:p95'],
    status_2xx: doc['status:2xx'],
    status_3xx: doc['status:3xx'],
    status_4xx: doc['status:4xx'],
    status_5xx: doc['status:5xx'],
    status_total: doc['status:total'],
    error_rate: parseInt(doc['status:5xx'] / doc['status:total'] * 100),
    timestamp: getUnixStamp(doc.timestamp)
  };

  debug('Generated Stats: ', doc.stats);

  return doc;
}

/**
 * Returns the status of the api
 *
 * Requires ['time:p95'], ['status:5xx'], ['status:total']
 *
 * @param  {Object} data The log of the api at that time.
 * @return {String}      Status of the api
 */
function getStatus(data){
  debug('Generating status: ', data);
  var p95 = parseInt(data['time:p95'], 10) || 0
    , s5xx = parseInt(data['status:5xx'], 10) || 0
    , sTotal = parseInt(data['status:total'], 10) || 0
    , status = 'good';

  // if (!sTotal) return 'unknown'; // if there was no traffic
  if ((s5xx / sTotal ) >= config.downErrRatio) status = 'down'; //if error rate > 50%
  if (p95 >= config.apiSlowResTime) status = 'slow'; //if response time is slower than 5 secs

  debug('Status generated: ' + status);
  return status; //if no error flags were thrown, status is still 'good'
}

//get the unix timestamp from the bucket
function getUnixStamp(timeNumber) {
  debug('Generating timestamp: ', timeNumber);
  if ((timeNumber.toString()).length < 13) {
    // We're working with a timeBucket
    timeNumber = timeNumber * config.bucketLength;
  }

  timeNumber = new Date(timeNumber).getTime() / 1000;
  debug('Generated timestamp: ', timeNumber);
  return timeNumber; //this will be unix timestamp formatted
}

/**
 * Regenerates the 'stats' properties of all apiStatuses. This is an admin task
 * that can help regenerate every time the rules for uptime change (or similar changes).
 * TODO: Build a script to call this
 */
function regenerateStats() {
  debug('regenerateApiStats');
  var docs_updated = 0;

  //raw mongo query to regen the data
  //db.mongo.apiStatus.find().sort({"timestamp": 1}).limit(2, function(err, docs) { //start with 2 oldest ones
  db.status
    .find()
    .sort({"timestamp": 1}, function(err, docs) { //run on all data
      debug("LENGTH", docs.length);
      //console.log("regenerateAppStats LENGTH", docs[0]);

      //loop through each doc, generate the stats, and save those new stats to the DB
      for(var i=0; i < docs.length; i++) {
        var id = docs[i]._id.toString()
          , stats = generateStats(docs[i]).stats;
        // console.log("id", id);

        // console.log("stats: ", stats);
        // console.log("docs", docs);

        // update the records
        db.mongo.apiStatus.update({ _id:mongojs.ObjectId(id) }, {
          $set: {
            "stats": stats
          }
        }, updateHandler);


      }

      function updateHandler(err2, update_docs) {
        //console.log(err2);
        debug("docs updated: ", update_docs);

        docs_updated++;
        //console.log('update done: ' + docs_updated);
        debug("updates complete: " + docs_updated + "/" + docs.length);

        //not sure how to get it to delete at the right time...
        if (docs_updated == docs.length) process.exit();//exit after all are done
      }



      // db.mongo.appBucket.find({ _id:mongojs.ObjectId('525d8e6b922b99020000219e')}, function(err, docs) {
      //   console.log(err);
      //   console.log("docs", docs);

      //   console.log('FOUND done');
      //   //exit
      //   process.exit();

      // })




    });


} //regenerateAppStats
