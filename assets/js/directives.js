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
    };

  app.directive('historyItem', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        var item = scope.item;

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

        function d3Handler(d3) {
          var $element = d3.select(element[0])
            , margin = { top: 75, right: 20, bottom: 30, left: 50 }
            , height = 300 - margin.top - margin.bottom
            , width = $element.node().offsetWidth - margin.left - margin.right
            , mainSvg = $element
                .append('svg')
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
            , svg = mainSvg
                .append('g')
                  .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

            , x = d3.time.scale()
                .range([0, width])
            , yMem = d3.scale.linear()
                .range([height, 0])
            , yResp = d3.scale.linear()
                .range([height, 0])
            , xAxis, yAxisResp, yAxisMem, changeAxis;

          // Browser resize
          // window.onresize = function() {
          //   scope.$apply();
          // };

          // scope.$watch(function() {
          //   return angular.element($window)[0].innerWidth;
          // }, render);
          scope.$watch('history.length', render);

          function render() {
            var buckets = scope.history
              , changes = scope.events
              , changeTimes;

            if (! buckets) return;

            svg
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom);

            changeTimes = [];
            svg.selectAll('g, path').remove();

            buckets.forEach(function(bucket) {
              var app = bucket.app || { time : {}, memory : {}};
              bucket.date = new Date(app.created_at || bucket.bucket_time);
              bucket.resp = app.time.p75 || 0;
              bucket.mem = app.memory.avg || 0;
            });
            changes.forEach(function(change) {
              if (change.type === 'jenkins' && change.action === 'build') changeTimes.push(new Date(change.created_at));
            });

            x.domain(d3.extent(buckets, function(d) { return d.date; }));
            yResp.domain(d3.extent(buckets, function(d) { return d.resp; }));
            yMem.domain(d3.extent(buckets, function(d) { return d.mem; }));

            xAxis = d3.svg.axis()
              .scale(x)
              .ticks(d3.time.hours, 2)
              .orient("bottom");

            yAxisResp = d3.svg.axis()
              .scale(yResp)
              .orient("left");

            yAxisMem = d3.svg.axis()
              .scale(yMem)
              .orient("right");

            changeAxis = d3.svg.axis()
              .scale(x)
              .orient('top')
              .tickValues(changeTimes)
              .tickSize(height)
              .tickFormat(function(d) { return '@ ' + d3.time.format('%X')(d); });

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            svg.append("g")
                .attr("class", "x axis change")
                .attr("transform", "translate(0, " + height + ")")
                .call(changeAxis)
                .selectAll('text')
                  .attr('transform', 'rotate(-90)')
                  .attr('y', 0)
                  .attr('x', height + margin.top - 45);

            svg.append("g")
                .attr("class", "y axis time")
                .call(yAxisResp)
              .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("Time (ms)");

            svg.append("g")
                .attr("class", "y axis mem")
                .attr('transform', 'translate(' + width + ', 0)')
                .call(yAxisMem)
              .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -15)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("Memory (MB)");

            var respLine = d3.svg.line()
              .x(function(d) { return x(d.date); })
              .y(function(d) { return yResp(d.resp); });

            var memLine = d3.svg.line()
              .x(function(d) { return x(d.date); })
              .y(function(d) { return yMem(d.mem); });

            svg.append("path")
                .datum(buckets)
                .attr("class", "line time")
                .attr("d", respLine);

            svg.append("path")
              .datum(buckets)
              .attr("class", "line mem")
              .attr("d", memLine);

          }
        }

      }
    }
  ]);

})(window.angular, window.moment, window.jQuery);
