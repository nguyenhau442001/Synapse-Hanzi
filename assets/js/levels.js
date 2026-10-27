// Level picker, welcome message, and level data loading.
function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calendarDayDifference(fromKey, toKey) {
  const from = String(fromKey).split('-').map(Number);
  const to = String(toKey).split('-').map(Number);
  if (from.length !== 3 || to.length !== 3 || from.some(Number.isNaN) || to.some(Number.isNaN)) return null;
  const fromDate = new Date(from[0], from[1] - 1, from[2], 12);
  const toDate = new Date(to[0], to[1] - 1, to[2], 12);
  return Math.round((toDate - fromDate) / 86400000);
}

function hasSavedProgress() {
  return Object.keys(LEVELS).some(level => {
    try {
      const srs = readSrsRecord(level);
      if (srs && Object.keys(srs.cards).length > 0) return true;
      const raw = localStorage.getItem('hsk_' + level + '_progress_v2');
      return raw && Object.keys(JSON.parse(raw)).length > 0;
    } catch (e) {
      return false;
    }
  });
}

const DEFAULT_DAILY_STUDY_GOAL = 10;
const DAILY_STUDY_GOAL_OPTIONS = [10, 20, 30, 50];
const DAILY_STUDY_GOAL_KEY = 'hsk_daily_study_goal_v1';
const STUDY_ACTIVITY_KEY = 'hsk_study_activity_v1';
const LAST_LEVEL_KEY = 'hsk_last_level_v1';

function readSavedLevelProgress(level) {
  const srs = readSrsRecord(level);
  if (srs) return progressFromCards(srs.cards);
  try {
    const parsed = JSON.parse(localStorage.getItem('hsk_' + level + '_progress_v2'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    return {};
  }
}

function readStudyActivity() {
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

function dayWordCount(dayEntry) {
  return dayEntry && Array.isArray(dayEntry.words) ? dayEntry.words.length : 0;
}

function daySeconds(dayEntry) {
  return dayEntry && typeof dayEntry.seconds === 'number' ? dayEntry.seconds : 0;
}

function formatStudyDuration(totalMinutes) {
  const minutes = Math.round(totalMinutes);
  if (minutes <= 0) return '0 phút';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} phút`;
  if (remainder === 0) return `${hours} giờ`;
  return `${hours} giờ ${remainder} phút`;
}

function readDailyStudyGoal() {
  try {
    const savedGoal = Number(localStorage.getItem(DAILY_STUDY_GOAL_KEY));
    if (DAILY_STUDY_GOAL_OPTIONS.includes(savedGoal)) return savedGoal;
  } catch (e) {}
  return DEFAULT_DAILY_STUDY_GOAL;
}

function updateDailyStudyGoal(value) {
  const nextGoal = Number(value);
  if (!DAILY_STUDY_GOAL_OPTIONS.includes(nextGoal)) {
    renderLearningDashboard();
    return;
  }
  try { localStorage.setItem(DAILY_STUDY_GOAL_KEY, String(nextGoal)); } catch (e) {}
  renderLearningDashboard();
}

function focusDailyGoalSelector() {
  const select = document.getElementById('dailyGoalSelect');
  if (!select) return;
  select.focus();
  if (typeof select.showPicker === 'function') {
    try { select.showPicker(); } catch (e) {}
  }
}

function studyStreak(days) {
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

function streakStats(days) {
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

function intensityBucket(minutes) {
  if (minutes <= 0) return 0;
  if (minutes <= 10) return 1;
  if (minutes <= 30) return 2;
  if (minutes <= 60) return 3;
  return 4;
}

function mondayFirstIndex(jsDay) {
  return (jsDay + 6) % 7;
}

function buildMonthGrid(days, year, month) {
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

function yearSummary(days, year) {
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

function setHistoryView(view) {
  historyModalView = view;
  renderHistoryModalBody();
}

function changeHistoryCursor(delta) {
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

function jumpToMonth(year, month) {
  historyModalView = 'month';
  historyModalCursor = { year, month };
  renderHistoryModalBody();
}

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function renderMonthGridHtml(grid) {
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

function renderMonthView(activity) {
  const { year, month } = historyModalCursor;
  const grid = buildMonthGrid(activity.days, year, month);
  const studiedDays = grid.filter(c => c.inMonth && c.studied).length;
  const totalMinutes = grid.filter(c => c.inMonth).reduce((sum, c) => sum + c.minutes, 0);

  return `
    ${renderMonthGridHtml(grid)}
    <div class="history-footer">
      <div class="history-summary">${studiedDays} ngày học · ${formatStudyDuration(totalMinutes)}</div>
      <div class="history-legend">
        <span>Ít</span>
        <span class="history-legend-swatch bucket-0"></span>
        <span class="history-legend-swatch bucket-1"></span>
        <span class="history-legend-swatch bucket-2"></span>
        <span class="history-legend-swatch bucket-3"></span>
        <span class="history-legend-swatch bucket-4"></span>
        <span>Nhiều</span>
      </div>
    </div>`;
}

const MINI_MONTH_LABELS = ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'];

function renderYearView(activity) {
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
    <div class="history-footer">
      <div class="history-summary">${summary.studiedDays} ngày học · ${formatStudyDuration(summary.totalMinutes)}</div>
      <div class="history-legend">
        <span>Ít</span>
        <span class="history-legend-swatch bucket-0"></span>
        <span class="history-legend-swatch bucket-1"></span>
        <span class="history-legend-swatch bucket-2"></span>
        <span class="history-legend-swatch bucket-3"></span>
        <span class="history-legend-swatch bucket-4"></span>
        <span>Nhiều</span>
      </div>
    </div>`;
}

function renderHistoryModalBody() {
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

function closeHistoryModal() {
  const overlay = document.getElementById('historyOverlay');
  if (overlay) overlay.remove();
  delete document.body.dataset.historyModalOpen;
  document.removeEventListener('keydown', handleHistoryModalKeydown);
}

function handleHistoryModalKeydown(e) {
  if (e.key === 'Escape') closeHistoryModal();
}

function showHistoryModal() {
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

function recordDailyStudy(wordId, level = currentLevel) {
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

const STUDY_HEARTBEAT_SECONDS = 15;

function recordStudySeconds(deltaSeconds) {
  const activity = readStudyActivity();
  const today = localDateKey(new Date());
  const dayEntry = activity.days[today] || { words: [], seconds: 0 };
  activity.days[today] = { words: dayEntry.words, seconds: dayEntry.seconds + deltaSeconds };

  try { localStorage.setItem(STUDY_ACTIVITY_KEY, JSON.stringify(activity)); } catch (e) {}
}

function startStudyHeartbeat() {
  setInterval(() => {
    if (document.visibilityState === 'visible') recordStudySeconds(STUDY_HEARTBEAT_SECONDS);
  }, STUDY_HEARTBEAT_SECONDS * 1000);
}

function learningProgressSummary() {
  const levels = Object.keys(LEVELS).filter(level => LEVELS[level].available).map(level => {
    const saved = readSavedLevelProgress(level);
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
  if (target && target.known >= LEVELS[target.level].total) {
    const nextIndex = levels.findIndex(item => item.level === target.level) + 1;
    target = levels.slice(nextIndex).find(item => LEVELS[item.level].available) || target;
  }
  if (!target) {
    target = levels.find(item => item.studied > 0 && item.known < LEVELS[item.level].total)
      || levels.find(item => LEVELS[item.level].available);
  }

  return {
    totalKnown: levels.reduce((sum, item) => sum + item.known, 0),
    totalStudied: levels.reduce((sum, item) => sum + item.studied, 0),
    target,
  };
}

// Warm the service-worker data cache for the level the dashboard suggests, so tapping it is instant.
function prefetchSuggestedLevel() {
  const target = learningProgressSummary().target;
  const config = target && LEVELS[target.level];
  if (!config || !config.dataUrl) return;
  const run = () => {
    fetch(config.dataUrl).catch(() => {});
    if (config.audioManifestUrl) fetch(config.audioManifestUrl).catch(() => {});
    if (typeof loadLevelIllustrationPack === 'function') loadLevelIllustrationPack(target.level).catch(() => {});
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}

function renderLearningDashboard() {
  const dailyCount = document.getElementById('dailyStudyCount');
  const dailyFill = document.getElementById('dailyGoalFill');
  const dailyMessage = document.getElementById('dailyGoalMessage');
  const dailyGoalSelect = document.getElementById('dailyGoalSelect');
  const knownNode = document.getElementById('totalKnownCount');
  const studiedNode = document.getElementById('totalStudiedCount');
  const quickButton = document.getElementById('quickStudyButton');
  const dueCount = document.getElementById('todayDueCount');
  const todayReviewButton = document.getElementById('todayReviewButton');
  if (!dailyCount || !dailyFill || !dailyMessage || !dailyGoalSelect || !knownNode || !studiedNode || !quickButton) return;

  const activity = readStudyActivity();
  const today = localDateKey(new Date());
  const todayCount = dayWordCount(activity.days[today]);
  const dailyGoal = readDailyStudyGoal();
  const streak = studyStreak(activity.days);
  const summary = learningProgressSummary();
  const goalPercent = Math.min(100, todayCount / dailyGoal * 100);
  const roundedPct = Math.round(goalPercent);

  dailyCount.textContent = todayCount;
  dailyGoalSelect.value = String(dailyGoal);
  dailyFill.style.width = goalPercent + '%';
  dailyFill.parentElement.setAttribute('aria-valuemax', String(dailyGoal));
  dailyFill.parentElement.setAttribute('aria-valuenow', String(Math.min(todayCount, dailyGoal)));
  dailyMessage.textContent = todayCount >= dailyGoal
    ? 'Đã hoàn thành mục tiêu hôm nay — tuyệt lắm!'
    : todayCount > 0
      ? `Còn ${dailyGoal - todayCount} từ nữa để hoàn thành mục tiêu.`
      : `Học ${dailyGoal} từ để hoàn thành mục tiêu hôm nay.`;

  const goalPctNode = document.getElementById('dailyGoalPct');
  if (goalPctNode) {
    goalPctNode.textContent = `${roundedPct}%`;
    goalPctNode.classList.toggle('is-completed', roundedPct >= 100);
  }
  const targetTextNode = document.getElementById('dailyGoalTargetText');
  if (targetTextNode) {
    targetTextNode.textContent = String(dailyGoal);
  }

  const headerStreak = document.getElementById('headerStreakText');
  if (headerStreak) headerStreak.textContent = `${streak} ngày`;
  const bannerStreak = document.getElementById('bannerStreakText');
  if (bannerStreak) bannerStreak.textContent = `${streak} ngày học`;
  const bannerStreakBadge = document.getElementById('bannerStreakBadge');
  if (bannerStreakBadge) {
    bannerStreakBadge.classList.toggle('has-streak', streak > 0);
  }
  knownNode.textContent = summary.totalKnown;
  studiedNode.textContent = summary.totalStudied;
  const dueTotal = countDueCardsAcrossLevels(new Date());
  if (dueCount) dueCount.textContent = String(dueTotal);
  if (todayReviewButton) todayReviewButton.hidden = dueTotal === 0;

  const target = summary.target;
  if (target) {
    const complete = target.known >= LEVELS[target.level].total;
    quickButton.dataset.level = target.level;
    quickButton.innerHTML = `${complete ? 'Ôn lại' : target.studied > 0 ? 'Tiếp tục' : 'Bắt đầu'} ${LEVELS[target.level].label} <span aria-hidden="true">→</span>`;
  }
  if (typeof renderDashboardEnhancements === 'function') renderDashboardEnhancements();
  invalidateHomeWidgets();
}

function quickStartLearning() {
  const button = document.getElementById('quickStudyButton');
  const level = button && button.dataset.level;
  if (level && LEVELS[level] && LEVELS[level].available) selectLevel(level);
}

function timeGreeting(hour) {
  if (hour < 5) return 'Học giờ này là chăm chỉ hay chưa chịu ngủ vậy bạn? 👀';
  if (hour < 8) return 'Chim sẻ dậy sớm, từ vựng tự chui vào đầu 🐦';
  if (hour < 11) return 'Buổi sáng học vài từ, cả ngày thấy mình tri thức ☀️';
  if (hour < 14) return 'Ăn trưa nhớ ăn, học từ cũng nhớ học nha 🍜';
  if (hour < 18) return 'Buổi chiều hơi buồn ngủ, làm vài flashcard cho tỉnh ☕';
  if (hour < 22) return 'Tối nay không lướt vô tri, mình lướt flashcard nhé 😌';
  return 'Cú đêm học bài — mai dậy nhớ được bao nhiêu tính sau 🦉';
}

function pickGreeting(candidates, previousGreeting) {
  const freshCandidates = candidates.filter(message => message !== previousGreeting);
  const pool = freshCandidates.length ? freshCandidates : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

function showWelcomeToast() {
  const toast = document.getElementById('welcomeToast');
  const messageNode = document.getElementById('welcomeToastMessage');
  if (!toast || !messageNode) return;

  try {
    if (sessionStorage.getItem('hsk_welcome_shown_v1')) return;
    sessionStorage.setItem('hsk_welcome_shown_v1', '1');
  } catch (e) {}

  const now = new Date();
  const today = localDateKey(now);
  let history = null;
  let previousGreeting = '';

  try {
    history = JSON.parse(localStorage.getItem('hsk_visit_history_v1'));
    previousGreeting = localStorage.getItem('hsk_last_greeting_v1') || '';
  } catch (e) {}

  let greeting;
  const firstVisit = !history || !history.lastVisit;
  const streak = studyStreak(readStudyActivity().days);

  if (firstVisit) {
    greeting = 'Chào mừng bạn! Chọn một cấp độ rồi mình chiến thôi 👋';
  } else {
    const dayDifference = calendarDayDifference(history.lastVisit, today);
    const continuedStreak = dayDifference === 1;

    const contextualGreetings = [];

    if (hasSavedProgress()) {
      contextualGreetings.push('Lại gặp nhau rồi! Hôm nay mình xử tiếp mấy từ hôm qua nhé.');
    }
    if (continuedStreak && streak >= 2) {
      contextualGreetings.push('Chuỗi học vẫn còn nóng, đừng để nó nguội nha 🔥');
    }
    contextualGreetings.push(
      timeGreeting(now.getHours()),
      'Mừng bạn quay trở lại! Não bộ đã sẵn sàng nạp tiếng Trung chưa? 🧠',
    );

    const playfulGreetings = [
      'Không học hôm nay thì ngày mai… vẫn phải học thôi 😌',
      'Một từ cũng là học, 50 từ là hơi tham.',
      'HSK không khó, chỉ là từ vựng hơi đông.',
      'Bạn học đi, chiếc app này tin bạn.',
      'Não đang loading… flashcard đang hỗ trợ.',
      'Học nhẹ vài từ, flex mạnh một đời.',
      'Vuốt phải vì đã nhớ, không phải vì định mệnh.',
      'Từ này quen lắm, nhưng nghĩa là gì thì chưa chắc.',
      'Thêm một từ vào não, bớt một chút hoang mang.',
      'Đừng để chữ Hán nhìn bạn như người xa lạ.',
    ];

    const playfulGreeting = pickGreeting(playfulGreetings, previousGreeting);
    greeting = pickGreeting([...contextualGreetings, playfulGreeting], previousGreeting);
  }

  try {
    localStorage.setItem('hsk_visit_history_v1', JSON.stringify({ lastVisit: today }));
    localStorage.setItem('hsk_last_greeting_v1', greeting);
  } catch (e) {}

  messageNode.textContent = greeting;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.hidden = true; }, 220);
  }, 4200);
}

function formatProgressPercent(known, total) {
  if (!total || total <= 0 || !known || known <= 0) return '0%';
  if (known >= total) return '100%';
  const rawPct = (known / total) * 100;
  const rounded = Math.round(rawPct);
  if (rounded === 0 && known > 0) return '<1%';
  if (rounded === 100 && known < total) return '99%';
  return `${rounded}%`;
}
window.formatProgressPercent = formatProgressPercent;

function renderLevelProgress() {
  Object.keys(LEVELS).forEach(level => {
    const total = LEVELS[level].total;
    const data = readSavedLevelProgress(level);
    const known = Object.values(data).filter(status => status === 'known').length;
    const rawPct = total > 0 ? (known / total * 100) : 0;
    const pctStr = formatProgressPercent(known, total);
    const bar = document.getElementById('bar-' + level);
    const text = document.getElementById('text-' + level);
    const card = document.querySelector(`.level-card[data-level="${level}"]`);
    const pctEl = card ? card.querySelector('.lvl-percent-value') : null;
    if (bar) bar.style.width = (known > 0 ? Math.max(rawPct, 0.75) : 0) + '%';
    if (text) text.textContent = known.toLocaleString('vi-VN') + ' / ' + total.toLocaleString('vi-VN') + ' từ';
    if (pctEl) pctEl.textContent = pctStr;
  });
}



function goBackToPicker() {
  stopSpeech();
  abandonReviewSession();
  if (typeof closeAllStudyDrawers === 'function') closeAllStudyDrawers();
  setActiveStudyWord(null);
  document.body.classList.remove('study-mode');
  document.body.classList.remove('flashcard-study-mode');
  document.documentElement.classList.remove('flashcard-study-mode');
  const wasTopic = currentLevel && LEVELS[currentLevel] && LEVELS[currentLevel].isTopic;
  document.getElementById('screenCards').style.display = 'none';
  const vocabHub = document.getElementById('screenVocabHub');
  if (vocabHub) vocabHub.style.display = '';
  const auxCol = document.querySelector('.dashboard-aux-column');
  if (auxCol) auxCol.style.display = '';
  const continueCard = document.getElementById('continueLearningCard');
  if (continueCard) continueCard.style.display = '';
  document.getElementById('appTitle').textContent = 'Synapse Hanzi';
  document.getElementById('primaryTabs').style.display = '';
  document.getElementById('pickerControls').style.display = '';
  setPrimaryTab('vocab');
  document.getElementById('learningDashboard').style.display = wasTopic ? 'none' : '';
  setVocabSubTab(wasTopic ? 'topic' : 'level');
  currentLevel = null;
  currentView = 'cards';
  overviewQuery = '';
  overviewStatus = 'all';
  const overlay = document.getElementById('celebrationOverlay');
  if (overlay) overlay.remove();
  renderLevelProgress();
  if (pickerVersion === '3.0') renderHsk30Grid();
  renderLearningDashboard();
  if (typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) {
    SpaRouter.pushView({ view: 'vocab' });
  }
}

async function selectLevel(level, targetWordIdOrHanzi = null, autoReveal = false) {
  celebrationShown = false;
  const overlay = document.getElementById('celebrationOverlay');
  if (overlay) overlay.remove();
  const celebCanvas = document.getElementById('celebrationCanvas');
  if (celebCanvas) celebCanvas.remove();
  setActiveStudyWord(null);
  currentLevel = level;
  if (typeof SpaRouter !== 'undefined') {
    SpaRouter.pushView({ view: 'cards', level: level });
  }
  if (typeof closeAllStudyDrawers === 'function') closeAllStudyDrawers();
  document.body.classList.add('study-mode');
  document.body.classList.add('flashcard-study-mode');
  document.documentElement.classList.add('flashcard-study-mode');
  window.scrollTo({ top: 0, behavior: 'instant' });
  const wsMid = document.getElementById('workstationMiddle');
  if (wsMid) wsMid.scrollTop = 0;
  if (transitionTimer) { clearTimeout(transitionTimer); transitionTimer = null; }
  WORDS = [];
  filteredOrder = [];
  const studyWordSearch = document.getElementById('studyWordListSearch');
  if (studyWordSearch) studyWordSearch.value = '';
  if (typeof renderStudyWordList === 'function') renderStudyWordList();
  currentView = 'cards';
  overviewQuery = '';
  overviewStatus = 'all';
  try { localStorage.setItem(LAST_LEVEL_KEY, level); } catch (e) {}
  document.getElementById('appTitle').textContent = LEVELS[level].label + ' · Synapse Hanzi';
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

  // Preload illustration pack in parallel with vocabulary download for 0ms zero-latency card images
  if (typeof loadLevelIllustrationPack === 'function') {
    loadLevelIllustrationPack(level).catch(() => {});
  }

  // Yield to the browser's paint pipeline so the skeleton renders at least one frame
  // before the fetch begins — necessary for local file:// loads where fetch is instant.
  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => requestAnimationFrame(r));

  // Audio manifest is optional (speech falls back to Web Speech), so it loads alongside the words
  // instead of delaying the first card.
  loadPrebuiltAudioManifest(level);
  try {
    const res = await fetch(LEVELS[level].dataUrl);
    if (!res.ok) throw new Error('fetch failed');
    const words = await res.json();
    if (currentLevel !== level) return; // another level was picked while this one downloaded
    WORDS = words;
  } catch (e) {
    if (currentLevel !== level) return;
    document.getElementById('cardArea').innerHTML = '<div class="error-text">Không thể tải dữ liệu. Vui lòng thử lại.</div>';
    return;
  }

  document.getElementById('overviewTab').disabled = false;
  order = Array.from({length: WORDS.length}, (_, i) => i);
  progress = {};
  showPinyin = true;
  currentFilter = 'all';
  idx = 0;

  loadState();

  buildCardArea();
  renderFilters();

  currentView = 'cards';
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

  if (transitionTimer) {
    clearTimeout(transitionTimer);
    transitionTimer = null;
  }

  if (targetWordIdOrHanzi) {
    const targetIdx = WORDS.findIndex(w => (w.id && String(w.id) === String(targetWordIdOrHanzi)) || w.hanzi === targetWordIdOrHanzi);
    if (targetIdx >= 0) {
      currentFilter = 'all';
      filteredOrder = order.slice();
      const pos = filteredOrder.indexOf(targetIdx);
      idx = pos >= 0 ? pos : 0;
    }
  } else if (filteredOrder.length > 0) {
    // Start with a completely random word whenever entering flashcard study mode
    idx = Math.floor(Math.random() * filteredOrder.length);
  }

  // Instant-Load Preloading: Trigger deck-wide progressive background preloading anchored at current idx
  if (typeof preloadDeckIllustrations === 'function') {
    preloadDeckIllustrations(WORDS, idx, filteredOrder, currentLevel);
  } else if (typeof preloadWordsIllustrations === 'function') {
    preloadWordsIllustrations(WORDS, 50);
  }

  render();

  if (targetWordIdOrHanzi) {
    const targetIdx = WORDS.findIndex(w => (w.id && String(w.id) === String(targetWordIdOrHanzi)) || w.hanzi === targetWordIdOrHanzi);
    if (targetIdx >= 0) {
      setActiveStudyWord(WORDS[targetIdx]);
      if (autoReveal && typeof flip === 'function') {
        const meaning = document.getElementById('meaning');
        if (meaning && !meaning.classList.contains('show')) {
          flip();
        }
      }
      setTimeout(() => {
        const listBtn = document.querySelector(`.study-word-list-item[data-word-index="${targetIdx}"]`);
        if (listBtn) listBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 100);
    }
  }
}

async function openWordInLevel(level, wordIdOrHanzi, autoReveal = true) {
  if (typeof primaryTab !== 'undefined' && primaryTab !== 'vocab') setPrimaryTab('vocab');
  window.scrollTo(0, 0);

  if (currentLevel !== level || !Array.isArray(WORDS) || WORDS.length === 0) {
    await selectLevel(level, wordIdOrHanzi, autoReveal);
    return;
  }

  if (transitionTimer) {
    clearTimeout(transitionTimer);
    transitionTimer = null;
  }

  currentView = 'cards';
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

  const wordIndex = WORDS.findIndex(w => (w.id && String(w.id) === String(wordIdOrHanzi)) || w.hanzi === wordIdOrHanzi);
  if (wordIndex < 0) return;

  currentFilter = 'all';
  filteredOrder = order.slice();
  const position = filteredOrder.indexOf(wordIndex);
  idx = position >= 0 ? position : 0;
  if (typeof preloadSingleWordIllustration === 'function') {
    preloadSingleWordIllustration(WORDS[wordIndex], 'high');
  }
  if (typeof renderFilters === 'function') renderFilters();
  if (typeof render === 'function') render();
  if (typeof setActiveStudyWord === 'function') setActiveStudyWord(WORDS[wordIndex]);

  if (autoReveal && typeof flip === 'function') {
    const meaning = document.getElementById('meaning');
    if (meaning && !meaning.classList.contains('show')) {
      flip();
    }
  }

  setTimeout(() => {
    const listBtn = document.querySelector(`.study-word-list-item[data-word-index="${wordIndex}"]`);
    if (listBtn) listBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 100);
}

window.openWordInLevel = openWordInLevel;
