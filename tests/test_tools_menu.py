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
            onclick = child.get("onclick", "")
            if current_section is not None:
                current_section["items"].append({"label": label, "id": btn_id, "onclick": onclick})

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
    assert "setPrimaryTab('listening')" in nghe_items[0]["onclick"]

    # 2. Đọc
    doc_items = sections[1]["items"]
    assert len(doc_items) == 2
    assert "Bài đọc phân cấp" in doc_items[0]["label"]
    assert "setPrimaryTab('gradedReading')" in doc_items[0]["onclick"]
    assert "Đọc hiểu HSK4" in doc_items[1]["label"]
    assert "setPrimaryTab('reading')" in doc_items[1]["onclick"]

    # 3. Viết
    viet_items = sections[2]["items"]
    assert len(viet_items) == 2
    assert "Xếp câu HSK4" in viet_items[0]["label"]
    assert "setPrimaryTab('sentenceGame')" in viet_items[0]["onclick"]
    assert "Điền từ" in viet_items[1]["label"]
    assert "setPrimaryTab('speedQuiz')" in viet_items[1]["onclick"]

    # 4. Từ vựng & chữ Hán
    vocab_items = sections[3]["items"]
    assert len(vocab_items) == 3
    assert "Đuổi hình bắt chữ" in vocab_items[0]["label"]
    assert "setPrimaryTab('guessWord')" in vocab_items[0]["onclick"]
    assert "Bộ thủ" in vocab_items[1]["label"]
    assert "setPrimaryTab('radicals')" in vocab_items[1]["onclick"]
    assert "Tra cứu 214 bộ thủ" in vocab_items[2]["label"]
    assert "openRadicalDirectory()" in vocab_items[2]["onclick"]

    # 5. Trợ giúp
    help_items = sections[4]["items"]
    assert len(help_items) == 1
    assert "Hướng dẫn & Phím tắt" in help_items[0]["label"]
    assert "openStudyHelpModal()" in help_items[0]["onclick"]

def test_keyboard_navigation_and_events():
    radicals_js = (ROOT / "assets/js/radicals.js").read_text(encoding="utf-8")
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
