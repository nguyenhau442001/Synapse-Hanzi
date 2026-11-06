// Study Help & Shortcuts Modal for 汉字思维 (Hanzi Mind)
(function () {
  'use strict';

  let helpModalEl = null;
  let activeTabKey = 'shortcuts';
  let previousFocusedEl = null;

  // Markup for the repeated pieces of the help modal.
  function shortcutRow(desc, hint, keys) {
    return `
      <div class="study-shortcut-row">
        <div class="study-shortcut-desc">
          ${desc}
          <small>${hint}</small>
        </div>
        <div class="study-shortcut-keys">
          ${keys.map(k => `<kbd class="study-kbd">${k}</kbd>`).join('\n')}
        </div>
      </div>`;
  }

  function infoCard(icon, title, descHtml) {
    return `
      <div class="study-info-card">
        <div class="study-info-card-header">
          <span class="study-info-card-icon">${icon}</span>
          <h3 class="study-info-card-title">${title}</h3>
        </div>
        <p class="study-info-card-desc">
          ${descHtml}
        </p>
      </div>`;
  }

  function faqItem(question, answerHtml, open = false) {
    return `
      <details class="study-faq-item"${open ? ' open' : ''}>
        <summary class="study-faq-summary">${question}</summary>
        <div class="study-faq-content">
          ${answerHtml}
        </div>
      </details>`;
  }

  function createHelpModal() {
    if (document.getElementById('studyHelpModalOverlay')) {
      return document.getElementById('studyHelpModalOverlay');
    }

    const overlay = document.createElement('div');
    overlay.id = 'studyHelpModalOverlay';
    overlay.className = 'study-help-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'studyHelpModalTitle');

    overlay.innerHTML = `
      <div class="study-help-box">
        <div class="study-help-header">
          <div class="study-help-title-group">
            <span class="study-help-badge-icon" aria-hidden="true">?</span>
            <h2 id="studyHelpModalTitle" class="study-help-title">Hướng dẫn &amp; Trợ giúp học tập</h2>
          </div>
          <button type="button" class="study-help-close-btn" onclick="closeStudyHelpModal()" aria-label="Đóng bảng trợ giúp (Esc)" title="Đóng (Esc)">✕</button>
        </div>

        <nav class="study-help-nav" role="tablist" aria-label="Các mục hướng dẫn">
          <button type="button" class="study-help-tab-btn active" data-tab="shortcuts" role="tab" aria-selected="true" aria-controls="helpTabShortcuts">
            <span>⌨️</span> Phím tắt
          </button>
          <button type="button" class="study-help-tab-btn" data-tab="method" role="tab" aria-selected="false" aria-controls="helpTabMethod">
            <span>🎯</span> Phương pháp SRS
          </button>
          <button type="button" class="study-help-tab-btn" data-tab="features" role="tab" aria-selected="false" aria-controls="helpTabFeatures">
            <span>✨</span> Tính năng
          </button>
          <button type="button" class="study-help-tab-btn" data-tab="faq" role="tab" aria-selected="false" aria-controls="helpTabFaq">
            <span>❓</span> Câu hỏi (FAQ)
          </button>
          <button type="button" class="study-help-tab-btn" data-tab="about" role="tab" aria-selected="false" aria-controls="helpTabAbout">
            <span>ℹ️</span> Giới thiệu
          </button>
        </nav>

        <div class="study-help-body">
          <!-- SECTION 1: KEYBOARD SHORTCUTS -->
          <div class="study-help-section active" id="helpTabShortcuts" role="tabpanel">
            <div class="study-shortcuts-group">
              <h3 class="study-shortcuts-heading">🃏 Thao tác thẻ ghi nhớ (Flashcard)</h3>
              <div class="study-shortcuts-table">
                ${shortcutRow('Lật mặt thẻ', 'Xem pinyin, nghĩa tiếng Việt và câu ví dụ', ['Space'])}
                ${shortcutRow('Đánh giá mức độ nhớ', '1: Chưa nhớ (ôn lại ngay) · 2: Nhớ mang máng · 3: Đã thuộc', ['1', '2', '3'])}
                ${shortcutRow('Phát âm thanh từ vựng', 'Đọc to chữ Hán chuẩn giọng bản xứ', ['A'])}
                ${shortcutRow('Chuyển thẻ trước / thẻ kế tiếp', 'Duyệt qua danh sách các thẻ trong bài', ['←', '→'])}
              </div>
            </div>

            <div class="study-shortcuts-group">
              <h3 class="study-shortcuts-heading">🛠️ Bảng bổ trợ &amp; Tiện ích</h3>
              <div class="study-shortcuts-table">
                ${shortcutRow('Mở bảng luyện viết &amp; thứ tự nét', 'Xem hướng bút và tập viết chữ trực tiếp', ['W'])}
                ${shortcutRow('Chiết tự &amp; phân tích bộ thủ', 'Bóc tách từng thành phần cấu thành chữ Hán', ['R'])}
                ${shortcutRow('Danh sách từ vựng bài học', 'Xem tiến độ và duyệt nhanh toàn bộ từ', ['B'])}
                ${shortcutRow('Bật / Tắt âm Hán - Việt', 'Ẩn hoặc hiện âm đọc tương đồng trong tiếng Việt', ['H'])}
              </div>
            </div>

            <div class="study-shortcuts-group">
              <h3 class="study-shortcuts-heading">🧭 Phím tắt chung</h3>
              <div class="study-shortcuts-table">
                ${shortcutRow('Đóng bảng / Thoát về trang trước', 'Đóng bảng bổ trợ đang mở hoặc quay lại màn hình chọn cấp độ', ['Esc'])}
                ${shortcutRow('Mở nhanh bảng Trợ giúp này', 'Tra cứu phím tắt và hướng dẫn mọi lúc', ['?'])}
              </div>
            </div>
          </div>

          <!-- SECTION 2: SRS METHOD -->
          <div class="study-help-section" id="helpTabMethod" role="tabpanel">
            <div class="study-card-grid">
              ${infoCard('🧠', 'Thuật toán Lặp lại ngắt quãng (SRS)', `汉字思维 (Hanzi Mind) áp dụng thuật toán giãn cách thông minh (FSRS &amp; Ebbinghaus). Các từ bạn đánh giá "Chưa nhớ" sẽ xuất hiện lại ngay, còn các từ "Đã thuộc" sẽ được tự động dời lịch ôn sang 3 ngày, 7 ngày hoặc 1 tháng tới để đưa vào vùng trí nhớ dài hạn.`)}

              ${infoCard('🧩', 'Ghi nhớ chữ Hán qua Chiết tự &amp; Bộ thủ', `Thay vì nhớ vẹt từng nét bút vô nghĩa, hệ thống giúp bạn bóc tách từng chữ thành 214 bộ thủ biểu ý và thanh phù biểu âm. Nhờ đó, bạn sẽ hiểu được gốc rễ chữ Hán và đoán nghĩa từ mới dễ dàng hơn.`)}

              ${infoCard('🎨', 'Học đa giác quan qua Ngữ cảnh &amp; Hình ảnh', `Mỗi từ vựng được liên kết với tranh minh họa trực quan, câu ví dụ đời thường có phiên âm pinyin và dịch nghĩa ngữ pháp chi tiết. Não bộ tiếp nhận hình ảnh và âm thanh song song giúp tăng 300% hiệu suất ghi nhớ.`)}
            </div>
          </div>

          <!-- SECTION 3: FEATURES -->
          <div class="study-help-section" id="helpTabFeatures" role="tabpanel">
            <div class="study-card-grid">
              ${infoCard('⚡', 'Ôn nhanh (Fast Review)', `Cần kiểm tra cấp tốc trước khi thi hoặc muốn rà soát kiến thức? Vào tab "Ôn nhanh", dùng thanh trượt chọn số lượng thẻ (10, 25, 50 hoặc 100 từ) để bắt đầu phiên kiểm tra siêu tốc.`)}

              ${infoCard('📚', 'Bài đọc phân cấp (Graded Reading)', `Luyện kỹ năng đọc hiểu thông qua các câu chuyện thực tế được biên soạn theo đúng chuẩn từ vựng từng cấp độ HSK. Có thể chạm vào từ để tra nhanh nghĩa, ngữ pháp và nghe phát âm.`)}

              ${infoCard('✍️', 'Luyện viết &amp; Thứ tự nét bút', `Mô phỏng động từng nét chữ theo chuẩn quy tắc bút thuận. Bảng vẽ tương tác cho phép bạn dùng chuột hoặc bút cảm ứng để luyện tô nét trực tiếp trên màn hình.`)}

              ${infoCard('🎮', 'Trò chơi tương tác', `Đổi gió sau giờ học căng thẳng với 3 trò chơi rèn phản xạ: <strong>Xếp câu</strong> (luyện ngữ pháp), <strong>Đuổi hình bắt chữ</strong> (nhận diện từ qua tranh) và <strong>Thử thách 1 phút</strong> (điền từ tốc độ).`)}
            </div>
          </div>

          <!-- SECTION 4: FAQ -->
          <div class="study-help-section" id="helpTabFaq" role="tabpanel">
            <div class="study-faq-list">
              ${faqItem('Dữ liệu và tiến trình học của tôi có bị mất không?', 'Toàn bộ số từ đã học, chuỗi ngày streak và dữ liệu lịch ôn SRS đều được tự động lưu cục bộ trên trình duyệt thiết bị của bạn. Bạn có thể sử dụng ứng dụng an toàn mà không cần tạo tài khoản.', true)}

              ${faqItem('Làm sao để dùng ứng dụng khi không có mạng (Offline)?', '汉字思维 (Hanzi Mind) được thiết kế chuẩn PWA (Progressive Web App). Trên trình duyệt Chrome, Safari hoặc Edge, bạn hãy nhấn nút <strong>"Thêm vào Màn hình chính"</strong> hoặc <strong>"Cài đặt ứng dụng"</strong> để học ngoại tuyến mọi lúc mọi nơi.')}

              ${faqItem('Sự khác biệt giữa HSK 2.0 và HSK 3.0 là gì?', 'HSK 2.0 gồm 6 cấp độ truyền thống (phù hợp ôn thi hiện tại). HSK 3.0 là khung tiêu chuẩn mới mở rộng đến cấp 9 với khối lượng từ vựng hiện đại hơn. Bạn có thể chuyển đổi linh hoạt tại bộ chọn phiên bản ở trang chủ.')}

              ${faqItem('Làm cách nào để đổi giao diện Sáng / Tối?', 'Nhấn vào biểu tượng mặt trăng 🌙 / mặt trời ☀️ ở góc trên bên phải thanh tiêu đề (hoặc trong thanh công cụ khi đang lật thẻ) để chuyển đổi nhanh theo nhu cầu mắt nhìn.')}
            </div>
          </div>

          <!-- SECTION 5: ABOUT -->
          <div class="study-help-section" id="helpTabAbout" role="tabpanel">
            <div class="study-card-grid">
              ${infoCard('⚡', 'Synapse Hanzi', `Nền tảng học và ghi nhớ chữ Hán thông minh, kết hợp thuật toán lặp lại ngắt quãng (FSRS/SRS), chiết tự bộ thủ, luyện nghe phân cấp và bài đọc tương tác.`)}

              ${infoCard('👨‍💻', 'Tác giả &amp; Đóng góp', `Phát triển bởi <strong>haunguyenngoc442001</strong>.<br>
• Mã nguồn: <a href="https://github.com/nguyenhau442001/synapse-hanzi/" target="_blank" rel="noopener noreferrer" style="color:var(--brand-primary);text-decoration:underline;">GitHub Repository</a><br>
• Liên hệ: <a href="https://www.facebook.com/haunguyenngoc442001/" target="_blank" rel="noopener noreferrer" style="color:var(--brand-primary);text-decoration:underline;">Facebook cá nhân</a>`)}
            </div>
          </div>
        </div>

        <div class="study-help-footer">
          <span class="study-help-footer-hint">Mẹo: Nhấn <kbd>?</kbd> trên bàn phím bất kỳ lúc nào để mở bảng trợ giúp</span>
          <button type="button" class="study-help-done-btn" onclick="closeStudyHelpModal()">Đã hiểu</button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeStudyHelpModal();
    });

    const nav = overlay.querySelector('.study-help-nav');
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.study-help-tab-btn');
      if (btn && btn.dataset.tab) {
        switchStudyHelpTab(btn.dataset.tab);
      }
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function switchStudyHelpTab(tabKey) {
    if (!helpModalEl) return;
    activeTabKey = tabKey;

    const navBtns = helpModalEl.querySelectorAll('.study-help-tab-btn');
    let matchedBtn = null;
    navBtns.forEach((btn) => {
      const isMatch = btn.dataset.tab === tabKey;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
      if (isMatch) matchedBtn = btn;
    });

    if (matchedBtn && typeof matchedBtn.scrollIntoView === 'function') {
      matchedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    const sections = helpModalEl.querySelectorAll('.study-help-section');
    sections.forEach((sec) => {
      const isMatch = sec.id === `helpTab${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}`;
      sec.classList.toggle('active', isMatch);
    });
  }

  function handleModalKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeStudyHelpModal();
    }
  }

  function openStudyHelpModal(tabKey) {
    previousFocusedEl = document.activeElement;
    if (!helpModalEl) {
      helpModalEl = createHelpModal();
    }

    if (tabKey) {
      switchStudyHelpTab(tabKey);
    } else {
      switchStudyHelpTab(activeTabKey);
    }

    helpModalEl.classList.add('open');
    document.addEventListener('keydown', handleModalKeydown);

    // Ensure active tab button is fully scrolled into view
    setTimeout(() => {
      const activeBtn = helpModalEl.querySelector('.study-help-tab-btn.active');
      if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }, 60);

    // Focus close button for accessibility
    const closeBtn = helpModalEl.querySelector('.study-help-close-btn');
    if (closeBtn) {
      setTimeout(() => closeBtn.focus(), 50);
    }
  }

  function closeStudyHelpModal() {
    if (!helpModalEl) return;
    helpModalEl.classList.remove('open');
    document.removeEventListener('keydown', handleModalKeydown);

    if (previousFocusedEl && typeof previousFocusedEl.focus === 'function') {
      try {
        previousFocusedEl.focus();
      } catch (e) {}
    }
  }

  // Global key listener: typing '?' opens or toggles the help modal
  window.addEventListener('keydown', (e) => {
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (document.activeElement && document.activeElement.isContentEditable);
      if (isInput) return;

      e.preventDefault();
      if (helpModalEl && helpModalEl.classList.contains('open')) {
        closeStudyHelpModal();
      } else {
        openStudyHelpModal();
      }
    }
  });

  window.openStudyHelpModal = openStudyHelpModal;
  window.closeStudyHelpModal = closeStudyHelpModal;
  window.switchStudyHelpTab = switchStudyHelpTab;
})();
