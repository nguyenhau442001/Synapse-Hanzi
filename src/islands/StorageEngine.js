// src/islands/StorageEngine.js
// Local persistence for the currently selected HSK level and cross-level SRS progress.

import { SRS } from './SrsEngine';

export const SRS_SCHEMA_VERSION = 3;
export const SRS_RETENTION_KEY = 'hsk_srs_prefs_v1';

export function srsCardsKey(level) {
  return 'hsk_' + level + '_srs_v3';
}

export function reviewLogKey(level) {
  return 'hsk_' + level + '_review_log_v1';
}

export function readSrsRecord(level) {
  try {
    const record = JSON.parse(localStorage.getItem(srsCardsKey(level)));
    if (record && record.schemaVersion === SRS_SCHEMA_VERSION && record.cards && typeof record.cards === 'object') return record;
  } catch (e) {}
  return null;
}

export function readSrsReviewLog(level) {
  try {
    const log = JSON.parse(localStorage.getItem(reviewLogKey(level)));
    return Array.isArray(log) ? log : [];
  } catch (e) { return []; }
}

export function saveSrsRecord(level, cards, migratedFromV2) {
  try {
    localStorage.setItem(srsCardsKey(level), JSON.stringify({
      schemaVersion: SRS_SCHEMA_VERSION,
      migratedFromV2: Boolean(migratedFromV2),
      cards,
    }));
  } catch (e) {}
}

export function appendReviewLog(level, entry) {
  try {
    const current = readSrsReviewLog(level);
    current.push(entry);
    localStorage.setItem(reviewLogKey(level), JSON.stringify(current));
    const activeLevel = typeof currentLevel !== 'undefined' ? currentLevel : (typeof window !== 'undefined' ? window.currentLevel : null);
    if (level === activeLevel) {
      if (typeof reviewLog !== 'undefined') reviewLog = current;
      if (typeof window !== 'undefined') window.reviewLog = current;
    }
  } catch (e) {}
}

export function appendImportedReviewLog(level, entries) {
  if (!Array.isArray(entries)) return;
  try {
    const current = readSrsReviewLog(level);
    const seen = new Set(current.map(entry => [level, entry.wordId, entry.timestamp, entry.rating, entry.stateBefore, entry.stateAfter].join('|')));
    const additions = entries.filter(entry => {
      if (!entry || typeof entry !== 'object' || !entry.timestamp || !entry.rating) return false;
      const key = [level, entry.wordId, entry.timestamp, entry.rating, entry.stateBefore, entry.stateAfter].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!additions.length) return;
    const normalized = additions.map(entry => ({ ...entry, level }));
    localStorage.setItem(reviewLogKey(level), JSON.stringify(current.concat(normalized)));
    const activeLevel = typeof currentLevel !== 'undefined' ? currentLevel : (typeof window !== 'undefined' ? window.currentLevel : null);
    if (level === activeLevel) {
      const merged = current.concat(normalized);
      if (typeof reviewLog !== 'undefined') reviewLog = merged;
      if (typeof window !== 'undefined') window.reviewLog = merged;
    }
  } catch (e) {}
}

export function retentionFromPrefs() {
  try {
    const prefs = JSON.parse(localStorage.getItem(SRS_RETENTION_KEY));
    if (prefs && Number.isFinite(Number(prefs.desiredRetention))) return SRS.normalizeRetention(prefs.desiredRetention);
  } catch (e) {}
  return SRS.DEFAULT_RETENTION;
}

export function saveRetention(value) {
  const norm = SRS.normalizeRetention(value);
  if (typeof srsRetention !== 'undefined') srsRetention = norm;
  if (typeof window !== 'undefined') window.srsRetention = norm;
  try { localStorage.setItem(SRS_RETENTION_KEY, JSON.stringify({ desiredRetention: norm })); } catch (e) {}
  return norm;
}

export function statusFromCard(card) {
  if (!card) return null;
  if (card.status === 'unknown' || card.status === 'known') return card.status;
  if (card.last_rating === 'again' || card.last_rating === 'hard') return 'unknown';
  if (card.last_rating === 'good' || card.last_rating === 'easy') return 'known';
  if (card.state === SRS.State.Review) return 'known';
  if (card.state === SRS.State.Learning || card.state === SRS.State.Relearning) return 'unknown';
  return null;
}

export function progressFromCards(cards) {
  const statuses = {};
  Object.keys(cards || {}).forEach(id => {
    const status = statusFromCard(cards[id]);
    if (status) statuses[id] = status;
  });
  return statuses;
}

export function migrateLegacyProgress(level, words, legacyProgress, retention) {
  const cards = {};
  const now = new Date();
  (words || []).forEach(word => {
    let card = SRS.createNewCard(now);
    const legacyStatus = legacyProgress && legacyProgress[word.id];
    if (legacyStatus === 'known') {
      card = SRS.review(card, 'good', now, retention).card;
      card.state = SRS.State.Review;
      card.status = 'known';
      card.last_rating = 'good';
      const due = new Date(now.getTime());
      due.setDate(due.getDate() + 1 + Math.floor(Math.random() * 7));
      card.due = due.toISOString();
    } else if (legacyStatus === 'unknown') {
      card = SRS.review(card, 'again', now, retention).card;
      card.status = 'unknown';
      card.last_rating = 'again';
      card.lapses = 1;
      card.due = now.toISOString();
    }
    card.historyStartAt = now.toISOString();
    cards[word.id] = card;
  });
  return cards;
}

export function loadSrsForLevel(level, words, legacyProgress) {
  const retention = retentionFromPrefs();
  if (typeof srsRetention !== 'undefined') srsRetention = retention;
  if (typeof window !== 'undefined') window.srsRetention = retention;
  const existing = readSrsRecord(level);
  let cards;
  let migratedFromV2;
  if (existing) {
    cards = existing.cards;
    migratedFromV2 = existing.migratedFromV2;
    (words || []).forEach(word => {
      if (!cards[word.id]) {
        cards[word.id] = SRS.createNewCard();
      } else {
        const c = cards[word.id];
        if (!c.status && c.state !== SRS.State.New) {
          c.status = statusFromCard(c);
        }
      }
    });
  } else {
    cards = migrateLegacyProgress(level, words, legacyProgress || {}, retention);
    migratedFromV2 = true;
  }
  saveSrsRecord(level, cards, migratedFromV2);
  return cards;
}

export function loadState() {
  const activeLevel = typeof currentLevel !== 'undefined' ? currentLevel : (typeof window !== 'undefined' ? window.currentLevel : null);
  const wordsList = typeof WORDS !== 'undefined' ? WORDS : (typeof window !== 'undefined' ? window.WORDS : []);
  const cards = loadSrsForLevel(activeLevel, wordsList, readSavedLevelProgressLegacy(activeLevel));
  if (typeof srsCards !== 'undefined') srsCards = cards;
  if (typeof window !== 'undefined') window.srsCards = cards;

  const prog = progressFromCards(cards);
  if (typeof progress !== 'undefined') progress = prog;
  if (typeof window !== 'undefined') window.progress = prog;

  const rLog = readSrsReviewLog(activeLevel);
  if (typeof reviewLog !== 'undefined') reviewLog = rLog;
  if (typeof window !== 'undefined') window.reviewLog = rLog;

  // SRS review hides pinyin on the front by default; the old showPinyin pref is ignored on purpose.
  if (typeof showPinyin !== 'undefined') showPinyin = false;
  if (typeof window !== 'undefined') window.showPinyin = false;

  const getStorageKey = typeof storageKey === 'function' ? storageKey : (typeof window !== 'undefined' ? window.storageKey : null);
  try {
    const key = getStorageKey ? getStorageKey('prefs') : ('hsk_' + activeLevel + '_prefs_v2');
    const pref = localStorage.getItem(key);
    if (pref) {
      const parsed = JSON.parse(pref);
      if (typeof parsed.frontPinyin === 'boolean') {
        if (typeof showPinyin !== 'undefined') showPinyin = parsed.frontPinyin;
        if (typeof window !== 'undefined') window.showPinyin = parsed.frontPinyin;
      }
      if (Array.isArray(parsed.order) && parsed.order.length === wordsList.length) {
        if (typeof order !== 'undefined') order = parsed.order;
        if (typeof window !== 'undefined') window.order = parsed.order;
      }
    }
  } catch (e) {}

  const currentRetention = typeof srsRetention !== 'undefined' ? srsRetention : (typeof window !== 'undefined' ? window.srsRetention : 0.9);
  const retentionSlider = document.getElementById('desiredRetentionSlider');
  const retentionLabel = document.getElementById('desiredRetentionValue');
  if (retentionSlider) retentionSlider.value = String(currentRetention);
  if (retentionLabel) retentionLabel.textContent = Math.round(currentRetention * 100) + '%';

  const currentOrder = typeof order !== 'undefined' ? order : (typeof window !== 'undefined' ? window.order : []);
  const copiedOrder = currentOrder.slice();
  if (typeof filteredOrder !== 'undefined') filteredOrder = copiedOrder;
  if (typeof window !== 'undefined') window.filteredOrder = copiedOrder;
}

export function saveProgress() {
  const activeLevel = typeof currentLevel !== 'undefined' ? currentLevel : (typeof window !== 'undefined' ? window.currentLevel : null);
  const activeCards = typeof srsCards !== 'undefined' ? srsCards : (typeof window !== 'undefined' ? window.srsCards : {});
  saveSrsRecord(activeLevel, activeCards, true);
}

// Pre-FSRS per-level progress map ({ wordId: 'known' | 'unknown' }), kept for migration.
export function readSavedLevelProgressLegacy(level) {
  try {
    const parsed = JSON.parse(localStorage.getItem('hsk_' + level + '_progress_v2'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) { return {}; }
}

export function savePrefs() {
  const activeLevel = typeof currentLevel !== 'undefined' ? currentLevel : (typeof window !== 'undefined' ? window.currentLevel : null);
  const getStorageKey = typeof storageKey === 'function' ? storageKey : (typeof window !== 'undefined' ? window.storageKey : null);
  const currentShowPinyin = typeof showPinyin !== 'undefined' ? showPinyin : (typeof window !== 'undefined' ? window.showPinyin : false);
  const currentOrder = typeof order !== 'undefined' ? order : (typeof window !== 'undefined' ? window.order : []);
  const currentRetention = typeof srsRetention !== 'undefined' ? srsRetention : (typeof window !== 'undefined' ? window.srsRetention : 0.9);
  try {
    const key = getStorageKey ? getStorageKey('prefs') : ('hsk_' + activeLevel + '_prefs_v2');
    localStorage.setItem(key, JSON.stringify({ frontPinyin: currentShowPinyin, order: currentOrder, desiredRetention: currentRetention }));
  } catch (e) {}
}

export function reviewSrsCard(level, wordId, rating, cardMap) {
  const activeLevel = typeof currentLevel !== 'undefined' ? currentLevel : (typeof window !== 'undefined' ? window.currentLevel : null);
  const activeCards = typeof srsCards !== 'undefined' ? srsCards : (typeof window !== 'undefined' ? window.srsCards : {});
  const cards = cardMap || (level === activeLevel ? activeCards : readSrsRecord(level)?.cards || {});
  let card = cards[wordId];
  if (!card) card = SRS.createNewCard();
  const now = new Date();
  const currentRetention = typeof srsRetention !== 'undefined' ? srsRetention : (typeof window !== 'undefined' ? window.srsRetention : 0.9);
  const result = SRS.review(card, rating, now, currentRetention);
  cards[wordId] = result.card;
  if (level === activeLevel) {
    if (typeof srsCards !== 'undefined') srsCards = cards;
    if (typeof window !== 'undefined') window.srsCards = cards;
    const prog = progressFromCards(cards);
    if (typeof progress !== 'undefined') progress = prog;
    if (typeof window !== 'undefined') window.progress = prog;
    const rLog = readSrsReviewLog(level);
    if (typeof reviewLog !== 'undefined') reviewLog = rLog;
    if (typeof window !== 'undefined') window.reviewLog = rLog;
  }
  saveSrsRecord(level, cards, true);
  appendReviewLog(level, {
    wordId,
    level,
    rating,
    timestamp: now.toISOString(),
    stateBefore: result.stateBefore,
    stateAfter: result.stateAfter,
    elapsedDays: result.elapsedDays,
    stabilityAfter: result.card.stability,
    difficultyAfter: result.card.difficulty,
    retrievabilityBefore: SRS.retrievability(card, now, currentRetention),
    fsrsLog: result.log,
  });
  return result;
}

// Cross-level review counters (home dashboard badge, daily new-card limit in fast review).
export function countNewReviewsToday() {
  const getLocalDateKey = typeof localDateKey === 'function' ? localDateKey : (typeof window !== 'undefined' ? window.localDateKey : null);
  const today = getLocalDateKey ? getLocalDateKey(new Date()) : '';
  const reviewed = new Set();
  const levelsObj = typeof LEVELS !== 'undefined' ? LEVELS : (typeof window !== 'undefined' ? window.LEVELS : {});
  Object.keys(levelsObj).filter(level => levelsObj[level] && levelsObj[level].available).forEach(level => {
    readSrsReviewLog(level).forEach(entry => {
      if (entry.stateBefore !== SRS.State.New || !entry.timestamp) return;
      const timestamp = new Date(entry.timestamp);
      if (!Number.isFinite(timestamp.getTime()) || (getLocalDateKey && getLocalDateKey(timestamp) !== today)) return;
      reviewed.add(level + ':' + entry.wordId);
    });
  });
  return reviewed.size;
}

export function countDueCardsAcrossLevels(now) {
  const currentTime = (now || new Date()).getTime();
  const levelsObj = typeof LEVELS !== 'undefined' ? LEVELS : (typeof window !== 'undefined' ? window.LEVELS : {});
  return Object.keys(levelsObj).filter(level => levelsObj[level] && levelsObj[level].available).reduce((count, level) => {
    const record = readSrsRecord(level);
    if (record) {
      return count + Object.values(record.cards).filter(card => SRS.isDue(card, currentTime)).length;
    }
    return count + Object.values(readSavedLevelProgressLegacy(level)).filter(status => status === 'unknown').length;
  }, 0);
}

export function mountStorageEngine() {
  if (typeof window !== 'undefined') {
    Object.assign(window, {
      SRS_SCHEMA_VERSION,
      SRS_RETENTION_KEY,
      srsCardsKey,
      reviewLogKey,
      readSrsRecord,
      readSrsReviewLog,
      saveSrsRecord,
      appendReviewLog,
      appendImportedReviewLog,
      retentionFromPrefs,
      saveRetention,
      statusFromCard,
      progressFromCards,
      migrateLegacyProgress,
      loadSrsForLevel,
      loadState,
      saveProgress,
      readSavedLevelProgressLegacy,
      savePrefs,
      reviewSrsCard,
      countNewReviewsToday,
      countDueCardsAcrossLevels,
    });
  }
}

if (typeof window !== 'undefined') {
  mountStorageEngine();
}
