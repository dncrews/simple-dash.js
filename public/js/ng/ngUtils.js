(function(jQuery) {
  'use strict';

  window.$bindHistory = bindHistory;

  function bindHistory($scope) {
    var $ = jQuery
      , historyTimeout;

    $bindHistory().on('click', 'label', clickHistory);

    function makeItSo(evt) {
      window.clearTimeout(historyTimeout);
      $(evt.currentTarget).trigger('activate');
    }

    function makeItOld(evt) {
      historyTimeout = window.setTimeout(function() {
        $(evt.delegateTarget).children().eq(0).trigger('activate');
      }, 10);
    }

    function $bindHistory() {
      return $('.history_timeline')
        .on('mouseenter', 'label', makeItSo)
        .on('mouseleave', 'label', makeItOld);
    }

    function clickHistory(evt) {
      var $el = $(evt.currentTarget)
        , $current = $el;
      evt.stopPropagation();
      $(document)
        .off('keydown')
        .on('keydown', moveHistory)
        .on('click', ':not(label)', offClickHistory);
      $('.history_timeline').off('mouseenter mouseleave');
      $el.trigger('activate');

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

      function offClickHistory(evt) {
        if(evt) {
          evt.stopPropagation();
        }
        $(document).off('keydown click');
        $bindHistory();
        $current.trigger('mouseleave');
      }
    }
  }
})(window.jQuery);
