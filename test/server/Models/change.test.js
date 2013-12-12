/* global require,describe,it,console,before,beforeEach,after,afterEach,setTimeout */
'use strict';


var expect = require('expect.js')
  , db = require('../../db')
  , Model = require('../../../Models/Change');


describe('Changes interface:', function() {

  after(function(done) {
    db.dropDatabase(done);
  });

  describe('restartHerokuApp:', function() {
    var appName = 'fs-testName-prod'
      , rsReason = 'Because I said so';

    describe('Given an appName and reason, restartHerokuApp', function() {

      var restartCalled = 0
        , appRestarted, change;

      before(function(done) {
        Model.mockRestart(function(app_name, cb) {
          restartCalled++;
          appRestarted = app_name;
          cb(true);
        });

        Model.restartHerokuApp(appName, rsReason).then(function(doc) {
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
        Model.restartHerokuApp(null, rsReason).then(
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
    describe('Given Jenkins build data, fromJenkins', function() {
      it('should save the raw data as _raw');
      it('should set the name and repo_name');
      it('should set created_at');
      it('should set the type to "jenkins"');
      it('should set the action to "build"');
      it('should not set meta data');
    });

    describe('Given Jenkins data and an action, fromJenkins', function() {
      it('should set the action passed');
    });

    describe('Given no data, fromJenkins', function() {
      it('should return an Error');
    });
  });

  describe('fromMarrow:', function() {
    describe('Given Marrow build data, fromMarrow', function() {
      it('should save the raw data as _raw');
      it('should set the name and repo_name');
      it('should set created_at');
      it('should set the type to "jenkins"');
      it('should set the action to "build"');
      it('should not set meta data');
    });

    describe('Given Jenkins data and an action, fromMarrow', function() {
      it('should set the action passed');
    });

    describe('Given no data, fromMarrow', function() {
      it('should return an Error');
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
    splunk_good : {},
    splunk_no_name : {}
  };
  return mocks[type];
}
