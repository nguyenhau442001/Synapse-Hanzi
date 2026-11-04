// HSK 3.0 level picker: version switcher + dynamic grid, reusing the LEVELS/selectLevel pipeline.
// HSK 3.0 is the current standard and shown by default; HSK 2.0 is kept as a legacy option.
// Storage key bumped so earlier saved '2.0' defaults migrate to HSK 3.0 once.
const PICKER_VERSION_STORAGE_KEY = 'hsk_picker_version_v2';
const DEFAULT_PICKER_VERSION = '3.0';
let pickerVersion = DEFAULT_PICKER_VERSION;

function getInitialPickerVersion() {
  try {
    const params = new URLSearchParams(window.location.search);
    const paramVer = params.get('version');
    if (paramVer === '2.0' || paramVer === '3.0') return paramVer;
  } catch (e) {}
  try {
    const saved = localStorage.getItem(PICKER_VERSION_STORAGE_KEY);
    if (saved === '2.0' || saved === '3.0') return saved;
  } catch (e) {}
  return DEFAULT_PICKER_VERSION;
}

function setPickerVersion(version) {
  pickerVersion = version;
  try {
    localStorage.setItem(PICKER_VERSION_STORAGE_KEY, version);
  } catch (e) {}
  const selector = document.getElementById('pickerVersionSelect');
  if (selector) selector.value = version;
  const g20 = document.getElementById('levelGrid20');
  const g30 = document.getElementById('levelGrid30');
  if (g20) g20.style.display = version === '2.0' ? '' : 'none';
  if (g30) g30.style.display = version === '3.0' ? '' : 'none';
  if (version === '3.0') renderHsk30Grid();
}

document.addEventListener('DOMContentLoaded', () => {
  setPickerVersion(getInitialPickerVersion());
});

function hsk30KnownCount(level) {
  const data = readSavedLevelProgress(level);
  return Object.values(data).filter(status => status === 'known').length;
}

function renderHsk30Grid() {
  const grid = document.getElementById('levelGrid30');
  if (!grid) return;

  grid.innerHTML = hsk30LevelKeys().map(key => {
    const cfg = LEVELS_HSK30[key];
    const known = hsk30KnownCount(key);
    const rawPct = cfg.total > 0 ? (known / cfg.total * 100) : 0;
    const pctStr = typeof formatProgressPercent === 'function'
      ? formatProgressPercent(known, cfg.total)
      : (cfg.total > 0 ? `${parseFloat(rawPct.toFixed(3))}%` : '0%');
    const complete = known >= cfg.total;
    const isLearning = known > 0 && !complete;
    const shortLabel = 'HSK' + key.replace('hsk30_', '');
    const metaText = `${cfg.band} · ${cfg.total.toLocaleString('vi-VN')} từ`;
    const tooltip = `${cfg.label} · ${cfg.band} · ${known}/${cfg.total} từ (${pctStr})`;

    const statusBadge = complete
      ? '<span class="level-status-badge is-complete">✓ Hoàn thành</span>'
      : isLearning
      ? '<span class="level-status-badge is-learning">● Đang học</span>'
      : '<span class="level-status-badge">Chưa học</span>';

    return `
      <button class="level-card hsk30-level-card ${cfg.available ? '' : 'disabled'}${complete ? ' is-complete-level' : ''}${isLearning ? ' is-learning-level' : ''}"
        type="button" data-level="${key}" title="${tooltip}" aria-label="${cfg.label}"
        ${cfg.available ? `onclick="selectLevel('${key}')"` : 'disabled'}>
        <div class="level-card-top">
          <div class="level-card-heading">
            <strong class="lvl-num">${shortLabel}</strong>
          </div>
          <strong class="lvl-percent-value">${pctStr}</strong>
        </div>
        <div class="level-card-meta">
          <span class="lvl-label">${metaText}</span>
        </div>
        <div class="level-card-progress">
          <div class="lvl-mastery-track" aria-hidden="true">
            <div class="lvl-mastery-fill" style="width:${known > 0 ? Math.max(rawPct, 0.75) : 0}%"></div>
          </div>
        </div>
        <div class="level-card-bottom">
          <span class="lvl-mastery-text">${known.toLocaleString('vi-VN')} / ${cfg.total.toLocaleString('vi-VN')} đã nhớ</span>
          ${statusBadge}
        </div>
      </button>`;
  }).join('');
}

