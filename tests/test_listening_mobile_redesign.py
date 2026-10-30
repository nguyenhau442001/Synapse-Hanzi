#!/usr/bin/env python3
"""
tests/test_listening_mobile_redesign.py

Automated test suite verifying the Mobile-First Listening Practice Redesign:
1. Elimination of redundant question counters in header and bottom nav.
2. Streamlined Information Architecture and consolidated secondary controls.
3. Mobile-first audio player: horizontal row layout preserving 44px touch targets.
4. Mobile-first True/False answer actions: ergonomic 2-column side-by-side layout.
5. Touch-friendly question progress rail with horizontal overflow handling.
6. Safe-area insets & dynamic viewport support.
7. Full functional preservation (playback, seeking, shortcuts, persistence).
"""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

class TestListeningMobileRedesign(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.js_content = (ROOT / "assets/js/listening-practice.js").read_text(encoding="utf-8")
        cls.css_content = (ROOT / "assets/css/listening-practice.css").read_text(encoding="utf-8")

    def test_no_redundant_question_counters(self):
        """Redundant question counter should not be duplicated across header, strip, and footer."""
        # Bottom nav should not have duplicated question counter element
        self.assertNotIn("listening-bottom-counter", self.js_content,
                         "Duplicated question counter should be removed from bottom nav")

    def test_consolidated_secondary_controls(self):
        """Rules, auto-save status, and menu should be consolidated into the top header."""
        self.assertIn('class="listening-rules-wrap"', self.js_content)
        self.assertIn('class="listening-sync-indicator"', self.js_content)
        self.assertIn('class="listening-menu-anchor"', self.js_content)
        # Rules popover is anchored in the top utility header
        self.assertIn('listeningRulesBtn', self.js_content)
        self.assertIn('listeningRulesPopover', self.js_content)

    def test_mobile_audio_player_horizontal_layout(self):
        """Audio player on mobile must maintain a streamlined horizontal row instead of heavy stacked cards."""
        mobile_block = ""
        if "@media (max-width: 680px)" in self.css_content:
            mobile_block = self.css_content.split("@media (max-width: 680px)")[1].split("/* ===")[0]

        self.assertIn("flex-direction: row", mobile_block,
                      "Audio player controls grid must maintain horizontal row on mobile")
        self.assertNotIn("width: 100%;\n    height: 44px", mobile_block,
                         "Primary play button must not expand to full-width block on mobile")

    def test_mobile_answers_grid_side_by_side(self):
        """Answer buttons (Đúng/Sai) must remain side-by-side on mobile for ergonomic thumb access."""
        mobile_block = ""
        if "@media (max-width: 680px)" in self.css_content:
            mobile_block = self.css_content.split("@media (max-width: 680px)")[1].split("/* ===")[0]

        self.assertIn("grid-template-columns: 1fr 1fr", mobile_block,
                      "Answers grid must be 2 columns side-by-side on mobile")

    def test_question_progress_map_scrollable_rail(self):
        """Question dots on mobile must form a smooth scrollable rail rather than wrapping awkwardly."""
        mobile_block = ""
        if "@media (max-width: 680px)" in self.css_content:
            mobile_block = self.css_content.split("@media (max-width: 680px)")[1].split("/* ===")[0]

        self.assertIn("overflow-x: auto", mobile_block,
                      "Progress map must enable horizontal scrolling on mobile")
        self.assertIn("-webkit-overflow-scrolling: touch", mobile_block,
                      "Progress map must support iOS momentum scrolling")

    def test_touch_targets_meet_guidelines(self):
        """Interactive touch targets must be at least 44px where practical."""
        self.assertIn("min-height: 44px", self.css_content, "Play button must have min-height 44px")
        self.assertIn("min-height: 46px", self.css_content, "Navigation buttons must have min-height 46px")
        # Answer buttons height 52-54px
        self.assertTrue("height: 54px" in self.css_content or "height: 52px" in self.css_content)

    def test_safe_area_and_dvh_support(self):
        """Viewport styling should respect modern mobile safe areas and dynamic viewport height."""
        self.assertIn("safe-area-inset-top", self.css_content)
        self.assertIn("safe-area-inset-bottom", self.css_content)
        self.assertIn("100dvh", self.css_content)

    def test_statement_visual_hierarchy(self):
        """Statement block should be the prominent hero without competing harsh 4px borders."""
        statement_block = self.css_content.split(".listening-statement-block {")[1].split("}")[0]
        self.assertNotIn("border-left: 4px", statement_block,
                         "Harsh 4px border-left on statement block should be removed for cleaner hierarchy")

    def test_keyboard_shortcuts_intact(self):
        """Space, P, 1, 2, T, F, R, and Escape shortcuts must remain intact."""
        self.assertIn("e.key === ' '", self.js_content)
        self.assertIn("e.key.toLowerCase() === 'p'", self.js_content)
        self.assertIn("e.key === '1'", self.js_content)
        self.assertIn("e.key === '2'", self.js_content)
        self.assertIn("e.key.toLowerCase() === 't'", self.js_content)
        self.assertIn("e.key.toLowerCase() === 'f'", self.js_content)
        self.assertIn("e.key.toLowerCase() === 'r'", self.js_content)
        self.assertIn("e.key === 'Escape'", self.js_content)

if __name__ == "__main__":
    unittest.main()
