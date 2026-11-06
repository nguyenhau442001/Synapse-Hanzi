"""Shared helpers for the game-bank builders (guess-word, memory game)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Callable

REPO_ROOT = Path(__file__).resolve().parents[1]
VOCAB_DIR = REPO_ROOT / "database" / "vocabs"


def vocab_sources() -> list[tuple[Path, str]]:
    """(path, source) for HSK 1-6 decks, then every topic deck, in build order."""
    sources = [(VOCAB_DIR / f"hsk{n}_vocabularies.json", f"hsk{n}") for n in range(1, 7)]
    topics_dir = VOCAB_DIR / "topics"
    if topics_dir.exists():
        sources += [(p, f"topic_{p.stem}") for p in sorted(topics_dir.glob("*.json"))]
    return [(p, s) for p, s in sources if p.exists()]


def build_bank(make_entry: Callable[[dict, str], dict | None], output_path: Path) -> None:
    """Map every vocab word through make_entry (None skips it), keep the first
    entry per hanzi, and write the bank as pretty JSON."""
    entries: list[dict] = []
    seen_hanzi: set[str] = set()
    for path, source in vocab_sources():
        for word in json.loads(path.read_text(encoding="utf-8")):
            entry = make_entry(word, source)
            if entry is None or entry["hanzi"] in seen_hanzi:
                continue
            seen_hanzi.add(entry["hanzi"])
            entries.append(entry)
    output_path.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(entries)} words to {output_path}")
