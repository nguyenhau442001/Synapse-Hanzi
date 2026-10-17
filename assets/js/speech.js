// assets/js/speech.js
// Speech orchestration for Chinese vocabulary & example sentences.
// Uses SpeechService (Web Speech API) with safe audio fallback.

function getSpeechService() {
  if (typeof SpeechService !== 'undefined') return SpeechService;
  if (typeof window !== 'undefined' && window.SpeechService) return window.SpeechService;
  if (typeof globalThis !== 'undefined' && globalThis.SpeechService) return globalThis.SpeechService;
  return null;
}

function checkSpeechSupported() {
  if (typeof isSpeechSupported === 'function') return isSpeechSupported();
  const svc = getSpeechService();
  if (svc && typeof svc.isSpeechSupported === 'function') return svc.isSpeechSupported();
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function callSpeakChinese(text, options) {
  if (typeof speakChinese === 'function') return speakChinese(text, options);
  const svc = getSpeechService();
  if (svc && typeof svc.speakChinese === 'function') return svc.speakChinese(text, options);
  return false;
}

function callStopSpeaking() {
  if (typeof stopSpeaking === 'function') return stopSpeaking();
  const svc = getSpeechService();
  if (svc && typeof svc.stopSpeaking === 'function') return svc.stopSpeaking();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && (speechSynthesis.speaking || speechSynthesis.pending)) {
    try { speechSynthesis.cancel(); } catch (e) {}
  }
}

async function loadPrebuiltAudioManifest(level) {
  prebuiltAudioManifest = null;
  const config = LEVELS[level];
  if (!config || !config.audioManifestUrl) return;

  try {
    const response = await fetch(config.audioManifestUrl, { cache: 'no-store' });
    if (!response.ok) return;
    const manifest = await response.json();
    if (currentLevel !== level || manifest.level !== level || !manifest.items) return;
    prebuiltAudioManifest = manifest;
  } catch (error) {
    // Missing manifest is expected when rolling out or using Web Speech directly.
  }
}

function prebuiltAudioUrl(word, kind) {
  if (!word || !prebuiltAudioManifest || prebuiltAudioManifest.level !== currentLevel) return null;
  const item = prebuiltAudioManifest.items[String(word.id)];
  return item && typeof item[kind] === 'string' ? item[kind] : null;
}

function speakWord() {
  if (filteredOrder.length === 0) return;

  const wIdx = filteredOrder[idx % filteredOrder.length];
  const word = WORDS[wIdx];
  if (!word || !word.hanzi) return;

  const btn = document.getElementById('soundBtn');
  const cleanHanzi = String(word.hanzi).replace(/[（\(].*?[）\)]/g, '').trim() || word.hanzi;
  speakText(
    cleanHanzi,
    btn,
    SPEECH_RATE,
    prebuiltAudioUrl(word, 'word')
  );
}

function speakExample() {
  if (filteredOrder.length === 0) return;

  const wIdx = filteredOrder[idx % filteredOrder.length];
  const word = WORDS[wIdx];
  const example = document.getElementById('exZh');
  const text = (example ? example.textContent.trim() : '') || (word ? word.example_zh : '');
  if (!text) return;

  const btn = document.getElementById('exampleSoundBtn');
  speakText(
    text,
    btn,
    exampleSpeechSpeed,
    prebuiltAudioUrl(word, 'example')
  );
}

function speakText(text, button, rate = SPEECH_RATE, audioUrl = null) {
  if (!button || !text) return;
  if (activeSpeechButton === button) {
    stopSpeech();
    return;
  }

  stopSpeech();
  const requestId = speechRequestId;
  const hint = document.getElementById('hint');
  const prevHint = hint ? hint.textContent : '';

  activeSpeechButton = button;

  // PRIORITY 1: Prebuilt studio-grade audio (Gemini Flash TTS / CosyVoice)
  if (audioUrl) {
    playPrebuiltAudio(text, button, rate, audioUrl, requestId, hint, prevHint);
    return;
  }

  // PRIORITY 2: Fallback to Web Speech API
  speakWithWebSpeech(text, button, rate, requestId, hint, prevHint);
}

function playPrebuiltAudio(text, button, rate, audioUrl, requestId, hint, prevHint) {
  const audio = new Audio(audioUrl);
  activeSpeechAudio = audio;
  audio.preload = 'auto';
  audio.playbackRate = Math.min(2, Math.max(0.25, rate));
  if ('preservesPitch' in audio) audio.preservesPitch = true;

  let settled = false;
  const fallback = () => {
    if (settled || requestId !== speechRequestId) return;
    settled = true;
    audio.onplaying = null;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    if (activeSpeechAudio === audio) activeSpeechAudio = null;
    speakWithWebSpeech(text, button, rate, requestId, hint, prevHint);
  };

  audio.onplaying = () => {
    if (requestId !== speechRequestId) return;
    setSpeechButtonState(button, true, text);
  };
  audio.onended = () => {
    if (settled || requestId !== speechRequestId) return;
    settled = true;
    if (activeSpeechAudio === audio) activeSpeechAudio = null;
    setSpeechButtonState(button, false);
  };
  audio.onerror = fallback;

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(fallback);
}

function speakWithWebSpeech(text, button, rate, requestId, hint, prevHint) {
  if (requestId !== speechRequestId) return;
  const supported = checkSpeechSupported();
  if (!supported) {
    setSpeechButtonState(button, false);
    showSpeechHint(hint, 'Trình duyệt này không hỗ trợ phát âm, hãy mở bằng Chrome hoặc Safari', prevHint);
    return;
  }

  activeSpeechButton = button;
  const started = callSpeakChinese(text, {
    rate: rate,
    onStart: () => {
      if (requestId !== speechRequestId) return;
      setSpeechButtonState(button, true, text);
    },
    onEnd: () => {
      if (requestId !== speechRequestId) return;
      setSpeechButtonState(button, false);
    },
    onError: () => {
      if (requestId !== speechRequestId) return;
      setSpeechButtonState(button, false);
      showSpeechHint(hint, 'Không thể phát âm trên trình duyệt này', prevHint);
    }
  });

  if (!started) {
    setSpeechButtonState(button, false);
    showSpeechHint(hint, 'Không thể phát âm trên trình duyệt này', prevHint);
  }
}

function showSpeechHint(hint, message, previousMessage) {
  if (!hint) return;
  hint.textContent = message;
  setTimeout(() => {
    if (hint.textContent === message) hint.textContent = previousMessage;
  }, 2500);
}

function setSpeechButtonState(button, isPlaying, text) {
  if (!button) return;
  const isExample = button.classList.contains('example-sound-btn');

  button.classList.toggle('is-playing', isPlaying);
  button.setAttribute('aria-pressed', String(isPlaying));
  button.setAttribute(
    'aria-label',
    isPlaying
      ? (isExample ? 'Đang phát câu ví dụ' : `Đang phát âm ${text || ''}`.trim())
      : (isExample ? 'Nghe câu ví dụ' : 'Nghe phát âm')
  );
  button.title = isPlaying ? 'Bấm để dừng' : (isExample ? 'Nghe câu ví dụ' : 'Nghe phát âm (A)');

  if (isPlaying) activeSpeechButton = button;
  else if (activeSpeechButton === button) activeSpeechButton = null;
}

function syncSpeechButtons() {
  const soundBtn = document.getElementById('soundBtn');
  const exampleSoundBtn = document.getElementById('exampleSoundBtn');
  const supported = checkSpeechSupported();

  if (soundBtn) {
    if (!supported) {
      soundBtn.disabled = true;
      soundBtn.classList.add('is-disabled');
      soundBtn.setAttribute('aria-disabled', 'true');
      soundBtn.title = 'Trình duyệt không hỗ trợ phát âm (Web Speech API)';
    } else {
      soundBtn.disabled = false;
      soundBtn.classList.remove('is-disabled');
      soundBtn.removeAttribute('aria-disabled');
      soundBtn.title = 'Nghe phát âm (A)';
    }
  }

  if (exampleSoundBtn) {
    const currentWord = (filteredOrder && filteredOrder.length > 0) ? WORDS[filteredOrder[idx % filteredOrder.length]] : null;
    const hasExample = Boolean(currentWord && (currentWord.example_zh || currentWord.example_py || currentWord.example_vi));

    if (!supported) {
      exampleSoundBtn.disabled = true;
      exampleSoundBtn.classList.add('is-disabled');
      exampleSoundBtn.setAttribute('aria-disabled', 'true');
      exampleSoundBtn.title = 'Trình duyệt không hỗ trợ phát âm (Web Speech API)';
    } else if (!hasExample) {
      exampleSoundBtn.disabled = true;
      exampleSoundBtn.classList.add('is-disabled');
      exampleSoundBtn.setAttribute('aria-disabled', 'true');
      exampleSoundBtn.title = 'Không có câu ví dụ';
    } else {
      exampleSoundBtn.disabled = false;
      exampleSoundBtn.classList.remove('is-disabled');
      exampleSoundBtn.removeAttribute('aria-disabled');
      exampleSoundBtn.title = 'Nghe câu ví dụ';
    }
  }
}

function stopSpeech() {
  speechRequestId++;
  callStopSpeaking();

  if (activeSpeechAudio) {
    const audio = activeSpeechAudio;
    activeSpeechAudio = null;
    audio.onplaying = null;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    try { audio.currentTime = 0; } catch (error) {}
  }

  if (activeSpeechButton) setSpeechButtonState(activeSpeechButton, false);
}

// Subscribe to async voice loading to refresh button state if needed
const svc = getSpeechService();
if (svc && typeof svc.onVoicesChanged === 'function') {
  svc.onVoicesChanged(() => {
    syncSpeechButtons();
  });
} else if (typeof onVoicesChanged === 'function') {
  onVoicesChanged(() => {
    syncSpeechButtons();
  });
}
