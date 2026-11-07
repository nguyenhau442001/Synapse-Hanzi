// Export and import progress snapshots between devices.
// Preact island port replacing legacy assets/js/backup.js.

/* global currentLevel, srsCards, readSrsReviewLog, showPinyin, showIllustration, order,
   srsRetention, progress, WORDS, SRS, migrateLegacyProgress, progressFromCards,
   appendImportedReviewLog, saveRetention, saveProgress, savePrefs, renderLearningDashboard,
   setFilter, updateSrsPreviews, toggleTransferPanel, toggleRadicalTransferPanel,
   radicalProgress, showRadicalPinyin, saveRadicalProgress, saveRadicalPrefs,
   setRadicalFilter, radicalCurrentFilter, radicalCurrentView, renderRadicalOverview */

export function exportProgress() {
  const data = JSON.stringify({
    schemaVersion: 3,
    level: currentLevel,
    cards: srsCards,
    reviewLog: typeof readSrsReviewLog === 'function' ? readSrsReviewLog(currentLevel) : [],
    prefs: {
      showPinyin: typeof showPinyin !== 'undefined' ? showPinyin : true,
      showIllustrationV2: typeof showIllustration !== 'undefined' ? showIllustration : false,
      order: typeof order !== 'undefined' ? order : [],
      desiredRetention: typeof srsRetention !== 'undefined' ? srsRetention : 0.9,
    },
    progress: typeof progress !== 'undefined' ? progress : {},
  }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hsk_progress_' + currentLevel + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setTimeout(() => {
    if (typeof toggleTransferPanel === 'function') toggleTransferPanel(false);
  }, 400);
}

export function importProgress(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.level && data.level !== currentLevel) {
        if (!confirm('Bản sao này thuộc cấp độ ' + data.level.toUpperCase() + ', không phải ' + currentLevel.toUpperCase() + '. Vẫn khôi phục?')) return;
      }
      if (!confirm('Khôi phục tiến trình từ một bản sao đã tải trước đó. Tiến trình hiện tại có thể bị thay thế.')) return;
      const backupPrefs = data.prefs && typeof data.prefs === 'object' ? data.prefs : data;
      if (data.schemaVersion >= 3 && data.cards && typeof data.cards === 'object') {
        const restoredCards = {};
        Object.entries(data.cards).forEach(([id, card]) => {
          const normalized = SRS.serializeCard(card);
          if (!normalized) throw new Error('invalid FSRS card');
          restoredCards[id] = normalized;
        });
        WORDS.forEach(word => {
          if (!restoredCards[word.id]) restoredCards[word.id] = SRS.createNewCard();
        });
        Object.keys(srsCards).forEach(key => delete srsCards[key]);
        Object.assign(srsCards, restoredCards);
      } else {
        const legacyProgress = data.progress && typeof data.progress === 'object' ? data.progress : {};
        const migrated = migrateLegacyProgress(currentLevel, WORDS, legacyProgress, srsRetention);
        Object.keys(srsCards).forEach(key => delete srsCards[key]);
        Object.assign(srsCards, migrated);
      }
      const newProg = progressFromCards(srsCards);
      Object.keys(progress).forEach(key => delete progress[key]);
      Object.assign(progress, newProg);

      appendImportedReviewLog(currentLevel, data.reviewLog);
      if (Array.isArray(backupPrefs.order) && backupPrefs.order.length === WORDS.length) {
        order.length = 0;
        backupPrefs.order.forEach(item => order.push(item));
      }
      if (typeof backupPrefs.showPinyin === 'boolean') {
        window.showPinyin = backupPrefs.showPinyin;
      }
      if (typeof backupPrefs.showIllustrationV2 === 'boolean') {
        window.showIllustration = backupPrefs.showIllustrationV2;
        try { localStorage.setItem('hsk_show_illustrations_v2', String(backupPrefs.showIllustrationV2)); } catch (_) {}
        document.body.classList.toggle('hide-illustrations', !backupPrefs.showIllustrationV2);
      }
      if (Number.isFinite(Number(backupPrefs.desiredRetention))) {
        window.srsRetention = saveRetention(backupPrefs.desiredRetention);
      }
      const retentionSlider = document.getElementById('desiredRetentionSlider');
      const retentionLabel = document.getElementById('desiredRetentionValue');
      if (retentionSlider) retentionSlider.value = String(srsRetention);
      if (retentionLabel) retentionLabel.textContent = Math.round(srsRetention * 100) + '%';
      saveProgress();
      savePrefs();
      if (typeof renderLearningDashboard === 'function') renderLearningDashboard();
      const btn = document.getElementById('pinyinToggle');
      if (btn) {
        btn.textContent = showPinyin ? '👁 Đang hiện pinyin' : '🙈 Chế độ thử thách: ẩn pinyin';
        btn.classList.toggle('on', !showPinyin);
      }
      if (typeof setFilter === 'function') setFilter(typeof currentFilter !== 'undefined' ? currentFilter : 'all');
      if (typeof filteredOrder !== 'undefined' && filteredOrder.length && typeof updateSrsPreviews === 'function') {
        updateSrsPreviews(WORDS[filteredOrder[idx % filteredOrder.length]]);
      }
      if (typeof toggleTransferPanel === 'function') toggleTransferPanel(false);
      alert('Đã khôi phục tiến trình thành công!');
    } catch (err) {
      alert('Bản sao tiến trình không hợp lệ.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

export function updateDesiredRetention(value) {
  if (typeof saveRetention === 'function') {
    window.srsRetention = saveRetention(value);
  }
  if (typeof savePrefs === 'function') savePrefs();
  const display = document.getElementById('desiredRetentionValue');
  if (display) display.textContent = Math.round(srsRetention * 100) + '%';
  if (currentLevel && typeof filteredOrder !== 'undefined' && filteredOrder.length && typeof updateSrsPreviews === 'function') {
    updateSrsPreviews(WORDS[filteredOrder[idx % filteredOrder.length]]);
  }
  if (typeof renderLearningDashboard === 'function') renderLearningDashboard();
}

export function exportRadicalProgress() {
  const data = JSON.stringify({
    type: 'radicals',
    version: 1,
    progress: typeof radicalProgress !== 'undefined' ? radicalProgress : {},
    showPinyin: typeof showRadicalPinyin !== 'undefined' ? showRadicalPinyin : true,
  }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'hsk_radicals_progress.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  setTimeout(() => {
    if (typeof toggleRadicalTransferPanel === 'function') toggleRadicalTransferPanel(false);
  }, 400);
}

export function importRadicalProgress(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(loadEvent) {
    try {
      const data = JSON.parse(loadEvent.target.result);
      if (data.type !== 'radicals' || !data.progress || typeof data.progress !== 'object' || Array.isArray(data.progress)) {
        throw new Error('invalid radical backup');
      }
      if (!confirm('Khôi phục tiến trình Bộ thủ từ bản sao này? Tiến trình hiện tại có thể bị thay thế.')) return;

      const restoredProgress = {};
      Object.entries(data.progress).forEach(([key, status]) => {
        if (/^\d+$/.test(key) && Number(key) >= 1 && Number(key) <= 214 && ['known', 'unknown'].includes(status)) {
          restoredProgress[key] = status;
        }
      });
      if (typeof radicalProgress !== 'undefined') {
        Object.keys(radicalProgress).forEach(key => delete radicalProgress[key]);
        Object.assign(radicalProgress, restoredProgress);
      }
      if (typeof data.showPinyin === 'boolean') {
        window.showRadicalPinyin = data.showPinyin;
      }
      if (typeof saveRadicalProgress === 'function') saveRadicalProgress();
      if (typeof saveRadicalPrefs === 'function') saveRadicalPrefs();

      const pinyinButton = document.getElementById('radicalPinyinToggle');
      if (pinyinButton) {
        pinyinButton.textContent = showRadicalPinyin ? '👁 Đang hiện pinyin' : '🙈 Chế độ thử thách: ẩn pinyin';
        pinyinButton.classList.toggle('on', !showRadicalPinyin);
      }
      if (typeof setRadicalFilter === 'function') {
        setRadicalFilter(typeof radicalCurrentFilter !== 'undefined' ? radicalCurrentFilter : 'all');
      }
      if (typeof radicalCurrentView !== 'undefined' && radicalCurrentView === 'overview' && typeof renderRadicalOverview === 'function') {
        renderRadicalOverview();
      }
      if (typeof toggleRadicalTransferPanel === 'function') toggleRadicalTransferPanel(false);
      alert('Đã khôi phục tiến trình Bộ thủ thành công!');
    } catch (error) {
      alert('Bản sao tiến trình Bộ thủ không hợp lệ.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

export function mountBackupSync() {
  window.exportProgress = exportProgress;
  window.importProgress = importProgress;
  window.updateDesiredRetention = updateDesiredRetention;
  window.exportRadicalProgress = exportRadicalProgress;
  window.importRadicalProgress = importRadicalProgress;
}
