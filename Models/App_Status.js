/**
 * Models/App_Status.js
 *
 * This Mongoose Model is for App Statuses.
 *
 * At the time of this writing, statuses are rolled up in 5-minute
 * intervals from Splunk, and are a full list of all memory, response time,
 * and response codes from a given app over that 5-minute period.
 */

/**
 * Module Dependencies
 */
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , debug = require('debug')('marrow:models:app_status');

/**
 * Local Dependencies
 */
var Change = require('./Change');

/**
 * Local Declarations
 */
var SLOW = 5000 // 1s response from an app is SLOOOOW
  , DOWN_ERROR_RATE = 50 // 50 pct of responses as errors is BAAAAD
  , App_Status;

/**
 * App Status Schema Declaration
 * @type {Schema}
 */
var AppSchema = new Schema({
  created_at : { type: Date, default: Date.now, expires: 604800 },
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
    '2xx': Number,
    '3xx': Number,
    '4xx': Number,
    '5xx': Number,
    'total': Number
  },
  error_rate: Number,
  _raw : Schema.Types.Mixed
}, {
  toJSON : {
    virtuals : true
  }
});

/**
 * Parses the given app data and saves.
 *
 * Should be called with an individual app's data.
 * Also attaches the app status to an app bucket with Bucket.addApp
 *
 * @param  {Object}  data App-specific piece of Splunk data from res.body.data
 * @return {Promise}      Q promise object. Resolves on save and addApp
 */
AppSchema.statics.fromSplunk = function(data) {
  if (! data) return Q.reject(new Error('No Splunk data supplied'));
  if (! data.fs_host) return Q.reject(new Error('No app name given'));

  var dfd = Q.defer()
    , AppBucket = require('./App_Bucket')
    , config;

  config = {
    _raw : data,
    name : data.fs_host,
    time : {
      p50 : parseInt(data['time:p50'], 10) || 0,
      p75 : parseInt(data['time:p75'], 10) || 0,
      p95 : parseInt(data['time:p95'], 10) || 0
    },
    memory : {
      avg : parseInt(data['mem:avg'], 10) || 0,
      max : parseInt(data['mem:max'], 10) || 0
    },
    codes : {
      '2xx': parseInt(data['status:2xx'], 10) || 0,
      '3xx': parseInt(data['status:3xx'], 10) || 0,
      '4xx': parseInt(data['status:4xx'], 10) || 0,
      '5xx': parseInt(data['status:5xx'], 10) || 0,
      'total': parseInt(data['status:total'], 10) || 0
    }
  };

  config.repo_name = data.fs_host
    .replace('fs-','')
    .replace('-prod','');
  config.error_rate = config.codes['5xx'] && config.codes.total ? Math.ceil((config.codes['5xx'] / config.codes.total) * 100) : 0;

  this.create(config, function(err, doc) {
    if (err) return dfd.reject(err);

    AppBucket.addApp(doc.name, doc._id).then(function() {
      dfd.resolve(doc);
    });
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

/**
 * Pre Save Status Change check
 *
 * When saving a status, we want to check to see if it's gone "From Down"
 * or "To Down", so that we can register a Change
 */
AppSchema.pre('save', function(next) {
  var current = this.status;

  App_Status
    .findOne({ name : this.name })
    .sort({ created_at : -1 })
    .exec(function(err, doc) {
      if (! doc) return next();

      var previous = doc.status;
      if (current === previous) return next();
      if (current !== 'down' && previous !== 'down') return next();

      Change
        .fromMarrow(doc.name, 'status.change', 'Status changed from "' + previous + '" to "' + current + '"')
        .save(function(err, doc) {
          if (err) {
            return next(err);
          }
          next();
      });
    });
});

App_Status = module.exports = mongoose.model('App_Status', AppSchema);
