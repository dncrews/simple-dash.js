$(document).ready(function() {
  /*globals window, document, console */
  'use strict';

  var bucketLength = 300000 // 5 minutes
    , $now = $('.history_timeline .label').eq(0)
    , current_stats = $now.data('stats')
    , historyTimeout;

  // $('[title]').tooltip();



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



  /**
   * When you hover over a history timeline block on
   * the history page, the stats of that block show up
   */

  //add event listeners for historyStats
  $bindHistory().on('click', 'label', clickHistory); //FIXME: if click, freeze it better

  function displayStats(stats) {
    var $errorBucket = $()
      , key, k, _rel, $item;

    // Set all of the values
    for (key in stats) {
      $('[data-target=' + key).html(stats[key]);
    }
    setStatusClasses(stats.uptime_status);

    //update heroku errors from history (since it's array, some parsing is needed).
    for(k=0; k < stats.heroku_errors.length; k++ ) {
      _rel = stats.heroku_errors[k];
      $item = $('<span class="item"></span>'); // FIXME: this is filthy!  - HTML should NOT be in here

      $item
        .attr('title', _rel.code + ':' + _rel.desc)
        .html(_rel.code + ': ' + _rel.count);
      $errorBucket = $errorBucket.add($item);
    }
    $('#heroku_errors').empty().append($errorBucket);
  }

  function showHistoryStats(evt) {
    window.clearTimeout(historyTimeout);
    var $el = $(evt.currentTarget);

    $el.addClass("active"); //hover indicator
    displayStats($el.data('stats'));
  }

  function restoreCurrentStats(evt) {
    var $el = $(evt.currentTarget);

    $el.removeClass("active");
    historyTimeout = window.setTimeout(function() {
      displayStats($('.history_timeline .label').eq(0).data('stats'));
    }, 10);
  }

  function setStatusClasses() {
    var status_classes = {
        "good": "success",
        "slow": "warning",
        "down": "danger"
      }
      , glyph_classes = {
        "good": "ok",
        "slow": "warning",
        "down": "minus"
      }
      , status = $("#stats_uptime").html();

    // Remove old status coloring and reset
    $("#status_current_cont")
      .removeClass("success warning danger")
      .addClass( status_classes[status] );
    // Remove old status icon and reset
    $("#status_current_cont .glyphicon")
      .removeClass("success warning danger glyphicon-ok-sign glyphicon-warning-sign glyphicon-minus-sign") //class names warning, true, false...
      .addClass( "glyphicon-" + glyph_classes[status] + "-sign" ); //change the icon
  }

  function $bindHistory() {
    return $('.history_timeline')
      .on('mouseenter', 'label', showHistoryStats)
      .on('mouseleave', 'label', restoreCurrentStats);
  }

  function clickHistory(evt) {
    var $el = $(evt.currentTarget)
      , $current = $el;
    evt.stopPropagation();
    $(document)
      .off('keydown')
      .on('keydown', moveHistory)
      .on('click', ':not(label)', offClickHistory);
    $('.history_timeline')
      .off('mouseenter', 'label', showHistoryStats)
      .off('mouseleave', 'label', restoreCurrentStats)
      .children('label').removeClass('active');
    $el.addClass('active');
    displayStats($el.data('stats'));

    function moveHistory(evt) {
      switch(evt.which) {
      case 37: // left
      case 38: // up
        if (!!$current.prev().length) {
          $current.prev().trigger('click');
        }
        break;
      case 39: // right
      case 40: // down
        if (!!$current.next().length) {
          $current.next().trigger('click');
        }
        break;
      case 32: // space
      case 13: // enter
      case 27: // escape
        offClickHistory();
        break;
      }
    }

    function offClickHistory() {
      $(document).off('keydown');
      $bindHistory();
      $current.trigger('mouseleave');
    }
  }


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
});
