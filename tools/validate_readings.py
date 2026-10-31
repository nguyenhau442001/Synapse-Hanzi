#!/usr/bin/env python3
"""
tools/validate_readings.py
Validates Graded Reading JSON data files against strict schema and actual HSK vocabulary databases.
"""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = REPO_ROOT / "database" / "vocabs"
READINGS_DIR = REPO_ROOT / "database" / "readings"

# 1. Load entire HSK vocabulary database into lookups
VOCAB_BY_ID = {}
for lvl in range(1, 10):
    path = VOCAB_DIR / "hsk3_0" / f"level{lvl}_vocabularies.json"
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            for item in json.load(f):
                wid = f"hsk{lvl}_{item['id']}"
                VOCAB_BY_ID[wid] = item

for lvl in range(1, 7):
    path = VOCAB_DIR / f"hsk{lvl}_vocabularies.json"
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            for item in json.load(f):
                wid = f"hsk{lvl}_{item['id']}"
                if wid not in VOCAB_BY_ID:
                    VOCAB_BY_ID[wid] = item

print(f"[*] Loaded {len(VOCAB_BY_ID)} vocabulary items from HSK 1..9 databases.")

# 2. Validation rules
REQUIRED_TOP_FIELDS = [
    "id", "level", "title", "topic", "estimatedMinutes",
    "description_vi", "sentences", "vocabulary_spotlight", "quiz"
]
REQUIRED_SENTENCE_FIELDS = [
    "id", "zh", "pinyin", "vi", "audio_start_ms", "audio_end_ms", "tokens"
]
REQUIRED_TOKEN_FIELDS_IF_WORD = [
    "text", "pinyin", "meaning_vi", "hsk", "word_id"
]
REQUIRED_QUIZ_FIELDS = [
    "id", "question_vi", "options_vi", "answer", "explanation_vi"
]

all_reading_ids = set()
errors = []
total_readings = 0
total_sentences = 0
total_tokens = 0
total_spotlight = 0
total_quizzes = 0

reading_files = sorted([f for f in READINGS_DIR.glob("**/*.json") if f.name != "manifest.json"])
manifest_file = READINGS_DIR / "manifest.json"
if not reading_files:
    print(f"[!] No reading JSON files found under {READINGS_DIR}")
    sys.exit(1)

for rfile in reading_files:
    total_readings += 1
    rel_path = rfile.relative_to(REPO_ROOT)
    
    # 2.1 JSON Validity
    try:
        with open(rfile, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        errors.append(f"[{rel_path}] Invalid JSON syntax: {e}")
        continue

    # 2.2 Top level required fields
    for field in REQUIRED_TOP_FIELDS:
        if field not in data:
            errors.append(f"[{rel_path}] Missing top-level field: '{field}'")
    
    # 2.3 Duplicate ID check
    rid = data.get("id")
    if rid:
        if rid in all_reading_ids:
            errors.append(f"[{rel_path}] Duplicate reading ID: '{rid}'")
        all_reading_ids.add(rid)
    else:
        errors.append(f"[{rel_path}] Missing 'id' field")

    # 2.4 Title check
    title = data.get("title", {})
    if not isinstance(title, dict) or "zh" not in title or "vi" not in title:
        errors.append(f"[{rel_path}] 'title' must be a dict with 'zh' and 'vi'")

    # 2.5 Sentences check
    sentences = data.get("sentences", [])
    if not isinstance(sentences, list) or len(sentences) == 0:
        errors.append(f"[{rel_path}] 'sentences' must be a non-empty list")
    else:
        total_sentences += len(sentences)
        for sidx, s in enumerate(sentences):
            for sfield in REQUIRED_SENTENCE_FIELDS:
                if sfield not in s:
                    errors.append(f"[{rel_path}][sentence {sidx}] Missing field: '{sfield}'")

            # Check audio nullable fields
            if s.get("audio_start_ms") is not None and not isinstance(s.get("audio_start_ms"), (int, float)):
                errors.append(f"[{rel_path}][sentence {sidx}] 'audio_start_ms' must be int/float or null")
            if s.get("audio_end_ms") is not None and not isinstance(s.get("audio_end_ms"), (int, float)):
                errors.append(f"[{rel_path}][sentence {sidx}] 'audio_end_ms' must be int/float or null")

            # Check tokens
            tokens = s.get("tokens", [])
            if not isinstance(tokens, list) or len(tokens) == 0:
                errors.append(f"[{rel_path}][sentence {sidx}] 'tokens' must be a non-empty list")
            else:
                total_tokens += len(tokens)
                for tidx, tok in enumerate(tokens):
                    if not isinstance(tok, dict) or "text" not in tok:
                        errors.append(f"[{rel_path}][sentence {sidx}][token {tidx}] Token must be a dict with 'text'")
                        continue

                    wid = tok.get("word_id")
                    if wid:
                        for req_tf in REQUIRED_TOKEN_FIELDS_IF_WORD:
                            if req_tf not in tok:
                                errors.append(f"[{rel_path}][sentence {sidx}][token {tidx}] Vocabulary token missing '{req_tf}'")
                        
                        # Verify word_id existence in real vocabulary
                        if wid not in VOCAB_BY_ID:
                            errors.append(f"[{rel_path}][sentence {sidx}][token {tidx}] 'word_id' '{wid}' does NOT exist in vocabulary database!")

    # 2.6 Vocabulary spotlight check
    spotlight = data.get("vocabulary_spotlight", [])
    if not isinstance(spotlight, list) or len(spotlight) == 0:
        errors.append(f"[{rel_path}] 'vocabulary_spotlight' must be a non-empty list")
    else:
        total_spotlight += len(spotlight)
        seen_spotlight = set()
        for wid in spotlight:
            if not isinstance(wid, str) or not wid.startswith("hsk"):
                errors.append(f"[{rel_path}] Spotlight item '{wid}' is not a valid word_id format ('hskX_Y')")
            elif wid not in VOCAB_BY_ID:
                errors.append(f"[{rel_path}] Spotlight word_id '{wid}' does NOT exist in vocabulary database!")
            if wid in seen_spotlight:
                errors.append(f"[{rel_path}] Duplicate spotlight word_id '{wid}'")
            seen_spotlight.add(wid)

    # 2.7 Quiz check
    quiz = data.get("quiz", [])
    if not isinstance(quiz, list) or len(quiz) != 3:
        errors.append(f"[{rel_path}] 'quiz' must contain exactly 3 questions (got {len(quiz)})")
    else:
        total_quizzes += len(quiz)
        for qidx, q in enumerate(quiz):
            for qfield in REQUIRED_QUIZ_FIELDS:
                if qfield not in q:
                    errors.append(f"[{rel_path}][quiz {qidx}] Missing quiz field: '{qfield}'")
            opts = q.get("options_vi", [])
            ans = q.get("answer")
            if not isinstance(opts, list) or len(opts) < 2:
                errors.append(f"[{rel_path}][quiz {qidx}] 'options_vi' must be a list with at least 2 options")
            elif not isinstance(ans, int) or ans < 0 or ans >= len(opts):
                errors.append(f"[{rel_path}][quiz {qidx}] 'answer' index {ans} out of bounds for options (len={len(opts)})")

# 2.8 Manifest check
if manifest_file.exists():
    try:
        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest_data = json.load(f)
        if not isinstance(manifest_data, list):
            errors.append("[manifest.json] Manifest must be a list")
        else:
            manifest_ids = {m.get("id") for m in manifest_data}
            if manifest_ids != all_reading_ids:
                errors.append(f"[manifest.json] Mismatch between manifest IDs ({manifest_ids}) and story IDs ({all_reading_ids})")
    except Exception as me:
        errors.append(f"[manifest.json] Error reading manifest: {me}")
else:
    errors.append("[manifest.json] Missing manifest.json file!")

# 3. Output results
print("\n" + "=" * 60)
print("  汉字思维 (HANZI MIND) GRADED READING - DATA VALIDATION REPORT")
print("=" * 60)
print(f"  Total Story Files:     {total_readings}")
print(f"  Total Sentences:       {total_sentences}")
print(f"  Total Tokens:          {total_tokens}")
print(f"  Total Spotlight Words: {total_spotlight}")
print(f"  Total Quiz Questions:  {total_quizzes}")
print("-" * 60)

if errors:
    print(f"[✗] FAILED WITH {len(errors)} ERROR(S):")
    for e in errors:
        print(f"    - {e}")
    sys.exit(1)
else:
    print("[✓] ALL CHECKS PASSED PERFECTLY! 100% Validated against HSK Database.")
    print("=" * 60)
    sys.exit(0)
