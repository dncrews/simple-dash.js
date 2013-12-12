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

};

UpstreamSchema.statics.haFromSplunk = function(data) {

};

module.exports = mongoose.model('Upstream', UpstreamSchema);
