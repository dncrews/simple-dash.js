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
    Upstream.create(prod, dev, function(err, prod, dev) {
      dfd.resolve();
    });
  } else {
    dfd.reject(new Error('No data provided!'));
  }

  return dfd.promise;
};

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


    Upstream.create(upstream, function(err, upstream) {
      dfd.resolve();
    });
  } else {
    dfd.reject(new Error('No data provided!'));
  }

  return dfd.promise;
};

module.exports = mongoose.model('Upstream', UpstreamSchema);
