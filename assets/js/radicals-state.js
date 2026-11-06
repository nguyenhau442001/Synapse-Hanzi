// Radical (Bộ thủ) mode configuration and in-memory state.
const RADICAL_STROKE_COUNTS = { basic50: 10, kangxi214: 17 };
function radicalStrokeUrl(set, n) {
  const dir = set === 'basic50' ? 'basic_50_radicals' : 'kangxi_214_radicals';
  return `database/radicals/${dir}/stroke_${String(n).padStart(2, '0')}.json`;
}

let primaryTab = 'vocab';
let radicalTab = 'basic50';
let radicalDataLoaded = false;
let RADICAL_GROUPS = { basic50: [], kangxi214: [] };

let radicalOrder = [];
let radicalFilteredOrder = [];
let radicalIdx = 0;
let radicalWords = [];
let radicalReturnTab = 'basic50';
let radicalGroupIndex = 0;
let radicalProgress = {};
let showRadicalPinyin = true;
let radicalCurrentFilter = 'all';
let radicalCurrentView = 'cards';
let radicalOverviewQuery = '';
let radicalOverviewStatus = 'all';
let radicalOverviewStroke = 'all';
let radicalOverviewItems = [];

function radicalProgressKey(item) {
  return String(item.kangxi_id !== undefined ? item.kangxi_id : item.id);
}
function radicalStorageKey(suffix) {
  return 'hsk_radical_' + suffix + '_v1';
}
function loadRadicalProgress() {
  try {
    const p = localStorage.getItem(radicalStorageKey('progress'));
    if (p) radicalProgress = JSON.parse(p);
  } catch (e) {}
}
function saveRadicalProgress() {
  try { localStorage.setItem(radicalStorageKey('progress'), JSON.stringify(radicalProgress)); } catch (e) {}
}
function loadRadicalPrefs() {
  try {
    const pref = localStorage.getItem(radicalStorageKey('prefs'));
    if (pref) {
      const parsed = JSON.parse(pref);
      if (typeof parsed.showPinyin === 'boolean') showRadicalPinyin = parsed.showPinyin;
    }
  } catch (e) {}
}
function saveRadicalPrefs() {
  try { localStorage.setItem(radicalStorageKey('prefs'), JSON.stringify({ showPinyin: showRadicalPinyin })); } catch (e) {}
}
