// Quick Access Drawer and Header Quick Search Manager
// Follows modern educational flashcard UI/UX standards (Duolingo / Quizlet)

let quickDrawerCurrentTab = 'saved';
let quickUrgentItems = [];

// ---------------------------------------------------------------------------
// 1. Quick Access Drawer Controls
// ---------------------------------------------------------------------------

function openQuickAccessDrawer(tab) {
  const drawer = document.getElementById('quickAccessDrawer');
  if (!drawer) return;

  const targetTab = tab || 'saved';

  // Toggle if clicked badge of currently active and open tab
  if (drawer.classList.contains('is-open') && quickDrawerCurrentTab === targetTab) {
    closeQuickAccessDrawer();
    return;
  }

  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('quick-drawer-open');

  switchQuickDrawerTab(targetTab);

  // Update badge active states
  const savedBtn = document.getElementById('headerSavedWordsBtn');
  const urgentBtn = document.getElementById('headerUrgentReviewBtn');
  if (savedBtn) savedBtn.classList.toggle('is-active', targetTab === 'saved');
  if (urgentBtn) urgentBtn.classList.toggle('is-active', targetTab === 'urgent');

  // Refresh data on open
  if (targetTab === 'saved') {
    renderQuickSavedWords();
  }
}

function closeQuickAccessDrawer() {
  const drawer = document.getElementById('quickAccessDrawer');
  if (!drawer) return;

  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('quick-drawer-open');

  const savedBtn = document.getElementById('headerSavedWordsBtn');
  const urgentBtn = document.getElementById('headerUrgentReviewBtn');
  if (savedBtn) savedBtn.classList.remove('is-active');
  if (urgentBtn) urgentBtn.classList.remove('is-active');
}

function switchQuickDrawerTab(tab) {
  quickDrawerCurrentTab = tab;

  const tabSaved = document.getElementById('quickTabSaved');
  const tabUrgent = document.getElementById('quickTabUrgent');
  const paneSaved = document.getElementById('quickDrawerSavedPane');
  const paneUrgent = document.getElementById('quickDrawerUrgentPane');

  const isSaved = tab === 'saved';

  if (tabSaved) {
    tabSaved.classList.toggle('active', isSaved);
    tabSaved.setAttribute('aria-selected', isSaved ? 'true' : 'false');
  }
  if (tabUrgent) {
    tabUrgent.classList.toggle('active', !isSaved);
    tabUrgent.setAttribute('aria-selected', !isSaved ? 'true' : 'false');
  }

  if (paneSaved) paneSaved.hidden = !isSaved;
  if (paneUrgent) paneUrgent.hidden = isSaved;

  const savedBtn = document.getElementById('headerSavedWordsBtn');
  const urgentBtn = document.getElementById('headerUrgentReviewBtn');
  if (savedBtn) savedBtn.classList.toggle('is-active', isSaved);
  if (urgentBtn) urgentBtn.classList.toggle('is-active', !isSaved);

  if (isSaved) {
    renderQuickSavedWords();
  }
}

// ---------------------------------------------------------------------------
// 2. Saved Words Rendering & Audio
// ---------------------------------------------------------------------------

function renderQuickSavedWords() {
  const container = document.getElementById('quickSavedWordsList');
  const emptyState = document.getElementById('quickSavedEmpty');
  if (!container) return;

  const list = typeof loadWeakWords === 'function' ? loadWeakWords() : [];

  // Update badge counters
  updateSavedBadgeCounts(list.length);

  if (!list.length) {
    container.innerHTML = '';
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;

  container.innerHTML = list.map(w => {
    const hanziSafe = escapeHtml(w.hanzi);
    const pinyinSafe = escapeHtml(w.pinyin || '');
    const meaningSafe = escapeHtml(w.meaning || '');
    const levelKey = w.level || '';
    const levelPill = levelKey
      ? (typeof formatWeakWordLevel === 'function' ? formatWeakWordLevel(levelKey) : levelKey.toUpperCase())
      : '';
    const idSafe = escapeHtml(w.id != null ? String(w.id) : '');

    return `
      <li class="quick-word-item" data-hanzi="${hanziSafe}" data-level="${escapeHtml(levelKey)}" data-id="${idSafe}">
        <button type="button" class="quick-word-main" aria-label="Xem từ ${hanziSafe}">
          <span class="quick-word-hanzi" lang="zh-CN">${hanziSafe}</span>
          <span class="quick-word-info">
            <span class="quick-word-meta">
              <span class="quick-word-pinyin">${pinyinSafe}</span>
              ${levelPill ? `<span class="quick-word-level-pill">${escapeHtml(levelPill)}</span>` : ''}
            </span>
            <span class="quick-word-meaning" title="${meaningSafe}">${meaningSafe}</span>
          </span>
        </button>
        <div class="quick-word-actions">
          <button type="button" class="quick-word-speak-btn" data-speak="${hanziSafe}" aria-label="Nghe phát âm ${hanziSafe}" title="Phát âm">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          </button>
          <button type="button" class="quick-word-remove-btn" data-remove="${hanziSafe}" aria-label="Bỏ đánh dấu ${hanziSafe}" title="Bỏ đánh dấu">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </li>
    `;
  }).join('');
}

function updateSavedBadgeCounts(count) {
  const badge = document.getElementById('headerSavedCount');
  if (badge) badge.textContent = count;

  const tabBadge = document.getElementById('quickSavedTabCount');
  if (tabBadge) tabBadge.textContent = count;

  const mobBadge = document.getElementById('mobNotebookBadge');
  if (mobBadge) {
    mobBadge.textContent = count;
    mobBadge.hidden = count === 0;
  }
}

// ---------------------------------------------------------------------------
// 3. Urgent Review Words Rendering & Audio
// ---------------------------------------------------------------------------

function updateQuickUrgentWords(items) {
  quickUrgentItems = items || [];
  const count = quickUrgentItems.length;

  const headerBadge = document.getElementById('headerUrgentCount');
  if (headerBadge) headerBadge.textContent = count;

  const tabBadge = document.getElementById('quickUrgentTabCount');
  if (tabBadge) tabBadge.textContent = count;

  const container = document.getElementById('quickUrgentWordsList');
  const emptyState = document.getElementById('quickUrgentEmpty');
  const actionWrap = document.getElementById('quickUrgentActionWrap');
  const ctaBtn = document.getElementById('quickUrgentReviewBtn');

  if (!container) return;

  if (count === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.hidden = false;
    if (actionWrap) actionWrap.hidden = true;
    return;
  }

  if (emptyState) emptyState.hidden = true;
  if (actionWrap) actionWrap.hidden = false;

  if (ctaBtn) {
    ctaBtn.innerHTML = `<span>⚡ Ôn tập ngay (${count} từ)</span>`;
    ctaBtn.onclick = () => {
      closeQuickAccessDrawer();
      if (typeof openForgottenReview === 'function') {
        openForgottenReview(quickUrgentItems);
      }
    };
  }

  container.innerHTML = quickUrgentItems.map(item => {
    const word = item.word || {};
    const hanziSafe = escapeHtml(word.hanzi || '');
    const pinyinSafe = escapeHtml(word.pinyin || '');
    const meaningSafe = escapeHtml(word.meaning || '');
    const levelKey = item.level || '';
    const levelLabel = typeof homeShortLevelLabel === 'function' ? homeShortLevelLabel(levelKey) : levelKey.toUpperCase();
    const lapses = (item.card && item.card.lapses) ? `${item.card.lapses}×` : '1×';
    const idSafe = escapeHtml(String(word.id != null ? word.id : ''));

    return `
      <li class="quick-word-item" data-hanzi="${hanziSafe}" data-level="${escapeHtml(levelKey)}" data-id="${idSafe}">
        <button type="button" class="quick-word-main" aria-label="Ôn từ ${hanziSafe}">
          <span class="quick-word-hanzi" lang="zh-CN">${hanziSafe}</span>
          <span class="quick-word-info">
            <span class="quick-word-meta">
              <span class="quick-word-pinyin">${pinyinSafe}</span>
              <span class="quick-word-level-pill">${escapeHtml(levelLabel)}</span>
              <span class="quick-word-lapse-pill" title="Số lần quên: ${lapses}">${lapses}</span>
            </span>
            <span class="quick-word-meaning" title="${meaningSafe}">${meaningSafe}</span>
          </span>
        </button>
        <div class="quick-word-actions">
          <button type="button" class="quick-word-speak-btn" data-speak="${hanziSafe}" aria-label="Nghe phát âm ${hanziSafe}" title="Phát âm">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          </button>
        </div>
      </li>
    `;
  }).join('');
}

// ---------------------------------------------------------------------------
// 4. Quick Search Modal (Command Palette / Ctrl+K)
// ---------------------------------------------------------------------------

let quickSearchDebounceTimer = null;

function openQuickSearchModal(initialQuery) {
  const modal = document.getElementById('quickSearchModal');
  const input = document.getElementById('quickSearchInput');
  if (!modal || !input) return;

  if (typeof modal.showModal === 'function') {
    try {
      if (!modal.open) modal.showModal();
    } catch (e) {
      modal.setAttribute('open', '');
    }
  } else {
    modal.setAttribute('open', '');
  }

  document.body.classList.add('quick-search-open');

  if (initialQuery != null) {
    input.value = initialQuery;
    onQuickSearchInput(initialQuery);
  } else {
    // Show initial suggestions if empty
    toggleQuickSearchInitialState(!input.value.trim());
  }

  setTimeout(() => {
    input.focus();
    input.select();
  }, 60);
}

function closeQuickSearchModal() {
  const modal = document.getElementById('quickSearchModal');
  if (!modal) return;

  if (typeof modal.close === 'function') {
    try { modal.close(); } catch (e) { modal.removeAttribute('open'); }
  } else {
    modal.removeAttribute('open');
  }

  document.body.classList.remove('quick-search-open');
}

function setQuickSearchQuery(text) {
  const input = document.getElementById('quickSearchInput');
  if (input) {
    input.value = text;
    onQuickSearchInput(text);
    input.focus();
  }
}

function toggleQuickSearchInitialState(showInitial) {
  const initialEl = document.getElementById('quickSearchInitial');
  const resultsEl = document.getElementById('quickSearchResults');
  const emptyEl = document.getElementById('quickSearchEmpty');

  if (initialEl) initialEl.hidden = !showInitial;
  if (showInitial) {
    if (resultsEl) resultsEl.innerHTML = '';
    if (emptyEl) emptyEl.hidden = true;
  }
}

function onQuickSearchInput(value) {
  clearTimeout(quickSearchDebounceTimer);
  const val = String(value || '').trim();

  if (!val) {
    toggleQuickSearchInitialState(true);
    return;
  }

  toggleQuickSearchInitialState(false);

  quickSearchDebounceTimer = setTimeout(() => {
    if (typeof buildSidebarSearchIndex === 'function') {
      buildSidebarSearchIndex().then(() => {
        const results = typeof searchSidebarIndex === 'function' ? searchSidebarIndex(val) : [];
        renderQuickSearchResults(results);
      });
    }
  }, 120);
}

function renderQuickSearchResults(results) {
  const container = document.getElementById('quickSearchResults');
  const emptyEl = document.getElementById('quickSearchEmpty');
  if (!container) return;

  if (!results.length) {
    container.innerHTML = '';
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;

  container.innerHTML = results.map((w, idx) => {
    const hanziSafe = escapeHtml(w.hanzi);
    const pinyinSafe = escapeHtml(w.pinyin || '');
    const meaningSafe = escapeHtml(w.meaning || '');
    const levelSafe = escapeHtml(w.level || w.levelKey || '');
    const levelKeySafe = escapeHtml(w.levelKey || '');
    const hanvietSafe = w.hanviet ? escapeHtml(w.hanviet) : '';
    const idSafe = escapeHtml(w.id != null ? String(w.id) : '');

    return `
      <li class="qsm-result-item ${idx === 0 ? 'is-selected' : ''}" data-id="${idSafe}" data-hanzi="${hanziSafe}" data-level="${levelKeySafe}" tabindex="0" role="option">
        <div class="qsm-result-left">
          <span class="qsm-result-hanzi" lang="zh-CN">${hanziSafe}</span>
          <div class="qsm-result-info">
            <div class="qsm-result-meta">
              <span class="qsm-result-pinyin">${pinyinSafe}</span>
              ${hanvietSafe ? `<span class="qsm-result-hanviet">(${hanvietSafe})</span>` : ''}
              <span class="qsm-result-level">${levelSafe}</span>
            </div>
            <div class="qsm-result-meaning" title="${meaningSafe}">${meaningSafe}</div>
          </div>
        </div>
        <div class="qsm-result-actions">
          <button type="button" class="qsm-result-speak" data-speak="${hanziSafe}" aria-label="Nghe phát âm ${hanziSafe}" title="Phát âm">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          </button>
        </div>
      </li>
    `;
  }).join('');
}

// ---------------------------------------------------------------------------
// 5. Global Keyboard Shortcuts & Event Delegation
// ---------------------------------------------------------------------------

function initQuickAccessDrawerEvents() {
  // Update keyboard shortcut label for Mac vs Windows
  const isMac = typeof navigator !== 'undefined' && /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
  const modKeyEl = document.querySelector('.hqs-kbd-mod');
  if (modKeyEl) {
    modKeyEl.textContent = isMac ? '⌘' : 'Ctrl+';
  }

  // Header quick search trigger button
  const quickSearchBtn = document.getElementById('headerQuickSearchBtn');
  if (quickSearchBtn) {
    quickSearchBtn.addEventListener('click', () => openQuickSearchModal());
  }

  // Header search icon button
  const headerSearchBtn = document.getElementById('headerSearchBtn');
  if (headerSearchBtn) {
    headerSearchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openQuickSearchModal();
    });
  }

  // Search input typing
  const searchInput = document.getElementById('quickSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => onQuickSearchInput(e.target.value));
  }

  // Quick Search Dialog Close Event
  const searchModal = document.getElementById('quickSearchModal');
  if (searchModal) {
    searchModal.addEventListener('close', () => {
      document.body.classList.remove('quick-search-open');
    });
    // Click outside modal container closes dialog
    searchModal.addEventListener('click', (e) => {
      const container = e.target.closest('.qsm-container');
      if (!container && searchModal.open) {
        closeQuickSearchModal();
      }
    });
  }

  // Keyboard navigation inside search results
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      const resultsEl = document.getElementById('quickSearchResults');
      if (!resultsEl) return;
      const items = Array.from(resultsEl.querySelectorAll('.qsm-result-item'));
      if (!items.length) return;

      const current = resultsEl.querySelector('.qsm-result-item.is-selected');
      let idx = items.indexOf(current);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = idx < items.length - 1 ? idx + 1 : 0;
        items.forEach(el => el.classList.remove('is-selected'));
        items[next].classList.add('is-selected');
        items[next].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = idx > 0 ? idx - 1 : items.length - 1;
        items.forEach(el => el.classList.remove('is-selected'));
        items[prev].classList.add('is-selected');
        items[prev].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = current || items[0];
        if (target) {
          const hanzi = target.dataset.hanzi;
          const levelKey = target.dataset.level;
          const id = target.dataset.id;
          closeQuickSearchModal();
          if (typeof openWordInLevel === 'function' && levelKey) {
            openWordInLevel(levelKey, id || hanzi, true);
          }
        }
      }
    });
  }

  // Click on search result item or speaker
  const searchResultsEl = document.getElementById('quickSearchResults');
  if (searchResultsEl) {
    searchResultsEl.addEventListener('click', (e) => {
      const speakBtn = e.target.closest('[data-speak]');
      if (speakBtn) {
        e.stopPropagation();
        const text = speakBtn.dataset.speak;
        if (typeof speakText === 'function') {
          speakText(text, speakBtn, typeof SPEECH_RATE !== 'undefined' ? SPEECH_RATE : 0.85);
        }
        return;
      }

      const item = e.target.closest('.qsm-result-item');
      if (item) {
        const hanzi = item.dataset.hanzi;
        const levelKey = item.dataset.level;
        const id = item.dataset.id;
        closeQuickSearchModal();
        if (typeof openWordInLevel === 'function' && levelKey) {
          openWordInLevel(levelKey, id || hanzi, true);
        }
      }
    });
  }

  // Click on drawer word items (open, remove, speak)
  const drawerPanel = document.querySelector('.quick-drawer-panel');
  if (drawerPanel) {
    drawerPanel.addEventListener('click', (e) => {
      // Audio speak button
      const speakBtn = e.target.closest('[data-speak]');
      if (speakBtn) {
        e.stopPropagation();
        const text = speakBtn.dataset.speak;
        if (typeof speakText === 'function') {
          speakText(text, speakBtn, typeof SPEECH_RATE !== 'undefined' ? SPEECH_RATE : 0.85);
        }
        return;
      }

      // Remove from saved words
      const removeBtn = e.target.closest('[data-remove]');
      if (removeBtn) {
        e.stopPropagation();
        const hanzi = removeBtn.dataset.remove;
        if (typeof loadWeakWords === 'function' && typeof saveWeakWords === 'function') {
          const list = loadWeakWords().filter(w => w.hanzi !== hanzi);
          saveWeakWords(list);
          renderQuickSavedWords();
          if (typeof renderWeakWordsList === 'function') renderWeakWordsList();
          if (typeof updateWeakWordToggleButton === 'function') updateWeakWordToggleButton();
        }
        return;
      }

      // Click word to open in level flashcards
      const wordBtn = e.target.closest('.quick-word-main');
      if (wordBtn) {
        const item = wordBtn.closest('.quick-word-item');
        if (!item) return;
        const hanzi = item.dataset.hanzi;
        const level = item.dataset.level || (typeof currentLevel !== 'undefined' ? currentLevel : '');
        const id = item.dataset.id;

        closeQuickAccessDrawer();

        if (typeof openWordInLevel === 'function' && level) {
          openWordInLevel(level, id || hanzi, true);
        } else if (typeof setActiveStudyWord === 'function') {
          setActiveStudyWord({ hanzi, pinyin: '', meaning: '' });
        }
      }
    });
  }

  // Global keydown listeners: Ctrl+K / Cmd+K, Slash (/), Escape
  document.addEventListener('keydown', (e) => {
    // Ctrl+K or Cmd+K: Toggle Quick Search Modal
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const modal = document.getElementById('quickSearchModal');
      if (modal && modal.open) {
        closeQuickSearchModal();
      } else {
        openQuickSearchModal();
      }
      return;
    }

    // Slash (/): Open Quick Search Modal if not inside an input/textarea
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInput = activeTag === 'input' || activeTag === 'textarea' || document.activeElement.isContentEditable;
      if (!isInput) {
        e.preventDefault();
        openQuickSearchModal();
        return;
      }
    }

    // Escape: Close Quick Search Modal or Quick Access Drawer
    if (e.key === 'Escape') {
      const modal = document.getElementById('quickSearchModal');
      if (modal && modal.open) {
        closeQuickSearchModal();
        return;
      }
      const drawer = document.getElementById('quickAccessDrawer');
      if (drawer && drawer.classList.contains('is-open')) {
        closeQuickAccessDrawer();
        return;
      }
    }
  });

  // Initial badge update
  if (typeof loadWeakWords === 'function') {
    const list = loadWeakWords();
    updateSavedBadgeCounts(list.length);
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initQuickAccessDrawerEvents);
