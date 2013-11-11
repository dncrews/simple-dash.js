(function(angular) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard');

  function getGlyph(status) {
    var map = {
      "good" : "ok-sign",
      "slow" : "warning-sign",
      "down" : "minus-sign",
      "unknown" : "question-sign"
    };
    return "glyphicon-" + map[status] || 'question-sign';
  }

  function statusToBS(status) {
    var map = {
      'good' : 'success',
      'slow' : 'warning',
      'down' : 'danger'
    };
    return map[status] || 'default';
  }

  app.controller('IndexCtrl', [
    '$scope',
    'dashService',

    function IndexCtrl($scope, service) {
      $scope.loading = {
        'upstream': true,
        'app': true,
        'api': true
      };
      $scope.upstreamList = [];
      $scope.appList = [];
      $scope.apiList = [];

      $scope.btnClass = function(status) {
        if (! status) return;
        return 'btn-' + statusToBS(status);
      };

      $scope.clean = function(appName) {
        if (! appName) return;
        return escape(appName);
      };

      $scope.getGlyph = function(status) {
        if (! status) return;
        return getGlyph(status);
      };

      service.upstream.index().then(function(upstreamList) {
        $scope.upstreamList = upstreamList;
        $scope.loading.upstream = false;
      });

      service.app.index().then(function(appList) {
        $scope.appList = appList;
        $scope.loading.app = false;
      });

      service.api.index().then(function(apiList) {
        $scope.apiList = apiList;
        $scope.loading.api = false;
      });
    }
  ]);

  app.controller('UpstreamDetailsCtrl', [
    '$scope',
    '$routeParams',
    'dashService',

    function UpstreamDetailsCtrl($scope, $routeParams, service) {
      $scope.pageType = 'upstream';
      $scope.pageTitle = $routeParams.name + ' Status';

      console.log('upstreamed');

      $scope.loading = {
        'main' : true
      };

      service.upstream.details($routeParams.name).then(function(upstreamList) {
        console.log(upstreamList);
      });
    }
  ]);

})(window.angular);
