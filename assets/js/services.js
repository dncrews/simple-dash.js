(function(angular, mountPath) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard')
    , ENDPOINT = mountPath + 'api/';

  app.factory('changeService', [
    '$http',
    '$q',

    function ($http, $q) {

      return {
        repos : getRepos,
        types : getTypes
      };

      function getRepos() {
        var dfd = $q.defer();
        $http
          .get(ENDPOINT + 'change/repos')
          .success(dfd.resolve)
          .error(dfd.reject);
        return dfd.promise;
      }

      function getTypes() {
        var dfd = $q.defer();
        $http
          .get(ENDPOINT + 'change/types')
          .success(dfd.resolve)
          .error(dfd.reject);
        return dfd.promise;
      }
    }
  ]);

  app.factory('dashService', [
    '$http',
    '$q',

    function($http,$q) {

      var app = restify('app', ['index','details'])
        , service = restify('service', ['index','details','app'])
        , upstream = restify('upstream', ['index','details'])
        , change = restify('change', ['index','app'])
        , performance = restify('performance', ['details', 'graph', 'pages']);

      return {
        app: app,
        service: service,
        upstream: upstream,
        change: change,
        performance: performance
      };

      function restify(type, list) {
        var _type = type
          , getters = {
            index : getData(),
            details : getData('/'),
            app : getData('/app/'),
            graph : getData('/histogram/'),
            pages : getData('/pages/')
          }
          , i, l, obj = {};

        for (i=0, l=list.length; i<l; i++) {
          obj[list[i]] = getters[list[i]];
        }

        return obj;

        function getIndex() {
          var dfd = $q.defer();
          $http
            .get(ENDPOINT + _type)
            .success(dfd.resolve)
            .error(dfd.reject);

          return dfd.promise;
        }

        function getData(path) {
          return function(name) {
            var dfd = $q.defer()
              , url = ENDPOINT + _type;

            if (path) url += path;
            if (name) url += encodeURIComponent(name);

            $http
              .get(url)
              .success(dfd.resolve)
              .error(dfd.reject);

            return dfd.promise;
          }
        }

      }
    }

  ]);

})(window.angular, window.assetPath);
