(function () {
  var DESKTOP = 990;
  var lastY = window.scrollY;
  var states = new WeakMap();

  function stateFor(info) {
    var state = states.get(info);
    if (!state) {
      state = { resting: null, current: null };
      states.set(info, state);
    }
    return state;
  }

  function restingTop(info) {
    var state = stateFor(info);
    if (state.resting != null) return state.resting;

    var prev = info.style.top;
    info.style.top = '';
    var top = parseFloat(window.getComputedStyle(info).top);
    if (prev) info.style.top = prev;

    state.resting = isNaN(top) ? 0 : top;
    if (state.current == null) state.current = state.resting;
    return state.resting;
  }

  function updateAll(applyDelta) {
    var delta = applyDelta ? window.scrollY - lastY : 0;
    lastY = window.scrollY;

    document.querySelectorAll('.p26__info--sticky').forEach(function (info) {
      var state = stateFor(info);

      if (window.innerWidth < DESKTOP) {
        info.style.top = '';
        state.current = null;
        state.resting = null;
        return;
      }

      var resting = restingTop(info);
      var parent = info.parentElement;
      var height = info.offsetHeight;
      var room = parent ? parent.offsetHeight - height : 0;
      var overflow = height + resting - window.innerHeight;

      if (overflow <= 1 || room <= 1 || !parent) {
        state.current = resting;
        info.style.top = '';
        return;
      }

      var minTop = resting - overflow;
      var releaseTop = parent.getBoundingClientRect().bottom - height;
      var floor = Math.min(minTop, releaseTop);
      var next = (state.current == null ? resting : state.current) - delta;

      if (next < floor) next = floor;
      if (next > resting) next = resting;
      if (next > releaseTop) next = releaseTop;

      state.current = next;
      info.style.top = next + 'px';
    });
  }

  function onScroll() {
    updateAll(true);
  }

  function onResize() {
    document.querySelectorAll('.p26__info--sticky').forEach(function (info) {
      var state = states.get(info);
      if (state) state.resting = null;
    });
    updateAll(false);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  if ('ResizeObserver' in window) {
    var observer = new ResizeObserver(function () {
      updateAll(false);
    });

    function observe() {
      document.querySelectorAll('.p26__info--sticky').forEach(function (info) {
        if (info.dataset.p26StickyObserved === 'true') return;
        info.dataset.p26StickyObserved = 'true';
        observer.observe(info);
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observe);
    } else {
      observe();
    }

    document.addEventListener('shopify:section:load', function () {
      document.querySelectorAll('.p26__info--sticky').forEach(function (info) {
        delete info.dataset.p26StickyObserved;
      });
      observe();
      onResize();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      updateAll(false);
    });
  } else {
    updateAll(false);
  }
})();
