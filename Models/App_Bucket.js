/**
 * Models/App_Bucket.js
 *
 * This Mongoose Model is for App Buckets.
 *
 * An app bucket consists of the app_status (app) and app_errors
 * for a specific app during an existing bucket. At the time of this
 * writing, a "bucket" is designated as a 5-minute interval of statuses
 * and errors.
 *
 * @see App_Status.js
 * @see App_Error.js
 */

/**
 * Module Dependencies
 */
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , _debug = require('debug')
  , debug = _debug('marrow:models:app-bucket')
  , verbose = _debug('marrow:models:app-bucket-verbose');

/**
 * Local Dependencies
 */
var AppStatus = require('./App_Status')
  , AppError = require('./App_Error');

/**
 * Local Declarations
 */
var Bucket
  , BUCKET_LENGTH = 300000;

/**
 * App Bucket Schema
 * @type {Schema}
 */
var BucketSchema = new Schema({
  bucket_time : { type: Date, default: calculateBucket, expires: 604800 },
  name : String,
  repo_name : String,
  app : {
    type: Schema.Types.ObjectId,
    ref : 'App_Status',
    default: null
  },
  app_errors : {
    type: Schema.Types.ObjectId,
    ref : 'App_Error',
    default: null
  }
}, {
  toJSON : {
    virtuals : true
  }
});

BucketSchema.index({ bucket_time : -1, name : 1}, { unique: true });

/**
 * Adds App status log to the current app_bucket
 * for a given app name
 *
 * @param  {String}   name Heroku name for the app
 * @param  {ObjectID} id        Mongo ObjectId
 * @return {Promise}
 */
BucketSchema.statics.addApp = function(name, id) {
  if (! name)return Q.reject(new Error('No name provided!'));
  if (! id) return Q.reject(new Error('No App log id provided!'));

  var dfd = Q.defer();

  debug('Logging app: ' + name + '/' + id);

  getBucket(name).then(function success(doc) {
    doc.app = id;
    doc.save(dfd.resolve);
  }, dfd.reject);

  return dfd.promise;
};

BucketSchema.virtual('status').get(function() {
  var status = 'unknown';

  if (this.app && this.app.status) {
    status = this.app.status;
  }

  return status;
});

/**
 * Adds Heroku errors to the current app_bucket
 * for a given app name
 *
 * @param  {String}   name Heroku name for the app
 * @param  {ObjectID} id        Mongo ObjectId
 * @return {Promise}
 */
BucketSchema.statics.addErrors = function(name, id) {
  if (! name) return Q.reject(new Error('No name provided!'));
  if (! id) return Q.reject(new Error('No Error log id provided!'));

  var dfd = Q.defer();

  debug('Logging app_errors: ' + name + '/' + id);

  getBucket(name).then(function success(doc) {
    doc.app_errors = id;
    doc.save(dfd.resolve);
  }, dfd.reject);

  return dfd.promise;
};

/**
 * Will get the current bucket (or create it)
 * for any app.
 *
 * Resolves either the existing app or a new one
 *
 * @param  {String}   name The github name of the app
 * @return {Promise}
 */
function getBucket(name) {
  var dfd = Q.defer();
  verbose('Finding current bucket: ' + name);

  Bucket.findOne({
    bucket_time : calculateBucket(),
    name : name
  }, function(err, doc) {
    if (err) {
      debug('Current Bucket err', err);
      return dfd.reject(err);
    }

    if (doc) {
      debug('Current found: ' + name);
      verbose('Current: ', doc);
      dfd.resolve(doc);
    } else {
      debug('Current not found. Generating new.');
      Bucket.generateBuckets(null, [name]).then(function() {
        getBucket(name).then(dfd.resolve);
      });
    }

  });

  return dfd.promise;
}

/**
 * Generates next set(s) of buckets)
 *
 * If called with a count, it generates that many buckets for
 * the apps. If called with a list, those are the apps it
 * will generate buckets for.
 *
 * @param  {Number}  count (3) The number of buckets to generate for each app
 * @param  {Array}   list  (all) Array of string app_names to generate buckets for
 * @return {Promise}       Q promise resolving on bucket generation
 */
BucketSchema.statics.generateBuckets = function(count, list) {
  var bucket = calculateBucket()
    , Bucket = this
    , buckets = []
    , dfds = []
    , dfd = Q.defer()
    , appInc = 0
    , timeInc = 0
    , i, _dfd;

  count = count || 3;

  for (i=0; i<count; i++) {
    buckets.push(new Date(bucket + (i * BUCKET_LENGTH)));
  }

  if (list) {
    useList(list);
  } else {
    _dfd = Q.defer();
    dfds.push(_dfd.promise);
    AppStatus.distinct('name', function(err, list) {
      useList(list, _dfd);
    });
  }

  function useList(list, d) {
    var name, _dfd, time, i, l, ii, ll;
    debug('Generating ' + buckets.length + ' buckets for ' + list.length + ' apps.');
    for (i=0, l=list.length; i<l; i++) {
      name = list[i];
      for (ii=0, ll=buckets.length; ii<ll; ii++) {
        time = buckets[ii];
        dfds.push(generateBucket(name, buckets[ii]));
      }
    }
    if (d) d.resolve();
  }

  Q.all(dfds).then(function() {
    dfd.resolve(buckets);
  });

  return dfd.promise;
};

/**
 * Generates a single bucket for supplied name and bucket time
 * @param  {String}  name Github name to generate a bucket for
 * @param  {Date}    time Date of the Bucket to create
 * @return {Promise}      Q promise resolved on bucket creation
 */
function generateBucket(name, time) {
  var dfd = Q.defer()
    , bucket = new Bucket();

  verbose('Generating bucket ' + time + ' for ' + name);

  bucket.name = name;
  bucket.bucket_time = time;
  bucket.repo_name = bucket.name.replace('fs-', '').replace('-prod', '');
  try {
    bucket.save(dfd.resolve);
  } catch(e) {
    // Resolve first so we don't stop anyone else
    dfd.resolve(e);
    if (! e.message.match(/E11000/)) {
      console.error('Unknown generateBuckets error!');
      console.error(e);
    }
  }
  return dfd.promise;
}

/**
 * This will be to get the current status of all Buckets
 *
 * This one will accept a callback because it returns something,
 * rather then just being a `subroutine` that doesn't
 *
 * FIXME: I really wish I could do this all in one call, but I
 * can't seem to figure out how to do that
 *
 * TODO: Caching this. Delete cache on write
 */
BucketSchema.statics.findCurrent = function(cb) {

  var date = new Date()
    , then = new Date(date.setDate(date.getDate() - 7))
    , _this = this;

  this.aggregate()
    .match({
      // FIXME: We want to get all empties that are older than 5 minutes ago
      $or : [
        { app : { $ne : null } },
        { app_errors : { $ne : null } },
      ],
      bucket_time : { $lte : Date.now, $gte : then }
    })
    .sort({ bucket_time : -1 })
    .group({
      _id : '$name',
      bucket_id : { $first : '$_id' },
    })
    .group({
      _id : '$bucket_id'
    })
    // .exec(cb);
    .exec(function(err, docs) {
      var ids = [];
      for(var i=0, l=docs.length; i<l; i++) {
        ids.push(docs[i]._id);
      }
      _this
        .find({
          _id : { $in : ids }
        })
        // FIXME: Remove the repo_name once they're tracking everywhere
        .sort({ repo_name : 1, name : 1 })
        .populate('app app_errors')
        .exec(cb);
    });

};

/**
 * Calculate the Date of the current Bucket Time
 * @return {Date} Date of the current Bucket Time
 */
function calculateBucket() {
  var now = Date.now()
    , bucket = Math.floor(now / BUCKET_LENGTH)
    , time = bucket * BUCKET_LENGTH;

  verbose('Bucket time generated: ' + time);

  return time;
}

Bucket = module.exports = mongoose.model('App_Bucket', BucketSchema);
