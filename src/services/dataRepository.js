/**
 * dataRepository.js
 * Centralized data access layer for HSK vocabularies, audio manifests and reading packs.
 */

export const LEVELS_CONFIG = {
  // HSK 2.0
  hsk1: { id: 'hsk1', label: 'HSK 1', version: '2.0', dataUrl: 'database/vocabs/hsk1_vocabularies.json', audioManifestUrl: 'database/prebuilt_audio/hsk1/manifest.json', total: 150 },
  hsk2: { id: 'hsk2', label: 'HSK 2', version: '2.0', dataUrl: 'database/vocabs/hsk2_vocabularies.json', audioManifestUrl: 'database/prebuilt_audio/hsk2/manifest.json', total: 150 },
  hsk3: { id: 'hsk3', label: 'HSK 3', version: '2.0', dataUrl: 'database/vocabs/hsk3_vocabularies.json', audioManifestUrl: 'database/prebuilt_audio/hsk3/manifest.json', total: 300 },
  hsk4: { id: 'hsk4', label: 'HSK 4', version: '2.0', dataUrl: 'database/vocabs/hsk4_vocabularies.json', audioManifestUrl: 'database/prebuilt_audio/hsk4/manifest.json', total: 600 },
  hsk5: { id: 'hsk5', label: 'HSK 5', version: '2.0', dataUrl: 'database/vocabs/hsk5_vocabularies.json', total: 1300 },
  hsk6: { id: 'hsk6', label: 'HSK 6', version: '2.0', dataUrl: 'database/vocabs/hsk6_vocabularies.json', total: 2500 },

  // HSK 3.0
  hsk30_1: { id: 'hsk30_1', label: 'HSK 3.0 – 1', band: 'Sơ cấp', version: '3.0', dataUrl: 'database/vocabs/hsk3_0/level1_vocabularies.json', total: 300 },
  hsk30_2: { id: 'hsk30_2', label: 'HSK 3.0 – 2', band: 'Sơ cấp', version: '3.0', dataUrl: 'database/vocabs/hsk3_0/level2_vocabularies.json', total: 200 },
  hsk30_3: { id: 'hsk30_3', label: 'HSK 3.0 – 3', band: 'Sơ cấp', version: '3.0', dataUrl: 'database/vocabs/hsk3_0/level3_vocabularies.json', total: 500 },
  hsk30_4: { id: 'hsk30_4', label: 'HSK 3.0 – 4', band: 'Trung cấp', version: '3.0', dataUrl: 'database/vocabs/hsk3_0/level4_vocabularies.json', total: 1000 },
  hsk30_5: { id: 'hsk30_5', label: 'HSK 3.0 – 5', band: 'Trung cấp', version: '3.0', dataUrl: 'database/vocabs/hsk3_0/level5_vocabularies.json', total: 1600 },
  hsk30_6: { id: 'hsk30_6', label: 'HSK 3.0 – 6', band: 'Trung cấp', version: '3.0', dataUrl: 'database/vocabs/hsk3_0/level6_vocabularies.json', total: 1800 },
  hsk30_7: { id: 'hsk30_7', label: 'HSK 3.0 – 7', band: 'Cao cấp', version: '3.0', dataUrl: 'database/vocabs/hsk3_0/level7_vocabularies.json', total: 5600 },
  hsk30_8: { id: 'hsk30_8', label: 'HSK 3.0 – 8', band: 'Cao cấp', version: '3.0', dataUrl: 'database/vocabs/hsk3_0/level8_vocabularies.json', total: 5600 },
  hsk30_9: { id: 'hsk30_9', label: 'HSK 3.0 – 9', band: 'Cao cấp', version: '3.0', dataUrl: 'database/vocabs/hsk3_0/level9_vocabularies.json', total: 5600 },

  // Topics
  topic_it: { id: 'topic_it', label: 'Công nghệ thông tin', icon: '💻', version: 'topic', dataUrl: 'database/vocabs/topics/it.json', total: 60 }
};

// In-memory cache for loaded vocabulary lists and audio manifests
const vocabCache = new Map();
const audioManifestCache = new Map();

/**
 * Get all available levels formatted as a list
 */
export function getLevelsList() {
  return Object.values(LEVELS_CONFIG);
}

/**
 * Fetch vocabulary data for a given level with in-memory caching
 * @param {string} levelKey - e.g. 'hsk1'
 * @returns {Promise<Array>}
 */
export async function fetchVocabulary(levelKey) {
  if (!levelKey || !LEVELS_CONFIG[levelKey]) {
    throw new Error(`Invalid level: ${levelKey}`);
  }

  if (vocabCache.has(levelKey)) {
    return vocabCache.get(levelKey);
  }

  const cfg = LEVELS_CONFIG[levelKey];
  const response = await fetch(cfg.dataUrl);
  if (!response.ok) {
    throw new Error(`Failed to load vocabulary for ${levelKey} (${response.status})`);
  }

  const words = await response.json();
  vocabCache.set(levelKey, words);
  return words;
}

/**
 * Fetch prebuilt audio manifest for a given level
 * @param {string} levelKey
 * @returns {Promise<Object|null>}
 */
export async function fetchAudioManifest(levelKey) {
  const cfg = LEVELS_CONFIG[levelKey];
  if (!cfg || !cfg.audioManifestUrl) return null;

  if (audioManifestCache.has(levelKey)) {
    return audioManifestCache.get(levelKey);
  }

  try {
    const res = await fetch(cfg.audioManifestUrl);
    if (!res.ok) return null;
    const data = await res.json();
    audioManifestCache.set(levelKey, data);
    return data;
  } catch (err) {
    return null;
  }
}
