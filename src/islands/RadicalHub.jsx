// Radical (Bộ thủ) hub screen #screenRadicalHub: tab switcher (50 basic / 214 Kangxi),
// group cards by stroke count with character previews and learning progress,
// plus the primary tab router and skills menu navigation.
// Preact port of the former assets/js/radicals.js with identical markup and behavior.
import { render } from 'preact';

/* global RADICAL_STROKE_COUNTS, RADICAL_GROUPS, radicalTab, radicalDataLoaded, radicalStrokeUrl, primaryTab,
   radicalProgress, radicalProgressKey, radicalReturnTab, radicalGroupIndex, radicalWords, radicalOrder,
   radicalFilteredOrder, radicalIdx, radicalCurrentFilter, radicalCurrentView, radicalOverviewQuery,
   radicalOverviewStatus, radicalOverviewStroke, radicalOverviewItems, currentLevel,
   setActiveStudyWord, startReadingAnalysis, GradedReading, ListeningPractice,
   showReviewSetup, updateReviewRangeLabel, updateReviewMobileAuxBadge, renderTopicGrid,
   startSentenceGame, startGuessWordGame, startSpeedQuizGame, abandonReviewSession, closeReviewBottomSheet,
   syncHomeScreen, SpaRouter, buildRadicalCardArea, renderRadicalFilters, setRadicalViewMode, renderRadicalCard,
   closeMobileStatsSheet */
/* eslint-disable no-global-assign */

let hubEl = null;
let hubLoading = false;
let hubError = false;
let radicalDataLoadPromise = null;

export const PRIMARY_TAB_SCREENS = {
  vocab: { tabId: 'primaryTabVocab', screenId: 'screenVocabHub' },
  radicals: { tabId: 'primaryTabRadicals', screenId: 'screenRadicalHub' },
  review: { tabId: 'primaryTabReview', screenId: 'screenReviewPicker' },
  reading: { tabId: 'primaryTabReading', screenId: 'screenReadingAnalysis' },
  gradedReading: { tabId: 'primaryTabGradedReading', screenId: 'screenGradedReading' },
  listening: { tabId: 'primaryTabListening', screenId: 'screenListeningPractice' },
  sentenceGame: { tabId: 'primaryTabSentenceGame', screenId: 'screenSentenceGame' },
  guessWord: { tabId: 'primaryTabGuessWord', screenId: 'screenGuessWord' },
  speedQuiz: { tabId: 'primaryTabSpeedQuiz', screenId: 'screenSpeedQuiz' },
};

let vocabSubTab = 'level';

export async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch failed: ' + url);
  return res.json();
}

export function rerender() {
  if (hubEl) {
    render(<RadicalHubComponent />, hubEl);
  }
}

export async function ensureRadicalDataLoaded() {
  if (radicalDataLoaded) {
    renderRadicalHub();
    return true;
  }
  if (radicalDataLoadPromise) return radicalDataLoadPromise;
  hubLoading = true;
  hubError = false;
  rerender();
  radicalDataLoadPromise = (async () => {
    try {
      const [basic50Groups, kangxi214Groups] = await Promise.all([
        Promise.all(Array.from({ length: RADICAL_STROKE_COUNTS.basic50 }, (_, i) => fetchJson(radicalStrokeUrl('basic50', i + 1)))),
        Promise.all(Array.from({ length: RADICAL_STROKE_COUNTS.kangxi214 }, (_, i) => fetchJson(radicalStrokeUrl('kangxi214', i + 1)))),
      ]);
      RADICAL_GROUPS.basic50 = basic50Groups;
      RADICAL_GROUPS.kangxi214 = kangxi214Groups;
      radicalDataLoaded = true;
      hubLoading = false;
      renderRadicalHub();
      return true;
    } catch (e) {
      hubLoading = false;
      hubError = true;
      rerender();
      return false;
    } finally {
      radicalDataLoadPromise = null;
    }
  })();
  return radicalDataLoadPromise;
}

export function setVocabSubTab(tab) {
  vocabSubTab = tab;
  try { localStorage.setItem('hsk_vocab_subtab', tab); } catch (e) {}
  const tabLevel = document.getElementById('vocabSubTabLevel');
  const tabTopic = document.getElementById('vocabSubTabTopic');
  if (tabLevel) {
    tabLevel.classList.toggle('active', tab === 'level');
    tabLevel.setAttribute('aria-selected', String(tab === 'level'));
  }
  if (tabTopic) {
    tabTopic.classList.toggle('active', tab === 'topic');
    tabTopic.setAttribute('aria-selected', String(tab === 'topic'));
  }
  const screenPicker = document.getElementById('screenPicker');
  const screenTopicPicker = document.getElementById('screenTopicPicker');
  if (screenPicker) {
    screenPicker.style.display = tab === 'level' ? '' : 'none';
    if (tab === 'level') {
      screenPicker.classList.remove('vocab-tab-fade');
      void screenPicker.offsetWidth;
      screenPicker.classList.add('vocab-tab-fade');
    }
  }
  if (screenTopicPicker) {
    screenTopicPicker.style.display = tab === 'topic' ? '' : 'none';
    if (tab === 'topic') {
      screenTopicPicker.classList.remove('vocab-tab-fade');
      void screenTopicPicker.offsetWidth;
      screenTopicPicker.classList.add('vocab-tab-fade');
    }
  }
  const versionControls = document.getElementById('pickerVersionControls');
  if (versionControls) versionControls.hidden = tab !== 'level';
  if (tab === 'topic' && typeof renderTopicGrid === 'function') renderTopicGrid();
}

export function setPrimaryTab(tab, options) {
  const previousTab = primaryTab;
  primaryTab = tab;
  // Ensure non-tab study screens are hidden when switching primary tabs
  const screenCards = document.getElementById('screenCards');
  if (screenCards) screenCards.style.display = 'none';
  const screenRadicalCards = document.getElementById('screenRadicalCards');
  if (screenRadicalCards) screenRadicalCards.style.display = 'none';
  const screenTodayReviews = document.getElementById('screenTodayReviews');
  if (screenTodayReviews) screenTodayReviews.style.display = 'none';
  document.body.classList.remove('study-mode', 'flashcard-study-mode', 'today-reviews-focus-mode');
  if (tab !== 'vocab') {
    currentLevel = null;
  }
  Object.entries(PRIMARY_TAB_SCREENS).forEach(([key, { tabId, screenId }]) => {
    const isActive = key === tab;
    const tabEl = document.getElementById(tabId);
    const screenEl = document.getElementById(screenId);
    if (tabEl) {
      tabEl.classList.toggle('active', isActive);
      tabEl.setAttribute('aria-pressed', String(isActive));
    }
    if (screenEl) {
      screenEl.style.display = isActive ? '' : 'none';
    }
  });
  const mobVocab = document.getElementById('mobNavVocab');
  const mobReview = document.getElementById('mobNavReview');
  const mobProfile = document.getElementById('mobNavProfile');
  if (mobVocab) mobVocab.classList.toggle('active', tab === 'vocab');
  if (mobReview) mobReview.classList.toggle('active', tab === 'review');
  if (mobProfile) mobProfile.classList.remove('active');
  if (typeof closeMobileStatsSheet === 'function') closeMobileStatsSheet();
  const isTool = ['radicals', 'sentenceGame', 'guessWord', 'speedQuiz', 'reading', 'gradedReading', 'listening'].includes(tab);
  const isGame = ['sentenceGame', 'guessWord', 'speedQuiz'].includes(tab);
  document.body.classList.toggle('is-game-view', isGame);
  document.body.classList.toggle('reading-view-active', tab === 'reading');
  document.body.classList.toggle('graded-reading-active', tab === 'gradedReading');
  document.body.classList.toggle('listening-view-active', tab === 'listening');
  document.body.classList.toggle('review-view-active', tab === 'review');
  if (previousTab === 'listening' && tab !== 'listening') {
    if (typeof ListeningPractice !== 'undefined') ListeningPractice.stopAudio();
  }
  if (tab !== 'reading') {
    document.body.classList.remove('reading-zen-active');
  }
  if (tab !== 'gradedReading') {
    document.body.classList.remove('graded-pinyin-hidden', 'graded-translation-hidden', 'graded-story-active');
  }
  const gamesMenu = document.getElementById('primaryGamesMenu');
  if (gamesMenu) {
    gamesMenu.open = false;
    gamesMenu.classList.toggle('has-active-tool', isTool);
  }
  const versionControls = document.getElementById('pickerVersionControls');
  if (versionControls) {
    versionControls.hidden = (tab !== 'vocab') || (vocabSubTab !== 'level');
  }
  const dashboard = document.getElementById('learningDashboard');
  if (dashboard) dashboard.style.display = tab === 'vocab' ? '' : 'none';
  const continueCard = document.getElementById('continueLearningCard');
  if (continueCard) continueCard.style.display = tab === 'vocab' ? '' : 'none';
  if (tab !== 'vocab' && typeof setActiveStudyWord === 'function') setActiveStudyWord(null);
  if (tab === 'radicals') ensureRadicalDataLoaded();
  if (tab === 'reading') {
    if (typeof startReadingAnalysis === 'function') startReadingAnalysis();
  }
  if (tab === 'gradedReading') {
    if (typeof GradedReading !== 'undefined') GradedReading.init();
  }
  if (tab === 'listening') {
    if (typeof ListeningPractice !== 'undefined') {
      ListeningPractice.init();
    } else {
      const screenEl = document.getElementById('screenListeningPractice');
      if (screenEl) {
        screenEl.innerHTML = `
          <div class="listening-container" style="text-align:center; padding: 48px 20px;">
            <div style="font-size:16px; font-weight:700; color:var(--text-primary); margin-bottom:12px;">Đang khởi tạo Luyện nghe HSK...</div>
            <p style="font-size:14px; color:var(--text-secondary); margin-bottom:16px;">Vui lòng thử lại sau vài giây hoặc tải lại trang.</p>
            <button class="listening-back-btn" onclick="setPrimaryTab('vocab')" style="align-self:center; margin: 0 auto;">Quay lại Trang chính</button>
          </div>
        `;
      }
    }
  }
  if (tab === 'review') {
    if (typeof showReviewSetup === 'function') {
      showReviewSetup();
    } else {
      const slider = document.getElementById('reviewRangeSlider');
      if (slider && typeof updateReviewRangeLabel === 'function') updateReviewRangeLabel(slider.value);
    }
    if (typeof updateReviewMobileAuxBadge === 'function') updateReviewMobileAuxBadge();
  }
  if (tab === 'vocab' && vocabSubTab === 'topic' && typeof renderTopicGrid === 'function') renderTopicGrid();
  if (tab === 'sentenceGame' && typeof startSentenceGame === 'function') startSentenceGame();
  if (previousTab === 'sentenceGame' && tab !== 'sentenceGame') {
    document.body.classList.remove('sentence-game-focus');
  }
  if (tab === 'guessWord' && typeof startGuessWordGame === 'function') startGuessWordGame();
  if (tab === 'speedQuiz' && typeof startSpeedQuizGame === 'function') startSpeedQuizGame(options || {});
  if (previousTab === 'review' && tab !== 'review') {
    if (typeof abandonReviewSession === 'function') abandonReviewSession();
    if (typeof closeReviewBottomSheet === 'function') closeReviewBottomSheet();
  }
  if (typeof syncHomeScreen === 'function') syncHomeScreen();
  // Reset scroll position to top and focus container/heading
  window.scrollTo({ top: 0, behavior: 'instant' });
  const workstationMiddle = document.getElementById('workstationMiddle');
  if (workstationMiddle) {
    workstationMiddle.scrollTop = 0;
  }
  const targetScreen = PRIMARY_TAB_SCREENS[tab] && document.getElementById(PRIMARY_TAB_SCREENS[tab].screenId);
  if (targetScreen) {
    const heading = targetScreen.querySelector('h1, h2, [role="heading"], header');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }
  if (typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) {
    if (tab === 'vocab') SpaRouter.pushView({ view: 'vocab' });
    else SpaRouter.pushView({ view: 'tab', tab: tab });
  }
}

export async function openRadicalDirectory() {
  setPrimaryTab('radicals');
  const loaded = await ensureRadicalDataLoaded();
  if (!loaded || primaryTab !== 'radicals') return;
  setRadicalTab('kangxi214');
  openRadicalOverviewFromHub('kangxi214');
}

export function setRadicalTab(tab) {
  radicalTab = tab;
  rerender();
}

export function radicalKnownCount(items) {
  const getProgressKey = typeof window.radicalProgressKey === 'function' ? window.radicalProgressKey : radicalProgressKey;
  return items.filter((item) => radicalProgress[getProgressKey(item)] === 'known').length;
}

export function renderRadicalHub() {
  rerender();
}

export function renderRadicalGroupGrid(set, gridId) {
  rerender();
}

export function renderRadicalHubProgress() {
  rerender();
}

export function buildRadicalOverviewItems(mode) {
  const groups = RADICAL_GROUPS[mode];
  const items = [];
  groups.forEach((group, groupIndex) => {
    group.forEach((item, itemIndexInGroup) => {
      items.push({ item, groupIndex, itemIndexInGroup, stroke: groupIndex + 1 });
    });
  });
  return items;
}

export function startRadicalStudy(mode, groupIndex, options) {
  const openOverview = !!(options && options.overview);
  radicalReturnTab = mode;
  radicalGroupIndex = groupIndex;
  radicalWords = RADICAL_GROUPS[mode][groupIndex];
  radicalOrder = Array.from({ length: radicalWords.length }, (_, i) => i);
  radicalFilteredOrder = radicalOrder.slice();
  radicalIdx = 0;
  radicalCurrentFilter = 'all';
  radicalCurrentView = 'cards';
  radicalOverviewQuery = '';
  radicalOverviewStatus = 'all';
  radicalOverviewStroke = 'all';
  radicalOverviewItems = buildRadicalOverviewItems(mode);
  document.getElementById('primaryTabs').style.display = 'none';
  document.getElementById('learningDashboard').style.display = 'none';
  document.getElementById('screenRadicalHub').style.display = 'none';
  const screenCards = document.getElementById('screenCards');
  if (screenCards) screenCards.style.display = 'none';
  const screenTodayReviews = document.getElementById('screenTodayReviews');
  if (screenTodayReviews) screenTodayReviews.style.display = 'none';
  const screenVocabHub = document.getElementById('screenVocabHub');
  if (screenVocabHub) screenVocabHub.style.display = 'none';
  document.body.classList.remove('flashcard-study-mode', 'today-reviews-focus-mode');
  document.getElementById('screenRadicalCards').style.display = '';
  document.getElementById('radicalTransferPanel').hidden = true;
  document.body.classList.add('study-mode');
  if (typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) {
    SpaRouter.pushView({ view: 'radicalCards', mode: mode });
  }
  buildRadicalCardArea();
  renderRadicalFilters();
  setRadicalViewMode(openOverview ? 'overview' : 'cards');
  renderRadicalCard();
}

export function openRadicalOverviewFromHub(mode) {
  startRadicalStudy(mode, 0, { overview: true });
}

export function goBackToRadicalHub() {
  document.body.classList.remove('study-mode', 'flashcard-study-mode', 'today-reviews-focus-mode');
  document.getElementById('screenRadicalCards').style.display = 'none';
  const screenCards = document.getElementById('screenCards');
  if (screenCards) screenCards.style.display = 'none';
  document.getElementById('screenRadicalHub').style.display = '';
  document.getElementById('primaryTabs').style.display = '';
  document.getElementById('learningDashboard').style.display = '';
  document.getElementById('appTitle').textContent = '汉字思维';
  radicalTab = radicalReturnTab;
  radicalCurrentView = 'cards';
  renderRadicalHub();
  if (typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) {
    SpaRouter.pushView({ view: 'tab', tab: 'radicals' });
  }
}

export function initPrimaryMenuKeyboard() {
  function handleMenuKeydown(event) {
    const menu = document.getElementById('primaryGamesMenu');
    if (!menu) return;
    const trigger = menu.querySelector('.primary-menu-trigger');
    const items = Array.from(menu.querySelectorAll('.primary-games-menu-panel [role="menuitem"]:not([disabled])'));
    if (!items.length) return;

    if (event.target === trigger) {
      if (event.key === 'ArrowDown' || event.key === 'Down') {
        event.preventDefault();
        menu.open = true;
        items[0].focus();
        return;
      }
      if (event.key === 'ArrowUp' || event.key === 'Up') {
        event.preventDefault();
        menu.open = true;
        items[items.length - 1].focus();
        return;
      }
    }

    const currentIndex = items.indexOf(document.activeElement);
    if (currentIndex !== -1) {
      if (event.key === 'ArrowDown' || event.key === 'Down') {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex].focus();
      } else if (event.key === 'ArrowUp' || event.key === 'Up') {
        event.preventDefault();
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        items[prevIndex].focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        items[0].focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        items[items.length - 1].focus();
      }
    }
  }

  const menu = document.getElementById('primaryGamesMenu');
  if (menu) {
    menu.addEventListener('keydown', handleMenuKeydown);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const el = document.getElementById('primaryGamesMenu');
      if (el) el.addEventListener('keydown', handleMenuKeydown);
    });
  }
}

export function initPrimaryMenuAria() {
  function bindToggle() {
    const menu = document.getElementById('primaryGamesMenu');
    if (menu) {
      menu.addEventListener('toggle', () => {
        const trigger = menu.querySelector('.primary-menu-trigger');
        if (trigger) {
          trigger.setAttribute('aria-expanded', String(menu.open));
        }
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindToggle);
  } else {
    bindToggle();
  }
}

function GroupCards({ set }) {
  const groups = RADICAL_GROUPS[set] || [];
  return (
    <>
      {groups.map((group, i) => {
        const strokeNum = i + 1;
        const previewGroup = RADICAL_GROUPS.basic50[i]?.length
          ? RADICAL_GROUPS.basic50[i]
          : group;
        const preview = previewGroup.slice(0, 4).map((item) => item.radical).join(' ');
        const known = radicalKnownCount(group);
        return (
          <button
            key={`${set}-${i}`}
            class="radical-group-card"
            type="button"
            onClick={() => startRadicalStudy(set, i)}
          >
            <div class="radical-group-stroke">{`${strokeNum} NÉT`}</div>
            <div class="radical-group-preview">{preview}</div>
            <div class="radical-group-count">{`${group.length} bộ`}</div>
            <div class="radical-group-known">{`${known} / ${group.length} nhớ`}</div>
          </button>
        );
      })}
    </>
  );
}

function RadicalHubComponent() {
  if (hubLoading) {
    return <div class="loading-text">Đang tải dữ liệu...</div>;
  }
  if (hubError) {
    return <div class="error-text">Không thể tải dữ liệu. Vui lòng thử lại.</div>;
  }
  if (!radicalDataLoaded) {
    return null;
  }
  return (
    <>
      <div class="radical-tabs view-tabs" role="tablist" aria-label="Bộ Bộ thủ">
        <button
          id="radicalTabBasic50"
          class={`view-tab${radicalTab === 'basic50' ? ' active' : ''}`}
          role="tab"
          aria-selected={String(radicalTab === 'basic50')}
          onClick={() => setRadicalTab('basic50')}
        >
          50 bộ cơ bản
        </button>{' '}
        <button
          id="radicalTabKangxi214"
          class={`view-tab${radicalTab === 'kangxi214' ? ' active' : ''}`}
          role="tab"
          aria-selected={String(radicalTab === 'kangxi214')}
          onClick={() => setRadicalTab('kangxi214')}
        >
          214 bộ Khang Hy
        </button>
      </div>

      <div id="radicalBasic50Panel" class="radical-panel" hidden={radicalTab !== 'basic50'}>
        <div class="radical-panel-header">
          <div>
            <h2>50 BỘ THỦ CƠ BẢN</h2>
            <p class="radical-panel-subtitle">Dành cho người mới bắt đầu · phân loại từ 1–10 nét</p>
          </div>
          <button type="button" class="radical-overview-btn" onClick={() => openRadicalOverviewFromHub('basic50')}>
            📋 Tổng quan 50 bộ
          </button>
        </div>
        <div class="radical-group-grid" id="radicalGroupGridBasic50">
          <GroupCards set="basic50" />
        </div>
      </div>

      <div id="radicalKangxi214Panel" class="radical-panel" hidden={radicalTab !== 'kangxi214'}>
        <div class="radical-panel-header">
          <div>
            <h2>214 BỘ THỦ KHANG HY</h2>
            <p class="radical-panel-subtitle">Đầy đủ 214 bộ · phân loại từ 1–17 nét</p>
          </div>
          <button type="button" class="radical-overview-btn" onClick={() => openRadicalOverviewFromHub('kangxi214')}>
            📋 Tổng quan 214 bộ
          </button>
        </div>
        <div class="radical-group-grid" id="radicalGroupGridKangxi214">
          <GroupCards set="kangxi214" />
        </div>
      </div>
    </>
  );
}

export function mountRadicalHub() {
  Object.assign(window, {
    fetchJson,
    ensureRadicalDataLoaded,
    setVocabSubTab,
    setPrimaryTab,
    openRadicalDirectory,
    setRadicalTab,
    radicalKnownCount,
    renderRadicalHub,
    renderRadicalGroupGrid,
    renderRadicalHubProgress,
    buildRadicalOverviewItems,
    startRadicalStudy,
    openRadicalOverviewFromHub,
    goBackToRadicalHub,
    PRIMARY_TAB_SCREENS,
    initPrimaryMenuKeyboard,
    initPrimaryMenuAria,
  });

  try {
    Object.defineProperty(window, 'vocabSubTab', {
      get: () => vocabSubTab,
      set: (v) => { vocabSubTab = v; },
      configurable: true,
    });
  } catch (e) {}

  // Close primary tools & skills menu on click outside or item selection
  document.addEventListener('click', (event) => {
    const menu = document.getElementById('primaryGamesMenu');
    if (!menu || !menu.open) return;
    if (!menu.contains(event.target) || event.target.closest('.primary-games-menu-panel button')) {
      menu.open = false;
    }
  });

  // Close primary tools & skills menu on Escape and return focus to trigger
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'Esc') {
      const menu = document.getElementById('primaryGamesMenu');
      if (menu && menu.open) {
        event.preventDefault();
        menu.open = false;
        const trigger = menu.querySelector('.primary-menu-trigger');
        if (trigger) trigger.focus();
      }
    }
  });

  initPrimaryMenuKeyboard();
  initPrimaryMenuAria();

  try {
    const savedVocabTab = localStorage.getItem('hsk_vocab_subtab');
    if (savedVocabTab === 'topic') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setVocabSubTab('topic'));
      } else {
        setVocabSubTab('topic');
      }
    }
  } catch (e) {}

  hubEl = document.getElementById('radicalHub');
  if (radicalDataLoaded) {
    rerender();
  }
}
