/**
 * LevelPicker Component
 * Horizontal scrollable level selector for HSK 1 - 9.
 *
 * @param {Object} props
 * @param {string} props.currentLevel - e.g. 'hsk1'
 * @param {Array} props.levels - Array of level config objects
 * @param {Function} props.onSelectLevel - Callback when level changes
 */
export function LevelPicker({
  currentLevel,
  levels = [],
  onSelectLevel
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '8px',
        marginBottom: '12px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      {levels.map(cfg => {
        const isActive = currentLevel === cfg.id;
        return (
          <button
            key={cfg.id}
            type="button"
            onClick={() => onSelectLevel?.(cfg.id)}
            style={{
              flex: '0 0 auto',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: isActive ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
              background: isActive ? 'var(--brand-primary)' : 'var(--bg-surface)',
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: isActive ? '700' : '500',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}
