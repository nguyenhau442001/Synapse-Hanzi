#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Static checks for the v3.8.2 study-screen design system polish."""

import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = (ROOT / "assets" / "css" / "workstation.css").read_text(encoding="utf-8")
JS = (ROOT / "src" / "islands" / "FlashcardStudy.jsx").read_text(encoding="utf-8")
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
POLISH = CSS[CSS.index("Design system polish (v3.8.2)"):]


class TestDesignSystemPolish(unittest.TestCase):
    def test_single_palette_tokens_for_study_screen(self):
        for token in ("--accent: #B4532F;", "--hs-sage:", "--hs-coral:", "--hs-beige:", "--hs-ink-plate:"):
            self.assertIn(token, POLISH)

    def test_illustration_backdrop_is_repainted_not_replaced(self):
        # The SVG artwork is untouched; only its full-bleed backdrop rect is tagged for CSS.
        self.assertIn('<rect class="illu-backdrop"', JS)
        self.assertIn('.card-illustration-svg svg:not([data-style="editorial"]) .illu-backdrop { fill: var(--hs-ink-plate); }', POLISH)

    def test_backdrop_regex_tags_only_the_first_full_bleed_rect(self):
        # Run the exact regex from flashcard.js through Node.
        m = re.search(r"normalized = normalized\.replace\(\s*(/\(<svg.+?/i),\s*'\$1<rect class", JS, re.S)
        self.assertIsNotNone(m)
        script = (
            "const re = " + m.group(1) + ";"
            "const tag = s => s.replace(re, '$1<rect class=\"illu-backdrop\"');"
            "const a = tag('<svg width=\"240\" height=\"240\"><!-- c --><defs><linearGradient id=\"g\"/></defs>"
            "<rect width=\"240\" height=\"240\" rx=\"24\" fill=\"url(#g)\"/><rect x=\"5\" width=\"240\" height=\"240\"/></svg>');"
            "const b = tag('<svg><circle r=\"3\"/><rect width=\"240\" height=\"240\"/></svg>');"
            "console.log(JSON.stringify([a.split('illu-backdrop').length - 1, a.includes('</defs><rect class=\"illu-backdrop\" width'), b.includes('illu-backdrop')]));"
        )
        out = subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout
        self.assertEqual(json.loads(out), [1, True, False])

    def test_hanzi_is_about_ten_percent_smaller(self):
        self.assertIn(".word-hero-container .hanzi { font-size: clamp(54px, 5.8vw, 68px); }", POLISH)

    def test_card_corner_ornaments_removed(self):
        self.assertIn("#cardArea > .card::after { display: none; }", POLISH)

    def test_creator_handle_and_social_links_grouped(self):
        sig = INDEX[INDEX.index('<section class="creator-signature"'):]
        sig = sig[:sig.index("</section>")]
        self.assertIn('<strong class="cs-handle">haunguyenngoc442001</strong>', sig)
        links = sig[sig.index('class="cs-links"'):]
        self.assertIn("GitHub", links)
        self.assertIn("Facebook", links)


if __name__ == "__main__":
    unittest.main()
