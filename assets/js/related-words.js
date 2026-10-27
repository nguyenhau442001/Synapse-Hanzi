// Related Characters & Words Clustering System (Chữ Liên Quan)
// Dựng Inverted Index lúc khởi động để tra cứu siêu tốc O(1) theo:
// 1. whole-char: Cùng chữ trong từ ghép (医院 ↔ 医生, 学生 ↔ 学校 ↔ 学习)
// 2. phonetic: Cùng thành tố gợi âm (妈 ↔ 吗 cùng 马)
// 3. radical: Cùng bộ thủ (nữ, bộ phụ 阝, ...)
//
// Phân cấp ưu tiên & lọc:
// - Chỉ lấy từ có level <= currentLevel (tránh spoil từ vựng cấp cao)
// - Loại bỏ chính từ đang hiển thị
// - Bộ thủ quá phổ biến (口, 氵, 亻, 扌, 艹...) chỉ bổ sung khi thiếu kết quả từ nhóm 1 & 2 (tối đa 5 chips)
// - Ẩn hoàn toàn khối nếu không có liên kết nào

(function() {
  'use strict';

  // Danh sách các bộ thủ cực kỳ phổ biến - xuất hiện ở quá nhiều chữ
  // Chỉ dùng khi nhóm 1 (cùng chữ) và nhóm 2 (cùng âm) không đủ kết quả
  const COMMON_RADICALS = new Set([
    '口', '氵', '亻', '扌', '艹', '木', '日', '月', '心', '忄', '土', '女', '纟', '讠', '饣', '辶'
  ]);

  // Bảng ánh xạ xếp hạng level để so sánh cấp độ học
  const LEVEL_RANK = {
    hsk1: 1,
    hsk2: 2,
    hsk3: 3,
    hsk4: 4,
    hsk5: 5,
    hsk6: 6,
    hsk30_1: 1,
    hsk30_2: 2,
    hsk30_3: 3,
    hsk30_4: 4,
    hsk30_5: 5,
    hsk30_6: 6,
    hsk30_7: 7,
    hsk30_8: 8,
    hsk30_9: 9,
  };

  function getLevelRank(lvlKey) {
    if (!lvlKey) return 1;
    if (LEVEL_RANK[lvlKey]) return LEVEL_RANK[lvlKey];
    const m = String(lvlKey).match(/\d+/);
    return m ? parseInt(m[0], 10) : 99;
  }

  // Loại bỏ thanh điệu pinyin để đối chiếu âm biểu thanh (phonetic base)
  const TONE_CHAR_MAP = {
    'ā':'a','á':'a','ǎ':'a','à':'a',
    'ē':'e','é':'e','ě':'e','è':'e',
    'ī':'i','í':'i','ǐ':'i','ì':'i',
    'ō':'o','ó':'o','ǒ':'o','ò':'o',
    'ū':'u','ú':'u','ǔ':'u','ù':'u',
    'ǖ':'v','ǘ':'v','ǚ':'v','ǜ':'v','ü':'v',
  };

  function stripTone(str) {
    if (!str) return '';
    return String(str).toLowerCase().replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, c => TONE_CHAR_MAP[c] || c).trim();
  }

  // Singleton Inverted Index
  let relatedIndex = null;
  let indexPromise = null;

  // Lịch sử duyệt qua chip "Chữ liên quan" để quay lại thẻ trước
  const relatedNavHistory = [];

  /**
   * Khởi tạo Inverted Index 1 lần duy nhất từ toàn bộ từ vựng và chiết tự chữ Hán.
   * Maps được tạo gồm:
   * - charToWords: Hanzi char -> Danh sách từ vựng chứa chữ đó
   * - compToWords: Component char -> Danh sách { word, char, comp, isPhonetic }
   */
  async function buildRelatedIndex() {
    if (relatedIndex) return relatedIndex;
    if (indexPromise) return indexPromise;

    indexPromise = (async () => {
      try {
        // Tải đồng thời chiết tự và danh sách từ vựng HSK 1-6
        const decompPromise = typeof ensureHanziDecompLoaded === 'function'
          ? ensureHanziDecompLoaded()
          : fetch('database/radicals/hanzi_decompositions.json').then(r => r.json()).catch(() => ({}));

        const levelKeys = typeof hskLevelKeys === 'function'
          ? hskLevelKeys()
          : ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6'];

        const vocabPromises = levelKeys.map(async key => {
          const cfg = (typeof LEVELS !== 'undefined' && LEVELS[key]) ? LEVELS[key] : null;
          const url = cfg && cfg.dataUrl ? cfg.dataUrl : `database/vocabs/${key}_vocabularies.json`;
          try {
            const res = await fetch(url);
            if (!res.ok) return [];
            const words = await res.json();
            return words.map(w => ({
              id: w.id,
              hanzi: w.hanzi,
              pinyin: w.pinyin,
              meaning: w.meaning,
              hanviet: w.hanviet || '',
              levelKey: key,
              levelRank: getLevelRank(key)
            }));
          } catch (e) {
            return [];
          }
        });

        const [decompData, ...vocabLists] = await Promise.all([decompPromise, ...vocabPromises]);
        const allWords = vocabLists.flat();

        const charToWords = new Map();
        const compToWords = new Map();
        const wordLookup = new Map(); // `${levelKey}_${id}` -> word

        // 1. Dựng map chữ -> từ (whole-char)
        allWords.forEach(w => {
          wordLookup.set(`${w.levelKey}_${w.id}`, w);
          const raw = String(w.hanzi || '').replace(/[（\(].*?[）\)]/g, '').trim();
          const chars = Array.from(raw).filter(ch => /\p{Script=Han}/u.test(ch));
          const uniqueChars = Array.from(new Set(chars));

          uniqueChars.forEach(ch => {
            if (!charToWords.has(ch)) charToWords.set(ch, []);
            charToWords.get(ch).push(w);

            // 2. Dựng map thành tố cấu tạo chữ (phonetic & radical)
            const d = decompData ? decompData[ch] : null;
            if (d && Array.isArray(d.components)) {
              const chTone = stripTone(d.pinyin || w.pinyin);

              d.components.forEach(comp => {
                if (!comp || !comp.char) return;
                const compChar = comp.char;
                const compTone = stripTone(comp.pinyin || (decompData[compChar] && decompData[compChar].pinyin));

                // Quy tắc xác định thành tố gợi âm (phonetic):
                // - Thành tố có pinyin không dấu trùng âm với chữ (ví dụ 妈 mā và 马 mǎ -> 'ma')
                // - Hoặc âm thành tố và chữ có cùng vần kết thúc
                const isPhonetic = Boolean(
                  compTone && chTone && (
                    compTone === chTone ||
                    (chTone.length >= 3 && compTone.length >= 3 && (chTone.endsWith(compTone) || compTone.endsWith(chTone)))
                  )
                );

                if (!compToWords.has(compChar)) compToWords.set(compChar, []);
                compToWords.get(compChar).push({
                  word: w,
                  char: ch,
                  charPy: chTone,
                  compChar,
                  compName: comp.name || '',
                  isPhonetic
                });
              });
            }
          });
        });

        relatedIndex = {
          allWords,
          charToWords,
          compToWords,
          decompData: decompData || {},
          wordLookup
        };

        return relatedIndex;
      } catch (err) {
        console.warn('Lỗi khởi tạo relatedIndex:', err);
        relatedIndex = {
          allWords: [],
          charToWords: new Map(),
          compToWords: new Map(),
          decompData: {},
          wordLookup: new Map()
        };
        return relatedIndex;
      } finally {
        indexPromise = null;
      }
    })();

    return indexPromise;
  }

  /**
   * Truy vấn danh sách từ liên quan cho một từ mục tiêu.
   * Tuân thủ thứ tự ưu tiên:
   * 1. whole-char
   * 2. phonetic
   * 3. radical (hiếm trước, phổ biến sau)
   * Trả về mảng 3-5 phần tử đã sắp xếp.
   */
  function queryRelatedWords(targetWord, targetLevelKey) {
    if (!relatedIndex || !targetWord || !targetWord.hanzi) return [];

    const currentRank = getLevelRank(targetLevelKey || (typeof currentLevel !== 'undefined' ? currentLevel : 'hsk1'));
    const rawTarget = String(targetWord.hanzi || '').replace(/[（\(].*?[）\)]/g, '').trim();
    const targetChars = Array.from(rawTarget).filter(ch => /\p{Script=Han}/u.test(ch));
    if (targetChars.length === 0) return [];

    const seenWordKeys = new Set([`${targetLevelKey}_${targetWord.id}`, targetWord.hanzi]);

    const wholeCharMatches = [];
    const phoneticMatches = [];
    const rareRadicalMatches = [];
    const commonRadicalMatches = [];

    // Nhóm 1: whole-char (Cùng chữ trong từ ghép)
    targetChars.forEach(ch => {
      const list = relatedIndex.charToWords.get(ch) || [];
      list.forEach(w => {
        if (w.levelRank > currentRank) return; // Không spoil cấp cao hơn
        const key = `${w.levelKey}_${w.id}`;
        if (seenWordKeys.has(key) || seenWordKeys.has(w.hanzi)) return;
        seenWordKeys.add(key);
        seenWordKeys.add(w.hanzi);

        wholeCharMatches.push({
          word: w,
          type: 'whole-char',
          typeLabel: 'Cùng chữ',
          shared: ch,
          score: 100
        });
      });
    });

    // Nhóm 2 & 3: phonetic & radical từ các thành tố của chữ mục tiêu
    targetChars.forEach(ch => {
      const d = relatedIndex.decompData[ch];
      if (!d || !Array.isArray(d.components)) return;
      const chTone = stripTone(d.pinyin || targetWord.pinyin);

      d.components.forEach(comp => {
        if (!comp || !comp.char) return;
        const compChar = comp.char;
        const compTone = stripTone(comp.pinyin || (relatedIndex.decompData[compChar] && relatedIndex.decompData[compChar].pinyin));

        // Kiểm tra xem thành tố này có phải âm biểu thanh của từ gốc không
        const targetIsPhonetic = Boolean(
          compTone && chTone && (
            compTone === chTone ||
            (chTone.length >= 3 && compTone.length >= 3 && (chTone.endsWith(compTone) || compTone.endsWith(chTone)))
          )
        );

        const list = relatedIndex.compToWords.get(compChar) || [];
        list.forEach(item => {
          const w = item.word;
          if (w.levelRank > currentRank) return; // Không spoil cấp cao
          const key = `${w.levelKey}_${w.id}`;
          if (seenWordKeys.has(key) || seenWordKeys.has(w.hanzi)) return;

          // Cùng âm (phonetic) nếu:
          // 1. Cả 2 chữ đều dùng chung thành tố mang tính gợi âm
          // 2. Hoặc cả 2 chữ có cùng âm đọc cơ sở (stripTone) và dùng chung thành tố này
          const itemChTone = stripTone(item.charPy || w.pinyin);
          const isPhonetic = Boolean(
            (targetIsPhonetic && item.isPhonetic) ||
            (chTone && itemChTone && chTone === itemChTone && (targetIsPhonetic || item.isPhonetic))
          );
          seenWordKeys.add(key);
          seenWordKeys.add(w.hanzi);

          if (isPhonetic) {
            phoneticMatches.push({
              word: w,
              type: 'phonetic',
              typeLabel: 'Cùng âm',
              shared: compChar,
              score: 80
            });
          } else if (COMMON_RADICALS.has(compChar)) {
            commonRadicalMatches.push({
              word: w,
              type: 'radical',
              typeLabel: 'Cùng bộ',
              shared: compChar,
              score: 20
            });
          } else {
            rareRadicalMatches.push({
              word: w,
              type: 'radical',
              typeLabel: 'Cùng bộ',
              shared: compChar,
              score: 50
            });
          }
        });
      });
    });

    // Tổng hợp và cắt lọc theo đúng quy tắc:
    // - Ưu tiên nhóm 1 (cùng chữ) và nhóm 2 (cùng âm)
    // - Nhóm 3 (cùng bộ hiếm)
    // - Nhóm bộ phổ biến (khẩu, thuỷ, nhân, ...) chỉ lấy khi chưa đủ 3-5 chips
    let combined = [...wholeCharMatches, ...phoneticMatches, ...rareRadicalMatches];
    if (combined.length < 5) {
      const needed = 5 - combined.length;
      combined = combined.concat(commonRadicalMatches.slice(0, needed));
    }

    // Giới hạn tối đa 5 chips
    return combined.slice(0, 5);
  }

  /**
   * Lấy trạng thái học tập của một từ (Đã nhớ / Chưa nhớ / Chưa học)
   */
  function getWordLearnStatus(levelKey, wordId) {
    try {
      if (typeof currentLevel !== 'undefined' && currentLevel === levelKey && typeof progress !== 'undefined') {
        const s = progress[wordId];
        if (s === 'known' || s === 'unknown') return s;
      }
      if (typeof readSrsRecord === 'function' && typeof statusFromCard === 'function') {
        const record = readSrsRecord(levelKey);
        if (record && record.cards && record.cards[wordId]) {
          const s = statusFromCard(record.cards[wordId]);
          if (s) return s;
        }
      }
    } catch (e) {}
    return 'unseen';
  }

  /**
   * Cắt ngắn nghĩa tiếng Việt để hiển thị vừa vặn trên chip
   */
  function formatShortMeaning(meaning) {
    if (!meaning) return '';
    const clean = String(meaning).replace(/[（\(].*?[）\)]/g, '').trim();
    const firstPart = clean.split(/[,;\/，；]/)[0].trim();
    return firstPart.length > 14 ? firstPart.slice(0, 13) + '…' : firstPart;
  }

  /**
   * Render khối "Chữ liên quan" trên thẻ Flashcard hiện tại
   */
  async function renderCardRelated(word) {
    const wrap = document.getElementById('cardRelatedWrap');
    const accordion = document.getElementById('cardRelatedAccordion');
    const countBadge = document.getElementById('cardRelatedCountBadge');
    if (!wrap) return;

    if (!word || !word.hanzi) {
      wrap.style.display = 'none';
      wrap.hidden = true;
      wrap.innerHTML = '';
      if (accordion) {
        accordion.style.display = 'none';
        accordion.hidden = true;
        accordion.open = false;
      }
      return;
    }

    // Đảm bảo index đã tải xong
    if (!relatedIndex) {
      await buildRelatedIndex();
    }

    const currentLvl = typeof currentLevel !== 'undefined' ? currentLevel : 'hsk1';
    const relatedList = queryRelatedWords(word, currentLvl);

    // Quy tắc: Nếu không có chữ liên quan thì ẩn hẳn khối, không để khung trống
    if (!relatedList || relatedList.length === 0) {
      wrap.style.display = 'none';
      wrap.hidden = true;
      wrap.innerHTML = '';
      if (accordion) {
        accordion.style.display = 'none';
        accordion.hidden = true;
        accordion.open = false;
      }
      return;
    }

    if (accordion) {
      accordion.hidden = false;
      accordion.style.display = 'block';
      accordion.open = false;
    }
    if (countBadge) {
      countBadge.textContent = relatedList.length;
      countBadge.hidden = false;
    }
    wrap.hidden = false;
    wrap.style.display = 'flex';

    const hasHistory = relatedNavHistory.length > 0;
    const lastItem = hasHistory ? relatedNavHistory[relatedNavHistory.length - 1] : null;

    let html = '';
    if (hasHistory && lastItem) {
      html += `
        <div class="card-related-header">
          <button type="button" class="card-related-back-btn"
            onclick="event.stopPropagation(); window.goBackRelatedCard()"
            title="Quay lại thẻ trước: ${lastItem.hanzi}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Quay lại: ${lastItem.hanzi}</span>
          </button>
        </div>
      `;
    }
    html += `<div class="card-related-chips" role="list" aria-label="Danh sách chữ liên quan">`;

    relatedList.forEach(item => {
      const w = item.word;
      const status = getWordLearnStatus(w.levelKey, w.id);
      const shortMean = formatShortMeaning(w.meaning);
      const statusClass = status === 'known'
        ? 'related-chip--known'
        : (status === 'unknown' ? 'related-chip--unknown' : 'related-chip--unseen');

      const statusTitle = status === 'known' ? 'Đã nhớ' : (status === 'unknown' ? 'Chưa nhớ' : 'Chưa học');

      html += `
        <button type="button" class="related-chip ${statusClass}"
          onclick="event.stopPropagation(); window.navigateToRelatedWord('${w.levelKey}', ${w.id}, '${escapeHtmlAttr(w.hanzi)}')"
          title="Nhấn để học thẻ '${w.hanzi}' (${w.pinyin} - ${shortMean}) · Trạng thái: ${statusTitle}"
          role="listitem">
          <div class="related-chip-main">
            <span class="related-chip-hanzi" lang="zh-CN">${w.hanzi}</span>
            <span class="related-chip-pinyin">${w.pinyin || ''}</span>
            <span class="related-chip-tag related-chip-tag--${item.type}">${item.typeLabel}</span>
          </div>
          ${shortMean ? `<span class="related-chip-mean">${shortMean}</span>` : ''}
        </button>
      `;
    });

    html += `</div>`;
    wrap.innerHTML = html;
  }

  function escapeHtmlAttr(str) {
    return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  /**
   * Điều hướng sang học một từ liên quan, lưu lại lịch sử để quay lại
   */
  async function navigateToRelatedWord(targetLevel, wordId, targetHanzi) {
    if (typeof activeStudyWord !== 'undefined' && activeStudyWord) {
      relatedNavHistory.push({
        levelKey: typeof currentLevel !== 'undefined' ? currentLevel : 'hsk1',
        wordId: activeStudyWord.id,
        hanzi: activeStudyWord.hanzi
      });
      // Giới hạn độ dài ngăn xếp lịch sử tối đa 15 bước
      if (relatedNavHistory.length > 15) relatedNavHistory.shift();
    }

    if (typeof openWordInLevel === 'function') {
      await openWordInLevel(targetLevel, wordId, true);
    } else if (typeof selectLevel === 'function') {
      await selectLevel(targetLevel, wordId, true);
    }
  }

  /**
   * Quay lại thẻ flashcard trước đó trong ngăn xếp lịch sử
   */
  async function goBackRelatedCard() {
    if (relatedNavHistory.length === 0) return;
    const prev = relatedNavHistory.pop();
    if (!prev) return;

    if (typeof openWordInLevel === 'function') {
      await openWordInLevel(prev.levelKey, prev.wordId, true);
    } else if (typeof selectLevel === 'function') {
      await selectLevel(prev.levelKey, prev.wordId, true);
    }
  }

  let toastTimer = null;

  /**
   * Hiển thị gợi ý nhỏ khi người học bấm "Chưa nhớ":
   * "Ôn thêm nhóm: 妈, 吗..." để ôn cả cụm cùng thành tố.
   */
  function showRelatedClusterHint(word) {
    if (!word || !relatedIndex) return;
    const currentLvl = typeof currentLevel !== 'undefined' ? currentLevel : 'hsk1';
    const relatedList = queryRelatedWords(word, currentLvl);
    if (!relatedList || relatedList.length === 0) return;

    // Lấy tối đa 3-4 từ trong cụm
    const clusterWords = [word.hanzi, ...relatedList.map(r => r.word.hanzi)];
    const uniqueCluster = Array.from(new Set(clusterWords)).slice(0, 4);

    let toast = document.getElementById('relatedClusterToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'relatedClusterToast';
      toast.className = 'related-cluster-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }

    const clusterText = uniqueCluster.join(', ');
    toast.innerHTML = `
      <span class="related-cluster-icon">💡</span>
      <span class="related-cluster-msg">Ôn thêm nhóm: <strong>${clusterText}…</strong></span>
    `;

    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3800);
  }

  // Tự động khởi tạo index ngầm sau khi tải trang
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(buildRelatedIndex, 400);
    });

    // Xuất ra global scope
    window.buildRelatedIndex = buildRelatedIndex;
    window.queryRelatedWords = queryRelatedWords;
    window.renderCardRelated = renderCardRelated;
    window.navigateToRelatedWord = navigateToRelatedWord;
    window.goBackRelatedCard = goBackRelatedCard;
    window.showRelatedClusterHint = showRelatedClusterHint;
  }
})();
