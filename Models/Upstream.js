var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , debug = require('debug')('marrow:models:upstream');


var UpstreamSchema = new Schema({
  created_at : { type: Date, default: Date.now },
  type : String,
  name : String,
  status : String,
  meta : Object,
  _raw : Schema.Types.Mixed
});

UpstreamSchema.statics.fromHeroku = function(data) {
  var dfd = Q.defer();

  if (data) {
    dfd.resolve();
  } else {
    dfd.reject(new Error('No data provided!'));
  }



  return dfd.promise;
};

UpstreamSchema.statics.haFromSplunk = function(data) {
  var dfd = Q.defer();

  if (data) {
    dfd.resolve();
  } else {
    dfd.reject(new Error('No data provided!'));
  }

  return dfd.promise;
};

module.exports = mongoose.model('Upstream', UpstreamSchema);
