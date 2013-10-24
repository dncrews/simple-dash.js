/**
 * admin_db_actions.js
 *
 * This is a script to run one-off db actions like regenerating stats if business rules change, and experimenting.
 TODO: clean this up so we pull in most functions from the other lib files instead of just copying them.. (bad)
 */

/**
 * TODO: move the heroku actions, and mailer actions OUT of this controller. Into a different file at the very least.
 *
 */


//You can call this using:
// $ foreman run node lib/admin_db_actions.js


/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';



var db = require('./mongoClient')
  , mongojs = require('mongojs')
  , config = require('./config')
  , debug = require('debug')('changelog')
  , change = require('./change_log')
  , util = require('./util')
  , heroku;

// module.exports = logger;


/**
 * Parses req.body into the required log formats
 * @param  {Object}   content req.body from the log resource
 * @param  {Function} next    Callback. Should accept only status code
 */
function logger(content, next) {
  // console.log(content);
  var alertTitle = content.alert_title.replace(/\./g, ':')
    , timestamp = new Date().getTime()
    , timeBucket = Math.floor(timestamp/config.bucketLength) // This should create buckets at 5-minute intervals
    , dfds = []
    , type , i, l, _rel;

  // These are the ONLY req.body.alert_title we accept
  switch (alertTitle) {
  case 'status:dashboard:frontier:mem_response':
    type = 'app';
    break;
  case 'status:dashboard:frontier:api:flat_response_data':
    type = 'api';
    break;
  case 'status:dashboard:frontier:heroku_errors':
    type = 'herokuErrors';
    break;
  case 'status:dashboard:frontier:app_to_api_map':
    type = 'appToApiMap';
    break;
  default:
    // Anything else invokes "stranger danger"
    console.warn("I NEED AN ADULT!!!");
    console.info(content);
    return next(400);
  }

  // Sometimes the req.body.data needs a little extra massaging
  if (typeof content.data === 'string') {
    try {
      content.data = JSON.parse(content.data);
    } catch (e) {
      console.warn(e);
      return next(500);
    }
  }

  // We want to save off the RAW log with just a timestamp
  dfds.push(createRawStatus(content, timestamp));
  // We also want to save off the log using the raw buckets of
  // everything we've gotten in this bucket-time
  dfds.push(createRawBucket(alertTitle, content.data, timeBucket));

  /**
   * If we're looking at Heroku errors, we want to stick them
   * into the appBuckets, but we need to format them first to
   * match the other App-level data (mem_response)
   */


  if (type === 'herokuErrors') {
    content.data = restructureHerokuErrors(content.data);
    for (i=0, l=content.data.length; i<l; i++) {
      dfds.push(createAppBucket(alertTitle, content.data[i], timeBucket, type));
    }
  }

  // Apps are saved in buckets
  if (type === 'app') {
    for (i=0, l=content.data.length; i<l; i++) {
      dfds.push(createAppBucket(alertTitle, content.data[i], timeBucket, type));
    }
  }

  // API information is a one-shot, so no bucket necessary
  if (type === 'api') {
    for (i=0, l=content.data.length; i<l; i++) {
      _rel = content.data[i];
      dfds.push(createApiStatus(alertTitle, _rel, timestamp));
    }
  }

  if (type === 'appToApiMap') {
    dfds.push(db.saveApiMap(content.data));
  }

  // After all the simultaneous stores, send back "created"
  Q.all(dfds).then(function() {
    next(201);
  });
}


/**
 * Simply resolves the deferred objects
 * @param  {Q.defer} dfd  Q deferred object
 */
function getAsyncResolve(dfd) {
  return function () {
    dfd.resolve();
  };
}

/**
 * Saves the raw record with just a timestamp
 * This is site-wide data
 * @param  {Object} data       Full req.body, probably
 * @param  {Number} timestamp  Epoch timestamp
 * @return {Promise}           Q.defer().promise
 */
function createRawStatus(data, timestamp) {
  var dfd = Q.defer();
  data.timestamp = timestamp;
  db.mongo.rawStatus.save(data, getAsyncResolve(dfd));
  return dfd.promise;
}

/**
 * Saves the record with other  records in the same timeBucket
 * @param  {string} alertTitle  req.body.alert_title
 * @param  {Object} data        Full req.body, probably
 * @param  {Number} timeBucket  Timestamp/timeBucketSize
 * @return {Promise}            Q.defer().promise
 */
function createRawBucket(alertTitle, data, timeBucket) {
  var dfd = Q.defer();
  db.mongo.rawBucket.findOne({ "timeBucket" : timeBucket }, function(err, doc) {
    doc = doc || { "timeBucket" : timeBucket };
    doc[alertTitle] = data;
    db.mongo.rawBucket.save(doc, getAsyncResolve(dfd));
  });
  return dfd.promise;
}

/**
 * Stores the app data in a bucket by timeBucket
 * @param  {String} alertTitle  req.body.alert_title
 * @param  {Object} data        The app data
 * @param  {Number} timeBucket  The timestamp/timeBucketSize
 * @param  {String} type        herokuErrors | app
 * @return {Promise}            Q.defer().promise
 */
function createAppBucket(alertTitle, data, timeBucket, type) {
  var appName = data.fs_host
    , dfd = Q.defer();

  debug("appName | timeBucket: " + appName + " | " + timeBucket);

  //get the 2 most recent docs, so we can compare uptime_status
  //get the current timeBucket, and 1 older, and sort by newest first
  db.mongo.appBucket.find({ "timeBucket" : { $lte: timeBucket }, "appName" : appName }).sort({"timeBucket": -1}).limit(2, function(err, docs) {

    //if the first returned doesn't match the current time, it hasn't been created yet.
    //then we should create a new one
    if( timeBucket !== docs[0].timeBucket) {
      docs[1] = docs[0]; //assign the first as second, so it'll be treated as the previous bucket
      docs[0] = false; //wipe out the first return
    }

    var doc = docs[0] || {
      "timeBucket" : timeBucket,
      "appName" : appName,
      "status:dashboard:frontier:mem_response" : {},
      "status:dashboard:frontier:heroku_errors" : {}
    };

    doc[alertTitle] = data;
    //set and attach the uptime status now, since we have the data we need. (FIXME: what happens when there isn't data?)

    //if app type (not heroku_errors), calc & set the uptime status. AND prepare pretty app stats
    if (type === "app") { //TODO: seems to be too busy here. Pull this out somewhere else? Maybe to the prep app stats?
      doc["uptime_status"] = util.getStatus(doc["status:dashboard:frontier:mem_response"], "app");
      // //set the previous status
      doc["uptime_status_prev"] = util.getStatus(docs[1]["status:dashboard:frontier:mem_response"], "app");

      //if there was a status change, log it to the change_log Q: Is this the right place?
      logStatusChange(doc["uptime_status"], doc["uptime_status_prev"], appName);

      //prepare some pretty stats data from the raw data (this will add a .stats {} obj to the doc)
      doc = prepAppStats(doc);
    } else if (type === "herokuErrors") {
      //add the heroku errors to .stats {}
      doc.stats = doc.stats || {}; //get stats if exists, else create it
      doc.stats.heroku_errors = doc["status:dashboard:frontier:heroku_errors"];
    }




    debug('save app bucket', doc);
    //console.log('current', doc);
    // console.log('current', docs[1].timeBucket);
    db.mongo.appBucket.save(doc, getAsyncResolve(dfd)); //save to DB

  });

  return dfd.promise;
}

/**
 * Prepares the 'stats' properties from the data, that will be used for display in the views
 * TODO: add a function to 're-generate' the stats, and uptime status in case rules change for existing data...
 * @param  {Obj} doc    document with raw data ready to be injected into DB
 * @return {Obj} doc    document with added '.stats {}' property with pretty stats ready for views
 */
function prepAppStats(doc) {
  //get the stats data we care about...
  var _data = doc["status:dashboard:frontier:mem_response"];

  doc.stats = { //take normal values and do any processing necessary
    uptime_status: util.getStatus(_data, 'app'),
    memory_avg: parseInt(_data['mem:avg'], 10) || 0,
    memory_max: parseInt(_data['mem:max'], 10) || 0,
    p95: _data['time:p95'],
    status_2xx: _data['status:2xx'],
    status_3xx: _data['status:3xx'],
    status_4xx: _data['status:4xx'],
    status_5xx: _data['status:5xx'],
    status_total: _data['status:total'],
    error_rate: parseInt(_data['status:5xx'] / _data['status:total'] * 100),
    timestamp: util.getUnixStamp(doc.timeBucket)
  };

  return doc;
}

/**
 * Prepares the 'stats' properties from the data, that will be used for display in the views
 * TODO: add a function to 're-generate' the stats, and uptime status in case rules change for existing data...
 * @param  {Obj} doc    document with raw data ready to be injected into DB
 * @return {Obj} doc    document with added '.stats {}' property with pretty stats ready for views
 */
function prepAPIStats(doc) {
  //prep the pretty stats
  doc.stats = {
    uptime_status: util.getStatus(doc, 'api'),
    p95: doc['time:p95'],
    status_2xx: doc['status:2xx'],
    status_3xx: doc['status:3xx'],
    status_4xx: doc['status:4xx'],
    status_5xx: doc['status:5xx'],
    status_total: doc['status:total'],
    error_rate: parseInt(doc['status:5xx'] / doc['status:total'] * 100),
    timestamp: util.getUnixStamp(doc.timestamp)
  };

  return doc;
}

/**
 * Stores the API data in a bucket by timeBucket
 * @param  {String} alertTitle  req.body.alert_title
 * @param  {Object} data        The API data
 * @param  {Number} timestamp   Epoch timestamp
 * @return {Promise}            Q.defer().promise
 */
function createApiStatus(alertTitle, data, timestamp) {
  var dfd = Q.defer();

  data.alertTitle = alertTitle;
  data.timestamp = timestamp;
  data = prepAPIStats(data); //generate the .stats {} property

  db.mongo.apiStatus.save(data, getAsyncResolve(dfd)); //save

  return dfd.promise;
}


/**
 * Determines if there was an uptime status change. If so, log it to the change log.
 * TODO: (Later) Fire and alert / action at this point
 * @param  {String} status_current  Current uptime status
 * @param  {String} status_prev  Previous uptime status
 * @param  {String} app_name  Name of the app
 */
function logStatusChange(status_current, status_prev, app_name) {
  debug("logStatusChange", status_prev, app_name);
  if (status_current !== status_prev) {

    //only log if current OR previous was DOWN (or else too much noise, at least until we have filtering...)
    if (status_current !== "down" &&  status_prev !== "down") return;

    //log the status change in the change_log
    //Q: Should this send a timestamp along with it?
    change.save({
      payload: { //matches webhook standard.
        data : {
          app_name : app_name,
          uptime_status: status_current,
          uptime_status_prev: status_prev
        },
        src: "marrow",
        type: "marrow info:statusChange"
      }

    }, function() { debug("logStatusChange:save", "saved");}, "marrow");
  }
}


/**
 * Regenerates the 'stats' properties of the APP and API buckets. This is an admin task
 * that can help regenerate every time the rules for uptime change (or similar changes).
 * To be safe, run it with a limit with the oldest docs first (since those are least valuable)
 */
function regenerateAppStats() {

  var docs_updated = 0;

  //raw mongo query to regen the data
  // db.mongo.appBucket.find().sort({"timeBucket": 1}, function(err, docs) {
  db.mongo.appBucket.find().sort({"timeBucket": 1}).limit(2, function(err, docs) { //only do 2 oldest for testing

    console.log("regenerateAppStats LENGTH", docs.length);
    //console.log("regenerateAppStats LENGTH", docs[0]);

    //loop through each doc, generate the stats, and save those new stats to the DB
    for(var i=0; i < docs.length; i++) {
      var id = docs[i]._id;
      id = id.toString();

      var stats = prepAppStats(docs[i]).stats;
      // console.log("id", id);
      //console.log(bson);
      //return console.log(bson.Timestamp(new Date()));
      // docs[i]["created_at"] = bson.Timestamp(Date.now());


      docs[i]["created_at"] = new Date();
      docs[i]["test"] = "true";
      // console.log(docs[i]["created_at"]);
      // console.log(stats.timestamp);
      // console.log(bson.Timestamp(Date.now())); //is this needed? A: yes
      // console.log(bson.Timestamp());

      var created_at = docs[i]["created_at"];
      // console.log('created: ', docs[i]["created_at"]);
      //console.log("index: ", i);
      //604800 (seconds in a week)
      //43569
      //db.appBucket.ensureIndex( { "created_at": 1 }, { expireAfterSeconds: 604800 } )

      // update the records
      console.log(id);
      db.mongo.appBucket.update( { _id:mongojs.ObjectId(id) }, { $set: { "stats": stats, "created_at": created_at } }, function(err2, update_docs) {
        //console.log(err2);
        console.log("docs updated: ", update_docs);
        console.log("INSERTED CREATED_AT: " + update_docs);
        docs_updated++;
        //console.log('update done: ' + docs_updated);
        console.log("updates complete: " + docs_updated + "/" + docs.length)

        //not sure how to get it to delete at the right time...
        if (docs_updated == docs.length) process.exit();//exit after all are done

      });


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


function regenerateAPIStats() {

  var docs_updated = 0;

  //raw mongo query to regen the data
  //db.mongo.apiStatus.find().sort({"timestamp": 1}).limit(2, function(err, docs) { //start with 2 oldest ones
  db.mongo.apiStatus.find().sort({"timestamp": 1}, function(err, docs) { //run on all data
    console.log("regenerateAppStats LENGTH", docs.length);
    //console.log("regenerateAppStats LENGTH", docs[0]);

    //loop through each doc, generate the stats, and save those new stats to the DB
    for(var i=0; i < docs.length; i++) {
      var id = docs[i]._id;
      id = id.toString();

      var stats = prepAPIStats(docs[i]).stats;
      // console.log("id", id);

      // console.log("stats: ", stats);
      // console.log("docs", docs);

      // update the records
      db.mongo.apiStatus.update( { _id:mongojs.ObjectId(id) }, { $set: { "stats": stats } }, function(err2, update_docs) {
        //console.log(err2);
        console.log("docs updated: ", update_docs);

        docs_updated++;
        //console.log('update done: ' + docs_updated);
        console.log("updates complete: " + docs_updated + "/" + docs.length)

        //not sure how to get it to delete at the right time...
        if (docs_updated == docs.length) process.exit();//exit after all are done

      });


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



//console.log('calling the regen function')
// regenerateAppStats();
//regenerateAPIStats();


