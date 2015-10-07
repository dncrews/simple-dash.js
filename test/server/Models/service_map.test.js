var expect = require('chai').expect
  , db = require('../../db')
  , Model = require('../../../Models/Service_Map');


describe('Service Map interface:', function() {

  after(function(done) {
    db.dropDatabase(done);
  });

  describe('Given a full response list from Splunk, fromSplunk', function() {

    var data = getMockData('first')
      , maps, map;

    before(function(done) {
      Model.fromSplunk(data).then(function() {
        // Have to make a whole function so done doesn't get called with parameters
        done();
      });
    });

    after(function(done) {
      Model.remove(done);
    });

    it('should generate the instances for each app_name', function(done) {
      Model.find(function(err, docs) {
        if (err) return expect().fail();

        expect(docs.length).to.equal(10);
        done();
      });
    });

    it('should ignore anything without an fs_host', function(done) {
      Model.find( { services : "DONOTWANT" }, function(err, docs) {
        if (err) return expect().fail();

        expect(docs.length).to.equal(0);
        done();
      });
    });

    describe('each app_name instance', function(done) {
      var maps, map;

      before(function(done) {
        Model.find({ repo_name : 'first-run' }, function(err, docs) {
          if (err) return expect().fail();

          maps = docs;
          map = maps[0];
          done();
        });
      });

      it('should be created once', function() {
        expect(maps.length).to.equal(1);
      });

      it('should trim the repo_name', function() {
        expect(map.repo_name).to.equal('first-run');
      });

      it('should set created_at', function() {
        expect(map.created_at).to.be.an.instanceof(Date);
      });

      it('should all concatenate dependencies into a single services array', function() {
        expect(map.services.length).to.equal(6);
      });

    });

  });

  describe('Given a second list from Splunk, fromSplunk', function() {

    var data = getMockData('second');

    before(function(done) {
      Model.fromSplunk(data).then(function() {
        // Have to make a whole function so done doesn't get called with parameters
        done();
      });
    });

    after(function(done) {
      Model.remove(done);
    });

    it('should add new app instances', function(done) {
      Model.find({ repo_name : 'new-app' }, function(err, docs) {
        if (err) return expect().fail();

        expect(docs.length).to.equal(1);
        done();
      });
    });

    it('should inject new dependencies into existing instances', function() {
      Model.find({ repo_name : 'ask' }, function(err, docs) {
        if (err) return expect().fail();

        expect(docs.length).to.equal(1);
        expect(docs[0].services).to.contain('cas-public-api');
      });
    });

    it('should ignore duplicate dependencies', function() {
      Model.find({ repo_name : 'catalog' }, function(err, docs) {
        var services, count=0, i;
        if (err) return expect().fail();

        expect(docs.length).to.equal(1);
        services = docs[0].services;
        for (i =services.length; i--;) {
          if (services[i] === 'solr') {
            count++;
          }
        }
        expect(count).to.equal(1);
      });
    });

  });

});



function getMockData(type) {
  var mocks = {
    "first" : [
      { "api" : "DONOTWANT" },
      { "fs_host":"fs-ask-prod", "api":"Webservice" },
      { "fs_host":"fs-catalog-prod", "api":"solr" },
      { "fs_host":"fs-collection-prod", "api":"searchapi" },
      { "fs_host":"fs-first-run-prod", "api":"cas-public-api" },
      { "fs_host":"fs-first-run-prod", "api":"ct" },
      { "fs_host":"fs-first-run-prod", "api":"familytree" },
      { "fs_host":"fs-first-run-prod", "api":"ftuser" },
      { "fs_host":"fs-first-run-prod", "api":"scopeservice" },
      { "fs_host":"fs-first-run-prod", "api":"tree-data" },
      { "fs_host":"fs-home-prod", "api":"artifactmanager" },
      { "fs_host":"fs-home-prod", "api":"tree-data" },
      { "fs_host":"fs-hr-prod", "api":"pal:" },
      { "fs_host":"fs-image-prod", "api":"pal:" },
      { "fs_host":"fs-image-prod", "api":"records" },
      { "fs_host":"fs-indexing-prod", "api":"rss?listType=projects" },
      { "fs_host":"fs-indexing-prod", "api":"rss?listType=yearcompare" },
      { "fs_host":"fs-lls-prod", "api":"lls" },
      { "fs_host":"fs-lls-prod", "api":"pal:" },
      { "fs_host":"fs-photos-prod", "api":"artifactmanager" },
      { "fs_host":"fs-photos-prod", "api":"cis-public-api" },
      { "fs_host":"fs-photos-prod", "api":"ct" },
      { "fs_host":"fs-photos-prod", "api":"patron" }
    ],
    "second" : [
      { "fs_host":"fs-new-app-prod", "api":"cas-public-api" },
      { "fs_host":"fs-ask-prod", "api":"cas-public-api" },
      { "fs_host":"fs-catalog-prod", "api":"solr" }
    ]
  };
  return mocks[type];
}
