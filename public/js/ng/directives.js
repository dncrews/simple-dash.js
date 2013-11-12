(function(angular, moment) {

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

  app.directive('eventItem', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        var event = scope.event
          , type = event.src
          , actions = {
            'github' : 'Committed to',
            'jenkins' : 'Deployed'
          }
          , date = moment.unix(event.timestamp);

        scope.action = actions[type];
        scope.name = setName();
        scope.msg = setMsg();
        scope.time = date.fromNow() + ' @ ' + date.format('h:mm a [on] MMM Do YYYY');


        function setName() {
          if (type === 'github') return event.data.repo_name;
          if (type === 'jenkins') return event.data.app_name;
        }

        function setMsg() {
          if (type === 'github') return event.data.commit.message;
          if (type === 'jenkins') return '';
        }

        scope.actions = {
          'github' : 'Committed to',
          'jenkins' : 'Deployed'
        };



      }
    };
  });

})(window.angular, window.moment);
