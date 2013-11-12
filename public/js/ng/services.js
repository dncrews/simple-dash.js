(function(angular) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard');

  app.factory('dashService', [
    '$http',
    '$q',

    function($http,$q) {

      var app = restify('app', ['index','details'])
        , api = restify('api', ['index','details','app'])
        , upstream = restify('upstream', ['index','details'])
        , event = restify('event', ['index','app']);

      return {
        app: app,
        api: api,
        upstream: upstream,
        event: event
      };

      function restify(type, list) {
        var _type = type
          , getters = {
            index : getIndex,
            details : getDetails,
            app : getAppSpecific
          }
          , i, l, obj = {};

        for (i=0, l=list.length; i<l; i++) {
          obj[list[i]] = getters[list[i]];
        }

        return obj;

        function getIndex() {
          var dfd = $q.defer();
          $http
            .get('/api/' + _type)
            .success(dfd.resolve)
            .error(dfd.reject);

          return dfd.promise;
        }

        function getDetails(name) {
          var dfd = $q.defer();
          $http
            .get('/api/' + _type + '/' + name)
            .success(dfd.resolve)
            .error(dfd.reject);

          return dfd.promise;
        }

        function getAppSpecific(name) {
          var dfd = $q.defer();
          var url = '/api/' + _type + '/app/' + name;
          $http
            .get('/api/' + _type + '/app/' + name)
            .success(dfd.resolve)
            .error(dfd.reject);

          return dfd.promise;
        }
      }
    }

  ]);

})(window.angular);
