/**
 * hanvietService.js
 * Han-Viet phonetic lookup and Hanzi radical decomposition service (Chiết tự chữ Hán).
 */

let decompCache = null;
let decompPromise = null;

/**
 * Lazy load hanzi character decompositions from database
 * @returns {Promise<Record<string, Object>>}
 */
export async function loadHanziDecompositions() {
  if (decompCache) return decompCache;
  if (decompPromise) return decompPromise;

  decompPromise = (async () => {
    try {
      const res = await fetch('database/radicals/hanzi_decompositions.json');
      if (!res.ok) return {};
      const data = await res.json();
      decompCache = data;
      return data;
    } catch (e) {
      console.warn('Failed to load hanzi decompositions:', e);
      return {};
    } finally {
      decompPromise = null;
    }
  })();

  return decompPromise;
}

/**
 * Get decomposition details for all characters in a word
 * @param {string} text - Hanzi text, e.g. "合适"
 * @returns {Promise<Array>} Array of character decomposition objects
 */
export async function getWordDecompositions(text) {
  if (!text) return [];
  const decompData = await loadHanziDecompositions();
  const clean = text.replace(/[（\(].*?[）\)]/g, '').trim();
  const chars = Array.from(clean).filter(ch => /\p{Script=Han}/u.test(ch));

  return chars.map(ch => {
    const item = decompData[ch];
    if (item) return item;
    return {
      character: ch,
      pinyin: '',
      hanviet: '',
      components: [],
      formula: ch
    };
  });
}
