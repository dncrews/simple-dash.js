(function(angular) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard');

  function BaseController($rootScope, $scope, $location, $q, $userService) {
    $scope.goto = function(path) {
      $location.path(path);
    };
  }

  app.controller('DashboardCtrl', [
    '$scope',
    '$location',
    'appService',
    'apiService',
    'upstreamService',

    function DashboardCtrl($scope, $location) {
      $scope.active = {
        'home' : true
      };
      console.log(!!$scope.active.change);
      console.log('here');
    }
  ]);

})(window.angular);
