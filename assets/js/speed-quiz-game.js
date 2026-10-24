// Fill-in-the-blank quiz: a Chinese sentence is missing one word, pick the correct word before time runs out.
const SPEED_QUIZ_TIME_LIMIT = 8;
const SPEED_QUIZ_BASE_SCORE = 100;
const SPEED_QUIZ_STORAGE_KEY = 'hsk_speed_quiz_best';

let speedQuizBankData = null;
let speedQuizOrder = [];
let speedQuizIdx = 0;
let speedQuizCurrentRound = null;
let speedQuizSolved = false;
let speedQuizScore = 0;
let speedQuizStreak = 0;
let speedQuizBest = 0;
let speedQuizTimeLeft = SPEED_QUIZ_TIME_LIMIT;
let speedQuizTimerId = null;
let speedQuizRoundLimit = 0;
let speedQuizLastUserChoice = null;
let speedQuizVocabMap = null;
let speedQuizVocabByLength = new Map();

async function ensureSpeedQuizBankLoaded() {
  if (speedQuizBankData) return;
  const res = await fetch('database/vocabs/sentence_bank.json');
  speedQuizBankData = (await res.json()).filter(s => s.zh_tokens && s.zh_tokens.length >= 2);
}

function shuffleSpeedQuizArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function ensureVocabMapLoaded() {
  if (speedQuizVocabMap && speedQuizVocabMap.size > 0) return speedQuizVocabMap;
  speedQuizVocabMap = new Map();
  speedQuizVocabByLength = new Map();

  const addWord = (w) => {
    if (!w || !w.hanzi) return;
    const hanzi = String(w.hanzi).trim();
    if (!hanzi) return;
    if (!speedQuizVocabMap.has(hanzi)) {
      const item = {
        hanzi,
        pinyin: w.pinyin || '',
        meaning: w.meaning || '',
        level: w.level || ''
      };
      speedQuizVocabMap.set(hanzi, item);
      const len = Array.from(hanzi).length;
      if (!speedQuizVocabByLength.has(len)) {
        speedQuizVocabByLength.set(len, []);
      }
      speedQuizVocabByLength.get(len).push(item);
    }
  };

  if (window.sidebarSearchIndex && window.sidebarSearchIndex.length > 0) {
    for (const w of window.sidebarSearchIndex) {
      addWord(w);
    }
  }

  if (typeof buildSidebarSearchIndex === 'function') {
    try {
      const list = await buildSidebarSearchIndex();
      if (Array.isArray(list)) {
        for (const w of list) {
          addWord(w);
        }
      }
    } catch (_) {}
  }

  // Pre-index common words from sentence bank tokens as fallback
  if (speedQuizBankData) {
    for (const s of speedQuizBankData) {
      if (Array.isArray(s.zh_tokens) && Array.isArray(s.pinyin_tokens)) {
        for (let i = 0; i < s.zh_tokens.length; i++) {
          const t = s.zh_tokens[i];
          const py = s.pinyin_tokens[i] || '';
          if (t && !speedQuizVocabMap.has(t)) {
            addWord({ hanzi: t, pinyin: py, meaning: '' });
          }
        }
      }
    }
  }

  return speedQuizVocabMap;
}

function getWordInfoSync(hanzi) {
  if (!hanzi) return null;
  if (speedQuizVocabMap && speedQuizVocabMap.has(hanzi)) {
    const item = speedQuizVocabMap.get(hanzi);
    if (item && item.meaning) return item;
  }
  if (window.sidebarSearchIndex) {
    const item = window.sidebarSearchIndex.find(w => w.hanzi === hanzi);
    if (item && item.meaning) return { pinyin: item.pinyin, meaning: item.meaning, level: item.level };
  }
  // Try sub-word decomposition for compounds (e.g. 采取行动 -> 采取 + 行动)
  if (hanzi.length >= 2) {
    for (let splitIdx = 1; splitIdx < hanzi.length; splitIdx++) {
      const left = hanzi.slice(0, splitIdx);
      const right = hanzi.slice(splitIdx);
      const leftInfo = getWordInfoSync(left);
      const rightInfo = getWordInfoSync(right);
      if (leftInfo && leftInfo.meaning && rightInfo && rightInfo.meaning) {
        return {
          pinyin: [leftInfo.pinyin, rightInfo.pinyin].filter(Boolean).join(' '),
          meaning: `${leftInfo.meaning} + ${rightInfo.meaning}`,
          level: leftInfo.level || rightInfo.level || ''
        };
      }
    }
  }
  // If in sentence bank, find first context sentence
  if (speedQuizBankData) {
    const match = speedQuizBankData.find(s => s.zh_tokens && s.zh_tokens.includes(hanzi));
    if (match) {
      const tIdx = match.zh_tokens.indexOf(hanzi);
      const py = (match.pinyin_tokens && match.pinyin_tokens[tIdx]) || '';
      return { pinyin: py, meaning: `Từ trong câu: "${match.meaning || match.sentence_zh}"`, level: match.level || '' };
    }
  }
  return { pinyin: '', meaning: 'Từ vựng tiếng Trung', level: '' };
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function highlightInSentence(sentenceZh, answer) {
  if (!sentenceZh || !answer) return escapeHtml(sentenceZh || '');
  const escaped = escapeHtml(sentenceZh);
  const escAns = escapeHtml(answer);
  return escaped.replace(new RegExp(escAns, 'g'), `<mark class="sqe-highlight">${escAns}</mark>`);
}

function highlightInPinyin(sentencePy, answerPy) {
  if (!sentencePy) return '';
  const escaped = escapeHtml(sentencePy);
  if (!answerPy) return escaped;
  const escPy = escapeHtml(answerPy).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escPy}\\b|${escPy}`, 'i');
  return escaped.replace(regex, match => `<mark class="sqe-highlight">${match}</mark>`);
}

async function startSpeedQuizGame(options = {}) {
  speedQuizRoundLimit = Number(options.roundLimit) > 0 ? Number(options.roundLimit) : 0;
  const optionsEl = document.getElementById('speedQuizOptions');
  if (optionsEl) optionsEl.innerHTML = '<div class="loading-text">Đang tải thử thách tốc độ...</div>';

  await Promise.all([ensureSpeedQuizBankLoaded(), ensureVocabMapLoaded()]);

  speedQuizOrder = shuffleSpeedQuizArray(Array.from({ length: speedQuizBankData.length }, (_, i) => i));
  speedQuizIdx = 0;
  speedQuizScore = 0;
  speedQuizStreak = 0;
  speedQuizBest = Number(localStorage.getItem(SPEED_QUIZ_STORAGE_KEY) || 0);
  updateSpeedQuizScoreboard();
  loadNextSpeedQuizRound();
}

function updateSpeedQuizScoreboard() {
  const scoreEl = document.getElementById('speedQuizScore');
  const streakEl = document.getElementById('speedQuizStreak');
  const bestEl = document.getElementById('speedQuizBest');
  if (scoreEl) scoreEl.textContent = `Điểm: ${speedQuizScore}`;
  if (streakEl) streakEl.textContent = speedQuizStreak > 1 ? `🔥 x${speedQuizStreak}` : '';
  if (bestEl) bestEl.textContent = `Kỷ lục: ${speedQuizBest}`;
}

function buildSpeedQuizRound(sentence) {
  const blankIdx = 1 + Math.floor(Math.random() * (sentence.zh_tokens.length - 1));
  const answer = sentence.zh_tokens[blankIdx];
  const displayTokens = sentence.zh_tokens.slice();
  
  // Create stylized blank with clear visual contrast
  const htmlTokens = displayTokens.map((tok, idx) => {
    if (idx === blankIdx) {
      const gapLength = Math.max(2, Array.from(String(answer)).length * 2);
      return `<span class="sq-blank-marker" aria-label="Chỗ trống">${'＿'.repeat(Math.min(gapLength, 4))}</span>`;
    }
    return escapeHtml(tok);
  });

  return {
    sentence,
    answer,
    blankIdx,
    sentenceText: displayTokens.join(''),
    displayHtml: htmlTokens.join('')
  };
}

function loadNextSpeedQuizRound() {
  clearInterval(speedQuizTimerId);
  closeSpeedQuizExplanationModal();

  if (speedQuizRoundLimit && speedQuizIdx >= speedQuizRoundLimit) {
    document.getElementById('speedQuizWord').textContent = 'Hoàn thành thử thách!';
    document.getElementById('speedQuizMeaning').textContent = `Bạn đã hoàn thành ${speedQuizRoundLimit} câu trắc nghiệm tốc độ.`;
    document.getElementById('speedQuizOptions').replaceChildren();
    const fb = document.getElementById('speedQuizFeedback');
    if (fb) {
      fb.innerHTML = `<span class="sq-fb-icon">🎉</span> <span class="sq-fb-text">Tổng điểm đạt được: <strong>${speedQuizScore}</strong></span>`;
      fb.className = 'speed-quiz-feedback correct';
    }
    const nextBtn = document.getElementById('speedQuizNextBtn');
    if (nextBtn) nextBtn.hidden = true;
    const explainBtn = document.getElementById('speedQuizExplainBtn');
    if (explainBtn) explainBtn.hidden = true;
    speedQuizRoundLimit = 0;
    return;
  }

  if (speedQuizIdx >= speedQuizOrder.length) {
    speedQuizOrder = shuffleSpeedQuizArray(speedQuizOrder);
    speedQuizIdx = 0;
  }

  const sentence = speedQuizBankData[speedQuizOrder[speedQuizIdx]];
  speedQuizIdx++;
  const round = buildSpeedQuizRound(sentence);
  speedQuizCurrentRound = round;
  speedQuizSolved = false;
  speedQuizLastUserChoice = null;
  speedQuizTimeLeft = SPEED_QUIZ_TIME_LIMIT;

  const answer = round.answer;
  const answerLen = Array.from(answer).length;
  const distractors = [];

  // 1. If sentence has pre-configured distractors matching length, prioritize them
  if (Array.isArray(sentence.distractors) && sentence.distractors.length > 0) {
    for (const d of sentence.distractors) {
      if (d && d !== answer && !distractors.includes(d) && Math.abs(Array.from(d).length - answerLen) <= 1) {
        distractors.push(d);
        if (distractors.length === 3) break;
      }
    }
  }

  // 2. Pick from speedQuizVocabByLength with exact matching character length and valid definitions
  const poolExact = speedQuizVocabByLength.get(answerLen) || [];
  if (poolExact.length > 0 && distractors.length < 3) {
    const shuffled = shuffleSpeedQuizArray(poolExact);
    for (const item of shuffled) {
      const w = item.hanzi;
      if (w !== answer && !distractors.includes(w) && item.meaning) {
        distractors.push(w);
        if (distractors.length === 3) break;
      }
    }
  }

  // 3. Fallback to similar length words (+/- 1 character)
  if (distractors.length < 3) {
    const poolAlt = (speedQuizVocabByLength.get(Math.max(1, answerLen - 1)) || [])
      .concat(speedQuizVocabByLength.get(answerLen + 1) || []);
    const shuffled = shuffleSpeedQuizArray(poolAlt);
    for (const item of shuffled) {
      const w = item.hanzi;
      if (w !== answer && !distractors.includes(w) && item.meaning) {
        distractors.push(w);
        if (distractors.length === 3) break;
      }
    }
  }

  // 4. Absolute safety fallback
  if (distractors.length < 3) {
    const generalPool = shuffleSpeedQuizArray(
      speedQuizBankData.filter(s => s !== sentence).flatMap(s => s.zh_tokens)
    );
    for (const tok of generalPool) {
      if (tok && tok !== answer && !distractors.includes(tok)) {
        distractors.push(tok);
        if (distractors.length === 3) break;
      }
    }
  }

  const options = shuffleSpeedQuizArray([answer, ...distractors]);
  round.options = options;

  document.getElementById('speedQuizWord').innerHTML = round.displayHtml;
  document.getElementById('speedQuizMeaning').textContent = sentence.meaning || '';
  
  const feedbackEl = document.getElementById('speedQuizFeedback');
  if (feedbackEl) {
    feedbackEl.textContent = '';
    feedbackEl.className = 'speed-quiz-feedback';
  }

  const explainBtn = document.getElementById('speedQuizExplainBtn');
  if (explainBtn) explainBtn.hidden = true;

  const nextBtn = document.getElementById('speedQuizNextBtn');
  if (nextBtn) nextBtn.hidden = true;

  document.getElementById('speedQuizOptions').innerHTML = options.map((opt, i) => `
    <button class="speed-quiz-option" type="button" onclick="pickSpeedQuizOption('${escapeHtml(opt)}')" data-word="${escapeHtml(opt)}" data-index="${i}">
      <span class="option-key-badge">${i + 1}</span>
      <span class="option-hanzi">${escapeHtml(opt)}</span>
      <span class="option-status-icon" aria-hidden="true"></span>
    </button>
  `).join('');

  updateSpeedQuizTimerBar();
  speedQuizTimerId = setInterval(() => {
    speedQuizTimeLeft -= 0.1;
    if (speedQuizTimeLeft <= 0) {
      speedQuizTimeLeft = 0;
      updateSpeedQuizTimerBar();
      handleSpeedQuizTimeout();
      return;
    }
    updateSpeedQuizTimerBar();
  }, 100);
}

function updateSpeedQuizTimerBar() {
  const pct = Math.max(0, (speedQuizTimeLeft / SPEED_QUIZ_TIME_LIMIT) * 100);
  const barEl = document.getElementById('speedQuizTimerBar');
  if (!barEl) return;
  barEl.style.width = `${pct}%`;
  barEl.classList.toggle('low', pct <= 30);
}

function handleSpeedQuizTimeout() {
  if (speedQuizSolved) return;
  speedQuizSolved = true;
  clearInterval(speedQuizTimerId);
  speedQuizStreak = 0;
  speedQuizLastUserChoice = null;

  const round = speedQuizCurrentRound;
  const feedbackEl = document.getElementById('speedQuizFeedback');
  const explainBtn = document.getElementById('speedQuizExplainBtn');
  const nextBtn = document.getElementById('speedQuizNextBtn');

  if (feedbackEl) {
    feedbackEl.innerHTML = `<span class="sq-fb-icon">⏱</span> <span class="sq-fb-text">Hết giờ! Đáp án đúng: <strong>${escapeHtml(round.answer)}</strong></span>`;
    feedbackEl.className = 'speed-quiz-feedback timeout';
  }

  document.querySelectorAll('.speed-quiz-option').forEach(btn => {
    btn.disabled = true;
    const optWord = btn.dataset.word;
    const statusIcon = btn.querySelector('.option-status-icon');
    if (optWord === round.answer) {
      btn.classList.add('correct');
      if (statusIcon) statusIcon.textContent = '✓';
    } else {
      btn.classList.add('is-dimmed');
    }
  });

  updateSpeedQuizScoreboard();

  if (explainBtn) explainBtn.hidden = false;
  if (nextBtn) {
    nextBtn.hidden = false;
    setTimeout(() => {
      try { nextBtn.focus(); } catch (_) {}
    }, 50);
  }
}

function pickSpeedQuizOption(word) {
  if (speedQuizSolved) return;
  speedQuizSolved = true;
  clearInterval(speedQuizTimerId);

  const round = speedQuizCurrentRound;
  speedQuizLastUserChoice = word;
  const isCorrect = word === round.answer;
  const feedbackEl = document.getElementById('speedQuizFeedback');
  const explainBtn = document.getElementById('speedQuizExplainBtn');
  const nextBtn = document.getElementById('speedQuizNextBtn');

  if (isCorrect) {
    speedQuizStreak++;
    const speedBonus = Math.round((speedQuizTimeLeft / SPEED_QUIZ_TIME_LIMIT) * SPEED_QUIZ_BASE_SCORE);
    const streakBonus = Math.min(speedQuizStreak - 1, 5) * 10;
    const earned = SPEED_QUIZ_BASE_SCORE / 2 + speedBonus + streakBonus;
    speedQuizScore += earned;
    if (speedQuizScore > speedQuizBest) {
      speedQuizBest = speedQuizScore;
      localStorage.setItem(SPEED_QUIZ_STORAGE_KEY, String(speedQuizBest));
    }
    if (feedbackEl) {
      feedbackEl.innerHTML = `<span class="sq-fb-icon">✓</span> <span class="sq-fb-text">Chính xác! <strong>+${earned} điểm</strong></span>`;
      feedbackEl.className = 'speed-quiz-feedback correct';
    }
  } else {
    speedQuizStreak = 0;
    if (feedbackEl) {
      feedbackEl.innerHTML = `<span class="sq-fb-icon">✗</span> <span class="sq-fb-text">Chưa chính xác! Đáp án đúng: <strong>${escapeHtml(round.answer)}</strong></span>`;
      feedbackEl.className = 'speed-quiz-feedback incorrect';
    }
  }

  document.querySelectorAll('.speed-quiz-option').forEach(btn => {
    btn.disabled = true;
    const optWord = btn.dataset.word;
    const statusIcon = btn.querySelector('.option-status-icon');
    if (optWord === round.answer) {
      btn.classList.add('correct');
      if (statusIcon) statusIcon.textContent = '✓';
    } else if (optWord === word && !isCorrect) {
      btn.classList.add('incorrect');
      if (statusIcon) statusIcon.textContent = '✕';
    } else {
      btn.classList.add('is-dimmed');
    }
  });

  updateSpeedQuizScoreboard();

  if (explainBtn) explainBtn.hidden = false;
  if (nextBtn) {
    nextBtn.hidden = false;
    setTimeout(() => {
      try { nextBtn.focus(); } catch (_) {}
    }, 50);
  }
}

function openSpeedQuizExplanationModal() {
  const round = speedQuizCurrentRound;
  if (!round) return;

  const modal = document.getElementById('speedQuizExplainModal');
  const modalBody = document.getElementById('speedQuizModalBody');
  if (!modal || !modalBody) return;

  const sentence = round.sentence;
  const answer = round.answer;
  const answerInfo = getWordInfoSync(answer) || {};
  const answerPinyin = answerInfo.pinyin || (sentence.pinyin_tokens && sentence.pinyin_tokens[round.blankIdx]) || '';
  const answerMeaning = answerInfo.meaning || 'khớp nghĩa trong ngữ cảnh câu';

  const fullZh = sentence.sentence_zh || sentence.zh_tokens.join('');
  const fullPy = sentence.sentence_py || (sentence.pinyin_tokens ? sentence.pinyin_tokens.join(' ') : '');
  const grammarPoint = sentence.grammar_point || '';
  const options = round.options || [];

  const isCorrect = speedQuizLastUserChoice === answer;
  const isTimeout = speedQuizLastUserChoice == null;

  modalBody.innerHTML = `
    <div class="sqm-status-bar ${isCorrect ? 'is-correct' : isTimeout ? 'is-timeout' : 'is-incorrect'}">
      <div class="sqm-status-left">
        <span class="sqm-status-icon">${isCorrect ? '✓' : isTimeout ? '⏱' : '✗'}</span>
        <span class="sqm-status-label">${isCorrect ? 'Bạn đã trả lời chính xác!' : isTimeout ? 'Hết thời gian làm bài!' : 'Chưa chính xác!'}</span>
      </div>
      <button type="button" class="sqm-audio-btn" onclick="speakSpeedQuizSentence()" title="Nghe câu hoàn chỉnh" aria-label="Nghe đọc câu hoàn chỉnh">
        <span aria-hidden="true">🔊</span>
        <span>Nghe phát âm</span>
      </button>
    </div>

    <div class="sqm-section sqm-sentence-card">
      <div class="sqm-sentence-zh">${highlightInSentence(fullZh, answer)}</div>
      ${fullPy ? `<div class="sqm-sentence-py">${highlightInPinyin(fullPy, answerPinyin)}</div>` : ''}
      <div class="sqm-sentence-vi">Dịch nghĩa: “${escapeHtml(sentence.meaning || '')}”</div>
    </div>

    <div class="sqm-section sqm-analysis-card">
      <h4 class="sqm-section-heading">
        <span class="sqm-heading-icon">💡</span>
        <span>Tại sao chọn "${escapeHtml(answer)}"?</span>
      </h4>
      <div class="sqm-analysis-content">
        <p class="sqm-reason-line">
          • Vị trí chỗ trống cần điền từ <strong>${escapeHtml(answer)}</strong> ${answerPinyin ? `(<em>${escapeHtml(answerPinyin)}</em>)` : ''} mang nghĩa: <strong>${escapeHtml(answerMeaning)}</strong> để câu hoàn chỉnh và chuẩn ngữ nghĩa.
        </p>
        ${grammarPoint ? `
          <p class="sqm-grammar-line">
            • <strong>Cấu trúc ngữ pháp:</strong> ${escapeHtml(grammarPoint)}.
          </p>
        ` : ''}
      </div>
    </div>

    <div class="sqm-section sqm-options-card">
      <h4 class="sqm-section-heading">
        <span class="sqm-heading-icon">📚</span>
        <span>Nghĩa của 4 phương án lựa chọn:</span>
      </h4>
      <div class="sqm-options-grid">
        ${options.map(opt => {
          const isAns = opt === answer;
          const isUserPick = opt === speedQuizLastUserChoice && !isAns;
          const optInfo = getWordInfoSync(opt) || {};
          const optPy = optInfo.pinyin || '';
          let optMean = optInfo.meaning || '';
          if (!optMean || optMean === '—') {
            optMean = isAns ? answerMeaning : 'Từ vựng tiếng Trung';
          }
          return `
            <div class="sqm-option-row ${isAns ? 'is-correct-row' : isUserPick ? 'is-user-wrong-row' : ''}">
              <div class="sqm-option-badge">
                ${isAns ? '<span class="badge-tag correct-tag">✓ Đúng</span>' : isUserPick ? '<span class="badge-tag wrong-tag">✗ Bạn chọn</span>' : '<span class="badge-tag neutral-tag">•</span>'}
              </div>
              <div class="sqm-option-main">
                <strong class="sqm-option-hanzi">${escapeHtml(opt)}</strong>
                ${optPy ? `<span class="sqm-option-pinyin">${escapeHtml(optPy)}</span>` : ''}
              </div>
              <div class="sqm-option-meaning" title="${escapeHtml(optMean)}">${escapeHtml(optMean)}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (typeof modal.showModal === 'function') {
    try {
      modal.showModal();
    } catch (_) {
      modal.setAttribute('open', '');
    }
  } else {
    modal.setAttribute('open', '');
  }
}

function closeSpeedQuizExplanationModal() {
  const modal = document.getElementById('speedQuizExplainModal');
  if (!modal) return;
  if (typeof modal.close === 'function') {
    try { modal.close(); } catch (_) { modal.removeAttribute('open'); }
  } else {
    modal.removeAttribute('open');
  }
}

function speakSpeedQuizSentence() {
  if (!speedQuizCurrentRound || !speedQuizCurrentRound.sentence) return;
  const sentence = speedQuizCurrentRound.sentence;
  const text = sentence.sentence_zh || sentence.zh_tokens.join('');
  const btn = document.querySelector('.sqm-audio-btn');
  if (typeof speakText === 'function') {
    const rate = typeof exampleSpeechSpeed !== 'undefined' ? exampleSpeechSpeed : 0.8;
    speakText(text, btn, rate);
  }
}

function exitSpeedQuizGame() {
  clearInterval(speedQuizTimerId);
  speedQuizSolved = true;
  closeSpeedQuizExplanationModal();
  if (typeof setPrimaryTab === 'function') {
    setPrimaryTab('vocab');
  }
  if (typeof goBackToPicker === 'function') {
    goBackToPicker();
  }
}

window.startSpeedQuizGame = startSpeedQuizGame;
window.loadNextSpeedQuizRound = loadNextSpeedQuizRound;
window.pickSpeedQuizOption = pickSpeedQuizOption;
window.openSpeedQuizExplanationModal = openSpeedQuizExplanationModal;
window.closeSpeedQuizExplanationModal = closeSpeedQuizExplanationModal;
window.speakSpeedQuizSentence = speakSpeedQuizSentence;
window.exitSpeedQuizGame = exitSpeedQuizGame;
window.giveUpSpeedQuizRound = exitSpeedQuizGame;

// Keyboard navigation for speed quiz game
document.addEventListener('keydown', (e) => {
  const screen = document.getElementById('screenSpeedQuiz');
  if (!screen || screen.style.display === 'none') return;

  const modal = document.getElementById('speedQuizExplainModal');
  const isModalOpen = modal && modal.hasAttribute('open');

  if (isModalOpen) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSpeedQuizExplanationModal();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      closeSpeedQuizExplanationModal();
      loadNextSpeedQuizRound();
      return;
    }
    return;
  }

  const nextBtn = document.getElementById('speedQuizNextBtn');
  if (nextBtn && !nextBtn.hidden) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      loadNextSpeedQuizRound();
      return;
    }
    if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      openSpeedQuizExplanationModal();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      exitSpeedQuizGame();
      return;
    }
  }

  if (!speedQuizSolved) {
    if (e.key === 'Escape') {
      e.preventDefault();
      exitSpeedQuizGame();
      return;
    }
    if (['1', '2', '3', '4'].includes(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      const btns = document.querySelectorAll('.speed-quiz-option');
      if (btns[idx] && !btns[idx].disabled) {
        e.preventDefault();
        btns[idx].click();
      }
    }
  }
});
