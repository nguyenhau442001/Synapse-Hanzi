// HSK 4 sentence ordering (书写 · 第一部分: 完成句子) over the official H41001–H41012 mock exams.
// Preact port of the former assets/js/sentence-game.js. Renders the same markup inside
// #screenSentenceGame (styled by assets/css/sentence-game.css); the legacy router and SpaRouter
// keep calling window.startSentenceGame / setSentenceGameExam / goToSentenceGameQuestion.
import { render } from 'preact';
import { signal, computed } from '@preact/signals';

/* global HSK4_MOCK_EXAMS, exampleSpeechSpeed, SpaRouter -- globals of the classic scripts */

const EXAMS = [...HSK4_MOCK_EXAMS, { id: 'all', name: 'Tất cả 12 đề (Luyện tập ngẫu nhiên)' }];
const STRIP_PUNCT = /[。？！，、“”《》\s]/g;

let bankData = null;

const status = signal(null);            // null | 'loading' | 'error'
const loaded = signal(false);
const examId = signal('H41001');
const qIdx = signal(0);                 // 0..9 within the exam
const entry = signal(null);
const slots = signal([]);               // placed tokens, in order
const bank = signal([]);                // tokens still to place
const solved = signal(false);
const showPinyin = signal(true);
const focusMode = signal(false);
const feedback = signal(null);          // { kind: '' | 'warning' | 'incorrect', text }
const solvedSet = signal(new Set());    // question ids e.g. "H41001_86"

try {
  const saved = localStorage.getItem('hsk4_sentence_solved');
  if (saved) solvedSet.value = new Set(JSON.parse(saved));
} catch (e) { /* ignore corrupt progress */ }

const questions = computed(() => {
  if (!loaded.value) return [];
  return examId.value === 'all' ? bankData : bankData.filter((item) => item.exam_id === examId.value);
});

let slotsEl = null;
let nextBtnEl = null;

function saveProgress(questionId) {
  const next = new Set(solvedSet.value);
  next.add(questionId);
  solvedSet.value = next;
  try { localStorage.setItem('hsk4_sentence_solved', JSON.stringify(Array.from(next))); } catch (e) { /* quota */ }
}

async function ensureBankLoaded() {
  if (bankData && bankData.length) return bankData;
  const res = await fetch('database/sentence/hsk4_sentence_bank.json');
  if (!res.ok) throw new Error('Không tải được cơ sở dữ liệu đề thi HSK 4.');
  bankData = await res.json();
  return bankData;
}

function syncUrl() {
  if (typeof SpaRouter !== 'undefined' && SpaRouter.pushView) {
    SpaRouter.replaceView({ view: 'tab', tab: 'sentenceGame', exam: examId.value, q: entry.value ? entry.value.question_number : 86 });
  }
}

export function setSentenceGameExam(id) {
  examId.value = id;
  try { localStorage.setItem('hsk4_sentence_exam', id); } catch (e) { /* ignore */ }
  qIdx.value = 0;
  loadCurrentQuestion();
  syncUrl();
}

export function goToSentenceGameQuestion(idx) {
  if (idx < 0 || idx >= questions.value.length) return;
  qIdx.value = idx;
  loadCurrentQuestion();
  syncUrl();
}

export function toggleSentenceGamePinyin() {
  showPinyin.value = !showPinyin.value;
  try { localStorage.setItem('hsk4_sentence_pinyin', String(showPinyin.value)); } catch (e) { /* ignore */ }
}

export function toggleSentenceGameFocus(force) {
  focusMode.value = typeof force === 'boolean' ? force : !focusMode.value;
  document.body.classList.toggle('sentence-game-focus', focusMode.value);
  try { localStorage.setItem('hsk4_sentence_focus', String(focusMode.value)); } catch (e) { /* ignore */ }
}

export async function startSentenceGame() {
  status.value = 'loading';
  try {
    const savedExam = localStorage.getItem('hsk4_sentence_exam');
    if (savedExam && EXAMS.some((e) => e.id === savedExam)) examId.value = savedExam;
    const savedPinyin = localStorage.getItem('hsk4_sentence_pinyin');
    if (savedPinyin !== null) showPinyin.value = savedPinyin !== 'false';
    const savedFocus = localStorage.getItem('hsk4_sentence_focus');
    if (savedFocus !== null) focusMode.value = savedFocus === 'true';
    const exam = new URLSearchParams(window.location.search).get('exam');
    if (exam && EXAMS.some((e) => e.id === exam)) examId.value = exam;
  } catch (e) { /* storage unavailable */ }

  toggleSentenceGameFocus(focusMode.value);

  try {
    await ensureBankLoaded();
  } catch (err) {
    status.value = 'error';
    return;
  }
  loaded.value = true;

  // A specific question requested in the URL
  const targetQ = parseInt(new URLSearchParams(window.location.search).get('q'), 10);
  if (targetQ && questions.value.length) {
    const found = questions.value.findIndex((item) => item.question_number === targetQ);
    if (found !== -1) qIdx.value = found;
  }
  loadCurrentQuestion();
}

function focusNextButton() {
  setTimeout(() => { try { nextBtnEl.focus(); } catch (_) { /* not mounted */ } }, 60);
}

function loadCurrentQuestion() {
  const list = questions.value;
  if (!list.length) return;
  if (qIdx.value >= list.length) qIdx.value = 0;

  const e = list[qIdx.value];
  const isSolved = solvedSet.value.has(e.id);
  const tokens = (e.tokens || []).map((tok, i) => ({
    id: `tok_${e.id}_${i}`,
    tok,
    py: typeof window.pypinyin !== 'undefined' ? window.pypinyin.lazy_pinyin(tok).join(' ') : ''
  }));

  if (isSolved) {
    slots.value = tokens.slice();
    bank.value = [];
  } else {
    let shuffled = window.shuffledCopy(tokens);
    // Ensure the initial shuffle is not accidentally already the solved order
    if (shuffled.length > 2 && shuffled.map((t) => t.tok).join('') === (e.tokens || []).join('')) {
      shuffled = window.shuffledCopy(tokens);
    }
    bank.value = shuffled;
    slots.value = [];
  }
  entry.value = e;
  solved.value = isSolved;
  status.value = null;
  feedback.value = null;
  if (isSolved) focusNextButton();
}

const targetCount = () => (entry.value.tokens || []).length;

function autoCheckWhenFull() {
  if (slots.value.length === targetCount()) setTimeout(checkSentenceGameAnswer, 80);
}

export function pickSentenceGameToken(tokenId) {
  if (solved.value) return;
  const token = bank.value.find((t) => t.id === tokenId);
  if (!token) return;
  bank.value = bank.value.filter((t) => t !== token);
  slots.value = [...slots.value, token];
  autoCheckWhenFull();
}

export function removeSentenceGameSlot(slotIdx) {
  if (solved.value || slotIdx < 0 || slotIdx >= slots.value.length) return;
  const token = slots.value[slotIdx];
  slots.value = slots.value.filter((_, i) => i !== slotIdx);
  bank.value = [...bank.value, token];
  feedback.value = null;
}

export function resetSentenceGameSlots() {
  if (solved.value) return;
  bank.value = [...bank.value, ...slots.value];
  slots.value = [];
  feedback.value = null;
}

// Drag & drop: bank token -> slot position, or swap two placed slots.
function onBankDragStart(event, tokenId) {
  event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'bank', id: tokenId }));
  event.dataTransfer.effectAllowed = 'move';
}

function onSlotDragStart(event, slotIdx) {
  event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'slot', slotIdx }));
  event.dataTransfer.effectAllowed = 'move';
}

function onSlotDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('dragover');
}

function onSlotDragLeave(event) {
  event.currentTarget.classList.remove('dragover');
}

function onSlotDrop(event, targetIdx) {
  event.preventDefault();
  event.currentTarget.classList.remove('dragover');
  if (solved.value) return;
  let data;
  try { data = JSON.parse(event.dataTransfer.getData('text/plain')); } catch (e) { return; }
  if (!data) return;

  const next = slots.value.slice();
  if (data.type === 'bank') {
    const token = bank.value.find((t) => t.id === data.id);
    if (!token) return;
    bank.value = bank.value.filter((t) => t !== token);
    if (targetIdx >= next.length) next.push(token);
    else next.splice(targetIdx, 0, token);
  } else if (data.type === 'slot') {
    const from = data.slotIdx;
    if (from !== undefined && from < next.length && targetIdx < next.length) {
      [next[from], next[targetIdx]] = [next[targetIdx], next[from]];
    }
  }
  slots.value = next;
  autoCheckWhenFull();
}

function shakeSlots() {
  if (!slotsEl) return;
  slotsEl.classList.remove('shake');
  void slotsEl.offsetWidth; // restart the animation
  slotsEl.classList.add('shake');
  setTimeout(() => slotsEl.classList.remove('shake'), 450);
}

export function checkSentenceGameAnswer() {
  const e = entry.value;
  if (!e) return;
  const count = targetCount();
  if (slots.value.length < count) {
    feedback.value = { kind: 'warning', text: `⚠️ Hãy xếp đủ ${count} cụm từ trước khi kiểm tra đáp án.` };
    return;
  }
  const player = slots.value.map((s) => s.tok).join('').replace(STRIP_PUNCT, '');
  const acceptable = (e.acceptable_solutions || [e.solution_zh]).map((ans) => ans.replace(STRIP_PUNCT, ''));

  if (acceptable.includes(player)) {
    solved.value = true;
    saveProgress(e.id);
    feedback.value = null;
    focusNextButton();
    speakCurrentSentence();
  } else {
    shakeSlots();
    feedback.value = { kind: 'incorrect', text: '✗ Trật tự các cụm từ chưa chính xác, hãy hoán đổi lại vị trí nhé!' };
  }
}

export function revealSentenceHint() {
  const e = entry.value;
  if (!e || solved.value) return;
  feedback.value = { kind: 'warning', text: `💡 Gợi ý: Hãy chú ý cấu trúc “${e.grammar_point || ''}”. Nghĩa tiếng Việt: “${e.meaning_vi}”.` };
}

export function loadNextSentenceGameRound() {
  qIdx.value = qIdx.value + 1 < questions.value.length ? qIdx.value + 1 : 0;
  loadCurrentQuestion();
  syncUrl();
}

export function speakCurrentSentence() {
  const e = entry.value;
  if (!e || !e.solution_zh || typeof window.speakText !== 'function') return;
  const rate = typeof exampleSpeechSpeed !== 'undefined' ? exampleSpeechSpeed : 0.85;
  window.speakText(e.solution_zh, document.getElementById('sentenceResultSpeakBtn'), rate);
}

function QuestionNav() {
  const done = solvedSet.value;
  return (
    <div class="sentence-question-nav" id="sentenceQuestionNav" role="tablist" aria-label="Danh sách câu hỏi đề thi">
      {questions.value.map((q, idx) => {
        const isActive = idx === qIdx.value;
        const isSolved = done.has(q.id);
        const qNum = q.question_number || (86 + idx);
        let cls = 'sentence-q-btn';
        if (isActive) cls += ' active';
        if (isSolved) cls += ' is-solved';
        return (
          <button key={q.id} type="button" class={cls} onClick={() => goToSentenceGameQuestion(idx)}
            title={`Câu ${qNum} ${isSolved ? '(Đã hoàn thành)' : ''}`} aria-label={`Câu ${qNum}`}
            aria-current={isActive ? 'true' : 'false'}>
            <span>{qNum}</span>
            {isSolved && <>{' '}<span class="solved-dot" aria-hidden="true">✓</span></>}
          </button>
        );
      })}
    </div>
  );
}

function Slots() {
  const e = entry.value;
  const placed = slots.value;
  const isSolved = solved.value;
  return (
    <div ref={(el) => { slotsEl = el; }} class={placed.length === 0 ? 'sentence-game-slots is-empty' : 'sentence-game-slots'}
      id="sentenceGameSlots" role="region" aria-label="Khu vực xếp từ">
      {e && placed.map((item, idx) => (
        <button key={item.id} type="button" class="sentence-token sentence-slot-token"
          onClick={() => removeSentenceGameSlot(idx)}
          draggable={!isSolved}
          onDragStart={(ev) => onSlotDragStart(ev, idx)}
          onDragOver={onSlotDragOver}
          onDragLeave={onSlotDragLeave}
          onDrop={(ev) => onSlotDrop(ev, idx)}
          title="Bấm để đưa về kho từ, hoặc kéo để đổi thứ tự"
          aria-label={`Cụm từ ${item.tok} ở vị trí ${idx + 1}. Bấm để gỡ ra.`}>
          <span class="token-zh">{item.tok}</span>{' '}
          <span class="token-py" hidden={!showPinyin.value}>{item.py}</span>
        </button>
      ))}
      {e && <span class="sentence-end-punct" title="Dấu câu kết thúc" aria-hidden="true">{e.punct || '。'}</span>}
      {e && placed.length < targetCount() && !isSolved && (
        <div class="sentence-slot-placeholder"
          onDragOver={onSlotDragOver}
          onDragLeave={onSlotDragLeave}
          onDrop={(ev) => onSlotDrop(ev, placed.length)}
          aria-label="Ô trống chờ xếp cụm từ">
          <span class="placeholder-dot"></span>
        </div>
      )}
    </div>
  );
}

function Bank() {
  let content = null;
  if (status.value === 'loading') {
    content = <div class="loading-text">Đang tải đề thi HSK 4 Hanban...</div>;
  } else if (status.value === 'error') {
    content = <div class="empty-text">Không tải được dữ liệu đề thi. Vui lòng thử lại.</div>;
  } else if (entry.value && (solved.value || bank.value.length === 0)) {
    content = (
      <div class="sentence-bank-empty-state">
        <span>✓ Đã xếp đủ tất cả các cụm từ</span>
      </div>
    );
  } else if (entry.value) {
    content = bank.value.map((item, i) => (
      <button key={item.id} type="button" class="sentence-token sentence-bank-token"
        onClick={() => pickSentenceGameToken(item.id)}
        draggable="true"
        onDragStart={(ev) => onBankDragStart(ev, item.id)}
        title={`Bấm hoặc kéo để ghép vào câu (Phím số ${i + 1})`}
        aria-label={`Cụm từ ${item.tok}`}>
        <span class="token-shortcut" aria-hidden="true">{i + 1}</span>{' '}
        <span class="token-zh">{item.tok}</span>{' '}
        <span class="token-py" hidden={!showPinyin.value}>{item.py}</span>
      </button>
    ));
  }
  return <div class="sentence-game-bank" id="sentenceGameBank" role="group" aria-label="Kho cụm từ để chọn">{content}</div>;
}

function ResultCard() {
  const e = entry.value;
  const visible = Boolean(e && solved.value);
  return (
    <div class="sentence-result-card" id="sentenceResultCard" hidden={!visible}>
      <div class="sentence-result-header">
        <div class="sentence-result-status">
          <span class="sentence-result-check-icon">✓</span>{' '}
          <span class="sentence-result-status-text" id="sentenceResultStatusText">
            {visible ? `Chính xác! Bạn đã hoàn thành câu ${e.question_number}.` : 'Chính xác! Bạn đã hoàn thành câu.'}
          </span>
        </div>{' '}
        <div class="sentence-result-actions">
          <button type="button" class="sentence-result-speak-btn" id="sentenceResultSpeakBtn" onClick={speakCurrentSentence} title="Nghe đọc lại câu" aria-label="Nghe đọc câu">
            <span>🔊</span> <span>Nghe đọc</span>
          </button>{' '}
          <button ref={(el) => { nextBtnEl = el; }} type="button" class="sentence-action-btn sentence-action-btn--success" id="sentenceResultNextBtn" onClick={loadNextSentenceGameRound}>
            <span>Câu tiếp theo →</span>
          </button>
        </div>
      </div>
      <div class="sentence-result-body">
        <div class="sentence-result-zh" id="sentenceResultZh">{visible ? e.solution_zh : ''}</div>
        <div class="sentence-result-py" id="sentenceResultPy" hidden={visible && !showPinyin.value}>{visible ? e.sentence_py || '' : ''}</div>
        <div class="sentence-result-vi" id="sentenceResultVi">{visible ? e.meaning_vi || '' : ''}</div>
      </div>
      {/* keyed by question so it opens again for each solved sentence */}
      <details key={visible ? e.id : 'none'} class="sentence-grammar-disclosure" id="sentenceGrammarDisclosure"
        hidden={!(visible && e.grammar_point)} open={Boolean(visible && e.grammar_point)}>
        <summary class="sentence-grammar-summary">
          <span>💡 Phân tích cấu trúc ngữ pháp</span>{' '}
          <span class="disclosure-arrow">▾</span>
        </summary>
        <div class="sentence-grammar-content" id="sentenceGrammarContent">
          {visible && e.grammar_point && (
            <p class="grammar-point-text">
              <span class="grammar-badge">Ngữ pháp HSK 4:</span>{` ${e.grammar_point}`}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}

export function SentenceGame() {
  const e = entry.value;
  const fb = feedback.value;
  const pinyinOn = showPinyin.value;
  const focusOn = focusMode.value;
  const examLabel = e ? e.exam_name || `Đề ${examId.value}` : null;

  return (
    <div class="sentence-game">
      <header class="sentence-game-header">
        <div class="sentence-game-top-bar">
          <div class="sentence-game-title-group">
            <h2 class="sentence-game-title">🧩 Xếp câu HSK4</h2>{' '}
            <span class="sentence-game-counter" id="sentenceGameCounter">{e ? `${examLabel} · Câu ${e.question_number}` : 'Đề 1 (H41001) · Câu 86'}</span>
          </div>{' '}
          <div class="sentence-game-tools">
            <div class="sentence-exam-selector-group">
              <label for="sentenceGameExamSelect" class="sentence-exam-label">Đề thi:</label>{' '}
              <select id="sentenceGameExamSelect" class="sentence-exam-select" value={loaded.value ? examId.value : undefined}
                onChange={(ev) => setSentenceGameExam(ev.currentTarget.value)} aria-label="Chọn đề thi HSK 4">
                {loaded.value && EXAMS.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
            </div>{' '}
            <button type="button" class={pinyinOn ? 'sentence-tool-btn active' : 'sentence-tool-btn'} id="sentenceGamePinyinBtn" onClick={toggleSentenceGamePinyin} title="Bật hoặc tắt Pinyin" aria-label="Bật hoặc tắt Pinyin">
              <span id="sentenceGamePinyinIcon">{pinyinOn ? '👁' : '🙈'}</span> <span id="sentenceGamePinyinLabel">{pinyinOn ? 'Pinyin: Bật' : 'Pinyin: Tắt'}</span>
            </button>{' '}
            <button type="button" class={focusOn ? 'sentence-tool-btn active' : 'sentence-tool-btn'} id="sentenceGameFocusBtn" onClick={() => toggleSentenceGameFocus()} title="Bật hoặc tắt chế độ tập trung" aria-label="Bật hoặc tắt chế độ tập trung">
              <span id="sentenceGameFocusIcon">{focusOn ? '⛶' : '🎯'}</span> <span id="sentenceGameFocusLabel">{focusOn ? 'Thoát tập trung' : 'Tập trung'}</span>
            </button>
          </div>
        </div>

        <nav class="sentence-question-nav-container" aria-label="Điều hướng câu hỏi">
          <span class="sentence-question-nav-label">Câu hỏi:</span>{' '}
          <QuestionNav />
        </nav>
      </header>

      <section class="sentence-card-board" aria-label="Bàn sắp xếp câu">
        <div class="sentence-prompt">
          <div class="sentence-prompt-header">
            <span class="sentence-prompt-title">HSK 4 · 书写 第一部分: 完成句子</span>{' '}
            <div class="sentence-card-meta">
              <span class="sentence-level-tag" id="sentenceLevelTag">{`HSK 4 · Câu ${e ? e.question_number : 86}`}</span>
            </div>
          </div>
          <div class="sentence-game-instruction">Sắp xếp các cụm từ bên dưới thành câu hoàn chỉnh theo ngữ pháp tiếng Trung:</div>
        </div>

        <div class="sentence-slots-wrapper">
          <div class="sentence-slots-label">
            <span class="sentence-sub-title">Ghép các thẻ từ thành câu hoàn chỉnh:</span>{' '}
            <button type="button" class="sentence-reset-slots-btn" id="sentenceGameResetBtn" onClick={resetSentenceGameSlots} title="Đặt lại câu để ghép lại từ đầu"
              disabled={!e || solved.value || slots.value.length === 0}>
              <span class="reset-icon">↺</span> <span>Làm lại</span>
            </button>
          </div>
          <Slots />
        </div>

        <div class="sentence-bank-wrapper" id="sentenceBankWrapper">
          <div class="sentence-bank-label">
            <span class="sentence-sub-title" id="sentenceBankTitle">Kho cụm từ (Bấm hoặc dùng phím số 1-9):</span>
          </div>
          <Bank />
        </div>

        <div class={fb ? `sentence-game-feedback ${fb.kind}` : 'sentence-game-feedback'} id="sentenceGameFeedback" role="status" aria-live="polite">{fb ? fb.text : ''}</div>

        <ResultCard />

        <div class="sentence-game-actions" id="sentenceGameActions" hidden={Boolean(e && solved.value)}>
          <button type="button" class="sentence-action-btn sentence-action-btn--secondary" id="sentenceGameHintBtn" onClick={revealSentenceHint} title="Xem gợi ý câu">💡 Gợi ý</button>{' '}
          <button type="button" class="sentence-action-btn sentence-action-btn--primary" id="sentenceGameCheckBtn" onClick={checkSentenceGameAnswer}>Kiểm tra đáp án</button>
        </div>
      </section>
    </div>
  );
}

export function mountSentenceGame() {
  const screen = document.getElementById('screenSentenceGame');
  if (!screen) return;
  render(<SentenceGame />, screen);

  window.addEventListener('keydown', (e) => {
    if (screen.style.display === 'none') return;
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (solved.value) loadNextSentenceGameRound();
      else checkSentenceGameAnswer();
      return;
    }
    if (e.key === 'Backspace' && !solved.value && slots.value.length > 0) {
      e.preventDefault();
      removeSentenceGameSlot(slots.value.length - 1);
      return;
    }
    // Number keys 1-9 pick bank tokens
    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= bank.value.length && !solved.value) {
      e.preventDefault();
      pickSentenceGameToken(bank.value[num - 1].id);
    }
  });

  Object.assign(window, {
    startSentenceGame,
    setSentenceGameExam,
    goToSentenceGameQuestion,
    toggleSentenceGamePinyin,
    toggleSentenceGameFocus,
    pickSentenceGameToken,
    removeSentenceGameSlot,
    resetSentenceGameSlots,
    checkSentenceGameAnswer,
    revealSentenceHint,
    loadNextSentenceGameRound,
    speakCurrentSentence
  });
}
