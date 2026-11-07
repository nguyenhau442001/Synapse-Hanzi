// Study sidebar: color-coded S/V/O/M sentence breakdown + grammar note for the active word.
// Preact port of the former assets/js/grammar-breakdown.js with the same markup.
import { render } from 'preact';
import { signal } from '@preact/signals';
import { onDomReady } from './domReady';

/* global activeStudyWord -- state.js */

const ROLE_LABELS = { S: 'Chủ ngữ', V: 'Vị ngữ', O: 'Tân ngữ', M: 'Bổ nghĩa' };

let starterData = null;
let starterDataPromise = null;
const entry = signal(null); // starter sentence for the active word, or null (panel hidden)

function loadStarterData() {
  if (starterDataPromise) return starterDataPromise;
  starterDataPromise = fetch('database/grammar/starter_sentences.json')
    .then((r) => r.json())
    .then((data) => { starterData = data; return data; })
    .catch(() => { starterData = []; return []; });
  return starterDataPromise;
}

const currentWord = () => (typeof activeStudyWord !== 'undefined' ? activeStudyWord : null);

export function updateGrammarBreakdown(word) {
  if (!word) {
    entry.value = null;
    return;
  }
  if (!starterData) {
    entry.value = null;
    loadStarterData().then(() => {
      const active = currentWord();
      if (active && active.hanzi === word.hanzi) updateGrammarBreakdown(active);
    });
    return;
  }
  entry.value = starterData.find((e) => e.hanzi === word.hanzi) || null;
}

function GrammarBreakdownBody() {
  const e = entry.value;
  return (
    <>
      {e && (
        <>
          <div class="grammar-sentence">
            {e.roles.map((r, i) => <span key={i} class={`grammar-role grammar-role-${r.type}`} title={ROLE_LABELS[r.type] || r.type}>{r.text}</span>)}
          </div>{' '}
          <div class="grammar-note-card">
            <div class="grammar-note-pattern">{e.grammar_point.pattern}</div>{' '}
            <div class="grammar-note-text">{e.grammar_point.note}</div>
          </div>
        </>
      )}
    </>
  );
}

export function mountGrammarBreakdown() {
  window.updateGrammarBreakdown = updateGrammarBreakdown;
  onDomReady(() => {
    const mount = document.getElementById('workstationRight') || document.getElementById('screenCards');
    if (!mount) return;
    const wrap = document.createElement('div');
    wrap.className = 'grammar-breakdown-panel';
    const title = document.createElement('div');
    title.className = 'sidebar-panel-title';
    title.textContent = 'Phân tích ngữ pháp';
    wrap.appendChild(title);
    const body = document.createElement('div');
    body.id = 'grammarBreakdownBody';
    wrap.appendChild(body);
    // Same slot as before: right after the word-companion panel.
    const anchor = mount.querySelector(':scope > #wordCompanionWrap');
    if (anchor) anchor.after(wrap);
    else mount.appendChild(wrap);

    render(<GrammarBreakdownBody />, body);
    entry.subscribe((e) => { wrap.hidden = !e; });
    window.onActiveWordChange(updateGrammarBreakdown);
    updateGrammarBreakdown(currentWord());
  });
}
