#!/usr/bin/env python3
"""
tools/redraw_illustration.py
Install hand-redrawn HSK 3.0 illustrations, one git commit per word.

Art direction (editorial set, applies to every redrawn word):
  * 240x240 viewBox, root <svg ... data-style="editorial">.
  * First element: square warm-cream paper  <rect width="240" height="240" fill="#F4EDE2"/>
    (no rounded corners - the card frame clips it).
  * Restrained palette only:
      cream #FBF6EE / paper #F4EDE2 / beige #E3D5C1 / sand #D8C3A5
      terracotta #B4532F / soft orange #E39A62 / blush #F0C7AE
      charcoal #3A332D (outlines, hair, dark details) / warm gray #8F857A
      sage #7E9C86 / deep sage #5C7D68 / mist blue #8FA7B3 (sky, water, glass only)
  * Charcoal outlines (stroke-width 3, round caps/joins) on main shapes, flat fills,
    one soft ground shadow (#E3D5C1) under the subject.
  * Concrete and literal: show the thing itself, or a person clearly doing the action.
    Numbers are drawn as that many countable objects (six = six oranges), never clocks
    or symbols that need a second step of reasoning.
  * No text, letters, digits or Chinese characters inside the picture.

Usage:
  python3 tools/redraw_illustration.py --level 1 --dir /path/to/svgs [--push-every 25]
  The directory holds <hanzi>.svg files; they are committed in vocabulary order.
"""

import argparse
import json
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VOCAB_DIR = REPO / "database" / "vocabs" / "hsk3_0"
IMAGES_DIR = REPO / "images" / "HSK_3.0"
PACK_DIR = REPO / "database" / "illustrations"
SHARED_MIRRORS = {7: (8, 9)}

ALLOWED_COLORS = {
    "#FBF6EE", "#F4EDE2", "#E3D5C1", "#D8C3A5", "#B4532F", "#E39A62", "#F0C7AE",
    "#3A332D", "#8F857A", "#7E9C86", "#5C7D68", "#8FA7B3", "#FFFFFF", "NONE",
}


def vocab_order(level):
    words = json.loads((VOCAB_DIR / f"level{level}_vocabularies.json").read_text(encoding="utf-8"))
    seen, order = set(), []
    for w in words:
        hz = (w.get("hanzi") or "").strip()
        if hz and hz not in seen:
            seen.add(hz)
            order.append(hz)
    return order


def validate(svg_text, hanzi):
    root = ET.fromstring(svg_text)
    if root.get("viewBox") != "0 0 240 240":
        raise ValueError(f"{hanzi}: viewBox must be '0 0 240 240'")
    if root.get("data-style") != "editorial":
        raise ValueError(f"{hanzi}: missing data-style=\"editorial\"")
    if re.search(r"<text\b|<tspan\b", svg_text):
        raise ValueError(f"{hanzi}: text elements are not allowed")
    first = next(iter(root))
    if not first.tag.endswith("rect") or first.get("fill") != "#F4EDE2":
        raise ValueError(f"{hanzi}: first element must be the #F4EDE2 paper rect")
    colors = {c.upper() for c in re.findall(r'(?:fill|stroke|stop-color)="(#[0-9A-Fa-f]{6}|none)"', svg_text)}
    bad = colors - ALLOWED_COLORS
    if bad:
        raise ValueError(f"{hanzi}: colors outside the palette: {sorted(bad)}")


def minify(svg_text):
    s = re.sub(r"<!--.*?-->", "", svg_text, flags=re.S)
    s = re.sub(r">\s+<", "><", s)
    return re.sub(r"\s+", " ", s).strip()


def git(*args, attempts=40):
    """Run git, retrying while another process (e.g. a parallel audio build) holds the index lock."""
    for i in range(attempts):
        res = subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True)
        if res.returncode == 0:
            return res.stdout
        if "index.lock" not in res.stderr and "cannot lock ref" not in res.stderr and "rejected" not in res.stderr:
            raise RuntimeError(f"git {' '.join(args)} failed: {res.stderr.strip()}")
        time.sleep(0.5 + i * 0.25)
    raise RuntimeError(f"git {' '.join(args)} kept failing: {res.stderr.strip()}")


def install(level, hanzi, svg_text):
    validate(svg_text, hanzi)
    target = IMAGES_DIR / f"level{level}" / f"{hanzi}.svg"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(svg_text.strip() + "\n", encoding="utf-8")
    paths = [str(target.relative_to(REPO))]
    # Levels 7-9 share one vocabulary list; level8/ and level9/ hold identical copies of level7/.
    for mirror in SHARED_MIRRORS.get(level, ()):
        copy = IMAGES_DIR / f"level{mirror}" / f"{hanzi}.svg"
        if copy.parent.exists():
            copy.write_text(svg_text.strip() + "\n", encoding="utf-8")
            paths.append(str(copy.relative_to(REPO)))

    pack_path = PACK_DIR / f"hsk30_{level}.json"
    if pack_path.exists():
        pack = json.loads(pack_path.read_text(encoding="utf-8"))
        pack[hanzi] = minify(svg_text)
        pack_path.write_text(json.dumps(pack, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        paths.append(str(pack_path.relative_to(REPO)))

    # Untracked (brand-new) files must be added first; tracked ones are committed straight from
    # the working tree so they never sit in the shared index where a parallel job (the audio
    # build commits whatever is staged) could sweep them into its own commit.
    untracked = git("ls-files", "--others", "--exclude-standard", "--", *paths).split()
    if untracked:
        git("add", "--", *untracked)
    if not git("status", "--porcelain", "--", *paths).strip():
        return False
    label = "levels 7-9" if level in SHARED_MIRRORS else f"level {level}"
    git("commit", "-q", "-m", f"feat(illustration): redraw {hanzi} for HSK 3.0 {label}", "--", *paths)
    heal_index(paths)
    return True


def heal_index(paths):
    """A parallel job can write back a stale index entry right after our commit; if the index
    no longer matches HEAD for our paths, re-sync it (worktree == HEAD, so this stages nothing new)."""
    for _ in range(3):
        time.sleep(0.2)
        if git("diff", "--cached", "--name-only", "--", *paths).strip():
            git("add", "--", *paths)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--level", type=int, required=True)
    ap.add_argument("--dir", required=True)
    ap.add_argument("--push-every", type=int, default=25)
    args = ap.parse_args()

    src = Path(args.dir)
    files = {p.stem: p for p in src.glob("*.svg")}
    order = [hz for hz in vocab_order(args.level) if hz in files]
    unknown = sorted(set(files) - set(order))
    if unknown:
        sys.exit(f"Not in level {args.level} vocabulary: {unknown}")

    # Validate everything first so a bad file never leaves a half-committed batch.
    for hz in order:
        validate(files[hz].read_text(encoding="utf-8"), hz)

    done = 0
    for hz in order:
        if install(args.level, hz, files[hz].read_text(encoding="utf-8")):
            done += 1
            if args.push_every and done % args.push_every == 0:
                git("push", "-q", "origin", "HEAD:main")
    if done:
        git("push", "-q", "origin", "HEAD:main")
    print(f"level {args.level}: {done} words committed")


if __name__ == "__main__":
    main()
