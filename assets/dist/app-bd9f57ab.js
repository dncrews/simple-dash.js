/**
* bootstrap.js v3.0.0 by @fat and @mdo
* Copyright 2013 Twitter Inc.
* http://www.apache.org/licenses/LICENSE-2.0
*/
if (!jQuery) {
  throw new Error('Bootstrap requires jQuery');
}
/* ========================================================================
 * Bootstrap: transition.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#transitions
 * ========================================================================
 * Copyright 2013 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */
+function ($) {
  'use strict';
  // CSS TRANSITION SUPPORT (Shoutout: http://www.modernizr.com/)
  // ============================================================
  function transitionEnd() {
    var el = document.createElement('bootstrap');
    var transEndEventNames = {
        'WebkitTransition': 'webkitTransitionEnd',
        'MozTransition': 'transitionend',
        'OTransition': 'oTransitionEnd otransitionend',
        'transition': 'transitionend'
      };
    for (var name in transEndEventNames) {
      if (el.style[name] !== undefined) {
        return { end: transEndEventNames[name] };
      }
    }
  }
  // http://blog.alexmaccaw.com/css-transitions
  $.fn.emulateTransitionEnd = function (duration) {
    var called = false, $el = this;
    $(this).one($.support.transition.end, function () {
      called = true;
    });
    var callback = function () {
      if (!called)
        $($el).trigger($.support.transition.end);
    };
    setTimeout(callback, duration);
    return this;
  };
  $(function () {
    $.support.transition = transitionEnd();
  });
}(window.jQuery);
/* ========================================================================
 * Bootstrap: alert.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#alerts
 * ========================================================================
 * Copyright 2013 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */
+function ($) {
  'use strict';
  // ALERT CLASS DEFINITION
  // ======================
  var dismiss = '[data-dismiss="alert"]';
  var Alert = function (el) {
    $(el).on('click', dismiss, this.close);
  };
  Alert.prototype.close = function (e) {
    var $this = $(this);
    var selector = $this.attr('data-target');
    if (!selector) {
      selector = $this.attr('href');
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '');
    }
    var $parent = $(selector);
    if (e)
      e.preventDefault();
    if (!$parent.length) {
      $parent = $this.hasClass('alert') ? $this : $this.parent();
    }
    $parent.trigger(e = $.Event('close.bs.alert'));
    if (e.isDefaultPrevented())
      return;
    $parent.removeClass('in');
    function removeElement() {
      $parent.trigger('closed.bs.alert').remove();
    }
    $.support.transition && $parent.hasClass('fade') ? $parent.one($.support.transition.end, removeElement).emulateTransitionEnd(150) : removeElement();
  };
  // ALERT PLUGIN DEFINITION
  // =======================
  var old = $.fn.alert;
  $.fn.alert = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.alert');
      if (!data)
        $this.data('bs.alert', data = new Alert(this));
      if (typeof option == 'string')
        data[option].call($this);
    });
  };
  $.fn.alert.Constructor = Alert;
  // ALERT NO CONFLICT
  // =================
  $.fn.alert.noConflict = function () {
    $.fn.alert = old;
    return this;
  };
  // ALERT DATA-API
  // ==============
  $(document).on('click.bs.alert.data-api', dismiss, Alert.prototype.close);
}(window.jQuery);
/* ========================================================================
 * Bootstrap: button.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#buttons
 * ========================================================================
 * Copyright 2013 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */
+function ($) {
  'use strict';
  // BUTTON PUBLIC CLASS DEFINITION
  // ==============================
  var Button = function (element, options) {
    this.$element = $(element);
    this.options = $.extend({}, Button.DEFAULTS, options);
  };
  Button.DEFAULTS = { loadingText: 'loading...' };
  Button.prototype.setState = function (state) {
    var d = 'disabled';
    var $el = this.$element;
    var val = $el.is('input') ? 'val' : 'html';
    var data = $el.data();
    state = state + 'Text';
    if (!data.resetText)
      $el.data('resetText', $el[val]());
    $el[val](data[state] || this.options[state]);
    // push to event loop to allow forms to submit
    setTimeout(function () {
      state == 'loadingText' ? $el.addClass(d).attr(d, d) : $el.removeClass(d).removeAttr(d);
    }, 0);
  };
  Button.prototype.toggle = function () {
    var $parent = this.$element.closest('[data-toggle="buttons"]');
    if ($parent.length) {
      var $input = this.$element.find('input').prop('checked', !this.$element.hasClass('active')).trigger('change');
      if ($input.prop('type') === 'radio')
        $parent.find('.active').removeClass('active');
    }
    this.$element.toggleClass('active');
  };
  // BUTTON PLUGIN DEFINITION
  // ========================
  var old = $.fn.button;
  $.fn.button = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.button');
      var options = typeof option == 'object' && option;
      if (!data)
        $this.data('bs.button', data = new Button(this, options));
      if (option == 'toggle')
        data.toggle();
      else if (option)
        data.setState(option);
    });
  };
  $.fn.button.Constructor = Button;
  // BUTTON NO CONFLICT
  // ==================
  $.fn.button.noConflict = function () {
    $.fn.button = old;
    return this;
  };
  // BUTTON DATA-API
  // ===============
  $(document).on('click.bs.button.data-api', '[data-toggle^=button]', function (e) {
    var $btn = $(e.target);
    if (!$btn.hasClass('btn'))
      $btn = $btn.closest('.btn');
    $btn.button('toggle');
    e.preventDefault();
  });
}(window.jQuery);
/* ========================================================================
 * Bootstrap: carousel.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#carousel
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */
+function ($) {
  'use strict';
  // CAROUSEL CLASS DEFINITION
  // =========================
  var Carousel = function (element, options) {
    this.$element = $(element);
    this.$indicators = this.$element.find('.carousel-indicators');
    this.options = options;
    this.paused = this.sliding = this.interval = this.$active = this.$items = null;
    this.options.pause == 'hover' && this.$element.on('mouseenter', $.proxy(this.pause, this)).on('mouseleave', $.proxy(this.cycle, this));
  };
  Carousel.DEFAULTS = {
    interval: 5000,
    pause: 'hover',
    wrap: true
  };
  Carousel.prototype.cycle = function (e) {
    e || (this.paused = false);
    this.interval && clearInterval(this.interval);
    this.options.interval && !this.paused && (this.interval = setInterval($.proxy(this.next, this), this.options.interval));
    return this;
  };
  Carousel.prototype.getActiveIndex = function () {
    this.$active = this.$element.find('.item.active');
    this.$items = this.$active.parent().children();
    return this.$items.index(this.$active);
  };
  Carousel.prototype.to = function (pos) {
    var that = this;
    var activeIndex = this.getActiveIndex();
    if (pos > this.$items.length - 1 || pos < 0)
      return;
    if (this.sliding)
      return this.$element.one('slid', function () {
        that.to(pos);
      });
    if (activeIndex == pos)
      return this.pause().cycle();
    return this.slide(pos > activeIndex ? 'next' : 'prev', $(this.$items[pos]));
  };
  Carousel.prototype.pause = function (e) {
    e || (this.paused = true);
    if (this.$element.find('.next, .prev').length && $.support.transition.end) {
      this.$element.trigger($.support.transition.end);
      this.cycle(true);
    }
    this.interval = clearInterval(this.interval);
    return this;
  };
  Carousel.prototype.next = function () {
    if (this.sliding)
      return;
    return this.slide('next');
  };
  Carousel.prototype.prev = function () {
    if (this.sliding)
      return;
    return this.slide('prev');
  };
  Carousel.prototype.slide = function (type, next) {
    var $active = this.$element.find('.item.active');
    var $next = next || $active[type]();
    var isCycling = this.interval;
    var direction = type == 'next' ? 'left' : 'right';
    var fallback = type == 'next' ? 'first' : 'last';
    var that = this;
    if (!$next.length) {
      if (!this.options.wrap)
        return;
      $next = this.$element.find('.item')[fallback]();
    }
    this.sliding = true;
    isCycling && this.pause();
    var e = $.Event('slide.bs.carousel', {
        relatedTarget: $next[0],
        direction: direction
      });
    if ($next.hasClass('active'))
      return;
    if (this.$indicators.length) {
      this.$indicators.find('.active').removeClass('active');
      this.$element.one('slid', function () {
        var $nextIndicator = $(that.$indicators.children()[that.getActiveIndex()]);
        $nextIndicator && $nextIndicator.addClass('active');
      });
    }
    if ($.support.transition && this.$element.hasClass('slide')) {
      this.$element.trigger(e);
      if (e.isDefaultPrevented())
        return;
      $next.addClass(type);
      $next[0].offsetWidth;
      // force reflow
      $active.addClass(direction);
      $next.addClass(direction);
      $active.one($.support.transition.end, function () {
        $next.removeClass([
          type,
          direction
        ].join(' ')).addClass('active');
        $active.removeClass([
          'active',
          direction
        ].join(' '));
        that.sliding = false;
        setTimeout(function () {
          that.$element.trigger('slid');
        }, 0);
      }).emulateTransitionEnd(600);
    } else {
      this.$element.trigger(e);
      if (e.isDefaultPrevented())
        return;
      $active.removeClass('active');
      $next.addClass('active');
      this.sliding = false;
      this.$element.trigger('slid');
    }
    isCycling && this.cycle();
    return this;
  };
  // CAROUSEL PLUGIN DEFINITION
  // ==========================
  var old = $.fn.carousel;
  $.fn.carousel = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.carousel');
      var options = $.extend({}, Carousel.DEFAULTS, $this.data(), typeof option == 'object' && option);
      var action = typeof option == 'string' ? option : options.slide;
      if (!data)
        $this.data('bs.carousel', data = new Carousel(this, options));
      if (typeof option == 'number')
        data.to(option);
      else if (action)
        data[action]();
      else if (options.interval)
        data.pause().cycle();
    });
  };
  $.fn.carousel.Constructor = Carousel;
  // CAROUSEL NO CONFLICT
  // ====================
  $.fn.carousel.noConflict = function () {
    $.fn.carousel = old;
    return this;
  };
  // CAROUSEL DATA-API
  // =================
  $(document).on('click.bs.carousel.data-api', '[data-slide], [data-slide-to]', function (e) {
    var $this = $(this), href;
    var $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, ''));
    //strip for ie7
    var options = $.extend({}, $target.data(), $this.data());
    var slideIndex = $this.attr('data-slide-to');
    if (slideIndex)
      options.interval = false;
    $target.carousel(options);
    if (slideIndex = $this.attr('data-slide-to')) {
      $target.data('bs.carousel').to(slideIndex);
    }
    e.preventDefault();
  });
  $(window).on('load', function () {
    $('[data-ride="carousel"]').each(function () {
      var $carousel = $(this);
      $carousel.carousel($carousel.data());
    });
  });
}(window.jQuery);
/* ========================================================================
 * Bootstrap: collapse.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#collapse
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */
+function ($) {
  'use strict';
  // COLLAPSE PUBLIC CLASS DEFINITION
  // ================================
  var Collapse = function (element, options) {
    this.$element = $(element);
    this.options = $.extend({}, Collapse.DEFAULTS, options);
    this.transitioning = null;
    if (this.options.parent)
      this.$parent = $(this.options.parent);
    if (this.options.toggle)
      this.toggle();
  };
  Collapse.DEFAULTS = { toggle: true };
  Collapse.prototype.dimension = function () {
    var hasWidth = this.$element.hasClass('width');
    return hasWidth ? 'width' : 'height';
  };
  Collapse.prototype.show = function () {
    if (this.transitioning || this.$element.hasClass('in'))
      return;
    var startEvent = $.Event('show.bs.collapse');
    this.$element.trigger(startEvent);
    if (startEvent.isDefaultPrevented())
      return;
    var actives = this.$parent && this.$parent.find('> .panel > .in');
    if (actives && actives.length) {
      var hasData = actives.data('bs.collapse');
      if (hasData && hasData.transitioning)
        return;
      actives.collapse('hide');
      hasData || actives.data('bs.collapse', null);
    }
    var dimension = this.dimension();
    this.$element.removeClass('collapse').addClass('collapsing')[dimension](0);
    this.transitioning = 1;
    var complete = function () {
      this.$element.removeClass('collapsing').addClass('in')[dimension]('auto');
      this.transitioning = 0;
      this.$element.trigger('shown.bs.collapse');
    };
    if (!$.support.transition)
      return complete.call(this);
    var scrollSize = $.camelCase([
        'scroll',
        dimension
      ].join('-'));
    this.$element.one($.support.transition.end, $.proxy(complete, this)).emulateTransitionEnd(350)[dimension](this.$element[0][scrollSize]);
  };
  Collapse.prototype.hide = function () {
    if (this.transitioning || !this.$element.hasClass('in'))
      return;
    var startEvent = $.Event('hide.bs.collapse');
    this.$element.trigger(startEvent);
    if (startEvent.isDefaultPrevented())
      return;
    var dimension = this.dimension();
    this.$element[dimension](this.$element[dimension]())[0].offsetHeight;
    this.$element.addClass('collapsing').removeClass('collapse').removeClass('in');
    this.transitioning = 1;
    var complete = function () {
      this.transitioning = 0;
      this.$element.trigger('hidden.bs.collapse').removeClass('collapsing').addClass('collapse');
    };
    if (!$.support.transition)
      return complete.call(this);
    this.$element[dimension](0).one($.support.transition.end, $.proxy(complete, this)).emulateTransitionEnd(350);
  };
  Collapse.prototype.toggle = function () {
    this[this.$element.hasClass('in') ? 'hide' : 'show']();
  };
  // COLLAPSE PLUGIN DEFINITION
  // ==========================
  var old = $.fn.collapse;
  $.fn.collapse = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.collapse');
      var options = $.extend({}, Collapse.DEFAULTS, $this.data(), typeof option == 'object' && option);
      if (!data)
        $this.data('bs.collapse', data = new Collapse(this, options));
      if (typeof option == 'string')
        data[option]();
    });
  };
  $.fn.collapse.Constructor = Collapse;
  // COLLAPSE NO CONFLICT
  // ====================
  $.fn.collapse.noConflict = function () {
    $.fn.collapse = old;
    return this;
  };
  // COLLAPSE DATA-API
  // =================
  $(document).on('click.bs.collapse.data-api', '[data-toggle=collapse]', function (e) {
    var $this = $(this), href;
    var target = $this.attr('data-target') || e.preventDefault() || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '');
    //strip for ie7
    var $target = $(target);
    var data = $target.data('bs.collapse');
    var option = data ? 'toggle' : $this.data();
    var parent = $this.attr('data-parent');
    var $parent = parent && $(parent);
    if (!data || !data.transitioning) {
      if ($parent)
        $parent.find('[data-toggle=collapse][data-parent="' + parent + '"]').not($this).addClass('collapsed');
      $this[$target.hasClass('in') ? 'addClass' : 'removeClass']('collapsed');
    }
    $target.collapse(option);
  });
}(window.jQuery);
/* ========================================================================
 * Bootstrap: dropdown.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#dropdowns
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */
+function ($) {
  'use strict';
  // DROPDOWN CLASS DEFINITION
  // =========================
  var backdrop = '.dropdown-backdrop';
  var toggle = '[data-toggle=dropdown]';
  var Dropdown = function (element) {
    var $el = $(element).on('click.bs.dropdown', this.toggle);
  };
  Dropdown.prototype.toggle = function (e) {
    var $this = $(this);
    if ($this.is('.disabled, :disabled'))
      return;
    var $parent = getParent($this);
    var isActive = $parent.hasClass('open');
    clearMenus();
    if (!isActive) {
      if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
        // if mobile we we use a backdrop because click events don't delegate
        $('<div class="dropdown-backdrop"/>').insertAfter($(this)).on('click', clearMenus);
      }
      $parent.trigger(e = $.Event('show.bs.dropdown'));
      if (e.isDefaultPrevented())
        return;
      $parent.toggleClass('open').trigger('shown.bs.dropdown');
      $this.focus();
    }
    return false;
  };
  Dropdown.prototype.keydown = function (e) {
    if (!/(38|40|27)/.test(e.keyCode))
      return;
    var $this = $(this);
    e.preventDefault();
    e.stopPropagation();
    if ($this.is('.disabled, :disabled'))
      return;
    var $parent = getParent($this);
    var isActive = $parent.hasClass('open');
    if (!isActive || isActive && e.keyCode == 27) {
      if (e.which == 27)
        $parent.find(toggle).focus();
      return $this.click();
    }
    var $items = $('[role=menu] li:not(.divider):visible a', $parent);
    if (!$items.length)
      return;
    var index = $items.index($items.filter(':focus'));
    if (e.keyCode == 38 && index > 0)
      index--;
    // up
    if (e.keyCode == 40 && index < $items.length - 1)
      index++;
    // down
    if (!~index)
      index = 0;
    $items.eq(index).focus();
  };
  function clearMenus() {
    $(backdrop).remove();
    $(toggle).each(function (e) {
      var $parent = getParent($(this));
      if (!$parent.hasClass('open'))
        return;
      $parent.trigger(e = $.Event('hide.bs.dropdown'));
      if (e.isDefaultPrevented())
        return;
      $parent.removeClass('open').trigger('hidden.bs.dropdown');
    });
  }
  function getParent($this) {
    var selector = $this.attr('data-target');
    if (!selector) {
      selector = $this.attr('href');
      selector = selector && /#/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '');
    }
    var $parent = selector && $(selector);
    return $parent && $parent.length ? $parent : $this.parent();
  }
  // DROPDOWN PLUGIN DEFINITION
  // ==========================
  var old = $.fn.dropdown;
  $.fn.dropdown = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('dropdown');
      if (!data)
        $this.data('dropdown', data = new Dropdown(this));
      if (typeof option == 'string')
        data[option].call($this);
    });
  };
  $.fn.dropdown.Constructor = Dropdown;
  // DROPDOWN NO CONFLICT
  // ====================
  $.fn.dropdown.noConflict = function () {
    $.fn.dropdown = old;
    return this;
  };
  // APPLY TO STANDARD DROPDOWN ELEMENTS
  // ===================================
  $(document).on('click.bs.dropdown.data-api', clearMenus).on('click.bs.dropdown.data-api', '.dropdown form', function (e) {
    e.stopPropagation();
  }).on('click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle).on('keydown.bs.dropdown.data-api', toggle + ', [role=menu]', Dropdown.prototype.keydown);
}(window.jQuery);
/* ========================================================================
 * Bootstrap: modal.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#modals
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */
+function ($) {
  'use strict';
  // MODAL CLASS DEFINITION
  // ======================
  var Modal = function (element, options) {
    this.options = options;
    this.$element = $(element);
    this.$backdrop = this.isShown = null;
    if (this.options.remote)
      this.$element.load(this.options.remote);
  };
  Modal.DEFAULTS = {
    backdrop: true,
    keyboard: true,
    show: true
  };
  Modal.prototype.toggle = function (_relatedTarget) {
    return this[!this.isShown ? 'show' : 'hide'](_relatedTarget);
  };
  Modal.prototype.show = function (_relatedTarget) {
    var that = this;
    var e = $.Event('show.bs.modal', { relatedTarget: _relatedTarget });
    this.$element.trigger(e);
    if (this.isShown || e.isDefaultPrevented())
      return;
    this.isShown = true;
    this.escape();
    this.$element.on('click.dismiss.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this));
    this.backdrop(function () {
      var transition = $.support.transition && that.$element.hasClass('fade');
      if (!that.$element.parent().length) {
        that.$element.appendTo(document.body);
      }
      that.$element.show();
      if (transition) {
        that.$element[0].offsetWidth;
      }
      that.$element.addClass('in').attr('aria-hidden', false);
      that.enforceFocus();
      var e = $.Event('shown.bs.modal', { relatedTarget: _relatedTarget });
      transition ? that.$element.find('.modal-dialog').one($.support.transition.end, function () {
        that.$element.focus().trigger(e);
      }).emulateTransitionEnd(300) : that.$element.focus().trigger(e);
    });
  };
  Modal.prototype.hide = function (e) {
    if (e)
      e.preventDefault();
    e = $.Event('hide.bs.modal');
    this.$element.trigger(e);
    if (!this.isShown || e.isDefaultPrevented())
      return;
    this.isShown = false;
    this.escape();
    $(document).off('focusin.bs.modal');
    this.$element.removeClass('in').attr('aria-hidden', true).off('click.dismiss.modal');
    $.support.transition && this.$element.hasClass('fade') ? this.$element.one($.support.transition.end, $.proxy(this.hideModal, this)).emulateTransitionEnd(300) : this.hideModal();
  };
  Modal.prototype.enforceFocus = function () {
    $(document).off('focusin.bs.modal').on('focusin.bs.modal', $.proxy(function (e) {
      if (this.$element[0] !== e.target && !this.$element.has(e.target).length) {
        this.$element.focus();
      }
    }, this));
  };
  Modal.prototype.escape = function () {
    if (this.isShown && this.options.keyboard) {
      this.$element.on('keyup.dismiss.bs.modal', $.proxy(function (e) {
        e.which == 27 && this.hide();
      }, this));
    } else if (!this.isShown) {
      this.$element.off('keyup.dismiss.bs.modal');
    }
  };
  Modal.prototype.hideModal = function () {
    var that = this;
    this.$element.hide();
    this.backdrop(function () {
      that.removeBackdrop();
      that.$element.trigger('hidden.bs.modal');
    });
  };
  Modal.prototype.removeBackdrop = function () {
    this.$backdrop && this.$backdrop.remove();
    this.$backdrop = null;
  };
  Modal.prototype.backdrop = function (callback) {
    var that = this;
    var animate = this.$element.hasClass('fade') ? 'fade' : '';
    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate;
      this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />').appendTo(document.body);
      this.$element.on('click.dismiss.modal', $.proxy(function (e) {
        if (e.target !== e.currentTarget)
          return;
        this.options.backdrop == 'static' ? this.$element[0].focus.call(this.$element[0]) : this.hide.call(this);
      }, this));
      if (doAnimate)
        this.$backdrop[0].offsetWidth;
      // force reflow
      this.$backdrop.addClass('in');
      if (!callback)
        return;
      doAnimate ? this.$backdrop.one($.support.transition.end, callback).emulateTransitionEnd(150) : callback();
    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in');
      $.support.transition && this.$element.hasClass('fade') ? this.$backdrop.one($.support.transition.end, callback).emulateTransitionEnd(150) : callback();
    } else if (callback) {
      callback();
    }
  };
  // MODAL PLUGIN DEFINITION
  // =======================
  var old = $.fn.modal;
  $.fn.modal = function (option, _relatedTarget) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.modal');
      var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option);
      if (!data)
        $this.data('bs.modal', data = new Modal(this, options));
      if (typeof option == 'string')
        data[option](_relatedTarget);
      else if (options.show)
        data.show(_relatedTarget);
    });
  };
  $.fn.modal.Constructor = Modal;
  // MODAL NO CONFLICT
  // =================
  $.fn.modal.noConflict = function () {
    $.fn.modal = old;
    return this;
  };
  // MODAL DATA-API
  // ==============
  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this = $(this);
    var href = $this.attr('href');
    var $target = $($this.attr('data-target') || href && href.replace(/.*(?=#[^\s]+$)/, ''));
    //strip for ie7
    var option = $target.data('modal') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href }, $target.data(), $this.data());
    e.preventDefault();
    $target.modal(option, this).one('hide', function () {
      $this.is(':visible') && $this.focus();
    });
  });
  $(document).on('show.bs.modal', '.modal', function () {
    $(document.body).addClass('modal-open');
  }).on('hidden.bs.modal', '.modal', function () {
    $(document.body).removeClass('modal-open');
  });
}(window.jQuery);
/* ========================================================================
 * Bootstrap: tooltip.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#tooltip
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */
+function ($) {
  'use strict';
  // TOOLTIP PUBLIC CLASS DEFINITION
  // ===============================
  var Tooltip = function (element, options) {
    this.type = this.options = this.enabled = this.timeout = this.hoverState = this.$element = null;
    this.init('tooltip', element, options);
  };
  Tooltip.DEFAULTS = {
    animation: true,
    placement: 'top',
    selector: false,
    template: '<div class="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    container: false
  };
  Tooltip.prototype.init = function (type, element, options) {
    this.enabled = true;
    this.type = type;
    this.$element = $(element);
    this.options = this.getOptions(options);
    var triggers = this.options.trigger.split(' ');
    for (var i = triggers.length; i--;) {
      var trigger = triggers[i];
      if (trigger == 'click') {
        this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this));
      } else if (trigger != 'manual') {
        var eventIn = trigger == 'hover' ? 'mouseenter' : 'focus';
        var eventOut = trigger == 'hover' ? 'mouseleave' : 'blur';
        this.$element.on(eventIn + '.' + this.type, this.options.selector, $.proxy(this.enter, this));
        this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this));
      }
    }
    this.options.selector ? this._options = $.extend({}, this.options, {
      trigger: 'manual',
      selector: ''
    }) : this.fixTitle();
  };
  Tooltip.prototype.getDefaults = function () {
    return Tooltip.DEFAULTS;
  };
  Tooltip.prototype.getOptions = function (options) {
    options = $.extend({}, this.getDefaults(), this.$element.data(), options);
    if (options.delay && typeof options.delay == 'number') {
      options.delay = {
        show: options.delay,
        hide: options.delay
      };
    }
    return options;
  };
  Tooltip.prototype.getDelegateOptions = function () {
    var options = {};
    var defaults = this.getDefaults();
    this._options && $.each(this._options, function (key, value) {
      if (defaults[key] != value)
        options[key] = value;
    });
    return options;
  };
  Tooltip.prototype.enter = function (obj) {
    var self = obj instanceof this.constructor ? obj : $(obj.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type);
    clearTimeout(self.timeout);
    self.hoverState = 'in';
    if (!self.options.delay || !self.options.delay.show)
      return self.show();
    self.timeout = setTimeout(function () {
      if (self.hoverState == 'in')
        self.show();
    }, self.options.delay.show);
  };
  Tooltip.prototype.leave = function (obj) {
    var self = obj instanceof this.constructor ? obj : $(obj.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type);
    clearTimeout(self.timeout);
    self.hoverState = 'out';
    if (!self.options.delay || !self.options.delay.hide)
      return self.hide();
    self.timeout = setTimeout(function () {
      if (self.hoverState == 'out')
        self.hide();
    }, self.options.delay.hide);
  };
  Tooltip.prototype.show = function () {
    var e = $.Event('show.bs.' + this.type);
    if (this.hasContent() && this.enabled) {
      this.$element.trigger(e);
      if (e.isDefaultPrevented())
        return;
      var $tip = this.tip();
      this.setContent();
      if (this.options.animation)
        $tip.addClass('fade');
      var placement = typeof this.options.placement == 'function' ? this.options.placement.call(this, $tip[0], this.$element[0]) : this.options.placement;
      var autoToken = /\s?auto?\s?/i;
      var autoPlace = autoToken.test(placement);
      if (autoPlace)
        placement = placement.replace(autoToken, '') || 'top';
      $tip.detach().css({
        top: 0,
        left: 0,
        display: 'block'
      }).addClass(placement);
      this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element);
      var pos = this.getPosition();
      var actualWidth = $tip[0].offsetWidth;
      var actualHeight = $tip[0].offsetHeight;
      if (autoPlace) {
        var $parent = this.$element.parent();
        var orgPlacement = placement;
        var docScroll = document.documentElement.scrollTop || document.body.scrollTop;
        var parentWidth = this.options.container == 'body' ? window.innerWidth : $parent.outerWidth();
        var parentHeight = this.options.container == 'body' ? window.innerHeight : $parent.outerHeight();
        var parentLeft = this.options.container == 'body' ? 0 : $parent.offset().left;
        placement = placement == 'bottom' && pos.top + pos.height + actualHeight - docScroll > parentHeight ? 'top' : placement == 'top' && pos.top - docScroll - actualHeight < 0 ? 'bottom' : placement == 'right' && pos.right + actualWidth > parentWidth ? 'left' : placement == 'left' && pos.left - actualWidth < parentLeft ? 'right' : placement;
        $tip.removeClass(orgPlacement).addClass(placement);
      }
      var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight);
      this.applyPlacement(calculatedOffset, placement);
      this.$element.trigger('shown.bs.' + this.type);
    }
  };
  Tooltip.prototype.applyPlacement = function (offset, placement) {
    var replace;
    var $tip = this.tip();
    var width = $tip[0].offsetWidth;
    var height = $tip[0].offsetHeight;
    // manually read margins because getBoundingClientRect includes difference
    var marginTop = parseInt($tip.css('margin-top'), 10);
    var marginLeft = parseInt($tip.css('margin-left'), 10);
    // we must check for NaN for ie 8/9
    if (isNaN(marginTop))
      marginTop = 0;
    if (isNaN(marginLeft))
      marginLeft = 0;
    offset.top = offset.top + marginTop;
    offset.left = offset.left + marginLeft;
    $tip.offset(offset).addClass('in');
    // check to see if placing tip in new offset caused the tip to resize itself
    var actualWidth = $tip[0].offsetWidth;
    var actualHeight = $tip[0].offsetHeight;
    if (placement == 'top' && actualHeight != height) {
      replace = true;
      offset.top = offset.top + height - actualHeight;
    }
    if (/bottom|top/.test(placement)) {
      var delta = 0;
      if (offset.left < 0) {
        delta = offset.left * -2;
        offset.left = 0;
        $tip.offset(offset);
        actualWidth = $tip[0].offsetWidth;
        actualHeight = $tip[0].offsetHeight;
      }
      this.replaceArrow(delta - width + actualWidth, actualWidth, 'left');
    } else {
      this.replaceArrow(actualHeight - height, actualHeight, 'top');
    }
    if (replace)
      $tip.offset(offset);
  };
  Tooltip.prototype.replaceArrow = function (delta, dimension, position) {
    this.arrow().css(position, delta ? 50 * (1 - delta / dimension) + '%' : '');
  };
  Tooltip.prototype.setContent = function () {
    var $tip = this.tip();
    var title = this.getTitle();
    $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title);
    $tip.removeClass('fade in top bottom left right');
  };
  Tooltip.prototype.hide = function () {
    var that = this;
    var $tip = this.tip();
    var e = $.Event('hide.bs.' + this.type);
    function complete() {
      if (that.hoverState != 'in')
        $tip.detach();
    }
    this.$element.trigger(e);
    if (e.isDefaultPrevented())
      return;
    $tip.removeClass('in');
    $.support.transition && this.$tip.hasClass('fade') ? $tip.one($.support.transition.end, complete).emulateTransitionEnd(150) : complete();
    this.$element.trigger('hidden.bs.' + this.type);
    return this;
  };
  Tooltip.prototype.fixTitle = function () {
    var $e = this.$element;
    if ($e.attr('title') || typeof $e.attr('data-original-title') != 'string') {
      $e.attr('data-original-title', $e.attr('title') || '').attr('title', '');
    }
  };
  Tooltip.prototype.hasContent = function () {
    return this.getTitle();
  };
  Tooltip.prototype.getPosition = function () {
    var el = this.$element[0];
    return $.extend({}, typeof el.getBoundingClientRect == 'function' ? el.getBoundingClientRect() : {
      width: el.offsetWidth,
      height: el.offsetHeight
    }, this.$element.offset());
  };
  Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
    return placement == 'bottom' ? {
      top: pos.top + pos.height,
      left: pos.left + pos.width / 2 - actualWidth / 2
    } : placement == 'top' ? {
      top: pos.top - actualHeight,
      left: pos.left + pos.width / 2 - actualWidth / 2
    } : placement == 'left' ? {
      top: pos.top + pos.height / 2 - actualHeight / 2,
      left: pos.left - actualWidth
    } : {
      top: pos.top + pos.height / 2 - actualHeight / 2,
      left: pos.left + pos.width
    };
  };
  Tooltip.prototype.getTitle = function () {
    var title;
    var $e = this.$element;
    var o = this.options;
    title = $e.attr('data-original-title') || (typeof o.title == 'function' ? o.title.call($e[0]) : o.title);
    return title;
  };
  Tooltip.prototype.tip = function () {
    return this.$tip = this.$tip || $(this.options.template);
  };
  Tooltip.prototype.arrow = function () {
    return this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow');
  };
  Tooltip.prototype.validate = function () {
    if (!this.$element[0].parentNode) {
      this.hide();
      this.$element = null;
      this.options = null;
    }
  };
  Tooltip.prototype.enable = function () {
    this.enabled = true;
  };
  Tooltip.prototype.disable = function () {
    this.enabled = false;
  };
  Tooltip.prototype.toggleEnabled = function () {
    this.enabled = !this.enabled;
  };
  Tooltip.prototype.toggle = function (e) {
    var self = e ? $(e.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type) : this;
    self.tip().hasClass('in') ? self.leave(self) : self.enter(self);
  };
  Tooltip.prototype.destroy = function () {
    this.hide().$element.off('.' + this.type).removeData('bs.' + this.type);
  };
  // TOOLTIP PLUGIN DEFINITION
  // =========================
  var old = $.fn.tooltip;
  $.fn.tooltip = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.tooltip');
      var options = typeof option == 'object' && option;
      if (!data)
        $this.data('bs.tooltip', data = new Tooltip(this, options));
      if (typeof option == 'string')
        data[option]();
    });
  };
  $.fn.tooltip.Constructor = Tooltip;
  // TOOLTIP NO CONFLICT
  // ===================
  $.fn.tooltip.noConflict = function () {
    $.fn.tooltip = old;
    return this;
  };
}(window.jQuery);
/* ========================================================================
 * Bootstrap: popover.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#popovers
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */
+function ($) {
  'use strict';
  // POPOVER PUBLIC CLASS DEFINITION
  // ===============================
  var Popover = function (element, options) {
    this.init('popover', element, options);
  };
  if (!$.fn.tooltip)
    throw new Error('Popover requires tooltip.js');
  Popover.DEFAULTS = $.extend({}, $.fn.tooltip.Constructor.DEFAULTS, {
    placement: 'right',
    trigger: 'click',
    content: '',
    template: '<div class="popover"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
  });
  // NOTE: POPOVER EXTENDS tooltip.js
  // ================================
  Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype);
  Popover.prototype.constructor = Popover;
  Popover.prototype.getDefaults = function () {
    return Popover.DEFAULTS;
  };
  Popover.prototype.setContent = function () {
    var $tip = this.tip();
    var title = this.getTitle();
    var content = this.getContent();
    $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title);
    $tip.find('.popover-content')[this.options.html ? 'html' : 'text'](content);
    $tip.removeClass('fade top bottom left right in');
    // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
    // this manually by checking the contents.
    if (!$tip.find('.popover-title').html())
      $tip.find('.popover-title').hide();
  };
  Popover.prototype.hasContent = function () {
    return this.getTitle() || this.getContent();
  };
  Popover.prototype.getContent = function () {
    var $e = this.$element;
    var o = this.options;
    return $e.attr('data-content') || (typeof o.content == 'function' ? o.content.call($e[0]) : o.content);
  };
  Popover.prototype.arrow = function () {
    return this.$arrow = this.$arrow || this.tip().find('.arrow');
  };
  Popover.prototype.tip = function () {
    if (!this.$tip)
      this.$tip = $(this.options.template);
    return this.$tip;
  };
  // POPOVER PLUGIN DEFINITION
  // =========================
  var old = $.fn.popover;
  $.fn.popover = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.popover');
      var options = typeof option == 'object' && option;
      if (!data)
        $this.data('bs.popover', data = new Popover(this, options));
      if (typeof option == 'string')
        data[option]();
    });
  };
  $.fn.popover.Constructor = Popover;
  // POPOVER NO CONFLICT
  // ===================
  $.fn.popover.noConflict = function () {
    $.fn.popover = old;
    return this;
  };
}(window.jQuery);
/* ========================================================================
 * Bootstrap: scrollspy.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#scrollspy
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */
+function ($) {
  'use strict';
  // SCROLLSPY CLASS DEFINITION
  // ==========================
  function ScrollSpy(element, options) {
    var href;
    var process = $.proxy(this.process, this);
    this.$element = $(element).is('body') ? $(window) : $(element);
    this.$body = $('body');
    this.$scrollElement = this.$element.on('scroll.bs.scroll-spy.data-api', process);
    this.options = $.extend({}, ScrollSpy.DEFAULTS, options);
    this.selector = (this.options.target || (href = $(element).attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '') || '') + ' .nav li > a';
    this.offsets = $([]);
    this.targets = $([]);
    this.activeTarget = null;
    this.refresh();
    this.process();
  }
  ScrollSpy.DEFAULTS = { offset: 10 };
  ScrollSpy.prototype.refresh = function () {
    var offsetMethod = this.$element[0] == window ? 'offset' : 'position';
    this.offsets = $([]);
    this.targets = $([]);
    var self = this;
    var $targets = this.$body.find(this.selector).map(function () {
        var $el = $(this);
        var href = $el.data('target') || $el.attr('href');
        var $href = /^#\w/.test(href) && $(href);
        return $href && $href.length && [[
            $href[offsetMethod]().top + (!$.isWindow(self.$scrollElement.get(0)) && self.$scrollElement.scrollTop()),
            href
          ]] || null;
      }).sort(function (a, b) {
        return a[0] - b[0];
      }).each(function () {
        self.offsets.push(this[0]);
        self.targets.push(this[1]);
      });
  };
  ScrollSpy.prototype.process = function () {
    var scrollTop = this.$scrollElement.scrollTop() + this.options.offset;
    var scrollHeight = this.$scrollElement[0].scrollHeight || this.$body[0].scrollHeight;
    var maxScroll = scrollHeight - this.$scrollElement.height();
    var offsets = this.offsets;
    var targets = this.targets;
    var activeTarget = this.activeTarget;
    var i;
    if (scrollTop >= maxScroll) {
      return activeTarget != (i = targets.last()[0]) && this.activate(i);
    }
    for (i = offsets.length; i--;) {
      activeTarget != targets[i] && scrollTop >= offsets[i] && (!offsets[i + 1] || scrollTop <= offsets[i + 1]) && this.activate(targets[i]);
    }
  };
  ScrollSpy.prototype.activate = function (target) {
    this.activeTarget = target;
    $(this.selector).parents('.active').removeClass('active');
    var selector = this.selector + '[data-target="' + target + '"],' + this.selector + '[href="' + target + '"]';
    var active = $(selector).parents('li').addClass('active');
    if (active.parent('.dropdown-menu').length) {
      active = active.closest('li.dropdown').addClass('active');
    }
    active.trigger('activate');
  };
  // SCROLLSPY PLUGIN DEFINITION
  // ===========================
  var old = $.fn.scrollspy;
  $.fn.scrollspy = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.scrollspy');
      var options = typeof option == 'object' && option;
      if (!data)
        $this.data('bs.scrollspy', data = new ScrollSpy(this, options));
      if (typeof option == 'string')
        data[option]();
    });
  };
  $.fn.scrollspy.Constructor = ScrollSpy;
  // SCROLLSPY NO CONFLICT
  // =====================
  $.fn.scrollspy.noConflict = function () {
    $.fn.scrollspy = old;
    return this;
  };
  // SCROLLSPY DATA-API
  // ==================
  $(window).on('load', function () {
    $('[data-spy="scroll"]').each(function () {
      var $spy = $(this);
      $spy.scrollspy($spy.data());
    });
  });
}(window.jQuery);
/* ========================================================================
 * Bootstrap: tab.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#tabs
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */
+function ($) {
  'use strict';
  // TAB CLASS DEFINITION
  // ====================
  var Tab = function (element) {
    this.element = $(element);
  };
  Tab.prototype.show = function () {
    var $this = this.element;
    var $ul = $this.closest('ul:not(.dropdown-menu)');
    var selector = $this.attr('data-target');
    if (!selector) {
      selector = $this.attr('href');
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '');
    }
    if ($this.parent('li').hasClass('active'))
      return;
    var previous = $ul.find('.active:last a')[0];
    var e = $.Event('show.bs.tab', { relatedTarget: previous });
    $this.trigger(e);
    if (e.isDefaultPrevented())
      return;
    var $target = $(selector);
    this.activate($this.parent('li'), $ul);
    this.activate($target, $target.parent(), function () {
      $this.trigger({
        type: 'shown.bs.tab',
        relatedTarget: previous
      });
    });
  };
  Tab.prototype.activate = function (element, container, callback) {
    var $active = container.find('> .active');
    var transition = callback && $.support.transition && $active.hasClass('fade');
    function next() {
      $active.removeClass('active').find('> .dropdown-menu > .active').removeClass('active');
      element.addClass('active');
      if (transition) {
        element[0].offsetWidth;
        // reflow for transition
        element.addClass('in');
      } else {
        element.removeClass('fade');
      }
      if (element.parent('.dropdown-menu')) {
        element.closest('li.dropdown').addClass('active');
      }
      callback && callback();
    }
    transition ? $active.one($.support.transition.end, next).emulateTransitionEnd(150) : next();
    $active.removeClass('in');
  };
  // TAB PLUGIN DEFINITION
  // =====================
  var old = $.fn.tab;
  $.fn.tab = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.tab');
      if (!data)
        $this.data('bs.tab', data = new Tab(this));
      if (typeof option == 'string')
        data[option]();
    });
  };
  $.fn.tab.Constructor = Tab;
  // TAB NO CONFLICT
  // ===============
  $.fn.tab.noConflict = function () {
    $.fn.tab = old;
    return this;
  };
  // TAB DATA-API
  // ============
  $(document).on('click.bs.tab.data-api', '[data-toggle="tab"], [data-toggle="pill"]', function (e) {
    e.preventDefault();
    $(this).tab('show');
  });
}(window.jQuery);
/* ========================================================================
 * Bootstrap: affix.js v3.0.0
 * http://twbs.github.com/bootstrap/javascript.html#affix
 * ========================================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================================== */
+function ($) {
  'use strict';
  // AFFIX CLASS DEFINITION
  // ======================
  var Affix = function (element, options) {
    this.options = $.extend({}, Affix.DEFAULTS, options);
    this.$window = $(window).on('scroll.bs.affix.data-api', $.proxy(this.checkPosition, this)).on('click.bs.affix.data-api', $.proxy(this.checkPositionWithEventLoop, this));
    this.$element = $(element);
    this.affixed = this.unpin = null;
    this.checkPosition();
  };
  Affix.RESET = 'affix affix-top affix-bottom';
  Affix.DEFAULTS = { offset: 0 };
  Affix.prototype.checkPositionWithEventLoop = function () {
    setTimeout($.proxy(this.checkPosition, this), 1);
  };
  Affix.prototype.checkPosition = function () {
    if (!this.$element.is(':visible'))
      return;
    var scrollHeight = $(document).height();
    var scrollTop = this.$window.scrollTop();
    var position = this.$element.offset();
    var offset = this.options.offset;
    var offsetTop = offset.top;
    var offsetBottom = offset.bottom;
    if (typeof offset != 'object')
      offsetBottom = offsetTop = offset;
    if (typeof offsetTop == 'function')
      offsetTop = offset.top();
    if (typeof offsetBottom == 'function')
      offsetBottom = offset.bottom();
    var affix = this.unpin != null && scrollTop + this.unpin <= position.top ? false : offsetBottom != null && position.top + this.$element.height() >= scrollHeight - offsetBottom ? 'bottom' : offsetTop != null && scrollTop <= offsetTop ? 'top' : false;
    if (this.affixed === affix)
      return;
    if (this.unpin)
      this.$element.css('top', '');
    this.affixed = affix;
    this.unpin = affix == 'bottom' ? position.top - scrollTop : null;
    this.$element.removeClass(Affix.RESET).addClass('affix' + (affix ? '-' + affix : ''));
    if (affix == 'bottom') {
      this.$element.offset({ top: document.body.offsetHeight - offsetBottom - this.$element.height() });
    }
  };
  // AFFIX PLUGIN DEFINITION
  // =======================
  var old = $.fn.affix;
  $.fn.affix = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('bs.affix');
      var options = typeof option == 'object' && option;
      if (!data)
        $this.data('bs.affix', data = new Affix(this, options));
      if (typeof option == 'string')
        data[option]();
    });
  };
  $.fn.affix.Constructor = Affix;
  // AFFIX NO CONFLICT
  // =================
  $.fn.affix.noConflict = function () {
    $.fn.affix = old;
    return this;
  };
  // AFFIX DATA-API
  // ==============
  $(window).on('load', function () {
    $('[data-spy="affix"]').each(function () {
      var $spy = $(this);
      var data = $spy.data();
      data.offset = data.offset || {};
      if (data.offsetBottom)
        data.offset.bottom = data.offsetBottom;
      if (data.offsetTop)
        data.offset.top = data.offsetTop;
      $spy.affix(data);
    });
  });
}(window.jQuery);
//! moment.js
//! version : 2.4.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com
(function (a) {
  function b(a, b) {
    return function (c) {
      return i(a.call(this, c), b);
    };
  }
  function c(a, b) {
    return function (c) {
      return this.lang().ordinal(a.call(this, c), b);
    };
  }
  function d() {
  }
  function e(a) {
    u(a), g(this, a);
  }
  function f(a) {
    var b = o(a), c = b.year || 0, d = b.month || 0, e = b.week || 0, f = b.day || 0, g = b.hour || 0, h = b.minute || 0, i = b.second || 0, j = b.millisecond || 0;
    this._input = a, this._milliseconds = +j + 1000 * i + 60000 * h + 3600000 * g, this._days = +f + 7 * e, this._months = +d + 12 * c, this._data = {}, this._bubble();
  }
  function g(a, b) {
    for (var c in b)
      b.hasOwnProperty(c) && (a[c] = b[c]);
    return b.hasOwnProperty('toString') && (a.toString = b.toString), b.hasOwnProperty('valueOf') && (a.valueOf = b.valueOf), a;
  }
  function h(a) {
    return 0 > a ? Math.ceil(a) : Math.floor(a);
  }
  function i(a, b) {
    for (var c = a + ''; c.length < b;)
      c = '0' + c;
    return c;
  }
  function j(a, b, c, d) {
    var e, f, g = b._milliseconds, h = b._days, i = b._months;
    g && a._d.setTime(+a._d + g * c), (h || i) && (e = a.minute(), f = a.hour()), h && a.date(a.date() + h * c), i && a.month(a.month() + i * c), g && !d && bb.updateOffset(a), (h || i) && (a.minute(e), a.hour(f));
  }
  function k(a) {
    return '[object Array]' === Object.prototype.toString.call(a);
  }
  function l(a) {
    return '[object Date]' === Object.prototype.toString.call(a) || a instanceof Date;
  }
  function m(a, b, c) {
    var d, e = Math.min(a.length, b.length), f = Math.abs(a.length - b.length), g = 0;
    for (d = 0; e > d; d++)
      (c && a[d] !== b[d] || !c && q(a[d]) !== q(b[d])) && g++;
    return g + f;
  }
  function n(a) {
    if (a) {
      var b = a.toLowerCase().replace(/(.)s$/, '$1');
      a = Kb[a] || Lb[b] || b;
    }
    return a;
  }
  function o(a) {
    var b, c, d = {};
    for (c in a)
      a.hasOwnProperty(c) && (b = n(c), b && (d[b] = a[c]));
    return d;
  }
  function p(b) {
    var c, d;
    if (0 === b.indexOf('week'))
      c = 7, d = 'day';
    else {
      if (0 !== b.indexOf('month'))
        return;
      c = 12, d = 'month';
    }
    bb[b] = function (e, f) {
      var g, h, i = bb.fn._lang[b], j = [];
      if ('number' == typeof e && (f = e, e = a), h = function (a) {
          var b = bb().utc().set(d, a);
          return i.call(bb.fn._lang, b, e || '');
        }, null != f)
        return h(f);
      for (g = 0; c > g; g++)
        j.push(h(g));
      return j;
    };
  }
  function q(a) {
    var b = +a, c = 0;
    return 0 !== b && isFinite(b) && (c = b >= 0 ? Math.floor(b) : Math.ceil(b)), c;
  }
  function r(a, b) {
    return new Date(Date.UTC(a, b + 1, 0)).getUTCDate();
  }
  function s(a) {
    return t(a) ? 366 : 365;
  }
  function t(a) {
    return 0 === a % 4 && 0 !== a % 100 || 0 === a % 400;
  }
  function u(a) {
    var b;
    a._a && -2 === a._pf.overflow && (b = a._a[gb] < 0 || a._a[gb] > 11 ? gb : a._a[hb] < 1 || a._a[hb] > r(a._a[fb], a._a[gb]) ? hb : a._a[ib] < 0 || a._a[ib] > 23 ? ib : a._a[jb] < 0 || a._a[jb] > 59 ? jb : a._a[kb] < 0 || a._a[kb] > 59 ? kb : a._a[lb] < 0 || a._a[lb] > 999 ? lb : -1, a._pf._overflowDayOfYear && (fb > b || b > hb) && (b = hb), a._pf.overflow = b);
  }
  function v(a) {
    a._pf = {
      empty: !1,
      unusedTokens: [],
      unusedInput: [],
      overflow: -2,
      charsLeftOver: 0,
      nullInput: !1,
      invalidMonth: null,
      invalidFormat: !1,
      userInvalidated: !1,
      iso: !1
    };
  }
  function w(a) {
    return null == a._isValid && (a._isValid = !isNaN(a._d.getTime()) && a._pf.overflow < 0 && !a._pf.empty && !a._pf.invalidMonth && !a._pf.nullInput && !a._pf.invalidFormat && !a._pf.userInvalidated, a._strict && (a._isValid = a._isValid && 0 === a._pf.charsLeftOver && 0 === a._pf.unusedTokens.length)), a._isValid;
  }
  function x(a) {
    return a ? a.toLowerCase().replace('_', '-') : a;
  }
  function y(a, b) {
    return b.abbr = a, mb[a] || (mb[a] = new d()), mb[a].set(b), mb[a];
  }
  function z(a) {
    delete mb[a];
  }
  function A(a) {
    var b, c, d, e, f = 0, g = function (a) {
        if (!mb[a] && nb)
          try {
            require('./lang/' + a);
          } catch (b) {
          }
        return mb[a];
      };
    if (!a)
      return bb.fn._lang;
    if (!k(a)) {
      if (c = g(a))
        return c;
      a = [a];
    }
    for (; f < a.length;) {
      for (e = x(a[f]).split('-'), b = e.length, d = x(a[f + 1]), d = d ? d.split('-') : null; b > 0;) {
        if (c = g(e.slice(0, b).join('-')))
          return c;
        if (d && d.length >= b && m(e, d, !0) >= b - 1)
          break;
        b--;
      }
      f++;
    }
    return bb.fn._lang;
  }
  function B(a) {
    return a.match(/\[[\s\S]/) ? a.replace(/^\[|\]$/g, '') : a.replace(/\\/g, '');
  }
  function C(a) {
    var b, c, d = a.match(rb);
    for (b = 0, c = d.length; c > b; b++)
      d[b] = Pb[d[b]] ? Pb[d[b]] : B(d[b]);
    return function (e) {
      var f = '';
      for (b = 0; c > b; b++)
        f += d[b] instanceof Function ? d[b].call(e, a) : d[b];
      return f;
    };
  }
  function D(a, b) {
    return a.isValid() ? (b = E(b, a.lang()), Mb[b] || (Mb[b] = C(b)), Mb[b](a)) : a.lang().invalidDate();
  }
  function E(a, b) {
    function c(a) {
      return b.longDateFormat(a) || a;
    }
    var d = 5;
    for (sb.lastIndex = 0; d >= 0 && sb.test(a);)
      a = a.replace(sb, c), sb.lastIndex = 0, d -= 1;
    return a;
  }
  function F(a, b) {
    var c;
    switch (a) {
    case 'DDDD':
      return vb;
    case 'YYYY':
    case 'GGGG':
    case 'gggg':
      return wb;
    case 'YYYYY':
    case 'GGGGG':
    case 'ggggg':
      return xb;
    case 'S':
    case 'SS':
    case 'SSS':
    case 'DDD':
      return ub;
    case 'MMM':
    case 'MMMM':
    case 'dd':
    case 'ddd':
    case 'dddd':
      return zb;
    case 'a':
    case 'A':
      return A(b._l)._meridiemParse;
    case 'X':
      return Cb;
    case 'Z':
    case 'ZZ':
      return Ab;
    case 'T':
      return Bb;
    case 'SSSS':
      return yb;
    case 'MM':
    case 'DD':
    case 'YY':
    case 'GG':
    case 'gg':
    case 'HH':
    case 'hh':
    case 'mm':
    case 'ss':
    case 'M':
    case 'D':
    case 'd':
    case 'H':
    case 'h':
    case 'm':
    case 's':
    case 'w':
    case 'ww':
    case 'W':
    case 'WW':
    case 'e':
    case 'E':
      return tb;
    default:
      return c = new RegExp(N(M(a.replace('\\', '')), 'i'));
    }
  }
  function G(a) {
    var b = (Ab.exec(a) || [])[0], c = (b + '').match(Hb) || [
        '-',
        0,
        0
      ], d = +(60 * c[1]) + q(c[2]);
    return '+' === c[0] ? -d : d;
  }
  function H(a, b, c) {
    var d, e = c._a;
    switch (a) {
    case 'M':
    case 'MM':
      null != b && (e[gb] = q(b) - 1);
      break;
    case 'MMM':
    case 'MMMM':
      d = A(c._l).monthsParse(b), null != d ? e[gb] = d : c._pf.invalidMonth = b;
      break;
    case 'D':
    case 'DD':
      null != b && (e[hb] = q(b));
      break;
    case 'DDD':
    case 'DDDD':
      null != b && (c._dayOfYear = q(b));
      break;
    case 'YY':
      e[fb] = q(b) + (q(b) > 68 ? 1900 : 2000);
      break;
    case 'YYYY':
    case 'YYYYY':
      e[fb] = q(b);
      break;
    case 'a':
    case 'A':
      c._isPm = A(c._l).isPM(b);
      break;
    case 'H':
    case 'HH':
    case 'h':
    case 'hh':
      e[ib] = q(b);
      break;
    case 'm':
    case 'mm':
      e[jb] = q(b);
      break;
    case 's':
    case 'ss':
      e[kb] = q(b);
      break;
    case 'S':
    case 'SS':
    case 'SSS':
    case 'SSSS':
      e[lb] = q(1000 * ('0.' + b));
      break;
    case 'X':
      c._d = new Date(1000 * parseFloat(b));
      break;
    case 'Z':
    case 'ZZ':
      c._useUTC = !0, c._tzm = G(b);
      break;
    case 'w':
    case 'ww':
    case 'W':
    case 'WW':
    case 'd':
    case 'dd':
    case 'ddd':
    case 'dddd':
    case 'e':
    case 'E':
      a = a.substr(0, 1);
    case 'gg':
    case 'gggg':
    case 'GG':
    case 'GGGG':
    case 'GGGGG':
      a = a.substr(0, 2), b && (c._w = c._w || {}, c._w[a] = b);
    }
  }
  function I(a) {
    var b, c, d, e, f, g, h, i, j, k, l = [];
    if (!a._d) {
      for (d = K(a), a._w && null == a._a[hb] && null == a._a[gb] && (f = function (b) {
          return b ? b.length < 3 ? parseInt(b, 10) > 68 ? '19' + b : '20' + b : b : null == a._a[fb] ? bb().weekYear() : a._a[fb];
        }, g = a._w, null != g.GG || null != g.W || null != g.E ? h = X(f(g.GG), g.W || 1, g.E, 4, 1) : (i = A(a._l), j = null != g.d ? T(g.d, i) : null != g.e ? parseInt(g.e, 10) + i._week.dow : 0, k = parseInt(g.w, 10) || 1, null != g.d && j < i._week.dow && k++, h = X(f(g.gg), k, j, i._week.doy, i._week.dow)), a._a[fb] = h.year, a._dayOfYear = h.dayOfYear), a._dayOfYear && (e = null == a._a[fb] ? d[fb] : a._a[fb], a._dayOfYear > s(e) && (a._pf._overflowDayOfYear = !0), c = S(e, 0, a._dayOfYear), a._a[gb] = c.getUTCMonth(), a._a[hb] = c.getUTCDate()), b = 0; 3 > b && null == a._a[b]; ++b)
        a._a[b] = l[b] = d[b];
      for (; 7 > b; b++)
        a._a[b] = l[b] = null == a._a[b] ? 2 === b ? 1 : 0 : a._a[b];
      l[ib] += q((a._tzm || 0) / 60), l[jb] += q((a._tzm || 0) % 60), a._d = (a._useUTC ? S : R).apply(null, l);
    }
  }
  function J(a) {
    var b;
    a._d || (b = o(a._i), a._a = [
      b.year,
      b.month,
      b.day,
      b.hour,
      b.minute,
      b.second,
      b.millisecond
    ], I(a));
  }
  function K(a) {
    var b = new Date();
    return a._useUTC ? [
      b.getUTCFullYear(),
      b.getUTCMonth(),
      b.getUTCDate()
    ] : [
      b.getFullYear(),
      b.getMonth(),
      b.getDate()
    ];
  }
  function L(a) {
    a._a = [], a._pf.empty = !0;
    var b, c, d, e, f, g = A(a._l), h = '' + a._i, i = h.length, j = 0;
    for (d = E(a._f, g).match(rb) || [], b = 0; b < d.length; b++)
      e = d[b], c = (F(e, a).exec(h) || [])[0], c && (f = h.substr(0, h.indexOf(c)), f.length > 0 && a._pf.unusedInput.push(f), h = h.slice(h.indexOf(c) + c.length), j += c.length), Pb[e] ? (c ? a._pf.empty = !1 : a._pf.unusedTokens.push(e), H(e, c, a)) : a._strict && !c && a._pf.unusedTokens.push(e);
    a._pf.charsLeftOver = i - j, h.length > 0 && a._pf.unusedInput.push(h), a._isPm && a._a[ib] < 12 && (a._a[ib] += 12), a._isPm === !1 && 12 === a._a[ib] && (a._a[ib] = 0), I(a), u(a);
  }
  function M(a) {
    return a.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (a, b, c, d, e) {
      return b || c || d || e;
    });
  }
  function N(a) {
    return a.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }
  function O(a) {
    var b, c, d, e, f;
    if (0 === a._f.length)
      return a._pf.invalidFormat = !0, a._d = new Date(0 / 0), void 0;
    for (e = 0; e < a._f.length; e++)
      f = 0, b = g({}, a), v(b), b._f = a._f[e], L(b), w(b) && (f += b._pf.charsLeftOver, f += 10 * b._pf.unusedTokens.length, b._pf.score = f, (null == d || d > f) && (d = f, c = b));
    g(a, c || b);
  }
  function P(a) {
    var b, c = a._i, d = Db.exec(c);
    if (d) {
      for (a._pf.iso = !0, b = 4; b > 0; b--)
        if (d[b]) {
          a._f = Fb[b - 1] + (d[6] || ' ');
          break;
        }
      for (b = 0; 4 > b; b++)
        if (Gb[b][1].exec(c)) {
          a._f += Gb[b][0];
          break;
        }
      Ab.exec(c) && (a._f += 'Z'), L(a);
    } else
      a._d = new Date(c);
  }
  function Q(b) {
    var c = b._i, d = ob.exec(c);
    c === a ? b._d = new Date() : d ? b._d = new Date(+d[1]) : 'string' == typeof c ? P(b) : k(c) ? (b._a = c.slice(0), I(b)) : l(c) ? b._d = new Date(+c) : 'object' == typeof c ? J(b) : b._d = new Date(c);
  }
  function R(a, b, c, d, e, f, g) {
    var h = new Date(a, b, c, d, e, f, g);
    return 1970 > a && h.setFullYear(a), h;
  }
  function S(a) {
    var b = new Date(Date.UTC.apply(null, arguments));
    return 1970 > a && b.setUTCFullYear(a), b;
  }
  function T(a, b) {
    if ('string' == typeof a)
      if (isNaN(a)) {
        if (a = b.weekdaysParse(a), 'number' != typeof a)
          return null;
      } else
        a = parseInt(a, 10);
    return a;
  }
  function U(a, b, c, d, e) {
    return e.relativeTime(b || 1, !!c, a, d);
  }
  function V(a, b, c) {
    var d = eb(Math.abs(a) / 1000), e = eb(d / 60), f = eb(e / 60), g = eb(f / 24), h = eb(g / 365), i = 45 > d && [
        's',
        d
      ] || 1 === e && ['m'] || 45 > e && [
        'mm',
        e
      ] || 1 === f && ['h'] || 22 > f && [
        'hh',
        f
      ] || 1 === g && ['d'] || 25 >= g && [
        'dd',
        g
      ] || 45 >= g && ['M'] || 345 > g && [
        'MM',
        eb(g / 30)
      ] || 1 === h && ['y'] || [
        'yy',
        h
      ];
    return i[2] = b, i[3] = a > 0, i[4] = c, U.apply({}, i);
  }
  function W(a, b, c) {
    var d, e = c - b, f = c - a.day();
    return f > e && (f -= 7), e - 7 > f && (f += 7), d = bb(a).add('d', f), {
      week: Math.ceil(d.dayOfYear() / 7),
      year: d.year()
    };
  }
  function X(a, b, c, d, e) {
    var f, g, h = new Date(Date.UTC(a, 0)).getUTCDay();
    return c = null != c ? c : e, f = e - h + (h > d ? 7 : 0), g = 7 * (b - 1) + (c - e) + f + 1, {
      year: g > 0 ? a : a - 1,
      dayOfYear: g > 0 ? g : s(a - 1) + g
    };
  }
  function Y(a) {
    var b = a._i, c = a._f;
    return 'undefined' == typeof a._pf && v(a), null === b ? bb.invalid({ nullInput: !0 }) : ('string' == typeof b && (a._i = b = A().preparse(b)), bb.isMoment(b) ? (a = g({}, b), a._d = new Date(+b._d)) : c ? k(c) ? O(a) : L(a) : Q(a), new e(a));
  }
  function Z(a, b) {
    bb.fn[a] = bb.fn[a + 's'] = function (a) {
      var c = this._isUTC ? 'UTC' : '';
      return null != a ? (this._d['set' + c + b](a), bb.updateOffset(this), this) : this._d['get' + c + b]();
    };
  }
  function $(a) {
    bb.duration.fn[a] = function () {
      return this._data[a];
    };
  }
  function _(a, b) {
    bb.duration.fn['as' + a] = function () {
      return +this / b;
    };
  }
  function ab(a) {
    var b = !1, c = bb;
    'undefined' == typeof ender && (this.moment = a ? function () {
      return !b && console && console.warn && (b = !0, console.warn('Accessing Moment through the global scope is deprecated, and will be removed in an upcoming release.')), c.apply(null, arguments);
    } : bb);
  }
  for (var bb, cb, db = '2.4.0', eb = Math.round, fb = 0, gb = 1, hb = 2, ib = 3, jb = 4, kb = 5, lb = 6, mb = {}, nb = 'undefined' != typeof module && module.exports, ob = /^\/?Date\((\-?\d+)/i, pb = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/, qb = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/, rb = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|X|zz?|ZZ?|.)/g, sb = /(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g, tb = /\d\d?/, ub = /\d{1,3}/, vb = /\d{3}/, wb = /\d{1,4}/, xb = /[+\-]?\d{1,6}/, yb = /\d+/, zb = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, Ab = /Z|[\+\-]\d\d:?\d\d/i, Bb = /T/i, Cb = /[\+\-]?\d+(\.\d{1,3})?/, Db = /^\s*\d{4}-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d:?\d\d|Z)?)?$/, Eb = 'YYYY-MM-DDTHH:mm:ssZ', Fb = [
        'YYYY-MM-DD',
        'GGGG-[W]WW',
        'GGGG-[W]WW-E',
        'YYYY-DDD'
      ], Gb = [
        [
          'HH:mm:ss.SSSS',
          /(T| )\d\d:\d\d:\d\d\.\d{1,3}/
        ],
        [
          'HH:mm:ss',
          /(T| )\d\d:\d\d:\d\d/
        ],
        [
          'HH:mm',
          /(T| )\d\d:\d\d/
        ],
        [
          'HH',
          /(T| )\d\d/
        ]
      ], Hb = /([\+\-]|\d\d)/gi, Ib = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'), Jb = {
        Milliseconds: 1,
        Seconds: 1000,
        Minutes: 60000,
        Hours: 3600000,
        Days: 86400000,
        Months: 2592000000,
        Years: 31536000000
      }, Kb = {
        ms: 'millisecond',
        s: 'second',
        m: 'minute',
        h: 'hour',
        d: 'day',
        D: 'date',
        w: 'week',
        W: 'isoWeek',
        M: 'month',
        y: 'year',
        DDD: 'dayOfYear',
        e: 'weekday',
        E: 'isoWeekday',
        gg: 'weekYear',
        GG: 'isoWeekYear'
      }, Lb = {
        dayofyear: 'dayOfYear',
        isoweekday: 'isoWeekday',
        isoweek: 'isoWeek',
        weekyear: 'weekYear',
        isoweekyear: 'isoWeekYear'
      }, Mb = {}, Nb = 'DDD w W M D d'.split(' '), Ob = 'M D H h m s w W'.split(' '), Pb = {
        M: function () {
          return this.month() + 1;
        },
        MMM: function (a) {
          return this.lang().monthsShort(this, a);
        },
        MMMM: function (a) {
          return this.lang().months(this, a);
        },
        D: function () {
          return this.date();
        },
        DDD: function () {
          return this.dayOfYear();
        },
        d: function () {
          return this.day();
        },
        dd: function (a) {
          return this.lang().weekdaysMin(this, a);
        },
        ddd: function (a) {
          return this.lang().weekdaysShort(this, a);
        },
        dddd: function (a) {
          return this.lang().weekdays(this, a);
        },
        w: function () {
          return this.week();
        },
        W: function () {
          return this.isoWeek();
        },
        YY: function () {
          return i(this.year() % 100, 2);
        },
        YYYY: function () {
          return i(this.year(), 4);
        },
        YYYYY: function () {
          return i(this.year(), 5);
        },
        gg: function () {
          return i(this.weekYear() % 100, 2);
        },
        gggg: function () {
          return this.weekYear();
        },
        ggggg: function () {
          return i(this.weekYear(), 5);
        },
        GG: function () {
          return i(this.isoWeekYear() % 100, 2);
        },
        GGGG: function () {
          return this.isoWeekYear();
        },
        GGGGG: function () {
          return i(this.isoWeekYear(), 5);
        },
        e: function () {
          return this.weekday();
        },
        E: function () {
          return this.isoWeekday();
        },
        a: function () {
          return this.lang().meridiem(this.hours(), this.minutes(), !0);
        },
        A: function () {
          return this.lang().meridiem(this.hours(), this.minutes(), !1);
        },
        H: function () {
          return this.hours();
        },
        h: function () {
          return this.hours() % 12 || 12;
        },
        m: function () {
          return this.minutes();
        },
        s: function () {
          return this.seconds();
        },
        S: function () {
          return q(this.milliseconds() / 100);
        },
        SS: function () {
          return i(q(this.milliseconds() / 10), 2);
        },
        SSS: function () {
          return i(this.milliseconds(), 3);
        },
        SSSS: function () {
          return i(this.milliseconds(), 3);
        },
        Z: function () {
          var a = -this.zone(), b = '+';
          return 0 > a && (a = -a, b = '-'), b + i(q(a / 60), 2) + ':' + i(q(a) % 60, 2);
        },
        ZZ: function () {
          var a = -this.zone(), b = '+';
          return 0 > a && (a = -a, b = '-'), b + i(q(10 * a / 6), 4);
        },
        z: function () {
          return this.zoneAbbr();
        },
        zz: function () {
          return this.zoneName();
        },
        X: function () {
          return this.unix();
        }
      }, Qb = [
        'months',
        'monthsShort',
        'weekdays',
        'weekdaysShort',
        'weekdaysMin'
      ]; Nb.length;)
    cb = Nb.pop(), Pb[cb + 'o'] = c(Pb[cb], cb);
  for (; Ob.length;)
    cb = Ob.pop(), Pb[cb + cb] = b(Pb[cb], 2);
  for (Pb.DDDD = b(Pb.DDD, 3), g(d.prototype, {
      set: function (a) {
        var b, c;
        for (c in a)
          b = a[c], 'function' == typeof b ? this[c] = b : this['_' + c] = b;
      },
      _months: 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_'),
      months: function (a) {
        return this._months[a.month()];
      },
      _monthsShort: 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
      monthsShort: function (a) {
        return this._monthsShort[a.month()];
      },
      monthsParse: function (a) {
        var b, c, d;
        for (this._monthsParse || (this._monthsParse = []), b = 0; 12 > b; b++)
          if (this._monthsParse[b] || (c = bb.utc([
              2000,
              b
            ]), d = '^' + this.months(c, '') + '|^' + this.monthsShort(c, ''), this._monthsParse[b] = new RegExp(d.replace('.', ''), 'i')), this._monthsParse[b].test(a))
            return b;
      },
      _weekdays: 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
      weekdays: function (a) {
        return this._weekdays[a.day()];
      },
      _weekdaysShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
      weekdaysShort: function (a) {
        return this._weekdaysShort[a.day()];
      },
      _weekdaysMin: 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
      weekdaysMin: function (a) {
        return this._weekdaysMin[a.day()];
      },
      weekdaysParse: function (a) {
        var b, c, d;
        for (this._weekdaysParse || (this._weekdaysParse = []), b = 0; 7 > b; b++)
          if (this._weekdaysParse[b] || (c = bb([
              2000,
              1
            ]).day(b), d = '^' + this.weekdays(c, '') + '|^' + this.weekdaysShort(c, '') + '|^' + this.weekdaysMin(c, ''), this._weekdaysParse[b] = new RegExp(d.replace('.', ''), 'i')), this._weekdaysParse[b].test(a))
            return b;
      },
      _longDateFormat: {
        LT: 'h:mm A',
        L: 'MM/DD/YYYY',
        LL: 'MMMM D YYYY',
        LLL: 'MMMM D YYYY LT',
        LLLL: 'dddd, MMMM D YYYY LT'
      },
      longDateFormat: function (a) {
        var b = this._longDateFormat[a];
        return !b && this._longDateFormat[a.toUpperCase()] && (b = this._longDateFormat[a.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (a) {
          return a.slice(1);
        }), this._longDateFormat[a] = b), b;
      },
      isPM: function (a) {
        return 'p' === (a + '').toLowerCase().charAt(0);
      },
      _meridiemParse: /[ap]\.?m?\.?/i,
      meridiem: function (a, b, c) {
        return a > 11 ? c ? 'pm' : 'PM' : c ? 'am' : 'AM';
      },
      _calendar: {
        sameDay: '[Today at] LT',
        nextDay: '[Tomorrow at] LT',
        nextWeek: 'dddd [at] LT',
        lastDay: '[Yesterday at] LT',
        lastWeek: '[Last] dddd [at] LT',
        sameElse: 'L'
      },
      calendar: function (a, b) {
        var c = this._calendar[a];
        return 'function' == typeof c ? c.apply(b) : c;
      },
      _relativeTime: {
        future: 'in %s',
        past: '%s ago',
        s: 'a few seconds',
        m: 'a minute',
        mm: '%d minutes',
        h: 'an hour',
        hh: '%d hours',
        d: 'a day',
        dd: '%d days',
        M: 'a month',
        MM: '%d months',
        y: 'a year',
        yy: '%d years'
      },
      relativeTime: function (a, b, c, d) {
        var e = this._relativeTime[c];
        return 'function' == typeof e ? e(a, b, c, d) : e.replace(/%d/i, a);
      },
      pastFuture: function (a, b) {
        var c = this._relativeTime[a > 0 ? 'future' : 'past'];
        return 'function' == typeof c ? c(b) : c.replace(/%s/i, b);
      },
      ordinal: function (a) {
        return this._ordinal.replace('%d', a);
      },
      _ordinal: '%d',
      preparse: function (a) {
        return a;
      },
      postformat: function (a) {
        return a;
      },
      week: function (a) {
        return W(a, this._week.dow, this._week.doy).week;
      },
      _week: {
        dow: 0,
        doy: 6
      },
      _invalidDate: 'Invalid date',
      invalidDate: function () {
        return this._invalidDate;
      }
    }), bb = function (b, c, d, e) {
      return 'boolean' == typeof d && (e = d, d = a), Y({
        _i: b,
        _f: c,
        _l: d,
        _strict: e,
        _isUTC: !1
      });
    }, bb.utc = function (b, c, d, e) {
      var f;
      return 'boolean' == typeof d && (e = d, d = a), f = Y({
        _useUTC: !0,
        _isUTC: !0,
        _l: d,
        _i: b,
        _f: c,
        _strict: e
      }).utc();
    }, bb.unix = function (a) {
      return bb(1000 * a);
    }, bb.duration = function (a, b) {
      var c, d, e, g = bb.isDuration(a), h = 'number' == typeof a, i = g ? a._input : h ? {} : a, j = null;
      return h ? b ? i[b] = a : i.milliseconds = a : (j = pb.exec(a)) ? (c = '-' === j[1] ? -1 : 1, i = {
        y: 0,
        d: q(j[hb]) * c,
        h: q(j[ib]) * c,
        m: q(j[jb]) * c,
        s: q(j[kb]) * c,
        ms: q(j[lb]) * c
      }) : (j = qb.exec(a)) && (c = '-' === j[1] ? -1 : 1, e = function (a) {
        var b = a && parseFloat(a.replace(',', '.'));
        return (isNaN(b) ? 0 : b) * c;
      }, i = {
        y: e(j[2]),
        M: e(j[3]),
        d: e(j[4]),
        h: e(j[5]),
        m: e(j[6]),
        s: e(j[7]),
        w: e(j[8])
      }), d = new f(i), g && a.hasOwnProperty('_lang') && (d._lang = a._lang), d;
    }, bb.version = db, bb.defaultFormat = Eb, bb.updateOffset = function () {
    }, bb.lang = function (a, b) {
      var c;
      return a ? (b ? y(x(a), b) : null === b ? (z(a), a = 'en') : mb[a] || A(a), c = bb.duration.fn._lang = bb.fn._lang = A(a), c._abbr) : bb.fn._lang._abbr;
    }, bb.langData = function (a) {
      return a && a._lang && a._lang._abbr && (a = a._lang._abbr), A(a);
    }, bb.isMoment = function (a) {
      return a instanceof e;
    }, bb.isDuration = function (a) {
      return a instanceof f;
    }, cb = Qb.length - 1; cb >= 0; --cb)
    p(Qb[cb]);
  for (bb.normalizeUnits = function (a) {
      return n(a);
    }, bb.invalid = function (a) {
      var b = bb.utc(0 / 0);
      return null != a ? g(b._pf, a) : b._pf.userInvalidated = !0, b;
    }, bb.parseZone = function (a) {
      return bb(a).parseZone();
    }, g(bb.fn = e.prototype, {
      clone: function () {
        return bb(this);
      },
      valueOf: function () {
        return +this._d + 60000 * (this._offset || 0);
      },
      unix: function () {
        return Math.floor(+this / 1000);
      },
      toString: function () {
        return this.clone().lang('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
      },
      toDate: function () {
        return this._offset ? new Date(+this) : this._d;
      },
      toISOString: function () {
        return D(bb(this).utc(), 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
      },
      toArray: function () {
        var a = this;
        return [
          a.year(),
          a.month(),
          a.date(),
          a.hours(),
          a.minutes(),
          a.seconds(),
          a.milliseconds()
        ];
      },
      isValid: function () {
        return w(this);
      },
      isDSTShifted: function () {
        return this._a ? this.isValid() && m(this._a, (this._isUTC ? bb.utc(this._a) : bb(this._a)).toArray()) > 0 : !1;
      },
      parsingFlags: function () {
        return g({}, this._pf);
      },
      invalidAt: function () {
        return this._pf.overflow;
      },
      utc: function () {
        return this.zone(0);
      },
      local: function () {
        return this.zone(0), this._isUTC = !1, this;
      },
      format: function (a) {
        var b = D(this, a || bb.defaultFormat);
        return this.lang().postformat(b);
      },
      add: function (a, b) {
        var c;
        return c = 'string' == typeof a ? bb.duration(+b, a) : bb.duration(a, b), j(this, c, 1), this;
      },
      subtract: function (a, b) {
        var c;
        return c = 'string' == typeof a ? bb.duration(+b, a) : bb.duration(a, b), j(this, c, -1), this;
      },
      diff: function (a, b, c) {
        var d, e, f = this._isUTC ? bb(a).zone(this._offset || 0) : bb(a).local(), g = 60000 * (this.zone() - f.zone());
        return b = n(b), 'year' === b || 'month' === b ? (d = 43200000 * (this.daysInMonth() + f.daysInMonth()), e = 12 * (this.year() - f.year()) + (this.month() - f.month()), e += (this - bb(this).startOf('month') - (f - bb(f).startOf('month'))) / d, e -= 60000 * (this.zone() - bb(this).startOf('month').zone() - (f.zone() - bb(f).startOf('month').zone())) / d, 'year' === b && (e /= 12)) : (d = this - f, e = 'second' === b ? d / 1000 : 'minute' === b ? d / 60000 : 'hour' === b ? d / 3600000 : 'day' === b ? (d - g) / 86400000 : 'week' === b ? (d - g) / 604800000 : d), c ? e : h(e);
      },
      from: function (a, b) {
        return bb.duration(this.diff(a)).lang(this.lang()._abbr).humanize(!b);
      },
      fromNow: function (a) {
        return this.from(bb(), a);
      },
      calendar: function () {
        var a = this.diff(bb().zone(this.zone()).startOf('day'), 'days', !0), b = -6 > a ? 'sameElse' : -1 > a ? 'lastWeek' : 0 > a ? 'lastDay' : 1 > a ? 'sameDay' : 2 > a ? 'nextDay' : 7 > a ? 'nextWeek' : 'sameElse';
        return this.format(this.lang().calendar(b, this));
      },
      isLeapYear: function () {
        return t(this.year());
      },
      isDST: function () {
        return this.zone() < this.clone().month(0).zone() || this.zone() < this.clone().month(5).zone();
      },
      day: function (a) {
        var b = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
        return null != a ? (a = T(a, this.lang()), this.add({ d: a - b })) : b;
      },
      month: function (a) {
        var b, c = this._isUTC ? 'UTC' : '';
        return null != a ? 'string' == typeof a && (a = this.lang().monthsParse(a), 'number' != typeof a) ? this : (b = this.date(), this.date(1), this._d['set' + c + 'Month'](a), this.date(Math.min(b, this.daysInMonth())), bb.updateOffset(this), this) : this._d['get' + c + 'Month']();
      },
      startOf: function (a) {
        switch (a = n(a)) {
        case 'year':
          this.month(0);
        case 'month':
          this.date(1);
        case 'week':
        case 'isoWeek':
        case 'day':
          this.hours(0);
        case 'hour':
          this.minutes(0);
        case 'minute':
          this.seconds(0);
        case 'second':
          this.milliseconds(0);
        }
        return 'week' === a ? this.weekday(0) : 'isoWeek' === a && this.isoWeekday(1), this;
      },
      endOf: function (a) {
        return a = n(a), this.startOf(a).add('isoWeek' === a ? 'week' : a, 1).subtract('ms', 1);
      },
      isAfter: function (a, b) {
        return b = 'undefined' != typeof b ? b : 'millisecond', +this.clone().startOf(b) > +bb(a).startOf(b);
      },
      isBefore: function (a, b) {
        return b = 'undefined' != typeof b ? b : 'millisecond', +this.clone().startOf(b) < +bb(a).startOf(b);
      },
      isSame: function (a, b) {
        return b = 'undefined' != typeof b ? b : 'millisecond', +this.clone().startOf(b) === +bb(a).startOf(b);
      },
      min: function (a) {
        return a = bb.apply(null, arguments), this > a ? this : a;
      },
      max: function (a) {
        return a = bb.apply(null, arguments), a > this ? this : a;
      },
      zone: function (a) {
        var b = this._offset || 0;
        return null == a ? this._isUTC ? b : this._d.getTimezoneOffset() : ('string' == typeof a && (a = G(a)), Math.abs(a) < 16 && (a = 60 * a), this._offset = a, this._isUTC = !0, b !== a && j(this, bb.duration(b - a, 'm'), 1, !0), this);
      },
      zoneAbbr: function () {
        return this._isUTC ? 'UTC' : '';
      },
      zoneName: function () {
        return this._isUTC ? 'Coordinated Universal Time' : '';
      },
      parseZone: function () {
        return 'string' == typeof this._i && this.zone(this._i), this;
      },
      hasAlignedHourOffset: function (a) {
        return a = a ? bb(a).zone() : 0, 0 === (this.zone() - a) % 60;
      },
      daysInMonth: function () {
        return r(this.year(), this.month());
      },
      dayOfYear: function (a) {
        var b = eb((bb(this).startOf('day') - bb(this).startOf('year')) / 86400000) + 1;
        return null == a ? b : this.add('d', a - b);
      },
      weekYear: function (a) {
        var b = W(this, this.lang()._week.dow, this.lang()._week.doy).year;
        return null == a ? b : this.add('y', a - b);
      },
      isoWeekYear: function (a) {
        var b = W(this, 1, 4).year;
        return null == a ? b : this.add('y', a - b);
      },
      week: function (a) {
        var b = this.lang().week(this);
        return null == a ? b : this.add('d', 7 * (a - b));
      },
      isoWeek: function (a) {
        var b = W(this, 1, 4).week;
        return null == a ? b : this.add('d', 7 * (a - b));
      },
      weekday: function (a) {
        var b = (this.day() + 7 - this.lang()._week.dow) % 7;
        return null == a ? b : this.add('d', a - b);
      },
      isoWeekday: function (a) {
        return null == a ? this.day() || 7 : this.day(this.day() % 7 ? a : a - 7);
      },
      get: function (a) {
        return a = n(a), this[a]();
      },
      set: function (a, b) {
        return a = n(a), 'function' == typeof this[a] && this[a](b), this;
      },
      lang: function (b) {
        return b === a ? this._lang : (this._lang = A(b), this);
      }
    }), cb = 0; cb < Ib.length; cb++)
    Z(Ib[cb].toLowerCase().replace(/s$/, ''), Ib[cb]);
  Z('year', 'FullYear'), bb.fn.days = bb.fn.day, bb.fn.months = bb.fn.month, bb.fn.weeks = bb.fn.week, bb.fn.isoWeeks = bb.fn.isoWeek, bb.fn.toJSON = bb.fn.toISOString, g(bb.duration.fn = f.prototype, {
    _bubble: function () {
      var a, b, c, d, e = this._milliseconds, f = this._days, g = this._months, i = this._data;
      i.milliseconds = e % 1000, a = h(e / 1000), i.seconds = a % 60, b = h(a / 60), i.minutes = b % 60, c = h(b / 60), i.hours = c % 24, f += h(c / 24), i.days = f % 30, g += h(f / 30), i.months = g % 12, d = h(g / 12), i.years = d;
    },
    weeks: function () {
      return h(this.days() / 7);
    },
    valueOf: function () {
      return this._milliseconds + 86400000 * this._days + 2592000000 * (this._months % 12) + 31536000000 * q(this._months / 12);
    },
    humanize: function (a) {
      var b = +this, c = V(b, !a, this.lang());
      return a && (c = this.lang().pastFuture(b, c)), this.lang().postformat(c);
    },
    add: function (a, b) {
      var c = bb.duration(a, b);
      return this._milliseconds += c._milliseconds, this._days += c._days, this._months += c._months, this._bubble(), this;
    },
    subtract: function (a, b) {
      var c = bb.duration(a, b);
      return this._milliseconds -= c._milliseconds, this._days -= c._days, this._months -= c._months, this._bubble(), this;
    },
    get: function (a) {
      return a = n(a), this[a.toLowerCase() + 's']();
    },
    as: function (a) {
      return a = n(a), this['as' + a.charAt(0).toUpperCase() + a.slice(1) + 's']();
    },
    lang: bb.fn.lang,
    toIsoString: function () {
      var a = Math.abs(this.years()), b = Math.abs(this.months()), c = Math.abs(this.days()), d = Math.abs(this.hours()), e = Math.abs(this.minutes()), f = Math.abs(this.seconds() + this.milliseconds() / 1000);
      return this.asSeconds() ? (this.asSeconds() < 0 ? '-' : '') + 'P' + (a ? a + 'Y' : '') + (b ? b + 'M' : '') + (c ? c + 'D' : '') + (d || e || f ? 'T' : '') + (d ? d + 'H' : '') + (e ? e + 'M' : '') + (f ? f + 'S' : '') : 'P0D';
    }
  });
  for (cb in Jb)
    Jb.hasOwnProperty(cb) && (_(cb, Jb[cb]), $(cb.toLowerCase()));
  _('Weeks', 604800000), bb.duration.fn.asMonths = function () {
    return (+this - 31536000000 * this.years()) / 2592000000 + 12 * this.years();
  }, bb.lang('en', {
    ordinal: function (a) {
      var b = a % 10, c = 1 === q(a % 100 / 10) ? 'th' : 1 === b ? 'st' : 2 === b ? 'nd' : 3 === b ? 'rd' : 'th';
      return a + c;
    }
  }), nb ? (module.exports = bb, ab(!0)) : 'function' == typeof define && define.amd ? define('moment', function (b, c, d) {
    return d.config().noGlobal !== !0 && ab(d.config().noGlobal === a), bb;
  }) : ab();
}.call(this));
(function (angular, assetPath) {
  'use strict';
  var app = angular.module('fsDashboard', ['d3']);
  app.config([
    '$routeProvider',
    '$locationProvider',
    function ($routeProvider, $locationProvider) {
      $routeProvider.when('/', {
        templateUrl: assetPath + 'templates/dashboard.html',
        controller: 'IndexCtrl'
      }).when('/app/:name', {
        templateUrl: assetPath + 'templates/details.html',
        controller: 'AppDetailsCtrl'
      }).when('/app/:name/uptime', {
        templateUrl: assetPath + 'templates/details.html',
        controller: 'AppDetailsCtrl'
      }).when('/performance/:name', {
        templateUrl: assetPath + 'templates/performance.html',
        controller: 'AppPerformanceCtrl'
      }).when('/service/:name', {
        templateUrl: assetPath + 'templates/details.html',
        controller: 'ServiceDetailsCtrl'
      }).when('/upstream/:name', {
        templateUrl: assetPath + 'templates/details.html',
        controller: 'UpstreamDetailsCtrl'
      }).when('/change', {
        templateUrl: assetPath + 'templates/change_log.html',
        controller: 'ChangeLogCtrl'
      });  // $locationProvider.html5Mode(true);
    }
  ]);
}(window.angular, window.assetPath));
/**
 * This file is used to configure this app with HTML5
 * pushState when the environment PUSH_STATE is turned on
 */
(function (angular) {
  'use strict';
  var app = angular.module('fsDashboard');
  app.config([
    '$locationProvider',
    function ($locationProvider) {
      $locationProvider.html5Mode(true);
    }
  ]);
}(window.angular));
(function (angular, $, moment) {
  'use strict';
  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard'), bindHistory = function ($scope, parentSetCurrent) {
      function setCurrent(item) {
        if ($scope.current)
          $scope.current.isActive = false;
        item.isActive = true;
        parentSetCurrent(item);
      }
      $scope.locked = false;
      $scope.mouseIn = function (item) {
        if ($scope.locked)
          return;
        $scope.isHistorying = true;
        setCurrent(item);
      };
      $scope.clickCurrent = function (item) {
        setCurrent(item);
        $scope.locked = true;
      };
      $scope.mouseGone = function () {
        if ($scope.locked)
          return;
        reset();
      };
      $scope.reset = reset;
      function reset() {
        setCurrent($scope.history[0]);
        $scope.isHistorying = false;
        $scope.locked = false;  // setCurrent($scope.history[0]);
                                // $('.history_timeline label').eq(0).trigger('reset');
      }
      $(document).off('keydown').on('keydown', function ($evt) {
        if (!$scope.locked || $evt.which !== 27)
          return;
        $scope.$apply(reset);
      });
    }, reload;
  function resetPage($rootScope) {
    $rootScope.forceDesktop = window.forceDesktop;
    $rootScope.hash = window.location.hash;
    window.clearTimeout(reload);
  }
  function statusToClass(status) {
    return {
      'green': 'success',
      'good': 'success',
      'yellow': 'warning',
      'warning': 'warning',
      'slow': 'warning',
      'red': 'danger',
      'blue': 'danger',
      'down': 'danger'
    }[status] || 'default';
  }
  function classToGlyph(bsClass) {
    var map = {
        'success': 'ok-sign',
        'warning': 'warning-sign',
        'danger': 'minus-sign',
        'default': 'question-sign'
      };
    return 'glyphicon-' + map[bsClass];
  }
  app.controller('IndexCtrl', [
    '$rootScope',
    '$scope',
    '$q',
    'dashService',
    function IndexCtrl($rootScope, $scope, $q, service) {
      resetPage($rootScope);
      $rootScope.refresh = load;
      $rootScope.pageType = 'index';
      $scope.loading = {
        'upstream': true,
        'app': true,
        'services': true
      };
      $scope.upstreamList = [];
      $scope.appList = [];
      $scope.serviceList = [];
      function load() {
        var dfds = [
            service.upstream.index(),
            service.app.index(),
            service.service.index()
          ];
        $rootScope.updated = {};
        // Load all Upstream data
        dfds[0].then(function (upstreamList) {
          $scope.upstreamList = upstreamList;
          $scope.loading.upstream = false;
          if (upstreamList[0]) {
            $rootScope.updated = { formatted: moment(upstreamList[0].created_at).format('h:mm a') };
          }
        });
        // Load all app data
        dfds[1].then(function (appList) {
          $scope.appList = appList;
          $scope.loading.app = false;
        });
        // Load all Service data
        dfds[2].then(function (serviceList) {
          $scope.serviceList = serviceList;
          $scope.loading.services = false;
        });
        // Ready reload of data after 60s
        $q.all(dfds).then(function () {
          reload = window.setTimeout(load, 60000);
        });
      }
      load();
    }
  ]);
  app.controller('UpstreamDetailsCtrl', [
    '$rootScope',
    '$scope',
    '$routeParams',
    'dashService',
    function UpstreamDetailsCtrl($rootScope, $scope, $routeParams, service) {
      resetPage($rootScope);
      var name = $routeParams.name;
      $rootScope.refresh = load;
      $rootScope.pageType = 'upstream';
      $scope.pageTitle = name + ' Status';
      if (name === 'HA Proxy')
        setFeatures($scope, [
          'hasThroughput',
          'hasErrorRate',
          'hasStatus'
        ]);
      if (name.match('Heroku'))
        setFeatures($scope, ['hasIssues']);
      $scope.loading = { 'main': true };
      function load() {
        $rootScope.updated = {};
        service.upstream.details(name).then(function (upstreamList) {
          var current = upstreamList[0];
          setCurrent(current);
          $rootScope.updated = { formatted: moment(current.created_at).format('h:mm a') };
          $scope.history = upstreamList;
          $scope.loading.main = false;
          reload = window.setTimeout(load, 60000);
        });
      }
      load();
      bindHistory($scope, setCurrent);
      function setCurrent(current) {
        var updated = moment(current.created_at), status = current.status, statusClass = statusToClass(status);
        $scope.current = current;
        $scope.updated = {
          formatted: updated.format('h:mm a'),
          delta: updated.fromNow()
        };
        $scope.status = status;
        $scope.codes = current.meta.codes;
        $scope.error_rate = current.meta.error_rate;
        $scope.statusClass = statusClass;
        $scope.glyph = classToGlyph(statusClass);
        $scope.issues = current.meta.issues;
      }
    }
  ]);
  app.controller('AppDetailsCtrl', [
    '$rootScope',
    '$scope',
    '$routeParams',
    '$location',
    '$q',
    'dashService',
    function AppDetailsCtrl($rootScope, $scope, $routeParams, $location, $q, service) {
      resetPage($rootScope);
      var name = $routeParams.name;
      $scope.appName = name;
      $rootScope.refresh = load;
      $rootScope.pageType = 'app';
      $scope.pageTitle = name + ' Status';
      setFeatures($scope, [
        'hasThroughput',
        'hasRespTime',
        'hasMemory',
        'hasErrorRate',
        'hasStatus',
        'isHeroku',
        'hasServices',
        'hasEvents',
        'hasPeformanceTabs'
      ]);
      $scope.loading = {
        'main': true,
        'services': true,
        'events': true
      };
      $scope.goToService = function (name) {
        $location.path('/service/' + encodeURIComponent(name));
      };
      function load() {
        var dfds = [
            service.app.details(name),
            service.service.app(name),
            service.change.app(name)
          ];
        $rootScope.updated = {};
        // Load all of the app data
        dfds[0].then(function (appList) {
          var current = appList[0];
          setCurrent(current);
          $scope.history = appList;
          $scope.loading.main = false;
        });
        // Load the dependent services
        dfds[1].then(function (serviceList) {
          $scope.services = serviceList;
          $scope.loading.services = false;
        });
        // Load the events
        dfds[2].then(function (eventList) {
          $scope.events = eventList;
          $scope.loading.events = false;
        });
        // Trigger reload of data after 60s
        $q.all(dfds).then(function () {
          reload = window.setTimeout(load, 60000);
        });
      }
      load();
      bindHistory($scope, setCurrent);
      function setCurrent(current) {
        var status = current.status, statusClass = statusToClass(status);
        if (!current.app) {
          current.app = {
            codes: {
              '2xx': null,
              '3xx': null,
              '4xx': null,
              '5xx': null
            },
            memory: null,
            time: { p95: null },
            error_rate: null,
            app_errors: null
          };
        }
        $scope.current = current;
        $scope.codes = current.app.codes;
        $scope.memory = current.app.memory;
        $scope.time = current.app.time;
        $scope.error_rate = current.app.error_rate;
        $scope.errors = current.app_errors;
        $rootScope.updated = getTime(current.bucket_time);
        $scope.status = status;
        $scope.statusClass = statusClass;
        $scope.glyph = classToGlyph(statusClass);
      }
      function getTime(time) {
        var updated = moment(time);
        return {
          formatted: updated.format('h:mm a'),
          delta: updated.fromNow()
        };
      }
    }
  ]);
  app.controller('AppPerformanceCtrl', [
    '$rootScope',
    '$scope',
    '$routeParams',
    '$location',
    '$q',
    'dashService',
    function AppPerformanceCtrl($rootScope, $scope, $routeParams, $location, $q, service) {
      resetPage($rootScope);
      var name = $routeParams.name;
      // Search all start with search-
      if (name.indexOf('search-') === 0)
        name = 'search';
      $scope.appName = name;
      $rootScope.refresh = load;
      $rootScope.pageType = 'performance';
      $scope.pageTitle = name + ' Performance';
      setFeatures($scope, [
        'hasPerformance',
        'hasPeformanceTabs'
      ]);
      $scope.loading = { 'main': true };
      function load() {
        var dfds = [
            service.performance.details(name),
            service.performance.graph(name),
            service.performance.pages(name)
          ];
        dfds[0].then(function (perfList) {
          window.clearTimeout(reload);
          $rootScope.updated = getTime(perfList[0].created_at);
          var graphData = [
              {
                name: 'p95',
                data: []
              },
              {
                name: 'p50',
                data: []
              }
            ], dataMap = {
              p95: graphData[0].data,
              p50: graphData[1].data
            };
          perfList.map(function (item) {
            // var date = moment(new Date(item.created_at))
            var date = new Date(item.created_at).getTime() / 1000 - tzOffset;
            // var date = item.created_at;
            dataMap.p95.unshift({
              label: 'p95',
              x: date,
              y: Number(item.meta.p95)
            });
            dataMap.p50.unshift({
              label: 'p50',
              x: date,
              y: Number(item.meta.p50)
            });
          });
          $scope.pageReadyGraph = { graphData: graphData };
        });
        dfds[1].then(function (histData) {
          var meta = histData.meta;
          histData.graphData = [];
          for (var k in meta) {
            if (!meta.hasOwnProperty(k))
              continue;
            histData.graphData.push({
              label: k + 'ms',
              x: Number(k.split('-')[1]),
              y: Number(meta[k])
            });
          }
          $scope.histogramGraph = histData;
          $scope.histData = histData;
        });
        dfds[2].then(function (pageData) {
          if (!pageData)
            return;
          $scope.pageData = pageData.meta.pages;
        });
        $q.all(dfds).then(function () {
          reload = window.setTimeout(load, 60000);
        });
      }
      load();
      function getTime(time) {
        var updated = moment(time);
        return {
          formatted: updated.format('h:mm a'),
          delta: updated.fromNow()
        };
      }
    }
  ]);
  app.controller('ServiceDetailsCtrl', [
    '$rootScope',
    '$scope',
    '$routeParams',
    'dashService',
    function ServiceDetailsCtrl($rootScope, $scope, $routeParams, service) {
      resetPage($rootScope);
      var name = $routeParams.name;
      $rootScope.refresh = load;
      $rootScope.pageType = 'service';
      $scope.pageTitle = name + ' Status';
      setFeatures($scope, [
        'hasThroughput',
        'hasRespTime',
        'hasErrorRate',
        'hasStatus'
      ]);
      $scope.loading = { 'main': true };
      function load() {
        $rootScope.updated = {};
        service.service.details(name).then(function (serviceList) {
          var current = serviceList[0];
          setCurrent(current);
          $scope.history = serviceList;
          $scope.loading.main = false;
          reload = window.setTimeout(load, 60000);
        });
      }
      load();
      bindHistory($scope, setCurrent);
      function setCurrent(current) {
        if (!current)
          return;
        var status = current.status, statusClass = statusToClass(status);
        $scope.current = current;
        $rootScope.updated = getTime(current.created_at);
        $scope.status = status;
        $scope.codes = current.codes;
        $scope.time = current.time;
        $scope.error_rate = current.error_rate;
        $scope.statusClass = statusClass;
        $scope.glyph = classToGlyph(statusClass);
      }
      function getTime(timestamp) {
        var updated = moment(timestamp);
        return {
          formatted: updated.format('h:mm a'),
          delta: updated.fromNow()
        };
      }
    }
  ]);
  app.controller('ChangeLogCtrl', [
    '$rootScope',
    '$scope',
    'dashService',
    'changeService',
    function ChangeLogCtrl($rootScope, $scope, service, changeService) {
      resetPage($rootScope);
      $rootScope.pageType = 'change_log';
      $rootScope.refresh = load;
      $scope.loading = { 'main': true };
      var last_id, ONE_HOUR = 60 * 60 * 1000, now = Date.now(), times = {
          '1hr': now - ONE_HOUR,
          '3hr': now - ONE_HOUR * 3,
          '6hr': now - ONE_HOUR * 6,
          '1d': now - ONE_HOUR * 24
        };
      function load() {
        $rootScope.updated = {};
        service.change.index().then(function (eventList) {
          if (typeof eventList === 'string') {
            $scope.loading.main = 'failed';
            return;
          }
          $scope.events = eventList;
          $scope.loading.events = false;
          last_id = eventList[eventList.length - 1]._id;
          reload = window.setTimeout(load, 60000);
          $rootScope.updated = { formatted: moment(eventList[0].created_at).format('h:mm a') };
          $scope.loading.main = false;
        });
        changeService.repos().then(function (repos) {
          $scope.repos = repos.sort();
        });
        changeService.types().then(function (types) {
          $scope.types = types.sort();
        });
        setFilterTimes();
      }
      load();
      function setFilterTimes() {
        now = Date.now();
        times = {
          '1hr': now - ONE_HOUR,
          '3hr': now - ONE_HOUR * 3,
          '6hr': now - ONE_HOUR * 6,
          '1d': now - ONE_HOUR * 24
        };
      }
      $scope.timeFilter = function (obj) {
        var range = times[$scope.timeSearch], stamp = obj.timestamp;
        if (!stamp) {
          stamp = new Date(obj.created_at).getTime();
          // Cache the timestamp
          // This makes each one process twice initially
          // because it triggers change
          // Is that worth it?
          obj.timestamp = stamp;
          return true;
        }
        if (!range)
          return true;
        return stamp > range;
      };
    }
  ]);
  function setFeatures($scope, list) {
    var i, l;
    for (i = 0, l = list.length; i < l; i++) {
      $scope[list[i]] = true;
    }
  }
  var tzOffset = new Date().getTimezoneOffset() * 60;
}(window.angular, window.jQuery, window.moment));
(function (angular, assetPath, moment, $) {
  'use strict';
  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard'), statusToClass = function (status) {
      return {
        'green': 'success',
        'good': 'success',
        'yellow': 'warning',
        'warning': 'warning',
        'slow': 'warning',
        'red': 'danger',
        'blue': 'danger',
        'down': 'danger'
      }[status] || 'default';
    }, statusToColor = function (status) {
      return {
        'green': '#5CB85C',
        'good': '#5CB85C',
        'yellow': '#F0AD4E',
        'warning': '#F0AD4E',
        'slow': '#F0AD4E',
        'red': '#D9534F',
        'blue': '#D9534F',
        'down': '#D9534F'
      }[status] || '#CCC';
    };
  app.directive('historyItem', function () {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        var item = scope.item;
        var SHADE_MAGNITUDE = -3 / 5, percent = null, currentColor = null, newColor = null;
        //Calculate the percent based upon the p95 response time
        if (item.app) {
          percent = Math.floor(item.app.time.p95 / 100);
        } else if (item.time) {
          percent = Math.floor(item.time.p95 / 100);
        }
        //Determine and set new color
        // currentColor = statusToColor(item.status);
        // newColor = shadeColor(currentColor, percent);
        // $(element).css('background-color', newColor);
        //Shade the color with a magnitude of SHADE_MAGNITUDE by shifting bits
        //Based upon: http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color
        function shadeColor(color, percent) {
          var num = parseInt(color.slice(1), 16), amt = Math.round(SHADE_MAGNITUDE * percent), R = (num >> 16) + amt, B = (num >> 8 & 255) + amt, G = (num & 255) + amt;
          var newColor = '#' + (16777216 + (R < 255 ? R < 1 ? 0 : R : 255) * 65536 + (B < 255 ? B < 1 ? 0 : B : 255) * 256 + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
          return newColor;
        }
        scope.mouseIn = function () {
          scope.$parent.mouseIn(item);
        };
        scope.clack = function () {
          scope.$parent.clickCurrent(item);
        };
        scope.mouseGone = function () {
          scope.$parent.mouseGone();
        };
        scope.className = 'label-' + statusToClass(item.status);
      }
    };
  });
  app.directive('eventItem', function () {
    return {
      restrict: 'A',
      templateUrl: assetPath + 'templates/directives/eventItem.html',
      replace: true,
      link: function (scope, element, attrs) {
        var event = scope.event, action = event.action, msgMap = {
            'build': 'Successfully built and deployed.',
            'merge': event.meta && event.meta.message || '',
            'restart': event.meta && 'Auto-restarted: ' + event.meta.reason,
            'restart.not_configured': event.meta && 'Auto-restarted: ' + event.meta.reason,
            'status.change': event.meta && event.meta.reason
          }, date = moment(event.created_at);
        scope.src = event.src;
        scope.msg = msgMap[action];
        scope.time = {
          delta: date.fromNow(),
          formatted: date.format('h:mm a [on] MMM Do YYYY')
        };
      }
    };
  });
  app.directive('statusBtn', [
    '$location',
    function ($location) {
      return {
        restrict: 'A',
        replace: true,
        scope: true,
        templateUrl: assetPath + 'templates/directives/statusBtn.html',
        link: function (scope, element, attrs) {
          var item = scope.item, type = attrs.statusType, name = getName(), shortName = name.length > 36 ? name.substr(0, 33) + '...' : name, status = getStatus(), glyphs = {
              'success': 'ok-sign',
              'warning': 'warning-sign',
              'danger': 'minus-sign',
              'default': 'question-sign'
            };
          element.addClass('col-sm-' + (Math.ceil(shortName.length / 7) + 1)).addClass('col-md-' + (Math.ceil(shortName.length / 10) + 1)).addClass('btn-' + status).bind('click', goTo);
          scope.shortName = shortName;
          if (shortName !== name)
            scope.name = name;
          scope.glyph = 'glyphicon-' + glyphs[status] || 'question-sign';
          function getName() {
            if (item.repo_name)
              return item.repo_name;
            if (item.app && item.app.repo_name)
              return item.app.repo_name;
            if (item.app_errors && item.app_errors.repo_name)
              return item.app_errors.repo_name;
            return item.name;
          }
          function getStatus() {
            return statusToClass(item.status);
          }
          function goTo() {
            scope.$apply(function () {
              $location.path('/' + type + '/' + name);
            });
          }
        }
      };
    }
  ]);
  app.directive('loading', [function () {
      return {
        restrict: 'E',
        template: '<div class="loadingStatus"></div>',
        replace: true,
        scope: { status: '=status' },
        link: function (scope, element, attrs) {
          var interval, msgs = [
              'Locating the required gigapixels to render',
              'Spinning up the hamster',
              'Shovelling coal into the server',
              'Programming the flux capacitor',
              '640K ought to be enough for anybody',
              'Would you prefer chicken, steak, or tofu?',
              'Pay no attention to the man behind the curtain',
              'Would you like fries with that?',
              'Checking the gravitational constant in your locale',
              'At least you\'re not on hold',
              'The server is powered by a lemon and two electrodes',
              'We love you just the way you are',
              'Take a moment to sign up for our lovely prizes',
              'Don\'t think of purple hippos',
              'Wait while the satellite moves into position',
              'It\'s still faster than you could draw it',
              'My other load screen is much faster. You should try that one instead.',
              'The version I have of this in testing has much funnier load screens',
              'Loading humorous message',
              'Warming up Large Hadron Collider',
              'The magic elves are working frantically in here',
              'Happy Elf and Sad Elf are talking about your data',
              'All the relevant elves are on break',
              'Elf down! We\'re cloning the elf that was supposed to get you the data',
              'Time is an illusion. Loading time doubly so',
              'Are we there yet?',
              'Please insert 25\xa2',
              'Hang on a sec, I know your data is here somewhere',
              'HELP!, I\'m being held hostage, and forced to write the stupid lines!',
              'Searching for Answer to Life, the Universe, and Everything',
              'Waiting for the system admin to hit enter',
              'Paging for the system admin',
              'Warming up the processors',
              'RE-calibrating the internet',
              'We apologise for the fault in the subtitles. Those responsible have been sacked',
              'Counting backwards from infinity',
              'Scanning your hard drive for credit card details. Please be patient',
              'Don\'t panic',
              'Loading the loading message',
              'Potent potables',
              'Reticulating Splines'
            ];
          scope.$watch('status', function (newVal, oldVal) {
            if (newVal === false)
              window.clearInterval(interval);
            if (newVal === 'failed') {
              window.clearInterval(interval);
              element.html('Query failed... Please try again');
            }
          });
          interval = window.setInterval(function () {
            var msg = msgs[Math.round(Math.random() * (msgs.length - 1))];
            element.text(msg + '...');  // element.html(element.html() + '<br />' + msg + '...');
          }, 1500);
          element.text('Loading...');
        }
      };
    }]);
  app.directive('detailTabs', [
    '$location',
    function ($location) {
      return {
        restrict: 'A',
        replace: true,
        scope: true,
        templateUrl: assetPath + 'templates/directives/detailTabs.html',
        link: function (scope, element, attrs) {
          var typeMap = {
              app: 'uptime',
              performance: 'performance'
            }, active = typeMap[scope.pageType];
          if (!active)
            return;
          element.find('.' + active).addClass('active');
          element.on('click', 'a', function (evt) {
            var $this = $(this);
            evt.preventDefault();
            evt.stopPropagation();
            if ($this.parent().hasClass('active'))
              return;
            scope.$apply(function () {
              $location.path($this.attr('href'));
            });
          });
        }
      };
    }
  ]);
}(window.angular, window.assetPath, window.moment, window.jQuery));
(function (angular, mountPath) {
  'use strict';
  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard'), ENDPOINT = mountPath + 'api/';
  app.factory('httpInterceptors', [
    '$location',
    function ($location) {
      return function (promise) {
        return promise.then(function (response) {
          if (response.status > 399) {
            return promise.reject(response);
          }
          return response;
        }, function (response) {
          return response;
        });
      };
    }
  ]);
  app.config([
    '$httpProvider',
    function ($httpProvider) {
      $httpProvider.responseInterceptors.push('httpInterceptors');
    }
  ]);
  app.factory('changeService', [
    '$http',
    '$q',
    function ($http, $q) {
      return {
        repos: getRepos,
        types: getTypes
      };
      function getRepos() {
        var dfd = $q.defer();
        $http.get(ENDPOINT + 'change/repos').success(dfd.resolve).error(dfd.reject);
        return dfd.promise;
      }
      function getTypes() {
        var dfd = $q.defer();
        $http.get(ENDPOINT + 'change/types').success(dfd.resolve).error(dfd.reject);
        return dfd.promise;
      }
    }
  ]);
  app.factory('dashService', [
    '$http',
    '$q',
    function ($http, $q) {
      var app = restify('app', [
          'index',
          'details'
        ]), service = restify('service', [
          'index',
          'details',
          'app'
        ]), upstream = restify('upstream', [
          'index',
          'details'
        ]), change = restify('change', [
          'index',
          'app'
        ]), performance = restify('performance', [
          'details',
          'graph',
          'pages'
        ]);
      return {
        app: app,
        service: service,
        upstream: upstream,
        change: change,
        performance: performance
      };
      function restify(type, list) {
        var _type = type, getters = {
            index: getData(),
            details: getData('/'),
            app: getData('/app/'),
            graph: getData('/histogram/'),
            pages: getData('/pages/')
          }, i, l, obj = {};
        for (i = 0, l = list.length; i < l; i++) {
          obj[list[i]] = getters[list[i]];
        }
        return obj;
        function getIndex() {
          var dfd = $q.defer();
          $http.get(ENDPOINT + _type).success(dfd.resolve).error(dfd.reject);
          return dfd.promise;
        }
        function getData(path) {
          return function (name) {
            var dfd = $q.defer(), url = ENDPOINT + _type;
            if (path)
              url += path;
            if (name)
              url += encodeURIComponent(name);
            $http.get(url).success(dfd.resolve).error(dfd.reject);
            return dfd.promise;
          };
        }
      }
    }
  ]);
}(window.angular, window.assetPath));
(function (angular, assetPath) {
  'use strict';
  var module = angular.module('d3', []);
  module.factory('d3Service', [
    '$document',
    '$q',
    '$rootScope',
    function ($document, $q, $rootScope) {
      var dfd = $q.defer();
      var scripts = [
          assetPath + 'vendor/d3.v3.min.js',
          assetPath + 'vendor/rickshaw.min.js'
        ];
      var dfds = scripts.map(function (path) {
          var dfd = $q.defer(), scriptTag = $document[0].createElement('script');
          scriptTag.type = 'text/javascript';
          scriptTag.async = true;
          scriptTag.src = path;
          scriptTag.onreadystatechange = function () {
            if (this.readyState == 'complete')
              dfd.resolve();
          };
          scriptTag.onload = function () {
            dfd.resolve();
          };
          var s = $document[0].getElementsByTagName('body')[0];
          s.appendChild(scriptTag);
          return dfd.promise;
        });
      $q.all(dfds).then(function allReady() {
        // Load client in the browser
        window.Rickshaw.namespace('Rickshaw.Graph.Renderer.UnstackedArea');
        window.Rickshaw.Graph.Renderer.UnstackedArea = window.Rickshaw.Class.create(window.Rickshaw.Graph.Renderer.Area, {
          name: 'unstackedarea',
          defaults: function ($super) {
            return window.Rickshaw.extend($super(), {
              unstack: true,
              fill: false,
              stroke: false
            });
          }
        });
        dfd.resolve([
          window.d3,
          window.Rickshaw
        ]);
      });
      return dfd.promise;
    }
  ]);
}(window.angular, window.assetPath));
(function (angular, $, moment) {
  'use strict';
  // No [] here to make sure we're getting and not creating
  var app = angular.module('fsDashboard');
  // This is the new d3 Directive.
  // This is where all new graphs should go
  app.directive('fsGraph', [
    'd3Service',
    function (d3Service) {
      return { link: link };
      function link(scope, element, attrs) {
        d3Service.then(function (results) {
          var d3 = results[0], Rickshaw = results[1], el = element[0];
          var config = element.data('fsGraph');
          scope.$watch(config.data, function (newValue) {
            if (!newValue)
              return;
            scope.hasGraphs = true;
            render(newValue.graphData, null, config);
          });
          element.append('<h3 class="graph-title">' + config.title + '</h3>');
          function render(data, events, config) {
            if (!data)
              return;
            element.find('.inner-graph, .anotations').remove();
            var $el = $('<div class="inner-graph"></div>').appendTo(element), $an = $('<div class="anotations"></div>').appendTo(element);
            var max = config.max || 0, yMax = 0, palette = new Rickshaw.Color.Palette({ scheme: 'spectrum14' });
            palette.color();
            // To skip to the slightly lighter color
            if (config.multiSeries) {
              data.reverse().map(function (item) {
                item.color = palette.color();
                var max = d3.max(item.data, function (d) {
                    return d.y;
                  });
                if (max > yMax)
                  yMax = max;
              });
            } else {
              yMax = d3.max(data, function (d) {
                return d.y;
              });
            }
            if (max > yMax)
              yMax = max;
            yMax *= 1.25;
            var graphConfig = {
                element: $el[0],
                width: $el[0].offsetWidth,
                height: config.height || 60,
                renderer: 'unstackedarea',
                stroke: true
              };
            if (!config.multiSeries) {
              graphConfig.series = [{
                  color: config.color || '#cae2f7',
                  name: config.label,
                  data: data
                }];
            } else {
              graphConfig.series = data.reverse();
            }
            $el.empty();
            var graph = new Rickshaw.Graph(graphConfig);
            graph.configure({ max: yMax });
            graph.render();
            var hoverConfig = {
                graph: graph,
                formatter: function (series, x, y, formattedX, formattedY, d) {
                  var suffix = config.suffix || '', prefix = d.value.label + ': ' || config.prefix || '';
                  return prefix + y.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
                }
              };
            if (config.multiSeries) {
              hoverConfig.xFormatter = function (seconds) {
                var tzOffset = new Date().getTimezoneOffset() * 60, time = moment.unix(seconds + tzOffset), times = {
                    formatted: time.format('h:mm a'),
                    delta: time.fromNow()
                  };
                return times.formatted + ' (' + times.delta + ')';
              };
            }
            var hoverDetail = new Rickshaw.Graph.HoverDetail(hoverConfig);
            var yAxis = new Rickshaw.Graph.Axis.Y({
                graph: graph,
                ticks: 3,
                tickFormat: Rickshaw.Fixtures.Number.formatKMBT
              });
            var xConfig = { graph: graph };
            var xAxis;
            var graphType = config.type || 'Time', xAxis = new Rickshaw.Graph.Axis[graphType](xConfig);
            xAxis.render();
            yAxis.render();
          }
        });
      }
    }
  ]);
  // This is the old d3 directive. Most graphs use this
  // TODO: Migrate to fsGraph directive and deprecate
  app.directive('uptimeGraphRickshaw', [
    '$window',
    'd3Service',
    function ($window, d3Service) {
      return { link: link };
      function link(scope, element, attrs) {
        if (!$(element).is(':visible'))
          return;
        var graphNames = [];
        if (scope.hasThroughput)
          graphNames.push('tPut');
        if (scope.hasRespTime)
          graphNames = graphNames.concat([
            'time',
            'time95',
            'time50'
          ]);
        if (scope.hasRespTime)
          graphNames.push('tPut');
        if (scope.hasErrorRate)
          graphNames.push('errRate');
        if (scope.hasMemory)
          graphNames.push('mem');
        if (scope.hasPerformance)
          graphNames = graphNames.concat([
            'pageReady',
            'pageReady95',
            'pageReady50'
          ]);
        if (!graphNames.length)
          return;
        scope.hasGraphs = true;
        d3Service.then(d3Handler);
        function d3Handler(results) {
          var d3 = results[0], Rickshaw = results[1], el = element[0], titles = {
              errRate: 'Error Rate (%)',
              mem: 'Memory Usage (MB)',
              time: 'Response Time (ms)',
              time95: 'p95',
              time50: 'p50',
              tPut: 'Requests (/5min)',
              pageReady: 'RUM Page Ready'
            }, colors = {
              tPut: '#ABD9AB',
              errRate: '#D9534F',
              pageReady95: '#ABD9AB',
              pageReady50: '#ABD9AB'
            }, labels = {
              errRate: 'Err',
              mem: 'Mem',
              time: 'Response Time',
              time95: 'p95',
              time50: 'p50',
              tPut: 'Req',
              pageReady95: 'p95',
              pageReady50: 'p50'
            }, suffixes = {
              errRate: '%',
              mem: 'MB',
              time: 'ms',
              time95: 'ms',
              time50: 'ms',
              tPut: 'req',
              pageReady95: 'ms',
              pageReady50: 'ms'
            }, heights = { time: 200 }, maxes = {
              errRate: 10,
              mem: 512,
              time: 5000,
              time95: 5000,
              time50: 5000
            }, graphs = {}, tzOffset = new Date().getTimezoneOffset() * 60;
          if (scope.pageType === 'service')
            maxes.time = 1000;
          Rickshaw.namespace('Rickshaw.Graph.Renderer.UnstackedArea');
          Rickshaw.Graph.Renderer.UnstackedArea = Rickshaw.Class.create(Rickshaw.Graph.Renderer.Area, {
            name: 'unstackedarea',
            defaults: function ($super) {
              return Rickshaw.extend($super(), {
                unstack: true,
                fill: false,
                stroke: false
              });
            }
          });
          scope.$watch('history.length', function () {
            render(scope.history, scope.events || []);
          });
          function render(history, events) {
            if (!history)
              return;
            var data = {};
            history.map(function (bucket, i) {
              var selections = {
                  app: bucket.app,
                  upstream: bucket.meta,
                  service: bucket,
                  performance: bucket.meta
                };
              var app = selections[scope.pageType] || {
                  time: {},
                  memory: {}
                };
              var datum = {}, date = new Date(bucket.created_at || app.created_at || bucket.bucket_time || bucket.app_errors.created_at);
              datum.date = date.getTime() / 1000 - tzOffset;
              if (graphNames.indexOf('tPut') !== -1)
                datum.tPut = app.codes && app.codes.total || 0;
              if (graphNames.indexOf('errRate') !== -1)
                datum.errRate = app.error_rate || 0;
              if (graphNames.indexOf('mem') !== -1)
                datum.mem = app.memory.avg || 0;
              if (graphNames.indexOf('time') !== -1) {
                datum.time95 = app.time.p95 || 0;
                // datum.time75 = app.time.p75 || 0;
                datum.time50 = app.time.p50 || 0;
              }
              if (graphNames.indexOf('pageReady95') !== -1)
                datum.pageReady95 = app.p95;
              if (graphNames.indexOf('pageReady50') !== -1)
                datum.pageReady50 = app.p50;
              graphNames.map(function (name) {
                if ([
                    'time',
                    'pageReady'
                  ].indexOf(name) !== -1)
                  return;
                if (typeof data[name] === 'undefined')
                  data[name] = [];
                if (typeof datum[name] === 'string')
                  datum[name] = parseInt(datum[name], 10) || 0;
                data[name].unshift({
                  x: datum.date,
                  y: datum[name]
                });
              });
              return data;
            });
            graphNames.map(function (name) {
              if ([
                  'time95',
                  'time75',
                  'time50',
                  'pageReady95',
                  'pageReady50'
                ].indexOf(name) !== -1)
                return;
              var max = maxes[name], palette = new Rickshaw.Color.Palette({ scheme: 'spectrum14' }), $container, $el, $an, datum, yMax, graph, hoverDetail, xAxis, yAxis;
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
                [
                  'time95',
                  'time50'
                ].map(function (t) {
                  var max = d3.max(data[t], function (d) {
                      return d.y;
                    });
                  if (max > yMax)
                    yMax = max;
                });
              } else if (name === 'pageReady') {
                yMax = 0;
                [
                  'pageReady95',
                  'pageReady50'
                ].map(function (t) {
                  var max = d3.max(data[t], function (d) {
                      return d.y;
                    });
                  if (max > yMax)
                    yMax = max;
                });
              } else {
                datum = data[name];
                max = maxes[name];
                yMax = d3.max(datum, function (d) {
                  return d.y;
                });
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
                    name: labels.time95,
                    data: data.time95
                  },
                  {
                    name: labels.time50,
                    data: data.time50
                  }
                ];
                // Reverse the colors
                // config.series[2].color = palette.color();
                palette.color();
                // To skip to the slightly lighter color
                config.series[1].color = palette.color();
                config.series[0].color = palette.color();
              } else if (name === 'pageReady') {
                config.series = [
                  {
                    name: labels.pageReady95,
                    data: data.pageReady95
                  },
                  {
                    name: labels.pageReady50,
                    data: data.pageReady50
                  }
                ];
                // Reverse the colors
                // config.series[2].color = palette.color();
                palette.color();
                // To skip to the slightly lighter color
                config.series[1].color = palette.color();
                config.series[0].color = palette.color();
              } else {
                config.series = [{
                    color: colors[name] || '#cae2f7',
                    name: labels[name],
                    data: datum
                  }];
              }
              graph = new Rickshaw.Graph(config);
              graph.configure({ max: yMax });
              graph.render();
              hoverDetail = new Rickshaw.Graph.HoverDetail({
                graph: graph,
                formatter: function (series, x, y, formattedX, formattedY, d) {
                  var suf = suffixes[name] || '', pref = name === 'time' || name === 'pageReady' ? series.name + ': ' : '';
                  return pref + y.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suf;
                },
                xFormatter: function (seconds) {
                  var time = moment.unix(seconds + tzOffset), times = {
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
              events.map(function (event) {
                if (!(event.type === 'jenkins' && event.action === 'build' || event.type === 'electricCommander' && event.action === 'build' || event.type === 'marrow' && /restart/.test(event.action)))
                  return;
                var time = moment(new Date(event.created_at)), times = {
                    formatted: time.format('h:mm a'),
                    delta: time.fromNow()
                  }, message = event.action + ' @ ' + times.formatted;
                annotator.add(new Date(event.created_at).getTime() / 1000 - tzOffset, message);
              });
              annotator.update();
              xAxis = new Rickshaw.Graph.Axis.Time({ graph: graph });
              xAxis.render();
              yAxis = new Rickshaw.Graph.Axis.Y({
                graph: graph,
                ticks: 3,
                tickFormat: Rickshaw.Fixtures.Number.formatKMBT
              });
              yAxis.render();
            });
          }
        }
      }
    }
  ]);
}(window.angular, window.jQuery, window.moment));