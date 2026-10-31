// assets/js/listening-practice.js
// Synapse Hanzi - HSK Listening Practice & Content Alignment Module

const ListeningPractice = (function() {
  'use strict';

  // ---------------------------------------------------------------------------
  // Data State
  // ---------------------------------------------------------------------------
  const AVAILABLE_EXAMS = [
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
    { id: 'H41012', name: 'Đề 12 (H41012)' }
  ];

  let examData = null;
  let currentExamId = 'H41001';
  let currentQuestionIndex = 0;
  let currentQuestion = null;
  let currentMode = 'learner'; // 'learner' | 'editor'
  let isLoaded = false;
  let loadPromise = null;
  let userSessionAnswers = {}; // { [questionId]: { answered, selectedChoice, isCorrect } }

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
  let audioRetryTimer = null;
  let autoRetryAttempted = false;
  let isSeeking = false;
  let audioDurationSec = 0;

  function resetAudio() {
    stopMonitoring();
    if (loopTimer) {
      clearTimeout(loopTimer);
      loopTimer = null;
    }
    if (audioRetryTimer) {
      clearTimeout(audioRetryTimer);
      audioRetryTimer = null;
    }
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch (e) {}
      audio = null;
    }
    isSeeking = false;
  }

  function handleAudioError(rawMsg) {
    console.error('ListeningPractice Audio Error:', rawMsg, audio ? audio.error : null);
    const prevSeg = activeSegment;
    const prevActivePlaying = learnerState.activePlayingSegment;
    stopAudio();

    // Auto-retry once on intermittent format/decode or network glitch
    if (!autoRetryAttempted && prevSeg) {
      autoRetryAttempted = true;
      console.warn('Intermittent audio error detected (' + rawMsg + '). Retrying with clean audio instance...');
      resetAudio();
      audioRetryTimer = setTimeout(() => {
        if (currentQuestion && prevSeg) {
          learnerState.activePlayingSegment = prevActivePlaying;
          playSegment(prevSeg.startMs, prevSeg.endMs, {
            loop: prevSeg.loop,
            loopPauseMs: prevSeg.loopPauseMs,
            onEnd: prevSeg.onEnd
          });
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

    audio.addEventListener('error', (e) => {
      handleAudioError(audio && audio.error ? audio.error.message : 'Lỗi tải âm thanh');
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
    const srcChanged = !audio.src || !audio.src.endsWith(expectedSrc);
    if (srcChanged) {
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
      autoRetryAttempted = false;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          console.warn('Audio play failed:', err);
          isSeeking = false;
          if (err.name !== 'AbortError') {
            renderAudioError('Không thể phát âm thanh. Vui lòng bấm vào trang để cấp quyền phát.', true);
          }
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
      } else {
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
      }
    };

    // If audio is freshly loaded or metadata isn't ready yet, wait for loadedmetadata
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
      try {
        audio.load();
      } catch (e) {}
    } else {
      seekAndPlay();
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
  function getStorageKey(questionId) {
    const qId = questionId || (currentQuestion ? currentQuestion.id : 'default');
    return `hsk_listening_${qId.toLowerCase()}_draft`;
  }

  async function loadData(examId = currentExamId, qIndex = currentQuestionIndex) {
    currentExamId = examId;
    currentQuestionIndex = qIndex;
    loadPromise = fetch(`database/listening/hsk4_${examId.toLowerCase()}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Không thể tải cơ sở dữ liệu bài thi nghe ${examId}.`);
        return res.json();
      })
      .then((data) => {
        examData = data;
        if (data.questions && data.questions.length > 0) {
          const idx = Math.max(0, Math.min(qIndex, data.questions.length - 1));
          currentQuestionIndex = idx;
          currentQuestion = JSON.parse(JSON.stringify(data.questions[idx]));
          restoreQuestionSessionState();
          restoreLocalDraft();
          syncAudioSource();
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

  function syncAudioSource() {
    if (!audio || !currentQuestion) return;
    const targetSrc = currentQuestion.audio_src || (examData ? examData.audio_src : '');
    if (!targetSrc) return;
    const currentSrc = audio.getAttribute('src') || '';
    if (!currentSrc.endsWith(targetSrc)) {
      audio.src = targetSrc;
      audio.load();
    }
  }

  function restoreQuestionSessionState() {
    if (!currentQuestion) return;
    const saved = userSessionAnswers[currentQuestion.id];
    if (saved) {
      learnerState.answered = saved.answered;
      learnerState.selectedChoice = saved.selectedChoice;
      learnerState.isCorrect = saved.isCorrect;
    } else {
      learnerState.answered = false;
      learnerState.selectedChoice = null;
      learnerState.isCorrect = null;
    }
    learnerState.activePlayingSegment = null;
  }

  function restoreLocalDraft() {
    if (!currentQuestion) return;
    try {
      const key = getStorageKey(currentQuestion.id);
      const saved = localStorage.getItem(key);
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
      const key = getStorageKey(currentQuestion.id);
      localStorage.setItem(key, JSON.stringify(draftObj));
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
    loadPromise = null;
    isLoaded = false;
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
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1);
    }
  }

  function nextQuestion() {
    if (examData && currentQuestionIndex < examData.questions.length - 1) {
      goToQuestion(currentQuestionIndex + 1);
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
    attachGlobalListeners();

    container.innerHTML = `
      <div class="listening-container" style="text-align:center; padding: 48px 20px;">
        <div style="font-size:15px; color:var(--text-secondary); margin-bottom:8px;">Đang tải bài nghe HSK 4...</div>
      </div>
    `;

    try {
      await loadData();
      render();
    } catch (err) {
      container.innerHTML = `
        <div class="listening-container">
          <div class="listening-card" style="text-align:center; padding: 40px 20px;">
            <div style="font-size:16px; font-weight:700; color:var(--danger-text); margin-bottom:8px;">Không thể tải bài nghe</div>
            <div style="font-size:14px; color:var(--text-secondary); margin-bottom:16px;">${err.message}</div>
            <button class="listening-back-btn" onclick="setPrimaryTab('vocab')" style="align-self:center;">Quay lại Trang chính</button>
          </div>
        </div>
      `;
    }
  }

  // ---------------------------------------------------------------------------
  // Main Render Dispatcher
  // ---------------------------------------------------------------------------
  function render() {
    const container = document.getElementById('screenListeningPractice');
    if (!container || !currentQuestion) return;

    const progressText = getQuestionProgressText();

    container.innerHTML = `
      <div class="listening-container">
        <!-- Compact Page Header -->
        <header class="listening-top-nav" aria-label="${progressText}">
          <div class="listening-nav-left">
            <button type="button" class="listening-back-btn" onclick="ListeningPractice.goBack()" title="Quay lại Hub">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              <span>Trở về</span>
            </button>
            <div class="listening-exam-picker-wrap">
              <select class="listening-exam-select" onchange="ListeningPractice.switchExam(this.value)" aria-label="Chọn đề thi">
                ${AVAILABLE_EXAMS.map(e => `
                  <option value="${e.id}" ${e.id === currentExamId ? 'selected' : ''}>HSK 4 · ${e.name}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="listening-nav-right">
            <!-- Rules Popover Trigger -->
            <div class="listening-rules-wrap">
              <button type="button" class="listening-rules-btn" id="listeningRulesBtn" onclick="ListeningPractice.toggleRulesDialog(event)" title="Xem quy chế thi & hướng dẫn" aria-label="Quy chế bài thi">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>Quy chế</span>
              </button>
              <div class="listening-rules-popover" id="listeningRulesPopover" hidden>
                <div class="listening-rules-popover-content">
                  <p class="rules-popover-item"><strong>Quy chế thi thực tế:</strong> Mỗi câu nghe đúng 1 lần duy nhất.</p>
                  <p class="rules-popover-item"><strong>Chế độ luyện tập:</strong> Nghe lại tùy ý, chỉnh tốc độ phát và xem lời thoại chi tiết sau khi trả lời.</p>
                </div>
              </div>
            </div>

            <!-- Subtle Auto-Save Indicator -->
            <span class="listening-sync-indicator" title="Tiến trình học tự động lưu an toàn trên thiết bị này">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Tự lưu</span>
            </span>

            <!-- Secondary Overflow Menu for Editor Tool -->
            ${currentMode === 'learner' ? `
              <div class="listening-menu-anchor">
                <button type="button" class="listening-more-btn" id="listeningMoreBtn" onclick="ListeningPractice.toggleSettingsMenu(event)" aria-haspopup="true" aria-expanded="false" title="Tùy chọn mở rộng">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="12" cy="19" r="1.75"/></svg>
                </button>
                <div class="listening-settings-dropdown" id="listeningSettingsDropdown" hidden>
                  <button type="button" class="listening-dropdown-item" onclick="ListeningPractice.setMode('editor')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    <span>Căn chỉnh audio</span>
                  </button>
                </div>
              </div>
            ` : `
              <button type="button" class="listening-back-learner-btn" onclick="ListeningPractice.setMode('learner')" title="Quay lại màn hình luyện nghe">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                <span>Màn hình luyện nghe</span>
              </button>
            `}
          </div>
        </header>

        <!-- Main Content -->
        <main id="listeningMainContent">
          ${currentMode === 'learner' ? renderLearnerView() : renderEditorView()}
        </main>
      </div>
    `;

    attachDynamicListeners();
  }

  function getQuestionProgressText() {
    if (!currentQuestion) return '';
    const questions = (examData && Array.isArray(examData.questions)) ? examData.questions : [];
    // Only display total if multiple questions are actually present in the dataset
    if (questions.length > 1) {
      return `Câu ${currentQuestion.question_number} / ${questions.length}`;
    }
    return `Câu ${currentQuestion.question_number}`;
  }

  function toggleSettingsMenu(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const dropdown = document.getElementById('listeningSettingsDropdown');
    const btn = document.getElementById('listeningMoreBtn');
    if (!dropdown) return;
    const willShow = dropdown.hidden;
    dropdown.hidden = !willShow;
    if (btn) btn.setAttribute('aria-expanded', String(willShow));
  }

  function toggleRulesDialog(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const popover = document.getElementById('listeningRulesPopover');
    if (!popover) return;
    popover.hidden = !popover.hidden;
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
  // Natural Pinyin Formatter & Compounds Dictionary
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

  function formatNaturalPinyin(pinyinStr) {
    if (!pinyinStr || typeof pinyinStr !== 'string') return '';
    let text = pinyinStr.trim();
    // Normalize punctuation
    text = text.replace(/。/g, '. ').replace(/，/g, ', ').replace(/？/g, '? ').replace(/！/g, '! ').replace(/：/g, ': ');
    // Strip spaces before punctuation
    text = text.replace(/\s+([.,?!:;])/g, '$1');
    // Replace common compounds
    const keys = Object.keys(COMMON_PINYIN_COMPOUNDS).sort((a, b) => b.length - a.length);
    keys.forEach(k => {
      const reg = new RegExp(k, 'gi');
      text = text.replace(reg, COMMON_PINYIN_COMPOUNDS[k]);
    });
    // Strip double spaces
    text = text.replace(/\s{2,}/g, ' ').trim();
    // Capitalize first character
    if (text.length > 0) {
      text = text.charAt(0).toUpperCase() + text.slice(1);
    }
    // Capitalize after period, question mark, exclamation mark
    text = text.replace(/([.?!]\s+)([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])/g, (m, p1, p2) => p1 + p2.toUpperCase());
    return text;
  }

  // ---------------------------------------------------------------------------
  // Streamlined Meta & Progress Bar
  // ---------------------------------------------------------------------------
  function renderMetaBar() {
    const questions = (examData && Array.isArray(examData.questions)) ? examData.questions : [currentQuestion];

    return `
      <div class="listening-meta-bar">
        <div class="listening-meta-left">
          <span class="listening-section-label">Nghe và chọn Đúng / Sai</span>
          <span class="listening-mode-chip">Chế độ luyện tập</span>
        </div>

        <div class="listening-meta-right">
          <!-- Compact question progress map -->
          <div class="listening-progress-map" role="tablist" aria-label="Bản đồ tiến độ bài thi">
            ${questions.map((q, idx) => {
              const isCurrent = idx === currentQuestionIndex;
              const ans = userSessionAnswers[q.id];
              const isDone = ans && ans.answered;
              let dotClass = 'pending';
              if (isCurrent) {
                dotClass = 'is-current';
              } else if (isDone) {
                dotClass = ans.isCorrect ? 'is-correct' : 'is-incorrect';
              }
              return `
                <button type="button" class="listening-map-dot ${dotClass}"
                  onclick="ListeningPractice.goToQuestion(${idx})"
                  role="tab"
                  aria-selected="${isCurrent}"
                  title="Câu ${q.question_number}${isDone ? (ans.isCorrect ? ' (Đúng)' : ' (Sai)') : ''}">
                  ${q.question_number}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Learner View
  // ---------------------------------------------------------------------------
  function renderLearnerView() {
    const q = currentQuestion;
    const isUnaligned = !q.segments || !q.segments.full_question || q.segments.full_question.start_ms == null;
    const questions = (examData && Array.isArray(examData.questions)) ? examData.questions : [currentQuestion];
    const hasNext = currentQuestionIndex < questions.length - 1;

    return `
      <section class="listening-unified-card" aria-label="Bài tập luyện nghe">
        <!-- 1. Streamlined Meta Bar (Title + Progress Map) -->
        ${renderMetaBar()}

        <!-- 2. Statement Presentation (Immediate, Uncluttered, Front & Center) -->
        <div class="listening-statement-block">
          <div class="listening-statement-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <span>Mệnh đề nhận định</span>
          </div>
          <div class="listening-statement-zh" lang="zh-CN">${q.statement.zh}</div>
          ${learnerState.answered && learnerState.showPinyin && q.statement.pinyin ? `
            <div class="listening-statement-pinyin">${formatNaturalPinyin(q.statement.pinyin)}</div>
          ` : ''}
          ${learnerState.answered && learnerState.showTranslation && q.statement.vi ? `
            <div class="listening-statement-vi">${q.statement.vi}</div>
          ` : ''}
        </div>

        <!-- 3. Integrated Audio Player Surface -->
        ${isUnaligned ? renderUnalignedNotice() : renderLearnerAudioPlayer()}

        <!-- 4. Symmetrical 2-Line Answer Controls (Đúng / Sai) -->
        <div class="listening-answers-zone">
          <div class="listening-answers-grid">
            ${renderChoiceButton(true)}
            ${renderChoiceButton(false)}
          </div>
        </div>

        <!-- 5. Calm Neutral Feedback Section (revealed after answering) -->
        ${learnerState.answered ? renderCompactFeedback() : ''}

        <!-- 6. Transcript & Vocabulary Section (revealed after answering) -->
        ${learnerState.answered ? renderTranscriptAndVocabSection() : ''}

        <!-- 7. Bottom Navigation (Previous / Next Question) -->
        <div class="listening-bottom-nav">
          <button type="button" class="listening-nav-arrow-btn prev" onclick="ListeningPractice.prevQuestion()" ${currentQuestionIndex === 0 ? 'disabled' : ''} title="Câu trước">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            <span>Câu trước</span>
          </button>
          <button type="button" class="listening-nav-arrow-btn next ${learnerState.answered ? 'is-answered' : ''}" onclick="ListeningPractice.nextQuestion()" ${!hasNext ? 'disabled' : ''} title="Câu tiếp theo">
            <span>Câu tiếp theo</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </section>
    `;
  }

  function renderChoiceButton(choiceVal) {
    const label = choiceVal ? 'Đúng' : 'Sai';
    let btnStateClass = '';
    let subtext = '';
    let subtextClass = '';

    if (learnerState.answered) {
      const isThisChoice = learnerState.selectedChoice === choiceVal;
      const isCorrectChoice = currentQuestion.answer === choiceVal;

      if (isThisChoice) {
        if (isCorrectChoice) {
          btnStateClass = 'is-correct-selected';
          subtext = 'Bạn đã chọn · Chính xác';
          subtextClass = 'is-correct';
        } else {
          btnStateClass = 'is-incorrect-selected';
          subtext = 'Bạn đã chọn';
          subtextClass = 'is-incorrect';
        }
      } else if (isCorrectChoice) {
        btnStateClass = 'is-correct-answer';
        subtext = 'Đáp án đúng';
        subtextClass = 'is-correct';
      } else {
        btnStateClass = 'is-dimmed';
      }
    }

    const iconSvg = choiceVal
      ? `<svg class="listening-choice-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<svg class="listening-choice-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    return `
      <button type="button" class="listening-choice-btn choice-${choiceVal ? 'true' : 'false'} ${btnStateClass}"
        onclick="ListeningPractice.submitAnswer(${choiceVal})"
        ${learnerState.answered ? 'disabled' : ''}
        aria-label="${label}">
        <div class="listening-choice-main">
          <span class="listening-choice-icon-wrap" aria-hidden="true">${iconSvg}</span>
          <span class="listening-choice-primary">${label}</span>
        </div>
        ${learnerState.answered && subtext ? `
          <span class="listening-choice-subtext ${subtextClass}">${subtext}</span>
        ` : ''}
      </button>
    `;
  }

  function renderUnalignedNotice() {
    return `
      <div class="listening-notice-box">
        <strong>Chưa có mốc thời gian âm thanh cho câu hỏi này.</strong>
        <p>Vui lòng mở <em>Căn chỉnh audio</em> để thiết lập mốc bắt đầu và kết thúc.</p>
      </div>
    `;
  }

  function renderLearnerAudioPlayer() {
    const isPlayingFull = learnerState.activePlayingSegment === 'full_question';
    const seg = currentQuestion.segments ? currentQuestion.segments.full_question : null;
    const totalMs = seg ? Math.max(0, seg.end_ms - seg.start_ms) : 0;
    const totalTimeText = formatLearnerTime(totalMs);

    return `
      <div class="listening-player-surface">
        <div class="listening-player-controls-grid">
          <!-- Primary Play/Pause Button -->
          <button type="button" class="listening-play-primary-btn ${isPlayingFull ? 'is-playing' : ''}"
            onclick="ListeningPractice.togglePlayFullQuestion()" aria-label="${isPlayingFull ? 'Tạm dừng' : 'Nghe đoạn này'}">
            ${isPlayingFull ? `
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              <span class="listening-playing-waves" aria-hidden="true"><span></span><span></span><span></span></span>
              <span>Tạm dừng</span>
            ` : `
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Nghe đoạn này</span>
            `}
          </button>

          <!-- Right Column: Seek track and time readout -->
          <div class="listening-player-right-col">
            <div class="listening-progress-wrap">
              <div class="listening-progress-track" id="learnerProgressTrack" tabindex="0" role="slider"
                aria-label="Thanh tua âm thanh" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
                title="Bấm để tua hoặc dùng phím mũi tên ← →">
                <div class="listening-progress-fill" id="learnerProgressFill"></div>
                <span class="listening-progress-thumb" id="learnerProgressThumb"></span>
              </div>
              <div class="listening-time-readout" id="learnerTimeBadge">0:00 / ${totalTimeText}</div>
            </div>
          </div>
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
      const sents = (currentQuestion && currentQuestion.transcript && currentQuestion.transcript.sentences) || [];
      const sIdx = sents.findIndex((s) => s.id === sentenceId);
      if (sIdx === -1) return;
      const sentence = sents[sIdx];
      if (sentence.start_ms == null || sentence.end_ms == null) return;

      let startMs = sentence.start_ms;
      let endMs = sentence.end_ms;

      // Natural acoustic tail protection:
      // 1. If it's the last sentence of the passage, ensure it plays completely up to passage.end_ms
      const passSeg = currentQuestion.segments && currentQuestion.segments.passage;
      if (passSeg && passSeg.end_ms != null && sIdx === sents.length - 1) {
        endMs = Math.max(endMs, passSeg.end_ms);
      } else if (sIdx < sents.length - 1) {
        // 2. If it's an intermediate sentence, use available inter-sentence silence (up to 100ms cushion)
        const nextSent = sents[sIdx + 1];
        if (nextSent && nextSent.start_ms != null && nextSent.start_ms > endMs) {
          const gap = nextSent.start_ms - endMs;
          const cushion = Math.min(100, Math.max(0, gap - 40));
          endMs += cushion;
        }
      }

      learnerState.activePlayingSegment = sentenceId;
      playSegment(startMs, endMs, {
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
    userSessionAnswers[currentQuestion.id] = {
      answered: true,
      selectedChoice: choice,
      isCorrect: learnerState.isCorrect
    };
    render();
  }

  // ---------------------------------------------------------------------------
  // Helper: Highlight Evidence within Chinese Sentence
  // ---------------------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function highlightEvidenceInSentence(sentZh, evidenceZh) {
    if (!sentZh) return '';
    if (!evidenceZh) return escapeHtml(sentZh);
    const cleanEv = String(evidenceZh).replace(/^[“”"'\s]+|[“”"'\s]+$/g, '').trim();
    if (!cleanEv || !sentZh.includes(cleanEv)) {
      return escapeHtml(sentZh);
    }
    const parts = sentZh.split(cleanEv);
    return parts.map(p => escapeHtml(p)).join(`<mark class="listening-evidence-highlight listening-evidence-inline-mark">${escapeHtml(cleanEv)}</mark>`);
  }

  function getPrioritizedVocabularies(vocabs) {
    if (!Array.isArray(vocabs)) return [];
    const ultraBasic = new Set(['没有', '我们', '我', '你', '他', '她', '这', '那', '的', '了']);
    const levelOrder = { 'HSK4': 4, 'HSK3': 3, 'HSK2': 2, 'HSK1': 1 };
    
    // Filter out ultra-basic words if we already have richer vocabulary
    let filtered = vocabs;
    const nonBasic = vocabs.filter(v => !ultraBasic.has(v.word));
    if (nonBasic.length >= 4) {
      filtered = nonBasic;
    }
    
    return [...filtered].sort((a, b) => {
      const aBasic = ultraBasic.has(a.word) ? 1 : 0;
      const bBasic = ultraBasic.has(b.word) ? 1 : 0;
      if (aBasic !== bBasic) return aBasic - bBasic;
      
      const aLvl = levelOrder[a.level] || 0;
      const bLvl = levelOrder[b.level] || 0;
      if (aLvl !== bLvl) return bLvl - aLvl;
      
      return (b.word || '').length - (a.word || '').length;
    });
  }

  // ---------------------------------------------------------------------------
  // Compact Feedback Section (Streamlined, clear outcome & inline evidence)
  // ---------------------------------------------------------------------------
  function renderCompactFeedback() {
    const q = currentQuestion;
    const isCorrect = learnerState.isCorrect;
    const sentences = (q.transcript && Array.isArray(q.transcript.sentences)) ? q.transcript.sentences : [];

    // Find matching sentence for evidence replay
    let evidenceSentence = null;
    if (q.evidence) {
      if (typeof q.evidence.sentence_index === 'number' && sentences[q.evidence.sentence_index]) {
        evidenceSentence = sentences[q.evidence.sentence_index];
      } else if (q.evidence.zh) {
        evidenceSentence = sentences.find(s => s.zh && (s.zh.includes(q.evidence.zh) || q.evidence.zh.includes(s.zh)));
      }
    }
    const evidenceSentenceId = evidenceSentence ? evidenceSentence.id : (sentences.length > 0 ? sentences[0].id : null);
    const evidenceVi = evidenceSentence && evidenceSentence.vi ? evidenceSentence.vi : '';
    const isEvidencePlaying = evidenceSentenceId && learnerState.activePlayingSegment === evidenceSentenceId;

    const answerLabel = q.answer ? 'Đúng' : 'Sai';
    const statusText = isCorrect
      ? `Bạn trả lời đúng · Đáp án: ${answerLabel}`
      : `Bạn trả lời chưa đúng · Đáp án: ${answerLabel}`;

    const evidenceZhText = evidenceSentence ? evidenceSentence.zh : (q.evidence ? q.evidence.zh : '');

    return `
      <div class="listening-feedback-card ${isCorrect ? 'is-correct' : 'is-incorrect'}">
        <div class="listening-feedback-status">
          <span class="listening-feedback-badge ${isCorrect ? 'badge-correct' : 'badge-incorrect'}">
            ${isCorrect ? `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            ` : `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            `}
            <span>${statusText}</span>
          </span>
        </div>

        <div class="listening-feedback-body">
          ${evidenceZhText ? `
            <div class="listening-feedback-evidence">
              <div class="listening-evidence-playback-row">
                ${evidenceSentenceId ? `
                  <button type="button" class="listening-evidence-play-btn ${isEvidencePlaying ? 'is-playing' : ''}"
                    onclick="ListeningPractice.togglePlaySentence('${evidenceSentenceId}')"
                    title="${isEvidencePlaying ? 'Tạm dừng câu này' : 'Nghe câu này'}"
                    aria-label="${isEvidencePlaying ? 'Tạm dừng câu này' : 'Nghe câu này'}">
                    ${isEvidencePlaying ? `
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                      <span class="listening-playing-waves" aria-hidden="true"><span></span><span></span><span></span></span>
                      <span>Đang phát</span>
                    ` : `
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 19 12 6 20 6 4"/></svg>
                      <span>Nghe câu này</span>
                    `}
                  </button>
                ` : ''}
                <div class="listening-evidence-zh" lang="zh-CN">${highlightEvidenceInSentence(evidenceZhText, q.evidence ? q.evidence.zh : '')}</div>
              </div>
              ${evidenceVi ? `<div class="listening-evidence-vi">${evidenceVi}</div>` : ''}
            </div>
          ` : ''}

          ${q.explanation_vi ? `
            <div class="listening-feedback-explanation">${q.explanation_vi}</div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Transcript ("Lời thoại") & Structured Learning Surface
  // ---------------------------------------------------------------------------
  function renderTranscriptAndVocabSection() {
    const q = currentQuestion;
    const sortedVocabs = getPrioritizedVocabularies(q.vocabulary_matches);

    return `
      <div class="listening-transcript-container">
        <!-- Section Header with Pill Toggles -->
        <div class="listening-transcript-header">
          <div class="listening-transcript-title">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>Lời thoại</span>
          </div>
          <div class="listening-transcript-toggles">
            <button type="button" class="listening-toggle-pill ${learnerState.showPinyin ? 'is-active' : ''}"
              onclick="ListeningPractice.toggleTranscriptPinyin()"
              aria-pressed="${learnerState.showPinyin}"
              title="Bật / tắt Pinyin">
              <span class="listening-toggle-indicator">
                ${learnerState.showPinyin ? `
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                ` : `
                  <span class="indicator-off"></span>
                `}
              </span>
              <span>Pinyin</span>
            </button>
            <button type="button" class="listening-toggle-pill ${learnerState.showTranslation ? 'is-active' : ''}"
              onclick="ListeningPractice.toggleTranscriptTranslation()"
              aria-pressed="${learnerState.showTranslation}"
              title="Bật / tắt Bản dịch">
              <span class="listening-toggle-indicator">
                ${learnerState.showTranslation ? `
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                ` : `
                  <span class="indicator-off"></span>
                `}
              </span>
              <span>Bản dịch</span>
            </button>
          </div>
        </div>

        <!-- Transcript Rows with Accent Highlight for Active Audio & Evidence Mark -->
        <div class="listening-transcript-rows">
          ${(q.transcript.sentences || []).map((s) => {
            const isPlayingThis = learnerState.activePlayingSegment === s.id;
            const hasValidTime = s.start_ms != null && s.end_ms != null;
            return `
              <div class="listening-transcript-row ${isPlayingThis ? 'is-playing-row' : ''}">
                <button type="button" class="listening-row-play-btn ${isPlayingThis ? 'is-playing' : ''}"
                  onclick="ListeningPractice.togglePlaySentence('${s.id}')"
                  ${!hasValidTime ? 'disabled title="Chưa có mốc thời gian"' : `title="${isPlayingThis ? 'Tạm dừng' : 'Nghe câu này'} (${((s.end_ms - s.start_ms)/1000).toFixed(1)}s)"`}
                  aria-label="${isPlayingThis ? 'Tạm dừng' : 'Nghe câu này'}">
                  ${isPlayingThis ? `
                    <span class="listening-playing-waves" aria-hidden="true"><span></span><span></span><span></span></span>
                    <svg class="listening-pause-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  ` : `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 19 12 6 20 6 4"/></svg>
                  `}
                </button>
                <div class="listening-row-content">
                  <div class="listening-row-zh" lang="zh-CN">${highlightEvidenceInSentence(s.zh, q.evidence ? q.evidence.zh : '')}</div>
                  ${learnerState.showPinyin && s.pinyin ? `
                    <div class="listening-row-pinyin">${formatNaturalPinyin(s.pinyin)}</div>
                  ` : ''}
                  ${learnerState.showTranslation && s.vi ? `
                    <div class="listening-row-vi">${s.vi}</div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Key Expressions & Points of Comprehension -->
        ${q.key_expressions && q.key_expressions.length > 0 ? `
          <div class="listening-key-section">
            <div class="listening-section-title">Cụm cần hiểu & Điểm ngữ pháp</div>
            <div class="listening-key-grid">
              ${q.key_expressions.map(item => `
                <div class="listening-key-card">
                  <div class="listening-key-top">
                    <span class="listening-key-phrase" lang="zh-CN">${item.phrase}</span>
                    ${item.pinyin ? `<span class="listening-key-pinyin">${item.pinyin}</span>` : ''}
                  </div>
                  <div class="listening-key-meaning">${item.meaning_vi}</div>
                  ${item.note ? `<div class="listening-key-note">${item.note}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Vocabulary Section (Prioritized by learning relevance) -->
        ${sortedVocabs.length > 0 ? `
          <div class="listening-vocab-section">
            <div class="listening-section-title">Từ vựng trong bài</div>
            <div class="listening-vocab-grid">
              ${sortedVocabs.map((v) => `
                <div class="listening-vocab-card">
                  <div class="listening-vocab-top">
                    <span class="listening-vocab-word" lang="zh-CN">${v.word}</span>
                    ${v.level ? `<span class="listening-vocab-badge">${v.level}</span>` : ''}
                  </div>
                  <div class="listening-vocab-meta">
                    <span class="listening-vocab-pinyin">${v.pinyin}</span>
                    <span class="listening-vocab-vi">${v.meaning_vi}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
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
  // Boundary Editor View
  // ---------------------------------------------------------------------------
  function renderEditorView() {
    const q = currentQuestion;
    const currentSeg = getSelectedEditorSegment();
    const align = q.alignment || {};
    const status = align.status || 'unaligned';
    const statusLabel = status === 'verified' ? 'Đã xác thực' : (status === 'draft' ? 'Bản nháp (Draft)' : 'Chưa căn chỉnh');

    return `
      <section class="listening-editor-card" aria-label="Bộ căn chỉnh Audio">
        <div class="listening-editor-header">
          <div class="listening-editor-title-wrap">
            <div class="listening-editor-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span>Bộ căn chỉnh mốc audio (Boundary Editor)</span>
            </div>
            <span class="listening-editor-status-pill ${status}" title="Phương pháp: ${align.method || 'Thủ công'}">
              <span class="listening-status-dot"></span>
              <span>${statusLabel}</span>
            </span>
          </div>

          <div class="listening-editor-actions">
            <button type="button" class="listening-editor-btn" onclick="ListeningPractice.exportJSON()" title="Xuất dữ liệu câu hỏi thành file JSON">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Xuất JSON</span>
            </button>
            <label class="listening-editor-btn" style="margin:0; cursor:pointer;" title="Nhập file JSON đã chỉnh sửa">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Nhập JSON</span>
              <input type="file" accept=".json" onchange="ListeningPractice.importJSON(event)" style="display:none;">
            </label>
            <button type="button" class="listening-editor-btn primary" onclick="ListeningPractice.markAsVerified()" title="Xác thực toàn bộ mốc âm thanh">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Xác thực mốc</span>
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

        <!-- Selected Segment Quote -->
        <div class="listening-editor-quote">
          <span class="listening-editor-quote-label">Nội dung đoạn đang chọn:</span>
          <span class="listening-editor-quote-zh" lang="zh-CN">
            ${getEditorSegmentText(editorState.selectedSegmentKey)}
          </span>
        </div>

        <!-- Boundary Adjustment Controls -->
        <div class="listening-adjuster-panel">
          <!-- Start Boundary -->
          <div class="listening-boundary-col">
            <div class="listening-boundary-label">
              <span>Mốc Bắt đầu (Start)</span>
              <span class="listening-boundary-ms">${currentSeg ? formatMs(currentSeg.start_ms) : '--'}</span>
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
              <span>Đặt mốc BẮT ĐẦU tại vị trí hiện tại</span>
            </button>
          </div>

          <!-- End Boundary -->
          <div class="listening-boundary-col">
            <div class="listening-boundary-label">
              <span>Mốc Kết thúc (End)</span>
              <span class="listening-boundary-ms">${currentSeg ? formatMs(currentSeg.end_ms) : '--'}</span>
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
              <span>Đặt mốc KẾT THÚC tại vị trí hiện tại</span>
            </button>
          </div>
        </div>

        <!-- Segment Preview & Duration Toolbar -->
        <div class="listening-preview-controls">
          <button type="button" class="listening-preview-btn ${editorState.previewPlaying ? 'is-playing' : ''}"
            onclick="ListeningPractice.togglePreviewSelectedSegment()">
            ${editorState.previewPlaying ? `
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              <span>Dừng phát thử</span>
            ` : `
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Phát thử đoạn đã chọn (Preview)</span>
            `}
          </button>
          <div class="listening-duration-readout">
            Độ dài đoạn: <strong>${currentSeg && currentSeg.start_ms != null && currentSeg.end_ms != null ? ((currentSeg.end_ms - currentSeg.start_ms) / 1000).toFixed(3) + 's' : '--'}</strong>
          </div>
          <label class="listening-loop-checkbox-label">
            <input type="checkbox" ${editorState.loop ? 'checked' : ''} onchange="ListeningPractice.setEditorLoop(this.checked)">
            <span>Lặp lại đoạn (Loop)</span>
          </label>
        </div>

        <!-- Validation & Error Display -->
        <div class="listening-editor-error" id="editorErrorBox"></div>

        <!-- Local Draft Status Note -->
        <div class="listening-editor-footer">
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
    errBox.style.borderColor = isError ? 'rgba(220,38,38,0.3)' : 'rgba(22,163,74,0.3)';
    errBox.style.color = isError ? 'var(--danger-text)' : 'var(--success-text)';
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
      playBtn.setAttribute('aria-label', isPlayingFull ? 'Tạm dừng' : 'Nghe đoạn này');
      playBtn.innerHTML = isPlayingFull ? `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        <span class="listening-playing-waves" aria-hidden="true"><span></span><span></span><span></span></span>
        <span>Tạm dừng</span>
      ` : `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Nghe đoạn này</span>
      `;
    }

    if (!activeSegment && currentMode === 'learner') {
      const fill = document.getElementById('learnerProgressFill');
      const track = document.getElementById('learnerProgressTrack');
      const badge = document.getElementById('learnerTimeBadge');
      if (fill) fill.style.width = '0%';
      if (track) track.setAttribute('aria-valuenow', '0');
      if (badge && currentQuestion && currentQuestion.segments && currentQuestion.segments.full_question) {
        const seg = currentQuestion.segments.full_question;
        const totalDurationMs = Math.max(0, seg.end_ms - seg.start_ms);
        badge.textContent = `0:00 / ${formatLearnerTime(totalDurationMs)}`;
      }
    }

    // 2. Sentence replay buttons in transcript rows
    document.querySelectorAll('.listening-row-play-btn').forEach((btn) => {
      const row = btn.closest('.listening-transcript-row');
      const onclickAttr = btn.getAttribute('onclick') || '';
      const match = onclickAttr.match(/'([^']+)'/);
      const sentenceId = match ? match[1] : null;
      const isPlaying = sentenceId && learnerState.activePlayingSegment === sentenceId;
      btn.classList.toggle('is-playing', Boolean(isPlaying));
      btn.setAttribute('aria-label', isPlaying ? 'Tạm dừng' : 'Nghe câu này');
      btn.setAttribute('title', isPlaying ? 'Tạm dừng' : 'Nghe câu này');
      btn.innerHTML = isPlaying ? `
        <span class="listening-playing-waves" aria-hidden="true"><span></span><span></span><span></span></span>
        <svg class="listening-pause-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
      ` : `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 19 12 6 20 6 4"/></svg>
      `;
      if (row) {
        row.classList.toggle('is-playing-row', Boolean(isPlaying));
      }
    });

    // 2b. Evidence replay button in feedback
    const evidenceBtn = document.querySelector('.listening-evidence-play-btn');
    if (evidenceBtn) {
      const onclickAttr = evidenceBtn.getAttribute('onclick') || '';
      const match = onclickAttr.match(/'([^']+)'/);
      const sentenceId = match ? match[1] : null;
      const isPlaying = sentenceId && learnerState.activePlayingSegment === sentenceId;
      evidenceBtn.classList.toggle('is-playing', Boolean(isPlaying));
      evidenceBtn.setAttribute('title', isPlaying ? 'Tạm dừng câu này' : 'Nghe câu này');
      evidenceBtn.setAttribute('aria-label', isPlaying ? 'Tạm dừng câu này' : 'Nghe câu này');
      evidenceBtn.innerHTML = isPlaying ? `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        <span class="listening-playing-waves" aria-hidden="true"><span></span><span></span><span></span></span>
        <span>Đang phát</span>
      ` : `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 19 12 6 20 6 4"/></svg>
        <span>Nghe câu này</span>
      `;
    }

    // 3. Editor Preview Button
    const prevBtn = document.querySelector('.listening-preview-btn');
    if (prevBtn) {
      prevBtn.classList.toggle('is-playing', editorState.previewPlaying);
      prevBtn.innerHTML = editorState.previewPlaying ? `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        <span>Dừng phát thử</span>
      ` : `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
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
      const track = document.getElementById('learnerProgressTrack');
      const badge = document.getElementById('learnerTimeBadge');
      if (fill) fill.style.width = (ratio * 100).toFixed(1) + '%';
      if (track) track.setAttribute('aria-valuenow', Math.round(ratio * 100));
      if (badge) {
        badge.textContent = `${formatLearnerTime(elapsed)} / ${formatLearnerTime(segDuration)}`;
      }
    }
    if (currentMode === 'editor') {
      updateEditorTimelineReadout();
    }
  }

  function seekRelative(deltaSec) {
    if (!currentQuestion || !currentQuestion.segments || !currentQuestion.segments.full_question) return;
    const fullSeg = currentQuestion.segments.full_question;
    initAudio();
    let currentMs = audio.currentTime * 1000;
    if (!activeSegment || learnerState.activePlayingSegment !== 'full_question') {
      currentMs = fullSeg.start_ms;
    }
    const targetMs = Math.max(fullSeg.start_ms, Math.min(fullSeg.end_ms, currentMs + deltaSec * 1000));
    if (activeSegment && learnerState.activePlayingSegment === 'full_question') {
      audio.currentTime = targetMs / 1000;
    } else {
      playSegment(targetMs, fullSeg.end_ms, {
        loop: learnerState.loop,
        onEnd: () => {
          learnerState.activePlayingSegment = null;
          updatePlaybackUI();
        }
      });
      learnerState.activePlayingSegment = 'full_question';
      updatePlaybackUI();
    }
    updatePlaybackProgressUI(targetMs);
  }

  function attachDynamicListeners() {
    const track = document.getElementById('learnerProgressTrack');
    if (track && currentQuestion && currentQuestion.segments && currentQuestion.segments.full_question) {
      const fullSeg = currentQuestion.segments.full_question;

      track.onclick = (e) => {
        const rect = track.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const segDuration = fullSeg.end_ms - fullSeg.start_ms;
        const targetMs = fullSeg.start_ms + pos * segDuration;

        if (activeSegment && learnerState.activePlayingSegment === 'full_question') {
          audio.currentTime = targetMs / 1000;
        } else {
          playSegment(targetMs, fullSeg.end_ms, {
            loop: learnerState.loop,
            onEnd: () => {
              learnerState.activePlayingSegment = null;
              updatePlaybackUI();
            }
          });
          learnerState.activePlayingSegment = 'full_question';
          updatePlaybackUI();
        }
      };

      track.onkeydown = (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          seekRelative(-2);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          seekRelative(2);
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          togglePlayFullQuestion();
        }
      };
    }
  }

  let globalListenersAttached = false;
  function attachGlobalListeners() {
    if (globalListenersAttached) return;
    globalListenersAttached = true;

    document.addEventListener('click', (e) => {
      // Dismiss settings dropdown
      const dropdown = document.getElementById('listeningSettingsDropdown');
      const moreBtn = document.getElementById('listeningMoreBtn');
      if (dropdown && !dropdown.hidden && !dropdown.contains(e.target) && (!moreBtn || !moreBtn.contains(e.target))) {
        dropdown.hidden = true;
        if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
      }

      // Dismiss rules popover
      const rulesPopover = document.getElementById('listeningRulesPopover');
      const rulesBtn = document.getElementById('listeningRulesBtn');
      if (rulesPopover && !rulesPopover.hidden && !rulesPopover.contains(e.target) && (!rulesBtn || !rulesBtn.contains(e.target))) {
        rulesPopover.hidden = true;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!document.body.classList.contains('listening-view-active')) return;
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      if (e.key === 'Escape') {
        const dropdown = document.getElementById('listeningSettingsDropdown');
        if (dropdown && !dropdown.hidden) {
          dropdown.hidden = true;
          const moreBtn = document.getElementById('listeningMoreBtn');
          if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
          return;
        }
        const rulesPopover = document.getElementById('listeningRulesPopover');
        if (rulesPopover && !rulesPopover.hidden) {
          rulesPopover.hidden = true;
          return;
        }
      }

      if (currentMode === 'learner') {
        if (e.key === ' ' || e.key.toLowerCase() === 'p') {
          if (document.activeElement && document.activeElement.tagName.toLowerCase() === 'button') {
            return;
          }
          e.preventDefault();
          togglePlayFullQuestion();
        } else if (e.key === '1' || e.key.toLowerCase() === 't') {
          if (!learnerState.answered) {
            e.preventDefault();
            submitAnswer(true);
          }
        } else if (e.key === '2' || e.key.toLowerCase() === 'f') {
          if (!learnerState.answered) {
            e.preventDefault();
            submitAnswer(false);
          }
        } else if (e.key.toLowerCase() === 'r') {
          toggleLoop();
        }
      }
    });
  }

  function renderAudioError(msg, showRetry = false) {
    const box = document.getElementById('editorErrorBox') || document.querySelector('.listening-player-surface');
    if (box) {
      const existing = box.querySelector('.listening-editor-error');
      if (existing) existing.remove();

      const errDiv = document.createElement('div');
      errDiv.className = 'listening-editor-error';
      errDiv.style.display = 'flex';
      errDiv.style.alignItems = 'center';
      errDiv.style.justifyContent = 'space-between';
      errDiv.style.gap = '10px';
      errDiv.style.marginTop = '10px';

      const label = document.createElement('span');
      label.textContent = 'Lỗi âm thanh: ' + msg;
      errDiv.appendChild(label);

      if (showRetry) {
        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.textContent = 'Thử lại';
        retryBtn.className = 'listening-error-retry-btn';
        retryBtn.style.padding = '3px 10px';
        retryBtn.style.fontSize = '12px';
        retryBtn.style.borderRadius = '4px';
        retryBtn.style.border = '1px solid currentColor';
        retryBtn.style.background = 'transparent';
        retryBtn.style.color = 'inherit';
        retryBtn.style.cursor = 'pointer';
        retryBtn.onclick = (e) => {
          e.preventDefault();
          errDiv.remove();
          togglePlayFullQuestion();
        };
        errDiv.appendChild(retryBtn);
      }

      box.appendChild(errDiv);
      setTimeout(() => {
        if (errDiv.parentNode) errDiv.remove();
      }, 7000);
    }
  }

  function formatLearnerTime(ms) {
    if (isNaN(ms) || ms == null || ms < 0) return '0:00';
    const totalSec = Math.round(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
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
    toggleSettingsMenu,
    toggleRulesDialog,
    seekRelative,
    // Exam & Question Navigation
    switchExam,
    goToQuestion,
    prevQuestion,
    nextQuestion,
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
