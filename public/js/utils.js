/*globals window, document, console */
'use strict';

window.onload = function() {
  var bucketLength, tsDiv, stamp;
  bucketLength = 300000; // 5 minutes

  tsDiv = document.getElementById('updatedTimestamp');
  if (tsDiv) {
    tsDiv.innerHTML = getUXDate(tsDiv.getAttribute('data-stamp') * 1);
  }

  function getUXDate(timestamp) {
    var date, dd, hours, minutes, seconds, utcDiff;
    if ((timestamp.toString()).length < 13) {
      // We're working with a timeBucket
      timestamp = timestamp * bucketLength;
    }

    date = new Date(timestamp * 1);
    console.log(date);
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
