/* global require,describe,it,console */
'use strict';

var expect = require('expect.js')
  , Change = require('../../../Models/Change');

describe('Changes interface:', function() {});



function getMockData(type) {
  var mocks = {
    good : {},
    noName : {},
    almostSlow : {},
    slow : {},
    almostDown : {},
    down : {},
    slowAndDown : {}
  };
  return mocks[type];
}
