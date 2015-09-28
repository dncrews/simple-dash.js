var expect = require('chai').expect
  , utils = require('../../lib/utils')
  , Q = require('q');


describe('utils.js interface', function() {
  var testAppName = 'fs-testName-prod'
    , testReason = 'Because I said so!'
    , restartCalled = 0
    , appRestarted;

  after(function() {
    restartCalled = 0;
    appRestarted = '';
  });

  /** This test is invalid. We'll never hit the restart, since we don't have Heroku credentials **/
  // describe('Given a Heroku appName and reason, restartApp', function() {
  //   it('should attempt a restart', function() {
  //     utils.restartApp(testAppName, testReason, function(err, resp) {
  //       if (err) throw err;
  //
  //       expect(restartCalled).to.equal(1);
  //       expect(appRestarted).to.equal(testAppName);
  //     });
  //   });
  // });

  describe('Given no appName, restartApp', function() {
    it('should fail with a `invalidRequest` message', function() {
      utils.restartApp(null, testReason, function(err, resp) {
        expect(err.name).to.equal('invalidRequest');
        expect(err.message).to.equal('No marrow appName supplied');
      });
    });
  });

  describe('Given no reason, restartApp', function() {
    it('should fail with a `invalidRequest` message', function() {
      utils.restartApp(testAppName, null, function(err, resp) {
        expect(err.name).to.equal('invalidRequest');
        expect(err.message).to.equal('No restart reason supplied');
      });
    });
  });

  describe('Given no heroku credentials', function() {
    before(function() {
      utils.mockHeroku();
    });
    after(function() {
      utils.restoreHeroku();
    });
    it('should fail with a `notConfigured` message', function() {
      utils.restartApp(testAppName, testReason, function(err, resp) {
        expect(err.name).to.equal('notConfigured');
        expect(err.message).to.equal('Restart Requested; Heroku not configured. Cause: ' + testReason);
      });
    });
  });
});
