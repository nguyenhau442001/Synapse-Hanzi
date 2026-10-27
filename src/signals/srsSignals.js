/**
 * srsSignals.js
 * Reactive state and actions for SRS Due Review session powered by Preact Signals.
 */

import { signal, computed } from '@preact/signals';
import {
  SRS_RATINGS,
  createNewSrsCard,
  processSrsReview,
  loadLevelSrsCards,
  saveLevelSrsCards,
  getDueWordsList
} from '../services/srsService';
import { currentLevelSignal, wordsSignal, progressSignal } from './studySignals';
import { saveLevelProgress } from '../services/storageService';

// SRS Signals
export const srsCardsSignal = signal({});
export const isDueReviewModeSignal = signal(false);
export const dueReviewIndexSignal = signal(0);

// Computed Signals
export const dueWordsList = computed(() => {
  const words = wordsSignal.value;
  const cards = srsCardsSignal.value;
  return getDueWordsList(words, cards);
});

export const dueCount = computed(() => {
  return dueWordsList.value.length;
});

export const currentDueWord = computed(() => {
  const list = dueWordsList.value;
  if (!list || list.length === 0) return null;
  const idx = Math.min(Math.max(0, dueReviewIndexSignal.value), list.length - 1);
  return list[idx];
});

/**
 * Initialize SRS cards for the active level
 * @param {string} levelId
 */
export function initLevelSrs(levelId) {
  if (!levelId) return;
  srsCardsSignal.value = loadLevelSrsCards(levelId);
  dueReviewIndexSignal.value = 0;
}

/**
 * Start Due Review session
 */
export function startDueReviewSession() {
  if (dueWordsList.value.length === 0) return;
  dueReviewIndexSignal.value = 0;
  isDueReviewModeSignal.value = true;
}

/**
 * Exit Due Review session
 */
export function exitDueReviewSession() {
  isDueReviewModeSignal.value = false;
  dueReviewIndexSignal.value = 0;
}

/**
 * Submit an SRS Rating for a word ('again' | 'hard' | 'good' | 'easy')
 * @param {Object} word
 * @param {'again'|'hard'|'good'|'easy'} ratingName
 */
export function submitSrsRating(word, ratingName = 'good') {
  if (!word) return;

  const level = currentLevelSignal.value;
  const cards = { ...srsCardsSignal.value };
  const existingCard = cards[word.id] || createNewSrsCard();

  // Evaluate card with FSRS
  const updatedCard = processSrsReview(existingCard, ratingName);
  cards[word.id] = updatedCard;
  srsCardsSignal.value = cards;
  saveLevelSrsCards(level, cards);

  // Sync with general progress map
  const progress = { ...progressSignal.value };
  progress[word.id] = updatedCard.status;
  progressSignal.value = progress;
  saveLevelProgress(level, progress);

  // If in due review session, step to next or complete
  if (isDueReviewModeSignal.value) {
    const remaining = dueWordsList.value.length;
    if (dueReviewIndexSignal.value >= remaining) {
      dueReviewIndexSignal.value = 0;
    }
  }
}
