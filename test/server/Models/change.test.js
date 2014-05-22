var expect = require('expect.js')
  , db = require('../../db')
  , Model = require('../../../Models/Change');


describe('Changes interface:', function() {

  after(function(done) {
    db.dropDatabase(done);
  });

  describe('restartHerokuApp:', function() {
    var appName = 'fs-testName-prod'
      , reason = 'Because I said so';

    describe('Given an appName and reason, restartHerokuApp', function() {

      var restartCalled = 0
        , appRestarted, change;

      before(function(done) {
        Model.mockRestart(function(app_name, reason, cb) {
          restartCalled++;
          appRestarted = app_name;
          cb(true);
        });

        Model.restartHerokuApp(appName, reason).then(function(doc) {
          change = doc;
          done();
        });
      });

      after(function(done) {
        Model.restore();
        Model.remove(done);
      });

      it('should attempt a restart', function() {
        expect(restartCalled).to.be(1);
        expect(appRestarted).to.be(appName);
      });
      it('should create a Marrow restart change', function() {
        expect(change.type).to.be('marrow');
        expect(change.action).to.be('restart');
      });
      it('should save the change', function(done) {
        Model.find(function(err, docs) {
          expect(docs.length).to.be(1);
          expect(docs[0].name).to.be('fs-testName-prod');
          done();
        });
      });
    });

    describe('Given an appName only, restartHerokuApp', function() {
      it('should reject with an Error', function(done) {
        Model.restartHerokuApp(appName).then(
          function doNotWant() {},
          function rejected(doc) {
            expect(doc).to.be.an(Error);
            done();
          });
      });
    });

    describe('Given a reason only, restartHerokuApp', function() {
      it('should reject with an Error', function(done) {
        Model.restartHerokuApp(null, reason).then(
          function doNotWant() {},
          function rejected(doc) {
            expect(doc).to.be.an(Error);
            done();
          });
      });
    });
  });

  describe('fromGithub:', function() {
    var data = getMockData('github');
    describe('Given Github merge data, fromGithub', function() {
      var change = Model.fromGithub(data);
      it('should save the raw data as _raw', function() {
        expect(change._raw).to.eql(data);
      });
      it('should set the name and repo_name', function() {
        expect(change.name).to.be('testAppOrg/testAppName');
        expect(change.repo_name).to.be('testAppName');
      });
      it('should set created_at', function() {
        expect(change.created_at).to.be.a(Date);
      });
      it('should set the type to "github"', function() {
        expect(change.type).to.be('github');
      });
      it('should set the action to "merge"', function() {
        expect(change.action).to.be('merge');
      });
      it('should set the meta data', function() {
        expect(change.meta.message).to.be('Commit Message goes here');
        expect(change.meta.url).to.be('Url Goes Here');
        expect(change.meta.author).to.eql({
          "name":"Test Testerson",
          "email":"test@testerson.com",
          "username":"testtest"
        });
      });
    });

    describe('Given Github data and an action, fromGithub', function() {
      var change = Model.fromGithub(data, 'newType');
      it('should set the action passed', function() {
        expect(change.action).to.be('newType');
      });
    });

    describe('Given no data, fromGithub', function() {
      var change = Model.fromGithub();
      it('should return an Error', function() {
        expect(change).to.be.an(Error);
      });
    });
  });

  describe('fromJenkins:', function() {
    var data = getMockData('jenkins');
    describe('Given Jenkins build data, fromJenkins', function() {
      var change = Model.fromJenkins(data);
      it('should save the raw data as _raw', function() {
        expect(change._raw).to.eql(data);
      });
      it('should set the name and repo_name', function() {
        expect(change.name).to.be('fs-newAppName');
        expect(change.repo_name).to.be('newAppName');
      });
      it('should set created_at', function() {
        expect(change.created_at).to.be.a(Date);
      });
      it('should set the type to "jenkins"', function() {
        expect(change.type).to.be('jenkins');
      });
      it('should set the action to "build"', function() {
        expect(change.action).to.be('build');
      });
      it('should not set meta data', function() {
        expect(change.meta).to.be(undefined);
      });
    });

    describe('Given Jenkins data and an action, fromJenkins', function() {
      var change = Model.fromJenkins(data, 'anotherType');
      it('should set the action passed', function() {
        expect(change.action).to.be('anotherType');
      });
    });

    describe('Given no data, fromJenkins', function() {
      var change = Model.fromJenkins();
      it('should return an Error', function() {
        expect(change).to.be.an(Error);
      });
    });
  });

  describe('fromMarrow:', function() {
    var appName = 'fs-someApp-prod'
      , action = 'notRestart'
      , reason = 'Because I said so';

    describe('Given an app_name, fromMarrow', function() {
      var change = Model.fromMarrow(appName);
      it('should not set a _raw', function() {
        expect(change._raw).to.be(undefined);
      });
      it('should set the name and repo_name', function() {
        expect(change.name).to.be(appName);
        expect(change.repo_name).to.be('someApp');
      });
      it('should set created_at', function() {
        expect(change.created_at).to.be.a(Date);
      });
      it('should set the type to "marrow"', function() {
        expect(change.type).to.be('marrow');
      });
      it('should set the action to "restart"', function() {
        expect(change.action).to.be('restart');
      });
      it('should not set meta data', function() {
        expect(change.meta).to.be(undefined);
      });
    });

    describe('Given a reason, fromMarrow', function() {
      var change = Model.fromMarrow(appName, null, reason);
      it('should set the meta.reason', function() {
        expect(change.meta.reason).to.be(reason);
      });
    });

    describe('Given app_name and an action, fromMarrow', function() {
      var change = Model.fromMarrow(appName, action);
      it('should set the action passed', function() {
        expect(change.action).to.be(action);
      });
    });

    describe('Given no appName, fromMarrow', function() {
      var change = Model.fromMarrow();
      it('should return an Error', function() {
        expect(change).to.be.an(Error);
      });
    });
  });

  describe('fromEC:', function() {
    var data = getMockData('electricCommander');
    describe('Given ElectricCommander build data, fromEC', function() {
      var change = Model.fromEC(data);
      it('should save the raw data as _raw', function() {
        expect(change._raw).to.eql(data);
      });
      it('should set the name and repo_name', function() {
        expect(change.repo_name).to.be('newAppName');
      });
      it('should set created_at', function() {
        expect(change.created_at).to.be.a(Date);
      });
      it('should set the type to "electricCommander"', function() {
        expect(change.type).to.be('electricCommander');
      });
      it('should set the action to "build"', function() {
        expect(change.action).to.be('build');
      });
      it('should set the url', function() {
        expect(change.meta.url).to.be('https://build.fsglobal.net');
      });
      it('should set the git_commit', function() {
        expect(change.meta.git_commit).to.be('dsjk2u834jkkdsfjkwer394324');
      });
    });

    describe('Given EC data and an action, fromEC', function() {
      var change = Model.fromEC(data, 'anotherType');
      it('should set the action passed', function() {
        expect(change.action).to.be('anotherType');
      });
    });

    describe('Given no data, fromEC', function() {
      var change = Model.fromEC();
      it('should return an Error', function() {
        expect(change).to.be.an(Error);
      });
    });
  });

});



function getMockData(type) {
  var mocks = {
    github : {
      "forced":false,
      "head_commit":{
        "message":"Commit Message goes here",
        "timestamp":"2013-10-31T10:56:46-07:00",
        "url":"Url Goes Here",
        "author":{
          "name":"Test Testerson",
          "email":"test@testerson.com",
          "username":"testtest"
        }
      },
      "repository":{
        "name":"testAppName",
        "url":"https://github.com/testAppOrg/testAppName",
        "master_branch":"master",
        "organization":"testAppOrg"
      }
    },
    jenkins : {
      "name":"fs-newAppName",
      "url":"job/fs-newAppName/",
      "build":{
        "full_url":"Build URL Goes Here",
        "number":356,
        "phase":"FINISHED",
        "status":"SUCCESS",
        "url":"job/fs-newAppName/356/"
      }
    },
    electricCommander : {
      "name" : "newAppName",
      "build" : {
        "url" : "https://build.fsglobal.net",
        "number" : 2,
        "status" : "Success",
        "date_completed" : "1399308143",
        "git_commit" : "dsjk2u834jkkdsfjkwer394324"
      }
    }
  };
  return mocks[type];
}
