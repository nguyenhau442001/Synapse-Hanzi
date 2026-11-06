// Small helpers shared by every feature script. Loaded before all other app scripts.

// Written by tools/bump_version.py — used as the cache-buster for data fetches.
const APP_VERSION = '3.14.3';

// Escape text for safe interpolation into HTML strings (shared by every view).
function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

// Speaker icon for every "listen" button (inline SVG, inherits currentColor).
function speakerIconSvg(size = 16, className = '') {
  return `<svg${className ? ` class="${className}"` : ''} viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
}

// The 12 official HSK 4 mock exams (H41001–H41012) used by the listening and sentence-ordering drills.
const HSK4_MOCK_EXAMS = Array.from({ length: 12 }, (_, i) => {
  const id = `H410${String(i + 1).padStart(2, '0')}`;
  return { id, name: `Đề ${i + 1} (${id})` };
});

// Show or hide a collapsible card section: its <details> accordion (always
// left collapsed) and the content wrap inside it.
function setCardSectionVisible(accordion, wrap, visible, wrapDisplay = 'block') {
  if (accordion) {
    accordion.hidden = !visible;
    accordion.style.display = visible ? 'block' : 'none';
    accordion.open = false;
  }
  if (wrap) {
    wrap.hidden = !visible;
    wrap.style.display = visible ? wrapDisplay : 'none';
  }
}

// Pinyin tone-marked vowels → bare letters (ü → v), for tone-insensitive matching.
const PINYIN_TONE_MARKS = {
  'ā':'a','á':'a','ǎ':'a','à':'a',
  'ē':'e','é':'e','ě':'e','è':'e',
  'ī':'i','í':'i','ǐ':'i','ì':'i',
  'ō':'o','ó':'o','ǒ':'o','ò':'o',
  'ū':'u','ú':'u','ǔ':'u','ù':'u',
  'ǖ':'v','ǘ':'v','ǚ':'v','ǜ':'v','ü':'v',
};

// Lower-case the text and drop pinyin tone marks: "Hēibǎn" → "heiban".
function stripPinyinTones(text) {
  return String(text || '').toLowerCase().replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, ch => PINYIN_TONE_MARKS[ch]);
}

// Fisher–Yates shuffle of arr in place; returns arr.
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Shuffled copy of arr (arr itself is left untouched).
function shuffledCopy(arr) {
  return shuffleInPlace(arr.slice());
}

// Open/close (or force) a hidden-attribute panel and sync its toggle button.
function toggleDisclosurePanel(panelId, buttonId, forceOpen) {
  const panel = document.getElementById(panelId);
  const button = document.getElementById(buttonId);
  if (!panel) return;
  const willOpen = typeof forceOpen === 'boolean' ? forceOpen : panel.hidden;
  panel.hidden = !willOpen;
  if (button) {
    button.setAttribute('aria-expanded', String(willOpen));
    button.classList.toggle('on', willOpen);
  }
}
