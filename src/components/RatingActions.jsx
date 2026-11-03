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
      {/* Chưa nhớ (Again) Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onRate?.('again');
        }}
        aria-keyshortcuts="1"
        title="Chưa nhớ (Phím 1 hoặc ←)"
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
          border: '1px solid rgba(239, 68, 68, 0.35)',
          background: 'rgba(239, 68, 68, 0.08)',
          color: 'var(--status-danger)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          boxShadow: 'none'
        }}
      >
        <span style={{ fontSize: '16px', lineHeight: 1 }} aria-hidden="true">❌</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', lineHeight: 1.2 }}>Chưa nhớ</span>
          <span style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px', fontWeight: '600' }}>
            {isMobile ? '←' : 'Phím 1 / ←'}
          </span>
        </div>
      </button>

      {/* Đã nhớ (Good) Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onRate?.('good');
        }}
        aria-keyshortcuts="2"
        title="Đã nhớ (Phím 2 hoặc →)"
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
          border: '1px solid rgba(46, 125, 90, 0.35)',
          background: 'rgba(46, 125, 90, 0.08)',
          color: 'var(--status-success)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          boxShadow: 'none'
        }}
      >
        <span style={{ fontSize: '16px', lineHeight: 1 }} aria-hidden="true">✅</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', lineHeight: 1.2 }}>Đã nhớ</span>
          <span style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px', fontWeight: '600' }}>
            {isMobile ? '→' : 'Phím 2 / →'}
          </span>
        </div>
      </button>
    </div>
  );
}
