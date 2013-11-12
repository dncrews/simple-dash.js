/*global Buffer:false,clearInterval:false,clearTimeout:false,console:false,exports:false,global:false,module:false,process:false,querystring:false,require:false,setInterval:false,setTimeout:false,__filename:false,__dirname:false */
'use strict';

/**
 * Dependencies
 */
var express = require('express')
  , Q = require('q')
  , debug = require('debug')('dash:api:event');

/**
 * Local Vars
 */
var app = module.exports = express()
  , db = require('../lib/db');

app.get('/', function (req, res) {
  db.change_log.current().then(function success(docs) {
    debug('Index docs retrieved: ' + docs.length);
    res.send(docs);
  }, function fail(err) {
    debug('Index docs failure: ', err);
    res.send(500, err);
  });
});

app.get('/:api_name', function (req, res) {
  db.change_log.history(req.params.api_name).then(function success(docs) {
    debug('Api history retrieved: ' + docs.length);
    res.send(docs);
  }, function fail(err) {
    debug('Api history failure: ', err);
    res.send(500, err);
  });
});

app.get('/app/:app_name', function (req, res) {
  db.change_log.appHistory(req.params.app_name).then(function success(docs) {
    debug('Api app index retrieved: ' + docs.length);
    console.log(docs[0]);
    res.send(docs);
  }, function fail(err) {
    debug('Api app index failure: ', err);
    res.send(500, err);
  });
});
