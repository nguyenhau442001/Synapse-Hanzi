#!/usr/bin/env python3
"""
tests/test_study_help_modal.py

Verification suite for Study Help & Guide modal (Hướng dẫn & Trợ giúp học tập):
1. Verifies CSS syntax, braces balance, and modal layout dimensions (max-width bounded to 720px).
2. Verifies tab navigation (.study-help-nav) supports fluid horizontal scrolling with flex-shrink: 0.
3. Verifies all 5 tabs (shortcuts, method, features, faq, about) are present and correctly mapped.
4. Verifies active tab scroll-into-view behavior to prevent clipping of 'Giới thiệu' tab.
"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent

def test_study_help_modal_css_integrity():
    css_path = ROOT / "assets" / "css" / "study-help-modal.css"
    assert css_path.exists(), "study-help-modal.css file not found"

    content = css_path.read_text(encoding="utf-8")
    opens = content.count("{")
    closes = content.count("}")
    assert opens == closes, f"Mismatched braces in study-help-modal.css: {opens} opens vs {closes} closes"

    # Verify modal box dimensions
    assert "720px" in content, ".study-help-box should accommodate tabs comfortably (720px width limit)"

    # Verify tab navigation does not squash buttons and has smooth scrolling
    assert "flex-shrink: 0" in content, ".study-help-tab-btn should prevent shrinkage"
    assert "overflow-x: auto" in content, ".study-help-nav must allow horizontal scroll if needed"
    assert "scroll-behavior: smooth" in content, ".study-help-nav must have smooth scrolling"


def test_study_help_modal_js_tabs():
    js_path = ROOT / "assets" / "js" / "study-help-modal.js"
    assert js_path.exists(), "study-help-modal.js file not found"

    content = js_path.read_text(encoding="utf-8")

    # Check presence of all 5 tabs
    expected_tabs = [
        'data-tab="shortcuts"',
        'data-tab="method"',
        'data-tab="features"',
        'data-tab="faq"',
        'data-tab="about"'
    ]
    for tab in expected_tabs:
        assert tab in content, f"Missing tab trigger: {tab}"

    # Check presence of 'Giới thiệu' tab label
    assert "Giới thiệu" in content, "Missing 'Giới thiệu' tab label in navigation"
    assert 'id="helpTabAbout"' in content, "Missing #helpTabAbout section container"

    # Check scrollIntoView behavior when tab is switched
    assert "scrollIntoView" in content, "switchStudyHelpTab must ensure active tab button is scrolled into view"
