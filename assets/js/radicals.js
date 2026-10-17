// Radical hub: primary/secondary tab switching, data loading, hub rendering.
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch failed: ' + url);
  return res.json();
}

let radicalDataLoadPromise = null;

async function ensureRadicalDataLoaded() {
  if (radicalDataLoaded) { renderRadicalHub(); return true; }
  if (radicalDataLoadPromise) return radicalDataLoadPromise;
  const hub = document.getElementById('radicalHub');
  hub.innerHTML = '<div class="loading-text">Đang tải dữ liệu...</div>';
  radicalDataLoadPromise = (async () => {
    try {
      const [basic50Groups, kangxi214Groups] = await Promise.all([
        Promise.all(Array.from({ length: RADICAL_STROKE_COUNTS.basic50 }, (_, i) => fetchJson(radicalStrokeUrl('basic50', i + 1)))),
        Promise.all(Array.from({ length: RADICAL_STROKE_COUNTS.kangxi214 }, (_, i) => fetchJson(radicalStrokeUrl('kangxi214', i + 1)))),
      ]);
      RADICAL_GROUPS.basic50 = basic50Groups;
      RADICAL_GROUPS.kangxi214 = kangxi214Groups;
      radicalDataLoaded = true;
      renderRadicalHub();
      return true;
    } catch (e) {
      hub.innerHTML = '<div class="error-text">Không thể tải dữ liệu. Vui lòng thử lại.</div>';
      return false;
    } finally {
      radicalDataLoadPromise = null;
    }
  })();
  return radicalDataLoadPromise;
}

const PRIMARY_TAB_SCREENS = {
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

function setVocabSubTab(tab) {
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
  if (tab === 'topic') renderTopicGrid();
}

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

function setPrimaryTab(tab, options) {
  const previousTab = primaryTab;
  primaryTab = tab;
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
  if (tab !== 'vocab') setActiveStudyWord(null);
  if (tab === 'radicals') ensureRadicalDataLoaded();
  if (tab === 'reading') {
    if (typeof startReadingAnalysis === 'function') startReadingAnalysis();
  }
  if (tab === 'gradedReading') {
    if (typeof GradedReading !== 'undefined') GradedReading.init();
  }
  if (tab === 'listening') {
    if (typeof ListeningPractice !== 'undefined') ListeningPractice.init();
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
  if (tab === 'vocab' && vocabSubTab === 'topic') renderTopicGrid();
  if (tab === 'sentenceGame') startSentenceGame();
  if (previousTab === 'sentenceGame' && tab !== 'sentenceGame') {
    document.body.classList.remove('sentence-game-focus');
  }
  if (tab === 'guessWord') startGuessWordGame();
  if (tab === 'speedQuiz') startSpeedQuizGame(options || {});
  if (previousTab === 'review' && tab !== 'review') {
    if (typeof abandonReviewSession === 'function') abandonReviewSession();
    if (typeof closeReviewBottomSheet === 'function') closeReviewBottomSheet();
  }
  syncHomeScreen();
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

async function openRadicalDirectory() {
  setPrimaryTab('radicals');
  const loaded = await ensureRadicalDataLoaded();
  if (!loaded || primaryTab !== 'radicals') return;
  setRadicalTab('kangxi214');
  openRadicalOverviewFromHub('kangxi214');
}

function setRadicalTab(tab) {
  radicalTab = tab;
  const basicTab = document.getElementById('radicalTabBasic50');
  const kangxiTab = document.getElementById('radicalTabKangxi214');
  const basicPanel = document.getElementById('radicalBasic50Panel');
  const kangxiPanel = document.getElementById('radicalKangxi214Panel');
  if (!basicTab) return;
  basicTab.classList.toggle('active', tab === 'basic50');
  kangxiTab.classList.toggle('active', tab === 'kangxi214');
  basicTab.setAttribute('aria-selected', String(tab === 'basic50'));
  kangxiTab.setAttribute('aria-selected', String(tab === 'kangxi214'));
  basicPanel.hidden = tab !== 'basic50';
  kangxiPanel.hidden = tab !== 'kangxi214';
}

function radicalKnownCount(items) {
  return items.filter(item => radicalProgress[radicalProgressKey(item)] === 'known').length;
}

function renderRadicalHub() {
  const hub = document.getElementById('radicalHub');
  hub.innerHTML = `
    <div class="radical-tabs view-tabs" role="tablist" aria-label="Bộ Bộ thủ">
      <button id="radicalTabBasic50" class="view-tab active" role="tab" aria-selected="true" onclick="setRadicalTab('basic50')">50 bộ cơ bản</button>
      <button id="radicalTabKangxi214" class="view-tab" role="tab" aria-selected="false" onclick="setRadicalTab('kangxi214')">214 bộ Khang Hy</button>
    </div>

    <div id="radicalBasic50Panel" class="radical-panel">
      <div class="radical-panel-header">
        <div>
          <h2>50 BỘ THỦ CƠ BẢN</h2>
          <p class="radical-panel-subtitle">Dành cho người mới bắt đầu · phân loại từ 1–10 nét</p>
        </div>
        <button type="button" class="radical-overview-btn" onclick="openRadicalOverviewFromHub('basic50')">📋 Tổng quan 50 bộ</button>
      </div>
      <div class="radical-group-grid" id="radicalGroupGridBasic50"></div>
    </div>

    <div id="radicalKangxi214Panel" class="radical-panel" hidden>
      <div class="radical-panel-header">
        <div>
          <h2>214 BỘ THỦ KHANG HY</h2>
          <p class="radical-panel-subtitle">Đầy đủ 214 bộ · phân loại từ 1–17 nét</p>
        </div>
        <button type="button" class="radical-overview-btn" onclick="openRadicalOverviewFromHub('kangxi214')">📋 Tổng quan 214 bộ</button>
      </div>
      <div class="radical-group-grid" id="radicalGroupGridKangxi214"></div>
    </div>
  `;
  setRadicalTab(radicalTab);
  renderRadicalHubProgress();
}

function renderRadicalGroupGrid(set, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = RADICAL_GROUPS[set].map((group, i) => {
    const strokeNum = i + 1;
    // Keep previews identical between both tabs for the shared 1–10 stroke groups.
    // The basic set is the canonical preview; group counts and study decks stay separate.
    const previewGroup = RADICAL_GROUPS.basic50[i]?.length
      ? RADICAL_GROUPS.basic50[i]
      : group;
    const preview = previewGroup.slice(0, 4).map(item => item.radical).join(' ');
    const known = radicalKnownCount(group);
    return `
      <button class="radical-group-card" type="button" onclick="startRadicalStudy('${set}', ${i})">
        <div class="radical-group-stroke">${strokeNum} NÉT</div>
        <div class="radical-group-preview">${preview}</div>
        <div class="radical-group-count">${group.length} bộ</div>
        <div class="radical-group-known">${known} / ${group.length} nhớ</div>
      </button>`;
  }).join('');
}

function renderRadicalHubProgress() {
  renderRadicalGroupGrid('basic50', 'radicalGroupGridBasic50');
  renderRadicalGroupGrid('kangxi214', 'radicalGroupGridKangxi214');
}

function buildRadicalOverviewItems(mode) {
  const groups = RADICAL_GROUPS[mode];
  const items = [];
  groups.forEach((group, groupIndex) => {
    group.forEach((item, itemIndexInGroup) => {
      items.push({ item, groupIndex, itemIndexInGroup, stroke: groupIndex + 1 });
    });
  });
  return items;
}

function startRadicalStudy(mode, groupIndex, options) {
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

function openRadicalOverviewFromHub(mode) {
  startRadicalStudy(mode, 0, { overview: true });
}

function goBackToRadicalHub() {
  document.body.classList.remove('study-mode');
  document.getElementById('screenRadicalCards').style.display = 'none';
  document.getElementById('screenRadicalHub').style.display = '';
  document.getElementById('primaryTabs').style.display = '';
  document.getElementById('learningDashboard').style.display = '';
  document.getElementById('appTitle').textContent = 'Synapse Hanzi';
  radicalTab = radicalReturnTab;
  radicalCurrentView = 'cards';
  renderRadicalHub();
  if (typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) {
    SpaRouter.pushView({ view: 'tab', tab: 'radicals' });
  }
}

// Close primary tools & games menu on click outside
document.addEventListener('click', event => {
  const menu = document.getElementById('primaryGamesMenu');
  if (menu && menu.open && !menu.contains(event.target)) {
    menu.open = false;
  }
});

// Close primary tools & games menu on Escape and return focus to trigger
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' || event.key === 'Esc') {
    const menu = document.getElementById('primaryGamesMenu');
    if (menu && menu.open) {
      menu.open = false;
      const trigger = menu.querySelector('.primary-menu-trigger');
      if (trigger) trigger.focus();
    }
  }
});

// Sync aria-expanded state on toggle
(function initPrimaryMenuAria() {
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
})();

