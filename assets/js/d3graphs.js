(function() {

  window.graphingthingy = Graphs;

  var d3;


  /**
   * graphs = [
   *   {
   *     name : 'mem',
   *     y : function(d) { return d.mem; }
   *   },
   *   {
   *     name : 'time',
   *     y : function(d) { return d.time; }
   *   }
   * ]
   */


  function Graphs(element, graphs) {
    d3 = window.d3;

    var $el = this.$el = d3.select(element);

    this.graphs = graphs = graphs || ['mem', 'time'];

    var margin = this.margin =  { top: 20, right: 20, bottom: 20, left: 50 }
      , delta = this.delta = 25
      , height = this.height = 100 // height for each graph
      , outerHeight = this.outerHeight = height * graphs.length + delta * (graphs.length - 1) + margin.top + margin.bottom
      , outerWidth = this.outerWidth = $el.node().offsetWidth
      , width = this.width = $el.node().offsetWidth - margin.left - margin.right;

    var $svg = $el.append('svg')
                  .attr('width', outerWidth)
                  .attr('height', outerHeight);

    this.$g = $svg.append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .attr('width', width)
                .attr('height', outerHeight - (margin.top + margin.bottom));

    this.ys = graphs.map(function(d, i) {
      var bottom = height + (height + delta) * i;

      return d3.scale.linear()
                .range([bottom, bottom - height]);
    });

    this.axes = [];

    return this;
  }

  Graphs.prototype.render = function(rawBuckets, changes) {

    if (! rawBuckets) return;

    var labels = {
      mem : 'Memory (MB)',
      time : 'Resp Time (ms)'
    };

    var exts = {
      mem : 'MB',
      time : 'ms'
    };

    var buckets = rawBuckets.map(function(bucket) {
      var app = bucket.app || {
          time : {},
          memory : {}
        };

      return {
        date : new Date(app.created_at || bucket.bucket_time),
        time : app.time.p75 || 0,
        mem : app.memory.avg || 0
      };
    });

    var changeTimes = []
      , $svg = this.$g
      , _this = this
      , margin = this.margin
      , delta = this.delta
      , height = this.height
      , outerHeight = this.outerHeight
      , outerWidth = this.outerWidth
      , width = this.width;

    $svg.selectAll('g, path').remove();

    changes.forEach(function(change) {
      if (
        (change.type === 'jenkins' && change.action === 'build') ||
        (change.type === 'marrow' && /restart/.test(change.action))
      ) {
        changeTimes.push(new Date(change.created_at));
      }
    });

    var x = d3.time.scale()
          .range([0, width])
          .domain(d3.extent(buckets, function(d) { return d.date; }));

    this.graphs.map(function(name, i) {
      var bottom = height + (height + delta) * i
        , top = bottom - height
        , ext = exts[name];

      var y = d3.scale.linear()
                .range([height, 0])
                .domain(d3.extent(buckets, function(d) { return d[name]; }));


      var xAxis = d3.svg.axis()
            .scale(x)
            .ticks(d3.time.hours, 2)
            .orient('bottom')

        , yAxis = d3.svg.axis()
            .scale(y)
            .orient('left');

      var $g = $svg.append('g')
                  .attr('class', 'graph')
                  .attr('transform', 'translate(0, ' + top + ')')
                  .attr('width', width)
                  .attr('height', height);

      $g.append('g')
          .attr('class', 'x axis')
          // Drop the x-axis to the bottom
          .attr('transform', 'translate(0, ' + height + ')')
          .call(xAxis);

      $g.append('g')
          .attr('class', 'y axis ' + name)
          .call(yAxis)
        .append('text')
          .attr('transform', 'rotate(-90)')
          .attr('y', 6)
          .attr('dy', '.71em')
          .style('text-anchor', 'end')
          .text(labels[name]);

      var line = d3.svg.line()
            .x(function(d) { return x(d.date); })
            .y(function(d) { return y(d[name]); });

      $g.append('path')
          .datum(buckets)
          .attr('class', 'line ' + name)
          .attr('d', line);

      // $g.selectAll('.marker')
      //     .data(buckets)
      //   .enter().append('rect')
      //     .attr('class', 'marker')
      //     .attr('x', function(d) { return x(d.date); })
      //     .attr('width', '1')
      //     .attr('height', d3.max(buckets, function(d) { return y(d[name]); }))
      //     .on('mouseover', function(d, i) {
      //       console.log(buckets[i]);
      //     });
    });

    var changeAxis = d3.svg.axis()
          .scale(x)
          .orient('top')
          .tickValues(changeTimes)
          .tickSize(outerHeight)
          .tickFormat(function(d) { return '@ ' + d3.time.format('%X')(d); });

    $svg.append('g')
        .attr('class', 'x axis change')
        .attr('transform', 'translate(0, ' + outerHeight + ')')
        .call(changeAxis)
          .selectAll('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0)
            .attr('x', height + margin.top - 45);

    // $svg.on('mousemove', function() {
    //   console.log(arguments);
    // });

  };

})();
