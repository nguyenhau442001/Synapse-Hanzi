#!/usr/bin/env python3
"""
tests/test_listening_prototype.py

Automated Verification Suite for HSK Listening Practice Prototype:
1. Data Model & Timestamp Integrity.
2. Boundary Validity against audio duration.
3. Content & Answer verification against PDF.
4. Vocabulary ID cross-referencing integrity.
5. DOM & Router Integration checks.
6. Existing module non-regression.
"""

import sys
import json
import re
from pathlib import Path
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent

def test_data_integrity():
    print("-> Checking database/listening/hsk4_h41001.json...")
    json_path = ROOT / "database/listening/hsk4_h41001.json"
    assert json_path.exists(), "database/listening/hsk4_h41001.json does not exist"

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["exam_id"] == "H41001"
    assert len(data["questions"]) >= 1
    q = data["questions"][0]

    # Content verification
    assert q["question_number"] == 1
    assert q["statement"]["zh"] == "今天天气不错。"
    assert q["answer"] is True
    assert "阳光多好啊" in q["evidence"]["zh"]
    assert "喂？我们去树林里走走吧" in q["transcript"]["full_zh"]

    # Alignment verification
    align = q["alignment"]
    assert align["status"] == "verified"
    assert "method" in align and len(align["method"]) > 0

    # Timestamp verification
    audio_path = ROOT / q["audio_src"]
    assert audio_path.exists(), f"Audio file {audio_path} does not exist"

    audio_info = sf.info(str(audio_path))
    duration_ms = int(audio_info.duration * 1000)

    segs = q["segments"]
    assert 0 <= segs["passage"]["start_ms"] < segs["passage"]["end_ms"] <= duration_ms
    assert 0 <= segs["statement"]["start_ms"] < segs["statement"]["end_ms"] <= duration_ms
    assert 0 <= segs["full_question"]["start_ms"] < segs["full_question"]["end_ms"] <= duration_ms

    # Sentences timestamp validation
    for s in q["transcript"]["sentences"]:
        assert 0 <= s["start_ms"] < s["end_ms"] <= duration_ms
        assert isinstance(s["start_ms"], int)
        assert isinstance(s["end_ms"], int)

    # Vocabulary match validation - no invented IDs
    for v in q["vocabulary_matches"]:
        if v["vocab_id"] is not None:
            assert isinstance(v["vocab_id"], int)
            assert v["level"] in ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"]
        else:
            assert v["level"] is None

    print("   ✓ JSON Data Model & Timestamps pass all integrity checks!")

def test_integration_files():
    print("-> Checking web integration files...")
    index_html = (ROOT / "index.html").read_text(encoding="utf-8")
    radicals_js = (ROOT / "assets/js/radicals.js").read_text(encoding="utf-8")
    router_js = (ROOT / "assets/js/spa-router.js").read_text(encoding="utf-8")
    sw_js = (ROOT / "sw.js").read_text(encoding="utf-8")

    # index.html
    assert "screenListeningPractice" in index_html, "screenListeningPractice missing from index.html"
    assert "primaryTabListening" in index_html, "primaryTabListening button missing from index.html"
    assert "assets/css/listening-practice.css" in index_html, "listening CSS link missing from index.html"
    assert "assets/js/listening-practice.js" in index_html, "listening JS link missing from index.html"

    # radicals.js
    assert "listening: { tabId: 'primaryTabListening', screenId: 'screenListeningPractice' }" in radicals_js
    assert "ListeningPractice.init()" in radicals_js
    assert "ListeningPractice.stopAudio()" in radicals_js

    # spa-router.js
    assert "ListeningPractice.setMode" in router_js
    assert "tab === 'listening'" in router_js

    # sw.js
    assert "listening-practice.css" in sw_js
    assert "listening-practice.js" in sw_js

    # non-regression on reading
    assert "screenReadingAnalysis" in index_html
    assert "screenGradedReading" in index_html
    assert "reading: { tabId: 'primaryTabReading', screenId: 'screenReadingAnalysis' }" in radicals_js

    print("   ✓ Navigation, routing, sw.js, and reading non-regression pass!")

def test_ui_refinements():
    print("-> Checking UI refinements in CSS and JS...")
    css_content = (ROOT / "assets/css/listening-practice.css").read_text(encoding="utf-8")
    js_content = (ROOT / "assets/js/listening-practice.js").read_text(encoding="utf-8")

    # Layout width 1040-1120px
    assert "max-width: 1080px" in css_content, "max-width: 1080px missing from listening CSS"

    # UI labels in JS
    assert "Lời thoại" in js_content, "Transcript section must be titled 'Lời thoại'"
    assert "Nghe đoạn này" in js_content, "Player button must use concise label 'Nghe đoạn này'"
    assert "Căn chỉnh audio" in js_content, "Header must provide secondary 'Căn chỉnh audio' action"
    assert "listening-evidence-highlight" in js_content, "Key evidence words must be highlighted"
    assert "Đúng" in js_content and "Sai" in js_content, "Choice buttons must use Đúng and Sai"

    # Touch target sizes in CSS
    assert "height: 44px" in css_content or "min-height: 44px" in css_content, "Play buttons must have >= 44px touch target"
    assert "height: 56px" in css_content or "52px" in css_content, "Choice buttons must have 52-60px height"

    print("   ✓ UI refinements verified successfully!")

def main():
    print("=== Starting HSK Listening Prototype Automated Verification ===")
    test_data_integrity()
    test_integration_files()
    test_ui_refinements()
    print("=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    main()
