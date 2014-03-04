(function(angular) {

  'use strict';

  var app = angular.module('fsDashboard', ['d3']);

  app.config([
    '$routeProvider',
    '$locationProvider',

    function($routeProvider, $locationProvider) {
      $routeProvider
        .when('/', {
          templateUrl: '/partials/dashboard',
          controller: 'IndexCtrl'
        })
        .when('/app/:name', {
          templateUrl: '/partials/details',
          controller: 'AppDetailsCtrl'
        })
        .when('/app/:name/uptime', {
          templateUrl: '/partials/details',
          controller: 'AppDetailsCtrl'
        })
        .when('/performance/:name', {
          templateUrl: '/partials/performance',
          controller: 'AppPerformanceCtrl'
        })
        .when('/service/:name', {
          templateUrl: '/partials/details',
          controller: 'ServiceDetailsCtrl'
        })
        .when('/upstream/:name', {
          templateUrl: '/partials/details',
          controller: 'UpstreamDetailsCtrl'
        })
        .when('/change', {
          templateUrl: '/partials/change_log',
          controller: 'ChangeLogCtrl'
        });

      // $locationProvider.html5Mode(true);
    }
  ]);

})(window.angular);
