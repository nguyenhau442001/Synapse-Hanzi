// Starred / weak words ("Từ khó") panel in the left dock (desktop) or the mobile dock dialog,
// backed by localStorage. Preact port of the former assets/js/weak-words.js with the same markup.
// Other legacy modules (fast-review, quick-access-drawer, flashcard) keep using the window.*
// helpers exported below.
import { render } from 'preact';
import { signal } from '@preact/signals';

/* global activeStudyWord, currentLevel, WORDS, LEVELS -- classic-script globals */

const WEAK_WORDS_KEY = 'hsk_weak_words_v1';

const weakList = signal([]);
const countText = signal('0 từ'); // only refreshed while the list is non-empty, like the legacy panel

export function loadWeakWords() {
  try {
    const raw = localStorage.getItem(WEAK_WORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

export function saveWeakWords(list) {
  try { localStorage.setItem(WEAK_WORDS_KEY, JSON.stringify(list)); } catch (e) { /* quota */ }
}

export function isWeakWord(hanzi) {
  return loadWeakWords().some((w) => w.hanzi === hanzi);
}

export function escapeWeakWordHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function formatWeakWordLevel(levelKey) {
  if (!levelKey) return '';
  if (typeof window.homeShortLevelLabel === 'function') return window.homeShortLevelLabel(levelKey);
  const match30 = String(levelKey).match(/^hsk30_([1-9])$/);
  if (match30) return '3.0 L' + match30[1];
  const match20 = String(levelKey).match(/^hsk([1-6])$/i);
  if (match20) return 'HSK' + match20[1];
  return String(levelKey).toUpperCase();
}

const legacyLevel = () => (typeof currentLevel !== 'undefined' ? currentLevel : '');
const legacyActiveWord = () => (typeof activeStudyWord !== 'undefined' ? activeStudyWord : null);

export function toggleWeakWord(hanziOrWord, level) {
  if (!hanziOrWord) return false;
  const hanzi = typeof hanziOrWord === 'object' ? hanziOrWord.hanzi : hanziOrWord;
  if (!hanzi) return false;

  const list = loadWeakWords();
  const existingIndex = list.findIndex((w) => w.hanzi === hanzi);
  if (existingIndex >= 0) {
    list.splice(existingIndex, 1);
  } else {
    let wordObj = typeof hanziOrWord === 'object' ? { ...hanziOrWord } : {};
    const active = legacyActiveWord();
    if (active && active.hanzi === hanzi) wordObj = { ...active, ...wordObj };
    list.unshift({
      hanzi,
      pinyin: wordObj.pinyin || '',
      meaning: wordObj.meaning || '',
      level: level || wordObj.level || legacyLevel() || '',
      id: wordObj.id != null ? wordObj.id : ''
    });
  }
  saveWeakWords(list);
  renderWeakWordsList();
  updateWeakWordToggleButton();
  return existingIndex < 0; // true if now starred
}

const STAR_ON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
const STAR_OFF = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

// Syncs the star / "more" buttons that the legacy flashcard markup owns.
export function updateWeakWordToggleButton() {
  const active = legacyActiveWord();
  if (!active) return;
  const starred = isWeakWord(active.hanzi);
  const btn = document.getElementById('weakWordToggleBtn');
  if (btn) {
    const icon = document.getElementById('weakWordToggleIcon');
    if (icon) {
      icon.innerHTML = starred ? STAR_ON : STAR_OFF;
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

let isEnriching = false;

// Fill in pinyin/meaning for words starred from places that only knew the hanzi.
async function enrichMissingWeakWordMetadata(list) {
  if (isEnriching || !list.length || !list.some((w) => !w.pinyin || !w.meaning)) return;
  isEnriching = true;
  try {
    let updated = false;
    for (const w of list) {
      if (w.pinyin && w.meaning) continue;

      const active = legacyActiveWord();
      if (active && active.hanzi === w.hanzi) {
        w.pinyin = w.pinyin || active.pinyin || '';
        w.meaning = w.meaning || active.meaning || '';
        w.level = w.level || active.level || '';
        w.id = w.id || active.id || '';
        updated = true;
        continue;
      }

      if (typeof WORDS !== 'undefined' && Array.isArray(WORDS)) {
        const found = WORDS.find((item) => item.hanzi === w.hanzi);
        if (found) {
          w.pinyin = w.pinyin || found.pinyin || '';
          w.meaning = w.meaning || found.meaning || '';
          w.level = w.level || legacyLevel();
          w.id = w.id || found.id || '';
          updated = true;
          continue;
        }
      }

      const levelKey = w.level || (typeof currentLevel !== 'undefined' ? currentLevel : 'hsk4');
      if (typeof LEVELS !== 'undefined' && LEVELS[levelKey]) {
        try {
          const data = await window.fetchLevelWords(levelKey);
          const match = data.find((item) => item.hanzi === w.hanzi);
          if (match) {
            w.pinyin = w.pinyin || match.pinyin || '';
            w.meaning = w.meaning || match.meaning || '';
            w.level = w.level || levelKey;
            w.id = w.id || match.id || '';
            updated = true;
            continue;
          }
        } catch (e) { /* offline */ }
      }

      if (!w.pinyin && typeof window.buildSidebarSearchIndex === 'function') {
        try {
          const idx = await window.buildSidebarSearchIndex();
          const match = idx.find((item) => item.hanzi === w.hanzi);
          if (match) {
            w.pinyin = w.pinyin || match.pinyin || '';
            w.meaning = w.meaning || match.meaning || '';
            w.level = w.level || match.levelKey || '';
            w.id = w.id || match.id || '';
            updated = true;
          }
        } catch (e) { /* index unavailable */ }
      }
    }
    if (updated) {
      saveWeakWords(list);
      renderWeakWordsList();
    }
  } finally {
    isEnriching = false;
  }
}

let mounted = false;

export function renderWeakWordsList() {
  if (!mounted) return;
  const list = loadWeakWords();
  weakList.value = list;
  if (!list.length) return;
  countText.value = `${list.length} từ`;

  enrichMissingWeakWordMetadata(list);
  if (typeof window.renderQuickSavedWords === 'function') window.renderQuickSavedWords();
  if (typeof window.updateSavedBadgeCounts === 'function') window.updateSavedBadgeCounts(list.length);
  if (typeof window.updateReviewMobileAuxBadge === 'function') window.updateReviewMobileAuxBadge();
}

function onPanelClick(e) {
  const removeBtn = e.target.closest('[data-remove]');
  if (removeBtn) {
    e.stopPropagation();
    saveWeakWords(loadWeakWords().filter((w) => w.hanzi !== removeBtn.dataset.remove));
    renderWeakWordsList();
    updateWeakWordToggleButton();
    return;
  }

  const row = e.target.closest('.weak-word-row');
  if (!row) return;
  const { hanzi, id } = row.dataset;
  const level = row.dataset.level || legacyLevel();
  const word = loadWeakWords().find((w) => w.hanzi === hanzi);

  const mobileDialog = document.getElementById('mobileDockDialog');
  if (mobileDialog && typeof mobileDialog.close === 'function' && mobileDialog.open) mobileDialog.close();

  if (typeof window.openWordInLevel === 'function' && level) {
    window.openWordInLevel(level, id || hanzi, true);
  } else if (typeof window.setActiveStudyWord === 'function') {
    window.setActiveStudyWord(word || { hanzi, pinyin: '', meaning: '' });
  }
}

function WeakWordRow({ w }) {
  const meaning = w.meaning || '';
  const pill = w.level ? formatWeakWordLevel(w.level) : '';
  return (
    <li class="weak-word-row weak-word-item" data-hanzi={w.hanzi} data-level={w.level || ''} data-id={w.id != null ? w.id : ''}>
      <button type="button" class="weak-word-open" aria-label={`Học từ ${w.hanzi}${meaning ? ': ' + meaning : ''}`}>
        <span class="weak-word-hanzi" lang="zh-CN">{w.hanzi}</span>{' '}
        <span class="weak-word-text">
          <span class="weak-word-meta">
            <span class="weak-word-pinyin">{w.pinyin || ''}</span>{' '}
            {pill && <span class="weak-word-level-pill">{pill}</span>}
          </span>{' '}
          <span class="weak-word-meaning" title={meaning}>{meaning}</span>
        </span>
      </button>{' '}
      <button type="button" class="weak-word-remove" data-remove={w.hanzi} aria-label={`Bỏ đánh dấu ${w.hanzi}`} title="Bỏ đánh dấu từ khó">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </li>
  );
}

function WeakWordsPanelBody() {
  const list = weakList.value;
  return (
    <>
      <div class="sidebar-card-heading">
        <h2>Từ khó (đã đánh dấu)</h2>{' '}
        <span class="weak-words-count" id="weakWordsCount">{countText.value}</span>
      </div>
      <ul class="weak-words-list" id="weakWordsList">
        {list.map((w) => <WeakWordRow key={w.hanzi} w={w} />)}
      </ul>
    </>
  );
}

function mountPanel() {
  const mount = document.body.classList.contains('is-desktop-dock')
    ? document.getElementById('workstationLeft')
    : document.getElementById('mobileDockDialogBody');
  if (!mount) return;

  const wrap = document.createElement('section');
  wrap.className = 'dashboard-sidebar-card weak-words-panel';
  wrap.id = 'weakWordsPanel';
  wrap.addEventListener('click', onPanelClick);
  // Same slot as before: right after the search box and the radical lookup card.
  const anchors = [mount.querySelector(':scope > .sidebar-radicals-filter'), mount.querySelector(':scope > #sidebarSearchWrap')].filter(Boolean);
  if (anchors.length) anchors[0].after(wrap);
  else mount.prepend(wrap);

  render(<WeakWordsPanelBody />, wrap);
  // The panel only shows while there is at least one starred word.
  weakList.subscribe((list) => { wrap.hidden = list.length === 0; });
  mounted = true;
  renderWeakWordsList();
  window.onActiveWordChange(updateWeakWordToggleButton);
}

export function mountWeakWords() {
  Object.assign(window, {
    loadWeakWords, saveWeakWords, isWeakWord, escapeWeakWordHtml, formatWeakWordLevel,
    toggleWeakWord, updateWeakWordToggleButton, renderWeakWordsList
  });
  // Deferred modules run while readyState is already 'interactive' but before DOMContentLoaded;
  // wait for it so the legacy sidebar cards mounted on DOMContentLoaded come first.
  const mountOnce = () => { if (!mounted) mountPanel(); };
  if (document.readyState === 'complete') mountOnce();
  else {
    document.addEventListener('DOMContentLoaded', mountOnce, { once: true });
    window.addEventListener('load', mountOnce, { once: true });
  }
}
