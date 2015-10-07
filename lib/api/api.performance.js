/**
 * Module Dependencies
 */
var express = require('express')
  , Q = require('q')
  , debug = require('debug')('dash:api:performance');

/**
 * Local Dependencies
 */
var Performance = require('../../Models/Performance');

/**
 * Local Vars
 */
var app = module.exports = express();

app.get('/', function (req, res) {
  // Performance.findCurrent(function(err, docs) {
  //   if (err) {
  //     debug('Index docs failure: ', err);
  //     return res.status(500).send(err);
  //   }
  //   debug('Index docs retrieved: ' + docs.length);
  //   return res.status(200).send(docs);
  // });
  res.send(404);
});

app.get('/:appName', function (req, res) {
  Performance
    .find({
      repo_name : req.params.appName,
      type: 'pageReady'
    })
    .sort({
      created_at : -1
    })
    .select('-_raw')
    .exec(function(err, docs) {
      if (err) {
        debug('pageReady history failure: ', err);
        return res.status(500).send(err);
      }
      res.status(200).send(docs);
    });
});

app.get('/histogram/:appName', function (req, res) {
  Performance
    .findOne({
      repo_name : req.params.appName,
      type : 'histogram'
    })
    .sort({
      created_at : -1
    })
    .select('-_raw')
    .exec(function(err, doc) {
      if (err) {
        debug('Histogram history failure: ', err);
        return res.status(500).send(err);
      }
      res.status(200).send(doc);
    });
});

app.get('/pages/:appName', function (req, res) {
  Performance
    .findOne({
      repo_name : req.params.appName,
      type : 'pageReadyByPage'
    })
    .sort({
      created_at : -1
    })
    .select('-_raw')
    .exec(function(err, doc) {
      if (err) {
        debug('Pages history failure: ', err);
        return res.status(500).send(err);
      }
      res.status(200).send(doc);
    });
});
