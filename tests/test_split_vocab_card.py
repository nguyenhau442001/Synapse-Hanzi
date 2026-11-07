#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Static checks for the split (60/40) vocabulary card layout."""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FLASHCARD_JS = (ROOT / "src" / "islands" / "FlashcardStudy.jsx").read_text(encoding="utf-8")
WORKSTATION_CSS = (ROOT / "assets" / "css" / "workstation.css").read_text(encoding="utf-8")
SPLIT = "body.flashcard-study-mode .card.is-flipped .word-hero-container.has-illustration"


class TestSplitVocabCard(unittest.TestCase):
    def test_hero_gets_illustration_class_from_existing_sync(self):
        self.assertIn("heroBlock.classList.toggle('has-illustration', hasVisual)", FLASHCARD_JS)

    def test_desktop_grid_puts_illustration_on_the_right(self):
        block = WORKSTATION_CSS.split("Split vocabulary card", 1)[1]
        self.assertIn("@media (min-width: 768px)", block)
        self.assertIn("grid-template-columns: minmax(0, max-content) auto;", block)
        self.assertIn(f"{SPLIT} > .card-visual-col", block)
        self.assertIn("grid-area: visual;", block)
        self.assertIn("--split-illu-size", block)

    def test_mobile_stays_single_column(self):
        block = WORKSTATION_CSS.split("Split vocabulary card", 1)[1]
        mobile = block.split("@media (max-width: 767px)", 1)[1]
        self.assertNotIn("display: grid", mobile)

    def test_hidden_illustration_never_reserves_space(self):
        self.assertIn(".card.is-flipped .card-visual-col[hidden]", WORKSTATION_CSS)


if __name__ == "__main__":
    unittest.main()
