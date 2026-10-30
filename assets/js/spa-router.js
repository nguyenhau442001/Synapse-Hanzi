// assets/js/spa-router.js
// Single Page Application (SPA) History API Router & Navigation Coordinator

const SpaRouter = (function() {
  let isNavigatingFromPopstate = false;
  let hasNavigatedInApp = false;

  function getCurrentUrlState() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('level')) {
      return { view: 'cards', level: params.get('level') };
    }
    if (params.has('tab')) {
      const tab = params.get('tab');
      const story = params.get('story');
      const q = params.get('q');
      return { view: 'tab', tab, story, q };
    }
    if (params.get('screen') === 'today-reviews') {
      return { view: 'todayReviews' };
    }
    if (params.get('screen') === 'radical-cards') {
      return { view: 'radicalCards', mode: params.get('mode') || 'basic50' };
    }
    return { view: 'vocab', subTab: 'level' };
  }

  function formatUrl(state) {
    const base = window.location.pathname;
    let themeParam = '';
    try {
      const t = new URLSearchParams(window.location.search).get('theme');
      if (t === 'light' || t === 'dark') themeParam = `&theme=${t}`;
    } catch (e) {}

    if (!state || state.view === 'vocab') {
      return themeParam ? `${base}?${themeParam.slice(1)}` : base;
    }
    if (state.view === 'cards' && state.level) {
      return `${base}?level=${encodeURIComponent(state.level)}${themeParam}`;
    }
    if (state.view === 'tab' && state.tab && state.tab !== 'vocab') {
      if (state.tab === 'gradedReading' && state.story) {
        return `${base}?tab=gradedReading&story=${encodeURIComponent(state.story)}${themeParam}`;
      }
      if (state.tab === 'reading' && state.q) {
        return `${base}?tab=reading&q=${encodeURIComponent(state.q)}${themeParam}`;
      }
      return `${base}?tab=${encodeURIComponent(state.tab)}${themeParam}`;
    }
    if (state.view === 'todayReviews') {
      return `${base}?screen=today-reviews${themeParam}`;
    }
    if (state.view === 'radicalCards') {
      return `${base}?screen=radical-cards&mode=${encodeURIComponent(state.mode || 'basic50')}${themeParam}`;
    }
    return themeParam ? `${base}?${themeParam.slice(1)}` : base;
  }

  function pushView(state, customUrl = null) {
    if (isNavigatingFromPopstate) return;
    const url = customUrl || formatUrl(state);
    const currentState = window.history.state;
    // Prevent duplicate consecutive entries
    if (
      currentState &&
      currentState.view === state.view &&
      currentState.level === state.level &&
      currentState.tab === state.tab &&
      Boolean(currentState.drawerOpen) === Boolean(state.drawerOpen)
    ) {
      return;
    }
    hasNavigatedInApp = true;
    try {
      window.history.pushState(state, '', url);
    } catch (e) {
      console.warn('SpaRouter: pushState failed', e);
    }
  }

  function replaceView(state, customUrl = null) {
    const url = customUrl || formatUrl(state);
    try {
      window.history.replaceState(state, '', url);
    } catch (e) {
      console.warn('SpaRouter: replaceState failed', e);
    }
  }

  function navigateBack() {
    if (hasNavigatedInApp && window.history.length > 1) {
      window.history.back();
    } else {
      handleFallbackBack();
    }
  }

  function handleFallbackBack() {
    const currentState = window.history.state || getCurrentUrlState();
    if (currentState.drawerOpen) {
      if (typeof closeAllStudyDrawers === 'function') closeAllStudyDrawers();
      replaceView({ ...currentState, drawerOpen: false });
      return;
    }
    if (currentState.view === 'cards') {
      if (typeof goBackToPicker === 'function') goBackToPicker();
      replaceView({ view: 'vocab' });
      return;
    }
    if (currentState.view === 'todayReviews') {
      if (typeof closeTodayReviews === 'function') closeTodayReviews();
      replaceView({ view: 'vocab' });
      return;
    }
    if (currentState.view === 'radicalCards') {
      if (typeof goBackToRadicalHub === 'function') goBackToRadicalHub();
      replaceView({ view: 'tab', tab: 'radicals' });
      return;
    }
    if (currentState.view === 'tab') {
      if (typeof setPrimaryTab === 'function') setPrimaryTab('vocab');
      replaceView({ view: 'vocab' });
      return;
    }
  }

  function onPopState(event) {
    const state = event.state || getCurrentUrlState();
    isNavigatingFromPopstate = true;
    try {
      applyState(state);
    } finally {
      isNavigatingFromPopstate = false;
    }
  }

  function applyState(state) {
    if (!state) return;

    // 1. Handle drawer sub-state if open
    const isDrawerCurrentlyOpen = document.body.classList.contains('study-sidebar-open');
    if (isDrawerCurrentlyOpen && !state.drawerOpen) {
      if (typeof closeAllStudyDrawers === 'function') closeAllStudyDrawers();
      if (state.view === 'cards' && typeof currentLevel !== 'undefined' && currentLevel === state.level) {
        return;
      }
    }

    // 2. Handle main view states
    if (state.view !== 'todayReviews') {
      document.body.classList.remove('today-reviews-focus-mode');
      const todayScreen = document.getElementById('screenTodayReviews');
      if (todayScreen && todayScreen.style.display !== 'none') {
        todayScreen.style.display = 'none';
      }
    }
    if (state.view !== 'radicalCards') {
      const radicalScreen = document.getElementById('screenRadicalCards');
      if (radicalScreen && radicalScreen.style.display !== 'none') {
        radicalScreen.style.display = 'none';
      }
    }
    if (state.view !== 'cards') {
      const screenCards = document.getElementById('screenCards');
      if (screenCards && screenCards.style.display !== 'none') {
        screenCards.style.display = 'none';
      }
    }

    if (state.view === 'vocab') {
      document.body.classList.remove('study-mode');
      const radicalScreen = document.getElementById('screenRadicalCards');
      if (radicalScreen && radicalScreen.style.display !== 'none') {
        radicalScreen.style.display = 'none';
      }
      const isStudy = document.body.classList.contains('flashcard-study-mode') ||
        (typeof currentLevel !== 'undefined' && currentLevel && document.getElementById('screenCards') && document.getElementById('screenCards').style.display !== 'none');
      if (isStudy) {
        if (typeof goBackToPicker === 'function') goBackToPicker();
      } else if (typeof setPrimaryTab === 'function' && typeof primaryTab !== 'undefined' && primaryTab !== 'vocab') {
        setPrimaryTab('vocab');
      }
      const todayScreen = document.getElementById('screenTodayReviews');
      if (todayScreen && todayScreen.style.display !== 'none') {
        if (typeof closeTodayReviews === 'function') closeTodayReviews();
      }
    } else if (state.view === 'cards') {
      document.body.classList.remove('study-mode');
      const radicalScreen = document.getElementById('screenRadicalCards');
      if (radicalScreen && radicalScreen.style.display !== 'none') {
        radicalScreen.style.display = 'none';
      }
      if (state.level) {
        if (typeof currentLevel === 'undefined' || currentLevel !== state.level) {
          if (typeof selectLevel === 'function') selectLevel(state.level);
        } else {
          const screenCards = document.getElementById('screenCards');
          if (screenCards && screenCards.style.display === 'none') {
            if (typeof selectLevel === 'function') selectLevel(state.level);
          }
        }
      }
      if (state.drawerOpen) {
        if (typeof toggleStudyWritingPanel === 'function') toggleStudyWritingPanel(true);
      }
    } else if (state.view === 'tab') {
      document.body.classList.remove('study-mode');
      const radicalScreen = document.getElementById('screenRadicalCards');
      if (radicalScreen && radicalScreen.style.display !== 'none') {
        radicalScreen.style.display = 'none';
      }
      const screenCards = document.getElementById('screenCards');
      if (screenCards && screenCards.style.display !== 'none') {
        screenCards.style.display = 'none';
      }
      if (state.tab && typeof setPrimaryTab === 'function') {
        if (document.body.classList.contains('flashcard-study-mode')) {
          if (typeof goBackToPicker === 'function') goBackToPicker();
        }
        setPrimaryTab(state.tab);
        if (state.tab === 'gradedReading' && state.story && typeof GradedReading !== 'undefined') {
          GradedReading.openStory(state.story, false);
        }
      }
    } else if (state.view === 'todayReviews') {
      const radicalScreen = document.getElementById('screenRadicalCards');
      if (radicalScreen && radicalScreen.style.display !== 'none') {
        radicalScreen.style.display = 'none';
      }
      const screenCards = document.getElementById('screenCards');
      if (screenCards && screenCards.style.display !== 'none') {
        screenCards.style.display = 'none';
      }
      if (typeof openTodayReviews === 'function') openTodayReviews();
    } else if (state.view === 'radicalCards') {
      const screenCards = document.getElementById('screenCards');
      if (screenCards && screenCards.style.display !== 'none') {
        screenCards.style.display = 'none';
      }
      document.body.classList.remove('flashcard-study-mode');
      if (typeof startRadicalStudy === 'function') {
        startRadicalStudy(state.mode || 'basic50', 0);
      }
    }
  }

  function init() {
    window.addEventListener('popstate', onPopState);

    // Bootstrap current state on initial load
    const initialState = getCurrentUrlState();
    replaceView(initialState);

    // If initial URL had deep link parameters, activate corresponding view on load
    function activateInitialView() {
      if (initialState.view === 'cards' && initialState.level) {
        if (typeof selectLevel === 'function') selectLevel(initialState.level);
      } else if (initialState.view === 'tab' && initialState.tab && initialState.tab !== 'vocab') {
        if (typeof setPrimaryTab === 'function') {
          setPrimaryTab(initialState.tab);
          if (initialState.tab === 'gradedReading' && initialState.story && typeof GradedReading !== 'undefined') {
            GradedReading.openStory(initialState.story, false);
          }
        }
      } else if (initialState.view === 'todayReviews') {
        if (typeof openTodayReviews === 'function') openTodayReviews();
      }
    }

    if (document.readyState === 'complete') {
      setTimeout(activateInitialView, 50);
    } else {
      window.addEventListener('load', () => setTimeout(activateInitialView, 50));
    }
  }

  // Auto-init on script load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init,
    pushView,
    replaceView,
    navigateBack,
    isNavigatingFromPopstate: () => isNavigatingFromPopstate
  };
})();

window.SpaRouter = SpaRouter;
