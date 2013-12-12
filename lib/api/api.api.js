/**
 * Dependencies
 */
var express = require('express')
  , Q = require('q')
  , debug = require('debug')('dash:api:api');

/**
 * Local Vars
 */
var app = module.exports = express()
  , db = require('../db');

app.get('/', function (req, res) {
  db.api.current().then(function success(docs) {
    debug('Index docs retrieved: ' + docs.length);
    res.send(docs);
  }, function fail(err) {
    debug('Index docs failure: ', err);
    res.send(500, err);
  });
});

app.get('/:api_name', function (req, res) {
  db.api.history(req.params.api_name).then(function success(docs) {
    debug('Api history retrieved: ' + docs.length);
    res.send(docs);
  }, function fail(err) {
    debug('Api history failure: ', err);
    res.send(500, err);
  });
});

app.get('/app/:app_name', function (req, res) {
  db.api.appCurrent(req.params.app_name).then(function success(docs) {
    debug('Api app index retrieved: ' + docs.length);
    console.log(docs[0]);
    res.send(docs);
  }, function fail(err) {
    debug('Api app index failure: ', err);
    res.send(500, err);
  });
});
