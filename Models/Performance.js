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
        p25 : parseInt(datum.p25, 10) || 0,
        p50 : parseInt(datum.p50, 10) || 0,
        p75 : parseInt(datum.p75, 10) || 0,
        p95 : parseInt(datum.p95, 10) || 0,
        count : parseInt(datum.count, 10) || 0
      }
    };

    dfds.push(_dfd.promise);

    self.create(config, function(err, doc) {
      if (err) {
        _dfd.resolve();
        return debug('Performance save failed');
      }

      created.push(doc);
      _dfd.resolve();
    });
  });

  Q.when(dfds).then(function() {
    dfd.resolve(created);
  });

  return dfd.promise;
};

PerformanceSchema.statics.fromSplunkPageReadyByPage = function(data) {

  if (! data) return Q.reject(new Error('No Splunk data supplied'));
  if (! data instanceof Array) return Q.reject(new Error('Improper splunk data supplied'));

  var dfd = Q.defer()
    , created = []
    , self = this
    , appData = {}
    , toCreate = []
    , config;

  data.map(function(datum) {
    var appName = datum.app
      , app;
    if (! appData[appName]) appData[appName] = [];

    appData[appName].push({
      pageName : datum.pageName,
      p95 : parseInt(datum.p95, 10) || 0,
      p75 : parseInt(datum.p75, 10) || 0,
      p50 : parseInt(datum.p50, 10) || 0,
      p25 : parseInt(datum.p25, 10) || 0,
      count : parseInt(datum.count, 10) || 0
    });
  });

  for (var i in appData) {
    if (! appData.hasOwnProperty(i)) continue;
    toCreate.push({
      repo_name: i,
      type: 'pageReadyByPage',
      meta: { pages : appData[i] },
      _raw: data
    });
  }

  this.create(toCreate, function(err) {
    var docs = Array.prototype.slice.call(arguments);
    docs.shift();
    dfd.resolve(docs);
  });

  dfd.resolve();

  return dfd.promise;
};

PerformanceSchema.statics.fromSplunkHistogram = function(data) {
  if (! data) return Q.reject(new Error('No Splunk data supplied'));
  if (! data instanceof Array) return Q.reject(new Error('Improper splunk data supplied'));

  var dfd = Q.defer()
    , appData = {}
    , toCreate = [];

  data.map(function(datum) {
    var key = datum.page_ready
      , appName = datum.app
      , value = parseInt(datum.count);
    var app = appData[appName] = appData[appName] || {};
    app[key] = value;
  });

  for (var i in appData) {
    if (! appData.hasOwnProperty(i)) continue;
    toCreate.push({
      repo_name: i,
      type: 'histogram',
      meta: appData[i],
      _raw: data
    });
  }

  this.create(toCreate, function(err) {
    var docs = Array.prototype.slice.call(arguments);
    docs.shift();
    dfd.resolve(docs);
  });

  return dfd.promise;
};

module.exports = mongoose.model('Performance', PerformanceSchema);
