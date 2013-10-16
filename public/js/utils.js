$(document).ready(function() {

  /*globals window, document, console */
  'use strict';

  $('.refresh').on('click', function(evt) {
    evt.preventDefault();
    window.location = window.location;
  });

});
