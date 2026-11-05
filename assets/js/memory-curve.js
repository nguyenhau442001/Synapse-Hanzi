// Per-card memory recall projection using ts-fsrs retrievability.
const CURVE_RATING_COLORS = { again: '#e07860', hard: '#e07860', good: '#65bc78', easy: '#65bc78', unknown: '#e07860', known: '#65bc78' };

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

function buildCurveSvg(card, logs, retention, compact = false) {
  const width = compact ? 380 : 760, height = compact ? 230 : 340;
  const left = compact ? 48 : 56, right = compact ? 16 : 22, top = compact ? 28 : 24, bottom = compact ? 34 : 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const now = new Date();
  const due = new Date(card.due);
  const history = logs.map(entry => ({ ...entry, date: new Date(entry.timestamp) }))
    .filter(entry => Number.isFinite(entry.date.getTime()) && Number.isFinite(entry.stabilityAfter))
    .sort((a, b) => a.date - b.date);
  const firstMemoryDate = history.length ? history[0].date : card.last_review ? new Date(card.last_review) : now;
  const duePadding = Number.isFinite(due.getTime()) ? Math.max(86400000, (due.getTime() - firstMemoryDate.getTime()) * 0.2) : 86400000;
  const end = new Date(Math.max(now.getTime() + 86400000, due.getTime() + duePadding));
  const start = firstMemoryDate.getTime() < now.getTime() ? firstMemoryDate : now;
  const span = Math.max(86400000, end.getTime() - start.getTime());
  const x = date => left + ((date.getTime() - start.getTime()) / span) * plotWidth;
  const y = value => top + (1 - Math.min(1, Math.max(0, value))) * plotHeight;
  const sampleCount = 160;
  const sampleDates = (from, to) => Array.from({ length: sampleCount + 1 }, (_, index) =>
    new Date(from.getTime() + ((to.getTime() - from.getTime()) * index / sampleCount)));

  let historyPath = '';
  if (history.length) {
    const points = sampleDates(start, now);
    let lastEntryIndex = -1;
    points.forEach((date, index) => {
      while (lastEntryIndex + 1 < history.length && history[lastEntryIndex + 1].date <= date) lastEntryIndex++;
      if (lastEntryIndex < 0) return;
      const entry = history[lastEntryIndex];
      const curveCard = curveCardAt(entry.stabilityAfter, entry.difficultyAfter || card.difficulty, entry.date);
      const value = SRS.retrievability(curveCard, date, retention);
      historyPath += (index === 0 || historyPath === '' ? 'M' : 'L') + x(date).toFixed(2) + ',' + y(value).toFixed(2) + ' ';
    });
  }

  const futureStart = now;
  const futureDates = sampleDates(futureStart, end);
  const futurePath = futureDates.map((date, index) => {
    const value = SRS.retrievability(card, date, retention);
    return (index === 0 ? 'M' : 'L') + x(date).toFixed(2) + ',' + y(value).toFixed(2);
  }).join(' ');

  const retentionY = y(retention);
  const todayX = x(now);
  const dueX = x(due);

  // In compact mode (sidebar), display 0%, 50%, 100% to keep grid clean and uncluttered.
  // In full dialog mode, display 0%, 25%, 50%, 75%, 100%.
  const gridValues = compact ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
  const grid = gridValues.map(value => `
    <g class="curve-gridline">
      <line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}" />
      <text x="${left - 8}" y="${y(value)}" text-anchor="end" dominant-baseline="central">${Math.round(value * 100)}%</text>
    </g>`).join('');

  const markers = history.map(entry => {
    const isKnown = entry.rating === 'good' || entry.rating === 'easy' || entry.status === 'known';
    const statusLabel = isKnown ? 'Đã nhớ' : 'Chưa nhớ';
    const color = isKnown ? '#65bc78' : '#e07860';
    const retrievability = Number(entry.retrievabilityBefore) || 0;
    const tooltip = `${formatCurveDate(entry.date)} · ${statusLabel} · Khả năng nhớ: ${formatCurvePercent(retrievability)} · Độ ổn định: ${Number(entry.stabilityAfter).toFixed(1)} ngày`;
    return `<circle class="curve-review-point" cx="${x(entry.date)}" cy="${y(retrievability)}" r="4.5" fill="${color}"
      tabindex="0" role="button" aria-label="${escapeHtml(tooltip)}" data-tooltip="${escapeHtml(tooltip)}"><title>${escapeHtml(tooltip)}</title></circle>`;
  }).join('');

  const dateFormatter = compact
    ? new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric' })
    : { format: formatCurveDate };
  const dateLabels = `
    <text class="curve-axis-date" x="${left}" y="${height - 10}">${escapeHtml(dateFormatter.format(start))}</text>
    <text class="curve-axis-date" x="${width - right}" y="${height - 10}" text-anchor="end">${escapeHtml(dateFormatter.format(end))}</text>
  `;

  // Smart label placement for Today and Due to prevent text collision
  const isDueToday = Number.isFinite(due.getTime()) && Math.abs(dueX - todayX) < 18;
  const isClose = Number.isFinite(due.getTime()) && Math.abs(dueX - todayX) < 55;

  let todayLineHtml = '';
  if (todayX >= left && todayX <= width - right) {
    const todayAnchor = todayX > width - right - 50 ? 'end' : 'start';
    const todayOffset = todayAnchor === 'end' ? -5 : 5;
    todayLineHtml = `
      <line class="curve-today-line" x1="${todayX}" y1="${top}" x2="${todayX}" y2="${height - bottom}" />
      <text class="curve-today-label" x="${todayX + todayOffset}" y="${top + 10}" text-anchor="${todayAnchor}">Hôm nay</text>
    `;
  }

  let dueLineHtml = '';
  if (dueX >= left && dueX <= width - right) {
    if (isDueToday) {
      const anchor = todayX > width - right - 50 ? 'end' : 'start';
      const offset = anchor === 'end' ? -5 : 5;
      dueLineHtml = `
        <line class="curve-due-line" x1="${dueX}" y1="${top}" x2="${dueX}" y2="${height - bottom}" />
        <text class="curve-due-label" x="${todayX + offset}" y="${top + 22}" text-anchor="${anchor}">Đến hạn</text>
      `;
    } else {
      const anchor = dueX > width - right - 50 ? 'end' : (isClose && dueX < todayX ? 'end' : 'start');
      const offset = anchor === 'end' ? -5 : 5;
      const yPos = isClose ? (top + 22) : (top + 10);
      dueLineHtml = `
        <line class="curve-due-line" x1="${dueX}" y1="${top}" x2="${dueX}" y2="${height - bottom}" />
        <text class="curve-due-label" x="${dueX + offset}" y="${yPos}" text-anchor="${anchor}">Đến hạn</text>
      `;
    }
  }

  // Retention target label: avoid colliding with due line if dueX is near right edge
  const retentionAtLeft = dueX > width - right - 85;
  const retentionLabelX = retentionAtLeft ? (left + 6) : (width - right - 4);
  const retentionAnchor = retentionAtLeft ? 'start' : 'end';

  return `<svg class="memory-curve-svg${compact ? ' is-compact' : ''}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Biểu đồ dự đoán khả năng nhớ từ vựng theo thời gian">
    ${grid}
    <line class="curve-retention-line" x1="${left}" y1="${retentionY}" x2="${width - right}" y2="${retentionY}" />
    <text class="curve-retention-label" x="${retentionLabelX}" y="${retentionY - 6}" text-anchor="${retentionAnchor}">Mục tiêu ${Math.round(retention * 100)}%</text>
    ${historyPath ? `<path class="curve-history-path" d="${historyPath}" />` : ''}
    <path class="curve-future-path" d="${futurePath}" />
    ${markers}
    ${todayLineHtml}
    ${dueLineHtml}
    ${dateLabels}
  </svg>`;
}

function renderMemoryCurvePanel(word) {
  const panel = document.getElementById('memoryCurvePanel');
  if (!panel) return;
  const chart = panel.querySelector('.memory-curve-panel-chart');
  const subtitle = panel.querySelector('.memory-curve-panel-word');
  const summary = panel.querySelector('.memory-curve-panel-summary');
  if (!word || !currentLevel) {
    panel.classList.add('is-empty');
    if (subtitle) subtitle.textContent = '';
    if (summary) summary.textContent = 'Chọn một từ để xem ước tính ghi nhớ.';
    if (chart) chart.innerHTML = '';
    return;
  }

  const wordId = String(word.id);
  const record = readSrsRecord(currentLevel);
  const card = srsCards[wordId] || record?.cards?.[wordId] || SRS.createNewCard();
  const logs = readSrsReviewLog(currentLevel).filter(entry => String(entry.wordId) === wordId
    && (!card.historyStartAt || new Date(entry.timestamp) >= new Date(card.historyStartAt)));
  if (subtitle) subtitle.textContent = `${word.hanzi} · ${word.pinyin || ''} — ${word.meaning || ''}`;

  if (!logs.length || card.state === SRS.State.New) {
    panel.classList.add('is-empty');
    if (summary) summary.textContent = 'Ôn từ này ít nhất một lần để xem dự đoán khả năng nhớ. Đường liền là lịch sử ôn; đường nét đứt là dự đoán.';
    if (chart) chart.innerHTML = '<div class="memory-curve-empty">Biểu đồ sẽ có dữ liệu sau lượt ôn đầu tiên.</div>';
    return;
  }

  panel.classList.remove('is-empty');
  const recall = SRS.retrievability(card, new Date(), srsRetention);
  const due = new Date(card.due);
  if (summary) summary.textContent = `Ước tính hiện nhớ ${formatCurvePercent(recall)} · Ôn tiếp: ${Number.isFinite(due.getTime()) ? formatCurveDate(due) : 'chưa lên lịch'}.`;
  if (chart) chart.innerHTML = buildCurveSvg(card, logs, srsRetention, true);
}

function initMemoryCurvePanel() {
  const mount = document.getElementById('workstationRight') || document.getElementById('screenCards');
  if (!mount) return;
  if (document.getElementById('memoryCurvePanel')) return;
  const panel = document.createElement('section');
  panel.id = 'memoryCurvePanel';
  panel.className = 'memory-curve-panel';
  panel.setAttribute('aria-labelledby', 'memoryCurvePanelTitle');
  const content = document.createElement('div');
  content.className = 'memory-curve-body';
  content.innerHTML = `
    <h2 id="memoryCurvePanelTitle">Khả năng nhớ từ này theo thời gian</h2>
    <p class="memory-curve-panel-word"></p>
    <p class="memory-curve-panel-summary">Chọn một từ để xem ước tính ghi nhớ.</p>
    <div class="memory-curve-panel-chart"></div>
    <div class="memory-curve-panel-key">
      <span><i></i>Lịch sử ôn</span>
      <span class="is-prediction"><i></i>Dự đoán</span>
      <span style="color:var(--danger-text)">● Chưa nhớ</span>
      <span style="color:var(--success-text)">● Đã nhớ</span>
    </div>`;
  panel.appendChild(content);
  mount.appendChild(panel);
  onActiveWordChange(renderMemoryCurvePanel);
  renderMemoryCurvePanel(activeStudyWord);
}

document.addEventListener('DOMContentLoaded', initMemoryCurvePanel);

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

function closeMemoryCurve() {
  const modal = document.getElementById('memoryCurveModal');
  if (modal) modal.remove();
  document.removeEventListener('keydown', memoryCurveKeydown);
}

function memoryCurveKeydown(event) {
  if (event.key === 'Escape') closeMemoryCurve();
}

function openMemoryCurve(level, wordId) {
  const word = (level === currentLevel ? WORDS : []).find(item => String(item.id) === String(wordId));
  const cardMap = level === currentLevel ? srsCards : readSrsRecord(level)?.cards || {};
  const card = cardMap[wordId] || SRS.createNewCard();
  const logs = readSrsReviewLog(level).filter(entry => String(entry.wordId) === String(wordId)
    && (!card.historyStartAt || new Date(entry.timestamp) >= new Date(card.historyStartAt)));
  const targetWord = word || { hanzi: String(wordId), pinyin: '', meaning: '' };
  const retrievability = SRS.retrievability(card, new Date(), srsRetention);
  const due = new Date(card.due);
  const noHistory = logs.length === 0;
  const modal = document.createElement('div');
  modal.id = 'memoryCurveModal';
  modal.className = 'memory-curve-overlay';
  modal.innerHTML = `
    <section class="memory-curve-dialog" role="dialog" aria-modal="true" aria-labelledby="memoryCurveTitle">
      <button type="button" class="memory-curve-close" onclick="closeMemoryCurve()" aria-label="Đóng">✕</button>
      <h2 id="memoryCurveTitle">📈 Khả năng nhớ theo thời gian · ${escapeHtml(targetWord.hanzi)}</h2>
      <p class="memory-curve-subtitle">${escapeHtml(targetWord.pinyin)} · ${escapeHtml(targetWord.meaning)}</p>
      <p class="memory-curve-note">Biểu đồ ước tính khả năng nhớ từ này theo thời gian. Đường liền là lịch sử ôn; đường nét đứt là dự đoán nếu bạn chưa ôn lại.</p>
      ${noHistory ? '<p class="memory-curve-note">Chưa có lịch sử ôn; biểu đồ chỉ hiển thị đường dự kiến từ hôm nay.</p>' : ''}
      <div class="memory-curve-chart-wrap">${buildCurveSvg(card, logs, srsRetention)}<div id="memoryCurveTooltip" class="memory-curve-tooltip" hidden></div></div>
      <div class="memory-curve-legend">
        <span><i class="curve-line-swatch"></i> Lịch sử ôn</span><span><i class="curve-line-swatch future"></i> Dự đoán</span>
        <span><i class="curve-dot" style="--dot:#e07860"></i> Chưa nhớ</span>
        <span><i class="curve-dot" style="--dot:#65bc78"></i> Đã nhớ</span>
      </div>
      <dl class="memory-curve-stats">
        <div><dt>Độ ổn định</dt><dd>${Number(card.stability).toFixed(1)} ngày</dd></div>
        <div><dt>Độ khó</dt><dd>${Number(card.difficulty).toFixed(1)} / 10</dd></div>
        <div><dt>Lượt ôn</dt><dd>${Number(card.reps) || 0}</dd></div>
        <div><dt>Số lần chưa nhớ</dt><dd>${Number(card.lapses) || 0}</dd></div>
        <div><dt>Khả năng nhớ</dt><dd>${formatCurvePercent(retrievability)}</dd></div>
        <div><dt>Đến hạn ôn</dt><dd>${escapeHtml(Number.isFinite(due.getTime()) ? formatCurveDate(due) : '—')}</dd></div>
      </dl>
    </section>`;
  modal.addEventListener('click', event => { if (event.target === modal) closeMemoryCurve(); });
  modal.querySelectorAll('.curve-review-point').forEach(point => {
    point.addEventListener('pointerenter', showCurvePointTooltip);
    point.addEventListener('click', showCurvePointTooltip);
    point.addEventListener('focus', showCurvePointTooltip);
  });
  document.body.appendChild(modal);
  document.addEventListener('keydown', memoryCurveKeydown);
}
