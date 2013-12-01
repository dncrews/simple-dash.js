/* global require,describe,it,console,before,beforeEach,after,afterEach,setTimeout */
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
      expect(sut.app).to.be(null);
      expect(sut.app_errors).to.be(null);

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
          , buckets;

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

  describe('adding to buckets:', function() {

    var id, app_name = 'appName';

    before(function(done) {
      Status.create({
        repo_name : app_name
      }, function(err, doc) {
        id = doc._id;
        done();
      });
    });

    after(function(done) {
      Status.remove(done);
    });

    afterEach(function(done) {
      Model.remove(done);
    });

    describe('Given an ObjectId, addApp', function() {

      before(function(done) {
        Model.generateBuckets(1, [app_name]).then(function() {
          done();
        });
      });

      it('should add and save', function(done) {

        Model.addApp('appName', id).then(function() {
          Model.find({ repo_name : 'appName', app : id }, function(err, docs) {
            expect(docs.length).to.be(1);
            expect(docs[0].app_errors).to.be(null);
            done();
          });
        });

      });

    });

    describe('Given an ObjectId, addErrors', function() {

      before(function(done) {
        Model.generateBuckets(1, [app_name]).then(function() {
          done();
        });
      });

      it('should add and save', function(done) {

        Model.addErrors('appName', id).then(function() {
          Model.find({ repo_name : 'appName', app_errors : id }, function(err, docs) {
            expect(docs.length).to.be(1);
            expect(docs[0].app).to.be(null);
            done();
          });
        });

      });

    });

    describe('Given no bucket exists, addApp', function() {

      it('should generate buckets', function(done) {
        Model.addApp('appName', id).then(function() {
          Model.find({ repo_name : 'appName' }, function(err, docs) {
            expect(docs.length).to.be(3);
            done();
          });
        });
      });

    });

    describe('Given no bucket exists, addErrors', function() {

      it('should generate buckets', function(done) {
        Model.addErrors('appName', id).then(function() {
          Model.find({ repo_name : 'appName' }, function(err, docs) {
            expect(docs.length).to.be(3);
            done();
          });
        });
      });

    });

  });

  describe('When getting a list of all current buckets, findCurrent', function() {

    this.timeout(10000);

    var appNames = [
      'app1',
      'app2',
      'app3',
      'app4'
    ], times, current;

    var made;

    before(function(done) {
      var i=0
        , oldDate = Date.now() - 36000000; // 10 hours ago

      function addOlder() {
        var appName = appNames[i++];

        if (! appName) {
          return Model.findCurrent(function(err, docs) {
            current = docs;
            done();
          });
        }

        Model.create({
          repo_name : appName,
          bucket_time : oldDate
        }, addOlder);
      }

      (function createApp() {
        var appName = appNames[i++];

        if (! appName) {
          return Model.generateBuckets().then(function(buckets) {
            times = buckets;
            i = 0;
            addOlder();
          });
        }

        Status.create({
          repo_name : appName
        }, function(err, doc) {
          Model.addApp(doc.repo_name, doc._id).then(createApp);
        });
      })();
    });

    after(function(done) {
      Model.remove(done);
    });

    it('should fetch as many buckets as there are apps (only)', function() {
      expect(current.length).to.be(4);
    });

    it('should fetch (only) one bucket for each app', function() {
      expect(current.length).to.be(4);
      var used = []
        , docs = current.filter(function(el) {
        if (used.indexOf(el._id) === -1) {
          used.push(el._id);
          return false;
        }
        return true;
      });
      expect(docs.length).to.be(0);
    });

    it('should fetch the most recent bucket for each app', function() {
      expect(current.length).to.be(4);
      for(var i=0, l=current.length; i<l; i++) {
        expect(current[i].bucket_time).to.eql(times[0]);
      }
    });

    it('should populate the app data for each bucket', function() {
      var bucket;
      expect(current.length).to.be(4);
      for(var i=0, l=current.length; i<l; i++) {
        bucket = current[i];
        expect(bucket.app).to.not.be(null);
        expect(bucket.app.repo_name).to.be(bucket.repo_name);
      }
    });

    it('should populate the error data for each bucket');

  });

});

function verifyApps(apps, buckets, total, done) {
  var appInc=0, timeInc=0;

  function verifyEach() {
    var app = apps[appInc]
      , time = buckets[timeInc++];

    if (! app) return done();
    if (! time) {
      timeInc = 0; // Start over the time list
      appInc++;
      return verifyEach(); // On to the next app
    }

    Model.find({ repo_name : app, bucket_time : time }, function(err, docs) {
      expect(docs.length).to.be(1);
      verifyEach();
    });
  }

  Model.find(function(err, docs) {
    expect(docs.length).to.be(total);
    return verifyEach();
  });
}
