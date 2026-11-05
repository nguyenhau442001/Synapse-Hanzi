import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

def test_hsk30_level1_audio_manifest():
    manifest_path = REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_1" / "manifest.json"
    assert manifest_path.exists(), "HSK 3.0 Level 1 manifest.json must exist"

    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data.get("level") == "hsk30_1"
    items = data.get("items", {})
    assert len(items) == 300, f"Expected 300 items in manifest, got {len(items)}"

    # Check first item structure
    item_1 = items.get("1")
    assert item_1 is not None
    assert "word" in item_1 and "example" in item_1
    assert item_1["word"].startswith("database/prebuilt_audio/hsk30_1/words/0001.mp3")
    assert item_1["example"].startswith("database/prebuilt_audio/hsk30_1/examples/0001.mp3")

    # Check physical MP3 file existence
    word_file = REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_1" / "words" / "0001.mp3"
    example_file = REPO_ROOT / "database" / "prebuilt_audio" / "hsk30_1" / "examples" / "0001.mp3"
    assert word_file.exists() and word_file.stat().st_size > 0
    assert example_file.exists() and example_file.stat().st_size > 0

def test_hsk30_level1_data_repository_config():
    repo_file = REPO_ROOT / "src" / "services" / "dataRepository.js"
    content = repo_file.read_text(encoding="utf-8")
    assert "audioManifestUrl: 'database/prebuilt_audio/hsk30_1/manifest.json'" in content

    # Crucial: static web app runs on assets/js/state.js
    state_file = REPO_ROOT / "assets" / "js" / "state.js"
    state_content = state_file.read_text(encoding="utf-8")
    assert "audioManifestUrl: 'database/prebuilt_audio/hsk30_1/manifest.json'" in state_content

def test_hsk30_illustrations_rechecked():
    pack_file = REPO_ROOT / "database" / "illustrations" / "hsk30_1.json"
    with open(pack_file, "r", encoding="utf-8") as f:
        pack = json.load(f)

    # Check key words that were regenerated with context-rich scenes
    sample_words = ["白天", "八", "不客气", "对不起", "和", "病", "公司", "火车", "鸡蛋", "好玩儿"]
    for w in sample_words:
        assert w in pack
        svg = pack[w]
        assert svg.startswith('<svg') and 'viewBox="0 0 240 240"' in svg
        # Must not be the old abstract template
        assert 'rx="24" fill="#1A1D24"/><circle cx="120" cy="80"' not in svg
