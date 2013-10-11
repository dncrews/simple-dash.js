(function() {
  /*globals window, document, console */
  'use strict';

  window.onload = function() {
    var bucketLength = 300000; // 5 minutes

    $('.refresh').on('click', function(evt) {
      evt.preventDefault();
      window.location = window.location;
    });

    $('[data-raw-time]').each(function() {
      //FIXME: This should really be generated from the markup
      var text = 'Status: ' + $(this).data('status') + ' @ ' + getUXDate($(this).data('rawTime'))
      + " | Mem: " + $(this).data('memory') + "MB | " + "P95: " + $(this).data('p95') + "ms | Err: " + $(this).data('error-rate') + "% | "
      + $(this).data('heroku-errors').toString();
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



    //when you hover over a history timeline block on the history page, the stats of that block show up
    function showHistoryStats() {

    }

    var current_stats = false; //yes, I know this is dirty
    var status_classes = {
        "good": "success",
        "slow": "warning",
        "down": "danger"
      };
    //FIXME: we need a central repo for this...
    var glyph_classes = {
      "good": "ok",
      "slow": "warning",
      "down": "minus"
    };

    //only needs to happen once
    function storeCurrentStats() {
      //take the innerhtml, and store it as a data attribute
      $("#stats_uptime, #stats_req, #stats_p95, #stats_error_rate, #stats_2xx, #stats_3xx, #stats_4xx, #stats_5xx, #stats_total, #stats_last_updated, #stats_time_elapsed").each(function(el) {
        $(this).data('current', $(this).html());
        // console.log($(this).data('current'));
      });

      current_stats = true;
    }


    //add event listeners for historyStats
    $(".history_timeline label").hover(function(e) {
      $(this).addClass("active"); //hover indicator

      //on first time, store initial stats (TODO: move this to page load?)
      if (!current_stats) storeCurrentStats();

      //get the history bucket values
      $("#stats_uptime").html($(this).data('status'));
      $("#status_current_cont").removeClass("success warning danger"); //class names warning, true, false...
      $("#status_current_cont .glyphicon").removeClass("success warning danger glyphicon-ok-sign glyphicon-warning-sign glyphicon-minus-sign"); //class names warning, true, false...


      //apply the appropriate class name to alter the color
      var status_className = $(this).data('status');
      $("#status_current_cont").addClass( status_classes[status_className] );
      $("#status_current_cont .glyphicon").addClass( "glyphicon-" + glyph_classes[status_className] + "-sign" ); //change the icon


      $("#stats_req").html($(this).data('status-total'));
      $("#stats_p95").html($(this).data('p95'));
      $("#stats_error_rate").html($(this).data('error-rate'));

      $("#stats_2xx").html($(this).data('status-c2xx'));
      $("#stats_3xx").html($(this).data('status-c3xx'));
      $("#stats_4xx").html($(this).data('status-c4xx'));
      $("#stats_5xx").html($(this).data('status-c5xx'));

      //update time data
      $("#stats_last_updated").html($(this).data('time'));
      $("#stats_time_elapsed").html($(this).data('time-elapsed'));



      //apply in main health fields

      //


    }, function() {
      $(this).removeClass("active");
      //restore the bucket values for current bucket
      $("#stats_uptime, #stats_req, #stats_p95, #stats_error_rate, #stats_2xx, #stats_3xx, #stats_4xx, #stats_5xx, #stats_total, #stats_last_updated, #stats_time_elapsed").each(function(el) {
        $(this).html($(this).data('current'));
        // console.log($(this).data('current'));
      });

      //FIXME: Extract this and make it cleaner...
      //apply the appropriate class name to alter the color
      $("#status_current_cont").removeClass("success warning danger"); //class names warning, true, false...
      $("#status_current_cont .glyphicon").removeClass("success warning danger glyphicon-ok-sign glyphicon-warning-sign glyphicon-minus-sign"); //class names warning, true, false...

      //apply the appropriate class name to alter the color
      var status_className = $("#stats_uptime").html();
      $("#status_current_cont").addClass( status_classes[status_className] );
      $("#status_current_cont .glyphicon").addClass( "glyphicon-" + glyph_classes[status_className] + "-sign" );

    });


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
