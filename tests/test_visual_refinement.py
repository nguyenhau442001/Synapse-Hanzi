#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Static checks for the v3.7.0 visual refinement of the study screen."""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = (ROOT / "assets" / "css" / "workstation.css").read_text(encoding="utf-8")
JS = (ROOT / "src" / "islands" / "FlashcardStudy.jsx").read_text(encoding="utf-8")
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
BLOCK = CSS.split("Visual refinement (v3.7.0)", 1)[1]


class TestVisualRefinement(unittest.TestCase):
    def test_progress_uses_accent_not_green(self):
        self.assertIn(".progress-nav-metric-pct { color: var(--accent);", BLOCK)
        self.assertIn(".progress-nav-seg--known,", BLOCK)

    def test_pinyin_uses_single_accent_everywhere(self):
        self.assertIn("body.flashcard-study-mode .pinyin,", BLOCK)
        self.assertIn("color: var(--accent) !important;", BLOCK)

    def test_nav_is_one_centered_group(self):
        self.assertIn("justify-content: center;", BLOCK.split("Prev / position / next", 1)[1])

    def test_accordion_icons_are_monochrome_svg(self):
        self.assertNotIn('aria-hidden="true">🧩</span>', JS)
        self.assertNotIn('aria-hidden="true">🔗</span>', JS)
        # One shared accordion template renders an inline SVG icon for both accordions.
        self.assertEqual(JS.count('<span class="accordion-icon" aria-hidden="true"><svg'), 1)
        self.assertEqual(JS.count('${cardAccordionHtml({'), 2)

    def test_signature_author_before_metadata(self):
        sig = INDEX[INDEX.index('<div class="cs-credit">'):]
        self.assertLess(sig.index('class="cs-author"'), sig.index('class="cs-meta"'))


if __name__ == "__main__":
    unittest.main()
