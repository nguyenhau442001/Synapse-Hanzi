// Shared application configuration and in-memory state.
const LEVELS = {
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
const LEVELS_HSK30 = {
  hsk30_1: { label: 'HSK 3.0 – 1', band: 'Sơ cấp', dataUrl: 'database/vocabs/hsk3_0/level1_vocabularies.json', available: true, total: 300, version: '3.0' },
  hsk30_2: { label: 'HSK 3.0 – 2', band: 'Sơ cấp', dataUrl: 'database/vocabs/hsk3_0/level2_vocabularies.json', available: true, total: 200, version: '3.0' },
  hsk30_3: { label: 'HSK 3.0 – 3', band: 'Sơ cấp', dataUrl: 'database/vocabs/hsk3_0/level3_vocabularies.json', available: true, total: 500, version: '3.0' },
  hsk30_4: { label: 'HSK 3.0 – 4', band: 'Trung cấp', dataUrl: 'database/vocabs/hsk3_0/level4_vocabularies.json', available: true, total: 1000, version: '3.0' },
  hsk30_5: { label: 'HSK 3.0 – 5', band: 'Trung cấp', dataUrl: 'database/vocabs/hsk3_0/level5_vocabularies.json', available: true, total: 1600, version: '3.0' },
  hsk30_6: { label: 'HSK 3.0 – 6', band: 'Trung cấp', dataUrl: 'database/vocabs/hsk3_0/level6_vocabularies.json', available: true, total: 1800, version: '3.0' },
  hsk30_7: { label: 'HSK 3.0 – 7', band: 'Cao cấp', dataUrl: 'database/vocabs/hsk3_0/level7_vocabularies.json', available: true, total: 5600, version: '3.0', sharedVocabularyGroup: '7–9' },
  hsk30_8: { label: 'HSK 3.0 – 8', band: 'Cao cấp', dataUrl: 'database/vocabs/hsk3_0/level8_vocabularies.json', available: true, total: 5600, version: '3.0', sharedVocabularyGroup: '7–9' },
  hsk30_9: { label: 'HSK 3.0 – 9', band: 'Cao cấp', dataUrl: 'database/vocabs/hsk3_0/level9_vocabularies.json', available: true, total: 5600, version: '3.0', sharedVocabularyGroup: '7–9' },
};
Object.assign(LEVELS, LEVELS_HSK30);

// Topic decks: same word schema as LEVELS, browsed from the "Chủ đề" tab.
// Keys are prefixed 'topic_' and merged into LEVELS so every existing
// LEVELS[currentLevel] lookup (speech, overview, progress, backup) works unmodified.
const TOPICS = {
  topic_it: { label: 'Công nghệ thông tin', icon: '💻', dataUrl: 'database/vocabs/topics/it.json', available: true, total: 60, isTopic: true },
};
Object.assign(LEVELS, TOPICS);

function hskLevelKeys() {
  return Object.keys(LEVELS).filter(key => !TOPICS[key] && !LEVELS_HSK30[key]);
}

function hsk30LevelKeys() {
  return Object.keys(LEVELS_HSK30);
}
const SPEECH_RATE = 0.85;
const EXAMPLE_SPEECH_SPEEDS = [0.5, 0.75, 0.8, 1, 1.25, 1.5, 1.75, 2];
const DEFAULT_EXAMPLE_SPEECH_SPEED = 0.8;

let currentLevel = null;
let WORDS = [];
let order = [];
let filteredOrder = [];
let idx = 0;
let progress = {};
let srsCards = {};
let reviewLog = [];
let srsRetention = 0.9;
let showPinyin = true;
let showHanViet = (function() {
  try {
    const saved = localStorage.getItem('hsk_show_hanviet');
    return saved !== null ? saved === 'true' : true;
  } catch (e) {
    return true;
  }
})();
let showIllustration = (function() {
  try {
    const saved = localStorage.getItem('hsk_show_illustrations');
    return saved !== null ? saved === 'true' : false;
  } catch (e) {
    return false;
  }
})();
if (typeof document !== 'undefined') {
  if (document.documentElement) document.documentElement.classList.toggle('hide-illustrations', !showIllustration);
  if (document.body) document.body.classList.toggle('hide-illustrations', !showIllustration);
}
let currentFilter = 'all';
let transitionTimer = null;
let celebrationShown = false;
let cachedVoices = [];
let speechRequestId = 0;
let activeSpeechButton = null;
let activeSpeechAudio = null;
let prebuiltAudioManifest = null;
let exampleSpeechSpeed = DEFAULT_EXAMPLE_SPEECH_SPEED;
let currentView = 'cards';
let overviewQuery = '';
let overviewStatus = 'all';
let reviewPool = [];
let reviewIndex = 0;
let reviewLives = 5;
let reviewScore = 0;
let reviewStreak = 0;
let reviewBestStreak = 0;
let reviewMistakes = [];
let reviewTimer = null;
let reviewTimeLeft = 20;
let reviewCurrentQuestion = null;
let reviewAnswered = false;
let reviewSessionLive = false;
let reviewWordPool = [];
let reviewProgressByLevel = {};
let reviewCardsByLevel = {};
let todayReviewQueue = [];
let todayReviewIndex = 0;
let reviewLoadedRangeMax = 0;
let reviewWorker = null;

function formatExampleSpeechSpeed(speed) {
  const numericSpeed = Number(speed);
  return `${Number.isInteger(numericSpeed) ? numericSpeed.toFixed(1) : numericSpeed} x`;
}

function setExampleSpeechSpeed(value) {
  const nextSpeed = Number(value);
  if (!EXAMPLE_SPEECH_SPEEDS.includes(nextSpeed)) return;

  exampleSpeechSpeed = nextSpeed;
  stopSpeech();

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

function pickChineseVoice() {
  if (typeof getChineseVoice === 'function') return getChineseVoice();
  if (typeof SpeechService !== 'undefined' && typeof SpeechService.getChineseVoice === 'function') {
    return SpeechService.getChineseVoice();
  }
  if (!('speechSynthesis' in window)) return null;
  if (!cachedVoices.length) cachedVoices = speechSynthesis.getVoices();
  return cachedVoices.find(v => v.lang === 'zh-CN')
    || cachedVoices.find(v => v.lang && v.lang.toLowerCase().startsWith('zh'))
    || null;
}
if ('speechSynthesis' in window) {
  cachedVoices = speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => { cachedVoices = speechSynthesis.getVoices(); };
}

let speechWarmed = false;
function warmUpSpeech() {
  if (speechWarmed || !('speechSynthesis' in window)) return;
  speechWarmed = true;
  try {
    const warmUp = new SpeechSynthesisUtterance('');
    warmUp.volume = 0;
    speechSynthesis.speak(warmUp);
  } catch (e) {}
}
document.addEventListener('touchstart', warmUpSpeech, { once: true, passive: true });
document.addEventListener('click', warmUpSpeech, { once: true });

function storageKey(suffix) {
  return 'hsk_' + currentLevel + '_' + suffix + '_v2';
}

let activeStudyWord = null;
const activeWordListeners = [];

function onActiveWordChange(fn) {
  activeWordListeners.push(fn);
}

function setActiveStudyWord(word) {
  activeStudyWord = word;
  document.body.classList.toggle('has-active-study-word', Boolean(word && word.hanzi));
  activeWordListeners.forEach(fn => {
    try { fn(word); } catch (e) { /* one listener's failure must not block others */ }
  });
}

// Universal vocabulary search normalization and matching helper.
// Supports:
// - Hanzi (exact & partial)
// - Pinyin with tones (hēibǎn), without tones (heiban), with tone numbers (hei1ban3, hei1 ban3)
// - Pinyin with or without spaces between syllables (heiban <-> hei ban)
// - Pinyin with ü, v, or u (lǜ, lv, lu; nǚ, nv, nu)
// - Sino-Vietnamese / Hán Việt with or without accents (Hắc Bản, hac ban)
// - Vietnamese meaning with or without accents & đ -> d (bảng đen, bang den)
function normalizeSearchText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[đĐ]/g, 'd')
    .replace(/[ǖǘǚǜü]/g, 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function wordMatchesQuery(word, query) {
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

