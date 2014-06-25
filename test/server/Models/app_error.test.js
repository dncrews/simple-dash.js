var expect = require('expect.js')
  , Q = require('q')
  , db = require('../../db')
  , Model = require('../../../Models/App_Error')
  , Bucket = require('../../../Models/App_Bucket')
  , Change = require('../../../Models/Change');

function clearDB(done) {
  Model.remove(function() {
    Bucket.remove(function() {
      Change.remove(done);
    });
  });
}

describe('App Errors interface:', function() {
  after(function(done) {
    db.dropDatabase(done);
  });

  describe('Given a splunk heroku_errors, fromSplunk', function() {
    after(clearDB);

    it('FIXME: make fromSplunk not dfd; functions require cb; routines use dfd');

    var mockData = getMockData('normal')
      , sut
      , errors
      , buckets
      , changes;

    before(function(done) {
      Model.fromSplunk(mockData).then(function(doc) {
        sut = doc;
        Model.find(function(err, docs) {
          errors = docs;
          Bucket.find(function(err, docs) {
            buckets = docs;
            done();
          });
        });
      });
    });

    it('should create a status for each appName', function(done) {
      Model.find(function(err, docs) {
        if (err) return expect().fail();

        expect(docs.length).to.be(2);
        done();
      });
    });

    describe('For each app,', function() {
      var status;
      before(function(done) {
        Model.findOne({ name:'fs-appName-prod' }, function(err, doc) {
          if (err) return expect().fail();
          status = doc;
          done();
        });
      });
      it('should set the name and repo_name', function() {
        expect(status.name).to.be('fs-appName-prod');
        expect(status.repo_name).to.be('appName');
      });
      it('should create a codes array', function() {
        expect(status.codes.length).to.be(2);
        expect(status.codes[0].code).to.be('H17');
        expect(status.codes[1].code).to.be('H12');
      });
      it('should call App_Bucket.addApp with the generated ids', function(done) {
        Bucket.find({ repo_name : 'appName', app_errors : { $ne : null } }, function(err, docs) {
          expect(docs.length).to.be(1);
          expect(docs[0].app_errors).to.eql(status._id);
          done();
        });
      });

    });

  });

  describe('Given no data, fromSplunk', function() {
    after(clearDB);
    it('should reject with an error', function(done) {
      Model.fromSplunk().then(
        function doNotWant() {},
        function rejected(err) {
          expect(err).to.be.an(Error);
          done();
        });
    });
  });

  describe('Given no "fs_host" name, fromSplunk', function() {
    after(clearDB);
    it('should reject with an error', function(done) {
      Model.fromSplunk(getMockData('noName')).then(
        function doNotWant() {},
        function rejected(err) {
          expect(err).to.be.an(Error);
          done();
        });
    });
  });

  describe('Given a code of "R14", fromSplunk', function() {
    var restartCalled = 0;
    before(function() {
      Change.mock(function(app_name, reason, cb) {
        restartCalled++;
        if (cb) cb(null, true);
        return Q.resolve();
      });
    });
    after(function() {
      Change.restore();
      clearDB();
    });
    after(clearDB);
    it('should trigger a Heroku restart', function(done) {
      Model.fromSplunk(getMockData('restart')).then(function() {
        expect(restartCalled).to.be(1);
        done();
      });
    });
  });

});



function getMockData(type) {
  var mocks = {
    'normal' : [
      {
        'fs_host' : 'fs-appName-prod',
        'code' : 'H12',
        'desc' : 'Request timeout',
        'count' : '2'
      },
      {
        'fs_host' : 'fs-appName-prod',
        'code' : 'H17',
        'desc' : 'Poorly formatted HTTP response',
        'count' : '1'
      },
      {
        'fs_host' : 'fs-secondApp-prod',
        'code' : 'H12',
        'desc' : 'Request timeout',
        'count' : '1'
      }
    ],
    'noName' : [
      {
        'code' : 'H17',
        'desc' : 'Poorly formatted HTTP response',
        'count' : '1'
      }
    ],
    'restart' : [
      {
        'fs_host' : 'fs-otherApp-prod',
        'code' : 'R14',
        'desc' : 'Memory quota exceeded',
        'count' : '1'
      }
    ]
  };
  return mocks[type];
}
