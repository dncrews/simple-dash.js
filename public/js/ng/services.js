(function(angular) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard');

  app.factory('dashService', [
    '$http',
    '$q',

    function($http,$q) {

      var app = restify('app')
        , api = restify('api')
        , upstream = restify('upstream');

      return {
        app: app,
        api: api,
        upstream: upstream
      };

      function restify(type) {
        var _type = type;
        return {
          index: index,
          details: details
        };

        function index() {
          var dfd = $q.defer();
          $http
            .get('/api/' + _type)
            .success(dfd.resolve)
            .error(dfd.reject);

          return dfd.promise;
        }

        function details(name) {
          var dfd = $q.defer();
          $http
            .get('/api/' + _type + '/' + name)
            .success(dfd.resolve)
            .error(dfd.reject);

          return dfd.promise;
        }
      }
    }

  ]);

})(window.angular);
