// Dictionary search over the HSK 3.0 database (levels 1-9): the shared search index used by the
// quick-search palette, speed quiz and weak words, and the search box at the top of the dock.
// Preact port of the former assets/js/sidebar-search.js; scoring is unchanged.
import { render } from 'preact';
import { signal } from '@preact/signals';
import { onDomReady } from './domReady';

/* global LEVELS -- levels.js */

let sidebarSearchIndex = null;
let sidebarSearchIndexPromise = null;

const HSK30_SEARCH_LEVEL_KEYS = ['hsk30_1', 'hsk30_2', 'hsk30_3', 'hsk30_4', 'hsk30_5', 'hsk30_6', 'hsk30_7', 'hsk30_8', 'hsk30_9'];

// Search always reads the HSK 3.0 database. Levels 7-9 share one vocabulary list
// (sharedVocabularyGroup), so it is fetched once and labelled with the shared range.
function hsk30SearchSources() {
  const levelKeys = typeof window.hsk30LevelKeys === 'function' ? window.hsk30LevelKeys() : HSK30_SEARCH_LEVEL_KEYS;
  const sources = new Map();
  for (const key of levelKeys) {
    const cfg = LEVELS[key];
    if (!cfg || !cfg.dataUrl) continue;
    const groupKey = cfg.sharedVocabularyGroup || cfg.dataUrl;
    if (!sources.has(groupKey)) {
      const label = cfg.sharedVocabularyGroup ? `HSK 3.0 – ${cfg.sharedVocabularyGroup}` : cfg.label;
      sources.set(groupKey, { key, dataUrl: cfg.dataUrl, label });
    }
  }
  return Array.from(sources.values());
}

export function buildSidebarSearchIndex() {
  if (sidebarSearchIndexPromise) return sidebarSearchIndexPromise;
  sidebarSearchIndexPromise = Promise.all(
    hsk30SearchSources().map(src => {
      return window.fetchLevelWords(src.key)
        .then(words => words.map(w => ({
          id: w.id,
          hanzi: w.hanzi,
          pinyin: w.pinyin,
          meaning: w.meaning,
          hanviet: w.hanviet || '',
          example_zh: w.example_zh || w.example || '',
          example_py: w.example_py || '',
          example_vi: w.example_vi || '',
          levelKey: src.key,
          level: src.label,
          pinyinStripped: window.stripPinyinTones(w.pinyin),
          meaningLower: String(w.meaning || '').toLowerCase(),
        })))
        .catch(() => []);
    })
  ).then(lists => {
    sidebarSearchIndex = lists.flat();
    window.sidebarSearchIndex = sidebarSearchIndex;
    return sidebarSearchIndex;
  });
  return sidebarSearchIndexPromise;
}

export function searchSidebarIndex(query) {
  const index = sidebarSearchIndex || window.sidebarSearchIndex;
  if (!index || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const qNorm = typeof window.normalizeSearchText === 'function' ? window.normalizeSearchText(query) : window.stripPinyinTones(query);
  const qSpaceless = qNorm.replace(/[\s\-_'".]+/g, '');
  const qDigitsStripped = qSpaceless.replace(/[0-5]/g, '');

  const scored = [];
  for (const w of index) {
    let score = 0;
    const exactHanzi = w.hanzi === query.trim();
    const hanziMatch = w.hanzi && w.hanzi.includes(query.trim());

    const normPinyinV = typeof window.normalizeSearchText === 'function' ? window.normalizeSearchText(w.pinyin) : (w.pinyinStripped || '');
    const normPinyinU = typeof window.normalizeSearchText === 'function' ? window.normalizeSearchText(String(w.pinyin || '').replace(/[ǖǘǚǜü]/g, 'u')) : normPinyinV;
    const spacelessPinyinV = normPinyinV.replace(/[\s\-_'".]+/g, '');
    const spacelessPinyinU = normPinyinU.replace(/[\s\-_'".]+/g, '');

    const normHanviet = typeof window.normalizeSearchText === 'function' ? window.normalizeSearchText(w.hanviet) : '';
    const spacelessHanviet = normHanviet.replace(/[\s\-_'".]+/g, '');

    const normMeaning = typeof window.normalizeSearchText === 'function' ? window.normalizeSearchText(w.meaning) : (w.meaningLower || '');
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
    if (score === 0 && typeof window.wordMatchesQuery === 'function' && window.wordMatchesQuery(w, query)) {
      score += 20;
    }

    if (score > 0) {
      scored.push({ word: w, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 25).map(item => item.word);
}

const results = signal([]);
const resultsHidden = signal(true);
const selectedIdx = signal(-1); // nothing selected until ↑ / ↓

// Example sentences may underline the word with <u>…</u>; everything else is escaped.
function formatSearchExample(text) {
  if (!text) return '';
  return window.escapeHtml(text).replace(/&lt;u&gt;/gi, '<u>').replace(/&lt;\/u&gt;/gi, '</u>');
}

let wrapEl = null;
let inputEl = null;
let debounceTimer = null;

function hideResults(clear) {
  resultsHidden.value = true;
  if (clear) results.value = [];
}

function onInput() {
  clearTimeout(debounceTimer);
  const value = inputEl.value;
  if (!value.trim()) {
    hideResults(true);
    return;
  }
  debounceTimer = setTimeout(() => {
    buildSidebarSearchIndex().then(() => {
      const found = searchSidebarIndex(value);
      if (!inputEl.value.trim() && !value.trim()) {
        hideResults(true);
        return;
      }
      selectedIdx.value = -1;
      results.value = found;
      resultsHidden.value = false;
    });
  }, 220);
}

async function openResult(w) {
  const word = (sidebarSearchIndex && sidebarSearchIndex.find((x) => (w.id != null && w.id !== '' && String(x.id) === String(w.id)) && (!w.levelKey || x.levelKey === w.levelKey)))
    || (sidebarSearchIndex && sidebarSearchIndex.find((x) => x.hanzi === w.hanzi && (!w.levelKey || x.levelKey === w.levelKey)))
    || (sidebarSearchIndex && sidebarSearchIndex.find((x) => x.hanzi === w.hanzi));
  if (!word) return;
  resultsHidden.value = true;
  inputEl.value = '';
  const mobileDialog = document.getElementById('mobileDockDialog');
  if (mobileDialog && typeof mobileDialog.close === 'function' && mobileDialog.open) mobileDialog.close();
  if (typeof window.openWordInLevel === 'function') await window.openWordInLevel(word.levelKey, word.id || word.hanzi, true);
}

function onKeydown(e) {
  const list = results.value;
  if (resultsHidden.value || !list.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const n = list.length;
    const cur = selectedIdx.value;
    selectedIdx.value = e.key === 'ArrowDown' ? (cur < n - 1 ? cur + 1 : 0) : (cur > 0 ? cur - 1 : n - 1);
    Promise.resolve().then(() => {
      const el = wrapEl.querySelector('.sidebar-search-result.is-selected');
      if (el) el.scrollIntoView({ block: 'nearest' });
    });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    openResult(list[selectedIdx.value] || list[0]);
  } else if (e.key === 'Escape') {
    resultsHidden.value = true;
  }
}

const preload = (hanzi) => {
  if (hanzi && typeof window.preloadSingleWordIllustration === 'function') window.preloadSingleWordIllustration({ hanzi }, 'high');
};

function SearchResult({ w, idx }) {
  const hasExample = Boolean(w.example_zh || w.example_vi);
  return (
    <li class={idx === selectedIdx.value ? 'sidebar-search-result is-selected' : 'sidebar-search-result'} data-id={w.id != null ? w.id : ''} data-hanzi={w.hanzi}
      data-level={w.levelKey} data-index={idx} tabindex="0" role="option" onClick={() => openResult(w)} onPointerOver={() => preload(w.hanzi)}>
      <div class="ssr-head">
        <div class="ssr-title-group">
          <span class="ssr-hanzi">{w.hanzi}</span>{' '}
          <span class="ssr-pinyin">{w.pinyin}</span>
        </div>{' '}
        <span class="ssr-level-pill">{w.level}</span>
      </div>{' '}
      <div class="ssr-meaning">{w.meaning}</div>{' '}
      {hasExample && (
        <div class="ssr-example-snippet">
          <div class="ssr-example-zh">
            <span class="ssr-example-icon">📖</span>{' '}
            <span class="ssr-example-text" dangerouslySetInnerHTML={{ __html: formatSearchExample(w.example_zh) }} />
          </div>{' '}
          {w.example_vi ? <div class="ssr-example-vi" dangerouslySetInnerHTML={{ __html: formatSearchExample(w.example_vi) }} /> : null}
        </div>
      )}{' '}
      <div class="ssr-footer-cta">
        <span>{`Học từ này trong ${w.level}`}</span>{' '}
        <span class="ssr-cta-arrow">→</span>
      </div>
    </li>
  );
}

function SidebarSearch() {
  const list = results.value;
  return (
    <>
      <div class="sidebar-search-input-wrap">
        <input ref={(el) => { inputEl = el; }} type="search" id="sidebarSearchInput" class="sidebar-search-input"
          placeholder="Tra từ (Hán tự, pinyin, nghĩa tiếng Việt)..." aria-label="Tìm từ vựng" autocomplete="off"
          onInput={onInput} onKeyDown={onKeydown}
          onFocus={() => { if (inputEl.value.trim() && results.value.length > 0) resultsHidden.value = false; }}
          onSearch={() => { if (!inputEl.value.trim()) hideResults(true); }} />
      </div>{' '}
      <ul id="sidebarSearchResults" class="sidebar-search-results" hidden={resultsHidden.value} role="listbox" aria-label="Kết quả tìm kiếm">
        {inputEl && inputEl.value.trim() && list.length === 0 && !resultsHidden.value
          ? <div class="sidebar-search-empty">Không tìm thấy từ nào phù hợp.</div>
          : list.map((w, idx) => <SearchResult key={`${w.levelKey}-${w.id}-${w.hanzi}`} w={w} idx={idx} />)}
      </ul>
    </>
  );
}

function initSidebarSearch() {
  const mount = document.body.classList.contains('is-desktop-dock')
    ? document.getElementById('workstationLeft')
    : document.getElementById('mobileDockDialogBody');
  if (!mount || document.getElementById('sidebarSearchWrap')) return;
  wrapEl = document.createElement('div');
  wrapEl.className = 'sidebar-search';
  wrapEl.id = 'sidebarSearchWrap';
  mount.prepend(wrapEl); // always at the very top of the dock
  render(<SidebarSearch />, wrapEl);
  // Clicking elsewhere hides the results
  document.addEventListener('click', (e) => {
    if (!wrapEl.contains(e.target)) resultsHidden.value = true;
  });
}

function initMobileDockDialog() {
  const trigger = document.getElementById('headerSearchBtn');
  const dialog = document.getElementById('mobileDockDialog');
  const closeBtn = document.getElementById('mobileDockClose');
  if (!trigger || !dialog || !closeBtn) return;
  trigger.addEventListener('click', (e) => {
    if (typeof window.openQuickSearchModal === 'function') {
      e.preventDefault();
      window.openQuickSearchModal();
      return;
    }
    dialog.showModal();
    const input = document.getElementById('sidebarSearchInput');
    if (input) setTimeout(() => input.focus(), 80);
  });
  closeBtn.addEventListener('click', () => {
    dialog.close();
    trigger.focus();
  });
  dialog.addEventListener('close', () => trigger.focus());
}

export function mountSidebarSearch() {
  window.sidebarSearchIndex = null;
  Object.assign(window, { buildSidebarSearchIndex, searchSidebarIndex });
  onDomReady(() => {
    initSidebarSearch();
    initMobileDockDialog();
    // Build the index in idle time so the first search is instant
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => buildSidebarSearchIndex());
    else setTimeout(buildSidebarSearchIndex, 1000);
  });
}
