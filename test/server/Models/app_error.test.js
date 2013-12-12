var expect = require('expect.js')
  , Model = require('../../../Models/App_Error')
  , Bucket = require('../../../Models/App_Bucket')
  , Change = require('../../../Models/Change');

describe('App Errors interface:', function() {

  afterEach(function(done) {
    Model.remove(function() {
      Bucket.remove(function() {
        Change.remove(done);
      });
    });
  });

  describe('Give a splunk heroku_errors, fromSplunk', function() {

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

    it('should save the raw data as _raw', function() {
      expect(sut._raw).to.be.an(Object);
      expect(sut._raw).to.eql(mockData);
    });

    it('should set the name and repo_name', function() {
      expect(sut.name).to.be('fs-appName-prod');
      expect(sut.repo_name).to.be('appName');
    });

    it('should set created_at', function() {
      expect(sut.created_at).to.be.a(Date);
    });

    it('should create a codes array', function() {
      expect(sut.codes).to.be.an(Array);
      expect(sut.codes[0].code).to.be('H12');
      expect(sut.codes[0].count).to.be('2');
    });

    it('should save', function() {
      expect(errors.length).to.be(1);
      expect(errors[0].repo_name).to.be(sut.repo_name);
    });

    it('should call App_Bucket.addApp with the generated id', function() {
      expect(buckets.length).to.be(3);
    });

  });

  describe('Given no data, fromSplunk', function() {
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
    it('should trigger a Heroku restart', function(done) {
      Model.fromSplunk(getMockData('restart')).then(function() {
        Change.find(function(err, docs) {
          expect(docs.length).to.be(1);
          expect(docs[0].meta.reason).to.be('Memory quota exceeded');
          done();
        });
      });
    });
  });

});



function getMockData(type) {
  var mocks = {
    'normal' : {
      'fs_host' : 'fs-appName-prod',
      'codes' : [
        {
          'code' : 'H12',
          'desc' : 'Request timeout',
          'count' : '2'
        },
        {
          'code' : 'H17',
          'desc' : 'Poorly formatted HTTP response',
          'count' : '1'
        }
      ]
    },
    'no_name' : {
      'codes' : [
        {
          'code' : 'H17',
          'desc' : 'Poorly formatted HTTP response',
          'count' : '1'
        }
      ]
    },
    'restart' : {
      'fs_host' : 'fs-otherApp-prod',
      'codes' : [
        {
          'code' : 'R14',
          'desc' : 'Memory quota exceeded',
          'count' : '1'
        }
      ]
    }
  };
  return mocks[type];
}
