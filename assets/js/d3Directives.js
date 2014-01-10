(function(angular, $, moment) {

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
              time50: 'ms',
              tPut: 'req'
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
            }
            , graphs = {}
            , tzOffset = new Date().getTimezoneOffset() * 60;

          Rickshaw.namespace('Rickshaw.Graph.Renderer.UnstackedArea');
          Rickshaw.Graph.Renderer.UnstackedArea = Rickshaw.Class.create(Rickshaw.Graph.Renderer.Area, {
            name: 'unstackedarea',
            defaults: function($super) {
              return Rickshaw.extend($super(), {
                unstack: true,
                fill: false,
                stroke: false
              });
            }
          });


          scope.$watch('history.length', function() {
            render(scope.history, scope.events);
          });


          function render(history, events) {
            if (! history) return;

            var data = {};

            history.map(function(bucket, i) {
              var app = bucket.app || {
                  time : {},
                  memory : {}
                }
                , date = new Date(app.created_at || bucket.bucket || bucket.app_errors.created_at)
                , datum = {
                  date : (date.getTime() / 1000) - tzOffset,
                  errRate : app.error_rate || 0,
                  mem : app.memory.avg || 0,
                  time95 : app.time.p95 || 0,
                  time75 : app.time.p75 || 0,
                  time50 : app.time.p50 || 0,
                  tPut : app.codes && app.codes.total || 0
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

              var max = maxes[name]
                , palette = new Rickshaw.Color.Palette({ scheme: 'spectrum14' })
                , $container, $el, $an, datum, yMax, linearScale, graph, hoverDetail, xAxis, yAxis, colors;

              if (graphs[name]) {
                $container = graphs[name].remove();
              } else {
                $container = graphs[name] = $('<div class="graph-container"></div>').appendTo(element[0]);
              }
              $container.append('<span class="graph-title">' + titles[name] + '</span>');
              $el = $('<div class="inner-graph"></div>').appendTo($container);
              $an = $('<div class="anootations"></div>').appendTo($container);

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
                renderer: 'unstackedarea',
                stroke: true
              };

              if (name === 'time') {

                config.series = [
                  {
                    // color: '#caccf7',
                    name : labels.time95,
                    data: data.time95
                  },
                  {
                    // color: '#caf7f6',
                    name : labels.time75,
                    data: data.time75
                  },
                  {
                    // color: '#cae2f7',
                    name : labels.time50,
                    data: data.time50
                  }
                ];

                // Reverse the colors
                config.series[2].color = palette.color();
                config.series[1].color = palette.color();
                config.series[0].color = palette.color();
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
                formatter : function(series, x, y, formattedX, formattedY, d) {
                  var suf = suffixes[name] || ''
                    , pref = name === 'time' ? series.name + ': ' : '';

                  return pref + y.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suf;
                },
                xFormatter : function(seconds) {
                  var time = moment.unix(seconds + tzOffset)
                    , times = {
                    formatted: time.format('h:mm a'),
                    delta: time.fromNow()
                  };

                  return times.formatted + ' (' + times.delta + ')';
                }
              });

              var annotator = new Rickshaw.Graph.Annotate({
                graph: graph,
                element: $an[0]
              });

              events.map(function(event) {
                if (! (
                  (event.type === 'jenkins' && event.action === 'build') ||
                  (event.type === 'marrow' && /restart/.test(event.action))
                )) return;

                var time = moment(new Date(event.created_at))
                  , times = {
                    formatted: time.format('h:mm a'),
                    delta: time.fromNow()
                  }
                  , message = event.action + ' @ ' + times.formatted;

                annotator.add(new Date(event.created_at).getTime()/1000 - tzOffset, message);
              });

              annotator.update();

              xAxis = new Rickshaw.Graph.Axis.Time({
                graph: graph
              });

              xAxis.render();

              yAxis = new Rickshaw.Graph.Axis.Y({
                graph: graph,
                ticks: 3,
                tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
                // grid: false
              });

              yAxis.render();
            });

          }

        }

      }
    }
  ]);

})(window.angular, window.jQuery, window.moment);
