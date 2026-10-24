// Right sidebar: Accessible, spacious, single-focus Hanzi stroke-order & writing studio.
// Shows ONE large character canvas and ONE clear stroke number + directional arrow at a time.

let currentStrokeWord = null;
let currentStrokeChars = [];
let strokeWriters = [];
let strokeCharDataMap = {};
const globalCharDataCache = {};
let lastRenderedTheme = document.documentElement.dataset.theme || '';
let activeCharIndex = 0;
let activeStrokeIdx = 0;
let isAnimatingSequential = false;
let isQuizActive = false;
let completedCharsMap = {};
let animationStepTimer = null;

function extractHanziCharacters(text) {
  if (!text || typeof text !== 'string') return [];
  const clean = text.replace(/[（\(].*?[）\)]/g, '').trim();
  const target = clean || text;
  const chars = Array.from(target).filter(ch => /\p{Script=Han}/u.test(ch));
  if (chars.length > 0) return chars;
  return Array.from(target).filter(ch => ch.trim().length > 0 && !/[\s\p{P}]/u.test(ch));
}

function getStrokeColors() {
  const isDark = document.documentElement.dataset.theme === 'dark' ||
    (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return {
    isDark,
    strokeColor: isDark ? '#f1f5f9' : '#1e293b',
    radicalColor: isDark ? '#fb923c' : '#ea580c',
    outlineColor: isDark ? '#2d3246' : '#e2e8f0',
  };
}

function getGridBoxSize() {
  const panel = document.getElementById('strokeCanvasWrap');
  const rawWidth = (panel && panel.clientWidth > 180) ? panel.clientWidth - 36 : 360;
  return Math.min(230, Math.max(190, Math.floor(rawWidth * 0.62)));
}

// Classify basic Chinese stroke type and provide clear Vietnamese directional instructions
function classifyStrokeType(median) {
  if (!Array.isArray(median) || median.length < 2) {
    return { symbol: '一', name: 'Nét cơ bản', hint: 'Kéo bút theo hướng mũi tên chỉ dẫn' };
  }
  const pts = median.map(([x, y]) => [x, 900 - y]);
  let totalLen = 0;
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    const len = Math.hypot(dx, dy);
    if (len > 2) {
      segs.push({ dx, dy, len, angle: Math.atan2(dy, dx) * 180 / Math.PI });
      totalLen += len;
    }
  }
  if (segs.length === 0) {
    return { symbol: '丶', name: 'Nét chấm', hint: 'Chấm nhẹ từ trên xuống phải ↘' };
  }

  const start = pts[0];
  const end = pts[pts.length - 1];
  const overallDx = end[0] - start[0];
  const overallDy = end[1] - start[1];
  const directDist = Math.hypot(overallDx, overallDy);
  const overallAngle = Math.atan2(overallDy, overallDx) * 180 / Math.PI;

  let firstMajorAngle = segs[0].angle;
  let accum = 0;
  for (let i = 0; i < segs.length; i++) {
    accum += segs[i].len;
    if (accum >= totalLen * 0.25) {
      firstMajorAngle = Math.atan2(
        pts[Math.min(pts.length - 1, i + 1)][1] - start[1],
        pts[Math.min(pts.length - 1, i + 1)][0] - start[0]
      ) * 180 / Math.PI;
      break;
    }
  }
  const lastMajorAngle = Math.atan2(
    end[1] - pts[Math.max(0, pts.length - 2)][1],
    end[0] - pts[Math.max(0, pts.length - 2)][0]
  ) * 180 / Math.PI;

  let diffAngle = Math.abs(lastMajorAngle - firstMajorAngle);
  if (diffAngle > 180) diffAngle = 360 - diffAngle;

  const isBent = (totalLen > directDist * 1.24 && totalLen > 180) || (diffAngle >= 52 && totalLen > 170);
  if (isBent) {
    if (firstMajorAngle >= -28 && firstMajorAngle <= 32) {
      return { symbol: '𠃍', name: 'Nét ngang gập', hint: 'Kéo ngang sang phải rồi gập xuống ↴' };
    }
    if (firstMajorAngle >= 60 && firstMajorAngle <= 115) {
      if (lastMajorAngle < -30 || (overallDx < -20 && lastMajorAngle > 120)) {
        return { symbol: '亅', name: 'Nét sổ móc', hint: 'Kéo thẳng xuống rồi móc nhẹ lên ↵' };
      }
      return { symbol: '∟', name: 'Nét sổ gập', hint: 'Kéo thẳng xuống rồi gập sang phải ↳' };
    }
    if (firstMajorAngle > 115) {
      return { symbol: 'ㄑ', name: 'Nét phiệt gập', hint: 'Kéo xiên xuống rồi gập sang phải ↳' };
    }
    return { symbol: '𠃍', name: 'Nét gập', hint: 'Kéo theo đường chỉ dẫn rồi chuyển hướng ↴' };
  }

  if (totalLen < 210 && overallAngle > 12 && overallAngle < 88) {
    return { symbol: '丶', name: 'Nét chấm', hint: 'Chấm nhẹ từ trên xuống phải ↘' };
  }
  if (overallAngle >= -22 && overallAngle <= 22) {
    return { symbol: '一', name: 'Nét ngang', hint: 'Kéo ngang từ trái sang phải →' };
  }
  if (overallAngle >= 78 && overallAngle <= 98) {
    return { symbol: '丨', name: 'Nét sổ', hint: 'Kéo thẳng từ trên xuống dưới ↓' };
  }
  if (overallAngle < -22 && overallAngle >= -78 && overallDx > 0) {
    return { symbol: '㇀', name: 'Nét hất', hint: 'Hất chéo từ dưới lên phải ↗' };
  }
  if (overallAngle > 98 || overallAngle < -135) {
    return { symbol: '丿', name: 'Nét phiệt', hint: 'Kéo xiên từ phải qua trái xuống ↙' };
  }
  if (overallAngle > 22 && overallAngle < 78) {
    return totalLen < 230
      ? { symbol: '丶', name: 'Nét chấm', hint: 'Chấm nhẹ từ trên xuống phải ↘' }
      : { symbol: '㇏', name: 'Nét mác', hint: 'Kéo xiên từ trái qua phải xuống ↘' };
  }
  return { symbol: '一', name: 'Nét vẽ', hint: 'Kéo bút từ số thứ tự theo hướng mũi tên' };
}

// Compute large, unmistakable directional arrow and start badge position for a single stroke
function computeSingleStrokeGuideGeometry(median, boxSize, padding) {
  if (!Array.isArray(median) || median.length < 2) return null;
  const scale = (boxSize - 2 * padding) / 1024;
  const pts = median.map(([mx, my]) => [
    padding + mx * scale,
    padding + (900 - my) * scale
  ]);

  const cumLen = [0];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    cumLen.push(cumLen[i - 1] + d);
  }
  const totalLen = cumLen[cumLen.length - 1];
  if (totalLen < 4) return null;

  function pointAtLength(targetL) {
    const clamped = Math.max(0, Math.min(totalLen, targetL));
    for (let i = 1; i < pts.length; i++) {
      if (cumLen[i] >= clamped) {
        const segLen = cumLen[i] - cumLen[i - 1];
        const t = segLen > 0.001 ? (clamped - cumLen[i - 1]) / segLen : 0;
        return [
          pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
          pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t
        ];
      }
    }
    return pts[pts.length - 1];
  }

  const badgeRadius = 14;
  const startTrim = Math.min(totalLen * 0.25, badgeRadius + 3);
  const endTrim = Math.min(totalLen * 0.1, 6);

  const dStart = startTrim;
  const dTip = Math.max(dStart + 4, totalLen - endTrim);
  const arrowLen = Math.min(14, Math.max(9.5, totalLen * 0.28));
  const arrowHalfWidth = arrowLen * 0.58;

  const tipPt = pointAtLength(dTip);
  const lookbackDist = Math.max(arrowLen * 1.2, 12);
  const prevPt = pointAtLength(Math.max(0, dTip - lookbackDist));

  let ux = tipPt[0] - prevPt[0];
  let uy = tipPt[1] - prevPt[1];
  const uNorm = Math.hypot(ux, uy) || 1;
  ux /= uNorm;
  uy /= uNorm;

  const dLineEnd = Math.max(dStart + 1, dTip - arrowLen * 0.72);
  const linePts = [pointAtLength(dStart)];
  for (let i = 1; i < pts.length - 1; i++) {
    if (cumLen[i] > dStart && cumLen[i] < dLineEnd) {
      linePts.push(pts[i]);
    }
  }
  linePts.push(pointAtLength(dLineEnd));

  const baseX = tipPt[0] - ux * arrowLen;
  const baseY = tipPt[1] - uy * arrowLen;
  const leftX = baseX - uy * arrowHalfWidth;
  const leftY = baseY + ux * arrowHalfWidth;
  const rightX = baseX + uy * arrowHalfWidth;
  const rightY = baseY - ux * arrowHalfWidth;

  const polylineStr = linePts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const arrowPolyStr = `${tipPt[0].toFixed(1)},${tipPt[1].toFixed(1)} ${leftX.toFixed(1)},${leftY.toFixed(1)} ${rightX.toFixed(1)},${rightY.toFixed(1)}`;

  const bx = Math.max(badgeRadius + 6, Math.min(boxSize - badgeRadius - 6, pts[0][0]));
  const by = Math.max(badgeRadius + 6, Math.min(boxSize - badgeRadius - 6, pts[0][1]));

  return {
    bx,
    by,
    badgeRadius,
    polylineStr,
    arrowPolyStr
  };
}

// Render ONE focused stroke's visuals + large number badge + bold directional arrow
function renderFocusedStrokeOverlay() {
  const target = document.getElementById('strokeSingleGridTarget');
  if (!target) return;

  const existing = target.querySelector('.stroke-guide-overlay');
  if (existing) existing.remove();

  const charData = strokeCharDataMap[activeCharIndex];
  if (!charData || !Array.isArray(charData.strokes) || charData.strokes.length === 0) return;

  const totalStrokes = charData.strokes.length;
  const safeStrokeIdx = Math.max(0, Math.min(totalStrokes - 1, activeStrokeIdx ?? 0));
  const boxSize = parseInt(target.style.getPropertyValue('--grid-box-size') || '0', 10) || getGridBoxSize();
  const padding = Math.max(26, Math.round(boxSize * 0.13));
  const scale = (boxSize - 2 * padding) / 1024;
  const transformAttr = `translate(${padding.toFixed(2)}, ${(padding + 900 * scale).toFixed(2)}) scale(${scale.toFixed(5)}, ${(-scale).toFixed(5)})`;

  // In non-quiz mode, we render a crystal-clear custom stage showing:
  // 1) All strokes in faint outline
  // 2) Strokes 0 .. safeStrokeIdx-1 in completed solid ink
  // 3) Current stroke safeStrokeIdx in vivid orange
  let strokesStageHtml = '';
  if (!isQuizActive) {
    const ghostPaths = charData.strokes.map(p => `<path class="stage-stroke-ghost" d="${p}" />`).join('');
    const donePaths = charData.strokes.slice(0, safeStrokeIdx).map(p => `<path class="stage-stroke-done" d="${p}" />`).join('');
    const activePath = `<path class="stage-stroke-active" d="${charData.strokes[safeStrokeIdx]}" />`;
    strokesStageHtml = `
      <g class="stroke-stage-paths" transform="${transformAttr}">
        ${ghostPaths}
        ${donePaths}
        ${activePath}
      </g>
    `;
  }

  // Render ONLY the current stroke's directional arrow and large number badge
  const median = charData.medians ? charData.medians[safeStrokeIdx] : null;
  const geom = computeSingleStrokeGuideGeometry(median, boxSize, padding);
  let guideHtml = '';
  if (geom) {
    guideHtml = `
      <g class="stroke-guide-arrow-group is-highlighted">
        <polyline class="stroke-guide-line-halo" points="${geom.polylineStr}" />
        <polyline class="stroke-guide-line" points="${geom.polylineStr}" />
        <polygon class="stroke-guide-arrowhead" points="${geom.arrowPolyStr}" />
      </g>
      <g class="stroke-guide-badge-group is-highlighted">
        <circle class="stroke-guide-badge-circle" cx="${geom.bx.toFixed(1)}" cy="${geom.by.toFixed(1)}" r="${geom.badgeRadius}" />
        <text class="stroke-guide-badge-text" x="${geom.bx.toFixed(1)}" y="${geom.by.toFixed(1)}" font-size="14.5">${safeStrokeIdx + 1}</text>
      </g>
    `;
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', `stroke-guide-overlay${isQuizActive ? ' is-quiz-overlay' : ' is-stage-overlay'}`);
  svg.setAttribute('viewBox', `0 0 ${boxSize} ${boxSize}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `${strokesStageHtml}${guideHtml}`;
  target.appendChild(svg);
}

// Render top character switcher bar (only shown if word has >= 2 characters)
function renderCharacterSwitcherBar() {
  const wrap = document.getElementById('strokeCharSwitcherWrap');
  if (!wrap) return;

  const totalChars = currentStrokeChars.length;
  if (totalChars <= 1) {
    wrap.hidden = true;
    wrap.innerHTML = '';
    return;
  }

  wrap.hidden = false;
  wrap.innerHTML = currentStrokeChars.map((ch, idx) => {
    const cData = strokeCharDataMap[idx];
    const strokeCount = cData && Array.isArray(cData.strokes) ? `${cData.strokes.length} nét` : '';
    const isDone = Boolean(completedCharsMap[idx]);
    const isActive = idx === activeCharIndex;
    return `
      <button type="button" class="stroke-char-switch-btn${isActive ? ' active' : ''}${isDone ? ' is-done' : ''}" data-char-switch-idx="${idx}">
        <span class="char-switch-num">${isDone ? '✓' : `${idx + 1}.`}</span>
        <span class="char-switch-hanzi">${ch}</span>
        ${strokeCount ? `<span class="char-switch-count">${strokeCount}</span>` : ''}
      </button>
    `;
  }).join('');

  wrap.querySelectorAll('[data-char-switch-idx]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-char-switch-idx'), 10);
      if (!Number.isNaN(idx) && idx !== activeCharIndex) {
        selectCharacterAtIndex(idx, true);
      }
    });
  });
}

// Render the spacious, large-print Stroke Stepper Card below the canvas
function renderStrokeStepperCard() {
  const wrap = document.getElementById('strokeOrderStepsWrap');
  if (!wrap) return;

  if (!currentStrokeChars || currentStrokeChars.length === 0) {
    wrap.hidden = true;
    wrap.innerHTML = '';
    return;
  }

  const ch = currentStrokeChars[activeCharIndex];
  const charData = strokeCharDataMap[activeCharIndex];

  if (!charData || !Array.isArray(charData.strokes) || charData.strokes.length === 0) {
    wrap.hidden = false;
    wrap.innerHTML = `
      <div class="stroke-focus-card">
        <div class="stroke-focus-loading">Đang tải dữ liệu nét chữ "${ch}"…</div>
      </div>
    `;
    return;
  }

  const totalStrokes = charData.strokes.length;
  const safeStrokeIdx = Math.max(0, Math.min(totalStrokes - 1, activeStrokeIdx ?? 0));
  const median = charData.medians ? charData.medians[safeStrokeIdx] : null;
  const strokeInfo = classifyStrokeType(median);
  const progressPct = Math.round(((safeStrokeIdx + 1) / totalStrokes) * 100);

  wrap.hidden = false;
  wrap.innerHTML = `
    <div class="stroke-focus-card">
      <div class="stroke-focus-top">
        <div class="stroke-focus-badge-pill">Nét ${safeStrokeIdx + 1} / ${totalStrokes}</div>
        <div class="stroke-focus-name">
          <span class="stroke-focus-symbol">${strokeInfo.symbol}</span>
          <strong>${strokeInfo.name}</strong>
        </div>
      </div>
      <div class="stroke-focus-hint">${strokeInfo.hint}</div>
      <div class="stroke-focus-progress-track" aria-hidden="true">
        <div class="stroke-focus-progress-fill" style="width: ${progressPct}%"></div>
      </div>
      <div class="stroke-focus-nav">
        <button type="button" class="stroke-step-nav-btn" id="strokePrevStepBtn" ${safeStrokeIdx <= 0 ? 'disabled' : ''}>
          ◀ Nét trước
        </button>
        <button type="button" class="stroke-step-nav-btn" id="strokeNextStepBtn" ${safeStrokeIdx >= totalStrokes - 1 ? 'disabled' : ''}>
          Nét tiếp ▶
        </button>
      </div>
    </div>
  `;

  const prevBtn = wrap.querySelector('#strokePrevStepBtn');
  const nextBtn = wrap.querySelector('#strokeNextStepBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stepStrokeBy(-1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stepStrokeBy(1);
    });
  }
}

function stepStrokeBy(delta) {
  stopSequentialAnimation();
  if (isQuizActive) {
    cancelActiveQuiz();
  }
  const charData = strokeCharDataMap[activeCharIndex];
  if (!charData || !Array.isArray(charData.strokes)) return;
  const total = charData.strokes.length;
  activeStrokeIdx = Math.max(0, Math.min(total - 1, (activeStrokeIdx ?? 0) + delta));
  renderFocusedStrokeOverlay();
  renderStrokeStepperCard();
}

function stopSequentialAnimation() {
  if (animationStepTimer) {
    clearTimeout(animationStepTimer);
    animationStepTimer = null;
  }
  isAnimatingSequential = false;
  const animateBtn = document.getElementById('strokeAnimateBtn');
  if (animateBtn) animateBtn.classList.remove('active');
}

function cancelActiveQuiz() {
  isQuizActive = false;
  strokeWriters.forEach(w => {
    if (w && typeof w.cancelQuiz === 'function') {
      try { w.cancelQuiz(); } catch (e) {}
    }
  });
  const target = document.getElementById('strokeSingleGridTarget');
  if (target) target.classList.remove('is-quiz-mode');
  const quizBtn = document.getElementById('strokeQuizBtn');
  if (quizBtn) quizBtn.classList.remove('active');
}

function destroyStrokeCanvasWriters() {
  stopSequentialAnimation();
  cancelActiveQuiz();
  strokeWriters = [];
  strokeCharDataMap = {};
  completedCharsMap = {};
  activeStrokeIdx = 0;

  const container = document.getElementById('strokeGridsContainer');
  if (container) container.innerHTML = '';

  const stepsWrap = document.getElementById('strokeOrderStepsWrap');
  if (stepsWrap) {
    stepsWrap.hidden = true;
    stepsWrap.innerHTML = '';
  }

  const statusWrap = document.getElementById('strokeQuizStatusWrap');
  if (statusWrap) {
    statusWrap.hidden = true;
    statusWrap.innerHTML = '';
  }
}

function createWriterForActiveChar() {
  const target = document.getElementById('strokeSingleGridTarget');
  if (!target || typeof HanziWriter === 'undefined') return;

  // Cancel any previous writer
  strokeWriters.forEach(w => {
    if (w && typeof w.cancelQuiz === 'function') {
      try { w.cancelQuiz(); } catch (e) {}
    }
  });
  strokeWriters = [];
  target.innerHTML = '';

  const charIdxSnapshot = activeCharIndex;
  const ch = currentStrokeChars[charIdxSnapshot];
  if (!ch) return;

  const boxSize = getGridBoxSize();
  target.style.setProperty('--grid-box-size', `${boxSize}px`);
  const colors = getStrokeColors();
  const padding = Math.max(26, Math.round(boxSize * 0.13));

  try {
    const writer = HanziWriter.create('strokeSingleGridTarget', ch, {
      width: boxSize,
      height: boxSize,
      padding,
      showOutline: true,
      strokeColor: colors.strokeColor,
      radicalColor: colors.radicalColor,
      outlineColor: colors.outlineColor,
      showHintAfterMisses: 1,
      highlightOnComplete: true,
      onLoadCharDataSuccess: function(charData) {
        globalCharDataCache[ch] = charData;
        if (currentStrokeChars[charIdxSnapshot] !== ch) return;
        strokeCharDataMap[charIdxSnapshot] = charData;
        renderCharacterSwitcherBar();
        if (activeCharIndex === charIdxSnapshot) {
          renderFocusedStrokeOverlay();
          renderStrokeStepperCard();
        }
      }
    });
    strokeWriters[charIdxSnapshot] = writer;
  } catch (err) {
    console.warn('HanziWriter init error for character', ch, err);
  }

  if (globalCharDataCache[ch]) {
    strokeCharDataMap[charIdxSnapshot] = globalCharDataCache[ch];
    renderCharacterSwitcherBar();
    renderFocusedStrokeOverlay();
    renderStrokeStepperCard();
  }

  if (typeof renderStrokeDecomposition === 'function') {
    renderStrokeDecomposition(ch);
  }
}

function selectCharacterAtIndex(charIdx, autoAnimate = false) {
  if (!currentStrokeChars || charIdx < 0 || charIdx >= currentStrokeChars.length) return;
  stopSequentialAnimation();
  cancelActiveQuiz();

  activeCharIndex = charIdx;
  activeStrokeIdx = 0;

  renderCharacterSwitcherBar();
  createWriterForActiveChar();
  renderFocusedStrokeOverlay();
  renderStrokeStepperCard();

  const statusWrap = document.getElementById('strokeQuizStatusWrap');
  if (statusWrap) {
    statusWrap.hidden = true;
    statusWrap.innerHTML = '';
  }

  if (autoAnimate) {
    animateStrokeCanvas();
  }
}

function renderStrokeGrids(autoAnimate = true) {
  const container = document.getElementById('strokeGridsContainer');
  const fallback = document.getElementById('strokeCanvasFallback');
  if (!container || !fallback) return;

  destroyStrokeCanvasWriters();
  fallback.hidden = true;

  const totalChars = currentStrokeChars.length;
  if (totalChars === 0) {
    fallback.hidden = false;
    fallback.textContent = 'Từ này không có chữ Hán để luyện viết.';
    renderCharacterSwitcherBar();
    syncStrokeCanvasControls();
    return;
  }

  if (typeof HanziWriter === 'undefined') {
    fallback.hidden = false;
    fallback.textContent = 'Đang tải thư viện viết chữ...';
    if (!window._hanziWriterLoading) {
      window._hanziWriterLoading = true;
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3/dist/hanzi-writer.min.js';
      script.async = true;
      script.onload = () => {
        window._hanziWriterLoading = false;
        renderStrokeGrids(autoAnimate);
      };
      script.onerror = () => {
        window._hanziWriterLoading = false;
        fallback.textContent = 'Không thể tải thư viện viết chữ (HanziWriter). Vui lòng kiểm tra kết nối mạng.';
      };
      document.head.appendChild(script);
    } else {
      let retries = 0;
      const checkHW = setInterval(() => {
        retries++;
        if (typeof HanziWriter !== 'undefined') {
          clearInterval(checkHW);
          renderStrokeGrids(autoAnimate);
        } else if (retries >= 50) {
          clearInterval(checkHW);
          fallback.textContent = 'Không thể tải thư viện viết chữ (HanziWriter). Vui lòng kiểm tra kết nối mạng.';
        }
      }, 100);
    }
    syncStrokeCanvasControls();
    return;
  }

  const colors = getStrokeColors();
  lastRenderedTheme = document.documentElement.dataset.theme || (colors.isDark ? 'dark' : 'light');

  const boxSize = getGridBoxSize();
  container.className = 'stroke-grids-container is-single-stage';
  container.innerHTML = `
    <div class="stroke-single-stage-wrap">
      <div class="stroke-canvas-grid is-large-stage" id="strokeSingleGridTarget" style="--grid-box-size: ${boxSize}px" title="Chạm vào ô chữ để bắt đầu tự luyện viết"></div>
    </div>
  `;

  const target = document.getElementById('strokeSingleGridTarget');
  if (target) {
    target.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isQuizActive) {
        startQuizOnChar(activeCharIndex, true);
      }
    });
  }

  // Preload character data for all characters in the word so stroke counts appear on tabs
  currentStrokeChars.forEach((ch, idx) => {
    if (globalCharDataCache[ch]) {
      strokeCharDataMap[idx] = globalCharDataCache[ch];
    } else if (typeof HanziWriter.loadCharacterData === 'function') {
      HanziWriter.loadCharacterData(ch).then(data => {
        if (data) {
          globalCharDataCache[ch] = data;
          if (currentStrokeChars[idx] === ch) {
            strokeCharDataMap[idx] = data;
            renderCharacterSwitcherBar();
            if (idx === activeCharIndex) {
              renderFocusedStrokeOverlay();
              renderStrokeStepperCard();
            }
          }
        }
      }).catch(() => {});
    }
  });

  createWriterForActiveChar();
  renderCharacterSwitcherBar();
  renderStrokeStepperCard();
  syncStrokeCanvasControls();

  if (autoAnimate) {
    animateStrokeCanvas();
  }
}

function startQuizOnChar(charIndex = activeCharIndex, isManual = false) {
  if (!currentStrokeChars || charIndex < 0 || charIndex >= currentStrokeChars.length) return;
  stopSequentialAnimation();

  if (charIndex !== activeCharIndex || !strokeWriters[charIndex]) {
    activeCharIndex = charIndex;
    createWriterForActiveChar();
  }

  const writer = strokeWriters[charIndex];
  if (!writer) return;

  isQuizActive = true;
  activeStrokeIdx = 0;

  const target = document.getElementById('strokeSingleGridTarget');
  if (target) target.classList.add('is-quiz-mode');

  const quizBtn = document.getElementById('strokeQuizBtn');
  const animateBtn = document.getElementById('strokeAnimateBtn');
  if (quizBtn) quizBtn.classList.add('active');
  if (animateBtn) animateBtn.classList.remove('active');

  renderCharacterSwitcherBar();
  renderFocusedStrokeOverlay();
  renderStrokeStepperCard();

  const currentChar = currentStrokeChars[charIndex];
  const total = currentStrokeChars.length;
  const statusWrap = document.getElementById('strokeQuizStatusWrap');
  if (statusWrap) {
    statusWrap.hidden = false;
    statusWrap.innerHTML = `
      <div class="stroke-status-live">
        ✍️ Hãy kéo <strong>Nét 1</strong> của chữ <strong>"${currentChar}"</strong> theo mũi tên trên ô chữ!
      </div>
    `;
  }

  writer.quiz({
    onMistake: (strokeData) => {
      const nextStrokeIdx = strokeData ? strokeData.strokeNum : activeStrokeIdx;
      activeStrokeIdx = nextStrokeIdx;
      renderFocusedStrokeOverlay();
      renderStrokeStepperCard();

      const statusEl = document.querySelector('.stroke-status-live');
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:var(--danger-text)">Nét ${(nextStrokeIdx ?? 0) + 1} chưa chuẩn. Hãy kéo bút theo đúng chiều mũi tên!</span>`;
      }
    },
    onCorrectStroke: (strokeData) => {
      const nextStrokeIdx = strokeData.strokeNum + 1;
      const totalStrokes = strokeCharDataMap[charIndex]?.strokes?.length || 0;
      activeStrokeIdx = nextStrokeIdx < totalStrokes ? nextStrokeIdx : totalStrokes - 1;
      renderFocusedStrokeOverlay();
      renderStrokeStepperCard();

      const statusEl = document.querySelector('.stroke-status-live');
      if (statusEl && nextStrokeIdx < totalStrokes) {
        statusEl.innerHTML = `<span style="color:var(--success-text)">✓ Chính xác! Tiếp tục <strong>Nét ${nextStrokeIdx + 1} / ${totalStrokes}</strong>…</span>`;
      }
    },
    onComplete: (summary) => {
      const mistakes = summary ? (summary.totalMistakes || 0) : 0;
      const mistakesText = mistakes === 0 ? 'Hoàn hảo' : `${mistakes} lần lệch nét`;
      completedCharsMap[charIndex] = true;
      isQuizActive = false;
      if (target) target.classList.remove('is-quiz-mode');

      renderCharacterSwitcherBar();
      renderFocusedStrokeOverlay();

      if (charIndex < total - 1) {
        const nextChar = currentStrokeChars[charIndex + 1];
        if (statusWrap) {
          statusWrap.innerHTML = `
            <div class="stroke-status-next">
              🎉 Xong chữ <strong>"${currentChar}"</strong> (${mistakesText})! Đang chuyển sang chữ <strong>"${nextChar}"</strong>…
            </div>
          `;
        }
        setTimeout(() => {
          startQuizOnChar(charIndex + 1, false);
        }, 700);
      } else {
        if (quizBtn) quizBtn.classList.remove('active');
        if (statusWrap) {
          const wordText = currentStrokeWord?.hanzi || currentStrokeChars.join('');
          statusWrap.innerHTML = `
            <div class="stroke-status-success">
              <div class="stroke-status-success-title">
                🎉 Xuất sắc! Bạn đã luyện viết xong từ <strong>"${wordText}"</strong>!
              </div>
              <button type="button" class="stroke-restart-btn" id="strokeRestartQuizBtn">
                ↺ Luyện viết lại từ đầu
              </button>
            </div>
          `;
          const restartBtn = document.getElementById('strokeRestartQuizBtn');
          if (restartBtn) {
            restartBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              completedCharsMap = {};
              startQuizOnChar(0, true);
            });
          }
        }
      }
    }
  });
}

// Step-by-step clear animation showing ONE stroke + number + arrow at a time
function animateStrokeCanvas() {
  if (!currentStrokeChars || currentStrokeChars.length === 0) return;

  stopSequentialAnimation();
  cancelActiveQuiz();

  isAnimatingSequential = true;
  const animateBtn = document.getElementById('strokeAnimateBtn');
  const quizBtn = document.getElementById('strokeQuizBtn');
  if (animateBtn) animateBtn.classList.add('active');
  if (quizBtn) quizBtn.classList.remove('active');

  const statusWrap = document.getElementById('strokeQuizStatusWrap');
  if (statusWrap) {
    statusWrap.hidden = true;
    statusWrap.innerHTML = '';
  }

  function stepThroughCharStrokes(charIdx, strokeIdx) {
    if (!isAnimatingSequential) return;

    if (charIdx !== activeCharIndex) {
      activeCharIndex = charIdx;
      createWriterForActiveChar();
      renderCharacterSwitcherBar();
    }

    const charData = strokeCharDataMap[charIdx];
    if (!charData || !Array.isArray(charData.strokes) || charData.strokes.length === 0) {
      // Wait briefly if character data is still loading
      animationStepTimer = setTimeout(() => stepThroughCharStrokes(charIdx, strokeIdx), 150);
      return;
    }

    const totalStrokes = charData.strokes.length;
    if (strokeIdx >= totalStrokes) {
      // Finished this character
      if (charIdx < currentStrokeChars.length - 1) {
        animationStepTimer = setTimeout(() => {
          stepThroughCharStrokes(charIdx + 1, 0);
        }, 550);
      } else {
        isAnimatingSequential = false;
        if (animateBtn) animateBtn.classList.remove('active');
      }
      return;
    }

    activeStrokeIdx = strokeIdx;
    renderFocusedStrokeOverlay();
    renderStrokeStepperCard();

    animationStepTimer = setTimeout(() => {
      stepThroughCharStrokes(charIdx, strokeIdx + 1);
    }, 780);
  }

  stepThroughCharStrokes(activeCharIndex, 0);
}

function loadStrokeCanvasWord(word) {
  if (!document.getElementById('strokeCanvasWrap')) {
    initStrokeCanvas();
  }
  if (!word && typeof activeStudyWord !== 'undefined' && activeStudyWord) {
    word = activeStudyWord;
  }
  currentStrokeWord = word;
  const badge = document.getElementById('strokeCharBadge');
  const mobileBadge = document.getElementById('strokeMobileCharBadge');
  const fallback = document.getElementById('strokeCanvasFallback');

  if (!word || !word.hanzi) {
    destroyStrokeCanvasWriters();
    currentStrokeChars = [];
    activeCharIndex = 0;
    if (fallback) {
      fallback.hidden = false;
      fallback.textContent = 'Chọn một từ để xem thứ tự nét & luyện viết.';
    }
    if (badge) badge.textContent = '';
    if (mobileBadge) mobileBadge.textContent = '';
    syncStrokeCanvasControls();
    return;
  }

  currentStrokeChars = extractHanziCharacters(word.hanzi);
  activeCharIndex = 0;
  activeStrokeIdx = 0;
  completedCharsMap = {};

  const total = currentStrokeChars.length;
  const badgeText = total > 1 ? `${word.hanzi} · ${total} chữ` : word.hanzi;
  if (badge) badge.textContent = badgeText;
  if (mobileBadge) mobileBadge.textContent = badgeText;

  renderStrokeGrids(true);
}

function syncStrokeCanvasControls() {
  const hasChars = currentStrokeChars.length > 0;
  ['strokeAnimateBtn', 'strokeQuizBtn'].forEach(id => {
    const button = document.getElementById(id);
    if (button) button.disabled = !hasChars;
  });
}

function initStrokeCanvas() {
  const mount = document.getElementById('workstationRight') || document.getElementById('screenCards');
  if (!mount) return;

  if (document.getElementById('strokeCanvasWrap')) return;

  const wrap = document.createElement('div');
  wrap.className = 'stroke-canvas-panel';
  wrap.id = 'strokeCanvasWrap';

  const title = document.createElement('div');
  title.className = 'sidebar-panel-header';
  title.innerHTML = `
    <div class="sidebar-panel-title">Thứ tự nét &amp; Luyện viết</div>
    <span class="stroke-char-badge" id="strokeCharBadge"></span>
  `;
  wrap.appendChild(title);

  const body = document.createElement('div');
  body.className = 'stroke-canvas-body';
  body.innerHTML = `
    <div class="stroke-char-switcher-wrap" id="strokeCharSwitcherWrap" hidden></div>
    <div class="stroke-grids-container" id="strokeGridsContainer"></div>
    <div class="stroke-canvas-fallback" id="strokeCanvasFallback" hidden></div>
    <div class="stroke-order-steps-wrap" id="strokeOrderStepsWrap" hidden></div>
    <div class="stroke-canvas-controls">
      <button type="button" class="stroke-ctrl-btn" id="strokeAnimateBtn" title="Diễn họa từng nét chữ">▶ Xem diễn họa</button>
      <button type="button" class="stroke-ctrl-btn" id="strokeQuizBtn" title="Tự vẽ nét chữ theo mũi tên">✍️ Tự luyện viết</button>
    </div>
    <div class="stroke-quiz-status-wrap" id="strokeQuizStatusWrap" hidden></div>
    <div class="stroke-decomp-container" id="strokeDecompContainer"></div>
  `;
  wrap.appendChild(body);
  mount.appendChild(wrap);

  wrap.querySelector('#strokeAnimateBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    animateStrokeCanvas();
  });

  wrap.querySelector('#strokeQuizBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    startQuizOnChar(activeCharIndex, true);
  });

  try {
    const themeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const newTheme = document.documentElement.dataset.theme || '';
          if (newTheme !== lastRenderedTheme && currentStrokeChars.length > 0) {
            renderStrokeGrids(false);
          }
          break;
        }
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  } catch (e) {}

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (currentStrokeChars.length > 0) {
        const newSize = getGridBoxSize();
        const target = document.getElementById('strokeSingleGridTarget');
        const oldSize = target ? parseInt(target.style.getPropertyValue('--grid-box-size') || '0', 10) : 0;
        if (Math.abs(newSize - oldSize) > 6) {
          renderStrokeGrids(false);
        }
      }
    }, 150);
  });

  onActiveWordChange(loadStrokeCanvasWord);
  loadStrokeCanvasWord(typeof activeStudyWord !== 'undefined' ? activeStudyWord : null);
}

function renderActiveStrokeChar(autoAnimate = true) {
  if (!document.getElementById('strokeCanvasWrap')) {
    initStrokeCanvas();
  }
  const word = (typeof activeStudyWord !== 'undefined' && activeStudyWord) ? activeStudyWord : null;
  if (
    word &&
    currentStrokeWord &&
    currentStrokeWord.hanzi === word.hanzi &&
    currentStrokeChars.length > 0 &&
    document.getElementById('strokeSingleGridTarget')
  ) {
    if (autoAnimate && !isAnimatingSequential) {
      animateStrokeCanvas();
    }
    return;
  }
  loadStrokeCanvasWord(word);
}

window.renderActiveStrokeChar = renderActiveStrokeChar;
window.loadStrokeCanvasWord = loadStrokeCanvasWord;
window.selectStrokeChar = function(idx) { selectCharacterAtIndex(idx, false); };
window.animateStrokeCanvas = animateStrokeCanvas;
window.quizStrokeCanvas = function() { startQuizOnChar(activeCharIndex, true); };
window.initStrokeCanvas = initStrokeCanvas;

document.addEventListener('DOMContentLoaded', initStrokeCanvas);
