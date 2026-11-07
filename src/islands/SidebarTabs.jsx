// Study sidebar tab switcher (#sidebarStudyTabs): Stroke order, Radicals, Word list, Context and
// Memory curve as single-focus tabs. Preact port of the former assets/js/sidebar-tabs.js with the
// same markup; the active tab is still mirrored to <body data-sidebar-tab> for the CSS.
import { render } from 'preact';
import { signal } from '@preact/signals';
import { onDomReady } from './domReady';

/* global activeStudyWord -- state.js */

const TABS = [
  { key: 'stroke', icon: '✍️', label: 'Nét chữ', title: 'Luyện thứ tự nét & viết chữ Hán (W)' },
  { key: 'radicals', icon: '🧩', label: 'Bộ thủ', title: 'Bóc tách bộ thủ & chiết tự chữ Hán (R)' },
  { key: 'words', icon: '📖', label: 'Từ vựng', title: 'Danh sách từ trong bài học (B)' },
  { key: 'companion', icon: '💡', label: 'Ngữ cảnh', title: 'Câu ví dụ, ngữ pháp & từ liên quan' },
  { key: 'curve', icon: '📈', label: 'Ghi nhớ', title: 'Dự đoán khả năng ghi nhớ (Ebbinghaus)' }
];
const VALID = TABS.map((t) => t.key);

const activeTab = signal(null);
let navEl = null;

let initialUrlDrawer = null;
try { initialUrlDrawer = new URLSearchParams(window.location.search).get('drawer'); } catch (e) { /* no URL */ }

function setActiveTab(tabKey, save = true) {
  const active = VALID.includes(tabKey) ? tabKey : 'stroke';
  document.body.dataset.sidebarTab = active;
  activeTab.value = active;

  if (active === 'radicals' && typeof window.renderStudyRadicalsPanel === 'function') {
    window.renderStudyRadicalsPanel(typeof activeStudyWord !== 'undefined' ? activeStudyWord : null);
  }
  if (active === 'words' && typeof window.renderStudyWordList === 'function') window.renderStudyWordList();
  if (active === 'stroke' && typeof window.renderActiveStrokeChar === 'function') {
    setTimeout(() => window.renderActiveStrokeChar(false), 50);
  }
  if (typeof window.updateStudyDrawerButtons === 'function') window.updateStudyDrawerButtons();
  if (save) {
    try { localStorage.setItem('hsk_sidebar_tab', active); } catch (e) { /* ignore */ }
  }
}

// ← / → move between tabs (and focus them) like a tablist.
function onNavKeydown(e) {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const current = VALID.indexOf(activeTab.value);
  if (current === -1) return;
  e.preventDefault();
  const next = (current + (e.key === 'ArrowRight' ? 1 : VALID.length - 1)) % VALID.length;
  navEl.querySelectorAll('.sidebar-study-tab')[next].focus();
  setActiveTab(VALID[next], true);
}

function SidebarTabButtons() {
  const active = activeTab.value;
  return TABS.flatMap(({ key, icon, label, title }, i) => [
    i > 0 ? ' ' : null,
    <button key={key} type="button" class={key === active ? 'sidebar-study-tab active' : 'sidebar-study-tab'} data-tab={key}
      role="tab" aria-selected={key === active ? 'true' : 'false'} title={title} onClick={() => setActiveTab(key, true)}>
      <span class="sidebar-tab-icon">{icon}</span>{' '}
      <span class="sidebar-tab-label">{label}</span>
    </button>
  ]);
}

function DrawerHeader() {
  return (
    <>
      <div class="study-drawer-title-group">
        <span class="study-drawer-icon" aria-hidden="true">✍️</span>{' '}
        <strong class="study-drawer-title">Bổ trợ từ vựng</strong>
      </div>{' '}
      <button type="button" class="study-drawer-close-btn" onClick={() => window.closeAllStudyDrawers()} aria-label="Đóng bảng tiện ích" title="Đóng bảng (Esc)">✕</button>
    </>
  );
}

export function initSidebarTabs() {
  const mount = document.getElementById('workstationRight');
  if (!mount || document.getElementById('sidebarStudyTabs')) return;

  // Same slot as before: header + tabs at the top of the sidebar, ahead of the study panels
  // (the home widgets, prepended later on desktop, still go above them).
  const firstPanel = document.getElementById('memoryCurvePanel');
  const before = firstPanel && firstPanel.parentElement === mount ? firstPanel : mount.firstChild;

  if (!document.getElementById('studyWritingDrawerHeader')) {
    const header = document.createElement('div');
    header.id = 'studyWritingDrawerHeader';
    header.className = 'study-drawer-header';
    mount.insertBefore(header, before);
    render(<DrawerHeader />, header);
  }

  navEl = document.createElement('nav');
  navEl.id = 'sidebarStudyTabs';
  navEl.className = 'sidebar-study-tabs';
  navEl.setAttribute('role', 'tablist');
  navEl.setAttribute('aria-label', 'Chế độ xem các tiện ích từ vựng');
  navEl.addEventListener('keydown', onNavKeydown);
  document.getElementById('studyWritingDrawerHeader').after(navEl);

  const saved = localStorage.getItem('hsk_sidebar_tab') || 'stroke';
  const savedTab = saved === 'all' ? 'stroke' : saved;
  activeTab.value = VALID.includes(savedTab) ? savedTab : 'stroke';
  render(<SidebarTabButtons />, navEl);

  if (initialUrlDrawer) {
    setActiveTab(VALID.includes(initialUrlDrawer) ? initialUrlDrawer : savedTab, false);
    document.body.classList.add('study-sidebar-open');
    let openedOnce = false;
    if (typeof window.onActiveWordChange === 'function') {
      window.onActiveWordChange(() => {
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

export function setSidebarStudyTab(tabKey) {
  if (!document.getElementById('sidebarStudyTabs')) initSidebarTabs();
  if (!document.getElementById('sidebarStudyTabs')) return;
  if (VALID.includes(tabKey)) setActiveTab(tabKey, true);
  else document.body.dataset.sidebarTab = tabKey;
}

export function mountSidebarTabs() {
  window.__initialStudyDrawerParam = initialUrlDrawer;
  Object.assign(window, { setSidebarStudyTab, initSidebarTabs });
  onDomReady(initSidebarTabs);
}
