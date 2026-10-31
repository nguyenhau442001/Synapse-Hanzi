// Home screen widgets: word of the day, 7-day review forecast, activity heatmap, forgotten words.
// Desktop (≥1280px) mounts them in the right sidebar; smaller screens place them in the vocab hub
// below the level grid. Data is recomputed once per progress change, and only while home is visible.
const HOME_WORD_OF_DAY_KEY = 'hsk_word_of_day_v1';
// Keep the daily suggestion stable even when older imported decks have stale translations.
const HOME_WORD_DATA_FIXES = {
  '算法': { pinyin: 'suànfǎ', meaning: 'thuật toán' },
  '右边': { pinyin: 'yòubian', meaning: 'bên phải' },
};
const HOME_WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const HOME_WEEKDAY_LONG = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const HOME_HEATMAP_WEEKS = 12;
const HOME_FORECAST_BAR_HEIGHT = 68;
const HOME_SPEAKER_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const HOME_FORGOTTEN_LIMIT = 25;

let homeWidgetsDirty = true;
let homeWidgetsSyncFrame = 0;
let homeWidgetsRenderId = 0;
const homeVocabCache = {};

function homeLevelKeys() {
  return Object.keys(LEVELS).filter(level => LEVELS[level].available);
}

function loadHomeVocab(level) {
  if (!homeVocabCache[level]) {
    homeVocabCache[level] = fetch(LEVELS[level].dataUrl)
      .then(response => {
        if (!response.ok) throw new Error('fetch failed');
        return response.json();
      })
      .then(words => words.map(word => HOME_WORD_DATA_FIXES[word.hanzi]
        ? { ...word, ...HOME_WORD_DATA_FIXES[word.hanzi] }
        : word))
      .catch(error => {
        delete homeVocabCache[level];
        throw error;
      });
  }
  return homeVocabCache[level];
}

function homeElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function homeCardHead(title, meta) {
  const head = homeElement('div', 'hw-head');
  head.appendChild(homeElement('h2', 'hw-title', title));
  if (meta) head.appendChild(homeElement('span', 'hw-meta', meta));
  return head;
}

function homeEmptyState(text) {
  return homeElement('p', 'hw-empty', text);
}

function homeForgottenEmptyState() {
  const state = homeElement('div', 'hw-forgot-empty');
  state.setAttribute('role', 'status');
  state.innerHTML = '<span class="hw-forgot-empty-icon" aria-hidden="true">🏅</span>';
  const copy = homeElement('p', 'hw-forgot-empty-copy', 'Tuyệt vời! Không có từ tồn đọng');
  const button = homeElement('button', 'hw-outline-btn', 'Học thêm từ mới');
  button.type = 'button';
  button.addEventListener('click', quickStartLearning);
  state.append(copy, button);
  return state;
}

// Examples mark the target word with <u>; keep that emphasis without trusting the markup.
function homeRichText(node, html) {
  String(html || '').split(/(<u>.*?<\/u>)/).forEach(part => {
    if (!part) return;
    const match = part.match(/^<u>(.*)<\/u>$/);
    const text = (match ? match[1] : part).replace(/<[^>]*>/g, '');
    node.appendChild(match ? homeElement('u', '', text) : document.createTextNode(text));
  });
  return node;
}

function homeHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function homeShortLevelLabel(level) {
  if (LEVELS_HSK30[level]) return 'HSK ' + level.replace('hsk30_', '') + ' (3.0)';
  return LEVELS[level].label;
}

function isHomeLearningCard(card) {
  return card && (card.state === SRS.State.Learning || card.state === SRS.State.Relearning);
}

// One pass over localStorage per refresh; every widget reads from this snapshot.
function collectHomeSnapshot(now) {
  const cardsByLevel = {};
  let legacyUnknown = 0;
  const heatmapStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - HOME_HEATMAP_WEEKS * 7 - 7);
  const reviewsByDay = {};

  homeLevelKeys().forEach(level => {
    const record = readSrsRecord(level);
    if (record) {
      cardsByLevel[level] = record.cards;
    } else {
      legacyUnknown += Object.values(readSavedLevelProgressLegacy(level)).filter(status => status === 'unknown').length;
    }
    readSrsReviewLog(level).forEach(entry => {
      const timestamp = new Date(entry && entry.timestamp);
      if (!Number.isFinite(timestamp.getTime()) || timestamp < heatmapStart) return;
      const key = localDateKey(timestamp);
      reviewsByDay[key] = (reviewsByDay[key] || 0) + 1;
    });
  });

  return { now, cardsByLevel, legacyUnknown, reviewsByDay, activity: readStudyActivity() };
}

// ---- Từ của ngày -------------------------------------------------------------

async function pickWordOfDay(snapshot, forceRefresh = false) {
  const today = localDateKey(snapshot.now);
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(HOME_WORD_OF_DAY_KEY)); } catch (e) {}
  if (!forceRefresh && saved && saved.date === today && LEVELS[saved.level] && LEVELS[saved.level].available) {
    const words = await loadHomeVocab(saved.level);
    const word = words.find(item => item.id === saved.wordId);
    if (word) return { level: saved.level, word };
  }

  const target = learningProgressSummary().target;
  if (!target) return null;
  const level = target.level;
  const words = await loadHomeVocab(level);
  if (!words.length) return null;
  const cards = snapshot.cardsByLevel[level];
  const legacy = cards ? null : readSavedLevelProgressLegacy(level);
  const unseen = words.filter(word => legacy
    ? !legacy[word.id]
    : !cards[word.id] || cards[word.id].state === SRS.State.New);
  const learning = words.filter(word => legacy
    ? legacy[word.id] === 'unknown'
    : isHomeLearningCard(cards[word.id]));
  const pool = forceRefresh ? words : unseen.length ? unseen : learning.length ? learning : words;
  const candidates = forceRefresh && saved && saved.level === level
    ? pool.filter(candidate => candidate.id !== saved.wordId)
    : pool;
  const source = candidates.length ? candidates : pool;
  const word = forceRefresh
    ? source[Math.floor(Math.random() * source.length)]
    : source[homeHash(today + '|' + level) % source.length];
  try {
    localStorage.setItem(HOME_WORD_OF_DAY_KEY, JSON.stringify({ date: today, level, wordId: word.id }));
  } catch (e) {}
  return { level, word };
}

async function renderWordOfDay(snapshot, renderId, forceRefresh = false) {
  const section = document.getElementById('hwWordOfDay');
  if (!section) return;
  if (!section.childElementCount) {
    section.appendChild(homeElement('p', 'hw-empty', 'Đang chọn từ của ngày...'));
  }

  let pick;
  try {
    pick = await pickWordOfDay(snapshot, forceRefresh);
  } catch (e) {
    pick = undefined;
  }
  if (renderId !== homeWidgetsRenderId) return;
  section.replaceChildren();

  const head = homeElement('div', 'hw-head');
  head.appendChild(homeElement('h2', 'hw-eyebrow', 'Từ của ngày'));
  const refresh = homeElement('button', 'hw-refresh-btn');
  refresh.type = 'button';
  refresh.setAttribute('aria-label', 'Đổi từ của ngày');
  refresh.title = 'Đổi từ khác';
  refresh.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/></svg>';
  refresh.addEventListener('click', () => renderWordOfDay(collectHomeSnapshot(new Date()), homeWidgetsRenderId, true));
  head.appendChild(refresh);
  section.appendChild(head);
  if (!pick) {
    section.appendChild(homeEmptyState(pick === null ? 'Chưa có từ nào để gợi ý.' : 'Không tải được từ của ngày. Kiểm tra kết nối rồi thử lại.'));
    return;
  }

  const { level, word } = pick;
  head.appendChild(homeElement('span', 'hw-pill', homeShortLevelLabel(level)));

  const main = homeElement('div', 'hw-wotd-main');
  const hanzi = homeElement('div', 'hw-wotd-hanzi hw-cjk', word.hanzi);
  hanzi.lang = 'zh-CN';
  const hanziLength = Array.from(word.hanzi).length;
  if (hanziLength > 4) hanzi.classList.add('is-long');
  else if (hanziLength > 2) hanzi.classList.add('is-medium');
  const text = homeElement('div', 'hw-wotd-text');
  text.appendChild(homeElement('div', 'hw-wotd-pinyin', word.pinyin));
  text.appendChild(homeElement('div', 'hw-wotd-meaning', word.meaning));
  main.append(hanzi, text);
  section.appendChild(main);

  if (word.example_zh) {
    const example = homeElement('div', 'hw-example');
    const zh = homeRichText(homeElement('p', 'hw-example-zh hw-cjk'), word.example_zh);
    zh.lang = 'zh-CN';
    example.appendChild(zh);
    if (word.example_vi) example.appendChild(homeRichText(homeElement('p', 'hw-example-vi'), word.example_vi));
    section.appendChild(example);
  }

  const actions = homeElement('div', 'hw-actions');
  const speak = homeElement('button', 'hw-icon-btn speech-btn');
  speak.type = 'button';
  speak.setAttribute('aria-label', 'Nghe phát âm');
  speak.innerHTML = HOME_SPEAKER_ICON;
  speak.addEventListener('click', () => speakText(word.hanzi, speak, SPEECH_RATE));
  const learn = homeElement('button', 'hw-primary-btn', 'Học từ này');
  learn.type = 'button';
  learn.addEventListener('click', () => openWordInLevel(level, word.id));
  actions.append(speak, learn);
  section.appendChild(actions);
}

// ---- Lịch ôn 7 ngày tới ------------------------------------------------------

function buildReviewForecast(snapshot) {
  const todayKey = localDateKey(snapshot.now);
  const counts = new Array(7).fill(0);
  counts[0] += snapshot.legacyUnknown;
  let hasReviewedCards = snapshot.legacyUnknown > 0;

  Object.values(snapshot.cardsByLevel).forEach(cards => {
    Object.values(cards).forEach(card => {
      if (!card || card.state === SRS.State.New) return;
      hasReviewedCards = true;
      const due = new Date(card.due);
      if (!Number.isFinite(due.getTime())) return;
      const offset = calendarDayDifference(todayKey, localDateKey(due));
      if (offset === null || offset >= 7) return;
      counts[Math.max(0, offset)]++;
    });
  });

  const days = counts.map((count, offset) => {
    const date = new Date(snapshot.now.getFullYear(), snapshot.now.getMonth(), snapshot.now.getDate() + offset);
    return {
      count,
      label: offset === 0 ? 'Nay' : HOME_WEEKDAY_SHORT[date.getDay()],
      longLabel: offset === 0 ? 'Hôm nay' : HOME_WEEKDAY_LONG[date.getDay()],
    };
  });
  return { days, total: counts.reduce((sum, count) => sum + count, 0), hasReviewedCards };
}

function renderReviewForecast(snapshot) {
  const section = document.getElementById('hwForecast');
  if (!section) return;
  const forecast = buildReviewForecast(snapshot);
  section.replaceChildren();

  if (!forecast.hasReviewedCards) {
    section.appendChild(homeCardHead('Lịch ôn 7 ngày tới'));
    section.appendChild(homeEmptyState('Bắt đầu ôn để xem lịch.'));
    return;
  }

  section.appendChild(homeCardHead('Lịch ôn 7 ngày tới', forecast.total + ' thẻ'));
  const peak = forecast.days.reduce((best, day) => day.count > best.count ? day : best, forecast.days[0]);
  section.appendChild(homeElement('p', 'hw-sub', peak.count > 0
    ? 'Cao điểm: ' + peak.longLabel + ' · ' + peak.count + ' thẻ'
    : 'Không có thẻ đến hạn trong 7 ngày tới'));

  const max = Math.max(1, peak.count);
  const chart = homeElement('div', 'hw-bars');
  chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', 'Số thẻ đến hạn: ' + forecast.days.map(day => day.longLabel + ' ' + day.count).join(', '));
  forecast.days.forEach((day, index) => {
    const column = homeElement('div', 'hw-bar-col' + (index === 0 ? ' is-today' : ''));
    column.setAttribute('aria-hidden', 'true');
    column.appendChild(homeElement('span', 'hw-bar-value', String(day.count)));
    const bar = homeElement('span', 'hw-bar');
    bar.style.height = Math.max(6, Math.round(day.count / max * HOME_FORECAST_BAR_HEIGHT)) + 'px';
    column.appendChild(bar);
    column.appendChild(homeElement('span', 'hw-bar-label', day.label));
    chart.appendChild(column);
  });
  section.appendChild(chart);
}

// ---- Hoạt động (12 tuần) -----------------------------------------------------

function homeActivityCount(snapshot, key) {
  const reviews = snapshot.reviewsByDay[key] || 0;
  return reviews > 0 ? reviews : dayWordCount(snapshot.activity.days[key]);
}

function homeHeatLevel(count, max) {
  if (count <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil(count / max * 4)));
}

function renderActivity(snapshot) {
  const section = document.getElementById('hwActivity');
  if (!section) return;
  const stats = streakStats(snapshot.activity.days);
  section.replaceChildren();
  section.appendChild(homeCardHead('Hoạt động', HOME_HEATMAP_WEEKS + ' tuần gần nhất'));

  const statRow = homeElement('div', 'hw-stats');
  [[stats.current, 'Chuỗi hiện tại'], [stats.longest, 'Chuỗi dài nhất']].forEach(([value, label]) => {
    const box = homeElement('div', 'hw-stat');
    box.appendChild(homeElement('strong', '', value + ' ngày'));
    box.appendChild(homeElement('span', '', label));
    statRow.appendChild(box);
  });
  section.appendChild(statRow);

  // Columns are Monday-first weeks; the last column is the current week.
  const today = new Date(snapshot.now.getFullYear(), snapshot.now.getMonth(), snapshot.now.getDate());
  const start = new Date(today);
  start.setDate(start.getDate() - mondayFirstIndex(today.getDay()) - (HOME_HEATMAP_WEEKS - 1) * 7);
  const cells = [];
  for (let i = 0; i < HOME_HEATMAP_WEEKS * 7; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const future = date > today;
    const key = localDateKey(date);
    cells.push({ date, future, count: future ? 0 : homeActivityCount(snapshot, key) });
  }
  const max = Math.max(1, ...cells.map(cell => cell.count));
  const activeDays = cells.filter(cell => cell.count > 0).length;

  const grid = homeElement('div', 'hw-heatmap');
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', 'Hoạt động ' + HOME_HEATMAP_WEEKS + ' tuần gần nhất: ' + activeDays + ' ngày có ôn tập');
  cells.forEach(cell => {
    const node = homeElement('span', 'hw-cell');
    if (cell.future) {
      node.classList.add('is-future');
      node.setAttribute('aria-hidden', 'true');
    } else {
      node.dataset.level = String(homeHeatLevel(cell.count, max));
      const label = String(cell.date.getDate()).padStart(2, '0') + '/' + String(cell.date.getMonth() + 1).padStart(2, '0')
        + ': ' + cell.count + ' lượt ôn';
      node.title = label;
      node.setAttribute('role', 'img');
      node.setAttribute('aria-label', label);
    }
    grid.appendChild(node);
  });
  section.appendChild(grid);

  const legend = homeElement('div', 'hw-legend');
  legend.setAttribute('aria-hidden', 'true');
  legend.appendChild(homeElement('span', '', 'Ít'));
  for (let level = 0; level <= 4; level++) {
    const swatch = homeElement('span', 'hw-cell');
    swatch.dataset.level = String(level);
    legend.appendChild(swatch);
  }
  legend.appendChild(homeElement('span', '', 'Nhiều'));
  section.appendChild(legend);
}

// ---- Từ hay quên -------------------------------------------------------------

function topForgottenCards(snapshot, limit = HOME_FORGOTTEN_LIMIT) {
  const items = [];
  homeLevelKeys().forEach(level => {
    if (!level.startsWith('hsk')) return;
    const cards = snapshot.cardsByLevel[level];
    if (cards) {
      Object.entries(cards).forEach(([id, card]) => {
        if (card && (card.lapses > 0 || card.last_rating === 'again' || card.state === SRS.State.Relearning || card.status === 'unknown')) {
          items.push({ level, id, card });
        }
      });
    } else {
      const legacy = readSavedLevelProgressLegacy(level);
      Object.entries(legacy).forEach(([id, status]) => {
        if (status === 'unknown') {
          items.push({
            level,
            id,
            card: { lapses: 1, last_rating: 'again', status: 'unknown' }
          });
        }
      });
    }
  });
  items.sort((a, b) => {
    const aLapses = a.card.lapses || (a.card.last_rating === 'again' ? 1 : 0);
    const bLapses = b.card.lapses || (b.card.last_rating === 'again' ? 1 : 0);
    return bLapses - aLapses
      || String(b.card.last_review || '').localeCompare(String(a.card.last_review || ''));
  });
  return items.slice(0, limit);
}

async function renderForgotten(snapshot, renderId) {
  const section = document.getElementById('hwForgotten');
  if (!section) return;
  const top = topForgottenCards(snapshot, HOME_FORGOTTEN_LIMIT);

  let items = [];
  let failed = false;
  if (top.length) {
    try {
      items = await Promise.all(top.map(async item => {
        const words = await loadHomeVocab(item.level);
        const word = words.find(candidate => String(candidate.id) === item.id);
        return word ? { ...item, word } : null;
      }));
      items = items.filter(Boolean);
    } catch (e) {
      failed = true;
    }
  }
  if (renderId !== homeWidgetsRenderId) return;

  section.replaceChildren();
  section.appendChild(homeCardHead('Từ cần ôn gấp', items.length ? 'Hay nhầm lẫn' : ''));
  if (failed) {
    section.appendChild(homeEmptyState('Không tải được danh sách từ. Kiểm tra kết nối rồi thử lại.'));
    return;
  }
  if (!items.length) {
    section.appendChild(homeForgottenEmptyState());
    return;
  }

  const list = homeElement('div', 'hw-forgot-list');
  items.forEach(item => {
    const row = homeElement('div', 'hw-forgot-row');
    const open = homeElement('button', 'hw-forgot-open');
    open.type = 'button';
    open.setAttribute('aria-label', 'Ôn ' + item.word.hanzi + ', ' + item.word.pinyin + ', ' + item.word.meaning);
    const hanzi = homeElement('span', 'hw-forgot-hanzi hw-cjk', item.word.hanzi);
    hanzi.lang = 'zh-CN';
    const text = homeElement('span', 'hw-forgot-text');
    const meta = homeElement('span', 'hw-forgot-meta');
    meta.appendChild(homeElement('span', 'hw-forgot-pinyin', item.word.pinyin));
    meta.appendChild(homeElement('span', 'hw-level-pill', homeShortLevelLabel(item.level)));
    meta.appendChild(homeElement('span', 'hw-lapse-pill', item.card.lapses + '×'));
    text.appendChild(meta);
    text.appendChild(homeElement('span', 'hw-forgot-meaning', item.word.meaning));
    open.append(hanzi, text);
    open.addEventListener('click', () => openWordInLevel(item.level, item.word.id));
    const speak = homeElement('button', 'hw-review-speak hw-icon-btn');
    speak.type = 'button';
    speak.setAttribute('aria-label', 'Nghe ' + item.word.hanzi);
    speak.innerHTML = HOME_SPEAKER_ICON;
    speak.addEventListener('click', () => speakText(item.word.hanzi, speak, SPEECH_RATE));
    row.append(open, speak);
    list.appendChild(row);
  });
  section.appendChild(list);

  const review = homeElement('button', 'hw-primary-btn', '⚡ Ôn tập ngay (' + items.length + ' từ)');
  review.type = 'button';
  review.addEventListener('click', () => openForgottenReview(items));
  section.appendChild(review);
  if (typeof updateReviewMobileAuxBadge === 'function') updateReviewMobileAuxBadge();
}

function openForgottenReview(items) {
  openReviewQueue('Ôn nhanh từ hay quên', async () => items.map(item => {
    const record = readSrsRecord(item.level);
    const card = (record && record.cards[item.id]) || item.card;
    return { level: item.level, word: item.word, card, due: new Date(card.due).getTime() };
  }), 'Đã ôn xong các từ hay quên.');
}

// ---- Navigation --------------------------------------------------------------

async function openWordInLevel(level, wordId) {
  if (typeof window.openWordInLevel === 'function' && window.openWordInLevel !== openWordInLevel) {
    return window.openWordInLevel(level, wordId, true);
  }
  if (typeof primaryTab !== 'undefined' && primaryTab !== 'vocab') setPrimaryTab('vocab');
  window.scrollTo(0, 0);
  await selectLevel(level);
  if (currentLevel !== level || !WORDS.length) return;
  const wordIndex = WORDS.findIndex(word => word.id === wordId);
  if (wordIndex < 0) return;
  currentFilter = 'all';
  filteredOrder = order.slice();
  const position = filteredOrder.indexOf(wordIndex);
  idx = position >= 0 ? position : 0;
  renderFilters();
  render();
}

// ---- Lifecycle ---------------------------------------------------------------

function isHomeScreen() {
  const hub = document.getElementById('screenVocabHub');
  const todayReviews = document.getElementById('screenTodayReviews');
  return !currentLevel
    && Boolean(hub) && hub.style.display !== 'none'
    && (!todayReviews || todayReviews.style.display === 'none');
}

function renderDiscovery() {
  const section = document.getElementById('hwDiscovery');
  if (!section) return;
  section.replaceChildren();
  section.appendChild(homeCardHead('Khám phá nâng cao', 'Tính năng mới'));

  const list = homeElement('div', 'hw-discovery-list');

  // Graded Reading
  const gradedItem = homeElement('div', 'hw-discovery-item');
  gradedItem.setAttribute('role', 'button');
  gradedItem.setAttribute('tabindex', '0');
  gradedItem.setAttribute('aria-label', 'Mở Graded Reading HSK 1–9 · 汉字思维');
  gradedItem.innerHTML = `
    <span class="hw-discovery-icon" aria-hidden="true">📚</span>
    <div class="hw-discovery-info">
      <div class="hw-discovery-title-row">
        <strong>Graded Reading</strong>
        <span class="hw-discovery-pill hw-pill-amber">HSK 1–9</span>
      </div>
      <p class="hw-discovery-desc">Đọc hiểu phân cấp ngữ cảnh · Vòng lặp SRS</p>
    </div>
    <span class="hw-discovery-cta" aria-hidden="true">→</span>
  `;
  const launchGraded = () => { if (typeof setPrimaryTab === 'function') setPrimaryTab('gradedReading'); };
  gradedItem.addEventListener('click', launchGraded);
  gradedItem.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launchGraded(); } });

  // Reading Analysis HSK 4
  const readingItem = homeElement('div', 'hw-discovery-item');
  readingItem.setAttribute('role', 'button');
  readingItem.setAttribute('tabindex', '0');
  readingItem.setAttribute('aria-label', 'Mở Đọc hiểu & Phân tích ngữ pháp HSK 4');
  readingItem.innerHTML = `
    <span class="hw-discovery-icon" aria-hidden="true">📖</span>
    <div class="hw-discovery-info">
      <div class="hw-discovery-title-row">
        <strong>Đọc hiểu HSK 4</strong>
        <span class="hw-discovery-pill hw-pill-accent">Hanban</span>
      </div>
      <p class="hw-discovery-desc">Xếp câu, ngữ cảnh thực tế & ngữ pháp</p>
    </div>
    <span class="hw-discovery-cta" aria-hidden="true">→</span>
  `;
  const launchReading = () => { if (typeof setPrimaryTab === 'function') setPrimaryTab('reading'); };
  readingItem.addEventListener('click', launchReading);
  readingItem.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launchReading(); } });

  list.appendChild(gradedItem);
  list.appendChild(readingItem);
  section.appendChild(list);
}

function refreshHomeWidgets() {
  homeWidgetsDirty = false;
  const renderId = ++homeWidgetsRenderId;
  const snapshot = collectHomeSnapshot(new Date());
  renderReviewForecast(snapshot);
  renderActivity(snapshot);
  renderWordOfDay(snapshot, renderId);
  renderForgotten(snapshot, renderId);
  renderDiscovery();
}

// Deferred one frame so callers that change screens right after (selectLevel, openTodayReviews)
// are settled before we decide whether home is showing.
function syncHomeScreen() {
  if (homeWidgetsSyncFrame) return;
  homeWidgetsSyncFrame = requestAnimationFrame(() => {
    homeWidgetsSyncFrame = 0;
    const home = isHomeScreen();
    document.body.classList.toggle('home-screen', home);
    if (home && homeWidgetsDirty) refreshHomeWidgets();
  });
}

function invalidateHomeWidgets() {
  homeWidgetsDirty = true;
  syncHomeScreen();
}

function placeHomeWidgets(container, isDesktop) {
  const statsContent = document.getElementById('dashboardStatsContent');
  if (statsContent) {
    statsContent.appendChild(container);
    return;
  }
  const target = isDesktop
    ? document.getElementById('workstationRight')
    : document.getElementById('screenVocabHub');
  if (!target) return;
  if (isDesktop) target.prepend(container);
  else target.appendChild(container);
}

function initHomeWidgets() {
  const container = homeElement('div', 'home-widgets');
  container.id = 'homeWidgets';
  [
    ['hwWordOfDay', 'hw-wotd'],
    ['hwForecast', 'hw-forecast'],
    ['hwActivity', 'hw-activity'],
    ['hwForgotten', 'hw-forgotten'],
    ['hwDiscovery', 'hw-discovery'],
  ].forEach(([id, className]) => {
    const section = homeElement('section', 'hw-card ' + className);
    section.id = id;
    container.appendChild(section);
  });

  const desktopQuery = window.matchMedia('(min-width: 1280px)');
  placeHomeWidgets(container, desktopQuery.matches);
  desktopQuery.addEventListener('change', event => placeHomeWidgets(container, event.matches));

  onActiveWordChange(syncHomeScreen);
  invalidateHomeWidgets();
}

document.addEventListener('DOMContentLoaded', initHomeWidgets);
