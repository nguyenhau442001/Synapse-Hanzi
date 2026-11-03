/**
 * AppHeader Component
 * Clean top brand header with theme toggle and main navigation tabs.
 *
 * @param {Object} props
 * @param {string} props.activeTab - 'study' | 'reading' | 'radicals' | 'games'
 * @param {Function} props.onSelectTab - Callback when tab changes
 * @param {string} props.theme - 'light' | 'dark'
 * @param {Function} props.onToggleTheme - Theme toggle handler
 * @param {number} props.dueCount - Number of cards waiting in today's review
 * @param {Function} props.onOpenDueReview - Handler to launch Zen review mode
 */
export function AppHeader({
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
  dueCount = 0,
  onOpenDueReview
}) {
  const tabs = [
    { id: 'study', label: '🗂 Flashcard' },
    { id: 'listening', label: '🎧 Luyện nghe' },
    { id: 'reading', label: '📖 Bài đọc' },
    { id: 'radicals', label: '🧩 Bộ thủ' },
    { id: 'games', label: '🎮 Mini Game' }
  ];

  return (
    <header style={{ marginBottom: '16px' }}>
      {/* Brand row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: '800',
            margin: 0,
            color: 'var(--brand-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>汉字思维</span>
            <span style={{ fontSize: '14px', fontWeight: '600', opacity: 0.8 }}>· Hanzi Mind</span>
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Think in Characters. Master Chinese.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {dueCount > 0 && (
            <button
              type="button"
              onClick={onOpenDueReview}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--brand-primary)',
                background: 'var(--accent-light)',
                color: 'var(--brand-primary)',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <span>Ôn tập</span>
              <span style={{
                background: 'var(--brand-primary)',
                color: '#ffffff',
                borderRadius: '999px',
                padding: '1px 6px',
                fontSize: '10px'
              }}>
                {dueCount}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Đổi giao diện sáng/tối"
            title="Đổi giao diện sáng/tối"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav
        aria-label="Chế độ học"
        style={{
          display: 'flex',
          gap: '6px',
          background: 'var(--bg-elevated)',
          padding: '4px',
          borderRadius: 'var(--radius-md)'
        }}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isActive ? 'var(--bg-surface)' : 'transparent',
                color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
