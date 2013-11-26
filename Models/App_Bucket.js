/* globals require,module,console */
'use strict';

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , debug = require('debug')('marrow:models:app-bucket')
  , verbose = require('debug')('marrow:models:app-bucket-verbose');

var BUCKET_LENGTH = 30000;

function createBucket() {
  var now = Date.now()
    , bucket = Math.floor(now / BUCKET_LENGTH);

  verbose('Bucket time generated: ' + bucket);
  return bucket;
}

var BucketSchema = new Schema({
  created_at : { type: Date, default: createBucket },
  repo_name : String,
  app_id : Schema.Types.ObjectId,
  errors_id : Schema.Types.ObjectId
});

BucketSchema.index({ created_at : -1, repo_name : 1}, { unique: true });

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

  return dfd.promise;
};

/**
 * (No need to call this)
 *
 * Will get the current bucket (or create it)
 * for any app.
 *
 * Returns the app or an Error
 *
 * @param  {String}   repo_name The github name of the app
 * @return {Promise}
 */
BucketSchema.statics._getBucket = function(repo_name) {
  var dfd = Q.defer();
  verbose('Finding current bucket: ' + repo_name);

  this.findOne({
    created_at : createBucket(),
    repo_name : repo_name
  }, function(err, doc) {
    if (err) {
      debug('Current Bucket error', err);
      return dfd.reject(err);
    }

    debug('Current found: ' + repo_name);
    verbose('Current: ', doc);
    dfd.resolve(doc);
  });

  return dfd.promise;
};

/**
 * This will be to get the current status of all Buckets
 */
BucketSchema.statics.findCurrent = function() {
  // Group by name, select unique? or just filter them out?
};

module.exports = mongoose.model('App_Bucket', BucketSchema);
