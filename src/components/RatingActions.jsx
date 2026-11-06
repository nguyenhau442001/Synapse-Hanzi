import { useEffect, useState } from 'preact/hooks';

/**
 * RatingActions Component
 * Self-contained rating controls with responsive desktop shortcuts vs mobile arrow indicators.
 *
 * @param {Object} props
 * @param {Function} props.onRate - Callback called with 'again' | 'good' | 'hard' | 'easy'
 * @param {'study' | 'review'} [props.mode='study'] - Current rating context
 * @param {boolean} [props.disabled=false] - Whether rating buttons are disabled
 */
const RATING_BUTTONS = [
  { rating: 'again', label: 'Chưa nhớ', icon: '❌', key: '1', arrow: '←', rgb: '239, 68, 68', color: 'var(--status-danger)' },
  { rating: 'good', label: 'Đã nhớ', icon: '✅', key: '2', arrow: '→', rgb: '46, 125, 90', color: 'var(--status-success)' },
];

export function RatingActions({ onRate, mode = 'study', disabled = false }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 640 ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: '12px',
      width: '100%',
      maxWidth: '520px',
      margin: '14px auto 0'
    }}>
      {RATING_BUTTONS.map(btn => (
        <button
          key={btn.rating}
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onRate?.(btn.rating);
          }}
          aria-keyshortcuts={btn.key}
          title={`${btn.label} (Phím ${btn.key} hoặc ${btn.arrow})`}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            minHeight: '48px',
            height: '48px',
            padding: '0 16px',
            borderRadius: 'var(--radius-md)',
            border: `1px solid rgba(${btn.rgb}, 0.35)`,
            background: `rgba(${btn.rgb}, 0.08)`,
            color: btn.color,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            userSelect: 'none',
            boxShadow: 'none'
          }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }} aria-hidden="true">{btn.icon}</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', lineHeight: 1.2 }}>{btn.label}</span>
            <span style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px', fontWeight: '600' }}>
              {isMobile ? btn.arrow : `Phím ${btn.key} / ${btn.arrow}`}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
