(function() {
  /*globals window, document, console */
  'use strict';

  window.onload = function() {
    var bucketLength = 300000; // 5 minutes

    $('#updatedTimestamp').each(function() {
      $(this).text(getUXDate($(this).data('timestamp')));
    });

    $('.refresh').on('click', function(evt) {
      evt.preventDefault();
      window.location = window.location;
    });

    $('[data-raw-time]').each(function() {
      var text = 'Status: ' + $(this).data('status') + ' @ ' + getUXDate($(this).data('rawTime'));
      $(this).attr('title', text);
    });
    $('[data-raw-time]').tooltip();



    // $('.graph').each(function() {
    //   var data, mem, graph, x, y, line;

    //   data = JSON.parse(this.dataset.memoryStatus);
    //   mem = [];

    //   for (var i=0, l=data.length; i<l; i++) {
    //     if (data[i].memory) {
    //       mem.push(parseInt(data[i].memory, 10));
    //     }
    //   }

    //   // create an SVG element inside the .graph div that fills 100% of the div
    //   graph = window.d3.select(this).append('svg:svg').attr('width', '100%').attr('height', '100%');
    //   // X scale will fit values from 0-10 within pixels 0-100
    //   x = window.d3.scale.linear().domain([0, 5]).range([0, 10]);
    //   // Y scale will fit values from 0-10 within pixels 0-100
    //   y = window.d3.scale.linear().domain([0, 10]).range([0, 10]);// create a line object that represents the SVN line we're creating

    //   // create a line object that represents the SVN line we're creating
    //   line = window.d3.svg.line()
    //     // assign the X function to plot our line as we wish
    //     .x(function(d,i) {
    //       // verbose logging to show what's actually being done
    //       // console.log('Plotting X value for data point: ' + d + ' using index: ' + i + ' to be at: ' + x(i) + ' using our xScale.');
    //       // return the X coordinate where we want to plot this datapoint
    //       return x(i);
    //     })
    //     .y(function(d) {
    //       // verbose logging to show what's actually being done
    //       // console.log('Plotting Y value for data point: ' + d + ' to be at: ' + y(d) + " using our yScale.");
    //       // return the Y coordinate where we want to plot this datapoint
    //       return y(d);
    //     });
    //   // display the line by appending an svg:path element with the memory line we created above
    //   graph.append("svg:path").attr("d", line(mem));
    // });





    function getUXDate(timestamp) {
      var date, dd, hours, minutes, seconds, utcDiff;
      if ((timestamp.toString()).length < 13) {
        // We're working with a timeBucket
        timestamp = timestamp * bucketLength;
      }

      date = new Date(timestamp * 1);
      dd = date.getDate();
      hours = date.getHours();
      minutes = date.getMinutes();
      seconds = date.getSeconds();

      function pad(unit) {
        var s = unit.toString();

        while (s.length < 2) {
          s += '0';
        }

        return s;
      }

      return '' + hours + ':' + pad(minutes) + ':' + pad(seconds) || '';
    }
  };
})();
