(function(angular, assetPath) {

  'use strict';

  var app = angular.module('fsDashboard', ['d3']);

  app.config([
    '$routeProvider',
    '$locationProvider',

    function($routeProvider, $locationProvider) {
      $routeProvider
        .when('/', {
          templateUrl: assetPath + 'partials/dashboard',
          controller: 'IndexCtrl'
        })
        .when('/app/:name', {
          templateUrl: assetPath + 'partials/details',
          controller: 'AppDetailsCtrl'
        })
        .when('/app/:name/uptime', {
          templateUrl: assetPath + 'partials/details',
          controller: 'AppDetailsCtrl'
        })
        .when('/performance/:name', {
          templateUrl: assetPath + 'partials/performance',
          controller: 'AppPerformanceCtrl'
        })
        .when('/service/:name', {
          templateUrl: assetPath + 'partials/details',
          controller: 'ServiceDetailsCtrl'
        })
        .when('/upstream/:name', {
          templateUrl: assetPath + 'partials/details',
          controller: 'UpstreamDetailsCtrl'
        })
        .when('/change', {
          templateUrl: assetPath + 'partials/change_log',
          controller: 'ChangeLogCtrl'
        });

      // $locationProvider.html5Mode(true);
    }
  ]);

})(window.angular, window.assetPath);
