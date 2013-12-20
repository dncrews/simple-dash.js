var expect = require('expect.js')
  , db = require('../../db')
  , Model = require('../../../Models/App_Bucket')
  , Status = require('../../../Models/App_Status')
  , Errors = require('../../../Models/App_Error')
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

  describe('generateBuckets:', function(){
    afterEach(function(done) {
      Model.remove(done);
    });
    describe('Given no arguments, generateBuckets', function() {

      after(function(done) {
        Status.remove(done);
      });

      it('should create 3 buckets for all unique App_Status names', function(done) {
        var apps = [ 'status1', 'status2' ]
          , items = []
          , buckets;

        for (var i=0, l=apps.length; i<l; i++) {
          // Generate 3 apps
          for (var ii=0, ll=3; ii<ll; ii++) {
            items.push({ name : apps[i]});
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
        name : app_name
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

      it('FIXME: make getBucket not dfd; functions require cb; routines use dfd');

      it('should add and save', function(done) {

        Model.addApp('appName', id).then(function() {
          Model.find({ name : 'appName', app : id }, function(err, docs) {
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
          Model.find({ name : 'appName', app_errors : id }, function(err, docs) {
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
          Model.find({ name : 'appName' }, function(err, docs) {
            expect(docs.length).to.be(3);
            done();
          });
        });
      });

    });

    describe('Given no bucket exists, addErrors', function() {

      it('should generate buckets', function(done) {
        Model.addErrors('appName', id).then(function() {
          Model.find({ name : 'appName' }, function(err, docs) {
            expect(docs.length).to.be(3);
            done();
          });
        });
      });

    });

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

    Model.find({ name : app, bucket_time : time }, function(err, docs) {
      expect(docs.length).to.be(1);
      verifyEach();
    });
  }

  Model.find(function(err, docs) {
    expect(docs.length).to.be(total);
    return verifyEach();
  });
}
