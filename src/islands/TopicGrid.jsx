// Topic tab: dynamic grid of topic decks, reusing the LEVELS/selectLevel pipeline.
// Preact island port replacing legacy assets/js/topics.js.

/* global TOPICS, readSavedLevelProgress, formatProgressPercent, selectLevel */

export function topicKnownCount(topicKey) {
  const data = typeof readSavedLevelProgress === 'function' ? readSavedLevelProgress(topicKey) : {};
  return Object.values(data).filter(status => status === 'known').length;
}

export function renderTopicGrid() {
  const grid = document.getElementById('topicGrid');
  if (!grid || typeof TOPICS === 'undefined') return;
  const keys = Object.keys(TOPICS);
  if (keys.length === 0) {
    grid.innerHTML = '<div class="loading-text">Chưa có chủ đề nào.</div>';
    return;
  }
  grid.innerHTML = keys.map(key => {
    const topic = TOPICS[key];
    const known = topicKnownCount(key);
    const rawPct = topic.total > 0 ? (known / topic.total * 100) : 0;
    const pctStr = typeof formatProgressPercent === 'function'
      ? formatProgressPercent(known, topic.total)
      : `${Math.round(rawPct)}%`;
    return `
      <button class="level-card" type="button" ${topic.available ? `onclick="selectLevel('${key}')"` : 'disabled'}>
        <div class="lvl-num">${topic.icon || '🏷️'}</div>
        <div class="lvl-label">${topic.label}</div>
        <div class="lvl-count">${topic.total} từ</div>
        <div class="lvl-mastery-track"><div class="lvl-mastery-fill" style="width:${known > 0 ? Math.max(rawPct, 0.75) : 0}%"></div></div>
        <div class="lvl-mastery-text">${known} / ${topic.total} đã nhớ (${pctStr})</div>
      </button>`;
  }).join('');
}

export function mountTopicGrid() {
  window.topicKnownCount = topicKnownCount;
  window.renderTopicGrid = renderTopicGrid;
}
