#!/usr/bin/env python3
"""Bump the app version (SemVer) and write it everywhere it is needed.

Usage:
    python3 tools/bump_version.py patch|minor|major   # bump from the current VERSION
    python3 tools/bump_version.py X.Y.Z               # set an explicit version
    python3 tools/bump_version.py --current           # re-sync files to VERSION

VERSION is the source of truth. This script is the only thing that should edit the
copies below: package.json, sw.js / utils.js APP_VERSION, every ?v= cache-buster in
index.html and assets/flashcards.css, and the footer badge.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEMVER = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")

# file -> list of (pattern, replacement template); {v} is the new version
TARGETS = {
    "sw.js": [(r"const APP_VERSION = '[^']*';", "const APP_VERSION = '{v}';")],
    "assets/js/utils.js": [(r"const APP_VERSION = '[^']*';", "const APP_VERSION = '{v}';")],
    "assets/flashcards.css": [(r"\?v=[^\"')\s]+", "?v={v}")],
    "index.html": [
        (r"\?v=[^\"')\s]+", "?v={v}"),
        (r'(<span class="footer-version"[^>]*>)v[^<]*(</span>)', r"\g<1>v{v}\g<2>"),
    ],
}


def bump(current: str, arg: str) -> str:
    if SEMVER.match(arg):
        return arg
    major, minor, patch = map(int, SEMVER.match(current).groups())
    return {"major": f"{major + 1}.0.0", "minor": f"{major}.{minor + 1}.0", "patch": f"{major}.{minor}.{patch + 1}"}[arg]


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    current = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    arg = sys.argv[1].strip().lower()
    new = current if arg in ("--current", "sync") else bump(current, arg)

    (ROOT / "VERSION").write_text(new + "\n", encoding="utf-8")
    pkg = ROOT / "package.json"
    data = json.loads(pkg.read_text(encoding="utf-8"))
    data["version"] = new
    pkg.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    for rel, rules in TARGETS.items():
        path = ROOT / rel
        text = path.read_text(encoding="utf-8")
        for pattern, template in rules:
            text = re.sub(pattern, template.replace("{v}", new), text)
        path.write_text(text, encoding="utf-8")

    print(f"{current} -> {new}: VERSION, package.json, " + ", ".join(TARGETS))


if __name__ == "__main__":
    main()
