// Level picker, welcome message, study streaks, history modal, and level data loading.
// Preact island/module port of former assets/js/levels.js.

/* global LEVELS, currentLevel, currentView, overviewQuery, overviewStatus, pickerVersion,
   order, progress, showPinyin, currentFilter, idx, WORDS, filteredOrder, transitionTimer,
   celebrationShown, SpaRouter, readSrsRecord, readSavedLevelProgressLegacy, progressFromCards,
   countDueCardsAcrossLevels, fetchLevelWords, loadState, buildCardArea, renderFilters,
   showAllWordsAt, render, flip, preloadDeckIllustrations, loadLevelIllustrationPack,
   loadPrebuiltAudioManifest, setActiveStudyWord, setPrimaryTab, setVocabSubTab,
   renderHsk30Grid, renderDashboardEnhancements, closeAllStudyDrawers, renderStudyWordList,
   preloadSingleWordIllustration */

export function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calendarDayDifference(fromKey, toKey) {
  const from = String(fromKey).split('-').map(Number);
  const to = String(toKey).split('-').map(Number);
  if (from.length !== 3 || to.length !== 3 || from.some(Number.isNaN) || to.some(Number.isNaN)) return null;
  const fromDate = new Date(from[0], from[1] - 1, from[2], 12);
  const toDate = new Date(to[0], to[1] - 1, to[2], 12);
  return Math.round((toDate - fromDate) / 86400000);
}

export function hasSavedProgress() {
  const levels = typeof LEVELS !== 'undefined' ? LEVELS : window.LEVELS;
  if (!levels) return false;
  return Object.keys(levels).some(level => {
    try {
      const srs = typeof readSrsRecord === 'function' ? readSrsRecord(level) : (window.readSrsRecord && window.readSrsRecord(level));
      if (srs && Object.keys(srs.cards).length > 0) return true;
      const legacy = typeof readSavedLevelProgressLegacy === 'function' ? readSavedLevelProgressLegacy(level) : (window.readSavedLevelProgressLegacy && window.readSavedLevelProgressLegacy(level));
      return legacy && Object.keys(legacy).length > 0;
    } catch (e) {
      return false;
    }
  });
}

export const DEFAULT_DAILY_STUDY_GOAL = 10;
export const DAILY_STUDY_GOAL_OPTIONS = [10, 20, 30, 50];
export const DAILY_STUDY_GOAL_KEY = 'hsk_daily_study_goal_v1';
export const STUDY_ACTIVITY_KEY = 'hsk_study_activity_v1';
export const LAST_LEVEL_KEY = 'hsk_last_level_v1';

export function readSavedLevelProgress(level) {
  const srs = typeof readSrsRecord === 'function' ? readSrsRecord(level) : (window.readSrsRecord && window.readSrsRecord(level));
  if (srs) {
    return typeof progressFromCards === 'function' ? progressFromCards(srs.cards) : (window.progressFromCards && window.progressFromCards(srs.cards));
  }
  return typeof readSavedLevelProgressLegacy === 'function' ? readSavedLevelProgressLegacy(level) : (window.readSavedLevelProgressLegacy && window.readSavedLevelProgressLegacy(level));
}

export function readStudyActivity() {
  let activity = { days: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem(STUDY_ACTIVITY_KEY));
    if (parsed && parsed.days && typeof parsed.days === 'object') activity = parsed;
  } catch (e) {}

  Object.keys(activity.days).forEach(dateKey => {
    if (Array.isArray(activity.days[dateKey])) {
      activity.days[dateKey] = { words: activity.days[dateKey], seconds: 0 };
    }
  });
  return activity;
}

export function dayWordCount(dayEntry) {
  return dayEntry && Array.isArray(dayEntry.words) ? dayEntry.words.length : 0;
}

export function daySeconds(dayEntry) {
  return dayEntry && typeof dayEntry.seconds === 'number' ? dayEntry.seconds : 0;
}

export function formatStudyDuration(totalMinutes) {
  const minutes = Math.round(totalMinutes);
  if (minutes <= 0) return '0 phút';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} phút`;
  if (remainder === 0) return `${hours} giờ`;
  return `${hours} giờ ${remainder} phút`;
}

export function readDailyStudyGoal() {
  try {
    const savedGoal = Number(localStorage.getItem(DAILY_STUDY_GOAL_KEY));
    if (DAILY_STUDY_GOAL_OPTIONS.includes(savedGoal)) return savedGoal;
  } catch (e) {}
  return DEFAULT_DAILY_STUDY_GOAL;
}

export function updateDailyStudyGoal(value) {
  const nextGoal = Number(value);
  if (!DAILY_STUDY_GOAL_OPTIONS.includes(nextGoal)) {
    renderLearningDashboard();
    return;
  }
  try { localStorage.setItem(DAILY_STUDY_GOAL_KEY, String(nextGoal)); } catch (e) {}
  renderLearningDashboard();
}

export function focusDailyGoalSelector() {
  const select = document.getElementById('dailyGoalSelect');
  if (!select) return;
  select.focus();
  if (typeof select.showPicker === 'function') {
    try { select.showPicker(); } catch (e) {}
  }
}

export function studyStreak(days) {
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  const today = localDateKey(cursor);

  if (dayWordCount(days[today]) === 0) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (streak < 3650) {
    const key = localDateKey(cursor);
    if (dayWordCount(days[key]) === 0) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function streakStats(days) {
  const studiedKeys = Object.keys(days)
    .filter(key => dayWordCount(days[key]) > 0)
    .sort();

  if (studiedKeys.length === 0) {
    return { current: 0, longest: 0, shortest: 0, totalDaysStudied: 0 };
  }

  const runs = [];
  let runLength = 1;
  for (let i = 1; i < studiedKeys.length; i++) {
    const gap = calendarDayDifference(studiedKeys[i - 1], studiedKeys[i]);
    if (gap === 1) {
      runLength++;
    } else {
      runs.push(runLength);
      runLength = 1;
    }
  }
  runs.push(runLength);

  const current = studyStreak(days);
  const completedRuns = current > 0 ? runs.slice(0, -1) : runs.slice();
  const shortestSource = completedRuns.length > 0 ? completedRuns : runs;

  return {
    current,
    longest: Math.max(...runs),
    shortest: Math.min(...shortestSource),
    totalDaysStudied: studiedKeys.length,
  };
}

export function intensityBucket(minutes) {
  if (minutes <= 0) return 0;
  if (minutes <= 10) return 1;
  if (minutes <= 30) return 2;
  if (minutes <= 60) return 3;
  return 4;
}

export function mondayFirstIndex(jsDay) {
  return (jsDay + 6) % 7;
}

export function buildMonthGrid(days, year, month) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayKey = localDateKey(now);

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = mondayFirstIndex(firstOfMonth.getDay());

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ dateKey: null, day: null, minutes: 0, bucket: 0, studied: false, isToday: false, isFuture: false, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d, 12, 0, 0, 0);
    const key = localDateKey(date);
    const minutes = daySeconds(days[key]) / 60;
    const dateOnly = new Date(year, month, d);
    dateOnly.setHours(0, 0, 0, 0);
    cells.push({
      dateKey: key,
      day: d,
      minutes,
      bucket: intensityBucket(minutes),
      studied: dayWordCount(days[key]) > 0,
      isToday: key === todayKey,
      isFuture: dateOnly > now,
      inMonth: true,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: null, day: null, minutes: 0, bucket: 0, studied: false, isToday: false, isFuture: false, inMonth: false });
  }
  return cells;
}

export function yearSummary(days, year) {
  let studiedDays = 0;
  let totalMinutes = 0;
  Object.keys(days).forEach(key => {
    if (!key.startsWith(String(year) + '-')) return;
    const entry = days[key];
    if (dayWordCount(entry) > 0) studiedDays++;
    totalMinutes += daySeconds(entry) / 60;
  });
  return { studiedDays, totalMinutes };
}

let historyModalView = 'month';
let historyModalCursor = { year: 0, month: 0 };

export function setHistoryView(view) {
  historyModalView = view;
  renderHistoryModalBody();
}

export function changeHistoryCursor(delta) {
  const now = new Date();
  if (historyModalView === 'month') {
    const next = new Date(historyModalCursor.year, historyModalCursor.month + delta, 1);
    if (next.getFullYear() > now.getFullYear() || (next.getFullYear() === now.getFullYear() && next.getMonth() > now.getMonth())) return;
    historyModalCursor = { year: next.getFullYear(), month: next.getMonth() };
  } else {
    const nextYear = historyModalCursor.year + delta;
    if (nextYear > now.getFullYear()) return;
    historyModalCursor = { year: nextYear, month: historyModalCursor.month };
  }
  renderHistoryModalBody();
}

export function jumpToMonth(year, month) {
  historyModalView = 'month';
  historyModalCursor = { year, month };
  renderHistoryModalBody();
}

export const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function renderMonthGridHtml(grid) {
  return `
    <div class="history-weekday-row">
      ${WEEKDAY_LABELS.map(label => `<div class="history-weekday">${label}</div>`).join('')}
    </div>
    <div class="history-month-grid">
      ${grid.map(cell => {
        if (!cell.inMonth) return '<div class="history-day-cell empty" aria-hidden="true"></div>';
        const [y, m, d] = cell.dateKey.split('-');
        const displayDate = `${d}/${m}/${y}`;
        const displayBucket = Math.max(cell.bucket, cell.studied ? 1 : 0);
        const classes = ['history-day-cell', `bucket-${displayBucket}`];
        if (cell.isToday) classes.push('today');
        if (cell.isFuture) classes.push('future');
        const title = cell.isFuture ? '' : `title="${displayDate}\nĐã học: ${Math.round(cell.minutes)} phút"`;
        return `<div class="${classes.join(' ')}" ${title}>${cell.day}</div>`;
      }).join('')}
    </div>`;
}

// Summary line + "Ít … Nhiều" intensity legend shown under the month and year views.
export function historyFooterHtml(studiedDays, totalMinutes) {
  const swatches = [0, 1, 2, 3, 4].map(b => `<span class="history-legend-swatch bucket-${b}"></span>`).join('');
  return `<div class="history-footer">
      <div class="history-summary">${studiedDays} ngày học · ${formatStudyDuration(totalMinutes)}</div>
      <div class="history-legend"><span>Ít</span>${swatches}<span>Nhiều</span></div>
    </div>`;
}

export function renderMonthView(activity) {
  const { year, month } = historyModalCursor;
  const grid = buildMonthGrid(activity.days, year, month);
  const studiedDays = grid.filter(c => c.inMonth && c.studied).length;
  const totalMinutes = grid.filter(c => c.inMonth).reduce((sum, c) => sum + c.minutes, 0);

  return `
    ${renderMonthGridHtml(grid)}
    ${historyFooterHtml(studiedDays, totalMinutes)}`;
}

export const MINI_MONTH_LABELS = ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'];

export function renderYearView(activity) {
  const { year } = historyModalCursor;
  const summary = yearSummary(activity.days, year);

  const months = Array.from({ length: 12 }, (_, month) => {
    const grid = buildMonthGrid(activity.days, year, month);
    return `
      <div class="history-mini-month" role="button" tabindex="0"
        onclick="jumpToMonth(${year}, ${month})"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();jumpToMonth(${year}, ${month});}">
        <div class="history-mini-month-label">${MINI_MONTH_LABELS[month]}</div>
        <div class="history-mini-grid">
          ${grid.map(cell => `<div class="history-mini-cell ${cell.inMonth ? 'bucket-' + cell.bucket : 'empty'} ${cell.isToday ? 'today' : ''}"></div>`).join('')}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="history-year-grid">${months}</div>
    ${historyFooterHtml(summary.studiedDays, summary.totalMinutes)}`;
}

export function renderHistoryModalBody() {
  const body = document.getElementById('historyModalBody');
  if (!body) return;

  const activity = readStudyActivity();
  const stats = streakStats(activity.days);
  const totalMinutesAllTime = Object.values(activity.days).reduce((sum, entry) => sum + daySeconds(entry) / 60, 0);

  const now = new Date();
  const isMonth = historyModalView === 'month';
  const isCurrentMonth = historyModalCursor.year === now.getFullYear() && historyModalCursor.month === now.getMonth();
  const isCurrentYear = historyModalCursor.year === now.getFullYear();

  const navHtml = isMonth ? `
    <div class="history-month-nav">
      <button class="history-month-btn" type="button" onclick="changeHistoryCursor(-1)" aria-label="Tháng trước">‹</button>
      <div class="history-month-title">Tháng ${historyModalCursor.month + 1} · ${historyModalCursor.year}</div>
      <button class="history-month-btn" type="button" onclick="changeHistoryCursor(1)" ${isCurrentMonth ? 'disabled' : ''} aria-label="Tháng sau">›</button>
    </div>` : `
    <div class="history-month-nav">
      <button class="history-month-btn" type="button" onclick="changeHistoryCursor(-1)" aria-label="Năm trước">‹</button>
      <div class="history-month-title">${historyModalCursor.year}</div>
      <button class="history-month-btn" type="button" onclick="changeHistoryCursor(1)" ${isCurrentYear ? 'disabled' : ''} aria-label="Năm sau">›</button>
    </div>`;

  body.innerHTML = `
    <div class="history-kpi-row">
      <div class="history-kpi"><strong>🔥 ${stats.current}</strong><span>Chuỗi hiện tại</span></div>
      <div class="history-kpi"><strong>🏆 ${stats.longest}</strong><span>Chuỗi dài nhất</span></div>
      <div class="history-kpi"><strong>📅 ${stats.totalDaysStudied}</strong><span>Ngày đã học</span></div>
      <div class="history-kpi"><strong>⏱ ${formatStudyDuration(totalMinutesAllTime)}</strong><span>Tổng thời gian</span></div>
    </div>
    <div class="history-toolbar">
      <div class="history-view-switcher" role="tablist">
        <button type="button" role="tab" class="history-view-btn ${isMonth ? 'active' : ''}" aria-selected="${isMonth}" onclick="setHistoryView('month')">Tháng</button>
        <button type="button" role="tab" class="history-view-btn ${!isMonth ? 'active' : ''}" aria-selected="${!isMonth}" onclick="setHistoryView('year')">Năm</button>
      </div>
      ${navHtml}
    </div>
    <div class="history-view-body">
      ${isMonth ? renderMonthView(activity) : renderYearView(activity)}
    </div>`;
}

export function closeHistoryModal() {
  const overlay = document.getElementById('historyOverlay');
  if (overlay) overlay.remove();
  delete document.body.dataset.historyModalOpen;
  document.removeEventListener('keydown', handleHistoryModalKeydown);
}

export function handleHistoryModalKeydown(e) {
  if (e.key === 'Escape') closeHistoryModal();
}

export function showHistoryModal() {
  const now = new Date();
  historyModalView = 'month';
  historyModalCursor = { year: now.getFullYear(), month: now.getMonth() };

  const overlay = document.createElement('div');
  overlay.id = 'historyOverlay';
  overlay.className = 'history-overlay';
  overlay.innerHTML = `
    <div class="history-box" role="dialog" aria-modal="true" aria-label="Lịch sử học tập">
      <button class="history-close" onclick="closeHistoryModal()" aria-label="Đóng">✕</button>
      <div class="history-title">Lịch sử học tập</div>
      <div id="historyModalBody"></div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeHistoryModal(); });
  document.body.appendChild(overlay);
  document.addEventListener('keydown', handleHistoryModalKeydown);
  document.body.dataset.historyModalOpen = 'true';
  renderHistoryModalBody();
}

export function recordDailyStudy(wordId, level = (typeof currentLevel !== 'undefined' ? currentLevel : window.currentLevel)) {
  if (!level || wordId === undefined || wordId === null) return;

  const activity = readStudyActivity();
  const today = localDateKey(new Date());
  const dayEntry = activity.days[today] || { words: [], seconds: 0 };
  const learnedWords = new Set(dayEntry.words);
  learnedWords.add(level + ':' + String(wordId));
  activity.days[today] = { words: Array.from(learnedWords), seconds: dayEntry.seconds };

  try { localStorage.setItem(STUDY_ACTIVITY_KEY, JSON.stringify(activity)); } catch (e) {}
  renderLearningDashboard();
}

export const STUDY_HEARTBEAT_SECONDS = 15;

export function recordStudySeconds(deltaSeconds) {
  const activity = readStudyActivity();
  const today = localDateKey(new Date());
  const dayEntry = activity.days[today] || { words: [], seconds: 0 };
  activity.days[today] = { words: dayEntry.words, seconds: dayEntry.seconds + deltaSeconds };

  try { localStorage.setItem(STUDY_ACTIVITY_KEY, JSON.stringify(activity)); } catch (e) {}
}

export function startStudyHeartbeat() {
  setInterval(() => {
    if (document.visibilityState === 'visible') recordStudySeconds(STUDY_HEARTBEAT_SECONDS);
  }, STUDY_HEARTBEAT_SECONDS * 1000);
}

export function learningProgressSummary() {
  const levelsObj = typeof LEVELS !== 'undefined' ? LEVELS : window.LEVELS;
  if (!levelsObj) return { totalKnown: 0, totalStudied: 0, target: null };

  const levels = Object.keys(levelsObj).filter(level => levelsObj[level].available).map(level => {
    const saved = readSavedLevelProgress(level) || {};
    const statuses = Object.values(saved);
    return {
      level,
      known: statuses.filter(status => status === 'known').length,
      studied: statuses.filter(status => status === 'known' || status === 'unknown').length,
    };
  });

  let lastLevel = null;
  try { lastLevel = localStorage.getItem(LAST_LEVEL_KEY); } catch (e) {}

  let target = levels.find(item => item.level === lastLevel);
  if (target && target.known >= levelsObj[target.level].total) {
    const nextIndex = levels.findIndex(item => item.level === target.level) + 1;
    target = levels.slice(nextIndex).find(item => levelsObj[item.level].available) || target;
  }
  if (!target) {
    target = levels.find(item => item.studied > 0 && item.known < levelsObj[item.level].total)
      || levels.find(item => levelsObj[item.level].available);
  }

  return {
    totalKnown: levels.reduce((sum, item) => sum + item.known, 0),
    totalStudied: levels.reduce((sum, item) => sum + item.studied, 0),
    target,
  };
}

export function prefetchSuggestedLevel() {
  const summary = learningProgressSummary();
  const target = summary.target;
  const levelsObj = typeof LEVELS !== 'undefined' ? LEVELS : window.LEVELS;
  const config = target && levelsObj && levelsObj[target.level];
  if (!config || !config.dataUrl) return;
  const run = () => {
    fetch(config.dataUrl).catch(() => {});
    if (config.audioManifestUrl) fetch(config.audioManifestUrl).catch(() => {});
    if (typeof loadLevelIllustrationPack === 'function') loadLevelIllustrationPack(target.level).catch(() => {});
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}

export function renderLearningDashboard() {
  const dailyCount = document.getElementById('dailyStudyCount');
  const dailyFill = document.getElementById('dailyGoalFill');
  const dailyMessage = document.getElementById('dailyGoalMessage');
  const dailyGoalSelect = document.getElementById('dailyGoalSelect');
  const knownNode = document.getElementById('totalKnownCount');
  const studiedNode = document.getElementById('totalStudiedCount');
  const quickButton = document.getElementById('quickStudyButton');
  const dueCount = document.getElementById('todayDueCount');
  const todayReviewButton = document.getElementById('todayReviewButton');
  if (!dailyCount || !dailyFill || !dailyMessage) return;

  const activity = readStudyActivity();
  const today = localDateKey(new Date());
  const todayCount = dayWordCount(activity.days[today]);
  const dailyGoal = readDailyStudyGoal();
  const validGoal = dailyGoal > 0 ? dailyGoal : 50;
  const streak = studyStreak(activity.days);
  const summary = learningProgressSummary();
  const rawPercent = (todayCount / validGoal) * 100;
  const goalPercent = Math.max(0, Math.min(100, isNaN(rawPercent) ? 0 : rawPercent));
  const roundedPct = Math.round(goalPercent);

  dailyCount.textContent = todayCount;
  if (dailyGoalSelect) dailyGoalSelect.value = String(validGoal);
  dailyFill.style.width = goalPercent + '%';
  if (dailyFill.parentElement) {
    dailyFill.parentElement.setAttribute('aria-valuemax', String(validGoal));
    dailyFill.parentElement.setAttribute('aria-valuenow', String(Math.min(todayCount, validGoal)));
  }
  dailyMessage.textContent = todayCount >= validGoal
    ? 'Đã hoàn thành mục tiêu hôm nay — tuyệt lắm!'
    : 'Học thêm hôm nay để hoàn thành mục tiêu.';

  const goalPctNode = document.getElementById('dailyGoalPct');
  if (goalPctNode) {
    goalPctNode.textContent = `${roundedPct}%`;
    goalPctNode.classList.toggle('is-completed', roundedPct >= 100);
  }
  const targetTextNode = document.getElementById('dailyGoalTargetText');
  if (targetTextNode) {
    targetTextNode.textContent = String(validGoal);
  }

  const headerStreak = document.getElementById('headerStreakText');
  if (headerStreak) headerStreak.textContent = `${streak} ngày`;
  const bannerStreak = document.getElementById('bannerStreakText');
  if (bannerStreak) bannerStreak.textContent = `${streak} ngày`;
  const bannerStreakBadge = document.getElementById('bannerStreakBadge');
  if (bannerStreakBadge) {
    bannerStreakBadge.classList.toggle('has-streak', streak > 0);
  }
  if (knownNode) knownNode.textContent = summary.totalKnown;
  if (studiedNode) studiedNode.textContent = summary.totalStudied;
  const dueTotal = typeof countDueCardsAcrossLevels === 'function' ? countDueCardsAcrossLevels(new Date()) : (window.countDueCardsAcrossLevels ? window.countDueCardsAcrossLevels(new Date()) : 0);
  if (dueCount) dueCount.textContent = String(dueTotal);
  if (todayReviewButton) todayReviewButton.hidden = dueTotal === 0;

  const target = summary.target;
  const levelsObj = typeof LEVELS !== 'undefined' ? LEVELS : window.LEVELS;
  if (target && quickButton && levelsObj && levelsObj[target.level]) {
    const complete = target.known >= levelsObj[target.level].total;
    quickButton.dataset.level = target.level;
    quickButton.innerHTML = `${complete ? 'Ôn lại' : target.studied > 0 ? 'Tiếp tục' : 'Bắt đầu'} ${levelsObj[target.level].label} <span aria-hidden="true">→</span>`;
  }
  if (typeof renderDashboardEnhancements === 'function') renderDashboardEnhancements();
  else if (typeof window.renderDashboardEnhancements === 'function') window.renderDashboardEnhancements();
  invalidateHomeWidgets();
}

if (typeof window !== 'undefined' && typeof window.homeWidgetsDirty === 'undefined') {
  window.homeWidgetsDirty = true;
}
let homeWidgetsSyncFrame = 0;

export function isHomeScreen() {
  const hub = document.getElementById('screenVocabHub');
  const todayReviews = document.getElementById('screenTodayReviews');
  const curLevel = typeof currentLevel !== 'undefined' ? currentLevel : window.currentLevel;
  return !curLevel
    && Boolean(hub) && hub.style.display !== 'none'
    && (!todayReviews || todayReviews.style.display === 'none');
}

export function syncHomeScreen() {
  if (homeWidgetsSyncFrame) return;
  homeWidgetsSyncFrame = requestAnimationFrame(() => {
    homeWidgetsSyncFrame = 0;
    const home = isHomeScreen();
    document.body.classList.toggle('home-screen', home);
    if (home && window.homeWidgetsDirty && typeof window.refreshHomeWidgets === 'function') window.refreshHomeWidgets();
  });
}

export function invalidateHomeWidgets() {
  window.homeWidgetsDirty = true;
  syncHomeScreen();
}

export function quickStartLearning() {
  const button = document.getElementById('quickStudyButton');
  const continuation = document.getElementById('continueLearningCard');
  const level = (button && button.dataset.level) || (continuation && continuation.dataset.level) || 'hsk1';
  const levelsObj = typeof LEVELS !== 'undefined' ? LEVELS : window.LEVELS;
  if (level && levelsObj && levelsObj[level] && levelsObj[level].available) {
    selectLevel(level);
  }
}

export function timeGreeting(hour) {
  if (hour < 5) return 'Học giờ này là chăm chỉ hay chưa chịu ngủ vậy bạn? 👀';
  if (hour < 8) return 'Chim sẻ dậy sớm, từ vựng tự chui vào đầu 🐦';
  if (hour < 11) return 'Buổi sáng học vài từ, cả ngày thấy mình tri thức ☀️';
  if (hour < 14) return 'Ăn trưa nhớ ăn, học từ cũng nhớ học nha 🍜';
  if (hour < 17) return 'Buổi chiều hơi oải, nạp vài từ cho tỉnh táo nè ☕';
  if (hour < 21) return 'Tối rồi, hoàn thành nốt mục tiêu hôm nay nào 🎯';
  return 'Sắp hết ngày rồi, ôn nhẹ vài từ rồi đi ngủ thôi 🌙';
}

export function pickGreeting(candidates, previousGreeting) {
  if (!candidates || candidates.length === 0) return '';
  const filtered = candidates.filter(g => g !== previousGreeting);
  const pool = filtered.length > 0 ? filtered : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function showWelcomeToast() {
  const toast = document.getElementById('welcomeToast');
  if (!toast) return;

  const now = new Date();
  const hour = now.getHours();
  const timeBased = timeGreeting(hour);
  const activity = readStudyActivity();
  const streak = studyStreak(activity.days);

  const streakGreetings = [];
  if (streak >= 30) streakGreetings.push(`🔥 Chuỗi ${streak} ngày! Bạn đang biến việc học thành phản xạ tự nhiên rồi đó.`);
  else if (streak >= 14) streakGreetings.push(`🔥 2 tuần liên tiếp! Kỷ luật này xứng đáng nhận điểm 10.`);
  else if (streak >= 7) streakGreetings.push(`🔥 Tròn 1 tuần học liên tục! Đừng để chuỗi bị đứt nha.`);
  else if (streak >= 3) streakGreetings.push(`🔥 Chuỗi ${streak} ngày rồi đó, giữ vững phong độ nhé!`);

  const generalGreetings = [
    'Mỗi ngày một chút, tiếng Trung không khó như bạn nghĩ đâu ✨',
    'Chậm mà chắc, quan trọng là ngày nào cũng gặp nhau 🌿',
    'Não bộ thích sự lặp lại — hôm nay ôn gì nào? 🧠',
    'Tích tiểu thành đại, từ vựng hôm nay là tự tin ngày mai 🚀',
    'Học tiếng Trung kiểu khoa học: hiểu bản chất, nhớ dài lâu 💡',
  ];

  const candidates = [timeBased, ...streakGreetings, ...generalGreetings];
  const lastGreeting = sessionStorage.getItem('hsk_last_greeting');
  const greeting = pickGreeting(candidates, lastGreeting);
  sessionStorage.setItem('hsk_last_greeting', greeting);

  const quoteEl = toast.querySelector('.welcome-quote');
  if (quoteEl) quoteEl.textContent = greeting;

  const summary = learningProgressSummary();
  const progressText = toast.querySelector('.welcome-progress-text');
  if (progressText) {
    if (summary.totalStudied > 0) {
      progressText.textContent = `Bạn đã thuộc ${summary.totalKnown} từ trên tổng số ${summary.totalStudied} từ đã học.`;
    } else {
      progressText.textContent = 'Chọn một cấp độ bên dưới để bắt đầu bài học đầu tiên!';
    }
  }

  const dismissed = sessionStorage.getItem('hsk_welcome_dismissed');
  if (!dismissed) {
    toast.classList.add('show');
  }

  const closeBtn = toast.querySelector('.welcome-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      toast.classList.remove('show');
      sessionStorage.setItem('hsk_welcome_dismissed', 'true');
    };
  }
}

export function formatProgressPercent(known, total) {
  if (known === 0) return '0%';
  const raw = (known / total) * 100;
  if (raw > 0 && raw < 1) return '<1%';
  return Math.round(raw) + '%';
}

export function renderLevelProgress() {
  const levelsObj = typeof LEVELS !== 'undefined' ? LEVELS : window.LEVELS;
  if (!levelsObj) return;

  document.querySelectorAll('.level-card[data-level]').forEach(card => {
    const level = card.dataset.level;
    const cfg = levelsObj[level];
    if (!cfg || !cfg.available) return;

    const saved = readSavedLevelProgress(level) || {};
    const known = Object.values(saved).filter(s => s === 'known').length;
    const total = cfg.total;

    const fill = card.querySelector('.progress-fill');
    if (fill) fill.style.width = ((known / total) * 100) + '%';

    const text = card.querySelector('.progress-text');
    if (text) {
      text.textContent = `${known} / ${total} từ (${formatProgressPercent(known, total)})`;
    }
  });

  if (typeof renderTopicGrid === 'function') renderTopicGrid();
  else if (typeof window.renderTopicGrid === 'function') window.renderTopicGrid();
}

export function goBackToPicker() {
  const curLevel = typeof currentLevel !== 'undefined' ? currentLevel : window.currentLevel;
  const levelsObj = typeof LEVELS !== 'undefined' ? LEVELS : window.LEVELS;
  const wasTopic = curLevel && levelsObj && levelsObj[curLevel] && levelsObj[curLevel].isTopic;

  document.body.classList.remove('study-mode');
  document.body.classList.remove('flashcard-study-mode');
  document.documentElement.classList.remove('flashcard-study-mode');
  document.getElementById('screenCards').style.display = 'none';
  document.getElementById('screenPicker').style.display = '';
  document.getElementById('screenTopicPicker').style.display = '';
  const radicalCards = document.getElementById('screenRadicalCards');
  if (radicalCards) radicalCards.style.display = 'none';
  const radicalHub = document.getElementById('screenRadicalHub');
  if (radicalHub) radicalHub.style.display = 'none';
  const todayScreen = document.getElementById('screenTodayReviews');
  if (todayScreen) todayScreen.style.display = 'none';
  const vocabHub = document.getElementById('screenVocabHub');
  if (vocabHub) vocabHub.style.display = '';
  const auxCol = document.querySelector('.dashboard-aux-column');
  if (auxCol) auxCol.style.display = '';
  const continueCard = document.getElementById('continueLearningCard');
  if (continueCard) continueCard.style.display = '';
  document.getElementById('appTitle').textContent = '汉字思维';
  document.getElementById('primaryTabs').style.display = '';
  document.getElementById('pickerControls').style.display = '';

  if (typeof setPrimaryTab === 'function') setPrimaryTab('vocab');
  else if (typeof window.setPrimaryTab === 'function') window.setPrimaryTab('vocab');

  document.getElementById('learningDashboard').style.display = wasTopic ? 'none' : '';

  if (typeof setVocabSubTab === 'function') setVocabSubTab(wasTopic ? 'topic' : 'level');
  else if (typeof window.setVocabSubTab === 'function') window.setVocabSubTab(wasTopic ? 'topic' : 'level');

  window.currentLevel = null;
  /* eslint-disable no-global-assign */
  try { currentLevel = null; } catch (e) {}
  window.currentView = 'cards';
  try { currentView = 'cards'; } catch (e) {}
  window.overviewQuery = '';
  try { overviewQuery = ''; } catch (e) {}
  window.overviewStatus = 'all';
  try { overviewStatus = 'all'; } catch (e) {}

  const overlay = document.getElementById('celebrationOverlay');
  if (overlay) overlay.remove();

  renderLevelProgress();
  const pVersion = typeof pickerVersion !== 'undefined' ? pickerVersion : window.pickerVersion;
  if (pVersion === '3.0') {
    if (typeof renderHsk30Grid === 'function') renderHsk30Grid();
    else if (typeof window.renderHsk30Grid === 'function') window.renderHsk30Grid();
  }
  renderLearningDashboard();

  if (typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) {
    SpaRouter.pushView({ view: 'vocab' });
  }
}

export function findWordIndex(wordIdOrHanzi) {
  const words = typeof WORDS !== 'undefined' ? WORDS : window.WORDS;
  if (!Array.isArray(words)) return -1;
  return words.findIndex(w => (w.id && String(w.id) === String(wordIdOrHanzi)) || w.hanzi === wordIdOrHanzi);
}

export function showFlashcardStudyView() {
  window.currentView = 'cards';
  try { currentView = 'cards'; } catch (e) {}

  const studyView = document.getElementById('studyView');
  const overviewView = document.getElementById('overviewView');
  if (studyView) studyView.hidden = false;
  if (overviewView) overviewView.hidden = true;
  const flashcardTab = document.getElementById('flashcardTab');
  const overviewTab = document.getElementById('overviewTab');
  if (flashcardTab) {
    flashcardTab.classList.add('active');
    flashcardTab.setAttribute('aria-selected', 'true');
  }
  if (overviewTab) {
    overviewTab.classList.remove('active');
    overviewTab.setAttribute('aria-selected', 'false');
  }
}

export function revealAndHighlightWord(wordIndex, autoReveal) {
  if (autoReveal && typeof flip === 'function') {
    const meaning = document.getElementById('meaning');
    if (meaning && !meaning.classList.contains('show')) flip();
  } else if (autoReveal && typeof window.flip === 'function') {
    const meaning = document.getElementById('meaning');
    if (meaning && !meaning.classList.contains('show')) window.flip();
  }
  setTimeout(() => {
    const listBtn = document.querySelector(`.study-word-list-item[data-word-index="${wordIndex}"]`);
    if (listBtn) listBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 100);
}

export async function selectLevel(level, targetWordIdOrHanzi = null, autoReveal = false) {
  window.celebrationShown = false;
  try { celebrationShown = false; } catch (e) {}

  const overlay = document.getElementById('celebrationOverlay');
  if (overlay) overlay.remove();
  const celebCanvas = document.getElementById('celebrationCanvas');
  if (celebCanvas) celebCanvas.remove();

  if (typeof setActiveStudyWord === 'function') setActiveStudyWord(null);
  else if (typeof window.setActiveStudyWord === 'function') window.setActiveStudyWord(null);

  window.currentLevel = level;
  try { currentLevel = level; } catch (e) {}

  if (typeof SpaRouter !== 'undefined') {
    SpaRouter.pushView({ view: 'cards', level: level });
  }

  if (typeof closeAllStudyDrawers === 'function') closeAllStudyDrawers();
  else if (typeof window.closeAllStudyDrawers === 'function') window.closeAllStudyDrawers();

  document.body.classList.remove('today-reviews-focus-mode');
  document.body.classList.add('study-mode');
  document.body.classList.add('flashcard-study-mode');
  document.documentElement.classList.add('flashcard-study-mode');
  window.scrollTo({ top: 0, behavior: 'instant' });
  const wsMid = document.getElementById('workstationMiddle');
  if (wsMid) wsMid.scrollTop = 0;

  if (typeof transitionTimer !== 'undefined' && transitionTimer) {
    clearTimeout(transitionTimer);
    try { transitionTimer = null; } catch (e) {}
  }
  if (window.transitionTimer) {
    clearTimeout(window.transitionTimer);
    window.transitionTimer = null;
  }

  window.WORDS = [];
  try { WORDS = []; } catch (e) {}
  window.filteredOrder = [];
  try { filteredOrder = []; } catch (e) {}

  const studyWordSearch = document.getElementById('studyWordListSearch');
  if (studyWordSearch) studyWordSearch.value = '';

  if (typeof renderStudyWordList === 'function') renderStudyWordList();
  else if (typeof window.renderStudyWordList === 'function') window.renderStudyWordList();

  window.currentView = 'cards';
  try { currentView = 'cards'; } catch (e) {}
  window.overviewQuery = '';
  try { overviewQuery = ''; } catch (e) {}
  window.overviewStatus = 'all';
  try { overviewStatus = 'all'; } catch (e) {}

  try { localStorage.setItem(LAST_LEVEL_KEY, level); } catch (e) {}

  const levelsObj = typeof LEVELS !== 'undefined' ? LEVELS : window.LEVELS;
  document.getElementById('appTitle').textContent = levelsObj[level].label + ' · 汉字思维';
  document.getElementById('primaryTabs').style.display = 'none';
  document.getElementById('pickerControls').style.display = 'none';
  document.getElementById('learningDashboard').style.display = 'none';
  const continueCard = document.getElementById('continueLearningCard');
  if (continueCard) continueCard.style.display = 'none';
  const vocabHub = document.getElementById('screenVocabHub');
  if (vocabHub) vocabHub.style.display = 'none';
  const auxCol = document.querySelector('.dashboard-aux-column');
  if (auxCol) auxCol.style.display = 'none';
  document.getElementById('transferPanel').hidden = true;
  document.getElementById('screenPicker').style.display = 'none';
  document.getElementById('screenTopicPicker').style.display = 'none';
  const screenRadicalCards = document.getElementById('screenRadicalCards');
  if (screenRadicalCards) screenRadicalCards.style.display = 'none';
  const screenRadicalHub = document.getElementById('screenRadicalHub');
  if (screenRadicalHub) screenRadicalHub.style.display = 'none';
  const screenTodayReviews = document.getElementById('screenTodayReviews');
  if (screenTodayReviews) screenTodayReviews.style.display = 'none';
  document.getElementById('screenCards').style.display = '';
  document.getElementById('overviewTab').disabled = true;
  document.getElementById('cardArea').innerHTML = `
    <div class="skel-bar"></div>
    <div class="skel-card">
      <div class="skel-line skel-hanzi"></div>
      <div class="skel-line skel-pinyin"></div>
      <div class="skel-line skel-hint"></div>
    </div>
    <div class="skel-nav">
      <div class="skel-line skel-nav-btn"></div>
      <div class="skel-line skel-nav-mid"></div>
      <div class="skel-line skel-nav-btn"></div>
    </div>
    <div class="skel-actions">
      <div class="skel-line skel-action-btn"></div>
      <div class="skel-line skel-action-btn"></div>
    </div>`;

  if (typeof loadLevelIllustrationPack === 'function') {
    loadLevelIllustrationPack(level).catch(() => {});
  } else if (typeof window.loadLevelIllustrationPack === 'function') {
    window.loadLevelIllustrationPack(level).catch(() => {});
  }

  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => requestAnimationFrame(r));

  if (typeof loadPrebuiltAudioManifest === 'function') {
    loadPrebuiltAudioManifest(level);
  } else if (typeof window.loadPrebuiltAudioManifest === 'function') {
    window.loadPrebuiltAudioManifest(level);
  }

  try {
    const words = typeof fetchLevelWords === 'function' ? await fetchLevelWords(level) : await window.fetchLevelWords(level);
    const curLvl = typeof currentLevel !== 'undefined' ? currentLevel : window.currentLevel;
    if (curLvl !== level) return;
    window.WORDS = words;
    try { WORDS = words; } catch (e) {}
  } catch (e) {
    const curLvl = typeof currentLevel !== 'undefined' ? currentLevel : window.currentLevel;
    if (curLvl !== level) return;
    document.getElementById('cardArea').innerHTML = '<div class="error-text">Không thể tải dữ liệu. Vui lòng thử lại.</div>';
    return;
  }

  document.getElementById('overviewTab').disabled = false;
  const wordsList = typeof WORDS !== 'undefined' ? WORDS : window.WORDS;
  const newOrder = Array.from({ length: wordsList.length }, (_, i) => i);
  window.order = newOrder;
  try { order = newOrder; } catch (e) {}
  window.progress = {};
  try { progress = {}; } catch (e) {}
  window.showPinyin = true;
  try { showPinyin = true; } catch (e) {}
  window.currentFilter = 'all';
  try { currentFilter = 'all'; } catch (e) {}
  window.idx = 0;
  try { idx = 0; } catch (e) {}

  if (typeof loadState === 'function') loadState();
  else if (typeof window.loadState === 'function') window.loadState();

  if (typeof buildCardArea === 'function') buildCardArea();
  else if (typeof window.buildCardArea === 'function') window.buildCardArea();

  if (typeof renderFilters === 'function') renderFilters();
  else if (typeof window.renderFilters === 'function') window.renderFilters();

  showFlashcardStudyView();

  if (typeof transitionTimer !== 'undefined' && transitionTimer) {
    clearTimeout(transitionTimer);
    try { transitionTimer = null; } catch (e) {}
  }
  if (window.transitionTimer) {
    clearTimeout(window.transitionTimer);
    window.transitionTimer = null;
  }

  const targetIdx = targetWordIdOrHanzi ? findWordIndex(targetWordIdOrHanzi) : -1;
  const filtered = typeof filteredOrder !== 'undefined' ? filteredOrder : window.filteredOrder;
  if (targetWordIdOrHanzi) {
    if (targetIdx >= 0) {
      if (typeof showAllWordsAt === 'function') showAllWordsAt(targetIdx);
      else if (typeof window.showAllWordsAt === 'function') window.showAllWordsAt(targetIdx);
    }
  } else if (filtered && filtered.length > 0) {
    const randIdx = Math.floor(Math.random() * filtered.length);
    window.idx = randIdx;
    try { idx = randIdx; } catch (e) {}
  }

  const curIdx = typeof idx !== 'undefined' ? idx : window.idx;
  if (typeof preloadDeckIllustrations === 'function') {
    preloadDeckIllustrations(wordsList, curIdx, filtered, level);
  } else if (typeof window.preloadDeckIllustrations === 'function') {
    window.preloadDeckIllustrations(wordsList, curIdx, filtered, level);
  }

  if (typeof render === 'function') render();
  else if (typeof window.render === 'function') window.render();

  if (targetIdx >= 0) {
    if (typeof setActiveStudyWord === 'function') setActiveStudyWord(wordsList[targetIdx]);
    else if (typeof window.setActiveStudyWord === 'function') window.setActiveStudyWord(wordsList[targetIdx]);
    revealAndHighlightWord(targetIdx, autoReveal);
  }
}

export async function openWordInLevel(level, wordIdOrHanzi, autoReveal = true) {
  const pTab = typeof primaryTab !== 'undefined' ? primaryTab : window.primaryTab;
  if (typeof pTab !== 'undefined' && pTab !== 'vocab') {
    if (typeof setPrimaryTab === 'function') setPrimaryTab('vocab');
    else if (typeof window.setPrimaryTab === 'function') window.setPrimaryTab('vocab');
  }
  window.scrollTo(0, 0);

  const curLvl = typeof currentLevel !== 'undefined' ? currentLevel : window.currentLevel;
  const wordsList = typeof WORDS !== 'undefined' ? WORDS : window.WORDS;
  if (curLvl !== level || !Array.isArray(wordsList) || wordsList.length === 0) {
    await selectLevel(level, wordIdOrHanzi, autoReveal);
    return;
  }

  if (typeof transitionTimer !== 'undefined' && transitionTimer) {
    clearTimeout(transitionTimer);
    try { transitionTimer = null; } catch (e) {}
  }
  if (window.transitionTimer) {
    clearTimeout(window.transitionTimer);
    window.transitionTimer = null;
  }

  showFlashcardStudyView();

  const wordIndex = findWordIndex(wordIdOrHanzi);
  if (wordIndex < 0) return;

  if (typeof showAllWordsAt === 'function') showAllWordsAt(wordIndex);
  else if (typeof window.showAllWordsAt === 'function') window.showAllWordsAt(wordIndex);

  if (typeof preloadSingleWordIllustration === 'function') {
    preloadSingleWordIllustration(wordsList[wordIndex], 'high');
  } else if (typeof window.preloadSingleWordIllustration === 'function') {
    window.preloadSingleWordIllustration(wordsList[wordIndex], 'high');
  }

  if (typeof renderFilters === 'function') renderFilters();
  else if (typeof window.renderFilters === 'function') window.renderFilters();

  if (typeof render === 'function') render();
  else if (typeof window.render === 'function') window.render();

  if (typeof setActiveStudyWord === 'function') setActiveStudyWord(wordsList[wordIndex]);
  else if (typeof window.setActiveStudyWord === 'function') window.setActiveStudyWord(wordsList[wordIndex]);

  revealAndHighlightWord(wordIndex, autoReveal);
}

export function mountLevels() {
  window.localDateKey = localDateKey;
  window.calendarDayDifference = calendarDayDifference;
  window.hasSavedProgress = hasSavedProgress;
  window.DEFAULT_DAILY_STUDY_GOAL = DEFAULT_DAILY_STUDY_GOAL;
  window.DAILY_STUDY_GOAL_OPTIONS = DAILY_STUDY_GOAL_OPTIONS;
  window.DAILY_STUDY_GOAL_KEY = DAILY_STUDY_GOAL_KEY;
  window.STUDY_ACTIVITY_KEY = STUDY_ACTIVITY_KEY;
  window.LAST_LEVEL_KEY = LAST_LEVEL_KEY;
  window.readSavedLevelProgress = readSavedLevelProgress;
  window.readStudyActivity = readStudyActivity;
  window.dayWordCount = dayWordCount;
  window.daySeconds = daySeconds;
  window.formatStudyDuration = formatStudyDuration;
  window.readDailyStudyGoal = readDailyStudyGoal;
  window.updateDailyStudyGoal = updateDailyStudyGoal;
  window.focusDailyGoalSelector = focusDailyGoalSelector;
  window.studyStreak = studyStreak;
  window.streakStats = streakStats;
  window.intensityBucket = intensityBucket;
  window.mondayFirstIndex = mondayFirstIndex;
  window.buildMonthGrid = buildMonthGrid;
  window.yearSummary = yearSummary;
  window.setHistoryView = setHistoryView;
  window.changeHistoryCursor = changeHistoryCursor;
  window.jumpToMonth = jumpToMonth;
  window.WEEKDAY_LABELS = WEEKDAY_LABELS;
  window.renderMonthGridHtml = renderMonthGridHtml;
  window.historyFooterHtml = historyFooterHtml;
  window.renderMonthView = renderMonthView;
  window.MINI_MONTH_LABELS = MINI_MONTH_LABELS;
  window.renderYearView = renderYearView;
  window.renderHistoryModalBody = renderHistoryModalBody;
  window.closeHistoryModal = closeHistoryModal;
  window.handleHistoryModalKeydown = handleHistoryModalKeydown;
  window.showHistoryModal = showHistoryModal;
  window.recordDailyStudy = recordDailyStudy;
  window.STUDY_HEARTBEAT_SECONDS = STUDY_HEARTBEAT_SECONDS;
  window.recordStudySeconds = recordStudySeconds;
  window.startStudyHeartbeat = startStudyHeartbeat;
  window.learningProgressSummary = learningProgressSummary;
  window.prefetchSuggestedLevel = prefetchSuggestedLevel;
  window.renderLearningDashboard = renderLearningDashboard;
  window.isHomeScreen = isHomeScreen;
  window.syncHomeScreen = syncHomeScreen;
  window.invalidateHomeWidgets = invalidateHomeWidgets;
  window.quickStartLearning = quickStartLearning;
  window.timeGreeting = timeGreeting;
  window.pickGreeting = pickGreeting;
  window.showWelcomeToast = showWelcomeToast;
  window.formatProgressPercent = formatProgressPercent;
  window.renderLevelProgress = renderLevelProgress;
  window.goBackToPicker = goBackToPicker;
  window.findWordIndex = findWordIndex;
  window.showFlashcardStudyView = showFlashcardStudyView;
  window.revealAndHighlightWord = revealAndHighlightWord;
  window.selectLevel = selectLevel;
  window.openWordInLevel = openWordInLevel;
}
