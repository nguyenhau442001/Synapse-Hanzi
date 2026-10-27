#!/usr/bin/env python3
"""
Unit tests for the Daily Learning Goal Widget overhaul:
1. Balanced 2-column layout (Left: Metrics & Gamified Progress, Right: Goal Config Pill, Modern Stat Badges, Quick Actions).
2. Elimination of awkward '0 / [50] từ' by splitting metric count header and goal config selector.
3. Elimination of outdated divider line and weird ':' separator in learning stats.
4. Modern stat pills with distinct semantic status badges (known vs studied).
5. Gamified motivation: dynamic percentage badge (#dailyGoalPct), streak badge (#bannerStreakBadge).
"""

import unittest
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

    def test_essential_dom_ids_preserved(self):
        """All functional DOM IDs required by the learning dashboard must be preserved."""
        required_ids = [
            'learningDashboard',
            'learningDashboardTitle',
            'dailyStudyCount',
            'dailyGoalTargetText',
            'dailyGoalPct',
            'dailyGoalFill',
            'dailyGoalMessage',
            'dailyGoalSelect',
            'totalKnownCount',
            'totalStudiedCount',
            'quickStudyButton',
            'todayReviewButton',
            'todayDueCount',
            'bannerStreakText',
            'bannerStreakBadge',
        ]
        for dom_id in required_ids:
            self.assertIn(f'id="{dom_id}"', self.html, f"Missing required DOM id: {dom_id}")

    def test_two_column_structure_present(self):
        """Markup must define main metric column and side configuration/stats column."""
        self.assertIn('class="daily-goal-col-main"', self.html)
        self.assertIn('class="daily-goal-col-side"', self.html)
        self.assertIn('class="daily-goal-metric-header"', self.html)

    def test_outdated_divider_and_colon_removed(self):
        """The old divider dot/colon between known and studied counts must be replaced by modern pills."""
        self.assertIn('class="stat-pill stat-pill--known"', self.html)
        self.assertIn('class="stat-pill stat-pill--studied"', self.html)

    def test_goal_selector_is_ergonomic_pill(self):
        """Goal selector must be an intentional pill control with clear label and options."""
        self.assertIn('class="daily-goal-pill"', self.html)
        self.assertIn('class="daily-goal-pill-label"', self.html)
        self.assertIn('<option value="10"', self.html)
        self.assertIn('<option value="20"', self.html)
        self.assertIn('<option value="30"', self.html)
        self.assertIn('<option value="50"', self.html)

    def test_levels_js_updates_percentage_and_target(self):
        """levels.js renderLearningDashboard must update #dailyGoalPct and #dailyGoalTargetText."""
        self.assertIn("document.getElementById('dailyGoalPct')", self.levels_js)
        self.assertIn("document.getElementById('dailyGoalTargetText')", self.levels_js)
        self.assertIn("bannerStreakBadge", self.levels_js)
        self.assertIn("DAILY_STUDY_GOAL_OPTIONS = [10, 20, 30, 50]", self.levels_js)

    def test_css_defines_modern_widget_styles(self):
        """CSS must provide styles for the 2-column grid, stat pills, percentage badge, and streak badge."""
        self.assertIn(".stat-pill--known", self.dash_css)
        self.assertIn(".stat-pill--studied", self.dash_css)
        self.assertIn(".goal-pct-badge", self.dash_css)
        self.assertIn(".streak-badge-pill", self.dash_css)
        self.assertIn(".daily-goal-pill", self.dash_css)

if __name__ == '__main__':
    unittest.main()
