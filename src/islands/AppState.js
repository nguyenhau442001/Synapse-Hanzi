// src/islands/AppState.js
// Shared application configuration and in-memory state.

export const LEVELS = {
  hsk1: {
    label: 'HSK1',
    dataUrl: 'database/vocabs/hsk1_vocabularies.json',
    audioManifestUrl: 'database/prebuilt_audio/hsk1/manifest.json',
    available: true,
    total: 150,
  },
  hsk2: {
    label: 'HSK2',
    dataUrl: 'database/vocabs/hsk2_vocabularies.json',
    audioManifestUrl: 'database/prebuilt_audio/hsk2/manifest.json',
    available: true,
    total: 150,
  },
  hsk3: {
    label: 'HSK3',
    dataUrl: 'database/vocabs/hsk3_vocabularies.json',
    audioManifestUrl: 'database/prebuilt_audio/hsk3/manifest.json',
    available: true,
    total: 300,
  },
  hsk4: {
    label: 'HSK4',
    dataUrl: 'database/vocabs/hsk4_vocabularies.json',
    audioManifestUrl: 'database/prebuilt_audio/hsk4/manifest.json',
    available: true,
    total: 600,
  },
  hsk5: { label: 'HSK5', dataUrl: 'database/vocabs/hsk5_vocabularies.json', available: true, total: 1300 },
  hsk6: { label: 'HSK6', dataUrl: 'database/vocabs/hsk6_vocabularies.json', available: true, total: 2500 },
};
Object.keys(LEVELS).forEach(key => { LEVELS[key].version = '2.0'; });

// HSK 3.0 levels (2025 exam syllabus): 9 exam levels in 3 bands
// (Sơ cấp 1–3, Trung cấp 4–6, Cao cấp 7–9). Separate syllabus from 2.0 above —
// data/progress never overlap since keys (hsk30_N) share no prefix with hsk1..hsk6.
// Exam levels 7–9 share the same advanced vocabulary list in the syllabus;
// separate copies preserve the app's per-level progress storage.
export const LEVELS_HSK30 = {
  hsk30_1: { label: 'HSK 3.0 – 1', band: 'Sơ cấp', dataUrl: 'database/vocabs/hsk3_0/level1_vocabularies.json', audioManifestUrl: 'database/prebuilt_audio/hsk30_1/manifest.json', available: true, total: 300, version: '3.0' },
  hsk30_2: { label: 'HSK 3.0 – 2', band: 'Sơ cấp', dataUrl: 'database/vocabs/hsk3_0/level2_vocabularies.json', audioManifestUrl: 'database/prebuilt_audio/hsk30_2/manifest.json', available: true, total: 200, version: '3.0' },
  hsk30_3: { label: 'HSK 3.0 – 3', band: 'Sơ cấp', dataUrl: 'database/vocabs/hsk3_0/level3_vocabularies.json', audioManifestUrl: 'database/prebuilt_audio/hsk30_3/manifest.json', available: true, total: 500, version: '3.0' },
  hsk30_4: { label: 'HSK 3.0 – 4', band: 'Trung cấp', dataUrl: 'database/vocabs/hsk3_0/level4_vocabularies.json', audioManifestUrl: 'database/prebuilt_audio/hsk30_4/manifest.json', available: true, total: 1000, version: '3.0' },
  hsk30_5: { label: 'HSK 3.0 – 5', band: 'Trung cấp', dataUrl: 'database/vocabs/hsk3_0/level5_vocabularies.json', audioManifestUrl: 'database/prebuilt_audio/hsk30_5/manifest.json', available: true, total: 1600, version: '3.0' },
  hsk30_6: { label: 'HSK 3.0 – 6', band: 'Trung cấp', dataUrl: 'database/vocabs/hsk3_0/level6_vocabularies.json', audioManifestUrl: 'database/prebuilt_audio/hsk30_6/manifest.json', available: true, total: 1800, version: '3.0' },
  hsk30_7: { label: 'HSK 3.0 – 7', band: 'Cao cấp', dataUrl: 'database/vocabs/hsk3_0/level7_vocabularies.json', audioManifestUrl: 'database/prebuilt_audio/hsk30_7/manifest.json', available: true, total: 5600, version: '3.0', sharedVocabularyGroup: '7–9' },
  hsk30_8: { label: 'HSK 3.0 – 8', band: 'Cao cấp', dataUrl: 'database/vocabs/hsk3_0/level8_vocabularies.json', audioManifestUrl: 'database/prebuilt_audio/hsk30_7/manifest.json', available: true, total: 5600, version: '3.0', sharedVocabularyGroup: '7–9' },
  hsk30_9: { label: 'HSK 3.0 – 9', band: 'Cao cấp', dataUrl: 'database/vocabs/hsk3_0/level9_vocabularies.json', audioManifestUrl: 'database/prebuilt_audio/hsk30_7/manifest.json', available: true, total: 5600, version: '3.0', sharedVocabularyGroup: '7–9' },
};
Object.assign(LEVELS, LEVELS_HSK30);

// Topic decks: same word schema as LEVELS, browsed from the "Chủ đề" tab.
// Keys are prefixed 'topic_' and merged into LEVELS so every existing
// LEVELS[currentLevel] lookup (speech, overview, progress, backup) works unmodified.
export const TOPICS = {
  topic_it: { label: 'Công nghệ thông tin', icon: '💻', dataUrl: 'database/vocabs/topics/it.json', available: true, total: 60, isTopic: true },
};
Object.assign(LEVELS, TOPICS);

// Download a level's word list; rejects on network or HTTP errors.
export async function fetchLevelWords(level) {
  const url = LEVELS[level].dataUrl;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`fetch failed: ${url} (${response.status})`);
  return response.json();
}

export function hskLevelKeys() {
  return Object.keys(LEVELS).filter(key => !TOPICS[key] && !LEVELS_HSK30[key]);
}

export function hsk30LevelKeys() {
  return Object.keys(LEVELS_HSK30);
}

export const SPEECH_RATE = 0.85;
export const EXAMPLE_SPEECH_SPEEDS = [0.5, 0.75, 0.8, 1, 1.25, 1.5, 1.75, 2];
export const DEFAULT_EXAMPLE_SPEECH_SPEED = 0.8;

export let currentLevel = null;
export let WORDS = [];
export let order = [];
export let filteredOrder = [];
export let idx = 0;
export let progress = {};
export let srsCards = {};
export let reviewLog = [];
export let srsRetention = 0.9;
export let showPinyin = true;
export let showHanViet = (function() {
  try {
    const saved = localStorage.getItem('hsk_show_hanviet');
    return saved !== null ? saved === 'true' : true;
  } catch (e) {
    return true;
  }
})();
export let showIllustration = (function() {
  try {
    const saved = localStorage.getItem('hsk_show_illustrations_v2');
    return saved !== null ? saved === 'true' : false;
  } catch (e) {
    return false;
  }
})();
if (typeof document !== 'undefined') {
  if (document.documentElement) document.documentElement.classList.toggle('hide-illustrations', !showIllustration);
  if (document.body) document.body.classList.toggle('hide-illustrations', !showIllustration);
}
export let currentFilter = 'all';

// Clear the deck filter and point idx at WORDS[wordIndex] (or the first card).
export function showAllWordsAt(wordIndex) {
  if (typeof currentFilter !== 'undefined') currentFilter = 'all';
  if (typeof window !== 'undefined') window.currentFilter = 'all';
  const currentOrder = typeof order !== 'undefined' ? order : (typeof window !== 'undefined' ? window.order : []);
  const nextFiltered = currentOrder.slice();
  if (typeof filteredOrder !== 'undefined') filteredOrder = nextFiltered;
  if (typeof window !== 'undefined') window.filteredOrder = nextFiltered;
  const nextIdx = Math.max(0, nextFiltered.indexOf(wordIndex));
  if (typeof idx !== 'undefined') idx = nextIdx;
  if (typeof window !== 'undefined') window.idx = nextIdx;
}

export let transitionTimer = null;
export let celebrationShown = false;
export let cachedVoices = [];
export let speechRequestId = 0;
export let activeSpeechButton = null;
export let activeSpeechAudio = null;
export let prebuiltAudioManifest = null;
export let exampleSpeechSpeed = DEFAULT_EXAMPLE_SPEECH_SPEED;
export let currentView = 'cards';
export let overviewQuery = '';
export let overviewStatus = 'all';
export let reviewPool = [];
export let reviewIndex = 0;
export let reviewLives = 5;
export let reviewScore = 0;
export let reviewStreak = 0;
export let reviewBestStreak = 0;
export let reviewMistakes = [];
export let reviewTimer = null;
export let reviewTimeLeft = 20;
export let reviewCurrentQuestion = null;
export let reviewAnswered = false;
export let reviewSessionLive = false;
export let reviewWordPool = [];
export let reviewProgressByLevel = {};
export let reviewCardsByLevel = {};
export let reviewLoadedRangeMax = 0;
export let reviewWorker = null;

export function formatExampleSpeechSpeed(speed) {
  const numericSpeed = Number(speed);
  return `${Number.isInteger(numericSpeed) ? numericSpeed.toFixed(1) : numericSpeed} x`;
}

export function setExampleSpeechSpeed(value) {
  const nextSpeed = Number(value);
  if (!EXAMPLE_SPEECH_SPEEDS.includes(nextSpeed)) return;

  exampleSpeechSpeed = nextSpeed;
  if (typeof window !== 'undefined') window.exampleSpeechSpeed = nextSpeed;
  if (typeof stopSpeech === 'function') stopSpeech();
  else if (typeof window !== 'undefined' && typeof window.stopSpeech === 'function') window.stopSpeech();

  const currentSpeed = document.getElementById('exampleCurrentSpeed');
  if (currentSpeed) currentSpeed.textContent = formatExampleSpeechSpeed(nextSpeed);
  const speedSummary = document.querySelector('#exampleSpeedPicker summary');
  if (speedSummary) {
    speedSummary.setAttribute('aria-label', `Tốc độ đọc câu ví dụ: ${formatExampleSpeechSpeed(nextSpeed)}`);
  }
  document.querySelectorAll('.example-speed-option').forEach(option => {
    const isSelected = Number(option.dataset.speed) === nextSpeed;
    option.classList.toggle('selected', isSelected);
    option.setAttribute('aria-pressed', String(isSelected));
  });

  const speedPicker = document.getElementById('exampleSpeedPicker');
  if (speedPicker) speedPicker.open = false;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => {
    cachedVoices = speechSynthesis.getVoices();
    if (typeof window !== 'undefined') window.cachedVoices = cachedVoices;
  };
}

let speechWarmed = false;
export function warmUpSpeech() {
  if (speechWarmed || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  speechWarmed = true;
  try {
    const warmUp = new SpeechSynthesisUtterance('');
    warmUp.volume = 0;
    speechSynthesis.speak(warmUp);
  } catch (e) {}
}

if (typeof document !== 'undefined') {
  document.addEventListener('touchstart', warmUpSpeech, { once: true, passive: true });
  document.addEventListener('click', warmUpSpeech, { once: true });
}

export function storageKey(suffix) {
  const activeLevel = typeof currentLevel !== 'undefined' ? currentLevel : (typeof window !== 'undefined' ? window.currentLevel : null);
  return 'hsk_' + activeLevel + '_' + suffix + '_v2';
}

export let activeStudyWord = null;
export const activeWordListeners = [];

export function onActiveWordChange(fn) {
  activeWordListeners.push(fn);
}

export function setActiveStudyWord(word) {
  activeStudyWord = word;
  if (typeof window !== 'undefined') window.activeStudyWord = word;
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('has-active-study-word', Boolean(word && word.hanzi));
  }
  activeWordListeners.forEach(fn => {
    try { fn(word); } catch (e) { /* one listener's failure must not block others */ }
  });
}

// Universal vocabulary search normalization and matching helper.
export function normalizeSearchText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[đĐ]/g, 'd')
    .replace(/[ǖǘǚǜü]/g, 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function wordMatchesQuery(word, query) {
  if (!query) return true;
  if (!word) return false;
  const rawQ = query.trim().toLowerCase();
  if (!rawQ) return true;

  // 1. Hanzi match (exact or substring)
  if (word.hanzi && word.hanzi.includes(rawQ)) return true;

  // 2. Exact match in raw string (meaning, pinyin, hanviet)
  const rawTarget = `${word.hanzi || ''} ${word.pinyin || ''} ${word.hanviet || ''} ${word.meaning || ''}`.toLowerCase();
  if (rawTarget.includes(rawQ)) return true;

  const normQ = normalizeSearchText(rawQ);
  if (!normQ) return false;

  // 3. Normalized target strings (support both v and u for ü)
  const normPinyinV = normalizeSearchText(word.pinyin);
  const normPinyinU = normalizeSearchText(String(word.pinyin || '').replace(/[ǖǘǚǜü]/g, 'u'));
  const normHanviet = normalizeSearchText(word.hanviet);
  const normMeaning = normalizeSearchText(word.meaning);

  const normTarget = `${word.hanzi || ''} ${normPinyinV} ${normPinyinU} ${normHanviet} ${normMeaning}`;
  if (normTarget.includes(normQ)) return true;

  // 4. Spaceless match (e.g. user typed "hei ban" matching "heiban", or "heiban" matching "hei ban")
  const spacelessQ = normQ.replace(/[\s\-_'".]+/g, '');
  const spacelessPinyinV = normPinyinV.replace(/[\s\-_'".]+/g, '');
  const spacelessPinyinU = normPinyinU.replace(/[\s\-_'".]+/g, '');
  const spacelessHanviet = normHanviet.replace(/[\s\-_'".]+/g, '');
  const spacelessMeaning = normMeaning.replace(/[\s\-_'".]+/g, '');

  if (spacelessQ && (
    spacelessPinyinV.includes(spacelessQ) ||
    spacelessPinyinU.includes(spacelessQ) ||
    spacelessHanviet.includes(spacelessQ) ||
    spacelessMeaning.includes(spacelessQ)
  )) {
    return true;
  }

  // 5. Tone numbers in query (e.g. "hei1ban3" -> "heiban")
  const strippedDigitsQ = spacelessQ.replace(/[0-5]/g, '');
  if (strippedDigitsQ && (
    spacelessPinyinV.includes(strippedDigitsQ) ||
    spacelessPinyinU.includes(strippedDigitsQ)
  )) {
    return true;
  }

  // 6. Multi-token match: all tokens in query must match
  const tokens = normQ.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const allMatch = tokens.every(tok => {
      const cleanTok = tok.replace(/[0-5]/g, '');
      return normTarget.includes(tok) ||
             (cleanTok && (spacelessPinyinV.includes(cleanTok) || spacelessPinyinU.includes(cleanTok)));
    });
    if (allMatch) return true;
  }

  return false;
}

export function mountAppState() {
  if (typeof window !== 'undefined') {
    Object.assign(window, {
      LEVELS,
      LEVELS_HSK30,
      TOPICS,
      fetchLevelWords,
      hskLevelKeys,
      hsk30LevelKeys,
      SPEECH_RATE,
      EXAMPLE_SPEECH_SPEEDS,
      DEFAULT_EXAMPLE_SPEECH_SPEED,
      currentLevel,
      WORDS,
      order,
      filteredOrder,
      idx,
      progress,
      srsCards,
      reviewLog,
      srsRetention,
      showPinyin,
      showHanViet,
      showIllustration,
      currentFilter,
      showAllWordsAt,
      transitionTimer,
      celebrationShown,
      cachedVoices,
      speechRequestId,
      activeSpeechButton,
      activeSpeechAudio,
      prebuiltAudioManifest,
      exampleSpeechSpeed,
      currentView,
      overviewQuery,
      overviewStatus,
      reviewPool,
      reviewIndex,
      reviewLives,
      reviewScore,
      reviewStreak,
      reviewBestStreak,
      reviewMistakes,
      reviewTimer,
      reviewTimeLeft,
      reviewCurrentQuestion,
      reviewAnswered,
      reviewSessionLive,
      reviewWordPool,
      reviewProgressByLevel,
      reviewCardsByLevel,
      reviewLoadedRangeMax,
      reviewWorker,
      formatExampleSpeechSpeed,
      setExampleSpeechSpeed,
      warmUpSpeech,
      storageKey,
      activeStudyWord,
      activeWordListeners,
      onActiveWordChange,
      setActiveStudyWord,
      normalizeSearchText,
      wordMatchesQuery,
    });
  }
}

if (typeof window !== 'undefined') {
  mountAppState();
}
