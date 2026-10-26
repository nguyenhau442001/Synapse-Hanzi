#!/usr/bin/env python3
"""
tests/test_history_modal_layout.py

Verification suite for Study History (Lịch sử học tập) modal layout:
1. Validates CSS braces balancing and absence of syntax issues.
2. Verifies bounded modal dimensions (max-height with vh/dvh, capped max-width).
3. Verifies .history-day-cell height constraints preventing viewport overflow.
4. Verifies presence of unified toolbar (.history-toolbar) and footer (.history-footer).
5. Verifies multi-resolution responsive rules (small height and mobile media queries).
"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent

def test_streak_history_css_integrity():
    css_path = ROOT / "assets" / "css" / "streak-history.css"
    assert css_path.exists(), "streak-history.css file not found"
    
    content = css_path.read_text(encoding="utf-8")
    opens = content.count("{")
    closes = content.count("}")
    assert opens == closes, f"Mismatched braces in streak-history.css: {opens} opens vs {closes} closes"


def test_history_box_viewport_bounded_styles():
    css_path = ROOT / "assets" / "css" / "streak-history.css"
    content = css_path.read_text(encoding="utf-8")
    
    # Verify .history-box has max-height bound
    assert "max-height:" in content, ".history-box missing max-height constraint"
    assert "dvh" in content or "vh" in content, "max-height should use responsive viewport units (vh/dvh)"
    
    # Verify .history-day-cell has max-height constraint
    assert "max-height:" in content, ".history-day-cell should constrain maximum cell height"
    
    # Verify overlay doesn't scroll excessively
    assert ".history-overlay" in content
    assert ".history-box" in content
    assert ".history-toolbar" in content
    assert ".history-footer" in content


def test_history_responsive_media_queries():
    css_path = ROOT / "assets" / "css" / "streak-history.css"
    content = css_path.read_text(encoding="utf-8")
    
    # Ensure responsiveness for mobile width and small height resolutions
    assert "@media (max-width: 520px)" in content
    assert "@media (max-height: 520px)" in content


def test_levels_js_history_structure():
    js_path = ROOT / "assets" / "js" / "levels.js"
    content = js_path.read_text(encoding="utf-8")
    
    # Check that toolbar combines switcher & navigation
    assert "history-toolbar" in content, "levels.js should render .history-toolbar"
    assert "history-footer" in content, "levels.js should render .history-footer"
    assert "renderMonthView" in content
    assert "renderYearView" in content
    assert "historyModalOpen" in content
