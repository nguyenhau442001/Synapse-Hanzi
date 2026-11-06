// Fill-in-the-blank quiz: a Chinese sentence is missing one word, pick the correct word before time runs out.
// Preact port of the former assets/js/speed-quiz-game.js. Renders the same markup inside
// #screenSpeedQuiz (styled by assets/css/sentence-game.css); the legacy router keeps calling
// window.startSpeedQuizGame(options) when the tab opens.
import { render } from 'preact';
import { signal } from '@preact/signals';

/* global exampleSpeechSpeed -- top-level `let` of the classic script state.js */

const TIME_LIMIT = 8;
const BASE_SCORE = 100;
const STORAGE_KEY = 'hsk_speed_quiz_best';

let bankData = null;
let order = [];
let idx = 0;
let roundLimit = 0;
let timerId = null;
let vocabMap = null;
let vocabByLength = new Map();

// UI state. `round` = { sentence, answer, blankIdx, options }.
const loading = signal(false);
const round = signal(null);
const solved = signal(false);
const lastChoice = signal(null);        // the user's pick for the current round (null = timeout)
const feedback = signal(null);          // { kind, icon, body }
const finished = signal(false);         // round-limited session is over
const score = signal(0);
const streak = signal(0);
const best = signal(0);
const timeLeft = signal(null);          // null until the first round starts
const modalOpen = signal(false);
const modalRound = signal(null);        // round shown in the modal body; kept after closing, like the legacy innerHTML

const shuffled = (list) => window.shuffledCopy(list);

async function ensureBankLoaded() {
  if (bankData) return;
  const res = await fetch('database/vocabs/sentence_bank.json');
  bankData = (await res.json()).filter((s) => s.zh_tokens && s.zh_tokens.length >= 2);
}

async function ensureVocabMapLoaded() {
  if (vocabMap && vocabMap.size > 0) return vocabMap;
  vocabMap = new Map();
  vocabByLength = new Map();

  const addWord = (w) => {
    if (!w || !w.hanzi) return;
    const hanzi = String(w.hanzi).trim();
    if (!hanzi || vocabMap.has(hanzi)) return;
    const item = { hanzi, pinyin: w.pinyin || '', meaning: w.meaning || '', level: w.level || '' };
    vocabMap.set(hanzi, item);
    const len = Array.from(hanzi).length;
    if (!vocabByLength.has(len)) vocabByLength.set(len, []);
    vocabByLength.get(len).push(item);
  };

  if (window.sidebarSearchIndex && window.sidebarSearchIndex.length > 0) {
    for (const w of window.sidebarSearchIndex) addWord(w);
  }
  if (typeof window.buildSidebarSearchIndex === 'function') {
    try {
      const list = await window.buildSidebarSearchIndex();
      if (Array.isArray(list)) for (const w of list) addWord(w);
    } catch (_) { /* index is optional */ }
  }
  // Pre-index common words from sentence bank tokens as fallback
  if (bankData) {
    for (const s of bankData) {
      if (Array.isArray(s.zh_tokens) && Array.isArray(s.pinyin_tokens)) {
        s.zh_tokens.forEach((t, i) => {
          if (t && !vocabMap.has(t)) addWord({ hanzi: t, pinyin: s.pinyin_tokens[i] || '', meaning: '' });
        });
      }
    }
  }
  return vocabMap;
}

function getWordInfoSync(hanzi) {
  if (!hanzi) return null;
  if (vocabMap && vocabMap.has(hanzi)) {
    const item = vocabMap.get(hanzi);
    if (item && item.meaning) return item;
  }
  if (window.sidebarSearchIndex) {
    const item = window.sidebarSearchIndex.find((w) => w.hanzi === hanzi);
    if (item && item.meaning) return { pinyin: item.pinyin, meaning: item.meaning, level: item.level };
  }
  // Try sub-word decomposition for compounds (e.g. 采取行动 -> 采取 + 行动)
  if (hanzi.length >= 2) {
    for (let splitIdx = 1; splitIdx < hanzi.length; splitIdx++) {
      const leftInfo = getWordInfoSync(hanzi.slice(0, splitIdx));
      const rightInfo = getWordInfoSync(hanzi.slice(splitIdx));
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
  if (bankData) {
    const match = bankData.find((s) => s.zh_tokens && s.zh_tokens.includes(hanzi));
    if (match) {
      const py = (match.pinyin_tokens && match.pinyin_tokens[match.zh_tokens.indexOf(hanzi)]) || '';
      return { pinyin: py, meaning: `Từ trong câu: "${match.meaning || match.sentence_zh}"`, level: match.level || '' };
    }
  }
  return { pinyin: '', meaning: 'Từ vựng tiếng Trung', level: '' };
}

const mark = (text, key) => <mark class="sqe-highlight" key={key}>{text}</mark>;

// Every occurrence of the answer in the sentence is highlighted.
function highlightInSentence(sentenceZh, answer) {
  if (!sentenceZh || !answer) return sentenceZh || '';
  const parts = sentenceZh.split(answer);
  return parts.flatMap((part, i) => (i === 0 ? [part] : [mark(answer, i), part]));
}

// Only the first (case-insensitive) occurrence of the answer's pinyin is highlighted.
function highlightInPinyin(sentencePy, answerPy) {
  if (!sentencePy) return '';
  if (!answerPy) return sentencePy;
  const at = sentencePy.toLowerCase().indexOf(answerPy.toLowerCase());
  if (at < 0) return sentencePy;
  return [sentencePy.slice(0, at), mark(sentencePy.slice(at, at + answerPy.length), 0), sentencePy.slice(at + answerPy.length)];
}

export async function startSpeedQuizGame(options = {}) {
  roundLimit = Number(options.roundLimit) > 0 ? Number(options.roundLimit) : 0;
  loading.value = true;

  await Promise.all([ensureBankLoaded(), ensureVocabMapLoaded()]);

  order = shuffled(Array.from({ length: bankData.length }, (_, i) => i));
  idx = 0;
  score.value = 0;
  streak.value = 0;
  best.value = Number(localStorage.getItem(STORAGE_KEY) || 0);
  loadNextSpeedQuizRound();
}

function pickDistractors(sentence, answer) {
  const answerLen = Array.from(answer).length;
  const distractors = [];

  // 1. Pre-configured distractors of similar length come first
  if (Array.isArray(sentence.distractors)) {
    for (const d of sentence.distractors) {
      if (d && d !== answer && !distractors.includes(d) && Math.abs(Array.from(d).length - answerLen) <= 1) {
        distractors.push(d);
        if (distractors.length === 3) break;
      }
    }
  }

  // 2. Vocabulary words of the same length with a meaning, 3. then +/- 1 character
  const addFromVocab = (pool) => {
    if (distractors.length >= 3) return;
    for (const item of shuffled(pool)) {
      if (distractors.length === 3) break;
      if (item.hanzi !== answer && !distractors.includes(item.hanzi) && item.meaning) distractors.push(item.hanzi);
    }
  };
  addFromVocab(vocabByLength.get(answerLen) || []);
  addFromVocab((vocabByLength.get(Math.max(1, answerLen - 1)) || []).concat(vocabByLength.get(answerLen + 1) || []));

  // 4. Absolute safety fallback
  if (distractors.length < 3) {
    for (const tok of shuffled(bankData.filter((s) => s !== sentence).flatMap((s) => s.zh_tokens))) {
      if (tok && tok !== answer && !distractors.includes(tok)) {
        distractors.push(tok);
        if (distractors.length === 3) break;
      }
    }
  }
  return distractors;
}

function tick() {
  const next = timeLeft.value - 0.1;
  if (next <= 0) {
    timeLeft.value = 0;
    handleTimeout();
    return;
  }
  timeLeft.value = next;
}

export function loadNextSpeedQuizRound() {
  clearInterval(timerId);
  closeSpeedQuizExplanationModal();

  if (roundLimit && idx >= roundLimit) {
    finished.value = true;
    feedback.value = { kind: 'correct', icon: '🎉', body: <>Tổng điểm đạt được: <strong>{score.value}</strong></>, limit: roundLimit };
    roundLimit = 0;
    return;
  }

  if (idx >= order.length) {
    order = shuffled(order);
    idx = 0;
  }

  const sentence = bankData[order[idx]];
  idx++;
  const blankIdx = 1 + Math.floor(Math.random() * (sentence.zh_tokens.length - 1));
  const answer = sentence.zh_tokens[blankIdx];
  const options = shuffled([answer, ...pickDistractors(sentence, answer)]);

  loading.value = false;
  finished.value = false;
  solved.value = false;
  lastChoice.value = null;
  feedback.value = null;
  round.value = { sentence, answer, blankIdx, options, number: idx };
  timeLeft.value = TIME_LIMIT;
  timerId = setInterval(tick, 100);
}

function handleTimeout() {
  if (solved.value) return;
  solved.value = true;
  clearInterval(timerId);
  streak.value = 0;
  lastChoice.value = null;
  feedback.value = { kind: 'timeout', icon: '⏱', body: <>{'Hết giờ! Đáp án đúng: '}<strong>{round.value.answer}</strong></> };
  focusNextButton();
}

export function pickSpeedQuizOption(word) {
  if (solved.value) return;
  solved.value = true;
  clearInterval(timerId);

  const r = round.value;
  lastChoice.value = word;
  if (word === r.answer) {
    streak.value++;
    const speedBonus = Math.round((timeLeft.value / TIME_LIMIT) * BASE_SCORE);
    const streakBonus = Math.min(streak.value - 1, 5) * 10;
    const earned = BASE_SCORE / 2 + speedBonus + streakBonus;
    score.value += earned;
    if (score.value > best.value) {
      best.value = score.value;
      localStorage.setItem(STORAGE_KEY, String(best.value));
    }
    feedback.value = { kind: 'correct', icon: '✓', body: <>Chính xác! <strong>{`+${earned} điểm`}</strong></> };
  } else {
    streak.value = 0;
    feedback.value = { kind: 'incorrect', icon: '✗', body: <>{'Chưa chính xác! Đáp án đúng: '}<strong>{r.answer}</strong></> };
  }
  focusNextButton();
}

let dialogEl = null;
let nextBtnEl = null;

// Once a round is answered, move focus to "Câu tiếp theo" (after it is rendered visible).
function focusNextButton() {
  setTimeout(() => { try { nextBtnEl.focus(); } catch (_) { /* not mounted */ } }, 50);
}

export function openSpeedQuizExplanationModal() {
  if (!round.value || !dialogEl) return;
  modalRound.value = round.value;
  modalOpen.value = true;
  if (!dialogEl.hasAttribute('open')) {
    try { dialogEl.showModal(); } catch (_) { dialogEl.setAttribute('open', ''); }
  }
}

export function closeSpeedQuizExplanationModal() {
  modalOpen.value = false;
  if (dialogEl && dialogEl.hasAttribute('open')) {
    try { dialogEl.close(); } catch (_) { dialogEl.removeAttribute('open'); }
  }
}

export function speakSpeedQuizSentence() {
  const r = round.value;
  if (!r || typeof window.speakText !== 'function') return;
  const text = r.sentence.sentence_zh || r.sentence.zh_tokens.join('');
  const rate = typeof exampleSpeechSpeed !== 'undefined' ? exampleSpeechSpeed : 0.8;
  window.speakText(text, document.querySelector('.sqm-audio-btn'), rate);
}

export function exitSpeedQuizGame() {
  clearInterval(timerId);
  solved.value = true;
  closeSpeedQuizExplanationModal();
  if (typeof window.setPrimaryTab === 'function') window.setPrimaryTab('vocab');
  if (typeof window.goBackToPicker === 'function') window.goBackToPicker();
}

function TimerBar() {
  const t = timeLeft.value;
  if (t === null) return <div class="speed-quiz-timer-bar" id="speedQuizTimerBar"></div>;
  const pct = Math.max(0, (t / TIME_LIMIT) * 100);
  return <div class={pct <= 30 ? 'speed-quiz-timer-bar low' : 'speed-quiz-timer-bar'} id="speedQuizTimerBar" style={{ width: `${pct}%` }}></div>;
}

function SentenceWithBlank({ r }) {
  return r.sentence.zh_tokens.map((tok, i) => {
    if (i !== r.blankIdx) return tok;
    const gapLength = Math.max(2, Array.from(String(r.answer)).length * 2);
    return <span class="sq-blank-marker" aria-label="Chỗ trống" key="blank">{'＿'.repeat(Math.min(gapLength, 4))}</span>;
  });
}

function Options({ r }) {
  const isSolved = solved.value;
  const pick = lastChoice.value;
  return (
    <div class="speed-quiz-options" id="speedQuizOptions" role="group" aria-label="Các lựa chọn đáp án">
      {loading.value && <div class="loading-text">Đang tải thử thách tốc độ...</div>}
      {!loading.value && r && !finished.value && r.options.map((opt, i) => {
        let cls = 'speed-quiz-option';
        let icon = '';
        if (isSolved && opt === r.answer) { cls += ' correct'; icon = '✓'; }
        else if (isSolved && opt === pick) { cls += ' incorrect'; icon = '✕'; }
        else if (isSolved) cls += ' is-dimmed';
        return (
          <button key={`${r.number}-${opt}`} class={cls} type="button" disabled={isSolved}
            onClick={() => pickSpeedQuizOption(opt)} data-word={opt} data-index={i}>
            <span class="option-key-badge">{i + 1}</span>{' '}
            <span class="option-hanzi">{opt}</span>{' '}
            <span class="option-status-icon" aria-hidden="true">{icon}</span>
          </button>
        );
      })}
    </div>
  );
}

function ExplanationBody({ r }) {
  const { sentence, answer } = r;
  const choice = lastChoice.value;
  const answerInfo = getWordInfoSync(answer) || {};
  const answerPinyin = answerInfo.pinyin || (sentence.pinyin_tokens && sentence.pinyin_tokens[r.blankIdx]) || '';
  const answerMeaning = answerInfo.meaning || 'khớp nghĩa trong ngữ cảnh câu';
  const fullZh = sentence.sentence_zh || sentence.zh_tokens.join('');
  const fullPy = sentence.sentence_py || (sentence.pinyin_tokens ? sentence.pinyin_tokens.join(' ') : '');
  const grammarPoint = sentence.grammar_point || '';
  const isCorrect = choice === answer;
  const isTimeout = choice == null;

  return (
    <>
      <div class={`sqm-status-bar ${isCorrect ? 'is-correct' : isTimeout ? 'is-timeout' : 'is-incorrect'}`}>
        <div class="sqm-status-left">
          <span class="sqm-status-icon">{isCorrect ? '✓' : isTimeout ? '⏱' : '✗'}</span>{' '}
          <span class="sqm-status-label">{isCorrect ? 'Bạn đã trả lời chính xác!' : isTimeout ? 'Hết thời gian làm bài!' : 'Chưa chính xác!'}</span>
        </div>{' '}
        <button type="button" class="sqm-audio-btn" onClick={speakSpeedQuizSentence} title="Nghe câu hoàn chỉnh" aria-label="Nghe đọc câu hoàn chỉnh">
          <span aria-hidden="true">🔊</span>{' '}
          <span>Nghe phát âm</span>
        </button>
      </div>

      <div class="sqm-section sqm-sentence-card">
        <div class="sqm-sentence-zh">{highlightInSentence(fullZh, answer)}</div>
        {fullPy && <div class="sqm-sentence-py">{highlightInPinyin(fullPy, answerPinyin)}</div>}
        <div class="sqm-sentence-vi">{`Dịch nghĩa: “${sentence.meaning || ''}”`}</div>
      </div>

      <div class="sqm-section sqm-analysis-card">
        <h4 class="sqm-section-heading">
          <span class="sqm-heading-icon">💡</span>{' '}
          <span>{`Tại sao chọn "${answer}"?`}</span>
        </h4>
        <div class="sqm-analysis-content">
          <p class="sqm-reason-line">
            • Vị trí chỗ trống cần điền từ <strong>{answer}</strong>{answerPinyin ? <>{' ('}<em>{answerPinyin}</em>{') mang nghĩa: '}</> : '  mang nghĩa: '}<strong>{answerMeaning}</strong> để câu hoàn chỉnh và chuẩn ngữ nghĩa.
          </p>
          {grammarPoint && (
            <p class="sqm-grammar-line">
              • <strong>Cấu trúc ngữ pháp:</strong>{` ${grammarPoint}.`}
            </p>
          )}
        </div>
      </div>

      <div class="sqm-section sqm-options-card">
        <h4 class="sqm-section-heading">
          <span class="sqm-heading-icon">📚</span>{' '}
          <span>Nghĩa của 4 phương án lựa chọn:</span>
        </h4>
        <div class="sqm-options-grid">
          {(r.options || []).map((opt) => {
            const isAns = opt === answer;
            const isUserPick = opt === choice && !isAns;
            const optInfo = getWordInfoSync(opt) || {};
            let optMean = optInfo.meaning || '';
            if (!optMean || optMean === '—') optMean = isAns ? answerMeaning : 'Từ vựng tiếng Trung';
            return (
              <div class={`sqm-option-row ${isAns ? 'is-correct-row' : isUserPick ? 'is-user-wrong-row' : ''}`} key={opt}>
                <div class="sqm-option-badge">
                  {isAns ? <span class="badge-tag correct-tag">✓ Đúng</span>
                    : isUserPick ? <span class="badge-tag wrong-tag">✗ Bạn chọn</span>
                      : <span class="badge-tag neutral-tag">•</span>}
                </div>{' '}
                <div class="sqm-option-main">
                  <strong class="sqm-option-hanzi">{opt}</strong>{' '}
                  {optInfo.pinyin && <span class="sqm-option-pinyin">{optInfo.pinyin}</span>}
                </div>{' '}
                <div class="sqm-option-meaning" title={optMean}>{optMean}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// The <dialog> is opened/closed imperatively (showModal/close) by the functions above.
function ExplainModal() {
  const r = modalRound.value;
  return (
    <dialog ref={(el) => { dialogEl = el; }} class="speed-quiz-modal" id="speedQuizExplainModal" aria-labelledby="sqmTitle"
      onClose={() => { modalOpen.value = false; }}>
      <div class="sqm-backdrop" onClick={closeSpeedQuizExplanationModal}></div>
      <div class="sqm-dialog-content">
        <header class="sqm-header">
          <div class="sqm-header-title">
            <span class="sqm-badge-icon" aria-hidden="true">💡</span>{' '}
            <h3 id="sqmTitle" class="sqm-title">Giải thích đáp án &amp; Ngữ pháp</h3>
          </div>{' '}
          <button type="button" class="sqm-close-btn" onClick={closeSpeedQuizExplanationModal} aria-label="Đóng bảng giải thích">✕</button>
        </header>
        <div class="sqm-body" id="speedQuizModalBody">{r && <ExplanationBody r={r} />}</div>
        <footer class="sqm-footer">
          <button type="button" class="sqm-btn sqm-btn-secondary" onClick={closeSpeedQuizExplanationModal}>Đóng</button>{' '}
          <button type="button" class="sqm-btn sqm-btn-primary" onClick={loadNextSpeedQuizRound}>
            <span>Câu tiếp theo</span>{' '}
            <span aria-hidden="true">→</span>
          </button>
        </footer>
      </div>
    </dialog>
  );
}

export function SpeedQuizGame() {
  const r = round.value;
  const done = finished.value;
  const showActions = Boolean(r && solved.value && !done && !loading.value);
  const fb = feedback.value;

  let word = null;
  let meaning = '';
  if (done) {
    word = 'Hoàn thành thử thách!';
    meaning = `Bạn đã hoàn thành ${fb.limit} câu trắc nghiệm tốc độ.`;
  } else if (r && !loading.value) {
    word = <SentenceWithBlank r={r} />;
    meaning = r.sentence.meaning || '';
  }

  return (
    <div class="speed-quiz-game">
      <header class="speed-quiz-header">
        <div class="speed-quiz-header-main">
          <div class="speed-quiz-title-group">
            <h2 class="speed-quiz-title">⚡ Điền từ vào câu</h2>{' '}
            <span class="speed-quiz-badge" id="speedQuizRoundBadge">Thử thách tốc độ</span>
          </div>{' '}
          <div class="speed-quiz-header-actions">
            <button type="button" class="speed-quiz-exit-btn" onClick={exitSpeedQuizGame} title="Thoát trò chơi (Esc)" aria-label="Thoát trò chơi">✕ Thoát</button>
          </div>
        </div>
      </header>

      <section class="speed-quiz-card" aria-label="Bảng câu hỏi điền từ vào câu">
        <div class="speed-quiz-scoreboard">
          <span class="speed-quiz-score-badge" id="speedQuizScore">{`Điểm: ${score.value}`}</span>{' '}
          <span id="speedQuizStreak" class="speed-quiz-streak">{streak.value > 1 ? `🔥 x${streak.value}` : ''}</span>{' '}
          <span class="speed-quiz-best-badge" id="speedQuizBest">{`Kỷ lục: ${best.value}`}</span>
        </div>

        <div class="speed-quiz-timer-track">
          <TimerBar />
        </div>

        <div class="speed-quiz-question-box">
          <div class="speed-quiz-prompt-label">Điền từ thích hợp vào chỗ trống:</div>
          <div class="speed-quiz-word" id="speedQuizWord">{word}</div>
          <div class="speed-quiz-meaning" id="speedQuizMeaning">{meaning}</div>
        </div>

        <Options r={r} />

        <div class={fb ? `speed-quiz-feedback ${fb.kind}` : 'speed-quiz-feedback'} id="speedQuizFeedback" role="status" aria-live="polite">
          {fb && <><span class="sq-fb-icon">{fb.icon}</span> <span class="sq-fb-text">{fb.body}</span></>}
        </div>

        <div class="speed-quiz-actions">
          <button type="button" class="speed-quiz-explain-btn" id="speedQuizExplainBtn" onClick={openSpeedQuizExplanationModal} hidden={!showActions}>
            <span class="explain-btn-icon" aria-hidden="true">💡</span>{' '}
            <span>Xem giải thích</span>
          </button>{' '}
          <button ref={(el) => { nextBtnEl = el; }} type="button" class="game-next-btn speed-quiz-next-btn" id="speedQuizNextBtn" onClick={loadNextSpeedQuizRound} hidden={!showActions}>
            <span>Câu tiếp theo</span>{' '}
            <span class="next-btn-arrow">→</span>{' '}
            <kbd class="btn-kbd-hint">Enter ↵</kbd>
          </button>
        </div>

        <div class="speed-quiz-hints-footer">
          <span class="speed-quiz-hint-item"><kbd>1</kbd>–<kbd>4</kbd> Chọn đáp án</span>{' '}
          <span class="speed-quiz-hint-item"><kbd>Enter</kbd> Câu tiếp</span>{' '}
          <span class="speed-quiz-hint-item"><kbd>Esc</kbd> Thoát</span>
        </div>
      </section>

      <ExplainModal />
    </div>
  );
}

function onKeydown(e, screen) {
  if (screen.style.display === 'none') return;

  if (modalOpen.value) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSpeedQuizExplanationModal();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      loadNextSpeedQuizRound();
    }
    return;
  }

  const actionsVisible = Boolean(round.value && solved.value && !finished.value && !loading.value);
  if (actionsVisible) {
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

  if (!solved.value) {
    if (e.key === 'Escape') {
      e.preventDefault();
      exitSpeedQuizGame();
      return;
    }
    const r = round.value;
    if (r && !loading.value && ['1', '2', '3', '4'].includes(e.key)) {
      const opt = r.options[parseInt(e.key, 10) - 1];
      if (opt !== undefined) {
        e.preventDefault();
        pickSpeedQuizOption(opt);
      }
    }
  }
}

export function mountSpeedQuizGame() {
  const screen = document.getElementById('screenSpeedQuiz');
  if (!screen) return;
  render(<SpeedQuizGame />, screen);
  document.addEventListener('keydown', (e) => onKeydown(e, screen));

  window.startSpeedQuizGame = startSpeedQuizGame;
  window.loadNextSpeedQuizRound = loadNextSpeedQuizRound;
  window.pickSpeedQuizOption = pickSpeedQuizOption;
  window.openSpeedQuizExplanationModal = openSpeedQuizExplanationModal;
  window.closeSpeedQuizExplanationModal = closeSpeedQuizExplanationModal;
  window.speakSpeedQuizSentence = speakSpeedQuizSentence;
  window.exitSpeedQuizGame = exitSpeedQuizGame;
  window.giveUpSpeedQuizRound = exitSpeedQuizGame;
}
