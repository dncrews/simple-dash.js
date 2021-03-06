(function(angular, $, moment) {

  'use strict';

  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard');

  // This is the new d3 Directive.
  // This is where all new graphs should go
  app.directive('fsGraph', [
    'd3Service',

    function(d3Service) {
      return { link: link };

      function link(scope, element, attrs) {

        d3Service.then(function(results) {
          var d3 = results[0]
            , Rickshaw = results[1]
            , el = element[0];

          var config = element.data('fsGraph');

          scope.$watch(config.data, function(newValue) {
            if (! newValue) return;

            scope.hasGraphs = true;

            render(newValue.graphData, null, config);
          });

          element.append('<h3 class="graph-title">' + config.title + '</h3>');

          function render(data, events, config) {
            if (! data) return;
            element.find('.inner-graph, .anotations').remove();
            var $el = $('<div class="inner-graph"></div>').appendTo(element)
              , $an = $('<div class="anotations"></div>').appendTo(element);

            var max = config.max || 0
              , yMax = 0
              , palette = new Rickshaw.Color.Palette({ scheme: 'spectrum14' });

            palette.color(); // To skip to the slightly lighter color

            if (config.multiSeries) {
              data.reverse().map(function(item) {
                item.color = palette.color();
                var max = d3.max(item.data, function(d) { return d.y; });
                if (max > yMax) yMax = max;
              });
            } else {
              yMax = d3.max(data, function(d) { return d.y; });
            }

            if (max > yMax) yMax = max;
            yMax *= 1.25;

            var graphConfig = {
              element : $el[0],
              width: $el[0].offsetWidth,
              height: config.height || 60,
              renderer: 'unstackedarea',
              stroke: true
            };

            if (! config.multiSeries) {
              graphConfig.series = [{
                color: config.color || '#cae2f7',
                name : config.label,
                data : data
              }];
            } else {
              graphConfig.series = data.reverse();
            }

            $el.empty();
            var graph = new Rickshaw.Graph(graphConfig);

            graph.configure({ max : yMax });
            graph.render();

            var hoverConfig = {
              graph : graph,
              formatter : function(series, x, y, formattedX, formattedY, d) {
                var suffix = config.suffix || ''
                  , prefix = d.value.label + ': ' || config.prefix || '';

                return prefix + y.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix;
              }
            };

            if (config.multiSeries) {
              hoverConfig.xFormatter = function(seconds) {
                var tzOffset = new Date().getTimezoneOffset() * 60
                  , time = moment.unix(seconds + tzOffset)
                  , times = {
                  formatted: time.format('h:mm a'),
                  delta: time.fromNow()
                };

                return times.formatted + ' (' + times.delta + ')';
              }
            }

            var hoverDetail = new Rickshaw.Graph.HoverDetail(hoverConfig);

            var yAxis = new Rickshaw.Graph.Axis.Y({
              graph : graph,
              ticks: 3,
              tickFormat: Rickshaw.Fixtures.Number.formatKMBT
            });

            var xConfig = {
              graph : graph
            };

            var xAxis;

            var graphType = config.type || 'Time'
              , xAxis = new Rickshaw.Graph.Axis[graphType](xConfig);

            xAxis.render();
            yAxis.render();
          }


        });
      }
    }
  ])

  // This is the old d3 directive. Most graphs use this
  // TODO: Migrate to fsGraph directive and deprecate
  app.directive('uptimeGraphRickshaw', [
    '$window',
    'd3Service',

    function($window, d3Service) {
      return {
        link: link
      };

      function link(scope, element, attrs) {
        if (! $(element).is(':visible')) return;

        var graphNames = [];

        if (scope.hasThroughput) graphNames.push('tPut');
        if (scope.hasRespTime) graphNames = graphNames.concat(['time', 'time95', /*'time75',*/ 'time50']);
        if (scope.hasRespTime) graphNames.push('tPut');
        if (scope.hasErrorRate) graphNames.push('errRate');
        if (scope.hasMemory) graphNames.push('mem');
        if (scope.hasPerformance) graphNames = graphNames.concat(['pageReady', 'pageReady95', 'pageReady50']);

        if (! graphNames.length) return;

        scope.hasGraphs = true;
        d3Service.then(d3Handler);

        function d3Handler(results) {
          var d3 = results[0]
            , Rickshaw = results[1]
            , el = element[0]
            , titles = {
              errRate : 'Error Rate (%)',
              mem : 'Memory Usage (MB)',
              time: 'Response Time (ms)',
              time95: 'p95',
              // time75: 'p75',
              time50: 'p50',
              tPut: 'Requests (/5min)',
              pageReady: 'RUM Page Ready'
            }
            , colors = {
              tPut: '#ABD9AB',
              errRate : '#D9534F',
              pageReady95: '#ABD9AB',
              pageReady50: '#ABD9AB'
            }
            , labels = {
              errRate : 'Err',
              mem : 'Mem',
              time: 'Response Time',
              time95: 'p95',
              // time75: 'p75',
              time50: 'p50',
              tPut: 'Req',
              pageReady95: 'p95',
              pageReady50: 'p50'
            }
            , suffixes = {
              errRate : '%',
              mem : 'MB',
              time: 'ms',
              time95: 'ms',
              // time75: 'ms',
              time50: 'ms',
              tPut: 'req',
              pageReady95: 'ms',
              pageReady50: 'ms'
            }
            , heights = {
              time : 200
            }
            , maxes = {
              errRate : 10,
              mem : 512,
              time : 5000,
              time95 : 5000,
              // time75 : 5000,
              time50 : 5000
            }
            , graphs = {}
            , tzOffset = new Date().getTimezoneOffset() * 60;

          if (scope.pageType === 'service') maxes.time = 1000;

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
            render(scope.history, scope.events || []);
          });


          function render(history, events) {
            if (! history) return;

            var data = {};

            history.map(function(bucket, i) {
              var selections = {
                app: bucket.app,
                upstream : bucket.meta,
                service: bucket,
                performance: bucket.meta
              };

              var app = selections[scope.pageType] || {
                time : {},
                memory : {}
              };

              var datum = {}
                , date = new Date(bucket.created_at || app.created_at || bucket.bucket_time || bucket.app_errors.created_at);

              datum.date = (date.getTime() / 1000) - tzOffset;

              if (graphNames.indexOf('tPut') !== -1) datum.tPut = app.codes && app.codes.total || 0;
              if (graphNames.indexOf('errRate') !== -1) datum.errRate = app.error_rate || 0;
              if (graphNames.indexOf('mem') !== -1) datum.mem = app.memory.avg || 0;
              if (graphNames.indexOf('time') !== -1) {
                datum.time95 = app.time.p95 || 0;
                // datum.time75 = app.time.p75 || 0;
                datum.time50 = app.time.p50 || 0;
              }
              if (graphNames.indexOf('pageReady95') !== -1) datum.pageReady95 = app.p95;
              if (graphNames.indexOf('pageReady50') !== -1) datum.pageReady50 = app.p50;

              graphNames.map(function(name) {
                if (['time', 'pageReady'].indexOf(name) !== -1) return;

                if (typeof data[name] === 'undefined') data[name] = [];
                if (typeof datum[name] === 'string') datum[name] = parseInt(datum[name], 10) || 0;

                data[name].unshift({
                  x : datum.date,
                  y : datum[name]
                });
              });

              return data;
            });

            graphNames.map(function(name) {
              if (['time95','time75','time50','pageReady95','pageReady50'].indexOf(name) !== -1) return;

              var max = maxes[name]
                , palette = new Rickshaw.Color.Palette({ scheme: 'spectrum14' })
                , $container, $el, $an, datum, yMax, graph, hoverDetail, xAxis, yAxis;

              if (graphs[name]) {
                $container = graphs[name].empty();
              } else {
                $container = graphs[name] = $('<div class="graph-container"></div>').appendTo(element[0]);
              }
              $container.append('<span class="graph-title">' + titles[name] + '</span>');
              $el = $('<div class="inner-graph"></div>').appendTo($container);
              $an = $('<div class="anootations"></div>').appendTo($container);

              if (name === 'time') {
                yMax = 0;
                ['time95',/*'time75',*/'time50'].map(function(t) {
                  var max = d3.max(data[t], function(d) { return d.y; });
                  if (max > yMax) yMax = max;
                });
              } else if (name === 'pageReady') {
                yMax = 0;
                ['pageReady95', 'pageReady50'].map(function(t) {
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
                  // {
                  //   // color: '#caf7f6',
                  //   name : labels.time75,
                  //   data: data.time75
                  // },
                  {
                    // color: '#cae2f7',
                    name : labels.time50,
                    data: data.time50
                  }
                ];

                // Reverse the colors
                // config.series[2].color = palette.color();
                palette.color(); // To skip to the slightly lighter color
                config.series[1].color = palette.color();
                config.series[0].color = palette.color();
              } else if (name === 'pageReady') {
                config.series = [
                  {
                    // color: '#caccf7',
                    name : labels.pageReady95,
                    data: data.pageReady95
                  },
                  // {
                  //   // color: '#caf7f6',
                  //   name : labels.pageReady75,
                  //   data: data.pageReady75
                  // },
                  {
                    // color: '#cae2f7',
                    name : labels.pageReady50,
                    data: data.pageReady50
                  }
                ];

                // Reverse the colors
                // config.series[2].color = palette.color();
                palette.color(); // To skip to the slightly lighter color
                config.series[1].color = palette.color();
                config.series[0].color = palette.color();
              } else {
                config.series = [{
                  // color: palette.color(),
                  color: colors[name] || '#cae2f7',
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
                    , pref = name === 'time' || name === 'pageReady' ? series.name + ': ' : '';

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
                  (event.type === 'electricCommander' && event.action === 'build') ||
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
