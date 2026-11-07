// Graded Reading (HSK reading stories): hub with filters, interactive reader with click-to-inspect
// tokens, SRS integration, spotlight vocabulary and a comprehension quiz.
// Preact port of the former assets/js/graded-reading.js. Renders the same markup inside
// #screenGradedReading and keeps window.GradedReading for the tab router and SpaRouter.
import { render } from 'preact';
import { signal, computed } from '@preact/signals';

/* global exampleSpeechSpeed, SRS, currentLevel, srsCards, SpaRouter -- classic-script globals */

const PAGE_SIZE = 30;
const LEVELS = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'HSK7', 'HSK8', 'HSK9'];
const PUNCT_RE = /^[，。？！、：；“”‘’（）《》〈〉【】[\]()…—\s]+$/;
const LEADING_PUNCT = new Set(['“', '‘', '（', '《', '〈', '【', '[', '"', '(']);
const TRAILING_PUNCT = new Set(['，', '。', '！', '？', '、', '：', '；', '”', '’', '）', '》', '〉', '】', ']', '"', ')', '…', '—']);

let manifest = [];
let manifestLoaded = false;
const storyCache = {};

// ---- UI state ----------------------------------------------------------------------------------
const view = signal('idle');           // 'idle' | 'hub' | 'loading' | 'error' | 'story'
const errorMessage = signal('');
const activeStory = signal(null);
const levelFilter = signal('all');
const categoryFilter = signal('all');
const sortOrder = signal('default');
const searchQuery = signal('');
const hubLimit = signal(PAGE_SIZE);
const quizState = signal({});          // qId -> { selectedIdx, isCorrect }
const playingId = signal(null);        // sentence id, 'full-story' or null

const PREFS_KEY = 'synapse_graded_prefs_v1';
const prefs = signal((() => {
  const base = { showPinyin: true, showTranslation: true, showSrsHighlights: true };
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    if (saved) return Object.assign(base, JSON.parse(saved));
  } catch (e) { /* corrupt prefs */ }
  return base;
})());

const READ_STORIES_STORAGE_KEY = 'synapse_graded_read_stories_v1';
const readStories = signal((() => {
  try {
    return JSON.parse(localStorage.getItem(READ_STORIES_STORAGE_KEY) || '{}') || {};
  } catch (e) { return {}; }
})());

function savePrefs(next) {
  prefs.value = next;
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch (e) { /* quota */ }
}

function saveReadStories(next) {
  readStories.value = next;
  try { localStorage.setItem(READ_STORIES_STORAGE_KEY, JSON.stringify(next)); } catch (e) { /* quota */ }
}

// ---- Audio -------------------------------------------------------------------------------------
function clearPlaying() {
  playingId.value = null;
}

function speakSentence(text, sentId) {
  if (!text) return;
  const isPlaying = playingId.value === sentId;
  if (typeof window.stopSpeaking === 'function') window.stopSpeaking();
  if (isPlaying) {
    clearPlaying();
    return;
  }
  playingId.value = sentId;
  const rate = typeof exampleSpeechSpeed !== 'undefined' ? exampleSpeechSpeed : 0.8;
  if (typeof window.speakChinese === 'function') {
    window.speakChinese(text, { rate, onEnd: clearPlaying, onError: clearPlaying });
  }
}

function speakFullStory() {
  const story = activeStory.value;
  if (!story || !story.sentences) return;
  speakSentence(story.sentences.map((s) => s.zh || s.text || '').filter(Boolean).join(' '), 'full-story');
}

// ---- Read tracking -----------------------------------------------------------------------------
const isStoryRead = (storyId) => Boolean(readStories.value[storyId]);

function markStoryAsRead(storyId) {
  if (!storyId) return;
  saveReadStories({ ...readStories.value, [storyId]: { readAt: new Date().toISOString() } });
}

function unmarkStoryAsRead(storyId) {
  if (!storyId) return;
  const next = { ...readStories.value };
  delete next[storyId];
  saveReadStories(next);
}

function toggleStoryRead(storyId, event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  if (!storyId) return;
  if (isStoryRead(storyId)) unmarkStoryAsRead(storyId);
  else markStoryAsRead(storyId);
}

function toggleCurrentStoryRead() {
  if (activeStory.value) toggleStoryRead(activeStory.value.id);
}

// ---- SRS ---------------------------------------------------------------------------------------
// 'mastered' | 'learning' | 'new' | 'none' (token without a vocabulary id)
function getTokenSrsStatus(token) {
  if (!token || !token.word_id) return 'none';
  const match = token.word_id.match(/^hsk(\d+)_(\d+)$/i);
  if (!match) return 'none';
  try {
    if (typeof window.readSrsRecord === 'function') {
      const record = window.readSrsRecord(match[1]);
      const card = record && record.cards && record.cards[String(match[2])];
      if (card) {
        if (card.state === 2 || card.status === 'known' || (card.reps && card.reps >= 2)) return 'mastered';
        if (card.state === 1 || card.state === 3 || (card.reps && card.reps > 0)) return 'learning';
      }
    }
  } catch (e) {
    console.warn('SRS lookup error:', e);
  }
  return 'new';
}

const storyLevelNum = (story) => (story ? parseInt(story.level.replace(/\D/g, '') || '1', 10) : 1);

// Put a token's word straight into today's FSRS queue.
function addTokenToSrs(token) {
  if (!token) return false;
  if (!token.word_id) {
    const lvl = token.hsk || storyLevelNum(activeStory.value);
    token.word_id = `hsk${lvl}_${token.text.charCodeAt(0) + 10000}`;
  }
  const match = token.word_id.match(/^hsk(\d+)_([a-z0-9]+)$/i) || token.word_id.match(/^char_([a-z0-9]+)$/i);
  if (!match) return false;
  const level = match[1].length <= 2 ? match[1] : String(token.hsk || 1);
  const rawId = match[2] || match[1];
  try {
    if (typeof window.readSrsRecord === 'function' && typeof window.saveSrsRecord === 'function') {
      const record = window.readSrsRecord(level) || { schemaVersion: 3, cards: {} };
      if (!record.cards) record.cards = {};
      let card = record.cards[String(rawId)];
      if (!card) card = (typeof SRS !== 'undefined' && SRS.createNewCard) ? SRS.createNewCard() : { state: 0, reps: 0 };
      card.state = 1; // Learning
      card.status = 'unknown';
      card.due = new Date().toISOString();
      card.last_rating = 'again';
      record.cards[String(rawId)] = card;
      window.saveSrsRecord(level, record.cards, false);

      // Keep the in-memory cards of the level being studied in sync
      if (typeof currentLevel !== 'undefined' && String(currentLevel) === String(level) && typeof srsCards !== 'undefined' && srsCards) {
        srsCards[String(rawId)] = card;
      }
      // Live-update every occurrence of the word in the passage
      document.querySelectorAll(`[data-word-id="${token.word_id}"]`).forEach((el) => {
        el.classList.remove('token-new');
        el.classList.add('token-learning');
      });
      return true;
    }
  } catch (e) {
    console.error('Failed to add token to SRS:', e);
  }
  return false;
}

// ---- Data --------------------------------------------------------------------------------------
async function ensureManifestLoaded() {
  if (manifestLoaded && manifest.length) return manifest;
  try {
    const res = await fetch('database/readings/manifest.json?v=' + Date.now());
    if (!res.ok) throw new Error('Không thể tải danh sách bài đọc.');
    manifest = await res.json();
    manifestLoaded = true;
    return manifest;
  } catch (e) {
    console.error('GradedReading manifest error:', e);
    return [];
  }
}

async function loadStory(storyId) {
  if (storyCache[storyId]) return storyCache[storyId];
  const item = manifest.find((m) => m.id === storyId);
  if (!item) throw new Error('Không tìm thấy bài đọc: ' + storyId);
  const storyUrl = item.file || item.path || `database/readings/${(item.level || '').toLowerCase()}/${item.id}.json`;
  const res = await fetch(storyUrl);
  if (!res.ok) throw new Error('Không thể tải nội dung bài: ' + storyUrl);
  const data = await res.json();
  storyCache[storyId] = data;
  return data;
}

// A story's category is the first part of its topic ("Gia đình & Bạn bè" -> "Gia đình").
const storyCategory = (m) => (m.topic_vi || '').split('&')[0].trim();

function getFilteredManifest() {
  const lvl = levelFilter.value;
  const cat = categoryFilter.value;
  const sort = sortOrder.value;
  const q = searchQuery.value.toLowerCase().trim();
  return manifest.filter((m) => {
    if (lvl === 'read') {
      if (!isStoryRead(m.id)) return false;
    } else if (lvl !== 'all' && m.level.toLowerCase() !== lvl.toLowerCase()) {
      return false;
    }
    if (cat !== 'all' && storyCategory(m) !== cat) return false;
    if (q) {
      const fields = [m.title && m.title.zh, m.title && m.title.vi, m.description_vi, m.topic_vi].map((s) => (s || '').toLowerCase());
      if (!fields.some((f) => f.includes(q))) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sort === 'time_asc') return (a.estimatedMinutes || 3) - (b.estimatedMinutes || 3);
    if (sort === 'time_desc') return (b.estimatedMinutes || 3) - (a.estimatedMinutes || 3);
    if (sort === 'title') return (a.title.vi || '').localeCompare(b.title.vi || '');
    return 0;
  });
}

// ---- Navigation --------------------------------------------------------------------------------
let escapeListenerBound = false;

async function init() {
  if (!document.getElementById('screenGradedReading')) return;
  document.body.classList.add('graded-reading-active');
  if (!escapeListenerBound) {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (popover.value) closePopover();
      else if (activeStory.value) goBackToHub();
    });
    escapeListenerBound = true;
  }
  const storyParam = new URLSearchParams(window.location.search).get('story');
  await ensureManifestLoaded();
  if (storyParam) await openStory(storyParam, false);
  else renderHub();
}

function renderHub() {
  activeStory.value = null;
  closePopover();
  document.body.classList.remove('graded-story-active', 'graded-pinyin-hidden', 'graded-translation-hidden');
  hubLimit.value = PAGE_SIZE;
  view.value = 'hub';
}

function goBackToHub() {
  activeStory.value = null;
  closePopover();
  document.body.classList.remove('graded-story-active');
  if (typeof SpaRouter !== 'undefined') {
    SpaRouter.pushView({ view: 'tab', tab: 'gradedReading' }, `${window.location.pathname}?tab=gradedReading`);
  } else {
    window.history.pushState({}, '', `${window.location.pathname}?tab=gradedReading`);
  }
  renderHub();
}

async function openStory(storyId, updateUrl = true) {
  if (!document.getElementById('screenGradedReading')) return;
  view.value = 'loading';
  try {
    const story = await loadStory(storyId);
    quizState.value = {};
    activeStory.value = story;
    if (updateUrl && typeof SpaRouter !== 'undefined') {
      SpaRouter.pushView({ view: 'tab', tab: 'gradedReading', story: storyId }, `${window.location.pathname}?tab=gradedReading&story=${storyId}`);
    }
    document.body.classList.add('graded-story-active');
    document.body.classList.toggle('graded-pinyin-hidden', !prefs.value.showPinyin);
    document.body.classList.toggle('graded-translation-hidden', !prefs.value.showTranslation);
    view.value = 'story';
  } catch (e) {
    errorMessage.value = e.message;
    view.value = 'error';
  }
}

const loadMoreStories = () => { hubLimit.value += PAGE_SIZE; };

function setFilter(sig, value) {
  sig.value = value;
  renderHub();
}

function resetFilters() {
  searchQuery.value = '';
  categoryFilter.value = 'all';
  levelFilter.value = 'all';
  sortOrder.value = 'default';
  renderHub();
}

function togglePinyin() {
  const next = { ...prefs.value, showPinyin: !prefs.value.showPinyin };
  savePrefs(next);
  document.body.classList.toggle('graded-pinyin-hidden', !next.showPinyin);
}

function toggleTranslation() {
  const next = { ...prefs.value, showTranslation: !prefs.value.showTranslation };
  savePrefs(next);
  document.body.classList.toggle('graded-translation-hidden', !next.showTranslation);
}

function answerQuiz(qId, selectedIdx) {
  const story = activeStory.value;
  if (!story) return;
  const q = story.quiz.find((item) => item.id === qId);
  if (!q) return;
  const next = { ...quizState.value, [qId]: { selectedIdx, isCorrect: selectedIdx === q.answer } };
  quizState.value = next;
  // Answering every question marks the story as read
  if (story.quiz.every((item) => next[item.id] !== undefined) && !isStoryRead(story.id)) markStoryAsRead(story.id);
}

// ---- Token popover (appended to <body>, like before) -------------------------------------------
const popover = signal(null); // { token, added }
let popoverEl = null;

function onDocClick(e) {
  if (popoverEl && !popoverEl.contains(e.target)) closePopover();
}

function closePopover() {
  if (popoverEl) {
    render(null, popoverEl);
    popoverEl.remove();
    popoverEl = null;
  }
  popover.value = null;
  document.removeEventListener('click', onDocClick);
}

function triggerAddSrs() {
  const p = popover.value;
  if (!p || p.added) return;
  if (addTokenToSrs(p.token)) {
    popover.value = { ...p, added: true };
    renderPopover();
  }
}

function TokenPopover({ token, added }) {
  const story = activeStory.value;
  const srsStatus = getTokenSrsStatus(token);
  const lvlNum = storyLevelNum(story);
  const isAboveLevel = Boolean(token.hsk && token.hsk > lvlNum);
  const isAlreadyInSrs = srsStatus === 'mastered' || srsStatus === 'learning';
  let displayStatus = srsStatus !== 'none' ? srsStatus : 'new';
  let statusLabel = srsStatus === 'mastered' ? '✓ Đã thuộc' : (srsStatus === 'learning' ? '⚡ Đang ôn (SRS)' : (isAboveLevel ? '⭐ Vượt cấp' : '✨ Từ mới'));
  if (added) {
    displayStatus = 'learning';
    statusLabel = '⚡ Đang ôn (SRS)';
  }
  const hanviet = token.hanviet || (typeof window.getWordHanViet === 'function' ? window.getWordHanViet(token.text) : '');
  const meaning = token.meaning_vi || (hanviet ? `Âm Hán-Việt: ${hanviet}` : 'Chữ Hán trong bài đọc');
  const btnDone = added || isAlreadyInSrs;

  return (
    <>
      <div class="popover-header">
        <div class="popover-hanzi-group">
          <div class="popover-hanzi">{token.text}</div>{' '}
          <div class="popover-pinyin">{token.pinyin || ''}</div>
        </div>{' '}
        <button type="button" class="popover-close-btn" onClick={closePopover} aria-label="Đóng">✕</button>
      </div>{' '}
      <div class="popover-meta">
        {token.hsk ? <span class="popover-hsk-badge">{`HSK ${token.hsk}`}</span> : null}{' '}
        {isAboveLevel ? <span class="token-overlevel-badge" style="font-size: 0.72rem; padding: 2px 6px;">{`+${token.hsk - lvlNum} Cấp`}</span> : null}{' '}
        <span class={`popover-srs-status ${displayStatus}`} id="popoverSrsBadge">{statusLabel}</span>
      </div>{' '}
      <div class="popover-body">
        <div class="popover-row">
          <div class="popover-row-label">Nghĩa tiếng Việt</div>{' '}
          <div class="popover-meaning">{meaning}</div>
        </div>{' '}
        {hanviet ? (
          <div class="popover-row">
            <div class="popover-row-label">Hán - Việt</div>{' '}
            <div class="popover-hanviet">{hanviet}</div>
          </div>
        ) : null}
      </div>{' '}
      <button type="button" class={btnDone ? 'popover-action-btn added' : 'popover-action-btn '} id="popoverAddSrsBtn" onClick={triggerAddSrs} disabled={btnDone}>
        {added ? '✓ Đã thêm vào SRS' : (isAlreadyInSrs ? '✓ Đã có trong SRS' : '+ Thêm vào hàng đợi SRS')}
      </button>
    </>
  );
}

function renderPopover() {
  if (popoverEl && popover.value) render(<TokenPopover {...popover.value} />, popoverEl);
}

function showTokenPopover(token, targetEl) {
  closePopover();
  if (!token.word_id) {
    token.word_id = `hsk${token.hsk || storyLevelNum(activeStory.value)}_${token.text.charCodeAt(0) + 10000}`;
  }
  popoverEl = document.createElement('div');
  popoverEl.id = 'gradedTokenPopover';
  popoverEl.className = 'graded-token-popover';
  popover.value = { token, added: false };
  renderPopover();
  document.body.appendChild(popoverEl);

  // Position next to the clicked word (or centred when opened from the spotlight list)
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const popoverWidth = 290;
    let left = rect.left + window.scrollX;
    const top = rect.bottom + window.scrollY + 8;
    if (left + popoverWidth > window.innerWidth - 16) left = window.innerWidth - popoverWidth - 16;
    if (left < 16) left = 16;
    popoverEl.style.left = `${left}px`;
    popoverEl.style.top = `${top}px`;
  } else {
    Object.assign(popoverEl.style, { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
  }
  // Close when clicking anywhere else
  setTimeout(() => document.addEventListener('click', onDocClick), 50);
}

function handleTokenClick(event, sidx, tidx) {
  event.stopPropagation();
  const story = activeStory.value;
  if (!story) return;
  const sentence = story.sentences[sidx];
  const token = sentence && sentence.tokens[tidx];
  if (!token || !token.text || PUNCT_RE.test(token.text)) return;
  showTokenPopover(token, event.currentTarget);
}

function inspectByWordId(wid, event) {
  if (event) event.stopPropagation();
  const story = activeStory.value;
  if (!story) return;
  for (const s of story.sentences) {
    const tok = s.tokens.find((t) => t.word_id === wid);
    if (tok) {
      showTokenPopover(tok, event ? event.currentTarget : null);
      return;
    }
  }
}

// ---- Hub -------------------------------------------------------------------------------------
const CHECK_SVG_PATH = <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></>;

function StoryCard({ story }) {
  const isRead = isStoryRead(story.id);
  const lvl = (story.level || 'hsk1').toLowerCase();
  const sentCount = story.sentence_count ?? story.sentences_count ?? 5;
  const wordCount = story.spotlight_count ?? story.words_count ?? 15;
  const zhTitle = story.title && story.title.zh ? story.title.zh : '';
  const viTitle = story.title && story.title.vi ? story.title.vi : '';
  const descVi = story.description_vi || '';
  const topicVi = story.topic_vi || '';
  const readLabel = isRead ? 'Đã đọc (Bấm để hủy)' : 'Đánh dấu đã đọc';
  return (
    <article class={`graded-story-card ${isRead ? 'is-read' : ''}`} onClick={() => openStory(story.id)} tabindex="0" role="button" aria-label={`Đọc bài ${viTitle}`}>
      <div class="graded-card-main">
        <div class="graded-card-header">
          <div class="graded-card-header-left">
            <span class={`graded-card-level-badge lvl-${lvl}`}>{story.level}</span>{' '}
            <span class="graded-card-topic" title={topicVi}>{topicVi}</span>
          </div>{' '}
          <div class="graded-card-header-right">
            <button type="button" class={`graded-card-mark-toggle ${isRead ? 'read' : ''}`} onClick={(e) => toggleStoryRead(story.id, e)} title={readLabel} aria-label={readLabel}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={isRead ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">{CHECK_SVG_PATH}</svg>
            </button>
          </div>
        </div>{' '}
        <div class="graded-card-body">
          <h2 class="graded-card-zh-title" title={zhTitle}>
            <span>{zhTitle}</span>
          </h2>{' '}
          <div class="graded-card-vi-title" title={viTitle}>{viTitle}</div>{' '}
          <p class="graded-card-desc" title={descVi}>{descVi}</p>
        </div>
      </div>{' '}
      <footer class="graded-card-footer">
        <div class="graded-card-meta">
          <span>{`${sentCount} câu`}</span>{' '}
          <span class="graded-meta-divider">·</span>{' '}
          <span>{`${wordCount} từ`}</span>{' '}
          <span class="graded-meta-divider">·</span>{' '}
          <span>{`⏱️ ${story.estimatedMinutes || 3}m`}</span>
        </div>{' '}
        <div class="graded-card-arrow" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>
      </footer>
    </article>
  );
}

const CONTROL_STYLE = 'border-radius: 10px; border: 1px solid var(--graded-border); background: var(--graded-card-bg); color: var(--graded-text-primary);';

function LoadMore({ remaining }) {
  return (
    <div id="gradedStoriesLoadMore" style="text-align: center; padding: 24px 0;"
      ref={(el) => {
        if (!el || !('IntersectionObserver' in window) || el.__observed) return;
        el.__observed = true;
        const obs = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            obs.disconnect();
            el.__observed = false;
            loadMoreStories();
          }
        }, { rootMargin: '300px' });
        obs.observe(el);
      }}>
      <button type="button" class="graded-filter-pill" onClick={loadMoreStories} style="padding: 10px 24px; font-weight: 700; font-size: 0.95rem;">
        {`Xem thêm bài đọc (${remaining} bài còn lại) ↓`}
      </button>
    </div>
  );
}

const filteredManifest = computed(() => {
  // Recomputed whenever a filter or the read list changes
  void readStories.value;
  return view.value === 'hub' ? getFilteredManifest() : [];
});

function Hub() {
  const readCount = manifest.filter((m) => isStoryRead(m.id)).length;
  const progressPercent = manifest.length ? Math.round((readCount / manifest.length) * 100) : 0;
  const categories = Array.from(new Set(manifest.map(storyCategory).filter(Boolean))).sort();
  const filtered = filteredManifest.value;
  const shown = filtered.slice(0, hubLimit.value);
  const lvlFilter = levelFilter.value;

  return (
    <div class="graded-reading-container">
      <div style="display: flex; align-items: center; justify-content: flex-start; margin-bottom: 16px;">
        <button type="button" class="graded-back-btn" onClick={() => window.setPrimaryTab('vocab')} title="Quay lại Hub Từ vựng">
          ← Quay lại Hub Từ vựng
        </button>
      </div>{' '}

      <header class="graded-hub-hero">
        <div class="graded-hub-badge">📚 Graded Reading</div>{' '}
        <h1 class="graded-hub-title">汉字思维 · Graded Reading</h1>{' '}
        <p class="graded-hub-subtitle">
          Luyện đọc hiểu phân cấp theo ngữ cảnh thực tế · Vòng lặp học từ khép kín · Nhận diện vốn từ SRS cá nhân
        </p>{' '}
        <div class="graded-hub-progress-wrap">
          <div class="graded-hub-progress-bar">
            <div class="graded-hub-progress-fill" style={`width: ${progressPercent}%;`}></div>
          </div>{' '}
          <div class="graded-hub-progress-meta">
            <span>Tiến độ đọc: <strong>{`${readCount}/${manifest.length}`}</strong>{` bài (${progressPercent}%)`}</span>
          </div>
        </div>
      </header>{' '}

      <div class="graded-search-toolbar" style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
        <div style="flex: 1; min-width: 240px; position: relative;">
          <input type="search" id="gradedSearchInput" class="graded-search-input"
            placeholder="🔍 Tìm bài đọc theo tiêu đề, chủ đề..."
            value={searchQuery.value}
            onInput={(e) => setFilter(searchQuery, e.currentTarget.value || '')}
            style={`width: 100%; padding: 10px 14px; ${CONTROL_STYLE} font-size: 0.9rem;`}
            aria-label="Tìm kiếm bài đọc" />
        </div>{' '}
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <select id="gradedCategorySelect" value={categoryFilter.value} onChange={(e) => setFilter(categoryFilter, e.currentTarget.value || 'all')}
            style={`padding: 9px 12px; ${CONTROL_STYLE} font-size: 0.85rem;`} aria-label="Lọc theo chủ đề">
            <option value="all">Mọi chủ đề</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>{' '}
          <select id="gradedSortSelect" value={sortOrder.value} onChange={(e) => setFilter(sortOrder, e.currentTarget.value || 'default')}
            style={`padding: 9px 12px; ${CONTROL_STYLE} font-size: 0.85rem;`} aria-label="Sắp xếp bài đọc">
            <option value="default">Mặc định</option>
            <option value="time_asc">Thời gian: Ngắn nhất</option>
            <option value="time_desc">Thời gian: Dài nhất</option>
            <option value="title">Tên bài (A-Z)</option>
          </select>
        </div>
      </div>{' '}

      <nav class="graded-hub-filters" aria-label="Bộ lọc cấp độ HSK">
        <button type="button" class={`graded-filter-pill ${lvlFilter === 'all' ? 'active' : ''}`} onClick={() => setFilter(levelFilter, 'all')}>
          {`Tất cả (${manifest.length})`}
        </button>{' '}
        <button type="button" class={`graded-filter-pill ${lvlFilter === 'read' ? 'active' : ''} ${readCount === 0 ? 'disabled' : ''}`} onClick={() => setFilter(levelFilter, 'read')} title="Xem bài đã đọc">
          {`✓ Đã đọc (${readCount})`}
        </button>
        {LEVELS.map((lvl) => {
          const count = manifest.filter((m) => m.level.toUpperCase() === lvl).length;
          const lvlDisplay = lvl.replace('HSK', 'HSK ');
          if (!count) {
            return [' ', <button key={lvl} type="button" class="graded-filter-pill disabled" title="Đang cập nhật thêm bài đọc">{`${lvlDisplay} (Sắp có)`}</button>];
          }
          const lvlReadCount = manifest.filter((m) => m.level.toUpperCase() === lvl && isStoryRead(m.id)).length;
          const readTag = lvlReadCount > 0 ? ` · ${lvlReadCount}✓` : '';
          return [' ', (
            <button key={lvl} type="button" class={`graded-filter-pill ${lvlFilter === lvl ? 'active' : ''}`} onClick={() => setFilter(levelFilter, lvl)}>
              {`${lvlDisplay} (${count} bài${readTag})`}
            </button>
          )];
        })}
      </nav>{' '}

      <div style="font-size: 0.85rem; color: var(--graded-text-secondary); margin-bottom: 12px;">
        Hiển thị <strong>{filtered.length}</strong> bài đọc phù hợp
      </div>{' '}

      <div class="graded-stories-grid" id="gradedStoriesGrid">
        {filtered.length === 0 ? (
          <div class="graded-empty-state">
            <span style="font-size: 2.2rem;">📖</span>{' '}
            <div style="font-weight: 700; font-size: 1.05rem; margin-top: 10px; color: var(--graded-text-primary);">
              {lvlFilter === 'read' ? 'Bạn chưa đánh dấu bài đọc nào' : 'Không có bài đọc nào phù hợp'}
            </div>{' '}
            <p style="color: var(--graded-text-secondary); font-size: 0.88rem; max-width: 480px; margin: 6px auto 16px;">
              {lvlFilter === 'read' ? 'Hãy mở một bài đọc và bấm "Đánh dấu đã đọc" sau khi đọc xong, hoặc bấm nút tích trên thẻ bài đọc.' : 'Vui lòng chọn cấp độ hoặc từ khóa khác.'}
            </p>{' '}
            <button type="button" class="graded-filter-pill active" onClick={resetFilters}>Xem tất cả bài đọc</button>
          </div>
        ) : shown.map((story) => <StoryCard key={story.id} story={story} />)}
      </div>{' '}

      {filtered.length > shown.length && <LoadMore key={shown.length} remaining={filtered.length - shown.length} />}
    </div>
  );
}

// ---- Reader ------------------------------------------------------------------------------------
// Groups a sentence's tokens with their punctuation so a mark never wraps onto a line alone.
function tokenUnits(tokens) {
  const units = [];
  let current = [];
  const flush = () => { if (current.length) units.push(current); current = []; };
  tokens.forEach((tok, tidx) => {
    const text = (tok.text || '').trim();
    const isLeading = LEADING_PUNCT.has(text);
    const isTrailing = TRAILING_PUNCT.has(text);
    const isPunct = isLeading || isTrailing || PUNCT_RE.test(text);
    if (isLeading) {
      if (current.some((item) => !item.isLeading)) flush();
      current.push({ tok, tidx, isLeading: true });
    } else if (isTrailing || isPunct) {
      current.push({ tok, tidx });
      flush();
    } else {
      if (current.some((item) => !item.isLeading)) flush();
      current.push({ tok, tidx });
    }
  });
  flush();
  return units;
}

// Word tokens keep the legacy newline whitespace around them (it affects CJK line breaking).
function Token({ token, sidx, tidx, lvlNum }) {
  if (PUNCT_RE.test(token.text)) return <span class="graded-punctuation">{token.text}</span>;
  const status = getTokenSrsStatus(token);
  const tokenLvl = token.hsk || 1;
  const isOverLevel = Boolean(token.word_id && tokenLvl > lvlNum);
  return [
    '\n      ',
    <span class={`graded-token token-${status !== 'none' ? status : 'new'} ${isOverLevel ? 'token-overlevel' : ''}`}
      data-sidx={sidx} data-tidx={tidx} data-word-id={token.word_id || ''}
      onClick={(e) => handleTokenClick(e, sidx, tidx)} title="Bấm để xem nghĩa & thêm vào SRS">
      {'\n        '}
      <ruby>
        {'\n          '}<rt class="token-pinyin">{token.pinyin || ''}</rt>{'\n          '}<rb>{token.text}</rb>{'\n        '}
      </ruby>
      {isOverLevel ? <span class="token-overlevel-badge">{`+${tokenLvl - lvlNum}`}</span> : null}
      {'\n      '}
    </span>,
    '\n    '
  ];
}

// Static per story: rendered once when the story opens (SRS colours are then patched in place).
function SentenceTokens({ sentence, sidx, lvlNum }) {
  return tokenUnits(sentence.tokens || []).map((unit, u) => (
    <span class="graded-token-unit" key={u}>
      {unit.map((item) => <Token key={item.tidx} token={item.tok} sidx={sidx} tidx={item.tidx} lvlNum={lvlNum} />)}
    </span>
  ));
}

function SentenceAudioButton({ sentence, sidx }) {
  const playing = playingId.value === sentence.id;
  const cleanZh = (sentence.zh || sentence.tokens.map((t) => t.text).join('')).replace(/^[，。？！、\s]+/, '');
  return (
    <button type="button" class={playing ? 'sentence-audio-btn speech-btn playing' : 'sentence-audio-btn speech-btn'} data-sentence-id={sentence.id}
      onClick={() => speakSentence(cleanZh, sentence.id)} title="Nghe câu này" aria-label={`Nghe câu ${sidx + 1}`}
      style="flex-shrink: 0; margin-top: 6px; padding: 4px 8px; font-size: 0.76rem; border-radius: 6px; border: 1px solid var(--graded-border); background: var(--graded-chip-bg); color: var(--graded-text-secondary); cursor: pointer;">
      {playing ? '⏹ Dừng' : '🔊 Nghe'}
    </button>
  );
}

function SentenceStream({ story }) {
  const lvlNum = storyLevelNum(story);
  return (
    <div class="graded-sentence-stream">
      {story.sentences.map((sentence, sidx) => (
        <div class="graded-sentence-block" id={`sent-${sentence.id}`} key={sentence.id}>
          <div class="graded-sentence-top-row" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
            <div class="graded-sentence-zh">
              {'\n                    '}<SentenceTokens sentence={sentence} sidx={sidx} lvlNum={lvlNum} />{'\n                  '}
            </div>{' '}
            <SentenceAudioButton sentence={sentence} sidx={sidx} />
          </div>{' '}
          <div class="graded-sentence-vi">{sentence.vi}</div>
        </div>
      ))}
    </div>
  );
}

function Spotlight({ story }) {
  const wordsById = {};
  story.sentences.forEach((s) => s.tokens.forEach((tok) => {
    if (tok.word_id && !wordsById[tok.word_id]) wordsById[tok.word_id] = tok;
  }));
  return story.vocabulary_spotlight.map((wid) => {
    const tok = wordsById[wid];
    if (!tok) return null;
    const status = getTokenSrsStatus(tok);
    const label = status === 'mastered' ? 'Đã nhớ' : (status === 'learning' ? 'Đang ôn' : 'Từ mới');
    return [' ', (
      <div key={wid} class="graded-spotlight-item" onClick={(e) => inspectByWordId(wid, e)}>
        <div class="spotlight-top">
          <span class="spotlight-hz">{tok.text}</span>{' '}
          <span class="spotlight-py">{tok.pinyin}</span>
        </div>{' '}
        <div class="spotlight-vi">{tok.meaning_vi}</div>{' '}
        <div style="margin-top: 4px;">
          <span class={`popover-srs-status ${status}`}>{label}</span>
        </div>
      </div>
    )];
  });
}

function Quiz({ story }) {
  const answers = quizState.value;
  return (
    <div class="graded-quiz-container">
      {story.quiz.map((q, qidx) => {
        const a = answers[q.id];
        return (
          <div class="graded-quiz-item" id={`quiz-${q.id}`} key={q.id}>
            <div class="graded-quiz-question">{`Câu ${qidx + 1}: ${q.question_vi}`}</div>{' '}
            <div class="graded-quiz-options">
              {q.options_vi.map((opt, oidx) => {
                let cls = 'graded-quiz-opt-btn';
                if (a && oidx === q.answer) cls += ' correct';
                else if (a && oidx === a.selectedIdx && !a.isCorrect) cls += ' wrong';
                return [' ', (
                  <button key={oidx} type="button" class={cls} disabled={Boolean(a)} onClick={() => answerQuiz(q.id, oidx)}>
                    <span style="font-weight: 700; color: var(--text-secondary);">{`${String.fromCharCode(65 + oidx)}.`}</span>{' '}
                    <span>{opt}</span>
                  </button>
                )];
              })}
            </div>{' '}
            <div class="graded-quiz-explanation" id={`quiz-exp-${q.id}`} style={a ? 'display: block;' : 'display:none;'}>
              {a && (
                <>
                  <div style="font-weight: 700; margin-bottom: 2px;">{a.isCorrect ? '🎉 Chính xác!' : '❌ Chưa chính xác!'}</div>{' '}
                  <div>{q.explanation_vi}</div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReaderNav({ story }) {
  const isRead = isStoryRead(story.id);
  const p = prefs.value;
  const playingAll = playingId.value === 'full-story';
  return (
    <header class="graded-reader-nav">
      <button type="button" class="graded-back-btn" onClick={goBackToHub} title="Trở về danh sách bài đọc (Esc)">
        ← Hub bài đọc
      </button>{' '}
      <div class="graded-reader-title-group">
        <h1 class="graded-reader-zh-title">
          <span>{story.title.zh}</span>{' '}
          <span class={`graded-card-level-badge lvl-${(story.level || 'hsk1').toLowerCase()}`}>{story.level}</span>
        </h1>{' '}
        <div class="graded-reader-vi-title">{`${story.title.vi} · ⏱️ ${story.estimatedMinutes} phút`}</div>
      </div>{' '}
      <div class="graded-reader-actions">
        <button type="button" id="playFullStoryBtn" class={playingAll ? 'graded-toggle-btn active' : 'graded-toggle-btn'} onClick={speakFullStory} title="Nghe đọc toàn bộ bài đọc">
          <span>{playingAll ? '⏹ Dừng đọc' : '🔊 Đọc toàn bài'}</span>
        </button>{' '}
        <button type="button" id="toggleReadStoryBtn" class={`graded-toggle-btn ${isRead ? 'active read-active' : ''}`} onClick={toggleCurrentStoryRead}
          title={isRead ? 'Đã đọc (Bấm để hủy)' : 'Đánh dấu đã đọc bài này'}>
          <span>{isRead ? '✓ Đã đọc' : '○ Đã đọc'}</span>
        </button>{' '}
        <button type="button" id="togglePinyinBtn" class={`graded-toggle-btn ${p.showPinyin ? 'active' : ''}`} onClick={togglePinyin} title="Bật/Tắt phiên âm Pinyin">
          拼 Pinyin
        </button>{' '}
        <button type="button" id="toggleTransBtn" class={`graded-toggle-btn ${p.showTranslation ? 'active' : ''}`} onClick={toggleTranslation} title="Bật/Tắt bản dịch tiếng Việt">
          🇻🇳 Dịch
        </button>
      </div>
    </header>
  );
}

function CompletionCard({ story }) {
  const isRead = isStoryRead(story.id);
  return (
    <section class={`graded-completion-card ${isRead ? 'completed' : ''}`} id="storyCompletionCard">
      <div class="completion-icon-box">{isRead ? '🎉' : '📖'}</div>{' '}
      <div class="completion-content">
        <h3 class="completion-heading">{isRead ? 'Đã hoàn thành bài đọc!' : 'Hoàn thành bài đọc này?'}</h3>{' '}
        <p class="completion-sub">{isRead ? 'Bài viết đã được lưu vào danh sách Đã đọc của bạn.' : 'Đánh dấu đã đọc để lưu tiến trình và theo dõi lộ trình học tập.'}</p>
      </div>{' '}
      <button type="button" class={`graded-completion-btn ${isRead ? 'active' : ''}`} onClick={toggleCurrentStoryRead}>
        {isRead ? '✓ Đã hoàn thành (Bấm để hủy)' : '✓ Đã đọc (Lưu tiến trình)'}
      </button>
    </section>
  );
}

function SectionTitle({ icon, text }) {
  return (
    <h2 class="graded-section-title">
      <span>{icon}</span>{' '}
      <span>{text}</span>
    </h2>
  );
}

function StoryReader({ story }) {
  return (
    <div class="graded-reading-container graded-reader-shell">
      <ReaderNav story={story} />{' '}
      <div class="graded-srs-legend-bar" aria-label="Chú giải trạng thái từ vựng">
        <span style="font-weight: 700; color: var(--text-secondary);">Vốn từ cá nhân:</span>
        {[['mastered', 'Đã thuộc'], ['learning', 'Đang học (SRS)'], ['new', 'Từ mới'], ['overlevel', 'Vượt cấp (+1)']].map(([cls, label]) => [' ', (
          <div class="graded-legend-item" key={cls}>
            <span class={`legend-swatch ${cls}`}></span>{' '}
            <span>{label}</span>
          </div>
        )])}
      </div>{' '}
      <main class="graded-passage-card">
        <SentenceStream story={story} />
      </main>{' '}
      <section class="graded-section-card">
        <SectionTitle icon="⭐" text={`Từ vựng trọng tâm trong bài (${story.vocabulary_spotlight.length} từ)`} />{' '}
        <div class="graded-spotlight-grid"><Spotlight story={story} /></div>
      </section>{' '}
      <section class="graded-section-card">
        <SectionTitle icon="📝" text={`Kiểm tra đọc hiểu (${story.quiz.length} câu)`} />{' '}
        <Quiz story={story} />
      </section>{' '}
      <CompletionCard story={story} />
    </div>
  );
}

export function GradedReadingScreen() {
  switch (view.value) {
    case 'hub':
      return <Hub />;
    case 'loading':
      return (
        <div class="graded-reading-container" style="text-align: center; padding: 60px 0;">
          <div style="font-size: 1.5rem; margin-bottom: 12px;">📖</div>{' '}
          <div style="color: var(--text-secondary);">Đang tải bài đọc...</div>
        </div>
      );
    case 'error':
      return (
        <div class="graded-reading-container" style="text-align: center; padding: 60px 0;">
          <div style="color: #ef4444; font-weight: 700; margin-bottom: 12px;">Đã xảy ra lỗi</div>{' '}
          <p style="color: var(--text-secondary);">{errorMessage.value}</p>{' '}
          <button type="button" class="graded-back-btn" style="margin: 16px auto;" onClick={goBackToHub}>← Trở về danh sách</button>
        </div>
      );
    case 'story':
      return activeStory.value ? <StoryReader key={activeStory.value.id} story={activeStory.value} /> : null;
    default:
      return null;
  }
}

export const GradedReading = {
  init,
  renderHub,
  openStory,
  goBackToHub,
  togglePinyin,
  toggleTranslation,
  setLevelFilter: (lvl) => setFilter(levelFilter, lvl),
  setCategoryFilter: (cat) => setFilter(categoryFilter, cat || 'all'),
  setSort: (s) => setFilter(sortOrder, s || 'default'),
  handleSearchInput: (val) => setFilter(searchQuery, val || ''),
  resetFilters,
  loadMoreStories,
  speakSentence,
  speakFullStory,
  handleTokenClick,
  inspectByWordId,
  triggerAddSrs,
  closePopover,
  answerQuiz,
  isStoryRead,
  markStoryAsRead,
  unmarkStoryAsRead,
  toggleStoryRead,
  toggleCurrentStoryRead
};

export function mountGradedReading() {
  window.GradedReading = GradedReading;
  const screen = document.getElementById('screenGradedReading');
  if (screen) render(<GradedReadingScreen />, screen);
}
