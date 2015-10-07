(function(angular, assetPath) {

  'use strict';

  var app = angular.module('fsDashboard', ['ngRoute', 'd3']);

  app.config([
    '$routeProvider',
    '$locationProvider',

    function($routeProvider, $locationProvider) {
      $routeProvider
        .when('/', {
          templateUrl: assetPath + 'templates/dashboard.html',
          controller: 'IndexCtrl'
        })
        .when('/app/:name', {
          templateUrl: assetPath + 'templates/details.html',
          controller: 'AppDetailsCtrl'
        })
        .when('/app/:name/uptime', {
          templateUrl: assetPath + 'templates/details.html',
          controller: 'AppDetailsCtrl'
        })
        .when('/performance/:name', {
          templateUrl: assetPath + 'templates/performance.html',
          controller: 'AppPerformanceCtrl'
        })
        .when('/service/:name', {
          templateUrl: assetPath + 'templates/details.html',
          controller: 'ServiceDetailsCtrl'
        })
        .when('/upstream/:name', {
          templateUrl: assetPath + 'templates/details.html',
          controller: 'UpstreamDetailsCtrl'
        })
        .when('/change', {
          templateUrl: assetPath + 'templates/change_log.html',
          controller: 'ChangeLogCtrl'
        });

      // $locationProvider.html5Mode(true);
    }
  ]);

})(window.angular, window.assetPath);
