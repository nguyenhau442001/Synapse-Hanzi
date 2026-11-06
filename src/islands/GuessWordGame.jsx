// Guess-the-word (emoji) game: show an emoji, pick the matching Hanzi from 4 choices.
// Preact port of the former assets/js/guess-word-game.js. Renders the same markup inside
// #screenGuessWord (styled by assets/css/sentence-game.css). The legacy router keeps
// calling window.startGuessWordGame() when the tab opens.
import { render } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { signal } from '@preact/signals';

/* global APP_VERSION, SPEECH_RATE -- top-level consts of the classic scripts utils.js / state.js */

let bank = null;
let order = [];
let idx = 0;

// One signal for the whole round: { entry, options, number, total, wrong: Set, solved } or a loading flag.
const round = signal(null);
const loading = signal(false);

async function ensureBankLoaded() {
  if (bank) return;
  const res = await fetch('database/vocabs/guess_word_bank.json?v=' + APP_VERSION);
  bank = await res.json();
}

const shuffled = (list) => window.shuffledCopy(list);

export async function startGuessWordGame() {
  loading.value = true;
  await ensureBankLoaded();
  order = shuffled(Array.from({ length: bank.length }, (_, i) => i));
  idx = 0;
  loadNextGuessWordRound();
}

export function loadNextGuessWordRound() {
  if (idx >= order.length) {
    order = shuffled(order);
    idx = 0;
  }
  const entry = bank[order[idx]];
  idx++;
  const distractors = shuffled(bank.filter((w) => w.hanzi !== entry.hanzi)).slice(0, 3);
  const options = shuffled([entry, ...distractors]);
  loading.value = false;
  round.value = { entry, options, number: idx, total: bank.length, wrong: new Set(), solved: false };
}

export function speakGuessWord(text) {
  if (!text || typeof window.speakText !== 'function') return;
  const btn = document.querySelector('.gwe-audio-btn');
  window.speakText(text, btn, SPEECH_RATE);
}

export function pickGuessWordOption(hanzi) {
  const r = round.value;
  if (!r || r.solved) return;
  if (hanzi === r.entry.hanzi) {
    round.value = { ...r, solved: true };
    speakGuessWord(r.entry.hanzi);
  } else {
    round.value = { ...r, wrong: new Set(r.wrong).add(hanzi) };
  }
}

function ClueFrame({ entry }) {
  const illustration = typeof window.getWordIllustration === 'function' ? window.getWordIllustration(entry) : null;
  let clue;
  if (illustration && illustration.type === 'img' && illustration.src) {
    clue = <img src={illustration.src} alt={entry.hanzi} class="guess-word-illustration-img" style="width: 76px; height: 76px; object-fit: contain; border-radius: 12px;" />;
  } else if (illustration && illustration.type === 'svg' && illustration.svg) {
    clue = <div class="guess-word-illustration-svg" style="width: 76px; height: 76px; display: flex; align-items: center; justify-content: center;" dangerouslySetInnerHTML={{ __html: illustration.svg }} />;
  } else {
    clue = <span class="guess-word-emoji" id="guessWordEmoji" role="img" aria-label="Gợi ý hình ảnh">{entry ? entry.emoji || '❓' : ''}</span>;
  }
  return <div class="guess-word-clue-frame">{clue}</div>;
}

function Options({ r }) {
  if (loading.value || !r) {
    return (
      <div class="guess-word-options" id="guessWordOptions" role="group" aria-label="Các lựa chọn chữ Hán">
        {loading.value && <div class="loading-text">Đang tải dữ liệu...</div>}
      </div>
    );
  }
  return (
    <div class="guess-word-options" id="guessWordOptions" role="group" aria-label="Các lựa chọn chữ Hán">
      {r.options.map((opt, i) => {
        let cls = 'guess-word-option';
        if (r.wrong.has(opt.hanzi)) cls += ' incorrect';
        if (r.solved && opt.hanzi === r.entry.hanzi) cls += ' correct';
        return (
          // keyed by round so every round starts with fresh buttons, like the legacy innerHTML swap
          <button key={`${r.number}-${opt.hanzi}`} class={cls} type="button" disabled={r.solved}
            onClick={() => pickGuessWordOption(opt.hanzi)} data-hanzi={opt.hanzi} data-index={i}>
            <span class="option-key-badge">{i + 1}</span>{' '}
            <span class="option-hanzi">{opt.hanzi}</span>
          </button>
        );
      })}
    </div>
  );
}

function Feedback({ r }) {
  let text = '';
  let cls = 'guess-word-feedback';
  if (r && r.solved) {
    text = '🎉 Chính xác! Bạn đã chọn đúng từ vựng.';
    cls += ' correct';
  } else if (r && r.wrong.size) {
    text = '✗ Chưa đúng, hãy quan sát kỹ và thử lại!';
    cls += ' incorrect';
  }
  return <div class={cls} id="guessWordFeedback" role="status" aria-live="polite">{text}</div>;
}

function Explanation({ r }) {
  const solved = r && r.solved;
  return (
    <div class="guess-word-explanation" id="guessWordExplanation" hidden={!solved}>
      {solved && (
        <div class="gwe-card">
          <div class="gwe-word-row">
            <strong class="gwe-hanzi">{r.entry.hanzi}</strong>{' '}
            <span class="gwe-pinyin">{r.entry.pinyin || ''}</span>{' '}
            <button class="gwe-audio-btn speech-btn" type="button" onClick={() => speakGuessWord(r.entry.hanzi)} aria-label="Nghe phát âm" title="Nghe phát âm">🔊</button>
          </div>
          <div class="gwe-meaning"><strong>Nghĩa:</strong> {r.entry.meaning || ''}</div>
        </div>
      )}
    </div>
  );
}

export function GuessWordGame() {
  const r = round.value;
  const nextRef = useRef(null);
  const solved = Boolean(r && r.solved);

  useEffect(() => {
    if (!solved) return undefined;
    const t = setTimeout(() => { try { nextRef.current.focus(); } catch (_) { /* hidden */ } }, 60);
    return () => clearTimeout(t);
  }, [solved, r && r.number]);

  return (
    <div class="guess-word-game">
      <header class="guess-word-header">
        <div class="guess-word-header-main">
          <div class="guess-word-title-group">
            <h2 class="guess-word-title">🎨 Đuổi hình bắt chữ</h2>
            <span class="guess-word-level-badge" id="guessWordLevelBadge">{r ? (r.entry.source || 'HSK 1').toUpperCase() : 'HSK 1'}</span>
          </div>
          <div class="guess-word-meta">
            <span class="guess-word-counter" id="guessWordCounter">{r ? `Câu ${r.number} / ${r.total}` : 'Đang tải...'}</span>
          </div>
        </div>
      </header>

      <section class="guess-word-card" aria-label="Bảng câu hỏi đuổi hình bắt chữ">
        <div class="guess-word-prompt-box">
          <div class="guess-word-prompt-label">Gợi ý hình ảnh</div>
          <ClueFrame entry={r && r.entry} />
          <p class="guess-word-question-text">Chọn từ chữ Hán phù hợp nhất với hình ảnh trên:</p>
        </div>

        <Options r={r} />
        <Feedback r={r} />
        <Explanation r={r} />

        <div class="guess-word-actions">
          <button ref={nextRef} type="button" class="game-next-btn guess-word-next-btn" id="guessWordNextBtn" onClick={loadNextGuessWordRound} hidden={!solved}>
            <span>Câu tiếp theo</span>{' '}
            <span class="next-btn-arrow">→</span>
          </button>
        </div>

        <div class="guess-word-hints-footer">
          <span class="guess-word-hint-item"><kbd>1</kbd>–<kbd>4</kbd> Chọn đáp án</span>{' '}
          <span class="guess-word-hint-item"><kbd>Enter</kbd> hoặc <kbd>Space</kbd> Sang câu tiếp</span>
        </div>
      </section>
    </div>
  );
}

export function mountGuessWordGame() {
  const screen = document.getElementById('screenGuessWord');
  if (!screen) return;
  render(<GuessWordGame />, screen);

  // 1–4 pick an answer; Enter / Space / → go to the next round once solved.
  document.addEventListener('keydown', (e) => {
    if (screen.style.display === 'none') return;
    const r = round.value;
    if (!r) return;
    if (r.solved) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        loadNextGuessWordRound();
      }
      return;
    }
    if (['1', '2', '3', '4'].includes(e.key)) {
      const opt = r.options[parseInt(e.key, 10) - 1];
      if (opt) {
        e.preventDefault();
        pickGuessWordOption(opt.hanzi);
      }
    }
  });

  window.startGuessWordGame = startGuessWordGame;
  window.loadNextGuessWordRound = loadNextGuessWordRound;
  window.pickGuessWordOption = pickGuessWordOption;
  window.speakGuessWord = speakGuessWord;
}
