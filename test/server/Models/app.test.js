/* global require,describe,it,console */
'use strict';

var expect = require('expect.js')
  , Model = require('../../../Models/App.js');

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

var memResponseData = {
  "src": "splunk",
  "alert_title": "status.dashboard.frontier.mem_response",
  "data": [
    {
      "fs_host":"fs-archives-prod",
      "mem:avg":"259.103793",
      "mem:max":"306.05",
      "status:2xx":"789",
      "status:3xx":"0",
      "status:4xx":"0",
      "status:5xx":"0",
      "status:total":"789",
      "time:max":"3699",
      "time:p50":"136",
      "time:p90":"290",
      "time:p95":"380"
    },
    {
      "fs_host":"fs-ask-prod",
      "mem:avg":"123.306429",
      "mem:max":"128.49",
      "status:2xx":"0",
      "status:3xx":"1577",
      "status:4xx":"0",
      "status:5xx":"0",
      "status:total":"1577",
      "time:max":"4347",
      "time:p50":"19",
      "time:p90":"530",
      "time:p95":"1000"
    },
    {
      "fs_host":"fs-auth-prod",
      "mem:avg":"259.103793",
      "mem:max":"306.05",
      "status:2xx":"231",
      "status:3xx":"0",
      "status:4xx":"0",
      "status:5xx":"1",
      "status:total":"232",
      "time:max":"4346",
      "time:p50":"123",
      "time:p90":"286",
      "time:p95":"360"
    },
    {
      "fs_host":"fs-catalog-prod",
      "mem:avg":"103.972857",
      "mem:max":"127.57",
      "status:2xx":"740",
      "status:3xx":"0",
      "status:4xx":"2",
      "status:5xx":"0",
      "status:total":"742",
      "time:max":"3528",
      "time:p50":"134",
      "time:p90":"400",
      "time:p95":"500"
    },
    {
      "fs_host":"fs-collection-prod",
      "mem:avg":"144.361724",
      "mem:max":"153.42",
      "status:2xx":"494",
      "status:3xx":"1",
      "status:4xx":"3",
      "status:5xx":"0",
      "status:total":"498",
      "time:max":"4393",
      "time:p50":"355",
      "time:p90":"1300",
      "time:p95":"1550"
    },
    {
      "fs_host":"fs-first-run-prod",
      "mem:avg":"124.207931",
      "mem:max":"142.93",
      "status:2xx":"3058",
      "status:3xx":"2615",
      "status:4xx":"0",
      "status:5xx":"0",
      "status:total":"5673",
      "time:max":"6026",
      "time:p50":"7",
      "time:p90":"30",
      "time:p95":"100"
    },
    {
      "fs_host":"fs-header-footer-prod",
      "mem:avg":"193.799259",
      "mem:max":"260.82",
      "status:2xx":"2284",
      "status:3xx":"0",
      "status:4xx":"1",
      "status:5xx":"0",
      "status:total":"2285",
      "time:max":"6532",
      "time:p50":"139",
      "time:p90":"1000",
      "time:p95":"1900"
    },
    {
      "fs_host":"fs-home-prod",
      "mem:avg":"107.433333",
      "mem:max":"114.21",
      "status:2xx":"3149",
      "status:3xx":"0",
      "status:4xx":"0",
      "status:5xx":"0",
      "status:total":"3149",
      "time:max":"19147",
      "time:p50":"1540",
      "time:p90":"10500",
      "time:p95":"12500"
    },
    {
      "fs_host":"fs-hr-prod",
      "mem:avg":"165.682286",
      "mem:max":"190.42",
      "status:2xx":"29",
      "status:3xx":"27",
      "status:4xx":"2",
      "status:5xx":"3",
      "status:total":"61",
      "time:max":"7564",
      "time:p50":"899",
      "time:p90":"2515",
      "time:p95":"2683"
    },
    {
      "fs_host":"fs-identity-prod",
      "mem:avg":"54.798750",
      "mem:max":"65.06",
      "status:2xx":"8148",
      "status:3xx":"342",
      "status:4xx":"16",
      "status:5xx":"2",
      "status:total":"8508",
      "time:max":"14448",
      "time:p50":"470",
      "time:p90":"2900",
      "time:p95":"4800"
    },
    {
      "fs_host":"fs-image-prod",
      "mem:avg":"207.502759",
      "mem:max":"262.69",
      "status:2xx":"2",
      "status:3xx":"0",
      "status:4xx":"0",
      "status:5xx":"0",
      "status:total":"2",
      "time:max":"1218",
      "time:p50":"1218",
      "time:p90":"1218",
      "time:p95":"1218"
    },
    {
      "fs_host":"fs-indexing-prod",
      "mem:avg":"303.768182",
      "mem:max":"333.66",
      "status:2xx":"513",
      "status:3xx":"0",
      "status:4xx":"0",
      "status:5xx":"0",
      "status:total":"513",
      "time:max":"6809",
      "time:p50":"321",
      "time:p90":"830",
      "time:p95":"1020"
    },
    {
      "fs_host":"fs-lls-prod",
      "mem:avg":"140.128966",
      "mem:max":"155.10",
      "status:2xx":"371",
      "status:3xx":"244",
      "status:4xx":"9",
      "status:5xx":"0",
      "status:total":"624",
      "time:max":"3857",
      "time:p50":"200",
      "time:p90":"880",
      "time:p95":"1000"
    },
    {
      "fs_host":"fs-photos-prod",
      "mem:avg":"138.772500",
      "mem:max":"147.58",
      "status:2xx":"146",
      "status:3xx":"0",
      "status:4xx":"0",
      "status:5xx":"0",
      "status:total":"146",
      "time:max":"5435",
      "time:p50":"204",
      "time:p90":"1680",
      "time:p95":"3200"
    },
    {
      "fs_host":"fs-registration-prod",
      "mem:avg":"202.045357",
      "mem:max":"255.25",
      "status:2xx":"65",
      "status:3xx":"69",
      "status:4xx":"0",
      "status:5xx":"0",
      "status:total":"134",
      "time:max":"5644",
      "time:p50":"800",
      "time:p90":"1480",
      "time:p95":"2230"
    },
    {
      "fs_host":"fs-search-prod",
      "mem:avg":"46.050000",
      "mem:max":"49.34",
      "status:2xx":"554",
      "status:3xx":"0",
      "status:4xx":"0",
      "status:5xx":"0",
      "status:total":"554",
      "time:max":"933",
      "time:p50":"9",
      "time:p90":"21",
      "time:p95":"30"
    },
    {
      "fs_host":"fs-temple-prod",
      "mem:avg":"172.665714",
      "mem:max":"180.27",
      "status:2xx":"2227",
      "status:3xx":"0",
      "status:4xx":"0",
      "status:5xx":"0",
      "status:total":"2227",
      "time:max":"7941",
      "time:p50":"187",
      "time:p90":"820",
      "time:p95":"1300"
    }
  ]
};
