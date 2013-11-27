/* global require,describe,it,console,after */
'use strict';

var expect = require('expect.js')
  , db = require('../../db')
  , Model = require('../../../Models/App_Bucket.js');

describe('App_Bucket interface:', function() {

  describe('When creating a new bucket, App_Bucket', function() {

    it('should generate a created_at that is rounded down to the nearest 5-minute interval', function() {
      var bucket_length = 1000 * 60 * 5
        , bucket = new Date(Math.floor(new Date().getTime() / bucket_length) * bucket_length)
        , sut = new Model();

      expect(sut.created_at).to.eql(bucket);
      expect(sut.app_id).to.be(null);
      expect(sut.error_id).to.be(null);

    });

  });

  describe('If attempting to create a duplicate, App_Bucket', function() {

    after(function(done) {
      db.dropDatabase(done);
    });

    it('should throw a duplicate key error', function(done) {
      var repo_name = 'test_app';

      Model.create({
        repo_name : repo_name
      }, function(err, one) {
        expect(one.repo_name).to.be(repo_name);
        Model.create({
          repo_name : repo_name,
          created_at : one.created_at
        }, function(err, two) {
          expect(err).to.be.an(Error);
          expect(err.message).to.match(/E11000/);
          done();
        });
      });


    });
  });

});
