// Fast-review (speed quiz) mode: pool building, timer, grading, screen transitions.
const REVIEW_TONE_MARKS = {
  'ā':'a','á':'a','ǎ':'a','à':'a',
  'ē':'e','é':'e','ě':'e','è':'e',
  'ī':'i','í':'i','ǐ':'i','ì':'i',
  'ō':'o','ó':'o','ǒ':'o','ò':'o',
  'ū':'u','ú':'u','ǔ':'u','ù':'u',
  'ǖ':'v','ǘ':'v','ǚ':'v','ǜ':'v','ü':'v',
};

function stripTonePinyin(text) {
  return String(text || '')
    .toLowerCase()
    .split('')
    .map(ch => REVIEW_TONE_MARKS[ch] || ch)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function pinyinLooseMatch(input, target) {
  return stripTonePinyin(input) === stripTonePinyin(target);
}

const REVIEW_RANGE_LEVELS = ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6'];
let reviewSelectedLevel = 1;
try {
  const savedLevel = parseInt(localStorage.getItem('hsk_fast_review_level'), 10);
  if (savedLevel >= 1 && savedLevel <= 6) reviewSelectedLevel = savedLevel;
} catch (e) {}

function selectReviewLevel(level) {
  const n = Math.max(1, Math.min(6, Number(level) || 1));
  reviewSelectedLevel = n;
  try { localStorage.setItem('hsk_fast_review_level', String(n)); } catch (e) {}

  const slider = document.getElementById('reviewRangeSlider');
  if (slider) slider.value = n;

  const chips = document.querySelectorAll('.review-filter-chip');
  chips.forEach(chip => {
    const chipLvl = Number(chip.dataset.level);
    const isSelected = chipLvl === n;
    const isInRange = chipLvl <= n;
    chip.classList.toggle('active', isSelected);
    chip.classList.toggle('in-range', isInRange);
    chip.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });

  const levels = REVIEW_RANGE_LEVELS.slice(0, n);
  const totalWords = levels.reduce((sum, lvl) => sum + (LEVELS[lvl] ? LEVELS[lvl].total : 0), 0);

  const labelEl = document.getElementById('reviewRangeLabel');
  if (labelEl) {
    labelEl.textContent = n === 1 ? 'HSK 1' : `HSK 1 – HSK ${n}`;
  }

  const subtextEl = document.getElementById('reviewScopeSubtext');
  if (subtextEl) {
    subtextEl.textContent = n === 1
      ? 'Chỉ ôn từ vựng thuộc cấp độ HSK 1'
      : `Ôn tập gộp từ vựng từ cấp độ HSK 1 đến HSK ${n}`;
  }

  const countEl = document.getElementById('reviewRangeCount');
  if (countEl) {
    countEl.textContent = `${totalWords.toLocaleString('vi-VN')} từ`;
  }

  const poolStatus = document.getElementById('reviewPoolStatus');
  const poolSub = document.getElementById('reviewPoolSub');
  if (reviewLoadedRangeMax === n && reviewWordPool.length > 0) {
    const pool = buildReviewPool();
    if (poolStatus) poolStatus.textContent = `${pool.length} từ chờ ôn`;
    if (poolSub) poolSub.textContent = pool.length > 0 ? 'Sẵn sàng bắt đầu ngay' : 'Đã thuộc hết từ trong phạm vi này!';
  } else {
    if (poolStatus) poolStatus.textContent = 'Từ chưa thuộc';
    if (poolSub) poolSub.textContent = 'Tự động ưu tiên thẻ cần ôn';
  }
}

function updateReviewRangeLabel(sliderValue) {
  selectReviewLevel(sliderValue);
}

function buildReviewPool() {
  const pool = [];
  const canIntroduceNewCards = countNewReviewsToday() < readDailyStudyGoal();
  for (let i = 0; i < reviewWordPool.length; i++) {
    const word = reviewWordPool[i];
    const levelProgress = reviewProgressByLevel[word._level] || {};
    const card = reviewCardsByLevel[word._level] && reviewCardsByLevel[word._level][word.id];
    if (levelProgress[word.id] !== 'known' && (canIntroduceNewCards || !card || card.state !== SRS.State.New)) pool.push(i);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

async function fetchReviewWords(levels) {
  const results = await Promise.all(levels.map(async level => {
    const url = LEVELS[level].dataUrl;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`fetch failed: ${url} (${response.status})`);
    return response.json();
  }));

  const words = [];
  for (let i = 0; i < results.length; i++) {
    for (const word of results[i]) {
      words.push({ ...word, _level: levels[i] });
    }
  }
  return words;
}

function startUnifiedReview() {
  const n = reviewSelectedLevel || 1;
  const levels = REVIEW_RANGE_LEVELS.slice(0, n);
  const startBtn = document.getElementById('reviewRangeStart');
  const btnLabel = document.getElementById('reviewStartBtnLabel');

  if (startBtn) startBtn.disabled = true;
  if (btnLabel) btnLabel.textContent = 'Đang tải dữ liệu...';

  const proceedToStart = function () {
    if (startBtn) startBtn.disabled = false;
    if (btnLabel) btnLabel.textContent = 'Bắt đầu ôn ngay';

    const pool = buildReviewPool();
    reviewPool = pool;

    if (pool.length === 0) {
      alert(countNewReviewsToday() >= readDailyStudyGoal()
        ? 'Bạn đã hoàn thành mục tiêu thẻ mới hôm nay! Thẻ mới sẽ mở lại ngày mai. Bạn vẫn có thể ôn thẻ đến hạn trong mục Ôn hôm nay.'
        : 'Bạn đã thuộc hết từ trong phạm vi này! Hãy chọn cấp độ rộng hơn.');
      return;
    }

    startReviewSession();
  };

  if (reviewLoadedRangeMax === n && reviewWordPool.length > 0) {
    proceedToStart();
    return;
  }

  reviewProgressByLevel = {};
  for (const level of levels) {
    reviewProgressByLevel[level] = readSavedLevelProgress(level);
  }

  let fallbackStarted = false;
  const finishLoad = function (words) {
    reviewWordPool = words;
    reviewCardsByLevel = {};
    for (const level of levels) {
      const levelWords = words.filter(word => word._level === level);
      const legacy = readSavedLevelProgressLegacy(level);
      reviewCardsByLevel[level] = loadSrsForLevel(level, levelWords, legacy);
      reviewProgressByLevel[level] = progressFromCards(reviewCardsByLevel[level]);
    }
    reviewLoadedRangeMax = n;
    proceedToStart();
  };

  const failLoad = function (error) {
    if (startBtn) startBtn.disabled = false;
    if (btnLabel) btnLabel.textContent = 'Bắt đầu ôn ngay';
    console.error('Fast-review range load failed:', error);
    alert('Không thể tải dữ liệu cấp độ. Vui lòng thử lại.');
  };

  const loadWithoutWorker = function (workerError) {
    if (fallbackStarted) return;
    fallbackStarted = true;
    if (reviewWorker) {
      reviewWorker.terminate();
      reviewWorker = null;
    }
    console.warn('Fast-review worker unavailable; falling back to page fetch.', workerError);
    fetchReviewWords(levels).then(finishLoad).catch(failLoad);
  };

  try {
    if (!reviewWorker) {
      reviewWorker = new Worker('assets/js/fast-review-worker.js?v=20260928');
    }
  } catch (error) {
    loadWithoutWorker(error);
    return;
  }

  reviewWorker.onmessage = function (e) {
    if (!e.data.ok) {
      loadWithoutWorker(e.data.error);
      return;
    }
    finishLoad(e.data.words);
  };
  reviewWorker.onerror = function (e) {
    if (e.preventDefault) e.preventDefault();
    loadWithoutWorker(e.message || e);
  };

  try {
    reviewWorker.postMessage({
      levels,
      dataUrls: levels.map(level => new URL(LEVELS[level].dataUrl, document.baseURI).href),
    });
  } catch (error) {
    loadWithoutWorker(error);
  }
}

function startReviewRangeLoad() {
  startUnifiedReview();
}

let reviewCurrentChoices = [];
let reviewKeydownHandler = null;

function enterReviewFocusMode() {
  document.body.classList.add('review-focus-mode');
  const setupCard = document.getElementById('reviewSetupCard');
  if (setupCard) setupCard.hidden = true;
  const picker = document.querySelector('.review-range-picker');
  if (picker) picker.hidden = true;
}

function exitReviewFocusMode() {
  document.body.classList.remove('review-focus-mode');
  const setupCard = document.getElementById('reviewSetupCard');
  if (setupCard) setupCard.hidden = false;
  const picker = document.querySelector('.review-range-picker');
  if (picker) picker.hidden = false;
}

function setupReviewKeydownListener() {
  removeReviewKeydownListener();
  reviewKeydownHandler = function (e) {
    if (e.key === 'Escape') {
      if (document.getElementById('reviewMistakesModal')) {
        closeReviewMistakesModal();
      } else if (reviewSessionLive) {
        exitReviewSession();
      }
      return;
    }

    if (reviewAnswered || !reviewSessionLive || !reviewCurrentQuestion) return;
    if (reviewCurrentQuestion.type !== 'choice') return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    const key = e.key.toLowerCase();
    let choiceIndex = -1;
    if (key === '1' || key === 'a') choiceIndex = 0;
    else if (key === '2' || key === 'b') choiceIndex = 1;
    else if (key === '3' || key === 'c') choiceIndex = 2;
    else if (key === '4' || key === 'd') choiceIndex = 3;

    if (choiceIndex >= 0 && reviewCurrentChoices && reviewCurrentChoices[choiceIndex] !== undefined) {
      e.preventDefault();
      submitReviewChoice(reviewCurrentChoices[choiceIndex]);
    }
  };
  document.addEventListener('keydown', reviewKeydownHandler);
}

function removeReviewKeydownListener() {
  if (reviewKeydownHandler) {
    document.removeEventListener('keydown', reviewKeydownHandler);
    reviewKeydownHandler = null;
  }
}

const REVIEW_MAX_LIVES = 5;

function renderReviewHeartsHtml(lives) {
  let heartsHtml = '<div class="review-hearts" aria-label="' + lives + ' mạng còn lại">';
  for (let i = 1; i <= REVIEW_MAX_LIVES; i++) {
    const isAlive = i <= lives;
    heartsHtml += `
      <span class="review-heart-item ${isAlive ? 'is-alive' : 'is-lost'}" data-heart-idx="${i}" aria-hidden="true">
        <svg viewBox="0 0 24 24" class="review-heart-svg">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </span>`;
  }
  heartsHtml += '</div>';
  return heartsHtml;
}

function showReviewSetup() {
  abandonReviewSession();
  const setupCard = document.getElementById('reviewSetupCard');
  if (setupCard) setupCard.hidden = false;
  const sessionEl = document.getElementById('reviewSession');
  if (sessionEl) sessionEl.hidden = true;
  const resultEl = document.getElementById('reviewResult');
  if (resultEl) resultEl.hidden = true;
  selectReviewLevel(reviewSelectedLevel || 1);
  updateReviewMobileAuxBadge();
}

function renderReviewStart() {
  showReviewSetup();
}

function startReviewSession() {
  reviewIndex = 0;
  reviewLives = REVIEW_MAX_LIVES;
  reviewScore = 0;
  reviewStreak = 0;
  reviewBestStreak = 0;
  reviewMistakes = [];
  reviewSessionLive = true;
  reviewAnswered = false;
  closeReviewMistakesModal();
  enterReviewFocusMode();

  const setupCard = document.getElementById('reviewSetupCard');
  if (setupCard) setupCard.hidden = true;
  const startEl = document.getElementById('reviewStart');
  if (startEl) startEl.hidden = true;
  const resultEl = document.getElementById('reviewResult');
  if (resultEl) resultEl.hidden = true;
  const sessionEl = document.getElementById('reviewSession');
  if (sessionEl) sessionEl.hidden = false;

  setupReviewKeydownListener();
  renderReviewQuestion();
}

function pickReviewQuestionType() {
  return Math.random() < 0.5 ? 'type' : 'choice';
}

function buildReviewChoices(correctWordIdx) {
  const correctPinyin = stripTonePinyin(reviewWordPool[correctWordIdx].pinyin);
  const others = [];
  for (let i = 0; i < reviewWordPool.length; i++) {
    if (i !== correctWordIdx && stripTonePinyin(reviewWordPool[i].pinyin) !== correctPinyin) others.push(i);
  }
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const distractors = others.slice(0, 3);
  const choices = [correctWordIdx, ...distractors];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

function abandonReviewSession() {
  if (reviewTimer) { clearInterval(reviewTimer); reviewTimer = null; }
  reviewAnswered = true;
  reviewSessionLive = false;
  removeReviewKeydownListener();
  exitReviewFocusMode();
  closeReviewMistakesModal();
}

function renderReviewQuestion() {
  if (!reviewSessionLive) return;
  if (reviewTimer) { clearInterval(reviewTimer); reviewTimer = null; }
  while (reviewIndex < reviewPool.length && countNewReviewsToday() >= readDailyStudyGoal()) {
    const candidate = reviewWordPool[reviewPool[reviewIndex]];
    const candidateCard = candidate && reviewCardsByLevel[candidate._level] && reviewCardsByLevel[candidate._level][candidate.id];
    if (!candidateCard || candidateCard.state !== SRS.State.New) break;
    reviewIndex++;
  }
  if (reviewLives <= 0 || reviewIndex >= reviewPool.length) { endReviewSession(); return; }

  const wordIdx = reviewPool[reviewIndex];
  const word = reviewWordPool[wordIdx];
  const type = pickReviewQuestionType();
  reviewCurrentQuestion = { wordIdx, type };
  reviewAnswered = false;
  reviewTimeLeft = 20;

  const reviewCoreHanzi = String(word.hanzi || '').replace(/[（\(].*?[）\)]/g, '').trim() || word.hanzi || '';
  const reviewLen = Array.from(reviewCoreHanzi).length;
  const reviewLenClass = reviewLen >= 6 ? ' is-len-6-plus' : reviewLen === 5 ? ' is-len-5' : reviewLen === 4 ? ' is-len-4' : '';
  const reviewHanziMatch = String(word.hanzi || '').trim().match(/^([^（\(]+)[（\(](.+?)[）\)]$/);
  const reviewHanziHtml = reviewHanziMatch
    ? `<span class="hanzi-text">${reviewHanziMatch[1].trim()}</span><span class="hanzi-clarifier">（${reviewHanziMatch[2].trim()}）</span>`
    : (word.hanzi || '');

  const header = `
    <div class="review-topbar">
      <button type="button" class="review-exit-btn" onclick="exitReviewSession()" title="Thoát ôn nhanh (Esc)" aria-label="Thoát ôn nhanh">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div class="review-topbar-center">
        <div class="review-progress-badge">
          <span class="review-progress-curr">${reviewIndex + 1}</span>
          <span class="review-progress-slash">/</span>
          <span class="review-progress-total">${reviewPool.length}</span>
        </div>
        ${reviewStreak >= 2 ? `<div class="review-streak-pill" title="Chuỗi đúng liên tiếp">🔥 ${reviewStreak}</div>` : ''}
      </div>
      <div class="review-topbar-right">
        ${renderReviewHeartsHtml(reviewLives)}
      </div>
    </div>

    <div class="review-timer-wrap">
      <div class="review-timer-track">
        <div class="review-timer-fill" id="reviewTimerFill"></div>
      </div>
      <span class="review-timer-num" id="reviewTimerNum">${reviewTimeLeft}s</span>
    </div>

    <div class="review-question-card">
      <div class="review-hanzi-wrap">
        <div class="review-hanzi${reviewLenClass}">${reviewHanziHtml}</div>
      </div>
    </div>`;

  let bodyHtml;
  if (type === 'type') {
    reviewCurrentChoices = [];
    bodyHtml = `
      <div class="review-type-wrap">
        <div class="review-answer-area">
          <input type="text" id="reviewTypeInput" class="review-type-input"
            autocomplete="off" autocapitalize="off" spellcheck="false"
            placeholder="Gõ pinyin (không dấu)..."
            aria-label="Nhập pinyin của chữ Hán"
            onkeydown="if(event.key==='Enter') submitReviewTypeAnswer()">
          <button type="button" class="review-submit-btn" onclick="submitReviewTypeAnswer()">
            <span>Trả lời</span>
            <span class="review-submit-kbd" aria-hidden="true">↵</span>
          </button>
        </div>
        <div class="review-type-hint">Nhấn Enter để gửi đáp án</div>
      </div>
      <div class="review-feedback" id="reviewFeedback" aria-live="polite"></div>`;
  } else {
    const choiceIdxs = buildReviewChoices(wordIdx);
    reviewCurrentChoices = choiceIdxs;
    const KEY_HINTS = ['A', 'B', 'C', 'D'];
    bodyHtml = `
      <div class="review-choices" role="group" aria-label="Bốn đáp án lựa chọn">
        ${choiceIdxs.map((i, idx) => `
          <button type="button" class="review-choice-btn" data-word-idx="${i}" data-choice-idx="${idx}" onclick="submitReviewChoice(${i})">
            <span class="review-choice-badge" aria-hidden="true">${KEY_HINTS[idx]}</span>
            <span class="review-choice-pinyin">${escapeReviewHtml(reviewWordPool[i].pinyin)}</span>
            <span class="review-choice-shortcut-hint" aria-hidden="true">${idx + 1}</span>
          </button>`).join('')}
      </div>
      <div class="review-feedback" id="reviewFeedback" aria-live="polite"></div>`;
  }

  document.getElementById('reviewSession').innerHTML = header + bodyHtml;

  const input = document.getElementById('reviewTypeInput');
  if (input) input.focus();

  reviewTimer = setInterval(reviewTick, 1000);
  updateReviewTimerBar();
}

function updateReviewTimerBar() {
  const fill = document.getElementById('reviewTimerFill');
  const num = document.getElementById('reviewTimerNum');
  if (num) num.textContent = `${Math.max(0, reviewTimeLeft)}s`;
  if (!fill) return;
  const pct = Math.max(0, (reviewTimeLeft / 20) * 100);
  fill.style.width = pct + '%';
  fill.classList.toggle('review-timer-warning', reviewTimeLeft <= 8 && reviewTimeLeft > 5);
  fill.classList.toggle('review-timer-low', reviewTimeLeft <= 5);
}

function reviewTick() {
  reviewTimeLeft -= 1;
  updateReviewTimerBar();
  if (reviewTimeLeft <= 0) {
    clearInterval(reviewTimer);
    reviewTimer = null;
    const word = reviewCurrentQuestion && reviewWordPool ? reviewWordPool[reviewCurrentQuestion.wordIdx] : null;
    gradeReviewAnswer(false, {
      userAnswer: 'Hết giờ (chưa kịp trả lời)',
      expected: word ? word.pinyin : '',
      type: reviewCurrentQuestion ? reviewCurrentQuestion.type : 'type',
      isTimeout: true
    });
  }
}

function submitReviewTypeAnswer() {
  if (reviewAnswered) return;
  const input = document.getElementById('reviewTypeInput');
  const word = reviewWordPool[reviewCurrentQuestion.wordIdx];
  const userText = input ? input.value.trim() : '';
  const isCorrect = pinyinLooseMatch(userText, word.pinyin);
  gradeReviewAnswer(isCorrect, {
    userAnswer: userText || '(Để trống)',
    expected: word.pinyin,
    type: 'type'
  });
}

function submitReviewChoice(chosenIdx) {
  if (reviewAnswered) return;
  const isCorrect = chosenIdx === reviewCurrentQuestion.wordIdx;
  const chosenWord = reviewWordPool[chosenIdx];
  const word = reviewWordPool[reviewCurrentQuestion.wordIdx];
  gradeReviewAnswer(isCorrect, {
    chosenIdx,
    userAnswer: chosenWord ? chosenWord.pinyin : '',
    expected: word ? word.pinyin : '',
    type: 'choice'
  });
}

function gradeReviewAnswer(isCorrect, details) {
  if (reviewAnswered) return;
  reviewAnswered = true;
  if (reviewTimer) { clearInterval(reviewTimer); reviewTimer = null; }

  const wordIdx = reviewCurrentQuestion.wordIdx;
  const word = reviewWordPool[wordIdx];
  if (!reviewCardsByLevel[word._level]) reviewCardsByLevel[word._level] = {};
  reviewSrsCard(word._level, word.id, isCorrect ? 'good' : 'again', reviewCardsByLevel[word._level]);
  reviewProgressByLevel[word._level] = progressFromCards(reviewCardsByLevel[word._level]);
  recordDailyStudy(word.id, word._level);

  if (isCorrect) {
    reviewScore += 1;
    reviewStreak += 1;
    if (reviewStreak > reviewBestStreak) reviewBestStreak = reviewStreak;
  } else {
    reviewLives -= 1;
    reviewStreak = 0;

    const lostHeartIdx = reviewLives + 1;
    const lostHeartEl = document.querySelector(`.review-heart-item[data-heart-idx="${lostHeartIdx}"]`);
    if (lostHeartEl) {
      lostHeartEl.classList.remove('is-alive');
      lostHeartEl.classList.add('is-lost', 'just-lost');
    }

    const userAnswer = details && details.userAnswer ? details.userAnswer : (details && details.isTimeout ? 'Hết giờ (chưa kịp trả lời)' : 'Sai');
    const expected = details && details.expected ? details.expected : word.pinyin;
    const qType = details && details.type ? details.type : (reviewCurrentQuestion ? reviewCurrentQuestion.type : 'choice');

    reviewMistakes.push({
      id: word.id,
      hanzi: word.hanzi,
      pinyin: word.pinyin,
      meaning: word.meaning,
      level: word._level || '',
      example_zh: word.example_zh || '',
      example_py: word.example_py || '',
      example_vi: word.example_vi || '',
      userAnswer,
      expected,
      type: qType
    });
  }

  document.querySelectorAll('.review-choice-btn').forEach(btn => {
    btn.disabled = true;
    const bWordIdx = Number(btn.dataset.wordIdx);
    if (bWordIdx === wordIdx) {
      btn.classList.add('review-choice-btn--correct');
      const badge = btn.querySelector('.review-choice-badge');
      if (badge) badge.textContent = '✓';
    } else if (details && details.chosenIdx === bWordIdx && !isCorrect) {
      btn.classList.add('review-choice-btn--wrong');
      const badge = btn.querySelector('.review-choice-badge');
      if (badge) badge.textContent = '✕';
    }
  });

  const feedback = document.getElementById('reviewFeedback');
  if (feedback) {
    if (isCorrect) {
      feedback.innerHTML = `
        <div class="review-feedback-content">
          <div class="review-feedback-badge review-feedback-badge--correct">
            <span class="review-feedback-icon">✓</span>
            <span class="review-feedback-title">Chính xác!</span>
          </div>
          <div class="review-feedback-meta">
            <span class="review-feedback-pinyin">${escapeReviewHtml(word.pinyin)}</span>
            <span class="review-feedback-sep">·</span>
            <span class="review-feedback-meaning">${escapeReviewHtml(word.meaning)}</span>
          </div>
        </div>`;
      feedback.className = 'review-feedback show review-feedback--correct';
    } else {
      feedback.innerHTML = `
        <div class="review-feedback-content">
          <div class="review-feedback-badge review-feedback-badge--wrong">
            <span class="review-feedback-icon">✕</span>
            <span class="review-feedback-title">${details && details.isTimeout ? 'Hết giờ!' : 'Chưa đúng!'}</span>
          </div>
          <div class="review-feedback-meta">
            <span class="review-feedback-expected">Đáp án: <strong>${escapeReviewHtml(word.pinyin)}</strong></span>
            <span class="review-feedback-sep">·</span>
            <span class="review-feedback-meaning">${escapeReviewHtml(word.meaning)}</span>
          </div>
        </div>`;
      feedback.className = 'review-feedback show review-feedback--wrong';
    }
  }

  const delay = isCorrect ? 900 : 1300;
  setTimeout(() => {
    reviewIndex += 1;
    renderReviewQuestion();
  }, delay);
}

function endReviewSession() {
  if (reviewTimer) { clearInterval(reviewTimer); reviewTimer = null; }
  reviewSessionLive = false;
  removeReviewKeydownListener();
  document.getElementById('reviewSession').hidden = true;
  renderReviewResult();
}

function renderReviewResult() {
  const result = document.getElementById('reviewResult');
  result.hidden = false;
  const total = Math.min(reviewIndex, reviewPool.length);
  const survived = reviewLives > 0;
  const mistakeCount = reviewMistakes.length;
  const accuracy = total > 0 ? Math.round((reviewScore / total) * 100) : 0;

  const mistakesBtnHtml = mistakeCount > 0
    ? `<button type="button" class="review-mistakes-btn" onclick="openReviewMistakesModal()">📋 Xem lại câu sai (${mistakeCount})</button>`
    : `<button type="button" class="review-mistakes-btn review-mistakes-btn--disabled" disabled title="Không có câu sai trong phiên này">📋 Xem lại câu sai (0)</button>`;

  result.innerHTML = `
    <div class="review-result">
      <div class="review-result-icon">${survived ? '🏆' : '💔'}</div>
      <h2 class="review-result-title">${survived ? 'Hoàn thành phiên ôn!' : 'Hết mạng mất rồi!'}</h2>
      <p class="review-result-sub">${survived ? 'Xuất sắc! Bạn đã vượt qua các từ vựng trong phạm vi ôn.' : 'Đừng nản lòng! Hãy ôn lại các câu trả lời chưa đúng để nhớ lâu hơn.'}</p>
      <div class="review-result-stats">
        <div class="review-result-stat">
          <div class="review-result-num">${reviewScore}</div>
          <div class="review-result-lbl">Câu đúng</div>
        </div>
        <div class="review-result-stat">
          <div class="review-result-num">${total}</div>
          <div class="review-result-lbl">Tổng số câu</div>
        </div>
        <div class="review-result-stat">
          <div class="review-result-num">${accuracy}%</div>
          <div class="review-result-lbl">Chính xác</div>
        </div>
        <div class="review-result-stat">
          <div class="review-result-num">🔥 ${reviewBestStreak}</div>
          <div class="review-result-lbl">Chuỗi dài nhất</div>
        </div>
      </div>
      <div class="review-result-actions">
        ${mistakesBtnHtml}
        <button type="button" class="review-again-btn" onclick="startReviewSession()">⚡ Chơi lại</button>
        <button type="button" class="review-back-btn" onclick="showReviewSetup()">⚙️ Đổi phạm vi</button>
      </div>
    </div>`;
}

function exitReviewSession() {
  if (reviewSessionLive && !reviewAnswered && reviewLives > 0) {
    const confirmExit = window.confirm('Bạn có muốn dừng phiên ôn nhanh này không?');
    if (!confirmExit) return;
  }
  abandonReviewSession();
  showReviewSetup();
}

function renderReviewRangePicker() {
  showReviewSetup();
}

function escapeReviewHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeExampleMarkup(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/&lt;u&gt;/g, '<u>')
    .replace(/&lt;\/u&gt;/g, '</u>');
}

function playReviewMistakeAudio(text, button) {
  if (typeof speakText === 'function') {
    speakText(text, button, typeof SPEECH_RATE !== 'undefined' ? SPEECH_RATE : 0.85);
  }
}

function handleReviewMistakesKeydown(event) {
  if (event.key === 'Escape') {
    closeReviewMistakesModal();
  }
}

function closeReviewMistakesModal() {
  if (typeof stopSpeech === 'function') stopSpeech();
  const modal = document.getElementById('reviewMistakesModal');
  if (modal) modal.remove();
  document.removeEventListener('keydown', handleReviewMistakesKeydown);
  document.body.classList.remove('review-modal-open');
}

function practiceReviewMistakes() {
  if (!reviewMistakes || reviewMistakes.length === 0) return;
  const mistakeIds = new Set(reviewMistakes.map(m => m.id));
  const newPool = [];
  for (let i = 0; i < reviewWordPool.length; i++) {
    if (mistakeIds.has(reviewWordPool[i].id)) {
      newPool.push(i);
    }
  }
  for (let i = newPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newPool[i], newPool[j]] = [newPool[j], newPool[i]];
  }

  closeReviewMistakesModal();
  reviewPool = newPool;
  startReviewSession();
}

function openReviewMistakesModal() {
  if (!reviewMistakes || reviewMistakes.length === 0) return;
  closeReviewMistakesModal();

  const modal = document.createElement('div');
  modal.id = 'reviewMistakesModal';
  modal.className = 'review-mistakes-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Danh sách câu làm sai');

  const itemsHtml = reviewMistakes.map((m, idx) => {
    const levelDisplay = m.level ? m.level.toUpperCase() : '';
    const cleanExampleZh = (m.example_zh || '').replace(/<[^>]*>/g, '').trim();

    let exampleHtml = '';
    if (m.example_zh) {
      exampleHtml = `
        <div class="review-mistake-example">
          <div class="review-mistake-example-row">
            <span class="review-mistake-example-zh">${sanitizeExampleMarkup(m.example_zh)}</span>
            <button type="button" class="review-mistake-audio-btn review-mistake-audio-sm"
              data-speak-text="${escapeReviewHtml(cleanExampleZh)}"
              title="Phát âm câu ví dụ" aria-label="Phát âm câu ví dụ">🔊</button>
          </div>
          ${m.example_py ? `<div class="review-mistake-example-py">${sanitizeExampleMarkup(m.example_py)}</div>` : ''}
          ${m.example_vi ? `<div class="review-mistake-example-vi">${sanitizeExampleMarkup(m.example_vi)}</div>` : ''}
        </div>`;
    }

    const typeBadge = m.type === 'type' ? 'Gõ Pinyin' : 'Trắc nghiệm';

    return `
      <article class="review-mistake-card">
        <div class="review-mistake-card-top">
          <div class="review-mistake-head">
            <span class="review-mistake-num">#${idx + 1}</span>
            <span class="review-mistake-hanzi">${escapeReviewHtml(m.hanzi)}</span>
            <button type="button" class="review-mistake-audio-btn"
              data-speak-text="${escapeReviewHtml(m.hanzi)}"
              title="Phát âm ${escapeReviewHtml(m.hanzi)}" aria-label="Phát âm ${escapeReviewHtml(m.hanzi)}">🔊</button>
            <span class="review-mistake-pinyin">${escapeReviewHtml(m.pinyin)}</span>
          </div>
          <div class="review-mistake-badges">
            ${levelDisplay ? `<span class="review-mistake-level">${escapeReviewHtml(levelDisplay)}</span>` : ''}
            <span class="review-mistake-type">${escapeReviewHtml(typeBadge)}</span>
          </div>
        </div>

        <div class="review-mistake-meaning">${escapeReviewHtml(m.meaning)}</div>

        <div class="review-mistake-diff">
          <div class="review-diff-item review-diff-wrong">
            <span class="review-diff-lbl">❌ Bạn đã trả lời:</span>
            <strong class="review-diff-val">${escapeReviewHtml(m.userAnswer)}</strong>
          </div>
          <div class="review-diff-item review-diff-correct">
            <span class="review-diff-lbl">✔️ Đáp án đúng:</span>
            <strong class="review-diff-val">${escapeReviewHtml(m.expected)}</strong>
          </div>
        </div>

        ${exampleHtml}
      </article>`;
  }).join('');

  modal.innerHTML = `
    <div class="review-mistakes-dialog">
      <header class="review-mistakes-header">
        <div class="review-mistakes-header-text">
          <h3 class="review-mistakes-title">📋 Xem lại câu sai (${reviewMistakes.length})</h3>
          <p class="review-mistakes-subtitle">Các từ vựng bạn trả lời chưa đúng trong phiên ôn vừa qua</p>
        </div>
        <button type="button" class="review-mistakes-close" onclick="closeReviewMistakesModal()" aria-label="Đóng">✕</button>
      </header>

      <div class="review-mistakes-body">
        <div class="review-mistakes-list">
          ${itemsHtml}
        </div>
      </div>

      <footer class="review-mistakes-footer">
        <button type="button" class="review-mistakes-retry-btn" onclick="practiceReviewMistakes()">⚡ Luyện lại các câu sai này</button>
        <button type="button" class="review-mistakes-done-btn" onclick="closeReviewMistakesModal()">Đóng</button>
      </footer>
    </div>`;

  modal.addEventListener('click', e => {
    if (e.target === modal) closeReviewMistakesModal();
  });

  modal.querySelectorAll('.review-mistake-audio-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const textToSpeak = btn.getAttribute('data-speak-text');
      if (textToSpeak) {
        playReviewMistakeAudio(textToSpeak, btn);
      }
    });
  });

  document.body.appendChild(modal);
  document.body.classList.add('review-modal-open');
  document.addEventListener('keydown', handleReviewMistakesKeydown);
}

function openReviewBottomSheet() {
  const sheet = document.getElementById('reviewBottomSheet');
  if (!sheet) return;
  renderReviewBottomSheetPanes();
  if (typeof sheet.showModal === 'function') {
    try { sheet.showModal(); } catch (e) {}
  }
  sheet.classList.add('is-open');
  document.body.classList.add('review-sheet-open');
}

function closeReviewBottomSheet() {
  const sheet = document.getElementById('reviewBottomSheet');
  if (!sheet) return;
  sheet.classList.remove('is-open');
  document.body.classList.remove('review-sheet-open');
  setTimeout(() => {
    if (typeof sheet.close === 'function') {
      try { sheet.close(); } catch (e) {}
    }
  }, 200);
}

function switchReviewSheetTab(tab) {
  const forgotTab = document.getElementById('reviewSheetTabForgot');
  const weakTab = document.getElementById('reviewSheetTabWeak');
  const forgotPane = document.getElementById('reviewSheetForgotPane');
  const weakPane = document.getElementById('reviewSheetWeakPane');
  if (!forgotTab || !weakTab || !forgotPane || !weakPane) return;

  const isForgot = tab === 'forgot';
  forgotTab.classList.toggle('active', isForgot);
  weakTab.classList.toggle('active', !isForgot);
  forgotPane.style.display = isForgot ? 'block' : 'none';
  weakPane.style.display = isForgot ? 'none' : 'block';
}

function renderReviewBottomSheetPanes() {
  const weakListContainer = document.getElementById('reviewSheetWeakList');
  if (weakListContainer) {
    const list = typeof loadWeakWords === 'function' ? loadWeakWords() : [];
    if (!list.length) {
      weakListContainer.innerHTML = '<div class="review-sheet-empty">Chưa có từ khó nào được đánh dấu.</div>';
    } else {
      weakListContainer.innerHTML = list.map(w => {
        const hanziSafe = escapeReviewHtml(w.hanzi);
        const pinyinSafe = escapeReviewHtml(w.pinyin || '');
        const meaningSafe = escapeReviewHtml(w.meaning || '');
        const levelSafe = escapeReviewHtml(w.level || '');
        const levelPill = w.level ? (typeof formatWeakWordLevel === 'function' ? formatWeakWordLevel(w.level) : w.level.toUpperCase()) : '';
        return `
          <div class="review-sheet-row" data-hanzi="${hanziSafe}">
            <button type="button" class="review-sheet-row-main" onclick="openWordInLevel('${levelSafe}', '${escapeReviewHtml(w.id || w.hanzi)}', true); closeReviewBottomSheet();">
              <span class="review-sheet-hanzi" lang="zh-CN">${hanziSafe}</span>
              <span class="review-sheet-text">
                <span class="review-sheet-meta">
                  <span class="review-sheet-pinyin">${pinyinSafe}</span>
                  ${levelPill ? `<span class="review-sheet-pill">${escapeReviewHtml(levelPill)}</span>` : ''}
                </span>
                <span class="review-sheet-meaning" title="${meaningSafe}">${meaningSafe}</span>
              </span>
            </button>
            <button type="button" class="review-sheet-remove-btn" onclick="removeWeakWordFromSheet('${hanziSafe}')" aria-label="Bỏ đánh dấu ${hanziSafe}" title="Bỏ đánh dấu">✕</button>
          </div>
        `;
      }).join('');
    }
  }

  const forgotListContainer = document.getElementById('reviewSheetForgotList');
  const forgotActionsContainer = document.getElementById('reviewSheetForgotActions');
  if (forgotListContainer) {
    const hwForgottenEl = document.getElementById('hwForgotten');
    const existingList = hwForgottenEl ? hwForgottenEl.querySelector('.hw-forgot-list') : null;
    const existingBtn = hwForgottenEl ? hwForgottenEl.querySelector('.hw-primary-btn') : null;

    if (existingList && existingList.children.length > 0) {
      forgotListContainer.innerHTML = existingList.innerHTML;
      if (forgotActionsContainer && existingBtn) {
        forgotActionsContainer.innerHTML = '';
        const cloneBtn = existingBtn.cloneNode(true);
        cloneBtn.onclick = function() {
          existingBtn.click();
          closeReviewBottomSheet();
        };
        forgotActionsContainer.appendChild(cloneBtn);
      }
    } else {
      forgotListContainer.innerHTML = '<div class="review-sheet-empty">Hiện không có từ nào hay nhầm lẫn đang chờ ôn gấp!</div>';
      if (forgotActionsContainer) forgotActionsContainer.innerHTML = '';
    }
  }
}

function removeWeakWordFromSheet(hanzi) {
  if (typeof loadWeakWords === 'function' && typeof saveWeakWords === 'function') {
    const list = loadWeakWords().filter(w => w.hanzi !== hanzi);
    saveWeakWords(list);
    if (typeof renderWeakWordsList === 'function') renderWeakWordsList();
    if (typeof updateWeakWordToggleButton === 'function') updateWeakWordToggleButton();
    renderReviewBottomSheetPanes();
    updateReviewMobileAuxBadge();
  }
}

function updateReviewMobileAuxBadge() {
  const badge = document.getElementById('reviewMobileAuxLabel');
  if (!badge) return;
  const weakCount = typeof loadWeakWords === 'function' ? loadWeakWords().length : 0;
  const hwForgottenEl = document.getElementById('hwForgotten');
  const forgotItems = hwForgottenEl ? hwForgottenEl.querySelectorAll('.hw-forgot-row').length : 0;
  const total = weakCount + forgotItems;
  if (total > 0) {
    badge.textContent = `${forgotItems} từ cần ôn gấp • ${weakCount} từ khó`;
  } else {
    badge.textContent = 'Danh sách từ hay nhầm & từ khó';
  }
  const mobBadge = document.getElementById('mobNotebookBadge');
  if (mobBadge) {
    mobBadge.textContent = String(total);
    mobBadge.hidden = total === 0;
  }
}

document.addEventListener('click', (e) => {
  const sheet = document.getElementById('reviewBottomSheet');
  if (sheet && sheet.classList.contains('is-open') && e.target === sheet) {
    closeReviewBottomSheet();
  }
});
