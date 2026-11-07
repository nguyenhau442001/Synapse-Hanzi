// Compact desktop entry point into the searchable 214-radical directory (left dock).
// Below 1280px the same entry lives in the "Công cụ" menu instead (.primary-menu-radical-lookup).
// Preact port of the former assets/js/sidebar-radicals-filter.js with the same markup.
import { render } from 'preact';
import { onDomReady } from './domReady';

function SidebarRadicalsFilter() {
  return (
    <>
      <div class="sidebar-panel-title">Tra cứu bộ thủ</div>{' '}
      <p class="sidebar-radical-summary">50 bộ cơ bản và 214 bộ Khang Hy, có thể tìm theo chữ hoặc nghĩa.</p>{' '}
      <button type="button" class="sidebar-radical-directory-btn" onClick={() => window.openRadicalDirectory()}>
        Mở danh sách 214 bộ <span aria-hidden="true">→</span>
      </button>
    </>
  );
}

export function mountSidebarRadicalsFilter() {
  onDomReady(() => {
    if (!document.body.classList.contains('is-desktop-dock')) return;
    const mount = document.getElementById('workstationLeft');
    if (!mount) return;
    const wrap = document.createElement('section');
    wrap.className = 'sidebar-radicals-filter';
    mount.appendChild(wrap);
    render(<SidebarRadicalsFilter />, wrap);
  });
}
