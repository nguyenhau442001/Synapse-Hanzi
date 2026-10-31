// Radical flashcard rendering, flip interaction, and progress actions.
function buildRadicalCardArea() {
  document.getElementById('radicalCardArea').innerHTML = `
    <div class="progress-bar-track">
      <div class="progress-bar-fill" id="radicalProgressBar"></div>
    </div>
    <div class="card radical-card" id="radicalCard">
      <div class="swipe-badge swipe-badge--known" id="radicalSwipeBadgeKnown">✓ Đã nhớ</div>
      <div class="swipe-badge swipe-badge--unknown" id="radicalSwipeBadgeUnknown">✗ Chưa nhớ</div>
      <div id="radicalCardContent" class="card-content">
        <div class="hanzi radical-char" id="radChar"></div>
        <div class="radical-name" id="radName"></div>
        <div class="pinyin" id="radPinyin"></div>
        <div class="radical-back" id="radicalBack">
          <div class="radical-meaning" id="radMeaning"></div>
          <div class="radical-description" id="radDescription" hidden></div>
          <div class="radical-variants" id="radVariants" hidden></div>
          <div class="radical-examples" id="radExamples" hidden></div>
        </div>
        <div class="hint" id="radicalHint">Nhấn vào thẻ để xem nghĩa và ví dụ</div>
      </div>
    </div>

    <div class="nav-row">
      <button onclick="event.stopPropagation(); prevRadicalCard()">← Trước</button>
      <span class="progress-text" id="radicalProgressText">1 / ${radicalFilteredOrder.length}</span>
      <button onclick="event.stopPropagation(); nextRadicalCard()">Tiếp →</button>
    </div>

    <div class="action-row">
      <button class="btn-unknown" onclick="event.stopPropagation(); markRadicalUnknown()">Chưa nhớ</button>
      <button class="btn-known" onclick="event.stopPropagation(); markRadicalKnown()">Đã nhớ</button>
    </div>
  `;
  const btn = document.getElementById('radicalPinyinToggle');
  if (btn) {
    btn.textContent = showRadicalPinyin ? '👁 Đang hiện pinyin' : '🙈 Chế độ thử thách: ẩn pinyin';
    btn.classList.toggle('on', !showRadicalPinyin);
  }
  initRadicalSwipe();
}

function radicalSetLabel() {
  return radicalReturnTab === 'basic50' ? '50 bộ cơ bản' : '214 bộ Khang Hy';
}

function radicalOverviewStrokeCount() {
  return RADICAL_STROKE_COUNTS[radicalReturnTab];
}

function setRadicalViewMode(mode) {
  if (!['cards', 'overview'].includes(mode)) return;

  radicalCurrentView = mode;
  const showOverview = mode === 'overview';
  const studyView = document.getElementById('radicalStudyView');
  const overviewView = document.getElementById('radicalOverviewView');
  const flashcardTab = document.getElementById('radicalFlashcardTab');
  const overviewTab = document.getElementById('radicalOverviewTab');

  studyView.hidden = showOverview;
  overviewView.hidden = !showOverview;
  flashcardTab.classList.toggle('active', !showOverview);
  overviewTab.classList.toggle('active', showOverview);
  flashcardTab.setAttribute('aria-selected', String(!showOverview));
  overviewTab.setAttribute('aria-selected', String(showOverview));
  document.getElementById('appTitle').textContent = showOverview
    ? `Bộ thủ ${radicalSetLabel()} · Tổng quan`
    : `Bộ thủ ${radicalGroupIndex + 1} nét · 汉字思维`;

  if (showOverview) {
    document.getElementById('radicalOverviewSearch').value = radicalOverviewQuery;
    document.getElementById('radicalOverviewStatus').value = radicalOverviewStatus;
    renderRadicalOverviewStrokeOptions();
    renderRadicalOverview();
  }
}

function renderRadicalOverviewStrokeOptions() {
  const select = document.getElementById('radicalOverviewStroke');
  if (!select) return;
  const total = radicalOverviewStrokeCount();
  const options = ['<option value="all">Tất cả số nét</option>'];
  for (let n = 1; n <= total; n++) {
    options.push(`<option value="${n}">${n} nét</option>`);
  }
  select.innerHTML = options.join('');
  select.value = radicalOverviewStroke;
}

function renderRadicalFilters() {
  const row = document.getElementById('radicalFilterRow');
  if (!row) return;
  row.innerHTML = '';
  const filters = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unknown', label: 'Chưa nhớ' },
    { key: 'known', label: 'Đã nhớ' },
    { key: 'unseen', label: 'Chưa học' },
  ];

  filters.forEach(filter => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-btn' + (radicalCurrentFilter === filter.key ? ' active' : '');
    button.textContent = filter.label;
    button.onclick = () => setRadicalFilter(filter.key);
    row.appendChild(button);
  });
}

function radicalLearningStatus(item) {
  const status = radicalProgress[radicalProgressKey(item)];
  return status === 'known' || status === 'unknown' ? status : 'unseen';
}

function filteredRadicalIndexes(filter) {
  if (filter === 'all') return radicalOrder.slice();
  return radicalOrder.filter(index => radicalLearningStatus(radicalWords[index]) === filter);
}

function setRadicalFilter(filter) {
  radicalCurrentFilter = filter;
  radicalFilteredOrder = filteredRadicalIndexes(filter);
  radicalIdx = 0;
  renderRadicalFilters();
  renderRadicalCard('fade');
}

function updateRadicalStats() {
  let known = 0;
  let unknown = 0;
  radicalWords.forEach(item => {
    const status = radicalLearningStatus(item);
    if (status === 'known') known++;
    else if (status === 'unknown') unknown++;
  });

  document.getElementById('rs-total').textContent = radicalWords.length;
  document.getElementById('rs-known').textContent = known;
  document.getElementById('rs-unknown').textContent = unknown;
  document.getElementById('rs-unseen').textContent = radicalWords.length - known - unknown;
}

function updateRadicalOverviewSearch(value) {
  radicalOverviewQuery = value;
  renderRadicalOverview();
}

function updateRadicalOverviewStatus(value) {
  radicalOverviewStatus = value;
  renderRadicalOverview();
}

function updateRadicalOverviewStroke(value) {
  radicalOverviewStroke = value;
  renderRadicalOverview();
}

function renderRadicalOverview() {
  if (radicalCurrentView !== 'overview') return;
  const normalizedQuery = normalizeSearchText(radicalOverviewQuery);
  const total = radicalOverviewItems.length;
  const matches = radicalOverviewItems
    .filter(({ item, stroke }) => {
      if (radicalOverviewStroke !== 'all' && String(stroke) !== radicalOverviewStroke) return false;
      if (radicalOverviewStatus !== 'all' && radicalLearningStatus(item) !== radicalOverviewStatus) return false;
      if (!normalizedQuery) return true;
      const searchable = `${item.radical || ''} ${item.name || ''} ${item.pinyin || ''} ${item.meaning || ''}`;
      return normalizeSearchText(searchable).includes(normalizedQuery);
    });

  document.getElementById('radicalOverviewTitle').textContent = `Toàn bộ ${radicalSetLabel()}`;
  document.getElementById('radicalOverviewDescription').textContent =
    `Xem tổng thể ${total} bộ trước và trong khi học.`;
  document.getElementById('radicalOverviewTotal').textContent = `${total} bộ`;
  document.getElementById('radicalOverviewResultSummary').textContent =
    normalizedQuery || radicalOverviewStatus !== 'all' || radicalOverviewStroke !== 'all'
      ? `Tìm thấy ${matches.length} / ${total} bộ`
      : `Hiển thị toàn bộ ${total} bộ`;

  const list = document.getElementById('radicalOverviewList');
  list.innerHTML = '';
  if (matches.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'overview-empty';
    empty.textContent = 'Không tìm thấy bộ thủ phù hợp. Hãy thử từ khóa, số nét hoặc trạng thái khác.';
    list.appendChild(empty);
    return;
  }

  const statusLabels = { unseen: 'Chưa học', unknown: 'Chưa nhớ', known: 'Đã nhớ' };
  const fragment = document.createDocumentFragment();
  matches.forEach(({ item, groupIndex, itemIndexInGroup, stroke }, displayIndex) => {
    const status = radicalLearningStatus(item);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vocabulary-item radical-overview-item';
    button.setAttribute('aria-label', `${item.name}, ${item.pinyin}, ${item.meaning}. Mở flashcard`);
    button.onclick = () => openRadicalInCards(groupIndex, itemIndexInGroup);

    const number = document.createElement('span');
    number.className = 'vocabulary-number';
    number.textContent = String(displayIndex + 1).padStart(String(matches.length).length, '0');

    const content = document.createElement('span');
    content.className = 'vocabulary-content';
    const wordLine = document.createElement('span');
    wordLine.className = 'vocabulary-word-line';
    const radical = document.createElement('span');
    radical.className = 'vocabulary-hanzi';
    radical.textContent = item.radical || '';
    const pinyin = document.createElement('span');
    pinyin.className = 'vocabulary-pinyin';
    pinyin.textContent = item.pinyin || '';
    const strokeTag = document.createElement('span');
    strokeTag.className = 'vocabulary-pinyin';
    strokeTag.textContent = `${stroke} nét`;
    const meaning = document.createElement('span');
    meaning.className = 'vocabulary-meaning';
    meaning.textContent = `${item.name || ''} · ${item.meaning || ''}`;
    const badge = document.createElement('span');
    badge.className = `vocabulary-status vocabulary-status--${status}`;
    badge.textContent = statusLabels[status];

    wordLine.append(radical, pinyin, strokeTag);
    content.append(wordLine, meaning);
    button.append(number, content, badge);
    fragment.appendChild(button);
  });
  list.appendChild(fragment);
}

function openRadicalInCards(groupIndex, itemIndexInGroup) {
  radicalGroupIndex = groupIndex;
  radicalWords = RADICAL_GROUPS[radicalReturnTab][groupIndex];
  radicalOrder = Array.from({ length: radicalWords.length }, (_, i) => i);
  radicalCurrentFilter = 'all';
  radicalFilteredOrder = radicalOrder.slice();
  radicalIdx = radicalFilteredOrder.indexOf(itemIndexInGroup);
  if (radicalIdx < 0) radicalIdx = 0;
  renderRadicalFilters();
  setRadicalViewMode('cards');
  renderRadicalCard('fade');
  document.getElementById('radicalCardArea').scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
}

function toggleRadicalTransferPanel(forceOpen) {
  const panel = document.getElementById('radicalTransferPanel');
  const button = document.getElementById('radicalTransferToggle');
  if (!panel) return;
  const willOpen = typeof forceOpen === 'boolean' ? forceOpen : panel.hidden;
  panel.hidden = !willOpen;
  if (button) {
    button.setAttribute('aria-expanded', String(willOpen));
    button.classList.toggle('on', willOpen);
  }
}

function radicalRelationLabel(type) {
  if (type === 'semantic') return 'Gợi nghĩa';
  if (type === 'phonetic') return 'Gợi âm';
  if (type === 'historical_graphic') return 'Cấu tạo/lịch sử';
  if (type === 'direct') return 'Ví dụ trực tiếp';
  if (type === 'historical_form') return 'Dạng chữ lịch sử';
  if (type === 'semantic_historical') return 'Nghĩa phát triển';
  if (type === 'traditional_analysis') return 'Cách phân tích truyền thống';
  return type || '';
}

function renderRadicalCard(animate) {
  const content = document.getElementById('radicalCardContent');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function applyContent() {
    if (content) content.className = 'card-content';
    const back = document.getElementById('radicalBack');
    if (back) back.classList.remove('show');
    document.getElementById('radicalHint').textContent = 'Nhấn vào thẻ để xem nghĩa và ví dụ';

    if (radicalFilteredOrder.length === 0) {
      document.getElementById('radChar').textContent = '';
      document.getElementById('radName').textContent = '';
      document.getElementById('radPinyin').textContent = '';
      document.getElementById('radMeaning').textContent = 'Không có bộ thủ trong bộ lọc này';
      document.getElementById('radDescription').hidden = true;
      document.getElementById('radVariants').hidden = true;
      document.getElementById('radExamples').hidden = true;
      document.getElementById('radicalBack').classList.add('show');
      document.getElementById('radicalHint').textContent = '';
      updateRadicalProgress(0, 0);
      updateRadicalStats();
      return;
    }

    const item = radicalWords[radicalFilteredOrder[radicalIdx % radicalFilteredOrder.length]];
    document.getElementById('radChar').textContent = item.radical || '';
    document.getElementById('radName').textContent = item.name || '';
    document.getElementById('radPinyin').textContent = showRadicalPinyin ? (item.pinyin || '') : '';
    document.getElementById('radMeaning').textContent = item.meaning || '';

    const descNode = document.getElementById('radDescription');
    descNode.hidden = !item.description;
    descNode.textContent = item.description || '';

    const variantsNode = document.getElementById('radVariants');
    if (Array.isArray(item.variants) && item.variants.length) {
      variantsNode.hidden = false;
      variantsNode.innerHTML = '<div class="ex-label">Dị thể</div>' +
        item.variants.map(v => `<span class="variant-chip">${v}</span>`).join('');
    } else {
      variantsNode.hidden = true;
      variantsNode.innerHTML = '';
    }

    const examplesNode = document.getElementById('radExamples');
    if (Array.isArray(item.examples) && item.examples.length) {
      examplesNode.hidden = false;
      examplesNode.innerHTML = '<div class="ex-label">Ví dụ</div>' + item.examples.map(ex => `
        <div class="radical-example">
          <div class="ex-line ex-zh">${ex.hanzi || ''}</div>
          ${showRadicalPinyin && ex.pinyin ? `<div class="ex-line ex-py">${ex.pinyin}</div>` : ''}
          <div class="ex-line ex-vi">${ex.meaning || ''}</div>
          ${ex.relation ? `<div class="radical-relation"><span class="relation-badge">${radicalRelationLabel(ex.relation_type)}</span>${ex.relation}</div>` : ''}
        </div>`).join('');
    } else {
      examplesNode.hidden = true;
      examplesNode.innerHTML = '';
    }

    updateRadicalProgress(radicalIdx % radicalFilteredOrder.length + 1, radicalFilteredOrder.length);
    updateRadicalStats();

    if (animate && content && !prefersReduced) {
      if (animate === 'next') content.classList.add('enter-right');
      else if (animate === 'prev') content.classList.add('enter-left');
      else content.classList.add('enter-fade');
    }
  }

  if (!animate || !content || prefersReduced) { applyContent(); return; }

  content.className = 'card-content';
  if (animate === 'next') content.classList.add('exit-left');
  else if (animate === 'prev') content.classList.add('exit-right');
  else content.classList.add('exit-fade');

  setTimeout(applyContent, 150);
}

function updateRadicalProgress(current, total) {
  const text = document.getElementById('radicalProgressText');
  if (text) text.textContent = total === 0 ? '0 / 0' : current + ' / ' + total;
  const bar = document.getElementById('radicalProgressBar');
  if (bar) bar.style.width = (total === 0 ? 0 : (current / total * 100)) + '%';
}

function radicalFlip() {
  if (radicalFilteredOrder.length === 0) return;
  const back = document.getElementById('radicalBack');
  const willShow = !back.classList.contains('show');
  back.classList.toggle('show', willShow);
  document.getElementById('radicalHint').textContent = willShow ? 'Nhấn lại để ẩn' : 'Nhấn vào thẻ để xem nghĩa và ví dụ';
}

function nextRadicalCard() {
  if (radicalFilteredOrder.length === 0) return;
  radicalIdx = (radicalIdx + 1) % radicalFilteredOrder.length;
  renderRadicalCard('next');
}
function prevRadicalCard() {
  if (radicalFilteredOrder.length === 0) return;
  radicalIdx = (radicalIdx - 1 + radicalFilteredOrder.length) % radicalFilteredOrder.length;
  renderRadicalCard('prev');
}
function markRadicalKnown() {
  if (radicalFilteredOrder.length === 0) return;
  const itemIndex = radicalFilteredOrder[radicalIdx % radicalFilteredOrder.length];
  const item = radicalWords[itemIndex];
  radicalProgress[radicalProgressKey(item)] = 'known';
  saveRadicalProgress();
  advanceAfterRadicalMark(itemIndex);
}
function markRadicalUnknown() {
  if (radicalFilteredOrder.length === 0) return;
  const itemIndex = radicalFilteredOrder[radicalIdx % radicalFilteredOrder.length];
  const item = radicalWords[itemIndex];
  radicalProgress[radicalProgressKey(item)] = 'unknown';
  saveRadicalProgress();
  advanceAfterRadicalMark(itemIndex);
}
function advanceAfterRadicalMark(previousItemIndex) {
  if (radicalCurrentFilter === 'all') {
    nextRadicalCard();
    return;
  }

  const previousPosition = radicalIdx;
  radicalFilteredOrder = filteredRadicalIndexes(radicalCurrentFilter);
  renderRadicalFilters();
  if (radicalFilteredOrder.length === 0) {
    radicalIdx = 0;
  } else if (radicalFilteredOrder.includes(previousItemIndex)) {
    radicalIdx = (previousPosition + 1) % radicalFilteredOrder.length;
  } else {
    radicalIdx = Math.min(previousPosition, radicalFilteredOrder.length - 1);
  }
  renderRadicalCard('fade');
}
function shuffleRadicalDeck() {
  shuffleArray(radicalOrder);
  setRadicalFilter(radicalCurrentFilter);
}
function toggleRadicalPinyin() {
  showRadicalPinyin = !showRadicalPinyin;
  const btn = document.getElementById('radicalPinyinToggle');
  if (btn) {
    btn.textContent = showRadicalPinyin ? '👁 Đang hiện pinyin' : '🙈 Chế độ thử thách: ẩn pinyin';
    btn.classList.toggle('on', !showRadicalPinyin);
  }
  saveRadicalPrefs();
  renderRadicalCard();
}
