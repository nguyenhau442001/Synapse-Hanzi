// Renders the Reading Analysis island for every HSK 4 entry in both modes (practice / breakdown)
// to catch data shapes that break rendering. Run by tests/test_reading_views.py.
import fs from 'node:fs';
import { createServer } from 'vite';
import { h } from 'preact';
import { renderToString } from 'preact-render-to-string';

const data = JSON.parse(fs.readFileSync('database/reading/hsk4_reading_analysis.json', 'utf8'));
const element = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, scrollIntoView() {} });
globalThis.window = globalThis;
globalThis.location = { search: '?tab=reading', pathname: '/' };
globalThis.scrollTo = () => {};
globalThis.document = {
  getElementById: () => element(),
  querySelectorAll: () => [],
  body: element(),
  addEventListener() {}
};
globalThis.fetch = async () => ({ ok: true, json: async () => data });

const server = await createServer({ configFile: false, logLevel: 'error', server: { middlewareMode: true }, esbuild: { jsx: 'automatic', jsxImportSource: 'preact' } });
try {
  const mod = await server.ssrLoadModule('/src/islands/ReadingAnalysis.jsx');
  await mod.startReadingAnalysis();
  let rendered = 0;
  for (let i = 0; i < data.length; i++) {
    mod.jumpToReadingIndex(i);
    for (const mode of ['practice', 'breakdown']) {
      mod.setReadingActiveMode(mode);
      const html = renderToString(h(mod.ReadingAnalysisScreen, {}));
      if (!html.includes(`Câu ${i + 1}/${data.length}`)) throw new Error(`entry ${i} (${mode}) did not render its header`);
      if (/undefined/.test(html)) throw new Error(`entry ${i} (${mode}) renders "undefined"`);
      rendered++;
    }
  }
  console.log(`Rendered ${data.length} entries x 2 modes (${rendered} renders) successfully.`);
} finally {
  await server.close();
}
