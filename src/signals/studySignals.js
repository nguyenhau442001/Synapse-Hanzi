/**
 * studySignals.js
 * Reactive State Management for Study Workstation using Preact Signals.
 */

import { signal, computed } from '@preact/signals';
import { fetchVocabulary, fetchAudioManifest, LEVELS_CONFIG } from '../services/dataRepository';
import { loadLevelProgress, saveLevelProgress, loadLastSelectedLevel, saveLastSelectedLevel } from '../services/storageService';

// Core State Signals
export const currentLevelSignal = signal(loadLastSelectedLevel());
export const wordsSignal = signal([]);
export const isLoadingSignal = signal(false);
export const errorSignal = signal(null);

export const currentIndexSignal = signal(0);
export const isFlippedSignal = signal(false);
export const filterSignal = signal('all'); // 'all' | 'unlearned' | 'learning' | 'remembered'
export const progressSignal = signal({});
export const audioManifestSignal = signal(null);

// Computed Signals
export const currentLevelConfig = computed(() => {
  return LEVELS_CONFIG[currentLevelSignal.value] || LEVELS_CONFIG.hsk1;
});

export const filteredWords = computed(() => {
  const words = wordsSignal.value;
  const filter = filterSignal.value;
  const progress = progressSignal.value;

  if (filter === 'all') return words;

  return words.filter(word => {
    const status = progress[word.id] || 'unlearned';
    return status === filter;
  });
});

export const currentWord = computed(() => {
  const list = filteredWords.value;
  if (!list || list.length === 0) return null;
  const idx = Math.min(Math.max(0, currentIndexSignal.value), list.length - 1);
  return list[idx];
});

export const progressStats = computed(() => {
  const words = wordsSignal.value;
  const progress = progressSignal.value;
  const total = words.length;

  let remembered = 0;
  let learning = 0;

  words.forEach(w => {
    const s = progress[w.id];
    if (s === 'remembered') remembered++;
    else if (s === 'learning') learning++;
  });

  const unlearned = Math.max(0, total - remembered - learning);
  const pct = total > 0 ? Math.round((remembered / total) * 100) : 0;

  return { total, remembered, learning, unlearned, pct };
});

// Action Dispatchers
/**
 * Load and select a study level
 * @param {string} levelId
 */
export async function setLevel(levelId) {
  if (!LEVELS_CONFIG[levelId]) return;

  isLoadingSignal.value = true;
  errorSignal.value = null;
  isFlippedSignal.value = false;
  currentIndexSignal.value = 0;

  try {
    currentLevelSignal.value = levelId;
    saveLastSelectedLevel(levelId);

    // Load progress from storage
    progressSignal.value = loadLevelProgress(levelId);

    // Fetch vocabulary list and audio manifest in parallel
    const [words, manifest] = await Promise.all([
      fetchVocabulary(levelId),
      fetchAudioManifest(levelId)
    ]);

    wordsSignal.value = words;
    audioManifestSignal.value = manifest;
  } catch (err) {
    errorSignal.value = err.message || 'Không thể tải dữ liệu từ vựng';
  } finally {
    isLoadingSignal.value = false;
  }
}

/**
 * Navigate to next card
 */
export function nextCard() {
  const total = filteredWords.value.length;
  if (total <= 1) return;
  isFlippedSignal.value = false;
  currentIndexSignal.value = (currentIndexSignal.value + 1) % total;
}

/**
 * Navigate to previous card
 */
export function prevCard() {
  const total = filteredWords.value.length;
  if (total <= 1) return;
  isFlippedSignal.value = false;
  currentIndexSignal.value = (currentIndexSignal.value - 1 + total) % total;
}

/**
 * Toggle card flip status
 */
export function toggleCardFlip() {
  isFlippedSignal.value = !isFlippedSignal.value;
}

/**
 * Mark active card's progress status ('remembered' | 'learning' | 'unlearned')
 * @param {string} status
 */
export function markWordProgress(status) {
  const word = currentWord.value;
  if (!word) return;

  const level = currentLevelSignal.value;
  const currentProgress = { ...progressSignal.value };

  if (status === 'unlearned') {
    delete currentProgress[word.id];
  } else {
    currentProgress[word.id] = status;
  }

  progressSignal.value = currentProgress;
  saveLevelProgress(level, currentProgress);

  // Automatically advance to next card
  nextCard();
}

/**
 * Change active filter
 * @param {'all' | 'unlearned' | 'learning' | 'remembered'} newFilter
 */
export function setStudyFilter(newFilter) {
  filterSignal.value = newFilter;
  currentIndexSignal.value = 0;
  isFlippedSignal.value = false;
}
