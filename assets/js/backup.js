// Export and import progress snapshots between devices.
function exportProgress() {
  const data = JSON.stringify({
    schemaVersion: 3,
    level: currentLevel,
    cards: srsCards,
    reviewLog: readSrsReviewLog(currentLevel),
    prefs: { showPinyin, showIllustration, order, desiredRetention: srsRetention },
    progress,
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

function importProgress(event) {
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
        srsCards = restoredCards;
      } else {
        const legacyProgress = data.progress && typeof data.progress === 'object' ? data.progress : {};
        srsCards = migrateLegacyProgress(currentLevel, WORDS, legacyProgress, srsRetention);
      }
      progress = progressFromCards(srsCards);
      appendImportedReviewLog(currentLevel, data.reviewLog);
      if (Array.isArray(backupPrefs.order) && backupPrefs.order.length === WORDS.length) order = backupPrefs.order;
      if (typeof backupPrefs.showPinyin === 'boolean') showPinyin = backupPrefs.showPinyin;
      if (typeof backupPrefs.showIllustration === 'boolean') {
        showIllustration = backupPrefs.showIllustration;
        try { localStorage.setItem('hsk_show_illustrations', String(showIllustration)); } catch (e) {}
        document.body.classList.toggle('hide-illustrations', !showIllustration);
      }
      if (Number.isFinite(Number(backupPrefs.desiredRetention))) srsRetention = saveRetention(backupPrefs.desiredRetention);
      const retentionSlider = document.getElementById('desiredRetentionSlider');
      const retentionLabel = document.getElementById('desiredRetentionValue');
      if (retentionSlider) retentionSlider.value = String(srsRetention);
      if (retentionLabel) retentionLabel.textContent = Math.round(srsRetention * 100) + '%';
      saveProgress();
      savePrefs();
      renderLearningDashboard();
      const btn = document.getElementById('pinyinToggle');
      btn.textContent = showPinyin ? '👁 Đang hiện pinyin' : '🙈 Chế độ thử thách: ẩn pinyin';
      btn.classList.toggle('on', !showPinyin);
      setFilter(currentFilter);
      if (filteredOrder.length) updateSrsPreviews(WORDS[filteredOrder[idx % filteredOrder.length]]);
      if (typeof toggleTransferPanel === 'function') toggleTransferPanel(false);
      alert('Đã khôi phục tiến trình thành công!');
    } catch (err) {
      alert('Bản sao tiến trình không hợp lệ.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function updateDesiredRetention(value) {
  srsRetention = saveRetention(value);
  savePrefs();
  const display = document.getElementById('desiredRetentionValue');
  if (display) display.textContent = Math.round(srsRetention * 100) + '%';
  if (currentLevel && filteredOrder.length) {
    updateSrsPreviews(WORDS[filteredOrder[idx % filteredOrder.length]]);
  }
  renderLearningDashboard();
}

function exportRadicalProgress() {
  const data = JSON.stringify({
    type: 'radicals',
    version: 1,
    progress: radicalProgress,
    showPinyin: showRadicalPinyin,
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

function importRadicalProgress(event) {
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
      radicalProgress = restoredProgress;
      if (typeof data.showPinyin === 'boolean') showRadicalPinyin = data.showPinyin;
      saveRadicalProgress();
      saveRadicalPrefs();

      const pinyinButton = document.getElementById('radicalPinyinToggle');
      if (pinyinButton) {
        pinyinButton.textContent = showRadicalPinyin ? '👁 Đang hiện pinyin' : '🙈 Chế độ thử thách: ẩn pinyin';
        pinyinButton.classList.toggle('on', !showRadicalPinyin);
      }
      setRadicalFilter(radicalCurrentFilter);
      if (radicalCurrentView === 'overview') renderRadicalOverview();
      if (typeof toggleRadicalTransferPanel === 'function') toggleRadicalTransferPanel(false);
      alert('Đã khôi phục tiến trình Bộ thủ thành công!');
    } catch (error) {
      alert('Bản sao tiến trình Bộ thủ không hợp lệ.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
