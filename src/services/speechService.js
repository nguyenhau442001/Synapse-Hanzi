/**
 * speechService.js
 * Dual audio engine: Plays authentic prebuilt studio audio clips with seamless
 * fallback to Web Speech API (SpeechSynthesis) for Chinese pronunciation.
 */

import { signal } from '@preact/signals';

export const isPlayingAudioSignal = signal(false);
let activeAudioElement = null;

/**
 * Clean HTML markup (like <u>...</u>) from example sentences for speech synthesis
 * @param {string} text
 * @returns {string}
 */
export function cleanSpeechText(text) {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').replace(/[\[\]]/g, '').trim();
}

/**
 * Check if Web Speech API is supported
 * @returns {boolean}
 */
export function isWebSpeechSupported() {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Stop any currently playing audio or speech synthesis
 */
export function stopAllAudio() {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch (e) {}
    activeAudioElement = null;
  }

  if (isWebSpeechSupported() && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }

  isPlayingAudioSignal.value = false;
}

/**
 * Speak text using Web Speech API
 * @param {string} text
 * @param {number} rate - default 0.85
 * @returns {Promise<boolean>}
 */
export function speakWithWebSpeech(text, rate = 0.85) {
  if (!isWebSpeechSupported() || !text) return Promise.resolve(false);

  stopAllAudio();
  isPlayingAudioSignal.value = true;

  return new Promise((resolve) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = rate;

      // Select high quality Chinese voice if available
      const voices = window.speechSynthesis.getVoices() || [];
      const zhVoice = voices.find(v => v.lang.startsWith('zh') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Neural')));
      if (zhVoice) {
        utterance.voice = zhVoice;
      }

      utterance.onend = () => {
        isPlayingAudioSignal.value = false;
        resolve(true);
      };

      utterance.onerror = () => {
        isPlayingAudioSignal.value = false;
        resolve(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      isPlayingAudioSignal.value = false;
      resolve(false);
    }
  });
}

/**
 * Play word audio: uses prebuilt MP3 if available in manifest, else Web Speech API
 * @param {Object} word - Word object { id, hanzi, ... }
 * @param {Object} audioManifest - Optional prebuilt audio manifest
 */
export async function playWordAudio(word, audioManifest = null) {
  if (!word || !word.hanzi) return;

  stopAllAudio();

  // 1. Try prebuilt audio clip
  const prebuiltPath = audioManifest?.items?.[String(word.id)]?.word;
  if (prebuiltPath) {
    try {
      isPlayingAudioSignal.value = true;
      const audio = new Audio(prebuiltPath);
      activeAudioElement = audio;

      audio.onended = () => {
        isPlayingAudioSignal.value = false;
        activeAudioElement = null;
      };

      audio.onerror = () => {
        // Fallback to Web Speech on audio error
        speakWithWebSpeech(word.hanzi, 0.85);
      };

      await audio.play();
      return;
    } catch (e) {
      // Audio play blocked or failed, fallback to Web Speech
    }
  }

  // 2. Fallback to Web Speech API
  await speakWithWebSpeech(word.hanzi, 0.85);
}

/**
 * Play example sentence audio: uses prebuilt MP3 if available in manifest, else Web Speech API
 * @param {Object} word - Word object { id, example_zh, ... }
 * @param {Object} audioManifest - Optional prebuilt audio manifest
 */
export async function playExampleAudio(word, audioManifest = null) {
  if (!word || !word.example_zh) return;

  stopAllAudio();

  // 1. Try prebuilt example audio
  const prebuiltPath = audioManifest?.items?.[String(word.id)]?.example;
  if (prebuiltPath) {
    try {
      isPlayingAudioSignal.value = true;
      const audio = new Audio(prebuiltPath);
      activeAudioElement = audio;

      audio.onended = () => {
        isPlayingAudioSignal.value = false;
        activeAudioElement = null;
      };

      audio.onerror = () => {
        const cleanText = cleanSpeechText(word.example_zh);
        speakWithWebSpeech(cleanText, 0.8);
      };

      await audio.play();
      return;
    } catch (e) {}
  }

  // 2. Fallback to Web Speech API
  const cleanText = cleanSpeechText(word.example_zh);
  await speakWithWebSpeech(cleanText, 0.8);
}
