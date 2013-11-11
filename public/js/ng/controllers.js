(function(angular, jQuery) {

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
    '$rootScope',
    '$scope',
    '$routeParams',
    'dashService',

    function UpstreamDetailsCtrl($rootScope, $scope, $routeParams, service) {
      $scope.pageType = 'upstream';
      $scope.pageTitle = $routeParams.name + ' Status';
      window.$bindHistory($scope);

      console.log('upstreamed');

      $scope.loading = {
        'main' : true
      };

      $scope.labelStatus = function(item) {
        return 'label-' + statusToBS(item.stats.status);
      };

      $scope.setCurrent = function(current) {
        var updated = moment(current.created_at)
          , status = current.stats.status;
        $scope.current = current;
        $scope.updated = {
          formatted: updated.format('h:mm a'),
          delta: updated.fromNow()
        };

        $scope.status = status;
        $scope.statusClass = statusToBS(status);
        $scope.glyph = getGlyph(status);
      };

      service.upstream.details($routeParams.name).then(function(upstreamList) {
        var current = upstreamList[0];
        $scope.setCurrent(current);
        $rootScope.updated = {
          formatted: moment(current.created_at).format('h:mm a')
        };
        $scope.history = upstreamList;
        $scope.loading.main = false;
      });
    }
  ]);

})(window.angular, window.jQuery);
