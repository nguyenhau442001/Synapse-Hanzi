// src/islands/SrsEngine.js
// FSRS boundary. Application code should use SRS instead of ts-fsrs directly.

import * as tsFsrs from 'ts-fsrs';

function createSrsEngine() {
  const library = (typeof window !== 'undefined' && window.FSRS) || tsFsrs;
  if (!library || typeof library.fsrs !== 'function') {
    throw new Error('Không tải được ts-fsrs (global FSRS không tồn tại).');
  }

  const RATINGS = {
    again: library.Rating.Again,
    hard: library.Rating.Hard,
    good: library.Rating.Good,
    easy: library.Rating.Easy,
  };
  const RATING_NAMES = {
    [RATINGS.again]: 'again',
    [RATINGS.hard]: 'hard',
    [RATINGS.good]: 'good',
    [RATINGS.easy]: 'easy',
  };
  const DEFAULT_RETENTION = 0.9;

  function normalizeRetention(value) {
    const retention = Number(value);
    return Number.isFinite(retention)
      ? Math.min(0.97, Math.max(0.8, retention))
      : DEFAULT_RETENTION;
  }

  function scheduler(retention) {
    return library.fsrs({
      request_retention: normalizeRetention(retention),
      enable_fuzz: true,
    });
  }

  function parseDate(value) {
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (Number.isFinite(date.getTime())) return date;
    }
    return null;
  }

  function deserializeCard(value) {
    if (!value || typeof value !== 'object') return null;
    const card = { ...value };
    card.due = parseDate(card.due);
    card.last_review = card.last_review == null ? undefined : parseDate(card.last_review);
    if (!card.due || (value.last_review != null && !card.last_review)) return null;
    return card;
  }

  function serializeCard(value) {
    const card = deserializeCard(value);
    if (!card) return null;
    return {
      ...card,
      due: card.due.toISOString(),
      last_review: card.last_review ? card.last_review.toISOString() : null,
    };
  }

  function createNewCard(now) {
    return serializeCard(library.createEmptyCard(parseDate(now) || new Date()));
  }

  function review(cardValue, ratingName, now, retention) {
    const card = deserializeCard(cardValue);
    const rating = RATINGS[ratingName];
    if (!card) throw new Error('Thẻ FSRS không hợp lệ.');
    if (rating === undefined) throw new Error('Mức đánh giá FSRS không hợp lệ.');
    const reviewedAt = parseDate(now) || new Date();
    const result = scheduler(retention).next(card, reviewedAt, rating);

    const reps = (card.reps || 0) + 1;
    let scheduled_days = 0;
    let due = new Date(reviewedAt.getTime());
    let state = library.State.Review;
    let lapses = card.lapses || 0;
    let status = 'known';

    if (ratingName === 'again' || ratingName === 'hard') {
      // ❌ Chưa nhớ: Ôn lại ngay trong ngày / Hôm nay (0 ngày)
      scheduled_days = 0;
      due = new Date(reviewedAt.getTime());
      lapses = Math.max(1, lapses + 1);
      state = lapses > 1 ? library.State.Relearning : library.State.Learning;
      status = 'unknown';
    } else {
      // ✅ Đã nhớ: Lên lịch lặp lại ngắt quãng (3 -> 7 -> 14 -> 30+ ngày)
      const fsrsDays = (result && result.card && Number.isFinite(result.card.scheduled_days)) ? result.card.scheduled_days : 0;
      if (reps <= 1) {
        scheduled_days = Math.max(3, fsrsDays || 3);
      } else if (reps === 2) {
        scheduled_days = Math.max(7, fsrsDays || 7);
      } else if (reps === 3) {
        scheduled_days = Math.max(14, fsrsDays || 14);
      } else {
        scheduled_days = Math.max(30, fsrsDays || 30);
      }
      due = new Date(reviewedAt.getTime() + scheduled_days * 86400000);
      state = library.State.Review;
      status = 'known';
    }

    const nextCard = serializeCard({
      ...result.card,
      status,
      last_rating: ratingName,
      lapses,
      reps,
      state,
      scheduled_days,
      due,
      last_review: reviewedAt,
      historyStartAt: card.historyStartAt || reviewedAt.toISOString(),
    });

    return {
      card: nextCard,
      log: {
        ...result.log,
        rating: ratingName,
        state,
        scheduled_days,
        due: nextCard.due,
        review: reviewedAt.toISOString(),
      },
      rating: ratingName,
      stateBefore: card.state,
      stateAfter: state,
      elapsedDays: card.last_review
        ? Math.max(0, (reviewedAt.getTime() - card.last_review.getTime()) / 86400000)
        : 0,
    };
  }

  function preview(cardValue, now, retention) {
    const card = deserializeCard(cardValue);
    if (!card) return {};
    const reviewedAt = parseDate(now) || new Date();
    const reps = (card.reps || 0) + 1;
    const lapses = card.lapses || 0;

    const goodDays = reps <= 1 ? 3 : reps === 2 ? 7 : reps === 3 ? 14 : 30;
    const goodDue = new Date(reviewedAt.getTime() + goodDays * 86400000);

    return {
      again: {
        card: serializeCard({
          ...card,
          status: 'unknown',
          last_rating: 'again',
          lapses: Math.max(1, lapses + 1),
          reps,
          scheduled_days: 0,
          due: reviewedAt,
          state: lapses > 0 ? library.State.Relearning : library.State.Learning,
        }),
        due: reviewedAt.toISOString(),
        intervalMs: 0,
        scheduledDays: 0,
        intervalText: 'Hôm nay',
      },
      good: {
        card: serializeCard({
          ...card,
          status: 'known',
          last_rating: 'good',
          lapses,
          reps,
          scheduled_days: goodDays,
          due: goodDue,
          state: library.State.Review,
        }),
        due: goodDue.toISOString(),
        intervalMs: goodDays * 86400000,
        scheduledDays: goodDays,
        intervalText: `${goodDays} ngày`,
      },
      hard: {
        intervalMs: 0,
        scheduledDays: 0,
        intervalText: 'Hôm nay',
      },
      easy: {
        intervalMs: goodDays * 86400000,
        scheduledDays: goodDays,
        intervalText: `${goodDays} ngày`,
      },
    };
  }

  function isDue(cardValue, now) {
    const card = deserializeCard(cardValue);
    if (!card || card.state === library.State.New) return false;
    return card.due.getTime() <= (parseDate(now) || new Date()).getTime();
  }

  function retrievability(cardValue, now, retention) {
    const card = deserializeCard(cardValue);
    if (!card || card.state === library.State.New) return 0;
    return scheduler(retention).get_retrievability(card, parseDate(now) || new Date(), false);
  }

  function ratingValue(name) {
    return RATINGS[name];
  }

  function ratingName(value) {
    return RATING_NAMES[value] || null;
  }

  return Object.freeze({
    DEFAULT_RETENTION,
    State: library.State,
    RATINGS: Object.freeze({ ...RATINGS }),
    RATING_NAMES: Object.freeze({ ...RATING_NAMES }),
    normalizeRetention,
    createNewCard,
    deserializeCard,
    serializeCard,
    review,
    preview,
    isDue,
    retrievability,
    ratingValue,
    ratingName,
  });
}

export const SRS = createSrsEngine();

export function mountSrsEngine() {
  if (typeof window !== 'undefined') {
    window.SRS = SRS;
  }
  return SRS;
}

if (typeof window !== 'undefined') {
  window.SRS = SRS;
}
