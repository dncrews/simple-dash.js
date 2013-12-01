/* globals require,module,process,console */
'use strict';

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , _debug = require('debug')
  , debug = _debug('marrow:models:app-bucket')
  , verbose = _debug('marrow:models:app-bucket-verbose');


var AppStatus = require('./App_Status')
  , AppError = require('./App_Error')
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
  app : {
    type: Schema.Types.ObjectId,
    ref : 'App_Status',
    default: null
  },
  app_errors : {
    type: Schema.Types.ObjectId,
    ref : 'App_Error',
    default: null
  },
  changes : {

  }
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
  if (! repo_name) {
    dfd.reject(new Error('No repo_name provided!'));
    return dfd.promise;
  }
  if (! id) {
    dfd.reject(new Error('No App log id provided!'));
    return dfd.promise;
  }

  debug('Logging app: ' + repo_name + '/' + id);

  getBucket(repo_name).then(function success(doc) {
    doc.app = id;
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
BucketSchema.statics.addErrors = function(repo_name, id) {
  var dfd = Q.defer();
  if (! repo_name) return new Error('No repo_name provided!');
  if (! id) return new Error('No Error log id provided!');

  debug('Logging app_errors: ' + repo_name + '/' + id);

  getBucket(repo_name).then(function success(doc) {
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
      debug('Current Bucket err', err);
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

  verbose('Generating bucket ' + time + ' for ' + repo);

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
    , _this = this;
  this.aggregate()
    .match({
      bucket_time : { $lte : date }
    })
    .sort({ bucket_time : -1 })
    .group({
      _id : '$repo_name',
      bucket_id : { $first : '$_id' },
      bucket_time : { $first : '$bucket_time' },
      app : { $first : "$app" },
      app_errors : { $first: "$app_errors" }
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
        // .populate('app app_errors')
        .populate('app')
        .exec(cb);
    });

};

var Bucket = module.exports = mongoose.model('App_Bucket', BucketSchema);
