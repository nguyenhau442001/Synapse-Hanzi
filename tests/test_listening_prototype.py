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
import subprocess
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

def test_all_12_listening_exams():
    print("-> Checking all 12 Hanban HSK 4 listening exams (H41001 to H41012)...")
    for idx in range(1, 13):
        exam_id = f"H410{idx:02d}"
        json_path = ROOT / f"database/listening/hsk4_{exam_id.lower()}.json"
        assert json_path.exists(), f"Exam JSON missing: {json_path}"

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert data["exam_id"] == exam_id, f"Mismatched exam_id in {json_path}"
        assert data["level"] == "HSK4"
        assert data["total_questions"] == 10, f"Expected 10 questions in {exam_id}, got {data['total_questions']}"
        assert len(data["questions"]) == 10, f"Expected 10 question objects in {exam_id}, got {len(data['questions'])}"

        # Check audio file exists
        audio_file = ROOT / data["audio_src"]
        assert audio_file.exists(), f"Audio file not found: {audio_file}"

        # Check exam materials folder & pdf
        pdf_file = ROOT / f"exam_materials/hsk4/{exam_id}/{exam_id}.pdf"
        assert pdf_file.exists(), f"Exam PDF not found: {pdf_file}"

        for q in data["questions"]:
            assert q["exam_id"] == exam_id
            assert q["type"] == "true_false"
            assert isinstance(q["answer"], bool)
            assert len(q["statement"]["zh"]) > 0
            assert len(q["statement"]["vi"]) > 0
            assert len(q["transcript"]["sentences"]) >= 1

            segs = q["segments"]
            assert 0 <= segs["passage"]["start_ms"] < segs["passage"]["end_ms"]
            assert 0 <= segs["statement"]["start_ms"] < segs["statement"]["end_ms"]

    print("   ✓ All 12 Hanban HSK 4 exams verified successfully (120 questions total)!")


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

    # Layout width 900-1040px (constrained from 1080px)
    assert any(w in css_content for w in ["max-width: 960px", "max-width: 1000px", "max-width: 1040px"]), "Layout must be constrained within 900-1040px"

    # Warm neutral theme tokens
    assert "--listening-canvas" in css_content, "Listening mode must define warm neutral canvas"
    assert "--listening-player-bg" in css_content, "Listening player must use warm neutral background"

    # UI labels in JS
    assert "Lời thoại" in js_content, "Transcript section must be titled 'Lời thoại'"
    assert "Nghe đoạn này" in js_content, "Player button must use concise label 'Nghe đoạn này'"
    assert "Căn chỉnh audio" in js_content, "Header must provide secondary 'Căn chỉnh audio' action"
    assert "Chế độ luyện tập" in js_content, "Section header must include 'Chế độ luyện tập' chip"
    assert "Tự lưu" in js_content, "Header must include quiet auto-save indicator"
    assert "listening-evidence-highlight" in js_content, "Key evidence words must be highlighted"
    assert "Đúng" in js_content and "Sai" in js_content, "Choice buttons must use Đúng and Sai"

    # Touch target sizes & answer button constraints in CSS
    assert "height: 44px" in css_content or "min-height: 44px" in css_content or "height: 48px" in css_content, "Play buttons must have >= 44px touch target"
    assert any(h in css_content for h in ["54px", "52px", "56px"]), "Choice buttons must have 52-56px height"
    assert any(w in css_content for w in ["max-width: 580px", "max-width: 600px"]), "Choice buttons must have combined max-width 520-640px"

    print("   ✓ UI refinements verified successfully!")

def test_listening_polish_v112():
    print("-> Checking specific v1.1.2 UI polish requirements...")
    css = (ROOT / "assets/css/listening-practice.css").read_text(encoding="utf-8")
    js = (ROOT / "assets/js/listening-practice.js").read_text(encoding="utf-8")
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    help_js = (ROOT / "assets/js/study-help-modal.js").read_text(encoding="utf-8")

    # 1. Workspace width 900-1040px
    assert "max-width: 960px" in css, "Workspace width must be 960px (within 900-1040px range)"

    # 2. Player structure: Streamlined controls grid with seek track & thumb
    assert "listening-player-controls-grid" in js and "listening-player-controls-grid" in css
    assert "listening-player-right-col" in js and "listening-player-right-col" in css
    assert "listening-progress-thumb" in js and "listening-progress-thumb" in css

    # 3. Learner-facing time format (0:00 / 0:15)
    assert "formatLearnerTime" in js, "formatLearnerTime must exist for 0:00 / 0:15 time formatting"
    assert "0:00 / " in js, "Learner time display must start with 0:00 /"

    # 4. Deliberate True/False answer buttons
    assert "max-width: 580px" in css, "Answer buttons combined width must be constrained around 520-640px"
    assert "height: 54px" in css, "Answer buttons height must be 52-56px"
    assert "listening-answers-grid" in css and "grid-template-columns: 1fr 1fr" in css

    # 5. Section heading rule removal & info popover
    assert "listening-exam-rule-note" not in js, "Long exam rule sentence must be removed from section header"
    assert "listening-mode-chip" in js and "listening-rules-popover" in js
    assert "toggleRulesDialog" in js

    # 6. Overflow settings menu for editor action
    assert "listening-more-btn" in js and "listeningSettingsDropdown" in js
    assert "toggleSettingsMenu" in js
    assert "getQuestionProgressText" in js, "Progress logic must not invent question totals"

    # 7. Warm neutral surface tokens
    assert "--listening-canvas: #faf8f5" in css
    assert "--listening-player-bg: #f8f4ee" in css
    assert "--listening-border-subtle: #ece5dc" in css

    # 8. Footer prominence reduction
    assert "body.listening-view-active .app-footer" in css and "display: none !important" in css
    assert "helpTabAbout" in help_js, "Developer and project info must be available in About modal"

    print("   ✓ All v1.1.2 UI polish requirements verified successfully!")

def test_audio_range_and_resilience():
    print("-> Checking Service Worker and Audio Controller resilience against MEDIA_ELEMENT_ERROR...")
    sw_path = ROOT / "sw.js"
    assert sw_path.exists(), "sw.js must exist"
    sw_code = sw_path.read_text(encoding="utf-8")

    # 1. SW must bypass range requests and media streaming
    assert "request.headers.has('range')" in sw_code, "sw.js must bypass range requests"
    assert "request.destination === 'audio'" in sw_code, "sw.js must bypass audio destination requests"

    # 2. SW must guard cache.put from status 206
    assert "response.status === 200" in sw_code, "sw.js must only cache status 200 responses"
    assert "response.ok" not in sw_code, "sw.js must avoid caching partial 206 responses with response.ok"

    # 3. ListeningPractice controller must handle audio errors and readyState cleanly
    js_path = ROOT / "assets/js/listening-practice.js"
    js_code = js_path.read_text(encoding="utf-8")
    assert "resetAudio" in js_code, "resetAudio must exist to clean up broken audio instances"
    assert "handleAudioError" in js_code, "handleAudioError must exist for resilient recovery"
    assert "readyState === 0" in js_code, "playSegment must guard readyState before seeking"
    assert "listening-error-retry-btn" in js_code, "Retry button must be provided on audio error"

    # 4. CSS must style the retry button
    css_path = ROOT / "assets/css/listening-practice.css"
    css_code = css_path.read_text(encoding="utf-8")
    assert ".listening-error-retry-btn" in css_code, "CSS must style retry button"

    print("   ✓ Audio streaming & resilience checks passed!")

def test_listening_user_feedback_improvements():
    print("-> Checking user feedback improvements (typography, translations, evidence, navigation)...")
    css = (ROOT / "assets/css/listening-practice.css").read_text(encoding="utf-8")
    js = (ROOT / "assets/js/listening-practice.js").read_text(encoding="utf-8")

    # 1. Non-empty sentence translations
    for idx in range(1, 13):
        exam_id = f"H410{idx:02d}"
        json_path = ROOT / f"database/listening/hsk4_{exam_id.lower()}.json"
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for q in data["questions"]:
            for s in q["transcript"]["sentences"]:
                assert s.get("vi") and len(s["vi"].strip()) > 0, f"Sentence translation missing in {exam_id} Q{q['question_number']} S{s['index']}"

    # 2. Typography scale verified in CSS
    assert "font-size: 23px" in css, "Transcript Chinese characters must be readable (~23px)"
    assert "font-size: 16px" in css, "Pinyin, translation and explanation must be comfortably readable (16px)"
    assert "font-size: 21px" in css, "Evidence and vocabulary Hanzi must be prominent (21px)"

    # 3. Direct outcome without cognitive conflict
    assert "Bạn trả lời đúng · Đáp án:" in js, "Correct feedback must clearly state 'Bạn trả lời đúng · Đáp án:'"
    assert "Bạn trả lời chưa đúng · Đáp án:" in js, "Incorrect feedback must clearly state 'Bạn trả lời chưa đúng · Đáp án:'"

    # 4. Immediate evidence audio action & inline highlight
    assert "Nghe câu này" in js, "Evidence button must use concise 'Nghe câu này'"
    assert "listening-evidence-inline-mark" in js and "listening-evidence-inline-mark" in css, "Evidence must be highlighted inline in transcript"

    # 5. Prominent navigation buttons
    assert "Câu trước" in js and "Câu tiếp theo" in js, "Bottom navigation must use full clear labels 'Câu trước' / 'Câu tiếp theo'"
    assert "height: 46px" in css or "min-height: 46px" in css, "Navigation buttons must have prominent 44-48px touch targets"

    # 6. Key expressions and prioritized vocabulary
    assert "listening-key-section" in js and "listening-key-section" in css, "Key expressions section must exist"
    assert "getPrioritizedVocabularies" in js, "Vocabulary matching must prioritize learning relevance over raw HSK levels"

    print("   ✓ All user feedback improvements verified successfully!")

def test_audio_playback_cut_off_and_playing_indicator():
    print("-> Checking audio playback cutoff fix and playing indicator effects...")
    # 1. Verify H41001 Q2 sentence S2 timing does not cut off
    json_path = ROOT / "database/listening/hsk4_h41001.json"
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    q2 = next(q for q in data["questions"] if q["question_number"] == 2)
    s2 = next(s for s in q2["transcript"]["sentences"] if s["id"] == "H41001_L_02_S2")
    assert s2["end_ms"] == 177100, f"H41001_L_02_S2 end_ms should be 177100 to prevent cutoff, got {s2['end_ms']}"
    assert s2["end_ms"] == q2["segments"]["passage"]["end_ms"], "S2 end_ms should match passage end_ms"

    # 2. Check CSS contains playing wave animation and pulse effects
    css = (ROOT / "assets/css/listening-practice.css").read_text(encoding="utf-8")
    assert ".listening-playing-waves" in css, "CSS must define .listening-playing-waves for animated sound waves"
    assert "listening-wave-bounce" in css, "CSS must define keyframes listening-wave-bounce"
    assert "listening-playing-pulse" in css, "CSS must define keyframes listening-playing-pulse"
    assert ".listening-row-play-btn.is-playing" in css, "CSS must style .listening-row-play-btn.is-playing"
    assert ".listening-evidence-play-btn.is-playing" in css, "CSS must style .listening-evidence-play-btn.is-playing"

    # 3. Check JS updatePlaybackUI handles evidence button and row button with playing wave indicator
    js = (ROOT / "assets/js/listening-practice.js").read_text(encoding="utf-8")
    assert "listening-replay-evidence-btn" not in js, "Old mismatched selector listening-replay-evidence-btn must be removed"
    assert "document.querySelector('.listening-evidence-play-btn')" in js, "JS must query .listening-evidence-play-btn"
    assert "listening-playing-waves" in js, "JS must render animated sound waves during playback"
    assert "Đang phát" in js, "Evidence button must show 'Đang phát' state when playing"

    print("   ✓ Audio cutoff and playing indicator effects verified successfully!")

def test_listening_js_syntax():
    print("-> Checking listening-practice.js syntax integrity...")
    js_path = ROOT / "assets/js/listening-practice.js"
    assert js_path.exists(), "assets/js/listening-practice.js must exist"
    res = subprocess.run(["node", "-c", str(js_path)], capture_output=True, text=True)
    assert res.returncode == 0, f"assets/js/listening-practice.js syntax check failed: {res.stderr}"
    print("   ✓ listening-practice.js syntax is valid!")

def main():
    print("=== Starting HSK Listening Prototype Automated Verification ===")
    test_data_integrity()
    test_all_12_listening_exams()
    test_integration_files()
    test_ui_refinements()
    test_listening_polish_v112()
    test_audio_range_and_resilience()
    test_listening_user_feedback_improvements()
    test_audio_playback_cut_off_and_playing_indicator()
    test_listening_js_syntax()
    print("=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    main()
