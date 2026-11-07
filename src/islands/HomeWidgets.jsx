// Home screen widgets: word of the day and the 7-day review forecast (#homeWidgets), plus the
// "Cần ôn gấp" list handed to the quick-access drawer. Preact port of the former
// assets/js/home-widgets.js with the same markup. The scheduling (syncHomeScreen /
// invalidateHomeWidgets) lives in levels.js because the dashboard calls it while the classic
// scripts load; it calls window.refreshHomeWidgets() when home is visible.
import { render } from 'preact';
import { signal } from '@preact/signals';
import { onDomReady } from './domReady';

/* global LEVELS, LEVELS_HSK30, SRS, SPEECH_RATE, homeWidgetsDirty -- classic-script globals */

const HOME_WORD_OF_DAY_KEY = 'hsk_word_of_day_v1';
// Keep the daily suggestion stable even when older imported decks have stale translations.
const HOME_WORD_DATA_FIXES = {
  '算法': { pinyin: 'suànfǎ', meaning: 'thuật toán' },
  '右边': { pinyin: 'yòubian', meaning: 'bên phải' }
};
const HOME_WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const HOME_WEEKDAY_LONG = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const HOME_HEATMAP_WEEKS = 12;
const HOME_FORECAST_BAR_HEIGHT = 42;
const HOME_FORGOTTEN_LIMIT = 25;

let renderSeq = 0;
const homeVocabCache = {};

const wordOfDay = signal(null);   // null (nothing yet) | { status: 'loading' | 'empty' | 'error' } | { status: 'ok', level, word }
const forecast = signal(null);    // result of buildReviewForecast()
const cardEpoch = signal(0);      // the cards are rebuilt on every refresh, as before

const homeLevelKeys = () => Object.keys(LEVELS).filter((level) => LEVELS[level].available);

function loadHomeVocab(level) {
  if (!homeVocabCache[level]) {
    homeVocabCache[level] = window.fetchLevelWords(level)
      .then((words) => words.map((word) => (HOME_WORD_DATA_FIXES[word.hanzi] ? { ...word, ...HOME_WORD_DATA_FIXES[word.hanzi] } : word)))
      .catch((error) => {
        delete homeVocabCache[level];
        throw error;
      });
  }
  return homeVocabCache[level];
}

function homeHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function homeShortLevelLabel(level) {
  if (LEVELS_HSK30[level]) return 'HSK ' + level.replace('hsk30_', '') + ' (3.0)';
  return LEVELS[level].label;
}

const isHomeLearningCard = (card) => card && (card.state === SRS.State.Learning || card.state === SRS.State.Relearning);

// One pass over localStorage per refresh; every widget reads from this snapshot.
function collectHomeSnapshot(now) {
  const cardsByLevel = {};
  let legacyUnknown = 0;
  const heatmapStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - HOME_HEATMAP_WEEKS * 7 - 7);
  const reviewsByDay = {};
  homeLevelKeys().forEach((level) => {
    const record = window.readSrsRecord(level);
    if (record) cardsByLevel[level] = record.cards;
    else legacyUnknown += Object.values(window.readSavedLevelProgressLegacy(level)).filter((status) => status === 'unknown').length;
    window.readSrsReviewLog(level).forEach((entry) => {
      const timestamp = new Date(entry && entry.timestamp);
      if (!Number.isFinite(timestamp.getTime()) || timestamp < heatmapStart) return;
      const key = window.localDateKey(timestamp);
      reviewsByDay[key] = (reviewsByDay[key] || 0) + 1;
    });
  });
  return { now, cardsByLevel, legacyUnknown, reviewsByDay, activity: window.readStudyActivity() };
}

// ---- Từ của ngày ---------------------------------------------------------------------------------

async function pickWordOfDay(snapshot, forceRefresh = false) {
  const today = window.localDateKey(snapshot.now);
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(HOME_WORD_OF_DAY_KEY)); } catch (e) { /* none */ }
  if (!forceRefresh && saved && saved.date === today && LEVELS[saved.level] && LEVELS[saved.level].available) {
    const words = await loadHomeVocab(saved.level);
    const word = words.find((item) => item.id === saved.wordId);
    if (word) return { level: saved.level, word };
  }
  const target = window.learningProgressSummary().target;
  if (!target) return null;
  const level = target.level;
  const words = await loadHomeVocab(level);
  if (!words.length) return null;
  const cards = snapshot.cardsByLevel[level];
  const legacy = cards ? null : window.readSavedLevelProgressLegacy(level);
  const unseen = words.filter((word) => (legacy ? !legacy[word.id] : !cards[word.id] || cards[word.id].state === SRS.State.New));
  const learning = words.filter((word) => (legacy ? legacy[word.id] === 'unknown' : isHomeLearningCard(cards[word.id])));
  const pool = forceRefresh ? words : unseen.length ? unseen : learning.length ? learning : words;
  const candidates = forceRefresh && saved && saved.level === level ? pool.filter((c) => c.id !== saved.wordId) : pool;
  const source = candidates.length ? candidates : pool;
  const word = forceRefresh ? source[Math.floor(Math.random() * source.length)] : source[homeHash(today + '|' + level) % source.length];
  try { localStorage.setItem(HOME_WORD_OF_DAY_KEY, JSON.stringify({ date: today, level, wordId: word.id })); } catch (e) { /* quota */ }
  return { level, word };
}

async function renderWordOfDay(snapshot, seq, forceRefresh = false) {
  if (!wordOfDay.value) wordOfDay.value = { status: 'loading' };
  let pick;
  try {
    pick = await pickWordOfDay(snapshot, forceRefresh);
  } catch (e) {
    pick = undefined;
  }
  if (seq !== renderSeq) return;
  cardEpoch.value++;
  if (!pick) wordOfDay.value = { status: pick === null ? 'empty' : 'error' };
  else wordOfDay.value = { status: 'ok', ...pick };
}

// Examples mark the target word with <u>; keep that emphasis without trusting the markup.
function RichText({ html }) {
  return String(html || '').split(/(<u>.*?<\/u>)/).map((part, i) => {
    if (!part) return null;
    const match = part.match(/^<u>(.*)<\/u>$/);
    const text = (match ? match[1] : part).replace(/<[^>]*>/g, '');
    return match ? <u key={i}>{text}</u> : text;
  });
}

const SpeakerIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

function WordOfDay() {
  const state = wordOfDay.value;
  if (!state) return null;
  if (state.status === 'loading') return <p class="hw-empty">Đang chọn từ của ngày...</p>;
  const refresh = () => renderWordOfDay(collectHomeSnapshot(new Date()), renderSeq, true);
  const head = (
    <div class="hw-head">
      <h2 class="hw-eyebrow">Từ của ngày</h2>
      <button type="button" class="hw-refresh-btn" aria-label="Đổi từ của ngày" title="Đổi từ khác" onClick={refresh}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3" /></svg>
      </button>
      {state.status === 'ok' && <span class="hw-pill">{homeShortLevelLabel(state.level)}</span>}
    </div>
  );
  if (state.status !== 'ok') {
    return <>{head}<p class="hw-empty">{state.status === 'empty' ? 'Chưa có từ nào để gợi ý.' : 'Không tải được từ của ngày. Kiểm tra kết nối rồi thử lại.'}</p></>;
  }
  const { level, word } = state;
  const hanziLength = Array.from(word.hanzi).length;
  const sizeClass = hanziLength > 4 ? ' is-long' : hanziLength > 2 ? ' is-medium' : '';
  return (
    <>
      {head}
      <div class="hw-wotd-main">
        <div class={`hw-wotd-hanzi hw-cjk${sizeClass}`} lang="zh-CN">{word.hanzi}</div>
        <div class="hw-wotd-text">
          <div class="hw-wotd-pinyin">{word.pinyin}</div>
          <div class="hw-wotd-meaning">{word.meaning}</div>
        </div>
      </div>
      {word.example_zh && (
        <div class="hw-example">
          <p class="hw-example-zh hw-cjk" lang="zh-CN"><RichText html={word.example_zh} /></p>
          {word.example_vi && <p class="hw-example-vi"><RichText html={word.example_vi} /></p>}
        </div>
      )}
      <div class="hw-actions">
        <button type="button" class="hw-icon-btn speech-btn" aria-label="Nghe phát âm" onClick={(e) => window.speakText(word.hanzi, e.currentTarget, SPEECH_RATE)}><SpeakerIcon /></button>
        <button type="button" class="hw-primary-btn" onClick={() => window.openWordInLevel(level, word.id)}>Học từ này</button>
      </div>
    </>
  );
}

// ---- Lịch ôn 7 ngày tới ----------------------------------------------------------------------------

function buildReviewForecast(snapshot) {
  const todayKey = window.localDateKey(snapshot.now);
  const counts = new Array(7).fill(0);
  counts[0] += snapshot.legacyUnknown;
  let hasReviewedCards = snapshot.legacyUnknown > 0;
  Object.values(snapshot.cardsByLevel).forEach((cards) => {
    Object.values(cards).forEach((card) => {
      if (!card || card.state === SRS.State.New) return;
      hasReviewedCards = true;
      const due = new Date(card.due);
      if (!Number.isFinite(due.getTime())) return;
      const offset = window.calendarDayDifference(todayKey, window.localDateKey(due));
      if (offset === null || offset >= 7) return;
      counts[Math.max(0, offset)]++;
    });
  });
  const days = counts.map((count, offset) => {
    const date = new Date(snapshot.now.getFullYear(), snapshot.now.getMonth(), snapshot.now.getDate() + offset);
    return {
      count,
      label: offset === 0 ? 'Nay' : HOME_WEEKDAY_SHORT[date.getDay()],
      longLabel: offset === 0 ? 'Hôm nay' : HOME_WEEKDAY_LONG[date.getDay()]
    };
  });
  return { days, total: counts.reduce((sum, count) => sum + count, 0), hasReviewedCards };
}

function CardHead({ title, meta }) {
  return (
    <div class="hw-head">
      <h2 class="hw-title">{title}</h2>
      {meta ? <span class="hw-meta">{meta}</span> : null}
    </div>
  );
}

function ReviewForecast() {
  const f = forecast.value;
  if (!f) return null;
  if (!f.hasReviewedCards) return <><CardHead title="Lịch ôn 7 ngày tới" /><p class="hw-empty">Bắt đầu ôn để xem lịch.</p></>;
  const peak = f.days.reduce((best, day) => (day.count > best.count ? day : best), f.days[0]);
  const max = Math.max(1, peak.count);
  return (
    <>
      <CardHead title="Lịch ôn 7 ngày tới" meta={f.total + ' thẻ'} />
      <p class="hw-sub">{peak.count > 0 ? 'Cao điểm: ' + peak.longLabel + ' · ' + peak.count + ' thẻ' : 'Không có thẻ đến hạn trong 7 ngày tới'}</p>
      <div class="hw-bars" role="img" aria-label={'Số thẻ đến hạn: ' + f.days.map((day) => day.longLabel + ' ' + day.count).join(', ')}>
        {f.days.map((day, index) => (
          <div key={index} class={'hw-bar-col' + (index === 0 ? ' is-today' : '')} aria-hidden="true">
            <span class="hw-bar-value">{String(day.count)}</span>
            <span class="hw-bar" style={{ height: Math.max(6, Math.round(day.count / max * HOME_FORECAST_BAR_HEIGHT)) + 'px' }}></span>
            <span class="hw-bar-label">{day.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ---- Từ hay quên (feeds the quick-access drawer) -------------------------------------------------

function topForgottenCards(snapshot, limit = HOME_FORGOTTEN_LIMIT) {
  const items = [];
  homeLevelKeys().forEach((level) => {
    if (!level.startsWith('hsk')) return;
    const cards = snapshot.cardsByLevel[level];
    if (cards) {
      Object.entries(cards).forEach(([id, card]) => {
        if (card && (card.lapses > 0 || card.last_rating === 'again' || card.state === SRS.State.Relearning || card.status === 'unknown')) {
          items.push({ level, id, card });
        }
      });
    } else {
      Object.entries(window.readSavedLevelProgressLegacy(level)).forEach(([id, status]) => {
        if (status === 'unknown') items.push({ level, id, card: { lapses: 1, last_rating: 'again', status: 'unknown' } });
      });
    }
  });
  items.sort((a, b) => {
    const aLapses = a.card.lapses || (a.card.last_rating === 'again' ? 1 : 0);
    const bLapses = b.card.lapses || (b.card.last_rating === 'again' ? 1 : 0);
    return bLapses - aLapses || String(b.card.last_review || '').localeCompare(String(a.card.last_review || ''));
  });
  return items.slice(0, limit);
}

async function updateForgotten(snapshot, seq) {
  const top = topForgottenCards(snapshot, HOME_FORGOTTEN_LIMIT);
  let items = [];
  let failed = false;
  if (top.length) {
    try {
      items = (await Promise.all(top.map(async (item) => {
        const words = await loadHomeVocab(item.level);
        const word = words.find((candidate) => String(candidate.id) === item.id);
        return word ? { ...item, word } : null;
      }))).filter(Boolean);
    } catch (e) {
      failed = true;
    }
  }
  if (seq !== renderSeq) return;
  if (typeof window.updateQuickUrgentWords === 'function') window.updateQuickUrgentWords(failed ? [] : items);
}

export function openForgottenReview(items) {
  window.openReviewQueue('Ôn nhanh từ hay quên', async () => items.map((item) => {
    const record = window.readSrsRecord(item.level);
    const card = (record && record.cards[item.id]) || item.card;
    return { level: item.level, word: item.word, card, due: new Date(card.due).getTime() };
  }), 'Đã ôn xong các từ hay quên.');
}

// ---- Lifecycle -----------------------------------------------------------------------------------

export function refreshHomeWidgets() {
  window.homeWidgetsDirty = false; // levels.js scheduling flag
  const seq = ++renderSeq;
  const snapshot = collectHomeSnapshot(new Date());
  forecast.value = buildReviewForecast(snapshot);
  cardEpoch.value++;
  renderWordOfDay(snapshot, seq);
  updateForgotten(snapshot, seq);
}

function HomeWidgetsCards() {
  return (
    <>
      <section class="hw-card hw-wotd" id="hwWordOfDay"><WordOfDay key={cardEpoch.value} /></section>
      <section class="hw-card hw-forecast" id="hwForecast"><ReviewForecast key={cardEpoch.value} /></section>
    </>
  );
}

// Desktop (≥1280px) and mobile both use the dashboard slot when it exists.
function placeHomeWidgets(container, isDesktop) {
  const bottomMount = document.getElementById('dashboardBottomWidgets');
  if (bottomMount) {
    bottomMount.appendChild(container);
    return;
  }
  const statsContent = document.getElementById('dashboardStatsContent');
  if (statsContent) {
    statsContent.appendChild(container);
    return;
  }
  const target = isDesktop ? document.getElementById('workstationRight') : document.getElementById('screenVocabHub');
  if (!target) return;
  if (isDesktop) target.prepend(container);
  else target.appendChild(container);
}

export function mountHomeWidgets() {
  Object.assign(window, { refreshHomeWidgets, homeShortLevelLabel, openForgottenReview });
  onDomReady(() => {
    const container = document.createElement('div');
    container.className = 'home-widgets';
    container.id = 'homeWidgets';
    render(<HomeWidgetsCards />, container);
    const desktopQuery = window.matchMedia('(min-width: 1280px)');
    placeHomeWidgets(container, desktopQuery.matches);
    desktopQuery.addEventListener('change', (event) => placeHomeWidgets(container, event.matches));
    window.onActiveWordChange(window.syncHomeScreen);
    window.invalidateHomeWidgets();
  });
}
