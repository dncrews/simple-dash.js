var expect = require('chai').expect
  , db = require('../../db')
  , Model = require('../../../Models/Service');

function clearDB(done) {
  Model.remove(done);
}

describe('Services interface:', function() {

  after(function(done) {
    db.dropDatabase(done);
  });

  describe('Given a "good" sample splunk flat_response_data, fromSplunk', function() {

    var mockData = getMockData('good')
      , service;

    before(function(done) {
      Model.fromSplunk(mockData).then(function(doc) {
        service = doc;
        done();
      }, function(err) {
        expect().fail(err);
        done();
      });
    });

    after(clearDB);

    it('should save', function(done) {
      Model.find(function(err, docs) {
        expect(docs.length).to.equal(1);
        expect(docs[0]._id).to.eql(service._id);
        done();
      });
    });

    it('should set the raw data as _raw', function() {
      expect(service._raw).to.be.an.instanceof(Object);
      expect(service._raw).to.eql(mockData);
    });

    it('should set name', function() {
      expect(service.name).to.equal('api_name');
    });

    it('should create a time object', function() {
      expect(service.time.p95).to.equal(170);
    });

    it('create a time and a codes object', function() {
      expect(service.codes['2xx']).to.equal(3211);
      expect(service.codes['3xx']).to.equal(3);
      expect(service.codes['4xx']).to.equal(4);
      expect(service.codes['5xx']).to.equal(5);
      expect(service.codes.total).to.equal(3223);
    });

    it('should round up the error_rate', function() {
      expect(service.error_rate).to.equal(1);
    });

    it('should calculate a "good" status', function() {
      expect(service.status).to.equal('good');
    });

  });

  describe('Given no data, fromSplunk', function() {
    it('should return as an error', function(done) {
      Model.fromSplunk().then(
        function doNotWant() {},
        function rejected(err) {
          expect(err).to.be.an.instanceof(Error);
          done();
        });
    });
  });

  describe('Given no "api" name, fromSplunk', function() {
    it('should return as an error', function(done) {
      Model.fromSplunk().then(
        function doNotWant() {},
        function rejected(err) {
          expect(err).to.be.an.instanceof(Error);
          done();
        });
    });
  });

  describe('Given an almost-"slow" sample, fromSplunk', function() {

    after(clearDB);

    it('should calculate a "good" status', function(done) {
      Model.fromSplunk(getMockData('almostSlow')).then(function(doc) {
        expect(doc.status).to.equal('good');
        done();
      });
    });
  });

  describe('Given a "slow" sample, fromSplunk', function() {
    it('should calculate a "slow" status', function(done) {
      Model.fromSplunk(getMockData('slow')).then(function(doc) {
        expect(doc.status).to.equal('slow');
        done();
      });
    });
  });

  describe('Given an almost-"down" sample, fromSplunk', function() {
    it('should calculate a "good" status', function(done) {
      Model.fromSplunk(getMockData('almostDown')).then(function(doc) {
        expect(doc.status).to.equal('good');
        done();
      });
    });
  });

  describe('Given a "down" sample, fromSplunk', function() {
    it('should calculate a "down" status', function(done) {
      Model.fromSplunk(getMockData('down')).then(function(doc) {
        expect(doc.status).to.equal('down');
        done();
      });
    });
  });

  describe('Given a "slow" and "down", fromSplunk', function() {
    it('should calculate a "down" status', function(done) {
      Model.fromSplunk(getMockData('slowAndDown')).then(function(doc) {
        expect(doc.status).to.equal('down');
        done();
      });
    });
  });

});



function getMockData(type) {
  var mocks = {
    good : {
      "api": "api_name",
      "time:p50": "58",
      "time:p90": "129",
      "time:p95": "170",
      "time:max": "3088",
      "status:2xx": "3211",
      "status:3xx": "3",
      "status:4xx": "4",
      "status:5xx": "5",
      "status:total": "3223",
      "alertTitle": "status:dashboard:frontier:api:flat_response_data"
    },
    noName : {
      "time:p50": "58",
      "time:p90": "129",
      "time:p95": "170",
      "time:max": "3088",
      "status:2xx": "3211",
      "status:3xx": "3",
      "status:4xx": "4",
      "status:5xx": "5",
      "status:total": "3223",
      "alertTitle": "status:dashboard:frontier:api:flat_response_data"
    },
    almostSlow : {
      "api": "api_name",
      "time:p95": "999"
    },
    slow : {
      "api": "api_name",
      "time:p95": "1000"
    },
    almostDown : {
      "api": "api_name",
      "status:5xx": "490",
      "status:total": "1000",
    },
    down : {
      "api": "api_name",
      "status:5xx": "491",
      "status:total": "1000",
    },
    slowAndDown : {
      "api": "api_name",
      "time:p95": "1000",
      "status:5xx": "491",
      "status:total": "1000",
    }
  };
  return mocks[type];
}
