// Pointer gestures and card reveal interactions.
function initCardSwipe(options) {
  const card = document.getElementById(options.cardId);
  if (!card) return;

  const COMMIT_PX = 75;
  const LOCK_PX = 8;

  let startX = 0, startY = 0, dx = 0, dy = 0;
  let active = false, locked = null, committed = false;

  function prefersReduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function getBadges() {
    return [
      document.getElementById(options.knownBadgeId),
      document.getElementById(options.unknownBadgeId),
    ];
  }
  function setSwipingState(isSwiping) {
    if (isSwiping) {
      document.body.classList.add('is-card-swiping');
    } else {
      document.body.classList.remove('is-card-swiping');
    }
  }
  function clearBadges() {
    getBadges().forEach(b => { if (b) b.style.opacity = '0'; });
  }
  function resetCard() {
    card.style.transition = '';
    card.style.transform = '';
    card.style.opacity = '';
    clearBadges();
    setSwipingState(false);
  }
  function applyDrag(x) {
    if (prefersReduced()) return;
    setSwipingState(true);
    card.style.transform = `translateX(${x}px) rotate(${x / 20}deg)`;
    card.style.opacity = String(Math.max(0.65, 1 - Math.abs(x) / 500));
    const [bk, bu] = getBadges();
    const op = String(Math.min(1, Math.max(0, (Math.abs(x) - 15) / 50)));
    if (bk) bk.style.opacity = x > 15 ? op : '0';
    if (bu) bu.style.opacity = x < -15 ? op : '0';
  }
  function commitSwipe(dir) {
    if (committed) return;
    committed = true;
    try {
      if (navigator.vibrate) navigator.vibrate(10);
    } catch (_) {}
    if (prefersReduced()) {
      resetCard();
      if (dir === 'right') options.markKnown(); else options.markUnknown();
      committed = false;
      return;
    }
    setSwipingState(true);
    const flyX = dir === 'right' ? (window.innerWidth || 520) : -(window.innerWidth || 520);
    card.style.transition = 'transform 220ms ease-out, opacity 220ms ease-out';
    card.style.transform = `translateX(${flyX}px) rotate(${dir === 'right' ? 14 : -14}deg)`;
    card.style.opacity = '0';
    setTimeout(() => {
      card.style.transition = 'none';
      card.style.transform = '';
      card.style.opacity = '0';
      clearBadges();
      if (dir === 'right') options.markKnown(); else options.markUnknown();
      // Sync card fade-in with the renderers' 150ms exit-then-swap timer so new content
      // arrives as the card becomes visible — no double animation.
      setTimeout(() => {
        card.style.transition = 'opacity 180ms ease, transform 180ms ease';
        card.style.opacity = '';
        card.style.transform = '';
        committed = false;
        setTimeout(() => {
          card.style.transition = '';
          setSwipingState(false);
        }, 180);
      }, 150);
    }, 220);
  }
  function springBack() {
    if (prefersReduced()) { resetCard(); return; }
    card.style.transition = 'transform 280ms cubic-bezier(0.25,0.46,0.45,0.94), opacity 200ms ease';
    card.style.transform = '';
    card.style.opacity = '';
    clearBadges();
    setTimeout(() => {
      card.style.transition = '';
      setSwipingState(false);
    }, 280);
  }

  card.addEventListener('pointerdown', e => {
    if (!options.hasCards() || committed) return;
    if (options.interactiveSelector && e.target.closest(options.interactiveSelector)) return;
    card.style.transition = '';
    startX = e.clientX; startY = e.clientY;
    dx = 0; dy = 0; active = true; locked = null;
  });
  card.addEventListener('pointermove', e => {
    if (!active) return;
    dx = e.clientX - startX; dy = e.clientY - startY;
    if (!locked && (Math.abs(dx) > LOCK_PX || Math.abs(dy) > LOCK_PX)) {
      locked = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
    }
    if (locked === 'h') {
      if (e.cancelable) e.preventDefault();
      try {
        if (card.setPointerCapture && (!card.hasPointerCapture || !card.hasPointerCapture(e.pointerId))) {
          card.setPointerCapture(e.pointerId);
        }
      } catch (_) {}
      applyDrag(dx);
    }
  }, { passive: false });
  function onEnd(e) {
    if (!active) return;
    active = false;
    try { if (e && e.pointerId && card.hasPointerCapture && card.hasPointerCapture(e.pointerId)) card.releasePointerCapture(e.pointerId); } catch (_) {}
    if (!locked) { setSwipingState(false); options.flip(); return; }
    if (locked === 'v') { setSwipingState(false); return; }
    if (Math.abs(dx) >= COMMIT_PX) commitSwipe(dx > 0 ? 'right' : 'left');
    else springBack();
  }
  card.addEventListener('pointerup', onEnd);
  card.addEventListener('pointercancel', e => {
    active = false;
    try { if (e && e.pointerId && card.hasPointerCapture && card.hasPointerCapture(e.pointerId)) card.releasePointerCapture(e.pointerId); } catch (_) {}
    springBack();
  });
}

function initSwipe() {
  initCardSwipe({
    cardId: 'card',
    knownBadgeId: 'swipeBadgeKnown',
    unknownBadgeId: 'swipeBadgeUnknown',
    hasCards: () => filteredOrder.length > 0,
    interactiveSelector: 'button, .speech-btn, .example-speed-picker, .card-more-btn, .card-dropdown-item, input, select, a',
    flip,
    markKnown,
    markUnknown,
  });
}

function initRadicalSwipe() {
  initCardSwipe({
    cardId: 'radicalCard',
    knownBadgeId: 'radicalSwipeBadgeKnown',
    unknownBadgeId: 'radicalSwipeBadgeUnknown',
    hasCards: () => radicalFilteredOrder.length > 0,
    interactiveSelector: 'button, .speech-btn, select, input, a',
    flip: radicalFlip,
    markKnown: markRadicalKnown,
    markUnknown: markRadicalUnknown,
  });
}

function flip() {
  if (filteredOrder.length === 0) return;
  const m = document.getElementById('meaning');
  const ex = document.getElementById('exampleBox');
  const card = document.getElementById('card');
  const willShow = !m.classList.contains('show');
  m.classList.toggle('show');
  ex.classList.toggle('show', willShow);
  if (card) card.classList.toggle('is-flipped', willShow);
  const soundBtn = document.getElementById('soundBtn');
  if (soundBtn) soundBtn.classList.toggle('show', willShow);
  if (willShow && !showPinyin) {
    const wIdx = filteredOrder[idx % filteredOrder.length];
    document.getElementById('pinyin').textContent = WORDS[wIdx].pinyin;
  } else if (!willShow && !showPinyin) {
    document.getElementById('pinyin').textContent = '';
  }
  const hintEl = document.getElementById('hint');
  if (hintEl) {
    hintEl.textContent = typeof getCardHintText === 'function' ? getCardHintText(willShow) : (willShow ? 'Chạm vào thẻ để ẩn' : 'Chạm vào thẻ để xem nghĩa');
  }
  syncRevealControls();
}

