/**
 * assets/js/graded-reading.js
 * 汉字思维 (Hanzi Mind) Graded Reading (HSK Reading Stories) Core Engine
 * Closed-Loop Learning: Reading -> Click-to-Inspect -> SRS Integration -> Review
 */

const GradedReading = (function() {
  let manifest = [];
  let manifestLoaded = false;
  let activeStory = null;
  let storyCache = {};
  let currentLevelFilter = 'all';
  let currentCategoryFilter = 'all';
  let currentSort = 'default';
  let searchQuery = '';
  let activePopover = null;
  let quizState = {};
  let currentlyPlayingSentenceId = null;

  // Display Preferences
  let prefs = {
    showPinyin: true,
    showTranslation: true,
    showSrsHighlights: true
  };

  try {
    const saved = localStorage.getItem('synapse_graded_prefs_v1');
    if (saved) prefs = Object.assign(prefs, JSON.parse(saved));
  } catch (e) {}

  function savePrefs() {
    try {
      localStorage.setItem('synapse_graded_prefs_v1', JSON.stringify(prefs));
    } catch (e) {}
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Audio Speech Helpers
  function speakSentence(text, sentId) {
    if (!text) return;
    const isPlaying = currentlyPlayingSentenceId === sentId;
    if (typeof stopSpeaking === 'function') stopSpeaking();
    if (isPlaying) {
      currentlyPlayingSentenceId = null;
      updateSentenceAudioUI();
      return;
    }
    currentlyPlayingSentenceId = sentId;
    updateSentenceAudioUI();

    const rate = typeof exampleSpeechSpeed !== 'undefined' ? exampleSpeechSpeed : 0.8;
    if (typeof speakChinese === 'function') {
      speakChinese(text, {
        rate,
        onEnd: () => {
          currentlyPlayingSentenceId = null;
          updateSentenceAudioUI();
        },
        onError: () => {
          currentlyPlayingSentenceId = null;
          updateSentenceAudioUI();
        }
      });
    }
  }

  function speakFullStory() {
    if (!activeStory || !activeStory.sentences) return;
    const isPlaying = currentlyPlayingSentenceId === 'full-story';
    if (typeof stopSpeaking === 'function') stopSpeaking();
    if (isPlaying) {
      currentlyPlayingSentenceId = null;
      updateSentenceAudioUI();
      return;
    }
    currentlyPlayingSentenceId = 'full-story';
    updateSentenceAudioUI();

    const fullZh = activeStory.sentences.map(s => s.zh || s.text || '').filter(Boolean).join(' ');
    const rate = typeof exampleSpeechSpeed !== 'undefined' ? exampleSpeechSpeed : 0.8;
    if (typeof speakChinese === 'function') {
      speakChinese(fullZh, {
        rate,
        onEnd: () => {
          currentlyPlayingSentenceId = null;
          updateSentenceAudioUI();
        },
        onError: () => {
          currentlyPlayingSentenceId = null;
          updateSentenceAudioUI();
        }
      });
    }
  }

  function updateSentenceAudioUI() {
    document.querySelectorAll('.sentence-audio-btn').forEach(btn => {
      const id = btn.dataset.sentenceId;
      const active = currentlyPlayingSentenceId === id;
      btn.classList.toggle('playing', active);
      btn.textContent = active ? '⏹ Dừng' : '🔊 Nghe';
    });
    const storyBtn = document.getElementById('playFullStoryBtn');
    if (storyBtn) {
      const active = currentlyPlayingSentenceId === 'full-story';
      storyBtn.classList.toggle('active', active);
      storyBtn.innerHTML = active ? '<span>⏹ Dừng đọc</span>' : '<span>🔊 Đọc toàn bài</span>';
    }
  }

  // Read Stories Tracking
  const READ_STORIES_STORAGE_KEY = 'synapse_graded_read_stories_v1';
  let readStories = {};

  try {
    const savedRead = localStorage.getItem(READ_STORIES_STORAGE_KEY);
    if (savedRead) readStories = JSON.parse(savedRead) || {};
  } catch (e) {
    readStories = {};
  }

  function saveReadStories() {
    try {
      localStorage.setItem(READ_STORIES_STORAGE_KEY, JSON.stringify(readStories));
    } catch (e) {}
  }

  function isStoryRead(storyId) {
    return Boolean(readStories[storyId]);
  }

  function markStoryAsRead(storyId) {
    if (!storyId) return;
    readStories[storyId] = {
      readAt: new Date().toISOString()
    };
    saveReadStories();
  }

  function unmarkStoryAsRead(storyId) {
    if (!storyId) return;
    delete readStories[storyId];
    saveReadStories();
  }

  function toggleStoryRead(storyId, event) {
    if (event) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }
    if (!storyId) return;
    if (isStoryRead(storyId)) {
      unmarkStoryAsRead(storyId);
    } else {
      markStoryAsRead(storyId);
    }

    if (!activeStory) {
      renderHub();
    } else {
      updateStoryReadUI();
    }
  }

  function toggleCurrentStoryRead() {
    if (!activeStory) return;
    toggleStoryRead(activeStory.id);
  }

  function updateStoryReadUI() {
    if (!activeStory) return;
    const isRead = isStoryRead(activeStory.id);

    const navBtn = document.getElementById('toggleReadStoryBtn');
    if (navBtn) {
      navBtn.classList.toggle('active', isRead);
      navBtn.classList.toggle('read-active', isRead);
      navBtn.innerHTML = isRead
        ? `<span>✓ Đã đọc</span>`
        : `<span>○ Đã đọc</span>`;
      navBtn.title = isRead ? 'Đã đọc (Bấm để hủy)' : 'Đánh dấu đã đọc bài này';
    }

    const compCard = document.getElementById('storyCompletionCard');
    if (compCard) {
      compCard.classList.toggle('completed', isRead);
      const icon = compCard.querySelector('.completion-icon-box');
      if (icon) icon.textContent = isRead ? '🎉' : '📖';
      const heading = compCard.querySelector('.completion-heading');
      if (heading) heading.textContent = isRead ? 'Đã hoàn thành bài đọc!' : 'Hoàn thành bài đọc này?';
      const sub = compCard.querySelector('.completion-sub');
      if (sub) sub.textContent = isRead ? 'Bài viết đã được lưu vào danh sách Đã đọc của bạn.' : 'Đánh dấu đã đọc để lưu tiến trình và theo dõi lộ trình học tập.';
      const ctaBtn = compCard.querySelector('.graded-completion-btn');
      if (ctaBtn) {
        ctaBtn.classList.toggle('active', isRead);
        ctaBtn.textContent = isRead ? '✓ Đã hoàn thành (Bấm để hủy)' : '✓ Đã đọc (Lưu tiến trình)';
      }
    }
  }

  /**
   * Determine user's SRS memory state for a given token
   * Returns: 'mastered' | 'learning' | 'new'
   */
  function getTokenSrsStatus(token) {
    if (!token || !token.word_id) return 'none';
    const match = token.word_id.match(/^hsk(\d+)_(\d+)$/i);
    if (!match) return 'none';
    const level = match[1];
    const rawId = match[2];

    try {
      if (typeof readSrsRecord === 'function') {
        const record = readSrsRecord(level);
        if (record && record.cards) {
          const card = record.cards[String(rawId)];
          if (card) {
            if (card.state === 2 || card.status === 'known' || (card.reps && card.reps >= 2)) {
              return 'mastered';
            }
            if (card.state === 1 || card.state === 3 || (card.reps && card.reps > 0)) {
              return 'learning';
            }
          }
        }
      }
    } catch (e) {
      console.warn('SRS lookup error:', e);
    }
    return 'new';
  }

  /**
   * Add a token word directly into the user's FSRS queue for today
   */
  function addTokenToSrs(token) {
    if (!token) return false;
    if (!token.word_id) {
      const lvl = token.hsk || (activeStory ? parseInt(activeStory.level.replace(/\D/g, '') || '1', 10) : 1);
      token.word_id = `hsk${lvl}_${token.text.charCodeAt(0) + 10000}`;
    }
    const match = token.word_id.match(/^hsk(\d+)_([a-z0-9]+)$/i) || token.word_id.match(/^char_([a-z0-9]+)$/i);
    if (!match) return false;
    const level = match[1].length <= 2 ? match[1] : String(token.hsk || 1);
    const rawId = match[2] || match[1];

    try {
      if (typeof readSrsRecord === 'function' && typeof saveSrsRecord === 'function') {
        const record = readSrsRecord(level) || { schemaVersion: 3, cards: {} };
        if (!record.cards) record.cards = {};
        
        let card = record.cards[String(rawId)];
        if (!card) {
          card = (typeof SRS !== 'undefined' && SRS.createNewCard) ? SRS.createNewCard() : { state: 0, reps: 0 };
        }
        card.state = 1; // Learning state
        card.status = 'unknown';
        card.due = new Date().toISOString();
        card.last_rating = 'again';
        
        record.cards[String(rawId)] = card;
        saveSrsRecord(level, record.cards, false);

        // Update active in-memory SRS cache if matching current selected level
        if (typeof currentLevel !== 'undefined' && String(currentLevel) === String(level)) {
          if (typeof srsCards !== 'undefined' && srsCards) {
            srsCards[String(rawId)] = card;
          }
        }

        // Live update all matching tokens on screen to learning status
        document.querySelectorAll(`[data-word-id="${token.word_id}"]`).forEach(el => {
          el.classList.remove('token-new');
          el.classList.add('token-learning');
        });

        return true;
      }
    } catch (e) {
      console.error('Failed to add token to SRS:', e);
    }
    return false;
  }

  /**
   * Load manifest of all available stories
   */
  async function ensureManifestLoaded() {
    if (manifestLoaded && manifest.length) return manifest;
    try {
      const res = await fetch('database/readings/manifest.json?v=' + Date.now());
      if (!res.ok) throw new Error('Không thể tải danh sách bài đọc.');
      manifest = await res.json();
      manifestLoaded = true;
      return manifest;
    } catch (e) {
      console.error('GradedReading manifest error:', e);
      return [];
    }
  }

  /**
   * Load single story data
   */
  async function loadStory(storyId) {
    if (storyCache[storyId]) return storyCache[storyId];
    const item = manifest.find(m => m.id === storyId);
    if (!item) throw new Error('Không tìm thấy bài đọc: ' + storyId);
    const storyUrl = item.file || item.path || `database/readings/${(item.level || '').toLowerCase()}/${item.id}.json`;
    const res = await fetch(storyUrl);
    if (!res.ok) throw new Error('Không thể tải nội dung bài: ' + storyUrl);
    const data = await res.json();
    storyCache[storyId] = data;
    return data;
  }

  let escapeListenerBound = false;

  /**
   * Main entry point
   */
  async function init() {
    const mount = document.getElementById('screenGradedReading');
    if (!mount) return;
    document.body.classList.add('graded-reading-active');

    if (!escapeListenerBound) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (activePopover) {
            closePopover();
          } else if (activeStory) {
            goBackToHub();
          }
        }
      });
      escapeListenerBound = true;
    }

    // Check URL parameter for direct story link
    const params = new URLSearchParams(window.location.search);
    const storyParam = params.get('story');

    await ensureManifestLoaded();

    if (storyParam) {
      await openStory(storyParam, false);
    } else {
      renderHub();
    }
  }

  /**
   * Return back to reading hub and sync URL
   */
  function goBackToHub() {
    activeStory = null;
    closePopover();
    document.body.classList.remove('graded-story-active');
    if (typeof SpaRouter !== 'undefined') {
      SpaRouter.pushView({ view: 'tab', tab: 'gradedReading' }, `${window.location.pathname}?tab=gradedReading`);
    } else {
      window.history.pushState({}, '', `${window.location.pathname}?tab=gradedReading`);
    }
    renderHub();
  }

  /**
   * Render Reading Hub
   */
  function renderHub() {
    activeStory = null;
    closePopover();
    document.body.classList.remove('graded-story-active');
    const mount = document.getElementById('screenGradedReading');
    if (!mount) return;

    // Apply preference classes
    document.body.classList.remove('graded-pinyin-hidden', 'graded-translation-hidden');

    const readCount = manifest.filter(m => isStoryRead(m.id)).length;
    const progressPercent = manifest.length ? Math.round((readCount / manifest.length) * 100) : 0;

    // Available categories from manifest
    const categoriesSet = new Set();
    manifest.forEach(m => {
      const cat = (m.topic_vi || '').split('&')[0].trim();
      if (cat) categoriesSet.add(cat);
    });
    const categories = ['all', ...Array.from(categoriesSet).sort()];

    let filtered = manifest.filter(m => {
      // 1. Level filter
      if (currentLevelFilter === 'read') {
        if (!isStoryRead(m.id)) return false;
      } else if (currentLevelFilter !== 'all') {
        if (m.level.toLowerCase() !== currentLevelFilter.toLowerCase()) return false;
      }
      // 2. Category filter
      if (currentCategoryFilter !== 'all') {
        const cat = (m.topic_vi || '').split('&')[0].trim();
        if (cat !== currentCategoryFilter) return false;
      }
      // 3. Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleZh = (m.title && m.title.zh ? m.title.zh : '').toLowerCase();
        const titleVi = (m.title && m.title.vi ? m.title.vi : '').toLowerCase();
        const descVi = (m.description_vi || '').toLowerCase();
        const topicVi = (m.topic_vi || '').toLowerCase();
        if (!titleZh.includes(q) && !titleVi.includes(q) && !descVi.includes(q) && !topicVi.includes(q)) {
          return false;
        }
      }
      return true;
    });

    // 4. Sort
    if (currentSort === 'time_asc') {
      filtered.sort((a, b) => (a.estimatedMinutes || 3) - (b.estimatedMinutes || 3));
    } else if (currentSort === 'time_desc') {
      filtered.sort((a, b) => (b.estimatedMinutes || 3) - (a.estimatedMinutes || 3));
    } else if (currentSort === 'title') {
      filtered.sort((a, b) => (a.title.vi || '').localeCompare(b.title.vi || ''));
    }

    const levels = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'HSK7', 'HSK8', 'HSK9'];
    const levelCounts = {};
    levels.forEach(lvl => {
      levelCounts[lvl] = manifest.filter(m => m.level.toUpperCase() === lvl).length;
    });

    const PAGE_SIZE = 30;
    const initialStories = filtered.slice(0, PAGE_SIZE);

    mount.innerHTML = `
      <div class="graded-reading-container">
        <!-- Back to Vocab Hub Bar -->
        <div style="display: flex; align-items: center; justify-content: flex-start; margin-bottom: 16px;">
          <button type="button" class="graded-back-btn" onclick="setPrimaryTab('vocab')" title="Quay lại Hub Từ vựng">
            ← Quay lại Hub Từ vựng
          </button>
        </div>

        <!-- Hero Header -->
        <header class="graded-hub-hero">
          <div class="graded-hub-badge">📚 Graded Reading</div>
          <h1 class="graded-hub-title">汉字思维 · Graded Reading</h1>
          <p class="graded-hub-subtitle">
            Luyện đọc hiểu phân cấp theo ngữ cảnh thực tế · Vòng lặp học từ khép kín · Nhận diện vốn từ SRS cá nhân
          </p>
          <div class="graded-hub-progress-wrap">
            <div class="graded-hub-progress-bar">
              <div class="graded-hub-progress-fill" style="width: ${progressPercent}%;"></div>
            </div>
            <div class="graded-hub-progress-meta">
              <span>Tiến độ đọc: <strong>${readCount}/${manifest.length}</strong> bài (${progressPercent}%)</span>
            </div>
          </div>
        </header>

        <!-- Search and Sort Toolbar -->
        <div class="graded-search-toolbar" style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
          <div style="flex: 1; min-width: 240px; position: relative;">
            <input type="search" id="gradedSearchInput" class="graded-search-input"
              placeholder="🔍 Tìm bài đọc theo tiêu đề, chủ đề..."
              value="${escapeAttr(searchQuery)}"
              oninput="GradedReading.handleSearchInput(this.value)"
              style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--graded-border); background: var(--graded-card-bg); color: var(--graded-text-primary); font-size: 0.9rem;"
              aria-label="Tìm kiếm bài đọc">
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <select id="gradedCategorySelect" onchange="GradedReading.setCategoryFilter(this.value)"
              style="padding: 9px 12px; border-radius: 10px; border: 1px solid var(--graded-border); background: var(--graded-card-bg); color: var(--graded-text-primary); font-size: 0.85rem;"
              aria-label="Lọc theo chủ đề">
              <option value="all" ${currentCategoryFilter === 'all' ? 'selected' : ''}>Mọi chủ đề</option>
              ${categories.filter(c => c !== 'all').map(c => `
                <option value="${escapeAttr(c)}" ${currentCategoryFilter === c ? 'selected' : ''}>${c}</option>
              `).join('')}
            </select>
            <select id="gradedSortSelect" onchange="GradedReading.setSort(this.value)"
              style="padding: 9px 12px; border-radius: 10px; border: 1px solid var(--graded-border); background: var(--graded-card-bg); color: var(--graded-text-primary); font-size: 0.85rem;"
              aria-label="Sắp xếp bài đọc">
              <option value="default" ${currentSort === 'default' ? 'selected' : ''}>Mặc định</option>
              <option value="time_asc" ${currentSort === 'time_asc' ? 'selected' : ''}>Thời gian: Ngắn nhất</option>
              <option value="time_desc" ${currentSort === 'time_desc' ? 'selected' : ''}>Thời gian: Dài nhất</option>
              <option value="title" ${currentSort === 'title' ? 'selected' : ''}>Tên bài (A-Z)</option>
            </select>
          </div>
        </div>

        <!-- Filter Pills -->
        <nav class="graded-hub-filters" aria-label="Bộ lọc cấp độ HSK">
          <button type="button" class="graded-filter-pill ${currentLevelFilter === 'all' ? 'active' : ''}" onclick="GradedReading.setLevelFilter('all')">
            Tất cả (${manifest.length})
          </button>
          <button type="button" class="graded-filter-pill ${currentLevelFilter === 'read' ? 'active' : ''} ${readCount === 0 ? 'disabled' : ''}" onclick="GradedReading.setLevelFilter('read')" title="Xem bài đã đọc">
            ✓ Đã đọc (${readCount})
          </button>
          ${levels.map(lvl => {
            const count = levelCounts[lvl] || 0;
            const lvlDisplay = lvl.replace('HSK', 'HSK ');
            const lvlReadCount = manifest.filter(m => m.level.toUpperCase() === lvl && isStoryRead(m.id)).length;
            if (count > 0) {
              const readTag = lvlReadCount > 0 ? ` · ${lvlReadCount}✓` : '';
              return `
                <button type="button" class="graded-filter-pill ${currentLevelFilter === lvl ? 'active' : ''}" onclick="GradedReading.setLevelFilter('${lvl}')">
                  ${lvlDisplay} (${count} bài${readTag})
                </button>
              `;
            } else {
              return `
                <button type="button" class="graded-filter-pill disabled" title="Đang cập nhật thêm bài đọc">
                  ${lvlDisplay} (Sắp có)
                </button>
              `;
            }
          }).join('')}
        </nav>

        <div style="font-size: 0.85rem; color: var(--graded-text-secondary); margin-bottom: 12px;">
          Hiển thị <strong>${filtered.length}</strong> bài đọc phù hợp
        </div>

        <!-- Stories Grid -->
        <div class="graded-stories-grid" id="gradedStoriesGrid">
          ${filtered.length === 0 ? `
            <div class="graded-empty-state">
              <span style="font-size: 2.2rem;">📖</span>
              <div style="font-weight: 700; font-size: 1.05rem; margin-top: 10px; color: var(--graded-text-primary);">
                ${currentLevelFilter === 'read' ? 'Bạn chưa đánh dấu bài đọc nào' : 'Không có bài đọc nào phù hợp'}
              </div>
              <p style="color: var(--graded-text-secondary); font-size: 0.88rem; max-width: 480px; margin: 6px auto 16px;">
                ${currentLevelFilter === 'read' ? 'Hãy mở một bài đọc và bấm "Đánh dấu đã đọc" sau khi đọc xong, hoặc bấm nút tích trên thẻ bài đọc.' : 'Vui lòng chọn cấp độ hoặc từ khóa khác.'}
              </p>
              <button type="button" class="graded-filter-pill active" onclick="GradedReading.resetFilters()">Xem tất cả bài đọc</button>
            </div>
          ` : initialStories.map(story => renderStoryCardHtml(story)).join('')}
        </div>

        ${filtered.length > PAGE_SIZE ? `
          <div id="gradedStoriesLoadMore" style="text-align: center; padding: 24px 0;">
            <button type="button" class="graded-filter-pill" onclick="GradedReading.loadMoreStories()" style="padding: 10px 24px; font-weight: 700; font-size: 0.95rem;">
              Xem thêm bài đọc (${filtered.length - PAGE_SIZE} bài còn lại) ↓
            </button>
          </div>
        ` : ''}
      </div>
    `;

    // Hook auto load-more via IntersectionObserver
    if (filtered.length > PAGE_SIZE && 'IntersectionObserver' in window) {
      const trigger = document.getElementById('gradedStoriesLoadMore');
      if (trigger) {
        const obs = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            obs.disconnect();
            loadMoreStories();
          }
        }, { rootMargin: '300px' });
        obs.observe(trigger);
      }
    }
  }

  let hubRenderedLimit = 30;
  function loadMoreStories() {
    const grid = document.getElementById('gradedStoriesGrid');
    if (!grid) return;
    const filtered = getFilteredManifest();
    const nextLimit = Math.min(hubRenderedLimit + 30, filtered.length);
    const slice = filtered.slice(hubRenderedLimit, nextLimit);
    hubRenderedLimit = nextLimit;

    slice.forEach(story => {
      const wrap = document.createElement('div');
      wrap.innerHTML = renderStoryCardHtml(story);
      if (wrap.firstElementChild) grid.appendChild(wrap.firstElementChild);
    });

    const trigger = document.getElementById('gradedStoriesLoadMore');
    if (trigger) {
      if (hubRenderedLimit >= filtered.length) {
        trigger.remove();
      } else {
        trigger.innerHTML = `
          <button type="button" class="graded-filter-pill" onclick="GradedReading.loadMoreStories()" style="padding: 10px 24px; font-weight: 700; font-size: 0.95rem;">
            Xem thêm bài đọc (${filtered.length - hubRenderedLimit} bài còn lại) ↓
          </button>
        `;
      }
    }
  }

  function getFilteredManifest() {
    return manifest.filter(m => {
      if (currentLevelFilter === 'read') {
        if (!isStoryRead(m.id)) return false;
      } else if (currentLevelFilter !== 'all') {
        if (m.level.toLowerCase() !== currentLevelFilter.toLowerCase()) return false;
      }
      if (currentCategoryFilter !== 'all') {
        const cat = (m.topic_vi || '').split('&')[0].trim();
        if (cat !== currentCategoryFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleZh = (m.title && m.title.zh ? m.title.zh : '').toLowerCase();
        const titleVi = (m.title && m.title.vi ? m.title.vi : '').toLowerCase();
        const descVi = (m.description_vi || '').toLowerCase();
        const topicVi = (m.topic_vi || '').toLowerCase();
        if (!titleZh.includes(q) && !titleVi.includes(q) && !descVi.includes(q) && !topicVi.includes(q)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (currentSort === 'time_asc') return (a.estimatedMinutes || 3) - (b.estimatedMinutes || 3);
      if (currentSort === 'time_desc') return (b.estimatedMinutes || 3) - (a.estimatedMinutes || 3);
      if (currentSort === 'title') return (a.title.vi || '').localeCompare(b.title.vi || '');
      return 0;
    });
  }

  function renderStoryCardHtml(story) {
    const isRead = isStoryRead(story.id);
    const lvl = (story.level || 'hsk1').toLowerCase();
    const estMin = story.estimatedMinutes || 3;
    const sentCount = story.sentence_count ?? story.sentences_count ?? 5;
    const wordCount = story.spotlight_count ?? story.words_count ?? 15;
    const zhTitle = story.title && story.title.zh ? story.title.zh : '';
    const viTitle = story.title && story.title.vi ? story.title.vi : '';
    const descVi = story.description_vi || '';
    const topicVi = story.topic_vi || '';

    return `
    <article class="graded-story-card ${isRead ? 'is-read' : ''}" onclick="GradedReading.openStory('${story.id}')" tabindex="0" role="button" aria-label="Đọc bài ${escapeHtml(viTitle)}">
      <div class="graded-card-main">
        <div class="graded-card-header">
          <div class="graded-card-header-left">
            <span class="graded-card-level-badge lvl-${lvl}">${escapeHtml(story.level)}</span>
            <span class="graded-card-topic" title="${escapeHtml(topicVi)}">${escapeHtml(topicVi)}</span>
          </div>
          <div class="graded-card-header-right">
            <button type="button" class="graded-card-mark-toggle ${isRead ? 'read' : ''}" onclick="GradedReading.toggleStoryRead('${story.id}', event)" title="${isRead ? 'Đã đọc (Bấm để hủy)' : 'Đánh dấu đã đọc'}" aria-label="${isRead ? 'Đã đọc (Bấm để hủy)' : 'Đánh dấu đã đọc'}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="${isRead ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </button>
          </div>
        </div>
        <div class="graded-card-body">
          <h2 class="graded-card-zh-title" title="${escapeHtml(zhTitle)}">
            <span>${escapeHtml(zhTitle)}</span>
          </h2>
          <div class="graded-card-vi-title" title="${escapeHtml(viTitle)}">${escapeHtml(viTitle)}</div>
          <p class="graded-card-desc" title="${escapeHtml(descVi)}">${escapeHtml(descVi)}</p>
        </div>
      </div>
      <footer class="graded-card-footer">
        <div class="graded-card-meta">
          <span>${sentCount} câu</span>
          <span class="graded-meta-divider">·</span>
          <span>${wordCount} từ</span>
          <span class="graded-meta-divider">·</span>
          <span>⏱️ ${estMin}m</span>
        </div>
        <div class="graded-card-arrow" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>
      </footer>
    </article>
    `;
  }

  /**
   * Open and render interactive story reader
   */
  async function openStory(storyId, updateUrl = true) {
    const mount = document.getElementById('screenGradedReading');
    if (!mount) return;

    mount.innerHTML = `
      <div class="graded-reading-container" style="text-align: center; padding: 60px 0;">
        <div style="font-size: 1.5rem; margin-bottom: 12px;">📖</div>
        <div style="color: var(--text-secondary);">Đang tải bài đọc...</div>
      </div>
    `;

    try {
      const story = await loadStory(storyId);
      activeStory = story;
      quizState = {};

      if (updateUrl && typeof SpaRouter !== 'undefined') {
        SpaRouter.pushView({ view: 'tab', tab: 'gradedReading', story: storyId }, `${window.location.pathname}?tab=gradedReading&story=${storyId}`);
      }

      renderStoryView(story);
    } catch (e) {
      mount.innerHTML = `
        <div class="graded-reading-container" style="text-align: center; padding: 60px 0;">
          <div style="color: #ef4444; font-weight: 700; margin-bottom: 12px;">Đã xảy ra lỗi</div>
          <p style="color: var(--text-secondary);">${e.message}</p>
          <button type="button" class="graded-back-btn" style="margin: 16px auto;" onclick="GradedReading.goBackToHub()">← Trở về danh sách</button>
        </div>
      `;
    }
  }

  /**
   * Render Interactive Story Reader View
   */
  function renderStoryView(story) {
    const mount = document.getElementById('screenGradedReading');
    if (!mount) return;

    document.body.classList.add('graded-story-active');

    // Apply initial toggle preference classes
    document.body.classList.toggle('graded-pinyin-hidden', !prefs.showPinyin);
    document.body.classList.toggle('graded-translation-hidden', !prefs.showTranslation);

    const storyLvlNum = parseInt(story.level.replace(/\D/g, '') || '1', 10);
    const isRead = isStoryRead(story.id);

    mount.innerHTML = `
      <div class="graded-reading-container graded-reader-shell">
        <!-- Navigation & Toggles Bar -->
        <header class="graded-reader-nav">
          <button type="button" class="graded-back-btn" onclick="GradedReading.goBackToHub()" title="Trở về danh sách bài đọc (Esc)">
            ← Hub bài đọc
          </button>

          <div class="graded-reader-title-group">
            <h1 class="graded-reader-zh-title">
              <span>${story.title.zh}</span>
              <span class="graded-card-level-badge lvl-${(story.level || 'hsk1').toLowerCase()}">${story.level}</span>
            </h1>
            <div class="graded-reader-vi-title">${story.title.vi} · ⏱️ ${story.estimatedMinutes} phút</div>
          </div>

          <div class="graded-reader-actions">
            <button type="button" id="playFullStoryBtn" class="graded-toggle-btn" onclick="GradedReading.speakFullStory()" title="Nghe đọc toàn bộ bài đọc">
              <span>🔊 Đọc toàn bài</span>
            </button>
            <button type="button" id="toggleReadStoryBtn" class="graded-toggle-btn ${isRead ? 'active read-active' : ''}" onclick="GradedReading.toggleCurrentStoryRead()" title="${isRead ? 'Đã đọc (Bấm để hủy)' : 'Đánh dấu đã đọc bài này'}">
              ${isRead ? '<span>✓ Đã đọc</span>' : '<span>○ Đã đọc</span>'}
            </button>
            <button type="button" id="togglePinyinBtn" class="graded-toggle-btn ${prefs.showPinyin ? 'active' : ''}" onclick="GradedReading.togglePinyin()" title="Bật/Tắt phiên âm Pinyin">
              拼 Pinyin
            </button>
            <button type="button" id="toggleTransBtn" class="graded-toggle-btn ${prefs.showTranslation ? 'active' : ''}" onclick="GradedReading.toggleTranslation()" title="Bật/Tắt bản dịch tiếng Việt">
              🇻🇳 Dịch
            </button>
          </div>
        </header>

        <!-- SRS Highlighting Legend Bar -->
        <div class="graded-srs-legend-bar" aria-label="Chú giải trạng thái từ vựng">
          <span style="font-weight: 700; color: var(--text-secondary);">Vốn từ cá nhân:</span>
          <div class="graded-legend-item">
            <span class="legend-swatch mastered"></span>
            <span>Đã thuộc</span>
          </div>
          <div class="graded-legend-item">
            <span class="legend-swatch learning"></span>
            <span>Đang học (SRS)</span>
          </div>
          <div class="graded-legend-item">
            <span class="legend-swatch new"></span>
            <span>Từ mới</span>
          </div>
          <div class="graded-legend-item">
            <span class="legend-swatch overlevel"></span>
            <span>Vượt cấp (+1)</span>
          </div>
        </div>

        <!-- Main Story Reader Card -->
        <main class="graded-passage-card">
          <div class="graded-sentence-stream">
            ${story.sentences.map((sentence, sidx) => {
              const cleanZh = (sentence.zh || sentence.tokens.map(t => t.text).join('')).replace(/^[，。？！、\s]+/, '');
              return `
              <div class="graded-sentence-block" id="sent-${sentence.id}">
                <div class="graded-sentence-top-row" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                  <div class="graded-sentence-zh">
                    ${renderSentenceTokensHtml(sentence, sidx, storyLvlNum)}
                  </div>
                  <button type="button" class="sentence-audio-btn speech-btn" data-sentence-id="${sentence.id}" onclick="GradedReading.speakSentence('${escapeAttr(cleanZh)}', '${sentence.id}')" title="Nghe câu này" aria-label="Nghe câu ${sidx + 1}" style="flex-shrink: 0; margin-top: 6px; padding: 4px 8px; font-size: 0.76rem; border-radius: 6px; border: 1px solid var(--graded-border); background: var(--graded-chip-bg); color: var(--graded-text-secondary); cursor: pointer;">
                    🔊 Nghe
                  </button>
                </div>
                <div class="graded-sentence-vi">${sentence.vi}</div>
              </div>
            `;
            }).join('')}
          </div>
        </main>

        <!-- Vocabulary Spotlight Section -->
        <section class="graded-section-card">
          <h2 class="graded-section-title">
            <span>⭐</span>
            <span>Từ vựng trọng tâm trong bài (${story.vocabulary_spotlight.length} từ)</span>
          </h2>
          <div class="graded-spotlight-grid">
            ${renderSpotlightItems(story)}
          </div>
        </section>

        <!-- Comprehension Quiz Section -->
        <section class="graded-section-card">
          <h2 class="graded-section-title">
            <span>📝</span>
            <span>Kiểm tra đọc hiểu (${story.quiz.length} câu)</span>
          </h2>
          <div class="graded-quiz-container">
            ${story.quiz.map((q, qidx) => `
              <div class="graded-quiz-item" id="quiz-${q.id}">
                <div class="graded-quiz-question">Câu ${qidx + 1}: ${q.question_vi}</div>
                <div class="graded-quiz-options">
                  ${q.options_vi.map((opt, oidx) => `
                    <button type="button" class="graded-quiz-opt-btn" onclick="GradedReading.answerQuiz('${q.id}', ${oidx})">
                      <span style="font-weight: 700; color: var(--text-secondary);">${String.fromCharCode(65 + oidx)}.</span>
                      <span>${opt}</span>
                    </button>
                  `).join('')}
                </div>
                <div class="graded-quiz-explanation" id="quiz-exp-${q.id}" style="display:none;"></div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Story Completion Section -->
        <section class="graded-completion-card ${isRead ? 'completed' : ''}" id="storyCompletionCard">
          <div class="completion-icon-box">${isRead ? '🎉' : '📖'}</div>
          <div class="completion-content">
            <h3 class="completion-heading">${isRead ? 'Đã hoàn thành bài đọc!' : 'Hoàn thành bài đọc này?'}</h3>
            <p class="completion-sub">${isRead ? 'Bài viết đã được lưu vào danh sách Đã đọc của bạn.' : 'Đánh dấu đã đọc để lưu tiến trình và theo dõi lộ trình học tập.'}</p>
          </div>
          <button type="button" class="graded-completion-btn ${isRead ? 'active' : ''}" onclick="GradedReading.toggleCurrentStoryRead()">
            ${isRead ? '✓ Đã hoàn thành (Bấm để hủy)' : '✓ Đã đọc (Lưu tiến trình)'}
          </button>
        </section>
      </div>
    `;
  }

  const LEADING_PUNCT = new Set(['“', '‘', '（', '《', '〈', '【', '[', '"', '(']);
  const TRAILING_PUNCT = new Set(['，', '。', '！', '？', '、', '：', '；', '”', '’', '）', '》', '〉', '】', ']', '"', ')', '…', '—']);

  /**
   * Group tokens and punctuation marks into atomic units to prevent punctuation from wrapping to newline alone
   */
  function renderSentenceTokensHtml(sentence, sidx, storyLvlNum) {
    const tokens = sentence.tokens || [];
    const units = [];
    let currentUnit = [];

    for (let tidx = 0; tidx < tokens.length; tidx++) {
      const tok = tokens[tidx];
      const text = (tok.text || '').trim();
      const isLeading = LEADING_PUNCT.has(text);
      const isTrailing = TRAILING_PUNCT.has(text);
      const isPunct = isLeading || isTrailing || /^[，。？！、：；“”‘’（）《》〈〉【】\[\]()…—\s]+$/.test(text);

      if (isLeading) {
        if (currentUnit.length && currentUnit.some(item => !item.isLeading)) {
          units.push(currentUnit);
          currentUnit = [];
        }
        currentUnit.push({ tok, tidx, isLeading: true, isPunct: true });
      } else if (isTrailing) {
        currentUnit.push({ tok, tidx, isTrailing: true, isPunct: true });
        units.push(currentUnit);
        currentUnit = [];
      } else if (isPunct) {
        currentUnit.push({ tok, tidx, isPunct: true });
        units.push(currentUnit);
        currentUnit = [];
      } else {
        if (currentUnit.length && currentUnit.some(item => !item.isLeading)) {
          units.push(currentUnit);
          currentUnit = [];
        }
        currentUnit.push({ tok, tidx, isPunct: false });
      }
    }
    if (currentUnit.length) {
      units.push(currentUnit);
    }

    return units.map(unit => {
      const innerHtml = unit.map(item => renderTokenHtml(item.tok, sidx, item.tidx, storyLvlNum)).join('');
      return `<span class="graded-token-unit">${innerHtml}</span>`;
    }).join('');
  }

  /**
   * Render individual token inside sentence
   */
  function renderTokenHtml(token, sidx, tidx, storyLvlNum) {
    const isPunct = /^[，。？！、：；“”‘’（）《》〈〉【】\[\]()…—\s]+$/.test(token.text);
    if (isPunct) {
      return `<span class="graded-punctuation">${token.text}</span>`;
    }

    const srsStatus = getTokenSrsStatus(token);
    const tokenLvl = token.hsk || 1;
    const isOverLevel = Boolean(token.word_id && tokenLvl > storyLvlNum);
    const overLevelBadge = isOverLevel ? `<span class="token-overlevel-badge">+${tokenLvl - storyLvlNum}</span>` : '';

    // If srsStatus is 'none' (not in SRS record), default display to 'new'
    // so it gets the amber highlight styling instead of plain black text
    const displayStatus = srsStatus !== 'none' ? srsStatus : 'new';
    const srsClass = `token-${displayStatus}`;
    const overClass = isOverLevel ? 'token-overlevel' : '';

    return `
      <span class="graded-token ${srsClass} ${overClass}"
            data-sidx="${sidx}"
            data-tidx="${tidx}"
            data-word-id="${token.word_id || ''}"
            onclick="GradedReading.handleTokenClick(event, ${sidx}, ${tidx})"
            title="Bấm để xem nghĩa & thêm vào SRS">
        <ruby>
          <rt class="token-pinyin">${token.pinyin || ''}</rt>
          <rb>${token.text}</rb>
        </ruby>${overLevelBadge}
      </span>
    `;
  }

  /**
   * Render Vocabulary Spotlight Items
   */
  function renderSpotlightItems(story) {
    const wordsById = {};
    story.sentences.forEach(s => {
      s.tokens.forEach(tok => {
        if (tok.word_id && !wordsById[tok.word_id]) {
          wordsById[tok.word_id] = tok;
        }
      });
    });

    return story.vocabulary_spotlight.map(wid => {
      const tok = wordsById[wid];
      if (!tok) return '';
      const srsStatus = getTokenSrsStatus(tok);
      const statusLabel = srsStatus === 'mastered' ? 'Đã nhớ' : (srsStatus === 'learning' ? 'Đang ôn' : 'Từ mới');
      const statusClass = srsStatus;

      return `
        <div class="graded-spotlight-item" onclick="GradedReading.inspectByWordId('${wid}', event)">
          <div class="spotlight-top">
            <span class="spotlight-hz">${tok.text}</span>
            <span class="spotlight-py">${tok.pinyin}</span>
          </div>
          <div class="spotlight-vi">${tok.meaning_vi}</div>
          <div style="margin-top: 4px;">
            <span class="popover-srs-status ${statusClass}">${statusLabel}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Handle Click-to-Inspect Token Popover
   */
  function handleTokenClick(event, sidx, tidx) {
    event.stopPropagation();
    if (!activeStory) return;
    const sentence = activeStory.sentences[sidx];
    if (!sentence) return;
    const token = sentence.tokens[tidx];
    if (!token || !token.text || /^[，。？！、：；“”‘’（）《》〈〉【】\[\]()…—\s]+$/.test(token.text)) return;

    showTokenPopover(token, event.currentTarget);
  }

  function inspectByWordId(wid, event) {
    if (event) event.stopPropagation();
    if (!activeStory) return;
    for (const s of activeStory.sentences) {
      for (const tok of s.tokens) {
        if (tok.word_id === wid) {
          showTokenPopover(tok, event ? event.currentTarget : null);
          return;
        }
      }
    }
  }

  /**
   * Show Token Popover
   */
  function showTokenPopover(token, targetEl) {
    closePopover();

    const popover = document.createElement('div');
    popover.id = 'gradedTokenPopover';
    popover.className = 'graded-token-popover';

    const srsStatus = getTokenSrsStatus(token);
    const storyLvlNum = activeStory ? parseInt(activeStory.level.replace(/\D/g, '') || '1', 10) : 1;
    const isAboveLevel = Boolean(token.hsk && token.hsk > storyLvlNum);
    const isAlreadyInSrs = srsStatus === 'mastered' || srsStatus === 'learning';

    let displayStatus = srsStatus !== 'none' ? srsStatus : 'new';
    let statusLabel = srsStatus === 'mastered' ? '✓ Đã thuộc' : (srsStatus === 'learning' ? '⚡ Đang ôn (SRS)' : (isAboveLevel ? '⭐ Vượt cấp' : '✨ Từ mới'));

    const hanviet = token.hanviet || (typeof getWordHanViet === 'function' ? getWordHanViet(token.text) : '');
    let meaning = token.meaning_vi || '';
    if (!meaning) {
      if (hanviet) {
        meaning = `Âm Hán-Việt: ${hanviet}`;
      } else {
        meaning = 'Chữ Hán trong bài đọc';
      }
    }

    if (!token.word_id) {
      const storyLvl = activeStory ? parseInt(activeStory.level.replace(/\D/g, '') || '1', 10) : 1;
      token.word_id = `hsk${token.hsk || storyLvl}_${token.text.charCodeAt(0) + 10000}`;
    }

    popover.innerHTML = `
      <div class="popover-header">
        <div class="popover-hanzi-group">
          <div class="popover-hanzi">${token.text}</div>
          <div class="popover-pinyin">${token.pinyin || ''}</div>
        </div>
        <button type="button" class="popover-close-btn" onclick="GradedReading.closePopover()" aria-label="Đóng">✕</button>
      </div>

      <div class="popover-meta">
        ${token.hsk ? `<span class="popover-hsk-badge">HSK ${token.hsk}</span>` : ''}
        ${isAboveLevel ? `<span class="token-overlevel-badge" style="font-size: 0.72rem; padding: 2px 6px;">+${token.hsk - storyLvlNum} Cấp</span>` : ''}
        <span class="popover-srs-status ${displayStatus}" id="popoverSrsBadge">${statusLabel}</span>
      </div>

      <div class="popover-body">
        <div class="popover-row">
          <div class="popover-row-label">Nghĩa tiếng Việt</div>
          <div class="popover-meaning">${meaning}</div>
        </div>
        ${hanviet ? `
          <div class="popover-row">
            <div class="popover-row-label">Hán - Việt</div>
            <div class="popover-hanviet">${hanviet}</div>
          </div>
        ` : ''}
      </div>

      <button type="button" class="popover-action-btn ${isAlreadyInSrs ? 'added' : ''}" id="popoverAddSrsBtn" onclick="GradedReading.triggerAddSrs()" ${isAlreadyInSrs ? 'disabled' : ''}>
        ${isAlreadyInSrs ? '✓ Đã có trong SRS' : '+ Thêm vào hàng đợi SRS'}
      </button>
    `;

    document.body.appendChild(popover);
    activePopover = { el: popover, token: token };

    // Position popover near target element
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const popoverWidth = 290;
      let left = rect.left + window.scrollX;
      let top = rect.bottom + window.scrollY + 8;

      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      if (left < 16) left = 16;

      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
    } else {
      popover.style.position = 'fixed';
      popover.style.top = '50%';
      popover.style.left = '50%';
      popover.style.transform = 'translate(-50%, -50%)';
    }

    // Auto close when clicking outside
    setTimeout(() => {
      document.addEventListener('click', onDocClick);
    }, 50);
  }

  function onDocClick(e) {
    if (activePopover && activePopover.el && !activePopover.el.contains(e.target)) {
      closePopover();
    }
  }

  function closePopover() {
    if (activePopover && activePopover.el) {
      activePopover.el.remove();
      activePopover = null;
    }
    document.removeEventListener('click', onDocClick);
  }

  function triggerAddSrs() {
    if (!activePopover || !activePopover.token) return;
    const token = activePopover.token;
    const btn = document.getElementById('popoverAddSrsBtn');
    if (btn && btn.classList.contains('added')) return; // Prevent duplicate add

    const success = addTokenToSrs(token);
    if (success) {
      const badge = document.getElementById('popoverSrsBadge');
      if (btn) {
        btn.textContent = '✓ Đã thêm vào SRS';
        btn.classList.add('added');
        btn.disabled = true;
      }
      if (badge) {
        badge.textContent = '⚡ Đang ôn (SRS)';
        badge.className = 'popover-srs-status learning';
      }
    }
  }

  /**
   * Interactive Quiz answering
   */
  function answerQuiz(qId, selectedIdx) {
    if (!activeStory) return;
    const q = activeStory.quiz.find(item => item.id === qId);
    if (!q) return;

    const quizItem = document.getElementById(`quiz-${qId}`);
    if (!quizItem) return;

    const isCorrect = selectedIdx === q.answer;
    quizState[qId] = { selectedIdx, isCorrect };

    const buttons = quizItem.querySelectorAll('.graded-quiz-opt-btn');
    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      btn.classList.remove('correct', 'wrong');
      if (idx === q.answer) {
        btn.classList.add('correct');
      } else if (idx === selectedIdx && !isCorrect) {
        btn.classList.add('wrong');
      }
    });

    const expEl = document.getElementById(`quiz-exp-${qId}`);
    if (expEl) {
      expEl.style.display = 'block';
      expEl.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 2px;">
          ${isCorrect ? '🎉 Chính xác!' : '❌ Chưa chính xác!'}
        </div>
        <div>${q.explanation_vi}</div>
      `;
    }

    // Auto-mark as read if all quiz questions are answered
    if (activeStory && activeStory.quiz) {
      const allAnswered = activeStory.quiz.every(item => quizState[item.id] !== undefined);
      if (allAnswered && !isStoryRead(activeStory.id)) {
        markStoryAsRead(activeStory.id);
        updateStoryReadUI();
      }
    }
  }

  /**
   * Toggles
   */
  function togglePinyin() {
    prefs.showPinyin = !prefs.showPinyin;
    savePrefs();
    document.body.classList.toggle('graded-pinyin-hidden', !prefs.showPinyin);
    const btn = document.getElementById('togglePinyinBtn');
    if (btn) btn.classList.toggle('active', prefs.showPinyin);
  }

  function toggleTranslation() {
    prefs.showTranslation = !prefs.showTranslation;
    savePrefs();
    document.body.classList.toggle('graded-translation-hidden', !prefs.showTranslation);
    const btn = document.getElementById('toggleTransBtn');
    if (btn) btn.classList.toggle('active', prefs.showTranslation);
  }

  function setLevelFilter(lvl) {
    currentLevelFilter = lvl;
    renderHub();
  }

  function handleSearchInput(val) {
    searchQuery = val || '';
    renderHub();
  }

  function setCategoryFilter(cat) {
    currentCategoryFilter = cat || 'all';
    renderHub();
  }

  function setSort(s) {
    currentSort = s || 'default';
    renderHub();
  }

  function resetFilters() {
    searchQuery = '';
    currentCategoryFilter = 'all';
    currentLevelFilter = 'all';
    currentSort = 'default';
    renderHub();
  }

  function escapeAttr(str) {
    return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    init,
    renderHub,
    openStory,
    goBackToHub,
    togglePinyin,
    toggleTranslation,
    setLevelFilter,
    setCategoryFilter,
    setSort,
    handleSearchInput,
    resetFilters,
    loadMoreStories,
    speakSentence,
    speakFullStory,
    handleTokenClick,
    inspectByWordId,
    triggerAddSrs,
    closePopover,
    answerQuiz,
    isStoryRead,
    markStoryAsRead,
    unmarkStoryAsRead,
    toggleStoryRead,
    toggleCurrentStoryRead
  };
})();

// Export globally for SPA integration
window.GradedReading = GradedReading;
