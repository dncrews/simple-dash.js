var expect = require('expect.js')
  , db = require('../../db')
  , Model = require('../../../Models/Upstream');


describe('Upstream interface:', function() {

  after(function(done) {
    db.dropDatabase(done);
  });

  describe('Heroku:', function() {
    describe('Given a "green" and "yellow" sample heroku fetch, fromHeroku', function() {
      it('should create and save a Prod and Dev upstream status');
      it('should set the type as "heroku"');
      it('should set the names');
      it('should set the "good" and "warning" statuses');
      it('should save the issues to both instances');
      it('should save the raw data as _raw');
      it('should set created_at');
      // it('should set created_at', function() {
      //   expect(sut.created_at).to.be.a(Date);
      // });
      // it('should save the raw data as _raw', function() {
      //   expect(sut._raw).to.be.an(Object);
      //   expect(sut._raw).to.eql(mockData);
      // });
    });
    describe('Given a "blue" sample heroku fetch, fromHeroku', function() {
      it('should set the status as "down"');
    });
    describe('Given a "red" sample heroku fetch, fromHeroku', function() {
      it('should set the status ad "down"');
    });
  });

  describe('HA Proxy:', function() {
    describe('Given a "good" sample splunk mem_response, haFromSplunk', function() {
      it('should set the type as "haProxy"');
      it('should set the name as "HA Proxy"');
      it('should set the status as "good"');
      it('should set the meta.codes');
      it('should set the meta.error_rate');
      it('should save the raw data as _raw');
      it('should set created_at');
      // it('should set created_at', function() {
      //   expect(sut.created_at).to.be.a(Date);
      // });
      // it('should save the raw data as _raw', function() {
      //   expect(sut._raw).to.be.an(Object);
      //   expect(sut._raw).to.eql(mockData);
      // });
    });
    describe('Given no data, haFromSplunk', function() {
      it('should reject with an error');
      // it('should reject with an error', function(done) {
      //   Model.fromSplunk().then(
      //     function doNotWant() {},
      //     function rejected(err) {
      //       expect(err).to.be.an(Error);
      //       done();
      //     });
      // });
    });
    describe('Given an almost-"warning" sample, haFromSplunk', function() {
      it('should set the status as "good"');
    });
    describe('Given a "warning" sample, haFromSplunk', function() {
      it('should set the status as "warning"');
    });
    describe('Given an almost-"down" sample, haFromSplunk', function() {
      it('should set the status as "warning"');
    });
    describe('Given an "down" sample, haFromSplunk', function() {
      it('should set the status as "down"');
    });
  });

});

function getMockData(src, type) {
  var mocks = {
    github : {
      greenYellow : {
        "status": {
          "Production": "green",
          "Development": "yellow"
        },
        "issues": [
          {
            "created_at": "2013-11-13T18:17:11Z",
            "id": 566,
            "resolved": false,
            "status_dev": "yellow",
            "status_prod": "green",
            "title": "Unstable Node.js deploys due to intermittent npmjs.org failure",
            "upcoming": false,
            "updated_at": "2013-11-13T18:17:11Z",
            "href": "https://status.heroku.com/api/v3/issues/566",
            "updates": [
              {
                "contents": "The npmjs.org registry is intermittently down, effectively breaking deploys for any Node.js apps that don't have their node_modules checked into source control.\r\n\r\nNode.js apps already running on Heroku are NOT affected by this outage.",
                "created_at": "2013-11-13T18:17:11Z",
                "id": 1824,
                "incident_id": 566,
                "status_dev": "yellow",
                "status_prod": "green",
                "title": "Unstable Node.js deploys due to intermittent npmjs.org failure",
                "update_type": "issue",
                "updated_at": "2013-11-13T18:17:12Z"
              }
            ]
          }
        ]
      },
      blue : {
        "status": {
          "Production": "green",
          "Development": "blue"
        },
        "issues": [
          {
            "created_at": "2013-11-13T18:17:11Z",
            "id": 566,
            "resolved": false,
            "status_dev": "blue",
            "status_prod": "green",
            "title": "Unstable Node.js deploys due to intermittent npmjs.org failure",
            "upcoming": false,
            "updated_at": "2013-11-13T18:17:11Z",
            "href": "https://status.heroku.com/api/v3/issues/566",
            "updates": [
              {
                "contents": "The npmjs.org registry is intermittently down, effectively breaking deploys for any Node.js apps that don't have their node_modules checked into source control.\r\n\r\nNode.js apps already running on Heroku are NOT affected by this outage.",
                "created_at": "2013-11-13T18:17:11Z",
                "id": 1824,
                "incident_id": 566,
                "status_dev": "blue",
                "status_prod": "green",
                "title": "Unstable Node.js deploys due to intermittent npmjs.org failure",
                "update_type": "issue",
                "updated_at": "2013-11-13T18:17:12Z"
              }
            ]
          }
        ]
      },
      red : {
        "status": {
          "Production": "red",
          "Development": "red"
        },
        "issues": [
          {
            "created_at": "2013-11-13T18:17:11Z",
            "id": 566,
            "resolved": false,
            "status_dev": "red",
            "status_prod": "red",
            "title": "Unstable Node.js deploys due to intermittent npmjs.org failure",
            "upcoming": false,
            "updated_at": "2013-11-13T18:17:11Z",
            "href": "https://status.heroku.com/api/v3/issues/566",
            "updates": [
              {
                "contents": "The npmjs.org registry is intermittently down, effectively breaking deploys for any Node.js apps that don't have their node_modules checked into source control.\r\n\r\nNode.js apps already running on Heroku are NOT affected by this outage.",
                "created_at": "2013-11-13T18:17:11Z",
                "id": 1824,
                "incident_id": 566,
                "status_dev": "red",
                "status_prod": "red",
                "title": "Unstable Node.js deploys due to intermittent npmjs.org failure",
                "update_type": "issue",
                "updated_at": "2013-11-13T18:17:12Z"
              }
            ]
          }
        ]
      }
    },
    haProxy : {
      good : {
        "status:2xx": "599",
        "status:3xx": "300",
        "status:4xx": "100",
        "status:5xx": "1",
        "status:total": "1000"
      },
      almostWarning : {
        "status:2xx": "551",
        "status:3xx": "300",
        "status:4xx": "100",
        "status:5xx": "49",
        "status:total": "1000"
      },
      warning : {
        "status:2xx": "550",
        "status:3xx": "300",
        "status:4xx": "100",
        "status:5xx": "50",
        "status:total": "1000"
      },
      almostDown : {
        "status:2xx": "501",
        "status:3xx": "300",
        "status:4xx": "100",
        "status:5xx": "99",
        "status:total": "1000"
      },
      down : {
        "status:2xx": "500",
        "status:3xx": "300",
        "status:4xx": "100",
        "status:5xx": "100",
        "status:total": "1000"
      }
    }
  };
  return mocks[src][type];
}
