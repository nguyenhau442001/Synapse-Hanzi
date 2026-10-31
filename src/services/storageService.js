/**
 * storageService.js
 * Persistent storage layer maintaining 100% backward-compatibility
 * with Synapse Hanzi localStorage keys and schemas.
 */

export const STORAGE_KEYS = {
  theme: 'hsk_theme_manual',
  themeExpiry: 'hsk_theme_manual_expiry',
  showHanviet: 'hsk_show_hanviet',
  lastLevel: 'hsk_last_level_v1',
  progress: (level) => `hsk_${level}_progress`,
  srsCards: (level) => `hsk_${level}_srs_v3`,
  reviewLog: (level) => `hsk_${level}_review_log_v1`,
};

/**
 * Load progress map for a level { [wordId]: 'remembered' | 'learning' }
 * @param {string} level
 * @returns {Record<string|number, string>}
 */
export function loadLevelProgress(level) {
  if (!level) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.progress(level));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    return {};
  }
}

/**
 * Save progress map for a level
 * @param {string} level
 * @param {Record<string|number, string>} progressMap
 */
export function saveLevelProgress(level, progressMap) {
  if (!level || !progressMap) return;
  try {
    localStorage.setItem(STORAGE_KEYS.progress(level), JSON.stringify(progressMap));
  } catch (e) {}
}

/**
 * Load last selected level
 * @returns {string}
 */
export function loadLastSelectedLevel() {
  try {
    const params = new URLSearchParams(window.location.search);
    const queryLevel = params.get('level');
    if (queryLevel) return queryLevel;
    return localStorage.getItem(STORAGE_KEYS.lastLevel) || 'hsk1';
  } catch (e) {
    return 'hsk1';
  }
}

/**
 * Save last selected level
 * @param {string} level
 */
export function saveLastSelectedLevel(level) {
  if (!level) return;
  try {
    localStorage.setItem(STORAGE_KEYS.lastLevel, level);
  } catch (e) {}
}
