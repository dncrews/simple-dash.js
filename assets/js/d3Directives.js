(function(angular, $) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard');

  app.directive('uptimeGraphRaw', [
    '$window',
    'd3Service',

    function($window, d3Service) {
      return {
        link: link
      };

      function link(scope, element, attrs) {
        if (! ($(element).is(':visible') && scope.pageType === 'app')) return;

        d3Service.then(d3Handler);

        function d3Handler(results) {
          var Graphs = results[1]
            , el = element[0]
            , graphNames = ['tPut', 'time95', 'time75', 'time50', 'errRate', 'mem'];

          var graphs = new Graphs(el, graphNames);

          scope.$watch('history.length', function() {
            graphs.render(scope.history, scope.events);
          });
        }

      }
    }
  ]);

  app.directive('uptimeGraphRickshaw', [
    '$window',
    'd3Service',

    function($window, d3Service) {
      return {
        link: link
      };

      function link(scope, element, attrs) {
        if (! ($(element).is(':visible') && scope.pageType === 'app')) return;

        d3Service.then(d3Handler);

        function d3Handler(results) {
          var d3 = results[0]
            , Graphs = results[1]
            , Rickshaw = results[2]
            , el = element[0]
            , graphNames = ['tPut', 'time', 'time95', 'time75', 'time50', 'errRate', 'mem']
            , titles = {
              errRate : 'Error Rate (%)',
              mem : 'Memory Usage (MB)',
              time: 'Response Time (ms)',
              time95: 'p95',
              time75: 'p75',
              time50: 'p50',
              tPut: 'Requests (/5min)'
            }
            , labels = {
              errRate : 'Err',
              mem : 'Mem',
              time: 'Response Time',
              time95: 'p95',
              time75: 'p75',
              time50: 'p50',
              tPut: 'Req'
            }
            , suffixes = {
              errRate : '%',
              mem : 'MB',
              time: 'ms',
              time95: 'ms',
              time75: 'ms',
              time50: 'ms'
            }
            , heights = {
              time : 200
            }
            , maxes = {
              errRate : 10,
              mem : 512,
              time : 5000,
              time95 : 5000,
              time75 : 5000,
              time50 : 5000
            };


          scope.$watch('history.length', function() {
            render(scope.history, scope.events);
          });


          function render(history, events) {
            if (! history) return;

            var data = {};

            // history.map(parsers[name])

            history.map(function(bucket) {
              var app = bucket.app || {
                  time : {},
                  memory : {}
                }
                , datum = {
                  date : new Date(app.created_at || bucket.bucket_time).getTime() / 1000,
                  errRate : app.error_rate || 0,
                  mem : app.memory.avg || 0,
                  time95 : app.time.p95 || 0,
                  time75 : app.time.p75 || 0,
                  time50 : app.time.p50 || 0,
                  tPut : app.codes.total
                };

              graphNames.map(function(name) {
                if (name === 'time') return;
                if (typeof data[name] === 'undefined') data[name] = [];

                data[name].unshift({
                  x : datum.date,
                  y : datum[name]
                });
              });

              return data;
            });

            graphNames.map(function(name) {
              if (name === 'time95' || name === 'time75' || name === 'time50') return;

              var $el = $('<div class="inner-graph"></div>').appendTo(element[0])
                , max = maxes[name]
                , palette = new Rickshaw.Color.Palette({ scheme: 'spectrum14' })
                , datum, yMax, linearScale, graph, hoverDetail, xAxis, yAxis;

              $el.before('<span class="graph-title">' + titles[name] + '</span>');


              if (name === 'time') {
                yMax = 0;
                ['time95','time75','time50'].map(function(t) {
                  var max = d3.max(data[t], function(d) { return d.y; });
                  if (max > yMax) yMax = max;
                });
              } else {
                datum = data[name];
                max = maxes[name];
                yMax = d3.max(datum, function(d) { return d.y; });
              }

              if (max && max > yMax) {
                yMax = max;
              }

              var config = {
                element: $el[0],
                width: $el[0].offsetWidth,
                height: heights[name] || 60,
                renderer: 'area',
                stroke: true
              };

              if (name === 'time') {

                config.series = [
                  {
                    color: palette.color(),
                    // color: '#cae2f7',
                    name : labels.time50,
                    data: data.time50
                  },
                  {
                    color: palette.color(),
                    // color: '#caf7f6',
                    name : labels.time75,
                    data: data.time75
                  },
                  {
                    color: palette.color(),
                    // color: '#caccf7',
                    name : labels.time95,
                    data: data.time95
                  }
                ];
              } else {
                config.series = [{
                  // color: palette.color(),
                  color: '#cae2f7',
                  name : labels[name],
                  data: datum
                }];
              }

              graph = new Rickshaw.Graph(config);

              graph.configure({ max : yMax });
              graph.render();

              hoverDetail = new Rickshaw.Graph.HoverDetail({
                graph : graph,
                yFormatter: function(y) { return Math.ceil(y) + (suffixes[name] || ''); }
              });

              // var annotator = new Rickshaw.Graph.Annotate({
              //   graph: graph
              // });

              // events.map(function(event) {
              //   console.log(event);
              // });

              xAxis = new Rickshaw.Graph.Axis.Time({
                graph: graph
              });

              xAxis.render();

              yAxis = new Rickshaw.Graph.Axis.Y({
                graph: graph,
                ticks: 3
                // tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
                // grid: false
              });

              yAxis.render();
            });

          }

        }

      }
    }
  ]);

})(window.angular, window.jQuery);
