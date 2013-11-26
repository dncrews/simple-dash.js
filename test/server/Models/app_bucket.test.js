/* global require,describe,it,console */
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

});
