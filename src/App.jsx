import { signal } from '@preact/signals';

// Global signal for theme
export const themeSignal = signal(
  localStorage.getItem('hsk_theme_manual') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
);

// Apply theme to document
themeSignal.subscribe(theme => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('hsk_theme_manual', theme);
});

export function App() {
  const toggleTheme = () => {
    themeSignal.value = themeSignal.value === 'dark' ? 'light' : 'dark';
  };

  return (
    <div style={{ textAlign: 'center', padding: '40px 16px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px', color: 'var(--brand-primary)' }}>
          ⚡ Synapse Hanzi <span style={{ fontSize: '16px', fontWeight: '500', opacity: 0.8 }}>(Preact v2)</span>
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>
          Trạm học từ vựng chữ Hán đa giác quan — Khởi tạo thành công nền tảng Vite + Preact Signals
        </p>
      </header>

      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px 24px',
        maxWidth: '560px',
        margin: '0 auto 32px',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border-subtle)',
        textAlign: 'left'
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--text-primary)' }}>
          🚀 Bước 1 Hoàn Tất: Kiểm Tra Môi Trường
        </h3>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--text-secondary)', fontSize: '14px' }}>
          <li><strong>Bundler:</strong> Vite 8.x với HMR siêu tốc</li>
          <li><strong>UI Framework:</strong> Preact 10.x (~3KB footprint)</li>
          <li><strong>State Manager:</strong> Preact Signals (Reactivity không cần Redux)</li>
          <li><strong>An toàn:</strong> App chính trên GitHub Pages vẫn chạy bình thường 100%</li>
        </ul>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={toggleTheme}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Chuyển giao diện: {themeSignal.value === 'dark' ? '🌙 Tối' : '☀️ Sáng'}
          </button>
        </div>
      </div>

      <footer style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
        Synapse Hanzi • Module Architecture Roadmap
      </footer>
    </div>
  );
}
