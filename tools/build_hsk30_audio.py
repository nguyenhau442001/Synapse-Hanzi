#!/usr/bin/env python3
"""
tools/build_hsk30_audio.py
Generate high-fidelity Mandarin audio clips for HSK 3.0 vocabulary & examples.
Normalizes audio to 24kHz 64kbps MP3 with silence trimming, and updates manifest.json.
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
from pathlib import Path
from gtts import gTTS

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEVEL = "level1"

LEVEL_MAP = {
    "1": ("hsk30_1", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level1_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_1"),
    "level1": ("hsk30_1", REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level1_vocabularies.json", REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_1"),
}

def clean_html(text: str) -> str:
    """Remove HTML annotations like <u>...</u> from example sentences."""
    return re.sub(r"<[^>]+>", "", text).strip()

def file_hash(path: Path) -> str:
    hasher = hashlib.md5()
    with open(path, "rb") as f:
        hasher.update(f.read())
    return hasher.hexdigest()[:12]

def synthesize_clip(text: str, out_path: Path) -> None:
    """Generate audio using gTTS and normalize via ffmpeg."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_name = tmp.name

    try:
        tts = gTTS(text, lang="zh-CN")
        tts.save(tmp_name)

        cmd = [
            "ffmpeg", "-y", "-i", tmp_name,
            "-af", "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-40dB:stop_periods=1:stop_duration=0.08:stop_threshold=-40dB",
            "-ar", "24000", "-b:a", "64k", str(out_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    finally:
        if os.path.exists(tmp_name):
            os.remove(tmp_name)

def build_audio(level: str = "level1", start_idx: int = 0, count: int = -1, overwrite: bool = False):
    config = LEVEL_MAP.get(level)
    if not config:
        print(f"Unknown level: {level}")
        return

    level_key, vocab_path, out_dir = config
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
    print(f"[*] Processing {total} items for {level_key} (overwrite={overwrite})...")

    processed = 0
    for idx, item in enumerate(target_vocab):
        wid = item["id"]
        hanzi = item["hanzi"]
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

        processed += 1
        if processed % 20 == 0 or processed == total:
            # Save manifest periodically
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)
            print(f"[{processed}/{total}] {hanzi} done -> manifest saved.")

    print(f"[✓] Completed generating audio for {level_key} ({len(manifest['items'])} items in manifest).")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate HSK 3.0 audio clips")
    parser.add_argument("--level", default="level1", help="Target level (level1)")
    parser.add_argument("--start", type=int, default=0, help="Start index")
    parser.add_argument("--count", type=int, default=-1, help="Count of items to process")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing audio files")
    args = parser.parse_args()

    build_audio(level=args.level, start_idx=args.start, count=args.count, overwrite=args.overwrite)
