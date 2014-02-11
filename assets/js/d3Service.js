(function(angular) {

  'use strict';

  var module = angular.module('d3', []);

  module.factory('d3Service', [
    '$document',
    '$q',
    '$rootScope',

    function($document, $q, $rootScope) {
      var dfd = $q.defer();

      var scripts = [ 'http://d3js.org/d3.v3.min.js', 'vendor/rickshaw.min.js' ];

      var dfds = scripts.map(function(path) {
        var dfd = $q.defer()
          , scriptTag = $document[0].createElement('script');

        scriptTag.type = 'text/javascript';
        scriptTag.async = true;
        scriptTag.src = path;
        scriptTag.onreadystatechange = function() {
          if (this.readyState == 'complete') dfd.resolve();
        };
        scriptTag.onload = function() {
          dfd.resolve();
        };

        var s = $document[0].getElementsByTagName('body')[0];
        s.appendChild(scriptTag);

        return dfd.promise;
      });

      $q.all(dfds).then(function allReady() {
        // Load client in the browser
        dfd.resolve([window.d3, window.Rickshaw]);
      });

      return dfd.promise;
    }
  ]);

})(window.angular);
