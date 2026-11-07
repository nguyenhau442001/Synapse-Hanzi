// Quick access drawer ("Từ khó" / "Cần ôn gấp") and the header quick-search palette (Ctrl+K, /).
// Preact port of the former assets/js/quick-access-drawer.js. index.html keeps the
// <aside id="quickAccessDrawer"> and <dialog id="quickSearchModal"> elements; their contents render
// here with the same markup. The header and mobile badges belong to the legacy markup and are
// still updated directly.
import { render } from 'preact';
import { signal } from '@preact/signals';
import { onDomReady } from './domReady';

/* global SPEECH_RATE, currentLevel -- classic-script globals */

const drawerOpen = signal(false);
const drawerTab = signal('saved');           // 'saved' | 'urgent'
const savedWords = signal(null);             // null until first rendered (empty state hidden until then)
const savedCount = signal(0);
const urgentItems = signal(null);            // null until home widgets report them
const searchQuery = signal('');
const searchResults = signal(null);          // null = initial suggestions; [] = no match
const selectedIdx = signal(0);

let drawerEl = null;
let modalEl = null;
let inputEl = null;
let searchTimer = null;

const speakerSvg = (size) => ({ __html: window.speakerIconSvg(size) });

function speak(text, btn) {
  if (typeof window.speakText === 'function') window.speakText(text, btn, typeof SPEECH_RATE !== 'undefined' ? SPEECH_RATE : 0.85);
}

function setHeaderBadgeActive(tab) {
  const savedBtn = document.getElementById('headerSavedWordsBtn');
  const urgentBtn = document.getElementById('headerUrgentReviewBtn');
  if (savedBtn) savedBtn.classList.toggle('is-active', tab === 'saved');
  if (urgentBtn) urgentBtn.classList.toggle('is-active', tab === 'urgent');
}

// ---- Drawer ------------------------------------------------------------------------------------
export function openQuickAccessDrawer(tab) {
  if (!drawerEl) return;
  const targetTab = tab || 'saved';
  // Clicking the badge of the tab that is already open closes the drawer
  if (drawerOpen.value && drawerTab.value === targetTab) {
    closeQuickAccessDrawer();
    return;
  }
  drawerOpen.value = true;
  drawerEl.classList.add('is-open');
  drawerEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('quick-drawer-open');
  switchQuickDrawerTab(targetTab);
}

export function closeQuickAccessDrawer() {
  if (!drawerEl) return;
  drawerOpen.value = false;
  drawerEl.classList.remove('is-open');
  drawerEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('quick-drawer-open');
  setHeaderBadgeActive(null);
}

export function switchQuickDrawerTab(tab) {
  drawerTab.value = tab;
  setHeaderBadgeActive(tab === 'saved' ? 'saved' : 'urgent');
  if (tab === 'saved') renderQuickSavedWords();
}

export function updateSavedBadgeCounts(count) {
  savedCount.value = count;
  const badge = document.getElementById('headerSavedCount');
  if (badge) badge.textContent = count;
  const mobBadge = document.getElementById('mobNotebookBadge');
  if (mobBadge) {
    mobBadge.textContent = count;
    mobBadge.hidden = count === 0;
  }
}

export function renderQuickSavedWords() {
  const list = typeof window.loadWeakWords === 'function' ? window.loadWeakWords() : [];
  updateSavedBadgeCounts(list.length);
  savedWords.value = list;
}

export function updateQuickUrgentWords(items) {
  urgentItems.value = items || [];
  const headerBadge = document.getElementById('headerUrgentCount');
  if (headerBadge) headerBadge.textContent = urgentItems.value.length;
}

function openWord(level, idOrHanzi, hanzi) {
  if (typeof window.openWordInLevel === 'function' && level) window.openWordInLevel(level, idOrHanzi, true);
  else if (typeof window.setActiveStudyWord === 'function') window.setActiveStudyWord({ hanzi, pinyin: '', meaning: '' });
}

function removeSavedWord(hanzi) {
  if (typeof window.loadWeakWords !== 'function' || typeof window.saveWeakWords !== 'function') return;
  window.saveWeakWords(window.loadWeakWords().filter((w) => w.hanzi !== hanzi));
  renderQuickSavedWords();
  if (typeof window.renderWeakWordsList === 'function') window.renderWeakWordsList();
  if (typeof window.updateWeakWordToggleButton === 'function') window.updateWeakWordToggleButton();
}

// One row of the saved/urgent word lists.
function QuickWordItem({ word, levelKey, verb, pills, removable }) {
  const hanzi = word.hanzi || '';
  const meaning = word.meaning || '';
  const open = () => {
    closeQuickAccessDrawer();
    openWord(levelKey || (typeof currentLevel !== 'undefined' ? currentLevel : ''), (word.id != null && word.id !== '' ? String(word.id) : '') || hanzi, hanzi);
  };
  return (
    <li class="quick-word-item" data-hanzi={hanzi} data-level={levelKey} data-id={word.id != null ? String(word.id) : ''}>
      <button type="button" class="quick-word-main" aria-label={`${verb} ${hanzi}`} onClick={open}>
        <span class="quick-word-hanzi" lang="zh-CN">{hanzi}</span>{' '}
        <span class="quick-word-info">
          <span class="quick-word-meta">
            <span class="quick-word-pinyin">{word.pinyin || ''}</span>{' '}
            {pills}
          </span>{' '}
          <span class="quick-word-meaning" title={meaning}>{meaning}</span>
        </span>
      </button>{' '}
      <div class="quick-word-actions">
        <button type="button" class="quick-word-speak-btn" data-speak={hanzi} aria-label={`Nghe phát âm ${hanzi}`} title="Phát âm"
          onClick={(e) => { e.stopPropagation(); speak(hanzi, e.currentTarget); }} dangerouslySetInnerHTML={speakerSvg(16)} />
        {removable && <>{' '}
          <button type="button" class="quick-word-remove-btn" data-remove={hanzi} aria-label={`Bỏ đánh dấu ${hanzi}`} title="Bỏ đánh dấu"
            onClick={(e) => { e.stopPropagation(); removeSavedWord(hanzi); }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </>}
      </div>
    </li>
  );
}

function levelPillLabel(levelKey) {
  if (!levelKey) return '';
  return typeof window.formatWeakWordLevel === 'function' ? window.formatWeakWordLevel(levelKey) : levelKey.toUpperCase();
}

function SavedPane() {
  const list = savedWords.value;
  return (
    <div id="quickDrawerSavedPane" class="quick-drawer-pane active" hidden={drawerTab.value !== 'saved'}>
      <div class="quick-pane-intro">
        <span class="quick-pane-title">Sổ từ khó đã lưu</span>{' '}
        <span class="quick-pane-subtitle">Học &amp; nghe phát âm</span>
      </div>{' '}
      <ul class="quick-word-list" id="quickSavedWordsList">
        {(list || []).map((w) => {
          const pill = levelPillLabel(w.level || '');
          return <QuickWordItem key={w.hanzi} word={w} levelKey={w.level || ''} verb="Xem từ" removable
            pills={pill ? <span class="quick-word-level-pill">{pill}</span> : null} />;
        })}
      </ul>{' '}
      <div id="quickSavedEmpty" class="quick-drawer-empty" hidden={!(list && list.length === 0)}>
        <span class="quick-empty-icon" aria-hidden="true">🔖</span>{' '}
        <div class="quick-empty-title">Chưa có từ khó nào</div>{' '}
        <div class="quick-empty-desc">Nhấn biểu tượng dấu sao ⭐ khi học từ để lưu vào sổ từ xem lại nhanh tại đây.</div>
      </div>
    </div>
  );
}

function UrgentPane() {
  const items = urgentItems.value;
  const count = items ? items.length : 0;
  const review = () => {
    closeQuickAccessDrawer();
    if (typeof window.openForgottenReview === 'function') window.openForgottenReview(items);
  };
  return (
    <div id="quickDrawerUrgentPane" class="quick-drawer-pane" hidden={drawerTab.value !== 'urgent'}>
      <div class="quick-pane-intro">
        <span class="quick-pane-title">Từ vựng hay nhầm lẫn</span>{' '}
        <span class="quick-pane-subtitle">Dựa trên thuật toán SRS</span>
      </div>{' '}
      <ul class="quick-word-list" id="quickUrgentWordsList">
        {(items || []).map((item, i) => {
          const levelKey = item.level || '';
          const levelLabel = typeof window.homeShortLevelLabel === 'function' ? window.homeShortLevelLabel(levelKey) : levelKey.toUpperCase();
          const lapses = (item.card && item.card.lapses) ? `${item.card.lapses}×` : '1×';
          return <QuickWordItem key={i} word={item.word || {}} levelKey={levelKey} verb="Ôn từ" removable={false}
            pills={<><span class="quick-word-level-pill">{levelLabel}</span>{' '}<span class="quick-word-lapse-pill" title={`Số lần quên: ${lapses}`}>{lapses}</span></>} />;
        })}
      </ul>{' '}
      <div id="quickUrgentEmpty" class="quick-drawer-empty" hidden={!(items && count === 0)}>
        <span class="quick-empty-icon" aria-hidden="true">✨</span>{' '}
        <div class="quick-empty-title">Không có từ cần ôn gấp</div>{' '}
        <div class="quick-empty-desc">Trí nhớ của bạn đang rất tốt! Hãy tiếp tục duy trì chuỗi học tập nhé.</div>
      </div>{' '}
      <div id="quickUrgentActionWrap" class="quick-drawer-action-wrap" hidden={!(items && count > 0)}>
        <button type="button" id="quickUrgentReviewBtn" class="quick-urgent-cta-btn" onClick={count > 0 ? review : undefined}>
          <span>{count > 0 ? `⚡ Ôn tập ngay (${count} từ)` : '⚡ Ôn tập ngay'}</span>
        </button>
      </div>
    </div>
  );
}

function DrawerTab({ id, tab, icon, label, countId, count }) {
  const active = drawerTab.value === tab;
  return (
    <button type="button" id={id} class={active ? 'quick-drawer-tab active' : 'quick-drawer-tab'} role="tab" aria-selected={active ? 'true' : 'false'} onClick={() => switchQuickDrawerTab(tab)}>
      <span class="quick-tab-icon" aria-hidden="true">{icon}</span>{' '}
      <span>{`${label} (`}<strong id={countId}>{count}</strong>)</span>
    </button>
  );
}

function Drawer() {
  return (
    <>
      <div class="quick-drawer-backdrop" id="quickDrawerBackdrop" onClick={closeQuickAccessDrawer}></div>{' '}
      <div class="quick-drawer-panel" role="dialog" aria-modal="true" aria-label="Bảng tra cứu nhanh">
        <div class="quick-drawer-header">
          <div class="quick-drawer-tabs" role="tablist" aria-label="Chọn danh sách">
            <DrawerTab id="quickTabSaved" tab="saved" icon="🔖" label="Từ khó" countId="quickSavedTabCount" count={savedCount.value} />{' '}
            <DrawerTab id="quickTabUrgent" tab="urgent" icon="⚡" label="Cần ôn gấp" countId="quickUrgentTabCount" count={urgentItems.value ? urgentItems.value.length : 0} />
          </div>{' '}
          <button type="button" id="quickDrawerCloseBtn" class="quick-drawer-close" onClick={closeQuickAccessDrawer} aria-label="Đóng bảng">✕</button>
        </div>{' '}
        <div class="quick-drawer-body">
          <SavedPane />{' '}
          <UrgentPane />
        </div>
      </div>
    </>
  );
}

// ---- Quick search palette ------------------------------------------------------------------------
export function openQuickSearchModal(initialQuery) {
  if (!modalEl || !inputEl) return;
  if (typeof modalEl.showModal === 'function') {
    try { if (!modalEl.open) modalEl.showModal(); } catch (e) { modalEl.setAttribute('open', ''); }
  } else {
    modalEl.setAttribute('open', '');
  }
  document.body.classList.add('quick-search-open');
  if (initialQuery != null) {
    inputEl.value = initialQuery;
    onQuickSearchInput(initialQuery);
  } else if (!inputEl.value.trim()) {
    showInitialSuggestions();
  }
  setTimeout(() => {
    inputEl.focus();
    inputEl.select();
  }, 60);
}

export function closeQuickSearchModal() {
  if (!modalEl) return;
  if (typeof modalEl.close === 'function') {
    try { modalEl.close(); } catch (e) { modalEl.removeAttribute('open'); }
  } else {
    modalEl.removeAttribute('open');
  }
  document.body.classList.remove('quick-search-open');
}

export function setQuickSearchQuery(text) {
  if (!inputEl) return;
  inputEl.value = text;
  onQuickSearchInput(text);
  inputEl.focus();
}

function showInitialSuggestions() {
  searchQuery.value = '';
  searchResults.value = null;
}

function onQuickSearchInput(value) {
  clearTimeout(searchTimer);
  const val = String(value || '').trim();
  if (!val) {
    showInitialSuggestions();
    return;
  }
  searchQuery.value = val;
  searchTimer = setTimeout(() => {
    if (typeof window.buildSidebarSearchIndex !== 'function') return;
    window.buildSidebarSearchIndex().then(() => {
      selectedIdx.value = 0;
      searchResults.value = typeof window.searchSidebarIndex === 'function' ? window.searchSidebarIndex(val) : [];
    });
  }, 120);
}

function openSearchResult(w) {
  closeQuickSearchModal();
  if (typeof window.openWordInLevel === 'function' && w.levelKey) {
    window.openWordInLevel(w.levelKey, (w.id != null ? String(w.id) : '') || w.hanzi, true);
  }
}

function onSearchKeydown(e) {
  const results = searchResults.value;
  if (!results || !results.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const n = results.length;
    selectedIdx.value = e.key === 'ArrowDown' ? (selectedIdx.value + 1) % n : (selectedIdx.value - 1 + n) % n;
    Promise.resolve().then(() => {
      const el = modalEl.querySelector('.qsm-result-item.is-selected');
      if (el) el.scrollIntoView({ block: 'nearest' });
    });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    openSearchResult(results[selectedIdx.value] || results[0]);
  }
}

function SearchResult({ w, idx }) {
  return (
    <li class={idx === selectedIdx.value ? 'qsm-result-item is-selected' : 'qsm-result-item '} data-id={w.id != null ? String(w.id) : ''}
      data-hanzi={w.hanzi} data-level={w.levelKey || ''} tabindex="0" role="option" onClick={() => openSearchResult(w)}>
      <div class="qsm-result-left">
        <span class="qsm-result-hanzi" lang="zh-CN">{w.hanzi}</span>{' '}
        <div class="qsm-result-info">
          <div class="qsm-result-meta">
            <span class="qsm-result-pinyin">{w.pinyin || ''}</span>{' '}
            {w.hanviet ? <span class="qsm-result-hanviet">{`(${w.hanviet})`}</span> : null}{' '}
            <span class="qsm-result-level">{w.level || w.levelKey || ''}</span>
          </div>{' '}
          <div class="qsm-result-meaning" title={w.meaning || ''}>{w.meaning || ''}</div>
        </div>
      </div>{' '}
      <div class="qsm-result-actions">
        <button type="button" class="qsm-result-speak" data-speak={w.hanzi} aria-label={`Nghe phát âm ${w.hanzi}`} title="Phát âm"
          onClick={(e) => { e.stopPropagation(); speak(w.hanzi, e.currentTarget); }} dangerouslySetInnerHTML={speakerSvg(15)} />
      </div>
    </li>
  );
}

const SUGGESTIONS = ['你好', 'xiexie', 'yundong', 'bác sĩ', 'học tập'];

function SearchPalette() {
  const results = searchResults.value;
  const typing = Boolean(searchQuery.value);
  return (
    <div class="qsm-container" role="document">
      <div class="qsm-header">
        <svg class="qsm-search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>{' '}
        <input ref={(el) => { inputEl = el; }} type="search" id="quickSearchInput" class="qsm-input" placeholder="Tra từ (Hán tự, pinyin, nghĩa tiếng Việt)..."
          autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck={false} aria-label="Tìm từ vựng"
          onInput={(e) => onQuickSearchInput(e.currentTarget.value)} onKeyDown={onSearchKeydown} />{' '}
        <button type="button" class="qsm-close-btn" onClick={closeQuickSearchModal} aria-label="Đóng tìm kiếm">✕</button>
      </div>{' '}
      <div class="qsm-body">
        <ul id="quickSearchResults" class="qsm-results-list" role="listbox" aria-label="Kết quả tìm kiếm">
          {typing && results && results.map((w, idx) => <SearchResult key={`${w.levelKey}-${w.id}-${w.hanzi}`} w={w} idx={idx} />)}
        </ul>{' '}
        <div id="quickSearchEmpty" class="qsm-empty" hidden={!(typing && results && results.length === 0)}>
          <span class="qsm-empty-icon" aria-hidden="true">🔍</span>{' '}
          <div class="qsm-empty-text">Không tìm thấy từ vựng nào phù hợp.</div>{' '}
          <div class="qsm-empty-hint">Thử tìm theo chữ Hán (vd: 好), Pinyin không dấu (vd: hao, ni hao), hoặc nghĩa tiếng Việt (vd: tốt).</div>
        </div>{' '}
        <div id="quickSearchInitial" class="qsm-initial" hidden={typing}>
          <div class="qsm-initial-hint">Gõ để tra cứu nhanh hơn 11.000 từ vựng HSK 3.0 (cấp 1–9):</div>{' '}
          <div class="qsm-initial-tags">
            {SUGGESTIONS.map((s, i) => [i > 0 ? ' ' : null, <span key={s} class="qsm-tag" onClick={() => setQuickSearchQuery(s)}>{s}</span>])}
          </div>
        </div>
      </div>{' '}
      <div class="qsm-footer">
        <span class="qsm-hint"><kbd>↑</kbd><kbd>↓</kbd> để di chuyển</span>{' '}
        <span class="qsm-hint"><kbd>↵</kbd> để học từ</span>{' '}
        <span class="qsm-hint"><kbd>ESC</kbd> để đóng</span>
      </div>
    </div>
  );
}

// ---- Wiring -----------------------------------------------------------------------------------
function onGlobalKeydown(e) {
  // Ctrl+K / Cmd+K toggles the search palette
  if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    if (modalEl && modalEl.open) closeQuickSearchModal();
    else openQuickSearchModal();
    return;
  }
  // "/" opens it outside text fields
  if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    const isInput = activeTag === 'input' || activeTag === 'textarea' || document.activeElement.isContentEditable;
    if (!isInput) {
      e.preventDefault();
      openQuickSearchModal();
      return;
    }
  }
  // Escape closes the palette first, then the drawer
  if (e.key === 'Escape') {
    if (modalEl && modalEl.open) {
      closeQuickSearchModal();
      return;
    }
    if (drawerOpen.value) closeQuickAccessDrawer();
  }
}

export function mountQuickAccessDrawer() {
  Object.assign(window, {
    openQuickAccessDrawer, closeQuickAccessDrawer, switchQuickDrawerTab, renderQuickSavedWords, updateSavedBadgeCounts,
    updateQuickUrgentWords, openQuickSearchModal, closeQuickSearchModal, setQuickSearchQuery
  });

  // Rendered right away: other panels look for #quickDrawerUrgentPane on DOMContentLoaded.
  drawerEl = document.getElementById('quickAccessDrawer');
  if (drawerEl) render(<Drawer />, drawerEl);
  modalEl = document.getElementById('quickSearchModal');
  if (modalEl) {
    render(<SearchPalette />, modalEl);
    modalEl.addEventListener('close', () => document.body.classList.remove('quick-search-open'));
    // Clicking the backdrop (outside the palette) closes it
    modalEl.addEventListener('click', (e) => {
      if (!e.target.closest('.qsm-container') && modalEl.open) closeQuickSearchModal();
    });
  }
  document.addEventListener('keydown', onGlobalKeydown);

  onDomReady(() => {
    const isMac = typeof navigator !== 'undefined' && /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
    const modKeyEl = document.querySelector('.hqs-kbd-mod');
    if (modKeyEl) modKeyEl.textContent = isMac ? '⌘' : 'Ctrl+';
    const quickSearchBtn = document.getElementById('headerQuickSearchBtn');
    if (quickSearchBtn) quickSearchBtn.addEventListener('click', () => openQuickSearchModal());
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    if (headerSearchBtn) headerSearchBtn.addEventListener('click', (e) => { e.preventDefault(); openQuickSearchModal(); });
    if (typeof window.loadWeakWords === 'function') updateSavedBadgeCounts(window.loadWeakWords().length);
  });
}
