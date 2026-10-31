/**
 * radicalsService.js
 * Data loader and search for Chinese Radicals (214 Kangxi Radicals & 50 Core Radicals).
 */

const radicalsCache = new Map();

/**
 * Fetch all radicals for a given collection ('kangxi' or 'basic')
 * @param {'kangxi' | 'basic'} type
 * @returns {Promise<Array>}
 */
export async function fetchRadicals(type = 'kangxi') {
  if (radicalsCache.has(type)) {
    return radicalsCache.get(type);
  }

  const folder = type === 'basic' ? 'basic_50_radicals' : 'kangxi_214_radicals';
  const maxStrokes = type === 'basic' ? 10 : 17;

  const promises = [];
  for (let s = 1; s <= maxStrokes; s++) {
    const pad = String(s).padStart(2, '0');
    const url = `database/radicals/${folder}/stroke_${pad}.json`;
    promises.push(
      fetch(url)
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
    );
  }

  const results = await Promise.all(promises);
  const allRadicals = results.flat().sort((a, b) => (a.id || 0) - (b.id || 0));

  radicalsCache.set(type, allRadicals);
  return allRadicals;
}
