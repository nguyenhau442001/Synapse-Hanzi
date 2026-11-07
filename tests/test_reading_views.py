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
    js_file = ROOT / "src/islands/ReadingAnalysis.jsx"
    assert js_file.exists(), "ReadingAnalysis.jsx (Preact island) not found"
    content = js_file.read_text(encoding="utf-8")

    # The practice panels render from the current entry; the old missing helper must not come back
    assert "<PracticePanels entry={entry} />" in content
    assert "renderInteractiveExerciseForm" not in content

def test_tools_menu_contains_reading_tools():
    index_html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert 'id="primaryGamesMenu"' in index_html
    assert 'onclick="setPrimaryTab(\'gradedReading\')"' in index_html
    assert 'onclick="setPrimaryTab(\'reading\')"' in index_html
    assert 'id="screenReadingAnalysis"' in index_html
    assert 'id="screenGradedReading"' in index_html

def test_node_vm_reading_entries():
    # Renders the island for all 135 entries in practice and breakdown modes (Vite SSR + render-to-string)
    res = subprocess.run(["node", "tests/node/render_reading_analysis.mjs"], cwd=str(ROOT), capture_output=True, text=True, timeout=300)
    assert res.returncode == 0, f"Node render test failed:\n{res.stdout}\n{res.stderr}"
    assert "Rendered 135 entries" in res.stdout

if __name__ == "__main__":
    print("Running test_reading_views...")
    test_reading_analysis_syntax_and_references()
    print("  ✓ ReadingAnalysis.jsx references valid")
    test_tools_menu_contains_reading_tools()
    print("  ✓ index.html tools menu contains reading tools")
    test_node_vm_reading_entries()
    print("  ✓ Reading analysis island rendered all 135 items")
    print("All reading tests passed!")
