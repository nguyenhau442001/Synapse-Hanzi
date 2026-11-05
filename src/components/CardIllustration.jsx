import { getWordIllustration } from '../services/illustrationService';

// Illustrations are hidden by default; shared preference with the legacy flashcard toggle.
function illustrationsEnabled() {
  try {
    return localStorage.getItem('hsk_show_illustrations_v2') === 'true';
  } catch (e) {
    return false;
  }
}

export function CardIllustration({ word, size = 160 }) {
  if (!word || !illustrationsEnabled()) return null;

  const illu = getWordIllustration(word);

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-sm)',
        margin: '0 auto 16px',
        flexShrink: 0
      }}
    >
      {illu.type === 'svg' ? (
        <div
          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          dangerouslySetInnerHTML={{ __html: illu.content }}
        />
      ) : (
        <img
          src={illu.content}
          alt={word.meaning || word.hanzi}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={(e) => {
            // Hide broken image gracefully
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}
