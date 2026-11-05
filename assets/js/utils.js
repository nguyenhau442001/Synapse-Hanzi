// Small helpers shared by every feature script. Loaded before all other app scripts.

// Written by tools/bump_version.py — used as the cache-buster for data fetches.
const APP_VERSION = '3.14.2';

// Escape text for safe interpolation into HTML strings (shared by every view).
function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
