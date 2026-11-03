#!/usr/bin/env python3
"""
Unit tests for the refined Daily Goal Card UI:
1. Card displays ONLY the 4 specified content sections:
   - Top row: Left: 🎯 MỤC TIÊU HÔM NAY, Right: 🔥 0 ngày (streak)
   - Main heading: Mỗi ngày một chút, nhớ lâu hơn ⚙️
   - Progress section: 0 / 50 từ, 0%, full-width progress bar
   - Supporting text: Học thêm hôm nay để hoàn thành mục tiêu.
2. Unrelated stats (total remembered, total studied), secondary actions (study history,
   quick study button, today review button), and 2-column clutter are removed from this card.
3. Safe data calculation: handles zero goal safely, clamps percentage 0-100%, keeps progress bar synchronized.
"""

import unittest
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = ROOT / "index.html"
DASHBOARD_CSS = ROOT / "assets" / "css" / "dashboard-enhancements.css"
LEVEL_PICKER_CSS = ROOT / "assets" / "css" / "level-picker.css"
LEVELS_JS = ROOT / "assets" / "js" / "levels.js"

class TestDailyGoalWidget(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = INDEX_HTML.read_text(encoding="utf-8")
        cls.dash_css = DASHBOARD_CSS.read_text(encoding="utf-8")
        cls.picker_css = LEVEL_PICKER_CSS.read_text(encoding="utf-8")
        cls.levels_js = LEVELS_JS.read_text(encoding="utf-8")

        # Extract the learningDashboard section html
        match = re.search(r'(<section[^>]*id="learningDashboard"[^>]*>.*?</section>)', cls.html, re.DOTALL)
        cls.card_html = match.group(1) if match else ""

    def test_learning_dashboard_present(self):
        """Card must exist in DOM."""
        self.assertTrue(self.card_html, "learningDashboard section not found in index.html")

    def test_four_content_sections_present(self):
        """Card must contain only the 4 specified sections."""
        # 1. Top row
        self.assertIn("🎯 MỤC TIÊU HÔM NAY", self.card_html)
        self.assertIn('id="bannerStreakBadge"', self.card_html)
        self.assertIn('id="bannerStreakText"', self.card_html)

        # 2. Main heading
        self.assertIn('id="learningDashboardTitle"', self.card_html)
        self.assertIn("Mỗi ngày một chút, nhớ lâu hơn", self.card_html)
        self.assertIn("⚙️", self.card_html)
        self.assertIn('id="dailyGoalSelect"', self.card_html)

        # 3. Progress section
        self.assertIn('id="dailyStudyCount"', self.card_html)
        self.assertIn('id="dailyGoalTargetText"', self.card_html)
        self.assertIn('id="dailyGoalPct"', self.card_html)
        self.assertIn('id="dailyGoalFill"', self.card_html)

        # 4. Supporting text
        self.assertIn('id="dailyGoalMessage"', self.card_html)
        self.assertIn("Học thêm hôm nay để hoàn thành mục tiêu.", self.card_html)

    def test_unrelated_clutter_removed_from_card(self):
        """Card must not contain unrelated badges, history trigger, stat pills, or secondary action buttons."""
        self.assertNotIn("history-trigger", self.card_html)
        self.assertNotIn("stat-pill", self.card_html)
        self.assertNotIn('id="totalKnownCount"', self.card_html)
        self.assertNotIn('id="totalStudiedCount"', self.card_html)
        self.assertNotIn('id="quickStudyButton"', self.card_html)
        self.assertNotIn('id="todayReviewButton"', self.card_html)
        self.assertNotIn("daily-goal-col-side", self.card_html)

    def test_levels_js_safe_calculation_and_updates(self):
        """levels.js must handle zero goal safely, synchronize progress bar, streak and message."""
        self.assertIn("const validGoal = dailyGoal > 0 ? dailyGoal : 50;", self.levels_js)
        self.assertIn("document.getElementById('dailyGoalPct')", self.levels_js)
        self.assertIn("document.getElementById('dailyGoalTargetText')", self.levels_js)
        self.assertIn("document.getElementById('bannerStreakText')", self.levels_js)
        self.assertIn("Học thêm hôm nay để hoàn thành mục tiêu.", self.levels_js)
        self.assertIn("`${streak} ngày`", self.levels_js)

    def test_css_styling_and_responsive(self):
        """CSS must define clean, focused layout styles."""
        self.assertIn(".learning-dashboard.dashboard-hero-banner", self.dash_css)
        self.assertIn(".daily-goal-streak", self.dash_css)
        self.assertIn(".daily-goal-progress-section", self.dash_css)
        self.assertIn(".daily-goal-metric-row", self.dash_css)
        self.assertIn(".daily-goal-pct", self.dash_css)
        self.assertIn(".daily-goal-track", self.dash_css)
        self.assertIn(".daily-goal-fill", self.dash_css)
        self.assertIn(".daily-goal-message", self.dash_css)

if __name__ == '__main__':
    unittest.main()
