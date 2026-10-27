import { useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import {
  currentLevelSignal,
  currentLevelConfig,
  wordsSignal,
  isLoadingSignal,
  errorSignal,
  currentIndexSignal,
  isFlippedSignal,
  filterSignal,
  filteredWords,
  currentWord,
  progressStats,
  progressSignal,
  setLevel,
  nextCard,
  prevCard,
  toggleCardFlip,
  markWordProgress,
  setStudyFilter
} from './signals/studySignals';
import { LEVELS_CONFIG } from './services/dataRepository';

// Theme signal
export const themeSignal = signal(
  localStorage.getItem('hsk_theme_manual') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
);

themeSignal.subscribe(theme => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('hsk_theme_manual', theme);
});

export function App() {
  useEffect(() => {
    // Initial level load
    setLevel(currentLevelSignal.value);
  }, []);

  const toggleTheme = () => {
    themeSignal.value = themeSignal.value === 'dark' ? 'light' : 'dark';
  };

  const word = currentWord.value;
  const stats = progressStats.value;
  const filteredList = filteredWords.value;
  const curIdx = currentIndexSignal.value;
  const isFlipped = isFlippedSignal.value;
  const curFilter = filterSignal.value;
  const curLevel = currentLevelSignal.value;

  const currentStatus = word && progressSignal.value[word.id] ? progressSignal.value[word.id] : 'unlearned';

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 12px 60px' }}>
      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ Synapse Hanzi
            <span style={{ fontSize: '11px', background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
              Preact v2
            </span>
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Trạm học từ vựng chữ Hán đa giác quan • Tối giản & Siêu nhẹ
          </p>
        </div>

        <button
          onClick={toggleTheme}
          aria-label="Đổi giao diện"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            padding: '6px 12px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            fontWeight: '600'
          }}
        >
          {themeSignal.value === 'dark' ? '🌙 Tối' : '☀️ Sáng'}
        </button>
      </header>

      {/* Level Selector Chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px', scrollbarWidth: 'none' }}>
        {Object.entries(LEVELS_CONFIG).map(([key, cfg]) => {
          const isActive = curLevel === key;
          return (
            <button
              key={key}
              onClick={() => setLevel(key)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: isActive ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                background: isActive ? 'var(--brand-primary)' : 'var(--bg-surface)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Stats Bar */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        border: '1px solid var(--border-subtle)',
        marginBottom: '16px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Tiến độ {currentLevelConfig.value.label}: {stats.pct}%
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

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {[
          { id: 'all', label: `Tất cả (${stats.total})` },
          { id: 'unlearned', label: `Chưa học (${stats.unlearned})` },
          { id: 'learning', label: `Đang nhớ (${stats.learning})` },
          { id: 'remembered', label: `Đã thuộc (${stats.remembered})` }
        ].map(tab => {
          const isSelected = curFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStudyFilter(tab.id)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                color: isSelected ? 'var(--brand-primary)' : 'var(--text-muted)',
                fontWeight: isSelected ? '700' : '500',
                fontSize: '12px',
                textAlign: 'center'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Flashcard Workstation */}
      {isLoadingSignal.value ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          Đang tải dữ liệu từ vựng {currentLevelConfig.value.label}...
        </div>
      ) : errorSignal.value ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--status-danger)' }}>
          {errorSignal.value}
        </div>
      ) : !word ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 16px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)'
        }}>
          🎉 Không có từ vựng nào trong bộ lọc này!
        </div>
      ) : (
        <div>
          {/* Card Frame */}
          <div
            onClick={toggleCardFlip}
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              minHeight: '340px',
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: 'var(--shadow-md)',
              userSelect: 'none',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
          >
            {/* Index Counter */}
            <div style={{ position: 'absolute', top: '16px', left: '20px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
              {curIdx + 1} / {filteredList.length}
            </div>

            {/* Status Badge */}
            <div style={{ position: 'absolute', top: '16px', right: '20px' }}>
              {currentStatus === 'remembered' ? (
                <span style={{ fontSize: '12px', background: 'var(--status-success)', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                  ✓ Đã thuộc
                </span>
              ) : currentStatus === 'learning' ? (
                <span style={{ fontSize: '12px', background: 'var(--status-warning)', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                  ⏳ Đang nhớ
                </span>
              ) : (
                <span style={{ fontSize: '12px', background: 'var(--border-subtle)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px' }}>
                  Chưa học
                </span>
              )}
            </div>

            {/* Card Content */}
            {!isFlipped ? (
              /* FRONT VIEW */
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '84px',
                  fontWeight: '900',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-hanzi)',
                  lineHeight: '1.1',
                  marginBottom: '12px'
                }}>
                  {word.hanzi}
                </div>
                <div style={{ fontSize: '18px', color: 'var(--brand-primary)', fontWeight: '600', marginBottom: '24px' }}>
                  {word.pinyin}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '6px 16px', borderRadius: 'var(--radius-full)' }}>
                  👆 Nhấn vào thẻ để xem nghĩa & ví dụ
                </div>
              </div>
            ) : (
              /* BACK VIEW */
              <div style={{ width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', fontWeight: '900', color: 'var(--text-primary)', fontFamily: 'var(--font-hanzi)', marginBottom: '4px' }}>
                  {word.hanzi}
                </div>
                <div style={{ fontSize: '18px', color: 'var(--brand-primary)', fontWeight: '700', marginBottom: '2px' }}>
                  {word.pinyin}
                </div>
                {word.hanviet && (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '14px' }}>
                    Hán-Việt: {word.hanviet}
                  </div>
                )}
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px' }}>
                  {word.meaning}
                </div>

                {/* Example box */}
                {word.example_zh && (
                  <div style={{
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 18px',
                    textAlign: 'left',
                    borderLeft: '4px solid var(--brand-primary)',
                    maxWidth: '480px',
                    margin: '0 auto'
                  }}>
                    <div
                      style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '4px' }}
                      dangerouslySetInnerHTML={{ __html: word.example_zh }}
                    />
                    {word.example_py && (
                      <div
                        style={{ fontSize: '13px', color: 'var(--brand-primary)', marginBottom: '4px' }}
                        dangerouslySetInnerHTML={{ __html: word.example_py }}
                      />
                    )}
                    {word.example_vi && (
                      <div
                        style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
                        dangerouslySetInnerHTML={{ __html: word.example_vi }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Navigation Controls */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'center' }}>
            <button
              onClick={prevCard}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              ← Trước
            </button>

            <button
              onClick={() => markWordProgress('learning')}
              style={{
                flex: 1.2,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #f59e0b',
                background: 'var(--status-warning)',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '14px'
              }}
            >
              ⏳ Đang nhớ
            </button>

            <button
              onClick={() => markWordProgress('remembered')}
              style={{
                flex: 1.2,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #10b981',
                background: 'var(--status-success)',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '14px'
              }}
            >
              ✓ Đã thuộc
            </button>

            <button
              onClick={nextCard}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Tiếp →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
