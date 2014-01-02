(function(angular, $, moment) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard')
    , bindHistory = function($scope, parentSetCurrent) {
        function setCurrent(item) {
          if ($scope.current) $scope.current.isActive = false;
          item.isActive = true;
          parentSetCurrent(item);
        }
        $scope.locked = false;

        $scope.mouseIn = function(item) {
          if ($scope.locked) return;
          $scope.isHistorying = true;
          setCurrent(item);
        };

        $scope.clickCurrent = function(item) {
          setCurrent(item);
          $scope.locked = true;
        };

        $scope.mouseGone = function() {
          if ($scope.locked) return;
          reset();
        };

        $scope.reset = reset;

        function reset() {
          setCurrent($scope.history[0]);
          $scope.isHistorying = false;
          $scope.locked = false;
          // setCurrent($scope.history[0]);
          // $('.history_timeline label').eq(0).trigger('reset');
        }

        $(document)
          .off('keydown')
          .on('keydown', function($evt) {
            if ((! $scope.locked) || ($evt.which !== 27)) return;
            $scope.$apply(reset);
          });
      }
    , reload;

  function resetPage($rootScope) {
    $rootScope.forceDesktop = window.forceDesktop;
    $rootScope.hash = window.location.hash;
    window.clearTimeout(reload);
  }

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
      resetPage($rootScope);

      $rootScope.refresh = load;
      $rootScope.pageType = 'index';
      $scope.loading = {
        'upstream': true,
        'app': true,
        'services': true
      };
      $scope.upstreamList = [];
      $scope.appList = [];
      $scope.serviceList = [];

      function load() {
        var dfds = [
          service.upstream.index(),
          service.app.index(),
          service.service.index()
        ];
        $rootScope.updated = {};

        // Load all Upstream data
        dfds[0].then(function(upstreamList) {
          $scope.upstreamList = upstreamList;
          $scope.loading.upstream = false;
          if (upstreamList[0]) {
            $rootScope.updated = {
              formatted: moment(upstreamList[0].created_at).format('h:mm a')
            };
          }
        });

        // Load all app data
        dfds[1].then(function(appList) {
          $scope.appList = appList;
          $scope.loading.app = false;
        });

        // Load all Service data
        dfds[2].then(function(serviceList) {
          $scope.serviceList = serviceList;
          $scope.loading.services = false;
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
      resetPage($rootScope);
      var name = $routeParams.name;
      $rootScope.refresh = load;
      $rootScope.pageType = 'upstream';
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
      resetPage($rootScope);
      var name = $routeParams.name;
      $rootScope.refresh = load;
      $rootScope.pageType = 'app';
      $scope.pageTitle = name + ' Status';
      setFeatures($scope, ['hasThroughput','hasRespTime','hasMemory','hasErrorRate','hasStatus','isHeroku','hasServices', 'hasEvents']);
      $scope.loading = {
        'main' : true,
        'services' : true,
        'events' : true
      };

      $scope.goToService = function(name) {
        $location.path('/service/' + encodeURIComponent(name));
      };

      function load() {
        var dfds = [
          service.app.details(name),
          service.service.app(name),
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

        // Load the dependent services
        dfds[1].then(function(serviceList) {
          $scope.services = serviceList;
          $scope.loading.services = false;
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
          };
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

  app.controller('ServiceDetailsCtrl', [
    '$rootScope',
    '$scope',
    '$routeParams',
    'dashService',

    function ServiceDetailsCtrl($rootScope, $scope, $routeParams, service) {
      resetPage($rootScope);
      var name = $routeParams.name;
      $rootScope.refresh = load;
      $rootScope.pageType = 'service';
      $scope.pageTitle = name + ' Status';
      setFeatures($scope, ['hasThroughput','hasRespTime','hasErrorRate','hasStatus']);
      $scope.loading = {
        'main' : true
      };

      function load() {
        $rootScope.updated = {};
        service.service.details(name).then(function(serviceList) {
          var current = serviceList[0];
          setCurrent(current);
          $scope.history = serviceList;
          $scope.loading.main = false;
          reload = window.setTimeout(load, 60000);
        });
      }
      load();

      bindHistory($scope, setCurrent);

      function setCurrent(current) {
        if (! current) return;
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
      resetPage($rootScope);
      $rootScope.pageType = 'change_log';
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
      }

      $scope.timeFilter = function(obj) {
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
