#!/usr/bin/env python3
"""
tools/batch_generate_all.py
Master Scene-Based Vector Illustration Pipeline & Organization Engine.

Folder Structure:
images/
├── HSK_2.0/
│   ├── level1/ .. level6/
├── HSK_3.0/
│   ├── level1/ .. level9/
├── generated_manifest.json
└── README.md

Features:
  - Commit & push after every 10 newly generated SVG illustrations (or at end of each level).
  - Illustrations are strictly scene-based, depicting real-world human action & scenario
    grounded directly in the vocabulary's example sentence.
  - No abstract symbols, no minimalist icons, zero text/characters, dark-mode friendly full-bleed containers.
  - Multi-model fallback cascade.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

git_lock = threading.Lock()
state_lock = threading.Lock()
exhausted_lock = threading.Lock()

REPO_ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = REPO_ROOT / "database" / "vocabs"
HSK3_DIR = VOCAB_DIR / "hsk3_0"
FLAT_OUTPUT_DIR = REPO_ROOT / "assets" / "images" / "illustrations"
IMAGES_DIR = REPO_ROOT / "images"
WORD_ILLUSTRATIONS_JS = REPO_ROOT / "assets" / "js" / "word-illustrations.js"
WORKTREE_DIR = REPO_ROOT

def get_api_keys(cli_arg=""):
    keys = []
    if cli_arg:
        for k in cli_arg.split(","):
            k = k.strip()
            if k and k not in keys:
                keys.append(k)
    if os.environ.get("GOOGLE_AI_KEY"):
        for k in os.environ.get("GOOGLE_AI_KEY").split(","):
            k = k.strip()
            if k and k not in keys:
                keys.append(k)
    key_file = REPO_ROOT / ".api_key"
    if key_file.exists():
        for line in key_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and line not in keys:
                keys.append(line)
    return keys

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


def log_ts(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    s = str(msg)
    if s.startswith("\n"):
        print(f"\n[{ts}] {s[1:]}", flush=True)
    else:
        print(f"[{ts}] {s}", flush=True)

MODEL_COOLDOWNS = {}      # (k_idx, model) -> float timestamp when cooldown expires
PERMANENT_EXHAUSTED = set() # (k_idx, model) -> only for daily quota or 404/400
RENEW_TIMESTAMPS = []       # list of float timestamps when quota renews
ABORT_EVENT = threading.Event() # Set when all models are exhausted to immediately stop all workers

def extract_retry_delay(err_body):
    try:
        data = json.loads(err_body)
        for d in data.get("error", {}).get("details", []):
            if "retryDelay" in d:
                m = re.match(r"^(\d+)", str(d["retryDelay"]))
                if m:
                    return int(m.group(1))
    except Exception:
        pass
    m = re.search(r"retry in\s+(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:([0-9.]+)s)?", err_body, re.IGNORECASE)
    if m:
        h = int(m.group(1) or 0)
        minutes = int(m.group(2) or 0)
        secs = float(m.group(3) or 0)
        return int(h * 3600 + minutes * 60 + secs)
    return None

def all_models_permanently_exhausted(api_keys):
    with exhausted_lock:
        total_possible = len(api_keys) * len(MODELS_TO_TRY)
        return len(PERMANENT_EXHAUSTED) >= total_possible

def report_exhausted_and_renew():
    with exhausted_lock:
        best_renew = min(RENEW_TIMESTAMPS) if RENEW_TIMESTAMPS else (time.time() + 20 * 3600)
    renew_dt = datetime.fromtimestamp(best_renew).strftime("%Y-%m-%d %H:%M:%S")
    diff_secs = max(0, int(best_renew - time.time()))
    h = diff_secs // 3600
    m = (diff_secs % 3600) // 60
    s = diff_secs % 60
    log_ts("==================================================================")
    log_ts("[!] TẤT CẢ CÁC MODEL FLASH ĐÃ CHẠM TRẦN DAILY QUOTA CỦA GOOGLE.")
    log_ts(f"[*] THỜI GIAN DỰ KIẾN GOOGLE RENEW QUOTA: {renew_dt} (sau {h}h {m}m {s}s).")
    log_ts("[*] Đã lưu manifest & dừng tiến trình an toàn.")
    log_ts("==================================================================")

def is_model_available(k_idx, model):
    with exhausted_lock:
        if (k_idx, model) in PERMANENT_EXHAUSTED:
            return False
        cooldown = MODEL_COOLDOWNS.get((k_idx, model), 0)
        return time.time() >= cooldown

def mark_model_throttled(k_idx, model, is_daily=False, seconds=6, retry_delay=None, api_keys=None):
    with exhausted_lock:
        if is_daily:
            PERMANENT_EXHAUSTED.add((k_idx, model))
            if retry_delay and retry_delay > 0:
                renew_ts = time.time() + retry_delay
                RENEW_TIMESTAMPS.append(renew_ts)
                dt_str = datetime.fromtimestamp(renew_ts).strftime("%Y-%m-%d %H:%M:%S")
                rem_h = retry_delay / 3600
                log_ts(f"        [>>> DAILY LIMIT] Key #{k_idx+1} on {model} chạm trần ngày. Renew lúc: {dt_str} (~{rem_h:.1f}h nữa)")
            else:
                log_ts(f"        [>>> DAILY LIMIT] Key #{k_idx+1} on {model} chạm trần ngày.")
        else:
            MODEL_COOLDOWNS[(k_idx, model)] = time.time() + seconds

        if api_keys and len(PERMANENT_EXHAUSTED) >= len(api_keys) * len(MODELS_TO_TRY):
            ABORT_EVENT.set()

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
        pass
    return {}

HSK_POS_DB = load_hsk_pos_db()

def classify_pos(meaning, hanzi=""):
    """
    Classifies word into one of 4 categories matching user rules:
    - 'noun': NOUN (Danh từ - vật thể, con người, địa điểm)
    - 'verb': VERB / ACTION (Động từ)
    - 'adj': ADJECTIVE / DESCRIBING WORD (Tính từ / Trạng thái)
    - 'abstract': ABSTRACT / GRAMMAR / ADVERB / CONJUNCTION (Từ trừu tượng, phó từ, liên từ...)
    """
    if hanzi and hanzi in HSK_POS_DB:
        raw_pos = HSK_POS_DB[hanzi]
        if raw_pos in ('adv', 'conj', 'prep', 'pron', 'measure'):
            return 'abstract', 'Abstract / Grammar / Adverb / Conjunction (Từ trừu tượng, phó từ, liên từ)'
        elif raw_pos == 'adj':
            return 'adj', 'Adjective / Describing Word (Tính từ / Trạng thái)'
        elif raw_pos == 'verb':
            return 'verb', 'Verb / Action (Động từ)'
        elif raw_pos == 'noun':
            return 'noun', 'Noun (Danh từ - vật thể, con người, địa điểm)'

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

def load_level_data(file_path):
    if not file_path.exists():
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        log_ts(f"[!] Error loading {file_path}: {e}")
        return []

def ensure_directory_structure():
    FLAT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for i in range(1, 7):
        (IMAGES_DIR / "HSK_2.0" / f"level{i}").mkdir(parents=True, exist_ok=True)
    for i in range(1, 10):
        (IMAGES_DIR / "HSK_3.0" / f"level{i}").mkdir(parents=True, exist_ok=True)

    if WORKTREE_DIR.exists():
        wt_flat = WORKTREE_DIR / "assets" / "images" / "illustrations"
        wt_flat.mkdir(parents=True, exist_ok=True)
        wt_images = WORKTREE_DIR / "images"
        for i in range(1, 7):
            (wt_images / "HSK_2.0" / f"level{i}").mkdir(parents=True, exist_ok=True)
        for i in range(1, 10):
            (wt_images / "HSK_3.0" / f"level{i}").mkdir(parents=True, exist_ok=True)

def build_manifest_and_organize():
    """
    Scans all vocabulary files and existing SVG files.
    Copies SVGs into images/HSK_2.0/levelX and images/HSK_3.0/levelY.
    Generates images/generated_manifest.json and images/README.md.
    Updates assets/js/word-illustrations.js.
    """
    ensure_directory_structure()
    log_ts("[*] Building illustration organization and manifest under images/...")

    hsk2_curriculum = [(f"level{i}", VOCAB_DIR / f"hsk{i}_vocabularies.json") for i in range(1, 7)]
    hsk3_curriculum = [(f"level{i}", HSK3_DIR / f"level{i}_vocabularies.json") for i in range(1, 10)]

    existing_flat_svgs = {p.stem: p for p in FLAT_OUTPUT_DIR.glob("*.svg") if p.is_file() and p.stat().st_size > 150}

    # Also check existing images SVGs
    for p in IMAGES_DIR.glob("**/*.svg"):
        if p.is_file() and p.stat().st_size > 150:
            if p.stem not in existing_flat_svgs:
                flat_dest = FLAT_OUTPUT_DIR / p.name
                if not flat_dest.exists() or flat_dest.stat().st_size != p.stat().st_size:
                    shutil.copy2(p, flat_dest)
                existing_flat_svgs[p.stem] = flat_dest

    manifest_entries = {}
    stats_hsk2 = {}
    stats_hsk3 = {}

    # 1. Map HSK 2.0 (level1..level6)
    for lvl_code, path in hsk2_curriculum:
        words = load_level_data(path)
        dest_dir = IMAGES_DIR / "HSK_2.0" / lvl_code
        dest_dir.mkdir(parents=True, exist_ok=True)
        count = 0
        for w in words:
            hz = w.get("hanzi", "").strip()
            if not hz:
                continue
            if hz in existing_flat_svgs:
                src_file = existing_flat_svgs[hz]
                target_file = dest_dir / f"{hz}.svg"
                if not target_file.exists() or target_file.stat().st_size != src_file.stat().st_size:
                    shutil.copy2(src_file, target_file)
                count += 1

                rel_src = f"images/HSK_2.0/{lvl_code}/{hz}.svg"
                if hz not in manifest_entries:
                    manifest_entries[hz] = {
                        "hanzi": hz,
                        "pinyin": w.get("pinyin", ""),
                        "meaning": w.get("meaning", ""),
                        "example_zh": w.get("example_zh") or w.get("example", ""),
                        "example_vi": w.get("example_vi", ""),
                        "levels_hsk2": [lvl_code],
                        "levels_hsk3": [],
                        "file": f"{hz}.svg",
                        "src": rel_src,
                        "alt_srcs": []
                    }
                else:
                    if lvl_code not in manifest_entries[hz]["levels_hsk2"]:
                        manifest_entries[hz]["levels_hsk2"].append(lvl_code)
                    if rel_src not in manifest_entries[hz]["alt_srcs"] and rel_src != manifest_entries[hz]["src"]:
                        manifest_entries[hz]["alt_srcs"].append(rel_src)

        pct = (count / len(words) * 100) if words else 0.0
        stats_hsk2[lvl_code] = {"total": len(words), "with_svg": count, "pct": f"{pct:.1f}%"}

    # 2. Map HSK 3.0 (level1..level9)
    for lvl_code, path in hsk3_curriculum:
        words = load_level_data(path)
        dest_dir = IMAGES_DIR / "HSK_3.0" / lvl_code
        dest_dir.mkdir(parents=True, exist_ok=True)
        count = 0
        for w in words:
            hz = w.get("hanzi", "").strip()
            if not hz:
                continue
            if hz in existing_flat_svgs:
                src_file = existing_flat_svgs[hz]
                target_file = dest_dir / f"{hz}.svg"
                if not target_file.exists() or target_file.stat().st_size != src_file.stat().st_size:
                    shutil.copy2(src_file, target_file)
                count += 1

                rel_src = f"images/HSK_3.0/{lvl_code}/{hz}.svg"
                if hz not in manifest_entries:
                    manifest_entries[hz] = {
                        "hanzi": hz,
                        "pinyin": w.get("pinyin", ""),
                        "meaning": w.get("meaning", ""),
                        "example_zh": w.get("example_zh") or w.get("example", ""),
                        "example_vi": w.get("example_vi", ""),
                        "levels_hsk2": [],
                        "levels_hsk3": [lvl_code],
                        "file": f"{hz}.svg",
                        "src": rel_src,
                        "alt_srcs": []
                    }
                else:
                    if lvl_code not in manifest_entries[hz]["levels_hsk3"]:
                        manifest_entries[hz]["levels_hsk3"].append(lvl_code)
                    if rel_src not in manifest_entries[hz]["alt_srcs"] and rel_src != manifest_entries[hz]["src"]:
                        manifest_entries[hz]["alt_srcs"].append(rel_src)

        pct = (count / len(words) * 100) if words else 0.0
        stats_hsk3[lvl_code] = {"total": len(words), "with_svg": count, "pct": f"{pct:.1f}%"}

    # Output generated_manifest.json
    manifest_data = {
        "generated_at": datetime.now().isoformat(),
        "total_unique_words_with_illustrations": len(manifest_entries),
        "total_flat_svg_files": len(existing_flat_svgs),
        "statistics": {
            "hsk_2_0": stats_hsk2,
            "hsk_3_0": stats_hsk3
        },
        "manifest": manifest_entries
    }

    manifest_json_str = json.dumps(manifest_data, ensure_ascii=False, indent=2)
    (IMAGES_DIR / "generated_manifest.json").write_text(manifest_json_str, encoding="utf-8")
    (REPO_ROOT / "generated_manifest.json").write_text(manifest_json_str, encoding="utf-8")

    # Output README.md
    readme_md = generate_readme_markdown(stats_hsk2, stats_hsk3, len(manifest_entries))
    (IMAGES_DIR / "README.md").write_text(readme_md, encoding="utf-8")
    (REPO_ROOT / "README_ILLUSTRATIONS.md").write_text(readme_md, encoding="utf-8")

    # Update assets/js/word-illustrations.js
    update_word_illustrations_js(manifest_entries)

    log_ts(f"[*] Manifest and images/ organization built successfully. Total indexed: {len(manifest_entries)} words.")
    return manifest_data

def generate_readme_markdown(stats_hsk2, stats_hsk3, total_unique):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def make_progress_bar(pct_str):
        pct = float(pct_str.replace('%', ''))
        blocks = int(pct / 10)
        return '█' * blocks + '░' * (10 - blocks)

    hsk2_rows = []
    total_hsk2_words = sum(v["total"] for v in stats_hsk2.values())
    total_hsk2_svg = sum(v["with_svg"] for v in stats_hsk2.values())
    hsk2_pct = (total_hsk2_svg / total_hsk2_words * 100) if total_hsk2_words else 0.0

    for i in range(1, 7):
        lvl = f"level{i}"
        info = stats_hsk2.get(lvl, {"total": 0, "with_svg": 0, "pct": "0.0%"})
        status = "✅ Hoàn thành" if info["pct"] == "100.0%" else ("⏳ Đang tạo" if info["with_svg"] > 0 else "⚪ Chưa tạo")
        bar = make_progress_bar(info["pct"])
        hsk2_rows.append(f"| **HSK 2.0 Level {i}** | `{info['with_svg']}/{info['total']}` | **{info['pct']}** | `{bar}` | {status} |")

    hsk3_rows = []
    total_hsk3_words = sum(v["total"] for v in stats_hsk3.values())
    total_hsk3_svg = sum(v["with_svg"] for v in stats_hsk3.values())
    hsk3_pct = (total_hsk3_svg / total_hsk3_words * 100) if total_hsk3_words else 0.0

    for i in range(1, 10):
        lvl = f"level{i}"
        info = stats_hsk3.get(lvl, {"total": 0, "with_svg": 0, "pct": "0.0%"})
        status = "✅ Hoàn thành" if info["pct"] == "100.0%" else ("⏳ Đang tạo" if info["with_svg"] > 0 else "⚪ Chưa tạo")
        bar = make_progress_bar(info["pct"])
        hsk3_rows.append(f"| **HSK 3.0 Level {i}** | `{info['with_svg']}/{info['total']}` | **{info['pct']}** | `{bar}` | {status} |")

    return f"""# 🎨 Kho Lưu Trữ Hình Minh Họa Ngữ Cảnh HSK (Scene-Based Vector Illustrations)

*Báo cáo cập nhật tự động lúc: `{now_str}`*

Kho hình ảnh vector minh họa trực quan (Scene-Based Visual Mnemonics) cho toàn bộ từ vựng tiếng Trung thuộc hai hệ thống giáo trình **HSK 2.0 (Level 1 - 6)** và **HSK 3.0 (Level 1 - 9)**.

---

## 🌟 Tiêu chuẩn thiết kế minh họa (Art Direction Standards)
1. **Scene-Based & Action-Oriented (Gợi cảnh & Hành động thực tế)**:
   - Toàn bộ hình vẽ được mô phỏng trực tiếp từ **câu ví dụ ngữ cảnh** của từ vựng đó.
   - Nhân vật thực hiện hành động cụ thể, có đạo cụ (props), bối cảnh không gian thực tế (phòng học, văn phòng, đường phố, sân bay, bệnh viện, nhà hàng,...).
   - **Tuyệt đối KHÔNG vẽ biểu tượng trừu tượng (abstract symbols), icon tối giản, logo hay khối hình học đơn điệu**.
2. **Thân thiện với chế độ tối (Dark-Mode Friendly)**:
   - Khung hình full-bleed container `240x240` nền tối sang trọng (`#1e293b` / `#0f172a`), đổ bóng mềm, viền bo tròn mềm mại (`rx="24"`).
   - Màu sắc sinh động, ấm áp, độ tương phản cao với chữ Hán và Pinyin.
3. **Tuyệt đối không nhúng chữ (Zero Text / Zero Hanzi)**:
   - Minh họa đóng vai trò **kích thích trí nhớ hình ảnh thuần túy**, không chứa chữ Hán, Pinyin hay ký tự chữ viết để người học tự tư duy ghi nhớ từ vựng.

---

## 📁 Cấu trúc thư mục (Folder Hierarchy)

```
images/
├── HSK_2.0/
│   ├── level1/          # 150/150 từ (100.0%) - ✅ Hoàn thành
│   ├── level2/          # 150/150 từ (100.0%) - ✅ Hoàn thành
│   ├── level3/          # Từ vựng HSK 2.0 Level 3
│   ├── level4/          # 600/600 từ (100.0%) - ✅ Hoàn thành
│   ├── level5/          # Từ vựng HSK 2.0 Level 5
│   └── level6/          # Từ vựng HSK 2.0 Level 6
├── HSK_3.0/
│   ├── level1/          # HSK 3.0 Level 1
│   ├── level2/          # HSK 3.0 Level 2
│   ├── level3/          # HSK 3.0 Level 3
│   ├── level4/          # HSK 3.0 Level 4
│   ├── level5/          # HSK 3.0 Level 5
│   ├── level6/          # HSK 3.0 Level 6
│   ├── level7/          # HSK 3.0 Level 7
│   ├── level8/          # HSK 3.0 Level 8
│   └── level9/          # HSK 3.0 Level 9
├── generated_manifest.json    # Manifest tra cứu toàn diện JSON
└── README.md                  # Bản thống kê chi tiết này
```

---

## 📊 Bảng thống kê tiến độ HSK 2.0 (Tổng từ vựng: {total_hsk2_words})

| Cấp độ | Đã có hình / Tổng từ | Tỷ lệ | Tiến độ trực quan | Trạng thái |
| :--- | :---: | :---: | :--- | :--- |
{chr(10).join(hsk2_rows)}
| **TỔNG CỘNG HSK 2.0** | **`{total_hsk2_svg}/{total_hsk2_words}`** | **`{hsk2_pct:.1f}%`** | `{make_progress_bar(f'{hsk2_pct:.1f}%')}` | {'✅ Đầy đủ' if hsk2_pct == 100 else '⏳ Đang hoàn thiện'} |

---

## 📊 Bảng thống kê tiến độ HSK 3.0 (Tổng từ vựng: {total_hsk3_words})

| Cấp độ | Đã có hình / Tổng từ | Tỷ lệ | Tiến độ trực quan | Trạng thái |
| :--- | :---: | :---: | :--- | :--- |
{chr(10).join(hsk3_rows)}
| **TỔNG CỘNG HSK 3.0** | **`{total_hsk3_svg}/{total_hsk3_words}`** | **`{hsk3_pct:.1f}%`** | `{make_progress_bar(f'{hsk3_pct:.1f}%')}` | {'✅ Đầy đủ' if hsk3_pct == 100 else '⏳ Đang hoàn thiện'} |

---

## 💡 Tổng kết tài nguyên hiện tại
- **Tổng số từ vựng duy nhất đã có minh họa vector**: **`{total_unique}`** từ.
- **Manifest tích hợp ứng dụng**: File [`assets/js/word-illustrations.js`](file:///assets/js/word-illustrations.js) và [`images/generated_manifest.json`](file:///images/generated_manifest.json) tự động đồng bộ đường dẫn để flashcard tải trực tiếp hình ảnh theo cấp độ tương ứng.
"""

def update_word_illustrations_js(manifest_entries):
    if not WORD_ILLUSTRATIONS_JS.exists() or not manifest_entries:
        return

    content = WORD_ILLUSTRATIONS_JS.read_text(encoding="utf-8")
    js_index = {}
    for hz, item in manifest_entries.items():
        js_index[hz] = {
            "file": item["file"],
            "src": item["src"],
            "caption": item["meaning"]
        }

    new_block = f"const STATIC_ILLUSTRATIONS_INDEX = {json.dumps(js_index, ensure_ascii=False, indent=2)};"

    match = re.search(r"const STATIC_ILLUSTRATIONS_INDEX = (\{[\s\S]*?\});", content)
    if match:
        content = content[:match.start()] + new_block + content[match.end():]
    else:
        target = "function getWordIllustration"
        if target in content:
            content = content.replace(target, new_block + "\n\n" + target, 1)

    WORD_ILLUSTRATIONS_JS.write_text(content, encoding="utf-8")

    if WORKTREE_DIR.exists():
        try:
            wt_js = WORKTREE_DIR / "assets" / "js" / "word-illustrations.js"
            wt_js.write_text(content, encoding="utf-8")
        except Exception:
            pass

def call_gemini_svg_api(word_info, api_keys, max_retries=3, model_offset=0):
    if isinstance(api_keys, str):
        api_keys = [api_keys] if api_keys else []
    if not api_keys:
        return None
    hanzi = word_info.get("hanzi", "").strip()
    meaning = word_info.get("meaning", "").strip()
    pinyin = word_info.get("pinyin", "").strip()

    pos_type, pos_label = classify_pos(meaning, hanzi)
    word_info["pos"] = pos_label

    ex_vi = (word_info.get("example_vi") or "").replace("<u>", "").replace("</u>", "").strip()
    ex_zh = (word_info.get("example_zh") or word_info.get("example") or "").replace("<u>", "").replace("</u>", "").strip()

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

    rotated_models = MODELS_TO_TRY[model_offset % len(MODELS_TO_TRY):] + MODELS_TO_TRY[:model_offset % len(MODELS_TO_TRY)]

    for attempt in range(4):
        if ABORT_EVENT.is_set() or all_models_permanently_exhausted(api_keys):
            return None

        available_pairs = []
        for model in rotated_models:
            for k_idx, key in enumerate(api_keys):
                if is_model_available(k_idx, model):
                    available_pairs.append((k_idx, key, model))

        if not available_pairs:
            if ABORT_EVENT.is_set() or all_models_permanently_exhausted(api_keys):
                return None
            time.sleep(2)
            continue

        for k_idx, key, model in available_pairs:
            if ABORT_EVENT.is_set():
                return None
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=18) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            text = parts[0]["text"]
                            m = re.search(r"<svg[\s\S]*?<\/svg>", text, re.IGNORECASE)
                            if m:
                                svg_str = m.group(0).strip()
                                if len(svg_str) > 150:
                                    return svg_str
            except urllib.error.HTTPError as he:
                err_body = he.read().decode("utf-8", errors="ignore")
                retry_delay = extract_retry_delay(err_body)
                if he.code == 429:
                    err_lower = err_body.lower()
                    is_daily = (retry_delay and retry_delay > 180) or (("requestsperday" in err_lower or "per day" in err_lower or "requests_per_day" in err_lower or "limit: 20" in err_lower or "limit: 500" in err_lower) and ("quota exceeded" in err_lower or "limit" in err_lower) and not ("perminute" in err_lower or "per minute" in err_lower))
                    if is_daily:
                        mark_model_throttled(k_idx, model, is_daily=True, retry_delay=retry_delay, api_keys=api_keys)
                    else:
                        mark_model_throttled(k_idx, model, is_daily=False, seconds=12, api_keys=api_keys)
                    continue
                elif he.code in (404, 400):
                    mark_model_throttled(k_idx, model, is_daily=True, api_keys=api_keys)
                    continue
                elif he.code == 503:
                    mark_model_throttled(k_idx, model, is_daily=False, seconds=5, api_keys=api_keys)
                    continue
                else:
                    continue
            except Exception:
                continue

        if attempt < 3:
            time.sleep(2)

    return None

def git_commit_and_push(batch_count, level_label, no_commit=False, no_push=False):
    if no_commit:
        return
    try:
        log_ts(f"\n[>>> GIT] Committing batch of {batch_count} newly generated SVGs for {level_label}...")
        subprocess.run(["git", "add", "images", "assets/images/illustrations", "generated_manifest.json", "README_ILLUSTRATIONS.md", "assets/js/word-illustrations.js"], cwd=REPO_ROOT, check=True)
        commit_msg = f"feat(illustrations): batch generate scene-based SVGs ({level_label}: +{batch_count} words)"
        res = subprocess.run(["git", "commit", "-m", commit_msg], cwd=REPO_ROOT, capture_output=True, text=True)
        log_ts(f"[>>> GIT] {res.stdout.strip()}")
        if not no_push:
            push_res = subprocess.run(["git", "push", "origin", "HEAD:main"], cwd=REPO_ROOT, capture_output=True, text=True)
            log_ts(f"[>>> GIT] Push result: {push_res.stdout.strip() or push_res.stderr.strip() or 'OK'}")
    except Exception as e:
        log_ts(f"[!] Warning git commit/push encountered error: {e}")

def main():
    parser = argparse.ArgumentParser(description="Master batch generator & organizer for all HSK 2.0 & HSK 3.0 levels")
    parser.add_argument("--api-key", default="", help="Google AI Studio API Key (comma-separated or set in .api_key)")
    parser.add_argument("--concurrency", type=int, default=4, help="Concurrent worker threads (default: 4 for smooth pacing)")
    parser.add_argument("--delay", type=float, default=1.5, help="Delay between requests in seconds (default: 1.5s)")
    parser.add_argument("--batch-size", type=int, default=50, help="Commit and push every N generated items (default: 50)")
    parser.add_argument("--only-organize", action="store_true", help="Only reorganize existing SVGs, build manifest & README without generating new SVGs")
    parser.add_argument("--target-level", default="all", help="Target specific level (e.g., 'level3', 'level5', 'level6', 'all')")
    parser.add_argument("--no-commit", action="store_true", help="Do not create git commits automatically")
    parser.add_argument("--no-push", action="store_true", help="Do not push commits to remote repository")
    args = parser.parse_args()

    api_keys = get_api_keys(args.api_key.strip())
    if not api_keys and not args.only_organize:
        log_ts("[!] No Google AI API key found! Please set GOOGLE_AI_KEY or add to .api_key")
        return

    log_ts(f"[*] Loaded {len(api_keys)} API key(s) for generation rotation. Concurrency: {args.concurrency} workers, Delay: {args.delay}s.")

    # Step 1: Organization under images/
    manifest_data = build_manifest_and_organize()

    if args.only_organize:
        log_ts("[*] Reorganization completed successfully (--only-organize). Exiting.")
        return

    # Step 2: Curriculum roadmap
    curriculum = [
        # Phase 1: Complete HSK 2.0 Level 3 (100% complete)
        ("HSK 2.0 Level 3", "level3", "HSK_2.0", VOCAB_DIR / "hsk3_vocabularies.json"),
        # Phase 2: Complete HSK 2.0 Level 5 (100% complete)
        ("HSK 2.0 Level 5", "level5", "HSK_2.0", VOCAB_DIR / "hsk5_vocabularies.json"),
        # Phase 3: Complete HSK 3.0 Level 5 (already at ~1084/1600 words)
        ("HSK 3.0 Level 5", "level5", "HSK_3.0", HSK3_DIR / "level5_vocabularies.json"),
        # Phase 4: Complete HSK 2.0 Level 6
        ("HSK 2.0 Level 6", "level6", "HSK_2.0", VOCAB_DIR / "hsk6_vocabularies.json"),
        # Phase 5: HSK 3.0 Levels 1..9
        ("HSK 3.0 Level 1", "level1", "HSK_3.0", HSK3_DIR / "level1_vocabularies.json"),
        ("HSK 3.0 Level 2", "level2", "HSK_3.0", HSK3_DIR / "level2_vocabularies.json"),
        ("HSK 3.0 Level 3", "level3", "HSK_3.0", HSK3_DIR / "level3_vocabularies.json"),
        ("HSK 3.0 Level 4", "level4", "HSK_3.0", HSK3_DIR / "level4_vocabularies.json"),
        ("HSK 3.0 Level 6", "level6", "HSK_3.0", HSK3_DIR / "level6_vocabularies.json"),
        ("HSK 3.0 Level 7", "level7", "HSK_3.0", HSK3_DIR / "level7_vocabularies.json"),
        ("HSK 3.0 Level 8", "level8", "HSK_3.0", HSK3_DIR / "level8_vocabularies.json"),
        ("HSK 3.0 Level 9", "level9", "HSK_3.0", HSK3_DIR / "level9_vocabularies.json"),
    ]

    if args.target_level != "all":
        curriculum = [c for c in curriculum if c[1] == args.target_level or c[0].lower() == args.target_level.lower()]

    total_generated_session = 0
    batch_new_count = 0

    log_ts("\n==================================================================")
    log_ts("  HSK Flashcards: Master Scene-Based Illustration Pipeline (HIGH SPEED)")
    log_ts(f"  Target: images/HSK_2.0/level1..6 -> images/HSK_3.0/level1..9")
    log_ts(f"  Concurrency: {args.concurrency} parallel workers | Delay: {args.delay}s")
    log_ts(f"  Batch commit threshold: Every {args.batch_size} newly generated SVGs -> main")
    log_ts("==================================================================\n")

    for level_label, lvl_code, schema_type, file_path in curriculum:
        words = load_level_data(file_path)
        if not words:
            continue

        log_ts(f"\n[*] Scanning {level_label} ({len(words)} words) from {file_path.name}...")
        level_new = 0
        level_skipped = 0

        missing_items = []
        for idx, item in enumerate(words, 1):
            hanzi = item.get("hanzi", "").strip()
            if not hanzi:
                continue

            out_filename = f"{hanzi}.svg"
            flat_path = FLAT_OUTPUT_DIR / out_filename
            images_dest = IMAGES_DIR / schema_type / lvl_code / out_filename

            # Check if SVG already exists in images or flat dir
            if (images_dest.exists() and images_dest.stat().st_size > 150) or (flat_path.exists() and flat_path.stat().st_size > 150):
                level_skipped += 1
                if not images_dest.exists() and flat_path.exists():
                    shutil.copy2(flat_path, images_dest)
                continue

            missing_items.append((idx, item))

        log_ts(f"[*] {level_label}: {len(missing_items)} missing words to generate ({level_skipped} already exist). Spawning {args.concurrency} parallel workers...")

        if not missing_items:
            log_ts(f"[*] {level_label} is already 100% complete! Skipping to next level.")
            continue

        current_missing = missing_items
        pass_idx = 1
        while current_missing:
            if all_models_permanently_exhausted(api_keys):
                report_exhausted_and_renew()
                break

            if pass_idx > 1:
                log_ts(f"[*] {level_label} (Pass {pass_idx}): Retrying {len(current_missing)} uncompleted words...")

            failed_in_pass = []

            def process_word(task_info):
                if ABORT_EVENT.is_set():
                    return False
                nonlocal batch_new_count, level_new, total_generated_session
                orig_idx, item = task_info
                hanzi = item.get("hanzi", "").strip()
                meaning = item.get("meaning", "").strip()
                pinyin = item.get("pinyin", "").strip()
                pos_type, pos_label = classify_pos(meaning, hanzi)
                item["pos"] = pos_label

                out_filename = f"{hanzi}.svg"
                flat_path = FLAT_OUTPUT_DIR / out_filename
                images_dest = IMAGES_DIR / schema_type / lvl_code / out_filename

                svg_code = call_gemini_svg_api(item, api_keys, model_offset=orig_idx)
                if args.delay > 0:
                    time.sleep(args.delay)
                if svg_code:
                    # 1. Write flat SVG
                    flat_path.write_text(svg_code, encoding="utf-8")

                    # 2. Write images/ SVG
                    images_dest.write_text(svg_code, encoding="utf-8")

                    # 3. Mirror to worktree if exists
                    if WORKTREE_DIR.exists():
                        try:
                            (WORKTREE_DIR / "assets" / "images" / "illustrations" / out_filename).write_text(svg_code, encoding="utf-8")
                            (WORKTREE_DIR / "images" / schema_type / lvl_code / out_filename).write_text(svg_code, encoding="utf-8")
                        except Exception:
                            pass

                    should_commit = False
                    with state_lock:
                        level_new += 1
                        batch_new_count += 1
                        total_generated_session += 1
                        log_ts(f"    ✓ [{orig_idx}/{len(words)}] Generated '{hanzi}' ({pinyin} - {meaning[:22]}) [{len(svg_code)} B] (Total session: {total_generated_session})")
                        if batch_new_count >= args.batch_size:
                            batch_new_count = 0
                            should_commit = True

                    if should_commit:
                        with git_lock:
                            build_manifest_and_organize()
                            git_commit_and_push(args.batch_size, level_label, no_commit=args.no_commit, no_push=args.no_push)

                    return True
                else:
                    return False

            CHUNK_SIZE = 40
            for chunk_idx in range(0, len(current_missing), CHUNK_SIZE):
                if ABORT_EVENT.is_set() or all_models_permanently_exhausted(api_keys):
                    break
                chunk_items = current_missing[chunk_idx:chunk_idx + CHUNK_SIZE]
                with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
                    futures = {executor.submit(process_word, task): task for task in chunk_items}
                    for fut in as_completed(futures):
                        t = futures[fut]
                        try:
                            ok = fut.result()
                            if not ok and not ABORT_EVENT.is_set():
                                failed_in_pass.append(t)
                        except Exception as e:
                            log_ts(f"[!] Worker exception: {e}")
                            if not ABORT_EVENT.is_set():
                                failed_in_pass.append(t)
                if ABORT_EVENT.is_set() or all_models_permanently_exhausted(api_keys):
                    break

            if ABORT_EVENT.is_set() or all_models_permanently_exhausted(api_keys):
                with git_lock:
                    build_manifest_and_organize()
                    if batch_new_count > 0:
                        git_commit_and_push(batch_new_count, level_label, no_commit=args.no_commit, no_push=args.no_push)
                report_exhausted_and_renew()
                sys.exit(0)

            if not failed_in_pass:
                break

            if len(failed_in_pass) == len(current_missing) and pass_idx >= 3:
                log_ts(f"[*] Stopping retries for {level_label} after 3 passes with {len(failed_in_pass)} pending words.")
                break

            current_missing = failed_in_pass
            pass_idx += 1
            time.sleep(2)

        # End of level commit
        with git_lock:
            build_manifest_and_organize()
            if batch_new_count > 0:
                git_commit_and_push(batch_new_count, level_label, no_commit=args.no_commit, no_push=args.no_push)
                batch_new_count = 0

        log_ts(f"[*] Completed {level_label}: {level_new} newly generated, {level_skipped} skipped.")

        if ABORT_EVENT.is_set() or all_models_permanently_exhausted(api_keys):
            report_exhausted_and_renew()
            sys.exit(0)

    log_ts("\n==================================================================")
    log_ts(f"[*] ALL LEVELS COMPLETED! Total newly generated: {total_generated_session}")
    log_ts("==================================================================")

if __name__ == "__main__":
    main()
