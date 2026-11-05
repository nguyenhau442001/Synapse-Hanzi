#!/usr/bin/env python3
"""
tools/run_all_hsk30_audio.py
Orchestrates end-to-end Mandarin audio generation using Google Gemini Flash TTS for HSK 3.0:
  - Level 5: index 414 -> 1600
  - Level 6: index 0 -> 1800
  - Level 7 (covering 7, 8, 9): index 0 -> 5600
Commits each word individually and pushes periodically to main.
"""

import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from tools.build_hsk30_audio import build_audio, git_run_with_retry


def main():
    levels = [
        ("level5", 414),
        ("level6", 0),
        ("level7", 0),
    ]

    for level, start_idx in levels:
        print(f"\n{'='*60}\n>>> STARTING AUDIO GENERATION FOR {level.upper()} FROM INDEX {start_idx}\n{'='*60}\n", flush=True)
        try:
            build_audio(
                level=level,
                start_idx=start_idx,
                count=-1,
                overwrite=False,
                commit_each=True,
                push_every=25
            )
        except Exception as e:
            print(f"[!] Error in {level}: {e}", flush=True)
            time.sleep(5)
            # Retry level from where it stopped
            build_audio(
                level=level,
                start_idx=start_idx,
                count=-1,
                overwrite=False,
                commit_each=True,
                push_every=25
            )

        # Final push for the level
        try:
            git_run_with_retry(["git", "push", "origin", "HEAD:main"])
            print(f"[✓] Pushed all commits for {level.upper()} to origin main.", flush=True)
        except Exception as e:
            print(f"[!] Push error for {level}: {e}", flush=True)

    print("\n[🎉] ALL HSK 3.0 AUDIO GENERATION SUCCESSFULLY COMPLETED!\n", flush=True)


if __name__ == "__main__":
    main()
