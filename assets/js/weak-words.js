// Left sidebar: starred/weak words list, backed by localStorage.
const WEAK_WORDS_KEY = 'hsk_weak_words_v1';

function loadWeakWords() {
  try {
    const raw = localStorage.getItem(WEAK_WORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveWeakWords(list) {
  try { localStorage.setItem(WEAK_WORDS_KEY, JSON.stringify(list)); } catch (e) {}
}

function isWeakWord(hanzi) {
  return loadWeakWords().some(w => w.hanzi === hanzi);
}

function escapeWeakWordHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function formatWeakWordLevel(levelKey) {
  if (!levelKey) return '';
  if (typeof homeShortLevelLabel === 'function') {
    return homeShortLevelLabel(levelKey);
  }
  const match30 = String(levelKey).match(/^hsk30_([1-9])$/);
  if (match30) return '3.0 L' + match30[1];
  const match20 = String(levelKey).match(/^hsk([1-6])$/i);
  if (match20) return 'HSK' + match20[1];
  return String(levelKey).toUpperCase();
}

function toggleWeakWord(hanziOrWord, level) {
  if (!hanziOrWord) return false;
  const hanzi = typeof hanziOrWord === 'object' ? hanziOrWord.hanzi : hanziOrWord;
  if (!hanzi) return false;

  const list = loadWeakWords();
  const existingIndex = list.findIndex(w => w.hanzi === hanzi);
  if (existingIndex >= 0) {
    list.splice(existingIndex, 1);
  } else {
    let wordObj = typeof hanziOrWord === 'object' ? { ...hanziOrWord } : {};
    if (typeof activeStudyWord !== 'undefined' && activeStudyWord && activeStudyWord.hanzi === hanzi) {
      wordObj = { ...activeStudyWord, ...wordObj };
    }
    const resolvedLevel = level || wordObj.level || (typeof currentLevel !== 'undefined' ? currentLevel : '') || '';
    list.unshift({
      hanzi,
      pinyin: wordObj.pinyin || '',
      meaning: wordObj.meaning || '',
      level: resolvedLevel,
      id: wordObj.id != null ? wordObj.id : '',
    });
  }
  saveWeakWords(list);
  renderWeakWordsList();
  updateWeakWordToggleButton();
  return existingIndex < 0; // true if now starred
}

function updateWeakWordToggleButton() {
  if (!activeStudyWord) return;
  const starred = isWeakWord(activeStudyWord.hanzi);
  const btn = document.getElementById('weakWordToggleBtn');
  if (btn) {
    const icon = document.getElementById('weakWordToggleIcon');
    if (icon) {
      icon.innerHTML = starred
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      btn.title = starred ? 'Bỏ đánh dấu từ khó' : 'Đánh dấu từ khó';
      btn.setAttribute('aria-label', starred ? 'Bỏ đánh dấu từ khó' : 'Đánh dấu từ khó');
    } else {
      btn.textContent = starred ? '★ Đã đánh dấu' : '☆ Đánh dấu từ khó';
    }
    btn.classList.toggle('active', starred);
  }
  const moreBtn = document.getElementById('cardMoreBtn');
  if (moreBtn) {
    moreBtn.classList.toggle('has-weak-word', starred);
    moreBtn.title = starred ? 'Từ khó đã đánh dấu · Tùy chọn khác' : 'Tùy chọn khác';
  }
  const weakLabel = document.getElementById('menuWeakText');
  const weakIcon = document.getElementById('menuWeakIcon');
  if (weakLabel) weakLabel.textContent = starred ? 'Bỏ đánh dấu từ khó' : 'Đánh dấu từ khó';
  if (weakIcon) weakIcon.textContent = starred ? '⭐' : '☆';
}

let isEnrichingWeakWords = false;
async function enrichMissingWeakWordMetadata(list) {
  if (isEnrichingWeakWords || !list.length) return;
  const needsEnrichment = list.some(w => !w.pinyin || !w.meaning);
  if (!needsEnrichment) return;

  isEnrichingWeakWords = true;
  try {
    let updated = false;
    for (const w of list) {
      if (w.pinyin && w.meaning) continue;

      if (typeof activeStudyWord !== 'undefined' && activeStudyWord && activeStudyWord.hanzi === w.hanzi) {
        w.pinyin = w.pinyin || activeStudyWord.pinyin || '';
        w.meaning = w.meaning || activeStudyWord.meaning || '';
        w.level = w.level || activeStudyWord.level || '';
        w.id = w.id || activeStudyWord.id || '';
        updated = true;
        continue;
      }

      if (typeof WORDS !== 'undefined' && Array.isArray(WORDS)) {
        const found = WORDS.find(item => item.hanzi === w.hanzi);
        if (found) {
          w.pinyin = w.pinyin || found.pinyin || '';
          w.meaning = w.meaning || found.meaning || '';
          w.level = w.level || (typeof currentLevel !== 'undefined' ? currentLevel : '');
          w.id = w.id || found.id || '';
          updated = true;
          continue;
        }
      }

      const levelKey = w.level || (typeof currentLevel !== 'undefined' ? currentLevel : 'hsk4');
      const cfg = typeof LEVELS !== 'undefined' ? LEVELS[levelKey] : null;
      if (cfg && cfg.dataUrl) {
        try {
          const res = await fetch(cfg.dataUrl);
          const data = await res.json();
          const match = data.find(item => item.hanzi === w.hanzi);
          if (match) {
            w.pinyin = w.pinyin || match.pinyin || '';
            w.meaning = w.meaning || match.meaning || '';
            w.level = w.level || levelKey;
            w.id = w.id || match.id || '';
            updated = true;
            continue;
          }
        } catch (e) {}
      }

      if (!w.pinyin && typeof buildSidebarSearchIndex === 'function') {
        try {
          const idx = await buildSidebarSearchIndex();
          const match = idx.find(item => item.hanzi === w.hanzi);
          if (match) {
            w.pinyin = w.pinyin || match.pinyin || '';
            w.meaning = w.meaning || match.meaning || '';
            w.level = w.level || match.levelKey || '';
            w.id = w.id || match.id || '';
            updated = true;
          }
        } catch (e) {}
      }
    }

    if (updated) {
      saveWeakWords(list);
      renderWeakWordsList();
    }
  } finally {
    isEnrichingWeakWords = false;
  }
}

function renderWeakWordsList() {
  const container = document.getElementById('weakWordsList');
  if (!container) return;
  const list = loadWeakWords();
  const panel = container.closest('.weak-words-panel');

  if (!list.length) {
    if (panel) panel.hidden = true;
    container.innerHTML = '';
    return;
  }
  if (panel) panel.hidden = false;

  const countEl = document.getElementById('weakWordsCount');
  if (countEl) {
    countEl.textContent = `${list.length} từ`;
  }

  container.innerHTML = list.map(w => {
    const hanziSafe = escapeWeakWordHtml(w.hanzi);
    const pinyinSafe = escapeWeakWordHtml(w.pinyin || '');
    const meaningSafe = escapeWeakWordHtml(w.meaning || '');
    const levelPill = w.level ? formatWeakWordLevel(w.level) : '';
    const levelSafe = escapeWeakWordHtml(w.level || '');
    const idSafe = escapeWeakWordHtml(w.id != null ? w.id : '');

    return `
      <li class="weak-word-row weak-word-item" data-hanzi="${hanziSafe}" data-level="${levelSafe}" data-id="${idSafe}">
        <button type="button" class="weak-word-open" aria-label="Học từ ${hanziSafe}${meaningSafe ? ': ' + meaningSafe : ''}">
          <span class="weak-word-hanzi" lang="zh-CN">${hanziSafe}</span>
          <span class="weak-word-text">
            <span class="weak-word-meta">
              <span class="weak-word-pinyin">${pinyinSafe}</span>
              ${levelPill ? `<span class="weak-word-level-pill">${escapeWeakWordHtml(levelPill)}</span>` : ''}
            </span>
            <span class="weak-word-meaning" title="${meaningSafe}">${meaningSafe}</span>
          </span>
        </button>
        <button type="button" class="weak-word-remove" data-remove="${hanziSafe}" aria-label="Bỏ đánh dấu ${hanziSafe}" title="Bỏ đánh dấu từ khó">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </li>
    `;
  }).join('');

  enrichMissingWeakWordMetadata(list);
  if (typeof renderQuickSavedWords === 'function') renderQuickSavedWords();
  if (typeof updateSavedBadgeCounts === 'function') updateSavedBadgeCounts(list.length);
  if (typeof updateReviewMobileAuxBadge === 'function') updateReviewMobileAuxBadge();
}

function initWeakWordsPanel() {
  const mount = document.body.classList.contains('is-desktop-dock')
    ? document.getElementById('workstationLeft')
    : document.getElementById('mobileDockDialogBody');
  if (!mount) return;

  const wrap = document.createElement('section');
  wrap.className = 'dashboard-sidebar-card weak-words-panel';
  wrap.id = 'weakWordsPanel';
  wrap.innerHTML = `
    <div class="sidebar-card-heading">
      <h2>Từ khó (đã đánh dấu)</h2>
      <span class="weak-words-count" id="weakWordsCount">0 từ</span>
    </div>
    <ul class="weak-words-list" id="weakWordsList"></ul>
  `;
  mount.appendChild(wrap);
  renderWeakWordsList();

  wrap.addEventListener('click', e => {
    const removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) {
      e.stopPropagation();
      const list = loadWeakWords().filter(w => w.hanzi !== removeBtn.dataset.remove);
      saveWeakWords(list);
      renderWeakWordsList();
      updateWeakWordToggleButton();
      return;
    }

    const row = e.target.closest('.weak-word-row');
    if (row) {
      const hanzi = row.dataset.hanzi;
      const level = row.dataset.level || (typeof currentLevel !== 'undefined' ? currentLevel : '');
      const id = row.dataset.id;
      const list = loadWeakWords();
      const word = list.find(w => w.hanzi === hanzi);

      const mobileDialog = document.getElementById('mobileDockDialog');
      if (mobileDialog && typeof mobileDialog.close === 'function' && mobileDialog.open) {
        mobileDialog.close();
      }

      if (typeof openWordInLevel === 'function' && level) {
        openWordInLevel(level, id || hanzi, true);
      } else if (typeof setActiveStudyWord === 'function') {
        setActiveStudyWord(word || { hanzi, pinyin: '', meaning: '' });
      }
    }
  });

  onActiveWordChange(updateWeakWordToggleButton);
}

document.addEventListener('DOMContentLoaded', initWeakWordsPanel);
