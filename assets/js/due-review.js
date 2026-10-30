// Cross-level review queue and the daily new-card limit.
function countNewReviewsToday() {
  const today = localDateKey(new Date());
  const reviewed = new Set();
  Object.keys(LEVELS).filter(level => LEVELS[level].available).forEach(level => {
    readSrsReviewLog(level).forEach(entry => {
      if (entry.stateBefore !== SRS.State.New || !entry.timestamp) return;
      const timestamp = new Date(entry.timestamp);
      if (!Number.isFinite(timestamp.getTime()) || localDateKey(timestamp) !== today) return;
      reviewed.add(level + ':' + entry.wordId);
    });
  });
  return reviewed.size;
}

function countDueCardsAcrossLevels(now) {
  const currentTime = (now || new Date()).getTime();
  return Object.keys(LEVELS).filter(level => LEVELS[level].available).reduce((count, level) => {
    const record = readSrsRecord(level);
    if (record) {
      return count + Object.values(record.cards).filter(card => SRS.isDue(card, currentTime)).length;
    }
    return count + Object.values(readSavedLevelProgressLegacy(level)).filter(status => status === 'unknown').length;
  }, 0);
}

async function loadTodayReviewQueue() {
  const now = new Date();
  const levels = Object.keys(LEVELS).filter(level => LEVELS[level].available);
  const datasets = await Promise.all(levels.map(async level => {
    const response = await fetch(LEVELS[level].dataUrl);
    if (!response.ok) throw new Error('Không tải được dữ liệu ' + level);
    return response.json();
  }));
  const queue = [];
  levels.forEach((level, levelIndex) => {
    const words = datasets[levelIndex];
    const cards = loadSrsForLevel(level, words, readSavedLevelProgressLegacy(level));
    words.forEach(word => {
      const card = cards[word.id];
      if (SRS.isDue(card, now)) queue.push({ level, word, card, due: new Date(card.due).getTime() });
    });
  });
  queue.sort((a, b) => a.due - b.due);
  return queue;
}

let todayReviewRevealed = false;
let todayReviewDoneMessage = 'Không còn thẻ đến hạn hôm nay.';

function renderTodayReviewCard() {
  const area = document.getElementById('todayReviewCardArea');
  const progressText = document.getElementById('todayReviewProgress');
  const progressPct = document.getElementById('todayReviewProgressPct');
  const progressBar = document.getElementById('todayReviewProgressBar');
  const counterPill = document.getElementById('todayReviewCounterPill');
  todayReviewRevealed = false;

  const total = todayReviewQueue.length;
  if (todayReviewIndex >= total) {
    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.setAttribute('aria-valuenow', '100');
    }
    if (progressPct) progressPct.textContent = '100%';
    if (progressText) progressText.textContent = `Đã hoàn thành ${total} / ${total} thẻ`;
    if (counterPill) counterPill.textContent = `${total} / ${total}`;
    if (area) {
      area.innerHTML = `
        <div class="today-review-celebration-card">
          <div class="today-celebration-icon" aria-hidden="true">🎉</div>
          <h3 class="today-celebration-title">Hoàn thành buổi ôn tập!</h3>
          <p class="today-celebration-desc">${escapeHtml(todayReviewDoneMessage)}</p>
          <div class="today-celebration-stat">
            <span class="stat-number">${total}</span>
            <span class="stat-label">thẻ đã được củng cố</span>
          </div>
          <div class="today-celebration-actions">
            <button type="button" class="today-btn-primary" onclick="SpaRouter.navigateBack()">
              <span>Trở về trang chủ</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </div>`;
    }
    renderLearningDashboard();
    return;
  }

  const currentNum = todayReviewIndex + 1;
  const pct = total > 0 ? Math.round((todayReviewIndex / total) * 100) : 0;
  if (progressBar) {
    progressBar.style.width = `${pct}%`;
    progressBar.setAttribute('aria-valuenow', String(pct));
  }
  if (progressPct) progressPct.textContent = `${pct}%`;
  if (progressText) progressText.textContent = `${currentNum} / ${total} thẻ`;
  if (counterPill) counterPill.textContent = `${currentNum} / ${total}`;

  const item = todayReviewQueue[todayReviewIndex];
  const levelData = LEVELS[item.level] || { label: (item.level || '').toUpperCase() };
  const levelKey = (item.level || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const lapses = (item.card && item.card.lapses) ? item.card.lapses : 0;

  if (area) {
    area.innerHTML = `
      <article class="today-review-card" id="todayActiveCard" onclick="handleTodayCardClick(event)" role="region" aria-label="Thẻ từ vựng">
        <div class="today-card-header">
          <span class="today-level-badge lvl-${escapeHtml(levelKey)}">${escapeHtml(levelData.label)}</span>
          ${lapses > 0 ? `<span class="today-lapse-pill" title="Từ này đã quên hoặc nhầm ${lapses} lần">⚠️ Hay nhầm ${lapses}×</span>` : ''}
        </div>

        <div class="today-card-center">
          <div class="today-card-hanzi hw-cjk">${escapeHtml(item.word.hanzi)}</div>

          <!-- Front affordance hint (shown before flipping) -->
          <div class="today-card-flip-cue" id="todayFlipCue">
            <button type="button" class="today-flip-btn" onclick="revealTodayReview(); event.stopPropagation();" aria-label="Lật thẻ xem đáp án">
              <svg class="flip-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 12 4-4v3h11a2 2 0 0 1 2 2v2"/><path d="m21 12-4 4v-3H6a2 2 0 0 1-2-2v-2"/></svg>
              <span class="flip-label">Chạm thẻ hoặc nhấn <kbd>Space</kbd> để lật</span>
            </button>
          </div>

          <!-- Answer details (revealed after flipping) -->
          <div class="today-card-answer" id="todayReviewAnswer" hidden>
            <div class="today-pinyin-wrap">
              <span class="today-card-pinyin">${escapeHtml(item.word.pinyin)}</span>
              <button type="button" class="today-speak-btn" id="todaySpeakBtn" onclick="speakTodayWord(); event.stopPropagation();" aria-label="Nghe phát âm" title="Nghe phát âm (phím P)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              </button>
            </div>
            <div class="today-card-meaning">${escapeHtml(item.word.meaning)}</div>

            ${item.word.example_zh ? `
              <div class="today-card-example">
                <p class="today-example-zh hw-cjk">${formatTodayExample(item.word.example_zh)}</p>
                ${item.word.example_vi ? `<p class="today-example-vi">${formatTodayExample(item.word.example_vi)}</p>` : ''}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Action buttons -->
        <div class="today-card-actions">
          <!-- Before flip: prominent Xem đáp án button -->
          <div id="todayRevealActionWrap" class="today-reveal-wrap">
            <button type="button" class="today-btn-reveal" onclick="revealTodayReview(); event.stopPropagation();">
              <span class="today-reveal-label">Xem đáp án</span>
              <kbd class="today-key-hint">Space</kbd>
            </button>
          </div>

          <!-- After flip: 2 ergonomic rating buttons: Chưa nhớ (Left) và Đã nhớ (Right) -->
          <div id="todayRatingRow" class="today-rating-row" hidden>
            <button type="button" class="today-rating-btn today-rating-btn--again" onclick="rateTodayReview('again'); event.stopPropagation();" aria-keyshortcuts="1" title="Chưa nhớ (Phím 1 hoặc ←)">
              <span class="today-rating-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </span>
              <span class="today-rating-body">
                <span class="today-rating-main">Chưa nhớ</span>
                <span class="today-rating-sub">Phím 1 / ←</span>
              </span>
            </button>

            <button type="button" class="today-rating-btn today-rating-btn--good" onclick="rateTodayReview('good'); event.stopPropagation();" aria-keyshortcuts="2" title="Đã nhớ (Phím 2 hoặc →)">
              <span class="today-rating-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </span>
              <span class="today-rating-body">
                <span class="today-rating-main">Đã nhớ</span>
                <span class="today-rating-sub">Phím 2 / →</span>
              </span>
            </button>
          </div>
        </div>
      </article>`;
  }
}

function handleTodayCardClick(event) {
  if (todayReviewRevealed) return;
  if (event.target && event.target.closest('button, a, input, select, textarea')) return;
  revealTodayReview();
}

function revealTodayReview() {
  if (todayReviewRevealed || todayReviewIndex >= todayReviewQueue.length) return;
  todayReviewRevealed = true;
  const card = document.getElementById('todayActiveCard');
  if (card) card.classList.add('is-revealed');
  const answer = document.getElementById('todayReviewAnswer');
  if (answer) answer.hidden = false;
  const flipCue = document.getElementById('todayFlipCue');
  if (flipCue) flipCue.hidden = true;
  const revealWrap = document.getElementById('todayRevealActionWrap');
  if (revealWrap) revealWrap.hidden = true;
  const ratingRow = document.getElementById('todayRatingRow');
  if (ratingRow) ratingRow.hidden = false;
}

function speakTodayWord() {
  if (todayReviewIndex >= todayReviewQueue.length) return;
  const item = todayReviewQueue[todayReviewIndex];
  if (!item || !item.word) return;
  const speakBtn = document.getElementById('todaySpeakBtn');
  if (speakBtn && typeof speakText === 'function') {
    speakText(item.word.hanzi, speakBtn, typeof SPEECH_RATE !== 'undefined' ? SPEECH_RATE : 0.85);
  }
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function formatTodayExample(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/&lt;u&gt;/gi, '<u>')
    .replace(/&lt;\/u&gt;/gi, '</u>');
}

function rateTodayReview(rating) {
  const item = todayReviewQueue[todayReviewIndex];
  if (!item || !todayReviewRevealed) return;
  const record = readSrsRecord(item.level);
  const cards = record ? record.cards : {};
  const result = reviewSrsCard(item.level, item.word.id, rating, cards);
  recordDailyStudy(item.word.id, item.level);
  if (rating === 'again') {
    todayReviewQueue.push({ ...item, card: result.card, due: new Date(result.card.due).getTime() });
  }
  todayReviewIndex++;
  renderTodayReviewCard();
}

function openTodayReviews() {
  return openReviewQueue('📅 Ôn hôm nay', loadTodayReviewQueue, 'Không còn thẻ đến hạn hôm nay.');
}

// Shared by "Ôn hôm nay" and the home widgets' quick review; loadQueue resolves to [{ level, word, card, due }].
async function openReviewQueue(title, loadQueue, doneMessage) {
  setActiveStudyWord(null);
  document.body.classList.add('today-reviews-focus-mode');
  const titleEl = document.getElementById('todayReviewTitle');
  if (titleEl) titleEl.textContent = title;
  todayReviewDoneMessage = doneMessage;
  const hub = document.getElementById('screenVocabHub');
  const cards = document.getElementById('screenCards');
  const radicalCards = document.getElementById('screenRadicalCards');
  const radicalHub = document.getElementById('screenRadicalHub');
  const reviewScreen = document.getElementById('screenTodayReviews');
  if (hub) hub.style.display = 'none';
  if (cards) cards.style.display = 'none';
  if (radicalCards) radicalCards.style.display = 'none';
  if (radicalHub) radicalHub.style.display = 'none';
  if (reviewScreen) reviewScreen.style.display = '';
  const primaryTabs = document.getElementById('primaryTabs');
  if (primaryTabs) primaryTabs.style.display = 'none';
  const pickerControls = document.getElementById('pickerControls');
  if (pickerControls) pickerControls.style.display = 'none';
  const learningDashboard = document.getElementById('learningDashboard');
  if (learningDashboard) learningDashboard.style.display = 'none';
  const cardArea = document.getElementById('todayReviewCardArea');
  if (cardArea) {
    cardArea.innerHTML = `
      <div class="today-review-loading">
        <div class="today-loading-spinner" aria-hidden="true"></div>
        <p class="loading-text">Đang tải thẻ ôn tập...</p>
      </div>`;
  }
  syncHomeScreen();
  if (typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) {
    SpaRouter.pushView({ view: 'todayReviews' });
  }
  try {
    todayReviewQueue = await loadQueue();
    todayReviewIndex = 0;
    renderTodayReviewCard();
  } catch (error) {
    console.error('Today review queue failed:', error);
    if (cardArea) {
      cardArea.innerHTML = `
        <div class="today-review-error">
          <p class="error-text">Không thể tải thẻ ôn tập. Vui lòng thử lại.</p>
          <button type="button" class="today-btn-primary" onclick="SpaRouter.navigateBack()">Quay lại</button>
        </div>`;
    }
  }
}

function closeTodayReviews() {
  document.body.classList.remove('today-reviews-focus-mode');
  const reviewScreen = document.getElementById('screenTodayReviews');
  if (reviewScreen) reviewScreen.style.display = 'none';
  const cards = document.getElementById('screenCards');
  if (cards) cards.style.display = 'none';
  const radicalCards = document.getElementById('screenRadicalCards');
  if (radicalCards) radicalCards.style.display = 'none';
  const hub = document.getElementById('screenVocabHub');
  if (hub) hub.style.display = '';
  const primaryTabs = document.getElementById('primaryTabs');
  if (primaryTabs) primaryTabs.style.display = '';
  const pickerControls = document.getElementById('pickerControls');
  if (pickerControls) pickerControls.style.display = '';
  const learningDashboard = document.getElementById('learningDashboard');
  if (learningDashboard) learningDashboard.style.display = '';
  renderLearningDashboard();
  syncHomeScreen();
  if (typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) {
    SpaRouter.pushView({ view: 'vocab' });
  }
}

document.addEventListener('keydown', event => {
  const screen = document.getElementById('screenTodayReviews');
  if (!screen || screen.style.display === 'none' || event.altKey || event.ctrlKey || event.metaKey) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName)) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    if (typeof SpaRouter !== 'undefined') SpaRouter.navigateBack();
    else closeTodayReviews();
    return;
  }
  if (event.key === 'p' || event.key === 'P') {
    event.preventDefault();
    speakTodayWord();
    return;
  }
  if (event.key === ' ') {
    if (document.activeElement && document.activeElement.closest('button, summary, a')) return;
    event.preventDefault();
    if (!todayReviewRevealed) {
      revealTodayReview();
    }
    return;
  }
  const rating = RATING_KEYS[event.key];
  if (rating && todayReviewRevealed) {
    event.preventDefault();
    rateTodayReview(rating);
    return;
  }
  if (todayReviewRevealed && (event.key === 'Enter' || event.key === '3')) {
    event.preventDefault();
    rateTodayReview('good');
  }
});
