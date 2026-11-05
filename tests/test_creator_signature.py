#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Static checks for the creator signature on the home page."""

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
CSS = (ROOT / "assets" / "css" / "workstation.css").read_text(encoding="utf-8")
VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()


class TestCreatorSignature(unittest.TestCase):
    def setUp(self):
        start = INDEX.index('<section class="creator-signature"')
        self.sig = INDEX[start:INDEX.index("</section>", start)]

    def test_placed_on_home_page_not_study_screen(self):
        pos = INDEX.index('<section class="creator-signature"')
        self.assertEqual(INDEX.count('<section class="creator-signature"'), 1)
        self.assertLess(INDEX.index('id="screenVocabHub"'), pos)
        self.assertLess(pos, INDEX.index('id="screenCards"'))
        self.assertNotIn("flashcard-study-mode .creator-signature", CSS)

    def test_preserves_all_identity_and_credit_text(self):
        for text in ("汉字思维", "Hànzì Sīwéi · Hanzi Mind", "Think in Characters. Master Chinese.",
                     "Tiến trình tự lưu trên thiết bị này", "haunguyenngoc442001"):
            self.assertIn(text, self.sig)

    def test_social_links_open_safely_in_new_tab(self):
        for url in ("https://github.com/nguyenhau442001/synapse-hanzi/",
                    "https://www.facebook.com/haunguyenngoc442001/"):
            tag = re.search(r'<a [^>]*href="%s"[^>]*>' % re.escape(url), self.sig).group(0)
            self.assertIn('target="_blank"', tag)
            self.assertIn('rel="noopener noreferrer"', tag)

    def test_version_badges_stay_in_sync_with_version_file(self):
        badges = re.findall(r'<span class="footer-version"[^>]*>v([^<]*)</span>', INDEX)
        self.assertGreaterEqual(len(badges), 1)
        self.assertEqual(set(badges), {VERSION})

    def test_desktop_card_reserves_room_for_controls(self):
        self.assertIn("max-height: min(640px, calc(100dvh - var(--study-card-reserve)));", CSS)


if __name__ == "__main__":
    unittest.main()
