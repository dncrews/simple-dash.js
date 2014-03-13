/**
 * Models/Upstream.js
 *
 * This Mongoose Model is for Frontier Upstream dependencies.
 */

/**
 * Module Dependencies
 */
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Q = require('q')
  , request = require('superagent')
  , _debug = require('debug');

/**
 * Local Declarations
 */
var debug = _debug('marrow:models:upstream')
  , verbose = _debug('marrow:models:upstream-verbose')
  , DOWN_RATE = 15
  , WARNING_RATE = 10;

/**
 * Schema Declaration
 * @type {Schema}
 */
var UpstreamSchema = new Schema({
    created_at : { type: Date, default: Date.now, expires: 604800 },
    type : String,
    name : String,
    meta : Object,
    _raw : Schema.Types.Mixed
  }, {
    toJSON : {
      virtuals : true
    }
  });


/**
 * We could decide to store this again instead of virtuals.
 *
 * I wanted to do this to test the performance. It'd be easier
 * this way if we don't need to persist. Big benefits: we never
 * have to `recalculate` these data.
 */
UpstreamSchema.virtual('status').get(function() {
  if (this.type === 'heroku') {
    return this._raw.status[this.name.replace('Heroku ', '')];
  }
  var status = 'good'
    , error_rate = this.meta.error_rate;

  if (typeof error_rate === 'undefined') {
    debug('No status data');
    return 'unknown';
  }

  if (error_rate >= WARNING_RATE) status = 'warning';
  if (error_rate >= DOWN_RATE) status = 'down';

  debug('Status generated: ' + status);

  return status;
});

/**
 * Retrieve and save the current status of Heroku
 *
 * This should fetch and save two new instances (Production and Development)
 * @return {Promise} Q promise resolving on successful save of statuses
 */
UpstreamSchema.statics.fetchHeroku = function() {
  var dfd = Q.defer()
    , _this = this;

  debug('Attempting to Log Heroku');

  request
    .get('https://status.heroku.com/api/v3/current-status')
    .set('Accept', 'application/json')
    .on('error', function(err) {
      debug('Heroku Status Error', err);
    })
    .end(function(res){
      debug('Heroku status retrieved');
      verbose(res.body);
      _this.fromHeroku(res.body).then(dfd.resolve, dfd.reject);
    });

  return dfd.promise;
};

/**
 * Parses the given Heroku current status
 *
 * @param  {Object}  data Heroku api status object
 * @return {Promise}      Q promise object. Resolves on creation
 */
UpstreamSchema.statics.fromHeroku = function(data) {
  if (! data) return Q.reject(new Error('No data provided!'));

  var dfd = Q.defer()
    , Upstream = this
    , prod, dev;

  prod = new Upstream({
    name : 'Heroku Production',
    status : data.status.Production
  });
  dev = new Upstream({
    name : 'Heroku Development',
    status : data.status.Development
  });

  prod.type = dev.type = 'heroku';
  prod.meta = dev.meta = {
    issues : data.issues
  };
  prod._raw = dev._raw = data;
  verbose('Heroku Statuses Created: ', prod, dev);
  Upstream.create(prod, dev, function(err, prod, dev) {
    dfd.resolve();
  });

  return dfd.promise;
};

/**
 * Parses the Status of HA Proxy from Splunk data
 * @param  {Object}  data req.body.data of the HA Proxy status codes
 * @return {Promise}      Q promise that resolves on successful save
 */
UpstreamSchema.statics.haFromSplunk = function(data) {
  if (! data) return Q.reject(new Error('No data provided!'));

  var dfd = Q.defer()
    , Upstream = this
    , config, upstream, error_rate;

  upstream = new Upstream({
    type : 'haProxy',
    name : 'HA Proxy',
    meta : {},
    _raw : data
  });

  upstream.meta.codes = {
    "2xx" : parseInt(data['status:2xx'], 10),
    "3xx" : parseInt(data['status:3xx'], 10),
    "4xx" : parseInt(data['status:4xx'], 10),
    "5xx" : parseInt(data['status:5xx'], 10),
    "total" : parseInt(data['status:total'], 10)
  };

  if (data['status:5xx'] && data['status:total']) {
    error_rate = upstream.meta.error_rate = Math.ceil((data['status:5xx'] / data['status:total'] * 100));
  }

  debug('HA Proxy Status: ' + upstream.status);

  Upstream.create(upstream, function(err, upstream) {
    verbose('HA Proxy Status save', arguments);
    dfd.resolve();
  });

  return dfd.promise;
};

/**
 * This will be to get the current status of all Upstreams
 *
 * This one will accept a callback because it returns something,
 * rather then just being a `subroutine` that doesn't
 *
 * FIXME: I really wish I could do this all in one call, but I
 * can't seem to figure out how to do that
 *
 * TODO: Caching this. Delete cache on write
 */
UpstreamSchema.statics.findCurrent = function(cb) {
  var date = new Date()
    , then = new Date(date.setDate(date.getDate() - 2))
    , _this = this;

  this.aggregate()
    .sort({ created_at : -1 })
    .match({ created_at : { $gte : then } })
    .group({
      _id : '$name',
      upstream_id : { $first : '$_id' },
    })
    .group({
      _id : '$upstream_id'
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

module.exports = mongoose.model('Upstream', UpstreamSchema);
