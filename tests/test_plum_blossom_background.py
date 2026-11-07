import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = ROOT / "index.html"
BASE_CSS = ROOT / "assets/css/base.css"
WORKSTATION_CSS = ROOT / "assets/css/workstation.css"
PLUM_JS = ROOT / "src/islands/ambientBackground.js"
LIGHT_SVG = ROOT / "assets/images/chinese_landscape_light.svg"
DARK_SVG = ROOT / "assets/images/chinese_landscape_dark.svg"


def test_html_includes_canvas_and_script():
    """Verify index.html contains background canvas and ambient animation script."""
    html_content = INDEX_HTML.read_text(encoding="utf-8")

    # Background container with canvas
    assert 'class="chinese-aesthetic-bg"' in html_content
    assert 'id="plumBlossomCanvas"' in html_content
    assert 'class="plum-blossom-canvas"' in html_content
    assert 'aria-hidden="true"' in html_content

    # The ambient engine ships in the Preact islands bundle (src/islands/ambientBackground.js)
    assert 'assets/js/preact/islands.js' in html_content
    assert "mountAmbientBackground()" in (ROOT / "src/islands/main.jsx").read_text(encoding="utf-8")


def test_base_css_tokens_and_layering():
    """Verify base.css defines authentic classical colors and non-blocking pointer events."""
    css_content = BASE_CSS.read_text(encoding="utf-8")

    # Modern Chinese Learning palette
    assert "#F7F3EA" in css_content  # Main warm ivory
    assert "#F1EBDD" in css_content  # Secondary Xuan paper
    assert "#A8322A" in css_content  # Vermilion
    assert "#C5A46D" in css_content  # Antique gold

    # Dark mode classical palette
    assert "#17191D" in css_content or "#16181C" in css_content
    assert "#B89B68" in css_content
    assert "#EDE6D8" in css_content

    # Layering & non-blocking interaction
    assert ".chinese-aesthetic-bg" in css_content
    assert "pointer-events: none" in css_content
    assert "z-index: 0" in css_content
    assert ".plum-blossom-canvas" in css_content


def test_background_svgs_clean_xuan_paper():
    """Verify SVGs are well-formed and free of oversized branches, flowers, and wave shapes."""
    for svg_path in [LIGHT_SVG, DARK_SVG]:
        assert svg_path.exists(), f"SVG missing: {svg_path}"
        content = svg_path.read_text(encoding="utf-8")

        # XML Parsing check
        root = ET.fromstring(content)
        assert root.tag.endswith("svg")

        # No vertical stripes caused by horizontal gradients
        assert 'x1="0%" y1="0%" x2="100%" y2="0%"' not in content

        # Completely removed oversized decorative elements as instructed
        assert "corner-plum-branch" not in content
        assert "cherry-blossom" not in content
        assert "chinese-pavilion" not in content
        assert "stone-bridge" not in content
        assert "fishing-boat" not in content
        assert "pagoda" not in content


def test_subtle_ambient_animation_js():
    """Verify JS engine meets performance, responsive, and subtle ink ambient specifications."""
    assert PLUM_JS.exists(), "Animation script missing"
    js_content = PLUM_JS.read_text(encoding="utf-8")

    # Only a handful of faint particles (v3.8.2 noise reduction)
    assert "desktopParticles: 4" in js_content
    assert "mobileParticles: 2" in js_content

    # Core subtle ink layers
    assert "renderMist" in js_content
    assert "renderParticles" in js_content

    # Performance & accessibility safeguards
    assert "requestAnimationFrame" in js_content
    assert "cancelAnimationFrame" in js_content
    assert "prefers-reduced-motion" in js_content
    assert "visibilitychange" in js_content
    assert "document.hidden" in js_content


def test_compact_statistics_and_editorial_example():
    """Verify statistics cards are compact and example box has editorial dictionary styling."""
    css_content = WORKSTATION_CSS.read_text(encoding="utf-8")

    # Compact stats strip
    assert "height: 38px" in css_content
    assert ".progress-nav-cards" in css_content

    # Editorial dictionary entry example box
    assert ".example-box" in css_content
    assert "Editorial Dictionary Entry" in css_content


def test_ink_landscape_svgs_have_faint_mountains_and_no_orb():
    """Both themes keep three very faint ink-wash ridges; the sun/moon orb is gone."""
    import re
    light = LIGHT_SVG.read_text(encoding="utf-8")
    dark = DARK_SVG.read_text(encoding="utf-8")
    for content in (light, dark):
        assert content.count('class="ink-ridge ') == 3
        assert 'filter="url(#ink_soft_edge)"' in content
        assert 'class="ink-sun"' not in content
        assert 'class="ink-moon"' not in content
        for opacity in re.findall(r'class="ink-ridge [^>]*opacity="([0-9.]+)"', content):
            assert float(opacity) <= 0.08


def test_background_has_no_petals_calligraphy_or_seal():
    """Petals, margin calligraphy and the seal are removed; ink blooms stay rare and in margins."""
    js_content = PLUM_JS.read_text(encoding="utf-8")
    for removed in ("Petal", "petal", "renderCalligraphy", "sealText", "calligraphyLeft"):
        assert removed not in js_content

    # Ink blooms disabled (v3.8.2); the margin guard stays for safety
    assert "maxInkBlooms: 0" in js_content
    assert "inkBloomMinGutter: 160" in js_content
    assert "if (g < CONFIG.inkBloomMinGutter)" in js_content
    assert "renderInkBlooms" in js_content
    assert "measureGutter" in js_content
