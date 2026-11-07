// Per-card memory recall projection using ts-fsrs retrievability: the study sidebar panel
// (#memoryCurvePanel) and the full "📈" dialog. Preact port of the former assets/js/memory-curve.js
// with the same markup (styled by the existing CSS). window.openMemoryCurve / closeMemoryCurve stay.
import { render } from 'preact';
import { signal } from '@preact/signals';

/* global SRS, currentLevel, WORDS, srsCards, srsRetention, activeStudyWord -- classic-script globals */

const panelWord = signal(null);   // { word } snapshot rendered by the sidebar panel
const dialog = signal(null);      // { level, wordId } of the open dialog, or null

function formatCurveDate(date) {
  return new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatCurvePercent(value) {
  return Number.isFinite(value) ? Math.round(value * 100) + '%' : '—';
}

function curveCardAt(stability, difficulty, reviewedAt) {
  const card = SRS.createNewCard(reviewedAt);
  card.state = SRS.State.Review;
  card.stability = stability;
  card.difficulty = difficulty;
  card.last_review = new Date(reviewedAt).toISOString();
  card.reps = 1;
  card.lapses = 0;
  return card;
}

function reviewLogsFor(level, wordId, card) {
  return window.readSrsReviewLog(level).filter((entry) => String(entry.wordId) === String(wordId)
    && (!card.historyStartAt || new Date(entry.timestamp) >= new Date(card.historyStartAt)));
}

function showCurvePointTooltip(event) {
  const tooltip = document.getElementById('memoryCurveTooltip');
  const point = event.target.closest('.curve-review-point');
  if (!tooltip || !point) return;
  tooltip.textContent = point.dataset.tooltip;
  tooltip.hidden = false;
  const rect = tooltip.parentElement.getBoundingClientRect();
  const pointerX = Number.isFinite(event.clientX) ? event.clientX - rect.left : rect.width / 2;
  const pointerY = Number.isFinite(event.clientY) ? event.clientY - rect.top : rect.height / 2;
  tooltip.style.left = Math.max(8, Math.min(rect.width - 230, pointerX)) + 'px';
  tooltip.style.top = Math.max(8, pointerY - 42) + 'px';
}

function CurveSvg({ card, logs, retention, compact = false }) {
  const width = compact ? 380 : 760, height = compact ? 230 : 340;
  const left = compact ? 48 : 56, right = compact ? 16 : 22, top = compact ? 28 : 24, bottom = compact ? 34 : 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const now = new Date();
  const due = new Date(card.due);
  const history = logs.map((entry) => ({ ...entry, date: new Date(entry.timestamp) }))
    .filter((entry) => Number.isFinite(entry.date.getTime()) && Number.isFinite(entry.stabilityAfter))
    .sort((a, b) => a.date - b.date);
  const firstMemoryDate = history.length ? history[0].date : card.last_review ? new Date(card.last_review) : now;
  const duePadding = Number.isFinite(due.getTime()) ? Math.max(86400000, (due.getTime() - firstMemoryDate.getTime()) * 0.2) : 86400000;
  const end = new Date(Math.max(now.getTime() + 86400000, due.getTime() + duePadding));
  const start = firstMemoryDate.getTime() < now.getTime() ? firstMemoryDate : now;
  const span = Math.max(86400000, end.getTime() - start.getTime());
  const x = (date) => left + ((date.getTime() - start.getTime()) / span) * plotWidth;
  const y = (value) => top + (1 - Math.min(1, Math.max(0, value))) * plotHeight;
  const sampleCount = 160;
  const sampleDates = (from, to) => Array.from({ length: sampleCount + 1 }, (_, index) =>
    new Date(from.getTime() + ((to.getTime() - from.getTime()) * index / sampleCount)));

  let historyPath = '';
  if (history.length) {
    let lastEntryIndex = -1;
    sampleDates(start, now).forEach((date, index) => {
      while (lastEntryIndex + 1 < history.length && history[lastEntryIndex + 1].date <= date) lastEntryIndex++;
      if (lastEntryIndex < 0) return;
      const entry = history[lastEntryIndex];
      const curveCard = curveCardAt(entry.stabilityAfter, entry.difficultyAfter || card.difficulty, entry.date);
      const value = SRS.retrievability(curveCard, date, retention);
      historyPath += (index === 0 || historyPath === '' ? 'M' : 'L') + x(date).toFixed(2) + ',' + y(value).toFixed(2) + ' ';
    });
  }

  const futurePath = sampleDates(now, end).map((date, index) => {
    const value = SRS.retrievability(card, date, retention);
    return (index === 0 ? 'M' : 'L') + x(date).toFixed(2) + ',' + y(value).toFixed(2);
  }).join(' ');

  const retentionY = y(retention);
  const todayX = x(now);
  const dueX = x(due);

  // Compact (sidebar): 0/50/100%; full dialog: 0/25/50/75/100%.
  const gridValues = compact ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
  const dateFormatter = compact
    ? new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric' })
    : { format: formatCurveDate };

  // Smart label placement for Today and Due to prevent text collision
  const isDueToday = Number.isFinite(due.getTime()) && Math.abs(dueX - todayX) < 18;
  const isClose = Number.isFinite(due.getTime()) && Math.abs(dueX - todayX) < 55;

  let todayLine = null;
  if (todayX >= left && todayX <= width - right) {
    const anchor = todayX > width - right - 50 ? 'end' : 'start';
    const offset = anchor === 'end' ? -5 : 5;
    todayLine = (
      <>
        <line class="curve-today-line" x1={todayX} y1={top} x2={todayX} y2={height - bottom} />
        <text class="curve-today-label" x={todayX + offset} y={top + 10} text-anchor={anchor}>Hôm nay</text>
      </>
    );
  }

  let dueLine = null;
  if (dueX >= left && dueX <= width - right) {
    let labelX, labelY, anchor;
    if (isDueToday) {
      anchor = todayX > width - right - 50 ? 'end' : 'start';
      labelX = todayX + (anchor === 'end' ? -5 : 5);
      labelY = top + 22;
    } else {
      anchor = dueX > width - right - 50 ? 'end' : (isClose && dueX < todayX ? 'end' : 'start');
      labelX = dueX + (anchor === 'end' ? -5 : 5);
      labelY = isClose ? (top + 22) : (top + 10);
    }
    dueLine = (
      <>
        <line class="curve-due-line" x1={dueX} y1={top} x2={dueX} y2={height - bottom} />
        <text class="curve-due-label" x={labelX} y={labelY} text-anchor={anchor}>Đến hạn</text>
      </>
    );
  }

  // Retention target label: avoid colliding with the due line near the right edge
  const retentionAtLeft = dueX > width - right - 85;

  return (
    <svg class={`memory-curve-svg${compact ? ' is-compact' : ''}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ dự đoán khả năng nhớ từ vựng theo thời gian">
      {gridValues.map((value) => (
        <g class="curve-gridline" key={value}>
          <line x1={left} y1={y(value)} x2={width - right} y2={y(value)} />
          <text x={left - 8} y={y(value)} text-anchor="end" dominant-baseline="central">{`${Math.round(value * 100)}%`}</text>
        </g>
      ))}
      <line class="curve-retention-line" x1={left} y1={retentionY} x2={width - right} y2={retentionY} />
      <text class="curve-retention-label" x={retentionAtLeft ? left + 6 : width - right - 4} y={retentionY - 6}
        text-anchor={retentionAtLeft ? 'start' : 'end'}>{`Mục tiêu ${Math.round(retention * 100)}%`}</text>
      {historyPath && <path class="curve-history-path" d={historyPath} />}
      <path class="curve-future-path" d={futurePath} />
      {history.map((entry, i) => {
        const isKnown = entry.rating === 'good' || entry.rating === 'easy' || entry.status === 'known';
        const retrievability = Number(entry.retrievabilityBefore) || 0;
        const tooltip = `${formatCurveDate(entry.date)} · ${isKnown ? 'Đã nhớ' : 'Chưa nhớ'} · Khả năng nhớ: ${formatCurvePercent(retrievability)} · Độ ổn định: ${Number(entry.stabilityAfter).toFixed(1)} ngày`;
        return (
          <circle key={i} class="curve-review-point" cx={x(entry.date)} cy={y(retrievability)} r="4.5" fill={isKnown ? '#65bc78' : '#e07860'}
            tabindex="0" role="button" aria-label={tooltip} data-tooltip={tooltip}
            onPointerEnter={compact ? undefined : showCurvePointTooltip}
            onClick={compact ? undefined : showCurvePointTooltip}
            onFocus={compact ? undefined : showCurvePointTooltip}><title>{tooltip}</title></circle>
        );
      })}
      {todayLine}
      {dueLine}
      <text class="curve-axis-date" x={left} y={height - 10}>{dateFormatter.format(start)}</text>
      <text class="curve-axis-date" x={width - right} y={height - 10} text-anchor="end">{dateFormatter.format(end)}</text>
    </svg>
  );
}

// ---- Sidebar panel -------------------------------------------------------------------------

let panelEl = null;

export function renderMemoryCurvePanel(word) {
  panelWord.value = { word };
}

function MemoryCurvePanelBody() {
  const snap = panelWord.value;
  const word = snap && snap.word;
  let subtitle = '';
  let summary = 'Chọn một từ để xem ước tính ghi nhớ.';
  let chart = null;
  let empty = true;

  if (word && currentLevel) {
    const wordId = String(word.id);
    const record = window.readSrsRecord(currentLevel);
    const card = srsCards[wordId] || record?.cards?.[wordId] || SRS.createNewCard();
    const logs = reviewLogsFor(currentLevel, wordId, card);
    subtitle = `${word.hanzi} · ${word.pinyin || ''} — ${word.meaning || ''}`;
    if (!logs.length || card.state === SRS.State.New) {
      summary = 'Ôn từ này ít nhất một lần để xem dự đoán khả năng nhớ. Đường liền là lịch sử ôn; đường nét đứt là dự đoán.';
      chart = <div class="memory-curve-empty">Biểu đồ sẽ có dữ liệu sau lượt ôn đầu tiên.</div>;
    } else {
      empty = false;
      const recall = SRS.retrievability(card, new Date(), srsRetention);
      const due = new Date(card.due);
      summary = `Ước tính hiện nhớ ${formatCurvePercent(recall)} · Ôn tiếp: ${Number.isFinite(due.getTime()) ? formatCurveDate(due) : 'chưa lên lịch'}.`;
      chart = <CurveSvg card={card} logs={logs} retention={srsRetention} compact />;
    }
  }
  if (panelEl) panelEl.classList.toggle('is-empty', empty);

  return (
    <div class="memory-curve-body">
      <h2 id="memoryCurvePanelTitle">Khả năng nhớ từ này theo thời gian</h2>
      <p class="memory-curve-panel-word">{subtitle}</p>
      <p class="memory-curve-panel-summary">{summary}</p>
      <div class="memory-curve-panel-chart">{chart}</div>
      <div class="memory-curve-panel-key">
        <span><i></i>Lịch sử ôn</span>{' '}
        <span class="is-prediction"><i></i>Dự đoán</span>{' '}
        <span style="color:var(--danger-text)">● Chưa nhớ</span>{' '}
        <span style="color:var(--success-text)">● Đã nhớ</span>
      </div>
    </div>
  );
}

// ---- Full dialog ---------------------------------------------------------------------------

function onDialogKeydown(event) {
  if (event.key === 'Escape') closeMemoryCurve();
}

export function closeMemoryCurve() {
  dialog.value = null;
  document.removeEventListener('keydown', onDialogKeydown);
}

export function openMemoryCurve(level, wordId) {
  dialog.value = { level, wordId, openedAt: Date.now() };
  document.addEventListener('keydown', onDialogKeydown);
}

function MemoryCurveDialog() {
  const d = dialog.value;
  if (!d) return null;
  const { level, wordId } = d;
  const word = (level === currentLevel ? WORDS : []).find((item) => String(item.id) === String(wordId));
  const cardMap = level === currentLevel ? srsCards : window.readSrsRecord(level)?.cards || {};
  const card = cardMap[wordId] || SRS.createNewCard();
  const logs = reviewLogsFor(level, wordId, card);
  const targetWord = word || { hanzi: String(wordId), pinyin: '', meaning: '' };
  const retrievability = SRS.retrievability(card, new Date(), srsRetention);
  const due = new Date(card.due);

  return (
    <div id="memoryCurveModal" class="memory-curve-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeMemoryCurve(); }}>
      <section class="memory-curve-dialog" role="dialog" aria-modal="true" aria-labelledby="memoryCurveTitle">
        <button type="button" class="memory-curve-close" onClick={closeMemoryCurve} aria-label="Đóng">✕</button>
        <h2 id="memoryCurveTitle">{`📈 Khả năng nhớ theo thời gian · ${targetWord.hanzi}`}</h2>
        <p class="memory-curve-subtitle">{`${targetWord.pinyin} · ${targetWord.meaning}`}</p>
        <p class="memory-curve-note">Biểu đồ ước tính khả năng nhớ từ này theo thời gian. Đường liền là lịch sử ôn; đường nét đứt là dự đoán nếu bạn chưa ôn lại.</p>
        {logs.length === 0 && <p class="memory-curve-note">Chưa có lịch sử ôn; biểu đồ chỉ hiển thị đường dự kiến từ hôm nay.</p>}
        <div class="memory-curve-chart-wrap">
          <CurveSvg card={card} logs={logs} retention={srsRetention} />
          <div id="memoryCurveTooltip" class="memory-curve-tooltip" hidden></div>
        </div>
        <div class="memory-curve-legend">
          <span><i class="curve-line-swatch"></i> Lịch sử ôn</span><span><i class="curve-line-swatch future"></i> Dự đoán</span>{' '}
          <span><i class="curve-dot" style="--dot:#e07860"></i> Chưa nhớ</span>{' '}
          <span><i class="curve-dot" style="--dot:#65bc78"></i> Đã nhớ</span>
        </div>
        <dl class="memory-curve-stats">
          <div><dt>Độ ổn định</dt><dd>{`${Number(card.stability).toFixed(1)} ngày`}</dd></div>
          <div><dt>Độ khó</dt><dd>{`${Number(card.difficulty).toFixed(1)} / 10`}</dd></div>
          <div><dt>Lượt ôn</dt><dd>{Number(card.reps) || 0}</dd></div>
          <div><dt>Số lần chưa nhớ</dt><dd>{Number(card.lapses) || 0}</dd></div>
          <div><dt>Khả năng nhớ</dt><dd>{formatCurvePercent(retrievability)}</dd></div>
          <div><dt>Đến hạn ôn</dt><dd>{Number.isFinite(due.getTime()) ? formatCurveDate(due) : '—'}</dd></div>
        </dl>
      </section>
    </div>
  );
}

export function mountMemoryCurve() {
  // Dialog: rendered on demand at the end of <body>, like the legacy appended overlay.
  const host = document.createElement('div');
  host.id = 'memoryCurveModalRoot';
  document.body.appendChild(host);
  render(<MemoryCurveDialog />, host);

  // Sidebar panel: index.html keeps the <section id="memoryCurvePanel"> placeholder in the
  // study sidebar so its position among the other panels is unchanged.
  panelEl = document.getElementById('memoryCurvePanel');
  if (panelEl) {
    render(<MemoryCurvePanelBody />, panelEl);
    window.onActiveWordChange(renderMemoryCurvePanel);
    renderMemoryCurvePanel(activeStudyWord);
  }

  Object.assign(window, { openMemoryCurve, closeMemoryCurve, renderMemoryCurvePanel });
}
