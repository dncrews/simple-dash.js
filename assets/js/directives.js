(function(angular, moment, $) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard')
    , statusToClass = function(status) {
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
    , statusToColor = function(status) {
      return {
        'green' : '#5CB85C',
        'good' : '#5CB85C',
        'yellow' : '#F0AD4E',
        'warning' : '#F0AD4E',
        'slow' : '#F0AD4E',
        'red' : '#D9534F',
        'blue' : '#D9534F',
        'down' : '#D9534F'
      }[status] || '#CCC';
    };

  app.directive('historyItem', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        var item = scope.item;
        var SHADE_MAGNITUDE = -3/5 //negative shades to black, positive shades to white, the closer to 1 the deeper the shading
            , percent = null
            , currentColor = null
            , newColor = null;

        //Calculate the percent based upon the p95 response time
        if (item.app) {
          percent = Math.floor(item.app.time.p95 / 100);
        }
        else if (item.time) {
          percent = Math.floor(item.time.p95 / 100);
        }

        //Determine and set new color
        currentColor = statusToColor(item.status);
        newColor = shadeColor(currentColor, percent);
        $(element).css('background-color', newColor);

        //Shade the color with a magnitude of SHADE_MAGNITUDE by shifting bits
        //Based upon: http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color
        function shadeColor(color, percent) {
          var num = parseInt(color.slice(1),16)
            , amt = Math.round(SHADE_MAGNITUDE * percent)
            , R = (num >> 16) + amt
            , B = (num >> 8 & 0x00FF) + amt
            , G = (num & 0x0000FF) + amt;
          var newColor = "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
          return newColor;
        }

        scope.mouseIn = function() {
          scope.$parent.mouseIn(item);
        };
        scope.clack = function() {
          scope.$parent.clickCurrent(item);
        };
        scope.mouseGone = function() {
          scope.$parent.mouseGone();
        };

        scope.className = 'label-' + statusToClass(item.status);
      }
    };
  });

  app.directive('eventItem', function() {
    return {
      restrict: 'A',
      template: ''+
      '<div class="item cf">' +
      '  <span class="icon {{ event.type }}"></span>' +
      '  <div class="change_detail">' +
      '    <span class="commit_msg">' +
      '      <span class="repo_name">{{ event.name }}</span>' +
      '      <a target="_blank" data-ng-show="msg" class="commit_link" data-ng-href="{{ event.meta.url }}">{{ msg }}</a>' +
      '    </span>' +
      '  </div>' +
      '  <div class="change_meta">' +
      '    <span title="{{ time.formatted }}" data-ng-show="time.formatted">{{ time.delta }}</span>' +
      '    <span data-ng-show="event.meta.author">by {{ event.meta.author.name }}</span>' +
      '  </div>' +
      '</div>',
      replace: true,
      link: function(scope, element, attrs) {
        var event = scope.event
          , action = event.action
          , msgMap = {
            'build' : 'Successfully built and deployed.',
            'merge' : event.meta && event.meta.message || '',
            'restart' : event.meta && 'Auto-restarted: ' + event.meta.reason,
            'restart.not_configured' : event.meta && 'Auto-restarted: ' + event.meta.reason,
            'status.change' : event.meta && event.meta.reason
          }
          , date = moment(event.created_at);

        scope.src = event.src;
        scope.msg = msgMap[action];
        scope.time = {
          delta: date.fromNow(),
          formatted: date.format('h:mm a [on] MMM Do YYYY')
        };
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
        template: '' +
          '<a class="app_link btn col-xs-12">'+
          ' <span'+
          '   class="glyphicon {{ glyph }}"></span>' +
          '   <span>{{ name }}</span>' +
          '</a>',
        link: function(scope, element, attrs) {
          var item = scope.item
            , type = attrs.statusType
            , name = getName()
            , status = getStatus()
            , glyphs = {
              "success" : "ok-sign",
              "warning" : "warning-sign",
              "danger" : "minus-sign",
              "default" : "question-sign"
            };
          element
            .addClass('col-sm-' + (Math.ceil(name.length/7) + 1))
            .addClass('col-md-' + (Math.ceil(name.length/10) + 1))
            .addClass('btn-' + status)
            .bind('click', goTo);

          scope.name = name;
          scope.glyph = 'glyphicon-' + glyphs[status] || 'question-sign';

          function getName() {
            if (item.repo_name) return item.repo_name;
            if (item.app && item.app.repo_name) return item.app.repo_name;
            if (item.app_errors && item.app_errors.repo_name) return item.app_errors.repo_name;
            return item.name;
          }

          function getStatus() {
            return statusToClass(item.status);
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

  app.directive('uptimeGraph', [
    '$window',
    'd3Service',

    function($window, d3Service) {
      return {
        link: link
      };

      function link(scope, element, attrs) {
        if (! ($(element).is(':visible') && scope.pageType === 'app')) return;

        d3Service.d3().then(d3Handler);

        function d3Handler() {
          var el = element[0]
            , graphNames = ['tPut', 'time95', 'time75', 'time50', 'errRate', 'mem'];

          var graphs = new (window.graphingthingy)(el, graphNames);

          scope.$watch('history.length', function() {
            graphs.render(scope.history, scope.events);
          });
        }

      }
    }
  ]);

})(window.angular, window.moment, window.jQuery);
