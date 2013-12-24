/* global escape */
(function(angular, jQuery, moment) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard')
    , bindHistory = function($scope, parentSetCurrent) {
        function setCurrent(item) {
          if ($scope.current) $scope.current.isActive = false;
          item.isActive = true;
          parentSetCurrent(item);
        }
        var locked = false;

        $scope.mouseIn = function(item) {
          if (locked) return;
          setCurrent(item);
        }

        $scope.clickCurrent = function(item) {
          setCurrent(item);
          locked = true;
        };

        $scope.mouseGone = function() {
          if (locked) return;
          reset();
        };

        function reset() {
          setCurrent($scope.history[0]);
          locked = false;
          // setCurrent($scope.history[0]);
          // $('.history_timeline label').eq(0).trigger('reset');
        }

        $(document)
          .off('keydown')
          .on('keydown', function($evt) {
            if ((! locked) || ($evt.which !== 27)) return;
            $scope.$apply(reset);
          });
      }
    , reload;

  function statusToClass(status) {
    return {
      'green' : 'success',
      'good' : 'success',
      'yellow' : 'warning',
      'warning' : 'warning',
      'slow' : 'warning',
      'red' : 'danger',
      'blue' : 'danger',
      'down' : 'danger'
    }[status] || 'default';
  }

  function classToGlyph(bsClass) {
    var map = {
      "success" : "ok-sign",
      "warning" : "warning-sign",
      "danger" : "minus-sign",
      "default" : "question-sign"
    };
    return "glyphicon-" + map[bsClass];
  }

  app.controller('IndexCtrl', [
    '$rootScope',
    '$scope',
    '$q',
    'dashService',

    function IndexCtrl($rootScope, $scope, $q, service) {
      window.clearTimeout(reload);
      $rootScope.bodyClass = '';
      $rootScope.refresh = load;
      $scope.loading = {
        'upstream': true,
        'app': true,
        'api': true
      };
      $scope.upstreamList = [];
      $scope.appList = [];
      $scope.apiList = [];

      $scope.clean = function(appName) {
        if (! appName) return;
        return escape(appName);
      };

      function load() {
        var dfds = [
          service.upstream.index(),
          service.app.index(),
          service.api.index()
        ];
        $rootScope.updated = {};

        // Load all Upstream data
        dfds[0].then(function(upstreamList) {
          $scope.upstreamList = upstreamList;
          $scope.loading.upstream = false;
          $rootScope.updated = {
            formatted: moment(upstreamList[0].created_at).format('h:mm a')
          };
        });

        // Load all app data
        dfds[1].then(function(appList) {
          $scope.appList = appList;
          $scope.loading.app = false;
        });

        // Load all API data
        dfds[2].then(function(apiList) {
          $scope.apiList = apiList;
          $scope.loading.api = false;
        });

        // Ready reload of data after 60s
        $q.all(dfds).then(function() {
          reload = window.setTimeout(load, 60000);
        });
      }

      load();
    }
  ]);

  app.controller('UpstreamDetailsCtrl', [
    '$rootScope',
    '$scope',
    '$routeParams',
    'dashService',

    function UpstreamDetailsCtrl($rootScope, $scope, $routeParams, service) {
      var name = $routeParams.name;
      window.clearTimeout(reload);
      $rootScope.bodyClass = '';
      $rootScope.refresh = load;
      $scope.pageType = 'upstream';
      $scope.pageTitle = name + ' Status';
      if (name === 'HA Proxy') setFeatures($scope, [ 'hasThroughput', 'hasErrorRate', 'hasStatus']);
      if (name.match('Heroku')) setFeatures($scope, [ 'hasIssues' ]);
      $scope.loading = {
        'main' : true
      };

      function load() {
        $rootScope.updated = {};
        service.upstream.details(name).then(function(upstreamList) {
          var current = upstreamList[0];
          setCurrent(current);
          $rootScope.updated = {
            formatted: moment(current.created_at).format('h:mm a')
          };
          $scope.history = upstreamList;
          $scope.loading.main = false;
          reload = window.setTimeout(load, 60000);
        });
      }
      load();

      bindHistory($scope, setCurrent);

      function setCurrent(current) {
        var updated = moment(current.created_at)
          , status = current.status
          , statusClass = statusToClass(status);

        $scope.current = current;

        $scope.updated = {
          formatted: updated.format('h:mm a'),
          delta: updated.fromNow()
        };

        $scope.status = status;
        $scope.codes = current.meta.codes;
        $scope.error_rate = current.meta.error_rate;
        $scope.statusClass = statusClass;
        $scope.glyph = classToGlyph(statusClass);
        $scope.issues = current.meta.issues;
      }
    }
  ]);

  app.controller('AppDetailsCtrl', [
    '$rootScope',
    '$scope',
    '$routeParams',
    '$location',
    '$q',
    'dashService',

    function AppDetailsCtrl($rootScope, $scope, $routeParams, $location, $q, service) {
      var name = $routeParams.name;
      window.clearTimeout(reload);
      $rootScope.bodyClass = '';
      $rootScope.refresh = load;
      $scope.pageType = 'app';
      $scope.pageTitle = name + ' Status';
      setFeatures($scope, ['hasThroughput','hasRespTime','hasMemory','hasErrorRate','hasStatus','isHeroku','hasApis', 'hasEvents']);
      $scope.loading = {
        'main' : true,
        'apis' : true,
        'events' : true
      };

      $scope.goToApi = function(name) {
        $location.path('/api/' + escape(name));
      };

      $scope.clean = function(name) {
        if (! name) return;
        return escape(name);
      };

      function load() {
        var dfds = [
          service.app.details(name),
          service.api.app(name),
          service.change.app(name)
        ];
        $rootScope.updated = {};

        // Load all of the app data
        dfds[0].then(function(appList) {
          var current = appList[0];
          setCurrent(current);
          $scope.history = appList;
          $scope.loading.main = false;
        });

        // Load the dependent apis
        dfds[1].then(function(apiList) {
          $scope.apis = apiList;
          $scope.loading.apis = false;
        });

        // Load the events
        dfds[2].then(function(eventList) {
          $scope.events = eventList;
          $scope.loading.events = false;
        });

        // Trigger reload of data after 60s
        $q.all(dfds).then(function() {
          reload = window.setTimeout(load, 60000);
        });
      }

      load();

      bindHistory($scope, setCurrent);

      function setCurrent(current) {
        var status = current.status
          , statusClass = statusToClass(status);

        if (! current.app) {
          current.app = {
            codes : {
              '2xx' : null,
              '3xx' : null,
              '4xx' : null,
              '5xx' : null
            },
            memory : null,
            time : {
              p95 : null
            },
            error_rate : null,
            app_errors : null
          }
        }

        $scope.current = current;
        $scope.codes = current.app.codes;
        $scope.memory = current.app.memory;
        $scope.time = current.app.time;
        $scope.error_rate = current.app.error_rate;
        $scope.errors = current.app_errors;
        $rootScope.updated = getTime(current.bucket_time);

        $scope.status = status;
        $scope.statusClass = statusClass;
        $scope.glyph = classToGlyph(statusClass);
      }

      function getTime(time) {
        var updated = moment(time);
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
      window.clearTimeout(reload);
      $rootScope.bodyClass = '';
      $rootScope.refresh = load;
      $scope.pageType = 'app';
      $scope.pageTitle = name + ' Status';
      setFeatures($scope, ['hasThroughput','hasRespTime','hasErrorRate','hasStatus']);
      $scope.loading = {
        'main' : true
      };

      function load() {
        $rootScope.updated = {};
        service.api.details(name).then(function(apiList) {
          var current = apiList[0];
          setCurrent(current);
          $scope.history = apiList;
          $scope.loading.main = false;
          reload = window.setTimeout(load, 60000);
        });
      }
      load();

      bindHistory($scope, setCurrent);

      function setCurrent(current) {
        var status = current.status
          , statusClass = statusToClass(status);
        $scope.current = current;
        $rootScope.updated = getTime(current.created_at);

        $scope.status = status;
        $scope.codes = current.codes;
        $scope.time = current.time;
        $scope.error_rate = current.error_rate;
        $scope.statusClass = statusClass;
        $scope.glyph = classToGlyph(statusClass);
      }

      function getTime(timestamp) {
        var updated = moment(timestamp);
        return {
          formatted: updated.format('h:mm a'),
          delta: updated.fromNow()
        };
      }
    }
  ]);

  app.controller('ChangeLogCtrl', [
    '$rootScope',
    '$scope',
    'dashService',
    'changeService',

    function ChangeLogCtrl($rootScope, $scope, service, changeService) {
      window.clearTimeout(reload);
      $rootScope.bodyClass = 'change_log';
      $rootScope.refresh = load;
      $scope.loading = {
        'main' : true
      };
      var last_id
        , ONE_HOUR = 60 * 60 * 1000
        , now = Date.now()
        , times = {
          '1hr' : now - ONE_HOUR,
          '3hr' : now - (ONE_HOUR * 3),
          '6hr' : now - (ONE_HOUR * 6),
          '1d' : now - (ONE_HOUR * 24)
        };

      function load() {
        $rootScope.updated = {};
        service.change.index().then(function(eventList) {
          $scope.events = eventList;
          $scope.loading.events = false;
          last_id = eventList[eventList.length - 1]._id;
          reload = window.setTimeout(load, 60000);
          $rootScope.updated = {
            formatted: moment(eventList[0].created_at).format('h:mm a')
          };
        });
        changeService.repos().then(function(repos) {
          $scope.repos = repos;
        });
        changeService.types().then(function(types) {
          $scope.types = types;
        });

        setFilterTimes();
      }

      load();

      function setFilterTimes() {
        now = Date.now();
        times = {
          '1hr' : now - ONE_HOUR,
          '3hr' : now - (ONE_HOUR * 3),
          '6hr' : now - (ONE_HOUR * 6),
          '1d' : now - (ONE_HOUR * 24)
        };
        console.log(times);
      }

      $scope.timeFilter = function(obj) {

        console.log('stamp: ' + obj.timestamp);
        var range = times[$scope.timeSearch]
          , stamp = obj.timestamp;

        if (! stamp) {
          stamp = new Date(obj.created_at).getTime();

          // Cache the timestamp
          // This makes each one process twice initially
          // because it triggers change
          // Is that worth it?
          obj.timestamp = stamp;
          return true;
        }

        if (! range) return true;

        return stamp > range;
      };
    }
  ]);

  function setFeatures($scope, list) {
    var i, l;
    for (i=0, l=list.length; i<l; i++) {
      $scope[list[i]] = true;
    }
  }

})(window.angular, window.jQuery, window.moment);
