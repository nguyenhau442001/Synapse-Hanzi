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
