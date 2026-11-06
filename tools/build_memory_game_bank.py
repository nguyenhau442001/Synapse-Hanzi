#!/usr/bin/env python3
"""Build a word bank for the memory-matching (flip-card) game.

Reads every database/vocabs/hsk*.json and database/vocabs/topics/*.json
and writes database/vocabs/memory_game_bank.json with one entry per word:
{ hanzi, meaning, source }. The game picks a random subset per round.
"""

from __future__ import annotations

from vocab_bank import VOCAB_DIR, build_bank
OUTPUT_PATH = VOCAB_DIR / "memory_game_bank.json"


def make_entry(word: dict, source: str) -> dict | None:
    hanzi = word.get("hanzi")
    meaning = word.get("meaning")
    if not hanzi or not meaning:
        return None
    return {"hanzi": hanzi, "meaning": meaning, "source": source}


def main() -> None:
    build_bank(make_entry, OUTPUT_PATH)


if __name__ == "__main__":
    main()
