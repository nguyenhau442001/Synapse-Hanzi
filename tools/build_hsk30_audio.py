#!/usr/bin/env python3
"""
tools/build_hsk30_audio.py
Generate high-fidelity Mandarin audio clips for HSK 3.0 vocabulary & examples.
Normalizes audio to 24kHz 64kbps MP3 with silence trimming, and updates manifest.json.
Supports per-word git commits on main with single author Hau Nguyen Ngoc.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from gtts import gTTS

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEVEL = "level2"

LEVEL_MAP = {
    "1": ("hsk30_1", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level1_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_1", 1),
    "level1": ("hsk30_1", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level1_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_1", 1),
    "2": ("hsk30_2", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level2_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_2", 2),
    "level2": ("hsk30_2", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level2_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_2", 2),
    "3": ("hsk30_3", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level3_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_3", 3),
    "level3": ("hsk30_3", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level3_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_3", 3),
    "4": ("hsk30_4", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level4_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_4", 4),
    "level4": ("hsk30_4", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level4_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_4", 4),
    "5": ("hsk30_5", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level5_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_5", 5),
    "level5": ("hsk30_5", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level5_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_5", 5),
    "6": ("hsk30_6", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level6_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_6", 6),
    "level6": ("hsk30_6", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level6_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_6", 6),
    "7": ("hsk30_7", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level7_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_7", 7),
    "level7": ("hsk30_7", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level7_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_7", 7),
    "8": ("hsk30_8", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level8_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_7", 8),
    "level8": ("hsk30_8", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level8_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_7", 8),
    "9": ("hsk30_9", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level9_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_7", 9),
    "level9": ("hsk30_9", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level9_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_7", 9),
}

GIT_ENV = os.environ.copy()
GIT_ENV["GIT_AUTHOR_NAME"] = "Hau Nguyen Ngoc"
GIT_ENV["GIT_AUTHOR_EMAIL"] = "nguyenhau442001@gmail.com"
GIT_ENV["GIT_COMMITTER_NAME"] = "Hau Nguyen Ngoc"
GIT_ENV["GIT_COMMITTER_EMAIL"] = "nguyenhau442001@gmail.com"

def clean_html(text: str) -> str:
    """Remove HTML annotations like <u>...</u> from example sentences."""
    return re.sub(r"<[^>]+>", "", text).strip()

def file_hash(path: Path) -> str:
    hasher = hashlib.md5()
    with open(path, "rb") as f:
        hasher.update(f.read())
    return hasher.hexdigest()[:12]

def synthesize_clip(text: str, out_path: Path, max_retries: int = 3) -> None:
    """Generate audio using gTTS and normalize via ffmpeg."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_name = tmp.name

    for attempt in range(max_retries):
        try:
            tts = gTTS(text, lang="zh-CN")
            tts.save(tmp_name)

            cmd = [
                "ffmpeg", "-y", "-i", tmp_name,
                "-af", "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-40dB:stop_periods=1:stop_duration=0.08:stop_threshold=-40dB",
                "-ar", "24000", "-b:a", "64k", str(out_path)
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            return
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            time.sleep(1.0 + attempt * 1.5)
        finally:
            if os.path.exists(tmp_name):
                os.remove(tmp_name)

def build_audio(
    level: str = "level2",
    start_idx: int = 0,
    count: int = -1,
    overwrite: bool = False,
    commit_each: bool = True
):
    config = LEVEL_MAP.get(level)
    if not config:
        print(f"Unknown level: {level}")
        return

    level_key, vocab_path, out_dir, lvl_num = config
    words_dir = out_dir / "words"
    examples_dir = out_dir / "examples"
    manifest_path = out_dir / "manifest.json"

    words_dir.mkdir(parents=True, exist_ok=True)
    examples_dir.mkdir(parents=True, exist_ok=True)

    with open(vocab_path, "r", encoding="utf-8") as f:
        vocab = json.load(f)

    manifest = {
        "version": 1,
        "level": level_key,
        "engine": "gTTS-FFmpeg",
        "voice": "zh-CN",
        "speed": 1.0,
        "items": {}
    }

    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
                manifest["items"] = existing.get("items", {})
        except Exception:
            pass

    target_vocab = vocab[start_idx:]
    if count > 0:
        target_vocab = target_vocab[:count]

    total = len(target_vocab)
    print(f"[*] Processing {total} items for {level_key} (overwrite={overwrite}, commit_each={commit_each})...")

    processed = 0
    for idx, item in enumerate(target_vocab):
        wid = item["id"]
        hanzi = item["hanzi"]
        pinyin = item.get("pinyin", "")
        ex_text = clean_html(item.get("example_zh", ""))

        w_path = words_dir / f"{wid:04d}.mp3"
        e_path = examples_dir / f"{wid:04d}.mp3"

        # Generate word audio
        if overwrite or not w_path.exists() or w_path.stat().st_size == 0:
            synthesize_clip(hanzi, w_path)

        # Generate example audio
        if ex_text and (overwrite or not e_path.exists() or e_path.stat().st_size == 0):
            synthesize_clip(ex_text, e_path)

        # Compute cache-busting hashes
        w_hash = file_hash(w_path) if w_path.exists() else "0"
        e_hash = file_hash(e_path) if e_path.exists() else "0"

        manifest["items"][str(wid)] = {
            "word": f"database/prebuilt_audio/{level_key}/words/{wid:04d}.mp3?v={w_hash}",
            "example": f"database/prebuilt_audio/{level_key}/examples/{wid:04d}.mp3?v={e_hash}"
        }

        # Write manifest file
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)

        # Commit per word if requested
        if commit_each:
            files_to_add = [str(manifest_path)]
            if w_path.exists():
                files_to_add.append(str(w_path))
            if e_path.exists():
                files_to_add.append(str(e_path))
            subprocess.run(["git", "add"] + files_to_add, check=True, cwd=REPO_ROOT)
            
            # Check if there are staged changes to commit
            status = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=REPO_ROOT)
            if status.returncode != 0:
                commit_msg = f"feat(audio): add HSK 3.0 L{lvl_num} prebuilt audio for {hanzi} ({pinyin})"
                subprocess.run(["git", "commit", "-m", commit_msg], check=True, cwd=REPO_ROOT, env=GIT_ENV)

        processed += 1
        print(f"[{processed}/{total}] HSK 3.0 L{lvl_num}: {hanzi} ({pinyin}) done.")

    print(f"[✓] Completed generating audio for {level_key} ({len(manifest['items'])} items in manifest).")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate HSK 3.0 audio clips with per-word commit")
    parser.add_argument("--level", default="level2", help="Target level (level1..level9)")
    parser.add_argument("--start", type=int, default=0, help="Start index")
    parser.add_argument("--count", type=int, default=-1, help="Count of items to process")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing audio files")
    parser.add_argument("--no-commit", action="store_true", help="Disable per-word commit")
    args = parser.parse_args()

    build_audio(
        level=args.level,
        start_idx=args.start,
        count=args.count,
        overwrite=args.overwrite,
        commit_each=not args.no_commit
    )
