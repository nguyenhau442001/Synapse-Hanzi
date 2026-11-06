// Study Help & Shortcuts modal (Hướng dẫn & Trợ giúp học tập).
// Preact port of the former assets/js/study-help-modal.js: same markup and classes
// (styled by assets/css/study-help-modal.css) and the same globals for legacy callers:
// window.openStudyHelpModal(tabKey?), window.closeStudyHelpModal(), window.switchStudyHelpTab(tabKey).
import { render } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { signal } from '@preact/signals';

const isOpen = signal(false);
const activeTab = signal('shortcuts');

const TABS = [
  { key: 'shortcuts', icon: '⌨️', label: 'Phím tắt' },
  { key: 'method', icon: '🎯', label: 'Phương pháp SRS' },
  { key: 'features', icon: '✨', label: 'Tính năng' },
  { key: 'faq', icon: '❓', label: 'Câu hỏi (FAQ)' },
  { key: 'about', icon: 'ℹ️', label: 'Giới thiệu' }
];

const panelId = (key) => `helpTab${key.charAt(0).toUpperCase()}${key.slice(1)}`;

const SHORTCUT_GROUPS = [
  {
    heading: '🃏 Thao tác thẻ ghi nhớ (Flashcard)',
    rows: [
      ['Lật mặt thẻ', 'Xem pinyin, nghĩa tiếng Việt và câu ví dụ', ['Space']],
      ['Đánh giá mức độ nhớ', '1: Chưa nhớ (ôn lại ngay) · 2: Nhớ mang máng · 3: Đã thuộc', ['1', '2', '3']],
      ['Phát âm thanh từ vựng', 'Đọc to chữ Hán chuẩn giọng bản xứ', ['A']],
      ['Chuyển thẻ trước / thẻ kế tiếp', 'Duyệt qua danh sách các thẻ trong bài', ['←', '→']]
    ]
  },
  {
    heading: '🛠️ Bảng bổ trợ & Tiện ích',
    rows: [
      ['Mở bảng luyện viết & thứ tự nét', 'Xem hướng bút và tập viết chữ trực tiếp', ['W']],
      ['Chiết tự & phân tích bộ thủ', 'Bóc tách từng thành phần cấu thành chữ Hán', ['R']],
      ['Danh sách từ vựng bài học', 'Xem tiến độ và duyệt nhanh toàn bộ từ', ['B']],
      ['Bật / Tắt âm Hán - Việt', 'Ẩn hoặc hiện âm đọc tương đồng trong tiếng Việt', ['H']]
    ]
  },
  {
    heading: '🧭 Phím tắt chung',
    rows: [
      ['Đóng bảng / Thoát về trang trước', 'Đóng bảng bổ trợ đang mở hoặc quay lại màn hình chọn cấp độ', ['Esc']],
      ['Mở nhanh bảng Trợ giúp này', 'Tra cứu phím tắt và hướng dẫn mọi lúc', ['?']]
    ]
  }
];

const linkStyle = 'color:var(--brand-primary);text-decoration:underline;';

const METHOD_CARDS = [
  ['🧠', 'Thuật toán Lặp lại ngắt quãng (SRS)', '汉字思维 (Hanzi Mind) áp dụng thuật toán giãn cách thông minh (FSRS & Ebbinghaus). Các từ bạn đánh giá "Chưa nhớ" sẽ xuất hiện lại ngay, còn các từ "Đã thuộc" sẽ được tự động dời lịch ôn sang 3 ngày, 7 ngày hoặc 1 tháng tới để đưa vào vùng trí nhớ dài hạn.'],
  ['🧩', 'Ghi nhớ chữ Hán qua Chiết tự & Bộ thủ', 'Thay vì nhớ vẹt từng nét bút vô nghĩa, hệ thống giúp bạn bóc tách từng chữ thành 214 bộ thủ biểu ý và thanh phù biểu âm. Nhờ đó, bạn sẽ hiểu được gốc rễ chữ Hán và đoán nghĩa từ mới dễ dàng hơn.'],
  ['🎨', 'Học đa giác quan qua Ngữ cảnh & Hình ảnh', 'Mỗi từ vựng được liên kết với tranh minh họa trực quan, câu ví dụ đời thường có phiên âm pinyin và dịch nghĩa ngữ pháp chi tiết. Não bộ tiếp nhận hình ảnh và âm thanh song song giúp tăng 300% hiệu suất ghi nhớ.']
];

const FEATURE_CARDS = [
  ['⚡', 'Ôn nhanh (Fast Review)', 'Cần kiểm tra cấp tốc trước khi thi hoặc muốn rà soát kiến thức? Vào tab "Ôn nhanh", dùng thanh trượt chọn số lượng thẻ (10, 25, 50 hoặc 100 từ) để bắt đầu phiên kiểm tra siêu tốc.'],
  ['📚', 'Bài đọc phân cấp (Graded Reading)', 'Luyện kỹ năng đọc hiểu thông qua các câu chuyện thực tế được biên soạn theo đúng chuẩn từ vựng từng cấp độ HSK. Có thể chạm vào từ để tra nhanh nghĩa, ngữ pháp và nghe phát âm.'],
  ['✍️', 'Luyện viết & Thứ tự nét bút', 'Mô phỏng động từng nét chữ theo chuẩn quy tắc bút thuận. Bảng vẽ tương tác cho phép bạn dùng chuột hoặc bút cảm ứng để luyện tô nét trực tiếp trên màn hình.'],
  ['🎮', 'Trò chơi tương tác', <>Đổi gió sau giờ học căng thẳng với 3 trò chơi rèn phản xạ: <strong>Xếp câu</strong> (luyện ngữ pháp), <strong>Đuổi hình bắt chữ</strong> (nhận diện từ qua tranh) và <strong>Thử thách 1 phút</strong> (điền từ tốc độ).</>]
];

const FAQ_ITEMS = [
  ['Dữ liệu và tiến trình học của tôi có bị mất không?', 'Toàn bộ số từ đã học, chuỗi ngày streak và dữ liệu lịch ôn SRS đều được tự động lưu cục bộ trên trình duyệt thiết bị của bạn. Bạn có thể sử dụng ứng dụng an toàn mà không cần tạo tài khoản.'],
  ['Làm sao để dùng ứng dụng khi không có mạng (Offline)?', <>汉字思维 (Hanzi Mind) được thiết kế chuẩn PWA (Progressive Web App). Trên trình duyệt Chrome, Safari hoặc Edge, bạn hãy nhấn nút <strong>"Thêm vào Màn hình chính"</strong> hoặc <strong>"Cài đặt ứng dụng"</strong> để học ngoại tuyến mọi lúc mọi nơi.</>],
  ['Sự khác biệt giữa HSK 2.0 và HSK 3.0 là gì?', 'HSK 2.0 gồm 6 cấp độ truyền thống (phù hợp ôn thi hiện tại). HSK 3.0 là khung tiêu chuẩn mới mở rộng đến cấp 9 với khối lượng từ vựng hiện đại hơn. Bạn có thể chuyển đổi linh hoạt tại bộ chọn phiên bản ở trang chủ.'],
  ['Làm cách nào để đổi giao diện Sáng / Tối?', 'Nhấn vào biểu tượng mặt trăng 🌙 / mặt trời ☀️ ở góc trên bên phải thanh tiêu đề (hoặc trong thanh công cụ khi đang lật thẻ) để chuyển đổi nhanh theo nhu cầu mắt nhìn.']
];

const ABOUT_CARDS = [
  ['⚡', 'Synapse Hanzi', 'Nền tảng học và ghi nhớ chữ Hán thông minh, kết hợp thuật toán lặp lại ngắt quãng (FSRS/SRS), chiết tự bộ thủ, luyện nghe phân cấp và bài đọc tương tác.'],
  ['👨‍💻', 'Tác giả & Đóng góp', <>Phát triển bởi <strong>haunguyenngoc442001</strong>.<br />
    • Mã nguồn: <a href="https://github.com/nguyenhau442001/synapse-hanzi/" target="_blank" rel="noopener noreferrer" style={linkStyle}>GitHub Repository</a><br />
    • Liên hệ: <a href="https://www.facebook.com/haunguyenngoc442001/" target="_blank" rel="noopener noreferrer" style={linkStyle}>Facebook cá nhân</a></>]
];

function ShortcutRow({ desc, hint, keys }) {
  return (
    <div class="study-shortcut-row">
      <div class="study-shortcut-desc">
        {desc} <small>{hint}</small>
      </div>
      <div class="study-shortcut-keys">
        {keys.map((k) => <kbd class="study-kbd" key={k}>{k}</kbd>)}
      </div>
    </div>
  );
}

function InfoCards({ cards }) {
  return (
    <div class="study-card-grid">
      {cards.map(([icon, title, desc]) => (
        <div class="study-info-card" key={title}>
          <div class="study-info-card-header">
            <span class="study-info-card-icon">{icon}</span>
            <h3 class="study-info-card-title">{title}</h3>
          </div>
          <p class="study-info-card-desc">{desc}</p>
        </div>
      ))}
    </div>
  );
}

function Panel({ tabKey, children }) {
  const cls = activeTab.value === tabKey ? 'study-help-section active' : 'study-help-section';
  return <div class={cls} id={panelId(tabKey)} role="tabpanel">{children}</div>;
}

function scrollActiveTabIntoView(overlay) {
  const btn = overlay && overlay.querySelector('.study-help-tab-btn.active');
  if (btn && typeof btn.scrollIntoView === 'function') {
    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
}

let previousFocusedEl = null;

export function openStudyHelpModal(tabKey) {
  previousFocusedEl = document.activeElement;
  if (tabKey) activeTab.value = tabKey;
  isOpen.value = true;
}

export function closeStudyHelpModal() {
  if (!isOpen.value) return;
  isOpen.value = false;
  if (previousFocusedEl && typeof previousFocusedEl.focus === 'function') {
    try { previousFocusedEl.focus(); } catch (e) { /* element may be gone */ }
  }
}

export function switchStudyHelpTab(tabKey) {
  activeTab.value = tabKey;
}

export function StudyHelpModal() {
  const overlayRef = useRef(null);
  const closeRef = useRef(null);
  const open = isOpen.value;
  const tab = activeTab.value;

  // Esc closes while open; focus the close button and reveal the active tab on open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeStudyHelpModal();
      }
    };
    document.addEventListener('keydown', onKey);
    const focusTimer = setTimeout(() => closeRef.current && closeRef.current.focus(), 50);
    const scrollTimer = setTimeout(() => scrollActiveTabIntoView(overlayRef.current), 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(focusTimer);
      clearTimeout(scrollTimer);
    };
  }, [open]);

  // Keep the selected tab visible in the horizontally scrolling nav.
  useEffect(() => {
    if (open) scrollActiveTabIntoView(overlayRef.current);
  }, [tab]);

  return (
    <div
      ref={overlayRef}
      id="studyHelpModalOverlay"
      class={open ? 'study-help-overlay open' : 'study-help-overlay'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="studyHelpModalTitle"
      onClick={(e) => { if (e.target === e.currentTarget) closeStudyHelpModal(); }}
    >
      <div class="study-help-box">
        <div class="study-help-header">
          <div class="study-help-title-group">
            <span class="study-help-badge-icon" aria-hidden="true">?</span>
            <h2 id="studyHelpModalTitle" class="study-help-title">Hướng dẫn &amp; Trợ giúp học tập</h2>
          </div>
          <button ref={closeRef} type="button" class="study-help-close-btn" onClick={closeStudyHelpModal} aria-label="Đóng bảng trợ giúp (Esc)" title="Đóng (Esc)">✕</button>
        </div>

        <nav class="study-help-nav" role="tablist" aria-label="Các mục hướng dẫn">
          {TABS.map(({ key, icon, label }) => (
            <button
              key={key}
              type="button"
              class={tab === key ? 'study-help-tab-btn active' : 'study-help-tab-btn'}
              data-tab={key}
              role="tab"
              aria-selected={tab === key ? 'true' : 'false'}
              aria-controls={panelId(key)}
              onClick={() => switchStudyHelpTab(key)}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </nav>

        <div class="study-help-body">
          <Panel tabKey="shortcuts">
            {SHORTCUT_GROUPS.map(({ heading, rows }) => (
              <div class="study-shortcuts-group" key={heading}>
                <h3 class="study-shortcuts-heading">{heading}</h3>
                <div class="study-shortcuts-table">
                  {rows.map(([desc, hint, keys]) => <ShortcutRow key={desc} desc={desc} hint={hint} keys={keys} />)}
                </div>
              </div>
            ))}
          </Panel>

          <Panel tabKey="method"><InfoCards cards={METHOD_CARDS} /></Panel>
          <Panel tabKey="features"><InfoCards cards={FEATURE_CARDS} /></Panel>

          <Panel tabKey="faq">
            <div class="study-faq-list">
              {FAQ_ITEMS.map(([question, answer], i) => (
                <details class="study-faq-item" open={i === 0} key={question}>
                  <summary class="study-faq-summary">{question}</summary>
                  <div class="study-faq-content">{answer}</div>
                </details>
              ))}
            </div>
          </Panel>

          <Panel tabKey="about"><InfoCards cards={ABOUT_CARDS} /></Panel>
        </div>

        <div class="study-help-footer">
          <span class="study-help-footer-hint">Mẹo: Nhấn <kbd>?</kbd> trên bàn phím bất kỳ lúc nào để mở bảng trợ giúp</span>
          <button type="button" class="study-help-done-btn" onClick={closeStudyHelpModal}>Đã hiểu</button>
        </div>
      </div>
    </div>
  );
}

export function mountStudyHelpModal() {
  const host = document.createElement('div');
  host.id = 'studyHelpModalRoot';
  document.body.appendChild(host);
  render(<StudyHelpModal />, host);

  // Typing '?' anywhere outside a text field toggles the modal.
  window.addEventListener('keydown', (e) => {
    if (e.key !== '?' && !(e.key === '/' && e.shiftKey)) return;
    const el = document.activeElement;
    const tag = el ? el.tagName : '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (el && el.isContentEditable)) return;
    e.preventDefault();
    if (isOpen.value) closeStudyHelpModal();
    else openStudyHelpModal();
  });

  window.openStudyHelpModal = openStudyHelpModal;
  window.closeStudyHelpModal = closeStudyHelpModal;
  window.switchStudyHelpTab = switchStudyHelpTab;
}
