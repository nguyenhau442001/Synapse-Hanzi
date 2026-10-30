import { getWordIllustration } from '../services/illustrationService';

export function CardIllustration({ word, size = 160 }) {
  if (!word) return null;

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
