/**
 * SpeechAudio.js
 * Combined TTS & audio playback service for Chinese vocabulary & example sentences.
 * Port of legacy assets/js/speechService.js and assets/js/speech.js.
 */

/* global LEVELS, currentLevel, WORDS, filteredOrder, idx, SPEECH_RATE, exampleSpeechSpeed */

let cachedVoices = [];
let isVoicesLoaded = false;
let activeUtterance = null;
let activePlaybackId = 0;
const voiceListeners = [];

export function isSpeechSupported() {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance !== 'undefined';
}

export function normalizeLang(lang) {
  return (lang || '').toLowerCase().replace(/_/g, '-');
}

export function loadVoices() {
  if (!isSpeechSupported()) return [];
  try {
    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length > 0) {
      cachedVoices = voices;
      isVoicesLoaded = true;
    }
    return voices.length > 0 ? voices : cachedVoices;
  } catch (e) {
    console.warn('[SpeechService] Error loading voices:', e);
    return [];
  }
}

export function initVoiceLoading() {
  if (!isSpeechSupported()) return;

  loadVoices();

  const handleVoicesChanged = () => {
    const voices = loadVoices();
    voiceListeners.forEach(fn => {
      try { fn(voices); } catch (e) { console.warn(e); }
    });
  };

  if (typeof window.speechSynthesis.addEventListener === 'function') {
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
  }
  window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
}

export function onVoicesChanged(callback) {
  if (typeof callback !== 'function') return;
  voiceListeners.push(callback);
  const voices = loadVoices();
  if (voices && voices.length > 0) {
    try { callback(voices); } catch (e) {}
  }
}

function matchesLangPrefix(voice, prefix) {
  if (!voice || !voice.lang) return false;
  const l = normalizeLang(voice.lang);
  return l === prefix || l.startsWith(prefix + '-') || l.startsWith(prefix);
}

export function getChineseVoice(providedVoices) {
  if (!isSpeechSupported()) return null;

  let voices = providedVoices;
  if (!voices || !voices.length) {
    voices = loadVoices();
  }
  if (!voices || !voices.length) return null;

  // 1. Prefer zh-CN
  let voice = voices.find(v =>
    matchesLangPrefix(v, 'zh-cn') ||
    matchesLangPrefix(v, 'zh-hans') ||
    matchesLangPrefix(v, 'cmn-hans') ||
    matchesLangPrefix(v, 'cmn-cn')
  );
  if (voice) return voice;

  // 2. Prefer zh-TW
  voice = voices.find(v =>
    matchesLangPrefix(v, 'zh-tw') ||
    matchesLangPrefix(v, 'zh-hant') ||
    matchesLangPrefix(v, 'cmn-hant') ||
    matchesLangPrefix(v, 'cmn-tw')
  );
  if (voice) return voice;

  // 3. Prefer zh-HK
  voice = voices.find(v =>
    matchesLangPrefix(v, 'zh-hk') ||
    matchesLangPrefix(v, 'yue-hk')
  );
  if (voice) return voice;

  // 4. Any other Chinese voice starting with zh or cmn
  voice = voices.find(v =>
    matchesLangPrefix(v, 'zh') ||
    matchesLangPrefix(v, 'cmn')
  );
  if (voice) return voice;

  return null;
}

export function stopSpeaking() {
  activePlaybackId++;
  activeUtterance = null;
  if (isSpeechSupported()) {
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      console.warn('[SpeechService] stopSpeaking error:', e);
    }
  }
}

export function speakChinese(text, options = {}) {
  if (!text) return false;

  const cleanText = String(text).replace(/<[^>]*>/g, '').trim();
  if (!cleanText) return false;

  if (!isSpeechSupported()) {
    if (typeof options.onError === 'function') {
      try {
        options.onError(new Error('Web Speech API (speechSynthesis) is not supported in this browser.'));
      } catch (e) {}
    }
    return false;
  }

  stopSpeaking();

  const playbackId = activePlaybackId;
  const rate = typeof options.rate === 'number' ? Math.max(0.1, Math.min(2.0, options.rate)) : 0.8;
  const pitch = typeof options.pitch === 'number' ? Math.max(0, Math.min(2.0, options.pitch)) : 1.0;
  const volume = typeof options.volume === 'number' ? Math.max(0, Math.min(1.0, options.volume)) : 1.0;

  try {
    const UtteranceClass = (typeof window !== 'undefined' && window.SpeechSynthesisUtterance) || (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);
    if (!UtteranceClass) throw new Error('SpeechSynthesisUtterance not available');
    const utterance = new UtteranceClass(cleanText);
    const voice = options.voice || getChineseVoice();

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || 'zh-CN';
    } else {
      utterance.lang = 'zh-CN';
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    let settled = false;

    utterance.onstart = () => {
      if (playbackId !== activePlaybackId) return;
      if (typeof options.onStart === 'function') {
        try { options.onStart(); } catch (e) { console.warn(e); }
      }
    };

    utterance.onend = () => {
      if (settled || playbackId !== activePlaybackId) return;
      settled = true;
      activeUtterance = null;
      if (typeof options.onEnd === 'function') {
        try { options.onEnd(); } catch (e) { console.warn(e); }
      }
    };

    utterance.onerror = (event) => {
      if (settled || playbackId !== activePlaybackId) return;
      settled = true;
      activeUtterance = null;
      if (event && (event.error === 'canceled' || event.error === 'interrupted')) {
        if (typeof options.onEnd === 'function') {
          try { options.onEnd(); } catch (e) {}
        }
        return;
      }
      if (typeof options.onError === 'function') {
        try { options.onError(event); } catch (e) { console.warn(e); }
      }
    };

    activeUtterance = utterance;

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    console.warn('[SpeechService] Speech execution error:', error);
    if (typeof options.onError === 'function') {
      try { options.onError(error); } catch (e) {}
    }
    return false;
  }
}

export const SpeechService = {
  isSpeechSupported,
  getChineseVoice,
  getVoices: () => cachedVoices.slice(),
  onVoicesChanged,
  speakChinese,
  stopSpeaking,
};

// Playback orchestration
let localAudioManifest = null;
let speechRequestId = 0;
let activeSpeechButton = null;
let activeSpeechAudio = null;

export async function loadPrebuiltAudioManifest(level) {
  localAudioManifest = null;
  const levels = typeof LEVELS !== 'undefined' ? LEVELS : window.LEVELS;
  const config = levels ? levels[level] : null;
  if (!config || !config.audioManifestUrl) return;

  const currentLvl = typeof currentLevel !== 'undefined' ? currentLevel : window.currentLevel;

  try {
    const response = await fetch(config.audioManifestUrl, { cache: 'no-store' });
    if (!response.ok) return;
    const manifest = await response.json();
    if (currentLvl !== level || manifest.level !== level || !manifest.items) return;
    localAudioManifest = manifest;
    if (typeof window !== 'undefined') window.prebuiltAudioManifest = manifest;
  } catch (error) {
    // Missing manifest is expected when rolling out or using Web Speech directly.
  }
}

export function prebuiltAudioUrl(word, kind) {
  const currentLvl = typeof currentLevel !== 'undefined' ? currentLevel : window.currentLevel;
  const manifest = localAudioManifest || (typeof window !== 'undefined' && window.prebuiltAudioManifest);
  if (!word || !manifest || manifest.level !== currentLvl) return null;
  const item = manifest.items[String(word.id)];
  return item && typeof item[kind] === 'string' ? item[kind] : null;
}

export function speakWord() {
  const order = typeof filteredOrder !== 'undefined' ? filteredOrder : window.filteredOrder;
  const currentIdx = typeof idx !== 'undefined' ? idx : window.idx;
  const words = typeof WORDS !== 'undefined' ? WORDS : window.WORDS;
  if (!order || order.length === 0 || !words) return;

  const wIdx = order[currentIdx % order.length];
  const word = words[wIdx];
  if (!word || !word.hanzi) return;

  const btn = document.getElementById('soundBtn');
  const cleanHanzi = String(word.hanzi).replace(/[（\(].*?[）\)]/g, '').trim() || word.hanzi;
  const rate = typeof SPEECH_RATE !== 'undefined' ? SPEECH_RATE : (window.SPEECH_RATE || 0.8);
  speakText(
    cleanHanzi,
    btn,
    rate,
    prebuiltAudioUrl(word, 'word')
  );
}

export function speakExample() {
  const order = typeof filteredOrder !== 'undefined' ? filteredOrder : window.filteredOrder;
  const currentIdx = typeof idx !== 'undefined' ? idx : window.idx;
  const words = typeof WORDS !== 'undefined' ? WORDS : window.WORDS;
  if (!order || order.length === 0 || !words) return;

  const wIdx = order[currentIdx % order.length];
  const word = words[wIdx];
  const example = document.getElementById('exZh');
  const text = (example ? example.textContent.trim() : '') || (word ? word.example_zh : '');
  if (!text) return;

  const btn = document.getElementById('exampleSoundBtn');
  const exRate = typeof exampleSpeechSpeed !== 'undefined' ? exampleSpeechSpeed : (window.exampleSpeechSpeed || 0.8);
  speakText(
    text,
    btn,
    exRate,
    prebuiltAudioUrl(word, 'example')
  );
}

export function speakText(text, button, rate = (typeof SPEECH_RATE !== 'undefined' ? SPEECH_RATE : 0.8), audioUrl = null) {
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

  // PRIORITY 1: Prebuilt studio-grade audio
  if (audioUrl) {
    playPrebuiltAudio(text, button, rate, audioUrl, requestId, hint, prevHint);
    return;
  }

  // PRIORITY 2: Fallback to Web Speech API
  speakWithWebSpeech(text, button, rate, requestId, hint, prevHint);
}

export function playPrebuiltAudio(text, button, rate, audioUrl, requestId, hint, prevHint) {
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

export function speakWithWebSpeech(text, button, rate, requestId, hint, prevHint) {
  if (requestId !== speechRequestId) return;
  const supported = isSpeechSupported();
  if (!supported) {
    setSpeechButtonState(button, false);
    showSpeechHint(hint, 'Trình duyệt này không hỗ trợ phát âm, hãy mở bằng Chrome hoặc Safari', prevHint);
    return;
  }

  activeSpeechButton = button;
  const started = speakChinese(text, {
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

export function showSpeechHint(hint, message, previousMessage) {
  if (!hint) return;
  hint.textContent = message;
  setTimeout(() => {
    if (hint.textContent === message) hint.textContent = previousMessage;
  }, 2500);
}

export function setSpeechButtonState(button, isPlaying, text) {
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

export function syncSpeechButtons() {
  const soundBtn = document.getElementById('soundBtn');
  const exampleSoundBtn = document.getElementById('exampleSoundBtn');
  const supported = isSpeechSupported();

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
    const order = typeof filteredOrder !== 'undefined' ? filteredOrder : window.filteredOrder;
    const currentIdx = typeof idx !== 'undefined' ? idx : window.idx;
    const words = typeof WORDS !== 'undefined' ? WORDS : window.WORDS;
    const currentWord = (order && order.length > 0 && words) ? words[order[currentIdx % order.length]] : null;
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

export function stopSpeech() {
  speechRequestId++;
  stopSpeaking();

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

export function mountSpeechAudio() {
  initVoiceLoading();

  window.SpeechService = SpeechService;
  window.isSpeechSupported = isSpeechSupported;
  window.getChineseVoice = getChineseVoice;
  window.speakChinese = speakChinese;
  window.stopSpeaking = stopSpeaking;
  window.loadPrebuiltAudioManifest = loadPrebuiltAudioManifest;
  window.prebuiltAudioUrl = prebuiltAudioUrl;
  window.speakWord = speakWord;
  window.speakExample = speakExample;
  window.speakText = speakText;
  window.playPrebuiltAudio = playPrebuiltAudio;
  window.speakWithWebSpeech = speakWithWebSpeech;
  window.showSpeechHint = showSpeechHint;
  window.setSpeechButtonState = setSpeechButtonState;
  window.syncSpeechButtons = syncSpeechButtons;
  window.stopSpeech = stopSpeech;

  onVoicesChanged(() => {
    syncSpeechButtons();
  });
}
