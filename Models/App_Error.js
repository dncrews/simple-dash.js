/* globals require,module,console */
'use strict';

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , debug = require('debug')('marrow:models:app_error')
  , Q = require('q');


var ErrorSchema = new Schema({
  created_at : { type: Date, default: Date.now },
  name : String,
  repo_name : String,
  codes : Array,
  _raw : Schema.Types.Mixed
});

ErrorSchema.statics.fromSplunk = function(data) {
  var dfd = Q.defer()
    , AppBucket = require('./App_Bucket')
    , config;

  if (! data) {
    dfd.reject(new Error('No Splunk data supplied'));
    return dfd.promise;
  }
  if (! data.fs_host) {
    dfd.reject(new Error('No app name given'));
    return dfd.promise;
  }

  config = {
    _raw : data,
    name : data.fs_host,
    codes : data.codes
  };

  config.repo_name = data.fs_host
    .replace('fs-','')
    .replace('-prod','');

  this.create(config, function(err, doc) {
    var resolve = function() {
      dfd.resolve(doc);
    };
    if (err) {
      dfd.reject(err);
      return dfd.promise;
    }
    AppBucket.addErrors(doc.repo_name, doc._id).then(resolve);
  });

  return dfd.promise;
};

module.exports = mongoose.model('App_Error', ErrorSchema);
