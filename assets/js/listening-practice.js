// assets/js/listening-practice.js
// Synapse Hanzi - HSK Listening Practice & Content Alignment Module

const ListeningPractice = (function() {
  'use strict';

  // ---------------------------------------------------------------------------
  // Data State
  // ---------------------------------------------------------------------------
  let examData = null;
  let currentQuestion = null;
  let currentMode = 'learner'; // 'learner' | 'editor'
  let isLoaded = false;
  let loadPromise = null;

  // Learner State
  let learnerState = {
    answered: false,
    selectedChoice: null,
    isCorrect: null,
    showPinyin: true,
    showTranslation: true,
    speed: 1.0,
    loop: false,
    activePlayingSegment: null // null | 'full_question' | 'passage' | 'statement' | sentenceId
  };

  // Editor State
  let editorState = {
    selectedSegmentKey: 'passage', // 'passage' | 'statement' | 'full_question' | sentenceId
    previewPlaying: false,
    loop: false,
    lastSaved: null
  };

  // ---------------------------------------------------------------------------
  // Shared Audio Controller (Precise boundary detection via rAF)
  // ---------------------------------------------------------------------------
  let audio = null;
  let activeSegment = null; // { startMs, endMs, onEnd, loop, loopPauseMs }
  let rafId = null;
  let loopTimer = null;
  let isSeeking = false;
  let audioDurationSec = 0;

  function initAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'auto';
    if ('preservesPitch' in audio) audio.preservesPitch = true;

    audio.addEventListener('loadedmetadata', () => {
      audioDurationSec = audio.duration || 0;
      updateEditorTimelineReadout();
    });

    audio.addEventListener('error', (e) => {
      console.error('ListeningPractice Audio Error:', e, audio.error);
      renderAudioError(audio.error ? audio.error.message : 'Lỗi tải âm thanh');
    });

    audio.addEventListener('pause', () => {
      if (!isSeeking && !loopTimer) {
        stopMonitoring();
      }
    });

    return audio;
  }

  function stopAudio() {
    if (loopTimer) {
      clearTimeout(loopTimer);
      loopTimer = null;
    }
    stopMonitoring();
    if (audio) {
      try {
        audio.pause();
      } catch (e) {}
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
          playSegment(seg.startMs, seg.endMs, {
            loop: true,
            loopPauseMs: seg.loopPauseMs,
            onEnd: seg.onEnd
          });
        }, seg.loopPauseMs || 600);
        return;
      } else {
        audio.pause();
        const onEndCb = activeSegment.onEnd;
        activeSegment = null;
        learnerState.activePlayingSegment = null;
        editorState.previewPlaying = false;
        updatePlaybackUI();
        if (typeof onEndCb === 'function') onEndCb();
        return;
      }
    }

    rafId = requestAnimationFrame(monitorBoundary);
  }

  function playSegment(startMs, endMs, options = {}) {
    initAudio();
    if (!currentQuestion || !currentQuestion.audio_src) return;

    // Safety checks
    if (startMs == null || endMs == null || isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
      renderAudioError('Mốc thời gian chưa hợp lệ hoặc chưa được thiết lập.');
      return;
    }

    if (loopTimer) {
      clearTimeout(loopTimer);
      loopTimer = null;
    }
    stopMonitoring();

    const expectedSrc = currentQuestion.audio_src;
    if (!audio.src || !audio.src.endsWith(expectedSrc)) {
      audio.src = expectedSrc;
    }

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
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          console.warn('Audio play failed:', err);
          renderAudioError('Không thể phát âm thanh. Vui lòng nhấn vào trang để cấp quyền phát.');
          stopAudio();
        });
      }
      stopMonitoring();
      rafId = requestAnimationFrame(monitorBoundary);
      updatePlaybackUI();
    };

    // If audio is already near target time, start immediately; otherwise wait for seeked
    if (Math.abs(audio.currentTime - targetSec) < 0.03) {
      beginPlayback();
    } else {
      const onSeeked = () => {
        audio.removeEventListener('seeked', onSeeked);
        beginPlayback();
      };
      audio.addEventListener('seeked', onSeeked, { once: true });
      try {
        audio.currentTime = targetSec;
      } catch (e) {
        audio.removeEventListener('seeked', onSeeked);
        beginPlayback();
      }
    }
  }

  function setSpeed(rate) {
    learnerState.speed = rate;
    if (audio) {
      audio.playbackRate = rate;
    }
    updatePlaybackUI();
  }

  function toggleLoop() {
    learnerState.loop = !learnerState.loop;
    if (activeSegment) {
      activeSegment.loop = learnerState.loop;
    }
    updatePlaybackUI();
  }

  // ---------------------------------------------------------------------------
  // Data Loading & LocalStorage Draft Management
  // ---------------------------------------------------------------------------
  const STORAGE_KEY = 'hsk_listening_h41001_q01_draft';

  async function loadData() {
    if (examData && isLoaded) return examData;
    if (loadPromise) return loadPromise;

    loadPromise = fetch('database/listening/hsk4_h41001.json')
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải cơ sở dữ liệu bài thi nghe H41001.');
        return res.json();
      })
      .then((data) => {
        examData = data;
        if (data.questions && data.questions.length > 0) {
          currentQuestion = JSON.parse(JSON.stringify(data.questions[0]));
          // Check for saved local draft overrides
          restoreLocalDraft();
        }
        isLoaded = true;
        return examData;
      })
      .catch((err) => {
        console.error('Error loading listening data:', err);
        isLoaded = false;
        throw err;
      });

    return loadPromise;
  }

  function restoreLocalDraft() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id === currentQuestion.id && parsed.segments) {
          currentQuestion.segments = parsed.segments;
          if (parsed.transcript && parsed.transcript.sentences) {
            currentQuestion.transcript.sentences = parsed.transcript.sentences;
          }
          if (parsed.alignment) {
            currentQuestion.alignment = parsed.alignment;
          }
          editorState.lastSaved = parsed._savedAt || 'Trước đó';
        }
      }
    } catch (e) {
      console.warn('Could not restore listening draft from localStorage', e);
    }
  }

  function saveLocalDraft() {
    if (!currentQuestion) return;
    try {
      const now = new Date().toLocaleTimeString('vi-VN');
      const draftObj = {
        id: currentQuestion.id,
        segments: currentQuestion.segments,
        transcript: currentQuestion.transcript,
        alignment: currentQuestion.alignment,
        _savedAt: now
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftObj));
      editorState.lastSaved = now;
      showEditorFeedback('Đã lưu bản nháp vào trình duyệt lúc ' + now);
    } catch (e) {
      showEditorFeedback('Lỗi lưu nháp trình duyệt: ' + e.message, true);
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle & View Entry
  // ---------------------------------------------------------------------------
  async function init() {
    const container = document.getElementById('screenListeningPractice');
    if (!container) return;

    document.body.classList.add('listening-view-active');
    initAudio();

    container.innerHTML = `
      <div class="listening-container" style="text-align:center; padding: 40px 20px;">
        <div style="font-size:16px; color:var(--text-secondary); margin-bottom:12px;">Đang tải dữ liệu bài nghe HSK 4...</div>
        <div class="listening-status-pill draft"><span class="listening-status-dot"></span> Đang khởi tạo...</div>
      </div>
    `;

    try {
      await loadData();
      render();
    } catch (err) {
      container.innerHTML = `
        <div class="listening-container">
          <div class="listening-card" style="text-align:center; padding: 40px 20px;">
            <div style="font-size:18px; font-weight:700; color:var(--danger-text); margin-bottom:8px;">Không thể tải bài nghe</div>
            <div style="font-size:14px; color:var(--text-secondary); margin-bottom:16px;">${err.message}</div>
            <button class="listening-back-btn" onclick="setPrimaryTab('vocab')" style="align-self:center;">Quay lại Trang chính</button>
          </div>
        </div>
      `;
    }
  }

  // ---------------------------------------------------------------------------
  // Render Dispatcher
  // ---------------------------------------------------------------------------
  function render() {
    const container = document.getElementById('screenListeningPractice');
    if (!container || !currentQuestion) return;

    container.innerHTML = `
      <div class="listening-container">
        <!-- Top Navigation & Controls Bar -->
        <header class="listening-top-nav">
          <div class="listening-nav-left">
            <button type="button" class="listening-back-btn" onclick="ListeningPractice.goBack()" title="Quay lại Hub">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              <span>Trở về</span>
            </button>
            <span class="listening-exam-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
              HSK 4 · H41001 · Câu ${currentQuestion.question_number}
            </span>
            ${renderAlignmentStatusPill()}
          </div>
          <div class="listening-mode-switch" role="tablist">
            <button type="button" class="listening-mode-btn ${currentMode === 'learner' ? 'active' : ''}" onclick="ListeningPractice.setMode('learner')" role="tab" aria-selected="${currentMode === 'learner'}">
              Luyện nghe (Học viên)
            </button>
            <button type="button" class="listening-mode-btn ${currentMode === 'editor' ? 'active' : ''}" onclick="ListeningPractice.setMode('editor')" role="tab" aria-selected="${currentMode === 'editor'}">
              Bộ căn chỉnh Audio (Editor)
            </button>
          </div>
        </header>

        <!-- Dynamic Main Content Based on Active Mode -->
        <main id="listeningMainContent">
          ${currentMode === 'learner' ? renderLearnerView() : renderEditorView()}
        </main>
      </div>
    `;

    attachDynamicListeners();
  }

  function renderAlignmentStatusPill() {
    const align = currentQuestion.alignment || {};
    const status = align.status || 'unaligned';
    const label = status === 'verified' ? 'Đã xác thực' : (status === 'draft' ? 'Bản nháp (Draft)' : 'Chưa căn chỉnh');
    return `
      <span class="listening-status-pill ${status}" title="Phương pháp: ${align.method || 'Thủ công'}">
        <span class="listening-status-dot"></span>
        <span>${label}</span>
      </span>
    `;
  }

  function setMode(mode) {
    if (currentMode === mode) return;
    stopAudio();
    currentMode = mode;
    render();
  }

  function goBack() {
    stopAudio();
    if (typeof setPrimaryTab === 'function') {
      setPrimaryTab('vocab');
    }
  }

  // ---------------------------------------------------------------------------
  // Learner View & Interactions
  // ---------------------------------------------------------------------------
  function renderLearnerView() {
    const q = currentQuestion;
    const isUnaligned = !q.segments || !q.segments.full_question || q.segments.full_question.start_ms == null;

    return `
      <section class="listening-card" aria-label="Bài tập luyện nghe">
        <div class="listening-card-header">
          <div class="listening-card-title">
            <span>Phần 1: Nghe và phán đoán Đúng / Sai (★)</span>
          </div>
          <div style="font-size:12px; color:var(--text-muted);">Mỗi câu nghe 1 lần</div>
        </div>

        <!-- Spoken Statement Presentation -->
        <div class="listening-statement-box">
          <div class="listening-statement-label">Nhận định cần phán đoán</div>
          <div class="listening-statement-zh" lang="zh-CN">${q.statement.zh}</div>
          ${learnerState.answered && learnerState.showPinyin && q.statement.pinyin ? `<div class="listening-statement-pinyin">${q.statement.pinyin}</div>` : ''}
          ${learnerState.answered && learnerState.showTranslation && q.statement.vi ? `<div class="listening-statement-vi">${q.statement.vi}</div>` : ''}
        </div>

        <!-- Audio Player Cluster -->
        ${isUnaligned ? renderUnalignedNotice() : renderLearnerAudioPlayer()}

        <!-- Answer Buttons (True / False) -->
        <div class="listening-answers-zone">
          <div class="listening-answers-label">Chọn nhận định trên là Đúng hay Sai:</div>
          <div class="listening-answers-grid">
            <button type="button" class="listening-choice-btn choice-true ${getChoiceBtnClass(true)}"
              onclick="ListeningPractice.submitAnswer(true)" ${learnerState.answered ? 'disabled' : ''} aria-label="Đúng">
              <span class="listening-choice-symbol">√</span>
              <span class="listening-choice-text">Đúng (True)</span>
            </button>
            <button type="button" class="listening-choice-btn choice-false ${getChoiceBtnClass(false)}"
              onclick="ListeningPractice.submitAnswer(false)" ${learnerState.answered ? 'disabled' : ''} aria-label="Sai">
              <span class="listening-choice-symbol">×</span>
              <span class="listening-choice-text">Sai (False)</span>
            </button>
          </div>
        </div>

        <!-- Answer Feedback & Revealed Study Details -->
        ${learnerState.answered ? renderRevealedStudySection() : ''}
      </section>
    `;
  }

  function getChoiceBtnClass(choiceVal) {
    if (!learnerState.answered) return '';
    const isThisChoice = learnerState.selectedChoice === choiceVal;
    const isCorrectChoice = currentQuestion.answer === choiceVal;

    if (isThisChoice) {
      return learnerState.isCorrect ? 'is-correct' : 'is-incorrect';
    }
    if (isCorrectChoice) {
      return 'is-correct';
    }
    return '';
  }

  function renderUnalignedNotice() {
    return `
      <div style="padding:16px; background:var(--warning-bg); border:1px solid rgba(153,110,30,0.25); border-radius:10px; text-align:center; color:var(--warning-text); font-size:14px;">
        <strong>Chưa có mốc thời gian âm thanh cho câu hỏi này.</strong><br>
        Vui lòng chuyển sang <em>Bộ căn chỉnh Audio (Editor)</em> để thiết lập mốc bắt đầu/kết thúc trước khi luyện tập.
      </div>
    `;
  }

  function renderLearnerAudioPlayer() {
    const isPlayingFull = learnerState.activePlayingSegment === 'full_question';
    return `
      <div class="listening-player-cluster">
        <button type="button" class="listening-play-primary-btn ${isPlayingFull ? 'is-playing' : ''}"
          onclick="ListeningPractice.togglePlayFullQuestion()" aria-label="Nghe câu hỏi">
          ${isPlayingFull ? `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            <span>Tạm dừng</span>
          ` : `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>${learnerState.answered ? 'Nghe lại toàn bài & câu hỏi' : 'Nghe toàn bộ câu hỏi'}</span>
          `}
        </button>

        <!-- Secondary controls: Speed & Loop -->
        <div class="listening-player-controls-row">
          <div class="listening-speed-group" role="group" aria-label="Tốc độ phát">
            <button type="button" class="listening-speed-btn ${learnerState.speed === 0.75 ? 'active' : ''}" onclick="ListeningPractice.setSpeed(0.75)">0.75×</button>
            <button type="button" class="listening-speed-btn ${learnerState.speed === 1.0 ? 'active' : ''}" onclick="ListeningPractice.setSpeed(1.0)">1.0×</button>
            <button type="button" class="listening-speed-btn ${learnerState.speed === 1.25 ? 'active' : ''}" onclick="ListeningPractice.setSpeed(1.25)">1.25×</button>
          </div>

          <button type="button" class="listening-loop-toggle-btn ${learnerState.loop ? 'active' : ''}" onclick="ListeningPractice.toggleLoop()" title="Lặp lại đoạn nghe">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            <span>Lặp lại ${learnerState.loop ? '(Bật)' : ''}</span>
          </button>
        </div>

        <!-- Progress track for active segment -->
        <div class="listening-progress-bar-wrap">
          <div class="listening-progress-track" id="learnerProgressTrack">
            <div class="listening-progress-fill" id="learnerProgressFill"></div>
          </div>
          <span class="listening-time-badge" id="learnerTimeBadge">00:00 / 00:00</span>
        </div>
      </div>
    `;
  }

  function togglePlayFullQuestion() {
    if (learnerState.activePlayingSegment === 'full_question') {
      stopAudio();
    } else {
      const seg = currentQuestion.segments.full_question;
      if (!seg || seg.start_ms == null) return;
      learnerState.activePlayingSegment = 'full_question';
      playSegment(seg.start_ms, seg.end_ms, {
        loop: learnerState.loop,
        onEnd: () => {
          learnerState.activePlayingSegment = null;
          updatePlaybackUI();
        }
      });
    }
    updatePlaybackUI();
  }

  function togglePlaySentence(sentenceId) {
    if (learnerState.activePlayingSegment === sentenceId) {
      stopAudio();
    } else {
      const sentence = (currentQuestion.transcript.sentences || []).find((s) => s.id === sentenceId);
      if (!sentence || sentence.start_ms == null) return;
      learnerState.activePlayingSegment = sentenceId;
      playSegment(sentence.start_ms, sentence.end_ms, {
        loop: learnerState.loop,
        onEnd: () => {
          learnerState.activePlayingSegment = null;
          updatePlaybackUI();
        }
      });
    }
    updatePlaybackUI();
  }

  function submitAnswer(choice) {
    if (learnerState.answered) return;
    learnerState.answered = true;
    learnerState.selectedChoice = choice;
    learnerState.isCorrect = choice === currentQuestion.answer;
    render();
  }

  function renderRevealedStudySection() {
    const q = currentQuestion;
    const isCorrect = learnerState.isCorrect;

    return `
      <div class="listening-revealed-section">
        <!-- Result & Explanation Banner -->
        <div class="listening-feedback-card ${isCorrect ? 'correct' : 'incorrect'}">
          <div class="listening-feedback-title">
            ${isCorrect ? `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Chính xác! Đáp án đúng: ${q.answer ? 'Đúng (√)' : 'Sai (×)'}</span>
            ` : `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>Chưa chính xác! Đáp án đúng là: ${q.answer ? 'Đúng (√)' : 'Sai (×)'}</span>
            `}
          </div>
          <div class="listening-explanation-text">
            ${q.explanation_vi || 'Đáp án chính xác theo đề thi Hanban.'}
          </div>
          ${q.evidence ? `
            <div class="listening-evidence-box">
              <div class="listening-evidence-title">Căn cứ trong bài nghe</div>
              <div class="listening-evidence-zh" lang="zh-CN">“${q.evidence.zh}”</div>
            </div>
          ` : ''}
        </div>

        <!-- Transcript Study Box -->
        <div class="listening-transcript-card">
          <div class="listening-transcript-header">
            <div class="listening-transcript-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>Bài nghe chi tiết (Transcript & Phân tích)</span>
            </div>
            <div class="listening-transcript-toggles">
              <button type="button" class="listening-toggle-chip ${learnerState.showPinyin ? 'active' : ''}"
                onclick="ListeningPractice.toggleTranscriptPinyin()">Pinyin</button>
              <button type="button" class="listening-toggle-chip ${learnerState.showTranslation ? 'active' : ''}"
                onclick="ListeningPractice.toggleTranscriptTranslation()">Bản dịch</button>
            </div>
          </div>

          <!-- Sentence Breakdown with Individual Sentence Audio Replay -->
          <div class="listening-sentence-list">
            ${(q.transcript.sentences || []).map((s) => {
              const isEvidence = q.evidence && q.evidence.sentence_index === s.index;
              const isPlayingThis = learnerState.activePlayingSegment === s.id;
              const hasValidTime = s.start_ms != null && s.end_ms != null;
              return `
                <div class="listening-sentence-item ${isPlayingThis ? 'is-active-sentence' : ''} ${isEvidence ? 'is-evidence-sentence' : ''}">
                  <button type="button" class="listening-sentence-replay-btn ${isPlayingThis ? 'is-playing' : ''}"
                    onclick="ListeningPractice.togglePlaySentence('${s.id}')"
                    ${!hasValidTime ? 'disabled title="Chưa có mốc thời gian"' : `title="Nghe câu này (${((s.end_ms - s.start_ms)/1000).toFixed(1)}s)"`}>
                    ${isPlayingThis ? `
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    ` : `
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    `}
                  </button>
                  <div class="listening-sentence-content">
                    <div class="listening-sentence-zh" lang="zh-CN">${s.zh}</div>
                    ${learnerState.showPinyin && s.pinyin ? `<div class="listening-sentence-pinyin">${s.pinyin}</div>` : ''}
                    ${learnerState.showTranslation && s.vi ? `<div class="listening-sentence-vi">${s.vi}</div>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Matched Vocabulary Tags -->
          ${q.vocabulary_matches && q.vocabulary_matches.length > 0 ? `
            <div style="margin-top:12px; border-top:1px solid var(--border-subtle); padding-top:14px;">
              <div style="font-size:13px; font-weight:600; color:var(--text-secondary); margin-bottom:8px;">Từ vựng trọng tâm trong bài:</div>
              <div class="listening-vocab-grid">
                ${q.vocabulary_matches.map((v) => `
                  <div class="listening-vocab-chip">
                    <div class="listening-vocab-left">
                      <span class="listening-vocab-word" lang="zh-CN">${v.word}</span>
                      <span class="listening-vocab-meta">${v.pinyin} · ${v.meaning_vi}</span>
                    </div>
                    ${v.level ? `<span class="listening-vocab-level-tag ${v.level.toLowerCase()}">${v.level}</span>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function toggleTranscriptPinyin() {
    learnerState.showPinyin = !learnerState.showPinyin;
    render();
  }

  function toggleTranscriptTranslation() {
    learnerState.showTranslation = !learnerState.showTranslation;
    render();
  }

  // ---------------------------------------------------------------------------
  // Boundary Editor View & Interactions
  // ---------------------------------------------------------------------------
  function renderEditorView() {
    const q = currentQuestion;
    const currentSeg = getSelectedEditorSegment();

    return `
      <section class="listening-editor-card" aria-label="Bộ căn chỉnh Audio">
        <div class="listening-editor-header">
          <div class="listening-editor-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>Bộ căn chỉnh mốc thời gian (Boundary Editor)</span>
          </div>
          <div class="listening-editor-actions">
            <button type="button" class="listening-editor-btn" onclick="ListeningPractice.exportJSON()" title="Xuất dữ liệu câu hỏi thành file JSON">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Xuất JSON</span>
            </button>
            <label class="listening-editor-btn" style="margin:0; cursor:pointer;" title="Nhập file JSON đã chỉnh sửa">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Nhập JSON</span>
              <input type="file" accept=".json" onchange="ListeningPractice.importJSON(event)" style="display:none;">
            </label>
            <button type="button" class="listening-editor-btn primary" onclick="ListeningPractice.markAsVerified()" title="Xác thực toàn bộ mốc âm thanh">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Đánh dấu ĐÃ XÁC THỰC</span>
            </button>
          </div>
        </div>

        <!-- Master Audio Transport Controller -->
        <div class="listening-master-player">
          <div class="listening-master-player-top">
            <div class="listening-time-display">
              <span class="listening-time-current" id="editorCurrentTime">00:00.000</span>
              <span class="listening-time-total" id="editorTotalTime">/ 00:00.000</span>
            </div>
            <div class="listening-transport-buttons">
              <button type="button" class="listening-transport-btn" onclick="ListeningPractice.jumpAudio(-5)" title="Lùi 5 giây">-5s</button>
              <button type="button" class="listening-transport-btn" onclick="ListeningPractice.jumpAudio(-1)" title="Lùi 1 giây">-1s</button>
              <button type="button" class="listening-transport-btn play-toggle" id="editorPlayToggleBtn" onclick="ListeningPractice.toggleMasterPlay()">
                Phát / Dừng
              </button>
              <button type="button" class="listening-transport-btn" onclick="ListeningPractice.jumpAudio(1)" title="Tiến 1 giây">+1s</button>
              <button type="button" class="listening-transport-btn" onclick="ListeningPractice.jumpAudio(5)" title="Tiến 5 giây">+5s</button>
            </div>
          </div>
          <input type="range" class="listening-master-slider" id="editorScrubber" min="0" max="1855" step="0.05" value="0"
            oninput="ListeningPractice.onScrubberInput(this.value)" onchange="ListeningPractice.onScrubberChange(this.value)" aria-label="Thanh trượt thời gian audio">
        </div>

        <!-- Segment Selector Tabs -->
        <div class="listening-segment-tabs" role="tablist">
          <button type="button" class="listening-segment-tab ${editorState.selectedSegmentKey === 'passage' ? 'active' : ''}"
            onclick="ListeningPractice.selectEditorSegment('passage')">Toàn bài nghe (Passage)</button>
          <button type="button" class="listening-segment-tab ${editorState.selectedSegmentKey === 'statement' ? 'active' : ''}"
            onclick="ListeningPractice.selectEditorSegment('statement')">Câu nhận định (Statement)</button>
          <button type="button" class="listening-segment-tab ${editorState.selectedSegmentKey === 'full_question' ? 'active' : ''}"
            onclick="ListeningPractice.selectEditorSegment('full_question')">Toàn bộ câu hỏi (Full)</button>
          ${(q.transcript.sentences || []).map((s, idx) => `
            <button type="button" class="listening-segment-tab ${editorState.selectedSegmentKey === s.id ? 'active' : ''}"
              onclick="ListeningPractice.selectEditorSegment('${s.id}')">Câu ${idx + 1}</button>
          `).join('')}
        </div>

        <!-- Segment Content Preview Text -->
        <div style="font-size:14px; padding:10px 14px; background:var(--surface-subtle); border-radius:8px; border:1px solid var(--border-subtle);">
          <strong>Nội dung đoạn đang chọn:</strong>
          <span style="font-family:'PingFang SC', sans-serif; color:var(--brand-primary); font-weight:600; margin-left:6px;">
            ${getEditorSegmentText(editorState.selectedSegmentKey)}
          </span>
        </div>

        <!-- Boundary Adjustment Controls -->
        <div class="listening-adjuster-panel">
          <!-- Start Boundary -->
          <div class="listening-boundary-col">
            <div class="listening-boundary-label">
              <span>Mốc Bắt đầu (Start)</span>
              <span style="font-size:11px; color:var(--text-muted); font-family:monospace;">${currentSeg ? formatMs(currentSeg.start_ms) : '--'}</span>
            </div>
            <div class="listening-boundary-inputs">
              <input type="number" class="listening-numeric-input" id="editorStartInput" value="${currentSeg && currentSeg.start_ms != null ? currentSeg.start_ms : ''}"
                placeholder="ms" step="10" onchange="ListeningPractice.updateSegmentBoundary('start', this.value)">
              <div class="listening-nudge-group">
                <button type="button" class="listening-nudge-btn" onclick="ListeningPractice.nudgeBoundary('start', -100)" title="Lùi 100ms">-0.1s</button>
                <button type="button" class="listening-nudge-btn" onclick="ListeningPractice.nudgeBoundary('start', 100)" title="Tiến 100ms">+0.1s</button>
              </div>
            </div>
            <button type="button" class="listening-set-here-btn" onclick="ListeningPractice.setBoundaryFromCurrent('start')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span>Đặt mốc BẮT ĐẦU tại vị trí hiện tại</span>
            </button>
          </div>

          <!-- End Boundary -->
          <div class="listening-boundary-col">
            <div class="listening-boundary-label">
              <span>Mốc Kết thúc (End)</span>
              <span style="font-size:11px; color:var(--text-muted); font-family:monospace;">${currentSeg ? formatMs(currentSeg.end_ms) : '--'}</span>
            </div>
            <div class="listening-boundary-inputs">
              <input type="number" class="listening-numeric-input" id="editorEndInput" value="${currentSeg && currentSeg.end_ms != null ? currentSeg.end_ms : ''}"
                placeholder="ms" step="10" onchange="ListeningPractice.updateSegmentBoundary('end', this.value)">
              <div class="listening-nudge-group">
                <button type="button" class="listening-nudge-btn" onclick="ListeningPractice.nudgeBoundary('end', -100)" title="Lùi 100ms">-0.1s</button>
                <button type="button" class="listening-nudge-btn" onclick="ListeningPractice.nudgeBoundary('end', 100)" title="Tiến 100ms">+0.1s</button>
              </div>
            </div>
            <button type="button" class="listening-set-here-btn" onclick="ListeningPractice.setBoundaryFromCurrent('end')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              <span>Đặt mốc KẾT THÚC tại vị trí hiện tại</span>
            </button>
          </div>
        </div>

        <!-- Segment Preview & Duration Toolbar -->
        <div class="listening-preview-controls">
          <button type="button" class="listening-preview-btn ${editorState.previewPlaying ? 'is-playing' : ''}"
            onclick="ListeningPractice.togglePreviewSelectedSegment()">
            ${editorState.previewPlaying ? `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              <span>Dừng phát thử</span>
            ` : `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Phát thử đoạn đã chọn (Preview)</span>
            `}
          </button>
          <div class="listening-duration-readout">
            Độ dài đoạn: <strong>${currentSeg && currentSeg.start_ms != null && currentSeg.end_ms != null ? ((currentSeg.end_ms - currentSeg.start_ms) / 1000).toFixed(3) + ' giây' : 'Chưa xác định'}</strong>
          </div>
          <label style="display:inline-flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
            <input type="checkbox" ${editorState.loop ? 'checked' : ''} onchange="ListeningPractice.setEditorLoop(this.checked)">
            <span>Lặp lại đoạn (Loop)</span>
          </label>
        </div>

        <!-- Validation & Error Display -->
        <div class="listening-editor-error" id="editorErrorBox"></div>

        <!-- Local Draft Status Note -->
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:12px; color:var(--text-muted); border-top:1px solid var(--border-subtle); padding-top:12px;">
          <span>Trạng thái lưu trữ: <strong>${editorState.lastSaved ? 'Đã lưu nháp lúc ' + editorState.lastSaved : 'Chưa lưu nháp mới'}</strong></span>
          <button type="button" class="listening-editor-btn" onclick="ListeningPractice.saveLocalDraftManual()">Lưu bản nháp</button>
        </div>
      </section>
    `;
  }

  function getSelectedEditorSegment() {
    if (!currentQuestion) return null;
    const key = editorState.selectedSegmentKey;
    if (key === 'passage') return currentQuestion.segments.passage;
    if (key === 'statement') return currentQuestion.segments.statement;
    if (key === 'full_question') return currentQuestion.segments.full_question;
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

  function selectEditorSegment(key) {
    stopAudio();
    editorState.selectedSegmentKey = key;
    render();
    // Move scrubber to segment start for convenience
    const seg = getSelectedEditorSegment();
    if (seg && seg.start_ms != null && audio) {
      audio.currentTime = seg.start_ms / 1000;
      updateEditorTimelineReadout();
    }
  }

  function updateSegmentBoundary(type, value) {
    const seg = getSelectedEditorSegment();
    if (!seg) return;
    const intVal = parseInt(value, 10);
    if (isNaN(intVal)) return;

    if (type === 'start') {
      seg.start_ms = Math.max(0, intVal);
    } else {
      seg.end_ms = Math.max(0, intVal);
    }

    validateAndSyncSegments();
    saveLocalDraft();
    render();
  }

  function nudgeBoundary(type, deltaMs) {
    const seg = getSelectedEditorSegment();
    if (!seg) return;
    const curVal = type === 'start' ? (seg.start_ms || 0) : (seg.end_ms || 0);
    const newVal = Math.max(0, curVal + deltaMs);
    if (type === 'start') {
      seg.start_ms = newVal;
    } else {
      seg.end_ms = newVal;
    }
    validateAndSyncSegments();
    saveLocalDraft();
    render();
  }

  function setBoundaryFromCurrent(type) {
    if (!audio) return;
    const currentMs = Math.round(audio.currentTime * 1000);
    const seg = getSelectedEditorSegment();
    if (!seg) return;

    if (type === 'start') {
      seg.start_ms = currentMs;
    } else {
      seg.end_ms = currentMs;
    }
    validateAndSyncSegments();
    saveLocalDraft();
    render();
  }

  function validateAndSyncSegments() {
    const errBox = document.getElementById('editorErrorBox');
    const seg = getSelectedEditorSegment();
    if (!seg) return;

    let hasError = false;
    let errorMsg = '';

    if (seg.start_ms != null && seg.end_ms != null) {
      if (seg.start_ms < 0) {
        hasError = true;
        errorMsg = 'Mốc bắt đầu không được nhỏ hơn 0.';
      } else if (seg.start_ms >= seg.end_ms) {
        hasError = true;
        errorMsg = 'Mốc bắt đầu (' + seg.start_ms + 'ms) phải nhỏ hơn mốc kết thúc (' + seg.end_ms + 'ms).';
      } else if (audioDurationSec > 0 && seg.end_ms / 1000 > audioDurationSec) {
        hasError = true;
        errorMsg = 'Mốc kết thúc vượt quá độ dài toàn bài nghe (' + audioDurationSec.toFixed(1) + 's).';
      }
    }

    if (errBox) {
      errBox.style.display = hasError ? 'block' : 'none';
      errBox.textContent = errorMsg;
    }

    // Keep full_question start/end synced if passage and statement are updated
    if (currentQuestion.segments.passage && currentQuestion.segments.statement) {
      const pStart = currentQuestion.segments.passage.start_ms;
      const sEnd = currentQuestion.segments.statement.end_ms;
      if (pStart != null && sEnd != null) {
        currentQuestion.segments.full_question = {
          start_ms: pStart,
          end_ms: sEnd
        };
      }
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

  function toggleMasterPlay() {
    initAudio();
    if (!audio.src || !audio.src.endsWith(currentQuestion.audio_src)) {
      audio.src = currentQuestion.audio_src;
    }
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
    initAudio();
    if (!audio.src || !audio.src.endsWith(currentQuestion.audio_src)) {
      audio.src = currentQuestion.audio_src;
    }
    audio.currentTime = Math.max(0, audio.currentTime + seconds);
    updateEditorTimelineReadout();
  }

  function onScrubberInput(val) {
    const sec = parseFloat(val);
    const curEl = document.getElementById('editorCurrentTime');
    if (curEl) curEl.textContent = formatSec(sec);
  }

  function onScrubberChange(val) {
    initAudio();
    if (!audio.src || !audio.src.endsWith(currentQuestion.audio_src)) {
      audio.src = currentQuestion.audio_src;
    }
    audio.currentTime = parseFloat(val);
    updateEditorTimelineReadout();
  }

  function updateEditorTimelineReadout() {
    const curEl = document.getElementById('editorCurrentTime');
    const totEl = document.getElementById('editorTotalTime');
    const scrubber = document.getElementById('editorScrubber');
    const playBtn = document.getElementById('editorPlayToggleBtn');

    if (!audio) return;
    const curSec = audio.currentTime || 0;
    const totSec = audio.duration || audioDurationSec || 0;

    if (curEl) curEl.textContent = formatSec(curSec);
    if (totEl) totEl.textContent = '/ ' + formatSec(totSec);
    if (scrubber && !isSeeking) {
      scrubber.max = totSec > 0 ? totSec : 1855;
      scrubber.value = curSec;
    }
    if (playBtn) {
      playBtn.textContent = audio.paused ? 'Phát' : 'Tạm dừng';
    }
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

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
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
    reader.onload = function(e) {
      try {
        const imported = JSON.parse(e.target.result);
        const importedQ = imported.questions ? imported.questions[0] : imported;
        if (!importedQ || !importedQ.segments) {
          throw new Error('Cấu trúc JSON không hợp lệ, thiếu trường segments.');
        }
        currentQuestion.segments = importedQ.segments;
        if (importedQ.transcript && importedQ.transcript.sentences) {
          currentQuestion.transcript.sentences = importedQ.transcript.sentences;
        }
        if (importedQ.alignment) {
          currentQuestion.alignment = importedQ.alignment;
        }
        saveLocalDraft();
        render();
        showEditorFeedback('Đã nhập dữ liệu JSON thành công!');
      } catch (err) {
        showEditorFeedback('Lỗi nhập file JSON: ' + err.message, true);
      }
    };
    reader.readAsText(file);
  }

  function saveLocalDraftManual() {
    saveLocalDraft();
  }

  function showEditorFeedback(msg, isError = false) {
    const errBox = document.getElementById('editorErrorBox');
    if (!errBox) {
      alert(msg);
      return;
    }
    errBox.style.display = 'block';
    errBox.style.background = isError ? 'var(--danger-bg)' : 'var(--success-bg)';
    errBox.style.borderColor = isError ? '#dc2626' : '#16a34a';
    errBox.style.color = isError ? '#dc2626' : '#166534';
    errBox.textContent = msg;
    setTimeout(() => {
      if (errBox) errBox.style.display = 'none';
    }, 4000);
  }

  // ---------------------------------------------------------------------------
  // UI Helpers & Progress Sync
  // ---------------------------------------------------------------------------
  function updatePlaybackUI() {
    // 1. Learner Primary Play Button
    const playBtn = document.querySelector('.listening-play-primary-btn');
    const isPlayingFull = learnerState.activePlayingSegment === 'full_question';
    if (playBtn) {
      playBtn.classList.toggle('is-playing', isPlayingFull);
      playBtn.innerHTML = isPlayingFull ? `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        <span>Tạm dừng</span>
      ` : `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>${learnerState.answered ? 'Nghe lại toàn bài & câu hỏi' : 'Nghe toàn bộ câu hỏi'}</span>
      `;
    }

    // 2. Sentence replay buttons
    document.querySelectorAll('.listening-sentence-replay-btn').forEach((btn) => {
      const sentenceId = btn.closest('.listening-sentence-item')?.querySelector('.listening-sentence-replay-btn')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
      const isPlaying = sentenceId && learnerState.activePlayingSegment === sentenceId;
      btn.classList.toggle('is-playing', Boolean(isPlaying));
    });

    // 3. Sentence list item active state
    document.querySelectorAll('.listening-sentence-item').forEach((item) => {
      const btn = item.querySelector('.listening-sentence-replay-btn');
      const onclickAttr = btn ? btn.getAttribute('onclick') : '';
      const match = onclickAttr ? onclickAttr.match(/'([^']+)'/) : null;
      const sentenceId = match ? match[1] : null;
      item.classList.toggle('is-active-sentence', Boolean(sentenceId && learnerState.activePlayingSegment === sentenceId));
    });

    // 4. Editor Preview Button
    const prevBtn = document.querySelector('.listening-preview-btn');
    if (prevBtn) {
      prevBtn.classList.toggle('is-playing', editorState.previewPlaying);
      prevBtn.innerHTML = editorState.previewPlaying ? `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        <span>Dừng phát thử</span>
      ` : `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Phát thử đoạn đã chọn (Preview)</span>
      `;
    }

    updateEditorTimelineReadout();
  }

  function updatePlaybackProgressUI(currentMs) {
    if (currentMode === 'learner' && activeSegment) {
      const segDuration = activeSegment.endMs - activeSegment.startMs;
      const elapsed = Math.max(0, currentMs - activeSegment.startMs);
      const ratio = Math.min(1, Math.max(0, elapsed / segDuration));

      const fill = document.getElementById('learnerProgressFill');
      const badge = document.getElementById('learnerTimeBadge');
      if (fill) fill.style.width = (ratio * 100).toFixed(1) + '%';
      if (badge) {
        badge.textContent = `${formatMs(elapsed)} / ${formatMs(segDuration)}`;
      }
    }
    if (currentMode === 'editor') {
      updateEditorTimelineReadout();
    }
  }

  function attachDynamicListeners() {
    // Click on progress track to seek inside active segment
    const track = document.getElementById('learnerProgressTrack');
    if (track && activeSegment) {
      track.onclick = (e) => {
        const rect = track.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const segDuration = activeSegment.endMs - activeSegment.startMs;
        const targetMs = activeSegment.startMs + pos * segDuration;
        if (audio) {
          audio.currentTime = targetMs / 1000;
        }
      };
    }
  }

  function renderAudioError(msg) {
    const box = document.getElementById('editorErrorBox') || document.querySelector('.listening-player-cluster');
    if (box) {
      const errDiv = document.createElement('div');
      errDiv.className = 'listening-editor-error';
      errDiv.style.display = 'block';
      errDiv.style.marginTop = '10px';
      errDiv.textContent = 'Lỗi phát âm thanh: ' + msg;
      box.appendChild(errDiv);
      setTimeout(() => errDiv.remove(), 5000);
    }
  }

  function formatSec(sec) {
    if (isNaN(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  function formatMs(ms) {
    if (isNaN(ms) || ms == null || ms < 0) return '00:00';
    const totalSec = ms / 1000;
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    const sub = Math.floor((totalSec % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${sub}`;
  }

  // ---------------------------------------------------------------------------
  // Public Interface
  // ---------------------------------------------------------------------------
  return {
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
    // Editor methods
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
    saveLocalDraftManual
  };
})();

window.ListeningPractice = ListeningPractice;
