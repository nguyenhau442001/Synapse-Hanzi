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

export const pageColumnStyle = {
  maxWidth: '720px',
  margin: '0 auto',
  paddingBottom: '60px'
};

export const viewSubtitleStyle = {
  margin: 0,
  fontSize: '13px',
  color: 'var(--text-muted)'
};

export const stackStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

export const mutedNoteStyle = {
  fontSize: '12px',
  color: 'var(--text-muted)',
  lineHeight: 1.4
};

export const emptyStateStyle = {
  textAlign: 'center',
  padding: '60px 0',
  color: 'var(--text-muted)'
};

export const spacedRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px'
};
