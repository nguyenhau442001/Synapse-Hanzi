#!/usr/bin/env python3
"""
Semantic Versioning (SemVer) helper script for Synapse Hanzi.
Usage:
    python3 tools/bump_version.py patch     # e.g., 1.0.0 -> 1.0.1 (Bug fixes, UI polish)
    python3 tools/bump_version.py minor     # e.g., 1.0.0 -> 1.1.0 (New features)
    python3 tools/bump_version.py major     # e.g., 1.0.0 -> 2.0.0 (Breaking changes)
    python3 tools/bump_version.py 1.2.3     # Explicit version
    python3 tools/bump_version.py --current # Sync existing version across all files
"""

import sys
import re
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION_FILE = ROOT / "VERSION"
PACKAGE_JSON = ROOT / "package.json"
SW_JS = ROOT / "sw.js"
INDEX_HTML = ROOT / "index.html"

SEMVER_REGEX = r"^(\d+)\.(\d+)\.(\d+)$"

def get_current_version() -> str:
    if VERSION_FILE.exists():
        v = VERSION_FILE.read_text(encoding="utf-8").strip()
        if re.match(SEMVER_REGEX, v):
            return v
    if PACKAGE_JSON.exists():
        try:
            data = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
            v = data.get("version", "").strip()
            if re.match(SEMVER_REGEX, v):
                return v
        except Exception:
            pass
    return "1.0.0"

def bump_semver(current: str, part: str) -> str:
    m = re.match(SEMVER_REGEX, current)
    if not m:
        raise ValueError(f"Invalid semver: {current}")
    major, minor, patch = map(int, m.groups())
    
    if part == "major":
        return f"{major + 1}.0.0"
    elif part == "minor":
        return f"{major}.{minor + 1}.0"
    elif part == "patch":
        return f"{major}.{minor}.{patch + 1}"
    elif re.match(SEMVER_REGEX, part):
        return part
    else:
        raise ValueError(f"Invalid bump command or version format: {part}. Use major, minor, patch, or X.Y.Z")

def update_version_file(new_version: str):
    VERSION_FILE.write_text(f"{new_version}\n", encoding="utf-8")
    print(f"✓ Updated VERSION: {new_version}")

def update_package_json(new_version: str):
    if PACKAGE_JSON.exists():
        data = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    else:
        data = {
            "name": "synapse-hanzi",
            "version": new_version,
            "description": "Trạm học từ vựng chữ Hán đa giác quan, hiện đại, tối giản và thông minh (PWA)",
            "private": True,
            "scripts": {
                "version:patch": "python3 tools/bump_version.py patch",
                "version:minor": "python3 tools/bump_version.py minor",
                "version:major": "python3 tools/bump_version.py major"
            }
        }
    data["version"] = new_version
    PACKAGE_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"✓ Updated package.json: version {new_version}")

def update_sw_js(new_version: str):
    if not SW_JS.exists():
        return
    content = SW_JS.read_text(encoding="utf-8")
    
    # Check if APP_VERSION exists
    if "const APP_VERSION =" in content:
        content = re.sub(
            r"const APP_VERSION\s*=\s*['\"][^'\"]+['\"];",
            f"const APP_VERSION = '{new_version}';",
            content
        )
    else:
        # Prepend APP_VERSION and wire ASSET_VERSION to it
        content = re.sub(
            r"const ASSET_VERSION\s*=\s*['\"][^'\"]+['\"];",
            f"const APP_VERSION = '{new_version}';\nconst ASSET_VERSION = APP_VERSION;",
            content
        )
    
    # Ensure ASSET_VERSION references APP_VERSION or new_version
    if "const ASSET_VERSION = APP_VERSION;" not in content:
        content = re.sub(
            r"const ASSET_VERSION\s*=\s*['\"][^'\"]+['\"];",
            f"const ASSET_VERSION = '{new_version}';",
            content
        )
        
    SW_JS.write_text(content, encoding="utf-8")
    print(f"✓ Updated sw.js: version {new_version}")

def update_index_html(new_version: str):
    if not INDEX_HTML.exists():
        return
    content = INDEX_HTML.read_text(encoding="utf-8")
    
    # Replace footer version badge if exists
    badge_regex = r'<span class="footer-version"[^>]*>v?[^<]*</span>'
    new_badge = f'<span class="footer-version" title="Phiên bản ứng dụng">v{new_version}</span>'
    
    if re.search(badge_regex, content):
        content = re.sub(badge_regex, new_badge, content)
    else:
        # Insert into footer note
        content = re.sub(
            r'(<p class="footer-note">)',
            rf'\1{new_badge} · ',
            content
        )
        
    INDEX_HTML.write_text(content, encoding="utf-8")
    print(f"✓ Updated index.html: footer badge v{new_version}")

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
        
    arg = sys.argv[1].lower().strip()
    current_version = get_current_version()
    
    if arg in ("--current", "-c", "sync"):
        new_version = current_version
        print(f"Syncing current version {new_version} across files...")
    else:
        new_version = bump_semver(current_version, arg)
        print(f"Bumping version: {current_version} -> {new_version}")
        
    update_version_file(new_version)
    update_package_json(new_version)
    update_sw_js(new_version)
    update_index_html(new_version)
    
    tag_name = f"v{new_version}"
    print("\nNext steps to complete release:")
    print(f"  1. git commit -am \"chore(release): {tag_name}\"")
    print(f"  2. git tag -a {tag_name} -m \"Release {tag_name}\"")
    print(f"  3. git push origin HEAD:main")
    print(f"  4. git push origin {tag_name}")

if __name__ == "__main__":
    main()
