// "Chữ liên quan" on the flashcard: an inverted index over all HSK words and the hanzi
// decompositions finds words sharing a character, a phonetic component or a radical.
// Preact port of the former assets/js/related-words.js; the index/query logic is unchanged and the
// chips, back button and "Ôn thêm nhóm" toast render the same markup.
import { render } from 'preact';
import { onDomReady } from './domReady';

/* global currentLevel, progress, activeStudyWord -- classic-script globals */

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
function stripTone(str) {
  return window.stripPinyinTones(str).trim();
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
export async function buildRelatedIndex() {
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
        try {
          const words = await window.fetchLevelWords(key);
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
export function queryRelatedWords(targetWord, targetLevelKey) {
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
    if (typeof window.readSrsRecord === 'function' && typeof window.statusFromCard === 'function') {
      const record = window.readSrsRecord(levelKey);
      if (record && record.cards && record.cards[wordId]) {
        const s = window.statusFromCard(record.cards[wordId]);
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

const statusInfo = {
  known: ['related-chip--known', 'Đã nhớ'],
  unknown: ['related-chip--unknown', 'Chưa nhớ'],
  unseen: ['related-chip--unseen', 'Chưa học']
};

function RelatedChips({ relatedList, lastItem }) {
  return (
    <>
      {lastItem && (
        <div class="card-related-header">
          <button type="button" class="card-related-back-btn" onClick={(e) => { e.stopPropagation(); goBackRelatedCard(); }}
            title={`Quay lại thẻ trước: ${lastItem.hanzi}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>{' '}
            <span>{`Quay lại: ${lastItem.hanzi}`}</span>
          </button>
        </div>
      )}
      <div class="card-related-chips" role="list" aria-label="Danh sách chữ liên quan">
        {relatedList.map((item) => {
          const w = item.word;
          const shortMean = formatShortMeaning(w.meaning);
          const [statusClass, statusTitle] = statusInfo[getWordLearnStatus(w.levelKey, w.id)];
          return [
            ' ',
            <button key={`${w.levelKey}_${w.id}`} type="button" class={`related-chip ${statusClass}`}
              onClick={(e) => { e.stopPropagation(); navigateToRelatedWord(w.levelKey, w.id, w.hanzi); }}
              title={`Nhấn để học thẻ '${w.hanzi}' (${w.pinyin} - ${shortMean}) · Trạng thái: ${statusTitle}`}
              role="listitem">
              <div class="related-chip-main">
                <span class="related-chip-hanzi" lang="zh-CN">{w.hanzi}</span>{' '}
                <span class="related-chip-pinyin">{w.pinyin || ''}</span>{' '}
                <span class={`related-chip-tag related-chip-tag--${item.type}`}>{item.typeLabel}</span>
              </div>{' '}
              {shortMean ? <span class="related-chip-mean">{shortMean}</span> : null}
            </button>
          ];
        })}
      </div>
    </>
  );
}

export async function renderCardRelated(word) {
  const wrap = document.getElementById('cardRelatedWrap');
  const accordion = document.getElementById('cardRelatedAccordion');
  const countBadge = document.getElementById('cardRelatedCountBadge');
  if (!wrap) return;
  const hideRelated = () => {
    render(null, wrap);
    window.setCardSectionVisible(accordion, wrap, false);
  };
  if (!word || !word.hanzi) {
    hideRelated();
    return;
  }
  if (!relatedIndex) await buildRelatedIndex();

  const relatedList = queryRelatedWords(word, typeof currentLevel !== 'undefined' ? currentLevel : 'hsk1');
  // No related words: hide the whole block instead of leaving an empty frame
  if (!relatedList || relatedList.length === 0) {
    hideRelated();
    return;
  }
  window.setCardSectionVisible(accordion, wrap, true, 'flex');
  if (countBadge) {
    countBadge.textContent = relatedList.length;
    countBadge.hidden = false;
  }
  const lastItem = relatedNavHistory.length > 0 ? relatedNavHistory[relatedNavHistory.length - 1] : null;
  render(<RelatedChips relatedList={relatedList} lastItem={lastItem} />, wrap);
}

// Study a related word, remembering the current card so "Quay lại" can return to it.
export async function navigateToRelatedWord(targetLevel, wordId) {
  if (typeof activeStudyWord !== 'undefined' && activeStudyWord) {
    relatedNavHistory.push({
      levelKey: typeof currentLevel !== 'undefined' ? currentLevel : 'hsk1',
      wordId: activeStudyWord.id,
      hanzi: activeStudyWord.hanzi
    });
    if (relatedNavHistory.length > 15) relatedNavHistory.shift(); // at most 15 steps back
  }
  if (typeof window.openWordInLevel === 'function') await window.openWordInLevel(targetLevel, wordId, true);
  else if (typeof window.selectLevel === 'function') await window.selectLevel(targetLevel, wordId, true);
}

export async function goBackRelatedCard() {
  const prev = relatedNavHistory.pop();
  if (!prev) return;
  if (typeof window.openWordInLevel === 'function') await window.openWordInLevel(prev.levelKey, prev.wordId, true);
  else if (typeof window.selectLevel === 'function') await window.selectLevel(prev.levelKey, prev.wordId, true);
}

let toastEl = null;
let toastTimer = null;

// After "Chưa nhớ": "Ôn thêm nhóm: 妈, 吗…" to review the whole cluster sharing a component.
export function showRelatedClusterHint(word) {
  if (!word || !relatedIndex) return;
  const relatedList = queryRelatedWords(word, typeof currentLevel !== 'undefined' ? currentLevel : 'hsk1');
  if (!relatedList || relatedList.length === 0) return;
  const cluster = Array.from(new Set([word.hanzi, ...relatedList.map((r) => r.word.hanzi)])).slice(0, 4);

  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'relatedClusterToast';
    toastEl.className = 'related-cluster-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  render(
    <>
      <span class="related-cluster-icon">💡</span>{' '}
      <span class="related-cluster-msg">Ôn thêm nhóm: <strong>{`${cluster.join(', ')}…`}</strong></span>
    </>,
    toastEl
  );
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3800);
}

export function mountRelatedWords() {
  Object.assign(window, { buildRelatedIndex, queryRelatedWords, renderCardRelated, navigateToRelatedWord, goBackRelatedCard, showRelatedClusterHint });
  // Build the index in the background shortly after the page is ready
  onDomReady(() => setTimeout(buildRelatedIndex, 400));
}
