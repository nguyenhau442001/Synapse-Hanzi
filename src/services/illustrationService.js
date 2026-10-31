/**
 * illustrationService.js
 * In-memory vector illustration loader & cache for zero-latency card reveal.
 */

const svgMemoryCache = new Map();
const loadedPacks = new Set();
const inFlightPacks = new Map();

/**
 * Aesthetic fallback SVG generator based on Part of Speech
 */
function generateFallbackSvg(meaning = '') {
  return `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="76" fill="currentColor" fill-opacity="0.04" />
    <circle cx="100" cy="100" r="72" stroke="currentColor" stroke-opacity="0.2" stroke-width="1.5" stroke-dasharray="4 4" />
    <path d="M60 100C60 78 78 60 100 60C122 60 140 78 140 100C140 122 122 140 100 140" stroke="var(--brand-primary, #c05624)" stroke-width="6" stroke-linecap="round" />
    <circle cx="100" cy="100" r="16" fill="var(--brand-primary, #c05624)" fill-opacity="0.25" />
    <circle cx="100" cy="100" r="8" fill="var(--brand-primary, #c05624)" />
  </svg>`;
}

/**
 * Load pre-bundled level illustration SVG pack
 * @param {string} levelKey - e.g. 'hsk1'
 * @returns {Promise<boolean>}
 */
export async function loadLevelIllustrations(levelKey) {
  if (!levelKey) return false;
  const key = String(levelKey).toLowerCase().trim();

  if (loadedPacks.has(key)) return true;
  if (inFlightPacks.has(key)) return inFlightPacks.get(key);

  const p = (async () => {
    try {
      const res = await fetch(`database/illustrations/${key}.json`);
      if (!res.ok) return false;

      const pack = await res.json();
      if (!pack || typeof pack !== 'object') return false;

      for (const [hanzi, svgText] of Object.entries(pack)) {
        if (svgText) {
          svgMemoryCache.set(hanzi, svgText);
        }
      }

      loadedPacks.add(key);
      return true;
    } catch (e) {
      return false;
    } finally {
      inFlightPacks.delete(key);
    }
  })();

  inFlightPacks.set(key, p);
  return p;
}

/**
 * Retrieve illustration configuration for a vocabulary word
 * @param {Object} word
 * @returns {{ type: 'svg' | 'img', content: string }}
 */
export function getWordIllustration(word) {
  if (!word) return { type: 'svg', content: generateFallbackSvg() };

  // 1. Explicit SVG or image on word
  if (word.image) {
    if (typeof word.image === 'string' && word.image.startsWith('<svg')) {
      return { type: 'svg', content: word.image };
    }
    return { type: 'img', content: word.image };
  }

  const hanzi = (word.hanzi || word.word || '').trim();
  if (!hanzi) return { type: 'svg', content: generateFallbackSvg() };

  // 2. Check RAM Cache (0ms instant render)
  if (svgMemoryCache.has(hanzi)) {
    return { type: 'svg', content: svgMemoryCache.get(hanzi) };
  }

  // 3. Fallback to flat vector file in assets/images/illustrations/
  return {
    type: 'img',
    content: `assets/images/illustrations/${encodeURIComponent(hanzi)}.svg`
  };
}
