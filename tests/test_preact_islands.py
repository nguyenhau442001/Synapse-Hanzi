#!/usr/bin/env python3
"""
tests/test_preact_islands.py

The live index.html loads Preact islands from a committed bundle
(assets/js/preact/islands.js, built from src/islands by `npm run build:islands`).
1. index.html and sw.js reference the bundle as an ES module.
2. The committed bundle is up to date with src/islands (rebuilt into a temp dir and compared).
"""

import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
BUNDLE = ROOT / "assets" / "js" / "preact" / "islands.js"


def test_islands_bundle_is_loaded_as_module():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert '<script type="module" src="assets/js/preact/islands.js?v=' in html
    assert "./assets/js/preact/islands.js?v=" in (ROOT / "sw.js").read_text(encoding="utf-8")
    assert BUNDLE.exists(), "Run `npm run build:islands` and commit assets/js/preact/islands.js"


@pytest.mark.skipif(not (ROOT / "node_modules" / ".bin" / "vite").exists() or shutil.which("node") is None,
                    reason="node_modules not installed")
def test_islands_bundle_is_up_to_date():
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [str(ROOT / "node_modules" / ".bin" / "vite"), "build", "--config", "vite.islands.config.mjs",
             "--outDir", tmp, "--logLevel", "error"],
            cwd=ROOT, check=True,
        )
        fresh = (Path(tmp) / "islands.js").read_bytes()
    assert fresh == BUNDLE.read_bytes(), "assets/js/preact/islands.js is stale: run `npm run build:islands`"


def test_service_worker_precaches_only_existing_files():
    # Legacy scripts are deleted as they move into islands; a stale precache entry would make
    # the service worker install fail.
    import re
    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    missing = [p for p in re.findall(r"'\./(assets/[^'?]+)", sw) if not (ROOT / p).exists()]
    assert not missing, f"sw.js precaches missing files: {missing}"
