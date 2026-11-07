// Radical (Bộ thủ) study screen #screenRadicalCards: flashcards with filters, stats and swipe, plus the
// overview list. Preact port of the former assets/js/radical-card.js with the same markup. The study
// state stays in the radicals-state.js globals because radicals.js (tab router) also sets it; the
// functions below keep their names on window. Rendering is synchronous like the legacy DOM writes,
// since callers (swipe setup, scrollIntoView) use the elements right away.
import { render } from 'preact';

/* global RADICAL_STROKE_COUNTS, RADICAL_GROUPS, radicalOrder, radicalFilteredOrder, radicalIdx, radicalWords,
   radicalReturnTab, radicalGroupIndex, radicalProgress, showRadicalPinyin, radicalCurrentFilter, radicalCurrentView,
   radicalOverviewQuery, radicalOverviewStatus, radicalOverviewStroke, radicalOverviewItems -- radicals-state.js */
/* eslint-disable no-global-assign */

let screenEl = null;
let areaEpoch = 0;      // buildRadicalCardArea() starts a fresh card area, as before
let cardBuilt = false;  // the card area shows "Đang tải dữ liệu..." until the first build
let shown = null;       // card snapshot: { empty } | { item, position, total }
let stats = null;       // { total, known, unknown, unseen }
let contentAnim = '';   // exit-*/enter-* animation class on the card content
let backShown = false;
let animTimer = null;

function rerender() {
  if (screenEl) render(<RadicalCardsScreen />, screenEl);
}

const radicalSetLabel = () => (radicalReturnTab === 'basic50' ? '50 bộ cơ bản' : '214 bộ Khang Hy');
const radicalOverviewStrokeCount = () => RADICAL_STROKE_COUNTS[radicalReturnTab];

export function radicalLearningStatus(item) {
  const status = radicalProgress[window.radicalProgressKey(item)];
  return status === 'known' || status === 'unknown' ? status : 'unseen';
}

export function filteredRadicalIndexes(filter) {
  if (filter === 'all') return radicalOrder.slice();
  return radicalOrder.filter((index) => radicalLearningStatus(radicalWords[index]) === filter);
}

export function buildRadicalCardArea() {
  areaEpoch++;
  cardBuilt = true;
  shown = null;
  contentAnim = '';
  backShown = false;
  rerender();
  window.initRadicalSwipe();
}

export function renderRadicalFilters() {
  rerender();
}

export function setRadicalViewMode(mode) {
  if (!['cards', 'overview'].includes(mode)) return;
  radicalCurrentView = mode;
  const showOverview = mode === 'overview';
  document.getElementById('appTitle').textContent = showOverview
    ? `Bộ thủ ${radicalSetLabel()} · Tổng quan`
    : `Bộ thủ ${radicalGroupIndex + 1} nét · 汉字思维`;
  rerender();
}

export function setRadicalFilter(filter) {
  radicalCurrentFilter = filter;
  radicalFilteredOrder = filteredRadicalIndexes(filter);
  radicalIdx = 0;
  renderRadicalCard('fade');
}

function computeStats() {
  let known = 0;
  let unknown = 0;
  radicalWords.forEach((item) => {
    const status = radicalLearningStatus(item);
    if (status === 'known') known++;
    else if (status === 'unknown') unknown++;
  });
  return { total: radicalWords.length, known, unknown, unseen: radicalWords.length - known - unknown };
}

export function updateRadicalStats() {
  stats = computeStats();
  rerender();
}

export const updateRadicalOverviewSearch = (value) => { radicalOverviewQuery = value; rerender(); };
export const updateRadicalOverviewStatus = (value) => { radicalOverviewStatus = value; rerender(); };
export const updateRadicalOverviewStroke = (value) => { radicalOverviewStroke = value; rerender(); };
export const renderRadicalOverview = () => rerender();

export function openRadicalInCards(groupIndex, itemIndexInGroup) {
  radicalGroupIndex = groupIndex;
  radicalWords = RADICAL_GROUPS[radicalReturnTab][groupIndex];
  radicalOrder = Array.from({ length: radicalWords.length }, (_, i) => i);
  radicalCurrentFilter = 'all';
  radicalFilteredOrder = radicalOrder.slice();
  radicalIdx = radicalFilteredOrder.indexOf(itemIndexInGroup);
  if (radicalIdx < 0) radicalIdx = 0;
  setRadicalViewMode('cards');
  renderRadicalCard('fade');
  document.getElementById('radicalCardArea').scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start'
  });
}

export function toggleRadicalTransferPanel(forceOpen) {
  window.toggleDisclosurePanel('radicalTransferPanel', 'radicalTransferToggle', forceOpen);
}

const RELATION_LABELS = {
  semantic: 'Gợi nghĩa',
  phonetic: 'Gợi âm',
  historical_graphic: 'Cấu tạo/lịch sử',
  direct: 'Ví dụ trực tiếp',
  historical_form: 'Dạng chữ lịch sử',
  semantic_historical: 'Nghĩa phát triển',
  traditional_analysis: 'Cách phân tích truyền thống'
};
const radicalRelationLabel = (type) => RELATION_LABELS[type] || type || '';

// Show the current card; with an animation the old card slides/fades out for 150ms first.
export function renderRadicalCard(animate) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const applyContent = () => {
    backShown = false;
    contentAnim = '';
    if (radicalFilteredOrder.length === 0) {
      shown = { empty: true };
      backShown = true;
    } else {
      const position = radicalIdx % radicalFilteredOrder.length;
      shown = { item: radicalWords[radicalFilteredOrder[position]], position: position + 1, total: radicalFilteredOrder.length };
      if (animate && !prefersReduced) contentAnim = animate === 'next' ? 'enter-right' : animate === 'prev' ? 'enter-left' : 'enter-fade';
    }
    stats = computeStats();
    rerender();
  };
  clearTimeout(animTimer);
  if (!animate || prefersReduced || !cardBuilt) {
    applyContent();
    return;
  }
  contentAnim = animate === 'next' ? 'exit-left' : animate === 'prev' ? 'exit-right' : 'exit-fade';
  rerender();
  animTimer = setTimeout(applyContent, 150);
}

export function radicalFlip() {
  if (radicalFilteredOrder.length === 0) return;
  backShown = !backShown;
  rerender();
}

export function nextRadicalCard() {
  if (radicalFilteredOrder.length === 0) return;
  radicalIdx = (radicalIdx + 1) % radicalFilteredOrder.length;
  renderRadicalCard('next');
}

export function prevRadicalCard() {
  if (radicalFilteredOrder.length === 0) return;
  radicalIdx = (radicalIdx - 1 + radicalFilteredOrder.length) % radicalFilteredOrder.length;
  renderRadicalCard('prev');
}

function markRadical(status) {
  if (radicalFilteredOrder.length === 0) return;
  const itemIndex = radicalFilteredOrder[radicalIdx % radicalFilteredOrder.length];
  radicalProgress[window.radicalProgressKey(radicalWords[itemIndex])] = status;
  window.saveRadicalProgress();
  advanceAfterRadicalMark(itemIndex);
}

export const markRadicalKnown = () => markRadical('known');
export const markRadicalUnknown = () => markRadical('unknown');

function advanceAfterRadicalMark(previousItemIndex) {
  if (radicalCurrentFilter === 'all') {
    nextRadicalCard();
    return;
  }
  const previousPosition = radicalIdx;
  radicalFilteredOrder = filteredRadicalIndexes(radicalCurrentFilter);
  if (radicalFilteredOrder.length === 0) radicalIdx = 0;
  else if (radicalFilteredOrder.includes(previousItemIndex)) radicalIdx = (previousPosition + 1) % radicalFilteredOrder.length;
  else radicalIdx = Math.min(previousPosition, radicalFilteredOrder.length - 1);
  renderRadicalCard('fade');
}

export function shuffleRadicalDeck() {
  window.shuffleInPlace(radicalOrder);
  setRadicalFilter(radicalCurrentFilter);
}

export function toggleRadicalPinyin() {
  showRadicalPinyin = !showRadicalPinyin;
  window.saveRadicalPrefs();
  renderRadicalCard();
}

// ---- Rendering --------------------------------------------------------------------------------
const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unknown', label: 'Chưa nhớ' },
  { key: 'known', label: 'Đã nhớ' },
  { key: 'unseen', label: 'Chưa học' }
];

function StatBox({ id, value, color, label }) {
  return (
    <div class="stat-box"><div class="stat-num" id={id} style={color ? `color:${color}` : undefined}>{value}</div><div class="stat-lbl">{label}</div></div>
  );
}

function CardBack() {
  const item = shown && shown.item;
  if (shown && shown.empty) {
    return (
      <div class="radical-back show" id="radicalBack">
        <div class="radical-meaning" id="radMeaning">Không có bộ thủ trong bộ lọc này</div>
        <div class="radical-description" id="radDescription" hidden></div>
        <div class="radical-variants" id="radVariants" hidden></div>
        <div class="radical-examples" id="radExamples" hidden></div>
      </div>
    );
  }
  const variants = item && Array.isArray(item.variants) && item.variants.length ? item.variants : null;
  const examples = item && Array.isArray(item.examples) && item.examples.length ? item.examples : null;
  return (
    <div class={backShown ? 'radical-back show' : 'radical-back'} id="radicalBack">
      <div class="radical-meaning" id="radMeaning">{item ? item.meaning || '' : ''}</div>
      <div class="radical-description" id="radDescription" hidden={!(item && item.description)}>{item ? item.description || '' : ''}</div>
      <div class="radical-variants" id="radVariants" hidden={!variants}>
        {variants && <><div class="ex-label">Dị thể</div>{variants.map((v, i) => <span key={i} class="variant-chip">{v}</span>)}</>}
      </div>
      <div class="radical-examples" id="radExamples" hidden={!examples}>
        {examples && <>
          <div class="ex-label">Ví dụ</div>
          {examples.map((ex, i) => [' ', (
            <div key={i} class="radical-example">
              <div class="ex-line ex-zh">{ex.hanzi || ''}</div>{' '}
              {showRadicalPinyin && ex.pinyin ? <div class="ex-line ex-py">{ex.pinyin}</div> : null}{' '}
              <div class="ex-line ex-vi">{ex.meaning || ''}</div>{' '}
              {ex.relation ? <div class="radical-relation"><span class="relation-badge">{radicalRelationLabel(ex.relation_type)}</span>{ex.relation}</div> : null}
            </div>
          )])}
        </>}
      </div>
    </div>
  );
}

function CardArea() {
  if (!cardBuilt) return <div class="loading-text">Đang tải dữ liệu...</div>;
  const item = shown && shown.item;
  const total = shown ? (shown.empty ? 0 : shown.total) : null;
  const position = shown && !shown.empty ? shown.position : 0;
  let hint = 'Nhấn vào thẻ để xem nghĩa và ví dụ';
  if (shown && shown.empty) hint = '';
  else if (backShown) hint = 'Nhấn lại để ẩn';
  return (
    <>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" id="radicalProgressBar" style={total === null ? undefined : `width: ${total === 0 ? 0 : (position / total * 100)}%;`}></div>
      </div>{' '}
      <div class="card radical-card" id="radicalCard">
        <div class="swipe-badge swipe-badge--known" id="radicalSwipeBadgeKnown">✓ Đã nhớ</div>{' '}
        <div class="swipe-badge swipe-badge--unknown" id="radicalSwipeBadgeUnknown">✗ Chưa nhớ</div>{' '}
        <div id="radicalCardContent" class={contentAnim ? `card-content ${contentAnim}` : 'card-content'}>
          <div class="hanzi radical-char" id="radChar">{item ? item.radical || '' : ''}</div>{' '}
          <div class="radical-name" id="radName">{item ? item.name || '' : ''}</div>{' '}
          <div class="pinyin" id="radPinyin">{item && showRadicalPinyin ? item.pinyin || '' : ''}</div>{' '}
          <CardBack />{' '}
          <div class="hint" id="radicalHint">{hint}</div>
        </div>
      </div>{' '}

      <div class="nav-row">
        <button onClick={(e) => { e.stopPropagation(); prevRadicalCard(); }}>← Trước</button>{' '}
        <span class="progress-text" id="radicalProgressText">{total === null ? `1 / ${radicalFilteredOrder.length}` : total === 0 ? '0 / 0' : `${position} / ${total}`}</span>{' '}
        <button onClick={(e) => { e.stopPropagation(); nextRadicalCard(); }}>Tiếp →</button>
      </div>{' '}

      <div class="action-row">
        <button class="btn-unknown" onClick={(e) => { e.stopPropagation(); markRadicalUnknown(); }}>Chưa nhớ</button>{' '}
        <button class="btn-known" onClick={(e) => { e.stopPropagation(); markRadicalKnown(); }}>Đã nhớ</button>
      </div>
    </>
  );
}

// The overview is only recomputed while it is visible; when hidden it keeps its last content, as before.
let overviewSnapshot = null;

function computeOverview() {
  const normalizedQuery = window.normalizeSearchText(radicalOverviewQuery);
  const total = radicalOverviewItems.length;
  const matches = radicalOverviewItems.filter(({ item, stroke }) => {
    if (radicalOverviewStroke !== 'all' && String(stroke) !== radicalOverviewStroke) return false;
    if (radicalOverviewStatus !== 'all' && radicalLearningStatus(item) !== radicalOverviewStatus) return false;
    if (!normalizedQuery) return true;
    return window.normalizeSearchText(`${item.radical || ''} ${item.name || ''} ${item.pinyin || ''} ${item.meaning || ''}`).includes(normalizedQuery);
  }).map((m) => ({ ...m, status: radicalLearningStatus(m.item) }));
  const filtering = normalizedQuery || radicalOverviewStatus !== 'all' || radicalOverviewStroke !== 'all';
  return {
    title: `Toàn bộ ${radicalSetLabel()}`,
    description: `Xem tổng thể ${total} bộ trước và trong khi học.`,
    total: `${total} bộ`,
    summary: filtering ? `Tìm thấy ${matches.length} / ${total} bộ` : `Hiển thị toàn bộ ${total} bộ`,
    strokeCount: radicalOverviewStrokeCount(),
    matches
  };
}

const STATUS_LABELS = { unseen: 'Chưa học', unknown: 'Chưa nhớ', known: 'Đã nhớ' };

function OverviewList({ matches }) {
  if (matches.length === 0) return <div class="overview-empty">Không tìm thấy bộ thủ phù hợp. Hãy thử từ khóa, số nét hoặc trạng thái khác.</div>;
  return matches.map(({ item, groupIndex, itemIndexInGroup, stroke, status }, displayIndex) => (
    <button key={`${groupIndex}-${itemIndexInGroup}`} type="button" class="vocabulary-item radical-overview-item"
      aria-label={`${item.name}, ${item.pinyin}, ${item.meaning}. Mở flashcard`} onClick={() => openRadicalInCards(groupIndex, itemIndexInGroup)}>
      <span class="vocabulary-number">{String(displayIndex + 1).padStart(String(matches.length).length, '0')}</span>
      <span class="vocabulary-content">
        <span class="vocabulary-word-line">
          <span class="vocabulary-hanzi">{item.radical || ''}</span>
          <span class="vocabulary-pinyin">{item.pinyin || ''}</span>
          <span class="vocabulary-pinyin">{`${stroke} nét`}</span>
        </span>
        <span class="vocabulary-meaning">{`${item.name || ''} · ${item.meaning || ''}`}</span>
      </span>
      <span class={`vocabulary-status vocabulary-status--${status}`}>{STATUS_LABELS[status]}</span>
    </button>
  ));
}

function OverviewView({ visible }) {
  if (visible) overviewSnapshot = computeOverview();
  const snap = overviewSnapshot;
  return (
    <div id="radicalOverviewView" role="tabpanel" aria-labelledby="radicalOverviewTab" hidden={!visible}>
      <div class="overview-heading">
        <div>
          <h2 id="radicalOverviewTitle">{snap ? snap.title : 'Toàn bộ bộ thủ'}</h2>{' '}
          <p id="radicalOverviewDescription">{snap ? snap.description : 'Xem trước nhóm bộ thủ này.'}</p>
        </div>{' '}
        <span class="overview-total" id="radicalOverviewTotal">{snap ? snap.total : '0 bộ'}</span>
      </div>{' '}

      <div class="overview-controls">
        <label class="overview-search">
          <span aria-hidden="true">⌕</span>{' '}
          <input id="radicalOverviewSearch" type="search" autocomplete="off" placeholder="Tìm bộ thủ, pinyin hoặc nghĩa..."
            aria-label="Tìm trong danh sách bộ thủ" value={radicalOverviewQuery} onInput={(e) => updateRadicalOverviewSearch(e.currentTarget.value)} />
        </label>{' '}
        <label class="overview-status-label">
          <span class="sr-only">Lọc bộ thủ theo số nét</span>{' '}
          <select id="radicalOverviewStroke" aria-label="Lọc bộ thủ theo số nét" value={radicalOverviewStroke} onChange={(e) => updateRadicalOverviewStroke(e.currentTarget.value)}>
            <option value="all">Tất cả số nét</option>
            {Array.from({ length: snap ? snap.strokeCount : 0 }, (_, i) => <option key={i} value={String(i + 1)}>{`${i + 1} nét`}</option>)}
          </select>
        </label>{' '}
        <label class="overview-status-label">
          <span class="sr-only">Lọc bộ thủ theo trạng thái học</span>{' '}
          <select id="radicalOverviewStatus" aria-label="Lọc bộ thủ theo trạng thái học" value={radicalOverviewStatus} onChange={(e) => updateRadicalOverviewStatus(e.currentTarget.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="unseen">Chưa học</option>
            <option value="unknown">Chưa nhớ</option>
            <option value="known">Đã nhớ</option>
          </select>
        </label>
      </div>{' '}

      <div class="overview-result-summary" id="radicalOverviewResultSummary" role="status">{snap ? snap.summary : ''}</div>{' '}
      <div class="vocabulary-list radical-overview-list" id="radicalOverviewList">{snap && <OverviewList matches={snap.matches} />}</div>
    </div>
  );
}

export function RadicalCardsScreen() {
  const overview = radicalCurrentView === 'overview';
  const s = stats || { total: 0, known: 0, unknown: 0, unseen: 0 };
  return (
    <>
      <button class="back-btn" onClick={() => window.SpaRouter.navigateBack()}>← Quay lại Bộ thủ</button>{' '}

      <div class="view-tabs" role="tablist" aria-label="Chế độ xem bộ thủ">
        <button id="radicalFlashcardTab" class={overview ? 'view-tab' : 'view-tab active'} role="tab" aria-selected={String(!overview)}
          aria-controls="radicalStudyView" onClick={() => setRadicalViewMode('cards')}>🗂 Học flashcard</button>{' '}
        <button id="radicalOverviewTab" class={overview ? 'view-tab active' : 'view-tab'} role="tab" aria-selected={String(overview)}
          aria-controls="radicalOverviewView" onClick={() => setRadicalViewMode('overview')}>📋 Tổng quan bộ thủ</button>
      </div>{' '}

      <div id="radicalStudyView" role="tabpanel" aria-labelledby="radicalFlashcardTab" hidden={overview}>
        <div class="stat-grid">
          <StatBox id="rs-total" value={s.total} label="tổng số bộ" />{' '}
          <StatBox id="rs-unknown" value={s.unknown} color="var(--danger-text)" label="chưa nhớ" />{' '}
          <StatBox id="rs-known" value={s.known} color="var(--success-text)" label="đã nhớ" />{' '}
          <StatBox id="rs-unseen" value={s.unseen} color="var(--text-secondary)" label="chưa học" />
        </div>{' '}

        <div class="filter-row" id="radicalFilterRow">
          {cardBuilt && FILTERS.map((f) => (
            <button key={f.key} type="button" class={'filter-btn' + (radicalCurrentFilter === f.key ? ' active' : '')} onClick={() => setRadicalFilter(f.key)}>{f.label}</button>
          ))}
        </div>{' '}

        <div class="transfer-panel" id="radicalTransferPanel" hidden>
          <div class="transfer-panel-header">
            <div class="transfer-panel-title">Sao lưu và chuyển thiết bị</div>{' '}
            <button type="button" class="transfer-panel-close-btn" onClick={() => toggleRadicalTransferPanel(false)} aria-label="Đóng bảng sao lưu" title="Đóng (Esc)">✕</button>
          </div>{' '}
          <div class="transfer-panel-content">
            <div class="transfer-actions">
              <button onClick={() => window.exportRadicalProgress()}>💾 Tải bản sao tiến trình</button>{' '}
              <button onClick={() => document.getElementById('radicalImportFile').click()}>📂 Khôi phục từ bản sao</button>
            </div>{' '}
            <p class="transfer-note">Bản sao Bộ thủ gồm toàn bộ tiến trình 50 bộ cơ bản và 214 bộ Khang Hy.</p>
          </div>
        </div>{' '}
        <input type="file" id="radicalImportFile" accept="application/json" style="display:none" onChange={(e) => window.importRadicalProgress(e)} />{' '}

        <div class="toolbar">
          <div class="tool-group">
            <button class="icon-btn" id="radicalShuffleBtn" onClick={shuffleRadicalDeck}>🔀 Xáo trộn</button>{' '}
            <button class={!cardBuilt || showRadicalPinyin ? 'icon-btn' : 'icon-btn on'} id="radicalPinyinToggle" onClick={toggleRadicalPinyin}>
              {!cardBuilt || showRadicalPinyin ? '👁 Đang hiện pinyin' : '🙈 Chế độ thử thách: ẩn pinyin'}
            </button>{' '}
            <button class="icon-btn" id="radicalTransferToggle" onClick={() => toggleRadicalTransferPanel()} aria-controls="radicalTransferPanel" aria-expanded="false">💾 Sao lưu</button>
          </div>
        </div>{' '}

        <div id="radicalCardArea" key={areaEpoch}><CardArea /></div>
      </div>{' '}

      <OverviewView visible={overview} />
    </>
  );
}

export function mountRadicalCards() {
  Object.assign(window, {
    buildRadicalCardArea, setRadicalViewMode, renderRadicalFilters, radicalLearningStatus, filteredRadicalIndexes,
    setRadicalFilter, updateRadicalStats, updateRadicalOverviewSearch, updateRadicalOverviewStatus, updateRadicalOverviewStroke,
    renderRadicalOverview, openRadicalInCards, toggleRadicalTransferPanel, renderRadicalCard, radicalFlip, nextRadicalCard,
    prevRadicalCard, markRadicalKnown, markRadicalUnknown, shuffleRadicalDeck, toggleRadicalPinyin
  });
  screenEl = document.getElementById('screenRadicalCards');
  rerender();
}
