// Workstation right sidebar tab switcher: groups Stroke order, Word list, Context,
// and Memory curve into clean, spacious, single-focus tabs.

function initSidebarTabs() {
  const mount = document.getElementById('workstationRight');
  if (!mount) return;

  if (document.getElementById('sidebarStudyTabs')) return;

  if (!document.getElementById('studyWritingDrawerHeader')) {
    const header = document.createElement('div');
    header.id = 'studyWritingDrawerHeader';
    header.className = 'study-drawer-header';
    header.innerHTML = `
      <div class="study-drawer-title-group">
        <span class="study-drawer-icon" aria-hidden="true">✍️</span>
        <strong class="study-drawer-title">Bổ trợ từ vựng</strong>
      </div>
      <button type="button" class="study-drawer-close-btn" onclick="closeAllStudyDrawers()" aria-label="Đóng bảng tiện ích" title="Đóng bảng (Esc)">✕</button>
    `;
    mount.insertBefore(header, mount.firstChild);
  }

  const saved = localStorage.getItem('hsk_sidebar_tab') || 'stroke';
  const savedTab = saved === 'all' ? 'stroke' : saved;

  const nav = document.createElement('nav');
  nav.id = 'sidebarStudyTabs';
  nav.className = 'sidebar-study-tabs';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'Chế độ xem các tiện ích từ vựng');
  nav.innerHTML = `
    <button type="button" class="sidebar-study-tab" data-tab="stroke" role="tab" aria-selected="false" title="Luyện thứ tự nét &amp; viết chữ Hán (W)">
      <span class="sidebar-tab-icon">✍️</span>
      <span class="sidebar-tab-label">Nét chữ</span>
    </button>
    <button type="button" class="sidebar-study-tab" data-tab="radicals" role="tab" aria-selected="false" title="Bóc tách bộ thủ &amp; chiết tự chữ Hán (R)">
      <span class="sidebar-tab-icon">🧩</span>
      <span class="sidebar-tab-label">Bộ thủ</span>
    </button>
    <button type="button" class="sidebar-study-tab" data-tab="words" role="tab" aria-selected="false" title="Danh sách từ trong bài học (B)">
      <span class="sidebar-tab-icon">📖</span>
      <span class="sidebar-tab-label">Từ vựng</span>
    </button>
    <button type="button" class="sidebar-study-tab" data-tab="companion" role="tab" aria-selected="false" title="Câu ví dụ, ngữ pháp &amp; từ liên quan">
      <span class="sidebar-tab-icon">💡</span>
      <span class="sidebar-tab-label">Ngữ cảnh</span>
    </button>
    <button type="button" class="sidebar-study-tab" data-tab="curve" role="tab" aria-selected="false" title="Dự đoán khả năng ghi nhớ (Ebbinghaus)">
      <span class="sidebar-tab-icon">📈</span>
      <span class="sidebar-tab-label">Ghi nhớ</span>
    </button>
  `;

  const headerEl = document.getElementById('studyWritingDrawerHeader');
  if (headerEl && headerEl.nextSibling) {
    mount.insertBefore(nav, headerEl.nextSibling);
  } else {
    mount.appendChild(nav);
  }

  function setActiveTab(tabKey, save = true) {
    const validTabs = ['stroke', 'radicals', 'words', 'companion', 'curve'];
    const active = validTabs.includes(tabKey) ? tabKey : 'stroke';
    document.body.dataset.sidebarTab = active;

    const tabs = nav.querySelectorAll('.sidebar-study-tab');
    tabs.forEach(btn => {
      const isMatch = btn.dataset.tab === active;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    if (active === 'radicals' && typeof renderStudyRadicalsPanel === 'function') {
      renderStudyRadicalsPanel(typeof activeStudyWord !== 'undefined' ? activeStudyWord : null);
    }
    if (active === 'words' && typeof renderStudyWordList === 'function') {
      renderStudyWordList();
    }
    if (active === 'stroke' && typeof renderActiveStrokeChar === 'function') {
      setTimeout(() => renderActiveStrokeChar(false), 50);
    }
    if (typeof updateStudyDrawerButtons === 'function') {
      updateStudyDrawerButtons();
    }

    if (save) {
      try { localStorage.setItem('hsk_sidebar_tab', active); } catch (e) {}
    }
  }

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.sidebar-study-tab');
    if (btn && btn.dataset.tab) {
      setActiveTab(btn.dataset.tab, true);
    }
  });

  nav.addEventListener('keydown', (e) => {
    const tabs = Array.from(nav.querySelectorAll('.sidebar-study-tab'));
    const currentIdx = tabs.findIndex(t => t.classList.contains('active'));
    if (currentIdx === -1) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (currentIdx + 1) % tabs.length;
      tabs[nextIdx].focus();
      setActiveTab(tabs[nextIdx].dataset.tab, true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (currentIdx - 1 + tabs.length) % tabs.length;
      tabs[prevIdx].focus();
      setActiveTab(tabs[prevIdx].dataset.tab, true);
    }
  });

  const initialUrlDrawer = window.__initialStudyDrawerParam;
  if (initialUrlDrawer) {
    const targetTab = ['stroke', 'radicals', 'words', 'companion', 'curve'].includes(initialUrlDrawer) ? initialUrlDrawer : savedTab;
    setActiveTab(targetTab, false);
    document.body.classList.add('study-sidebar-open');
    let openedOnce = false;
    if (typeof onActiveWordChange === 'function') {
      onActiveWordChange(() => {
        if (!openedOnce) {
          openedOnce = true;
          document.body.classList.add('study-sidebar-open');
        }
      });
    }
  } else {
    setActiveTab(savedTab, false);
  }
}

try {
  window.__initialStudyDrawerParam = new URLSearchParams(window.location.search).get('drawer');
} catch (e) {}

window.setSidebarStudyTab = function(tabKey) {
  if (!document.getElementById('sidebarStudyTabs')) {
    initSidebarTabs();
  }
  const nav = document.getElementById('sidebarStudyTabs');
  if (!nav) return;
  const targetBtn = nav.querySelector(`[data-tab="${tabKey}"]`);
  if (targetBtn) {
    targetBtn.click();
  } else {
    document.body.dataset.sidebarTab = tabKey;
  }
};
window.initSidebarTabs = initSidebarTabs;

document.addEventListener('DOMContentLoaded', initSidebarTabs);
