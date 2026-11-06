// Inline style objects shared by several Preact views.

export const searchInputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  boxSizing: 'border-box'
};

export function tabButtonStyle(isActive) {
  return {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    border: isActive ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
    background: isActive ? 'var(--bg-elevated)' : 'var(--bg-surface)',
    color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
    fontWeight: isActive ? '700' : '500',
    fontSize: '13px'
  };
}
