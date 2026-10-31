// Hanzi Radical & Character Decomposition System (Chiết tự & Bóc tách bộ thủ)
// Minimal, clean: chỉ hiển thị chữ cấu thành từ những bộ thủ nào.

let hanziDecompData = null;
let hanziDecompLoadPromise = null;
let activeHighlightTimer = null;

async function ensureHanziDecompLoaded() {
  if (hanziDecompData) return hanziDecompData;
  if (hanziDecompLoadPromise) return hanziDecompLoadPromise;

  hanziDecompLoadPromise = fetch('database/radicals/hanzi_decompositions.json?v=20261014-clean-v3')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load hanzi_decompositions.json');
      return res.json();
    })
    .then(data => {
      hanziDecompData = data;
      return data;
    })
    .catch(err => {
      console.warn('Could not load hanzi decompositions:', err);
      return {};
    })
    .finally(() => {
      hanziDecompLoadPromise = null;
    });

  return hanziDecompLoadPromise;
}

function getCharacterDecomposition(char) {
  if (!hanziDecompData || !char) return null;
  return hanziDecompData[char] || null;
}

function getWordDecomposition(wordOrHanzi) {
  if (!wordOrHanzi) return [];
  const rawText = typeof wordOrHanzi === 'object' ? (wordOrHanzi.hanzi || wordOrHanzi.word || '') : String(wordOrHanzi);
  const text = rawText.replace(/[（\(].*?[）\)]/g, '').trim() || rawText;
  const chars = Array.from(text).filter(ch => /\p{Script=Han}/u.test(ch));
  if (!hanziDecompData) return chars.map(ch => ({ character: ch, components: [], formula: ch }));
  return chars.map(ch => hanziDecompData[ch] || { character: ch, components: [], formula: ch });
}

// Highlight and animate strokes of a component on the HanziWriter canvas
function highlightComponentStrokes(strokeIndices) {
  if (!Array.isArray(strokeIndices) || strokeIndices.length === 0) return;
  if (typeof strokeWriters === 'undefined' || typeof activeCharIndex === 'undefined') return;

  const writer = strokeWriters[activeCharIndex];
  if (!writer) return;

  try {
    if (typeof stopSequentialAnimation === 'function') stopSequentialAnimation();
    if (typeof cancelActiveQuiz === 'function') cancelActiveQuiz();
  } catch (e) {}

  clearTimeout(activeHighlightTimer);

  strokeIndices.forEach((sIdx, order) => {
    activeHighlightTimer = setTimeout(() => {
      try {
        if (typeof writer.animateStroke === 'function') {
          writer.animateStroke(sIdx);
        } else if (typeof writer.highlightStroke === 'function') {
          writer.highlightStroke(sIdx);
        }
      } catch (e) {}
    }, order * 340);
  });
}

// Render concise decomposition box under the writing canvas in "Nét chữ" tab
function renderStrokeDecomposition(char, container) {
  const mount = container || document.getElementById('strokeDecompContainer');
  if (!mount) return;

  if (!char) {
    mount.innerHTML = '';
    return;
  }

  const decomp = getCharacterDecomposition(char);
  if (!decomp) {
    ensureHanziDecompLoaded().then(() => {
      if (typeof currentStrokeChars !== 'undefined' && currentStrokeChars[activeCharIndex] === char) {
        renderStrokeDecomposition(char, mount);
      }
    });
    mount.innerHTML = '';
    return;
  }

  const comps = decomp.components || [];
  let formula = (decomp.formula || '').trim();

  // Safeguard: never leave formula hanging with trailing '=' or empty
  if (!formula || formula.endsWith('=')) {
    if (comps.length > 0) {
      formula = `${char} = ` + comps.map(c => `${c.char} (${(c.name || '').replace('Bộ ', '')})`).join(' + ');
    } else {
      const radName = decomp.name || (decomp.radical && decomp.radical.name) || (decomp.hanviet ? `Bộ ${decomp.hanviet}` : '');
      formula = radName ? `${char} (${radName})` : `${char} (Bộ thủ độc lập)`;
    }
  }

  // If no components exist but char itself is a radical or single body, provide a self chip
  const displayChips = comps.length > 0 ? comps : [{
    char: char,
    name: decomp.name || (decomp.hanviet ? `Bộ ${decomp.hanviet}` : char),
    meaning: decomp.meaning || '',
    stroke_indices: []
  }];

  let html = `
    <div class="stroke-decomp-clean">
      <div class="stroke-decomp-header-clean">
        <span class="stroke-decomp-icon">🧩</span>
        <span class="stroke-decomp-label">Bộ thủ cấu thành:</span>
        <strong class="stroke-decomp-formula-clean">${formula}</strong>
      </div>
      ${displayChips.length > 0 ? `
        <div class="stroke-decomp-chips">
          ${displayChips.map(c => `
            <button type="button" class="stroke-decomp-chip"
              onclick="highlightComponentStrokes([${(c.stroke_indices || []).join(',')}])"
              title="Nhấn để xem nét của bộ ${c.name} trên ô viết chữ">
              <span class="chip-char" lang="zh-CN">${c.char}</span>
              <span class="chip-name">${c.name}</span>
              ${c.meaning ? `<span class="chip-meaning">(${c.meaning})</span>` : ''}
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  mount.innerHTML = html;
}

const RADICAL_COLOR_PALETTE = ['#38bdf8', '#fb923c', '#34d399', '#f43f5e', '#a78bfa'];

// Render clean, non-intrusive character decomposition on flashcard
function renderCardRadicals(word) {
  const mount = document.getElementById('cardRadicalsRow');
  const wrap = document.getElementById('cardDecompositionWrap');
  const accordion = document.getElementById('cardDecompAccordion');
  if (!mount) return;

  const hideDecomp = () => {
    mount.innerHTML = '';
    mount.style.display = 'none';
    if (wrap) {
      wrap.hidden = true;
      wrap.style.display = 'none';
    }
    if (accordion) {
      accordion.hidden = true;
      accordion.style.display = 'none';
      accordion.open = false;
    }
    if (typeof syncCardSupportingGroup === 'function') syncCardSupportingGroup();
  };

  hideDecomp();

  if (!word || !word.hanzi) {
    return;
  }

  ensureHanziDecompLoaded().then(() => {
    const raw = String(word.hanzi || '');
    const clean = raw.replace(/[（\(].*?[）\)]/g, '').trim() || raw;
    const chars = Array.from(clean).filter(ch => /\p{Script=Han}/u.test(ch));
    if (chars.length === 0) {
      hideDecomp();
      return;
    }

    const charDecomps = [];
    chars.forEach((ch, charIdx) => {
      const d = getCharacterDecomposition(ch);
      if (!d || !Array.isArray(d.components) || d.components.length === 0) return;
      charDecomps.push({
        ch,
        charIdx,
        comps: d.components
      });
    });

    if (charDecomps.length === 0) {
      hideDecomp();
      return;
    }

    if (accordion) {
      accordion.hidden = false;
      accordion.style.display = 'block';
      accordion.open = false;
    }
    if (wrap) {
      wrap.hidden = false;
      wrap.style.display = 'block';
    }
    mount.style.display = 'flex';

    if (charDecomps.length === 1) {
      const { ch, charIdx, comps } = charDecomps[0];
      mount.innerHTML = `
        <div class="card-decomp-formula-wrap">
          <div class="card-decomp-chars-row">
            ${comps.map((c, idx) => {
              const compColor = RADICAL_COLOR_PALETTE[idx % RADICAL_COLOR_PALETTE.length];
              return `
                <button type="button" class="card-decomp-char-btn"
                  onclick="event.stopPropagation(); jumpToStudyRadical('${ch}', ${charIdx}, [${(c.stroke_indices || []).join(',')}])"
                  title="Thành phần: ${c.name.replace('Bộ ', '')}">
                  <span class="card-decomp-char" style="color: ${compColor}; font-weight: 700;" lang="zh-CN">${c.char}</span>
                  <span class="card-decomp-sub">${(c.name || c.char).replace('Bộ ', '')}</span>
                </button>
                ${idx < comps.length - 1 ? '<span class="card-decomp-op">+</span>' : ''}
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else {
      mount.innerHTML = `
        <div class="card-decomp-multi-wrap">
          ${charDecomps.map(({ ch, charIdx, comps }) => `
            <div class="card-decomp-char-block">
              <div class="card-decomp-chars-row">
                <span class="card-decomp-target-char" lang="zh-CN">${ch}:</span>
                ${comps.map((c, idx) => {
                  const compColor = RADICAL_COLOR_PALETTE[idx % RADICAL_COLOR_PALETTE.length];
                  return `
                    <button type="button" class="card-decomp-char-btn"
                      onclick="event.stopPropagation(); jumpToStudyRadical('${ch}', ${charIdx}, [${(c.stroke_indices || []).join(',')}])"
                      title="Thành phần: ${c.name.replace('Bộ ', '')}">
                      <span class="card-decomp-char" style="color: ${compColor}; font-weight: 700;" lang="zh-CN">${c.char}</span>
                      <span class="card-decomp-sub">${(c.name || c.char).replace('Bộ ', '')}</span>
                    </button>
                    ${idx < comps.length - 1 ? '<span class="card-decomp-op">+</span>' : ''}
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (typeof syncCardSupportingGroup === 'function') syncCardSupportingGroup();
  });
}

function jumpToStudyRadical(char, charIdx, strokeIndices) {
  if (typeof toggleStudyWritingPanel === 'function') {
    toggleStudyWritingPanel(true);
  }
  if (typeof setSidebarStudyTab === 'function') {
    setSidebarStudyTab('stroke');
  }
  setTimeout(() => {
    if (typeof selectCharacterAtIndex === 'function' && typeof charIdx === 'number') {
      selectCharacterAtIndex(charIdx, false);
    }
    if (Array.isArray(strokeIndices) && strokeIndices.length > 0) {
      setTimeout(() => highlightComponentStrokes(strokeIndices), 180);
    }
  }, 120);
}

// Render clean, concise "Bộ thủ" panel without fluff or walls of text
function renderStudyRadicalsPanel(word) {
  const panel = document.getElementById('studyRadicalsPanel');
  if (!panel) return;

  if (!word || !word.hanzi) {
    panel.innerHTML = '<div class="study-radicals-empty">Chọn một từ để xem các bộ thủ cấu thành.</div>';
    return;
  }

  ensureHanziDecompLoaded().then(() => {
    const decompList = getWordDecomposition(word);
    if (!decompList || decompList.length === 0) {
      panel.innerHTML = '<div class="study-radicals-empty">Chưa có dữ liệu bộ thủ cho từ này.</div>';
      return;
    }

    let html = `
      <div class="study-radicals-clean">
        <div class="radicals-clean-header">
          <span class="radicals-clean-icon">🧩</span>
          <span class="radicals-clean-title">Bộ thủ cấu thành:</span>
          <strong class="radicals-clean-word">${word.hanzi}</strong>
        </div>

        <div class="radicals-clean-list">
          ${decompList.map(d => {
            const comps = d.components || [];
            return `
              <div class="radicals-clean-row">
                <div class="radicals-char-lead">
                  <span class="radicals-char-badge" lang="zh-CN">${d.character}</span>
                  <span class="radicals-arrow">=</span>
                </div>
                <div class="radicals-comps-wrap">
                  ${comps.length > 0 ? comps.map(c => `
                    <span class="radicals-comp-badge" title="${c.meaning ? `${c.name}: ${c.meaning}` : c.name}">
                      <strong class="rc-char" lang="zh-CN">${c.char}</strong>
                      <span class="rc-name">${c.name}</span>
                    </span>
                  `).join('<span class="rc-plus">+</span>') : `
                    <span class="radicals-comp-badge">
                      <strong class="rc-char" lang="zh-CN">${d.character}</strong>
                      <span class="rc-name">${d.name || (d.hanviet ? `Bộ ${d.hanviet}` : 'Bộ thủ độc lập')}</span>
                    </span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    panel.innerHTML = html;
  });
}

function toggleStudyRadicalsPanel(forceOpen) {
  const isOpen = document.body.classList.contains('study-sidebar-open');
  const isTargetTab = document.body.dataset.sidebarTab === 'radicals';
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : (!isOpen || !isTargetTab);

  if (shouldOpen) {
    document.body.classList.add('study-sidebar-open');
    if (typeof window.setSidebarStudyTab === 'function') {
      window.setSidebarStudyTab('radicals');
    }
  } else {
    document.body.classList.remove('study-sidebar-open');
  }
}

function initStudyRadicalsWrap() {
  const mount = document.getElementById('workstationRight') || document.getElementById('screenCards');
  if (!mount) return;
  if (document.getElementById('studyRadicalsWrap')) return;

  const wrap = document.createElement('div');
  wrap.className = 'study-radicals-panel';
  wrap.id = 'studyRadicalsWrap';
  wrap.innerHTML = `
    <div class="sidebar-panel-header">
      <div class="sidebar-panel-title">Bóc tách bộ thủ</div>
    </div>
    <div id="studyRadicalsPanel" class="study-radicals-body"></div>
  `;
  mount.appendChild(wrap);

  if (typeof activeStudyWord !== 'undefined' && activeStudyWord) {
    renderStudyRadicalsPanel(activeStudyWord);
  }
}

function initHanziDecomposition() {
  ensureHanziDecompLoaded();
  initStudyRadicalsWrap();

  if (typeof onActiveWordChange === 'function') {
    onActiveWordChange(word => {
      renderCardRadicals(word);
      renderStudyRadicalsPanel(word);
    });
  }
}

document.addEventListener('DOMContentLoaded', initHanziDecomposition);

// Exports
window.ensureHanziDecompLoaded = ensureHanziDecompLoaded;
window.getCharacterDecomposition = getCharacterDecomposition;
window.getWordDecomposition = getWordDecomposition;
window.highlightComponentStrokes = highlightComponentStrokes;
window.renderStrokeDecomposition = renderStrokeDecomposition;
window.renderCardRadicals = renderCardRadicals;
window.renderStudyRadicalsPanel = renderStudyRadicalsPanel;
window.jumpToStudyRadical = jumpToStudyRadical;
window.toggleStudyRadicalsPanel = toggleStudyRadicalsPanel;
window.initStudyRadicalsWrap = initStudyRadicalsWrap;
