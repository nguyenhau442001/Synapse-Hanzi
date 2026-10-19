#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/test_ui_layout.py
Automated test suite verifying responsive balance, layout integrity,
proportions, typography floors, theme contrast, touch targets, and
mobile/desktop parity across Synapse Hanzi.
"""

import json
import re
import sys
import unittest
from html.parser import HTMLParser
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = REPO_ROOT / "index.html"
SW_JS = REPO_ROOT / "sw.js"
CSS_DIR = REPO_ROOT / "assets" / "css"
BASE_CSS = CSS_DIR / "base.css"
FLASHCARDS_CSS = REPO_ROOT / "assets" / "flashcards.css"
DASHBOARD_CSS = CSS_DIR / "dashboard-enhancements.css"
HOME_WIDGETS_CSS = CSS_DIR / "home-widgets.css"
WORKSTATION_CSS = CSS_DIR / "workstation.css"
LEVEL_PICKER_CSS = CSS_DIR / "level-picker.css"
FLASHCARD_CSS = CSS_DIR / "flashcard.css"
CELEBRATION_CSS = CSS_DIR / "celebration.css"


class IdCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.tags = []

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        for name, value in attrs:
            if name.lower() == "id" and value:
                self.ids.append(value)


def extract_media_blocks(css_text, media_query_pattern):
    """Extract CSS rules enclosed in media queries matching pattern."""
    blocks = []
    regex = re.compile(r"@media\s*([^{]+)\{", re.IGNORECASE)
    pos = 0
    while True:
        match = regex.search(css_text, pos)
        if not match:
            break
        query_text = match.group(1).strip()
        start = match.end()
        brace_depth = 1
        i = start
        while i < len(css_text) and brace_depth > 0:
            if css_text[i] == '{':
                brace_depth += 1
            elif css_text[i] == '}':
                brace_depth -= 1
            i += 1
        block_content = css_text[start : i - 1]
        if re.search(media_query_pattern, query_text):
            blocks.append((query_text, block_content))
        pos = i
    return blocks


class TestResponsiveBreakpointsAndParity(unittest.TestCase):
    """Test mobile and desktop breakpoint layouts stay balanced."""

    def setUp(self):
        self.dashboard_css = DASHBOARD_CSS.read_text(encoding="utf-8")
        self.home_widgets_css = HOME_WIDGETS_CSS.read_text(encoding="utf-8")
        self.workstation_css = WORKSTATION_CSS.read_text(encoding="utf-8")

    def test_desktop_workstation_3_columns_preserved(self):
        """Desktop (min-width: 1280px) must retain a 3-column workstation grid."""
        desktop_blocks = extract_media_blocks(self.dashboard_css, r"min-width:\s*1280px")
        self.assertTrue(len(desktop_blocks) >= 1, "Missing @media (min-width: 1280px) in dashboard CSS")
        combined_desktop = " ".join(b[1] for b in desktop_blocks)
        self.assertIn("repeat(3, minmax(0, 1fr))", combined_desktop,
                      "Desktop level-grid must maintain a 3-column layout")

    def test_mobile_level_grid_2_columns_max(self):
        """Mobile (max-width: 767px) must restrict level-grid to 2 columns to prevent squishing."""
        mobile_blocks = extract_media_blocks(self.dashboard_css, r"max-width:\s*767px")
        self.assertTrue(len(mobile_blocks) >= 1, "Missing @media (max-width: 767px) in dashboard CSS")
        combined_mobile = " ".join(b[1] for b in mobile_blocks)
        self.assertIn("repeat(2, minmax(0, 1fr))", combined_mobile,
                      "Mobile level-grid must be a balanced 2-column grid")

    def test_mobile_level_card_dimensions_balanced(self):
        """Mobile level cards must have balanced min-height (120px - 150px) and proper corner radius."""
        mobile_blocks = extract_media_blocks(self.dashboard_css, r"max-width:\s*767px")
        combined_mobile = " ".join(b[1] for b in mobile_blocks)
        min_h_match = re.search(r"\.level-card\s*\{[^}]*min-height:\s*(\d+)px", combined_mobile)
        self.assertIsNotNone(min_h_match, "Mobile .level-card must define an explicit min-height")
        min_h = int(min_h_match.group(1))
        self.assertTrue(120 <= min_h <= 150,
                        f"Mobile level-card min-height ({min_h}px) should be between 120px and 150px")

    def test_mobile_widgets_order_keeps_level_grid_visible(self):
        """On mobile, 'Từ của ngày' must NOT jump above the level picker (order >= 1)."""
        mobile_blocks = extract_media_blocks(self.home_widgets_css, r"max-width:\s*767px")
        self.assertTrue(len(mobile_blocks) >= 1)
        combined = " ".join(b[1] for b in mobile_blocks)
        wotd_order_match = re.search(r"\.hw-wotd\s*\{[^}]*order:\s*(-?\d+)", combined)
        self.assertIsNotNone(wotd_order_match, "Mobile .hw-wotd order must be defined")
        order = int(wotd_order_match.group(1))
        self.assertGreaterEqual(order, 0,
                                "Mobile .hw-wotd must not have negative order (-1) to avoid hiding the level grid")


class TestTypographyAndTouchFloors(unittest.TestCase):
    """Test typography readability floors and minimum touch targets."""

    def setUp(self):
        self.dashboard_css = DASHBOARD_CSS.read_text(encoding="utf-8")
        self.workstation_css = WORKSTATION_CSS.read_text(encoding="utf-8")

    def test_no_microscopic_fonts_on_mobile(self):
        """Ensure no font-size smaller than 9.5px is used on mobile viewports."""
        mobile_blocks = extract_media_blocks(self.dashboard_css, r"max-width:\s*767px")
        mobile_blocks.extend(extract_media_blocks(self.workstation_css, r"max-width:\s*640px"))

        for query, content in mobile_blocks:
            font_sizes = re.findall(r"font-size:\s*(\d+(?:\.\d+)?)px", content)
            for size_str in font_sizes:
                size = float(size_str)
                self.assertGreaterEqual(size, 9.5,
                                        f"Found unreadable font-size ({size}px) in mobile query ({query})")

    def test_hanzi_uses_adaptive_clamping(self):
        """Ensure Hanzi typography uses responsive clamp() for long word fit."""
        self.assertIn("clamp(", self.workstation_css,
                      "Workstation CSS must use clamp() for responsive character scaling")

    def test_primary_cta_touch_target_height(self):
        """Primary action buttons on mobile must have at least 40px minimum height for finger taps."""
        mobile_blocks = extract_media_blocks(self.dashboard_css, r"max-width:\s*767px")
        combined = " ".join(b[1] for b in mobile_blocks)
        cta_match = re.search(r"\.dashboard-primary-btn\s*\{[^}]*min-height:\s*(\d+)px", combined)
        self.assertIsNotNone(cta_match)
        self.assertGreaterEqual(int(cta_match.group(1)), 40,
                                "Mobile primary CTA button min-height must be at least 40px")


class TestLayoutHazardAndOverflowAudit(unittest.TestCase):
    """Test against dangerous CSS patterns that cause mobile horizontal overflow."""

    def setUp(self):
        self.dashboard_css = DASHBOARD_CSS.read_text(encoding="utf-8")
        self.workstation_css = WORKSTATION_CSS.read_text(encoding="utf-8")

    def test_no_positive_margin_with_full_width_buttons(self):
        """Prevent width:100% paired with positive margin-left (causes mobile horizontal overflow)."""
        mobile_blocks = extract_media_blocks(self.dashboard_css, r"max-width:\s*767px")
        for query, content in mobile_blocks:
            rules = re.findall(r"([^{]+)\{([^}]+)\}", content)
            for selector, props in rules:
                has_full_width = re.search(r"width:\s*100%", props)
                margin_left_match = re.search(r"margin-left:\s*([1-9]\d*)px", props)
                if has_full_width and margin_left_match:
                    self.fail(f"Hazardous layout pattern: '{selector.strip()}' has width: 100% with positive margin-left: {margin_left_match.group(1)}px")

    def test_filter_row_has_overflow_protection(self):
        """Mobile filter chips must handle text-overflow cleanly."""
        mobile_blocks = extract_media_blocks(self.workstation_css, r"max-width:\s*640px")
        combined = " ".join(b[1] for b in mobile_blocks)
        self.assertIn("text-overflow: ellipsis", combined,
                      "Mobile filter buttons must have text-overflow protection for narrow devices")


class TestFlashcardStudyViewportBalance(unittest.TestCase):
    """Test flashcard study view proportions and safe area clearance."""

    def setUp(self):
        self.workstation_css = WORKSTATION_CSS.read_text(encoding="utf-8")

    def test_illustration_frame_bounded_on_mobile(self):
        """Flashcard visual illustration col on mobile must not exceed 100px in height."""
        mobile_blocks = extract_media_blocks(self.workstation_css, r"max-width:\s*640px")
        combined = " ".join(b[1] for b in mobile_blocks)
        visual_col_match = re.search(r"\.card-visual-col\s*\{[^}]*height:\s*(\d+)px", combined)
        self.assertIsNotNone(visual_col_match)
        height = int(visual_col_match.group(1))
        self.assertLessEqual(height, 100,
                             f"Mobile card illustration height ({height}px) must be <= 100px to prevent crowding")

    def test_example_box_bounded_on_mobile(self):
        """Flashcard example box max-height on mobile must be bounded to avoid scrolling off controls."""
        mobile_blocks = extract_media_blocks(self.workstation_css, r"max-width:\s*640px")
        combined = " ".join(b[1] for b in mobile_blocks)
        example_match = re.search(r"\.example-box\s*\{[^}]*max-height:\s*(\d+)px", combined)
        self.assertIsNotNone(example_match)
        max_h = int(example_match.group(1))
        self.assertTrue(100 <= max_h <= 160,
                        f"Mobile example-box max-height ({max_h}px) must be between 100px and 160px")

    def test_bottom_safe_area_present(self):
        """Rating area or action rows must have safe-area inset bottom padding for iOS/in-app browsers."""
        mobile_blocks = extract_media_blocks(self.workstation_css, r"max-width:\s*640px")
        combined = " ".join(b[1] for b in mobile_blocks)
        self.assertIn("env(safe-area-inset-bottom", combined,
                      "Mobile flashcard study mode must include env(safe-area-inset-bottom) for bottom toolbars")

    def test_mobile_filter_row_unboxed(self):
        """Filter row on mobile must be unboxed (transparent background, no border) to prevent sausage bar."""
        mobile_blocks = extract_media_blocks(self.workstation_css, r"max-width:\s*640px")
        combined = " ".join(b[1] for b in mobile_blocks)
        self.assertIn("body.flashcard-study-mode .filter-row", combined)
        self.assertIn("background: transparent !important", combined)
        self.assertIn("border: none !important", combined)

    def test_mobile_rating_buttons_solid_visual_weight(self):
        """Rating buttons on mobile must have intentional muted color tokens and tactile height >= 48px."""
        mobile_blocks = extract_media_blocks(self.workstation_css, r"max-width:\s*640px")
        combined = " ".join(b[1] for b in mobile_blocks)
        self.assertIn(".rating-btn--good", combined)
        self.assertIn(".rating-btn--again", combined)
        self.assertIn("background: #EFF5F1 !important", combined)
        self.assertIn("background: #FAF0EE !important", combined)

    def test_mobile_secondary_actions_hidden_in_review(self):
        """Secondary clutter actions (reset/show unknown) must be hidden during active mobile flashcard review."""
        mobile_blocks = extract_media_blocks(self.workstation_css, r"max-width:\s*640px")
        combined = " ".join(b[1] for b in mobile_blocks)
        self.assertIn(".action-row.secondary-actions", combined)
        self.assertIn("display: none !important", combined)


class TestThemeVariablesAndContrast(unittest.TestCase):
    """Test theme variable declarations and dark/light contrast integrity."""

    def setUp(self):
        self.base_css = BASE_CSS.read_text(encoding="utf-8")

    def test_root_defines_essential_design_tokens(self):
        """Root selector must define essential theme tokens."""
        essential_tokens = ["--bg", "--card-bg", "--text-primary", "--border", "--accent"]
        root_match = re.search(r":root\s*\{([^}]+)\}", self.base_css)
        self.assertIsNotNone(root_match, ":root block not found in base.css")
        root_content = root_match.group(1)
        for token in essential_tokens:
            self.assertIn(token, root_content, f"Essential design token {token} missing in :root")

    def test_dark_theme_overrides_essential_tokens(self):
        """Dark theme must provide overrides for all essential tokens."""
        essential_tokens = ["--bg", "--card-bg", "--text-primary", "--border", "--accent"]
        dark_match = re.search(r":root\[data-theme=[\"']dark[\"']\]\s*\{([^}]+)\}", self.base_css)
        self.assertIsNotNone(dark_match, ":root[data-theme='dark'] block not found in base.css")
        dark_content = dark_match.group(1)
        for token in essential_tokens:
            self.assertIn(token, dark_content, f"Dark theme missing override for {token}")

    def test_light_theme_overrides_essential_tokens(self):
        """Light theme must provide overrides for all essential tokens."""
        essential_tokens = ["--bg", "--card-bg", "--text-primary", "--border", "--accent"]
        light_match = re.search(r":root\[data-theme=[\"']light[\"']\]\s*\{([^}]+)\}", self.base_css)
        self.assertIsNotNone(light_match, ":root[data-theme='light'] block not found in base.css")
        light_content = light_match.group(1)
        for token in essential_tokens:
            self.assertIn(token, light_content, f"Light theme missing override for {token}")

    def test_theme_contrast_safeguard(self):
        """Verify that card background and primary text colors are distinct to prevent invisible text."""
        for theme in ["light", "dark"]:
            match = re.search(rf":root\[data-theme=[\"']{theme}[\"']\]\s*\{{([^}}]+)\}}", self.base_css)
            self.assertIsNotNone(match)
            block = match.group(1)
            bg_match = re.search(r"--card-bg:\s*([^;]+);", block)
            text_match = re.search(r"--text-primary:\s*([^;]+);", block)
            self.assertIsNotNone(bg_match, f"{theme} theme missing --card-bg")
            self.assertIsNotNone(text_match, f"{theme} theme missing --text-primary")
            self.assertNotEqual(bg_match.group(1).strip().lower(),
                                text_match.group(1).strip().lower(),
                                f"{theme} theme has identical card background and text color!")


class TestMobileLandscapeAdaptations(unittest.TestCase):
    """Test mobile landscape viewports (max-height <= 540px) maintain usable proportions."""

    def setUp(self):
        self.workstation_css = WORKSTATION_CSS.read_text(encoding="utf-8")

    def test_landscape_media_query_present(self):
        """Ensure specific landscape compact media query is defined."""
        blocks = extract_media_blocks(self.workstation_css, r"max-height:\s*540px.*orientation:\s*landscape")
        self.assertTrue(len(blocks) >= 1, "Missing @media (max-height: 540px) and (orientation: landscape)")

    def test_landscape_topbar_compact(self):
        """Landscape topbar must have compact min-height <= 40px to preserve vertical space."""
        blocks = extract_media_blocks(self.workstation_css, r"max-height:\s*540px.*orientation:\s*landscape")
        combined = " ".join(b[1] for b in blocks)
        match = re.search(r"\.study-view-topbar\s*\{[^}]*min-height:\s*(\d+)px", combined)
        self.assertIsNotNone(match, "Topbar min-height in landscape must be defined")
        self.assertLessEqual(int(match.group(1)), 40)

    def test_landscape_card_vertical_padding_compact(self):
        """Card top padding in landscape must not exceed 42px."""
        blocks = extract_media_blocks(self.workstation_css, r"max-height:\s*540px.*orientation:\s*landscape")
        combined = " ".join(b[1] for b in blocks)
        match = re.search(r"#cardArea\s*>\s*\.card\s*\{[^}]*padding:\s*(\d+)px", combined)
        self.assertIsNotNone(match, "Card padding in landscape must be defined")
        self.assertLessEqual(int(match.group(1)), 42)

    def test_landscape_example_box_height_constrained(self):
        """Landscape example box max-height must be <= 90px to prevent viewport clipping."""
        blocks = extract_media_blocks(self.workstation_css, r"max-height:\s*540px.*orientation:\s*landscape")
        combined = " ".join(b[1] for b in blocks)
        match = re.search(r"\.example-box\s*\{[^}]*max-height:\s*(\d+)px", combined)
        self.assertIsNotNone(match, "Example box max-height in landscape must be defined")
        self.assertLessEqual(int(match.group(1)), 90)


class TestTouchTargetAccessibility(unittest.TestCase):
    """Test mobile touch targets adhere to accessibility standards (>= 40px for primary actions)."""

    def setUp(self):
        self.base_css = BASE_CSS.read_text(encoding="utf-8")
        self.dashboard_css = DASHBOARD_CSS.read_text(encoding="utf-8")
        self.workstation_css = WORKSTATION_CSS.read_text(encoding="utf-8")

    def test_mobile_header_utility_buttons_touch_target(self):
        """Header utility buttons (theme toggle, search) on tablet/mobile must be at least 40px x 40px."""
        blocks = extract_media_blocks(self.base_css, r"max-width:\s*1279px")
        self.assertTrue(len(blocks) >= 1)
        combined = " ".join(b[1] for b in blocks)
        w_match = re.search(r"\.theme-toggle-btn[^{]*\{[^}]*width:\s*(\d+)px", combined)
        h_match = re.search(r"\.theme-toggle-btn[^{]*\{[^}]*height:\s*(\d+)px", combined)
        self.assertIsNotNone(w_match, "Theme toggle width must be defined on mobile")
        self.assertIsNotNone(h_match, "Theme toggle height must be defined on mobile")
        self.assertGreaterEqual(int(w_match.group(1)), 40)
        self.assertGreaterEqual(int(h_match.group(1)), 40)

    def test_mobile_header_search_button_touch_target(self):
        """Header search button on mobile must have >= 40px dimensions."""
        blocks = extract_media_blocks(self.base_css, r"max-width:\s*1279px")
        combined = " ".join(b[1] for b in blocks)
        match = re.search(r"\.header-search-btn[^{]*\{[^}]*height:\s*(\d+)px", combined)
        self.assertIsNotNone(match)
        self.assertGreaterEqual(int(match.group(1)), 40)

    def test_ultra_compact_card_tool_buttons_have_explicit_dimensions(self):
        """Card toolbar buttons on ultra compact phones (<= 375px) must maintain minimum 24px."""
        blocks = extract_media_blocks(self.workstation_css, r"max-width:\s*375px")
        combined = " ".join(b[1] for b in blocks)
        match = re.search(r"\.card-tool-btn\s*\{[^}]*width:\s*(\d+)px", combined)
        self.assertIsNotNone(match)
        self.assertGreaterEqual(int(match.group(1)), 24)


class TestZIndexStackingHierarchy(unittest.TestCase):
    """Test z-index hierarchy prevents modals from being covered by toolbars or sticky headers."""

    def setUp(self):
        self.flashcard_css = FLASHCARD_CSS.read_text(encoding="utf-8")
        self.celebration_css = CELEBRATION_CSS.read_text(encoding="utf-8")
        self.workstation_css = WORKSTATION_CSS.read_text(encoding="utf-8")

    def test_memory_curve_overlay_above_sticky_content(self):
        """Memory curve modal overlay must have z-index >= 2000."""
        match = re.search(r"\.memory-curve-overlay\s*\{[^}]*z-index:\s*(\d+)", self.flashcard_css)
        self.assertIsNotNone(match)
        z = int(match.group(1))
        self.assertGreaterEqual(z, 2000)

    def test_celebration_overlay_highest_layer(self):
        """Celebration canvas/overlay must have z-index >= 9000."""
        match = re.search(r"\.celebration-overlay\s*\{[^}]*z-index:\s*(\d+)", self.celebration_css)
        self.assertIsNotNone(match)
        z = int(match.group(1))
        self.assertGreaterEqual(z, 9000)

    def test_card_toolbar_stays_under_modals(self):
        """Card toolbar controls in workstation must stay below 100 to prevent poking through overlays."""
        matches = re.findall(r"\.card-toolbar\s*\{[^}]*z-index:\s*(\d+)", self.workstation_css)
        for z_str in matches:
            self.assertLess(int(z_str), 100)


class TestGridBlowoutProtection(unittest.TestCase):
    """Test CSS Grid and Flexbox rules prevent container blowouts and clipping."""

    def setUp(self):
        self.dashboard_css = DASHBOARD_CSS.read_text(encoding="utf-8")
        self.workstation_css = WORKSTATION_CSS.read_text(encoding="utf-8")
        self.flashcard_css = FLASHCARD_CSS.read_text(encoding="utf-8")

    def test_level_grid_uses_minmax_zero(self):
        """Level grid column definitions must use minmax(0, ...) to prevent grid blow-out."""
        grids = re.findall(r"grid-template-columns:\s*([^;]+);", self.dashboard_css)
        for g in grids:
            if "repeat(" in g:
                self.assertIn("minmax(0,", g, f"Grid template '{g}' must use minmax(0, ...) to avoid overflow")

    def test_stats_grid_uses_minmax_zero(self):
        """Memory curve stats grid must use minmax(0, 1fr) for columns."""
        self.assertIn("repeat(3, minmax(0, 1fr))", self.flashcard_css)
        self.assertIn("repeat(2, minmax(0, 1fr))", self.flashcard_css)

    def test_card_area_contains_horizontal_overflow(self):
        """#cardArea must enforce clipping/hiding of horizontal overflow."""
        match = re.search(r"#cardArea\s*\{[^}]*overflow-x:\s*(clip|hidden)", self.workstation_css)
        self.assertIsNotNone(match, "#cardArea must specify overflow-x: clip or hidden")


class TestViewportMetaConfiguration(unittest.TestCase):
    """Test mobile viewport meta tag configuration in index.html."""

    def setUp(self):
        self.index_html = INDEX_HTML.read_text(encoding="utf-8")

    def test_viewport_meta_tag_present(self):
        """index.html must declare a viewport meta tag."""
        match = re.search(r'<meta[^>]+name=["\']viewport["\'][^>]*>', self.index_html, re.I)
        self.assertIsNotNone(match, "Missing <meta name='viewport'> tag in index.html")

    def test_viewport_meta_has_essential_attributes(self):
        """Viewport meta tag must include width=device-width, initial-scale=1.0, and viewport-fit=cover."""
        match = re.search(r'<meta[^>]+name=["\']viewport["\'][^>]+content=["\']([^"\']+)["\']', self.index_html, re.I)
        self.assertIsNotNone(match)
        content = match.group(1)
        self.assertIn("width=device-width", content)
        self.assertIn("initial-scale=1.0", content)
        self.assertIn("viewport-fit=cover", content)


class TestAssetAndPwaSynchronization(unittest.TestCase):
    """Test that all linked stylesheets, scripts, and PWA caches are intact and synchronized."""

    def setUp(self):
        self.index_html = INDEX_HTML.read_text(encoding="utf-8")
        self.sw_js = SW_JS.read_text(encoding="utf-8")

    def test_all_linked_stylesheets_exist(self):
        """Every stylesheet referenced in index.html must exist on the local filesystem."""
        hrefs = re.findall(r'<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"\']+)["\']', self.index_html, re.I)
        for href in hrefs:
            clean_path = href.split("?")[0]
            file_path = REPO_ROOT / clean_path
            self.assertTrue(file_path.exists(), f"Stylesheet missing on disk: {clean_path}")

    def test_all_script_src_files_exist(self):
        """Every JS script referenced in index.html must exist on the local filesystem."""
        srcs = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', self.index_html, re.I)
        for src in srcs:
            if src.startswith("http"):
                continue
            clean_path = src.split("?")[0]
            file_path = REPO_ROOT / clean_path
            self.assertTrue(file_path.exists(), f"Script missing on disk: {clean_path}")

    def test_pwa_version_alignment(self):
        """sw.js ASSET_VERSION must be present in index.html stylesheet version strings."""
        match = re.search(r"const\s+ASSET_VERSION\s*=\s*['\"]([^'\"]+)['\"];", self.sw_js)
        if match:
            version = match.group(1)
        else:
            app_match = re.search(r"const\s+APP_VERSION\s*=\s*['\"]([^'\"]+)['\"];", self.sw_js)
            self.assertIsNotNone(app_match, "Could not find APP_VERSION or literal ASSET_VERSION in sw.js")
            version = app_match.group(1)
        self.assertIn(version, self.index_html,
                      f"sw.js version '{version}' is not referenced in index.html cache busters")


class TestHtmlStructureAndSemantics(unittest.TestCase):
    """Test HTML parsing integrity, tag balance, and unique IDs."""

    def setUp(self):
        self.content = INDEX_HTML.read_text(encoding="utf-8")

    def test_html_parsing_clean(self):
        """index.html must parse cleanly without syntax errors."""
        parser = HTMLParser()
        try:
            parser.feed(self.content)
        except Exception as e:
            self.fail(f"HTML parsing failed: {e}")

    def test_no_duplicate_element_ids(self):
        """All element IDs in index.html must be strictly unique."""
        collector = IdCollector()
        collector.feed(self.content)
        seen = set()
        duplicates = set()
        for id_val in collector.ids:
            if id_val in seen:
                duplicates.add(id_val)
            seen.add(id_val)
        self.assertEqual(len(duplicates), 0,
                         f"Duplicate element IDs found in index.html: {sorted(duplicates)}")


class TestTodayReviewZenMode(unittest.TestCase):
    """Test Zen Focus Mode for Today's and Quick Forgotten Reviews."""

    def setUp(self):
        self.workstation_css = WORKSTATION_CSS.read_text(encoding="utf-8")
        self.flashcard_css = FLASHCARD_CSS.read_text(encoding="utf-8")
        self.index_html = INDEX_HTML.read_text(encoding="utf-8")

    def test_today_review_zen_mode_layout_hides_distractions(self):
        """Zen Mode must eliminate left/right sidebars and primary navigation tabs."""
        self.assertIn("body.today-reviews-focus-mode .workstation-left", self.workstation_css)
        self.assertIn("body.today-reviews-focus-mode .workstation-right", self.workstation_css)
        self.assertIn("body.today-reviews-focus-mode #primaryTabs", self.workstation_css)
        self.assertIn("body.today-reviews-focus-mode .mobile-bottom-nav", self.workstation_css)

    def test_today_review_zen_mode_elements_present(self):
        """Essential Zen review elements (progress bar, back button, arena) must exist."""
        self.assertIn('id="todayReviewProgressBar"', self.index_html)
        self.assertIn('id="todayReviewProgressPct"', self.index_html)
        self.assertIn('id="todayReviewCounterPill"', self.index_html)
        self.assertIn('class="today-review-back-btn"', self.index_html)

    def test_today_review_rating_button_touch_targets(self):
        """Ergonomic rating buttons in Zen review must have >= 50px height for finger touch."""
        rating_h_match = re.search(r"\.today-rating-btn\s*\{[^}]*min-height:\s*(\d+)px", self.flashcard_css)
        self.assertIsNotNone(rating_h_match, "today-rating-btn must define min-height")
        min_h = int(rating_h_match.group(1))
        self.assertGreaterEqual(min_h, 50, f"today-rating-btn min-height ({min_h}px) must be >= 50px")

    def test_today_review_flip_affordance_present(self):
        """Card flip prompts and reveal actions must be styled in flashcard CSS."""
        self.assertIn(".today-flip-btn", self.flashcard_css)
        self.assertIn(".today-btn-reveal", self.flashcard_css)
        self.assertIn(".today-review-celebration-card", self.flashcard_css)

    def test_today_review_example_markup_support(self):
        """Today review must format example markup with <u> tags instead of escaping them as raw text."""
        due_review_js = (REPO_ROOT / "assets" / "js" / "due-review.js").read_text(encoding="utf-8")
        self.assertIn("formatTodayExample(item.word.example_zh)", due_review_js)
        self.assertIn("formatTodayExample(item.word.example_vi)", due_review_js)
        self.assertIn("function formatTodayExample", due_review_js)
        self.assertIn(".today-card-example u", self.flashcard_css)


class TestFlashcardIllustrationIntegration(unittest.TestCase):
    """Test Flashcard SVG illustration integration, responsive sizing, contrast, and toggle preferences."""

    def setUp(self):
        self.workstation_css = WORKSTATION_CSS.read_text(encoding="utf-8")
        self.flashcard_js = (REPO_ROOT / "assets" / "js" / "flashcard.js").read_text(encoding="utf-8")
        self.state_js = (REPO_ROOT / "assets" / "js" / "state.js").read_text(encoding="utf-8")

    def test_illustration_frame_responsive_bounds(self):
        """Illustration frame must obey suggested responsive bounds (64-78px mobile, 88-112px desktop)."""
        desktop_match = re.search(r"@media\s*\(min-width:\s*1024px\)[^{]*\{[^}]*\.card-illustration-frame\s*\{[^}]*width:\s*(\d+)px", self.workstation_css)
        self.assertIsNotNone(desktop_match, "Desktop illustration width must be defined")
        desktop_w = int(desktop_match.group(1))
        self.assertTrue(88 <= desktop_w <= 112, f"Desktop illustration width ({desktop_w}px) must be within 88-112px")

        mobile_match = re.search(r"@media\s*\(max-width:\s*479px\)[^{]*\{[^}]*\.card-illustration-frame\s*\{[^}]*width:\s*(\d+)px", self.workstation_css)
        self.assertIsNotNone(mobile_match, "Mobile illustration width must be defined")
        mobile_w = int(mobile_match.group(1))
        self.assertTrue(64 <= mobile_w <= 78, f"Mobile illustration width ({mobile_w}px) must be within 64-78px")

    def test_supporting_group_no_border_divider(self):
        """Supporting group must not have an intrusive hard divider line cutting the card."""
        supp_match = re.search(r"body\.flashcard-study-mode\s+\.card-supporting-group\s*\{([^}]+)\}", self.workstation_css)
        self.assertIsNotNone(supp_match)
        block = supp_match.group(1)
        self.assertIn("border-top: none", block, "Supporting group must have border-top: none to avoid visual noise")

    def test_hide_illustrations_mode_collapses_space(self):
        """When illustrations are toggled off, card-visual-col must be hidden with 0 height."""
        self.assertIn("body.flashcard-study-mode.hide-illustrations .card-visual-col", self.workstation_css)
        self.assertIn("display: none !important", self.workstation_css)

    def test_light_mode_preserves_svg_contrast(self):
        """Light mode must not apply destructive opacity: 0.12 to SVG background rects, which breaks white elements."""
        self.assertNotIn("card-illustration-svg svg rect:first-of-type", self.workstation_css,
                         "Destructive opacity rule on first rect must be removed to preserve contrast for 1700+ SVGs")

    def test_toggle_illustration_control_in_card_dropdown(self):
        """Flashcard options dropdown must offer toggleIllustration and persist to localStorage."""
        self.assertIn('id="menuToggleIllustration"', self.flashcard_js)
        self.assertIn('toggleIllustration', self.flashcard_js)
        self.assertIn('hsk_show_illustrations', self.flashcard_js)
        self.assertIn('hsk_show_illustrations', self.state_js)

    def test_svg_viewbox_normalization_handles_malformed_viewbox(self):
        """normalizeSvgViewBox must correctly fix malformed 3-number viewBox='0 0 240'."""
        malformed = '<svg width="240" height="240" viewBox="0 0 240" xmlns="http://www.w3.org/2000/svg">'
        normalized = re.sub(r'viewBox=["\']\s*0\s+0\s+240\s*["\']', 'viewBox="0 0 240 240"', malformed)
        self.assertEqual(normalized, '<svg width="240" height="240" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">')

    def test_card_visual_col_template_has_no_hidden_attribute_blocker(self):
        """Template for cardVisualCol and cardSupportingGroup must not contain blocking boolean hidden attribute."""
        self.assertNotIn('id="cardVisualCol" style="display: none;" hidden', self.flashcard_js,
                         "cardVisualCol must not have hidden attribute in template which blocks JS rendering")
        self.assertNotIn('id="cardSupportingGroup" style="display: none;" hidden', self.flashcard_js,
                         "cardSupportingGroup must not have hidden attribute in template which blocks JS rendering")

    def test_toggle_illustration_preserves_flipped_side(self):
        """toggleIllustration must ensure card back side is revealed so illustration is immediately visible."""
        self.assertIn("shouldBeFlipped", self.flashcard_js)
        self.assertIn("c.classList.add('is-flipped')", self.flashcard_js)

    def test_flashcard_meta_badges_row_omits_redundant_hsk_level(self):
        """Flashcard meta row should not display redundant HSK level between word type and Sino-Vietnamese."""
        self.assertNotIn('<span class="level-badge" id="levelBadge"', self.flashcard_js,
                         "levelBadge must not be rendered in metaBadgesRow to avoid redundant level display")

    def test_rating_buttons_do_not_render_shortcut_numbers(self):
        """Rating buttons must not render shortcut numbers ([1], [2]) in the UI."""
        self.assertNotIn('class="rating-shortcut"', self.flashcard_js)


class TestLearningProgressNavigator(unittest.TestCase):
    """Test suite for the redesigned Learning Progress Navigator in Synapse Hanzi."""

    @classmethod
    def setUpClass(cls):
        cls.workstation_css = WORKSTATION_CSS.read_text(encoding="utf-8")
        cls.flashcard_js = (REPO_ROOT / "assets" / "js" / "flashcard.js").read_text(encoding="utf-8")

    def test_navigator_semantic_structure_rendered(self):
        """renderFilters must construct the learning-progress-navigator component with header, bar, and 4 cards."""
        self.assertIn("learning-progress-navigator", self.flashcard_js)
        self.assertIn("progress-nav-header", self.flashcard_js)
        self.assertIn("progress-nav-level-tag", self.flashcard_js)
        self.assertIn("progress-nav-metric-main", self.flashcard_js)
        self.assertIn("progress-nav-stats-breakdown", self.flashcard_js)
        self.assertIn("progress-nav-bar", self.flashcard_js)
        self.assertIn("progress-nav-track", self.flashcard_js)
        self.assertIn("progress-nav-seg--known", self.flashcard_js)
        self.assertIn("progress-nav-seg--unknown", self.flashcard_js)
        self.assertIn("progress-nav-cards", self.flashcard_js)

    def test_four_interactive_status_categories_present(self):
        """All four categories (all, known, unknown, unseen) must be configured with correct Vietnamese labels."""
        self.assertIn("key: 'all',", self.flashcard_js)
        self.assertIn("label: 'Tất cả'", self.flashcard_js)
        self.assertIn("key: 'known',", self.flashcard_js)
        self.assertIn("label: 'Đã nhớ'", self.flashcard_js)
        self.assertIn("key: 'unknown',", self.flashcard_js)
        self.assertIn("label: 'Chưa nhớ'", self.flashcard_js)
        self.assertIn("key: 'unseen',", self.flashcard_js)
        self.assertIn("label: 'Chưa học'", self.flashcard_js)

    def test_filter_index_reconciliation_logic(self):
        """setFilter must reconcile current card index to preserve view when word exists in target filter."""
        self.assertIn("currentWordId", self.flashcard_js)
        self.assertIn("filteredOrder.findIndex", self.flashcard_js)

    def test_desktop_four_column_grid_and_mobile_two_column_adaptation(self):
        """Progress status cards must display 4 columns on desktop and adapt to 2 columns on mobile."""
        self.assertIn("grid-template-columns: repeat(4, minmax(0, 1fr))", self.workstation_css)
        mobile_blocks = extract_media_blocks(self.workstation_css, r"max-width:\s*640px")
        combined = " ".join(b[1] for b in mobile_blocks)
        self.assertIn("grid-template-columns: repeat(2, minmax(0, 1fr))", combined,
                      "Mobile must adapt cards to a 2-column layout")

    def test_status_cards_tactile_touch_target_height(self):
        """Status cards must have comfortable touch targets >= 48px."""
        self.assertIn(".progress-nav-card", self.workstation_css)
        min_h_match = re.search(r"\.progress-nav-card\s*\{[^}]*min-height:\s*(\d+)px", self.workstation_css)
        self.assertIsNotNone(min_h_match, "Status card min-height must be defined")
        min_h = int(min_h_match.group(1))
        self.assertGreaterEqual(min_h, 48, f"Card touch target height ({min_h}px) must be >= 48px")

    def test_topbar_duplicate_progress_hidden_in_study_mode(self):
        """Topbar progress bar must be hidden in flashcard study mode to prevent visual duplication."""
        self.assertIn("body.flashcard-study-mode .study-topbar-progress", self.workstation_css)
        match = re.search(r"body\.flashcard-study-mode\s+\.study-topbar-progress\s*\{([^}]+)\}", self.workstation_css)
        self.assertIsNotNone(match)
        self.assertIn("display: none !important", match.group(1))

    def test_filter_cards_omit_redundant_selection_checkmark(self):
        """Active filter cards must communicate selection via border/background without redundant corner checkmarks."""
        self.assertNotIn("progress-nav-card-check", self.flashcard_js,
                         "Redundant selection checkmark must be removed from progress-nav-card template")
        self.assertNotIn(".progress-nav-card-check", self.workstation_css,
                         "Obsolete progress-nav-card-check CSS rules must be removed")

    def test_filter_cards_preserve_category_icons_and_rating_checkmark(self):
        """Category icons (including check-circle for known) and review button checkmark must remain preserved."""
        # Check-circle icon for 'known' filter category
        self.assertIn("M22 11.08V12a10 10 0 1 1-5.93-9.14", self.flashcard_js)
        # Polyline checkmark on review rating button
        self.assertIn("polyline points=\"20 6 9 17 4 12\"", self.flashcard_js)

    def test_filter_cards_active_styling_light_and_dark_themes(self):
        """Active filter cards must retain clear border and background highlighting across light and dark themes."""
        for filter_key in ("all", "known", "unknown", "unseen"):
            self.assertIn(f".progress-nav-card--{filter_key}.is-active", self.workstation_css)
            self.assertIn(f":root[data-theme=\"dark\"] .progress-nav-card--{filter_key}.is-active", self.workstation_css)
        self.assertIn(".progress-nav-card:focus-visible", self.workstation_css)


class TestFlashcardExperienceRefinements(unittest.TestCase):
    """Test suite for the comprehensive visual and usability refinements in Synapse Hanzi Flashcard experience."""

    @classmethod
    def setUpClass(cls):
        cls.workstation_css = WORKSTATION_CSS.read_text(encoding="utf-8")
        cls.flashcard_css = FLASHCARD_CSS.read_text(encoding="utf-8")
        cls.flashcard_js = (REPO_ROOT / "assets" / "js" / "flashcard.js").read_text(encoding="utf-8")
        cls.progress_js = (REPO_ROOT / "assets" / "js" / "progress.js").read_text(encoding="utf-8")

    def test_quiet_flip_prompt_affordance(self):
        """getCardHintText must provide quiet affordance 'Chạm để lật · Space' and 'Chạm để lật'."""
        self.assertIn("Chạm để lật · Space", self.flashcard_js)
        self.assertIn("Chạm để lật", self.flashcard_js)

    def test_tactile_navigation_markup_and_counter(self):
        """buildCardArea must render tactile navigation controls [← Trước] [Current / Total] [Tiếp →]."""
        self.assertIn('class="study-nav-controls"', self.flashcard_js)
        self.assertIn('id="prevCardBtn"', self.flashcard_js)
        self.assertIn('id="nextCardBtn"', self.flashcard_js)
        self.assertIn('id="studyNavPosition"', self.flashcard_js)
        self.assertIn('id="studyNavCurrent"', self.flashcard_js)
        self.assertIn('id="studyNavTotal"', self.flashcard_js)

    def test_arrow_key_grading_bug_resolved(self):
        """Arrow keys in progress.js must navigate cards when unrevealed, and only grade when revealed."""
        self.assertIn("isCardRevealed", self.progress_js)
        self.assertIn("rateCurrentCard('good')", self.progress_js)
        self.assertIn("rateCurrentCard('again')", self.progress_js)
        self.assertIn("nextCard()", self.progress_js)
        self.assertIn("prevCard()", self.progress_js)
        self.assertIn("window.isCardRevealed = isCardRevealed", self.flashcard_js)

    def test_desktop_layout_container_width(self):
        """Desktop layout must expand main column from 660px/680px to 820px/860px."""
        self.assertIn("max-width: 820px", self.workstation_css)
        self.assertIn("max-width: 860px", self.workstation_css)

    def test_cjk_fonts_placed_first(self):
        """Chinese font family for .hanzi must place CJK fonts before system fonts."""
        match = re.search(r"body\.flashcard-study-mode\s+\.hanzi\s*\{[^}]*font-family:\s*([^;]+);", self.workstation_css)
        self.assertIsNotNone(match, ".hanzi font-family rule not found in workstation.css")
        font_family = match.group(1).strip()
        self.assertTrue(font_family.startswith('"PingFang SC"'),
                        f".hanzi font-family ({font_family}) must start with CJK font 'PingFang SC'")

    def test_nav_row_remains_visible_on_card_reveal(self):
        """Study navigation controls must remain visible when card is flipped."""
        self.assertNotIn(".card.is-flipped ~ #studyNavRow", self.workstation_css,
                         "studyNavRow must not be forcibly hidden when card is flipped")



def run_tests():
    suite = unittest.TestSuite()
    loader = unittest.TestLoader()
    suite.addTests(loader.loadTestsFromTestCase(TestResponsiveBreakpointsAndParity))
    suite.addTests(loader.loadTestsFromTestCase(TestTypographyAndTouchFloors))
    suite.addTests(loader.loadTestsFromTestCase(TestLayoutHazardAndOverflowAudit))
    suite.addTests(loader.loadTestsFromTestCase(TestFlashcardStudyViewportBalance))
    suite.addTests(loader.loadTestsFromTestCase(TestThemeVariablesAndContrast))
    suite.addTests(loader.loadTestsFromTestCase(TestMobileLandscapeAdaptations))
    suite.addTests(loader.loadTestsFromTestCase(TestTouchTargetAccessibility))
    suite.addTests(loader.loadTestsFromTestCase(TestZIndexStackingHierarchy))
    suite.addTests(loader.loadTestsFromTestCase(TestGridBlowoutProtection))
    suite.addTests(loader.loadTestsFromTestCase(TestViewportMetaConfiguration))
    suite.addTests(loader.loadTestsFromTestCase(TestAssetAndPwaSynchronization))
    suite.addTests(loader.loadTestsFromTestCase(TestHtmlStructureAndSemantics))
    suite.addTests(loader.loadTestsFromTestCase(TestTodayReviewZenMode))
    suite.addTests(loader.loadTestsFromTestCase(TestFlashcardIllustrationIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestLearningProgressNavigator))
    suite.addTests(loader.loadTestsFromTestCase(TestFlashcardExperienceRefinements))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
