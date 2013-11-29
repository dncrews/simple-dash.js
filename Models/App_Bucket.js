/* globals require,module,console */
'use strict';

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , debug = require('debug')('marrow:models:app-bucket')
  , verbose = require('debug')('marrow:models:app-bucket-verbose');

var AppStatus = require('./App_Status')
  , BUCKET_LENGTH = 300000;

function calculateBucket() {
  var now = Date.now()
    , bucket = Math.floor(now / BUCKET_LENGTH)
    , time = bucket * BUCKET_LENGTH;

  verbose('Bucket time generated: ' + time);

  return time;
}

var BucketSchema = new Schema({
  bucket_time : { type: Date, default: calculateBucket },
  repo_name : String,
  app_id : { type: Schema.Types.ObjectId, default: null },
  error_id : { type: Schema.Types.ObjectId, default: null }
});

BucketSchema.index({ bucket_time : -1, repo_name : 1}, { unique: true });

/**
 * Adds App status log to the current app_bucket
 * for a given app repo_name
 *
 * @param  {String}   repo_name Github repo name for the app
 * @param  {ObjectID} id        Mongo ObjectId
 * @return {Promise}
 */
BucketSchema.statics.addApp = function(repo_name, id) {
  var dfd = Q.defer();
  if (! repo_name) return new Error('No repo_name provided!');
  if (! id) return new Error('No App log id provided!');

  debug('Logging app: ' + repo_name + '/' + id);

  getBucket(repo_name).then(function success(doc) {
    doc.app_id = id;
    doc.save(dfd.resolve);
  }, dfd.reject);

  return dfd.promise;
};

/**
 * Adds Heroku errors to the current app_bucket
 * for a given app repo_name
 *
 * @param  {String}   repo_name Github repo name for the app
 * @param  {ObjectID} id        Mongo ObjectId
 * @return {Promise}
 */
BucketSchema.statics.addError = function(repo_name, id) {
  var dfd = Q.defer();
  if (! repo_name) return new Error('No repo_name provided!');
  if (! id) return new Error('No Error log id provided!');

  debug('Logging errors: ' + repo_name + '/' + id);

  getBucket(repo_name).then(function success(doc) {
    doc.error_id = id;
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
 * @param  {String}   repo_name The github name of the app
 * @return {Promise}
 */
function getBucket(repo_name) {
  var dfd = Q.defer();
  verbose('Finding current bucket: ' + repo_name);

  Bucket.findOne({
    bucket_time : calculateBucket(),
    repo_name : repo_name
  }, function(err, doc) {
    if (err) {
      debug('Current Bucket error', err);
      return dfd.reject(err);
    }

    if (doc) {
      debug('Current found: ' + repo_name);
      verbose('Current: ', doc);
      dfd.resolve(doc);
    } else {
      debug('Current not found. Generating new.');
      Bucket.generateBuckets().then(function() {
        getBucket(repo_name).then(dfd.resolve);
      });
    }

  });

  return dfd.promise;
}


BucketSchema.methods.safeSave = function() {
  var dfd = Q.defer();

  console.log(this);
  dfd.resolve();

  return dfd.promise;
};

BucketSchema.statics.generateBuckets = function(count, list) {
  var bucket = calculateBucket()
    , Bucket = this
    , buckets = []
    , dfds = []
    , dfd = Q.defer()
    , i, _dfd;

  count = count || 3;

  for (i=0; i<count; i++) {
    buckets.push(new Date(bucket + (i * BUCKET_LENGTH)));
  }

  // FIXME: Get list of unique apps repo_names
  if (list) {
    useList(list);
  } else {
    _dfd = Q.defer();
    dfds.push(_dfd.promise);
    AppStatus.distinct('repo_name', function(err, list) {
      useList(list, _dfd);
    });
  }

  function useList(list, d) {
    var repo_name, _dfd, time, i, l, ii, ll;
    debug('Generating ' + buckets.length + ' buckets for ' + list.length + ' apps.');
    for (i=0, l=list.length; i<l; i++) {
      repo_name = list[i];
      for (ii=0, ll=buckets.length; ii<ll; ii++) {
        time = buckets[ii];
        dfds.push(generateBucket(repo_name, buckets[ii]));
      }
    }
    if (d) d.resolve();
  }

  Q.all(dfds).then(function() {
    dfd.resolve(buckets);
  });

  return dfd.promise;
};

function generateBucket(repo, time) {
  var dfd = Q.defer()
    , bucket = new Bucket();

  bucket.repo_name = repo;
  bucket.bucket_time = time;
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
 */
BucketSchema.statics.findCurrent = function() {
  // Group by name, select unique? or just filter them out?
};

var Bucket = module.exports = mongoose.model('App_Bucket', BucketSchema);
