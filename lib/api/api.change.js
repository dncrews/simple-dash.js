/**
 * Module Dependencies
 */
var express = require('express')
  , Q = require('q')
  , debug = require('debug')('dash:api:event');

/**
 * Local Dependencies
 */
var Change = require('../../Models/Change');
var db = require('../db');

/**
 * Local Vars
 */
var app = module.exports = express();

app.get('/', function (req, res) {
  db.change_log.history().then(function success(docs) {
    debug('Index docs retrieved: ' + docs.length);
    res.send(docs);
  }, function fail(err) {
    debug('Index docs failure: ', err);
    res.send(500, err);
  });
});

app.get('/more/:id', function (req, res) {
  db.change_log.more(req.params.id).then(function success(docs) {
    debug('More docs retrieved: ' + docs.length);
    res.send(docs);
  }, function fail(err) {
    debug('More docs failure: ', err);
    res.send(500, err);
  });
});

app.get('/app/:app_name', function (req, res) {
  db.change_log.appHistory(req.params.app_name).then(function success(docs) {
    debug('Event app index retrieved: ' + docs.length);
    res.send(docs);
  }, function fail(err) {
    debug('Event app index failure: ', err);
    res.send(500, err);
  });
});
