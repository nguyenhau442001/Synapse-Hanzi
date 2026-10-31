import { useState, useEffect } from 'preact/hooks';
import { fetchRadicals } from '../services/radicalsService';
import { speakWithWebSpeech } from '../services/speechService';

export function RadicalsView() {
  const [collection, setCollection] = useState('kangxi'); // 'kangxi' | 'basic'
  const [radicals, setRadicals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStroke, setSelectedStroke] = useState('all');
  const [activeRadical, setActiveRadical] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchRadicals(collection).then(items => {
      setRadicals(items);
      setLoading(false);
    });
  }, [collection]);

  const filteredRadicals = radicals.filter(r => {
    if (selectedStroke !== 'all' && r.stroke_count !== Number(selectedStroke)) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    const rad = (r.radical || '').toLowerCase();
    const name = (r.name || '').toLowerCase();
    const py = (r.pinyin || '').toLowerCase();
    const mean = (r.meaning || '').toLowerCase();
    return rad.includes(q) || name.includes(q) || py.includes(q) || mean.includes(q);
  });

  const availableStrokes = Array.from(new Set(radicals.map(r => r.stroke_count))).sort((a, b) => a - b);

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* View Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--brand-primary)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🏛️</span> Khám Phá Bộ Thủ Chữ Hán
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
          Hệ thống 214 Bộ Thủ Khang Hy và 50 Bộ Thủ Cốt Lõi kèm nguồn gốc, chuyện kể và chữ phái sinh.
        </p>
      </div>

      {/* Collection Switch Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => { setCollection('kangxi'); setSelectedStroke('all'); }}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: collection === 'kangxi' ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
            background: collection === 'kangxi' ? 'var(--bg-elevated)' : 'var(--bg-surface)',
            color: collection === 'kangxi' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontWeight: collection === 'kangxi' ? '700' : '500',
            fontSize: '13px'
          }}
        >
          214 Bộ Thủ Khang Hy
        </button>

        <button
          onClick={() => { setCollection('basic'); setSelectedStroke('all'); }}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: collection === 'basic' ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
            background: collection === 'basic' ? 'var(--bg-elevated)' : 'var(--bg-surface)',
            color: collection === 'basic' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontWeight: collection === 'basic' ? '700' : '500',
            fontSize: '13px'
          }}
        >
          50 Bộ Thủ Cốt Lõi (Dùng nhiều nhất)
        </button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          value={searchQuery}
          onInput={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm theo bộ thủ, pinyin, tên bộ hoặc nghĩa (ví dụ: 水, Thủy, nước)..."
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Stroke Count Filter Chips */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px', scrollbarWidth: 'none' }}>
        <button
          onClick={() => setSelectedStroke('all')}
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            border: selectedStroke === 'all' ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
            background: selectedStroke === 'all' ? 'var(--brand-primary)' : 'var(--bg-surface)',
            color: selectedStroke === 'all' ? '#ffffff' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: selectedStroke === 'all' ? '700' : '500',
            whiteSpace: 'nowrap'
          }}
        >
          Tất cả ({radicals.length})
        </button>

        {availableStrokes.map(s => {
          const count = radicals.filter(r => r.stroke_count === s).length;
          const isSelected = selectedStroke === String(s);
          return (
            <button
              key={s}
              onClick={() => setSelectedStroke(String(s))}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                background: isSelected ? 'var(--brand-primary)' : 'var(--bg-surface)',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: isSelected ? '700' : '500',
                whiteSpace: 'nowrap'
              }}
            >
              {s} nét ({count})
            </button>
          );
        })}
      </div>

      {/* Radical Details Modal */}
      {activeRadical && (
        <div
          onClick={() => setActiveRadical(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px 20px',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-lg)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setActiveRadical(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'var(--bg-elevated)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                width: '32px',
                height: '32px',
                fontSize: '16px',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            {/* Radical Header */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '56px', fontWeight: '900', fontFamily: 'var(--font-hanzi)', color: 'var(--brand-primary)', lineHeight: 1.1 }}>
                {activeRadical.radical}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '6px' }}>
                {activeRadical.name}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--brand-primary)', fontWeight: '600' }}>
                {activeRadical.pinyin} • {activeRadical.stroke_count} nét
              </div>
              <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Nghĩa cốt lõi: <strong>{activeRadical.meaning}</strong>
              </div>
            </div>

            {/* Story / Description */}
            {activeRadical.description && (
              <div style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: '16px'
              }}>
                <strong style={{ color: 'var(--text-primary)' }}>💡 Nguồn gốc & Chuyện kể:</strong>
                <p style={{ margin: '6px 0 0' }}>{activeRadical.description}</p>
              </div>
            )}

            {/* Examples */}
            {activeRadical.examples && activeRadical.examples.length > 0 && (
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  📚 Chữ phái sinh tiêu biểu:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeRadical.examples.map((ex, exIdx) => (
                    <div key={exIdx} style={{
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '20px', fontWeight: '900', fontFamily: 'var(--font-hanzi)', color: 'var(--text-primary)' }}>
                          {ex.hanzi}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--brand-primary)', fontWeight: '700' }}>
                          {ex.pinyin}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          ({ex.meaning})
                        </span>
                      </div>
                      {ex.relation && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {ex.relation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Radicals Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Đang tải dữ liệu bộ thủ...
        </div>
      ) : filteredRadicals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Không tìm thấy bộ thủ nào phù hợp.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
          {filteredRadicals.map(r => (
            <div
              key={r.id || r.radical}
              onClick={() => setActiveRadical(r)}
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 10px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, border-color 0.15s ease'
              }}
            >
              <div style={{ fontSize: '36px', fontWeight: '900', fontFamily: 'var(--font-hanzi)', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {r.radical}
              </div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--brand-primary)', marginTop: '4px' }}>
                {r.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {r.pinyin} • {r.stroke_count} nét
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.meaning}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
