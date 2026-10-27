#!/usr/bin/env python3
"""
tools/generate_illustrations.py
Batch AI Illustration Generator for HSK Vocabulary using Google AI Studio.
Generates theme-appropriate, text-free visual mnemonics and saves them directly into assets/images/illustrations/.
"""

import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = REPO_ROOT / "database" / "vocabs"
OUTPUT_DIR = REPO_ROOT / "assets" / "images" / "illustrations"
WORD_ILLUSTRATIONS_JS = REPO_ROOT / "assets" / "js" / "word-illustrations.js"

# Optional worktree directory to keep in sync
WORKTREE_DIR = REPO_ROOT

POS_NAMES = {
    'noun': 'noun / physical object or conceptual entity',
    'verb': 'verb / dynamic action, movement or execution',
    'adj': 'adjective / qualitative attribute, emotional or sensory state',
    'adv': 'adverb / contextual manner, degree, timing or modal expression (scene-based story, DO NOT draw meters or gauges)',
    'measure': 'measure word / modular counting unit',
    'pron': 'pronoun / connection or reference',
    'prep': 'preposition / spatial or directional relation',
    'conj': 'conjunction / bridge connecting elements'
}

def load_hsk_pos_db():
    """Loads exact part of speech dictionary from word-illustrations.js."""
    if not WORD_ILLUSTRATIONS_JS.exists():
        return {}
    try:
        content = WORD_ILLUSTRATIONS_JS.read_text(encoding="utf-8")
        m = re.search(r"const HSK_POS_DB = (\{[\s\S]*?\});", content)
        if m:
            return json.loads(m.group(1))
    except Exception as e:
        log_ts(f"[!] Warning loading HSK_POS_DB: {e}")
    return {}

from datetime import datetime

def log_ts(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    s = str(msg)
    if s.startswith("\n"):
        print(f"\n[{ts}] {s[1:]}", flush=True)
    else:
        print(f"[{ts}] {s}", flush=True)

HSK_POS_DB = load_hsk_pos_db()

def get_pos(hanzi, meaning=""):
    """Accurately gets POS from HSK_POS_DB or falls back to heuristic classifier."""
    if hanzi and hanzi in HSK_POS_DB:
        return HSK_POS_DB[hanzi]
    return guess_pos(meaning)

def load_vocabulary():
    """Loads all HSK vocabularies indexed by hanzi."""
    words_by_hanzi = {}
    if not VOCAB_DIR.exists():
        return words_by_hanzi

    for f in sorted(VOCAB_DIR.glob("hsk*_vocabularies.json")):
        try:
            with open(f, "r", encoding="utf-8") as fp:
                data = json.load(fp)
                if isinstance(data, list):
                    for item in data:
                        h = item.get("hanzi", "").strip()
                        if h and h not in words_by_hanzi:
                            words_by_hanzi[h] = item
        except Exception as e:
            log_ts(f"[!] Warning reading {f.name}: {e}")

    return words_by_hanzi

def classify_pos(meaning):
    """
    Classifies word into one of 4 categories matching user rules:
    - 'noun': NOUN (Danh từ - vật thể, con người, địa điểm)
    - 'verb': VERB / ACTION (Động từ)
    - 'adj': ADJECTIVE / DESCRIBING WORD (Tính từ / Trạng thái)
    - 'abstract': ABSTRACT / GRAMMAR / ADVERB / CONJUNCTION (Từ trừu tượng, phó từ, liên từ...)
    """
    m = (meaning or "").lower().strip()

    # 0. Check explicit tag in meaning
    if re.search(r'\b(tính từ)\b', m):
        return 'adj', 'Adjective / Describing Word (Tính từ / Trạng thái)'
    if re.search(r'\b(động từ)\b', m):
        return 'verb', 'Verb / Action (Động từ)'
    if re.search(r'\b(danh từ)\b', m):
        return 'noun', 'Noun (Danh từ - vật thể, con người, địa điểm)'
    if re.search(r'\b(phó từ|liên từ|trợ từ|thán từ|giới từ|lượng từ|đại từ)\b', m):
        return 'abstract', 'Abstract / Grammar / Adverb / Conjunction (Từ trừu tượng, phó từ, liên từ)'

    clean_m = re.sub(r'^(rất|quá|vô cùng|hết sức|cực kỳ|tương đối|đặc biệt)\s+', '', m)

    # 1. Adjective check
    if re.search(r'^(đẹp|tốt|xấu|to|nhỏ|lớn|cao|thấp|nhanh|chậm|dài|ngắn|nóng|lạnh|mới|cũ|đắt|rẻ|khó|dễ|buồn|vui|sạch|bẩn|ngon|ngọt|đắng|cay|mặn|chua|mệt|đói|no|bận|rảnh|đúng|sai|tiện|phức tạp|đơn giản|quan trọng|an toàn|nguy hiểm|nghiêm túc|cẩn thận|nhiệt tình|tự tin|hạnh phúc|khỏe|yếu|trắng|đen|đỏ|vàng|xanh|gầy|béo|sáng|tối|ấm|mát|sâu|nông|rộng|hẹp|yên tĩnh|ồn ào|tươi|héo|cứng|mềm|khô|ướt|giàu|nghèo|thông minh|ngốc|lười|chăm chỉ|thân thiện|lịch sự|độc ác|hiền lành|dũng cảm|nhút nhát|tuyệt vời|hoàn hảo|kỳ lạ|bình thường|phi thường|ổn định|rõ ràng|mơ hồ)\b', clean_m):
        return 'adj', 'Adjective / Describing Word (Tính từ / Trạng thái)'

    # 2. Verb check
    if re.search(r'^(làm|đi|nói|ăn|uống|xem|mua|bán|học|chạy|bay|đến|rời|giúp|tổ chức|chuẩn bị|phát hiện|tham gia|quyết định|giải quyết|sử dụng|cung cấp|tìm|gặp|nhớ|hiểu|yêu|ghét|thích|lo|nghĩ|biết|mặc|đeo|viết|đọc|nghe|sắp xếp|bố trí|ôm|xin lỗi|đăng ký|tốt nghiệp|biểu thị|thể hiện|biểu diễn|khen ngợi|bảo vệ|đảm bảo|thực hiện|hoàn thành|phát triển|mở rộng|thay đổi|tổng kết|du lịch|trao đổi|kết hôn|kinh doanh|nghiên cứu|chiến đấu|chúc mừng|cảm ơn|kính trọng|mời|chờ|đợi|hy vọng|ước|tin|nghi ngờ|chú ý|quan tâm|giảng|dạy|vẽ|hát|múa|bơi|chơi|sửa|chữa|chọn|chọn lựa|ném|bắt|kéo|đẩy|cắt|rửa|nấu|xây|phá|mở|đóng|tắt|bật|gửi|nhận|trả lời|hỏi|dừng|bắt đầu|kết thúc|thắng|thua|trèo|leo|vứt|bỏ|rơi|đổ|ngã|cười|khóc|la|hét|gọi|thăm|gặp gỡ|chia sẻ|trao|tặng|nhận được|chịu|chịu đựng|trải qua|kinh qua)\b', m):
        return 'verb', 'Verb / Action (Động từ)'

    # 3. Abstract / Grammar check
    if re.search(r'^(thậm chí|đột nhiên|bỗng nhiên|vốn dĩ|hầu như|suýt nữa|không ngờ|chẳng qua|tất nhiên|dường như|hình như|tuy nhiên|tuy rằng|mặc dù|bởi vì|cho nên|do đó|vì vậy|ngay cả|vừa\.\.\. vừa|liệu|chẳng lẽ|hoặc|hay là|nếu|nếu như|giả sử|thực ra|kỳ thực|ngược lại|ngay lập tức|lập tức|luôn luôn|thường xuyên|thỉnh thoảng|chưa bao giờ|đã|đang|sẽ|hơn nữa|vả lại|đồng thời|ngoài ra|tóm lại|nói chung|dù sao|rốt cuộc|cuối cùng|từ từ|dần dần|càng|vẫn|còn|chỉ|cũng|đều|vốn|tự nhiên|nhất định|chắc chắn|vô tình|cố ý|hèn gì|thảo nào|hóa ra|thay vì|miễn là|chỉ cần|bất kể|bất luận|cho dù|càng ngày càng|dần|thế nhưng|nhưng|tuy|bởi)\b', m):
        return 'abstract', 'Abstract / Grammar / Adverb / Conjunction (Từ trừu tượng, phó từ, liên từ)'

    # 4. Default: Noun
    return 'noun', 'Noun (Danh từ - vật thể, con người, địa điểm)'

MODELS_TO_TRY = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
]

def call_gemini_svg_api(word_info, api_key, max_retries=3):
    """Calls Gemini API with model fallback to generate clean inline SVG vector."""
    hanzi = word_info.get("hanzi", "")
    meaning = word_info.get("meaning", "")
    pinyin = word_info.get("pinyin", "")

    pos_type, pos_label = classify_pos(meaning)
    word_info["pos"] = pos_label

    ex_vi = word_info.get("example_vi", "").replace("<u>", "").replace("</u>", "").strip()
    ex_zh = word_info.get("example_zh", "").replace("<u>", "").replace("</u>", "").strip()
    context_note = ""
    if ex_zh or ex_vi:
        context_note = f"\n- Contextual reference: \"{ex_zh}\" ({ex_vi})"

    if pos_type == 'noun':
        type_rule = """1. IF NOUN (Danh từ - vật thể, con người, địa điểm):
   - Center a clear, iconic, and unmistakable physical object or character representing the word. Avoid abstract backgrounds."""
    elif pos_type == 'verb':
        type_rule = """2. IF VERB / ACTION (Động từ):
   - Show a clear, dynamic human character action with motion lines or a direct interaction with an object to show cause and effect.
   - For protection, sheltering, and caring verbs (e.g. 保护, 照顾, 关照, 爱护): Show genuine, tender protective actions. For environmental/nature protection (like 保护环境), depict caring hands gently cupped around a vibrant delicate green sprout growing from fertile soil, or sheltering it under an open hand/umbrella from harsh weather. NEVER draw sci-fi forcefields, glowing energy bubbles, or video-game armor."""
    elif pos_type == 'adj':
        type_rule = """3. IF ADJECTIVE / DESCRIBING WORD (Tính từ / Trạng thái):
   - Use a distinct visual contrast, scale exaggeration, or clear emotional expression (e.g., contrasting small vs. large, calm vs. chaotic) to represent the quality."""
    else:  # abstract / grammar / adverb / conjunction
        type_rule = """4. IF ABSTRACT / GRAMMAR / ADVERB / CONJUNCTION (Từ trừu tượng, phó từ, liên từ như "thậm chí", "đột nhiên", "vốn dĩ", "hầu như"):
   - DO NOT draw a generic office worker or random desk scene. 
   - MUST use visual metaphors of "Escalation", "Progression", "Causality", or "Contrast" (e.g., a multi-step staircase, a scale tipping, a domino effect, a magnifying glass zooming into a detail, or a timeline showing a sharp peak).
   - For words expressing extreme degree, escalation, or unexpectedness (like 甚至): Illustrate a clear progression starting from a normal baseline level and sharply breaking past the limit into an extreme, exaggerated final outcome (e.g., working late at night with towering stacks of paper, a character sweating under an overwhelmingly heavy but clear load of tasks)."""

    prompt = f"""A conceptual educational vector illustration in a sleek, modern flat design style with a dark mode theme, visualizing the exact semantic meaning of the Chinese word "{hanzi}" ({pinyin}, {pos_label}, {meaning}).{context_note}

STRICT VISUAL RULES BASED ON WORD TYPE:
{type_rule}

GENERAL CONSTRAINTS:
- Style: Consistent flat vector art, clean lines, dark blue/slate background (#1A1D24 or similar dark theme to match the app interface), professional color palette with high-contrast accent colors (orange/gold for focus).
- Canvas & Format: Valid SVG with viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg".
- Container: Full-bleed container: <rect width="240" height="240" rx="24" fill="#1A1D24"/>
- No random gibberish text inside the image. Keep it clean, focused, and instantly comprehensible at a glance (flashcard optimization).
- ABSOLUTELY NO abstract symbols, NO geometric badges, NO minimalist icons, NO generic emojis, NO sliders, NO meters, NO progress bars, NO gauge dials.
- ABSOLUTELY NO floating hearts (❤️), glowing heart icons, or romantic tropes UNLESS the word is explicitly about romantic love (e.g. 爱, 恋爱, 结婚, 谈恋爱) or literal anatomy (心脏). For gratitude, helping, politeness, kindness, teamwork, or friendship, DO NOT draw hearts! Depict genuine respectful social interactions (e.g. slight bow, handshake, warm smile, polite hand gesture) instead of romantic tropes.
- For free-of-charge / zero-cost concepts (e.g. 免费, 免税, 赠送, 义诊), DO NOT draw generic wrapped birthday gift boxes or souvenir shops! A wrapped gift box conveys 'gift/present' (礼物), NOT 'free of charge'. Instead, depict authentic real-world transactions where fee/payment is waived (e.g. an event entrance/registration counter where attendees are welcomed with a 0-cost admission pass, staff warmly waving off payment with a friendly gesture, or an open gate with crossed-out coin/fee indicator).
- For protection, sheltering, or caring concepts (e.g. 保护, 照顾, 爱护, 保护环境): ABSOLUTELY NO sci-fi forcefield bubbles, NO glowing energy domes around a person, NO video-game shields or armor. Instead, depict genuine human sheltering actions (e.g. two caring hands gently cupped around a thriving green sprout or fragile life, protecting it from harsh wind/rain, or an adult sheltering a child).
- ABSOLUTELY NO text, NO letters, NO words, NO subtitles, NO Chinese characters (NO {hanzi}), NO English words, NO pinyin.
- ABSOLUTELY NO Gemini logo, NO brand logos, NO watermarks.
- Return ONLY the raw <svg>...</svg> code, without markdown backticks, without any commentary."""
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.35}
    }

    for attempt in range(max_retries):
        for model in MODELS_TO_TRY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=35) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            text = parts[0]["text"]
                            m = re.search(r"<svg[\s\S]*?<\/svg>", text, re.IGNORECASE)
                            if m:
                                svg_str = m.group(0).strip()
                                if len(svg_str) > 60:
                                    return svg_str
            except urllib.error.HTTPError as he:
                if he.code == 429:
                    # Try next model in list
                    continue
                elif he.code in (404, 503):
                    # Model unavailable, try next model
                    continue
                else:
                    err_text = he.read().decode("utf-8", errors="ignore")
                    log_ts(f"    [!] {model} HTTP {he.code}: {err_text[:120]}")
            except Exception as e:
                # Timeout or connection error, try next model
                continue
        # If all models hit limit/error in this attempt, wait and retry
        if attempt < max_retries - 1:
            wait_sec = 15 * (attempt + 1)
            log_ts(f"    [!] All models busy/exhausted. Waiting {wait_sec}s before retry {attempt+2}/{max_retries}...")
            time.sleep(wait_sec)

    return None

def update_illustrations_manifest(records):
    """Updates STATIC_ILLUSTRATIONS_INDEX in word-illustrations.js."""
    if not WORD_ILLUSTRATIONS_JS.exists():
        return

    content = WORD_ILLUSTRATIONS_JS.read_text(encoding="utf-8")

    match = re.search(r"const STATIC_ILLUSTRATIONS_INDEX = (\{[\s\S]*?\});", content)
    if match:
        try:
            existing = json.loads(match.group(1))
        except Exception:
            existing = {}
        existing.update(records)
        new_block = f"const STATIC_ILLUSTRATIONS_INDEX = {json.dumps(existing, ensure_ascii=False, indent=2)};"
        content = content[:match.start()] + new_block + content[match.end():]
    else:
        new_block = f"\n// Pre-generated static illustration assets stored in assets/images/illustrations/\nconst STATIC_ILLUSTRATIONS_INDEX = {json.dumps(records, ensure_ascii=False, indent=2)};\n\n"
        target = "function getWordIllustration"
        if target in content:
            content = content.replace(target, new_block + target, 1)

    WORD_ILLUSTRATIONS_JS.write_text(content, encoding="utf-8")

    # Sync to worktree if available
    if WORKTREE_DIR.exists():
        try:
            dest = WORKTREE_DIR / "assets" / "js" / "word-illustrations.js"
            dest.write_text(content, encoding="utf-8")
        except Exception:
            pass

def main():
    parser = argparse.ArgumentParser(description="Generate thematic visual mnemonic illustrations using Google AI Studio")
    parser.add_argument("--api-key", default=os.environ.get("GOOGLE_AI_KEY"), help="Google AI Studio API Key (or env GOOGLE_AI_KEY)")
    parser.add_argument("--words", help="Specific Hanzi words (comma or space separated), e.g. '总结,合适,困难'")
    parser.add_argument("--hsk", type=int, choices=[1, 2, 3, 4, 5, 6], help="Target HSK level (1-6)")
    parser.add_argument("--limit", type=int, default=None, help="Max words to generate (default: all words in target)")
    parser.add_argument("--delay", type=float, default=3.5, help="Delay in seconds between requests (default: 3.5s to respect 15 RPM limit)")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing illustration files")

    args = parser.parse_args()

    api_key = (args.api_key or "").strip()
    if not api_key:
        key_file = REPO_ROOT / ".api_key"
        if key_file.exists():
            api_key = key_file.read_text(encoding="utf-8").strip().splitlines()[0].strip()

    if not api_key:
        log_ts("[!] Error: Google AI Studio API Key is required.")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if WORKTREE_DIR.exists():
        (WORKTREE_DIR / "assets" / "images" / "illustrations").mkdir(parents=True, exist_ok=True)

    all_vocab = load_vocabulary()

    targets = []
    if args.words:
        input_words = [w.strip() for w in re.split(r"[,;\s]+", args.words) if w.strip()]
        for w in input_words:
            if w in all_vocab:
                item = dict(all_vocab[w])
                targets.append(item)
            else:
                targets.append({"hanzi": w, "meaning": w, "pinyin": ""})
    elif args.hsk:
        hsk_file = VOCAB_DIR / f"hsk{args.hsk}_vocabularies.json"
        if hsk_file.exists():
            with open(hsk_file, "r", encoding="utf-8") as fp:
                data = json.load(fp)
                if args.limit:
                    targets = data[:args.limit]
                else:
                    targets = data
    else:
        log_ts("[!] Please specify --words or --hsk")
        sys.exit(1)

    total = len(targets)
    log_ts(f"[*] Starting batch generation for {total} word(s) [Delay: {args.delay}s]...")

    success_count = 0
    skip_count = 0
    fail_count = 0
    pending_records = {}

    for idx, item in enumerate(targets, 1):
        hanzi = item.get("hanzi", "").strip()
        meaning = item.get("meaning", "").strip()
        pinyin = item.get("pinyin", "").strip()
        pos_type, pos_label = classify_pos(meaning)
        item["pos"] = pos_label

        out_filename = f"{hanzi}.svg"
        out_path = OUTPUT_DIR / out_filename

        pct = (idx / total) * 100

        # Check if already exists
        if out_path.exists() and out_path.stat().st_size > 60 and not args.overwrite:
            skip_count += 1
            pending_records[hanzi] = {
                "file": out_filename,
                "src": f"assets/images/illustrations/{out_filename}",
                "caption": meaning
            }
            if idx % 20 == 0:
                log_ts(f"[{idx}/{total}] ({pct:.1f}%) Progress check: {skip_count} skipped (already exist), {success_count} newly generated.")
            continue

        log_ts(f"[{idx}/{total}] ({pct:.1f}%) Generating '{hanzi}' ({pinyin} - {meaning})...")

        svg_code = call_gemini_svg_api(item, api_key)
        if svg_code:
            out_path.write_text(svg_code, encoding="utf-8")
            if WORKTREE_DIR.exists():
                try:
                    wt_path = WORKTREE_DIR / "assets" / "images" / "illustrations" / out_filename
                    wt_path.write_text(svg_code, encoding="utf-8")
                except Exception:
                    pass

            pending_records[hanzi] = {
                "file": out_filename,
                "src": f"assets/images/illustrations/{out_filename}",
                "caption": meaning
            }
            success_count += 1
            log_ts(f"    ✓ Saved SVG ({len(svg_code)} B)")
        else:
            fail_count += 1
            log_ts(f"    ✗ Failed to generate SVG for '{hanzi}'")

        # Incrementally update manifest every 5 words
        if len(pending_records) >= 5 or idx == total:
            update_illustrations_manifest(pending_records)
            pending_records.clear()

        # Respect API rate limits
        if idx < total:
            time.sleep(args.delay)

    # Final manifest flush
    if pending_records:
        update_illustrations_manifest(pending_records)

    log_ts(f"\n[*] BATCH COMPLETED: {total} total, {success_count} generated, {skip_count} skipped, {fail_count} failed.")

if __name__ == "__main__":
    main()
