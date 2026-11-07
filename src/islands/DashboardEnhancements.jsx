// Home dashboard additions: compact level status, continuation card and radical study shortcuts.
// Preact island port replacing legacy assets/js/dashboard-enhancements.js.
import { onDomReady } from './domReady';

/* global LEVELS, learningProgressSummary, formatProgressPercent, readStudyActivity,
   localDateKey, dayWordCount, readSavedLevelProgress */

export const COMMON_RADICALS = [
  { char: '氵', name: 'Thủy', set: 'basic50', hint: 'Nước' },
  { char: '亻', name: 'Nhân', set: 'basic50', hint: 'Người' },
  { char: '扌', name: 'Thủ', set: 'basic50', hint: 'Tay' },
  { char: '口', name: 'Khẩu', set: 'basic50', hint: 'Miệng' },
  { char: '心', name: 'Tâm', set: 'basic50', hint: 'Tim' },
  { char: '木', name: 'Mộc', set: 'basic50', hint: 'Cây' },
];

export function renderDashboardEnhancements() {
  const continuation = document.getElementById('continueLearningCard');
  const summary = typeof learningProgressSummary === 'function' ? learningProgressSummary() : null;
  const target = summary ? summary.target : null;
  const courseFill = document.getElementById('continueLearningFill');
  if (continuation && summary) {
    if (summary.totalStudied === 0) {
      const titleEl = document.getElementById('continueLearningTitle');
      if (titleEl) titleEl.textContent = 'Bắt đầu HSK 1';
      const progEl = document.getElementById('continueLearningProgress');
      if (progEl) progEl.textContent = '150 từ nền tảng · Flashcard thông minh';
      const ctaBtn = continuation.querySelector('.dashboard-primary-btn');
      if (ctaBtn) {
        ctaBtn.innerHTML = `<span>Bắt đầu HSK 1</span> <span aria-hidden="true">➔</span>`;
      }
      if (courseFill) {
        courseFill.style.width = '0%';
      }
      continuation.dataset.level = 'hsk1';
    } else if (target && LEVELS[target.level]) {
      const cfg = LEVELS[target.level];
      const ratio = `${target.known.toLocaleString('vi-VN')} / ${cfg.total.toLocaleString('vi-VN')} từ`;
      const pctNum = Math.min(100, Math.round((target.known / cfg.total) * 100));
      const pctStr = typeof formatProgressPercent === 'function'
        ? formatProgressPercent(target.known, cfg.total)
        : `${pctNum}%`;
      const titleEl = document.getElementById('continueLearningTitle');
      if (titleEl) titleEl.textContent = `Học tiếp ${cfg.label}`;
      const progEl = document.getElementById('continueLearningProgress');
      if (progEl) progEl.textContent = `${ratio} · ${pctStr} hoàn thành`;
      if (courseFill) {
        courseFill.style.width = pctNum + '%';
      }
      const ctaBtn = continuation.querySelector('.dashboard-primary-btn');
      if (ctaBtn) {
        ctaBtn.innerHTML = `<span>Tiếp tục ${cfg.label}</span> <span aria-hidden="true">➔</span>`;
      }
      continuation.dataset.level = target.level;
    }
  }

  const activity = typeof readStudyActivity === 'function' ? readStudyActivity() : null;
  const today = typeof localDateKey === 'function' ? localDateKey(new Date()) : '';
  const todayWords = new Set(
    activity && activity.days && today && dayWordCount(activity.days[today])
      ? activity.days[today].words
      : []
  );
  ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6'].forEach(level => {
    const card = document.querySelector(`.level-card[data-level="${level}"]`);
    if (!card || !LEVELS || !LEVELS[level]) return;
    const cfg = LEVELS[level];
    const statuses = typeof readSavedLevelProgress === 'function'
      ? Object.values(readSavedLevelProgress(level))
      : [];
    const known = statuses.filter(status => status === 'known').length;
    const studied = statuses.filter(status => status === 'known' || status === 'unknown').length;
    const complete = known >= cfg.total;
    const isLearning = !complete && (studied > 0 || (target && target.level === level));
    card.classList.toggle('is-active-level', Boolean(target && target.level === level && !complete));
    card.classList.toggle('is-complete-level', complete);
    card.classList.toggle('is-learning-level', isLearning);
    let badge = card.querySelector('.level-status-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'level-status-badge';
      const heading = card.querySelector('.level-card-heading') || card;
      heading.appendChild(badge);
    }
    badge.className = `level-status-badge${complete ? ' is-complete' : isLearning ? ' is-learning' : ''}`;
    badge.textContent = complete ? 'Đã hoàn thành' : isLearning ? 'Đang học' : 'Chưa học';

    let daily = card.querySelector('.lvl-today-count');
    if (!daily) {
      daily = document.createElement('div');
      daily.className = 'lvl-today-count';
      const summaryNode = card.querySelector('.level-card-progress-heading');
      if (summaryNode) summaryNode.appendChild(daily);
      else {
        const track = card.querySelector('.lvl-mastery-track');
        card.insertBefore(daily, track || card.lastElementChild);
      }
    }
    const todayCount = [...todayWords].filter(key => key.startsWith(level + ':')).length;
    if (todayCount > 0) {
      daily.style.display = 'inline-flex';
      daily.classList.add('has-activity');
      daily.textContent = `+${todayCount} hôm nay`;
    } else {
      daily.style.display = 'none';
      daily.classList.remove('has-activity');
      daily.textContent = '';
    }
    const rawPct = cfg.total > 0 ? (known / cfg.total * 100) : 0;
    const pctStr = typeof formatProgressPercent === 'function'
      ? formatProgressPercent(known, cfg.total)
      : `${Math.round(rawPct)}%`;
    const percentValue = card.querySelector('.lvl-percent-value');
    if (percentValue) {
      percentValue.textContent = known > 0 ? pctStr : '0%';
      percentValue.style.opacity = known > 0 ? '1' : '0.6';
    }
    const legacyPercent = card.querySelector('.lvl-percent-complete');
    if (legacyPercent) legacyPercent.remove();
    const progressText = card.querySelector('.lvl-mastery-text');
    if (progressText) {
      progressText.textContent = known > 0
        ? `${known.toLocaleString('vi-VN')} / ${cfg.total.toLocaleString('vi-VN')} đã nhớ`
        : `0 / ${cfg.total.toLocaleString('vi-VN')} đã nhớ`;
    }
    const bar = card.querySelector('.lvl-mastery-fill');
    if (bar) bar.style.width = `${known > 0 ? Math.max(rawPct, 1) : 0}%`;
    const actionHint = card.querySelector('.lvl-action-hint');
    if (actionHint) {
      actionHint.innerHTML = `${complete ? 'Ôn lại' : isLearning ? 'Học tiếp' : 'Học ngay'} <span aria-hidden="true">→</span>`;
    }
  });
}

export function initDashboardSidebar() {
  const card = document.getElementById('hwForgotten');
  if (card) {
    const drawerUrgent = document.getElementById('quickDrawerUrgentPane');
    if (drawerUrgent) {
      // Urgent cards are rendered into drawer list
      card.style.display = 'none';
    }
  }
  renderDashboardEnhancements();
}

export function mountDashboardEnhancements() {
  window.renderDashboardEnhancements = renderDashboardEnhancements;
  window.initDashboardSidebar = initDashboardSidebar;
  window.COMMON_RADICALS = COMMON_RADICALS;

  onDomReady(initDashboardSidebar);
}
