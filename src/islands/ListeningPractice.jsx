// HSK 4 Listening Practice (Nghe và chọn Đúng / Sai) with a content-alignment (boundary) editor.
// Preact port of the former assets/js/listening-practice.js. The audio controller is unchanged; the
// screen (#screenListeningPractice) renders in JSX and render() re-renders it. Per-frame progress and the
// editor's time readout are still written directly to their elements, as before.
// window.ListeningPractice keeps the same API for the tab router and SpaRouter.
import { render as preactRender } from 'preact';

/* global HSK4_MOCK_EXAMS -- utils.js */

let view = 'idle'; // 'idle' | 'loading' | 'error' | 'ready'
let loadError = '';

// ---------------------------------------------------------------------------
// Data state
// ---------------------------------------------------------------------------
let examData = null;
let currentExamId = 'H41001';
let currentQuestionIndex = 0;
let currentQuestion = null;
let currentMode = 'learner'; // 'learner' | 'editor'
let userSessionAnswers = {}; // { [questionId]: { answered, selectedChoice, isCorrect } }
let settingsMenuOpen = false;
let rulesOpen = false;

const learnerState = {
  answered: false,
  selectedChoice: null,
  isCorrect: null,
  showPinyin: true,
  showTranslation: true,
  speed: 1.0,
  loop: false,
  activePlayingSegment: null // null | 'full_question' | sentenceId
};

const editorState = {
  selectedSegmentKey: 'passage', // 'passage' | 'statement' | 'full_question' | sentenceId
  previewPlaying: false,
  loop: false,
  lastSaved: null
};

// Rendering is synchronous, like the legacy innerHTML render, because callers write to the
// rendered elements right after (time readout, error box). A full render() also starts a fresh
// editor message box, as the legacy markup did; updatePlaybackUI() only refreshes play states.
let screenEl = null;
let renderEpoch = 0;

function rerender() {
  if (screenEl) preactRender(<ListeningPracticeScreen />, screenEl);
}

function render() {
  renderEpoch++;
  rerender();
}

// ---------------------------------------------------------------------------
// Shared audio controller (precise boundary detection via rAF)
// ---------------------------------------------------------------------------
let audio = null;
let activeSegment = null; // { startMs, endMs, onEnd, loop, loopPauseMs }
let rafId = null;
let loopTimer = null;
let audioRetryTimer = null;
let autoRetryAttempted = false;
let isSeeking = false;
let audioDurationSec = 0;

function resetAudio() {
  stopMonitoring();
  if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
  if (audioRetryTimer) { clearTimeout(audioRetryTimer); audioRetryTimer = null; }
  if (audio) {
    try {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    } catch (e) { /* already gone */ }
    audio = null;
  }
  isSeeking = false;
}

function handleAudioError(rawMsg) {
  console.error('ListeningPractice Audio Error:', rawMsg, audio ? audio.error : null);
  const prevSeg = activeSegment;
  const prevActivePlaying = learnerState.activePlayingSegment;
  stopAudio();

  // Auto-retry once on an intermittent format/decode or network glitch
  if (!autoRetryAttempted && prevSeg) {
    autoRetryAttempted = true;
    console.warn('Intermittent audio error detected (' + rawMsg + '). Retrying with clean audio instance...');
    resetAudio();
    audioRetryTimer = setTimeout(() => {
      if (currentQuestion && prevSeg) {
        learnerState.activePlayingSegment = prevActivePlaying;
        playSegment(prevSeg.startMs, prevSeg.endMs, { loop: prevSeg.loop, loopPauseMs: prevSeg.loopPauseMs, onEnd: prevSeg.onEnd });
      }
    }, 400);
    return;
  }

  autoRetryAttempted = false;
  let userMsg = 'Không thể phát âm thanh. Vui lòng bấm "Thử lại".';
  if (rawMsg && (rawMsg.includes('Format error') || rawMsg.includes('MEDIA_ELEMENT_ERROR'))) {
    userMsg = 'Đường truyền âm thanh bị gián đoạn. Vui lòng bấm "Thử lại".';
  }
  renderAudioError(userMsg, true);
  resetAudio();
}

function initAudio() {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = 'auto';
  if ('preservesPitch' in audio) audio.preservesPitch = true;
  audio.addEventListener('loadedmetadata', () => {
    audioDurationSec = audio.duration || 0;
    updateEditorTimelineReadout();
  });
  audio.addEventListener('error', () => {
    handleAudioError(audio && audio.error ? audio.error.message : 'Lỗi tải âm thanh');
  });
  audio.addEventListener('pause', () => {
    if (!isSeeking && !loopTimer) stopMonitoring();
  });
  return audio;
}

function stopAudio() {
  if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
  stopMonitoring();
  if (audio) {
    try { audio.pause(); } catch (e) { /* ignore */ }
  }
  activeSegment = null;
  isSeeking = false;
  learnerState.activePlayingSegment = null;
  editorState.previewPlaying = false;
  updatePlaybackUI();
}

function stopMonitoring() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function monitorBoundary() {
  if (!audio || !activeSegment || audio.paused || isSeeking) return;
  const currentMs = audio.currentTime * 1000;
  updatePlaybackProgressUI(currentMs);

  if (currentMs >= activeSegment.endMs) {
    if (activeSegment.loop) {
      audio.pause();
      const seg = activeSegment;
      loopTimer = setTimeout(() => {
        if (!activeSegment || activeSegment !== seg) return;
        playSegment(seg.startMs, seg.endMs, { loop: true, loopPauseMs: seg.loopPauseMs, onEnd: seg.onEnd });
      }, seg.loopPauseMs || 600);
      return;
    }
    audio.pause();
    const onEndCb = activeSegment.onEnd;
    activeSegment = null;
    learnerState.activePlayingSegment = null;
    editorState.previewPlaying = false;
    updatePlaybackUI();
    if (typeof onEndCb === 'function') onEndCb();
    return;
  }
  rafId = requestAnimationFrame(monitorBoundary);
}

function playSegment(startMs, endMs, options = {}) {
  initAudio();
  if (!currentQuestion || !currentQuestion.audio_src) return;
  if (startMs == null || endMs == null || isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
    renderAudioError('Mốc thời gian chưa hợp lệ hoặc chưa được thiết lập.');
    return;
  }
  if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
  stopMonitoring();

  const expectedSrc = currentQuestion.audio_src;
  if (!audio.src || !audio.src.endsWith(expectedSrc)) audio.src = expectedSrc;

  audio.playbackRate = learnerState.speed || 1.0;
  activeSegment = {
    startMs: Math.max(0, startMs),
    endMs: Math.max(startMs + 50, endMs),
    loop: Boolean(options.loop),
    loopPauseMs: options.loopPauseMs || 600,
    onEnd: options.onEnd
  };
  const targetSec = activeSegment.startMs / 1000;
  isSeeking = true;

  const beginPlayback = () => {
    isSeeking = false;
    autoRetryAttempted = false;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err) => {
        console.warn('Audio play failed:', err);
        isSeeking = false;
        if (err.name !== 'AbortError') renderAudioError('Không thể phát âm thanh. Vui lòng bấm vào trang để cấp quyền phát.', true);
        stopAudio();
      });
    }
    stopMonitoring();
    rafId = requestAnimationFrame(monitorBoundary);
    updatePlaybackUI();
  };

  const seekAndPlay = () => {
    if (Math.abs(audio.currentTime - targetSec) < 0.03) {
      beginPlayback();
      return;
    }
    let seekTimer = null;
    const onSeeked = () => {
      if (seekTimer) clearTimeout(seekTimer);
      audio.removeEventListener('seeked', onSeeked);
      beginPlayback();
    };
    audio.addEventListener('seeked', onSeeked, { once: true });
    seekTimer = setTimeout(() => {
      audio.removeEventListener('seeked', onSeeked);
      beginPlayback();
    }, 1500);
    try {
      audio.currentTime = targetSec;
    } catch (e) {
      if (seekTimer) clearTimeout(seekTimer);
      audio.removeEventListener('seeked', onSeeked);
      beginPlayback();
    }
  };

  // Freshly loaded audio: wait for metadata before seeking (readyState === 0)
  if (audio.readyState === 0) {
    let readyTimer = null;
    const onReady = () => {
      if (readyTimer) clearTimeout(readyTimer);
      audio.removeEventListener('loadedmetadata', onReady);
      audio.removeEventListener('canplay', onReady);
      seekAndPlay();
    };
    audio.addEventListener('loadedmetadata', onReady, { once: true });
    audio.addEventListener('canplay', onReady, { once: true });
    readyTimer = setTimeout(() => {
      audio.removeEventListener('loadedmetadata', onReady);
      audio.removeEventListener('canplay', onReady);
      seekAndPlay();
    }, 1500);
    try { audio.load(); } catch (e) { /* ignore */ }
  } else {
    seekAndPlay();
  }
}

function setSpeed(rate) {
  learnerState.speed = rate;
  if (audio) audio.playbackRate = rate;
  updatePlaybackUI();
}

function toggleLoop() {
  learnerState.loop = !learnerState.loop;
  if (activeSegment) activeSegment.loop = learnerState.loop;
  updatePlaybackUI();
}

// ---------------------------------------------------------------------------
// Data loading & localStorage draft management
// ---------------------------------------------------------------------------
function getStorageKey(questionId) {
  const qId = questionId || (currentQuestion ? currentQuestion.id : 'default');
  return `hsk_listening_${qId.toLowerCase()}_draft`;
}

async function loadData(examId = currentExamId, qIndex = currentQuestionIndex) {
  currentExamId = examId;
  currentQuestionIndex = qIndex;
  try {
    const res = await fetch(`database/listening/hsk4_${examId.toLowerCase()}.json`);
    if (!res.ok) throw new Error(`Không thể tải cơ sở dữ liệu bài thi nghe ${examId}.`);
    const data = await res.json();
    examData = data;
    if (data.questions && data.questions.length > 0) {
      const idx = Math.max(0, Math.min(qIndex, data.questions.length - 1));
      currentQuestionIndex = idx;
      currentQuestion = JSON.parse(JSON.stringify(data.questions[idx]));
      restoreQuestionSessionState();
      restoreLocalDraft();
      syncAudioSource();
    }
    return examData;
  } catch (err) {
    console.error('Error loading listening data:', err);
    throw err;
  }
}

function syncAudioSource() {
  if (!audio || !currentQuestion) return;
  const targetSrc = currentQuestion.audio_src || (examData ? examData.audio_src : '');
  if (!targetSrc) return;
  if (!(audio.getAttribute('src') || '').endsWith(targetSrc)) {
    audio.src = targetSrc;
    audio.load();
  }
}

function restoreQuestionSessionState() {
  if (!currentQuestion) return;
  const saved = userSessionAnswers[currentQuestion.id];
  learnerState.answered = saved ? saved.answered : false;
  learnerState.selectedChoice = saved ? saved.selectedChoice : null;
  learnerState.isCorrect = saved ? saved.isCorrect : null;
  learnerState.activePlayingSegment = null;
}

function restoreLocalDraft() {
  if (!currentQuestion) return;
  try {
    const saved = localStorage.getItem(getStorageKey(currentQuestion.id));
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (parsed && parsed.id === currentQuestion.id && parsed.segments) {
      currentQuestion.segments = parsed.segments;
      if (parsed.transcript && parsed.transcript.sentences) currentQuestion.transcript.sentences = parsed.transcript.sentences;
      if (parsed.alignment) currentQuestion.alignment = parsed.alignment;
      editorState.lastSaved = parsed._savedAt || 'Trước đó';
    }
  } catch (e) {
    console.warn('Could not restore listening draft from localStorage', e);
  }
}

function saveLocalDraft() {
  if (!currentQuestion) return;
  try {
    const now = new Date().toLocaleTimeString('vi-VN');
    localStorage.setItem(getStorageKey(currentQuestion.id), JSON.stringify({
      id: currentQuestion.id,
      segments: currentQuestion.segments,
      transcript: currentQuestion.transcript,
      alignment: currentQuestion.alignment,
      _savedAt: now
    }));
    editorState.lastSaved = now;
    showEditorFeedback('Đã lưu bản nháp vào trình duyệt lúc ' + now);
  } catch (e) {
    showEditorFeedback('Lỗi lưu nháp trình duyệt: ' + e.message, true);
  }
}

async function switchExam(examId) {
  if (!examId || (examId === currentExamId && examData)) return;
  stopAudio();
  currentExamId = examId;
  currentQuestionIndex = 0;
  try {
    await loadData(examId, 0);
    render();
  } catch (err) {
    console.error('Failed to switch exam:', err);
  }
}

function goToQuestion(index) {
  if (!examData || !examData.questions) return;
  if (index < 0 || index >= examData.questions.length) return;
  stopAudio();
  currentQuestionIndex = index;
  currentQuestion = JSON.parse(JSON.stringify(examData.questions[index]));
  restoreQuestionSessionState();
  restoreLocalDraft();
  syncAudioSource();
  render();
}

function prevQuestion() {
  if (currentQuestionIndex > 0) goToQuestion(currentQuestionIndex - 1);
}

function nextQuestion() {
  if (examData && currentQuestionIndex < examData.questions.length - 1) goToQuestion(currentQuestionIndex + 1);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
async function init() {
  if (!document.getElementById('screenListeningPractice')) return;
  document.body.classList.add('listening-view-active');
  initAudio();
  attachGlobalListeners();
  view = 'loading';
  render();
  try {
    await loadData();
    view = 'ready';
  } catch (err) {
    loadError = err.message;
    view = 'error';
  }
  render();
}

function getQuestionProgressText() {
  if (!currentQuestion) return '';
  const questions = (examData && Array.isArray(examData.questions)) ? examData.questions : [];
  // Only show a total when the dataset really has several questions
  return questions.length > 1 ? `Câu ${currentQuestion.question_number} / ${questions.length}` : `Câu ${currentQuestion.question_number}`;
}

function toggleSettingsMenu(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  settingsMenuOpen = !settingsMenuOpen;
  render();
}

function toggleRulesDialog(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  rulesOpen = !rulesOpen;
  render();
}

function setMode(mode) {
  if (currentMode === mode) return;
  stopAudio();
  currentMode = mode;
  settingsMenuOpen = false;
  render();
}

function goBack() {
  stopAudio();
  if (typeof window.setPrimaryTab === 'function') window.setPrimaryTab('vocab');
}

// ---------------------------------------------------------------------------
// Natural pinyin formatter & compounds dictionary
// ---------------------------------------------------------------------------
const COMMON_PINYIN_COMPOUNDS = {
  'tā men': 'tāmen', 'wǒ men': 'wǒmen', 'nǐ men': 'nǐmen',
  'jīng cháng': 'jīngcháng', 'liáo tiān': 'liáotiān',
  'diàn tī': 'diàntī', 'kě néng': 'kěnéng', 'dà lóu': 'dàlóu',
  'shàng bān': 'shàngbān', 'cóng lái': 'cónglái', 'méi yǒu': 'méiyǒu',
  'shuō huà': 'shuōhuà', 'shú xī': 'shúxī', 'xī hóng shì': 'xīhóngshì',
  'jī dàn': 'jīdàn', 'jiǎn dān': 'jiǎndān', 'fù zá': 'fùzá',
  'zhǔn bèi': 'zhǔnbèi', 'bǎo zhèng': 'bǎozhèng', 'xué huì': 'xuéhuì',
  'lán qiú': 'lánqiú', 'yùn dòng yuán': 'yùndòngyuán', 'zhù míng': 'zhùmíng',
  'xǐ huān': 'xǐhuan', 'xǐ huan': 'xǐhuan', 'tí qián': 'tíqián', 'wán chéng': 'wánchéng',
  'rèn wù': 'rènwu', 'rèn wu': 'rènwu', 'gǔ zhǎng': 'gǔzhǎng', 'zhù hè': 'zhùhè',
  'jī chǎng': 'jīchǎng', 'chū chāi': 'chūchāi', 'qǐ fēi': 'qǐfēi',
  'diàn huà': 'diànhuà', 'xìng gé': 'xìnggé', 'ān jìng': 'ānjìng',
  'jiā bān': 'jiābān', 'yǎn chū': 'yǎnchū', 'yǎn yuán': 'yǎnyuán',
  'jīng cǎi': 'jīngcǎi', 'jì huà': 'jìhuà', 'diào chá': 'diàochá',
  'jié guǒ': 'jiéguǒ', 'shì chǎng': 'shìchǎng', 'fā shāo': 'fāshāo',
  'yī yuàn': 'yīyuàn', 'dà fū': 'dàifu', 'dǎ zhēn': 'dǎzhēn', 'hài pà': 'hàipà',
  'qiān zhèng': 'qiānzhèng', 'yǐ jīng': 'yǐjīng', 'bàn hǎo': 'bànhǎo',
  'zhè ge': 'zhège', 'nà ge': 'nàge', 'yí yàng': 'yíyàng', 'dàn shì': 'dànshì',
  'yù dào': 'yùdào', 'zhǐ shì': 'zhǐshì', 'kàn zhe': 'kànzhe', 'yī qǐ': 'yìqǐ',
  'yì qǐ': 'yìqǐ', 'bù cuò': 'bùcuò', 'tiān qì': 'tiānqì', 'jīn tiān': 'jīntiān',
  'shù lín': 'shùlín', 'zǒu zou': 'zǒuzou', 'yáng guāng': 'yángguāng', 'nuǎn huo': 'nuǎnhuo',
  'tú shū guǎn': 'túshūguǎn', 'mén kǒur': 'ménkǒur'
};
const COMPOUND_KEYS = Object.keys(COMMON_PINYIN_COMPOUNDS).sort((a, b) => b.length - a.length);

function formatNaturalPinyin(pinyinStr) {
  if (!pinyinStr || typeof pinyinStr !== 'string') return '';
  let text = pinyinStr.trim();
  text = text.replace(/。/g, '. ').replace(/，/g, ', ').replace(/？/g, '? ').replace(/！/g, '! ').replace(/：/g, ': ');
  text = text.replace(/\s+([.,?!:;])/g, '$1');
  COMPOUND_KEYS.forEach((k) => { text = text.replace(new RegExp(k, 'gi'), COMMON_PINYIN_COMPOUNDS[k]); });
  text = text.replace(/\s{2,}/g, ' ').trim();
  if (text.length > 0) text = text.charAt(0).toUpperCase() + text.slice(1);
  return text.replace(/([.?!]\s+)([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])/g, (m, p1, p2) => p1 + p2.toUpperCase());
}

// ---------------------------------------------------------------------------
// Icons & play-button bodies
// ---------------------------------------------------------------------------
const PlayingWaves = () => <span class="listening-playing-waves" aria-hidden="true"><span></span><span></span><span></span></span>;

function PauseIcon({ size, rounded = true, className }) {
  const rx = rounded ? '1' : undefined;
  return (
    <svg class={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx={rx} /><rect x="14" y="4" width="4" height="16" rx={rx} />
    </svg>
  );
}

const PlayIcon = ({ size, points = '5 3 19 12 5 21 5 3' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points={points} /></svg>
);

const CheckIcon = ({ size, width = '2.5' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={width}><polyline points="20 6 9 17 4 12" /></svg>
);

const CrossIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

const ChevronLeft = ({ size, width = '2.5' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={width}><polyline points="15 18 9 12 15 6" /></svg>
);

const PenIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
);

const primaryPlayInner = (playing) => (playing
  ? <><PauseIcon size={15} />{' '}<PlayingWaves />{' '}<span>Tạm dừng</span></>
  : <><PlayIcon size={15} />{' '}<span>Nghe đoạn này</span></>);

const evidencePlayInner = (playing) => (playing
  ? <><PauseIcon size={13} />{' '}<PlayingWaves />{' '}<span>Đang phát</span></>
  : <><PlayIcon size={13} points="6 4 19 12 6 20 6 4" />{' '}<span>Nghe câu này</span></>);

const rowPlayInner = (playing) => (playing
  ? <><PlayingWaves />{' '}<PauseIcon size={14} className="listening-pause-icon" /></>
  : <PlayIcon size={14} points="6 4 19 12 6 20 6 4" />);

const previewInner = (playing) => (playing
  ? <><PauseIcon size={13} rounded={false} />{' '}<span>Dừng phát thử</span></>
  : <><PlayIcon size={13} />{' '}<span>Phát thử đoạn đã chọn (Preview)</span></>);

// ---------------------------------------------------------------------------
// Learner view
// ---------------------------------------------------------------------------
function MetaBar() {
  const questions = (examData && Array.isArray(examData.questions)) ? examData.questions : [currentQuestion];
  return (
    <div class="listening-meta-bar">
      <div class="listening-meta-left">
        <span class="listening-section-label">Nghe và chọn Đúng / Sai</span>{' '}
        <span class="listening-mode-chip">Chế độ luyện tập</span>
      </div>{' '}
      <div class="listening-meta-right">
        <div class="listening-progress-map" role="tablist" aria-label="Bản đồ tiến độ bài thi">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentQuestionIndex;
            const ans = userSessionAnswers[q.id];
            const isDone = ans && ans.answered;
            let dotClass = 'pending';
            if (isCurrent) dotClass = 'is-current';
            else if (isDone) dotClass = ans.isCorrect ? 'is-correct' : 'is-incorrect';
            return [' ', (
              <button key={q.id} type="button" class={`listening-map-dot ${dotClass}`} onClick={() => goToQuestion(idx)} role="tab"
                aria-selected={String(isCurrent)} title={`Câu ${q.question_number}${isDone ? (ans.isCorrect ? ' (Đúng)' : ' (Sai)') : ''}`}>
                {q.question_number}
              </button>
            )];
          })}
        </div>
      </div>
    </div>
  );
}

function ChoiceButton({ choiceVal }) {
  const label = choiceVal ? 'Đúng' : 'Sai';
  let stateClass = '';
  let subtext = '';
  let subtextClass = '';
  if (learnerState.answered) {
    const isThisChoice = learnerState.selectedChoice === choiceVal;
    const isCorrectChoice = currentQuestion.answer === choiceVal;
    if (isThisChoice && isCorrectChoice) {
      stateClass = 'is-correct-selected'; subtext = 'Bạn đã chọn · Chính xác'; subtextClass = 'is-correct';
    } else if (isThisChoice) {
      stateClass = 'is-incorrect-selected'; subtext = 'Bạn đã chọn'; subtextClass = 'is-incorrect';
    } else if (isCorrectChoice) {
      stateClass = 'is-correct-answer'; subtext = 'Đáp án đúng'; subtextClass = 'is-correct';
    } else {
      stateClass = 'is-dimmed';
    }
  }
  const icon = choiceVal
    ? <svg class="listening-choice-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    : <svg class="listening-choice-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
  return (
    <button type="button" class={`listening-choice-btn choice-${choiceVal ? 'true' : 'false'} ${stateClass}`}
      onClick={() => submitAnswer(choiceVal)} disabled={learnerState.answered} aria-label={label}>
      <div class="listening-choice-main">
        <span class="listening-choice-icon-wrap" aria-hidden="true">{icon}</span>{' '}
        <span class="listening-choice-primary">{label}</span>
      </div>{' '}
      {learnerState.answered && subtext && <span class={`listening-choice-subtext ${subtextClass}`}>{subtext}</span>}
    </button>
  );
}

function UnalignedNotice() {
  return (
    <div class="listening-notice-box">
      <strong>Chưa có mốc thời gian âm thanh cho câu hỏi này.</strong>{' '}
      <p>Vui lòng mở <em>Căn chỉnh audio</em> để thiết lập mốc bắt đầu và kết thúc.</p>
    </div>
  );
}

// Seek track: click / ← → to seek, Space / Enter to play. Fill, thumb and the time readout are
// updated per frame by updatePlaybackProgressUI(); recreated on each full render (starts at 0 again).
function LearnerAudioPlayer() {
  const isPlayingFull = learnerState.activePlayingSegment === 'full_question';
  const seg = currentQuestion.segments ? currentQuestion.segments.full_question : null;
  const totalMs = seg ? Math.max(0, seg.end_ms - seg.start_ms) : 0;
  const onTrackClick = (e) => {
    const fullSeg = currentQuestion.segments.full_question;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekFullQuestion(fullSeg.start_ms + pos * (fullSeg.end_ms - fullSeg.start_ms));
  };
  const onTrackKey = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); seekRelative(-2); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); seekRelative(2); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); togglePlayFullQuestion(); }
  };
  return (
    <div class="listening-player-surface">
      <div class="listening-player-controls-grid">
        <button type="button" class={`listening-play-primary-btn ${isPlayingFull ? 'is-playing' : ''}`}
          onClick={togglePlayFullQuestion} aria-label={isPlayingFull ? 'Tạm dừng' : 'Nghe đoạn này'}>
          {primaryPlayInner(isPlayingFull)}
        </button>{' '}
        <div class="listening-player-right-col">
          <div class="listening-progress-wrap">
            <div class="listening-progress-track" id="learnerProgressTrack" tabindex="0" role="slider"
              aria-label="Thanh tua âm thanh" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
              title="Bấm để tua hoặc dùng phím mũi tên ← →" onClick={seg ? onTrackClick : undefined} onKeyDown={seg ? onTrackKey : undefined}>
              <div class="listening-progress-fill" id="learnerProgressFill"></div>{' '}
              <span class="listening-progress-thumb" id="learnerProgressThumb"></span>
            </div>{' '}
            <div class="listening-time-readout" id="learnerTimeBadge">{`0:00 / ${formatLearnerTime(totalMs)}`}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Play [startMs, endMs] as the learner's active segment (full question or a sentence id).
function playLearnerSegment(segmentId, startMs, endMs) {
  learnerState.activePlayingSegment = segmentId;
  playSegment(startMs, endMs, {
    loop: learnerState.loop,
    onEnd: () => {
      learnerState.activePlayingSegment = null;
      updatePlaybackUI();
    }
  });
}

function togglePlayFullQuestion() {
  if (learnerState.activePlayingSegment === 'full_question') {
    stopAudio();
  } else {
    const seg = currentQuestion.segments.full_question;
    if (!seg || seg.start_ms == null) return;
    playLearnerSegment('full_question', seg.start_ms, seg.end_ms);
  }
  updatePlaybackUI();
}

function togglePlaySentence(sentenceId) {
  if (learnerState.activePlayingSegment === sentenceId) {
    stopAudio();
  } else {
    const sents = (currentQuestion && currentQuestion.transcript && currentQuestion.transcript.sentences) || [];
    const sIdx = sents.findIndex((s) => s.id === sentenceId);
    if (sIdx === -1) return;
    const sentence = sents[sIdx];
    if (sentence.start_ms == null || sentence.end_ms == null) return;
    const startMs = sentence.start_ms;
    let endMs = sentence.end_ms;
    // Natural acoustic tail: the last sentence plays up to the passage end; others borrow up to
    // 100ms of the following silence.
    const passSeg = currentQuestion.segments && currentQuestion.segments.passage;
    if (passSeg && passSeg.end_ms != null && sIdx === sents.length - 1) {
      endMs = Math.max(endMs, passSeg.end_ms);
    } else if (sIdx < sents.length - 1) {
      const nextSent = sents[sIdx + 1];
      if (nextSent && nextSent.start_ms != null && nextSent.start_ms > endMs) {
        endMs += Math.min(100, Math.max(0, nextSent.start_ms - endMs - 40));
      }
    }
    playLearnerSegment(sentenceId, startMs, endMs);
  }
  updatePlaybackUI();
}

function submitAnswer(choice) {
  if (learnerState.answered) return;
  learnerState.answered = true;
  learnerState.selectedChoice = choice;
  learnerState.isCorrect = choice === currentQuestion.answer;
  userSessionAnswers[currentQuestion.id] = { answered: true, selectedChoice: choice, isCorrect: learnerState.isCorrect };
  render();
}

// Wrap every occurrence of the evidence phrase in the sentence with a highlight mark.
function EvidenceHighlight({ sentZh, evidenceZh }) {
  if (!sentZh) return null;
  const cleanEv = evidenceZh ? String(evidenceZh).replace(/^[“”"'\s]+|[“”"'\s]+$/g, '').trim() : '';
  if (!cleanEv || !sentZh.includes(cleanEv)) return sentZh;
  return sentZh.split(cleanEv).flatMap((part, i) => (i === 0 ? [part]
    : [<mark key={i} class="listening-evidence-highlight listening-evidence-inline-mark">{cleanEv}</mark>, part]));
}

const ULTRA_BASIC = new Set(['没有', '我们', '我', '你', '他', '她', '这', '那', '的', '了']);
const LEVEL_ORDER = { HSK4: 4, HSK3: 3, HSK2: 2, HSK1: 1 };

function getPrioritizedVocabularies(vocabs) {
  if (!Array.isArray(vocabs)) return [];
  const nonBasic = vocabs.filter((v) => !ULTRA_BASIC.has(v.word));
  const filtered = nonBasic.length >= 4 ? nonBasic : vocabs;
  return [...filtered].sort((a, b) => {
    const aBasic = ULTRA_BASIC.has(a.word) ? 1 : 0;
    const bBasic = ULTRA_BASIC.has(b.word) ? 1 : 0;
    if (aBasic !== bBasic) return aBasic - bBasic;
    const aLvl = LEVEL_ORDER[a.level] || 0;
    const bLvl = LEVEL_ORDER[b.level] || 0;
    if (aLvl !== bLvl) return bLvl - aLvl;
    return (b.word || '').length - (a.word || '').length;
  });
}

function CompactFeedback() {
  const q = currentQuestion;
  const isCorrect = learnerState.isCorrect;
  const sentences = (q.transcript && Array.isArray(q.transcript.sentences)) ? q.transcript.sentences : [];
  let evidenceSentence = null;
  if (q.evidence) {
    if (typeof q.evidence.sentence_index === 'number' && sentences[q.evidence.sentence_index]) {
      evidenceSentence = sentences[q.evidence.sentence_index];
    } else if (q.evidence.zh) {
      evidenceSentence = sentences.find((s) => s.zh && (s.zh.includes(q.evidence.zh) || q.evidence.zh.includes(s.zh)));
    }
  }
  const evidenceSentenceId = evidenceSentence ? evidenceSentence.id : (sentences.length > 0 ? sentences[0].id : null);
  const evidenceVi = evidenceSentence && evidenceSentence.vi ? evidenceSentence.vi : '';
  const isEvidencePlaying = Boolean(evidenceSentenceId && learnerState.activePlayingSegment === evidenceSentenceId);
  const answerLabel = q.answer ? 'Đúng' : 'Sai';
  const statusText = isCorrect ? `Bạn trả lời đúng · Đáp án: ${answerLabel}` : `Bạn trả lời chưa đúng · Đáp án: ${answerLabel}`;
  const evidenceZhText = evidenceSentence ? evidenceSentence.zh : (q.evidence ? q.evidence.zh : '');
  const playLabel = isEvidencePlaying ? 'Tạm dừng câu này' : 'Nghe câu này';

  return (
    <div class={`listening-feedback-card ${isCorrect ? 'is-correct' : 'is-incorrect'}`}>
      <div class="listening-feedback-status">
        <span class={`listening-feedback-badge ${isCorrect ? 'badge-correct' : 'badge-incorrect'}`}>
          {isCorrect ? <CheckIcon size={16} /> : <CrossIcon size={16} />}{' '}
          <span>{statusText}</span>
        </span>
      </div>{' '}
      <div class="listening-feedback-body">
        {evidenceZhText && (
          <div class="listening-feedback-evidence">
            <div class="listening-evidence-playback-row">
              {evidenceSentenceId && (
                <button type="button" class={`listening-evidence-play-btn ${isEvidencePlaying ? 'is-playing' : ''}`}
                  onClick={() => togglePlaySentence(evidenceSentenceId)} title={playLabel} aria-label={playLabel}>
                  {evidencePlayInner(isEvidencePlaying)}
                </button>
              )}{' '}
              <div class="listening-evidence-zh" lang="zh-CN"><EvidenceHighlight sentZh={evidenceZhText} evidenceZh={q.evidence ? q.evidence.zh : ''} /></div>
            </div>{' '}
            {evidenceVi && <div class="listening-evidence-vi">{evidenceVi}</div>}
          </div>
        )}{' '}
        {q.explanation_vi && <div class="listening-feedback-explanation">{q.explanation_vi}</div>}
      </div>
    </div>
  );
}

function TogglePill({ active, onClick, title, label }) {
  return (
    <button type="button" class={`listening-toggle-pill ${active ? 'is-active' : ''}`} onClick={onClick} aria-pressed={String(active)} title={title}>
      <span class="listening-toggle-indicator">{active ? <CheckIcon size={10} width="3" /> : <span class="indicator-off"></span>}</span>{' '}
      <span>{label}</span>
    </button>
  );
}

function TranscriptAndVocab() {
  const q = currentQuestion;
  const sortedVocabs = getPrioritizedVocabularies(q.vocabulary_matches);
  return (
    <div class="listening-transcript-container">
      <div class="listening-transcript-header">
        <div class="listening-transcript-title">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>{' '}
          <span>Lời thoại</span>
        </div>{' '}
        <div class="listening-transcript-toggles">
          <TogglePill active={learnerState.showPinyin} onClick={toggleTranscriptPinyin} title="Bật / tắt Pinyin" label="Pinyin" />{' '}
          <TogglePill active={learnerState.showTranslation} onClick={toggleTranscriptTranslation} title="Bật / tắt Bản dịch" label="Bản dịch" />
        </div>
      </div>{' '}

      <div class="listening-transcript-rows">
        {(q.transcript.sentences || []).map((s) => {
          const isPlayingThis = learnerState.activePlayingSegment === s.id;
          const hasValidTime = s.start_ms != null && s.end_ms != null;
          const label = isPlayingThis ? 'Tạm dừng' : 'Nghe câu này';
          return [' ', (
            <div key={s.id} class={`listening-transcript-row ${isPlayingThis ? 'is-playing-row' : ''}`}>
              <button type="button" class={`listening-row-play-btn ${isPlayingThis ? 'is-playing' : ''}`} onClick={() => togglePlaySentence(s.id)}
                disabled={!hasValidTime}
                title={hasValidTime ? `${label} (${((s.end_ms - s.start_ms) / 1000).toFixed(1)}s)` : 'Chưa có mốc thời gian'}
                aria-label={label}>
                {rowPlayInner(isPlayingThis)}
              </button>{' '}
              <div class="listening-row-content">
                <div class="listening-row-zh" lang="zh-CN"><EvidenceHighlight sentZh={s.zh} evidenceZh={q.evidence ? q.evidence.zh : ''} /></div>{' '}
                {learnerState.showPinyin && s.pinyin && <div class="listening-row-pinyin">{formatNaturalPinyin(s.pinyin)}</div>}{' '}
                {learnerState.showTranslation && s.vi && <div class="listening-row-vi">{s.vi}</div>}
              </div>
            </div>
          )];
        })}
      </div>{' '}

      {q.key_expressions && q.key_expressions.length > 0 && (
        <div class="listening-key-section">
          <div class="listening-section-title">Cụm cần hiểu & Điểm ngữ pháp</div>{' '}
          <div class="listening-key-grid">
            {q.key_expressions.map((item, i) => [' ', (
              <div key={i} class="listening-key-card">
                <div class="listening-key-top">
                  <span class="listening-key-phrase" lang="zh-CN">{item.phrase}</span>{' '}
                  {item.pinyin ? <span class="listening-key-pinyin">{item.pinyin}</span> : null}
                </div>{' '}
                <div class="listening-key-meaning">{item.meaning_vi}</div>{' '}
                {item.note ? <div class="listening-key-note">{item.note}</div> : null}
              </div>
            )])}
          </div>
        </div>
      )}{' '}

      {sortedVocabs.length > 0 && (
        <div class="listening-vocab-section">
          <div class="listening-section-title">Từ vựng trong bài</div>{' '}
          <div class="listening-vocab-grid">
            {sortedVocabs.map((v, i) => [' ', (
              <div key={i} class="listening-vocab-card">
                <div class="listening-vocab-top">
                  <span class="listening-vocab-word" lang="zh-CN">{v.word}</span>{' '}
                  {v.level ? <span class="listening-vocab-badge">{v.level}</span> : null}
                </div>{' '}
                <div class="listening-vocab-meta">
                  <span class="listening-vocab-pinyin">{`${v.pinyin}`}</span>{' '}
                  <span class="listening-vocab-vi">{`${v.meaning_vi}`}</span>
                </div>
              </div>
            )])}
          </div>
        </div>
      )}
    </div>
  );
}

function toggleTranscriptPinyin() {
  learnerState.showPinyin = !learnerState.showPinyin;
  render();
}

function toggleTranscriptTranslation() {
  learnerState.showTranslation = !learnerState.showTranslation;
  render();
}

function LearnerView() {
  const q = currentQuestion;
  const isUnaligned = !q.segments || !q.segments.full_question || q.segments.full_question.start_ms == null;
  const questions = (examData && Array.isArray(examData.questions)) ? examData.questions : [currentQuestion];
  const hasNext = currentQuestionIndex < questions.length - 1;
  return (
    <section class="listening-unified-card" aria-label="Bài tập luyện nghe">
      <MetaBar />{' '}
      <div class="listening-statement-block">
        <div class="listening-statement-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>{' '}
          <span>Mệnh đề nhận định</span>
        </div>{' '}
        <div class="listening-statement-zh" lang="zh-CN">{q.statement.zh}</div>{' '}
        {learnerState.answered && learnerState.showPinyin && q.statement.pinyin && <div class="listening-statement-pinyin">{formatNaturalPinyin(q.statement.pinyin)}</div>}{' '}
        {learnerState.answered && learnerState.showTranslation && q.statement.vi && <div class="listening-statement-vi">{q.statement.vi}</div>}
      </div>{' '}
      {isUnaligned ? <UnalignedNotice /> : <LearnerAudioPlayer key={`${q.id}-${renderEpoch}`} />}{' '}
      <div class="listening-answers-zone">
        <div class="listening-answers-grid">
          <ChoiceButton choiceVal />{' '}
          <ChoiceButton choiceVal={false} />
        </div>
      </div>{' '}
      {learnerState.answered && <CompactFeedback />}{' '}
      {learnerState.answered && <TranscriptAndVocab />}{' '}
      <div class="listening-bottom-nav">
        <button type="button" class="listening-nav-arrow-btn prev" onClick={prevQuestion} disabled={currentQuestionIndex === 0} title="Câu trước">
          <ChevronLeft size={15} />{' '}
          <span>Câu trước</span>
        </button>{' '}
        <button type="button" class={`listening-nav-arrow-btn next ${learnerState.answered ? 'is-answered' : ''}`} onClick={nextQuestion} disabled={!hasNext} title="Câu tiếp theo">
          <span>Câu tiếp theo</span>{' '}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Boundary editor view
// ---------------------------------------------------------------------------
function getSelectedEditorSegment() {
  if (!currentQuestion) return null;
  const key = editorState.selectedSegmentKey;
  if (key === 'passage' || key === 'statement' || key === 'full_question') return currentQuestion.segments[key];
  return (currentQuestion.transcript.sentences || []).find((s) => s.id === key);
}

function getEditorSegmentText(key) {
  if (!currentQuestion) return '';
  if (key === 'passage') return currentQuestion.transcript.full_zh;
  if (key === 'statement') return currentQuestion.statement.zh;
  if (key === 'full_question') return currentQuestion.transcript.full_zh + ' [Nghỉ] ' + currentQuestion.statement.zh;
  const sentence = (currentQuestion.transcript.sentences || []).find((s) => s.id === key);
  return sentence ? sentence.zh : '';
}

function BoundaryColumn({ type, label, seg, setLabel }) {
  const value = seg ? seg[`${type}_ms`] : null;
  return (
    <div class="listening-boundary-col">
      <div class="listening-boundary-label">
        <span>{label}</span>{' '}
        <span class="listening-boundary-ms">{seg ? formatMs(value) : '--'}</span>
      </div>{' '}
      <div class="listening-boundary-inputs">
        <input type="number" class="listening-numeric-input" id={type === 'start' ? 'editorStartInput' : 'editorEndInput'}
          value={seg && value != null ? value : ''} placeholder="ms" step="10" onChange={(e) => updateSegmentBoundary(type, e.currentTarget.value)} />{' '}
        <div class="listening-nudge-group">
          <button type="button" class="listening-nudge-btn" onClick={() => nudgeBoundary(type, -100)} title="Lùi 100ms">-0.1s</button>{' '}
          <button type="button" class="listening-nudge-btn" onClick={() => nudgeBoundary(type, 100)} title="Tiến 100ms">+0.1s</button>
        </div>
      </div>{' '}
      <button type="button" class="listening-set-here-btn" onClick={() => setBoundaryFromCurrent(type)}>
        <span>{setLabel}</span>
      </button>
    </div>
  );
}

function EditorView() {
  const q = currentQuestion;
  const seg = getSelectedEditorSegment();
  const align = q.alignment || {};
  const status = align.status || 'unaligned';
  const statusLabel = status === 'verified' ? 'Đã xác thực' : (status === 'draft' ? 'Bản nháp (Draft)' : 'Chưa căn chỉnh');
  const key = editorState.selectedSegmentKey;
  const tab = (k, text) => (
    <button key={k} type="button" class={`listening-segment-tab ${key === k ? 'active' : ''}`} onClick={() => selectEditorSegment(k)}>{text}</button>
  );
  const transportBtn = (sec, text, title) => (
    <button type="button" class="listening-transport-btn" onClick={() => jumpAudio(sec)} title={title}>{text}</button>
  );

  return (
    <section class="listening-editor-card" aria-label="Bộ căn chỉnh Audio">
      <div class="listening-editor-header">
        <div class="listening-editor-title-wrap">
          <div class="listening-editor-title">
            <PenIcon size={18} />{' '}
            <span>Bộ căn chỉnh mốc audio (Boundary Editor)</span>
          </div>{' '}
          <span class={`listening-editor-status-pill ${status}`} title={`Phương pháp: ${align.method || 'Thủ công'}`}>
            <span class="listening-status-dot"></span>{' '}
            <span>{statusLabel}</span>
          </span>
        </div>{' '}
        <div class="listening-editor-actions">
          <button type="button" class="listening-editor-btn" onClick={exportJSON} title="Xuất dữ liệu câu hỏi thành file JSON">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>{' '}
            <span>Xuất JSON</span>
          </button>{' '}
          <label class="listening-editor-btn" style="margin:0; cursor:pointer;" title="Nhập file JSON đã chỉnh sửa">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>{' '}
            <span>Nhập JSON</span>{' '}
            <input type="file" accept=".json" onChange={importJSON} style="display:none;" />
          </label>{' '}
          <button type="button" class="listening-editor-btn primary" onClick={markAsVerified} title="Xác thực toàn bộ mốc âm thanh">
            <CheckIcon size={13} />{' '}
            <span>Xác thực mốc</span>
          </button>
        </div>
      </div>{' '}

      {/* Recreated on each full render (time readout and scrubber start over, as before) */}
      <div key={`player-${renderEpoch}`} class="listening-master-player">
        <div class="listening-master-player-top">
          <div class="listening-time-display">
            <span class="listening-time-current" id="editorCurrentTime">00:00.000</span>{' '}
            <span class="listening-time-total" id="editorTotalTime">/ 00:00.000</span>
          </div>{' '}
          <div class="listening-transport-buttons">
            {transportBtn(-5, '-5s', 'Lùi 5 giây')}{' '}
            {transportBtn(-1, '-1s', 'Lùi 1 giây')}{' '}
            <button type="button" class="listening-transport-btn play-toggle" id="editorPlayToggleBtn" onClick={toggleMasterPlay}>
              Phát / Dừng
            </button>{' '}
            {transportBtn(1, '+1s', 'Tiến 1 giây')}{' '}
            {transportBtn(5, '+5s', 'Tiến 5 giây')}
          </div>
        </div>{' '}
        <input type="range" class="listening-master-slider" id="editorScrubber" min="0" max="1855" step="0.05" value="0"
          onInput={(e) => onScrubberInput(e.currentTarget.value)} onChange={(e) => onScrubberChange(e.currentTarget.value)} aria-label="Thanh trượt thời gian audio" />
      </div>{' '}

      <div class="listening-segment-tabs" role="tablist">
        {tab('passage', 'Toàn bài nghe (Passage)')}{' '}
        {tab('statement', 'Câu nhận định (Statement)')}{' '}
        {tab('full_question', 'Toàn bộ câu hỏi (Full)')}
        {(q.transcript.sentences || []).map((s, idx) => [' ', tab(s.id, `Câu ${idx + 1}`)])}
      </div>{' '}

      <div class="listening-editor-quote">
        <span class="listening-editor-quote-label">Nội dung đoạn đang chọn:</span>{' '}
        <span class="listening-editor-quote-zh" lang="zh-CN">{getEditorSegmentText(key)}</span>
      </div>{' '}

      <div class="listening-adjuster-panel">
        <BoundaryColumn type="start" label="Mốc Bắt đầu (Start)" seg={seg} setLabel="Đặt mốc BẮT ĐẦU tại vị trí hiện tại" />{' '}
        <BoundaryColumn type="end" label="Mốc Kết thúc (End)" seg={seg} setLabel="Đặt mốc KẾT THÚC tại vị trí hiện tại" />
      </div>{' '}

      <div class="listening-preview-controls">
        <button type="button" class={`listening-preview-btn ${editorState.previewPlaying ? 'is-playing' : ''}`} onClick={togglePreviewSelectedSegment}>
          {previewInner(editorState.previewPlaying)}
        </button>{' '}
        <div class="listening-duration-readout">
          Độ dài đoạn: <strong>{seg && seg.start_ms != null && seg.end_ms != null ? ((seg.end_ms - seg.start_ms) / 1000).toFixed(3) + 's' : '--'}</strong>
        </div>{' '}
        <label class="listening-loop-checkbox-label">
          <input type="checkbox" checked={editorState.loop} onChange={(e) => setEditorLoop(e.currentTarget.checked)} />{' '}
          <span>Lặp lại đoạn (Loop)</span>
        </label>
      </div>{' '}

      {/* Validation errors and save confirmations are written here by showEditorFeedback() */}
      <div key={renderEpoch} class="listening-editor-error" id="editorErrorBox"></div>{' '}

      <div class="listening-editor-footer">
        <span>Trạng thái lưu trữ: <strong>{editorState.lastSaved ? 'Đã lưu nháp lúc ' + editorState.lastSaved : 'Chưa lưu nháp mới'}</strong></span>{' '}
        <button type="button" class="listening-editor-btn" onClick={saveLocalDraft}>Lưu bản nháp</button>
      </div>
    </section>
  );
}

function selectEditorSegment(key) {
  stopAudio();
  editorState.selectedSegmentKey = key;
  render();
  const seg = getSelectedEditorSegment();
  if (seg && seg.start_ms != null && audio) {
    audio.currentTime = seg.start_ms / 1000;
    updateEditorTimelineReadout();
  }
}

function setSegmentBoundary(type, ms) {
  const seg = getSelectedEditorSegment();
  if (!seg) return;
  seg[`${type}_ms`] = ms;
  validateAndSyncSegments();
  saveLocalDraft();
  render();
}

function updateSegmentBoundary(type, value) {
  const intVal = parseInt(value, 10);
  if (!getSelectedEditorSegment() || isNaN(intVal)) return;
  setSegmentBoundary(type, Math.max(0, intVal));
}

function nudgeBoundary(type, deltaMs) {
  const seg = getSelectedEditorSegment();
  if (!seg) return;
  setSegmentBoundary(type, Math.max(0, (seg[`${type}_ms`] || 0) + deltaMs));
}

function setBoundaryFromCurrent(type) {
  if (!audio || !getSelectedEditorSegment()) return;
  setSegmentBoundary(type, Math.round(audio.currentTime * 1000));
}

function validateAndSyncSegments() {
  const errBox = document.getElementById('editorErrorBox');
  const seg = getSelectedEditorSegment();
  if (!seg) return;
  let errorMsg = '';
  if (seg.start_ms != null && seg.end_ms != null) {
    if (seg.start_ms < 0) errorMsg = 'Mốc bắt đầu không được nhỏ hơn 0.';
    else if (seg.start_ms >= seg.end_ms) errorMsg = 'Mốc bắt đầu (' + seg.start_ms + 'ms) phải nhỏ hơn mốc kết thúc (' + seg.end_ms + 'ms).';
    else if (audioDurationSec > 0 && seg.end_ms / 1000 > audioDurationSec) errorMsg = 'Mốc kết thúc vượt quá độ dài toàn bài nghe (' + audioDurationSec.toFixed(1) + 's).';
  }
  if (errBox) {
    errBox.style.display = errorMsg ? 'block' : 'none';
    errBox.textContent = errorMsg;
  }
  const { passage, statement } = currentQuestion.segments;
  if (passage && statement && passage.start_ms != null && statement.end_ms != null) {
    currentQuestion.segments.full_question = { start_ms: passage.start_ms, end_ms: statement.end_ms };
  }
}

function togglePreviewSelectedSegment() {
  if (editorState.previewPlaying) {
    stopAudio();
  } else {
    const seg = getSelectedEditorSegment();
    if (!seg || seg.start_ms == null || seg.end_ms == null) {
      showEditorFeedback('Chưa đủ mốc bắt đầu và kết thúc để phát thử.', true);
      return;
    }
    editorState.previewPlaying = true;
    playSegment(seg.start_ms, seg.end_ms, {
      loop: editorState.loop,
      onEnd: () => {
        editorState.previewPlaying = false;
        updatePlaybackUI();
      }
    });
  }
  updatePlaybackUI();
}

function setEditorLoop(isLoop) {
  editorState.loop = isLoop;
  if (activeSegment) activeSegment.loop = isLoop;
}

function ensureQuestionSource() {
  initAudio();
  if (!audio.src || !audio.src.endsWith(currentQuestion.audio_src)) audio.src = currentQuestion.audio_src;
}

function toggleMasterPlay() {
  ensureQuestionSource();
  if (audio.paused) {
    activeSegment = null; // free playing mode
    audio.play();
    rafId = requestAnimationFrame(monitorBoundary);
  } else {
    audio.pause();
    stopMonitoring();
  }
  updateEditorTimelineReadout();
}

function jumpAudio(seconds) {
  ensureQuestionSource();
  audio.currentTime = Math.max(0, audio.currentTime + seconds);
  updateEditorTimelineReadout();
}

function onScrubberInput(val) {
  const curEl = document.getElementById('editorCurrentTime');
  if (curEl) curEl.textContent = formatSec(parseFloat(val));
}

function onScrubberChange(val) {
  ensureQuestionSource();
  audio.currentTime = parseFloat(val);
  updateEditorTimelineReadout();
}

// Per-frame editor readout: time labels, scrubber position and the play/pause label.
function updateEditorTimelineReadout() {
  if (!audio) return;
  const curEl = document.getElementById('editorCurrentTime');
  const totEl = document.getElementById('editorTotalTime');
  const scrubber = document.getElementById('editorScrubber');
  const playBtn = document.getElementById('editorPlayToggleBtn');
  const curSec = audio.currentTime || 0;
  const totSec = audio.duration || audioDurationSec || 0;
  if (curEl) curEl.textContent = formatSec(curSec);
  if (totEl) totEl.textContent = '/ ' + formatSec(totSec);
  if (scrubber && !isSeeking) {
    scrubber.max = totSec > 0 ? totSec : 1855;
    scrubber.value = curSec;
  }
  if (playBtn) playBtn.textContent = audio.paused ? 'Phát' : 'Tạm dừng';
}

function markAsVerified() {
  if (!currentQuestion) return;
  currentQuestion.alignment = {
    status: 'verified',
    method: 'manual_boundary_editor_reviewed',
    verified_at: new Date().toISOString(),
    notes: 'Reviewed and verified manually via Synapse Hanzi boundary editor.'
  };
  saveLocalDraft();
  render();
  showEditorFeedback('Đã đánh dấu trạng thái ĐÃ XÁC THỰC thành công!');
}

function exportJSON() {
  if (!currentQuestion) return;
  const exportData = {
    exam_id: examData ? examData.exam_id : 'H41001',
    level: examData ? examData.level : 'HSK4',
    title: examData ? examData.title : 'HSK 4 Listening',
    audio_src: currentQuestion.audio_src,
    questions: [currentQuestion]
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `hsk4_${currentQuestion.exam_id.toLowerCase()}_q${currentQuestion.question_number}_aligned.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showEditorFeedback('Đã xuất file JSON thành công!');
}

function importJSON(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      const importedQ = imported.questions ? imported.questions[0] : imported;
      if (!importedQ || !importedQ.segments) throw new Error('Cấu trúc JSON không hợp lệ, thiếu trường segments.');
      currentQuestion.segments = importedQ.segments;
      if (importedQ.transcript && importedQ.transcript.sentences) currentQuestion.transcript.sentences = importedQ.transcript.sentences;
      if (importedQ.alignment) currentQuestion.alignment = importedQ.alignment;
      saveLocalDraft();
      render();
      showEditorFeedback('Đã nhập dữ liệu JSON thành công!');
    } catch (err) {
      showEditorFeedback('Lỗi nhập file JSON: ' + err.message, true);
    }
  };
  reader.readAsText(file);
}

function showEditorFeedback(msg, isError = false) {
  const errBox = document.getElementById('editorErrorBox');
  if (!errBox) {
    alert(msg);
    return;
  }
  Object.assign(errBox.style, {
    display: 'block',
    background: isError ? 'var(--danger-bg)' : 'var(--success-bg)',
    borderColor: isError ? 'rgba(220,38,38,0.3)' : 'rgba(22,163,74,0.3)',
    color: isError ? 'var(--danger-text)' : 'var(--success-text)'
  });
  errBox.textContent = msg;
  setTimeout(() => { errBox.style.display = 'none'; }, 4000);
}

// ---------------------------------------------------------------------------
// Playback UI sync
// ---------------------------------------------------------------------------
// Re-render the play/pause states; reset the learner progress bar when nothing is playing.
function updatePlaybackUI() {
  rerender();
  if (!activeSegment && currentMode === 'learner') {
    const fill = document.getElementById('learnerProgressFill');
    const track = document.getElementById('learnerProgressTrack');
    const badge = document.getElementById('learnerTimeBadge');
    if (fill) fill.style.width = '0%';
    if (track) track.setAttribute('aria-valuenow', '0');
    if (badge && currentQuestion && currentQuestion.segments && currentQuestion.segments.full_question) {
      const seg = currentQuestion.segments.full_question;
      badge.textContent = `0:00 / ${formatLearnerTime(Math.max(0, seg.end_ms - seg.start_ms))}`;
    }
  }
  updateEditorTimelineReadout();
}

function updatePlaybackProgressUI(currentMs) {
  if (currentMode === 'learner' && activeSegment) {
    const segDuration = activeSegment.endMs - activeSegment.startMs;
    const elapsed = Math.max(0, currentMs - activeSegment.startMs);
    const ratio = Math.min(1, Math.max(0, elapsed / segDuration));
    const fill = document.getElementById('learnerProgressFill');
    const track = document.getElementById('learnerProgressTrack');
    const badge = document.getElementById('learnerTimeBadge');
    if (fill) fill.style.width = (ratio * 100).toFixed(1) + '%';
    if (track) track.setAttribute('aria-valuenow', Math.round(ratio * 100));
    if (badge) badge.textContent = `${formatLearnerTime(elapsed)} / ${formatLearnerTime(segDuration)}`;
  }
  if (currentMode === 'editor') updateEditorTimelineReadout();
}

function seekRelative(deltaSec) {
  if (!currentQuestion || !currentQuestion.segments || !currentQuestion.segments.full_question) return;
  const fullSeg = currentQuestion.segments.full_question;
  initAudio();
  let currentMs = audio.currentTime * 1000;
  if (!activeSegment || learnerState.activePlayingSegment !== 'full_question') currentMs = fullSeg.start_ms;
  const targetMs = Math.max(fullSeg.start_ms, Math.min(fullSeg.end_ms, currentMs + deltaSec * 1000));
  seekFullQuestion(targetMs);
  updatePlaybackProgressUI(targetMs);
}

// Jump to targetMs inside the full-question segment, starting it if it is not already playing.
function seekFullQuestion(targetMs) {
  if (activeSegment && learnerState.activePlayingSegment === 'full_question') {
    audio.currentTime = targetMs / 1000;
    return;
  }
  playLearnerSegment('full_question', targetMs, currentQuestion.segments.full_question.end_ms);
  updatePlaybackUI();
}

let globalListenersAttached = false;
function attachGlobalListeners() {
  if (globalListenersAttached) return;
  globalListenersAttached = true;

  // Clicking elsewhere closes the overflow menu and the rules popover
  document.addEventListener('click', (e) => {
    let changed = false;
    const dropdown = document.getElementById('listeningSettingsDropdown');
    const moreBtn = document.getElementById('listeningMoreBtn');
    if (settingsMenuOpen && dropdown && !dropdown.contains(e.target) && (!moreBtn || !moreBtn.contains(e.target))) {
      settingsMenuOpen = false;
      changed = true;
    }
    const rulesPopover = document.getElementById('listeningRulesPopover');
    const rulesBtn = document.getElementById('listeningRulesBtn');
    if (rulesOpen && rulesPopover && !rulesPopover.contains(e.target) && (!rulesBtn || !rulesBtn.contains(e.target))) {
      rulesOpen = false;
      changed = true;
    }
    if (changed) render();
  });

  document.addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('listening-view-active')) return;
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

    if (e.key === 'Escape') {
      if (settingsMenuOpen) {
        settingsMenuOpen = false;
        render();
        return;
      }
      if (rulesOpen) {
        rulesOpen = false;
        render();
        return;
      }
    }

    if (currentMode === 'learner') {
      if (e.key === ' ' || e.key.toLowerCase() === 'p') {
        if (document.activeElement && document.activeElement.tagName.toLowerCase() === 'button') return;
        e.preventDefault();
        togglePlayFullQuestion();
      } else if (e.key === '1' || e.key.toLowerCase() === 't') {
        if (!learnerState.answered) { e.preventDefault(); submitAnswer(true); }
      } else if (e.key === '2' || e.key.toLowerCase() === 'f') {
        if (!learnerState.answered) { e.preventDefault(); submitAnswer(false); }
      } else if (e.key.toLowerCase() === 'r') {
        toggleLoop();
      }
    }
  });
}

// Inline audio error with an optional "Thử lại" (retry) button; removes itself after 7s.
function renderAudioError(msg, showRetry = false) {
  const box = document.getElementById('editorErrorBox') || document.querySelector('.listening-player-surface');
  if (!box) return;
  const existing = box.querySelector('.listening-editor-error');
  if (existing) existing.remove();

  const errDiv = document.createElement('div');
  errDiv.className = 'listening-editor-error';
  Object.assign(errDiv.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '10px' });
  const label = document.createElement('span');
  label.textContent = 'Lỗi âm thanh: ' + msg;
  errDiv.appendChild(label);
  if (showRetry) {
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.textContent = 'Thử lại';
    retryBtn.className = 'listening-error-retry-btn';
    Object.assign(retryBtn.style, {
      padding: '3px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid currentColor',
      background: 'transparent', color: 'inherit', cursor: 'pointer'
    });
    retryBtn.onclick = (e) => {
      e.preventDefault();
      errDiv.remove();
      togglePlayFullQuestion();
    };
    errDiv.appendChild(retryBtn);
  }
  box.appendChild(errDiv);
  setTimeout(() => { if (errDiv.parentNode) errDiv.remove(); }, 7000);
}

function formatLearnerTime(ms) {
  if (isNaN(ms) || ms == null || ms < 0) return '0:00';
  const totalSec = Math.round(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
}

function formatSec(sec) {
  if (isNaN(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function formatMs(ms) {
  if (isNaN(ms) || ms == null || ms < 0) return '00:00.0';
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${Math.floor((totalSec % 1) * 10)}`;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
function TopNav() {
  return (
    <header class="listening-top-nav" aria-label={getQuestionProgressText()}>
      <div class="listening-nav-left">
        <button type="button" class="listening-back-btn" onClick={goBack} title="Quay lại Hub">
          <ChevronLeft size={14} />{' '}
          <span>Trở về</span>
        </button>{' '}
        <div class="listening-exam-picker-wrap">
          <select class="listening-exam-select" value={currentExamId} onChange={(e) => switchExam(e.currentTarget.value)} aria-label="Chọn đề thi">
            {HSK4_MOCK_EXAMS.map((e) => <option key={e.id} value={e.id}>{`HSK 4 · ${e.name}`}</option>)}
          </select>
        </div>
      </div>{' '}

      <div class="listening-nav-right">
        <div class="listening-rules-wrap">
          <button type="button" class="listening-rules-btn" id="listeningRulesBtn" onClick={toggleRulesDialog} title="Xem quy chế thi & hướng dẫn" aria-label="Quy chế bài thi">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>{' '}
            <span>Quy chế</span>
          </button>{' '}
          <div class="listening-rules-popover" id="listeningRulesPopover" hidden={!rulesOpen}>
            <div class="listening-rules-popover-content">
              <p class="rules-popover-item"><strong>Quy chế thi thực tế:</strong> Mỗi câu nghe đúng 1 lần duy nhất.</p>{' '}
              <p class="rules-popover-item"><strong>Chế độ luyện tập:</strong> Nghe lại tùy ý, chỉnh tốc độ phát và xem lời thoại chi tiết sau khi trả lời.</p>
            </div>
          </div>
        </div>{' '}

        <span class="listening-sync-indicator" title="Tiến trình học tự động lưu an toàn trên thiết bị này">
          <CheckIcon size={12} />{' '}
          <span>Tự lưu</span>
        </span>{' '}

        {currentMode === 'learner' ? (
          <div class="listening-menu-anchor">
            <button type="button" class="listening-more-btn" id="listeningMoreBtn" onClick={toggleSettingsMenu} aria-haspopup="true" aria-expanded={String(settingsMenuOpen)} title="Tùy chọn mở rộng">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.75" /><circle cx="12" cy="12" r="1.75" /><circle cx="12" cy="19" r="1.75" /></svg>
            </button>{' '}
            <div class="listening-settings-dropdown" id="listeningSettingsDropdown" hidden={!settingsMenuOpen}>
              <button type="button" class="listening-dropdown-item" onClick={() => setMode('editor')}>
                <PenIcon size={14} />{' '}
                <span>Căn chỉnh audio</span>
              </button>
            </div>
          </div>
        ) : (
          <button type="button" class="listening-back-learner-btn" onClick={() => setMode('learner')} title="Quay lại màn hình luyện nghe">
            <ChevronLeft size={14} width="2" />{' '}
            <span>Màn hình luyện nghe</span>
          </button>
        )}
      </div>
    </header>
  );
}

export function ListeningPracticeScreen() {
  if (view === 'loading') {
    return (
      <div class="listening-container" style="text-align:center; padding: 48px 20px;">
        <div style="font-size:15px; color:var(--text-secondary); margin-bottom:8px;">Đang tải bài nghe HSK 4...</div>
      </div>
    );
  }
  if (view === 'error') {
    return (
      <div class="listening-container">
        <div class="listening-card" style="text-align:center; padding: 40px 20px;">
          <div style="font-size:16px; font-weight:700; color:var(--danger-text); margin-bottom:8px;">Không thể tải bài nghe</div>{' '}
          <div style="font-size:14px; color:var(--text-secondary); margin-bottom:16px;">{loadError}</div>{' '}
          <button class="listening-back-btn" onClick={() => window.setPrimaryTab('vocab')} style="align-self:center;">Quay lại Trang chính</button>
        </div>
      </div>
    );
  }
  if (view !== 'ready' || !currentQuestion) return null;
  return (
    <div class="listening-container">
      <TopNav />{' '}
      <main id="listeningMainContent">
        {currentMode === 'learner' ? <LearnerView /> : <EditorView key={currentQuestion.id} />}
      </main>
    </div>
  );
}

export const ListeningPractice = {
  init,
  render,
  setMode,
  goBack,
  stopAudio,
  setSpeed,
  toggleLoop,
  togglePlayFullQuestion,
  togglePlaySentence,
  submitAnswer,
  toggleTranscriptPinyin,
  toggleTranscriptTranslation,
  toggleSettingsMenu,
  toggleRulesDialog,
  seekRelative,
  switchExam,
  goToQuestion,
  prevQuestion,
  nextQuestion,
  selectEditorSegment,
  updateSegmentBoundary,
  nudgeBoundary,
  setBoundaryFromCurrent,
  togglePreviewSelectedSegment,
  setEditorLoop,
  toggleMasterPlay,
  jumpAudio,
  onScrubberInput,
  onScrubberChange,
  markAsVerified,
  exportJSON,
  importJSON,
  saveLocalDraftManual: saveLocalDraft
};

export function mountListeningPractice() {
  window.ListeningPractice = ListeningPractice;
  screenEl = document.getElementById('screenListeningPractice');
  rerender();
}
