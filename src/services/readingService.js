/**
 * readingService.js
 * Data access and caching for Graded Readings (450 stories across HSK 1-9).
 */

let manifestCache = null;
const storyCache = new Map();

/**
 * Fetch all available graded readings metadata
 * @returns {Promise<Array>}
 */
export async function fetchReadingsManifest() {
  if (manifestCache) return manifestCache;

  try {
    const res = await fetch('database/readings/manifest.json');
    if (!res.ok) throw new Error(`Failed to load readings manifest (${res.status})`);
    manifestCache = await res.json();
    return manifestCache;
  } catch (err) {
    console.error('Error loading readings manifest:', err);
    return [];
  }
}

/**
 * Fetch a specific story by file path
 * @param {string} storyPath - e.g. "database/readings/hsk1/hsk1_story_001.json"
 * @returns {Promise<Object>}
 */
export async function fetchStory(storyPath) {
  if (!storyPath) return null;

  if (storyCache.has(storyPath)) {
    return storyCache.get(storyPath);
  }

  const res = await fetch(storyPath);
  if (!res.ok) throw new Error(`Failed to load story (${res.status})`);

  const story = await res.json();
  storyCache.set(storyPath, story);
  return story;
}
