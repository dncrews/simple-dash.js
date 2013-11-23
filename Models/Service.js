/* globals require,module,console */
'use strict';

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , debug = require('debug')('marrow:models:service');

var SLOW = 1000 // 1s response from an API is SLOOOOW
  , DOWN_ERROR_RATE = 50; // 50 pct of responses as errors is BAAAAD


var ServiceSchema = new Schema({
  name : String,
  created_at : { type: Date, default: Date.now },
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

ServiceSchema.statics.fromSplunk = function(data) {
  if (! data) return new Error('No Splunk data supplied');
  if (! data.api) return new Error('No api name given');

  var Service = this
    , config = {
      _raw : data,
      name : data.api,
      time : {
        p95 : parseInt(data['time:p95'], 10)
      },
      codes : {
        s2xx: parseInt(data['status:2xx'], 10),
        s3xx: parseInt(data['status:3xx'], 10),
        s4xx: parseInt(data['status:4xx'], 10),
        s5xx: parseInt(data['status:5xx'], 10),
        sTotal: parseInt(data['status:total'], 10)
      }
    };
  config.error_rate = Math.ceil((config.codes.s5xx / config.codes.sTotal) * 100);
  return new Service(config);
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

// module.exports = Api;

// function Api(data) {
//   if (! data) {
//     this.generateEmpty();
//     return this;
//   }
//   this._raw = data;
//   this.name = data.api;
//   this.type = 'api';
//   this.created_at = new Date();

//   this.setStats();

//   return this;
// }

// Api.prototype.keymap = {
//   'time:p95' : 'p95',
//   'status:2xx' : 'status_2xx',
//   'status:3xx' : 'status_3xx',
//   'status:4xx' : 'status_4xx',
//   'status:5xx' : 'status_5xx',
//   'status:total' : 'status_total'
// };

// Api.prototype.setStats = function setStats() {
//   var k,v;
//   this.stats = {};
//   for (k in this.keymap) {
//     v = this.keymap[k];
//     if (! this._raw.hasOwnProperty(k)) continue;
//     this.stats[v] = parseInt(this._raw[k]);
//   }

//   this.setErrorRate();
//   this.setStatus();
// };

// Api.prototype.setErrorRate = function setErrorRate() {
//   this.stats.error_rate = Math.ceil((this.stats.status_5xx / this.stats.status_total) * 100);
// };

// Api.prototype.setStatus = function setStatus() {
//   var status = 'good';

//   if (this.stats.p95 >= SLOW) status = 'slow';
//   if (this.stats.error_rate > DOWN_ERROR_RATE) status = 'down';

//   debug('Status generated: ' + status);
//   this.stats.status = status;
// };

// Api.prototype.save = function saveMe() {

// };
