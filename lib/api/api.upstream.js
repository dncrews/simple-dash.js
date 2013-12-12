/**
 * Dependencies
 */
var express = require('express')
  , Q = require('q')
  , debug = require('debug')('dash:api:upstream');

/**
 * Local Vars
 */
var app = module.exports = express()
  , db = require('../db');

app.get('/', function (req, res) {
  db.upstream.current().then(function success(docs) {
    debug('Index docs retrieved: ' + docs.length);
    res.send(docs);
  }, function fail(err) {
    debug('Index docs failure: ', err);
    res.send(500, err);
  });
});

app.get('/:upstream_name', function (req, res) {
  db.upstream.history(req.params.upstream_name).then(function success(docs) {
    debug('App history retrieved: ' + docs.length);
    res.send(docs);
  }, function fail(err) {
    debug('App history failure: ', err);
    res.send(500, err);
  });
});
