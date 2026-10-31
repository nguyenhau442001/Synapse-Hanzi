#!/usr/bin/env python3
"""
Unit tests for the Flashcard Active Recall redesign:
1. Active Recall: Front displays only Hanzi + Illustration mnemonic anchor, hides Pinyin, Meaning, Badges, Examples, Accordions until flipped.
2. Interaction Design & Ergonomics: Direct keyboard shortcut badges [1 / ←] & [2 / →] on rating buttons, enhanced hover states, compact card height.
3. Clean-up & Accordions: Expandable accordion components for Hanzi Decomposition and Related Words (collapsed by default).
"""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FLASHCARD_JS = ROOT / "assets" / "js" / "flashcard.js"
FLASHCARD_CSS = ROOT / "assets" / "css" / "flashcard.css"
WORKSTATION_CSS = ROOT / "assets" / "css" / "workstation.css"
DECOMP_JS = ROOT / "assets" / "js" / "hanzi-decomposition.js"
RELATED_JS = ROOT / "assets" / "js" / "related-words.js"
PROGRESS_JS = ROOT / "assets" / "js" / "progress.js"

class TestFlashcardActiveRecall(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fc_js = FLASHCARD_JS.read_text(encoding="utf-8")
        cls.fc_css = FLASHCARD_CSS.read_text(encoding="utf-8")
        cls.ws_css = WORKSTATION_CSS.read_text(encoding="utf-8")
        cls.decomp_js = DECOMP_JS.read_text(encoding="utf-8")
        cls.related_js = RELATED_JS.read_text(encoding="utf-8")
        cls.prog_js = PROGRESS_JS.read_text(encoding="utf-8")

    def test_active_recall_front_hides_spoilers(self):
        """Front of card (.card:not(.is-flipped)) must hide pinyin, meaning, example, visual illustration, and accordions."""
        self.assertIn(".card:not(.is-flipped) .pinyin-row", self.fc_css)
        self.assertIn(".card:not(.is-flipped) .meaning", self.fc_css)
        self.assertIn(".card:not(.is-flipped) .example-box", self.fc_css)
        self.assertIn(".card:not(.is-flipped) .card-expandable-group", self.fc_css)
        self.assertIn(".card:not(.is-flipped) .card-visual-col", self.fc_css)

    def test_active_recall_front_hides_visual_anchor(self):
        """Front of card must hide visual illustration by default to prevent giving away the meaning."""
        self.assertIn(".card:not(.is-flipped) .card-visual-col", self.fc_css)
        self.assertIn(".card.is-flipped .card-visual-col", self.fc_css)
        self.assertIn("body.flashcard-study-mode .card:not(.is-flipped) .card-visual-col", self.ws_css)

    def test_accordions_present_in_template(self):
        """Flashcard template must contain both decomposition and related words accordions."""
        self.assertIn('id="cardDecompAccordion"', self.fc_js)
        self.assertIn('id="cardRelatedAccordion"', self.fc_js)
        self.assertIn('id="cardDecompositionWrap"', self.fc_js)
        self.assertIn('id="cardRelatedWrap"', self.fc_js)

    def test_accordions_controlled_in_js(self):
        """JS rendering must control decomposition and related accordions."""
        self.assertIn("cardDecompAccordion", self.decomp_js)
        self.assertIn("cardRelatedAccordion", self.related_js)
        self.assertIn("decompAcc.open = false", self.fc_js)
        self.assertIn("relatedAcc.open = false", self.fc_js)

    def test_rating_buttons_show_keyboard_shortcuts(self):
        """Rating buttons must render explicit keyboard shortcut badges [1 / ←] and [2 / →]."""
        self.assertIn("rating-kbd-badge", self.fc_js)
        self.assertIn("<kbd>${button.key}</kbd>", self.fc_js)
        self.assertIn("<kbd>${shortcutArrow}</kbd>", self.fc_js)

    def test_rating_buttons_high_contrast_hover(self):
        """Rating buttons must define high-contrast hover styling in CSS."""
        self.assertIn(".rating-btn--again:hover", self.fc_css)
        self.assertIn(".rating-btn--good:hover", self.fc_css)
        self.assertIn("box-shadow: 0 4px 14px", self.fc_css)

    def test_keyboard_events_support_enter_and_down_to_flip(self):
        """Keyboard handler in progress.js must support Space, Enter, ArrowDown to flip when unrevealed."""
        self.assertIn("event.key === ' ' || (!revealed && (event.key === 'Enter' || event.key === 'ArrowDown'))", self.prog_js)

    def test_related_chips_high_contrast(self):
        """Related chips must have bold Hanzi and legible contrast."""
        self.assertIn(".related-chip-hanzi", self.fc_css)
        self.assertIn("font-weight: 700", self.fc_css)

if __name__ == "__main__":
    unittest.main()
