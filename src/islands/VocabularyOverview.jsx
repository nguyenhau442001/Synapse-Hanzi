// Vocabulary overview mode (#overviewView): search, status filtering, and card deep links.
// Preact port of the former assets/js/vocabulary-overview.js. The study state still lives in
// legacy globals (state.js / levels.js / progress.js), so renderOverview() takes a snapshot of it
// into a signal and the island renders that snapshot with the same markup as before.
import { render } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { signal } from '@preact/signals';

/* global currentLevel, currentView, overviewQuery, overviewStatus, WORDS, LEVELS, progress,
   filteredOrder, currentFilter -- `let`/`const` globals of the classic scripts */

const PAGE_SIZE = 80;
const STATUS_LABELS = { unseen: 'Chưa học', unknown: 'Chưa nhớ', known: 'Đã nhớ' };

// { title, description, total, summary, rows: [{ word, wordIndex, status }], numberWidth } or null before the first render
const snapshot = signal(null);
const limit = signal(PAGE_SIZE);

function wordLearningStatus(word) {
  const status = progress[word.id];
  return status === 'known' || status === 'unknown' ? status : 'unseen';
}

const formatWordCount = (count) => new Intl.NumberFormat('vi-VN').format(count);

const preload = (word) => {
  if (typeof window.preloadSingleWordIllustration === 'function') window.preloadSingleWordIllustration(word, 'high');
};

export function renderOverview() {
  if (!currentLevel || currentView !== 'overview') return;

  const normalizedQuery = window.normalizeSearchText(overviewQuery);
  const rows = WORDS
    .map((word, wordIndex) => ({ word, wordIndex, status: wordLearningStatus(word) }))
    .filter(({ word, status }) => {
      if (overviewStatus !== 'all' && status !== overviewStatus) return false;
      if (!normalizedQuery) return true;
      return typeof window.wordMatchesQuery === 'function'
        ? window.wordMatchesQuery(word, overviewQuery)
        : window.normalizeSearchText(`${word.hanzi} ${word.pinyin} ${word.hanviet || ''} ${word.meaning}`).includes(normalizedQuery);
    });

  limit.value = PAGE_SIZE;
  snapshot.value = {
    title: `Trọn bộ từ vựng ${LEVELS[currentLevel].label}`,
    description: `Xem tổng thể ${formatWordCount(WORDS.length)} từ trước và trong khi học.`,
    total: `${formatWordCount(WORDS.length)} từ`,
    summary: normalizedQuery || overviewStatus !== 'all'
      ? `Tìm thấy ${rows.length} / ${WORDS.length} từ`
      : `Hiển thị toàn bộ ${WORDS.length} từ`,
    rows,
    numberWidth: String(WORDS.length).length
  };
}

export function setViewMode(mode) {
  if (!currentLevel || !['cards', 'overview'].includes(mode)) return;

  window.stopSpeech();
  currentView = mode; // eslint-disable-line no-global-assign -- legacy state.js binding
  const showOverview = mode === 'overview';
  const flashcardTab = document.getElementById('flashcardTab');
  const overviewTab = document.getElementById('overviewTab');

  document.getElementById('studyView').hidden = showOverview;
  document.getElementById('overviewView').hidden = !showOverview;
  flashcardTab.classList.toggle('active', mode === 'cards');
  overviewTab.classList.toggle('active', showOverview);
  flashcardTab.setAttribute('aria-selected', String(mode === 'cards'));
  overviewTab.setAttribute('aria-selected', String(showOverview));
  document.getElementById('appTitle').textContent = showOverview
    ? LEVELS[currentLevel].label + ' · Tổng quan'
    : LEVELS[currentLevel].label + ' · 汉字思维';

  if (showOverview) {
    document.getElementById('overviewSearch').value = overviewQuery;
    document.getElementById('overviewStatus').value = overviewStatus;
    renderOverview();
  }

  if (mode === 'cards') {
    if (!filteredOrder || filteredOrder.length === 0) window.setFilter(currentFilter);
    else window.render();
  }
}

export function updateOverviewSearch(value) {
  overviewQuery = value; // eslint-disable-line no-global-assign
  renderOverview();
}

export function updateOverviewStatus(value) {
  overviewStatus = value; // eslint-disable-line no-global-assign
  renderOverview();
}

export function openWordInCards(wordIndex) {
  if (WORDS[wordIndex]) preload(WORDS[wordIndex]);
  window.showAllWordsAt(wordIndex);
  window.renderFilters();
  setViewMode('cards');
  window.render('fade');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('cardArea').scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
}

function VocabularyRow({ word, wordIndex, status, numberWidth }) {
  const hv = word.hanviet || (typeof window.getWordHanViet === 'function' ? window.getWordHanViet(word) : '');
  return (
    <div class="vocabulary-row">
      <button type="button" class="vocabulary-item" aria-label={`${word.hanzi}, ${word.pinyin}, ${word.meaning}. Mở flashcard`}
        onPointerEnter={() => preload(word)} onTouchStart={() => preload(word)} onClick={() => openWordInCards(wordIndex)}>
        <span class="vocabulary-number">{String(wordIndex + 1).padStart(numberWidth, '0')}</span>
        <span class="vocabulary-content">
          <span class="vocabulary-word-line">
            <span class="vocabulary-hanzi">{word.hanzi}</span>
            <span class="vocabulary-pinyin">{word.pinyin}</span>
            {hv && <span class="vocabulary-hanviet hanviet-badge">{`［${hv}］`}</span>}
          </span>
          <span class="vocabulary-meaning">{word.meaning}</span>
        </span>
        <span class={`vocabulary-status vocabulary-status--${status}`}>{STATUS_LABELS[status]}</span>
      </button>
      <button type="button" class="vocabulary-curve-btn" aria-label={'Xem đường cong ghi nhớ: ' + word.hanzi}
        onClick={(event) => { event.stopPropagation(); window.openMemoryCurve(currentLevel, word.id); }}>📈</button>
    </div>
  );
}

// "Xem thêm" button that also loads the next page when scrolled near.
function LoadMore({ remaining }) {
  const ref = useRef(null);
  const more = () => { limit.value += PAGE_SIZE; };
  useEffect(() => {
    if (!('IntersectionObserver' in window) || !ref.current) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        more();
      }
    }, { rootMargin: '300px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  });
  return (
    <div ref={ref} id="vocabLoadMoreTrigger" class="vocab-load-more-trigger" style="text-align: center; padding: 16px;">
      <button type="button" class="hw-outline-btn" onClick={more}>{`Xem thêm (${remaining} từ còn lại) ↓`}</button>
    </div>
  );
}

function VocabularyList() {
  const snap = snapshot.value;
  let content = null;
  if (snap && snap.rows.length === 0) {
    content = <div class="overview-empty">Không tìm thấy từ phù hợp. Hãy thử từ khóa hoặc trạng thái khác.</div>;
  } else if (snap) {
    const shown = Math.min(limit.value, snap.rows.length);
    content = (
      <>
        {snap.rows.slice(0, shown).map((row) => (
          <VocabularyRow key={row.wordIndex} {...row} numberWidth={snap.numberWidth} />
        ))}
        {shown < snap.rows.length && <LoadMore key={shown} remaining={snap.rows.length - shown} />}
      </>
    );
  }
  return <div class="vocabulary-list" id="vocabularyList">{content}</div>;
}

export function VocabularyOverview() {
  const snap = snapshot.value;
  return (
    <>
      <div class="overview-heading">
        <div>
          <h2 id="overviewTitle">{snap ? snap.title : 'Toàn bộ từ vựng'}</h2>
          <p id="overviewDescription">{snap ? snap.description : 'Xem trước trọn bộ từ của cấp độ này.'}</p>
        </div>
        <span class="overview-total" id="overviewTotal">{snap ? snap.total : '0 từ'}</span>
      </div>

      <div class="overview-controls">
        <label class="overview-search">
          <span aria-hidden="true">⌕</span>
          <input id="overviewSearch" type="search" autocomplete="off"
            placeholder="Tìm chữ Hán, pinyin hoặc nghĩa..."
            aria-label="Tìm trong danh sách từ vựng"
            onInput={(e) => updateOverviewSearch(e.currentTarget.value)} />
        </label>
        <label class="overview-status-label">
          <span class="sr-only">Lọc theo trạng thái học</span>
          <select id="overviewStatus" aria-label="Lọc theo trạng thái học" onChange={(e) => updateOverviewStatus(e.currentTarget.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="unseen">Chưa học</option>
            <option value="unknown">Chưa nhớ</option>
            <option value="known">Đã nhớ</option>
          </select>
        </label>
      </div>

      <div class="overview-result-summary" id="overviewResultSummary" role="status">{snap ? snap.summary : ''}</div>
      <VocabularyList />
    </>
  );
}

export function mountVocabularyOverview() {
  const view = document.getElementById('overviewView');
  if (!view) return;
  render(<VocabularyOverview />, view);
  Object.assign(window, { setViewMode, updateOverviewSearch, updateOverviewStatus, renderOverview, openWordInCards });
}
