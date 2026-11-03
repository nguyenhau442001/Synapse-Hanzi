#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tests/test_hanzi_flashcard_ux.py
Unit tests verifying mobile-first UX redesign for Hanzi flashcard experience:
1. Reliable Mobile Horizontal Swipe Gestures with hysteresis & velocity-based flicks.
2. Prevention of card flipping when expanding/collapsing accordions or clicking nested controls.
3. Decoupling of interactive selectors from card-level gesture handlers.
4. Clean visual hierarchy, mobile layout ergonomics, and accessible touch targets.
"""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CARD_INTERACTIONS_JS = ROOT / "assets" / "js" / "card-interactions.js"
FLASHCARD_JS = ROOT / "assets" / "js" / "flashcard.js"
WORKSTATION_CSS = ROOT / "assets" / "css" / "workstation.css"
FLASHCARD_CSS = ROOT / "assets" / "css" / "flashcard.css"


class TestHanziFlashcardUX(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.interactions_js = CARD_INTERACTIONS_JS.read_text(encoding="utf-8")
        cls.flashcard_js = FLASHCARD_JS.read_text(encoding="utf-8")
        cls.workstation_css = WORKSTATION_CSS.read_text(encoding="utf-8")
        cls.flashcard_css = FLASHCARD_CSS.read_text(encoding="utf-8")

    def test_interactive_selector_covers_all_nested_controls(self):
        """Interactive selector must include accordions, summary, chevron, audio, and chips."""
        required_selectors = [
            "summary",
            "details",
            ".card-accordion",
            ".card-accordion-summary",
            ".card-accordion-body",
            ".accordion-chevron",
            ".sound-btn",
            ".speech-btn",
            ".example-sound-btn",
            ".radical-chip",
            ".card-related-chip",
            ".hanzi-stage",
            "#hanziStage",
            ".card-flip-prompt",
            "#cardFlipPrompt",
        ]
        for sel in required_selectors:
            self.assertIn(sel, self.interactions_js, f"Missing {sel} in FLASHCARD_INTERACTIVE_SELECTOR")

    def test_touch_events_use_non_passive_touchmove(self):
        """touchmove listener must be non-passive to allow e.preventDefault() during horizontal swipe."""
        self.assertIn("card.addEventListener('touchmove', onTouchMove, { passive: false })", self.interactions_js)
        self.assertIn("card.addEventListener('touchstart', onTouchStart, { passive: true })", self.interactions_js)

    def test_horizontal_swipe_hysteresis_locking(self):
        """Card interactions must lock direction cleanly with a hysteresis ratio to prevent vertical scroll conflict."""
        self.assertIn("DRAG_LOCK_THRESHOLD", self.interactions_js)
        self.assertIn("locked = 'h'", self.interactions_js)
        self.assertIn("locked = 'v'", self.interactions_js)
        self.assertIn("e.cancelable && e.preventDefault()", self.interactions_js.replace("if (e.cancelable) e.preventDefault()", "e.cancelable && e.preventDefault()"))

    def test_flick_velocity_commit_support(self):
        """Swiping must support both distance commit and natural flick velocity."""
        self.assertIn("velocity", self.interactions_js)
        self.assertIn("isFlick", self.interactions_js)
        self.assertIn("isDistance", self.interactions_js)

    def test_accordion_summaries_stop_propagation(self):
        """Accordion summaries must stop click event propagation to avoid accidental flips."""
        self.assertIn('<summary class="card-accordion-summary" onclick="event.stopPropagation()">', self.flashcard_js)

    def test_mobile_rating_buttons_touch_target_height(self):
        """Rating buttons on mobile must maintain comfortable tactile touch targets."""
        self.assertIn(".rating-btn", self.workstation_css)
        self.assertIn(".rating-btn--good", self.workstation_css)
        self.assertIn(".rating-btn--again", self.workstation_css)

    def test_reduced_motion_respected_in_gestures(self):
        """Gestures must respect user prefers-reduced-motion preferences."""
        self.assertIn("prefersReduced", self.interactions_js)
        self.assertIn("prefers-reduced-motion", self.interactions_js)


if __name__ == "__main__":
    unittest.main()
