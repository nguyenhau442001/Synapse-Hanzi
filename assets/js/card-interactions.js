// Pointer gestures and card reveal interactions.
const FLASHCARD_INTERACTIVE_SELECTOR = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'summary',
  'details',
  '.card-accordion',
  '.card-accordion-summary',
  '.card-accordion-body',
  '.accordion-chevron',
  '.accordion-left',
  '.accordion-badge',
  '.speech-btn',
  '.sound-btn',
  '.example-sound-btn',
  '.example-speed-picker',
  '.example-audio-controls',
  '.card-more-btn',
  '.card-dropdown-item',
  '.card-more-dropdown',
  '.card-more-menu-wrap',
  '.card-header-bar',
  '.card-interactive',
  '.card-radicals-row',
  '.radical-chip',
  '.card-decomp-chip',
  '.card-decomp-char-btn',
  '.card-related-wrap',
  '.card-related-chips',
  '.card-related-chip',
  '.card-related-back-btn',
  '.hanzi-stage',
  '#hanziStage',
  '.card-flip-prompt',
  '#cardFlipPrompt',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="radio"]'
].join(', ');

function initCardSwipe(options) {
  const card = document.getElementById(options.cardId);
  if (!card) return;

  // Prevent duplicate initialization on the same DOM element
  if (card.dataset.swipeInitialized === 'true') return;
  card.dataset.swipeInitialized = 'true';

  const COMMIT_PX = 65;
  const DRAG_LOCK_THRESHOLD = 10;

  let startX = 0, startY = 0, dx = 0, dy = 0;
  let startTime = 0;
  let active = false, locked = null, committed = false;
  let isTouchGesture = false;

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
    card.style.transform = `translateX(${x}px) rotate(${x / 24}deg)`;
    card.style.opacity = String(Math.max(0.7, 1 - Math.abs(x) / 500));
    const [bk, bu] = getBadges();
    const op = String(Math.min(1, Math.max(0, (Math.abs(x) - 12) / 45)));
    if (bk) bk.style.opacity = x > 12 ? op : '0';
    if (bu) bu.style.opacity = x < -12 ? op : '0';
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

  function isInteractive(target) {
    if (!target) return false;
    const selector = options.interactiveSelector || FLASHCARD_INTERACTIVE_SELECTOR;
    return !!target.closest(selector);
  }

  // --- TOUCH EVENT HANDLERS (Rock-solid for iOS Safari & Android Chrome) ---
  function onTouchStart(e) {
    if (!options.hasCards() || committed) return;
    if (e.touches.length !== 1) return;
    if (isInteractive(e.target)) return;

    isTouchGesture = true;
    active = true;
    locked = null;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = performance.now();
    dx = 0;
    dy = 0;
    card.style.transition = '';
  }

  function onTouchMove(e) {
    if (!active || !isTouchGesture) return;
    if (e.touches.length !== 1) return;

    dx = e.touches[0].clientX - startX;
    dy = e.touches[0].clientY - startY;

    if (!locked) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx >= DRAG_LOCK_THRESHOLD || absDy >= DRAG_LOCK_THRESHOLD) {
        if (absDx >= absDy * 1.15) {
          locked = 'h';
        } else {
          locked = 'v';
        }
      }
    }

    if (locked === 'h') {
      if (e.cancelable) e.preventDefault();
      applyDrag(dx);
    }
  }

  function onTouchEnd(e) {
    if (!active || !isTouchGesture) return;
    active = false;
    isTouchGesture = false;

    const dt = Math.max(1, performance.now() - startTime);
    const velocity = Math.abs(dx) / dt;
    const absDx = Math.abs(dx);

    if (locked === 'h') {
      const cardWidth = card.offsetWidth || 320;
      const dynamicCommit = Math.min(COMMIT_PX, cardWidth * 0.22);
      const isFlick = velocity >= 0.32 && absDx >= 30 && dt < 400;
      const isDistance = absDx >= dynamicCommit;

      if (isFlick || isDistance) {
        commitSwipe(dx > 0 ? 'right' : 'left');
      } else {
        springBack();
      }
    } else if (locked === 'v') {
      setSwipingState(false);
    } else {
      setSwipingState(false);
      if (Math.hypot(dx, dy) < 8 && dt < 450) {
        options.flip();
      }
    }
  }

  function onTouchCancel() {
    if (!active || !isTouchGesture) return;
    active = false;
    isTouchGesture = false;
    springBack();
  }

  // --- POINTER EVENT HANDLERS (For desktop mouse & stylus drag) ---
  function onPointerDown(e) {
    if (e.pointerType === 'touch') return; // Handled by Touch events
    if (!options.hasCards() || committed) return;
    if (e.button !== 0) return;
    if (isInteractive(e.target)) return;

    active = true;
    isTouchGesture = false;
    locked = null;
    startX = e.clientX;
    startY = e.clientY;
    startTime = performance.now();
    dx = 0;
    dy = 0;
    card.style.transition = '';

    try {
      if (card.setPointerCapture) card.setPointerCapture(e.pointerId);
    } catch (_) {}
  }

  function onPointerMove(e) {
    if (!active || isTouchGesture) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;

    if (!locked) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx >= DRAG_LOCK_THRESHOLD || absDy >= DRAG_LOCK_THRESHOLD) {
        locked = absDx >= absDy ? 'h' : 'v';
      }
    }

    if (locked === 'h') {
      if (e.cancelable) e.preventDefault();
      applyDrag(dx);
    }
  }

  function onPointerUp(e) {
    if (!active || isTouchGesture) return;
    active = false;
    try {
      if (e && e.pointerId && card.hasPointerCapture && card.hasPointerCapture(e.pointerId)) {
        card.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}

    const dt = Math.max(1, performance.now() - startTime);
    const velocity = Math.abs(dx) / dt;
    const absDx = Math.abs(dx);

    if (locked === 'h') {
      const cardWidth = card.offsetWidth || 320;
      const dynamicCommit = Math.min(COMMIT_PX, cardWidth * 0.22);
      const isFlick = velocity >= 0.35 && absDx >= 35 && dt < 400;
      const isDistance = absDx >= dynamicCommit;

      if (isFlick || isDistance) {
        commitSwipe(dx > 0 ? 'right' : 'left');
      } else {
        springBack();
      }
    } else if (locked === 'v') {
      setSwipingState(false);
    } else {
      setSwipingState(false);
      if (Math.hypot(dx, dy) < 6 && dt < 400) {
        options.flip();
      }
    }
  }

  function onPointerCancel(e) {
    if (!active || isTouchGesture) return;
    active = false;
    try {
      if (e && e.pointerId && card.hasPointerCapture && card.hasPointerCapture(e.pointerId)) {
        card.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
    springBack();
  }

  // Attach touch events with passive: false for touchmove to allow preventDefault during horizontal swipe
  card.addEventListener('touchstart', onTouchStart, { passive: true });
  card.addEventListener('touchmove', onTouchMove, { passive: false });
  card.addEventListener('touchend', onTouchEnd, { passive: true });
  card.addEventListener('touchcancel', onTouchCancel, { passive: true });

  // Attach pointer events for desktop mouse dragging
  card.addEventListener('pointerdown', onPointerDown);
  card.addEventListener('pointermove', onPointerMove, { passive: false });
  card.addEventListener('pointerup', onPointerUp);
  card.addEventListener('pointercancel', onPointerCancel);
}

function initSwipe() {
  initCardSwipe({
    cardId: 'card',
    knownBadgeId: 'swipeBadgeKnown',
    unknownBadgeId: 'swipeBadgeUnknown',
    hasCards: () => filteredOrder.length > 0,
    interactiveSelector: FLASHCARD_INTERACTIVE_SELECTOR,
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
    interactiveSelector: FLASHCARD_INTERACTIVE_SELECTOR,
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
  if (!willShow) {
    const decompAcc = document.getElementById('cardDecompAccordion');
    if (decompAcc) decompAcc.open = false;
    const relatedAcc = document.getElementById('cardRelatedAccordion');
    if (relatedAcc) relatedAcc.open = false;
  }
  const hintEl = document.getElementById('hint');
  if (hintEl) {
    hintEl.textContent = typeof getCardHintText === 'function' ? getCardHintText(willShow) : (willShow ? 'Chạm vào thẻ để ẩn' : 'Chạm vào thẻ để xem nghĩa');
  }
  syncRevealControls();
}
