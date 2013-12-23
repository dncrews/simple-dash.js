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

app.get('/types', function (req, res) {
  Change.find().distinct('type').exec(function(err, types) {
    if (err) {
      debug('Type list error: ', err);
      res.send(500, err);
    }
    debug('Type list: ', types);
    res.send(200, types);
  });
});

app.get('/repos', function (req, res) {

  Change.find().distinct('repo_name').exec(function(err, repos) {
    if (err) {
      debug('Repo list error: ', err);
      res.send(500, err);
    }
    debug('Repo list: ', repos);
    res.send(200, repos);
  });

});
