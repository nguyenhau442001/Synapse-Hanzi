/**
 * srsService.js
 * Modern Spaced Repetition Engine powered by FSRS (Free Spaced Repetition Scheduler).
 * 100% compatible with Synapse Hanzi SRS v3 schema.
 */

import { fsrs, createEmptyCard, Rating, State } from 'ts-fsrs';
import { STORAGE_KEYS } from './storageService';

const f = fsrs({
  request_retention: 0.9,
  enable_fuzz: true
});

export const SRS_RATINGS = {
  again: { id: 'again', label: 'Chưa nhớ', rating: Rating.Again, color: '#ef4444', key: '1' },
  hard: { id: 'hard', label: 'Khó', rating: Rating.Hard, color: '#f59e0b', key: '2' },
  good: { id: 'good', label: 'Nhớ tốt', rating: Rating.Good, color: '#10b981', key: '3' },
  easy: { id: 'easy', label: 'Dễ', rating: Rating.Easy, color: '#3b82f6', key: '4' }
};

/**
 * Parse date safely
 */
function parseDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Create a new empty FSRS card
 * @param {Date} now
 * @returns {Object}
 */
export function createNewSrsCard(now = new Date()) {
  const card = createEmptyCard(parseDate(now));
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review ? card.last_review.toISOString() : null,
    status: 'unlearned',
    reps: 0,
    lapses: 0
  };
}

/**
 * Check if a card is due for review
 * @param {Object} card
 * @param {Date} now
 * @returns {boolean}
 */
export function isCardDue(card, now = new Date()) {
  if (!card || !card.due) return true;
  return new Date(card.due).getTime() <= parseDate(now).getTime();
}

/**
 * Review an SRS card with a given rating
 * @param {Object} rawCard
 * @param {'again'|'hard'|'good'|'easy'} ratingName
 * @param {Date} now
 * @returns {Object} nextCard
 */
export function processSrsReview(rawCard, ratingName = 'good', now = new Date()) {
  const cfg = SRS_RATINGS[ratingName] || SRS_RATINGS.good;
  const reviewedAt = parseDate(now);

  const card = {
    ...rawCard,
    due: parseDate(rawCard?.due || reviewedAt),
    last_review: rawCard?.last_review ? parseDate(rawCard.last_review) : undefined
  };

  const result = f.next(card, reviewedAt, cfg.rating);
  const nextFsrsCard = result.card;

  const reps = (rawCard?.reps || 0) + 1;
  let lapses = rawCard?.lapses || 0;
  let scheduled_days = 0;
  let due = new Date(reviewedAt.getTime());
  let status = 'remembered';

  if (ratingName === 'again' || ratingName === 'hard') {
    // Re-study today (0 days interval)
    scheduled_days = 0;
    due = new Date(reviewedAt.getTime());
    lapses = Math.max(1, lapses + 1);
    status = 'learning';
  } else {
    // Scheduled spaced intervals
    const fsrsDays = Number.isFinite(nextFsrsCard.scheduled_days) ? nextFsrsCard.scheduled_days : 0;
    if (reps <= 1) scheduled_days = Math.max(3, fsrsDays || 3);
    else if (reps === 2) scheduled_days = Math.max(7, fsrsDays || 7);
    else if (reps === 3) scheduled_days = Math.max(14, fsrsDays || 14);
    else scheduled_days = Math.max(30, fsrsDays || 30);

    due = new Date(reviewedAt.getTime() + scheduled_days * 86400000);
    status = 'remembered';
  }

  return {
    ...nextFsrsCard,
    status,
    last_rating: ratingName,
    reps,
    lapses,
    scheduled_days,
    due: due.toISOString(),
    last_review: reviewedAt.toISOString()
  };
}

/**
 * Load SRS card records for a level from storage
 * @param {string} level
 * @returns {Record<string|number, Object>}
 */
export function loadLevelSrsCards(level) {
  if (!level) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.srsCards(level));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed?.cards && typeof parsed.cards === 'object' ? parsed.cards : {};
  } catch (e) {
    return {};
  }
}

/**
 * Save SRS cards for a level to storage
 * @param {string} level
 * @param {Record<string|number, Object>} cards
 */
export function saveLevelSrsCards(level, cards) {
  if (!level || !cards) return;
  try {
    localStorage.setItem(STORAGE_KEYS.srsCards(level), JSON.stringify({
      schemaVersion: 3,
      cards
    }));
  } catch (e) {}
}

/**
 * Filter list of words that are due for review today
 * @param {Array} words
 * @param {Record<string|number, Object>} srsCards
 * @param {Date} now
 * @returns {Array} dueWords
 */
export function getDueWordsList(words, srsCards, now = new Date()) {
  if (!Array.isArray(words)) return [];

  return words.filter(word => {
    const card = srsCards[word.id];
    if (!card) return false; // Not yet studied
    return isCardDue(card, now);
  });
}
