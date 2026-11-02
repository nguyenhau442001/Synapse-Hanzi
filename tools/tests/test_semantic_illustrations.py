#!/usr/bin/env python3
"""
tools/tests/test_semantic_illustrations.py
Comprehensive Unit Test Suite for Semantic Vocabulary Illustration Engine:
1. 8-Category Semantic Classification (Professions, Animals, Food, Objects, Verbs, Adjectives, Places, Abstract)
2. Semantic Scene Blueprints & Disambiguation Rules
3. High-Quality Prompt Construction (Realistic 3D / Educational Photography style, Zero Text, No Clipart/Stick figures)
4. AI Semantic Validation & Quality Control Engine
5. Cross-Language Parity (Python & JavaScript)
"""

import json
import os
import re
import subprocess
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# Import Python implementation
import sys
sys.path.insert(0, str(REPO_ROOT / "tools"))
from generate_illustrations import (
    SEMANTIC_CATEGORIES,
    classify_semantic_category,
    plan_semantic_scene,
    build_semantic_prompt,
    validate_semantic_illustration
)

class TestSemanticCategoryClassification(unittest.TestCase):
    """Verifies that vocabulary is accurately categorized into one of 8 semantic categories."""

    def test_professions_category(self):
        words = [
            ("老师", "thầy/cô giáo", "noun"),
            ("医生", "bác sĩ", "noun"),
            ("厨师", "đầu bếp", "noun"),
            ("律师", "luật sư", "noun"),
            ("司机", "tài xế, lái xe", "noun"),
            ("警察", "cảnh sát", "noun"),
            ("服务员", "người phục vụ", "noun"),
            ("学生", "học sinh", "noun"),
        ]
        for hanzi, meaning, pos in words:
            cat = classify_semantic_category(meaning, hanzi, pos)
            self.assertEqual(cat['code'], 'profession', f"'{hanzi}' ({meaning}) must be categorized as 'profession', got {cat['code']}")

    def test_animals_category(self):
        words = [
            ("狗", "con chó", "noun"),
            ("猫", "con mèo", "noun"),
            ("鸟", "con chim", "noun"),
            ("鱼", "con cá", "noun"),
            ("熊猫", "gấu trúc", "noun"),
            ("老虎", "con hổ", "noun"),
            ("兔子", "con thỏ", "noun"),
        ]
        for hanzi, meaning, pos in words:
            cat = classify_semantic_category(meaning, hanzi, pos)
            self.assertEqual(cat['code'], 'animal', f"'{hanzi}' ({meaning}) must be categorized as 'animal', got {cat['code']}")

    def test_food_category(self):
        words = [
            ("苹果", "quả táo", "noun"),
            ("米饭", "cơm", "noun"),
            ("饺子", "bánh sủi cảo", "noun"),
            ("茶", "trà, chè", "noun"),
            ("咖啡", "cà phê", "noun"),
            ("蛋糕", "bánh ngọt, bánh gato", "noun"),
            ("鸡蛋", "trứng gà", "noun"),
        ]
        for hanzi, meaning, pos in words:
            cat = classify_semantic_category(meaning, hanzi, pos)
            self.assertEqual(cat['code'], 'food', f"'{hanzi}' ({meaning}) must be categorized as 'food', got {cat['code']}")

    def test_objects_category(self):
        words = [
            ("电脑", "máy tính", "noun"),
            ("手机", "điện thoại", "noun"),
            ("桌子", "cái bàn", "noun"),
            ("椅子", "cái ghế", "noun"),
            ("衣服", "quần áo", "noun"),
            ("飞机", "máy bay", "noun"),
            ("自行车", "xe đạp", "noun"),
        ]
        for hanzi, meaning, pos in words:
            cat = classify_semantic_category(meaning, hanzi, pos)
            self.assertEqual(cat['code'], 'object', f"'{hanzi}' ({meaning}) must be categorized as 'object', got {cat['code']}")

    def test_verbs_category(self):
        words = [
            ("跑步", "chạy bộ", "verb"),
            ("游泳", "bơi lội", "verb"),
            ("唱歌", "ca hát", "verb"),
            ("跳舞", "khiêu vũ, nhảy múa", "verb"),
            ("睡觉", "đi ngủ", "verb"),
        ]
        for hanzi, meaning, pos in words:
            cat = classify_semantic_category(meaning, hanzi, pos)
            self.assertEqual(cat['code'], 'verb', f"'{hanzi}' ({meaning}) must be categorized as 'verb', got {cat['code']}")

    def test_adjectives_category(self):
        words = [
            ("大", "to, lớn", "adj"),
            ("小", "nhỏ, bé", "adj"),
            ("高", "cao", "adj"),
            ("热", "nóng", "adj"),
            ("冷", "lạnh", "adj"),
            ("漂亮", "đẹp, xinh đẹp", "adj"),
            ("高兴", "vui vẻ, vui mừng", "adj"),
        ]
        for hanzi, meaning, pos in words:
            cat = classify_semantic_category(meaning, hanzi, pos)
            self.assertEqual(cat['code'], 'adj', f"'{hanzi}' ({meaning}) must be categorized as 'adj', got {cat['code']}")

    def test_places_category(self):
        words = [
            ("学校", "trường học", "noun"),
            ("医院", "bệnh viện", "noun"),
            ("饭店", "nhà hàng, quán ăn", "noun"),
            ("机场", "sân bay, phi trường", "noun"),
            ("商店", "cửa hàng", "noun"),
        ]
        for hanzi, meaning, pos in words:
            cat = classify_semantic_category(meaning, hanzi, pos)
            self.assertEqual(cat['code'], 'place', f"'{hanzi}' ({meaning}) must be categorized as 'place', got {cat['code']}")

    def test_abstract_category(self):
        words = [
            ("昨天", "hôm qua", "noun"),
            ("明天", "ngày mai", "noun"),
            ("经常", "thường xuyên", "adv"),
            ("虽然", "mặc dù, tuy rằng", "conj"),
            ("甚至", "thậm chí", "conj"),
        ]
        for hanzi, meaning, pos in words:
            cat = classify_semantic_category(meaning, hanzi, pos)
            self.assertEqual(cat['code'], 'abstract', f"'{hanzi}' ({meaning}) must be categorized as 'abstract', got {cat['code']}")


class TestSemanticSceneBlueprint(unittest.TestCase):
    """Verifies that structured scene planning generates focal subjects, roles, and disambiguation rules."""

    def test_teacher_scene_plan(self):
        info = {
            "hanzi": "老师",
            "pinyin": "lǎoshī",
            "meaning": "thầy/cô giáo",
            "example_zh": "她是我的老师。",
            "example_vi": "Cô ấy là giáo viên của tôi."
        }
        plan = plan_semantic_scene(info)
        self.assertEqual(plan["category"]["code"], "profession")
        self.assertIn("professional person", plan["focal_subject"].lower())
        self.assertIn("instructing", plan["role_or_action"].lower())
        self.assertIn("classroom", plan["environment_context"].lower())
        self.assertIn("student", plan["confusable_distinctions"].lower())
        self.assertIn("stick figures", plan["confusable_distinctions"].lower())

    def test_running_scene_plan(self):
        info = {
            "hanzi": "跑步",
            "pinyin": "pǎobù",
            "meaning": "chạy bộ",
            "example_zh": "他每天早上跑步。",
            "example_vi": "Anh ấy chạy bộ mỗi sáng."
        }
        plan = plan_semantic_scene(info)
        self.assertEqual(plan["category"]["code"], "verb")
        self.assertIn("action", plan["focal_subject"].lower())
        self.assertIn("biomechanical", plan["role_or_action"].lower())
        self.assertIn("track", plan["environment_context"].lower())
        self.assertIn("arrows", plan["confusable_distinctions"].lower())
        self.assertIn("stick figures", plan["confusable_distinctions"].lower())


class TestSemanticPromptConstruction(unittest.TestCase):
    """Verifies prompt construction incorporates new standards, realistic style, and strict negative constraints."""

    def test_prompt_includes_essential_requirements(self):
        info = {
            "hanzi": "老师",
            "pinyin": "lǎoshī",
            "meaning": "thầy/cô giáo",
            "example_vi": "Cô ấy là giáo viên của tôi."
        }
        prompt = build_semantic_prompt(info)
        # 1. Semantic accuracy & Anchor
        self.assertIn("SEMANTIC ACCURACY FIRST", prompt)
        self.assertIn("老师", prompt)
        self.assertIn("lǎoshī", prompt)
        self.assertIn("thầy/cô giáo", prompt)
        # 2. Realistic visual style
        self.assertIn("realistic 3D educational illustration style", prompt)
        self.assertIn("Realistic human anatomy", prompt)
        self.assertIn("One clear centered dominant focal subject", prompt)
        self.assertIn("Square 1:1 aspect ratio", prompt)
        self.assertIn("100-150 pixels", prompt)
        # 3. Strict negative constraints
        self.assertIn("ABSOLUTELY NO childish elementary-school clipart", prompt)
        self.assertIn("ABSOLUTELY NO stick figures", prompt)
        self.assertIn("ABSOLUTELY NO flat generic minimalist icons", prompt)
        self.assertIn("ABSOLUTELY NO text", prompt)
        self.assertIn("NO Chinese characters", prompt)
        self.assertIn("NO English words", prompt)


class TestSemanticValidationEngine(unittest.TestCase):
    """Verifies that the validation engine strictly enforces quality control criteria."""

    def test_rejects_embedded_text(self):
        info = {"hanzi": "老师", "meaning": "thầy/cô giáo"}
        plan = plan_semantic_scene(info)
        bad_svg = '<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="240"/><text x="10" y="20">老师</text></svg>'
        valid, reason = validate_semantic_illustration(info, plan, bad_svg)
        self.assertFalse(valid)
        self.assertIn("<text>", reason)

    def test_rejects_non_square_aspect_ratio(self):
        info = {"hanzi": "苹果", "meaning": "quả táo"}
        plan = plan_semantic_scene(info)
        bad_svg = '<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="200" fill="#333"/><circle cx="150" cy="100" r="50" fill="red"/><path d="M100 100 L200 100"/></svg>'
        valid, reason = validate_semantic_illustration(info, plan, bad_svg)
        self.assertFalse(valid)
        self.assertIn("aspect ratio", reason.lower())

    def test_rejects_primitive_stick_figures(self):
        info = {"hanzi": "跑步", "meaning": "chạy bộ"}
        plan = plan_semantic_scene(info)
        bad_svg = '<svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="50"/></svg>'
        valid, reason = validate_semantic_illustration(info, plan, bad_svg)
        self.assertFalse(valid)
        self.assertIn("too simplistic", reason.lower())

    def test_approves_upgraded_reference_illustrations(self):
        ref_words = ["老师", "医生", "厨师", "苹果", "跑步"]
        for hanzi in ref_words:
            svg_path = REPO_ROOT / "assets" / "images" / "illustrations" / f"{hanzi}.svg"
            self.assertTrue(svg_path.exists(), f"Reference illustration {svg_path} must exist")
            svg_content = svg_path.read_text(encoding="utf-8")
            info = {"hanzi": hanzi, "meaning": hanzi}
            plan = plan_semantic_scene(info)
            valid, reason = validate_semantic_illustration(info, plan, svg_content)
            self.assertTrue(valid, f"Upgraded {hanzi}.svg must pass semantic validation, but failed: {reason}")


class TestNodeJSEquivalence(unittest.TestCase):
    """Verifies that the JavaScript engine in word-illustrations.js behaves identically to the Python engine."""

    def test_js_classification_parity(self):
        js_code = """
        const m = require('./assets/js/word-illustrations.js');
        const words = ['老师', '医生', '厨师', '苹果', '跑步', '狗', '电脑', '学校', '高兴', '昨天'];
        const results = words.map(w => ({ hanzi: w, cat: m.classifySemanticCategory({ hanzi: w, meaning: w }).code }));
        console.log(JSON.stringify(results));
        """
        proc = subprocess.run(["node", "-e", js_code], cwd=str(REPO_ROOT), capture_output=True, text=True, check=True)
        js_results = {item['hanzi']: item['cat'] for item in json.loads(proc.stdout.strip())}

        for hanzi, expected_cat in js_results.items():
            py_cat = classify_semantic_category(hanzi, hanzi)['code']
            self.assertEqual(py_cat, expected_cat, f"Mismatch for '{hanzi}': Python={py_cat}, JS={expected_cat}")


if __name__ == "__main__":
    unittest.main()
