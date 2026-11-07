#!/usr/bin/env python3
"""
tests/test_tools_menu.py

Verification suite for Skills-oriented Tools Menu:
1. Validates the exact group order (Nghe -> Đọc -> Viết -> Từ vựng & chữ Hán -> Trợ giúp).
2. Verifies that group 'Nói' is omitted since no usable speaking feature exists.
3. Confirms legacy 'Công cụ học' and 'Trò chơi' headings are removed.
4. Validates accurate tool mapping and routing triggers.
5. Checks keyboard accessibility and responsive styles.
"""

from pathlib import Path
import re
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent

def test_tools_menu_skill_grouping_and_order():
    index_html = (ROOT / "index.html").read_text(encoding="utf-8")
    soup = BeautifulSoup(index_html, "html.parser")

    menu_panel = soup.find(id="primaryGamesMenu").find(class_="primary-games-menu-panel")
    assert menu_panel is not None, "Menu panel not found inside #primaryGamesMenu"

    # Extract all section titles and buttons in sequential order
    children = [child for child in menu_panel.children if getattr(child, "name", None)]
    
    sections = []
    current_section = None
    for child in children:
        if "primary-menu-section-title" in child.get("class", []):
            current_section = {"title": child.get_text(strip=True), "items": []}
            sections.append(current_section)
        elif "primary-tab" in child.get("class", []):
            label = child.get_text(strip=True)
            btn_id = child.get("id", "")
            action = child.get("data-tab") or child.get("onclick", "")
            if current_section is not None:
                current_section["items"].append({"label": label, "id": btn_id, "action": action})

    expected_titles = ["Nghe", "Đọc", "Viết", "Từ vựng & chữ Hán", "Trợ giúp"]
    actual_titles = [s["title"] for s in sections]
    assert actual_titles == expected_titles, f"Expected sections {expected_titles}, but got {actual_titles}"

    # Verify 'Nói' is not in titles
    assert "Nói" not in actual_titles
    # Verify legacy titles are not present
    assert "Công cụ học" not in actual_titles
    assert "Trò chơi" not in actual_titles

    # Verify tool items per section
    # 1. Nghe
    nghe_items = sections[0]["items"]
    assert len(nghe_items) == 1
    assert "Luyện nghe HSK4" in nghe_items[0]["label"]
    assert "listening" in nghe_items[0]["action"]

    # 2. Đọc
    doc_items = sections[1]["items"]
    assert len(doc_items) == 2
    assert "Bài đọc phân cấp" in doc_items[0]["label"]
    assert "gradedReading" in doc_items[0]["action"]
    assert "Đọc hiểu HSK4" in doc_items[1]["label"]
    assert "reading" in doc_items[1]["action"]

    # 3. Viết
    viet_items = sections[2]["items"]
    assert len(viet_items) == 2
    assert "Xếp câu HSK4" in viet_items[0]["label"]
    assert "sentenceGame" in viet_items[0]["action"]
    assert "Điền từ" in viet_items[1]["label"]
    assert "speedQuiz" in viet_items[1]["action"]

    # 4. Từ vựng & chữ Hán
    vocab_items = sections[3]["items"]
    assert len(vocab_items) == 3
    assert "Đuổi hình bắt chữ" in vocab_items[0]["label"]
    assert "guessWord" in vocab_items[0]["action"]
    assert "Bộ thủ" in vocab_items[1]["label"]
    assert "radicals" in vocab_items[1]["action"]
    assert "Tra cứu 214 bộ thủ" in vocab_items[2]["label"]
    assert "radicalLookup" in vocab_items[2]["action"] or "openRadicalDirectory()" in vocab_items[2]["action"]

    # 5. Trợ giúp
    help_items = sections[4]["items"]
    assert len(help_items) == 1
    assert "Hướng dẫn & Phím tắt" in help_items[0]["label"]
    assert "help" in help_items[0]["action"] or "openStudyHelpModal()" in help_items[0]["action"]

def test_keyboard_navigation_and_events():
    radicals_js = (ROOT / "src/islands/RadicalHub.jsx").read_text(encoding="utf-8")
    assert "initPrimaryMenuKeyboard" in radicals_js
    assert "ArrowDown" in radicals_js
    assert "ArrowUp" in radicals_js
    assert "Escape" in radicals_js
    assert "trigger.focus()" in radicals_js

def test_css_styling_and_warm_palette():
    css = (ROOT / "assets/css/radicals.css").read_text(encoding="utf-8")
    assert "max-height: calc(100vh - 84px)" in css
    assert "overflow-y: auto" in css
    assert ".primary-games-menu-panel .primary-tab:hover" in css
    assert "var(--accent-light)" in css
    assert ".primary-games-menu-panel .primary-tab:focus-visible" in css
