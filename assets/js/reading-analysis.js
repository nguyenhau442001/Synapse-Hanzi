/**
 * HSK 4 Reading & Analysis Module (Đọc hiểu & Phân tích ngữ pháp HSK 4)
 * Based on official Hanban/CTI standard mock test materials.
 * Redesigned: Monochromatic palette, unified navigation, Zen Mode, clean typography hierarchy.
 */

let readingAnalysisData = null;
let readingAnalysisDataPromise = null;
let readingCategory = 'all'; // 'all' | 'sentence_building' | 'sentence_logic' | 'cloze' | 'paragraph'
let readingTestFilter = 'all'; // 'all' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
let readingFilteredList = [];
let readingCurrentIndex = 0;
let readingSelectedTokenIndex = null;
let readingActiveMode = 'practice'; // 'practice' | 'breakdown'
let readingExerciseState = 'answering'; // 'answering' | 'reviewed'
let readingSettingsMenuOpen = false;

// Display Preferences
let readingPrefs = {
  pinyin: true,
  hanviet: false, // Default off in top ruby to prevent character clutter; presented in inline vocab strip
  meaning: true,
  highlight: true,
  speechSpeed: 1.0,
  dictationMode: false,
  zenMode: false,
  grammarExpanded: true
};

// Practice State for Current Entry
let practiceBuilderSlots = [];
let practiceBuilderBank = [];
let practiceSolved = false;
let practiceSelectedOption = null;
let practiceFeedback = null;

// Initialize Preferences from localStorage
try {
  const saved = localStorage.getItem('hsk4_reading_prefs');
  if (saved) {
    readingPrefs = Object.assign(readingPrefs, JSON.parse(saved));
  }
} catch (e) {}

function saveReadingPrefs() {
  try {
    localStorage.setItem('hsk4_reading_prefs', JSON.stringify(readingPrefs));
  } catch (e) {}
}

function toggleReadingGrammarExpand() {
  readingPrefs.grammarExpanded = !readingPrefs.grammarExpanded;
  saveReadingPrefs();
  const drawer = document.getElementById('readingGrammarDrawer');
  const body = document.getElementById('readingGrammarBody');
  const hint = document.getElementById('grammarToggleHint');
  const chevron = document.getElementById('grammarToggleChevron');
  if (drawer && body) {
    drawer.classList.toggle('is-expanded', readingPrefs.grammarExpanded);
    body.style.display = readingPrefs.grammarExpanded ? '' : 'none';
    if (hint) hint.textContent = readingPrefs.grammarExpanded ? 'Thu gọn' : 'Xem chi tiết (G)';
    if (chevron) chevron.textContent = readingPrefs.grammarExpanded ? '▲' : '▼';
  } else {
    renderReadingAnalysisScreen();
  }
}

/**
 * Load Reading Analysis dataset
 */
async function ensureReadingAnalysisLoaded() {
  if (readingAnalysisData && readingAnalysisData.length) return readingAnalysisData;
  if (readingAnalysisDataPromise) return readingAnalysisDataPromise;

  readingAnalysisDataPromise = fetch('database/reading/hsk4_reading_analysis.json')
    .then(r => {
      if (!r.ok) throw new Error('Không thể tải cơ sở dữ liệu Đọc hiểu HSK 4.');
      return r.json();
    })
    .then(data => {
      readingAnalysisData = data;
      return data;
    })
    .catch(err => {
      console.error(err);
      readingAnalysisData = [];
      return [];
    });

  return readingAnalysisDataPromise;
}

/**
 * Filter pool according to selected category and test
 */
function updateReadingFilteredList() {
  if (!readingAnalysisData || !readingAnalysisData.length) {
    readingFilteredList = [];
    return;
  }
  readingFilteredList = readingAnalysisData.filter(item => {
    const matchCat = (readingCategory === 'all' || item.category === readingCategory);
    const matchTest = (readingTestFilter === 'all' || item.test_id === readingTestFilter);
    return matchCat && matchTest;
  });
  if (readingCurrentIndex >= readingFilteredList.length) {
    readingCurrentIndex = 0;
  }
}

function getFilteredCatCount(cat) {
  if (!readingAnalysisData) return 0;
  return readingAnalysisData.filter(d => {
    const matchTest = (readingTestFilter === 'all' || d.test_id === readingTestFilter);
    const matchCat = (cat === 'all' || d.category === cat);
    return matchTest && matchCat;
  }).length;
}

/**
 * Main entry point when user navigates to Reading Tab
 */
async function startReadingAnalysis() {
  const container = document.getElementById('screenReadingAnalysis');
  if (!container) return;

  container.style.display = '';
  document.body.classList.add('reading-view-active');
  document.body.classList.toggle('reading-zen-active', Boolean(readingPrefs.zenMode));
  await ensureReadingAnalysisLoaded();
  updateReadingFilteredList();

  const urlParams = new URLSearchParams(window.location.search);
  const qParam = urlParams.get('q');
  if (qParam) {
    const qIdx = parseInt(qParam, 10) - 1;
    if (!isNaN(qIdx) && qIdx >= 0 && qIdx < readingFilteredList.length) {
      readingCurrentIndex = qIdx;
    }
  }

  renderReadingAnalysisScreen();
}

/**
 * Change Category Filter
 */
function setReadingCategory(cat) {
  readingCategory = cat;
  updateReadingFilteredList();
  readingCurrentIndex = 0;
  resetPracticeState();
  renderReadingAnalysisScreen();
}

/**
 * Change Mock Test Filter ('all' | 1 | 2 | ... | 10)
 */
function setReadingTestFilter(testId) {
  readingTestFilter = testId;
  updateReadingFilteredList();
  readingCurrentIndex = 0;
  resetPracticeState();
  renderReadingAnalysisScreen();
}

/**
 * Switch Active Sub-mode: 'breakdown' | 'practice'
 */
function setReadingActiveMode(mode) {
  readingActiveMode = mode;
  if (mode === 'breakdown') {
    readingExerciseState = 'reviewed';
  } else {
    if (!practiceSolved) {
      readingExerciseState = 'answering';
    }
  }
  renderReadingAnalysisScreen();
}

/**
 * Jump to next / prev question
 */
function nextReadingQuestion() {
  if (readingCurrentIndex < readingFilteredList.length - 1) {
    readingCurrentIndex++;
    readingSelectedTokenIndex = null;
    resetPracticeState();
    renderReadingAnalysisScreen();
    syncRouterReadingQ();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  }
}

function prevReadingQuestion() {
  if (readingCurrentIndex > 0) {
    readingCurrentIndex--;
    readingSelectedTokenIndex = null;
    resetPracticeState();
    renderReadingAnalysisScreen();
    syncRouterReadingQ();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  }
}

function jumpToReadingIndex(idx) {
  idx = parseInt(idx, 10);
  if (!isNaN(idx) && idx >= 0 && idx < readingFilteredList.length) {
    readingCurrentIndex = idx;
    readingSelectedTokenIndex = null;
    resetPracticeState();
    renderReadingAnalysisScreen();
    syncRouterReadingQ();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  }
}

function syncRouterReadingQ() {
  if (typeof SpaRouter !== 'undefined' && typeof SpaRouter.replaceView === 'function') {
    SpaRouter.replaceView({ view: 'tab', tab: 'reading', q: readingCurrentIndex + 1 });
  }
}

function resetPracticeState() {
  practiceSolved = false;
  practiceSelectedOption = null;
  practiceFeedback = null;
  readingSelectedTokenIndex = null;
  readingExerciseState = (readingActiveMode === 'breakdown') ? 'reviewed' : 'answering';
  const entry = readingFilteredList[readingCurrentIndex];
  if (!entry) return;

  if (entry.practice) {
    if (entry.practice.scrambled_chunks) {
      practiceBuilderBank = entry.practice.scrambled_chunks.slice();
      practiceBuilderSlots = [];
    } else if (entry.practice.options || entry.practice.scrambled_items) {
      const raw = entry.practice.options || entry.practice.scrambled_items;
      practiceBuilderBank = raw.map(it => ({
        key: it.key || it.id || '',
        text: it.text || ''
      }));
      practiceBuilderSlots = [];
    }
  }
}

function retryPractice() {
  resetPracticeState();
  readingExerciseState = 'answering';
  renderReadingAnalysisScreen();
}

function revealExplanationDirectly() {
  readingExerciseState = 'reviewed';
  const entry = readingFilteredList[readingCurrentIndex];
  if (entry) playReadingSentenceAudio(entry);
  renderReadingAnalysisScreen();
  setTimeout(() => {
    const sheet = document.getElementById('readingExplanationSheet');
    if (sheet) sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function toggleReadingSettingsMenu(e) {
  if (e) {
    e.stopPropagation();
  }
  readingSettingsMenuOpen = !readingSettingsMenuOpen;
  const menu = document.getElementById('readingSettingsMenu');
  const btn = document.getElementById('readingSettingsBtn');
  if (menu) menu.style.display = readingSettingsMenuOpen ? 'block' : 'none';
  if (btn) {
    btn.setAttribute('aria-expanded', readingSettingsMenuOpen);
    btn.classList.toggle('active', readingSettingsMenuOpen);
    const arrow = btn.querySelector('.settings-arrow');
    if (arrow) arrow.textContent = readingSettingsMenuOpen ? '▲' : '▾';
  }
}

/**
 * Toggle Display Elements
 */
function toggleReadingPinyin() {
  readingPrefs.pinyin = !readingPrefs.pinyin;
  saveReadingPrefs();
  renderReadingAnalysisScreen();
}

function toggleReadingHanViet() {
  readingPrefs.hanviet = !readingPrefs.hanviet;
  saveReadingPrefs();
  renderReadingAnalysisScreen();
}

function toggleReadingMeaning() {
  readingPrefs.meaning = !readingPrefs.meaning;
  saveReadingPrefs();
  renderReadingAnalysisScreen();
}

function toggleReadingHighlight() {
  readingPrefs.highlight = !readingPrefs.highlight;
  saveReadingPrefs();
  renderReadingAnalysisScreen();
}

function toggleReadingDictation() {
  readingPrefs.dictationMode = !readingPrefs.dictationMode;
  saveReadingPrefs();
  renderReadingAnalysisScreen();
}

function toggleReadingSpeed() {
  readingPrefs.speechSpeed = readingPrefs.speechSpeed === 1.0 ? 0.75 : 1.0;
  saveReadingPrefs();
  const speedBtn = document.getElementById('readingSpeedBtn');
  if (speedBtn) speedBtn.textContent = `${readingPrefs.speechSpeed}x`;
}

function toggleZenMode() {
  readingPrefs.zenMode = !readingPrefs.zenMode;
  saveReadingPrefs();
  document.body.classList.toggle('reading-zen-active', Boolean(readingPrefs.zenMode));
  renderReadingAnalysisScreen();
}

/**
 * Audio TTS Playback
 */
function playReadingSentenceAudio(entry) {
  if (!entry || !entry.zh) return;
  const btn = document.getElementById('readingPlayAudioBtn');
  if (typeof speakText === 'function') {
    speakText(entry.zh, btn, readingPrefs.speechSpeed);
  }
}

/**
 * Render the whole Reading & Analysis UI
 */
function renderReadingAnalysisScreen() {
  const container = document.getElementById('screenReadingAnalysis');
  if (!container) return;

  if (!readingFilteredList.length) {
    container.innerHTML = `
      <div class="reading-analysis-container">
        <div class="reading-empty-state">
          <p>Không có câu hỏi nào phù hợp với bộ lọc hiện tại.</p>
          <button type="button" class="reading-reset-filter-btn" onclick="setReadingTestFilter('all'); setReadingCategory('all');">
            Đặt lại bộ lọc
          </button>
        </div>
      </div>
    `;
    return;
  }

  const currentEntry = readingFilteredList[readingCurrentIndex];

  // Initialize practice items if not already done
  if (practiceBuilderBank.length === 0 && practiceBuilderSlots.length === 0) {
    resetPracticeState();
  }

  // Initialize selected word for sidebar if not already set
  if (readingSelectedTokenIndex === null || !currentEntry.tokens || !currentEntry.tokens[readingSelectedTokenIndex]) {
    readingSelectedTokenIndex = getInitialSelectedTokenIndex(currentEntry);
  }

  const isReviewed = (readingExerciseState === 'reviewed' || readingActiveMode === 'breakdown');

  container.innerHTML = `
    <div class="reading-analysis-container">
      ${renderUnifiedHeaderHtml(currentEntry)}

      <div class="reading-focused-workspace">
        ${renderExerciseCardHtml(currentEntry)}

        ${isReviewed ? renderExplanationSheetHtml(currentEntry) : ''}
      </div>

      ${renderFooterNavHtml(currentEntry)}
    </div>
  `;
}

function renderUnifiedHeaderHtml(currentEntry) {
  return `
    <header class="reading-unified-nav" role="toolbar" aria-label="Thanh điều hướng đọc hiểu">
      <div class="reading-nav-left">
        <button type="button" class="reading-back-btn" onclick="setPrimaryTab('vocab')" title="Quay lại danh sách từ vựng">
          <span aria-hidden="true">←</span>
          <span>Trang chủ</span>
        </button>

        <div class="reading-brand-badge">
          <span class="reading-brand-icon">📖</span>
          <span class="reading-brand-title">Đọc hiểu HSK 4</span>
          <span class="reading-brand-tag">Hanban</span>
        </div>

        <div class="reading-filter-controls">
          <div class="reading-select-pill" title="Lọc theo Đề thi">
            <span class="reading-pill-label">Đề:</span>
            <select class="reading-pill-select" id="readingTestSelect" onchange="setReadingTestFilter(this.value === 'all' ? 'all' : parseInt(this.value, 10))">
              <option value="all" ${readingTestFilter === 'all' ? 'selected' : ''}>Tất cả đề (10 đề)</option>
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(t => {
                const count = readingAnalysisData.filter(d => d.test_id === t).length;
                if (!count) return '';
                return `<option value="${t}" ${readingTestFilter === t ? 'selected' : ''}>Đề ${t} (${count})</option>`;
              }).join('')}
            </select>
          </div>

          <div class="reading-select-pill" title="Lọc theo Dạng bài">
            <span class="reading-pill-label">Dạng:</span>
            <select class="reading-pill-select" id="readingCategorySelect" onchange="setReadingCategory(this.value)">
              <option value="all" ${readingCategory === 'all' ? 'selected' : ''}>Tất cả (${getFilteredCatCount('all')})</option>
              <option value="sentence_building" ${readingCategory === 'sentence_building' ? 'selected' : ''}>🧩 Xếp câu (${getFilteredCatCount('sentence_building')})</option>
              <option value="sentence_logic" ${readingCategory === 'sentence_logic' ? 'selected' : ''}>🔀 Logic A-B-C (${getFilteredCatCount('sentence_logic')})</option>
              <option value="cloze" ${readingCategory === 'cloze' ? 'selected' : ''}>📝 Điền từ (${getFilteredCatCount('cloze')})</option>
              <option value="paragraph" ${readingCategory === 'paragraph' ? 'selected' : ''}>📑 Đoạn văn (${getFilteredCatCount('paragraph')})</option>
            </select>
          </div>
        </div>
      </div>

      <div class="reading-nav-right">
        <!-- Mode Segmented Control -->
        <div class="reading-segmented-control" role="tablist" aria-label="Chế độ học">
          <button type="button" class="reading-segment-btn ${readingActiveMode === 'practice' ? 'active' : ''}" onclick="setReadingActiveMode('practice')" role="tab" aria-selected="${readingActiveMode === 'practice'}">
            Thực chiến
          </button>
          <button type="button" class="reading-segment-btn ${readingActiveMode === 'breakdown' ? 'active' : ''}" onclick="setReadingActiveMode('breakdown')" role="tab" aria-selected="${readingActiveMode === 'breakdown'}">
            Phân tích
          </button>
        </div>

        <!-- Display Settings Dropdown Popover -->
        <div class="reading-settings-wrapper" id="readingSettingsWrapper">
          <button type="button" class="reading-settings-btn ${readingSettingsMenuOpen ? 'active' : ''}" id="readingSettingsBtn" onclick="toggleReadingSettingsMenu(event)" aria-expanded="${readingSettingsMenuOpen}" title="Tùy chọn hiển thị">
            <span aria-hidden="true">⚙️</span>
            <span class="settings-text">Hiển thị</span>
            <span class="settings-arrow">${readingSettingsMenuOpen ? '▲' : '▾'}</span>
          </button>
          <div class="reading-settings-menu" id="readingSettingsMenu" style="${readingSettingsMenuOpen ? 'display: block;' : 'display: none;'}">
            <div class="settings-menu-title">TÙY CHỌN HIỂN THỊ</div>
            <label class="settings-menu-item">
              <input type="checkbox" ${readingPrefs.pinyin ? 'checked' : ''} onchange="toggleReadingPinyin()">
              <span>Phiên âm Pinyin</span>
            </label>
            <label class="settings-menu-item">
              <input type="checkbox" ${readingPrefs.hanviet ? 'checked' : ''} onchange="toggleReadingHanViet()">
              <span>Âm Hán - Việt</span>
            </label>
            <label class="settings-menu-item">
              <input type="checkbox" ${readingPrefs.meaning ? 'checked' : ''} onchange="toggleReadingMeaning()">
              <span>Dịch nghĩa câu gợi ý</span>
            </label>
            <label class="settings-menu-item">
              <input type="checkbox" ${readingPrefs.highlight ? 'checked' : ''} onchange="toggleReadingHighlight()">
              <span>Mẹo bẫy thi & Ngữ pháp</span>
            </label>
          </div>
        </div>
      </div>
    </header>
  `;
}

function renderExerciseCardHtml(currentEntry) {
  const isReviewed = (readingExerciseState === 'reviewed' || readingActiveMode === 'breakdown');
  const meaningText = currentEntry.meaning || currentEntry.vietnamese || '';

  return `
    <section class="reading-exercise-card" aria-label="Khu vực làm bài tập">
      <div class="exercise-card-header">
        <div class="exercise-header-left">
          <div class="exercise-meta-pill">
            <span class="meta-label">Đề ${currentEntry.test_id || 10}</span>
            <span class="meta-separator">·</span>
            <span class="meta-qnum">Câu ${readingCurrentIndex + 1}/${readingFilteredList.length}</span>
          </div>
          ${getCategoryBadgeHtml(currentEntry.category)}
        </div>

        <div class="exercise-header-right">
          <span class="exercise-status-badge ${isReviewed ? 'status-reviewed' : 'status-answering'}">
            ${isReviewed ? '✅ Đã xem giải thích' : '✍️ Đang làm bài'}
          </span>
          ${isReviewed ? `
            <div class="exercise-audio-group">
              <button type="button" class="reading-btn-speaker" id="readingPlayAudioBtn" onclick="playReadingSentenceAudio(readingFilteredList[readingCurrentIndex])" title="Nghe phát âm chuẩn (Space)">
                🔊 Nghe
              </button>
              <button type="button" class="reading-btn-speed" id="readingSpeedBtn" onclick="toggleReadingSpeed()" title="Đổi tốc độ đọc">
                ${readingPrefs.speechSpeed}x
              </button>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- PROMPT MEANING BANNER -->
      ${readingPrefs.meaning && meaningText ? `
        <div class="exercise-prompt-box">
          <div class="prompt-header">
            <span class="prompt-icon">💡</span>
            <span class="prompt-title">Nghĩa tiếng Việt gợi ý:</span>
          </div>
          <div class="prompt-text">${meaningText}</div>
        </div>
      ` : ''}

      <!-- INTERACTIVE EXERCISE BODY -->
      <div class="exercise-interactive-body">
        ${renderPracticePanelsHtml(currentEntry)}
      </div>

      <!-- FEEDBACK BANNER (If any) -->
      ${renderPracticeFeedbackHtml()}
    </section>
  `;
}

function renderExplanationSheetHtml(currentEntry) {
  return `
    <section class="reading-explanation-sheet" id="readingExplanationSheet" aria-label="Giải thích chi tiết & Ngữ pháp">
      <div class="sheet-header">
        <div class="sheet-title-row">
          <span class="sheet-header-icon">📖</span>
          <div class="sheet-title-text">
            <h2 class="sheet-main-title">Phân tích & Giải thích chi tiết</h2>
            <p class="sheet-sub-title">Đối chiếu đáp án chuẩn, cấu trúc ngữ pháp và mẹo phòng bẫy thi HSK 4</p>
          </div>
        </div>
      </div>

      <!-- 1. FULL STANDARD SENTENCE & AUDIO -->
      <div class="sheet-card sheet-sentence-card">
        <div class="sentence-hero-top">
          <span class="sheet-section-tag">Câu chuẩn ngữ pháp Hanban:</span>
          <div class="sentence-hero-audio">
            <button type="button" class="reading-btn-speaker" onclick="playReadingSentenceAudio(readingFilteredList[readingCurrentIndex])" title="Nghe phát âm chuẩn">
              🔊 Nghe phát âm
            </button>
            <button type="button" class="reading-btn-speed" onclick="toggleReadingSpeed()" title="Đổi tốc độ đọc">
              ${readingPrefs.speechSpeed}x
            </button>
          </div>
        </div>

        <div class="sentence-zh-flow" id="readingZhLine">
          ${renderCleanTokensHtml(currentEntry)}
        </div>

        ${renderSentenceTranslationsHtml(currentEntry)}
      </div>

      <!-- 2. GRAMMAR POINT & EXAM TRAP NOTES -->
      ${currentEntry.grammar_point ? `
        <div class="sheet-card sheet-grammar-card">
          ${renderSidebarGrammarHtml(currentEntry)}
        </div>
      ` : ''}

      <!-- 3. WORD ORDER BREAKDOWN (SVO) -->
      ${(currentEntry.breakdown && currentEntry.breakdown.length) ? `
        <div class="sheet-card sheet-breakdown-card">
          <div class="sheet-card-header">
            <div class="sidebar-header-left">
              <span class="sidebar-header-icon">🔬</span>
              <span class="sidebar-header-title">Phân tách thành phần cấu trúc câu</span>
            </div>
          </div>
          <div class="breakdown-chips-flow">
            ${currentEntry.breakdown.map(b => `
              <div class="breakdown-chip">
                <span class="b-chip-role">${b.role}</span>
                <span class="b-chip-text">${b.text}</span>
                ${b.desc ? `<span class="b-chip-desc">${b.desc}</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 4. VOCABULARY IN SENTENCE -->
      ${(currentEntry.tokens && currentEntry.tokens.length) ? `
        <div class="sheet-card sheet-vocab-card">
          <div class="sheet-card-header">
            <div class="sidebar-header-left">
              <span class="sidebar-header-icon">📚</span>
              <span class="sidebar-header-title">Từ vựng trong câu</span>
            </div>
            <span class="sidebar-hint-tag">Bấm vào từ để xem nghĩa và nghe phát âm</span>
          </div>

          <div class="sheet-vocab-list">
            ${renderSidebarVocabGridHtml(currentEntry)}
          </div>

          <!-- Word Detail micro-panel -->
          <div class="sheet-word-detail-container" id="readingWordDetailPanel">
            ${renderSidebarWordDetailHtml(currentEntry)}
          </div>
        </div>
      ` : ''}

      <!-- 5. BOTTOM NAVIGATION CTA -->
      <div class="sheet-bottom-cta">
        <button type="button" class="sheet-next-btn" onclick="nextReadingQuestion()">
          <span>Tiếp tục sang câu tiếp theo</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  `;
}

function renderFooterNavHtml(currentEntry) {
  return `
    <footer class="reading-global-footer" role="navigation" aria-label="Điều hướng câu hỏi">
      <button type="button" class="reading-nav-btn prev-btn" onclick="prevReadingQuestion()" ${readingCurrentIndex === 0 ? 'disabled' : ''} title="Câu trước (← hoặc K)">
        ← Câu trước
      </button>

      <div class="reading-footer-middle">
        <select class="reading-jump-select" aria-label="Chọn nhanh câu hỏi" onchange="jumpToReadingIndex(this.value)">
          ${readingFilteredList.map((item, idx) => `
            <option value="${idx}" ${idx === readingCurrentIndex ? 'selected' : ''}>
              Câu ${idx + 1}/${readingFilteredList.length} · ${getCategoryLabel(item.category)}
            </option>
          `).join('')}
        </select>
      </div>

      <button type="button" class="reading-nav-btn next-btn" onclick="nextReadingQuestion()" ${readingCurrentIndex === readingFilteredList.length - 1 ? 'disabled' : ''} title="Câu tiếp theo (→ hoặc J)">
        Câu tiếp theo →
      </button>
    </footer>
  `;
}

function getCategoryBadgeHtml(cat) {
  switch (cat) {
    case 'sentence_building': return '<span class="cat-pill cat-building">🧩 Xếp câu</span>';
    case 'sentence_logic': return '<span class="cat-pill cat-logic">🔀 Logic A-B-C</span>';
    case 'cloze': return '<span class="cat-pill cat-cloze">📝 Điền từ</span>';
    case 'paragraph': return '<span class="cat-pill cat-para">📑 Đoạn văn</span>';
    default: return '<span class="cat-pill">Đọc hiểu</span>';
  }
}

function getCategoryLabel(cat) {
  switch (cat) {
    case 'sentence_building': return 'Xếp câu';
    case 'sentence_logic': return 'Logic A-B-C';
    case 'cloze': return 'Điền từ';
    case 'paragraph': return 'Đoạn văn';
    default: return 'Đọc hiểu';
  }
}

/**
 * Determine default selected token for sidebar detail
 */
function getInitialSelectedTokenIndex(entry) {
  if (!entry || !entry.tokens || !entry.tokens.length) return null;
  // 1. Look for first grammar token that isn't punctuation
  const grammarIdx = entry.tokens.findIndex(t => {
    const text = (t.text || '').trim();
    return t.type === 'grammar' && !/^[，。？！、；：“”‘’（）《》…—]+$/.test(text);
  });
  if (grammarIdx !== -1) return grammarIdx;

  // 2. Look for first core token
  const coreIdx = entry.tokens.findIndex(t => {
    const text = (t.text || '').trim();
    return t.type === 'core' && !/^[，。？！、；：“”‘’（）《》…—]+$/.test(text);
  });
  if (coreIdx !== -1) return coreIdx;

  // 3. Fallback to first word token
  const firstWordIdx = entry.tokens.findIndex(t => {
    const text = (t.text || '').trim();
    return !/^[，。？！、；：“”‘’（）《》…—]+$/.test(text);
  });
  return firstWordIdx !== -1 ? firstWordIdx : 0;
}

/**
 * Select a word token to inspect in the dedicated sidebar panel
 */
function selectReadingWord(tokenIdx, shouldSpeak = false) {
  tokenIdx = parseInt(tokenIdx, 10);
  const entry = readingFilteredList[readingCurrentIndex];
  if (!entry || !entry.tokens || isNaN(tokenIdx) || !entry.tokens[tokenIdx]) return;

  readingSelectedTokenIndex = tokenIdx;
  const tok = entry.tokens[tokenIdx];

  // Update active state in Chinese hero line
  document.querySelectorAll('.reading-token-word').forEach((el) => {
    const idx = parseInt(el.getAttribute('data-token-idx'), 10);
    el.classList.toggle('active-inspect', idx === tokenIdx);
  });

  // Update active state in sidebar vocabulary pill list
  document.querySelectorAll('.sidebar-vocab-pill').forEach((el) => {
    const idx = parseInt(el.getAttribute('data-token-idx'), 10);
    el.classList.toggle('active-selected-tag', idx === tokenIdx);
  });

  // Re-render the dedicated detail panel
  const detailPanel = document.getElementById('readingWordDetailPanel');
  if (detailPanel) {
    detailPanel.innerHTML = renderSidebarWordDetailHtml(entry);
  }

  // Audio speech feedback if requested
  if (shouldSpeak && tok && tok.text) {
    speakToken(tok.text);
  }
}

/**
 * Render Tokens naturally without noisy box borders or orange background clutter
 */
function renderCleanTokensHtml(entry) {
  if (!entry || !entry.tokens) return `<span class="reading-zh-text">${entry.zh || ''}</span>`;

  return entry.tokens.map((tok, i) => {
    let highlightClass = '';
    if (readingPrefs.highlight) {
      if (tok.type === 'grammar') highlightClass = 'token-hl-grammar';
      else if (tok.type === 'core') highlightClass = 'token-hl-core';
      else if (tok.type === 'advanced') highlightClass = 'token-hl-advanced';
    }

    const isPunct = /^[，。？！、；：“”‘’（）《》…—]+$/.test(tok.text.trim());

    if (isPunct) {
      return `<span class="reading-token-punct">${tok.text}</span>`;
    }

    const isSelected = (i === readingSelectedTokenIndex);

    return `
      <span class="reading-token-word ${highlightClass} ${isSelected ? 'active-inspect' : ''}" data-token-idx="${i}" onclick="selectReadingWord(${i}, true)" title="${tok.meaning ? `${tok.text} [${tok.hanviet || ''}]: ${tok.meaning}` : 'Bấm để tra từ này'}">
        ${readingPrefs.pinyin ? `<span class="token-py">${tok.pinyin || ''}</span>` : ''}
        <span class="token-zh">${tok.text}</span>
        ${readingPrefs.hanviet ? `<span class="token-hv">${tok.hanviet || ''}</span>` : ''}
      </span>
    `;
  }).join('');
}

/**
 * Render clean sentence translations (Vietnamese & Pinyin) with clear typography
 */
function renderSentenceTranslationsHtml(entry) {
  const viMeaning = entry.meaning || entry.vietnamese || '';
  if (!viMeaning && !entry.pinyin) return '';

  return `
    <div class="reading-sentence-translations">
      ${readingPrefs.meaning && viMeaning ? `
        <div class="reading-translation-meaning">
          ${viMeaning}
        </div>
      ` : ''}
      ${!readingPrefs.pinyin && entry.pinyin ? `
        <div class="reading-translation-pinyin">
          ${entry.pinyin}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render Sidebar Vocabulary List / Grid (Neat tags, top of sidebar)
 */
function renderSidebarVocabGridHtml(entry) {
  if (!entry || !entry.tokens || !entry.tokens.length) {
    return `<div class="sidebar-empty-state">Không có từ vựng bổ trợ cho câu này.</div>`;
  }

  const validTokens = entry.tokens
    .map((tok, idx) => ({ tok, idx }))
    .filter(({ tok }) => {
      const text = (tok.text || '').trim();
      return text && !/^[，。？！、；：“”‘’（）《》…—]+$/.test(text);
    });

  if (!validTokens.length) {
    return `<div class="sidebar-empty-state">Không có từ vựng.</div>`;
  }

  return `
    <div class="sidebar-vocab-grid">
      ${validTokens.map(({ tok, idx }) => {
        const isSelected = (idx === readingSelectedTokenIndex);
        let badgeType = '';
        if (tok.type === 'grammar') badgeType = 'pill-grammar';
        else if (tok.type === 'core') badgeType = 'pill-core';
        else if (tok.type === 'advanced') badgeType = 'pill-adv';

        let shortMeaning = tok.meaning || '';
        if (!shortMeaning && tok.role) {
          const m = tok.role.match(/\(([^)]+)\)/);
          shortMeaning = m ? m[1] : tok.role;
        }

        return `
          <button type="button" 
            class="sidebar-vocab-pill ${badgeType} ${isSelected ? 'active-selected-tag' : ''}" 
            data-token-idx="${idx}"
            onclick="selectReadingWord(${idx}, true)"
            title="${tok.text} ${tok.hanviet ? `[${tok.hanviet}]` : ''}: ${shortMeaning || tok.role || ''}">
            <div class="pill-top-row">
              <span class="pill-zh">${tok.text}</span>
              ${tok.pinyin ? `<span class="pill-py">${tok.pinyin}</span>` : ''}
            </div>
            <div class="pill-bottom-row">
              ${tok.hanviet ? `<span class="pill-hv">[${tok.hanviet}]</span>` : ''}
              ${shortMeaning ? `<span class="pill-mean">${shortMeaning}</span>` : ''}
            </div>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Render Dedicated Detail Panel for Selected Word (Middle of sidebar)
 */
/**
 * Render Dedicated Detail Panel for Selected Word (Middle of sidebar)
 * Strictly no duplicated exam trap notes - clean breathing whitespace
 */
function renderSidebarWordDetailHtml(entry) {
  if (!entry || !entry.tokens || readingSelectedTokenIndex === null || !entry.tokens[readingSelectedTokenIndex]) {
    return `
      <div class="sw-placeholder">
        <span class="sw-placeholder-icon">👆</span>
        <div class="sw-placeholder-text">Bấm vào bất kỳ từ nào ở danh sách phía trên hoặc trên câu chính để xem chi tiết.</div>
      </div>
    `;
  }

  const tok = entry.tokens[readingSelectedTokenIndex];

  // Compute label & badge
  let badgeLabel = 'Từ vựng';
  let badgeClass = 'sw-badge-normal';
  if (tok.type === 'grammar') {
    badgeLabel = '⚡ Ngữ pháp';
    badgeClass = 'sw-badge-grammar';
  } else if (tok.type === 'core') {
    badgeLabel = 'Cốt lõi HSK 4';
    badgeClass = 'sw-badge-core';
  } else if (tok.type === 'advanced') {
    badgeLabel = 'Mở rộng';
    badgeClass = 'sw-badge-adv';
  }

  // Meaning resolution
  let meaning = tok.meaning || '';
  let roleDesc = tok.role || '';
  if (!meaning && roleDesc) {
    const m = roleDesc.match(/\(([^)]+)\)/);
    if (m) meaning = m[1];
    else meaning = roleDesc;
  }

  return `
    <div class="sw-detail-inner">
      <div class="sw-header-bar">
        <div class="sw-header-title-box">
          <span class="sw-header-icon">🔍</span>
          <span class="sw-header-label">Từ vựng đang chọn</span>
        </div>
        <span class="sw-badge ${badgeClass}">${badgeLabel}</span>
      </div>

      <div class="sw-main-hero">
        <div class="sw-hero-left">
          <div class="sw-zh-row">
            <span class="sw-zh">${tok.text}</span>
            <button type="button" class="sw-audio-btn" onclick="speakToken('${tok.text}')" title="Phát âm từ này (Audio)">
              🔊
            </button>
            <div class="sw-phonetics">
              ${tok.pinyin ? `<span class="sw-py">${tok.pinyin}</span>` : ''}
              ${tok.hanviet ? `<span class="sw-hv">[${tok.hanviet}]</span>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Meaning Block -->
      <div class="sw-meaning-block">
        <div class="sw-meaning-label">Nghĩa tiếng Việt</div>
        <div class="sw-meaning-text">${meaning || 'Chưa có chú giải nghĩa tiếng Việt'}</div>
      </div>

      <!-- Syntax / Role Line (No duplicate exam notes) -->
      ${roleDesc ? `
        <div class="sw-role-block">
          <span class="sw-role-tag">Cú pháp trong câu:</span>
          <span class="sw-role-desc">${roleDesc}</span>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render Highlighted Grammar Analysis & Exam Traps Box (Bottom of sidebar)
 * Consolidated, single authority for exam tips and grammar structure
 */
function renderSidebarGrammarHtml(entry) {
  const gp = entry.grammar_point || {};
  if (!gp.name && !gp.pattern && !gp.trap_note && !gp.explanation) {
    return `
      <div class="sidebar-empty-grammar">
        Không có lưu ý ngữ pháp đặc biệt cho câu này.
      </div>
    `;
  }

  return `
    <div class="sidebar-grammar-inner">
      <div class="sidebar-card-header grammar-highlight-header">
        <div class="sidebar-header-left">
          <span class="grammar-lightning-icon">⚡</span>
          <span class="sidebar-header-title">Ngữ pháp & Mẹo thi</span>
        </div>
        ${gp.level ? `<span class="sidebar-grammar-level">${gp.level}</span>` : ''}
      </div>

      ${gp.name ? `
        <div class="sidebar-grammar-name">
          <span class="sgn-title">${gp.name}</span>
        </div>
      ` : ''}

      ${gp.pattern ? `
        <div class="sidebar-grammar-pattern">
          <span class="sgp-label">Cấu trúc trọng điểm:</span>
          <code class="sgp-code">${gp.pattern}</code>
        </div>
      ` : ''}

      ${gp.trap_note ? `
        <div class="sidebar-grammar-trap">
          <div class="sgt-header">
            <span class="sgt-icon">⚠️</span>
            <span class="sgt-title">Mẹo bẫy thi HSK 4:</span>
          </div>
          <div class="sgt-content">${gp.trap_note}</div>
        </div>
      ` : ''}

      ${gp.explanation ? `
        <div class="sidebar-grammar-exp">
          <span class="sge-title">💡 Giải thích ứng dụng:</span>
          <span class="sge-content">${gp.explanation}</span>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render Dictation Input Box
 */
function renderDictationBoxHtml(entry) {
  return `
    <div class="reading-dictation-box">
      <div class="dictation-input-row">
        <input type="text" id="dictationInput" class="dictation-input" placeholder="Gõ chữ Hán hoặc Pinyin nghe được..." autocomplete="off">
        <button type="button" class="dictation-check-btn" onclick="checkDictationAnswer()">Kiểm tra</button>
      </div>
      <div class="dictation-feedback" id="dictationFeedback"></div>
    </div>
  `;
}

/**
 * Legacy inspectToken alias to selectReadingWord
 */
function inspectToken(tokenIdx) {
  selectReadingWord(tokenIdx, true);
}

function speakToken(word) {
  if (typeof speakText === 'function') {
    speakText(word, null, 0.85);
  }
}

function closeInspector() {
  const inspector = document.getElementById('readingTokenInspector');
  if (inspector) inspector.style.display = 'none';
  document.querySelectorAll('.reading-token-word').forEach(el => el.classList.remove('active-inspect'));
}

/**
 * Render Grammar & Component Breakdown Panels as a Collapsible Focused Drawer
 */
function renderBreakdownPanelsHtml(entry) {
  const gp = entry.grammar_point || {};
  const breakdown = entry.breakdown || [];
  const isExpanded = Boolean(readingPrefs.grammarExpanded);

  return `
    <div class="reading-grammar-drawer ${isExpanded ? 'is-expanded' : ''}" id="readingGrammarDrawer">
      <button type="button" class="reading-grammar-toggle-bar" onclick="toggleReadingGrammarExpand()" aria-expanded="${isExpanded}">
        <div class="grammar-toggle-left">
          <span class="grammar-toggle-icon">⚡</span>
          <span class="grammar-toggle-title">Phân tích ngữ pháp & Mẹo bẫy thi</span>
          ${gp.name ? `<span class="grammar-toggle-badge">${gp.name}</span>` : ''}
        </div>
        <div class="grammar-toggle-right">
          <span class="grammar-toggle-hint" id="grammarToggleHint">${isExpanded ? 'Thu gọn' : 'Xem chi tiết (G)'}</span>
          <span class="grammar-toggle-chevron" id="grammarToggleChevron">${isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      <div class="reading-grammar-body" id="readingGrammarBody" style="${isExpanded ? '' : 'display: none;'}">
        <!-- GRAMMAR TRAP & PATTERN CARD (Clean monochromatic with accent border) -->
        <div class="grammar-trap-card">
          <div class="grammar-trap-header">
            <div class="grammar-trap-title">
              <span>⚡ ${gp.name || 'Phân tích ngữ pháp trọng tâm'}</span>
            </div>
            <span class="reading-exam-tag">${gp.level || 'HSK 4 Trọng điểm'}</span>
          </div>

          ${gp.pattern ? `<div class="grammar-trap-pattern"><strong>Cấu trúc:</strong> <code>${gp.pattern}</code></div>` : ''}

          ${gp.trap_note ? `
            <div class="grammar-trap-note">
              <strong>⚠️ Mẹo phòng bẫy thi HSK 4:</strong> ${gp.trap_note}
            </div>
          ` : ''}

          ${gp.explanation ? `
            <div class="grammar-explanation-text">
              <strong>💡 Phân tích chi tiết:</strong> ${gp.explanation}
            </div>
          ` : ''}
        </div>

        <!-- SVO / COMPONENT BREAKDOWN TABLE (Clean, monochromatic) -->
        ${breakdown.length > 0 ? `
          <div class="sentence-breakdown-card">
            <div class="breakdown-card-title">
              <span>🔬 Phân tách thành phần cấu trúc câu (Word Order Breakdown)</span>
            </div>
            <div class="breakdown-table-wrapper">
              <table class="breakdown-table">
                <thead>
                  <tr>
                    <th style="width: 140px;">Thành phần ngữ pháp</th>
                    <th style="width: 180px;">Từ ngữ trong câu</th>
                    <th>Chức năng & Ý nghĩa ngữ pháp</th>
                  </tr>
                </thead>
                <tbody>
                  ${breakdown.map(b => `
                    <tr>
                      <td><span class="breakdown-role-badge">${b.role}</span></td>
                      <td><span class="breakdown-text">${b.text}</span></td>
                      <td><span class="breakdown-desc">${b.desc || ''}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderPracticeFeedbackHtml() {
  if (!practiceFeedback) return '<div id="practiceResultFeedback"></div>';
  return `
    <div id="practiceResultFeedback">
      <div class="practice-result-banner ${practiceFeedback.type}">
        ${practiceFeedback.html}
      </div>
    </div>
  `;
}

/**
 * Render Practice Interactive Modes
 */
function renderPracticePanelsHtml(entry) {
  const p = entry.practice || {};

  // Self-heal practice state if empty or mismatched
  if (p.type === 'sentence_building') {
    if ((practiceBuilderBank.length === 0 && practiceBuilderSlots.length === 0 && p.scrambled_chunks) ||
        practiceBuilderBank.some(x => typeof x !== 'string') ||
        practiceBuilderSlots.some(x => typeof x !== 'string')) {
      resetPracticeState();
    }
  } else if (p.type === 'sentence_logic') {
    if ((practiceBuilderBank.length === 0 && practiceBuilderSlots.length === 0 && p.scrambled_items) ||
        practiceBuilderBank.some(x => !x || typeof x !== 'object') ||
        practiceBuilderSlots.some(x => !x || typeof x !== 'object')) {
      resetPracticeState();
    }
  }

  // Case 1: Sentence Building (Xếp câu)
  if (p.type === 'sentence_building') {
    return `
      <div class="reading-practice-card">
        <div class="practice-header">
          <div class="practice-title">🧩 Dạng 1: Sắp xếp các khối từ thành câu hoàn chỉnh</div>
          <div class="practice-hint-text">Bấm chọn khối từ để xếp theo thứ tự ngữ pháp đúng</div>
        </div>

        <!-- Target Slots -->
        <div class="practice-slots-area ${practiceSolved ? 'is-correct' : ''}" id="practiceSlotsArea">
          ${practiceBuilderSlots.length === 0 ? `
            <span class="practice-empty-placeholder">Bấm chọn các khối từ bên dưới theo trật tự câu đúng...</span>
          ` : practiceBuilderSlots.map((chunk, i) => `
            <button type="button" class="builder-tile slot-tile" onclick="removeFromSlots(${i})">
              ${chunk}
            </button>
          `).join('')}
        </div>

        <!-- Available Bank -->
        <div class="practice-bank-area" id="practiceBankArea">
          ${practiceBuilderBank.map((chunk, i) => `
            <button type="button" class="builder-tile" onclick="moveToSlots(${i})">
              ${chunk}
            </button>
          `).join('')}
        </div>

        <!-- Practice Actions -->
        <div class="practice-actions-bar">
          <div class="practice-btn-group">
            <button type="button" class="practice-action-btn practice-btn-secondary" onclick="resetPracticeState(); renderReadingAnalysisScreen();">
              ↺ Làm lại
            </button>
            <button type="button" class="practice-action-btn practice-btn-secondary" onclick="hintPracticeBuilder()">
              💡 Gợi ý
            </button>
          </div>

          <button type="button" class="practice-action-btn practice-btn-primary" onclick="checkPracticeBuilder()">
            Kiểm tra đáp án
          </button>
        </div>

        ${renderPracticeFeedbackHtml()}
      </div>
    `;
  }

  // Case 2: Cloze Test (Điền khuyết)
  if (p.type === 'cloze') {
    return `
      <div class="reading-practice-card">
        <div class="practice-header">
          <div class="practice-title">📝 Dạng 2: Bài tập Điền khuyết (Cloze Test) theo ngữ cảnh</div>
          <div class="practice-hint-text">Chọn từ thích hợp nhất để điền vào chỗ trống</div>
        </div>

        <div class="cloze-blank-text">
          ${(p.blank_sentence || '').replace('（ ____ ）', `<span class="cloze-blank-spot">${practiceSelectedOption || '？'}</span>`)}
        </div>

        <div class="cloze-options-grid">
          ${(p.options || []).map(opt => {
            let optClass = '';
            if (practiceSelectedOption) {
              if (opt.word === p.target_word) optClass = 'selected-correct';
              else if (opt.word === practiceSelectedOption) optClass = 'selected-wrong';
            }
            return `
              <button type="button" class="cloze-option-btn ${optClass}" onclick="selectClozeOption('${opt.word}')" ${practiceSelectedOption ? 'disabled' : ''}>
                <div>
                  <div class="cloze-opt-zh">${opt.word}</div>
                  <div class="cloze-opt-sub">${opt.pinyin} · [${opt.hanviet}]</div>
                </div>
                <div class="cloze-opt-sub">${opt.meaning}</div>
              </button>
            `;
          }).join('')}
        </div>

        ${p.clue ? `
          <div class="cloze-clue-hint">
            💡 <strong>Gợi ý ngữ cảnh:</strong> ${p.clue}
          </div>
        ` : ''}

        ${renderPracticeFeedbackHtml()}
      </div>
    `;
  }

  // Case 3: Sentence Logic (Sắp xếp A-B-C)
  if (p.type === 'sentence_logic') {
    return `
      <div class="reading-practice-card">
        <div class="practice-header">
          <div class="practice-title">🔀 Dạng 3: Sắp xếp thứ tự logic đoạn văn (A - B - C)</div>
          <div class="practice-hint-text">Chọn thứ tự các câu để tạo thành đoạn văn logic</div>
        </div>

        <!-- Target Slots -->
        <div class="practice-slots-area ${practiceSolved ? 'is-correct' : ''}" id="practiceSlotsArea">
          ${practiceBuilderSlots.length === 0 ? `
            <span class="practice-empty-placeholder">Bấm chọn các vế câu A, B, C theo thứ tự đúng...</span>
          ` : practiceBuilderSlots.map((item, i) => `
            <button type="button" class="builder-tile slot-tile logic-tile" onclick="removeFromSlots(${i})">
              <strong>${item.key}.</strong> ${item.text}
            </button>
          `).join('')}
        </div>

        <!-- Available Bank -->
        <div class="practice-bank-area logic-bank-area" id="practiceBankArea">
          ${practiceBuilderBank.map((item, i) => `
            <button type="button" class="builder-tile logic-tile" onclick="moveToSlots(${i})">
              <strong>${item.key}.</strong> ${item.text}
            </button>
          `).join('')}
        </div>

        <!-- Practice Actions -->
        <div class="practice-actions-bar">
          <div class="practice-btn-group">
            <button type="button" class="practice-action-btn practice-btn-secondary" onclick="resetPracticeState(); renderReadingAnalysisScreen();">
              ↺ Làm lại
            </button>
          </div>

          <button type="button" class="practice-action-btn practice-btn-primary" onclick="checkPracticeLogicOrder()">
            Kiểm tra thứ tự
          </button>
        </div>

        ${renderPracticeFeedbackHtml()}
      </div>
    `;
  }

  return `
    <div class="reading-practice-card">
      <div class="practice-title">📖 Đoạn văn chuyên sâu</div>
      <p style="color:var(--text-secondary); line-height:1.6; margin-top:10px;">
        Đoạn văn này được thiết kế để luyện đọc hiểu toàn diện và phân tích ngữ pháp sống. 
        Hãy chuyển sang tab <strong>"Phân tích"</strong> để xem phân rã thành phần và bẫy đề thi.
      </p>
    </div>
  `;
}

/**
 * Builder Interactions
 */
function moveToSlots(bankIndex) {
  if (bankIndex >= 0 && bankIndex < practiceBuilderBank.length) {
    const item = practiceBuilderBank.splice(bankIndex, 1)[0];
    practiceBuilderSlots.push(item);
    practiceFeedback = null;
    renderReadingAnalysisScreen();
  }
}

function removeFromSlots(slotIndex) {
  if (slotIndex >= 0 && slotIndex < practiceBuilderSlots.length) {
    const item = practiceBuilderSlots.splice(slotIndex, 1)[0];
    practiceBuilderBank.push(item);
    practiceFeedback = null;
    renderReadingAnalysisScreen();
  }
}

function hintPracticeBuilder() {
  const entry = readingFilteredList[readingCurrentIndex];
  if (!entry || !entry.practice || !entry.practice.target_chunks) return;

  const target = entry.practice.target_chunks;
  const nextTargetWord = target[practiceBuilderSlots.length];
  if (!nextTargetWord) return;

  const foundIdx = practiceBuilderBank.findIndex(c => c === nextTargetWord);
  if (foundIdx !== -1) {
    moveToSlots(foundIdx);
  }
}

function checkPracticeBuilder() {
  const entry = readingFilteredList[readingCurrentIndex];
  if (!entry || !entry.practice || !entry.practice.target_chunks) return;

  if (practiceBuilderSlots.length === 0) {
    practiceFeedback = {
      type: 'warning',
      html: `
        <div class="feedback-banner-content">
          <span class="feedback-badge-icon">⚠️</span>
          <div class="feedback-msg">
            <strong>Chưa xếp câu:</strong> Hãy bấm chọn các khối từ để ghép câu trước khi kiểm tra!
          </div>
        </div>
      `
    };
    renderReadingAnalysisScreen();
    return;
  }

  const userSentence = practiceBuilderSlots.join('');
  const targetSentence = entry.practice.target_chunks.join('');

  if (userSentence === targetSentence) {
    practiceSolved = true;
    readingExerciseState = 'reviewed';
    practiceFeedback = {
      type: 'success',
      html: `
        <div class="feedback-banner-content">
          <span class="feedback-badge-icon">🎉</span>
          <div class="feedback-msg">
            <strong>Chính xác xuất sắc!</strong> Trật tự ngữ pháp hoàn toàn chuẩn xác.
          </div>
          <button type="button" class="feedback-cta-btn" onclick="nextReadingQuestion()">Câu tiếp theo →</button>
        </div>
      `
    };
    playReadingSentenceAudio(entry);
    renderReadingAnalysisScreen();
    setTimeout(() => {
      const sheet = document.getElementById('readingExplanationSheet');
      if (sheet) sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  } else {
    practiceSolved = false;
    practiceFeedback = {
      type: 'error',
      html: `
        <div class="feedback-banner-content">
          <span class="feedback-badge-icon">❌</span>
          <div class="feedback-msg">
            <strong>Chưa đúng thứ tự:</strong> Hãy đối chiếu vị trí ngữ pháp hoặc thử lại!
          </div>
          <div class="feedback-actions">
            <button type="button" class="feedback-retry-btn" onclick="retryPractice()">↺ Thử lại</button>
            <button type="button" class="feedback-reveal-btn" onclick="revealExplanationDirectly()">Xem đáp án & giải thích</button>
          </div>
        </div>
      `
    };
    renderReadingAnalysisScreen();
    const slotsArea = document.getElementById('practiceSlotsArea');
    if (slotsArea) {
      slotsArea.classList.add('is-wrong');
      setTimeout(() => slotsArea && slotsArea.classList.remove('is-wrong'), 450);
    }
  }
}

function checkPracticeLogicOrder() {
  const entry = readingFilteredList[readingCurrentIndex];
  if (!entry || !entry.practice || !entry.practice.correct_order) return;

  if (practiceBuilderSlots.length === 0) {
    practiceFeedback = {
      type: 'warning',
      html: `
        <div class="feedback-banner-content">
          <span class="feedback-badge-icon">⚠️</span>
          <div class="feedback-msg">
            <strong>Chưa chọn thứ tự:</strong> Hãy bấm chọn các câu A, B, C theo thứ tự trước khi kiểm tra!
          </div>
        </div>
      `
    };
    renderReadingAnalysisScreen();
    return;
  }

  const userOrder = practiceBuilderSlots.map(item => item.key).join('');
  const targetOrder = entry.practice.correct_order;

  if (userOrder === targetOrder) {
    practiceSolved = true;
    readingExerciseState = 'reviewed';
    practiceFeedback = {
      type: 'success',
      html: `
        <div class="feedback-banner-content">
          <span class="feedback-badge-icon">🎉</span>
          <div class="feedback-msg">
            <strong>Chính xác! Thứ tự chuẩn: ${targetOrder}</strong>
            <p>${entry.practice.explanation || entry.practice.hint || ''}</p>
          </div>
          <button type="button" class="feedback-cta-btn" onclick="nextReadingQuestion()">Câu tiếp theo →</button>
        </div>
      `
    };
    playReadingSentenceAudio(entry);
    renderReadingAnalysisScreen();
    setTimeout(() => {
      const sheet = document.getElementById('readingExplanationSheet');
      if (sheet) sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  } else {
    practiceSolved = false;
    practiceFeedback = {
      type: 'error',
      html: `
        <div class="feedback-banner-content">
          <span class="feedback-badge-icon">❌</span>
          <div class="feedback-msg">
            <strong>Chưa chính xác:</strong> Thứ tự "${userOrder}" chưa đúng logic của đoạn văn.
          </div>
          <div class="feedback-actions">
            <button type="button" class="feedback-retry-btn" onclick="retryPractice()">↺ Thử lại</button>
            <button type="button" class="feedback-reveal-btn" onclick="revealExplanationDirectly()">Xem đáp án & giải thích</button>
          </div>
        </div>
      `
    };
    renderReadingAnalysisScreen();
    const slotsArea = document.getElementById('practiceSlotsArea');
    if (slotsArea) {
      slotsArea.classList.add('is-wrong');
      setTimeout(() => slotsArea && slotsArea.classList.remove('is-wrong'), 450);
    }
  }
}

function selectClozeOption(word) {
  const entry = readingFilteredList[readingCurrentIndex];
  if (!entry || !entry.practice) return;

  practiceSelectedOption = word;
  const p = entry.practice;
  const targetWord = p.target_word || p.correct_answer || '';
  const isCorrect = (word === targetWord);

  if (isCorrect) {
    practiceSolved = true;
    readingExerciseState = 'reviewed';
    practiceFeedback = {
      type: 'success',
      html: `
        <div class="feedback-banner-content">
          <span class="feedback-badge-icon">🎉</span>
          <div class="feedback-msg">
            <strong>Chính xác!</strong> Từ cần điền là <strong>${word}</strong>.
          </div>
          <button type="button" class="feedback-cta-btn" onclick="nextReadingQuestion()">Câu tiếp theo →</button>
        </div>
      `
    };
    playReadingSentenceAudio(entry);
    renderReadingAnalysisScreen();
    setTimeout(() => {
      const sheet = document.getElementById('readingExplanationSheet');
      if (sheet) sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  } else {
    practiceSolved = false;
    practiceFeedback = {
      type: 'error',
      html: `
        <div class="feedback-banner-content">
          <span class="feedback-badge-icon">❌</span>
          <div class="feedback-msg">
            <strong>Chưa chính xác.</strong> Đáp án đúng là <strong>${targetWord}</strong>.
          </div>
          <div class="feedback-actions">
            <button type="button" class="feedback-retry-btn" onclick="retryPractice()">↺ Thử lại</button>
            <button type="button" class="feedback-reveal-btn" onclick="revealExplanationDirectly()">Xem giải thích</button>
          </div>
        </div>
      `
    };
    renderReadingAnalysisScreen();
  }
}

/**
 * Dictation Check
 */
function checkDictationAnswer() {
  const entry = readingFilteredList[readingCurrentIndex];
  const input = document.getElementById('dictationInput');
  const feedback = document.getElementById('dictationFeedback');
  if (!entry || !input || !feedback) return;

  const val = input.value.trim().replace(/[，。？！\s]/g, '');
  const targetZh = entry.zh.replace(/[，。？！\s]/g, '');

  if (val === targetZh) {
    feedback.className = 'dictation-feedback success';
    feedback.innerHTML = `🎉 <strong>Tuyệt vời!</strong> Bạn đã chép chính xác 100%: <em>${entry.zh}</em>`;
  } else {
    feedback.className = 'dictation-feedback error';
    feedback.innerHTML = `
      <div>Đáp án câu gốc: <strong style="color:var(--accent); font-size:1.05rem;">${entry.zh}</strong></div>
      <div style="font-size:0.84rem; color:var(--text-secondary); margin-top:2px;">(Pinyin: ${entry.pinyin})</div>
    `;
  }
}

// Attach keyboard navigation listeners
if (!window._readingKeyHandlerAttached) {
  window._readingKeyHandlerAttached = true;
  window.addEventListener('keydown', (e) => {
    const screen = document.getElementById('screenReadingAnalysis');
    if (!screen || screen.style.display === 'none') return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

    if (e.key === 'ArrowRight' || e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      nextReadingQuestion();
    } else if (e.key === 'ArrowLeft' || e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      prevReadingQuestion();
    } else if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      toggleZenMode();
    } else if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      toggleReadingGrammarExpand();
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      toggleReadingPinyin();
    } else if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      toggleReadingHanViet();
    } else if (e.key === 'v' || e.key === 'V') {
      e.preventDefault();
      toggleReadingMeaning();
    } else if (e.key === ' ' && !readingPrefs.dictationMode) {
      e.preventDefault();
      const current = readingFilteredList && readingFilteredList[readingCurrentIndex];
      if (current && (readingExerciseState === 'reviewed' || readingActiveMode === 'breakdown')) {
        playReadingSentenceAudio(current);
      }
    } else if (e.key === 'Escape') {
      if (readingSettingsMenuOpen) {
        toggleReadingSettingsMenu();
      } else if (readingPrefs.zenMode) {
        e.preventDefault();
        toggleZenMode();
      }
    }
  });
}

// Close settings popover on click outside
document.addEventListener('click', (e) => {
  if (readingSettingsMenuOpen) {
    const wrapper = document.getElementById('readingSettingsWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      readingSettingsMenuOpen = false;
      const menu = document.getElementById('readingSettingsMenu');
      const btn = document.getElementById('readingSettingsBtn');
      if (menu) menu.style.display = 'none';
      if (btn) {
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('active');
        const arrow = btn.querySelector('.settings-arrow');
        if (arrow) arrow.textContent = '▾';
      }
    }
  }
});

// Global Exports
window.startReadingAnalysis = startReadingAnalysis;
window.setReadingCategory = setReadingCategory;
window.setReadingTestFilter = setReadingTestFilter;
window.setReadingActiveMode = setReadingActiveMode;
window.nextReadingQuestion = nextReadingQuestion;
window.prevReadingQuestion = prevReadingQuestion;
window.jumpToReadingIndex = jumpToReadingIndex;
window.toggleReadingPinyin = toggleReadingPinyin;
window.toggleReadingHanViet = toggleReadingHanViet;
window.toggleReadingMeaning = toggleReadingMeaning;
window.toggleReadingHighlight = toggleReadingHighlight;
window.toggleReadingGrammarExpand = toggleReadingGrammarExpand;
window.toggleReadingDictation = toggleReadingDictation;
window.toggleReadingSpeed = toggleReadingSpeed;
window.toggleZenMode = toggleZenMode;
window.toggleReadingSettingsMenu = toggleReadingSettingsMenu;
window.retryPractice = retryPractice;
window.revealExplanationDirectly = revealExplanationDirectly;
window.playReadingSentenceAudio = playReadingSentenceAudio;
window.selectReadingWord = selectReadingWord;
window.inspectToken = inspectToken;
window.closeInspector = closeInspector;
window.speakToken = speakToken;
window.moveToSlots = moveToSlots;
window.removeFromSlots = removeFromSlots;
window.hintPracticeBuilder = hintPracticeBuilder;
window.checkPracticeBuilder = checkPracticeBuilder;
window.checkPracticeLogicOrder = checkPracticeLogicOrder;
window.selectClozeOption = selectClozeOption;
window.checkDictationAnswer = checkDictationAnswer;
window.resetPracticeState = resetPracticeState;
