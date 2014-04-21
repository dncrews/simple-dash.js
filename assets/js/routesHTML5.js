/**
 * This file is used to configure this app with HTML5
 * pushState when the environment PUSH_STATE is turned on
 */

(function(angular) {

  'use strict';

  var app = angular.module('fsDashboard');

  app.config([
    '$locationProvider',

    function($locationProvider) {
      $locationProvider.html5Mode(true);
    }
  ]);

})(window.angular);
