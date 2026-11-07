// HSK 4 Reading & Analysis (Đọc hiểu & Phân tích ngữ pháp HSK 4) on the official Hanban mock tests:
// practice (sentence building, A-B-C logic, cloze) and a breakdown sheet with grammar, sentence
// components and vocabulary. Preact port of the former assets/js/reading-analysis.js: the state stays
// in module variables as before, and renderReadingAnalysisScreen() now re-renders the island.
import { render } from 'preact';
import { signal } from '@preact/signals';

/* global SpaRouter -- spa-router.js */

let data = null;
let dataPromise = null;
let category = 'all';            // 'all' | 'sentence_building' | 'sentence_logic' | 'cloze' | 'paragraph'
let testFilter = 'all';          // 'all' | 1..10
let filteredList = [];
let currentIndex = 0;
let selectedTokenIndex = null;
let activeMode = 'practice';     // 'practice' | 'breakdown'
let exerciseState = 'answering'; // 'answering' | 'reviewed'
let settingsMenuOpen = false;
let started = false;

let prefs = {
  pinyin: true,
  hanviet: false, // off in the ruby line; shown in the vocabulary strip instead
  meaning: true,
  highlight: true,
  speechSpeed: 1.0,
  dictationMode: false,
  zenMode: false,
  grammarExpanded: true
};
try {
  const saved = localStorage.getItem('hsk4_reading_prefs');
  if (saved) prefs = Object.assign(prefs, JSON.parse(saved));
} catch (e) { /* corrupt prefs */ }

// Practice state for the current entry
let builderSlots = [];
let builderBank = [];
let practiceSolved = false;
let selectedOption = null;
let feedback = null; // { type, icon, message, actions }

const tick = signal(0);
const PUNCT_RE = /^[，。？！、；：“”‘’（）《》…—]+$/;

function savePrefs() {
  try { localStorage.setItem('hsk4_reading_prefs', JSON.stringify(prefs)); } catch (e) { /* quota */ }
}

const currentEntry = () => filteredList[currentIndex];
const isReviewed = () => exerciseState === 'reviewed' || activeMode === 'breakdown';

export function ensureReadingAnalysisLoaded() {
  if (data && data.length) return Promise.resolve(data);
  if (dataPromise) return dataPromise;
  dataPromise = fetch('database/reading/hsk4_reading_analysis.json')
    .then((r) => {
      if (!r.ok) throw new Error('Không thể tải cơ sở dữ liệu Đọc hiểu HSK 4.');
      return r.json();
    })
    .then((d) => { data = d; return d; })
    .catch((err) => { console.error(err); data = []; return []; });
  return dataPromise;
}

function updateFilteredList() {
  if (!data || !data.length) {
    filteredList = [];
    return;
  }
  filteredList = data.filter((item) => (category === 'all' || item.category === category) && (testFilter === 'all' || item.test_id === testFilter));
  if (currentIndex >= filteredList.length) currentIndex = 0;
}

function filteredCatCount(cat) {
  if (!data) return 0;
  return data.filter((d) => (testFilter === 'all' || d.test_id === testFilter) && (cat === 'all' || d.category === cat)).length;
}

export function resetPracticeState() {
  practiceSolved = false;
  selectedOption = null;
  feedback = null;
  selectedTokenIndex = null;
  exerciseState = activeMode === 'breakdown' ? 'reviewed' : 'answering';
  const entry = currentEntry();
  if (!entry || !entry.practice) return;
  if (entry.practice.scrambled_chunks) {
    builderBank = entry.practice.scrambled_chunks.slice();
    builderSlots = [];
  } else if (entry.practice.options || entry.practice.scrambled_items) {
    builderBank = (entry.practice.options || entry.practice.scrambled_items).map((it) => ({ key: it.key || it.id || '', text: it.text || '' }));
    builderSlots = [];
  }
}

// Re-render the screen (the legacy entry point name is kept for callers).
export function renderReadingAnalysisScreen() {
  started = true;
  const entry = currentEntry();
  if (entry) {
    if (builderBank.length === 0 && builderSlots.length === 0) resetPracticeState();
    if (selectedTokenIndex !== null && (!entry.tokens || !entry.tokens[selectedTokenIndex])) selectedTokenIndex = null;
    // Self-heal practice state that does not match the exercise type
    const p = entry.practice || {};
    if (p.type === 'sentence_building') {
      if ((builderBank.length === 0 && builderSlots.length === 0 && p.scrambled_chunks)
        || builderBank.some((x) => typeof x !== 'string') || builderSlots.some((x) => typeof x !== 'string')) resetPracticeState();
    } else if (p.type === 'sentence_logic') {
      if ((builderBank.length === 0 && builderSlots.length === 0 && p.scrambled_items)
        || builderBank.some((x) => !x || typeof x !== 'object') || builderSlots.some((x) => !x || typeof x !== 'object')) resetPracticeState();
    }
  }
  tick.value++;
}

export async function startReadingAnalysis() {
  const container = document.getElementById('screenReadingAnalysis');
  if (!container) return;
  container.style.display = '';
  document.body.classList.add('reading-view-active');
  document.body.classList.toggle('reading-zen-active', Boolean(prefs.zenMode));
  await ensureReadingAnalysisLoaded();
  updateFilteredList();
  const qParam = new URLSearchParams(window.location.search).get('q');
  if (qParam) {
    const qIdx = parseInt(qParam, 10) - 1;
    if (!isNaN(qIdx) && qIdx >= 0 && qIdx < filteredList.length) currentIndex = qIdx;
  }
  renderReadingAnalysisScreen();
}

export function setReadingCategory(cat) {
  category = cat;
  updateFilteredList();
  currentIndex = 0;
  resetPracticeState();
  renderReadingAnalysisScreen();
}

export function setReadingTestFilter(testId) {
  testFilter = testId;
  updateFilteredList();
  currentIndex = 0;
  resetPracticeState();
  renderReadingAnalysisScreen();
}

export function setReadingActiveMode(mode) {
  activeMode = mode;
  if (mode === 'breakdown') exerciseState = 'reviewed';
  else if (!practiceSolved) exerciseState = 'answering';
  renderReadingAnalysisScreen();
}

export function jumpToReadingIndex(idx) {
  idx = parseInt(idx, 10);
  if (isNaN(idx) || idx < 0 || idx >= filteredList.length) return;
  currentIndex = idx;
  selectedTokenIndex = null;
  resetPracticeState();
  renderReadingAnalysisScreen();
  if (typeof SpaRouter !== 'undefined' && typeof SpaRouter.replaceView === 'function') {
    SpaRouter.replaceView({ view: 'tab', tab: 'reading', q: currentIndex + 1 });
  }
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* old browsers */ }
}

export const nextReadingQuestion = () => jumpToReadingIndex(currentIndex + 1);
export const prevReadingQuestion = () => jumpToReadingIndex(currentIndex - 1);

export function retryPractice() {
  resetPracticeState();
  exerciseState = 'answering';
  renderReadingAnalysisScreen();
}

function scrollToExplanation(delay) {
  setTimeout(() => {
    const sheet = document.getElementById('readingExplanationSheet');
    if (sheet) sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, delay);
}

export function playReadingSentenceAudio(entry) {
  if (!entry || !entry.zh) return;
  if (typeof window.speakText === 'function') window.speakText(entry.zh, document.getElementById('readingPlayAudioBtn'), prefs.speechSpeed);
}

export function revealExplanationDirectly() {
  exerciseState = 'reviewed';
  const entry = currentEntry();
  if (entry) playReadingSentenceAudio(entry);
  renderReadingAnalysisScreen();
  scrollToExplanation(100);
}

export function toggleReadingSettingsMenu(e) {
  if (e) e.stopPropagation();
  settingsMenuOpen = !settingsMenuOpen;
  renderReadingAnalysisScreen();
}

function togglePref(key) {
  prefs[key] = !prefs[key];
  savePrefs();
  renderReadingAnalysisScreen();
}

export const toggleReadingPinyin = () => togglePref('pinyin');
export const toggleReadingHanViet = () => togglePref('hanviet');
export const toggleReadingMeaning = () => togglePref('meaning');
export const toggleReadingHighlight = () => togglePref('highlight');
export const toggleReadingDictation = () => togglePref('dictationMode');
export const toggleReadingGrammarExpand = () => togglePref('grammarExpanded');

export function toggleReadingSpeed() {
  prefs.speechSpeed = prefs.speechSpeed === 1.0 ? 0.75 : 1.0;
  savePrefs();
  renderReadingAnalysisScreen();
}

export function toggleZenMode() {
  prefs.zenMode = !prefs.zenMode;
  savePrefs();
  document.body.classList.toggle('reading-zen-active', Boolean(prefs.zenMode));
  renderReadingAnalysisScreen();
}

export function speakToken(word) {
  if (typeof window.speakText === 'function') window.speakText(word, null, 0.85);
}

// Select a word (in the sentence or the vocabulary list) to show its detail panel; again to deselect.
export function selectReadingWord(tokenIdx, shouldSpeak = false) {
  tokenIdx = parseInt(tokenIdx, 10);
  const entry = currentEntry();
  if (!entry || !entry.tokens || isNaN(tokenIdx) || !entry.tokens[tokenIdx]) return;
  if (selectedTokenIndex === tokenIdx) {
    selectedTokenIndex = null;
    renderReadingAnalysisScreen();
    return;
  }
  selectedTokenIndex = tokenIdx;
  renderReadingAnalysisScreen();
  const tok = entry.tokens[tokenIdx];
  if (shouldSpeak && tok && tok.text) speakToken(tok.text);
}

export const inspectToken = (tokenIdx) => selectReadingWord(tokenIdx, true);

export function closeInspector() {
  document.querySelectorAll('.reading-token-word').forEach((el) => el.classList.remove('active-inspect'));
}

// ---- Practice interactions --------------------------------------------------------------------
export function moveToSlots(bankIndex) {
  if (bankIndex < 0 || bankIndex >= builderBank.length) return;
  builderSlots.push(builderBank.splice(bankIndex, 1)[0]);
  feedback = null;
  renderReadingAnalysisScreen();
}

export function removeFromSlots(slotIndex) {
  if (slotIndex < 0 || slotIndex >= builderSlots.length) return;
  builderBank.push(builderSlots.splice(slotIndex, 1)[0]);
  feedback = null;
  renderReadingAnalysisScreen();
}

export function hintPracticeBuilder() {
  const entry = currentEntry();
  if (!entry || !entry.practice || !entry.practice.target_chunks) return;
  const next = entry.practice.target_chunks[builderSlots.length];
  if (!next) return;
  const foundIdx = builderBank.findIndex((c) => c === next);
  if (foundIdx !== -1) moveToSlots(foundIdx);
}

function warnNotStarted(message) {
  feedback = { type: 'warning', icon: '⚠️', message };
  renderReadingAnalysisScreen();
}

function markCorrect(entry, message) {
  practiceSolved = true;
  exerciseState = 'reviewed';
  feedback = {
    type: 'success',
    icon: '🎉',
    message,
    actions: <button type="button" class="feedback-cta-btn" onClick={nextReadingQuestion}>Câu tiếp theo →</button>
  };
  playReadingSentenceAudio(entry);
  renderReadingAnalysisScreen();
  scrollToExplanation(120);
}

function markWrong(message, revealLabel = 'Xem đáp án & giải thích', shakeSlots = true) {
  practiceSolved = false;
  feedback = {
    type: 'error',
    icon: '❌',
    message,
    actions: (
      <div class="feedback-actions">
        <button type="button" class="feedback-retry-btn" onClick={retryPractice}>↺ Thử lại</button>{' '}
        <button type="button" class="feedback-reveal-btn" onClick={revealExplanationDirectly}>{revealLabel}</button>
      </div>
    )
  };
  renderReadingAnalysisScreen();
  if (shakeSlots) {
    // after the re-render has been applied
    Promise.resolve().then(() => {
      const slotsArea = document.getElementById('practiceSlotsArea');
      if (!slotsArea) return;
      slotsArea.classList.add('is-wrong');
      setTimeout(() => slotsArea.classList.remove('is-wrong'), 450);
    });
  }
}

export function checkPracticeBuilder() {
  const entry = currentEntry();
  if (!entry || !entry.practice || !entry.practice.target_chunks) return;
  if (builderSlots.length === 0) {
    warnNotStarted(<><strong>Chưa xếp câu:</strong> Hãy bấm chọn các khối từ để ghép câu trước khi kiểm tra!</>);
    return;
  }
  if (builderSlots.join('') === entry.practice.target_chunks.join('')) {
    markCorrect(entry, <><strong>Chính xác xuất sắc!</strong> Trật tự ngữ pháp hoàn toàn chuẩn xác.</>);
  } else {
    markWrong(<><strong>Chưa đúng thứ tự:</strong> Hãy đối chiếu vị trí ngữ pháp hoặc thử lại!</>);
  }
}

export function checkPracticeLogicOrder() {
  const entry = currentEntry();
  if (!entry || !entry.practice || !entry.practice.correct_order) return;
  if (builderSlots.length === 0) {
    warnNotStarted(<><strong>Chưa chọn thứ tự:</strong> Hãy bấm chọn các câu A, B, C theo thứ tự trước khi kiểm tra!</>);
    return;
  }
  const userOrder = builderSlots.map((item) => item.key).join('');
  const targetOrder = entry.practice.correct_order;
  if (userOrder === targetOrder) {
    markCorrect(entry, <><strong>{`Chính xác! Thứ tự chuẩn: ${targetOrder}`}</strong>{' '}<p>{entry.practice.explanation || entry.practice.hint || ''}</p></>);
  } else {
    markWrong(<><strong>Chưa chính xác:</strong>{` Thứ tự "${userOrder}" chưa đúng logic của đoạn văn.`}</>);
  }
}

export function selectClozeOption(word) {
  const entry = currentEntry();
  if (!entry || !entry.practice) return;
  selectedOption = word;
  const targetWord = entry.practice.target_word || entry.practice.correct_answer || '';
  if (word === targetWord) {
    markCorrect(entry, <><strong>Chính xác!</strong> Từ cần điền là <strong>{word}</strong>.</>);
  } else {
    markWrong(<><strong>Chưa chính xác.</strong> Đáp án đúng là <strong>{targetWord}</strong>.</>, 'Xem giải thích', false);
  }
}

// The dictation input is not part of the current layout; kept for API compatibility.
export function checkDictationAnswer() {}

// ---- Rendering --------------------------------------------------------------------------------
const CATEGORY_LABELS = {
  sentence_building: ['cat-building', '🧩 Xếp câu', 'Xếp câu'],
  sentence_logic: ['cat-logic', '🔀 Logic A-B-C', 'Logic A-B-C'],
  cloze: ['cat-cloze', '📝 Điền từ', 'Điền từ'],
  paragraph: ['cat-para', '📑 Đoạn văn', 'Đoạn văn']
};

function CategoryBadge({ cat }) {
  const c = CATEGORY_LABELS[cat];
  return c ? <span class={`cat-pill ${c[0]}`}>{c[1]}</span> : <span class="cat-pill">Đọc hiểu</span>;
}

const categoryLabel = (cat) => (CATEGORY_LABELS[cat] ? CATEGORY_LABELS[cat][2] : 'Đọc hiểu');

function SettingsItem({ checked, onChange, label }) {
  return (
    <label class="settings-menu-item">
      <input type="checkbox" checked={checked} onChange={onChange} />{' '}
      <span>{label}</span>
    </label>
  );
}

function Header() {
  return (
    <header class="reading-unified-nav" role="toolbar" aria-label="Thanh điều hướng đọc hiểu">
      <div class="reading-nav-left">
        <button type="button" class="reading-back-btn" onClick={() => window.setPrimaryTab('vocab')} title="Quay lại danh sách từ vựng">
          <span aria-hidden="true">←</span>{' '}
          <span>Trang chủ</span>
        </button>{' '}
        <div class="reading-brand-badge">
          <span class="reading-brand-icon">📖</span>{' '}
          <span class="reading-brand-title">Đọc hiểu HSK 4</span>{' '}
          <span class="reading-brand-tag">Hanban</span>
        </div>{' '}
        <div class="reading-filter-controls">
          <div class="reading-select-pill" title="Lọc theo Đề thi">
            <span class="reading-pill-label">Đề:</span>{' '}
            <select class="reading-pill-select" id="readingTestSelect" value={String(testFilter)}
              onChange={(e) => setReadingTestFilter(e.currentTarget.value === 'all' ? 'all' : parseInt(e.currentTarget.value, 10))}>
              <option value="all">Tất cả đề (10 đề)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => {
                const count = data.filter((d) => d.test_id === t).length;
                return count ? <option key={t} value={String(t)}>{`Đề ${t} (${count})`}</option> : null;
              })}
            </select>
          </div>{' '}
          <div class="reading-select-pill" title="Lọc theo Dạng bài">
            <span class="reading-pill-label">Dạng:</span>{' '}
            <select class="reading-pill-select" id="readingCategorySelect" value={category} onChange={(e) => setReadingCategory(e.currentTarget.value)}>
              <option value="all">{`Tất cả (${filteredCatCount('all')})`}</option>
              <option value="sentence_building">{`🧩 Xếp câu (${filteredCatCount('sentence_building')})`}</option>
              <option value="sentence_logic">{`🔀 Logic A-B-C (${filteredCatCount('sentence_logic')})`}</option>
              <option value="cloze">{`📝 Điền từ (${filteredCatCount('cloze')})`}</option>
              <option value="paragraph">{`📑 Đoạn văn (${filteredCatCount('paragraph')})`}</option>
            </select>
          </div>
        </div>
      </div>{' '}

      <div class="reading-nav-right">
        <div class="reading-segmented-control" role="tablist" aria-label="Chế độ học">
          <button type="button" class={`reading-segment-btn ${activeMode === 'practice' ? 'active' : ''}`} onClick={() => setReadingActiveMode('practice')} role="tab" aria-selected={String(activeMode === 'practice')}>
            Thực chiến
          </button>{' '}
          <button type="button" class={`reading-segment-btn ${activeMode === 'breakdown' ? 'active' : ''}`} onClick={() => setReadingActiveMode('breakdown')} role="tab" aria-selected={String(activeMode === 'breakdown')}>
            Phân tích
          </button>
        </div>{' '}

        <div class="reading-settings-wrapper" id="readingSettingsWrapper">
          <button type="button" class={`reading-settings-btn ${settingsMenuOpen ? 'active' : ''}`} id="readingSettingsBtn" onClick={toggleReadingSettingsMenu}
            aria-expanded={String(settingsMenuOpen)} title="Tùy chọn hiển thị">
            <span aria-hidden="true">⚙️</span>{' '}
            <span class="settings-text">Hiển thị</span>{' '}
            <span class="settings-arrow">{settingsMenuOpen ? '▲' : '▾'}</span>
          </button>{' '}
          <div class="reading-settings-menu" id="readingSettingsMenu" style={settingsMenuOpen ? 'display: block;' : 'display: none;'}>
            <div class="settings-menu-title">TÙY CHỌN HIỂN THỊ</div>{' '}
            <SettingsItem checked={prefs.pinyin} onChange={toggleReadingPinyin} label="Phiên âm Pinyin" />{' '}
            <SettingsItem checked={prefs.hanviet} onChange={toggleReadingHanViet} label="Âm Hán - Việt" />{' '}
            <SettingsItem checked={prefs.meaning} onChange={toggleReadingMeaning} label="Dịch nghĩa câu gợi ý" />{' '}
            <SettingsItem checked={prefs.highlight} onChange={toggleReadingHighlight} label="Mẹo bẫy thi & Ngữ pháp" />
          </div>
        </div>
      </div>
    </header>
  );
}

function Feedback() {
  return (
    <div id="practiceResultFeedback">
      {feedback && (
        <div class={`practice-result-banner ${feedback.type}`}>
          <div class="feedback-banner-content">
            <span class="feedback-badge-icon">{feedback.icon}</span>{' '}
            <div class="feedback-msg">{feedback.message}</div>{' '}
            {feedback.actions || null}
          </div>
        </div>
      )}
    </div>
  );
}

// Tap-to-order exercise (sentence building / A-B-C logic): slots, remaining tiles, actions, feedback.
function PracticeBuilder({ placeholder, tileClass, bankClass, Tile, withHint, onCheck, checkLabel }) {
  return (
    <>
      <div class={`practice-slots-area ${practiceSolved ? 'is-correct' : ''}`} id="practiceSlotsArea">
        {builderSlots.length === 0
          ? <span class="practice-empty-placeholder">{placeholder}</span>
          : builderSlots.map((item, i) => [' ', <button key={i} type="button" class={`builder-tile slot-tile${tileClass}`} onClick={() => removeFromSlots(i)}><Tile item={item} /></button>])}
      </div>{' '}
      <div class={`practice-bank-area${bankClass}`} id="practiceBankArea">
        {builderBank.map((item, i) => [' ', <button key={i} type="button" class={`builder-tile${tileClass}`} onClick={() => moveToSlots(i)}><Tile item={item} /></button>])}
      </div>{' '}
      <div class="practice-actions-bar">
        <div class="practice-btn-group">
          <button type="button" class="practice-action-btn practice-btn-secondary" onClick={() => { resetPracticeState(); renderReadingAnalysisScreen(); }}>
            ↺ Làm lại
          </button>
          {withHint && <>{' '}<button type="button" class="practice-action-btn practice-btn-secondary" onClick={hintPracticeBuilder}>💡 Gợi ý</button></>}
        </div>{' '}
        <button type="button" class="practice-action-btn practice-btn-primary" onClick={onCheck}>
          {checkLabel}
        </button>
      </div>{' '}
      <Feedback />
    </>
  );
}

function PracticeHeader({ title, hint }) {
  return (
    <div class="practice-header">
      <div class="practice-title">{title}</div>{' '}
      <div class="practice-hint-text">{hint}</div>
    </div>
  );
}

const ChunkTile = ({ item }) => item;
const LogicTile = ({ item }) => <><strong>{`${item.key}.`}</strong>{` ${item.text}`}</>;

function ClozeSentence({ text }) {
  const marker = '（ ____ ）';
  const at = text.indexOf(marker);
  if (at < 0) return text;
  return <>{text.slice(0, at)}<span class="cloze-blank-spot">{selectedOption || '？'}</span>{text.slice(at + marker.length)}</>;
}

function PracticePanels({ entry }) {
  const p = entry.practice || {};
  if (p.type === 'sentence_building') {
    return (
      <div class="reading-practice-card">
        <PracticeHeader title="🧩 Dạng 1: Sắp xếp các khối từ thành câu hoàn chỉnh" hint="Bấm chọn khối từ để xếp theo thứ tự ngữ pháp đúng" />{' '}
        <PracticeBuilder placeholder="Bấm chọn các khối từ bên dưới theo trật tự câu đúng..." tileClass="" bankClass="" Tile={ChunkTile}
          withHint onCheck={checkPracticeBuilder} checkLabel="Kiểm tra đáp án" />
      </div>
    );
  }
  if (p.type === 'cloze') {
    return (
      <div class="reading-practice-card">
        <PracticeHeader title="📝 Dạng 2: Bài tập Điền khuyết (Cloze Test) theo ngữ cảnh" hint="Chọn từ thích hợp nhất để điền vào chỗ trống" />{' '}
        <div class="cloze-blank-text"><ClozeSentence text={p.blank_sentence || ''} /></div>{' '}
        <div class="cloze-options-grid">
          {(p.options || []).map((opt) => {
            let optClass = '';
            if (selectedOption) {
              if (opt.word === p.target_word) optClass = 'selected-correct';
              else if (opt.word === selectedOption) optClass = 'selected-wrong';
            }
            return [' ', (
              <button key={`${opt.word}`} type="button" class={`cloze-option-btn ${optClass}`} onClick={() => selectClozeOption(`${opt.word}`)} disabled={Boolean(selectedOption)}>
                <div>
                  <div class="cloze-opt-zh">{`${opt.word}`}</div>{' '}
                  <div class="cloze-opt-sub">{`${opt.pinyin} · [${opt.hanviet}]`}</div>
                </div>{' '}
                <div class="cloze-opt-sub">{`${opt.meaning}`}</div>
              </button>
            )];
          })}
        </div>{' '}
        {p.clue && <div class="cloze-clue-hint">💡 <strong>Gợi ý ngữ cảnh:</strong>{` ${p.clue}`}</div>}{' '}
        <Feedback />
      </div>
    );
  }
  if (p.type === 'sentence_logic') {
    return (
      <div class="reading-practice-card">
        <PracticeHeader title="🔀 Dạng 3: Sắp xếp thứ tự logic đoạn văn (A - B - C)" hint="Chọn thứ tự các câu để tạo thành đoạn văn logic" />{' '}
        <PracticeBuilder placeholder="Bấm chọn các vế câu A, B, C theo thứ tự đúng..." tileClass=" logic-tile" bankClass=" logic-bank-area" Tile={LogicTile}
          withHint={false} onCheck={checkPracticeLogicOrder} checkLabel="Kiểm tra thứ tự" />
      </div>
    );
  }
  return (
    <div class="reading-practice-card">
      <div class="practice-title">📖 Đoạn văn chuyên sâu</div>{' '}
      <p style="color:var(--text-secondary); line-height:1.6; margin-top:10px;">
        Đoạn văn này được thiết kế để luyện đọc hiểu toàn diện và phân tích ngữ pháp sống. Hãy chuyển sang tab <strong>"Phân tích"</strong> để xem phân rã thành phần và bẫy đề thi.
      </p>
    </div>
  );
}

function AudioButtons({ withId, label }) {
  return (
    <>
      <button type="button" class="reading-btn-speaker" id={withId ? 'readingPlayAudioBtn' : undefined} onClick={() => playReadingSentenceAudio(currentEntry())}
        title={withId ? 'Nghe phát âm chuẩn (Space)' : 'Nghe phát âm chuẩn'}>
        {label}
      </button>{' '}
      <button type="button" class="reading-btn-speed" id={withId ? 'readingSpeedBtn' : undefined} onClick={toggleReadingSpeed} title="Đổi tốc độ đọc">
        {`${prefs.speechSpeed}x`}
      </button>
    </>
  );
}

function ExerciseCard({ entry }) {
  const reviewed = isReviewed();
  const meaningText = entry.meaning || entry.vietnamese || '';
  return (
    <section class="reading-exercise-card" aria-label="Khu vực làm bài tập">
      <div class="exercise-card-header">
        <div class="exercise-header-left">
          <div class="exercise-meta-pill">
            <span class="meta-label">{`Đề ${entry.test_id || 10}`}</span>{' '}
            <span class="meta-separator">·</span>{' '}
            <span class="meta-qnum">{`Câu ${currentIndex + 1}/${filteredList.length}`}</span>
          </div>{' '}
          <CategoryBadge cat={entry.category} />
        </div>{' '}
        <div class="exercise-header-right">
          <span class={`exercise-status-badge ${reviewed ? 'status-reviewed' : 'status-answering'}`}>
            {reviewed ? '✅ Đã xem giải thích' : '✍️ Đang làm bài'}
          </span>{' '}
          {reviewed && <div class="exercise-audio-group"><AudioButtons withId label="🔊 Nghe" /></div>}
        </div>
      </div>{' '}
      {prefs.meaning && meaningText && (
        <div class="exercise-prompt-box">
          <div class="prompt-header">
            <span class="prompt-icon">💡</span>{' '}
            <span class="prompt-title">Nghĩa tiếng Việt gợi ý:</span>
          </div>{' '}
          <div class="prompt-text">{meaningText}</div>
        </div>
      )}{' '}
      <div class="exercise-interactive-body">
        <PracticePanels entry={entry} />
      </div>{' '}
      <Feedback />
    </section>
  );
}

// Tokens keep the legacy newline whitespace around them (it affects CJK line breaking).
function CleanTokens({ entry }) {
  if (!entry || !entry.tokens) return <span class="reading-zh-text">{entry.zh || ''}</span>;
  return entry.tokens.map((tok, i) => {
    if (PUNCT_RE.test(tok.text.trim())) return <span key={i} class="reading-token-punct">{tok.text}</span>;
    let hl = '';
    if (prefs.highlight) {
      if (tok.type === 'grammar') hl = 'token-hl-grammar';
      else if (tok.type === 'advanced') hl = 'token-hl-advanced';
    }
    const select = () => selectReadingWord(i, true);
    return [
      '\n      ',
      <span key={i} class={`reading-token-word ${hl} ${i === selectedTokenIndex ? 'active-inspect' : ''}`} data-token-idx={i} role="button" tabindex="0"
        onClick={select}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } }}
        title={tok.meaning ? `${tok.text} [${tok.hanviet || ''}]: ${tok.meaning}` : 'Bấm để tra từ này'}>
        {'\n        '}
        {prefs.pinyin ? <span class="token-py">{tok.pinyin || ''}</span> : null}
        {'\n        '}
        <span class="token-zh">{tok.text}</span>
        {'\n        '}
        {prefs.hanviet ? <span class="token-hv">{tok.hanviet || ''}</span> : null}
        {'\n      '}
      </span>,
      '\n    '
    ];
  });
}

function SentenceTranslations({ entry }) {
  const viMeaning = entry.meaning || entry.vietnamese || '';
  if (!viMeaning && !entry.pinyin) return null;
  return (
    <div class="reading-sentence-translations">
      {prefs.meaning && viMeaning && <div class="reading-translation-meaning">{viMeaning}</div>}{' '}
      {!prefs.pinyin && entry.pinyin && <div class="reading-translation-pinyin">{entry.pinyin}</div>}
    </div>
  );
}

function shortMeaningOf(tok) {
  let meaning = tok.meaning || '';
  if (!meaning && tok.role) {
    const m = tok.role.match(/\(([^)]+)\)/);
    meaning = m ? m[1] : tok.role;
  }
  return meaning;
}

function VocabGrid({ entry }) {
  const valid = entry.tokens.map((tok, idx) => ({ tok, idx })).filter(({ tok }) => {
    const text = (tok.text || '').trim();
    return text && !PUNCT_RE.test(text);
  });
  if (!valid.length) return <div class="sidebar-empty-state">Không có từ vựng.</div>;
  return (
    <div class="sidebar-vocab-grid">
      {valid.map(({ tok, idx }) => {
        const badge = { grammar: 'pill-grammar', core: 'pill-core', advanced: 'pill-adv' }[tok.type] || '';
        const shortMeaning = shortMeaningOf(tok);
        return [' ', (
          <button key={idx} type="button" class={`sidebar-vocab-pill ${badge} ${idx === selectedTokenIndex ? 'active-selected-tag' : ''}`} data-token-idx={idx}
            onClick={() => selectReadingWord(idx, true)}
            title={`${tok.text} ${tok.hanviet ? `[${tok.hanviet}]` : ''}: ${shortMeaning || tok.role || ''}`}>
            <div class="pill-top-row">
              <span class="pill-zh">{tok.text}</span>{' '}
              {tok.pinyin ? <span class="pill-py">{tok.pinyin}</span> : null}
            </div>{' '}
            <div class="pill-bottom-row">
              {tok.hanviet ? <span class="pill-hv">{`[${tok.hanviet}]`}</span> : null}{' '}
              {shortMeaning ? <span class="pill-mean">{shortMeaning}</span> : null}
            </div>
          </button>
        )];
      })}
    </div>
  );
}

const WORD_BADGES = {
  grammar: ['⚡ Ngữ pháp', 'sw-badge-grammar'],
  core: ['Cốt lõi HSK 4', 'sw-badge-core'],
  advanced: ['Mở rộng', 'sw-badge-adv']
};

function WordDetail({ entry }) {
  const tok = selectedTokenIndex !== null && entry.tokens ? entry.tokens[selectedTokenIndex] : null;
  if (!tok) {
    return (
      <div class="sw-placeholder">
        <span class="sw-placeholder-icon">👆</span>{' '}
        <div class="sw-placeholder-text">Bấm vào bất kỳ từ nào ở danh sách phía trên hoặc trên câu mẫu để xem phân tích chi tiết.</div>
      </div>
    );
  }
  const [badgeLabel, badgeClass] = WORD_BADGES[tok.type] || ['Từ vựng', 'sw-badge-normal'];
  const roleDesc = tok.role || '';
  const meaning = shortMeaningOf(tok);
  return (
    <div class="sw-detail-inner">
      <div class="sw-header-bar">
        <div class="sw-header-title-box">
          <span class="sw-header-icon">🔍</span>{' '}
          <span class="sw-header-label">Từ vựng đang chọn</span>
        </div>{' '}
        <span class={`sw-badge ${badgeClass}`}>{badgeLabel}</span>
      </div>{' '}
      <div class="sw-main-hero">
        <div class="sw-hero-left">
          <div class="sw-zh-row">
            <span class="sw-zh">{tok.text}</span>{' '}
            <button type="button" class="sw-audio-btn" onClick={() => speakToken(tok.text)} title="Phát âm từ này (Audio)">
              🔊
            </button>{' '}
            <div class="sw-phonetics">
              {tok.pinyin ? <span class="sw-py">{tok.pinyin}</span> : null}{' '}
              {tok.hanviet ? <span class="sw-hv">{`[${tok.hanviet}]`}</span> : null}
            </div>
          </div>
        </div>
      </div>{' '}
      <div class="sw-meaning-block">
        <div class="sw-meaning-label">Nghĩa tiếng Việt</div>{' '}
        <div class="sw-meaning-text">{meaning || 'Chưa có chú giải nghĩa tiếng Việt'}</div>
      </div>{' '}
      {roleDesc && (
        <div class="sw-role-block">
          <span class="sw-role-tag">Cú pháp trong câu:</span>{' '}
          <span class="sw-role-desc">{roleDesc}</span>
        </div>
      )}
    </div>
  );
}

function partType(p) {
  const s = (p || '').toLowerCase();
  if (s === '是' || s === '的' || s.includes('khung') || s.includes('nhấn mạnh')) return 'marker';
  if (s.includes('chủ ngữ') || s === '很多困难') return 'subject';
  if (s.includes('có thể') || s.includes('có') || s === '可以' || s.includes('năng nguyện')) return 'aux';
  if (s.includes('động từ') || s === '克服' || s.includes('vị ngữ')) return 'verb';
  return 'default';
}

const splitParts = (str) => (str ? str.split('+').map((s) => s.trim()).filter(Boolean) : []);

function FormulaFlow({ parts, typeOf, cls }) {
  return (
    <div class={`gfc-flow ${cls}`}>
      {parts.map((part, i) => [
        ' ',
        <span key={`c${i}`} class={`gfc-chip gfc-${typeOf(part, i)}`}>{part}</span>,
        ' ',
        i < parts.length - 1 ? <span key={`p${i}`} class="gfc-plus">+</span> : null
      ])}
    </div>
  );
}

function GrammarFormula({ pattern, patternApplied, entry }) {
  if (!pattern) return null;
  const patternParts = splitParts(pattern);
  let appliedParts = splitParts(patternApplied);
  if (!appliedParts.length && entry && entry.zh && entry.zh.includes('克服') && patternParts.length >= 4) {
    appliedParts = ['很多困难', '是', '可以', '克服', '的'];
  }
  return (
    <div class="grammar-formula-card">
      <div class="gfc-header">
        <span class="gfc-label">Cấu trúc trọng điểm</span>
      </div>{' '}
      <FormulaFlow parts={patternParts} typeOf={(p) => partType(p)} cls="gfc-pattern-flow" />{' '}
      {appliedParts.length > 0 && (
        <div class="gfc-applied-block">
          <div class="gfc-applied-label">Áp dụng trong câu thực tế:</div>{' '}
          <FormulaFlow parts={appliedParts} typeOf={(p, i) => (i < patternParts.length ? partType(patternParts[i]) : partType(p))} cls="gfc-applied-flow" />
        </div>
      )}
    </div>
  );
}

function GrammarPanel({ entry }) {
  const gp = entry.grammar_point || {};
  if (!gp.name && !gp.pattern && !gp.trap_note && !gp.explanation) {
    return <div class="sidebar-empty-grammar">Không có lưu ý ngữ pháp đặc biệt cho câu này.</div>;
  }
  const cleanNote = gp.trap_note ? gp.trap_note.replace(/^(BẪY\s+CẤU\s+TRÚC|BẪY\s+THI|MẸO\s+BẪY\s+THI\s*HSK\s*\d*)\s*:\s*/i, '') : '';
  return (
    <div class="sidebar-grammar-inner">
      <div class="sidebar-card-header grammar-highlight-header">
        <div class="sidebar-header-left">
          <span class="grammar-lightning-icon">⚡</span>{' '}
          <span class="sidebar-header-title">Vì sao sắp xếp như vậy & Ngữ pháp trọng điểm</span>
        </div>{' '}
        {gp.level ? <span class="sidebar-grammar-level">{gp.level}</span> : null}
      </div>{' '}
      {gp.name && <div class="sidebar-grammar-name"><span class="sgn-title">{gp.name}</span></div>}{' '}
      {gp.explanation && (
        <div class="sidebar-grammar-exp">
          <div class="sge-title">💡 Giải thích cú pháp:</div>{' '}
          <div class="sge-content">{gp.explanation}</div>
        </div>
      )}{' '}
      <GrammarFormula pattern={gp.pattern} patternApplied={gp.pattern_applied} entry={entry} />{' '}
      {gp.trap_note && (
        <div class="grammar-note-box">
          <div class="gnb-header">
            <span class="gnb-icon">📌</span>{' '}
            <span class="gnb-title">Lưu ý</span>
          </div>{' '}
          <div class="gnb-content">{cleanNote}</div>
        </div>
      )}
    </div>
  );
}

function CollapsibleSummary({ icon, title, extra }) {
  return (
    <summary class="sheet-collapsible-summary">
      <div class="summary-left">
        <span class="summary-icon">{icon}</span>{' '}
        <span class="summary-title">{title}</span>{' '}
        {extra}
      </div>{' '}
      <span class="summary-chevron" aria-hidden="true">▾</span>
    </summary>
  );
}

function ExplanationSheet({ entry }) {
  return (
    <section class="reading-explanation-sheet" id="readingExplanationSheet" aria-label="Giải thích chi tiết & Ngữ pháp">
      <div class="sheet-header">
        <div class="sheet-title-row">
          <span class="sheet-header-icon">📖</span>{' '}
          <div class="sheet-title-text">
            <h2 class="sheet-main-title">Phân tích & Hướng dẫn chi tiết</h2>{' '}
            <p class="sheet-sub-title">Đối chiếu đáp án, cấu trúc ngữ pháp và phân tích thành phần câu</p>
          </div>
        </div>
      </div>{' '}

      <div class="sheet-card sheet-sentence-card">
        <div class="sentence-hero-top">
          <div class="sentence-hero-tags">
            <span class="sheet-section-tag">Đáp án tham khảo</span>{' '}
            {entry.source ? <span class="sheet-source-badge" title={entry.source}>{entry.source}</span> : null}
          </div>{' '}
          <div class="sentence-hero-audio"><AudioButtons withId={false} label="🔊 Nghe phát âm" /></div>
        </div>{' '}
        <div class="sentence-zh-flow" id="readingZhLine">
          {'\n          '}<CleanTokens entry={entry} />{'\n        '}
        </div>{' '}
        <SentenceTranslations entry={entry} />
      </div>{' '}

      {entry.grammar_point && <div class="sheet-card sheet-grammar-card"><GrammarPanel entry={entry} /></div>}{' '}

      {entry.breakdown && entry.breakdown.length > 0 && (
        <details class="sheet-collapsible-section sheet-breakdown-card" open>
          <CollapsibleSummary icon="🔬" title="Phân tích thành phần câu" extra={<span class="summary-count">{`${entry.breakdown.length} thành phần`}</span>} />{' '}
          <div class="sheet-collapsible-content">
            <div class="breakdown-table-wrapper">
              <table class="breakdown-table">
                <thead>
                  <tr>
                    <th class="col-comp">Thành phần</th>
                    <th class="col-role">Vai trò ngữ pháp</th>
                    <th class="col-desc">Giải thích chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.breakdown.map((b, i) => (
                    <tr key={i}>
                      <td class="col-comp"><span class="breakdown-text-pill">{b.text}</span></td>
                      <td class="col-role"><span class="breakdown-role-tag">{b.role}</span></td>
                      <td class="col-desc">{b.desc || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      )}{' '}

      {entry.tokens && entry.tokens.length > 0 && (
        <details class="sheet-collapsible-section sheet-vocab-card" open>
          <CollapsibleSummary icon="📚" title="Từ vựng trong câu" extra={<span class="summary-hint">Bấm vào từ để xem nghĩa và nghe phát âm</span>} />{' '}
          <div class="sheet-collapsible-content">
            <div class="sheet-vocab-list"><VocabGrid entry={entry} /></div>{' '}
            <div class="sheet-word-detail-container" id="readingWordDetailPanel"><WordDetail entry={entry} /></div>
          </div>
        </details>
      )}{' '}

      <div class="sheet-bottom-cta">
        <button type="button" class="sheet-next-btn" onClick={nextReadingQuestion}>
          <span>Tiếp tục sang câu tiếp theo</span>{' '}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

function FooterNav() {
  return (
    <footer class="reading-global-footer" role="navigation" aria-label="Điều hướng câu hỏi">
      <button type="button" class="reading-nav-btn prev-btn" onClick={prevReadingQuestion} disabled={currentIndex === 0} title="Câu trước (← hoặc K)">
        ← Câu trước
      </button>{' '}
      <div class="reading-footer-middle">
        <select class="reading-jump-select" aria-label="Chọn nhanh câu hỏi" value={String(currentIndex)} onChange={(e) => jumpToReadingIndex(e.currentTarget.value)}>
          {filteredList.map((item, idx) => (
            <option key={idx} value={String(idx)}>{`Câu ${idx + 1}/${filteredList.length} · ${categoryLabel(item.category)}`}</option>
          ))}
        </select>
      </div>{' '}
      <button type="button" class="reading-nav-btn next-btn" onClick={nextReadingQuestion} disabled={currentIndex === filteredList.length - 1} title="Câu tiếp theo (→ hoặc J)">
        Câu tiếp theo →
      </button>
    </footer>
  );
}

export function ReadingAnalysisScreen() {
  void tick.value; // re-render whenever the screen state changes
  if (!started) return null;
  const entry = currentEntry();
  if (!filteredList.length || !entry) {
    return (
      <div class="reading-analysis-container">
        <div class="reading-empty-state">
          <p>Không có câu hỏi nào phù hợp với bộ lọc hiện tại.</p>{' '}
          <button type="button" class="reading-reset-filter-btn" onClick={() => { setReadingTestFilter('all'); setReadingCategory('all'); }}>
            Đặt lại bộ lọc
          </button>
        </div>
      </div>
    );
  }
  return (
    <div class="reading-analysis-container">
      <Header />{' '}
      <div class="reading-focused-workspace">
        <ExerciseCard entry={entry} />{' '}
        {isReviewed() && <ExplanationSheet key={`${currentIndex}-${entry.id || ''}`} entry={entry} />}
      </div>{' '}
      <FooterNav />
    </div>
  );
}

function onKeydown(e) {
  const screen = document.getElementById('screenReadingAnalysis');
  if (!screen || screen.style.display === 'none') return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName)) return;
  const k = e.key;
  const actions = {
    ArrowRight: nextReadingQuestion, j: nextReadingQuestion, J: nextReadingQuestion,
    ArrowLeft: prevReadingQuestion, k: prevReadingQuestion, K: prevReadingQuestion,
    z: toggleZenMode, Z: toggleZenMode,
    g: toggleReadingGrammarExpand, G: toggleReadingGrammarExpand,
    p: toggleReadingPinyin, P: toggleReadingPinyin,
    h: toggleReadingHanViet, H: toggleReadingHanViet,
    v: toggleReadingMeaning, V: toggleReadingMeaning
  };
  if (actions[k]) {
    e.preventDefault();
    actions[k]();
  } else if (k === ' ' && !prefs.dictationMode) {
    e.preventDefault();
    const current = currentEntry();
    if (current && isReviewed()) playReadingSentenceAudio(current);
  } else if (k === 'Escape') {
    if (settingsMenuOpen) {
      toggleReadingSettingsMenu();
    } else if (prefs.zenMode) {
      e.preventDefault();
      toggleZenMode();
    }
  }
}

export function mountReadingAnalysis() {
  Object.assign(window, {
    ensureReadingAnalysisLoaded, startReadingAnalysis, setReadingCategory, setReadingTestFilter, setReadingActiveMode,
    nextReadingQuestion, prevReadingQuestion, jumpToReadingIndex, toggleReadingPinyin, toggleReadingHanViet,
    toggleReadingMeaning, toggleReadingHighlight, toggleReadingGrammarExpand, toggleReadingDictation, toggleReadingSpeed,
    toggleZenMode, toggleReadingSettingsMenu, retryPractice, revealExplanationDirectly, playReadingSentenceAudio,
    selectReadingWord, inspectToken, closeInspector, speakToken, moveToSlots, removeFromSlots, hintPracticeBuilder,
    checkPracticeBuilder, checkPracticeLogicOrder, selectClozeOption, checkDictationAnswer, resetPracticeState,
    renderReadingAnalysisScreen
  });
  window.addEventListener('keydown', onKeydown);
  // Clicking outside the display-settings popover closes it
  document.addEventListener('click', (e) => {
    if (!settingsMenuOpen) return;
    const wrapper = document.getElementById('readingSettingsWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      settingsMenuOpen = false;
      renderReadingAnalysisScreen();
    }
  });
  const screen = document.getElementById('screenReadingAnalysis');
  if (screen) render(<ReadingAnalysisScreen />, screen);
}
