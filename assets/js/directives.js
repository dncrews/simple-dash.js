(function(angular, assetPath, moment, $) {

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
        // currentColor = statusToColor(item.status);
        // newColor = shadeColor(currentColor, percent);
        // $(element).css('background-color', newColor);

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
      templateUrl: assetPath + 'templates/directives/eventItem.html',
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
        templateUrl : assetPath + 'templates/directives/statusBtn.html',
        link: function(scope, element, attrs) {
          var item = scope.item
            , type = attrs.statusType
            , name = getName()
            , shortName = name.length > 36 ? name.substr(0, 33) + '...' : name
            , status = getStatus()
            , glyphs = {
              "success" : "ok-sign",
              "warning" : "warning-sign",
              "danger" : "minus-sign",
              "default" : "question-sign"
            };
          element
            .addClass('col-sm-' + (Math.ceil(shortName.length/7) + 1))
            .addClass('col-md-' + (Math.ceil(shortName.length/10) + 1))
            .addClass('btn-' + status)
            .bind('click', goTo);

          scope.shortName = shortName;
          if (shortName !== name) scope.name = name;
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

  app.directive('loading', [
    function() {
      return {
        restrict: 'E',
        template: '<div class="loadingStatus"></div>',
        replace: true,
        scope: {
          status: '=status'
        },
        link: function(scope, element, attrs) {
          var interval, msgs = [
            'Locating the required gigapixels to render',
            'Spinning up the hamster',
            'Shovelling coal into the server',
            'Programming the flux capacitor',
            '640K ought to be enough for anybody',
            'Would you prefer chicken, steak, or tofu?',
            'Pay no attention to the man behind the curtain',
            'Would you like fries with that?',
            'Checking the gravitational constant in your locale',
            'At least you\'re not on hold',
            'The server is powered by a lemon and two electrodes',
            'We love you just the way you are',
            'Take a moment to sign up for our lovely prizes',
            'Don\'t think of purple hippos',
            'Wait while the satellite moves into position',
            'It\'s still faster than you could draw it',
            'My other load screen is much faster. You should try that one instead.',
            'The version I have of this in testing has much funnier load screens',
            'Loading humorous message',
            'Warming up Large Hadron Collider',
            'The magic elves are working frantically in here',
            'Happy Elf and Sad Elf are talking about your data',
            'All the relevant elves are on break',
            'Elf down! We\'re cloning the elf that was supposed to get you the data',
            'Time is an illusion. Loading time doubly so',
            'Are we there yet?',
            'Please insert 25¢',
            'Hang on a sec, I know your data is here somewhere',
            'HELP!, I\'m being held hostage, and forced to write the stupid lines!',
            'Searching for Answer to Life, the Universe, and Everything',
            'Waiting for the system admin to hit enter',
            'Paging for the system admin',
            'Warming up the processors',
            'RE-calibrating the internet',
            'We apologise for the fault in the subtitles. Those responsible have been sacked',
            'Counting backwards from infinity',
            'Scanning your hard drive for credit card details. Please be patient',
            'Don\'t panic',
            'Loading the loading message',
            'Potent potables',
            'Reticulating Splines'
          ];
          scope.$watch('status', function(newVal, oldVal) {
            if (newVal === false) window.clearInterval(interval);
            if (newVal === 'failed') {
              window.clearInterval(interval);
              element.html('Query failed... Please try again');
            }
          });

          interval = window.setInterval(function() {
            var msg = msgs[Math.round(Math.random()*(msgs.length-1))];
            element.text(msg + '...');
            // element.html(element.html() + '<br />' + msg + '...');
          }, 1500);
          element.text('Loading...');
        }
      };
    }
  ]);

  app.directive('detailTabs', [
    '$location',

    function($location) {
      return {
        restrict: 'A',
        replace: true,
        scope: true,
        templateUrl : assetPath + 'templates/directives/detailTabs.html',
        link: function(scope, element, attrs) {
          var typeMap = {
              app : 'uptime',
              performance: 'performance'
            }
          , active = typeMap[scope.pageType];

          if (! active) return;

          element.find('.' + active).addClass('active');
          element.on('click', 'a', function(evt) {
            var $this = $(this);
            evt.preventDefault();
            evt.stopPropagation();

            if ($this.parent().hasClass('active')) return;

            scope.$apply(function() {
              $location.path($this.attr('href'));
            });


          });
        }
      };
    }
  ]);

})(window.angular, window.assetPath, window.moment, window.jQuery);
