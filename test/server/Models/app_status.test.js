/* global require,describe,it,console */
'use strict';

var expect = require('expect.js')
  , Model = require('../../../Models/App_Status.js');

describe('Apps interface:', function() {

  describe('Given a "good" sample splunk mem_response, fromSplunk', function() {

    var mockData = getMockData('good')
      , sut = Model.fromSplunk(mockData);

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
      expect(sut.codes.s2xx).to.be(1000);
      expect(sut.codes.s3xx).to.be(3);
      expect(sut.codes.s4xx).to.be(4);
      expect(sut.codes.s5xx).to.be(5);
      expect(sut.codes.sTotal).to.be(1012);
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

  describe('Given no "fs_host" name, fromSplunk', function() {
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
    }
  };
  return mocks[type];
}
