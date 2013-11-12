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
        , event = restify('event', ['index','app','more']);

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
            app : getAppSpecific,
            more : getMore,
            moreApp : getMoreApp
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

        function getMore(id) {
          var dfd = $q.defer();
          $http
            .get('/api/' + _type + '/more/' + id)
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
          $http
            .get('/api/' + _type + '/app/' + name)
            .success(dfd.resolve)
            .error(dfd.reject);

          return dfd.promise;
        }

        function getMoreApp(name) {
          var dfd = $q.defer();
          $http
            .get('/api/' + _type + '/app/' + name + '/more')
            .success(dfd.resolve)
            .error(dfd.reject);

          return dfd.promise;
        }
      }
    }

  ]);

})(window.angular);
