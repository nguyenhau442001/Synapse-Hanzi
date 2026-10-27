import { useState, useEffect } from 'preact/hooks';
import { getWordDecompositions } from '../services/hanvietService';

export function HanziDecomposition({ word }) {
  const [decomps, setDecomps] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!word || !word.hanzi) {
      setDecomps([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getWordDecompositions(word.hanzi).then(items => {
      if (isMounted) {
        setDecomps(items);
        setLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [word?.hanzi]);

  if (!word || !word.hanzi) return null;

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 16px',
      marginTop: '16px',
      border: '1px solid var(--border-subtle)',
      textAlign: 'left'
    }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>🧩</span> Chiết tự & Cấu tạo bộ thủ chữ Hán
      </div>

      {loading ? (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Đang bóc tách chiết tự...</div>
      ) : decomps.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Không có dữ liệu chiết tự cho từ này.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {decomps.map((charData, idx) => (
            <div key={idx} style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '26px', fontWeight: '900', fontFamily: 'var(--font-hanzi)', color: 'var(--text-primary)', lineHeight: 1 }}>
                  {charData.character}
                </span>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-primary)', marginRight: '8px' }}>
                    {charData.pinyin || ''}
                  </span>
                  {charData.hanviet && (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      [Hán-Việt: <strong>{charData.hanviet}</strong>]
                    </span>
                  )}
                </div>
              </div>

              {charData.formula && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontStyle: 'italic' }}>
                  Cấu trúc: {charData.formula}
                </div>
              )}

              {charData.components && charData.components.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {charData.components.map((comp, cIdx) => (
                    <div
                      key={cIdx}
                      style={{
                        background: comp.is_radical ? 'var(--accent-light)' : 'var(--bg-elevated)',
                        color: comp.is_radical ? 'var(--accent)' : 'var(--text-secondary)',
                        border: comp.is_radical ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <strong style={{ fontSize: '13px', fontFamily: 'var(--font-hanzi)' }}>{comp.char}</strong>
                      <span>{comp.name || comp.hanviet}</span>
                      {comp.meaning && <span style={{ opacity: 0.8 }}>({comp.meaning})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
