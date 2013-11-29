/* global require,describe,it,console,after,afterEach,before,setTimeout */
'use strict';

var expect = require('expect.js')
  , db = require('../../db')
  , Model = require('../../../Models/App_Bucket')
  , Status = require('../../../Models/App_Status')
  , Q = require('q');

describe('App_Bucket interface:', function() {

  after(function(done) {
    db.dropDatabase(done);
  });

  describe('When creating a new bucket, App_Bucket', function() {

    it('should generate a bucket_time that is rounded down to the nearest 5-minute interval', function() {
      var bucket_length = 1000 * 60 * 5
        , bucket = new Date(Math.floor(new Date().getTime() / bucket_length) * bucket_length)
        , sut = new Model();

      expect(sut.bucket_time).to.eql(bucket);
      expect(sut.app_id).to.be(null);
      expect(sut.error_id).to.be(null);

    });

  });

  describe('If attempting to create a duplicate, App_Bucket', function() {

    after(function(done) {
      Model.remove(done);
    });

    it('should throw a duplicate key error', function(done) {
      var repo_name = 'test_app';

      Model.create({
        repo_name : repo_name
      }, function(err, one) {
        expect(one.repo_name).to.be(repo_name);
        Model.create({
          repo_name : repo_name,
          bucket_time : one.bucket_time
        }, function(err, two) {
          expect(err).to.be.an(Error);
          expect(err.message).to.match(/E11000/);
          done();
        });
      });


    });
  });

  describe('generateBuckets:', function(){
    afterEach(function(done) {
      Model.remove(done);
    });
    describe('Given no arguments, generateBuckets', function() {

      after(function(done) {
        Status.remove(done);
      });

      it('should create 3 buckets for all unique App_Status repo_names', function(done) {
        var apps = [ 'status1', 'status2' ]
          , items = []
          , dfd, buckets;

        for (var i=0, l=apps.length; i<l; i++) {
          // Generate 3 apps
          for (var ii=0, ll=3; ii<ll; ii++) {
            items.push({ repo_name : apps[i]});
          }
        }

        expect(items.length).to.be(6);

        Status.create(items, function() {
          Status.find(function(err, docs) {
            expect(docs.length).to.be(6);

            Model.generateBuckets().then(function(buckets) {
              verifyApps(apps, buckets, 6, done);
            });
          });
        });

      });

    });

    describe('Given an array of apps, generateBuckets', function() {

      it('should create buckets for the given apps', function(done) {
        var apps = [ 'repo1', 'repo2', 'repo3' ];
        Model.generateBuckets(null, apps).then(function(buckets) {
          verifyApps(apps, buckets, 9, done);
        });
      });

    });

    describe('Given a number to create, generateBuckets', function() {


      it('should create the given number of buckets for the given apps', function(done) {

        var apps = [ 'respo1', 'respo2', 'respo3', 'respo4' ];
        Model.generateBuckets(5, apps).then(function(buckets) {
          verifyApps(apps, buckets, 20, done);
        });
      });

    });

  });

  describe('Adding to a bucket', function() {

    describe('Given an objectId, addApp', function() {

      it('should add and save.');

    });

    describe('Given an objectId, addError', function() {

      it('should add and save.');

    });

    describe('Given no bucket exists, addApp', function() {

      it('should generate new buckets');

    });

    describe('Given no bucket exists, addError', function() {

      it('should generate new buckets');

    });

  });

  // describe('Given')

});

function verifyApps(apps, buckets, total, done) {
  var dfd = Q.defer()
    , dfds = [ dfd ];

  function verifyOne(app, time) {
    var dfd = Q.defer();

    Model.find({repo_name : app, bucket_time : time}, function(err, docs) {
      expect(docs.length).to.be(1);
      dfd.resolve();
    });

    return dfd.promise;
  }
  for (var i=0, l=apps.length; i<l; i++) {
    for (var ii=0, ll=buckets.length; ii<ll; ii++) {
      dfds.push(verifyOne(apps[i], buckets[ii]));
    }
  }
  Model.find(function(err, docs) {
    expect(docs.length).to.be(total);
    dfd.resolve();
  });

  expect(dfds.length).to.be(total+1);

  Q.all(dfds).then(function() {
    done();
  });
}
