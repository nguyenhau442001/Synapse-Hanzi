#!/usr/bin/env python3
"""
tools/build_hsk30_audio.py
Generate high-fidelity Mandarin audio clips for HSK 3.0 vocabulary & examples using Google Gemini Flash TTS.
Normalizes audio to 24kHz 64kbps MP3 with silence trimming, and updates manifest.json.
Supports per-word git commits on main with single author Hau Nguyen Ngoc.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEVEL = "level5"

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

GEMINI_MODELS = [
    "gemini-3.8-flash-tts",
    "gemini-3.8-flash-lite-tts",
    "gemini-2.5-flash-preview-tts",
]
DEFAULT_VOICE = "Aoede"

GIT_ENV = os.environ.copy()
GIT_ENV["GIT_AUTHOR_NAME"] = "Hau Nguyen Ngoc"
GIT_ENV["GIT_AUTHOR_EMAIL"] = "nguyenhau442001@gmail.com"
GIT_ENV["GIT_COMMITTER_NAME"] = "Hau Nguyen Ngoc"
GIT_ENV["GIT_COMMITTER_EMAIL"] = "nguyenhau442001@gmail.com"


def get_gemini_api_keys() -> list[str]:
    keys: list[str] = []
    for env_var in ("GEMINI_API_KEY", "GOOGLE_AI_KEY", "GOOGLE_API_KEY"):
        val = os.environ.get(env_var)
        if val:
            for k in val.split(","):
                k = k.strip()
                if k and k not in keys:
                    keys.append(k)

    key_files = [
        REPO_ROOT / ".api_key",
        Path.home() / "GitHub" / "HSK-Flashcards-Generator" / ".api_key",
        Path.home() / ".Trash" / "HSK-Flashcards-Generator" / ".api_key",
    ]
    for kf in key_files:
        if kf.is_file():
            for line in kf.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and line not in keys:
                    keys.append(line)
    return keys


API_KEYS = get_gemini_api_keys()
CURRENT_KEY_IDX = 0
CURRENT_MODEL_IDX = 0


def clean_html(text: str) -> str:
    """Remove HTML annotations like <u>...</u> from example sentences."""
    return re.sub(r"<[^>]+>", "", text).strip()


def file_hash(path: Path) -> str:
    hasher = hashlib.md5()
    with open(path, "rb") as f:
        hasher.update(f.read())
    return hasher.hexdigest()[:12]


def ensure_wav_bytes(audio_bytes: bytes) -> bytes:
    if audio_bytes.startswith(b"RIFF"):
        return audio_bytes
    # Wrap raw PCM 24kHz 16-bit mono into valid WAV container
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(audio_bytes)
    return buf.getvalue()


def call_gemini_tts(text: str) -> bytes | None:
    global CURRENT_KEY_IDX, CURRENT_MODEL_IDX
    if not API_KEYS:
        return None

    prompt_text = f"Please read aloud the following Mandarin Chinese text exactly as written: {text}"
    payload = {
        "contents": [{"parts": [{"text": prompt_text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": DEFAULT_VOICE
                    }
                }
            }
        }
    }
    encoded = json.dumps(payload).encode("utf-8")

    # Try models and keys with rotation
    total_attempts = len(GEMINI_MODELS) * max(1, len(API_KEYS)) * 2
    for attempt in range(total_attempts):
        key = API_KEYS[CURRENT_KEY_IDX % len(API_KEYS)]
        model = GEMINI_MODELS[CURRENT_MODEL_IDX % len(GEMINI_MODELS)]
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

        req = urllib.request.Request(
            url,
            data=encoded,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                candidate = data.get("candidates", [{}])[0]
                parts = candidate.get("content", {}).get("parts", [])
                for part in parts:
                    if "inlineData" in part and "data" in part["inlineData"]:
                        # Advance model index for round-robin balancing
                        CURRENT_MODEL_IDX = (CURRENT_MODEL_IDX + 1) % len(GEMINI_MODELS)
                        return base64.b64decode(part["inlineData"]["data"])
        except urllib.error.HTTPError as err:
            err_body = err.read().decode("utf-8", errors="replace")
            if err.code == 429:
                # Quota reached on this model; rotate to next model immediately
                CURRENT_MODEL_IDX = (CURRENT_MODEL_IDX + 1) % len(GEMINI_MODELS)
                if (CURRENT_MODEL_IDX == 0) and len(API_KEYS) > 1:
                    CURRENT_KEY_IDX = (CURRENT_KEY_IDX + 1) % len(API_KEYS)
                # Sleep briefly (e.g. 1.5s) before trying next model
                time.sleep(1.5)
                continue
            elif err.code in (500, 502, 503, 504):
                time.sleep(2.0)
                continue
            else:
                print(f" [Gemini HTTP {err.code}] {err_body[:120]}", flush=True)
                break
        except Exception as e:
            time.sleep(1.5)
            continue

    return None


def synthesize_clip(text: str, out_path: Path) -> None:
    """Generate audio via Gemini TTS (with fallback to Tingting) and normalize via ffmpeg."""
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Primary: Google Gemini Flash TTS
    audio_bytes = call_gemini_tts(text)
    if audio_bytes:
        wav_data = ensure_wav_bytes(audio_bytes)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
            tmp_wav.write(wav_data)
            tmp_wav_name = tmp_wav.name
        try:
            cmd = [
                "ffmpeg", "-y", "-i", tmp_wav_name,
                "-af", "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-40dB:stop_periods=1:stop_duration=0.08:stop_threshold=-40dB,loudnorm=I=-18:TP=-2:LRA=7",
                "-ar", "24000", "-ac", "1", "-b:a", "64k", str(out_path)
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            if out_path.stat().st_size >= 256:
                return
        finally:
            if os.path.exists(tmp_wav_name):
                os.remove(tmp_wav_name)

    # 2. Fallback: macOS local Tingting voice (zh_CN)
    with tempfile.NamedTemporaryFile(suffix=".aiff", delete=False) as aiff_tmp:
        aiff_name = aiff_tmp.name
    try:
        subprocess.run(["say", "-v", "Tingting", "-o", aiff_name, text], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        cmd = [
            "ffmpeg", "-y", "-i", aiff_name,
            "-af", "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-40dB:stop_periods=1:stop_duration=0.08:stop_threshold=-40dB,loudnorm=I=-18:TP=-2:LRA=7",
            "-ar", "24000", "-ac", "1", "-b:a", "64k", str(out_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    finally:
        if os.path.exists(aiff_name):
            os.remove(aiff_name)


def git_run_with_retry(cmd: list[str], cwd: Path = REPO_ROOT, env: dict = GIT_ENV, attempts: int = 40):
    for i in range(attempts):
        res = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True)
        if res.returncode == 0:
            return res
        if "index.lock" not in res.stderr and "cannot lock ref" not in res.stderr:
            raise RuntimeError(f"git {' '.join(cmd)} failed: {res.stderr.strip()}")
        time.sleep(0.5 + i * 0.25)
    raise RuntimeError(f"git {' '.join(cmd)} kept failing: {res.stderr.strip()}")


def build_audio(
    level: str = "level5",
    start_idx: int = 0,
    count: int = -1,
    overwrite: bool = False,
    commit_each: bool = True,
    push_every: int = 30
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
        "engine": "Gemini-TTS",
        "voice": DEFAULT_VOICE,
        "speed": 1.0,
        "items": {}
    }

    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
                manifest["items"] = existing.get("items", {})
                if "engine" in existing:
                    manifest["engine"] = existing["engine"]
        except Exception:
            pass

    target_vocab = vocab[start_idx:]
    if count > 0:
        target_vocab = target_vocab[:count]

    total = len(target_vocab)
    print(f"[*] Processing {total} items for {level_key} (overwrite={overwrite}, commit_each={commit_each}, engine=Gemini-TTS)...")

    processed = 0
    for idx, item in enumerate(target_vocab):
        wid = item["id"]
        hanzi = item["hanzi"]
        pinyin = item.get("pinyin", "")
        ex_text = clean_html(item.get("example_zh", ""))

        w_path = words_dir / f"{wid:04d}.mp3"
        e_path = examples_dir / f"{wid:04d}.mp3"

        need_w = overwrite or not w_path.exists() or w_path.stat().st_size < 256
        need_e = ex_text and (overwrite or not e_path.exists() or e_path.stat().st_size < 256)

        # Generate word audio
        if need_w:
            synthesize_clip(hanzi, w_path)

        # Generate example audio
        if need_e:
            synthesize_clip(ex_text, e_path)

        # Compute cache-busting hashes
        w_hash = file_hash(w_path) if w_path.exists() else "0"
        e_hash = file_hash(e_path) if e_path.exists() else "0"

        manifest["items"][str(wid)] = {
            "word": f"database/prebuilt_audio/{level_key}/words/{wid:04d}.mp3?v={w_hash}",
            "example": f"database/prebuilt_audio/{level_key}/examples/{wid:04d}.mp3?v={e_hash}"
        }

        # Write manifest file atomically
        tmp_manifest = manifest_path.with_suffix(".json.tmp")
        with open(tmp_manifest, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        tmp_manifest.replace(manifest_path)

        # Commit per word if requested
        if commit_each and (need_w or need_e):
            files_to_add = [str(manifest_path.relative_to(REPO_ROOT))]
            if w_path.exists():
                files_to_add.append(str(w_path.relative_to(REPO_ROOT)))
            if e_path.exists():
                files_to_add.append(str(e_path.relative_to(REPO_ROOT)))
            git_run_with_retry(["git", "add", "--"] + files_to_add)

            status = subprocess.run(["git", "status", "--porcelain", "--"] + files_to_add, cwd=REPO_ROOT, capture_output=True, text=True)
            if status.stdout.strip():
                commit_msg = f"feat(audio): add HSK 3.0 L{lvl_num} prebuilt audio for {hanzi} ({pinyin})"
                git_run_with_retry(["git", "commit", "-m", commit_msg, "--"] + files_to_add)

        processed += 1
        print(f"[{processed}/{total}] HSK 3.0 L{lvl_num}: {hanzi} ({pinyin}) done.")

        if commit_each and push_every > 0 and (processed % push_every == 0 or processed == total):
            try:
                git_run_with_retry(["git", "push", "origin", "HEAD:main"])
                print(f"  [↑] Pushed progress ({processed}/{total}) to origin main.")
            except Exception as e:
                print(f"  [!] Push failed (will retry next interval): {e}")

    print(f"[✓] Completed generating audio for {level_key} ({len(manifest['items'])} items in manifest).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate HSK 3.0 audio clips with Gemini Flash TTS and per-word commit")
    parser.add_argument("--level", default="level5", help="Target level (level1..level9)")
    parser.add_argument("--start", type=int, default=0, help="Start index")
    parser.add_argument("--count", type=int, default=-1, help="Count of items to process")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing audio files")
    parser.add_argument("--push-every", type=int, default=30, help="Push commits every N items")
    parser.add_argument("--no-commit", action="store_true", help="Disable per-word commit")
    args = parser.parse_args()

    build_audio(
        level=args.level,
        start_idx=args.start,
        count=args.count,
        overwrite=args.overwrite,
        commit_each=not args.no_commit,
        push_every=args.push_every
    )
