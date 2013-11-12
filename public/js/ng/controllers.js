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
      var name = $routeParams.name;
      $scope.pageType = 'upstream';
      $scope.pageTitle = name + ' Status';
      window.$bindHistory($scope);
      $scope.loading = {
        'main' : true
      };

      $scope.labelStatus = function(item) {
        return 'label-' + statusToBS(item.stats.status);
      };

      $scope.setCurrent = setCurrent;

      service.upstream.details(name).then(function(upstreamList) {
        var current = upstreamList[0];
        setCurrent(current);
        $rootScope.updated = {
          formatted: moment(current.created_at).format('h:mm a')
        };
        $scope.history = upstreamList;
        $scope.loading.main = false;
      });

      function setCurrent(current) {
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
      }
    }
  ]);

  app.controller('AppDetailsCtrl', [
    '$rootScope',
    '$scope',
    '$routeParams',
    '$location',
    'dashService',

    function AppDetailsCtrl($rootScope, $scope, $routeParams, $location, service) {
      var name = $routeParams.name;
      $scope.pageType = 'app';
      $scope.pageTitle = name + ' Status';
      setFeatures($scope, ['hasThroughput','hasRespTime','hasMemory','hasErrorRate','hasStatus','isHeroku','hasApis']);
      window.$bindHistory($scope);
      $scope.loading = {
        'main' : true,
        'apis' : true
      };

      $scope.labelStatus = function(item) {
        return 'label-' + statusToBS(item.stats.uptime_status);
      };

      $scope.setCurrent = setCurrent;

      $scope.apiBtnClass = function(status) {
        return 'btn-' + statusToBS(status);
      };

      $scope.goToApi = function(name) {
        $location.path('/api/' + escape(name));
      };

      $scope.clean = function(name) {
        if (! name) return;
        return escape(name);
      };

      service.app.details(name).then(function(appList) {
        var current = appList[0];
        setCurrent(current);
        $rootScope.updated = getTime(current.stats.timestamp);
        $scope.history = appList;
        $scope.loading.main = false;
      });

      service.api.app(name).then(function(apiList) {
        $scope.apis = apiList;
        $scope.loading.apis = false;
      });

      function setCurrent(current) {
        var status = current.stats.uptime_status;
        $scope.current = current;
        $scope.updated = getTime(current.stats.timestamp);

        $scope.status = status;
        $scope.statusClass = statusToBS(status);
        $scope.glyph = getGlyph(status);
      }

      function getTime(timestamp) {
        var updated = moment.unix(timestamp);
        return {
          formatted: updated.format('h:mm a'),
          delta: updated.fromNow()
        };
      }
    }
  ]);

  app.controller('ApiDetailsCtrl', [
    '$rootScope',
    '$scope',
    '$routeParams',
    'dashService',

    function ApiDetailsCtrl($rootScope, $scope, $routeParams, service) {
      var name = $routeParams.name;
      $scope.pageType = 'app';
      $scope.pageTitle = name + ' Status';
      setFeatures($scope, ['hasThroughput','hasRespTime','hasErrorRate','hasStatus']);
      window.$bindHistory($scope);
      $scope.loading = {
        'main' : true
      };

      $scope.labelStatus = function(item) {
        return 'label-' + statusToBS(item.stats.uptime_status);
      };

      $scope.setCurrent = setCurrent;

      service.api.details(name).then(function(apiList) {
        var current = apiList[0];
        setCurrent(current);
        $rootScope.updated = getTime(current.stats.timestamp);
        $scope.history = apiList;
        $scope.loading.main = false;
      });

      function setCurrent(current) {
        var status = current.stats.uptime_status;
        $scope.current = current;
        $scope.updated = getTime(current.stats.timestamp);

        $scope.status = status;
        $scope.statusClass = statusToBS(status);
        $scope.glyph = getGlyph(status);
      }

      function getTime(timestamp) {
        var updated = moment.unix(timestamp);
        return {
          formatted: updated.format('h:mm a'),
          delta: updated.fromNow()
        };
      }
    }
  ]);

  function setFeatures($scope, list) {
    var i, l;
    for (i=0, l=list.length; i<l; i++) {
      $scope[list[i]] = true;
    }
  }

})(window.angular, window.jQuery);
