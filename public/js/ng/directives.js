(function(angular) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard');

  app.directive('historyItem', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        scope.$parent.$watch('current', function() {
          if (angular.equals(scope.item, scope.$parent.current)) {
            element.addClass('active');
          } else {
            element.removeClass('active');
          }
        });
        $(element).bind('activate', function() {
          changeToMe();
        });

        function changeToMe() {
          scope.$apply(function() {
            scope.$parent.setCurrent(scope.item);
          });
          // scope.$parent.setCurrent(scope.item);
          // scope.$parent.$digest();
        }

      }
    };
  });

})(window.angular);
