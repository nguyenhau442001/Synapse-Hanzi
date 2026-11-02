// assets/js/sentence-game.js
// Synapse Hanzi - HSK 4 Sentence Ordering (书写 · 第一部分: 完成句子)
// Official Hanban HSK 4 mock exams (H41001 to H41012 - 120 authentic questions)

const AVAILABLE_SENTENCE_EXAMS = [
  { id: 'H41001', name: 'Đề 1 (H41001)' },
  { id: 'H41002', name: 'Đề 2 (H41002)' },
  { id: 'H41003', name: 'Đề 3 (H41003)' },
  { id: 'H41004', name: 'Đề 4 (H41004)' },
  { id: 'H41005', name: 'Đề 5 (H41005)' },
  { id: 'H41006', name: 'Đề 6 (H41006)' },
  { id: 'H41007', name: 'Đề 7 (H41007)' },
  { id: 'H41008', name: 'Đề 8 (H41008)' },
  { id: 'H41009', name: 'Đề 9 (H41009)' },
  { id: 'H41010', name: 'Đề 10 (H41010)' },
  { id: 'H41011', name: 'Đề 11 (H41011)' },
  { id: 'H41012', name: 'Đề 12 (H41012)' },
  { id: 'all', name: 'Tất cả 12 đề (Luyện tập ngẫu nhiên)' }
];

let sentenceBankData = null;
let sentenceGameExamId = 'H41001';
let sentenceGameQuestionIdx = 0; // 0 to 9 in exam
let sentenceGameCurrentEntry = null;
let sentenceGameSlots = [];
let sentenceGameBankTokens = [];
let sentenceGameSolved = false;
let sentenceGameShowPinyin = true;
let sentenceGameFocusMode = false;
let sentenceGameSolvedSet = new Set(); // Set of solved question IDs e.g. "H41001_86"

// Load solved progress from localStorage
try {
  const savedSolved = localStorage.getItem('hsk4_sentence_solved');
  if (savedSolved) {
    sentenceGameSolvedSet = new Set(JSON.parse(savedSolved));
  }
} catch (e) {}

function saveSentenceProgress(questionId) {
  sentenceGameSolvedSet.add(questionId);
  try {
    localStorage.setItem('hsk4_sentence_solved', JSON.stringify(Array.from(sentenceGameSolvedSet)));
  } catch (e) {}
}

async function ensureSentenceBankLoaded() {
  if (sentenceBankData && sentenceBankData.length) return sentenceBankData;
  const res = await fetch('database/sentence/hsk4_sentence_bank.json');
  if (!res.ok) throw new Error('Không tải được cơ sở dữ liệu đề thi HSK 4.');
  sentenceBankData = await res.json();
  return sentenceBankData;
}

function shuffleSentenceArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getQuestionsForCurrentExam() {
  if (!sentenceBankData) return [];
  if (sentenceGameExamId === 'all') {
    return sentenceBankData;
  }
  return sentenceBankData.filter(item => item.exam_id === sentenceGameExamId);
}

function renderSentenceExamSelector() {
  const select = document.getElementById('sentenceGameExamSelect');
  if (!select) return;
  select.innerHTML = AVAILABLE_SENTENCE_EXAMS.map(ex => `
    <option value="${ex.id}" ${ex.id === sentenceGameExamId ? 'selected' : ''}>${ex.name}</option>
  `).join('');
}

function renderSentenceQuestionNav() {
  const nav = document.getElementById('sentenceQuestionNav');
  if (!nav) return;
  const questions = getQuestionsForCurrentExam();
  if (!questions.length) {
    nav.innerHTML = '';
    return;
  }

  nav.innerHTML = questions.map((q, idx) => {
    const isActive = idx === sentenceGameQuestionIdx;
    const isSolved = sentenceGameSolvedSet.has(q.id);
    const qNum = q.question_number || (86 + idx);
    let classes = 'sentence-q-btn';
    if (isActive) classes += ' active';
    if (isSolved) classes += ' is-solved';
    return `
      <button type="button" class="${classes}" onclick="goToSentenceGameQuestion(${idx})"
        title="Câu ${qNum} ${isSolved ? '(Đã hoàn thành)' : ''}" aria-label="Câu ${qNum}"
        aria-current="${isActive ? 'true' : 'false'}">
        <span>${qNum}</span>
        ${isSolved ? '<span class="solved-dot" aria-hidden="true">✓</span>' : ''}
      </button>
    `;
  }).join('');
}

function setSentenceGameExam(examId) {
  sentenceGameExamId = examId;
  try { localStorage.setItem('hsk4_sentence_exam', examId); } catch (e) {}
  sentenceGameQuestionIdx = 0;
  loadCurrentSentenceQuestion();
  syncSentenceUrl();
}

function goToSentenceGameQuestion(idx) {
  const questions = getQuestionsForCurrentExam();
  if (idx < 0 || idx >= questions.length) return;
  sentenceGameQuestionIdx = idx;
  loadCurrentSentenceQuestion();
  syncSentenceUrl();
}

function syncSentenceUrl() {
  if (typeof SpaRouter !== 'undefined' && SpaRouter.pushView) {
    const q = sentenceGameCurrentEntry ? sentenceGameCurrentEntry.question_number : 86;
    SpaRouter.replaceView({
      view: 'tab',
      tab: 'sentenceGame',
      exam: sentenceGameExamId,
      q: q
    });
  }
}

function toggleSentenceGamePinyin() {
  sentenceGameShowPinyin = !sentenceGameShowPinyin;
  try { localStorage.setItem('hsk4_sentence_pinyin', String(sentenceGameShowPinyin)); } catch (e) {}
  syncSentenceGamePinyinUI();
  renderSentenceGameBoard();
}

function syncSentenceGamePinyinUI() {
  const icon = document.getElementById('sentenceGamePinyinIcon');
  const label = document.getElementById('sentenceGamePinyinLabel');
  const btn = document.getElementById('sentenceGamePinyinBtn');
  if (icon) icon.textContent = sentenceGameShowPinyin ? '👁' : '🙈';
  if (label) label.textContent = sentenceGameShowPinyin ? 'Pinyin: Bật' : 'Pinyin: Tắt';
  if (btn) btn.classList.toggle('active', sentenceGameShowPinyin);
}

function toggleSentenceGameFocus(force) {
  if (typeof force === 'boolean') {
    sentenceGameFocusMode = force;
  } else {
    sentenceGameFocusMode = !sentenceGameFocusMode;
  }
  document.body.classList.toggle('sentence-game-focus', sentenceGameFocusMode);
  const icon = document.getElementById('sentenceGameFocusIcon');
  const label = document.getElementById('sentenceGameFocusLabel');
  const btn = document.getElementById('sentenceGameFocusBtn');
  if (icon) icon.textContent = sentenceGameFocusMode ? '⛶' : '🎯';
  if (label) label.textContent = sentenceGameFocusMode ? 'Thoát tập trung' : 'Tập trung';
  if (btn) btn.classList.toggle('active', sentenceGameFocusMode);
  try { localStorage.setItem('hsk4_sentence_focus', String(sentenceGameFocusMode)); } catch (e) {}
}

async function startSentenceGame() {
  const bankEl = document.getElementById('sentenceGameBank');
  if (bankEl) bankEl.innerHTML = '<div class="loading-text">Đang tải đề thi HSK 4 Hanban...</div>';

  try {
    const savedExam = localStorage.getItem('hsk4_sentence_exam');
    if (savedExam && AVAILABLE_SENTENCE_EXAMS.some(e => e.id === savedExam)) {
      sentenceGameExamId = savedExam;
    }
    const savedPinyin = localStorage.getItem('hsk4_sentence_pinyin');
    if (savedPinyin !== null) sentenceGameShowPinyin = savedPinyin !== 'false';
    const savedFocus = localStorage.getItem('hsk4_sentence_focus');
    if (savedFocus !== null) sentenceGameFocusMode = savedFocus === 'true';

    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    if (params.get('exam') && AVAILABLE_SENTENCE_EXAMS.some(e => e.id === params.get('exam'))) {
      sentenceGameExamId = params.get('exam');
    }
  } catch (e) {}

  syncSentenceGamePinyinUI();
  toggleSentenceGameFocus(sentenceGameFocusMode);

  try {
    await ensureSentenceBankLoaded();
  } catch (err) {
    if (bankEl) bankEl.innerHTML = '<div class="empty-text">Không tải được dữ liệu đề thi. Vui lòng thử lại.</div>';
    return;
  }

  renderSentenceExamSelector();

  // If specific question requested in URL
  const params = new URLSearchParams(window.location.search);
  const targetQ = parseInt(params.get('q'), 10);
  const questions = getQuestionsForCurrentExam();
  if (targetQ && questions.length) {
    const qIdx = questions.findIndex(item => item.question_number === targetQ);
    if (qIdx !== -1) sentenceGameQuestionIdx = qIdx;
  }

  loadCurrentSentenceQuestion();
}

function loadCurrentSentenceQuestion() {
  const questions = getQuestionsForCurrentExam();
  if (!questions.length) return;
  if (sentenceGameQuestionIdx >= questions.length) sentenceGameQuestionIdx = 0;

  const entry = questions[sentenceGameQuestionIdx];
  sentenceGameCurrentEntry = entry;
  sentenceGameSolved = false;
  sentenceGameSlots = [];

  // Check if previously solved
  if (sentenceGameSolvedSet.has(entry.id)) {
    sentenceGameSolved = true;
  }

  // Create bank tokens
  const tokens = (entry.tokens || []).map((tok, i) => ({
    id: `tok_${entry.id}_${i}`,
    tok: tok,
    py: typeof pypinyin !== 'undefined' ? pypinyin.lazy_pinyin(tok).join(' ') : ''
  }));

  // If already solved, place them in correct order
  if (sentenceGameSolved) {
    // Find matching tokens sequence for primary solution
    sentenceGameSlots = tokens.slice();
    sentenceGameBankTokens = [];
  } else {
    // Shuffle for user practice
    let shuffled = shuffleSentenceArray(tokens);
    // Ensure initial shuffle is not accidentally already the solved order
    if (shuffled.length > 2 && shuffled.map(t => t.tok).join('') === (entry.tokens || []).join('')) {
      shuffled = shuffleSentenceArray(tokens);
    }
    sentenceGameBankTokens = shuffled;
    sentenceGameSlots = [];
  }

  // Update Exam Meta Badges
  const counter = document.getElementById('sentenceGameCounter');
  if (counter) {
    const examLabel = entry.exam_name || `Đề ${sentenceGameExamId}`;
    counter.textContent = `${examLabel} · Câu ${entry.question_number}`;
  }

  const levelTag = document.getElementById('sentenceLevelTag');
  if (levelTag) {
    levelTag.textContent = `HSK 4 · Câu ${entry.question_number}`;
  }

  const punctEl = document.getElementById('sentenceFixedPunct');
  if (punctEl) {
    punctEl.textContent = entry.punct || '。';
  }

  // Clear feedback & result card if not yet solved
  const feedbackEl = document.getElementById('sentenceGameFeedback');
  if (feedbackEl) {
    feedbackEl.textContent = '';
    feedbackEl.className = 'sentence-game-feedback';
  }

  const resultCard = document.getElementById('sentenceResultCard');
  const actionsEl = document.getElementById('sentenceGameActions');
  if (resultCard) resultCard.hidden = !sentenceGameSolved;
  if (actionsEl) actionsEl.hidden = sentenceGameSolved;

  if (sentenceGameSolved) {
    displaySentenceResult(entry);
  }

  renderSentenceQuestionNav();
  renderSentenceGameBoard();
}

function renderSentenceGameBoard() {
  const entry = sentenceGameCurrentEntry;
  if (!entry) return;

  const slotsEl = document.getElementById('sentenceGameSlots');
  const bankEl = document.getElementById('sentenceGameBank');
  const resetBtn = document.getElementById('sentenceGameResetBtn');

  // 1. Render Target Slots
  if (slotsEl) {
    slotsEl.classList.toggle('is-empty', sentenceGameSlots.length === 0);
    const targetCount = (entry.tokens || []).length;

    let slotsHtml = sentenceGameSlots.map((item, idx) => `
      <button type="button" class="sentence-token sentence-slot-token"
        onclick="removeSentenceGameSlot(${idx})"
        draggable="${!sentenceGameSolved}"
        ondragstart="handleSlotDragStart(event, ${idx})"
        ondragover="handleSlotDragOver(event)"
        ondragleave="handleSlotDragLeave(event)"
        ondrop="handleSlotDrop(event, ${idx})"
        title="Bấm để đưa về kho từ, hoặc kéo để đổi thứ tự"
        aria-label="Cụm từ ${escapeHtml(item.tok)} ở vị trí ${idx + 1}. Bấm để gỡ ra.">
        <span class="token-zh">${escapeHtml(item.tok)}</span>
        <span class="token-py" ${sentenceGameShowPinyin ? '' : 'hidden'}>${escapeHtml(item.py)}</span>
      </button>
    `).join('');

    // Fixed punctuation badge at end of sentence
    const punct = entry.punct || '。';
    slotsHtml += `<span class="sentence-end-punct" title="Dấu câu kết thúc" aria-hidden="true">${punct}</span>`;

    // Dropzone placeholder if still incomplete
    if (sentenceGameSlots.length < targetCount && !sentenceGameSolved) {
      slotsHtml += `
        <div class="sentence-slot-placeholder"
          ondragover="handleSlotDragOver(event)"
          ondragleave="handleSlotDragLeave(event)"
          ondrop="handleSlotDrop(event, ${sentenceGameSlots.length})"
          aria-label="Ô trống chờ xếp cụm từ">
          <span class="placeholder-dot"></span>
        </div>
      `;
    }

    slotsEl.innerHTML = slotsHtml;
  }

  // 2. Render Word Bank Tokens
  if (bankEl) {
    if (sentenceGameSolved || sentenceGameBankTokens.length === 0) {
      bankEl.innerHTML = `
        <div class="sentence-bank-empty-state">
          <span>✓ Đã xếp đủ tất cả các cụm từ</span>
        </div>
      `;
    } else {
      bankEl.innerHTML = sentenceGameBankTokens.map((item, i) => `
        <button type="button" class="sentence-token sentence-bank-token"
          onclick="pickSentenceGameToken('${item.id}')"
          draggable="true"
          ondragstart="handleBankDragStart(event, '${item.id}')"
          title="Bấm hoặc kéo để ghép vào câu (Phím số ${i + 1})"
          aria-label="Cụm từ ${escapeHtml(item.tok)}">
          <span class="token-shortcut" aria-hidden="true">${i + 1}</span>
          <span class="token-zh">${escapeHtml(item.tok)}</span>
          <span class="token-py" ${sentenceGameShowPinyin ? '' : 'hidden'}>${escapeHtml(item.py)}</span>
        </button>
      `).join('');
    }
  }

  if (resetBtn) {
    resetBtn.disabled = sentenceGameSolved || sentenceGameSlots.length === 0;
  }
}

function pickSentenceGameToken(tokenId) {
  if (sentenceGameSolved) return;
  const tokenIdx = sentenceGameBankTokens.findIndex(t => t.id === tokenId);
  if (tokenIdx === -1) return;

  const [token] = sentenceGameBankTokens.splice(tokenIdx, 1);
  sentenceGameSlots.push(token);
  renderSentenceGameBoard();

  // Auto-validate if all slots filled
  const targetCount = (sentenceGameCurrentEntry.tokens || []).length;
  if (sentenceGameSlots.length === targetCount) {
    setTimeout(checkSentenceGameAnswer, 80);
  }
}

function removeSentenceGameSlot(slotIdx) {
  if (sentenceGameSolved) return;
  if (slotIdx < 0 || slotIdx >= sentenceGameSlots.length) return;

  const [token] = sentenceGameSlots.splice(slotIdx, 1);
  sentenceGameBankTokens.push(token);
  renderSentenceGameBoard();

  const feedbackEl = document.getElementById('sentenceGameFeedback');
  if (feedbackEl) {
    feedbackEl.textContent = '';
    feedbackEl.className = 'sentence-game-feedback';
  }
}

function resetSentenceGameSlots() {
  if (sentenceGameSolved) return;
  sentenceGameBankTokens = [...sentenceGameBankTokens, ...sentenceGameSlots];
  sentenceGameSlots = [];
  renderSentenceGameBoard();

  const feedbackEl = document.getElementById('sentenceGameFeedback');
  if (feedbackEl) {
    feedbackEl.textContent = '';
    feedbackEl.className = 'sentence-game-feedback';
  }
}

// Drag & Drop event handlers
function handleBankDragStart(event, tokenId) {
  event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'bank', id: tokenId }));
  event.dataTransfer.effectAllowed = 'move';
}

function handleSlotDragStart(event, slotIdx) {
  event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'slot', slotIdx }));
  event.dataTransfer.effectAllowed = 'move';
}

function handleSlotDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const slot = event.currentTarget;
  if (slot && !slot.classList.contains('dragover')) slot.classList.add('dragover');
}

function handleSlotDragLeave(event) {
  const slot = event.currentTarget;
  if (slot) slot.classList.remove('dragover');
}

function handleSlotDrop(event, targetSlotIdx) {
  event.preventDefault();
  if (sentenceGameSolved) return;
  let data;
  try {
    data = JSON.parse(event.dataTransfer.getData('text/plain'));
  } catch (e) {
    return;
  }
  if (!data) return;

  if (data.type === 'bank') {
    const bankIdx = sentenceGameBankTokens.findIndex(t => t.id === data.id);
    if (bankIdx === -1) return;
    const [token] = sentenceGameBankTokens.splice(bankIdx, 1);
    if (targetSlotIdx >= sentenceGameSlots.length) {
      sentenceGameSlots.push(token);
    } else {
      sentenceGameSlots.splice(targetSlotIdx, 0, token);
    }
  } else if (data.type === 'slot') {
    const fromIdx = data.slotIdx;
    if (fromIdx !== undefined && fromIdx < sentenceGameSlots.length && targetSlotIdx < sentenceGameSlots.length) {
      const temp = sentenceGameSlots[fromIdx];
      sentenceGameSlots[fromIdx] = sentenceGameSlots[targetSlotIdx];
      sentenceGameSlots[targetSlotIdx] = temp;
    }
  }
  renderSentenceGameBoard();

  // Auto-check if all placed
  const targetCount = (sentenceGameCurrentEntry.tokens || []).length;
  if (sentenceGameSlots.length === targetCount) {
    setTimeout(checkSentenceGameAnswer, 80);
  }
}

function checkSentenceGameAnswer() {
  const entry = sentenceGameCurrentEntry;
  if (!entry) return;
  const feedbackEl = document.getElementById('sentenceGameFeedback');
  const targetCount = (entry.tokens || []).length;

  if (sentenceGameSlots.length < targetCount) {
    if (feedbackEl) {
      feedbackEl.textContent = `⚠️ Hãy xếp đủ ${targetCount} cụm từ trước khi kiểm tra đáp án.`;
      feedbackEl.className = 'sentence-game-feedback warning';
    }
    return;
  }

  // Concatenate player string
  const playerText = sentenceGameSlots.map(s => s.tok).join('');
  const cleanPlayer = playerText.replace(/[。？！，、“”《》\s]/g, '');

  // Compare against acceptable solutions
  const acceptable = (entry.acceptable_solutions || [entry.solution_zh]).map(ans =>
    ans.replace(/[。？！，、“”《》\s]/g, '')
  );

  const isCorrect = acceptable.includes(cleanPlayer);

  if (isCorrect) {
    sentenceGameSolved = true;
    saveSentenceProgress(entry.id);
    renderSentenceGameBoard();
    renderSentenceQuestionNav();

    if (feedbackEl) {
      feedbackEl.textContent = '';
      feedbackEl.className = 'sentence-game-feedback';
    }

    displaySentenceResult(entry);
    speakCurrentSentence();
  } else {
    shakeSentenceGameSlots();
    if (feedbackEl) {
      feedbackEl.textContent = '✗ Trật tự các cụm từ chưa chính xác, hãy hoán đổi lại vị trí nhé!';
      feedbackEl.className = 'sentence-game-feedback incorrect';
    }
  }
}

function displaySentenceResult(entry) {
  const resultCard = document.getElementById('sentenceResultCard');
  const actionsEl = document.getElementById('sentenceGameActions');
  if (actionsEl) actionsEl.hidden = true;
  if (!resultCard) return;

  resultCard.hidden = false;
  const zhEl = document.getElementById('sentenceResultZh');
  const pyEl = document.getElementById('sentenceResultPy');
  const viEl = document.getElementById('sentenceResultVi');
  const statusEl = document.getElementById('sentenceResultStatusText');

  if (statusEl) {
    statusEl.textContent = `Chính xác! Bạn đã hoàn thành câu ${entry.question_number}.`;
  }
  if (zhEl) zhEl.textContent = entry.solution_zh;
  if (pyEl) {
    pyEl.textContent = entry.sentence_py || '';
    pyEl.hidden = !sentenceGameShowPinyin;
  }
  if (viEl) {
    viEl.textContent = entry.meaning_vi || '';
  }

  const disclosure = document.getElementById('sentenceGrammarDisclosure');
  const grammarContent = document.getElementById('sentenceGrammarContent');
  if (disclosure && grammarContent) {
    if (entry.grammar_point) {
      disclosure.hidden = false;
      disclosure.open = true; // Open to help learners absorb the HSK 4 grammar rule
      grammarContent.innerHTML = `
        <p class="grammar-point-text">
          <span class="grammar-badge">Ngữ pháp HSK 4:</span> ${escapeHtml(entry.grammar_point)}
        </p>
      `;
    } else {
      disclosure.hidden = true;
    }
  }

  const nextBtn = document.getElementById('sentenceResultNextBtn');
  if (nextBtn) {
    setTimeout(() => nextBtn.focus(), 60);
  }
}

function shakeSentenceGameSlots() {
  const slotsEl = document.getElementById('sentenceGameSlots');
  if (!slotsEl) return;
  slotsEl.classList.remove('shake');
  void slotsEl.offsetWidth;
  slotsEl.classList.add('shake');
  setTimeout(() => slotsEl.classList.remove('shake'), 450);
}

function revealSentenceHint() {
  const entry = sentenceGameCurrentEntry;
  if (!entry || sentenceGameSolved) return;
  const feedbackEl = document.getElementById('sentenceGameFeedback');
  if (!feedbackEl) return;

  // First token of official solution
  const firstTok = entry.tokens && entry.tokens[0] ? entry.tokens[0] : '';
  const grammar = entry.grammar_point || '';
  feedbackEl.textContent = `💡 Gợi ý: Hãy chú ý cấu trúc “${grammar}”. Nghĩa tiếng Việt: “${entry.meaning_vi}”.`;
  feedbackEl.className = 'sentence-game-feedback warning';
}

function loadNextSentenceGameRound() {
  const questions = getQuestionsForCurrentExam();
  if (sentenceGameQuestionIdx + 1 < questions.length) {
    sentenceGameQuestionIdx++;
  } else {
    // If finished exam, either jump back to 0 or advance to next exam
    sentenceGameQuestionIdx = 0;
  }
  loadCurrentSentenceQuestion();
  syncSentenceUrl();
}

function speakCurrentSentence() {
  const entry = sentenceGameCurrentEntry;
  if (!entry || !entry.solution_zh) return;
  const speakBtn = document.getElementById('sentenceResultSpeakBtn');
  if (typeof speakText === 'function') {
    const rate = typeof exampleSpeechSpeed !== 'undefined' ? exampleSpeechSpeed : 0.85;
    speakText(entry.solution_zh, speakBtn, rate);
  }
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

// Keyboard shortcuts for HSK 4 Sentence Game
window.addEventListener('keydown', (e) => {
  const screen = document.getElementById('screenSentenceGame');
  if (!screen || screen.style.display === 'none') return;
  if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

  if (e.key === 'Enter') {
    e.preventDefault();
    if (sentenceGameSolved) {
      loadNextSentenceGameRound();
    } else {
      checkSentenceGameAnswer();
    }
    return;
  }

  if (e.key === 'Backspace' && !sentenceGameSolved && sentenceGameSlots.length > 0) {
    e.preventDefault();
    removeSentenceGameSlot(sentenceGameSlots.length - 1);
    return;
  }

  // Number keys 1-9 to pick bank tokens
  const num = parseInt(e.key, 10);
  if (!isNaN(num) && num >= 1 && num <= sentenceGameBankTokens.length && !sentenceGameSolved) {
    e.preventDefault();
    pickSentenceGameToken(sentenceGameBankTokens[num - 1].id);
  }
});
