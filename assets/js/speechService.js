/**
 * speechService.js
 * Reusable Web Speech API Text-to-Speech service for Chinese vocabulary and examples.
 * Phase 1: Listening MVP
 */

(function(global) {
  'use strict';

  let cachedVoices = [];
  let isVoicesLoaded = false;
  let activeUtterance = null;
  let activePlaybackId = 0;
  const voiceListeners = [];

  /**
   * Check whether the browser supports the Web Speech API (SpeechSynthesis).
   * @returns {boolean}
   */
  function isSpeechSupported() {
    return typeof window !== 'undefined'
      && 'speechSynthesis' in window
      && typeof window.SpeechSynthesisUtterance !== 'undefined';
  }

  /**
   * Normalize BCP 47 language code for consistent matching.
   * @param {string} lang
   * @returns {string}
   */
  function normalizeLang(lang) {
    return (lang || '').toLowerCase().replace(/_/g, '-');
  }

  /**
   * Load and cache voices from speechSynthesis.
   * @returns {SpeechSynthesisVoice[]}
   */
  function loadVoices() {
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

  /**
   * Handle async voice loading with speechSynthesis.onvoiceschanged.
   */
  function initVoiceLoading() {
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

  /**
   * Subscribe to voice loading events.
   * @param {Function} callback
   */
  function onVoicesChanged(callback) {
    if (typeof callback !== 'function') return;
    voiceListeners.push(callback);
    const voices = loadVoices();
    if (voices && voices.length > 0) {
      try { callback(voices); } catch (e) {}
    }
  }

  /**
   * Helper to check if a voice's lang matches a prefix.
   */
  function matchesLangPrefix(voice, prefix) {
    if (!voice || !voice.lang) return false;
    const l = normalizeLang(voice.lang);
    return l === prefix || l.startsWith(prefix + '-') || l.startsWith(prefix);
  }

  /**
   * Select a Chinese voice with prioritized preference:
   * 1. zh-CN (Mandarin - Mainland China)
   * 2. zh-TW (Mandarin - Taiwan)
   * 3. zh-HK (Chinese - Hong Kong)
   * 4. Any other Chinese voice (lang starts with 'zh' or 'cmn')
   * Fallback safely if no Chinese voice exists.
   * @param {SpeechSynthesisVoice[]} [providedVoices]
   * @returns {SpeechSynthesisVoice|null}
   */
  function getChineseVoice(providedVoices) {
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

    // Safe fallback if no Chinese voice exists
    return null;
  }

  /**
   * Stop any ongoing speech synthesis.
   */
  function stopSpeaking() {
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

  /**
   * Speak Chinese text using Web Speech API (window.speechSynthesis).
   *
   * @param {string} text - Text to speak.
   * @param {Object} [options]
   * @param {number} [options.rate=0.8] - Speech rate (0.1 to 2.0).
   * @param {number} [options.pitch=1.0] - Pitch (0 to 2.0).
   * @param {number} [options.volume=1.0] - Volume (0 to 1.0).
   * @param {SpeechSynthesisVoice} [options.voice] - Explicit voice override.
   * @param {Function} [options.onStart] - Callback when speech starts.
   * @param {Function} [options.onEnd] - Callback when speech finishes.
   * @param {Function} [options.onError] - Callback on error.
   * @returns {boolean} Whether utterance was successfully initiated.
   */
  function speakChinese(text, options = {}) {
    if (!text) return false;

    // Strip HTML markup if present (e.g. <u>...</u> in example sentences)
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

    // Cancel existing speech
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
        // Safe fallback language tag even if specific voice object was not found
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
        // Ignore 'canceled' or 'interrupted' errors caused by intentional stopSpeaking()
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

      // Keep utterance in memory to avoid garbage collection bug in Chromium/Blink
      activeUtterance = utterance;

      // Chrome/Safari speech synthesis resume fix if paused
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

  // Initialize async voice listener
  initVoiceLoading();

  const SpeechService = {
    isSpeechSupported,
    getChineseVoice,
    getVoices: () => cachedVoices.slice(),
    onVoicesChanged,
    speakChinese,
    stopSpeaking,
  };

  // Expose to window / global scope
  const target = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global);
  target.SpeechService = SpeechService;
  target.isSpeechSupported = isSpeechSupported;
  target.getChineseVoice = getChineseVoice;
  target.speakChinese = speakChinese;
  target.stopSpeaking = stopSpeaking;

  if (typeof globalThis !== 'undefined' && globalThis !== target) {
    globalThis.SpeechService = SpeechService;
    globalThis.isSpeechSupported = isSpeechSupported;
    globalThis.getChineseVoice = getChineseVoice;
    globalThis.speakChinese = speakChinese;
    globalThis.stopSpeaking = stopSpeaking;
  }

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
