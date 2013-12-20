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

  Change
    .find()
    .sort({
      created_at : -1
    })
    .exec(function(err, docs) {
      if (err) {
        debug('Index docs failure: ', err);
        return res.send(500, err);
      }
      res.send(200, docs);
    });
});

app.get('/more/:id', function (req, res) {
  Change
    .find({ _id : { $lt : req.params.id }})
    .sort({ created_at : -1 })
    .limit(20)
    .exec(function(err, docs) {
      if (err) {
        debug('More change fetch failed: ', err);
        return res.send(500, err);
      }
      res.send(200, docs);
    });
});

app.get('/app/:app_name', function (req, res) {
  var repo_name = req.params.app_name.replace('fs-', '').replace('-prod','');
  Change
    .find({
      repo_name : repo_name,
    })
    .sort({
      created_at : -1
    })
    .exec(function(err, docs) {
      if (err) {
        debug('Change history failure: ', err);
        return res.send(500, err);
      }
      res.send(200, docs);
    });
});
