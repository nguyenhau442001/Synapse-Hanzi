// src/islands/MobileBottomNav.js
// Mobile Bottom Navigation Bar & Mobile Stats Dialog coordinator.

export function openMobileNotebookSheet() {
  if (typeof window.openQuickAccessDrawer === 'function') {
    window.openQuickAccessDrawer('saved');
    return;
  }
  const dialog = document.getElementById('mobileDockDialog');
  if (dialog) {
    if (typeof dialog.showModal === 'function') {
      try { dialog.showModal(); } catch (e) { dialog.setAttribute('open', ''); }
    } else {
      dialog.setAttribute('open', '');
    }
  }
}

export function renderMobileStatsHeader(dialogBody) {
  let header = dialogBody.querySelector('.mobile-stats-kpi-summary');
  if (!header) {
    header = document.createElement('div');
    header.className = 'mobile-stats-kpi-summary';
    dialogBody.prepend(header);
  }

  const activity = typeof readStudyActivity === 'function' ? readStudyActivity() : (typeof window.readStudyActivity === 'function' ? window.readStudyActivity() : { days: {} });
  const stats = typeof streakStats === 'function' ? streakStats(activity.days) : (typeof window.streakStats === 'function' ? window.streakStats(activity.days) : { current: 0, longest: 0, totalDaysStudied: 0 });
  const totalMinutes = Object.values(activity.days || {}).reduce(function(sum, entry) {
    return sum + (typeof daySeconds === 'function' ? daySeconds(entry) : (typeof window.daySeconds === 'function' ? window.daySeconds(entry) : 0)) / 60;
  }, 0);
  const timeFormatted = typeof formatStudyDuration === 'function' ? formatStudyDuration(totalMinutes) : (typeof window.formatStudyDuration === 'function' ? window.formatStudyDuration(totalMinutes) : Math.round(totalMinutes) + ' phút');

  header.innerHTML =
    '<div class="history-kpi-row mobile-kpi-grid">' +
      '<div class="history-kpi"><strong>🔥 ' + stats.current + '</strong><span>Chuỗi hiện tại</span></div>' +
      '<div class="history-kpi"><strong>🏆 ' + stats.longest + '</strong><span>Chuỗi dài nhất</span></div>' +
      '<div class="history-kpi"><strong>📅 ' + stats.totalDaysStudied + '</strong><span>Ngày đã học</span></div>' +
      '<div class="history-kpi"><strong>⏱ ' + timeFormatted + '</strong><span>Tổng thời gian</span></div>' +
    '</div>' +
    '<button type="button" class="mobile-stats-history-btn" onclick="window.openDetailedHistoryFromStatsSheet()">' +
      '<span>📅 Xem biểu đồ lịch sử học tập (Heatmap)</span>' +
      '<span aria-hidden="true">→</span>' +
    '</button>';
}

export function openDetailedHistoryFromStatsSheet() {
  closeMobileStatsSheet();
  if (typeof showHistoryModal === 'function') {
    showHistoryModal();
  } else if (typeof window.showHistoryModal === 'function') {
    window.showHistoryModal();
  }
}

export function openMobileProfileOrStats() {
  const dialog = document.getElementById('mobileStatsDialog');
  const dialogBody = document.getElementById('mobileStatsDialogBody');
  const widgets = document.getElementById('homeWidgets');

  if (dialog && dialogBody) {
    renderMobileStatsHeader(dialogBody);

    if (widgets && widgets.parentNode !== dialogBody) {
      dialogBody.appendChild(widgets);
    }

    if (typeof refreshHomeWidgets === 'function') {
      try { refreshHomeWidgets(); } catch (e) {}
    } else if (typeof window.refreshHomeWidgets === 'function') {
      try { window.refreshHomeWidgets(); } catch (e) {}
    }

    if (typeof dialog.showModal === 'function') {
      try { dialog.showModal(); } catch (e) { dialog.setAttribute('open', ''); }
    } else {
      dialog.setAttribute('open', '');
    }

    const mobProfile = document.getElementById('mobNavProfile');
    if (mobProfile) mobProfile.classList.add('active');
    return;
  }

  if (typeof showHistoryModal === 'function') {
    showHistoryModal();
  } else if (typeof window.showHistoryModal === 'function') {
    window.showHistoryModal();
  }
}

export function closeMobileStatsSheet() {
  const dialog = document.getElementById('mobileStatsDialog');
  if (dialog) {
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  const bottomMount = document.getElementById('dashboardBottomWidgets');
  const statsContent = document.getElementById('dashboardStatsContent');
  const widgets = document.getElementById('homeWidgets');
  const mountTarget = bottomMount || statsContent;
  if (mountTarget && widgets && widgets.parentNode !== mountTarget) {
    mountTarget.appendChild(widgets);
  }

  const mobProfile = document.getElementById('mobNavProfile');
  if (mobProfile) mobProfile.classList.remove('active');
}

export function initMobileNavDialogEvents() {
  const statsDialog = document.getElementById('mobileStatsDialog');
  if (statsDialog) {
    statsDialog.addEventListener('click', function(e) {
      if (e.target === statsDialog) {
        closeMobileStatsSheet();
      }
    });
    statsDialog.addEventListener('close', function() {
      const bottomMount = document.getElementById('dashboardBottomWidgets');
      const statsContent = document.getElementById('dashboardStatsContent');
      const widgets = document.getElementById('homeWidgets');
      const mountTarget = bottomMount || statsContent;
      if (mountTarget && widgets && widgets.parentNode !== mountTarget) {
        mountTarget.appendChild(widgets);
      }
      const mobProfile = document.getElementById('mobNavProfile');
      if (mobProfile) mobProfile.classList.remove('active');
    });
  }

  const dockDialog = document.getElementById('mobileDockDialog');
  if (dockDialog) {
    dockDialog.addEventListener('click', function(e) {
      if (e.target === dockDialog) {
        if (typeof dockDialog.close === 'function') dockDialog.close();
        else dockDialog.removeAttribute('open');
      }
    });
  }

  const statsAccordion = document.getElementById('dashboardStatsAccordion');
  if (statsAccordion) {
    statsAccordion.addEventListener('toggle', function() {
      const label = statsAccordion.querySelector('.stats-toggle-label');
      if (label) {
        label.textContent = statsAccordion.open ? 'Thu gọn' : 'Mở rộng';
      }
    });
  }
}

export function mountMobileBottomNav() {
  if (typeof window !== 'undefined') {
    Object.assign(window, {
      openMobileNotebookSheet,
      renderMobileStatsHeader,
      openDetailedHistoryFromStatsSheet,
      openMobileProfileOrStats,
      closeMobileStatsSheet,
      initMobileNavDialogEvents,
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initMobileNavDialogEvents);
    } else {
      initMobileNavDialogEvents();
    }
  }
}

if (typeof window !== 'undefined') {
  mountMobileBottomNav();
}
