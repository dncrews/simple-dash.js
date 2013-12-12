/**********************
 *
 * Api-specific Stuff
 *
 *********************/

var Q = require('q')
  , request = require('superagent')
  , debug = require('debug')('db:upstream');

// If we rename db collections, I don't want to have to keep changing that everywhere
var db = require('./mongo').upstream_status
  , config = require('../config');

module.exports = {
  log: log,
  current: getCurrent,
  history: getHistory,
  haProxy: logHaProxyStatus,
  regenerate: {
    heroku: regenerateHerokuStatuses
  }
};


function getCurrent() {
  var dfd = Q.defer();

  // Get all (200 most recent) time buckets for all apis
  db.find()
    .sort({
      "created_at" : -1
    })
    .limit(200, function(err, docs) {
      if (err) return errHandler(['getCurrent err: ', err], dfd, err);
      var upstreamNames = [];
      debug('getCurrent results: ', docs.length);
      // Remove all duplicate upstreamNames
      docs = docs.filter(function(el) {
        if (upstreamNames.indexOf(el.name) === -1) {
          upstreamNames.push(el.name);
          return true;
        }
        return false;
      });
      debug('getCurrent filtered results: ', docs.length);
      dfd.resolve(docs);
    });

  return dfd.promise;
}

function getHistory(upstream) {
  var dfd = Q.defer()
    , begin = new Date();

  begin.setDate(begin.getDate() - config.detailsDayCount);
  db.find({
      "name" : upstream,
      "created_at": {
        $gte: begin
      }
    })
    .sort({ "created_at" : -1 }, function(err, docs) {
      if (err) return errHandler(['getHistory err: ', err], dfd, err);
      debug('getHistory results: ', docs.length);
      dfd.resolve(docs);
    });
  return dfd.promise;
}

function errHandler(logs, dfd, err) {
  debug.apply(debug, logs);
  dfd.reject(err);
}

/**
 * Log all upstreams that we know/care about
 * @return {promise} Q.promise
 */
function log() {
  var dfd = Q.defer();
  logHerokuStatus().then(dfd.resolve);
  return dfd.promise;
}


/**
 * Get and log Heroku Status
 * @return {promise} Q.promise
 */
function logHerokuStatus() {
  var dfd = Q.defer();

  debug('Attempting to Log Heroku');

  request
    .get('https://status.heroku.com/api/v3/current-status')
    .set('Accept', 'application/json')
    .on('error', function(err) {
      debug('Heroku Status Error', err);
    })
    .end(function(res){
      debug(res.body);
      var docs
        , _raw = res.body
        , created = new Date();
      // if any errors, abort.
      if (!res.ok) {
        console.log('Oh no! error checking for heroku status: ' + res.text);
        return dfd.reject();
      }

      // hit heroku with the status
      docs = [
        {
          name: "Heroku Production",
          src: "heroku_status_api",
          created_at: created,
          stats: {
            status: _raw.status.Production,
            issues: _raw.status.issues
          },
          _raw: _raw
        },
        {
          name: "Heroku Development",
          src: "heroku_status_api",
          created_at: created,
          stats: {
            status: _raw.status.Development,
            issues: _raw.status.issues
          },
          _raw: _raw
        }
      ];
      debug('Logging Heroku Statuses', docs);

      //save the status to mongo
      db.insert(docs, function(err, resp) {
        if (err) return errHandler(['logHerokuStatus err: ', err], dfd, err);
        debug('logHerokuStatus success');
        dfd.resolve(resp);
      });

    });

  return dfd.promise;

}

function logHaProxyStatus(data) {
  var dfd = Q.defer()
    , status = 'good'
    , codes = data.data[0]
    , errorRate = codes['status:5xx'] / codes['status:total']
    , errorPct = Math.floor(errorRate * 100)
    , doc = {
      name: "HA Proxy",
      src: 'splunk',
      created_at: new Date(),
      error_rate: errorPct,
      _raw: data
    };

  if (errorRate >= config.haWarningRatio) {
    status = 'warning';
  }
  if (errorRate >= config.haErrorRatio) {
    status = 'down';
  }

  doc.stats = {
    error_rate: errorPct,
    status : status,
    status_2xx: codes['status:2xx'],
    status_3xx: codes['status:3xx'],
    status_4xx: codes['status:4xx'],
    status_5xx: codes['status:5xx'],
    status_total: codes['status:total']
  };
  debug('Logging HAProxy status', doc);

  //save the status to mongo
  db.insert(doc, function(err, resp) {
    if (err) return errHandler(['logHaProxyStatus err: ', err], dfd, err);
    debug('logHaProxyStatus success');
    dfd.resolve(resp);
  });

  return dfd.promise;
}

function regenerateHerokuStatuses() {
  db.find({ "src" : "heroku_status_api" }, function(err, docs) {
    var dfds = [], dfd, src, i, l, log, raw, type, issues;
    for (i=0,l=docs.length; i<l; i++) {
      console.log(log);
      log = docs[i];
      raw = log._raw;
      type = log.name === 'Heroku Production' ? 'Production' : 'Development';
      log.stats.status = raw.status[type];
      log.stats.issues = raw.issues;
      dfd = Q.defer();
      dfds.push(dfd.promise);
      db.save(log, saveHandler(dfd));
    }
    Q.all(dfds).then(function(results) {
      process.exit();
    });
    return dfd.promise;

    function saveHandler(dfd) {
      return function(err, resp) {
        console.log(arguments);
        dfd.resolve();
      };
    }
  });
}
