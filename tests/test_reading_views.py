#!/usr/bin/env python3
"""
tests/test_reading_views.py

Verification suite for Reading Analysis and Graded Reading:
1. Validates reading-analysis.js doesn't contain undefined function calls like renderInteractiveExerciseForm.
2. Validates reading entries render cleanly in Node.js VM.
3. Checks index.html navigation and Tools dropdown integration.
"""

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def test_reading_analysis_syntax_and_references():
    js_file = ROOT / "assets/js/reading-analysis.js"
    assert js_file.exists(), "reading-analysis.js not found"
    content = js_file.read_text(encoding="utf-8")

    # Ensure fixed function name
    assert "renderPracticePanelsHtml(currentEntry)" in content
    assert "renderInteractiveExerciseForm" not in content

def test_tools_menu_contains_reading_tools():
    index_html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert 'id="primaryGamesMenu"' in index_html
    assert 'onclick="setPrimaryTab(\'gradedReading\')"' in index_html
    assert 'onclick="setPrimaryTab(\'reading\')"' in index_html
    assert 'id="screenReadingAnalysis"' in index_html
    assert 'id="screenGradedReading"' in index_html

def test_node_vm_reading_entries():
    cmd = [
        "node", "-e",
        """
        const fs = require('fs');
        const vm = require('vm');
        const data = JSON.parse(fs.readFileSync('database/reading/hsk4_reading_analysis.json', 'utf8'));

        const context = {
          window: {
            location: { search: '?tab=reading', pathname: '/Synapse-Hanzi/' },
            scrollTo: () => {},
            addEventListener: () => {}
          },
          URLSearchParams: URLSearchParams,
          document: {
            getElementById: (id) => ({
              style: {},
              classList: { add: () => {}, remove: () => {}, toggle: () => {} },
              setAttribute: () => {},
              innerHTML: '',
              textContent: '',
              querySelector: () => ({ textContent: '' }),
              scrollIntoView: () => {}
            }),
            body: {
              classList: { add: () => {}, remove: () => {}, toggle: () => {} }
            },
            addEventListener: () => {}
          },
          localStorage: {
            getItem: () => null,
            setItem: () => {}
          },
          fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(data) }),
          console: console
        };
        context.global = context;
        vm.createContext(context);

        const code = fs.readFileSync('assets/js/reading-analysis.js', 'utf8');
        vm.runInContext(code, context);

        async function run() {
          await vm.runInContext('startReadingAnalysis()', context);
          const len = vm.runInContext('readingFilteredList.length', context);
          if (len !== 135) throw new Error('Expected 135 entries, got ' + len);
          for (let i = 0; i < len; i++) {
            vm.runInContext(`
              jumpToReadingIndex(${i});
              setReadingActiveMode('practice');
              setReadingActiveMode('breakdown');
            `, context);
          }
          console.log('Tested all ' + len + ' entries successfully.');
        }
        run().catch(err => {
          console.error(err);
          process.exit(1);
        });
        """
    ]
    res = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)
    assert res.returncode == 0, f"Node VM test failed:\n{res.stderr}"

if __name__ == "__main__":
    print("Running test_reading_views...")
    test_reading_analysis_syntax_and_references()
    print("  ✓ reading-analysis.js syntax & references valid")
    test_tools_menu_contains_reading_tools()
    print("  ✓ index.html tools menu contains reading tools")
    test_node_vm_reading_entries()
    print("  ✓ Node VM successfully executed reading analysis on all 135 items")
    print("All reading tests passed!")
