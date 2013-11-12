(function(angular) {

  'use strict';

  var app = angular.module('fsDashboard', []);

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
        .when('/api/:name', {
          templateUrl: '/partials/details',
          controller: 'ApiDetailsCtrl'
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
