// Small helpers shared by every feature script. Loaded before all other app scripts.

// Escape text for safe interpolation into HTML strings (shared by every view).
function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
