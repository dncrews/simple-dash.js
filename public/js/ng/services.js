(function(angular) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard');

  app.factory('appService', [
    '$http',
    function($http) {
      console.log($http);
      return {
        'fetch' : function() {
          console.log('yeah');
        }
      };
    }
  ]);

  app.factory('apiService', [
    '$http',
    function($http) {
      console.log($http);
      return {
        'fetch' : function() {
          console.log('yeah');
        }
      };
    }
  ]);

  app.factory('upstreamService', [
    '$http',
    function($http) {
      console.log($http);
      return {
        'fetch' : function() {
          console.log('yeah');
        }
      };
    }
  ]);

  app.factory('changeService', [
    '$http',
    function($http) {
      console.log($http);
      return {
        'fetch' : function() {
          console.log('yeah');
        }
      };
    }
  ]);

})(window.angular);
