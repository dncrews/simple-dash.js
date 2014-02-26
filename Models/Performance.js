/**
 * Models/Perf_Stat.js
 *
 * This Mongoose Model is for Performance Statistics
 */

/**
 * Module Dependencies
 */
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , _debug = require('debug');


/**
 * Local Declarations
 */
var debug = _debug('marrow:models:perf_stat')
  , verbose = _debug('marrow:models:perf_stat-verbose');

/**
 * Schema Declaration
 * @type {Schema}
 */
var PerformanceSchema = new Schema({
    created_at : { type: Date, default: Date.now, expires: 604800 },
    repo_name : String,
    type : String,
    meta : Object,
    _raw : Schema.Types.Mixed
  });

PerformanceSchema.statics.fromSplunkPageReady = function(data) {

  if (! data) return Q.reject(new Error('No Splunk data supplied'));
  if (! data instanceof Array) return Q.reject(new Error('Improper splunk data supplied'));

  var dfd = Q.defer()
    , dfds = []
    , created = []
    , self = this;

  data.map(function(datum) {
    var _dfd = Q.defer()
      , config = {
      _raw : datum,
      repo_name : datum.app,
      type : 'pageReady',
      meta : {
        p25 : datum.p25,
        p50 : datum.p50,
        p75 : datum.p75,
        p95 : datum.p95,
        count : datum.count,
      }
    };

    dfds.push(_dfd);

    self.create(config, function(err, doc) {
      if (err) {
        dfd.resolve();
        return debug('Performance save failed');
      }

      created.push(doc);
      dfd.resolve();
    });
  });

  Q.when(dfds).then(function() {
    dfd.resolve(created);
  });

  return dfd.promise;
};

PerformanceSchema.statics.fromSplunkByBuckets = function(data, type) {

};

module.exports = mongoose.model('Performance', PerformanceSchema);
