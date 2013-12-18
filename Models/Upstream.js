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
  , verbose = _debug('marrow:models:upstream-verbose');

/**
 * Schema Declaration
 * @type {Schema}
 */
var UpstreamSchema = new Schema({
    created_at : { type: Date, default: Date.now },
    type : String,
    name : String,
    status : String,
    meta : Object,
    _raw : Schema.Types.Mixed
  });

/**
 * Retrieve and save the current status of Heroku
 *
 * This should fetch and save two new instances (Production and Development)
 * @return {Promise} Q promise resolving on successful save of statuses
 */
UpstreamSchema.statics.fetchHeroku = function() {
  var dfd = Q.defer();

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
      this.fromHeroku(res.body).then(dfd.resolve, dfd.reject);
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
  var dfd = Q.defer()
    , Upstream = this
    , prod, dev;

  if (data) {
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
  } else {
    dfd.reject(new Error('No data provided!'));
  }

  return dfd.promise;
};

/**
 * Parses the Status of HA Proxy from Splunk data
 * @param  {Object}  data req.body.data of the HA Proxy status codes
 * @return {Promise}      Q promise that resolves on successful save
 */
UpstreamSchema.statics.haFromSplunk = function(data) {
  var dfd = Q.defer()
    , Upstream = this
    , config, upstream, error_rate;

  if (data) {
    upstream = new Upstream({
      type : 'haProxy',
      name : 'HA Proxy',
      status : 'unknown',
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

      if (error_rate >= 75) {
        upstream.status = 'down';
      } else if (error_rate >= 50) {
        upstream.status = 'warning';
      } else {
        upstream.status = 'good';
      }
    }

    debug('HA Proxy Status: ' + upstream.status);

    Upstream.create(upstream, function(err, upstream) {
      verbose('HA Proxy Status save', arguments);
      dfd.resolve();
    });
  } else {
    dfd.reject(new Error('No data provided!'));
  }

  return dfd.promise;
};

module.exports = mongoose.model('Upstream', UpstreamSchema);
