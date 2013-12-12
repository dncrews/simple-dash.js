var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , debug = require('debug')('marrow:models:app_status')
  , Q = require('q');


var SLOW = 5000 // 1s response from an app is SLOOOOW
  , DOWN_ERROR_RATE = 50; // 50 pct of responses as errors is BAAAAD

var AppSchema = new Schema({
  created_at : { type: Date, default: Date.now },
  name : String,
  repo_name : String,
  memory: {
    avg: Number,
    max: Number
  },
  time : {
    p50 : Number,
    p75 : Number,
    p95 : Number
  },
  codes : {
    s2xx: Number,
    s3xx: Number,
    s4xx: Number,
    s5xx: Number,
    sTotal: Number
  },
  error_rate: Number,
  _raw : Schema.Types.Mixed
});

AppSchema.statics.fromSplunk = function(data) {
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
    time : {
      p75 : parseInt(data['time:p75'], 10) || 0,
      p95 : parseInt(data['time:p95'], 10) || 0
    },
    memory : {
      avg : parseInt(data['mem:avg'], 10) || 0,
      max : parseInt(data['mem:max'], 10) || 0
    },
    codes : {
      s2xx: parseInt(data['status:2xx'], 10) || 0,
      s3xx: parseInt(data['status:3xx'], 10) || 0,
      s4xx: parseInt(data['status:4xx'], 10) || 0,
      s5xx: parseInt(data['status:5xx'], 10) || 0,
      sTotal: parseInt(data['status:total'], 10) || 0
    }
  };

  config.repo_name = data.fs_host
    .replace('fs-','')
    .replace('-prod','');
  config.error_rate = config.codes.s5xx && config.codes.sTotal ? Math.ceil((config.codes.s5xx / config.codes.sTotal) * 100) : 0;

  this.create(config, function(err, doc) {
    var resolve = function() {
      dfd.resolve(doc);
    };
    if (err) {
      dfd.reject(err);
      return dfd.promise;
    }
    AppBucket.addApp(doc.repo_name, doc._id).then(resolve);
  });

  return dfd.promise;
};

/**
 * We could decide to store this again instead of virtuals.
 *
 * I wanted to do this to test the performance. It'd be easier
 * this way if we don't need to persist. Big benefits: we never
 * have to `recalculate` these data.
 */
AppSchema.virtual('status').get(function() {
  var status = 'good';

  if (this.time.p95 >= SLOW) status = 'slow';
  if (this.error_rate >= DOWN_ERROR_RATE) status = 'down';

  debug('Status generated: ' + status);

  return status;
});

module.exports = mongoose.model('App_Status', AppSchema);
