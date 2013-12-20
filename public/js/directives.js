(function(angular, moment, $) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard');

  app.directive('historyItem', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        var item = scope.item
          , type = scope.$parent.pageType;

        scope.$parent.$watch('current', function() {
          if (! scope.$parent) return;

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
        }

        scope.className = 'label-' + setClassName();

        function setClassName() {
          return {
            'green' : 'success',
            'good' : 'success',
            'yellow' : 'warning',
            'slow' : 'warning',
            'red' : 'danger',
            'blue' : 'danger',
            'down' : 'danger'
          }[(item.status || item.stats.uptime_status)] || 'default';
        }
      }
    };
  });

  app.directive('eventItem', function() {
    return {
      restrict: 'A',
      template: ''+
      '<div class="item cf">' +
      '  <span class="icon {{ src }}">{{ src }}</span>' +
      '  <div class="change_detail">' +
      '    <span class="commit_msg">' +
      '      <span class="repo_name">{{ name }}</span>' +
      '      <a target="_blank" data-ng-show="msg" class="commit_link" data-ng-href="{{ url }}">{{ msg }}</a>' +
      '    </span>' +
      '  </div>' +
      '  <div class="change_meta">' +
      '    <span title="{{ time.formatted }}" data-ng-show="time.formatted">{{ time.delta }}</span>' +
      '    <span data-ng-show="author">by {{ author }}</span>' +
      '  </div>' +
      '</div>',
      replace: true,
      link: function(scope, element, attrs) {
        var event = scope.event
          , type = event.src
          , actions = {
            'github' : 'Committed to',
            'jenkins' : 'Deployed'
          }
          , date = moment.unix(event.timestamp);

        scope.src = event.src;
        scope.action = actions[type];
        scope.name = setName();
        scope.msg = setMsg();
        scope.time = {
          delta: date.fromNow(),
          formatted: date.format('h:mm a [on] MMM Do YYYY')
        };
        scope.author = setAuthor();
        scope.url = setUrl();


        function setName() {
          if (type === 'github') {
            if (event.data.organization) {
              return event.data.organization + '/' + event.data.repo_name;
            }
            return event.data.repo_name;
          }
          if (type === 'jenkins') return event.data.app_name;
          if (type === 'marrow') return event.data.app_name;
        }

        function setMsg() {
          if (type === 'github') return event.data.commit.message;
          if (type === 'jenkins') return 'Successfully built and deployed.';
          if (type === 'marrow') {
            if (event.type === 'marrow restart') return 'Restarted by immune system';
            if (event.type === 'marrow info:statusChange') return 'Status changed from "' + event.data.uptime_status_prev + '" to "' + event.data.uptime_status + '"';
          }
        }

        function setAuthor() {
          if (type === 'github') return event.data.author.name;
        }

        function setUrl() {
          if (type === 'github') return event.data.commit.url;
        }
      }
    };
  });

  app.directive('statusBtn', [
    '$location',

    function($location) {
      return {
        restrict: 'A',
        replace: true,
        scope: true,
        template: '<a class="app_link btn"><span class="glyphicon {{ glyph }} style="top:2px;"></span> <span>{{ name }}</span></a>',
        link: function(scope, element, attrs) {
          var item = scope.item
            , type = attrs.statusType
            , name = getName()
            , status = getStatus()
            , glyphs = {
              "good" : "ok-sign",
              "slow" : "warning-sign",
              "down" : "minus-sign",
              "unknown" : "question-sign"
            }
            , toBS = {
              'good' : 'btn-success',
              'slow' : 'btn-warning',
              'down' : 'btn-danger'
            };
          element.addClass(toBS[status] || 'btn-default');
          element.bind('click', goTo);

          scope.name = name;
          scope.glyph = 'glyphicon-' + glyphs[status] || 'question-sign';

          function getName() {
            if (item.name) return item.name;
            if (item.app && item.app.name) return item.app.name;
            if (item.app_errors && item.app_errors.name) return item.app_errors.name;
            return item.repo_name;
          }

          function getStatus() {
            console.log(item.status);
            return {
              "green" : "good",
              "yellow" : "slow",
              "blue" : "down",
              "red" : "down"
            }[item.status] || item.status;
          }

          function goTo() {
            scope.$apply(function() {
              $location.path('/' + type + '/' + name);
            });
          }
        }
      };
    }
  ]);

})(window.angular, window.moment, window.jQuery);
