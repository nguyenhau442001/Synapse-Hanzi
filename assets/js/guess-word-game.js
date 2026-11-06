// Guess-the-word (emoji) game: show an emoji, pick the matching Hanzi from 4 choices.
let guessWordBankData = null;
let guessWordOrder = [];
let guessWordIdx = 0;
let guessWordCurrentEntry = null;
let guessWordSolved = false;

async function ensureGuessWordBankLoaded() {
  if (guessWordBankData) return;
  const res = await fetch('database/vocabs/guess_word_bank.json?v=' + APP_VERSION);
  guessWordBankData = await res.json();
}

async function startGuessWordGame() {
  document.getElementById('guessWordOptions').innerHTML = '<div class="loading-text">Đang tải dữ liệu...</div>';

  await ensureGuessWordBankLoaded();
  guessWordOrder = shuffledCopy(Array.from({ length: guessWordBankData.length }, (_, i) => i));
  guessWordIdx = 0;
  loadNextGuessWordRound();
}

function loadNextGuessWordRound() {
  if (guessWordIdx >= guessWordOrder.length) {
    guessWordOrder = shuffledCopy(guessWordOrder);
    guessWordIdx = 0;
  }
  const entry = guessWordBankData[guessWordOrder[guessWordIdx]];
  guessWordCurrentEntry = entry;
  guessWordIdx++;
  guessWordSolved = false;

  const counterEl = document.getElementById('guessWordCounter');
  if (counterEl) {
    counterEl.textContent = `Câu ${guessWordIdx} / ${guessWordBankData.length}`;
  }
  const levelBadge = document.getElementById('guessWordLevelBadge');
  if (levelBadge) {
    levelBadge.textContent = (entry.source || 'HSK 1').toUpperCase();
  }

  const distractors = shuffledCopy(
    guessWordBankData.filter(w => w.hanzi !== entry.hanzi)
  ).slice(0, 3);
  const options = shuffledCopy([entry, ...distractors]);

  const frameEl = document.querySelector('.guess-word-clue-frame');
  const emojiEl = document.getElementById('guessWordEmoji');
  let illustration = null;
  if (typeof getWordIllustration === 'function') {
    illustration = getWordIllustration(entry);
  }

  if (frameEl) {
    if (illustration && illustration.type === 'img' && illustration.src) {
      frameEl.innerHTML = `<img src="${escapeHtml(illustration.src)}" alt="${escapeHtml(entry.hanzi)}" class="guess-word-illustration-img" style="width: 76px; height: 76px; object-fit: contain; border-radius: 12px;">`;
    } else if (illustration && illustration.type === 'svg' && illustration.svg) {
      frameEl.innerHTML = `<div class="guess-word-illustration-svg" style="width: 76px; height: 76px; display: flex; align-items: center; justify-content: center;">${illustration.svg}</div>`;
    } else {
      frameEl.innerHTML = `<span class="guess-word-emoji" id="guessWordEmoji" role="img" aria-label="Gợi ý hình ảnh">${escapeHtml(entry.emoji || '❓')}</span>`;
    }
  } else if (emojiEl) {
    emojiEl.textContent = entry.emoji;
  }

  const feedbackEl = document.getElementById('guessWordFeedback');
  if (feedbackEl) {
    feedbackEl.textContent = '';
    feedbackEl.className = 'guess-word-feedback';
  }

  const explanationEl = document.getElementById('guessWordExplanation');
  if (explanationEl) {
    explanationEl.hidden = true;
    explanationEl.innerHTML = '';
  }

  const nextBtn = document.getElementById('guessWordNextBtn');
  if (nextBtn) nextBtn.hidden = true;

  document.getElementById('guessWordOptions').innerHTML = options.map((opt, i) => `
    <button class="guess-word-option" type="button" onclick="pickGuessWordOption('${escapeHtml(opt.hanzi)}')" data-hanzi="${escapeHtml(opt.hanzi)}" data-index="${i}">
      <span class="option-key-badge">${i + 1}</span>
      <span class="option-hanzi">${escapeHtml(opt.hanzi)}</span>
    </button>
  `).join('');
}

function pickGuessWordOption(hanzi) {
  if (guessWordSolved) return;
  const entry = guessWordCurrentEntry;
  const feedbackEl = document.getElementById('guessWordFeedback');
  const isCorrect = hanzi === entry.hanzi;

  if (isCorrect) {
    guessWordSolved = true;
    if (feedbackEl) {
      feedbackEl.textContent = '🎉 Chính xác! Bạn đã chọn đúng từ vựng.';
      feedbackEl.className = 'guess-word-feedback correct';
    }

    const explanationEl = document.getElementById('guessWordExplanation');
    if (explanationEl) {
      explanationEl.innerHTML = `
        <div class="gwe-card">
          <div class="gwe-word-row">
            <strong class="gwe-hanzi">${escapeHtml(entry.hanzi)}</strong>
            <span class="gwe-pinyin">${escapeHtml(entry.pinyin || '')}</span>
            <button class="gwe-audio-btn speech-btn" type="button" onclick="speakGuessWord('${escapeHtml(entry.hanzi)}')" aria-label="Nghe phát âm" title="Nghe phát âm">🔊</button>
          </div>
          <div class="gwe-meaning"><strong>Nghĩa:</strong> ${escapeHtml(entry.meaning || '')}</div>
        </div>
      `;
      explanationEl.hidden = false;
    }

    const nextBtn = document.getElementById('guessWordNextBtn');
    if (nextBtn) {
      nextBtn.hidden = false;
      setTimeout(() => {
        try { nextBtn.focus(); } catch (_) {}
      }, 60);
    }
    document.querySelectorAll('.guess-word-option').forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.hanzi === entry.hanzi || btn.textContent.trim().includes(entry.hanzi)) {
        btn.classList.add('correct');
      }
    });

    speakGuessWord(entry.hanzi);
  } else {
    if (feedbackEl) {
      feedbackEl.textContent = '✗ Chưa đúng, hãy quan sát kỹ và thử lại!';
      feedbackEl.className = 'guess-word-feedback incorrect';
    }
    document.querySelectorAll('.guess-word-option').forEach(btn => {
      if (btn.dataset.hanzi === hanzi || btn.textContent.trim().includes(hanzi)) {
        btn.classList.add('incorrect');
      }
    });
  }
}

function speakGuessWord(text) {
  if (!text) return;
  const btn = document.querySelector('.gwe-audio-btn');
  if (typeof speakText === 'function') {
    speakText(text, btn, typeof SPEECH_RATE !== 'undefined' ? SPEECH_RATE : 0.85);
  }
}
window.speakGuessWord = speakGuessWord;

// Keyboard navigation for guess word game
document.addEventListener('keydown', (e) => {
  const screen = document.getElementById('screenGuessWord');
  if (!screen || screen.style.display === 'none') return;

  const nextBtn = document.getElementById('guessWordNextBtn');
  if (nextBtn && !nextBtn.hidden) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      loadNextGuessWordRound();
      return;
    }
  }

  if (!guessWordSolved && ['1', '2', '3', '4'].includes(e.key)) {
    const idx = parseInt(e.key, 10) - 1;
    const btns = document.querySelectorAll('.guess-word-option');
    if (btns[idx] && !btns[idx].disabled) {
      e.preventDefault();
      btns[idx].click();
    }
  }
});
