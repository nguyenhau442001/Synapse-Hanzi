// Study navigation, mastery actions, celebration, and progress controls.
function nextCard() { if (filteredOrder.length===0) return; idx = (idx + 1) % filteredOrder.length; render('next'); }
function prevCard() { if (filteredOrder.length===0) return; idx = (idx - 1 + filteredOrder.length) % filteredOrder.length; render('prev'); }
function jumpToRandomWord() {
  if (!filteredOrder || filteredOrder.length === 0) return;
  if (filteredOrder.length === 1) {
    idx = 0;
    render('fade');
    return;
  }
  const currentPos = idx % filteredOrder.length;
  let nextPos;
  // Pick a random index distinct from the current one
  do {
    nextPos = Math.floor(Math.random() * filteredOrder.length);
  } while (nextPos === currentPos && filteredOrder.length > 1);

  idx = nextPos;
  render('fade');

  // Sync stroke order and sidebar list
  const wIdx = filteredOrder[idx % filteredOrder.length];
  if (wIdx >= 0 && WORDS[wIdx]) {
    setActiveStudyWord(WORDS[wIdx]);
    setTimeout(() => {
      const listBtn = document.querySelector(`.study-word-list-item[data-word-index="${wIdx}"]`);
      if (listBtn) listBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 60);
  }
}

// Global aliases so users and other components can invoke it easily
window.jumpToRandomWord = jumpToRandomWord;
window.randomWord = jumpToRandomWord;
window.randomizeFlashcardWord = jumpToRandomWord;
function rateCurrentCard(rating) {
  if (filteredOrder.length === 0) return;
  const wIdx = filteredOrder[idx % filteredOrder.length];
  const word = WORDS[wIdx];
  if (!word) return;
  const prevDeck = typeof computeDeckProgress === 'function' ? computeDeckProgress() : null;
  reviewSrsCard(currentLevel, word.id, rating, srsCards);
  const limitMessage = document.getElementById('dailyNewLimitMessage');
  if (limitMessage) limitMessage.textContent = '';
  saveProgress();
  recordDailyStudy(word.id, currentLevel);
  updateStats();
  if (rating === 'again' && typeof showRelatedClusterHint === 'function') {
    showRelatedClusterHint(word);
  }
  if (currentView === 'overview') renderOverview();
  checkCelebration(prevDeck);
  if (currentFilter !== 'all') advanceAfterMark(wIdx); else nextCard();
}
function markKnown() { rateCurrentCard('good'); }
function markUnknown() { rateCurrentCard('again'); }

function playCelebrationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.7);
    });
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(2093.00, now + 0.35);
    bellGain.gain.setValueAtTime(0, now + 0.35);
    bellGain.gain.linearRampToValueAtTime(0.12, now + 0.37);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(now + 0.35);
    bell.stop(now + 1.25);
  } catch (_) {}
}

let activeConfettiAnim = null;
function launchConfettiFireworks() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const existingCanvas = document.getElementById('celebrationCanvas');
  if (existingCanvas) existingCanvas.remove();
  if (activeConfettiAnim) {
    cancelAnimationFrame(activeConfettiAnim);
    activeConfettiAnim = null;
  }

  const canvas = document.createElement('canvas');
  canvas.id = 'celebrationCanvas';
  canvas.className = 'celebration-canvas';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.scale(dpr, dpr);

  const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FBBF24', '#60A5FA'];
  const particleCount = 180;
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    const isLeft = i % 2 === 0;
    const originX = isLeft ? cssWidth * 0.12 : cssWidth * 0.88;
    const originY = cssHeight * 0.95;
    const angle = isLeft
      ? (Math.PI / 180) * (45 + Math.random() * 40)
      : (Math.PI / 180) * (95 + Math.random() * 40);
    const speed = 15 + Math.random() * 16;
    const shapeType = Math.random() < 0.6 ? 'ribbon' : Math.random() < 0.5 ? 'star' : 'circle';

    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * (isLeft ? speed : -speed),
      vy: -Math.sin(angle) * speed,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapeType,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      tilt: Math.random() * 10,
      tiltSpeed: 0.08 + Math.random() * 0.08,
      wobble: Math.random() * 10,
      opacity: 1,
      decay: 0.003 + Math.random() * 0.004,
    });
  }

  const startTime = Date.now();

  function drawStar(c, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    c.beginPath();
    c.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      c.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      c.lineTo(x, y);
      rot += step;
    }
    c.lineTo(cx, cy - outerRadius);
    c.closePath();
    c.fill();
  }

  function frame() {
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    let alive = 0;
    const elapsed = Date.now() - startTime;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.vy += 0.38;
      p.rotation += p.rotationSpeed;
      p.tilt += p.tiltSpeed;
      p.wobble += 0.05;
      p.x += Math.sin(p.wobble) * 1.2;

      if (elapsed > 2500) {
        p.opacity = Math.max(0, p.opacity - p.decay * 3);
      }

      if (p.opacity > 0 && p.y < cssHeight + 40) {
        alive++;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (p.shape === 'ribbon') {
          const ribbonWidth = p.size * Math.cos(p.tilt);
          ctx.fillRect(-ribbonWidth / 2, -p.size / 2, ribbonWidth, p.size * 1.5);
        } else if (p.shape === 'star') {
          drawStar(ctx, 0, 0, 5, p.size * 0.8, p.size * 0.4);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    });

    if (alive > 0 && elapsed < 4800) {
      activeConfettiAnim = requestAnimationFrame(frame);
    } else {
      if (canvas && canvas.parentNode) canvas.remove();
      activeConfettiAnim = null;
    }
  }

  activeConfettiAnim = requestAnimationFrame(frame);
}

function checkCelebration(prevDeck) {
  if (!Array.isArray(WORDS) || WORDS.length === 0 || !currentLevel) return;
  const deck = typeof computeDeckProgress === 'function' ? computeDeckProgress() : { learned: 0, total: WORDS.length, known: 0, unknown: 0 };

  // Milestone 2: All words mastered (100% known)
  const masterKey = 'hsk_' + currentLevel + '_milestone_mastered';
  if (deck.known === deck.total && deck.total > 0) {
    let already = false;
    try { already = localStorage.getItem(masterKey) === 'true'; } catch (_) {}
    if (!already || (prevDeck && prevDeck.known < prevDeck.total)) {
      try { localStorage.setItem(masterKey, 'true'); } catch (_) {}
      celebrationShown = true;
      // When in 'unseen' or 'unknown' filter, the card itself transitions to the In-Card Hero and auto-fires fireworks
      if (currentFilter !== 'unseen' && currentFilter !== 'unknown') {
        triggerAchievementCelebration('mastered');
      }
      return;
    }
  }

  // Milestone 1: All words learned / 0 unlearned (100% learned)
  const learnedKey = 'hsk_' + currentLevel + '_milestone_learned';
  if (deck.learned === deck.total && deck.total > 0) {
    let already = false;
    try { already = localStorage.getItem(learnedKey) === 'true'; } catch (_) {}
    if (!already || (prevDeck && prevDeck.learned < prevDeck.total)) {
      try { localStorage.setItem(learnedKey, 'true'); } catch (_) {}
      celebrationShown = true;
      if (currentFilter !== 'unseen') {
        triggerAchievementCelebration('learned');
      }
      return;
    }
  }
}

function closeCelebrationOverlay() {
  const overlay = document.getElementById('celebrationOverlay');
  if (overlay) overlay.remove();
}

function setFilterAndCloseCelebration(filterKey) {
  closeCelebrationOverlay();
  if (typeof setFilter === 'function') {
    setFilter(filterKey);
  }
}

function triggerAchievementCelebration(type, force) {
  if (!force && celebrationShown && !type) return;
  celebrationShown = true;

  playCelebrationChime();
  launchConfettiFireworks();

  const deck = typeof computeDeckProgress === 'function' ? computeDeckProgress() : { learned: 0, total: WORDS.length, known: 0, unknown: 0 };
  const levelLabel = (LEVELS[currentLevel] && LEVELS[currentLevel].label) || 'cấp độ này';
  const isMastered = type === 'mastered' || (deck.known === deck.total && deck.total > 0);

  closeCelebrationOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'celebrationOverlay';
  overlay.className = 'celebration-overlay';

  const badgeHtml = isMastered
    ? '<div class="celebration-badge">👑 ĐẠI THÀNH TỰU · MASTERED</div>'
    : '<div class="celebration-badge">✨ THÀNH TỰU MỞ KHÓA · LEVEL COMPLETED</div>';

  const titleText = isMastered
    ? `Tuyệt Đỉnh! Tinh Thông 100% Từ Vựng!`
    : `Chúc Mừng! Bạn Đã Hoàn Thành ${levelLabel}!`;

  const msgText = isMastered
    ? `Bạn đã nhớ xuất sắc toàn bộ <strong>${deck.total} / ${deck.total}</strong> từ vựng. Không còn từ nào chưa nhớ!`
    : `Bạn đã học qua tất cả <strong>${deck.total} / ${deck.total}</strong> từ vựng của <strong>${levelLabel}</strong>. Cột mốc 100% cực kỳ ấn tượng!`;

  const primaryBtnHtml = deck.unknown > 0
    ? `<button type="button" class="celebration-btn celebration-btn--primary" onclick="setFilterAndCloseCelebration('unknown')">
        🔁 Ôn tập ngay ${deck.unknown} từ chưa nhớ
      </button>`
    : `<button type="button" class="celebration-btn celebration-btn--primary" onclick="closeCelebrationOverlay()">
        🎉 Tuyệt vời, tiếp tục phát huy!
      </button>`;

  const secondaryBtnHtml = `<button type="button" class="celebration-btn celebration-btn--secondary" onclick="setFilterAndCloseCelebration('all'); if (typeof shuffleDeck==='function') shuffleDeck();">
    🔀 Xáo trộn & ôn tất cả từ
  </button>`;

  overlay.innerHTML = `
    <div class="celebration-box" role="dialog" aria-modal="true" aria-labelledby="celebrationTitle">
      <button type="button" class="celebration-close-btn" onclick="closeCelebrationOverlay()" aria-label="Đóng">✕</button>
      <div class="celebration-trophy-wrap">
        <div class="celebration-trophy-halo"></div>
        <span class="celebration-trophy">${isMastered ? '👑' : '🏆'}</span>
        <span class="celebration-sparkle celebration-sparkle-1">✨</span>
        <span class="celebration-sparkle celebration-sparkle-2">⭐</span>
      </div>
      ${badgeHtml}
      <h2 class="celebration-title" id="celebrationTitle">${titleText}</h2>
      <p class="celebration-msg">${msgText}</p>
      <div class="celebration-stats-grid">
        <div class="celebration-stat-pill">
          <span class="celebration-stat-val">${deck.total}</span>
          <span class="celebration-stat-name">Tổng từ</span>
        </div>
        <div class="celebration-stat-pill celebration-stat-pill--known">
          <span class="celebration-stat-val">${deck.known}</span>
          <span class="celebration-stat-name">Đã nhớ tốt</span>
        </div>
        <div class="celebration-stat-pill celebration-stat-pill--unknown">
          <span class="celebration-stat-val">${deck.unknown}</span>
          <span class="celebration-stat-name">Cần củng cố</span>
        </div>
      </div>
      <div class="celebration-actions">
        ${primaryBtnHtml}
        ${secondaryBtnHtml}
      </div>
    </div>`;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeCelebrationOverlay();
  });

  const onKeydown = e => {
    if (e.key === 'Escape') {
      closeCelebrationOverlay();
      document.removeEventListener('keydown', onKeydown);
    }
  };
  document.addEventListener('keydown', onKeydown);

  document.body.appendChild(overlay);
}

function showCelebration(type, force) {
  triggerAchievementCelebration(type || 'learned', typeof force === 'boolean' ? force : true);
}

window.showCelebration = showCelebration;
window.triggerAchievementCelebration = triggerAchievementCelebration;
window.launchConfettiFireworks = launchConfettiFireworks;
window.playCelebrationChime = playCelebrationChime;
window.closeCelebrationOverlay = closeCelebrationOverlay;
window.setFilterAndCloseCelebration = setFilterAndCloseCelebration;
function advanceAfterMark(prevWIdx) {
  const prevIdx = idx;
  if (currentFilter === 'unseen') filteredOrder = order.filter(i => !progress[WORDS[i].id]);
  else filteredOrder = order.filter(i => progress[WORDS[i].id] === currentFilter);
  renderFilters();
  if (filteredOrder.length === 0) { idx = 0; render('fade'); return; }
  if (filteredOrder.includes(prevWIdx)) {
    idx = (prevIdx + 1) % filteredOrder.length;
  } else {
    idx = Math.min(prevIdx, filteredOrder.length - 1);
  }
  render('fade');
}
function togglePinyin() {
  showPinyin = !showPinyin;
  const btn = document.getElementById('pinyinToggle');
  if (btn) {
    const icon = document.getElementById('pinyinToggleIcon');
    if (icon) {
      icon.textContent = showPinyin ? '👁' : '🙈';
      btn.title = showPinyin ? 'Ẩn pinyin' : 'Hiện pinyin';
      btn.setAttribute('aria-label', showPinyin ? 'Ẩn pinyin' : 'Hiện pinyin');
    } else {
      btn.textContent = showPinyin ? '👁 Đang hiện pinyin' : '🙈 Chế độ thử thách: ẩn pinyin';
    }
    btn.classList.toggle('on', !showPinyin);
  }
  savePrefs();
  render();
}
function shuffleDeck() {
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  savePrefs();
  setFilter(currentFilter);
}
function resetProgress() {
  const cards = Object.values(srsCards);
  const started = cards.filter(card => card.state !== SRS.State.New).length;
  const known = cards.filter(card => card.state === SRS.State.Review).length;
  const message = [
    'Học lại ' + LEVELS[currentLevel].label + ' từ đầu?',
    '',
    'Sẽ bị reset:',
    '• Lịch ôn FSRS của cả ' + WORDS.length + ' từ (' + started + ' từ đã học, ' + known + ' từ đã nhớ) — mọi thẻ quay về "chưa học".',
    '• Trạng thái Đã nhớ / Chưa nhớ và số thẻ đến hạn của cấp độ này.',
    '',
    'Giữ nguyên: nhật ký ôn tập, chuỗi ngày học, từ khó đã đánh dấu và các cấp độ khác.',
    '',
    'Không thể hoàn tác. Nên bấm "Sao lưu" trước nếu muốn giữ lại.',
  ].join('\n');
  if (!confirm(message)) return;
  srsCards = {};
  WORDS.forEach(word => { srsCards[word.id] = SRS.createNewCard(); });
  progress = {};
  saveProgress();
  setFilter(currentFilter);
}
function toggleTransferPanel(forceOpen) {
  const panel = document.getElementById('transferPanel');
  const button = document.getElementById('transferToggle');
  if (!panel) return;
  const willOpen = typeof forceOpen === 'boolean' ? forceOpen : panel.hidden;
  panel.hidden = !willOpen;
  if (button) {
    button.setAttribute('aria-expanded', String(willOpen));
    button.classList.toggle('on', willOpen);
  }
}

document.addEventListener('click', event => {
  const panel = document.getElementById('transferPanel');
  if (panel && !panel.hidden) {
    const button = document.getElementById('transferToggle');
    if (!panel.contains(event.target) && (!button || !button.contains(event.target))) {
      toggleTransferPanel(false);
    }
  }
  const radicalPanel = document.getElementById('radicalTransferPanel');
  if (radicalPanel && !radicalPanel.hidden) {
    const radButton = document.getElementById('radicalTransferToggle');
    if (!radicalPanel.contains(event.target) && (!radButton || !radButton.contains(event.target))) {
      if (typeof toggleRadicalTransferPanel === 'function') toggleRadicalTransferPanel(false);
    }
  }
});
function toggleUnknownWords() {
  const box = document.getElementById('unknownWordsList');
  const button = document.getElementById('unknownWordsToggle');
  const isOpen = box.classList.contains('show');

  if (isOpen) {
    box.classList.remove('show');
    button.textContent = 'Hiển thị từ chưa nhớ';
    button.setAttribute('aria-expanded', 'false');
    return;
  }

  const unknownWords = WORDS.filter(w => progress[w.id] === 'unknown');
  if (unknownWords.length === 0) {
    box.textContent = 'Chưa có từ nào được đánh dấu "Chưa nhớ".';
  } else {
    box.textContent = unknownWords
      .map((w, index) => (index + 1) + '. ' + w.hanzi + ' (' + w.pinyin + ') - ' + w.meaning)
      .join('\n');
  }
  box.classList.add('show');
  button.textContent = 'Ẩn từ chưa nhớ';
  button.setAttribute('aria-expanded', 'true');
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    const cardMoreDropdown = document.getElementById('cardMoreDropdown');
    if (cardMoreDropdown && !cardMoreDropdown.hidden) {
      event.preventDefault();
      if (typeof closeCardMoreMenu === 'function') closeCardMoreMenu();
      return;
    }
    const transferPanel = document.getElementById('transferPanel');
    if (transferPanel && !transferPanel.hidden) {
      event.preventDefault();
      toggleTransferPanel(false);
      return;
    }
    const radicalTransferPanel = document.getElementById('radicalTransferPanel');
    if (radicalTransferPanel && !radicalTransferPanel.hidden) {
      event.preventDefault();
      if (typeof toggleRadicalTransferPanel === 'function') toggleRadicalTransferPanel(false);
      return;
    }
  }
  if (!currentLevel || currentView !== 'cards' || event.altKey || event.ctrlKey || event.metaKey) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName)) return;
  if (event.key === 'Escape') {
    if (document.body.classList.contains('study-sidebar-open') || document.body.classList.contains('study-writing-panel-open')) {
      event.preventDefault();
      if (typeof closeAllStudyDrawers === 'function') closeAllStudyDrawers();
      return;
    }
    // Return to level picker if study mode is active
    event.preventDefault();
    if (typeof SpaRouter !== 'undefined') {
      SpaRouter.navigateBack();
    } else if (typeof goBackToPicker === 'function') {
      goBackToPicker();
    }
    return;
  }
  if (event.key === 'w' || event.key === 'W') {
    event.preventDefault();
    if (typeof toggleStudyWritingPanel === 'function') toggleStudyWritingPanel();
    return;
  }
  if (event.key === 'r' || event.key === 'R') {
    event.preventDefault();
    if (typeof toggleStudyRadicalsPanel === 'function') toggleStudyRadicalsPanel();
    return;
  }
  if (event.key === 'b' || event.key === 'B') {
    event.preventDefault();
    if (typeof toggleStudySidebar === 'function') toggleStudySidebar();
    return;
  }
  if (event.key === 'h' || event.key === 'H') {
    event.preventDefault();
    if (typeof toggleHanViet === 'function') toggleHanViet();
    return;
  }
  if (event.key === 'a' || event.key === 'A') {
    event.preventDefault();
    if (typeof speakWord === 'function') speakWord();
    return;
  }
  if (event.key === ' ') {
    if (document.activeElement && document.activeElement.closest('input, textarea, select')) return;
    event.preventDefault();
    flip();
    return;
  }
  const revealed = typeof isCardRevealed === 'function' ? isCardRevealed() : false;
  if (event.key === 'ArrowRight') {
    if (document.activeElement && document.activeElement.closest('input, textarea, select')) return;
    event.preventDefault();
    if (revealed && typeof rateCurrentCard === 'function') {
      rateCurrentCard('good');
    } else if (typeof nextCard === 'function') {
      nextCard();
    }
    return;
  }
  if (event.key === 'ArrowLeft') {
    if (document.activeElement && document.activeElement.closest('input, textarea, select')) return;
    event.preventDefault();
    if (revealed && typeof rateCurrentCard === 'function') {
      rateCurrentCard('again');
    } else if (typeof prevCard === 'function') {
      prevCard();
    }
    return;
  }
  if (event.key === '1') {
    if (document.activeElement && document.activeElement.closest('input, textarea, select')) return;
    event.preventDefault();
    if (typeof rateCurrentCard === 'function') rateCurrentCard('again');
    return;
  }
  if (event.key === '2') {
    if (document.activeElement && document.activeElement.closest('input, textarea, select')) return;
    event.preventDefault();
    if (typeof rateCurrentCard === 'function') rateCurrentCard('good');
    return;
  }
  const rating = (typeof RATING_KEYS !== 'undefined' && RATING_KEYS) ? RATING_KEYS[event.key] : null;
  if (rating) {
    if (document.activeElement && document.activeElement.closest('input, textarea, select')) return;
    event.preventDefault();
    rateCurrentCard(rating);
    return;
  }
  if (event.key === 'r' || event.key === 'R') {
    event.preventDefault();
    jumpToRandomWord();
    return;
  }
});
