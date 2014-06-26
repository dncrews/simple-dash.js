var expect = require('expect.js')
  , Q = require('q')
  , db = require('../../db')
  , Model = require('../../../Models/App_Status')
  , Bucket = require('../../../Models/App_Bucket')
  , Change = require('../../../Models/Change');

describe('Apps interface:', function() {

  after(function(done) {
    db.dropDatabase(done);
  });

  afterEach(function(done) {
    Model.remove(function() {
      Bucket.remove(done);
    });
  });

  describe('Given a "good" sample splunk mem_response, fromSplunk', function() {

    var mockData = getMockData('good')
      , sut
      , statuses
      , buckets;

    before(function(done) {
      Model.fromSplunk(mockData).then(function(doc) {
        sut = doc;
        Model.find(function(err, docs) {
          statuses = docs;
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

    it('should create a time object', function() {
      expect(sut.time.p75).to.be(160);
      expect(sut.time.p95).to.be(380);
    });

    it('should create a memory object', function() {
      expect(sut.memory.avg).to.be(272);
      expect(sut.memory.max).to.be(300);
    });

    it('should create a codes object', function() {
      expect(sut.codes['2xx']).to.be(1000);
      expect(sut.codes['3xx']).to.be(3);
      expect(sut.codes['4xx']).to.be(4);
      expect(sut.codes['5xx']).to.be(5);
      expect(sut.codes.total).to.be(1012);
    });

    it('should round up the error_rate', function() {
      expect(sut.error_rate).to.be(1);
    });

    it('should calculate a "good" status', function() {
      expect(sut.status).to.be('good');
    });

    it('should save', function() {
      expect(statuses.length).to.be(1);
      expect(statuses[0].repo_name).to.be(sut.repo_name);
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

  describe('Given an almost-"slow" sample, fromSplunk', function() {
    it('should calculate a "good" status', function(done) {
      Model.fromSplunk(getMockData('almostSlow')).then(function(sut) {
        expect(sut.status).to.be('good');
        done();
      });
    });
  });

  describe('Given a "slow" sample, fromSplunk', function() {
    it('should calculate a "slow" status', function(done) {
      Model.fromSplunk(getMockData('slow')).then(function(sut) {
        expect(sut.status).to.be('slow');
        done();
      });
    });
  });

  describe('Given an almost-"down" sample, fromSplunk', function() {
    it('should calculate a "good" status', function(done) {
      Model.fromSplunk(getMockData('almostDown')).then(function(sut) {
        expect(sut.status).to.be('good');
        done();
      });
    });
  });

  describe('Given a "down" sample, fromSplunk', function() {
    it('should calculate a "down" status', function(done) {
      Model.fromSplunk(getMockData('down')).then(function(sut) {
        expect(sut.status).to.be('down');
        done();
      });
    });
  });

  describe('Given a "slow" and "down", fromSplunk', function() {
    it('should calculate a "down" status', function(done) {
      Model.fromSplunk(getMockData('slowAndDown')).then(function(sut) {
        expect(sut.status).to.be('down');
        done();
      });
    });
  });

  describe('When status changes to "down",', function() {

    var notified = false, docs;

    before(function(done) {
      Change.mock(null, function fakeNotify(appName, type, description, cb) {
        notified = type;
        if (cb) cb();
        return Q.resolve();
      });
      Model.fromSplunk(getMockData('good')).then(function() {
        Model.fromSplunk(getMockData('down')).then(function() {
          Change.find().exec(function(err, _docs) {
            docs = _docs;
            done();
          });
        });
      });
    });

    after(function(done) {
      Change.remove(done);
      Change.restore();
    });

    it('should register a Change', function() {
      var doc = docs[0];
      expect(docs.length).to.be(1);
      expect(doc.type).to.be('marrow');
      expect(doc.action).to.be('status.change');
      expect(doc.meta.reason).to.be('Status changed from "good" to "down"');
    });

    it('should send a "toDown" notification', function() {
      expect(notified).to.be('toDown');
    });
  });

  describe('When status changes from "down",', function() {

    var notified = false, docs;

    before(function(done) {
      Change.mock(null, function fakeNotify(appName, type, description, cb) {
        notified = type;
        if (cb) cb();
        return Q.resolve();
      });
      Model.fromSplunk(getMockData('down')).then(function() {
        Model.fromSplunk(getMockData('slow')).then(function() {
          Change.find().exec(function(err, _docs) {
            docs = _docs;
            done();
          });
        });
      });
    });

    after(function(done) {
      Change.remove(done);
      Change.restore();
    });

    it('should register a Change', function() {
      var doc = docs[0];
      expect(docs.length).to.be(1);
      expect(doc.type).to.be('marrow');
      expect(doc.action).to.be('status.change');
      expect(doc.meta.reason).to.be('Status changed from "down" to "slow"');
    });

    it('should send a "toSlow" notification', function() {
      expect(notified).to.be('toSlow');
    });
  });

  describe('Given a 30s p75 response time, fromSplunk', function() {
    before(function() {
      Change.mock();
    });
    after(function() {
      Change.restore();
    });
    it('should trigger a Heroku restart', function(done) {
      Model.fromSplunk(getMockData('restart')).then(function() {
        Change.find(function(err, docs) {
          expect(docs.length).to.be(1);
          expect(docs[0].meta.reason).to.be('p75 response time exceeded 30s');
          done();
        });
      });
    });
  });

});



function getMockData(type) {
  var mocks = {
    good : {
      "fs_host":"fs-appName-prod",
      "mem:avg":"272.120000",
      "mem:max":"300.3456",
      "status:2xx":"1000",
      "status:3xx":"3",
      "status:4xx":"4",
      "status:5xx":"5",
      "status:total":"1012",
      "time:max":"3699",
      "time:p50":"136",
      "time:p75":"160",
      "time:p90":"290",
      "time:p95":"380"
    },
    almostSlow : {
      "fs_host": "fs-appName-prod",
      "time:p95": "4999"
    },
    slow : {
      "fs_host": "fs-appName-prod",
      "time:p95": "5000"
    },
    almostDown : {
      "fs_host": "fs-appName-prod",
      "status:5xx": "490",
      "status:total": "1000",
    },
    down : {
      "fs_host": "fs-appName-prod",
      "status:5xx": "491",
      "status:total": "1000",
    },
    slowAndDown : {
      "fs_host": "fs-appName-prod",
      "time:p95": "5000",
      "status:5xx": "491",
      "status:total": "1000",
    },
    restart : {
      "fs_host": "fs-appName-prod",
      "time:p95": "5000",
      "status:5xx": "491",
      "time:p75":"30001",
      "status:total": "1000",
    }
  };
  return mocks[type];
}
