/**********************
 *
 * Api-specific Stuff
 *
 *********************/

/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

var mongo = require('./mongo')
  , Q = require('q')
  , debug = require('debug')('db:app')
  , mongojs = require('mongojs');

var config = require('../config')
  // If we rename db collections, I don't want to have to keep changing that everywhere
  , db = mongo.app_bucket;

module.exports = {
  current: getCurrent,
  history: getHistory,
  getBucket: getBucket,
  save: saveBucket,
  generateStats: generateStats,
  getPreviousStatus: getPreviousStatus,
  regenerateStats: regenerateStats
};

function errHandler(logs, dfd, err) {
  debug.apply(debug, logs);
  dfd.reject(err);
}

function getBucket(appName, timeBucket) {
  var dfd = Q.defer();

  db.findOne({
      "timeBucket" : timeBucket,
      "appName" : appName
    }, function(err, doc) {
      if (err) return errHandler(['getBucket err: ', err], dfd, err);
      debug('getBucket result: ', doc);
      dfd.resolve(doc);
    });
  return dfd.promise;
}

function saveBucket(doc) {
  var dfd = Q.defer();
  db.save(doc, function(err, resp) {
    if (err) return errHandler(['saveBucket err: ', err, doc], dfd, err);
    debug('saveBucket saved: ', doc);
    dfd.resolve();
  });
  return dfd.promise;
}

function getHistory(appName) {
  var dfd = Q.defer()
    , begin = new Date();

  begin.setDate(begin.getDate() - config.detailsDayCount);
  begin = begin.getTime();
  begin = Math.floor(begin/config.bucketLength);

  db.find({
      "appName" : appName,
      "timeBucket": { $gte: begin}
    })
    .sort({ "timeBucket" : -1 }, function(err, docs) {
      if (err) return errHandler(['getHistory err: ', err, appName], dfd, err);
      debug('getHistory(' + appName + ') results: ', docs.length);
      dfd.resolve(docs);
    });
  return dfd.promise;
}

function getCurrent() {
  var dfd = Q.defer()
    , appNames = [];

  // Get all (200 most recent) time buckets for all apps
  db.find()
    .sort({
      "timeBucket" : -1,
      "appName": 1
    })
    .limit(200, function(err, docs) {
      if (err) return errHandler(['getCurrent err: ', err], dfd, err);
      debug('getCurrent results: ', docs.length);
      // Remove all duplicate appNames
      docs = docs && docs.filter(function(el) {
        if (appNames.indexOf(el.appName) === -1) {
          appNames.push(el.appName);
          return true;
        }
        return false;
      });
      debug('getCurrent filtered results: ', docs.length);
      dfd.resolve(docs);
    });

  return dfd.promise;
}

function getPreviousStatus(appName, timeBucket) {
  var dfd = Q.defer();

  db.findOne({
      "timeBucket" : { $lt: timeBucket },
      "appName" : appName
    }, function(err, doc) {
      if (err) return errHandler(['getPreviousStatus err: ', err, appName, timeBucket], dfd, err);
      if (! doc) {
        debug('getPreviousStatus: no Previous status');
        return dfd.resolve('good');
      }
      debug('getPreviousStatus uptime: ', doc.uptime_status);
      dfd.resolve(doc.uptime_status);
    });

  return dfd.promise;
}

/**
 * Stores the app data in a bucket by timeBucket
 * @param  {String} alertTitle  req.body.alert_title
 * @param  {Object} data        The app data
 * @param  {Number} timeBucket  The timestamp/timeBucketSize
 * @return {Promise}            Q.defer().promise
 */
function createBucket(alertTitle, data, timeBucket) {
  var appName = data.fs_host
    , dfd = Q.defer();

  debug("appName | timeBucket: " + appName + " | " + timeBucket);

  // I'll assume they've already set the status
  db.findOne({
      "timeBucket" : timeBucket,
      "appName" : appName
    },  function(err, doc) {
      if (err) return errHandler(['createBucket err: ', err, alertTitle, data, timeBucket], dfd, err);
      doc = doc || {
        "timeBucket" : timeBucket,
        "appName" : appName,
        "status:dashboard:frontier:mem_response" : {},
        "status:dashboard:frontier:heroku_errors" : {}
      };
      debug('createBucket find: ', doc);

      doc[alertTitle] = data;

      db.save(doc, function(err, resp) {
        if (err) return errHandler(['createBucket save err: ', err, doc], dfd, err);
        debug('createBucket saved');
        dfd.resolve();
      });
    });

  return dfd.promise;
}


/**
 * Generates the 'stats' properties from the data, that will be used for display in the views
 * TODO: add a function to 're-generate' the stats, and uptime status in case rules change for existing data...
 * @param  {Object} doc document with raw data ready to be injected into DB
 * @return {Object}     document with added '.stats {}' property with pretty stats ready for views
 */
function generateStats(doc) {
  //get the stats data we care about...
  var data = doc['status:dashboard:frontier:mem_response']
    , err = doc['status:dashboard:frontier:heroku_errors'];

  debug('Generating Stats: ', doc);

  doc.stats = doc.stats || {};

  doc.stats.uptime_status = getStatus(doc);
  if (!doc.stats.memory_avg) doc.stats.memory_avg = parseInt(data['mem:avg'], 10) || 0;
  if (!doc.stats.memory_max) doc.stats.memory_max = parseInt(data['mem:max'], 10) || 0;
  if (!doc.stats.p95) doc.stats.p95 = data['time:p95'];
  if (!doc.stats.status_2xx) doc.stats.status_2xx = data['status:2xx'];
  if (!doc.stats.status_3xx) doc.stats.status_3xx = data['status:3xx'];
  if (!doc.stats.status_4xx) doc.stats.status_4xx = data['status:4xx'];
  if (!doc.stats.status_5xx) doc.stats.status_5xx = data['status:5xx'];
  if (!doc.stats.status_total) doc.stats.status_total = data['status:total'];
  if (!doc.stats.error_rate) doc.stats.error_rate = parseInt(data['status:5xx'] / data['status:total'] * 100);
  if (!doc.stats.timestamp) doc.stats.timestamp = getUnixStamp(doc.timeBucket);

  if (!doc.stats.heroku_errors) doc.stats.heroku_errors = err;

  debug('Generated Stats: ', doc.stats);

  return doc;
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
function getStatus(doc){
  var data = doc['status:dashboard:frontier:mem_response']

    , p95 = parseInt(data['time:p95'], 10) || 0
    , s5xx = parseInt(data['status:5xx'], 10) || 0
    , sTotal = parseInt(data['status:total'], 10) || 0
    , status = 'good'
    , currentStatus = doc.stats.uptime_status
    , statusPriority = ['good', 'slow', 'down']; // Higher index wins out if the status is already set

  debug('Generating Status: ', doc);

  // if (!sTotal) return 'unknown'; // if there was no traffic
  if (p95 >= config.appSlowResTime) status = 'slow'; //if response time is slower than 5 secs
  if ((s5xx / sTotal ) >= config.downErrRatio) status = 'down'; //if error rate > 50%

  debug('Generated Status: ' + status);

  if (statusPriority.indexOf(status) < statusPriority.indexOf(currentStatus)) {
    status = currentStatus;
    debug('Generated Status overruled by existing: ' + status + ' < ' + currentStatus);
  }

  return status; //if no error flags were thrown, leave status as 'good'
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
 * Regenerates the 'stats' properties of the APP and API buckets. This is an admin task
 * that can help regenerate every time the rules for uptime change (or similar changes).
 * To be safe, run it with a limit with the oldest docs first (since those are least valuable)
 */
function regenerateStats() {
  debug('regenerateAppStats');

  var docs_updated = 0;

  //raw mongo query to regen the data
  // db.mongo.appBucket.find().sort({"timeBucket": 1}, function(err, docs) {
  db.find()
    // .sort({"timeBucket": 1}, function(err, docs) { // when ready for live
    .sort({"timeBucket": 1})
    .limit(2, function(err, docs) { //only do 2 oldest for testing

      debug("LENGTH", docs.length);
      //console.log("regenerateAppStats LENGTH", docs[0]);

      //loop through each doc, generate the stats, and save those new stats to the DB
      for(var i=0; i < docs.length; i++) {
        var id = docs[i]._id.toString()
          , stats = generateStats(docs[i]).stats;
        debug('id: ' + id);

        docs[i].created_at = new Date();
        docs[i].test = "true";

        var created_at = docs[i].created_at;
        debug('created: ', docs[i].created_at);
        //604800 (seconds in a week)
        //43569
        //db.appBucket.ensureIndex( { "created_at": 1 }, { expireAfterSeconds: 604800 } )

        // update the records
        db.update({ _id:mongojs.ObjectId(id) },{
            $set: {
              "stats": stats,
              "created_at": created_at
            }
          }, updateHandler);
      }

      function updateHandler(err2, update_docs) {
        if (err2) return debug('err2: ', err2);
        debug("docs updated: ", update_docs);
        debug("INSERTED CREATED_AT: " + update_docs);
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


  // db.mongo.appBucket.find({"timeBucket": {$lt: 4606210}}).sort({"timeBucket": -1}, function(err, docs) {
  //   console.log("regenerateAppStats LENGTH", docs.length);

  //   //exit
  //   process.exit();



  // });

//WIPE OUT RECORDS EARLIER THAN THAT TIME BUCKET
// db.mongo.appBucket.remove({"timeBucket": {$lt: 4606210}}, function(err, docs) {
//     console.log("regenerateAppStats LENGTH", docs.length);

//     //exit
//     process.exit();



//   });



  // db.mongo.appBucket.find().sort({"timeBucket": -1}, function(err, docs) {
  //   console.log("regenerateAppStats LENGTH", docs.length);


  // });

    //since this is an one-off admin task, shouldn't this just be done from the command line?

    //regenerate stats
   //purge docs older than 1 week

} //regenerateAppStats
