// Radical (Bộ thủ) mode configuration and in-memory state.
// Port of legacy assets/js/radicals-state.js.

export const RADICAL_STROKE_COUNTS = { basic50: 10, kangxi214: 17 };

export function radicalStrokeUrl(set, n) {
  const dir = set === 'basic50' ? 'basic_50_radicals' : 'kangxi_214_radicals';
  return `database/radicals/${dir}/stroke_${String(n).padStart(2, '0')}.json`;
}

export function radicalProgressKey(item) {
  return String(item.kangxi_id !== undefined ? item.kangxi_id : item.id);
}

export function radicalStorageKey(suffix) {
  return 'hsk_radical_' + suffix + '_v1';
}

export function loadRadicalProgress() {
  try {
    const p = localStorage.getItem(radicalStorageKey('progress'));
    if (p && window.radicalProgress) {
      const parsed = JSON.parse(p);
      Object.keys(window.radicalProgress).forEach(k => delete window.radicalProgress[k]);
      Object.assign(window.radicalProgress, parsed);
    }
  } catch (e) {}
}

export function saveRadicalProgress() {
  try {
    localStorage.setItem(radicalStorageKey('progress'), JSON.stringify(window.radicalProgress || {}));
  } catch (e) {}
}

export function loadRadicalPrefs() {
  try {
    const pref = localStorage.getItem(radicalStorageKey('prefs'));
    if (pref) {
      const parsed = JSON.parse(pref);
      if (typeof parsed.showPinyin === 'boolean') {
        window.showRadicalPinyin = parsed.showPinyin;
      }
    }
  } catch (e) {}
}

export function saveRadicalPrefs() {
  try {
    localStorage.setItem(radicalStorageKey('prefs'), JSON.stringify({ showPinyin: window.showRadicalPinyin }));
  } catch (e) {}
}

export function mountRadicalsState() {
  window.RADICAL_STROKE_COUNTS = RADICAL_STROKE_COUNTS;
  window.radicalStrokeUrl = radicalStrokeUrl;
  window.radicalProgressKey = radicalProgressKey;
  window.radicalStorageKey = radicalStorageKey;
  window.loadRadicalProgress = loadRadicalProgress;
  window.saveRadicalProgress = saveRadicalProgress;
  window.loadRadicalPrefs = loadRadicalPrefs;
  window.saveRadicalPrefs = saveRadicalPrefs;

  if (typeof window.primaryTab === 'undefined') window.primaryTab = 'vocab';
  if (typeof window.radicalTab === 'undefined') window.radicalTab = 'basic50';
  if (typeof window.radicalDataLoaded === 'undefined') window.radicalDataLoaded = false;
  if (typeof window.RADICAL_GROUPS === 'undefined') window.RADICAL_GROUPS = { basic50: [], kangxi214: [] };

  if (typeof window.radicalOrder === 'undefined') window.radicalOrder = [];
  if (typeof window.radicalFilteredOrder === 'undefined') window.radicalFilteredOrder = [];
  if (typeof window.radicalIdx === 'undefined') window.radicalIdx = 0;
  if (typeof window.radicalWords === 'undefined') window.radicalWords = [];
  if (typeof window.radicalReturnTab === 'undefined') window.radicalReturnTab = 'basic50';
  if (typeof window.radicalGroupIndex === 'undefined') window.radicalGroupIndex = 0;
  if (typeof window.radicalProgress === 'undefined') window.radicalProgress = {};
  if (typeof window.showRadicalPinyin === 'undefined') window.showRadicalPinyin = true;
  if (typeof window.radicalCurrentFilter === 'undefined') window.radicalCurrentFilter = 'all';
  if (typeof window.radicalCurrentView === 'undefined') window.radicalCurrentView = 'cards';
  if (typeof window.radicalOverviewQuery === 'undefined') window.radicalOverviewQuery = '';
  if (typeof window.radicalOverviewStatus === 'undefined') window.radicalOverviewStatus = 'all';
  if (typeof window.radicalOverviewStroke === 'undefined') window.radicalOverviewStroke = 'all';
  if (typeof window.radicalOverviewItems === 'undefined') window.radicalOverviewItems = [];
}
