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
  initAppEventBindings();

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

export function initAppEventBindings() {
  const on = (selector, event, handler) => {
    document.querySelectorAll(selector).forEach(el => el.addEventListener(event, handler));
  };
  const onId = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  };

  // Header controls & badges
  onId('headerStreakBadge', 'click', () => {
    if (typeof showHistoryModal === 'function') showHistoryModal();
    else if (window.showHistoryModal) window.showHistoryModal();
  });
  onId('headerProfileBtn', 'click', () => {
    if (typeof showHistoryModal === 'function') showHistoryModal();
    else if (window.showHistoryModal) window.showHistoryModal();
  });
  onId('headerSavedWordsBtn', 'click', () => {
    if (typeof openQuickAccessDrawer === 'function') openQuickAccessDrawer('saved');
    else if (window.openQuickAccessDrawer) window.openQuickAccessDrawer('saved');
  });
  onId('headerUrgentReviewBtn', 'click', () => {
    if (typeof openQuickAccessDrawer === 'function') openQuickAccessDrawer('urgent');
    else if (window.openQuickAccessDrawer) window.openQuickAccessDrawer('urgent');
  });
  onId('headerHelpBtn', 'click', () => {
    if (typeof openStudyHelpModal === 'function') openStudyHelpModal();
    else if (window.openStudyHelpModal) window.openStudyHelpModal();
  });
  onId('themeToggle', 'click', () => {
    if (typeof toggleTheme === 'function') toggleTheme();
    else if (window.toggleTheme) window.toggleTheme();
  });

  // Daily goal controls
  on('.goal-settings-btn', 'click', () => {
    if (typeof focusDailyGoalSelector === 'function') focusDailyGoalSelector();
    else if (window.focusDailyGoalSelector) window.focusDailyGoalSelector();
  });
  onId('dailyGoalSelect', 'change', e => {
    if (typeof updateDailyStudyGoal === 'function') updateDailyStudyGoal(e.target.value);
    else if (window.updateDailyStudyGoal) window.updateDailyStudyGoal(e.target.value);
  });

  // Primary navigation tabs
  const handlePrimaryTab = (tab, opts) => {
    if (typeof setPrimaryTab === 'function') setPrimaryTab(tab, opts);
    else if (window.setPrimaryTab) window.setPrimaryTab(tab, opts);
  };
  onId('primaryTabVocab', 'click', () => handlePrimaryTab('vocab'));
  onId('primaryTabReview', 'click', () => handlePrimaryTab('review'));
  onId('primaryTabListening', 'click', () => handlePrimaryTab('listening'));
  onId('primaryTabGradedReading', 'click', () => handlePrimaryTab('gradedReading'));
  onId('primaryTabReading', 'click', () => handlePrimaryTab('reading'));
  onId('primaryTabSentenceGame', 'click', () => handlePrimaryTab('sentenceGame'));
  onId('primaryTabSpeedQuiz', 'click', () => handlePrimaryTab('speedQuiz'));
  onId('primaryTabGuessWord', 'click', () => handlePrimaryTab('guessWord'));
  onId('primaryTabRadicals', 'click', () => handlePrimaryTab('radicals'));
  onId('primaryMenuRadicalLookup', 'click', () => {
    if (typeof openRadicalDirectory === 'function') openRadicalDirectory();
    else if (window.openRadicalDirectory) window.openRadicalDirectory();
  });
  onId('primaryMenuHelpBtn', 'click', () => {
    if (typeof openStudyHelpModal === 'function') openStudyHelpModal();
    else if (window.openStudyHelpModal) window.openStudyHelpModal();
  });

  // HSK version select
  onId('pickerVersionSelect', 'change', e => {
    if (typeof setPickerVersion === 'function') setPickerVersion(e.target.value);
    else if (window.setPickerVersion) window.setPickerVersion(e.target.value);
  });

  // Vocab sub-tabs
  const handleVocabSubTab = tab => {
    if (typeof setVocabSubTab === 'function') setVocabSubTab(tab);
    else if (window.setVocabSubTab) window.setVocabSubTab(tab);
  };
  onId('tabLevelPicker', 'click', () => handleVocabSubTab('level'));
  onId('vocabSubTabLevel', 'click', () => handleVocabSubTab('level'));
  onId('tabTopicPicker', 'click', () => handleVocabSubTab('topic'));
  onId('vocabSubTabTopic', 'click', () => handleVocabSubTab('topic'));
  on('.featured-topic-more, .featured-topic-pill', 'click', () => handleVocabSubTab('topic'));
  onId('dashboardQuickQuizBtn', 'click', () => {
    handlePrimaryTab('speedQuiz', { roundLimit: 5 });
  });

  // Study workstation controls
  on('.study-back-btn, .today-review-back-btn', 'click', () => {
    if (window.SpaRouter && typeof window.SpaRouter.navigateBack === 'function') {
      window.SpaRouter.navigateBack();
    }
  });
  onId('viewBtnCards', 'click', () => {
    if (typeof setViewMode === 'function') setViewMode('cards');
    else if (window.setViewMode) window.setViewMode('cards');
  });
  onId('viewBtnOverview', 'click', () => {
    if (typeof setViewMode === 'function') setViewMode('overview');
    else if (window.setViewMode) window.setViewMode('overview');
  });
  on('.study-theme-toggle-btn', 'click', () => {
    if (typeof toggleTheme === 'function') toggleTheme();
    else if (window.toggleTheme) window.toggleTheme();
  });
  onId('studyHeaderMoreBtn', 'click', e => {
    if (typeof toggleStudyHeaderMenu === 'function') toggleStudyHeaderMenu(e);
    else if (window.toggleStudyHeaderMenu) window.toggleStudyHeaderMenu(e);
  });
  onId('headerMenuOverview', 'click', () => {
    if (typeof setViewMode === 'function') setViewMode('overview');
    else if (window.setViewMode) window.setViewMode('overview');
    if (typeof closeStudyHeaderMenu === 'function') closeStudyHeaderMenu();
    else if (window.closeStudyHeaderMenu) window.closeStudyHeaderMenu();
  });
  onId('studyWritingToggleBtn', 'click', () => {
    if (typeof toggleStudyWritingPanel === 'function') toggleStudyWritingPanel(true);
    else if (window.toggleStudyWritingPanel) window.toggleStudyWritingPanel(true);
    if (typeof closeStudyHeaderMenu === 'function') closeStudyHeaderMenu();
    else if (window.closeStudyHeaderMenu) window.closeStudyHeaderMenu();
  });
  onId('studyHelpToggleBtn', 'click', () => {
    if (typeof openStudyHelpModal === 'function') openStudyHelpModal();
    else if (window.openStudyHelpModal) window.openStudyHelpModal();
    if (typeof closeStudyHeaderMenu === 'function') closeStudyHeaderMenu();
    else if (window.closeStudyHeaderMenu) window.closeStudyHeaderMenu();
  });
  onId('headerMenuTransfer', 'click', () => {
    if (typeof toggleTransferPanel === 'function') toggleTransferPanel(true);
    else if (window.toggleTransferPanel) window.toggleTransferPanel(true);
    if (typeof closeStudyHeaderMenu === 'function') closeStudyHeaderMenu();
    else if (window.closeStudyHeaderMenu) window.closeStudyHeaderMenu();
  });
  onId('headerMenuReset', 'click', () => {
    if (typeof resetProgress === 'function') resetProgress();
    else if (window.resetProgress) window.resetProgress();
    if (typeof closeStudyHeaderMenu === 'function') closeStudyHeaderMenu();
    else if (window.closeStudyHeaderMenu) window.closeStudyHeaderMenu();
  });

  onId('studyDrawerBackdrop', 'click', () => {
    if (typeof closeAllStudyDrawers === 'function') closeAllStudyDrawers();
    else if (window.closeAllStudyDrawers) window.closeAllStudyDrawers();
  });
  onId('studyFilterDialog', 'click', e => {
    const dlg = document.getElementById('studyFilterDialog');
    if (dlg && e.target === dlg && typeof dlg.close === 'function') dlg.close();
  });
  on('.study-filter-dialog .mobile-dock-close', 'click', () => {
    if (typeof closeStudyFilterSheet === 'function') closeStudyFilterSheet();
    else if (window.closeStudyFilterSheet) window.closeStudyFilterSheet();
  });

  // Transfer / Backup panel
  on('.transfer-panel-close-btn', 'click', () => {
    if (typeof toggleTransferPanel === 'function') toggleTransferPanel(false);
    else if (window.toggleTransferPanel) window.toggleTransferPanel(false);
  });
  onId('exportProgressBtn', 'click', () => {
    if (typeof exportProgress === 'function') exportProgress();
    else if (window.exportProgress) window.exportProgress();
  });
  onId('importTriggerBtn', 'click', () => {
    const fileInput = document.getElementById('importFile');
    if (fileInput) fileInput.click();
  });
  onId('desiredRetentionSlider', 'input', e => {
    if (typeof updateDesiredRetention === 'function') updateDesiredRetention(e.target.value);
    else if (window.updateDesiredRetention) window.updateDesiredRetention(e.target.value);
  });
  onId('importFile', 'change', e => {
    if (typeof importProgress === 'function') importProgress(e);
    else if (window.importProgress) window.importProgress(e);
  });
}

export function mountAppBootstrap() {
  onDomReady(initAppBootstrap);
}
