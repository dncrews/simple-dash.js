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
 * Local Dependencies
 */
var Service_Map = require('./Service_Map');

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
  created_at : { type: Date, default: Date.now, expires: 604800 },
  name : String,
  time : {
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
  toJSON: {
    virtuals: true
  }
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
      '2xx': parseInt(data['status:2xx'], 10) || 0,
      '3xx': parseInt(data['status:3xx'], 10) || 0,
      '4xx': parseInt(data['status:4xx'], 10) || 0,
      '5xx': parseInt(data['status:5xx'], 10) || 0,
      'total': parseInt(data['status:total'], 10) || 1
    }
  };
  config.error_rate = Math.ceil((config.codes['5xx'] / config.codes.total) * 100);
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
 * This will be to get the current status of all Services
 *
 * This one will accept a callback because it returns something,
 * rather then just being a `subroutine` that doesn't
 *
 * FIXME: I really wish I could do this all in one call, but I
 * can't seem to figure out how to do that
 *
 * TODO: Caching this. Delete cache on write
 */
ServiceSchema.statics.findCurrent = function(cb) {
  var date = new Date()
    , then = new Date(date.setDate(date.getDate() - 2))
    , _this = this;

  this.aggregate()
    .match({ created_at : { $gte : then } })
    .sort({ created_at : -1 })
    .group({
      _id : '$name',
      service_id : { $first : '$_id' },
    })
    .group({
      _id : '$service_id'
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
        .sort({ repo_name : 1, name : 1 })
        .exec(cb);
    });

};

/**
 * This will be to get the current status of all
 * service dependencies (apis) of an app
 */
ServiceSchema.statics.findCurrentByRepo = function(repo_name, cb) {
  var date = new Date()
    , then = new Date(date.setDate(date.getDate() - 2))
    , _this = this;

  Service_Map.findOne({
    repo_name : repo_name
  }, function(err, doc) {
    if (! doc) return cb(null, []);
    var services = doc.services;
    _this.aggregate()
      .match({
        name : { $in : services },
        created_at : { $gte : then }
      })
      .sort({ created_at : -1 })
      .group({
        _id : '$name',
        service_id : { $first : '$_id' },
      })
      .group({
        _id : '$service_id'
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
          .sort({ repo_name : 1, name : 1 })
          .exec(cb);
      });
  });
  // Group by name, select unique? or just filter them out?
};

module.exports = mongoose.model('Service', ServiceSchema);
