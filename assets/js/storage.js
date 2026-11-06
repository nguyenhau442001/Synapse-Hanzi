// Local persistence for the currently selected HSK level.
const SRS_SCHEMA_VERSION = 3;
const SRS_RETENTION_KEY = 'hsk_srs_prefs_v1';

function srsCardsKey(level) { return 'hsk_' + level + '_srs_v3'; }
function reviewLogKey(level) { return 'hsk_' + level + '_review_log_v1'; }

function readSrsRecord(level) {
  try {
    const record = JSON.parse(localStorage.getItem(srsCardsKey(level)));
    if (record && record.schemaVersion === SRS_SCHEMA_VERSION && record.cards && typeof record.cards === 'object') return record;
  } catch (e) {}
  return null;
}

function readSrsReviewLog(level) {
  try {
    const log = JSON.parse(localStorage.getItem(reviewLogKey(level)));
    return Array.isArray(log) ? log : [];
  } catch (e) { return []; }
}

function saveSrsRecord(level, cards, migratedFromV2) {
  try {
    localStorage.setItem(srsCardsKey(level), JSON.stringify({
      schemaVersion: SRS_SCHEMA_VERSION,
      migratedFromV2: Boolean(migratedFromV2),
      cards,
    }));
  } catch (e) {}
}

function appendReviewLog(level, entry) {
  try {
    const current = readSrsReviewLog(level);
    current.push(entry);
    localStorage.setItem(reviewLogKey(level), JSON.stringify(current));
    if (level === currentLevel) reviewLog = current;
  } catch (e) {}
}

function appendImportedReviewLog(level, entries) {
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
    if (level === currentLevel) reviewLog = current.concat(normalized);
  } catch (e) {}
}

function retentionFromPrefs() {
  try {
    const prefs = JSON.parse(localStorage.getItem(SRS_RETENTION_KEY));
    if (prefs && Number.isFinite(Number(prefs.desiredRetention))) return SRS.normalizeRetention(prefs.desiredRetention);
  } catch (e) {}
  return SRS.DEFAULT_RETENTION;
}

function saveRetention(value) {
  srsRetention = SRS.normalizeRetention(value);
  try { localStorage.setItem(SRS_RETENTION_KEY, JSON.stringify({ desiredRetention: srsRetention })); } catch (e) {}
  return srsRetention;
}

function statusFromCard(card) {
  if (!card) return null;
  if (card.status === 'unknown' || card.status === 'known') return card.status;
  if (card.last_rating === 'again' || card.last_rating === 'hard') return 'unknown';
  if (card.last_rating === 'good' || card.last_rating === 'easy') return 'known';
  if (card.state === SRS.State.Review) return 'known';
  if (card.state === SRS.State.Learning || card.state === SRS.State.Relearning) return 'unknown';
  return null;
}

function progressFromCards(cards) {
  const statuses = {};
  Object.keys(cards || {}).forEach(id => {
    const status = statusFromCard(cards[id]);
    if (status) statuses[id] = status;
  });
  return statuses;
}

function migrateLegacyProgress(level, words, legacyProgress, retention) {
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

function loadSrsForLevel(level, words, legacyProgress) {
  srsRetention = retentionFromPrefs();
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
    cards = migrateLegacyProgress(level, words, legacyProgress || {}, srsRetention);
    migratedFromV2 = true;
  }
  saveSrsRecord(level, cards, migratedFromV2);
  return cards;
}

function loadState() {
  srsCards = loadSrsForLevel(currentLevel, WORDS, readSavedLevelProgressLegacy(currentLevel));
  progress = progressFromCards(srsCards);
  reviewLog = readSrsReviewLog(currentLevel);
  // SRS review hides pinyin on the front by default; the old showPinyin pref is ignored on purpose.
  showPinyin = false;
  try {
    const pref = localStorage.getItem(storageKey('prefs'));
    if (pref) {
      const parsed = JSON.parse(pref);
      if (typeof parsed.frontPinyin === 'boolean') showPinyin = parsed.frontPinyin;
      if (Array.isArray(parsed.order) && parsed.order.length === WORDS.length) order = parsed.order;
    }
  } catch (e) {}
  const retentionSlider = document.getElementById('desiredRetentionSlider');
  const retentionLabel = document.getElementById('desiredRetentionValue');
  if (retentionSlider) retentionSlider.value = String(srsRetention);
  if (retentionLabel) retentionLabel.textContent = Math.round(srsRetention * 100) + '%';
  filteredOrder = order.slice();
}
function saveProgress() {
  saveSrsRecord(currentLevel, srsCards, true);
}

// Pre-FSRS per-level progress map ({ wordId: 'known' | 'unknown' }), kept for migration.
function readSavedLevelProgressLegacy(level) {
  try {
    const parsed = JSON.parse(localStorage.getItem('hsk_' + level + '_progress_v2'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) { return {}; }
}
function savePrefs() {
  try { localStorage.setItem(storageKey('prefs'), JSON.stringify({ frontPinyin: showPinyin, order, desiredRetention: srsRetention })); } catch (e) {}
}

function reviewSrsCard(level, wordId, rating, cardMap) {
  const cards = cardMap || (level === currentLevel ? srsCards : readSrsRecord(level)?.cards || {});
  let card = cards[wordId];
  if (!card) card = SRS.createNewCard();
  const now = new Date();
  const result = SRS.review(card, rating, now, srsRetention);
  cards[wordId] = result.card;
  if (level === currentLevel) {
    srsCards = cards;
    progress = progressFromCards(srsCards);
    reviewLog = readSrsReviewLog(level);
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
    retrievabilityBefore: SRS.retrievability(card, now, srsRetention),
    fsrsLog: result.log,
  });
  return result;
}
