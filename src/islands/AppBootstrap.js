// Application entry point & bootstrapping logic.
// Port of legacy assets/flashcards.js.
import { onDomReady } from './domReady';
import { loadRadicalProgress, loadRadicalPrefs } from './radicalsState';

/* global LEVELS, selectLevel, renderLevelProgress, showWelcomeToast, renderLearningDashboard, prefetchSuggestedLevel, startStudyHeartbeat */

export function initAppBootstrap() {
  document.querySelectorAll('.level-card[data-level]').forEach(card => {
    const level = card.dataset.level;
    const levels = typeof LEVELS !== 'undefined' ? LEVELS : window.LEVELS;
    const cfg = levels ? levels[level] : null;
    if (cfg && !cfg.available) {
      card.classList.add('disabled');
      return;
    }
    card.addEventListener('click', () => {
      if (typeof selectLevel === 'function') {
        selectLevel(level);
      } else if (typeof window.selectLevel === 'function') {
        window.selectLevel(level);
      }
    });
  });

  if (typeof renderLevelProgress === 'function') renderLevelProgress();
  else if (typeof window.renderLevelProgress === 'function') window.renderLevelProgress();

  if (typeof showWelcomeToast === 'function') showWelcomeToast();
  else if (typeof window.showWelcomeToast === 'function') window.showWelcomeToast();

  if (typeof renderLearningDashboard === 'function') renderLearningDashboard();
  else if (typeof window.renderLearningDashboard === 'function') window.renderLearningDashboard();

  if (typeof prefetchSuggestedLevel === 'function') prefetchSuggestedLevel();
  else if (typeof window.prefetchSuggestedLevel === 'function') window.prefetchSuggestedLevel();

  if (typeof startStudyHeartbeat === 'function') startStudyHeartbeat();
  else if (typeof window.startStudyHeartbeat === 'function') window.startStudyHeartbeat();

  loadRadicalProgress();
  loadRadicalPrefs();

  const prefetchReading = function() {
    if (typeof ensureReadingAnalysisLoaded === 'function') ensureReadingAnalysisLoaded();
    else if (typeof window !== 'undefined' && typeof window.ensureReadingAnalysisLoaded === 'function') {
      window.ensureReadingAnalysisLoaded();
    }
  };
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(prefetchReading, { timeout: 2500 });
    } else {
      setTimeout(prefetchReading, 400);
    }
  }
}

export function mountAppBootstrap() {
  onDomReady(initAppBootstrap);
}
