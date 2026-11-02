// Global search across HSK 1-6 with instant example sentences, rich previews,
// and direct one-click flashcard study navigation.
var sidebarSearchIndex = null;
var sidebarSearchIndexPromise = null;

const TONE_MARKS = {
  'ā':'a','á':'a','ǎ':'a','à':'a',
  'ē':'e','é':'e','ě':'e','è':'e',
  'ī':'i','í':'i','ǐ':'i','ì':'i',
  'ō':'o','ó':'o','ǒ':'o','ò':'o',
  'ū':'u','ú':'u','ǔ':'u','ù':'u',
  'ǖ':'v','ǘ':'v','ǚ':'v','ǜ':'v','ü':'v',
};

function stripTones(s) {
  return String(s || '').toLowerCase().replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, ch => TONE_MARKS[ch] || ch);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function formatSearchExample(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/&lt;u&gt;/gi, '<u>')
    .replace(/&lt;\/u&gt;/gi, '</u>');
}

function buildSidebarSearchIndex() {
  if (sidebarSearchIndexPromise) return sidebarSearchIndexPromise;
  const levelKeys = typeof hskLevelKeys === 'function' ? hskLevelKeys() : ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6'];
  sidebarSearchIndexPromise = Promise.all(
    levelKeys.map(key => {
      const cfg = LEVELS[key];
      if (!cfg || !cfg.dataUrl) return Promise.resolve([]);
      return fetch(cfg.dataUrl)
        .then(r => r.json())
        .then(words => words.map(w => ({
          id: w.id,
          hanzi: w.hanzi,
          pinyin: w.pinyin,
          meaning: w.meaning,
          hanviet: w.hanviet || '',
          example_zh: w.example_zh || w.example || '',
          example_py: w.example_py || '',
          example_vi: w.example_vi || '',
          levelKey: key,
          level: cfg.label,
          pinyinStripped: stripTones(w.pinyin),
          meaningLower: String(w.meaning || '').toLowerCase(),
        })))
        .catch(() => []);
    })
  ).then(lists => {
    sidebarSearchIndex = lists.flat();
    if (typeof window !== 'undefined') window.sidebarSearchIndex = sidebarSearchIndex;
    return sidebarSearchIndex;
  });
  return sidebarSearchIndexPromise;
}

function searchSidebarIndex(query) {
  const index = sidebarSearchIndex || (typeof window !== 'undefined' ? window.sidebarSearchIndex : null);
  if (!index || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const qNorm = typeof normalizeSearchText === 'function' ? normalizeSearchText(query) : stripTones(query);
  const qSpaceless = qNorm.replace(/[\s\-_'".]+/g, '');
  const qDigitsStripped = qSpaceless.replace(/[0-5]/g, '');

  const scored = [];
  for (const w of index) {
    let score = 0;
    const exactHanzi = w.hanzi === query.trim();
    const hanziMatch = w.hanzi && w.hanzi.includes(query.trim());

    const normPinyinV = typeof normalizeSearchText === 'function' ? normalizeSearchText(w.pinyin) : (w.pinyinStripped || '');
    const normPinyinU = typeof normalizeSearchText === 'function' ? normalizeSearchText(String(w.pinyin || '').replace(/[ǖǘǚǜü]/g, 'u')) : normPinyinV;
    const spacelessPinyinV = normPinyinV.replace(/[\s\-_'".]+/g, '');
    const spacelessPinyinU = normPinyinU.replace(/[\s\-_'".]+/g, '');

    const normHanviet = typeof normalizeSearchText === 'function' ? normalizeSearchText(w.hanviet) : '';
    const spacelessHanviet = normHanviet.replace(/[\s\-_'".]+/g, '');

    const normMeaning = typeof normalizeSearchText === 'function' ? normalizeSearchText(w.meaning) : (w.meaningLower || '');
    const rawMeaningLower = w.meaningLower || String(w.meaning || '').toLowerCase();

    // Hanzi scoring
    if (exactHanzi) score += 150;
    else if (hanziMatch) score += 80;

    // Pinyin scoring (supports tones, tone numbers, with/without spaces, ü/v/u)
    if (spacelessPinyinV === qSpaceless || spacelessPinyinU === qSpaceless) score += 100;
    else if (spacelessPinyinV === qDigitsStripped || spacelessPinyinU === qDigitsStripped) score += 95;
    else if (spacelessPinyinV.startsWith(qSpaceless) || spacelessPinyinU.startsWith(qSpaceless)) score += 60;
    else if (spacelessPinyinV.includes(qSpaceless) || spacelessPinyinU.includes(qSpaceless)) score += 40;
    else if (spacelessPinyinV.includes(qDigitsStripped) || spacelessPinyinU.includes(qDigitsStripped)) score += 35;

    // Han-Viet scoring
    if (normHanviet && (normHanviet === qNorm || spacelessHanviet === qSpaceless)) score += 80;
    else if (normHanviet && normHanviet.startsWith(qNorm)) score += 50;
    else if (normHanviet && (normHanviet.includes(qNorm) || spacelessHanviet.includes(qSpaceless))) score += 35;

    // Vietnamese Meaning scoring
    if (rawMeaningLower === q || (normMeaning && normMeaning === qNorm)) score += 90;
    else if (normMeaning && normMeaning.startsWith(qNorm)) score += 60;
    else if (rawMeaningLower.includes(q) || (normMeaning && normMeaning.includes(qNorm))) score += 35;

    // Word matcher fallback
    if (score === 0 && typeof wordMatchesQuery === 'function' && wordMatchesQuery(w, query)) {
      score += 20;
    }

    if (score > 0) {
      scored.push({ word: w, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 25).map(item => item.word);
}

function renderSidebarSearchResults(results, container) {
  if (!results.length) {
    container.innerHTML = '<div class="sidebar-search-empty">Không tìm thấy từ nào phù hợp.</div>';
    container.hidden = false;
    return;
  }

  container.innerHTML = results.map((w, idx) => {
    const hasExample = Boolean(w.example_zh || w.example_vi);
    return `
      <li class="sidebar-search-result" data-id="${w.id != null ? w.id : ''}" data-hanzi="${escapeHtml(w.hanzi)}" data-level="${w.levelKey}" data-index="${idx}" tabindex="0" role="option">
        <div class="ssr-head">
          <div class="ssr-title-group">
            <span class="ssr-hanzi">${escapeHtml(w.hanzi)}</span>
            <span class="ssr-pinyin">${escapeHtml(w.pinyin)}</span>
          </div>
          <span class="ssr-level-pill">${escapeHtml(w.level)}</span>
        </div>
        <div class="ssr-meaning">${escapeHtml(w.meaning)}</div>
        ${hasExample ? `
          <div class="ssr-example-snippet">
            <div class="ssr-example-zh">
              <span class="ssr-example-icon">📖</span>
              <span class="ssr-example-text">${formatSearchExample(w.example_zh)}</span>
            </div>
            ${w.example_vi ? `<div class="ssr-example-vi">${formatSearchExample(w.example_vi)}</div>` : ''}
          </div>
        ` : ''}
        <div class="ssr-footer-cta">
          <span>Học từ này trong ${escapeHtml(w.level)}</span>
          <span class="ssr-cta-arrow">→</span>
        </div>
      </li>
    `;
  }).join('');
  container.hidden = false;
}

let sidebarSearchDebounceTimer = null;
function onSidebarSearchInput(value, resultsEl) {
  clearTimeout(sidebarSearchDebounceTimer);
  if (!value.trim()) {
    resultsEl.hidden = true;
    resultsEl.innerHTML = '';
    return;
  }
  sidebarSearchDebounceTimer = setTimeout(() => {
    buildSidebarSearchIndex().then(() => {
      const results = searchSidebarIndex(value);
      if (!value.trim()) {
        resultsEl.hidden = true;
        resultsEl.innerHTML = '';
        return;
      }
      renderSidebarSearchResults(results, resultsEl);
    });
  }, 220);
}

function initSidebarSearch() {
  const mount = document.body.classList.contains('is-desktop-dock')
    ? document.getElementById('workstationLeft')
    : document.getElementById('mobileDockDialogBody');
  if (!mount) return;

  if (document.getElementById('sidebarSearchWrap')) return;

  const wrap = document.createElement('div');
  wrap.className = 'sidebar-search';
  wrap.id = 'sidebarSearchWrap';
  wrap.innerHTML = `
    <div class="sidebar-search-input-wrap">
      <input type="search" id="sidebarSearchInput" class="sidebar-search-input"
        placeholder="Tra từ (Hán tự, pinyin, nghĩa tiếng Việt)..." aria-label="Tìm từ vựng" autocomplete="off">
    </div>
    <ul id="sidebarSearchResults" class="sidebar-search-results" hidden role="listbox" aria-label="Kết quả tìm kiếm"></ul>
  `;

  // Always keep search at the very top of workstationLeft
  mount.prepend(wrap);

  const input = wrap.querySelector('#sidebarSearchInput');
  const results = wrap.querySelector('#sidebarSearchResults');

  input.addEventListener('input', () => onSidebarSearchInput(input.value, results));
  input.addEventListener('focus', () => {
    if (input.value.trim() && results.children.length > 0) {
      results.hidden = false;
    }
  });

  input.addEventListener('search', () => {
    if (!input.value.trim()) {
      results.hidden = true;
      results.innerHTML = '';
    }
  });

  // Preload illustration on hover over search result
  results.addEventListener('pointerover', e => {
    const li = e.target.closest('.sidebar-search-result');
    if (!li) return;
    const hanzi = li.dataset.hanzi;
    if (hanzi && typeof preloadSingleWordIllustration === 'function') {
      preloadSingleWordIllustration({ hanzi }, 'high');
    }
  }, { passive: true });

  // Handle click on result
  results.addEventListener('click', async e => {
    const li = e.target.closest('.sidebar-search-result');
    if (!li) return;
    const wordId = li.dataset.id;
    const hanzi = li.dataset.hanzi;
    const levelKey = li.dataset.level;
    const word = (sidebarSearchIndex && sidebarSearchIndex.find(w => (wordId && String(w.id) === String(wordId)) && (!levelKey || w.levelKey === levelKey))) ||
                 (sidebarSearchIndex && sidebarSearchIndex.find(w => w.hanzi === hanzi && (!levelKey || w.levelKey === levelKey))) ||
                 (sidebarSearchIndex && sidebarSearchIndex.find(w => w.hanzi === hanzi));
    if (!word) return;

    results.hidden = true;
    input.value = '';

    const mobileDialog = document.getElementById('mobileDockDialog');
    if (mobileDialog && typeof mobileDialog.close === 'function' && mobileDialog.open) {
      mobileDialog.close();
    }

    if (typeof openWordInLevel === 'function') {
      await openWordInLevel(word.levelKey, word.id || word.hanzi, true);
    }
  });

  // Handle keyboard navigation: ArrowDown, ArrowUp, Enter, Escape
  input.addEventListener('keydown', async e => {
    if (results.hidden) return;
    const items = Array.from(results.querySelectorAll('.sidebar-search-result'));
    if (!items.length) return;

    const currentFocus = results.querySelector('.sidebar-search-result.is-selected');
    let currentIndex = items.indexOf(currentFocus);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items.forEach(el => el.classList.remove('is-selected'));
      items[nextIndex].classList.add('is-selected');
      items[nextIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items.forEach(el => el.classList.remove('is-selected'));
      items[prevIndex].classList.add('is-selected');
      items[prevIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetItem = currentFocus || items[0];
      if (targetItem) {
        targetItem.click();
      }
    } else if (e.key === 'Escape') {
      results.hidden = true;
    }
  });

  // Close results when clicking outside
  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) {
      results.hidden = true;
    }
  });
}

function initMobileDockDialog() {
  const trigger = document.getElementById('headerSearchBtn');
  const dialog = document.getElementById('mobileDockDialog');
  const closeBtn = document.getElementById('mobileDockClose');
  if (!trigger || !dialog || !closeBtn) return;
  trigger.addEventListener('click', (e) => {
    if (typeof openQuickSearchModal === 'function') {
      e.preventDefault();
      openQuickSearchModal();
      return;
    }
    dialog.showModal();
    const input = document.getElementById('sidebarSearchInput');
    if (input) {
      setTimeout(() => input.focus(), 80);
    }
  });
  closeBtn.addEventListener('click', () => {
    dialog.close();
    trigger.focus();
  });
  dialog.addEventListener('close', () => {
    trigger.focus();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSidebarSearch();
  initMobileDockDialog();
  // Preload search index in idle time for instant results
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => buildSidebarSearchIndex());
  } else {
    setTimeout(buildSidebarSearchIndex, 1000);
  }
});
