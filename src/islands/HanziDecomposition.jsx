// Hanzi radical & character decomposition (Chiết tự & Bóc tách bộ thủ): the box under the writing
// canvas, the component row on the flashcard and the "Bóc tách bộ thủ" sidebar panel.
// Preact port of the former assets/js/hanzi-decomposition.js with the same markup and window API.
import { render } from 'preact';
import { onDomReady } from './domReady';

/* global APP_VERSION, strokeWriters, activeCharIndex, currentStrokeChars, activeStudyWord -- classic globals */

let decompData = null;
let loadPromise = null;
let highlightTimer = null;

export function ensureHanziDecompLoaded() {
  if (decompData) return Promise.resolve(decompData);
  if (loadPromise) return loadPromise;
  loadPromise = fetch('database/radicals/hanzi_decompositions.json?v=' + APP_VERSION)
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load hanzi_decompositions.json');
      return res.json();
    })
    .then((data) => { decompData = data; return data; })
    .catch((err) => { console.warn('Could not load hanzi decompositions:', err); return {}; })
    .finally(() => { loadPromise = null; });
  return loadPromise;
}

export function getCharacterDecomposition(char) {
  if (!decompData || !char) return null;
  return decompData[char] || null;
}

const hanChars = (text) => Array.from(text).filter((ch) => /\p{Script=Han}/u.test(ch));
const stripParens = (raw) => raw.replace(/[（(].*?[）)]/g, '').trim() || raw;

export function getWordDecomposition(wordOrHanzi) {
  if (!wordOrHanzi) return [];
  const rawText = typeof wordOrHanzi === 'object' ? (wordOrHanzi.hanzi || wordOrHanzi.word || '') : String(wordOrHanzi);
  const chars = hanChars(stripParens(rawText));
  if (!decompData) return chars.map((ch) => ({ character: ch, components: [], formula: ch }));
  return chars.map((ch) => decompData[ch] || { character: ch, components: [], formula: ch });
}

// Animate the strokes of one component on the active HanziWriter canvas.
export function highlightComponentStrokes(strokeIndices) {
  if (!Array.isArray(strokeIndices) || strokeIndices.length === 0) return;
  if (typeof strokeWriters === 'undefined' || typeof activeCharIndex === 'undefined') return;
  const writer = strokeWriters[activeCharIndex];
  if (!writer) return;
  try {
    if (typeof window.stopSequentialAnimation === 'function') window.stopSequentialAnimation();
    if (typeof window.cancelActiveQuiz === 'function') window.cancelActiveQuiz();
  } catch (e) { /* writer busy */ }
  clearTimeout(highlightTimer);
  strokeIndices.forEach((sIdx, order) => {
    highlightTimer = setTimeout(() => {
      try {
        if (typeof writer.animateStroke === 'function') writer.animateStroke(sIdx);
        else if (typeof writer.highlightStroke === 'function') writer.highlightStroke(sIdx);
      } catch (e) { /* stroke out of range */ }
    }, order * 340);
  });
}

// ---- "Nét chữ" tab: decomposition box under the writing canvas ------------------------------

function StrokeDecomposition({ char, decomp }) {
  const comps = decomp.components || [];
  let formula = (decomp.formula || '').trim();
  // Never leave the formula empty or hanging on a trailing '='
  if (!formula || formula.endsWith('=')) {
    if (comps.length > 0) {
      formula = `${char} = ` + comps.map((c) => `${c.char} (${(c.name || '').replace('Bộ ', '')})`).join(' + ');
    } else {
      const radName = decomp.name || (decomp.radical && decomp.radical.name) || (decomp.hanviet ? `Bộ ${decomp.hanviet}` : '');
      formula = radName ? `${char} (${radName})` : `${char} (Bộ thủ độc lập)`;
    }
  }
  // A character without components gets a single chip for itself
  const chips = comps.length > 0 ? comps : [{
    char,
    name: decomp.name || (decomp.hanviet ? `Bộ ${decomp.hanviet}` : char),
    meaning: decomp.meaning || '',
    stroke_indices: []
  }];

  return (
    <div class="stroke-decomp-clean">
      <div class="stroke-decomp-header-clean">
        <span class="stroke-decomp-icon">🧩</span>{' '}
        <span class="stroke-decomp-label">Bộ thủ cấu thành:</span>{' '}
        <strong class="stroke-decomp-formula-clean">{formula}</strong>
      </div>{' '}
      <div class="stroke-decomp-chips">
        {chips.map((c, i) => [
          i > 0 ? ' ' : null,
          <button key={i} type="button" class="stroke-decomp-chip" onClick={() => highlightComponentStrokes(c.stroke_indices || [])}
            title={`Nhấn để xem nét của bộ ${c.name} trên ô viết chữ`}>
            <span class="chip-char" lang="zh-CN">{c.char}</span>{' '}
            <span class="chip-name">{c.name}</span>
            {c.meaning ? <>{' '}<span class="chip-meaning">{`(${c.meaning})`}</span></> : null}
          </button>
        ])}
      </div>
    </div>
  );
}

export function renderStrokeDecomposition(char, container) {
  const mount = container || document.getElementById('strokeDecompContainer');
  if (!mount) return;
  const decomp = char ? getCharacterDecomposition(char) : null;
  if (char && !decomp) {
    ensureHanziDecompLoaded().then(() => {
      if (typeof currentStrokeChars !== 'undefined' && currentStrokeChars[activeCharIndex] === char) renderStrokeDecomposition(char, mount);
    });
  }
  render(decomp ? <StrokeDecomposition char={char} decomp={decomp} /> : null, mount);
}

// ---- Flashcard: clickable "部件 + 部件" row --------------------------------------------------

const RADICAL_COLOR_PALETTE = ['#38bdf8', '#fb923c', '#34d399', '#f43f5e', '#a78bfa'];

export function jumpToStudyRadical(char, charIdx, strokeIndices) {
  if (typeof window.toggleStudyWritingPanel === 'function') window.toggleStudyWritingPanel(true);
  if (typeof window.setSidebarStudyTab === 'function') window.setSidebarStudyTab('stroke');
  setTimeout(() => {
    if (typeof window.selectCharacterAtIndex === 'function' && typeof charIdx === 'number') window.selectCharacterAtIndex(charIdx, false);
    if (Array.isArray(strokeIndices) && strokeIndices.length > 0) setTimeout(() => highlightComponentStrokes(strokeIndices), 180);
  }, 120);
}

function ComponentButtons({ ch, charIdx, comps }) {
  return comps.map((c, idx) => [
    <button key={`b${idx}`} type="button" class="card-decomp-char-btn"
      onClick={(e) => { e.stopPropagation(); jumpToStudyRadical(ch, charIdx, c.stroke_indices || []); }}
      title={`Thành phần: ${c.name.replace('Bộ ', '')}`}>
      <span class="card-decomp-char" style={`color: ${RADICAL_COLOR_PALETTE[idx % RADICAL_COLOR_PALETTE.length]}; font-weight: 700;`} lang="zh-CN">{c.char}</span>{' '}
      <span class="card-decomp-sub">{(c.name || c.char).replace('Bộ ', '')}</span>
    </button>,
    ' ',
    idx < comps.length - 1 ? <span key={`o${idx}`} class="card-decomp-op">+</span> : null,
    ' '
  ]);
}

function CardRadicals({ charDecomps }) {
  if (charDecomps.length === 1) {
    return (
      <div class="card-decomp-formula-wrap">
        <div class="card-decomp-chars-row"><ComponentButtons {...charDecomps[0]} /></div>
      </div>
    );
  }
  return (
    <div class="card-decomp-multi-wrap">
      {charDecomps.map((d) => (
        <div class="card-decomp-char-block" key={d.charIdx}>
          <div class="card-decomp-chars-row">
            <span class="card-decomp-target-char" lang="zh-CN">{`${d.ch}:`}</span>{' '}
            <ComponentButtons {...d} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function renderCardRadicals(word) {
  const mount = document.getElementById('cardRadicalsRow');
  const wrap = document.getElementById('cardDecompositionWrap');
  const accordion = document.getElementById('cardDecompAccordion');
  if (!mount) return;

  const hideDecomp = () => {
    render(null, mount);
    mount.style.display = 'none';
    window.setCardSectionVisible(accordion, wrap, false);
    if (typeof window.syncCardSupportingGroup === 'function') window.syncCardSupportingGroup();
  };
  hideDecomp();
  if (!word || !word.hanzi) return;

  ensureHanziDecompLoaded().then(() => {
    const chars = hanChars(stripParens(String(word.hanzi || '')));
    const charDecomps = [];
    chars.forEach((ch, charIdx) => {
      const d = getCharacterDecomposition(ch);
      if (d && Array.isArray(d.components) && d.components.length > 0) charDecomps.push({ ch, charIdx, comps: d.components });
    });
    if (charDecomps.length === 0) {
      hideDecomp();
      return;
    }
    window.setCardSectionVisible(accordion, wrap, true);
    mount.style.display = 'flex';
    render(<CardRadicals charDecomps={charDecomps} />, mount);
    if (typeof window.syncCardSupportingGroup === 'function') window.syncCardSupportingGroup();
  });
}

// ---- "Bộ thủ" sidebar tab --------------------------------------------------------------------

function RadicalBadge({ char, name, title }) {
  return (
    <span class="radicals-comp-badge" title={title}>
      <strong class="rc-char" lang="zh-CN">{char}</strong>{' '}
      <span class="rc-name">{name}</span>
    </span>
  );
}

function StudyRadicals({ word, decompList }) {
  return (
    <div class="study-radicals-clean">
      <div class="radicals-clean-header">
        <span class="radicals-clean-icon">🧩</span>{' '}
        <span class="radicals-clean-title">Bộ thủ cấu thành:</span>{' '}
        <strong class="radicals-clean-word">{word.hanzi}</strong>
      </div>{' '}
      <div class="radicals-clean-list">
        {decompList.map((d, i) => {
          const comps = d.components || [];
          return (
            <div class="radicals-clean-row" key={i}>
              <div class="radicals-char-lead">
                <span class="radicals-char-badge" lang="zh-CN">{d.character}</span>{' '}
                <span class="radicals-arrow">=</span>
              </div>{' '}
              <div class="radicals-comps-wrap">
                {comps.length > 0
                  ? comps.map((c, j) => [
                    j > 0 ? <>{' '}<span class="rc-plus">+</span>{' '}</> : null,
                    <RadicalBadge key={j} char={c.char} name={c.name} title={c.meaning ? `${c.name}: ${c.meaning}` : c.name} />
                  ])
                  : <RadicalBadge char={d.character} name={d.name || (d.hanviet ? `Bộ ${d.hanviet}` : 'Bộ thủ độc lập')} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function renderStudyRadicalsPanel(word) {
  const panel = document.getElementById('studyRadicalsPanel');
  if (!panel) return;
  if (!word || !word.hanzi) {
    render(<div class="study-radicals-empty">Chọn một từ để xem các bộ thủ cấu thành.</div>, panel);
    return;
  }
  ensureHanziDecompLoaded().then(() => {
    const decompList = getWordDecomposition(word);
    render(decompList.length
      ? <StudyRadicals word={word} decompList={decompList} />
      : <div class="study-radicals-empty">Chưa có dữ liệu bộ thủ cho từ này.</div>, panel);
  });
}

export function toggleStudyRadicalsPanel(forceOpen) {
  const isOpen = document.body.classList.contains('study-sidebar-open');
  const isTargetTab = document.body.dataset.sidebarTab === 'radicals';
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : (!isOpen || !isTargetTab);
  if (shouldOpen) {
    document.body.classList.add('study-sidebar-open');
    if (typeof window.setSidebarStudyTab === 'function') window.setSidebarStudyTab('radicals');
  } else {
    document.body.classList.remove('study-sidebar-open');
  }
}

export function initStudyRadicalsWrap() {
  const mount = document.getElementById('workstationRight') || document.getElementById('screenCards');
  if (!mount || document.getElementById('studyRadicalsWrap')) return;
  const wrap = document.createElement('div');
  wrap.className = 'study-radicals-panel';
  wrap.id = 'studyRadicalsWrap';
  const header = document.createElement('div');
  header.className = 'sidebar-panel-header';
  header.innerHTML = '<div class="sidebar-panel-title">Bóc tách bộ thủ</div>';
  const body = document.createElement('div');
  body.id = 'studyRadicalsPanel';
  body.className = 'study-radicals-body';
  wrap.append(header, body);
  // Same slot as before: right after the memory-curve panel, ahead of the stroke-order panel.
  const anchor = mount.querySelector(':scope > #memoryCurvePanel');
  if (anchor) anchor.after(wrap);
  else mount.appendChild(wrap);
  if (typeof activeStudyWord !== 'undefined' && activeStudyWord) renderStudyRadicalsPanel(activeStudyWord);
}

export function mountHanziDecomposition() {
  Object.assign(window, {
    ensureHanziDecompLoaded, getCharacterDecomposition, getWordDecomposition, highlightComponentStrokes,
    renderStrokeDecomposition, renderCardRadicals, renderStudyRadicalsPanel, jumpToStudyRadical,
    toggleStudyRadicalsPanel, initStudyRadicalsWrap
  });
  ensureHanziDecompLoaded();
  onDomReady(() => {
    initStudyRadicalsWrap();
    window.onActiveWordChange((word) => {
      renderCardRadicals(word);
      renderStudyRadicalsPanel(word);
    });
  });
}
