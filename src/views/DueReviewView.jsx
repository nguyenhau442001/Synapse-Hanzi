import { Flashcard } from '../components/Flashcard';
import { RatingActions } from '../components/RatingActions';
import {
  dueWordsList,
  currentDueWord,
  dueReviewIndexSignal,
  dueCount,
  exitDueReviewSession,
  submitSrsRating
} from '../signals/srsSignals';
import { isFlippedSignal, toggleCardFlip, audioManifestSignal } from '../signals/studySignals';
import { playWordAudio, playExampleAudio, isPlayingAudioSignal } from '../services/speechService';

/**
 * DueReviewView View Component
 * Zen focus mode for Spaced Repetition (FSRS) due reviews and forgotten words.
 */
export function DueReviewView() {
  const dueList = dueWordsList.value;
  const word = currentDueWord.value;
  const isFlipped = isFlippedSignal.value;
  const curIdx = dueReviewIndexSignal.value;
  const total = dueList.length;
  const manifest = audioManifestSignal.value;
  const isPlaying = isPlayingAudioSignal.value;

  const pct = total > 0 ? Math.round((curIdx / total) * 100) : 100;

  const handleRate = (rating) => {
    if (!word) return;
    submitSrsRating(word, rating);
    isFlippedSignal.value = false;
  };

  const handleSpeakWord = () => {
    if (word) playWordAudio(word, manifest);
  };

  const handleSpeakExample = () => {
    if (word) playExampleAudio(word, manifest);
  };

  // Celebration state when all due reviews are finished
  if (!word || total === 0 || curIdx >= total) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌸</div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Tuyệt vời! Đã hoàn thành ôn tập hôm nay
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 24px' }}>
          Bạn đã ôn luyện toàn bộ từ vựng đến hạn. Thuật toán FSRS sẽ tự động tính toán thời điểm vàng tiếp theo để bạn ghi nhớ dài hạn.
        </p>
        <button
          type="button"
          onClick={exitDueReviewSession}
          style={{
            padding: '12px 28px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: 'var(--brand-primary)',
            color: '#ffffff',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          ← Quay lại học tiếp
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Top Review Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <button
          type="button"
          onClick={exitDueReviewSession}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <span>← Quay lại</span>
        </button>

        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
          Ôn tập: {curIdx + 1} / {total}
        </div>
      </div>

      {/* Progress Track */}
      <div style={{ width: '100%', height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: 'var(--brand-primary)',
          transition: 'width 0.25s ease'
        }} />
      </div>

      {/* Flashcard */}
      <Flashcard
        word={word}
        isFlipped={isFlipped}
        onFlip={toggleCardFlip}
        onSpeakWord={handleSpeakWord}
        onSpeakExample={handleSpeakExample}
        isPlaying={isPlaying}
      />

      {/* Rating actions when revealed */}
      {isFlipped && (
        <RatingActions
          onRate={handleRate}
          mode="review"
        />
      )}
    </div>
  );
}
