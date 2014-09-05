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
  var repo_name = req.params.app_name.replace('fs-', '').replace('-prod','')
    // This is a hack to fix the bad EC names. TTL: 9/13/14 see dcrews
    , bad_repo_name = 'frontier-' + repo_name
    , days = req.query.days || 7
    , date = new Date()
    , then = date.setDate(date.getDate() - days);

  Change
    .find({
    // This is a hack to fix the bad EC names. TTL: 9/13/14 see dcrews
      // repo_name : repo_name,
      created_at : { $gte : then }
    })
    // This is a hack to fix the bad EC names. TTL: 9/13/14 see dcrews
    .or([ { repo_name : repo_name }, { repo_name : bad_repo_name }])
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
