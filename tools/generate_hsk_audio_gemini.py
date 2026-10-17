#!/usr/bin/env python3
"""Generate prebuilt Mandarin audio using Google Gemini Frontier Flash TTS.

Supports:
  - gemini-3.8-flash-tts (default)
  - gemini-3.8-flash-lite-tts
  - gemini-2.5-flash-preview-tts

Outputs high-quality 24kHz MP3 files with silence trimming and loudness normalization,
and writes an atomic manifest.json consumed by the flashcards web app.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
from html.parser import HTMLParser
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from typing import Any
import urllib.error
import urllib.request
import wave


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL = "gemini-3.8-flash-tts"
FALLBACK_MODELS = [
    "gemini-3.8-flash-tts",
    "gemini-3.8-flash-lite-tts",
    "gemini-3.1-flash-tts-preview",
    "gemini-2.5-flash-preview-tts",
]
DEFAULT_VOICE = "Aoede"
DEFAULT_BITRATE = "64k"

SILENCE_FILTER = (
    "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-45dB:"
    "stop_periods=-1:stop_duration=0.08:stop_threshold=-45dB:stop_silence=0.03,"
    "loudnorm=I=-18:TP=-2:LRA=7"
)


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def visible_text(value: Any) -> str:
    parser = _TextExtractor()
    parser.feed(html.unescape(str(value or "")))
    parser.close()
    return "".join(parser.parts).strip()


def get_api_keys(cli_arg: str | None = None) -> list[str]:
    keys: list[str] = []
    if cli_arg:
        for k in cli_arg.split(","):
            k = k.strip()
            if k and k not in keys:
                keys.append(k)

    for env_var in ("GEMINI_API_KEY", "GOOGLE_AI_KEY", "GOOGLE_API_KEY"):
        val = os.environ.get(env_var)
        if val:
            for k in val.split(","):
                k = k.strip()
                if k and k not in keys:
                    keys.append(k)

    # Check local or parent .api_key
    candidates = [
        REPO_ROOT / ".api_key",
        Path.home() / "GitHub" / "HSK-Flashcards-Generator" / ".api_key",
    ]
    for key_file in candidates:
        if key_file.is_file():
            for line in key_file.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and line not in keys:
                    keys.append(line)

    return keys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--level", default="hsk4", choices=[f"hsk{i}" for i in range(1, 7)])
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Gemini TTS model name")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Voice name (Aoede, Kore, Puck, Charon, Fenrir)")
    parser.add_argument("--api-key", help="Gemini API key or comma-separated keys")
    parser.add_argument("--kind", choices=["both", "word", "example"], default="both")
    parser.add_argument("--start-id", type=int, help="Only process rows with id >= start-id")
    parser.add_argument("--limit", type=int, help="Maximum number of rows to process")
    parser.add_argument("--ids", help="Comma-separated vocabulary ids to generate (e.g. 1,2,5)")
    parser.add_argument("--bitrate", default=DEFAULT_BITRATE, help="Target MP3 bitrate (default: 64k)")
    parser.add_argument(
        "--delay-seconds",
        type=float,
        default=20.5,
        help="Delay between requests to respect free-tier 3 RPM quota (set to 0.5 for paid keys)",
    )
    parser.add_argument("--fast", action="store_true", help="Shortcut for --delay-seconds 0.5 (for paid keys)")
    parser.add_argument("--batch-size", type=int, default=100, help="Commit and push after every N generated words (default: 100)")
    parser.add_argument(
        "--auto-commit",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Automatically commit and push to main after each batch (default: True)",
    )
    parser.add_argument("--overwrite", action="store_true", help="Regenerate and overwrite existing audio files")
    parser.add_argument("--skip-manifest", action="store_true", help="Do not update manifest.json")
    parser.add_argument("--dry-run", action="store_true", help="Show planned audio clips without calling the API")
    return parser.parse_args()


def load_rows(level: str, start_id: int | None, limit: int | None, ids_filter: set[int] | None) -> list[dict[str, Any]]:
    source = REPO_ROOT / "database" / "vocabs" / f"{level}_vocabularies.json"
    if not source.is_file():
        raise FileNotFoundError(f"Vocabulary file not found: {source}")

    with source.open(encoding="utf-8") as handle:
        rows = json.load(handle)
    if not isinstance(rows, list):
        raise ValueError(f"Expected a JSON array in {source}")

    normalized: list[dict[str, Any]] = []
    for row in rows:
        try:
            word_id = int(row["id"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"Invalid vocabulary id in {source}: {row!r}") from exc

        if ids_filter is not None and word_id not in ids_filter:
            continue
        if start_id is not None and word_id < start_id:
            continue

        hanzi = visible_text(row.get("hanzi"))
        example = visible_text(row.get("example_zh"))
        pinyin = visible_text(row.get("pinyin"))
        if not hanzi or not example:
            raise ValueError(f"Row id {word_id} has empty hanzi or example_zh")

        normalized.append({
            "id": word_id,
            "word": hanzi,
            "pinyin": pinyin,
            "example": example,
        })

    normalized.sort(key=lambda r: r["id"])
    return normalized[:limit] if limit is not None else normalized


def output_path(level: str, word_id: int, kind: str) -> Path:
    folder = "words" if kind == "word" else "examples"
    return REPO_ROOT / "database" / "prebuilt_audio" / level / folder / f"{word_id:04d}.mp3"


def ensure_wav_bytes(audio_bytes: bytes) -> bytes:
    if audio_bytes.startswith(b"RIFF"):
        return audio_bytes
    # Wrap raw PCM 24kHz 16-bit mono into valid WAV
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(audio_bytes)
    return buf.getvalue()


def encode_mp3(audio_data: bytes, destination: Path, bitrate: str) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    wav_bytes = ensure_wav_bytes(audio_data)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        tf.write(wav_bytes)
        temp_wav = tf.name

    temporary = destination.with_suffix(".mp3.tmp")
    try:
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", temp_wav,
            "-af", SILENCE_FILTER, "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame",
            "-b:a", bitrate, "-map_metadata", "-1", "-f", "mp3", str(temporary),
        ], check=True)
        if temporary.stat().st_size < 256:
            raise RuntimeError(f"Encoded audio is unexpectedly small: {destination}")
        temporary.replace(destination)
    finally:
        try:
            os.remove(temp_wav)
        except OSError:
            pass


class DailyQuotaExhaustedError(RuntimeError):
    def __init__(self, model: str, wait_sec: float) -> None:
        super().__init__(f"Daily quota exhausted for model {model} (wait: {wait_sec:.0f}s)")
        self.model = model
        self.wait_sec = wait_sec


def call_gemini_tts(
    text: str,
    api_key: str,
    model: str = DEFAULT_MODEL,
    voice: str = DEFAULT_VOICE,
    max_retries: int = 5,
) -> bytes:
    """Generate audio via Gemini Flash TTS REST API."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {"parts": [{"text": text}]}
        ],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": voice
                    }
                }
            }
        }
    }
    encoded = json.dumps(payload).encode("utf-8")

    backoff = 5.0
    for attempt in range(max_retries):
        req = urllib.request.Request(
            url,
            data=encoded,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                candidate = data.get("candidates", [{}])[0]
                parts = candidate.get("content", {}).get("parts", [])
                for part in parts:
                    if "inlineData" in part and "data" in part["inlineData"]:
                        return base64.b64decode(part["inlineData"]["data"])
                raise RuntimeError(f"No audio inlineData in response: {data}")
        except urllib.error.HTTPError as err:
            err_body = err.read().decode("utf-8", errors="replace")
            if err.code == 429:
                wait_sec = backoff
                try:
                    err_json = json.loads(err_body)
                    for detail in err_json.get("error", {}).get("details", []):
                        if detail.get("@type", "").endswith("RetryInfo") and "retryDelay" in detail:
                            delay_str = detail["retryDelay"].rstrip("s")
                            wait_sec = float(delay_str) + 1.0
                            break
                except Exception:
                    pass
                if wait_sec > 120.0:
                    raise DailyQuotaExhaustedError(model, wait_sec)
                print(f" [429 Rate Limit] Waiting {wait_sec:.1f}s before retry {attempt + 1}/{max_retries}...", flush=True)
                time.sleep(wait_sec)
                backoff = min(backoff * 2, 60.0)
            elif err.code in (500, 502, 503, 504):
                print(f" [{err.code} Server Error] Retrying in {backoff:.1f}s...", flush=True)
                time.sleep(backoff)
                backoff = min(backoff * 2, 30.0)
            else:
                raise RuntimeError(f"HTTP {err.code}: {err_body}") from err

    raise RuntimeError(f"Exceeded max retries generating audio for: {text}")


def update_manifest(level: str, model: str, voice: str) -> None:
    manifest_dir = REPO_ROOT / "database" / "prebuilt_audio" / level
    manifest_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = manifest_dir / "manifest.json"

    vocab_file = REPO_ROOT / "database" / "vocabs" / f"{level}_vocabularies.json"
    if not vocab_file.is_file():
        return
    with vocab_file.open(encoding="utf-8") as h:
        rows = json.load(h)

    items: dict[str, dict[str, str]] = {}
    total_words = 0
    total_examples = 0

    for row in rows:
        row_id = str(row["id"])
        clips: dict[str, str] = {}
        for kind in ("word", "example"):
            audio_file = output_path(level, int(row_id), kind)
            if audio_file.is_file() and audio_file.stat().st_size >= 256:
                digest = hashlib.sha256(audio_file.read_bytes()).hexdigest()[:12]
                clips[kind] = f"{audio_file.relative_to(REPO_ROOT).as_posix()}?v={digest}"
                if kind == "word":
                    total_words += 1
                else:
                    total_examples += 1
        if clips:
            items[row_id] = clips

    manifest = {
        "version": 1,
        "level": level,
        "model": model,
        "engine": "GeminiFlashTTS",
        "voice": voice,
        "speed": 1.0,
        "items": items,
    }

    temp_path = manifest_path.with_suffix(".json.tmp")
    temp_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp_path.replace(manifest_path)
    print(f"Updated manifest: {manifest_path} ({len(items)} items, {total_words} words, {total_examples} examples)")


def git_commit_and_push(batch_count: int, level: str) -> None:
    try:
        manifest_path = REPO_ROOT / "database" / "prebuilt_audio" / level / "manifest.json"
        audio_dir = REPO_ROOT / "database" / "prebuilt_audio" / level
        print(f"\n[>>> GIT] Committing and pushing batch of {batch_count} audio clips for {level.upper()} to main...", flush=True)
        subprocess.run(["git", "add", str(audio_dir), str(manifest_path)], cwd=REPO_ROOT, check=True)
        commit_msg = f"feat(audio): batch generate prebuilt audio ({level.upper()}: +{batch_count} clips)"
        res = subprocess.run(["git", "commit", "-m", commit_msg], cwd=REPO_ROOT, capture_output=True, text=True)
        print(f"[>>> GIT] {res.stdout.strip()}", flush=True)
        push_res = subprocess.run(["git", "push", "origin", "HEAD:main"], cwd=REPO_ROOT, capture_output=True, text=True)
        if push_res.returncode != 0:
            subprocess.run(["git", "pull", "--rebase", "origin", "main"], cwd=REPO_ROOT, capture_output=True, text=True)
            push_res = subprocess.run(["git", "push", "origin", "HEAD:main"], cwd=REPO_ROOT, capture_output=True, text=True)
        print(f"[>>> GIT] Push result: {push_res.stdout.strip() or push_res.stderr.strip() or 'OK'}\n", flush=True)
    except Exception as e:
        print(f"[!] Warning: git commit/push encountered error: {e}", flush=True)


def main() -> int:
    args = parse_args()
    if args.fast:
        args.delay_seconds = 0.5

    ids_filter = {int(x.strip()) for x in args.ids.split(",") if x.strip()} if args.ids else None
    rows = load_rows(args.level, args.start_id, args.limit, ids_filter)

    kinds = ["word", "example"] if args.kind == "both" else [args.kind]
    tasks = []
    for r in rows:
        for k in kinds:
            dest = output_path(args.level, r["id"], k)
            tasks.append({
                "id": r["id"],
                "kind": k,
                "text": r["word"] if k == "word" else r["example"],
                "output": dest,
            })

    # Filter out existing if not overwrite
    pending = []
    for t in tasks:
        if args.overwrite or not t["output"].is_file() or t["output"].stat().st_size < 256:
            pending.append(t)

    print(f"Level: {args.level.upper()}")
    print(f"Total planned tasks: {len(tasks)} ({len(pending)} pending, {len(tasks) - len(pending)} already exist)")
    print(f"Model: {args.model} | Voice: {args.voice} | Bitrate: {args.bitrate}")
    print(f"Delay between requests: {args.delay_seconds:.1f}s | Batch size: {args.batch_size} words ({args.batch_size * len(kinds)} clips)")

    if args.dry_run:
        print("\n[DRY RUN] First 5 pending clips:")
        for t in pending[:5]:
            print(f"  [{t['kind']:7s}] #{t['id']:04d}: {t['text']} -> {t['output']}")
        return 0

    if not pending:
        print("All audio clips are already generated!")
        if not args.skip_manifest:
            update_manifest(args.level, args.model, args.voice)
        return 0

    api_keys = get_api_keys(args.api_key)
    if not api_keys:
        print("ERROR: No Gemini API key found. Pass --api-key, set GEMINI_API_KEY, or create .api_key", file=sys.stderr)
        return 1

    models_to_try = [args.model] + [m for m in FALLBACK_MODELS if m != args.model]
    current_model_idx = 0
    key_index = 0
    success_count = 0
    uncommitted_clips = 0
    batch_target_clips = args.batch_size * len(kinds)

    for i, task in enumerate(pending, 1):
        key = api_keys[key_index % len(api_keys)]
        print(f"[{i}/{len(pending)}] Generating #{task['id']:04d} ({task['kind']}): {task['text']} ...", end="", flush=True)

        generated = False
        while current_model_idx < len(models_to_try):
            current_model = models_to_try[current_model_idx]
            try:
                wav_bytes = call_gemini_tts(
                    text=task["text"],
                    api_key=key,
                    model=current_model,
                    voice=args.voice,
                )
                encode_mp3(wav_bytes, task["output"], args.bitrate)
                file_size_kb = task["output"].stat().st_size / 1024
                print(f" OK via {current_model} ({file_size_kb:.1f} KB)")
                success_count += 1
                uncommitted_clips += 1
                generated = True
                break
            except DailyQuotaExhaustedError as dq:
                print(f"\n  [Cascade] {dq}. Switching to fallback model...", end="", flush=True)
                current_model_idx += 1
            except Exception as exc:
                print(f" FAILED: {exc}")
                if len(api_keys) > 1:
                    key_index += 1
                    print(f"  Switched to API key #{key_index % len(api_keys) + 1}")
                break

        if current_model_idx >= len(models_to_try):
            print("\nAll available Gemini TTS models have exhausted their daily quotas!")
            break

        # Batch commit and push when reaching batch size
        if uncommitted_clips >= batch_target_clips:
            if not args.skip_manifest:
                update_manifest(args.level, args.model, args.voice)
            if args.auto_commit:
                git_commit_and_push(uncommitted_clips, args.level)
                uncommitted_clips = 0
        elif not args.skip_manifest and success_count % 10 == 0:
            update_manifest(args.level, args.model, args.voice)

        # Respect rate limits
        if i < len(pending) and args.delay_seconds > 0:
            time.sleep(args.delay_seconds)

    if not args.skip_manifest:
        update_manifest(args.level, args.model, args.voice)

    if args.auto_commit and uncommitted_clips > 0:
        git_commit_and_push(uncommitted_clips, args.level)

    print(f"\nDone! Generated {success_count}/{len(pending)} clips.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
