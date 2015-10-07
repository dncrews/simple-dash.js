var expect = require('chai').expect
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
            // Pass done for error callback
          }, done);
        });
      });

      it('should save', function() {
        expect(stats.length).to.equal(2);
      });

      it('should save the raw data as _raw', function() {
        expect(stat._raw).to.be.an.instanceof(Object);
        expect(stat._raw).to.eql(mockData[0]);
      });

      it('should set the repo_name', function() {
        expect(stat.repo_name).to.equal('home');
      });

      it('should set the type as pageReady', function() {
        expect(stat.type).to.equal('pageReady');
      });

      it('should set the meta.pXX data', function() {
        var meta = stat.meta;
        expect(meta).to.be.an.instanceof(Object);
        expect(meta.p25).to.equal(2490);
        expect(meta.p50).to.equal(3820);
        expect(meta.p75).to.equal(5800);
        expect(meta.p95).to.equal(14000);
        expect(meta.count).to.equal(47159);
      });
    });

    describe('Given no data, fromSplunkPageReady', function() {
      it('should reject with an error', function(done) {
        Model.fromSplunkPageReady().then(
          function doNotWant() {},
          function rejected(err) {
            expect(err).to.be.an.instanceof(Error);
            done();
          });
      });
    });

    describe('Given no app name, fromSplunkPageReady', function() {
      it('should not create objects', function(done) {
        Model.fromSplunkPageReady(getMockData('noName')).then(function(docs) {

          expect(docs).to.be.an.instanceof(Array);
          expect(docs.length).to.equal(0);
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
        expect(stats.length).to.equal(3);
        expect(stats[0].repo_name).to.equal('frontier-tree');
        expect(stats[1].repo_name).to.equal('home');
        expect(stats[2].repo_name).to.equal('search');
      });
      it('should save the raw data as _raw', function() {
        expect(stat._raw).to.eql(mockData);
      });
      it('should set the type as pageReadyByPage', function() {
        expect(stat.type).to.equal('pageReadyByPage');
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
            stat = docs[4]; // frontier-tree
            done();
          });
        });
      });

      it('should save data for each app', function() {
        expect(stats.length).to.equal(17);
        expect(stats[5].repo_name).to.equal('home');
        expect(stats[9].repo_name).to.equal('photos');
      });
      it('should save the raw data as _raw', function() {
        expect(stat._raw).to.eql(mockData);
      });
      it('should set the type as histogram', function() {
        expect(stat.type).to.equal('histogram');
      });
      it('should set the meta.XXX-XXX data', function() {
        // frontier-tree
        expect(stat.meta['3000-3500']).to.equal(621);
        expect(stat.meta['500-1000']).to.equal(3488);
        expect(stat.meta['18500-19000']).to.equal(74);
      });
    });

    function getMockData(type) {
      var mocks = {
        good : [
          {"count":"1","app":"campaign","page_ready":"0-500"},
          {"count":"5160","app":"frontier-tree","page_ready":"0-500"},
          {"count":"6","app":"home","page_ready":"0-500"},
          {"count":"42","app":"search","page_ready":"0-500"},
          {"count":"17","app":"ask","page_ready":"1000-1500"},
          {"count":"6","app":"campaign","page_ready":"1000-1500"},
          {"count":"4","app":"developers","page_ready":"1000-1500"},
          {"count":"5","app":"first-run","page_ready":"1000-1500"},
          {"count":"2742","app":"frontier-tree","page_ready":"1000-1500"},
          {"count":"199","app":"home","page_ready":"1000-1500"},
          {"count":"104","app":"identity","page_ready":"1000-1500"},
          {"count":"23","app":"indexing","page_ready":"1000-1500"},
          {"count":"32","app":"photos","page_ready":"1000-1500"},
          {"count":"5","app":"reference","page_ready":"1000-1500"},
          {"count":"29","app":"registration","page_ready":"1000-1500"},
          {"count":"2800","app":"search","page_ready":"1000-1500"},
          {"count":"3","app":"volunteer","page_ready":"1000-1500"},
          {"count":"39","app":"zoning","page_ready":"1000-1500"},
          {"count":"19","app":"ask","page_ready":"3000-3500"},
          {"count":"112","app":"campaign","page_ready":"3000-3500"},
          {"count":"1","app":"developers","page_ready":"3000-3500"},
          {"count":"621","app":"frontier-tree","page_ready":"3000-3500"},
          {"count":"176","app":"home","page_ready":"3000-3500"},
          {"count":"29","app":"indexing","page_ready":"3000-3500"},
          {"count":"1824","app":"photos","page_ready":"3000-3500"},
          {"count":"22","app":"products-gallery-web","page_ready":"3000-3500"},
          {"count":"43","app":"registration","page_ready":"3000-3500"},
          {"count":"739","app":"search","page_ready":"3000-3500"},
          {"count":"4507","app":"temple","page_ready":"3000-3500"},
          {"count":"14","app":"frontier-tree","page_ready":"7000-7500"},
          {"count":"7","app":"search","page_ready":"7000-7500"},
          {"count":"2376","app":"photos","page_ready":"500-1000"},
          {"count":"4323","app":"home","page_ready":"500-1000"},
          {"count":"3488","app":"frontier-tree","page_ready":"500-1000"},
          {"count":"205","app":"search","page_ready":"500-1000"},
          {"count":"28","app":"identity","page_ready":"500-1000"},
          {"count":"23","app":"my-booklet","page_ready":"500-1000"},
          {"count":"194","app":"ask","page_ready":"500-1000"},
          {"count":"2","app":"registration","page_ready":"10500-11000"},
          {"count":"74","app":"frontier-tree","page_ready":"18500-19000"}
        ]
      };

      return mocks[type];
    }
  });

});
