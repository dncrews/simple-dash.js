/**
 * Models/Service.js
 *
 * This Mongoose Model is for the Service (API) Statuses.
 *
 * At the time of this writing, statuses are rolled up in 5-minute
 * intervals from Splunk, and are a list of response time, and response
 * codes provided by all apps for their service dependencies over that
 * 5-minute period.
 */

/**
 * Module Dependencies
 */
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , debug = require('debug')('marrow:models:service');

/**
 * Local Declarations
 */
var SLOW = 1000 // 1s response from an API is SLOOOOW
  , DOWN_ERROR_RATE = 50; // 50 pct of responses as errors is BAAAAD

/**
 * Service (API) Status Schema Declaration
 * @type {Schema}
 */
var ServiceSchema = new Schema({
  created_at : { type: Date, default: Date.now },
  name : String,
  time : {
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

/**
 * Parses the given service data and saves.
 *
 * Should be called with an individual service's data.
 *
 * @param  {Object}  data Service-specific piece of Splunk data from res.body.data
 * @return {Promise}      Q promise that resolves on save
 */
ServiceSchema.statics.fromSplunk = function(data) {
  if (! data) return Q.reject(new Error('No Splunk data supplied'));
  if (! data.api) return Q.reject(new Error('No api name given'));

  var dfd = Q.defer()
    , config;

  config = {
    _raw : data,
    name : data.api,
    time : {
      p95 : parseInt(data['time:p95'], 10) || 0
    },
    codes : {
      s2xx: parseInt(data['status:2xx'], 10) || 0,
      s3xx: parseInt(data['status:3xx'], 10) || 0,
      s4xx: parseInt(data['status:4xx'], 10) || 0,
      s5xx: parseInt(data['status:5xx'], 10) || 0,
      sTotal: parseInt(data['status:total'], 10) || 1
    }
  };
  config.error_rate = Math.ceil((config.codes.s5xx / config.codes.sTotal) * 100);
  this.create(config, function(err, doc) {
    if (err) return dfd.reject(err);
    dfd.resolve(doc);
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
ServiceSchema.virtual('status').get(function() {
  var status = 'good';

  if (this.time.p95 >= SLOW) status = 'slow';
  if (this.error_rate >= DOWN_ERROR_RATE) status = 'down';

  debug('Status generated: ' + status);

  return status;
});

/**
 * This will be to get the current status of all
 * services (apis)
 */
ServiceSchema.statics.findCurrent = function(cb) {
  // Group by name, select unique? or just filter them out?
};

/**
 * This will be to get the current status of all
 * service dependencies (apis) of an app
 */
ServiceSchema.statics.findCurrentByApp = function(cb) {
  // Group by name, select unique? or just filter them out?
};

module.exports = mongoose.model('Service', ServiceSchema);
