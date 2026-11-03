#!/usr/bin/env python3
"""
Unit tests for the 'Chữ liên quan' (Related Characters & Clustering) feature
and the example box display fix.
"""

import unittest
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = ROOT / "index.html"
FLASHCARD_JS = ROOT / "assets" / "js" / "flashcard.js"
RELATED_JS = ROOT / "assets" / "js" / "related-words.js"
PROGRESS_JS = ROOT / "assets" / "js" / "progress.js"
FLASHCARD_CSS = ROOT / "assets" / "css" / "flashcard.css"
WORKSTATION_CSS = ROOT / "assets" / "css" / "workstation.css"
SW_JS = ROOT / "sw.js"

class TestRelatedWordsFeature(unittest.TestCase):
    def test_related_script_registered(self):
        html = INDEX_HTML.read_text(encoding="utf-8")
        self.assertIn("assets/js/related-words.js", html, "related-words.js must be registered in index.html")

    def test_sw_caches_related_script(self):
        sw = SW_JS.read_text(encoding="utf-8")
        self.assertIn("related-words.js", sw, "sw.js must precache related-words.js")

    def test_card_related_wrap_in_template(self):
        flashcard_code = FLASHCARD_JS.read_text(encoding="utf-8")
        self.assertIn('id="cardRelatedWrap"', flashcard_code, "cardRelatedWrap must exist in flashcard template")
        self.assertIn("renderCardRelated(w)", flashcard_code, "renderCardRelated must be invoked in render()")

    def test_progress_calls_hint_on_unknown(self):
        prog = PROGRESS_JS.read_text(encoding="utf-8")
        self.assertIn("showRelatedClusterHint(word)", prog, "progress.js must show cluster hint on rating 'again'")

    def test_css_styles_defined(self):
        fc_css = FLASHCARD_CSS.read_text(encoding="utf-8")
        ws_css = WORKSTATION_CSS.read_text(encoding="utf-8")
        
        self.assertIn(".card-related-wrap", fc_css)
        self.assertIn(".related-chip", fc_css)
        self.assertIn(".related-chip--known", fc_css)
        self.assertIn(".related-chip--unknown", fc_css)
        self.assertIn(".related-chip--unseen", fc_css)
        self.assertIn(".related-cluster-toast", fc_css)
        self.assertIn(".card:not(.is-flipped) .card-related-wrap", fc_css)
        self.assertIn(".card-related-wrap", ws_css)

    def test_node_query_sample_words(self):
        """Execute node test verifying related-words logic for 医院, 妈/妈妈, and 学校."""
        node_script = """
        const fs = require('fs');
        const decomps = JSON.parse(fs.readFileSync('database/radicals/hanzi_decompositions.json', 'utf8'));
        const hsk1 = JSON.parse(fs.readFileSync('database/vocabs/hsk1_vocabularies.json', 'utf8')).map(w => ({ ...w, levelKey: 'hsk1', levelRank: 1 }));
        
        const COMMON_RADICALS = new Set(['口', '氵', '亻', '扌', '艹', '木', '日', '月', '心', '忄', '土', '女', '纟', '讠', '饣', '辶']);
        const TONE_CHAR_MAP = {
          'ā':'a','á':'a','ǎ':'a','à':'a','ē':'e','é':'e','ě':'e','è':'e','ī':'i','í':'i','ǐ':'i','ì':'i',
          'ō':'o','ó':'o','ǒ':'o','ò':'o','ū':'u','ú':'u','ǔ':'u','ù':'u','ǖ':'v','ǘ':'v','ǚ':'v','ǜ':'v','ü':'v'
        };
        function stripTone(s) {
          return String(s || '').toLowerCase().replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, c => TONE_CHAR_MAP[c] || c).trim();
        }

        const charToWords = new Map();
        const compToWords = new Map();

        hsk1.forEach(w => {
          const raw = String(w.hanzi || '').replace(/[（\\(].*?[）\\)]/g, '').trim();
          const chars = Array.from(raw).filter(ch => /\\p{Script=Han}/u.test(ch));
          const uniqueChars = Array.from(new Set(chars));
          uniqueChars.forEach(ch => {
            if (!charToWords.has(ch)) charToWords.set(ch, []);
            charToWords.get(ch).push(w);

            const d = decomps[ch];
            if (d && Array.isArray(d.components)) {
              const chTone = stripTone(d.pinyin || w.pinyin);
              d.components.forEach(comp => {
                if (!comp || !comp.char) return;
                const compChar = comp.char;
                const compTone = stripTone(comp.pinyin || (decomps[compChar] && decomps[compChar].pinyin));
                const isPhonetic = Boolean(
                  compTone && chTone && (
                    compTone === chTone ||
                    (chTone.length >= 3 && compTone.length >= 3 && (chTone.endsWith(compTone) || compTone.endsWith(chTone)))
                  )
                );
                if (!compToWords.has(compChar)) compToWords.set(compChar, []);
                compToWords.get(compChar).push({ word: w, char: ch, charPy: chTone, compChar, isPhonetic });
              });
            }
          });
        });

        function query(targetWord) {
          const currentRank = 1;
          const rawTarget = String(targetWord.hanzi || '').replace(/[（\\(].*?[）\\)]/g, '').trim();
          const targetChars = Array.from(rawTarget).filter(ch => /\\p{Script=Han}/u.test(ch));
          const seenWordKeys = new Set([`${targetWord.levelKey}_${targetWord.id}`, targetWord.hanzi]);
          const wholeCharMatches = [];
          const phoneticMatches = [];
          const rareRadicalMatches = [];
          const commonRadicalMatches = [];

          targetChars.forEach(ch => {
            const list = charToWords.get(ch) || [];
            list.forEach(w => {
              if (w.levelRank > currentRank) return;
              const key = `${w.levelKey}_${w.id}`;
              if (seenWordKeys.has(key) || seenWordKeys.has(w.hanzi)) return;
              seenWordKeys.add(key);
              seenWordKeys.add(w.hanzi);
              wholeCharMatches.push({ word: w, type: 'whole-char' });
            });
          });

          targetChars.forEach(ch => {
            const d = decomps[ch];
            if (!d || !Array.isArray(d.components)) return;
            const chTone = stripTone(d.pinyin || targetWord.pinyin);

            d.components.forEach(comp => {
              if (!comp || !comp.char) return;
              const compChar = comp.char;
              const compTone = stripTone(comp.pinyin || (decomps[compChar] && decomps[compChar].pinyin));
              const targetIsPhonetic = Boolean(
                compTone && chTone && (
                  compTone === chTone ||
                  (chTone.length >= 3 && compTone.length >= 3 && (chTone.endsWith(compTone) || compTone.endsWith(chTone)))
                )
              );

              const list = compToWords.get(compChar) || [];
              list.forEach(item => {
                const w = item.word;
                if (w.levelRank > currentRank) return;
                const key = `${w.levelKey}_${w.id}`;
                if (seenWordKeys.has(key) || seenWordKeys.has(w.hanzi)) return;
                const itemChTone = stripTone(item.charPy || w.pinyin);
                const isPhonetic = Boolean(
                  (targetIsPhonetic && item.isPhonetic) ||
                  (chTone && itemChTone && chTone === itemChTone && (targetIsPhonetic || item.isPhonetic))
                );
                seenWordKeys.add(key);
                seenWordKeys.add(w.hanzi);

                if (isPhonetic) {
                  phoneticMatches.push({ word: w, type: 'phonetic' });
                } else if (COMMON_RADICALS.has(compChar)) {
                  commonRadicalMatches.push({ word: w, type: 'radical' });
                } else {
                  rareRadicalMatches.push({ word: w, type: 'radical' });
                }
              });
            });
          });

          let combined = [...wholeCharMatches, ...phoneticMatches, ...rareRadicalMatches];
          if (combined.length < 5) {
            const needed = 5 - combined.length;
            combined = combined.concat(commonRadicalMatches.slice(0, needed));
          }
          return combined.slice(0, 5);
        }

        const yiYuan = hsk1.find(w => w.hanzi === '医院');
        const maMa = hsk1.find(w => w.hanzi === '妈妈' || w.hanzi === '妈');
        const xueXiao = hsk1.find(w => w.hanzi === '学校');

        const r1 = query(yiYuan);
        const r2 = query(maMa);
        const r3 = query(xueXiao);

        console.log(JSON.stringify({
          yiYuan: r1.map(x => ({ hanzi: x.word.hanzi, type: x.type })),
          maMa: r2.map(x => ({ hanzi: x.word.hanzi, type: x.type })),
          xueXiao: r3.map(x => ({ hanzi: x.word.hanzi, type: x.type }))
        }));
        """
        proc = subprocess.run(["node", "-e", node_script], capture_output=True, text=True, check=True)
        res = json.loads(proc.stdout)
        
        # Verify 医院
        yi_words = [x["hanzi"] for x in res["yiYuan"]]
        self.assertIn("医生", yi_words, "医院 must link to 医生 via whole-char")
        self.assertEqual(res["yiYuan"][0]["type"], "whole-char")

        # Verify 妈妈
        ma_words = [x["hanzi"] for x in res["maMa"]]
        self.assertIn("吗", ma_words, "妈妈 must link to 吗 via phonetic")
        self.assertEqual(res["maMa"][0]["type"], "phonetic")

        # Verify 学校
        xue_words = [x["hanzi"] for x in res["xueXiao"]]
        self.assertTrue(any(w in xue_words for w in ["学生", "学习", "同学"]), "学校 must link to 学生/学习/同学")
        self.assertEqual(res["xueXiao"][0]["type"], "whole-char")

    def test_example_box_cut_off_fixed(self):
        ws_css = WORKSTATION_CSS.read_text(encoding="utf-8")
        # Ensure scrollbar is enabled or height expanded so content does not get cut off
        self.assertIn("overflow-y: auto !important", ws_css)
        self.assertIn("scrollbar-width: thin !important", ws_css)


if __name__ == "__main__":
    unittest.main()
