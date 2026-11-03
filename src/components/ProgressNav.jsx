/**
 * ProgressNav Component
 * Progress bar and tactile status filter categories (All, Unlearned, Learning, Remembered).
 *
 * @param {Object} props
 * @param {Object} props.stats - { total, unlearned, learning, remembered, pct }
 * @param {string} props.currentFilter - 'all' | 'unlearned' | 'learning' | 'remembered'
 * @param {string} props.levelLabel - e.g. "HSK 1"
 * @param {Function} props.onSelectFilter - Callback when a category card is clicked
 */
export function ProgressNav({
  stats,
  currentFilter,
  levelLabel,
  onSelectFilter
}) {
  const categories = [
    { id: 'all', label: 'Tất cả', count: stats.total, color: 'var(--text-secondary)' },
    { id: 'unlearned', label: 'Chưa học', count: stats.unlearned, color: 'var(--text-muted)' },
    { id: 'learning', label: 'Đang nhớ', count: stats.learning, color: 'var(--status-warning)' },
    { id: 'remembered', label: 'Đã thuộc', count: stats.remembered, color: 'var(--status-success)' }
  ];

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Progress Bar Container */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        border: '1px solid var(--border-subtle)',
        marginBottom: '10px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Tiến độ {levelLabel}: {stats.pct}%
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Đã thuộc: <strong style={{ color: 'var(--status-success)' }}>{stats.remembered}</strong> / {stats.total} từ
          </span>
        </div>
        <div style={{ width: '100%', height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            width: `${stats.pct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--brand-primary) 0%, var(--status-success) 100%)',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* 4 Status Category Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '6px'
      }}>
        {categories.map(cat => {
          const isSelected = currentFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectFilter?.(cat.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 4px',
                borderRadius: 'var(--radius-sm)',
                border: isSelected ? '1.5px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                color: isSelected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                userSelect: 'none'
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: '800', lineHeight: 1.2, color: isSelected ? 'var(--brand-primary)' : cat.color }}>
                {cat.count}
              </span>
              <span style={{ fontSize: '11px', fontWeight: isSelected ? '700' : '500', opacity: isSelected ? 1 : 0.8, marginTop: '2px', whiteSpace: 'nowrap' }}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
