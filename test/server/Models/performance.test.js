var expect = require('expect.js')
  , db = require('../../db')
  , Model = require('../../../Models/Performance');

describe('Performance Statistics interface:', function() {

  after(function(done) {
    db.dropDatabase(done);
  });

  afterEach(function(done) {
    Model.remove(done);
  });

  describe('perf.dashboard.frontier.page_ready_by_app', function() {

    describe('Given a valid sample splunk page_ready_by_app, fromSplunkPageReady', function() {
      var mockData = getMockData('good')
        , stat, stats;

      before(function(done) {
        Model.fromSplunkPageReady(mockData).then(function(doc) {
          Model.find(function(err, docs) {
            stats = docs;
            stat = docs[0];
            done();
          });
        });
      });

      it('should save', function() {
        expect(stats.length).to.be(2);
      });

      it('should save the raw data as _raw', function() {
        expect(stat._raw).to.be.an(Object);
        expect(stat._raw).to.eql(mockData[0]);
      });

      it('should set the repo_name', function() {
        expect(stat.repo_name).to.be('home');
      });

      it('should set the type as pageReady', function() {
        expect(stat.type).to.be('pageReady');
      });

      it('should set the meta.pXX data', function() {
        var meta = stat.meta;
        expect(meta).to.be.an(Object);
        expect(meta.p25).to.be(2490);
        expect(meta.p50).to.be(3820);
        expect(meta.p75).to.be(5800);
        expect(meta.p95).to.be(14000);
        expect(meta.count).to.be(47159);
      });
    });

    describe('Given no data, fromSplunkPageReady', function() {
      it('should reject with an error', function(done) {
        Model.fromSplunkPageReady().then(
          function doNotWant() {},
          function rejected(err) {
            expect(err).to.be.an(Error);
            done();
          });
      });
    });

    describe('Given no app name, fromSplunkPageReady', function() {
      it('should not create objects', function(done) {
        Model.fromSplunkPageReady(getMockData('noName')).then(function(docs) {

          expect(docs).to.be.an(Array);
          expect(docs.length).to.be(0);
          done();
        });
      });
    });

    function getMockData(type) {
      var mocks = {
        good : [
          {
            "count": "47159",
            "p75": "5800",
            "app": "home",
            "p95": "14000",
            "p25": "2490",
            "p50": "3820"
          },
          {
            "count": "25272",
            "p75": "3660",
            "app": "photos",
            "p95": "8600",
            "p25": "1800",
            "p50": "2460"
          }
        ],
        noName: [
          {
            "count": "47159",
            "p75": "5800",
            "p95": "14000",
            "p25": "2490",
            "p50": "3820"
          },
          {
            "count": "25272",
            "p75": "3660",
            "p95": "8600",
            "p25": "1800",
            "p50": "2460"
          }
        ]
      };
      return mocks[type];
    }

  });

  describe('perf.dashboard.frontier.page_ready_by_page', function() {

    describe('Given a good pageReadyByPage, fromSplunkPageReadyByPage', function() {
      var mockData = getMockData('good')
        , stat, stats;

      before(function(done) {
        Model.fromSplunkPageReadyByPage(mockData).then(function(doc) {
          Model.find().sort({ repo_name : 1 }).exec(function(err, docs) {
            stats = docs;
            stat = docs[2];
            done();
          });
        });
      });

      it('should save data for each app', function() {
        expect(stats.length).to.be(3);
        expect(stats[0].repo_name).to.be('frontier-tree');
        expect(stats[1].repo_name).to.be('home');
        expect(stats[2].repo_name).to.be('search');
      });
      it('should save the raw data as _raw', function() {
        expect(stat._raw).to.eql(mockData);
      });
      it('should set the type as pageReadyByPage', function() {
        expect(stat.type).to.be('pageReadyByPage');
      });
      it('should set the meta.pages data', function() {
        expect(stat.meta.pages[0]).to.eql({
          p95 : 6600,
          p75 : 3510,
          p50 : 2540,
          p25 : 1910,
          count : 90715,
          pageName : "Search: Viewer"
        });
      });
    });


    function getMockData(type) {
      var mocks = {
        good : [
          {
            "count":"90715",
            "p75":"3510",
            "app":"search",
            "p95":"6600",
            "p25":"1910",
            "pageName":"Search: Viewer",
            "p50":"2540"
          },
          {
            "count":"43281",
            "p75":"3430",
            "app":"search",
            "p95":"9000",
            "p25":"1670",
            "pageName":"Search: Results",
            "p50":"2340"
          },
          {
            "count":"25679",
            "p75":"6400",
            "app":"home",
            "p95":"16000",
            "p25":"2590",
            "pageName":"Home: Homepage",
            "p50":"3900"
          },
          {
            "count":"14860",
            "p75":"5760",
            "app":"frontier-tree",
            "p95":"11100",
            "p25":"2640",
            "pageName":"Frontier-Tree: Homepage",
            "p50":"3610"
          }
        ]
      };
      return mocks[type];
    }
  });

  describe('perf.dashboard.frontier.page_ready_histogram', function() {

    describe('Given a good pageReadyByBucket, fromSplunkHistogram', function() {
      var mockData = getMockData('good')
        , stat, stats;

      before(function(done) {
        Model.fromSplunkHistogram(mockData).then(function(doc) {
          Model.find().sort({ repo_name : 1 }).exec(function(err, docs) {
            stats = docs;
            stat = docs[0];
            done();
          });
        });
      });

      it('should save data for each app', function() {
        expect(stats.length).to.be(2);
        expect(stats[0].repo_name).to.be('home');
        expect(stats[1].repo_name).to.be('photos');
      });
      it('should save the raw data as _raw', function() {
        expect(stat._raw).to.eql(mockData);
      });
      it('should set the type as histogram', function() {
        expect(stat.type).to.be('histogram');
      });
      it('should set the meta.XXX-XXX data', function() {
        expect(stat.meta['3000-3500']).to.be('3873');
        expect(stat.meta['7000-7500']).to.be('910');
        expect(stat.meta['18500-19000']).to.be('74');
      });
    });

    function getMockData(type) {
      var mocks = {
        good : [
          { "photos": "42", "page_ready": "0-500", "home": "42" },
          { "photos": "894", "page_ready": "500-1000", "home": "556" },
          { "photos": "2376", "page_ready": "1000-1500", "home": "2249" },
          { "photos": "4507", "page_ready": "1500-2000", "home": "3622" },
          { "photos": "4242", "page_ready": "2000-2500", "home": "4323" },
          { "photos": "3164", "page_ready": "2500-3000", "home": "4556" },
          { "photos": "2237", "page_ready": "3000-3500", "home": "3873" },
          { "photos": "1507", "page_ready": "3500-4000", "home": "3624" },
          { "photos": "1071", "page_ready": "4000-4500", "home": "3488" },
          { "photos": "784", "page_ready": "4500-5000", "home": "2772" },
          { "photos": "543", "page_ready": "5000-5500", "home": "2262" },
          { "photos": "460", "page_ready": "5500-6000", "home": "1783" },
          { "photos": "318", "page_ready": "6000-6500", "home": "1384" },
          { "photos": "275", "page_ready": "6500-7000", "home": "1201" },
          { "photos": "220", "page_ready": "7000-7500", "home": "910" },
          { "photos": "230", "page_ready": "7500-8000", "home": "746" },
          { "photos": "158", "page_ready": "8000-8500", "home": "675" },
          { "photos": "123", "page_ready": "8500-9000", "home": "538" },
          { "photos": "102", "page_ready": "9000-9500", "home": "469" },
          { "photos": "87", "page_ready": "9500-10000", "home": "385" },
          { "photos": "67", "page_ready": "10000-10500", "home": "374" },
          { "photos": "74", "page_ready": "10500-11000", "home": "300" },
          { "photos": "59", "page_ready": "11000-11500", "home": "260" },
          { "photos": "66", "page_ready": "11500-12000", "home": "221" },
          { "photos": "52", "page_ready": "12000-12500", "home": "212" },
          { "photos": "32", "page_ready": "12500-13000", "home": "191" },
          { "photos": "42", "page_ready": "13000-13500", "home": "156" },
          { "photos": "31", "page_ready": "13500-14000", "home": "162" },
          { "photos": "27", "page_ready": "14000-14500", "home": "142" },
          { "photos": "34", "page_ready": "14500-15000", "home": "134" },
          { "photos": "31", "page_ready": "15000-15500", "home": "114" },
          { "photos": "21", "page_ready": "15500-16000", "home": "113" },
          { "photos": "19", "page_ready": "16000-16500", "home": "80" },
          { "photos": "26", "page_ready": "16500-17000", "home": "89" },
          { "photos": "18", "page_ready": "17000-17500", "home": "86" },
          { "photos": "18", "page_ready": "17500-18000", "home": "89" },
          { "photos": "19", "page_ready": "18000-18500", "home": "66" },
          { "photos": "24", "page_ready": "18500-19000", "home": "74" },
          { "photos": "12", "page_ready": "19000-19500", "home": "61" },
          { "photos": "12", "page_ready": "19500-20000", "home": "57" }
        ]
      };

      return mocks[type];
    }
  });

});
