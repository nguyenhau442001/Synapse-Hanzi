/**
 * StudyNavigation Component
 * Tactile navigation controls for moving between cards.
 *
 * @param {Object} props
 * @param {number} props.currentIndex - Zero-based current index
 * @param {number} props.totalCards - Total number of cards in current filter
 * @param {Function} props.onPrev - Navigate to previous card
 * @param {Function} props.onNext - Navigate to next card
 * @param {Function} [props.onShuffle] - Shuffle cards in current deck
 */
export function StudyNavigation({
  currentIndex,
  totalCards,
  onPrev,
  onNext,
  onShuffle
}) {
  const currentDisplay = totalCards > 0 ? currentIndex + 1 : 0;
  const canStep = totalCards > 1;
  const stepButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: canStep ? 'pointer' : 'not-allowed',
    opacity: canStep ? 1 : 0.5,
    transition: 'all 0.15s ease'
  };

  return (
    <nav
      aria-label="Điều hướng thẻ từ vựng"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '520px',
        margin: '12px auto 0',
        padding: '0 4px',
        boxSizing: 'border-box'
      }}
    >
      {/* Previous Button */}
      <button
        type="button"
        onClick={onPrev}
        disabled={!canStep}
        title="Từ trước (phím ←)"
        aria-label="Từ trước"
        style={stepButtonStyle}
      >
        <span aria-hidden="true">←</span>
        <span>Trước</span>
      </button>

      {/* Position Counter Pill */}
      <div
        aria-live="polite"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: '600',
          color: 'var(--text-tertiary)',
          userSelect: 'none'
        }}
      >
        <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{currentDisplay}</span>
        <span style={{ opacity: 0.5 }}>/</span>
        <span>{totalCards}</span>
        {onShuffle && (
          <button
            type="button"
            onClick={onShuffle}
            title="Xáo trộn thứ tự từ"
            aria-label="Xáo trộn thứ tự từ"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px 6px',
              fontSize: '13px',
              cursor: 'pointer',
              marginLeft: '4px',
              opacity: 0.75
            }}
          >
            🔀
          </button>
        )}
      </div>

      {/* Next Button */}
      <button
        type="button"
        onClick={onNext}
        disabled={!canStep}
        title="Từ tiếp theo (phím →)"
        aria-label="Từ tiếp theo"
        style={stepButtonStyle}
      >
        <span>Tiếp</span>
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
