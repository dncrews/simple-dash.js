var expect = require('expect.js')
  , Model = require('../../../Models/Service');

describe('Services interface:', function() {

  describe('Given a "good" sample splunk flat_response_data, fromSplunk', function() {
    var mockData = getMockData('good')
      , sut = Model.fromSplunk(mockData);

    it('should save the raw data as _raw', function() {
      expect(sut._raw).to.be.an(Object);
      expect(sut._raw).to.eql(mockData);
    });

    it('should set name and created_at', function() {
      expect(sut.name).to.be('api_name');
      expect(sut.created_at).to.be.a(Date);
    });

    it('should create a time object', function() {
      expect(sut.time.p95).to.be(170);
    });

    it('create a time and a codes object', function() {
      expect(sut.codes.s2xx).to.be(3211);
      expect(sut.codes.s3xx).to.be(3);
      expect(sut.codes.s4xx).to.be(4);
      expect(sut.codes.s5xx).to.be(5);
      expect(sut.codes.sTotal).to.be(3223);
    });

    it('should round up the error_rate', function() {
      expect(sut.error_rate).to.be(1);
    });

    it('should calculate a "good" status', function() {
      expect(sut.status).to.be('good');
    });

  });

  describe('Given no data, fromSplunk', function() {
    it('should return as an error', function() {
      var sut = Model.fromSplunk();
      expect(sut).to.be.an(Error);
    });
  });

  describe('Given no "api" name, fromSplunk', function() {
    it('should return as an error', function() {
      var sut = Model.fromSplunk(getMockData('noName'));
      expect(sut).to.be.an(Error);
    });
  });

  describe('Given an almost-"slow" sample, fromSplunk', function() {
    it('should calculate a "good" status', function() {
      var sut = Model.fromSplunk(getMockData('almostSlow'));
      expect(sut.status).to.be('good');
    });
  });

  describe('Given a "slow" sample, fromSplunk', function() {
    it('should calculate a "slow" status', function() {
      var sut = Model.fromSplunk(getMockData('slow'));
      expect(sut.status).to.be('slow');
    });
  });

  describe('Given an almost-"down" sample, fromSplunk', function() {
    it('should calculate a "good" status', function() {
      var sut = Model.fromSplunk(getMockData('almostDown'));
      expect(sut.status).to.be('good');
    });
  });

  describe('Given a "down" sample, fromSplunk', function() {
    it('should calculate a "down" status', function() {
      var sut = Model.fromSplunk(getMockData('down'));
      expect(sut.status).to.be('down');
    });
  });

  describe('Given a "slow" and "down", fromSplunk', function() {
    it('should calculate a "down" status', function() {
      var sut = Model.fromSplunk(getMockData('slowAndDown'));
      expect(sut.status).to.be('down');
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
