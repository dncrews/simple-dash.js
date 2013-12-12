var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , debug = require('debug')('marrow:models:app_error')
  , Q = require('q')
  , Change = require('./Change');


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

/**
 * Post Save
 *
 * Before saving an Error set, we want to check for R14
 * errors so that we can restart apps when necessary
 */
ErrorSchema.pre('save', function(next) {
  var i,l,code;
  for (i=this.codes.length; i--; i<0) {
    code = this.codes[i];
    if (code.code === 'R14') {
      return Change.restartHerokuApp(this.name, code.desc).then(done);
    }
  }
  // This is to ensure that next is never called with arguments
  function done() {
    next();
  }
  next();
});

module.exports = mongoose.model('App_Error', ErrorSchema);
