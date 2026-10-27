// Flashcard markup, filtering, statistics, and rendering.
function getCardHintText(isFlipped) {
  const isTouch = (typeof window !== 'undefined') && (
    window.matchMedia('(pointer: coarse)').matches ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0)
  );
  if (isTouch) {
    return isFlipped ? 'Chạm để lật lại' : 'Chạm để lật';
  }
  return isFlipped ? 'Chạm để lật lại · Space' : 'Chạm để lật · Space';
}
window.getCardHintText = getCardHintText;

function buildCardArea() {
  document.getElementById('cardArea').innerHTML = `
    <div class="card" id="card">
      <div class="card-header-bar" id="cardHeaderBar" onclick="event.stopPropagation()">
        <span class="card-position-pill" id="cardPositionBadge">Từ 1 / 300</span>
        <button type="button" class="card-star-btn" id="weakWordToggleBtn" style="display:none" hidden aria-hidden="true"></button>
        <div class="card-more-menu-wrap" id="cardMoreMenuWrap">
          <button type="button" class="card-more-btn" id="cardMoreBtn" onclick="toggleCardMoreMenu(event)" aria-label="Tùy chọn thẻ" aria-haspopup="menu" aria-expanded="false" title="Tùy chọn khác">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="2.2"/>
              <circle cx="12" cy="12" r="2.2"/>
              <circle cx="12" cy="19" r="2.2"/>
            </svg>
          </button>
          <div class="card-more-dropdown" id="cardMoreDropdown" role="menu" hidden>
            <button type="button" class="card-dropdown-item" id="menuToggleWriting" onclick="toggleStudyWritingPanel(true); closeCardMoreMenu();" role="menuitem">
              <span class="dropdown-item-icon">✍️</span>
              <span class="dropdown-item-label">Luyện viết chữ Hán</span>
            </button>
            <button type="button" class="card-dropdown-item" id="menuTogglePinyin" onclick="togglePinyin(); closeCardMoreMenu();" role="menuitem">
              <span class="dropdown-item-icon" id="menuPinyinIcon">👁️</span>
              <span class="dropdown-item-label" id="menuPinyinText">Ẩn / Hiện pinyin</span>
            </button>
            <button type="button" class="card-dropdown-item" id="menuToggleWeak" onclick="toggleWeakWord(activeStudyWord && activeStudyWord.hanzi, currentLevel); closeCardMoreMenu();" role="menuitem">
              <span class="dropdown-item-icon" id="menuWeakIcon">⭐</span>
              <span class="dropdown-item-label" id="menuWeakText">Đánh dấu từ khó</span>
            </button>
            <button type="button" class="card-dropdown-item" id="menuShuffle" onclick="shuffleDeck(); closeCardMoreMenu();" role="menuitem">
              <span class="dropdown-item-icon">🔀</span>
              <span class="dropdown-item-label">Xáo trộn thứ tự từ</span>
            </button>
            <button type="button" class="card-dropdown-item" id="menuToggleHanviet" onclick="toggleHanViet(); closeCardMoreMenu();" role="menuitem">
              <span class="dropdown-item-icon">漢</span>
              <span class="dropdown-item-label" id="menuHanvietText">Âm Hán - Việt</span>
            </button>
            <button type="button" class="card-dropdown-item" id="menuToggleIllustration" onclick="toggleIllustration(); closeCardMoreMenu();" role="menuitem">
              <span class="dropdown-item-icon" id="menuIllustrationIcon">🖼️</span>
              <span class="dropdown-item-label" id="menuIllustrationText">Hình minh họa</span>
            </button>
            <button type="button" class="card-dropdown-item" id="menuStudyHelp" onclick="openStudyHelpModal(); closeCardMoreMenu();" role="menuitem">
              <span class="dropdown-item-icon">❓</span>
              <span class="dropdown-item-label">Hướng dẫn &amp; phím tắt</span>
            </button>
            <button type="button" class="card-dropdown-item" id="menuTransfer" onclick="toggleTransferPanel(true); closeCardMoreMenu();" role="menuitem">
              <span class="dropdown-item-icon">💾</span>
              <span class="dropdown-item-label">Sao lưu tiến trình</span>
            </button>
            <button type="button" class="card-dropdown-item card-dropdown-item--danger" id="menuResetProgress" onclick="resetProgress(); closeCardMoreMenu();" role="menuitem">
              <span class="dropdown-item-icon">↻</span>
              <span class="dropdown-item-label">Học lại từ đầu</span>
            </button>
          </div>
        </div>
      </div>
      <div class="swipe-badge swipe-badge--known" id="swipeBadgeKnown">✓ Đã nhớ</div>
      <div class="swipe-badge swipe-badge--unknown" id="swipeBadgeUnknown">✗ Chưa nhớ</div>
      <div id="cardContent" class="card-content">
        <div class="word-hero-container" id="wordMainBlock">
          <!-- Chữ Hán to bản ở trung tâm: vững chãi, thoáng đãng, tinh tế (Focal Point chính) -->
          <div class="hanzi-stage" id="hanziStage" onclick="event.stopPropagation(); toggleStudyWritingPanel(true);" title="Nhấn để luyện viết chữ Hán (W)">
            <div class="hanzi" id="hanzi"></div>
          </div>

          <!-- Mỏ neo gợi hình: Hiển thị ngay mặt trước giúp gợi nhớ chủ động (Active Recall) -->
          <div class="card-visual-col" id="cardVisualCol" style="display: none;">
            <div class="card-illustration-frame" id="cardIllustrationFrame" title="Minh họa gợi hình">
              <img class="card-illustration-img" id="cardIllustrationImg" alt="Minh họa gợi hình" style="display: none;">
              <div class="card-illustration-svg" id="cardIllustrationSvg"></div>
            </div>
          </div>

          <!-- Pinyin + Loa phát âm (Chỉ hiển thị sau khi lật đáp án) -->
          <div class="pinyin-row" id="pinyinRow">
            <span class="pinyin" id="pinyin"></span>
            <button class="sound-btn speech-btn" id="soundBtn" type="button"
              onclick="event.stopPropagation(); speakWord()"
              aria-label="Nghe phát âm" aria-live="polite" title="Nghe phát âm (A)">
              <svg class="sound-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </button>
          </div>

          <!-- Nghĩa tiếng Việt & Ngữ cảnh từ loại (Chỉ hiển thị sau khi lật đáp án) -->
          <div class="meaning" id="meaning"></div>
          <div class="meta-badges-row" id="metaBadgesRow">
            <span class="pos-badge" id="posBadge" title="Từ loại"></span>
            <span class="hanviet-badge" id="hanvietBadge" title="Âm Hán - Việt"></span>
          </div>

          <!-- Vùng chứa ẩn tương thích ngược -->
          <div class="card-supporting-group" id="cardSupportingGroup" style="display: none;"></div>
        </div>

        <!-- Khối ví dụ thực tế (Chỉ hiển thị sau khi lật đáp án) -->
        <div class="example-box" id="exampleBox">
          <div class="ex-header-row">
            <span class="ex-label">Ví dụ</span>
            <div class="example-audio-controls card-interactive">
              <button class="example-sound-btn speech-btn" id="exampleSoundBtn" type="button"
                onclick="event.stopPropagation(); speakExample()"
                aria-label="Nghe câu ví dụ" aria-live="polite" title="Nghe câu ví dụ">
                <svg class="sound-btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              </button>
              <details class="example-speed-picker" id="exampleSpeedPicker"
                onclick="event.stopPropagation()">
                <summary aria-label="Tốc độ đọc câu ví dụ: ${formatExampleSpeechSpeed(exampleSpeechSpeed)}">
                  <span class="example-speed-label">Tốc độ</span>
                  <span class="example-current-speed" id="exampleCurrentSpeed">${formatExampleSpeechSpeed(exampleSpeechSpeed)}</span>
                </summary>
                <div class="example-speed-options" role="group" aria-label="Chọn tốc độ đọc câu ví dụ">
                  ${EXAMPLE_SPEECH_SPEEDS.map(speed => `
                    <button class="example-speed-option${speed === exampleSpeechSpeed ? ' selected' : ''}"
                       type="button" data-speed="${speed}"
                      aria-pressed="${speed === exampleSpeechSpeed}"
                      onclick="event.preventDefault(); setExampleSpeechSpeed(this.dataset.speed)">
                      ${formatExampleSpeechSpeed(speed)}
                    </button>
                  `).join('')}
                </div>
              </details>
            </div>
          </div>
          <div class="ex-line ex-zh" id="exZh"></div>
          <div class="ex-line ex-py" id="exPy"></div>
          <div class="ex-line ex-vi" id="exVi"></div>
        </div>

        <!-- Khối mở rộng học sâu: Accordion thu gọn mặc định cho Cấu tạo chữ & Chữ liên quan -->
        <div class="card-expandable-group" id="cardExpandableGroup">
          <details class="card-accordion" id="cardDecompAccordion" onclick="event.stopPropagation()" style="display: none;">
            <summary class="card-accordion-summary">
              <span class="accordion-left">
                <span class="accordion-icon" aria-hidden="true">🧩</span>
                <span class="accordion-title">Cấu tạo chữ</span>
              </span>
              <span class="accordion-chevron" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </summary>
            <div class="card-accordion-body" id="cardDecompositionWrap">
              <div class="card-radicals-row card-interactive" id="cardRadicalsRow" onclick="event.stopPropagation()"></div>
            </div>
          </details>

          <details class="card-accordion" id="cardRelatedAccordion" onclick="event.stopPropagation()" style="display: none;">
            <summary class="card-accordion-summary">
              <span class="accordion-left">
                <span class="accordion-icon" aria-hidden="true">🔗</span>
                <span class="accordion-title">Chữ liên quan</span>
                <span class="accordion-badge" id="cardRelatedCountBadge" hidden></span>
              </span>
              <span class="accordion-chevron" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </summary>
            <div class="card-accordion-body">
              <div class="card-related-wrap" id="cardRelatedWrap" onclick="event.stopPropagation()"></div>
            </div>
          </details>
        </div>

        <div class="card-flip-prompt" id="cardFlipPrompt" onclick="flip()" role="button" tabindex="0" aria-label="Lật thẻ">
          <span class="card-flip-prompt-icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
            </svg>
          </span>
          <span class="hint card-flip-prompt-text" id="hint">${getCardHintText(false)}</span>
        </div>
        <div class="card-empty-state card-interactive" id="cardEmptyState" hidden></div>
      </div>
    </div>

    <!-- Rating actions row: Subtle Filled Buttons with height >= 48px & keyboard shortcuts 1 and 2 -->
    <div class="rating-area" id="ratingArea">
      <div class="rating-row" id="ratingRow" hidden>
        ${ratingButtonsHtml('rateCurrentCard', 'preview-')}
      </div>
    </div>

    <!-- Tactile study navigation controls: Previous, Counter, Next -->
    <nav class="study-nav-controls" id="studyNavRow" aria-label="Điều hướng thẻ từ vựng">
      <button type="button" class="study-nav-btn study-nav-btn--prev nav-btn nav-btn--prev" id="prevCardBtn" onclick="prevCard()" title="Từ trước (phím ←)" aria-label="Từ trước">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19 12H5m7 7l-7-7 7-7"/>
        </svg>
        <span>Trước</span>
      </button>
      <div class="study-nav-position" id="studyNavPosition" aria-live="polite">
        <span class="study-nav-current" id="studyNavCurrent">1</span>
        <span class="study-nav-sep" aria-hidden="true">/</span>
        <span class="study-nav-total" id="studyNavTotal">1</span>
      </div>
      <button type="button" class="study-nav-btn study-nav-btn--next nav-btn nav-btn--next" id="nextCardBtn" onclick="nextCard()" title="Từ tiếp theo (phím →)" aria-label="Từ tiếp theo">
        <span>Tiếp</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12h14m-7-7l7 7-7 7"/>
        </svg>
      </button>
    </nav>

    <div class="action-row secondary-actions" style="display:none" hidden>
      <button class="show-unknown-btn" id="unknownWordsToggle" onclick="toggleUnknownWords()"
        aria-controls="unknownWordsList" aria-expanded="false">
        Hiển thị từ chưa nhớ
      </button>
      <button class="reset-progress-btn" type="button" onclick="resetProgress()">↻ Học lại từ đầu</button>
    </div>
    <div id="dailyNewLimitMessage" class="daily-new-limit-message" role="status"></div>
    <div class="unknown-words-list" id="unknownWordsList"></div>
  `;
  updateCardMoreMenuState();
  if (typeof updateWeakWordToggleButton === 'function') updateWeakWordToggleButton();
  updateProgress();
  updateCardPosition();
  initSwipe();
}

function toggleStudyHeaderMenu(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('studyHeaderDropdown');
  const btn = document.getElementById('studyHeaderMoreBtn');
  if (!dropdown || !btn) return;
  const isHidden = dropdown.hidden;
  if (isHidden) {
    if (typeof closeCardMoreMenu === 'function') closeCardMoreMenu();
    if (typeof closeCompactFilterMenu === 'function') closeCompactFilterMenu();
    dropdown.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    dropdown.classList.add('is-open');
  } else {
    closeStudyHeaderMenu();
  }
}

function closeStudyHeaderMenu() {
  const dropdown = document.getElementById('studyHeaderDropdown');
  const btn = document.getElementById('studyHeaderMoreBtn');
  if (dropdown) {
    dropdown.hidden = true;
    dropdown.classList.remove('is-open');
  }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
window.toggleStudyHeaderMenu = toggleStudyHeaderMenu;
window.closeStudyHeaderMenu = closeStudyHeaderMenu;

function toggleCompactFilterMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('compactFilterMenu');
  const trigger = document.getElementById('compactFilterTrigger');
  if (!menu || !trigger) return;
  const isHidden = menu.hidden;
  if (isHidden) {
    if (typeof closeStudyHeaderMenu === 'function') closeStudyHeaderMenu();
    if (typeof closeCardMoreMenu === 'function') closeCardMoreMenu();
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    menu.classList.add('is-open');
  } else {
    closeCompactFilterMenu();
  }
}

function closeCompactFilterMenu() {
  const menu = document.getElementById('compactFilterMenu');
  const trigger = document.getElementById('compactFilterTrigger');
  if (menu) {
    menu.hidden = true;
    menu.classList.remove('is-open');
  }
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}
window.toggleCompactFilterMenu = toggleCompactFilterMenu;
window.closeCompactFilterMenu = closeCompactFilterMenu;

function toggleCardMoreMenu(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('cardMoreDropdown');
  const btn = document.getElementById('cardMoreBtn');
  if (!dropdown || !btn) return;
  const isHidden = dropdown.hidden;
  if (isHidden) {
    if (typeof closeStudyHeaderMenu === 'function') closeStudyHeaderMenu();
    if (typeof closeCompactFilterMenu === 'function') closeCompactFilterMenu();
    updateCardMoreMenuState();
    dropdown.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    dropdown.classList.add('is-open');
  } else {
    closeCardMoreMenu();
  }
}

function closeCardMoreMenu() {
  const dropdown = document.getElementById('cardMoreDropdown');
  const btn = document.getElementById('cardMoreBtn');
  if (dropdown) {
    dropdown.hidden = true;
    dropdown.classList.remove('is-open');
  }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function updateCardMoreMenuState() {
  const pinyinLabel = document.getElementById('menuPinyinText');
  const pinyinIcon = document.getElementById('menuPinyinIcon');
  if (pinyinLabel) pinyinLabel.textContent = showPinyin ? 'Ẩn pinyin' : 'Hiện pinyin';
  if (pinyinIcon) pinyinIcon.textContent = showPinyin ? '👁️' : '🙈';

  const hvLabel = document.getElementById('menuHanvietText');
  if (hvLabel) hvLabel.textContent = showHanViet ? 'Tắt âm Hán - Việt' : 'Bật âm Hán - Việt';

  const illuLabel = document.getElementById('menuIllustrationText');
  const illuIcon = document.getElementById('menuIllustrationIcon');
  if (illuLabel) illuLabel.textContent = showIllustration ? 'Ẩn hình minh họa' : 'Hiện hình minh họa';
  if (illuIcon) illuIcon.textContent = showIllustration ? '🖼️' : '🚫';

  const isWeak = Boolean(activeStudyWord && typeof isWeakWord === 'function' && isWeakWord(activeStudyWord.hanzi));
  const weakLabel = document.getElementById('menuWeakText');
  const weakIcon = document.getElementById('menuWeakIcon');
  if (weakLabel) weakLabel.textContent = isWeak ? 'Bỏ đánh dấu từ khó' : 'Đánh dấu từ khó';
  if (weakIcon) weakIcon.textContent = isWeak ? '⭐' : '☆';

  const moreBtn = document.getElementById('cardMoreBtn');
  if (moreBtn) {
    moreBtn.classList.toggle('has-weak-word', isWeak);
    moreBtn.title = isWeak ? 'Từ khó đã đánh dấu · Tùy chọn khác' : 'Tùy chọn khác';
  }
}

document.addEventListener('pointerdown', event => {
  const wrap = document.getElementById('cardMoreMenuWrap');
  if (wrap && !wrap.contains(event.target)) {
    closeCardMoreMenu();
  }
  const headerWrap = document.getElementById('studyHeaderMenuWrap');
  if (headerWrap && !headerWrap.contains(event.target)) {
    closeStudyHeaderMenu();
  }
  const filterWrap = document.querySelector('.compact-filter-wrap');
  if (filterWrap && !filterWrap.contains(event.target)) {
    closeCompactFilterMenu();
  }
});

function toggleIllustration() {
  showIllustration = !showIllustration;
  try { localStorage.setItem('hsk_show_illustrations', String(showIllustration)); } catch (e) {}
  document.body.classList.toggle('hide-illustrations', !showIllustration);
  document.documentElement.classList.toggle('hide-illustrations', !showIllustration);
  updateCardMoreMenuState();

  const card = document.getElementById('card');
  const wasFlipped = Boolean(card && card.classList.contains('is-flipped'));
  const shouldBeFlipped = wasFlipped || showIllustration;

  if (typeof render === 'function') {
    render();
    if (shouldBeFlipped) {
      const c = document.getElementById('card');
      const m = document.getElementById('meaning');
      const ex = document.getElementById('exampleBox');
      const snd = document.getElementById('soundBtn');
      if (c) c.classList.add('is-flipped');
      if (m) m.classList.add('show');
      if (ex) ex.classList.add('show');
      if (snd) snd.classList.add('show');
      const hintEl = document.getElementById('hint');
      if (hintEl && typeof getCardHintText === 'function') {
        hintEl.textContent = getCardHintText(true);
      }
    }
  }
}
window.toggleIllustration = toggleIllustration;

function toggleHanViet() {
  showHanViet = !showHanViet;
  try { localStorage.setItem('hsk_show_hanviet', String(showHanViet)); } catch (e) {}
  document.body.classList.toggle('hide-hanviet', !showHanViet);
  document.documentElement.classList.toggle('hide-hanviet', !showHanViet);
  const badge = document.getElementById('hanvietBadge');
  if (badge) {
    badge.style.display = showHanViet && badge.textContent ? 'inline-flex' : 'none';
  }
  const btn = document.getElementById('hanvietToggle');
  if (btn) {
    btn.classList.toggle('on', !showHanViet);
    btn.title = showHanViet ? 'Ẩn âm Hán - Việt (H)' : 'Hiện âm Hán - Việt (H)';
    btn.setAttribute('aria-label', showHanViet ? 'Ẩn âm Hán - Việt (H)' : 'Hiện âm Hán - Việt (H)');
  }
  const topbarBtn = document.getElementById('studyHanvietToggleBtn');
  if (topbarBtn) {
    topbarBtn.classList.toggle('active', showHanViet);
  }
  document.querySelectorAll('.hanviet-badge, .study-word-hanviet, .active-hv, .vocabulary-hanviet').forEach(el => {
    el.style.display = showHanViet ? '' : 'none';
  });
}
window.toggleHanViet = toggleHanViet;

function openStudyFilterSheet() {
  const dlg = document.getElementById('studyFilterDialog');
  if (dlg && typeof dlg.showModal === 'function') {
    dlg.showModal();
  }
}
function closeStudyFilterSheet() {
  const dlg = document.getElementById('studyFilterDialog');
  if (dlg && dlg.open) dlg.close();
}
window.openStudyFilterSheet = openStudyFilterSheet;
window.closeStudyFilterSheet = closeStudyFilterSheet;

function renderFilters() {
  const row = document.getElementById('filterRow');
  if (!row) return;

  const deck = typeof computeDeckProgress === 'function'
    ? computeDeckProgress()
    : { learned: 0, total: WORDS.length, pct: 0, known: 0, unknown: 0, unseen: 0 };

  const total = deck.total || (Array.isArray(WORDS) ? WORDS.length : 0);
  const known = deck.known || 0;
  const unknown = deck.unknown || 0;
  const unseen = deck.unseen || 0;
  const learned = deck.learned || 0;
  const learnedPct = deck.pct || 0;

  const levelLabel = (typeof LEVELS !== 'undefined' && LEVELS[currentLevel]?.label)
    ? LEVELS[currentLevel].label
    : (typeof currentLevel === 'string' ? currentLevel.toUpperCase() : 'HSK');

  const knownPctNum = total > 0 ? (known / total) * 100 : 0;
  const unknownPctNum = total > 0 ? (unknown / total) * 100 : 0;
  const isAllMastered = total > 0 && known === total;
  const isAllLearned = total > 0 && learned === total;

  const pctDisplay = isAllMastered
    ? '👑 100%'
    : isAllLearned
    ? '🏆 100%'
    : `${learnedPct}%`;

  const filters = [
    {
      key: 'all',
      label: 'Tất cả',
      count: total,
      iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg>`
    },
    {
      key: 'known',
      label: 'Đã nhớ',
      count: known,
      iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    },
    {
      key: 'unknown',
      label: 'Chưa nhớ',
      count: unknown,
      iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"/></svg>`
    },
    {
      key: 'unseen',
      label: 'Chưa học',
      count: unseen,
      iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-dasharray="3.5 3.5"/><polyline points="12 7 12 12 15 15"/></svg>`
    },
  ];

  row.innerHTML = `
    <section class="learning-progress-navigator" aria-label="Bộ điều hướng tiến độ học ${levelLabel}">
      <div class="progress-nav-header">
        <div class="progress-nav-summary-group">
          <span class="progress-nav-level-tag">${levelLabel}</span>
          <div class="progress-nav-metric-main">
            <span class="progress-nav-metric-label">Đã học</span>
            <span class="progress-nav-metric-val"><strong>${learned}</strong> / ${total}</span>
            <span class="progress-nav-metric-pct${isAllLearned ? ' is-completed' : ''}"
              ${isAllLearned ? `onclick="if (typeof showCelebration === 'function') showCelebration('${isAllMastered ? 'mastered' : 'learned'}', true);" title="Nhấn để xem lại hiệu ứng thành tựu 🎉"` : ''}>${pctDisplay}</span>
          </div>
        </div>
        <div class="progress-nav-stats-breakdown" aria-label="Chú thích phân bổ ghi nhớ">
          <span class="progress-nav-stat progress-nav-stat--known" title="Đã nhớ: ${known}/${total} từ (${Math.round(knownPctNum)}%)">
            <span class="progress-nav-stat-dot" aria-hidden="true"></span>
            <span class="progress-nav-stat-label">Đã nhớ</span>
          </span>
          <span class="progress-nav-stat progress-nav-stat--unknown" title="Cần ôn: ${unknown}/${total} từ (${Math.round(unknownPctNum)}%)">
            <span class="progress-nav-stat-dot" aria-hidden="true"></span>
            <span class="progress-nav-stat-label">Cần ôn</span>
          </span>
        </div>
      </div>

      <div class="progress-nav-bar" role="progressbar"
           aria-label="Tiến độ học: ${known} đã nhớ, ${unknown} cần ôn, ${unseen} chưa học trên tổng số ${total} từ"
           aria-valuenow="${learnedPct}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-nav-track">
          <div class="progress-nav-seg progress-nav-seg--known"
               style="width: ${knownPctNum}%;"
               title="Đã nhớ: ${known} từ (${Math.round(knownPctNum)}%)"></div>
          <div class="progress-nav-seg progress-nav-seg--unknown"
               style="width: ${unknownPctNum}%;"
               title="Cần ôn: ${unknown} từ (${Math.round(unknownPctNum)}%)"></div>
        </div>
      </div>

      <div class="progress-nav-cards" role="radiogroup" aria-label="Lọc danh sách thẻ từ vựng">
        ${filters.map(f => {
          const isSelected = currentFilter === f.key;
          const isEmpty = f.count === 0;
          return `
            <button type="button"
              class="progress-nav-card progress-nav-card--${f.key}${isSelected ? ' is-active' : ''}${isEmpty ? ' is-empty' : ''}"
              onclick="setFilter('${f.key}')"
              role="radio"
              aria-checked="${isSelected}"
              aria-label="${f.label}: ${f.count} từ${isSelected ? ', đang chọn' : ''}"
              title="${f.label}: ${f.count} từ${isEmpty ? ' (Chưa có từ)' : ''}">
              <div class="progress-nav-card-head">
                <span class="progress-nav-card-icon" aria-hidden="true">${f.iconSvg}</span>
                <span class="progress-nav-card-label">${f.label}</span>
              </div>
              <div class="progress-nav-card-body">
                <span class="progress-nav-card-count">${f.count}</span>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    </section>
  `;

  const sheetBody = document.getElementById('studyFilterSheetBody');
  if (sheetBody) {
    sheetBody.innerHTML = `
      <div class="study-filter-sheet-options" role="radiogroup" aria-label="Chọn bộ lọc học">
        ${filters.map(f => `
          <button type="button" class="study-filter-sheet-option${currentFilter === f.key ? ' is-active' : ''}"
            onclick="setFilter('${f.key}'); closeStudyFilterSheet();"
            role="radio" aria-checked="${currentFilter === f.key}">
            <div class="filter-sheet-option-left">
              <span class="filter-sheet-option-label">${f.label}</span>
            </div>
            <div class="filter-sheet-option-right">
              <span class="filter-sheet-option-count">${f.count} từ</span>
              ${currentFilter === f.key ? '<span class="filter-sheet-check">✓</span>' : ''}
            </div>
          </button>
        `).join('')}
      </div>
    `;
  }
}
function setFilter(key) {
  const currentWordId = (filteredOrder && filteredOrder[idx] !== undefined && WORDS[filteredOrder[idx]])
    ? WORDS[filteredOrder[idx]].id
    : null;

  currentFilter = key;
  if (key === 'all') filteredOrder = order.slice();
  else if (key === 'unseen') filteredOrder = order.filter(i => !progress[WORDS[i].id]);
  else filteredOrder = order.filter(i => progress[WORDS[i].id] === key);

  if (currentWordId && filteredOrder.length > 0) {
    const newIdx = filteredOrder.findIndex(i => WORDS[i] && WORDS[i].id === currentWordId);
    idx = newIdx !== -1 ? newIdx : 0;
  } else {
    idx = 0;
  }

  renderFilters();
  renderStudyWordList();
  render('fade');
}
function updateStats() {
  let known = 0, unknown = 0;
  Object.values(progress).forEach(v => { if (v === 'known') known++; else if (v === 'unknown') unknown++; });
  const sTotal = document.getElementById('s-total');
  if (sTotal) sTotal.textContent = WORDS.length;
  const sKnown = document.getElementById('s-known');
  if (sKnown) sKnown.textContent = known;
  const sUnknown = document.getElementById('s-unknown');
  if (sUnknown) sUnknown.textContent = unknown;
  const sUnseen = document.getElementById('s-unseen');
  if (sUnseen) sUnseen.textContent = Math.max(0, WORDS.length - known - unknown);
  renderFilters();
  updateProgress();
}
const RATING_BUTTONS = [
  { rating: 'again', emoji: '❌', label: 'Chưa nhớ', key: '1', interval: 'Hôm nay' },
  { rating: 'good', emoji: '✅', label: 'Đã nhớ', key: '2', interval: 'Ôn ngắt quãng' },
];
const RATING_KEYS = {
  '1': 'again',
  '2': 'good',
};

// Shared by the level deck and "Ôn hôm nay": label with icon, no cluttered subtext.
function ratingButtonsHtml(handlerName, previewIdPrefix, previews) {
  return RATING_BUTTONS.map(button => {
    const preview = previews ? previews[button.rating] : null;
    const intervalText = preview ? formatSrsInterval(preview, button.interval) : button.interval;
    const shortcutArrow = button.rating === 'again' ? '←' : '→';
    const iconSvg = button.rating === 'again'
      ? `<svg class="rating-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
      : `<svg class="rating-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const titleText = `${button.label}${intervalText ? ` (${intervalText})` : ''} • Phím [${button.key}] hoặc [${shortcutArrow}]`;
    return `
    <button type="button" class="rating-btn rating-btn--${button.rating}"
      onclick="${handlerName}('${button.rating}')" aria-keyshortcuts="${button.key}"
      title="${titleText}">
      <span class="rating-icon-wrap" aria-hidden="true">${iconSvg}</span>
      <span class="rating-label">${button.label}</span>
      <span class="rating-kbd-badge" aria-hidden="true">
        <kbd>${button.key}</kbd>
        <span class="rating-kbd-sep">/</span>
        <kbd>${shortcutArrow}</kbd>
      </span>
    </button>`;
  }).join('');
}
function revealButtonHtml(onclick, id) {
  return '';
}
function formatSrsInterval(preview, fallback) {
  if (preview && preview.intervalText) return preview.intervalText;
  if (!preview) return fallback || '';
  if (preview.rating === 'again') return 'Hôm nay';
  const ms = preview.intervalMs;
  if (!Number.isFinite(ms)) return fallback || '';
  const days = Math.round(ms / 86400000);
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return '1 ngày';
  return days + ' ngày';
}
function updateSrsPreviews(word) {
  const card = word && srsCards[word.id];
  const previews = card ? SRS.preview(card, new Date(), srsRetention) : {};
  RATING_BUTTONS.forEach(({ rating, interval, label, key }) => {
    const node = document.getElementById('preview-' + rating);
    if (node) node.textContent = formatSrsInterval(previews[rating], interval);
    const btn = document.querySelector(`.rating-btn--${rating}`);
    if (btn) {
      const nextInterval = formatSrsInterval(previews[rating], interval);
      const arrow = rating === 'again' ? '←' : '→';
      btn.title = `Đánh giá: ${label}${nextInterval ? ` (${nextInterval})` : ''} • Phím [${key}] hoặc [${arrow}]`;
    }
  });
}
function ratingsVisible() {
  const ratingRow = document.getElementById('ratingRow');
  return Boolean(ratingRow && !ratingRow.hidden);
}
function isCardRevealed() {
  const meaning = document.getElementById('meaning');
  return Boolean(meaning && meaning.classList.contains('show'));
}
window.isCardRevealed = isCardRevealed;

// Rating buttons appear only once the card is flipped/revealed.
function syncRevealControls() {
  const revealBtn = document.getElementById('revealBtn');
  if (revealBtn) revealBtn.hidden = true;
  const ratingRow = document.getElementById('ratingRow');
  const ratingArea = document.getElementById('ratingArea');
  const studyNavRow = document.getElementById('studyNavRow');
  const hasCard = Array.isArray(filteredOrder) && filteredOrder.length > 0;
  const revealed = hasCard && isCardRevealed();
  if (ratingRow) {
    ratingRow.hidden = !revealed;
    ratingRow.style.display = revealed ? '' : 'none';
  }
  if (ratingArea) {
    ratingArea.hidden = !revealed;
    ratingArea.style.display = revealed ? '' : 'none';
  }
  if (studyNavRow) {
    studyNavRow.hidden = !hasCard;
    studyNavRow.style.display = hasCard ? '' : 'none';
  }
}
function computeDeckProgress() {
  if (!Array.isArray(WORDS) || WORDS.length === 0) {
    return { learned: 0, total: 0, pct: 0, known: 0, unknown: 0, unseen: 0 };
  }
  let known = 0, unknown = 0;
  WORDS.forEach(w => {
    const st = progress[w.id];
    if (st === 'known') known++;
    else if (st === 'unknown') unknown++;
  });
  const learned = known + unknown;
  const total = WORDS.length;
  const unseen = Math.max(0, total - learned);
  const pct = total === 0 ? 0 : Math.round((learned / total) * 100);
  return { learned, total, pct, known, unknown, unseen };
}

function updateProgress(current, total) {
  const deck = computeDeckProgress();
  const el = document.getElementById('progress');
  if (el) {
    el.innerHTML = deck.total === 0
      ? '0 / 0'
      : `<span class="study-progress-label">Đã học</span> <span class="study-progress-count">${deck.learned} / ${deck.total}</span>`;
  }
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = deck.pct + '%';
  const pctEl = document.getElementById('progressPct');
  if (pctEl) {
    if (deck.pct === 100 && deck.total > 0) {
      pctEl.textContent = '🏆 100%';
      pctEl.classList.add('is-completed');
      pctEl.title = 'Chúc mừng bạn đã hoàn thành 100% từ vựng! Nhấn để xem hiệu ứng thành tựu 🎉';
      pctEl.style.cursor = 'pointer';
      pctEl.onclick = e => {
        e.stopPropagation();
        if (typeof showCelebration === 'function') {
          showCelebration(deck.known === deck.total ? 'mastered' : 'learned', true);
        }
      };
    } else {
      pctEl.textContent = deck.pct + '%';
      pctEl.classList.remove('is-completed');
      pctEl.title = '';
      pctEl.style.cursor = '';
      pctEl.onclick = null;
    }
  }
  const topbar = document.getElementById('studyTopbarProgress');
  if (topbar) {
    topbar.title = `Tiến độ học: ${deck.learned}/${deck.total} (${deck.pct}%) • Đã nhớ: ${deck.known}, Chưa nhớ: ${deck.unknown}`;
  }

  // Also synchronize learning progress navigator in study view
  const navSegKnown = document.querySelector('.progress-nav-seg--known');
  const navSegUnknown = document.querySelector('.progress-nav-seg--unknown');
  if (navSegKnown && navSegUnknown) {
    const tot = deck.total || 1;
    const kPct = deck.total > 0 ? (deck.known / tot) * 100 : 0;
    const uPct = deck.total > 0 ? (deck.unknown / tot) * 100 : 0;
    navSegKnown.style.width = kPct + '%';
    navSegKnown.title = `Đã nhớ: ${deck.known} từ (${Math.round(kPct)}%)`;
    navSegUnknown.style.width = uPct + '%';
    navSegUnknown.title = `Cần ôn: ${deck.unknown} từ (${Math.round(uPct)}%)`;
  }
  const navBar = document.querySelector('.progress-nav-bar');
  if (navBar) {
    navBar.setAttribute('aria-valuenow', String(deck.pct));
  }
}

function updateCardPosition() {
  const badge = document.getElementById('cardPositionBadge');
  const counter = document.getElementById('cardCounter');
  const navCurrent = document.getElementById('studyNavCurrent');
  const navTotal = document.getElementById('studyNavTotal');
  const prevBtn = document.getElementById('prevCardBtn');
  const nextBtn = document.getElementById('nextCardBtn');

  if (!filteredOrder || filteredOrder.length === 0) {
    const deck = computeDeckProgress();
    const txt = (currentFilter === 'unseen' && deck.unseen === 0 && deck.total > 0) ? 'Hoàn thành' : '0 / 0';
    if (badge) {
      badge.textContent = txt;
      if (txt === 'Hoàn thành') badge.title = 'Đã học qua 100% từ vựng mới của cấp độ này';
    }
    if (counter) counter.textContent = txt;
    if (navCurrent) navCurrent.textContent = '0';
    if (navTotal) navTotal.textContent = '0';
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }
  const current = (idx % filteredOrder.length) + 1;
  const total = filteredOrder.length;
  const posText = `Từ ${current} / ${total}`;
  if (badge) {
    badge.textContent = posText;
    const filterLabel = currentFilter === 'all' ? 'Tất cả'
      : currentFilter === 'known' ? 'Đã nhớ'
      : currentFilter === 'unknown' ? 'Chưa nhớ'
      : currentFilter === 'unseen' ? 'Chưa học' : currentFilter;
    badge.title = `Thẻ ${current} / ${total} (${filterLabel})`;
  }
  if (counter) {
    counter.textContent = `${current} / ${total}`;
  }
  if (navCurrent) navCurrent.textContent = String(current);
  if (navTotal) navTotal.textContent = String(total);
  if (prevBtn) prevBtn.disabled = (total <= 1);
  if (nextBtn) nextBtn.disabled = (total <= 1);
}

function renderHanziWithClarifier(el, text) {
  if (!el) return;
  const raw = String(text || '').trim();
  const match = raw.match(/^([^（\(]+)[（\(](.+?)[）\)]$/);
  if (match) {
    el.textContent = '';
    const mainSpan = document.createElement('span');
    mainSpan.className = 'hanzi-text';
    mainSpan.textContent = match[1].trim();
    const clarifierSpan = document.createElement('span');
    clarifierSpan.className = 'hanzi-clarifier';
    clarifierSpan.textContent = `（${match[2].trim()}）`;
    el.appendChild(mainSpan);
    el.appendChild(clarifierSpan);
  } else {
    el.textContent = raw;
  }
}

function applyHanziLengthFit(el, text) {
  if (!el) return;
  const core = String(text || '').replace(/[（\(].*?[）\)]/g, '').trim() || text || '';
  const chars = Array.from(core);
  const len = chars.length;
  el.dataset.length = String(len);
  el.classList.remove('is-len-1', 'is-len-2', 'is-len-3', 'is-len-4', 'is-len-5', 'is-len-6-plus', 'is-len-long');
  if (len >= 6) {
    el.classList.add('is-len-6-plus', 'is-len-long');
  } else if (len === 5) {
    el.classList.add('is-len-5', 'is-len-long');
  } else if (len === 4) {
    el.classList.add('is-len-4');
  } else if (len === 3) {
    el.classList.add('is-len-3');
  } else if (len === 2) {
    el.classList.add('is-len-2');
  } else {
    el.classList.add('is-len-1');
  }
  fitHanziToContainer(el);

  if (typeof ResizeObserver !== 'undefined' && !window.__hanziResizeObserver) {
    const parent = el.parentElement;
    if (parent) {
      window.__hanziResizeObserver = new ResizeObserver(() => {
        const currentHanzi = document.getElementById('hanzi');
        if (currentHanzi && currentHanzi.textContent) {
          fitHanziToContainer(currentHanzi);
        }
      });
      window.__hanziResizeObserver.observe(parent);
    }
  }
}

function fitHanziToContainer(el) {
  if (!el) return;
  el.style.fontSize = '';
  requestAnimationFrame(() => {
    if (!el || !el.parentElement) return;
    const parent = el.parentElement;
    const availableWidth = parent.clientWidth - 16;
    if (availableWidth <= 50) return;
    if (el.scrollWidth > availableWidth) {
      const computed = window.getComputedStyle(el);
      const currentSize = parseFloat(computed.fontSize);
      if (currentSize > 16) {
        const ratio = availableWidth / el.scrollWidth;
        const newSize = Math.max(16, Math.floor(currentSize * ratio * 0.98));
        el.style.fontSize = `${newSize}px`;
      }
    }
  });
}

window.addEventListener('resize', () => {
  const h = document.getElementById('hanzi');
  if (h && h.textContent) fitHanziToContainer(h);
});

// Lock mouse wheel scrolling on flashcard study stage since there is no extra content below
window.addEventListener('wheel', (e) => {
  if (!document.body.classList.contains('flashcard-study-mode')) return;

  // Allow wheel scrolling in Overview list
  const overviewView = document.getElementById('overviewView');
  if (overviewView && !overviewView.hidden && overviewView.contains(e.target)) {
    return;
  }

  // Allow scrolling inside slide-over study drawer (handwriting canvas, radicals, etc.)
  if (document.body.classList.contains('study-sidebar-open') && e.target.closest('.workstation-right')) {
    return;
  }

  // Allow scrolling in open dialogs/modals (e.g., filter dialog, help modal)
  const openModal = document.querySelector('dialog[open], .study-modal.open, .study-filter-dialog[open]');
  if (openModal && openModal.contains(e.target)) {
    return;
  }

  // If inside the card and card itself is overflowing and can scroll in that direction, allow it
  const card = e.target.closest('.card');
  if (card && card.scrollHeight > card.clientHeight) {
    const isScrollingDown = e.deltaY > 0;
    const canScrollDown = card.scrollTop + card.clientHeight < card.scrollHeight - 1;
    const canScrollUp = card.scrollTop > 1;
    if ((isScrollingDown && canScrollDown) || (!isScrollingDown && canScrollUp)) {
      return;
    }
  }

  // Prevent wheel scrolling on the study view since there is no extra content below
  e.preventDefault();
}, { passive: false });

function toggleStudySidebar(forceOpen) {
  const isOpen = document.body.classList.contains('study-sidebar-open');
  const isTargetTab = document.body.dataset.sidebarTab === 'words';
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : (!isOpen || !isTargetTab);

  if (shouldOpen) {
    document.body.classList.add('study-sidebar-open');
    if (typeof window.setSidebarStudyTab === 'function') {
      window.setSidebarStudyTab('words');
    }
    if (typeof renderStudyWordList === 'function') {
      renderStudyWordList();
    }
    if (typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) {
      SpaRouter.pushView({ view: 'cards', level: currentLevel, drawerOpen: true });
    }
  } else {
    document.body.classList.remove('study-sidebar-open');
  }
  updateStudyDrawerButtons();
}

function toggleStudyWritingPanel(forceOpen) {
  const isOpen = document.body.classList.contains('study-sidebar-open');
  const isTargetTab = document.body.dataset.sidebarTab === 'stroke';
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : (!isOpen || !isTargetTab);

  if (shouldOpen) {
    document.body.classList.add('study-sidebar-open');
    if (typeof window.setSidebarStudyTab === 'function') {
      window.setSidebarStudyTab('stroke');
    }
    if (typeof renderActiveStrokeChar === 'function') {
      setTimeout(() => renderActiveStrokeChar(true), 50);
    } else if (typeof loadStrokeCanvasWord === 'function' && typeof activeStudyWord !== 'undefined') {
      setTimeout(() => loadStrokeCanvasWord(activeStudyWord), 50);
    }
    if (typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) {
      SpaRouter.pushView({ view: 'cards', level: currentLevel, drawerOpen: true });
    }
  } else {
    document.body.classList.remove('study-sidebar-open');
  }
  updateStudyDrawerButtons();
}

function closeAllStudyDrawers() {
  if (typeof closeMobileStatsSheet === 'function') closeMobileStatsSheet();
  if (typeof toggleTransferPanel === 'function') toggleTransferPanel(false);
  if (typeof toggleRadicalTransferPanel === 'function') toggleRadicalTransferPanel(false);
  const wasOpen = document.body.classList.contains('study-sidebar-open');
  document.body.classList.remove('study-sidebar-open');
  updateStudyDrawerButtons();
  if (wasOpen && typeof SpaRouter !== 'undefined' && !SpaRouter.isNavigatingFromPopstate()) {
    if (window.history.state && window.history.state.drawerOpen) {
      window.history.back();
    }
  }
}

function updateStudyDrawerButtons() {
  const isPanelOpen = document.body.classList.contains('study-sidebar-open');
  const activeTab = document.body.dataset.sidebarTab || 'stroke';

  const sidebarBtn = document.getElementById('studySidebarToggleBtn');
  if (sidebarBtn) sidebarBtn.classList.toggle('active', isPanelOpen && activeTab === 'words');
  const writingBtn = document.getElementById('studyWritingToggleBtn');
  if (writingBtn) writingBtn.classList.toggle('active', isPanelOpen && activeTab === 'stroke');
  const cardWritingBtn = document.getElementById('cardWritingBtn');
  if (cardWritingBtn) cardWritingBtn.classList.toggle('active', isPanelOpen && activeTab === 'stroke');

  const currentHanzi = document.getElementById('hanzi');
  if (currentHanzi && currentHanzi.textContent) {
    fitHanziToContainer(currentHanzi);
  }
}

function ensureStudyWordList() {
  if (!document.body.classList.contains('is-desktop-dock') && !document.body.classList.contains('flashcard-study-mode')) return null;
  let panel = document.getElementById('studyWordListPanel');
  if (panel) return panel;
  const isStudy = document.body.classList.contains('flashcard-study-mode');
  const mount = isStudy
    ? (document.getElementById('workstationRight') || document.getElementById('workstationLeft'))
    : document.getElementById('workstationLeft');
  if (!mount) return null;
  panel = document.createElement('section');
  panel.id = 'studyWordListPanel';
  panel.className = 'study-word-list-panel';
  panel.setAttribute('aria-label', 'Danh sách từ trong bài học hiện tại');
  panel.innerHTML = `
    <div class="study-word-list-heading">
      <div class="study-word-list-header-row">
        <strong id="studyWordListTitle">Danh sách từ</strong>
        <span id="studyWordListCount" class="study-word-count-badge"></span>
        <button type="button" class="study-drawer-close-btn" onclick="closeAllStudyDrawers()" aria-label="Đóng danh sách">✕</button>
      </div>
      <div id="studyWordListActiveWord" class="study-word-active-banner"></div>
      <label class="study-word-list-search">
        <span class="sr-only">Tìm trong bài học</span>
        <input type="search" id="studyWordListSearch" placeholder="Tìm kiếm từ trong bài..." autocomplete="off">
      </label>
    </div>
    <div class="study-word-list-items" id="studyWordListItems" role="listbox" aria-label="Chọn từ trong bài học"></div>`;
  mount.appendChild(panel);
  const searchEl = panel.querySelector('#studyWordListSearch');
  if (searchEl) {
    searchEl.addEventListener('input', renderStudyWordList);
    searchEl.addEventListener('search', renderStudyWordList);
  }
  return panel;
}

function renderStudyWordList() {
  const panel = ensureStudyWordList();
  if (!panel) return;
  const items = panel.querySelector('#studyWordListItems');
  const searchInput = panel.querySelector('#studyWordListSearch');
  const query = searchInput ? searchInput.value.trim() : '';
  const currentIndex = filteredOrder.length ? filteredOrder[idx % filteredOrder.length] : -1;
  const activeWord = currentIndex >= 0 ? WORDS[currentIndex] : null;

  const countBadge = panel.querySelector('#studyWordListCount');
  if (countBadge) {
    const levelLabel = currentLevel && LEVELS[currentLevel] ? LEVELS[currentLevel].label : '';
    countBadge.textContent = WORDS.length ? `${levelLabel} · ${WORDS.length} từ` : '';
  }

  const activeBanner = panel.querySelector('#studyWordListActiveWord');
  if (activeBanner) {
    if (activeWord) {
      const status = progress[activeWord.id];
      const statusText = status === 'known' ? 'Đã nhớ' : status === 'unknown' ? 'Chưa nhớ' : 'Chưa học';
      const statusClass = status === 'known' ? 'badge-known' : status === 'unknown' ? 'badge-unknown' : 'badge-unseen';
      activeBanner.innerHTML = `
        <div class="active-word-info">
          <span class="active-kicker">Từ số ${currentIndex + 1}:</span>
          <strong class="active-hanzi">${activeWord.hanzi}</strong>
          <span class="active-py">${activeWord.pinyin || ''}</span>
          ${activeWord.hanviet ? `<span class="active-hv">［${activeWord.hanviet}］</span>` : ''}
        </div>
        <span class="active-status ${statusClass}">${statusText}</span>
      `;
    } else {
      activeBanner.innerHTML = '<span class="active-kicker">Chọn một từ để học</span>';
    }
  }

  const filteredWords = WORDS.map((word, wordIndex) => ({ word, wordIndex }))
    .filter(({ word }) => !query || (typeof wordMatchesQuery === 'function' ? wordMatchesQuery(word, query) : `${word.hanzi} ${word.pinyin} ${word.hanviet || ''} ${word.meaning}`.toLowerCase().includes(query.toLowerCase())));

  if (filteredWords.length === 0) {
    items.innerHTML = '<div class="study-word-list-empty" style="padding: 1.5rem; text-align: center; color: var(--text-muted, #888); font-size: 0.9rem;">Không tìm thấy từ nào phù hợp.</div>';
    return;
  }

  items.innerHTML = filteredWords.map(({ word, wordIndex }) => {
    const isCurrent = wordIndex === currentIndex;
    const status = progress[word.id];
    const statusIcon = status === 'known' ? '✓' : status === 'unknown' ? '✗' : '·';
    const statusClass = status === 'known' ? 'status-known' : status === 'unknown' ? 'status-unknown' : 'status-unseen';
    return `
      <button type="button" class="study-word-list-item${isCurrent ? ' active' : ''}"
        role="option" aria-selected="${isCurrent}" data-word-index="${wordIndex}"
        title="${word.hanzi} ${word.pinyin || ''}${word.hanviet ? ' ［' + word.hanviet + '］' : ''} - ${word.meaning || ''}">
        <span class="study-word-status ${statusClass}" aria-hidden="true">${statusIcon}</span>
        <span class="study-word-list-content">
          <span class="study-word-list-main">
            <span class="study-word-list-hanzi">${word.hanzi}</span>
            <span class="word-py">${word.pinyin || ''}</span>
            ${word.hanviet ? `<span class="study-word-hanviet">［${word.hanviet}］</span>` : ''}
          </span>
          <small class="word-vi">${word.meaning || ''}</small>
        </span>
        <span class="study-word-list-number">#${wordIndex + 1}</span>
      </button>
    `;
  }).join('');

  items.querySelectorAll('[data-word-index]').forEach(button => {
    const wordIndex = Number(button.dataset.wordIndex);
    const targetWord = WORDS[wordIndex];
    if (targetWord && typeof preloadSingleWordIllustration === 'function') {
      button.addEventListener('pointerenter', () => preloadSingleWordIllustration(targetWord, 'high'), { passive: true });
      button.addEventListener('touchstart', () => preloadSingleWordIllustration(targetWord, 'high'), { passive: true });
    }
    button.addEventListener('click', () => {
      let filteredIndex = filteredOrder.indexOf(wordIndex);
      if (filteredIndex < 0) {
        currentFilter = 'all';
        filteredOrder = order.slice();
        renderFilters();
        filteredIndex = filteredOrder.indexOf(wordIndex);
      }
      if (filteredIndex >= 0) {
        idx = filteredIndex;
        render('fade');
        if (window.innerWidth < 768) {
          closeAllStudyDrawers();
        }
      }
    });
  });

  if (currentIndex >= 0) {
    const activeButton = items.querySelector('.active');
    if (activeButton && !query) activeButton.scrollIntoView({ block: 'nearest' });
  }
}
function render(animate) {
  stopSpeech();
  if (transitionTimer) { clearTimeout(transitionTimer); transitionTimer = null; }
  // Hide ratings right away so a double press cannot rate the next card during the exit animation.
  const ratingRow = document.getElementById('ratingRow');
  if (ratingRow) ratingRow.hidden = true;

  // Zero-Latency Anticipatory Preload:
  // Before running the 150ms transition, fetch the incoming target card & immediate neighbors with TOP priority!
  if (Array.isArray(WORDS) && Array.isArray(filteredOrder) && filteredOrder.length > 0) {
    const targetWIdx = filteredOrder[idx % filteredOrder.length];
    const targetWord = WORDS[targetWIdx];
    if (targetWord && typeof preloadSingleWordIllustration === 'function') {
      preloadSingleWordIllustration(targetWord, 'high');
    }
    const nextWIdx = filteredOrder[(idx + 1) % filteredOrder.length];
    if (WORDS[nextWIdx] && typeof preloadSingleWordIllustration === 'function') {
      preloadSingleWordIllustration(WORDS[nextWIdx], 'high');
    }
  }

  const content = document.getElementById('cardContent');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function renderEmptyCardState(container) {
    if (!container) return;
    const deck = typeof computeDeckProgress === 'function' ? computeDeckProgress() : { learned: 0, total: WORDS.length, known: 0, unknown: 0, unseen: 0 };
    const levelLabel = (LEVELS[currentLevel] && LEVELS[currentLevel].label) || 'cấp độ này';

    if (currentFilter === 'unseen' || (deck.unseen === 0 && deck.total > 0 && currentFilter !== 'unknown' && currentFilter !== 'known')) {
      if (typeof launchConfettiFireworks === 'function') launchConfettiFireworks();
      if (typeof playCelebrationChime === 'function') playCelebrationChime();
      container.innerHTML = `
        <div class="achievement-hero-card">
          <div class="achievement-hero-trophy-wrap">
            <span class="achievement-hero-trophy">🏆</span>
            <span class="achievement-hero-sparkle-1">✨</span>
            <span class="achievement-hero-sparkle-2">⭐</span>
          </div>
          <div class="achievement-hero-badge">ĐÃ HOÀN THÀNH 100% TỪ VỰNG</div>
          <h2 class="achievement-hero-title">Bạn đã học hết từ vựng ${levelLabel}!</h2>
          <p class="achievement-hero-desc">
            Toàn bộ <strong>${deck.total}</strong> từ vựng đã được bạn học qua ít nhất một lần. Thành tựu thật tuyệt vời!
          </p>
          <div class="achievement-hero-stats">
            <div class="hero-stat-card">
              <span class="hero-stat-num">${deck.total}</span>
              <span class="hero-stat-label">Tổng số từ</span>
            </div>
            <div class="hero-stat-card hero-stat-card--known">
              <span class="hero-stat-num">${deck.known}</span>
              <span class="hero-stat-label">Đã nhớ tốt</span>
            </div>
            <div class="hero-stat-card hero-stat-card--unknown">
              <span class="hero-stat-num">${deck.unknown}</span>
              <span class="hero-stat-label">Cần củng cố</span>
            </div>
          </div>
          <div class="achievement-hero-actions">
            ${deck.unknown > 0 ? `
            <button type="button" class="empty-btn empty-btn--primary" onclick="setFilter('unknown')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Ôn tập ngay ${deck.unknown} từ chưa nhớ
            </button>` : ''}
            <button type="button" class="empty-btn empty-btn--secondary" onclick="setFilter('all'); if (typeof shuffleDeck==='function') shuffleDeck();">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/></svg>
              Xáo trộn & ôn tất cả từ
            </button>
          </div>
        </div>`;
      return;
    }

    if (currentFilter === 'unknown') {
      if (deck.known === deck.total && deck.total > 0) {
        if (typeof launchConfettiFireworks === 'function') launchConfettiFireworks();
        if (typeof playCelebrationChime === 'function') playCelebrationChime();
        container.innerHTML = `
          <div class="achievement-hero-card">
            <div class="achievement-hero-trophy-wrap">
              <span class="achievement-hero-trophy">👑</span>
              <span class="achievement-hero-sparkle-1">✨</span>
            </div>
            <div class="achievement-hero-badge achievement-hero-badge--gold">ĐẠI THÀNH TỰU · MASTERED</div>
            <h2 class="achievement-hero-title">Tuyệt Đỉnh Tinh Thông ${levelLabel}!</h2>
            <p class="achievement-hero-desc">
              Bạn đã nhớ hoàn toàn <strong>${deck.total} / ${deck.total}</strong> từ vựng. Không còn bất kỳ từ nào chưa nhớ!
            </p>
            <div class="achievement-hero-actions">
              <button type="button" class="empty-btn empty-btn--primary" onclick="setFilter('all'); if (typeof shuffleDeck==='function') shuffleDeck();">
                Ôn tập củng cố tất cả từ
              </button>
            </div>
          </div>`;
        return;
      }

      container.innerHTML = `
        <div class="generic-empty-card">
          <h3 class="generic-empty-title">Không còn từ cần ôn tập</h3>
          <p class="generic-empty-desc">
            Tuyệt vời, bạn đã ghi nhớ hết các từ cần củng cố trong danh sách ôn tập hiện tại.
          </p>
          <div class="generic-empty-actions">
            ${deck.unseen > 0 ? `
            <button type="button" class="empty-btn empty-btn--primary" onclick="setFilter('unseen')">
              Học tiếp ${deck.unseen} từ mới
            </button>` : ''}
            <button type="button" class="empty-btn empty-btn--secondary" onclick="setFilter('all')">
              Xem tất cả từ
            </button>
          </div>
        </div>`;
      return;
    }

    if (currentFilter === 'known') {
      container.innerHTML = `
        <div class="generic-empty-card">
          <h3 class="generic-empty-title">Chưa có từ nào đã nhớ</h3>
          <p class="generic-empty-desc">Hãy bắt đầu ôn luyện các từ vựng để đánh dấu những từ bạn đã nhớ tốt.</p>
          <button type="button" class="empty-btn empty-btn--primary" onclick="setFilter('all')">
            Bắt đầu học ngay
          </button>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="generic-empty-card">
        <h3 class="generic-empty-title">Không có từ trong bộ lọc này</h3>
        <p class="generic-empty-desc">Chưa có thẻ từ vựng nào thỏa mãn điều kiện lọc đã chọn.</p>
        <button type="button" class="empty-btn empty-btn--secondary" onclick="setFilter('all')">
          Quay về tất cả từ
        </button>
      </div>`;
  }

  function normalizeSvgViewBox(svgText) {
    if (!svgText || typeof svgText !== 'string') return svgText;
    let normalized = svgText.replace(/viewBox=["']\s*0\s+0\s+240\s*["']/gi, 'viewBox="0 0 240 240"');
    if (!/viewBox=/i.test(normalized) && /width=["']240["']/i.test(normalized) && /height=["']240["']/i.test(normalized)) {
      normalized = normalized.replace(/<svg\b([^>]*)>/i, '<svg$1 viewBox="0 0 240 240">');
    }
    return normalized;
  }

  function syncCardSupportingGroup() {
    const group = document.getElementById('cardSupportingGroup');
    const visualCol = document.getElementById('cardVisualCol');
    const decompWrap = document.getElementById('cardDecompositionWrap');
    if (!group) return;
    const hasVisual = Boolean(showIllustration && visualCol && visualCol.style.display !== 'none');
    const radsRow = document.getElementById('cardRadicalsRow');
    const hasDecomp = Boolean(decompWrap && decompWrap.style.display !== 'none' && radsRow && radsRow.children && radsRow.children.length > 0);
    if (hasVisual || hasDecomp) {
      group.hidden = false;
      group.removeAttribute('hidden');
      group.style.display = 'flex';
      group.classList.toggle('has-both', Boolean(hasVisual && hasDecomp));
      group.classList.toggle('has-only-visual', Boolean(hasVisual && !hasDecomp));
      group.classList.toggle('has-only-decomp', Boolean(!hasVisual && hasDecomp));
    } else {
      group.hidden = true;
      group.setAttribute('hidden', '');
      group.style.display = 'none';
      group.classList.remove('has-both', 'has-only-visual', 'has-only-decomp');
    }
  }
  window.syncCardSupportingGroup = syncCardSupportingGroup;

  function applyContent() {
    if (content) content.className = 'card-content';
    const card = document.getElementById('card');
    if (card) card.classList.remove('is-flipped');
    const decompAcc = document.getElementById('cardDecompAccordion');
    if (decompAcc) { decompAcc.open = false; }
    const relatedAcc = document.getElementById('cardRelatedAccordion');
    if (relatedAcc) { relatedAcc.open = false; }
    const wordMainBlock = document.getElementById('wordMainBlock');
    const cardEmptyState = document.getElementById('cardEmptyState');
    const exBox = document.getElementById('exampleBox');
    if (exBox) exBox.classList.remove('show');
    const soundBtn = document.getElementById('soundBtn');
    if (soundBtn) soundBtn.classList.remove('show');
    const initImgEl = document.getElementById('cardIllustrationImg');
    if (initImgEl) { initImgEl.hidden = true; initImgEl.style.display = 'none'; initImgEl.removeAttribute('src'); }
    const hint = document.getElementById('hint');
    const initSupGroup = document.getElementById('cardSupportingGroup');
    if (initSupGroup) { initSupGroup.hidden = true; initSupGroup.style.display = 'none'; }
    const initDecompWrap = document.getElementById('cardDecompositionWrap');
    if (initDecompWrap) { initDecompWrap.hidden = true; initDecompWrap.style.display = 'none'; }
    const initRelatedWrap = document.getElementById('cardRelatedWrap');
    if (initRelatedWrap) { initRelatedWrap.hidden = true; initRelatedWrap.style.display = 'none'; }

    if (filteredOrder.length === 0) {
      if (wordMainBlock) wordMainBlock.style.display = 'none';
      if (exBox) { exBox.classList.remove('show'); exBox.style.display = 'none'; }
      if (decompAcc) { decompAcc.open = false; decompAcc.style.display = 'none'; decompAcc.hidden = true; }
      if (relatedAcc) { relatedAcc.open = false; relatedAcc.style.display = 'none'; relatedAcc.hidden = true; }
      if (hint) hint.style.display = 'none';
      const emptyHanzi = document.getElementById('hanzi');
      if (emptyHanzi) {
        emptyHanzi.textContent = '';
        emptyHanzi.style.fontSize = '';
        emptyHanzi.removeAttribute('data-length');
        emptyHanzi.className = 'hanzi';
      }
      document.getElementById('pinyin').textContent = '';
      const emptyHv = document.getElementById('hanvietBadge');
      if (emptyHv) { emptyHv.textContent = ''; emptyHv.style.display = 'none'; }
      const emptyPos = document.getElementById('posBadge');
      if (emptyPos) { emptyPos.textContent = ''; emptyPos.hidden = true; emptyPos.style.display = 'none'; }
      const emptyLevel = document.getElementById('levelBadge');
      if (emptyLevel) { emptyLevel.textContent = ''; emptyLevel.hidden = true; emptyLevel.style.display = 'none'; }
      const emptySupporting = document.getElementById('cardSupportingGroup');
      if (emptySupporting) { emptySupporting.hidden = true; emptySupporting.style.display = 'none'; }
      const emptyDecompWrap = document.getElementById('cardDecompositionWrap');
      if (emptyDecompWrap) { emptyDecompWrap.hidden = true; emptyDecompWrap.style.display = 'none'; }
      const emptyRelatedWrap = document.getElementById('cardRelatedWrap');
      if (emptyRelatedWrap) { emptyRelatedWrap.hidden = true; emptyRelatedWrap.style.display = 'none'; emptyRelatedWrap.innerHTML = ''; }
      const meaningEl = document.getElementById('meaning');
      if (meaningEl) { meaningEl.textContent = ''; meaningEl.classList.remove('show'); }
      const emptyRads = document.getElementById('cardRadicalsRow');
      if (emptyRads) { emptyRads.innerHTML = ''; emptyRads.style.display = 'none'; }
      const emptySvg = document.getElementById('cardIllustrationSvg');
      const emptyImg = document.getElementById('cardIllustrationImg');
      if (emptySvg) emptySvg.innerHTML = '';
      if (emptyImg) { emptyImg.src = ''; emptyImg.hidden = true; }
      if (cardEmptyState) {
        cardEmptyState.hidden = false;
        cardEmptyState.style.display = 'block';
        renderEmptyCardState(cardEmptyState);
      }
      if (content) content.classList.add('is-empty');
      const ratingRow = document.getElementById('ratingRow');
      if (ratingRow) { ratingRow.hidden = true; ratingRow.style.display = 'none'; }
      const ratingArea = document.getElementById('ratingArea');
      if (ratingArea) { ratingArea.hidden = true; ratingArea.style.display = 'none'; }
      const navRow = document.getElementById('studyNavRow');
      if (navRow) { navRow.hidden = true; navRow.style.display = 'none'; }
      updateProgress();
      updateCardPosition();
      updateStats();
      setActiveStudyWord(null);
      renderStudyWordList();
      syncRevealControls();
      if (typeof syncSpeechButtons === 'function') syncSpeechButtons();
      return;
    }
    if (wordMainBlock) wordMainBlock.style.display = '';
    if (cardEmptyState) {
      cardEmptyState.hidden = true;
      cardEmptyState.style.display = 'none';
    }
    if (hint) hint.style.display = '';
    if (content) content.classList.remove('is-empty');
    const wIdx = filteredOrder[idx % filteredOrder.length];
    const w = WORDS[wIdx];
    if (!w) return; // deck was swapped out (level change) while this render was pending
    setActiveStudyWord(w);
    if (typeof renderCardRadicals === 'function') renderCardRadicals(w);
    if (typeof renderCardRelated === 'function') renderCardRelated(w);
    renderStudyWordList();
    const hanziEl = document.getElementById('hanzi');
    if (hanziEl) {
      renderHanziWithClarifier(hanziEl, w.hanzi);
      applyHanziLengthFit(hanziEl, w.hanzi);
    }
    document.getElementById('pinyin').textContent = showPinyin ? w.pinyin : '';
    const hvBadge = document.getElementById('hanvietBadge');
    if (hvBadge) {
      let hv = (typeof getWordHanViet === 'function' ? getWordHanViet(w) : '') || w.hanviet;
      if (hv) {
        hv = hv.replace(/[（\(].*?[）\)]/g, '').replace(/\s+/g, ' ').trim();
      }
      const cleanMeaning = String(w.meaning || '').toLowerCase().trim();
      const cleanHv = String(hv || '').toLowerCase().trim();
      const isDuplicateOfMeaning = cleanHv && (
        cleanMeaning === cleanHv ||
        cleanMeaning.split(/[,;\/]/)[0].trim() === cleanHv ||
        cleanMeaning.startsWith(cleanHv + ',') ||
        cleanMeaning.startsWith(cleanHv + ' ')
      );
      if (hv && !isDuplicateOfMeaning) {
        hvBadge.textContent = hv;
        hvBadge.title = `Âm Hán - Việt: ${hv}`;
        hvBadge.hidden = false;
        hvBadge.style.display = showHanViet ? 'inline-flex' : 'none';
      } else {
        hvBadge.textContent = '';
        hvBadge.hidden = true;
        hvBadge.style.display = 'none';
      }
    }

    // Cập nhật Part of Speech (Từ loại)
    const pos = (typeof getWordPartOfSpeech === 'function') ? getWordPartOfSpeech(w) : null;
    const posBadge = document.getElementById('posBadge');
    if (posBadge) {
      if (pos && pos.label) {
        posBadge.textContent = pos.label;
        posBadge.className = `pos-badge pos-badge--${pos.code || 'noun'}`;
        posBadge.title = `Từ loại: ${pos.full || pos.label}`;
        posBadge.hidden = false;
        posBadge.style.display = 'inline-flex';
      } else {
        posBadge.textContent = '';
        posBadge.hidden = true;
        posBadge.style.display = 'none';
      }
    }

    // Cấp độ HSK không hiển thị trên thẻ flashcard để tránh dư thừa với thanh tiêu đề
    const levelBadge = document.getElementById('levelBadge');
    if (levelBadge) {
      levelBadge.textContent = '';
      levelBadge.hidden = true;
      levelBadge.style.display = 'none';
    }

    const m = document.getElementById('meaning');
    m.textContent = w.meaning;
    m.classList.remove('show');
    const hasExample = Boolean(w.example_zh || w.example_py || w.example_vi);
    const exampleBox = document.getElementById('exampleBox');
    if (exampleBox) exampleBox.hidden = !hasExample;
    document.getElementById('exZh').innerHTML = w.example_zh;
    document.getElementById('exPy').innerHTML = w.example_py;
    document.getElementById('exVi').innerHTML = w.example_vi;

    // Cập nhật hình ảnh minh họa trực quan (Visual Mnemonic Anchor)
    const visualCol = document.getElementById('cardVisualCol');
    const imgEl = document.getElementById('cardIllustrationImg');
    const svgEl = document.getElementById('cardIllustrationSvg');
    const frameEl = document.getElementById('cardIllustrationFrame');

    if (imgEl && svgEl && typeof getWordIllustration === 'function' && showIllustration) {
      const illu = getWordIllustration(w);
      if (illu && !illu.isFallback && (illu.src || (illu.type === 'svg' && illu.svg))) {
        if (visualCol) {
          visualCol.hidden = false;
          visualCol.removeAttribute('hidden');
          visualCol.style.display = 'flex';
        }
        if (frameEl) frameEl.title = 'Minh họa gợi hình';

        if (illu.type === 'svg' && illu.svg) {
          svgEl.innerHTML = normalizeSvgViewBox(illu.svg);
          svgEl.hidden = false;
          svgEl.removeAttribute('hidden');
          svgEl.style.display = 'flex';
          imgEl.hidden = true;
          imgEl.setAttribute('hidden', '');
          imgEl.style.display = 'none';
          imgEl.removeAttribute('src');
          if (frameEl) frameEl.classList.remove('is-loading');
          syncCardSupportingGroup();
        } else if (illu.src || w.hanzi) {
          const cachedSvg = (typeof SynapseSvgCache !== 'undefined')
            ? (SynapseSvgCache.get(illu.src) || (w.hanzi && SynapseSvgCache.get(w.hanzi)))
            : null;
          if (cachedSvg) {
            // INSTANT RENDER (0ms latency from RAM cache)
            svgEl.innerHTML = normalizeSvgViewBox(cachedSvg);
            svgEl.hidden = false;
            svgEl.removeAttribute('hidden');
            svgEl.style.display = 'flex';
            imgEl.hidden = true;
            imgEl.setAttribute('hidden', '');
            imgEl.style.display = 'none';
            imgEl.removeAttribute('src');
            if (frameEl) frameEl.classList.remove('is-loading');
            syncCardSupportingGroup();
          } else {
            // Cache miss: show smooth shimmer without layout shift
            const curWord = w;
            if (frameEl) frameEl.classList.add('is-loading');

            if (typeof preloadIllustration === 'function') {
              preloadIllustration(illu.src || w, 'high').then(svgText => {
                if (typeof activeStudyWord !== 'undefined' && activeStudyWord && (activeStudyWord === curWord || activeStudyWord.hanzi === curWord.hanzi)) {
                  const resolvedSvg = svgText || (typeof SynapseSvgCache !== 'undefined' && (SynapseSvgCache.get(illu.src) || (curWord.hanzi && SynapseSvgCache.get(curWord.hanzi))));
                  if (resolvedSvg) {
                    svgEl.innerHTML = normalizeSvgViewBox(resolvedSvg);
                    svgEl.hidden = false;
                    svgEl.removeAttribute('hidden');
                    svgEl.style.display = 'flex';
                    imgEl.hidden = true;
                    imgEl.setAttribute('hidden', '');
                    imgEl.style.display = 'none';
                    imgEl.removeAttribute('src');
                  } else {
                    imgEl.onerror = () => {
                      if (visualCol) {
                        visualCol.style.display = 'none';
                        visualCol.hidden = true;
                        visualCol.setAttribute('hidden', '');
                      }
                      if (svgEl) { svgEl.hidden = true; svgEl.style.display = 'none'; svgEl.innerHTML = ''; }
                      if (imgEl) { imgEl.hidden = true; imgEl.style.display = 'none'; imgEl.removeAttribute('src'); }
                      syncCardSupportingGroup();
                    };
                    imgEl.onload = () => {
                      imgEl.hidden = false;
                      imgEl.removeAttribute('hidden');
                      imgEl.style.display = 'block';
                      svgEl.hidden = true;
                      svgEl.setAttribute('hidden', '');
                      svgEl.style.display = 'none';
                      svgEl.innerHTML = '';
                      if (visualCol) {
                        visualCol.hidden = false;
                        visualCol.removeAttribute('hidden');
                        visualCol.style.display = 'flex';
                      }
                      syncCardSupportingGroup();
                    };
                    imgEl.src = illu.src;
                    imgEl.alt = 'Minh họa gợi hình';
                  }
                  if (frameEl) frameEl.classList.remove('is-loading');
                  syncCardSupportingGroup();
                }
              }).catch(() => {
                imgEl.onerror = () => {
                  if (visualCol) {
                    visualCol.style.display = 'none';
                    visualCol.hidden = true;
                    visualCol.setAttribute('hidden', '');
                  }
                  syncCardSupportingGroup();
                };
                imgEl.onload = () => {
                  imgEl.hidden = false;
                  imgEl.removeAttribute('hidden');
                  imgEl.style.display = 'block';
                  svgEl.hidden = true;
                  svgEl.setAttribute('hidden', '');
                  svgEl.style.display = 'none';
                  svgEl.innerHTML = '';
                  if (visualCol) {
                    visualCol.hidden = false;
                    visualCol.removeAttribute('hidden');
                    visualCol.style.display = 'flex';
                  }
                  syncCardSupportingGroup();
                };
                imgEl.src = illu.src;
                imgEl.alt = 'Minh họa gợi hình';
                if (frameEl) frameEl.classList.remove('is-loading');
                syncCardSupportingGroup();
              });
            } else {
              imgEl.onerror = () => {
                if (visualCol) {
                  visualCol.style.display = 'none';
                  visualCol.hidden = true;
                  visualCol.setAttribute('hidden', '');
                }
                syncCardSupportingGroup();
              };
              imgEl.onload = () => {
                imgEl.hidden = false;
                imgEl.removeAttribute('hidden');
                imgEl.style.display = 'block';
                svgEl.hidden = true;
                svgEl.setAttribute('hidden', '');
                svgEl.style.display = 'none';
                svgEl.innerHTML = '';
                if (visualCol) {
                  visualCol.hidden = false;
                  visualCol.removeAttribute('hidden');
                  visualCol.style.display = 'flex';
                }
                syncCardSupportingGroup();
              };
              imgEl.src = illu.src;
              imgEl.alt = 'Minh họa gợi hình';
              if (frameEl) frameEl.classList.remove('is-loading');
              syncCardSupportingGroup();
            }
          }
        }
      } else {
        if (visualCol) {
          visualCol.style.display = 'none';
          visualCol.hidden = true;
          visualCol.setAttribute('hidden', '');
        }
        if (svgEl) { svgEl.hidden = true; svgEl.style.display = 'none'; svgEl.innerHTML = ''; }
        if (imgEl) { imgEl.hidden = true; imgEl.style.display = 'none'; imgEl.removeAttribute('src'); }
      }
    } else if (visualCol) {
      visualCol.style.display = 'none';
      visualCol.hidden = true;
      visualCol.setAttribute('hidden', '');
      if (svgEl) { svgEl.hidden = true; svgEl.style.display = 'none'; svgEl.innerHTML = ''; }
      if (imgEl) { imgEl.hidden = true; imgEl.style.display = 'none'; imgEl.removeAttribute('src'); }
    }
    syncCardSupportingGroup();

    // Predictive sliding-window preloader: prefetch next 15 cards and previous 5 cards in background (if enabled)
    if (showIllustration && typeof preloadNearbyIllustrations === 'function' && Array.isArray(WORDS) && Array.isArray(filteredOrder) && filteredOrder.length > 0) {
      preloadNearbyIllustrations(WORDS, filteredOrder, idx % filteredOrder.length, 15);
    }

    document.getElementById('hint').textContent = getCardHintText(false);
    updateCardMoreMenuState();
    updateProgress();
    updateCardPosition();
    updateStats();
    syncRevealControls();
    if (typeof syncSpeechButtons === 'function') syncSpeechButtons();
    if (animate && content && !prefersReduced) {
      if (animate === 'next') content.classList.add('enter-right');
      else if (animate === 'prev') content.classList.add('enter-left');
      else content.classList.add('enter-fade');
    }
  }

  if (!animate || !content || prefersReduced) {
    applyContent();
    return;
  }

  content.className = 'card-content';
  if (animate === 'next') content.classList.add('exit-left');
  else if (animate === 'prev') content.classList.add('exit-right');
  else content.classList.add('exit-fade');

  transitionTimer = setTimeout(() => {
    transitionTimer = null;
    applyContent();
  }, 150);
}
