import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = ROOT / "index.html"
BASE_CSS = ROOT / "assets/css/base.css"
PLUM_JS = ROOT / "assets/js/plum-blossom-background.js"
LIGHT_SVG = ROOT / "assets/images/chinese_landscape_light.svg"
DARK_SVG = ROOT / "assets/images/chinese_landscape_dark.svg"


def test_html_includes_canvas_and_script():
    """Verify index.html contains background canvas and plum blossom animation script."""
    html_content = INDEX_HTML.read_text(encoding="utf-8")

    # Background container with canvas
    assert 'class="chinese-aesthetic-bg"' in html_content
    assert 'id="plumBlossomCanvas"' in html_content
    assert 'class="plum-blossom-canvas"' in html_content
    assert 'aria-hidden="true"' in html_content

    # Script inclusion
    assert 'assets/js/plum-blossom-background.js' in html_content


def test_base_css_tokens_and_layering():
    """Verify base.css defines authentic classical colors and non-blocking pointer events."""
    css_content = BASE_CSS.read_text(encoding="utf-8")

    # Light mode classical palette
    assert "#F5F0E6" in css_content  # Warm ivory
    assert "#EFE7D8" in css_content  # Xuan paper
    assert "#A6A096" in css_content  # Soft ink gray
    assert "#A8322A" in css_content  # Vermilion
    assert "#C5A46D" in css_content  # Antique gold

    # Dark mode classical palette
    assert "#17191D" in css_content  # Deep ink black
    assert "#22252B" in css_content  # Dark charcoal
    assert "#B89B68" in css_content  # Antique gold dark
    assert "#EDE6D8" in css_content  # Soft ivory text

    # Layering & non-blocking interaction
    assert ".chinese-aesthetic-bg" in css_content
    assert "pointer-events: none" in css_content
    assert "z-index: 0" in css_content
    assert ".plum-blossom-canvas" in css_content


def test_background_svgs_valid_and_free_of_stripes_or_pavilions():
    """Verify SVGs are well-formed and do not contain unwanted geometric stripes or cartoon icons."""
    for svg_path in [LIGHT_SVG, DARK_SVG]:
        assert svg_path.exists(), f"SVG missing: {svg_path}"
        content = svg_path.read_text(encoding="utf-8")

        # XML Parsing check
        root = ET.fromstring(content)
        assert root.tag.endswith("svg")

        # No vertical stripes caused by horizontal gradients
        # Check that linearGradients do not span horizontally across screen
        assert 'x1="0%" y1="0%" x2="100%" y2="0%"' not in content

        # No cartoon pavilions, boats or bridge icons
        assert "chinese-pavilion" not in content
        assert "stone-bridge" not in content
        assert "fishing-boat" not in content
        assert "pagoda" not in content

        # Contains authentic Chinese plum blossom elements (five petal form / buds)
        assert "corner-plum-branch" in content
        assert "distant-ink-mountains" in content


def test_plum_blossom_animation_js():
    """Verify JS engine meets performance, responsive, and visual specifications."""
    assert PLUM_JS.exists(), "Animation script missing"
    js_content = PLUM_JS.read_text(encoding="utf-8")

    # Petal counts bounded between 8-15 for desktop, reduced for mobile
    assert "desktopPetals: 12" in js_content
    assert "mobilePetals: 6" in js_content

    # Core aesthetic layers
    assert "renderMist" in js_content
    assert "renderPetals" in js_content
    assert "renderGoldParticles" in js_content

    # Plum blossom distinct from Sakura (rounded petal, full 5-petal flower)
    assert "drawPlumPetal" in js_content
    assert "drawFullPlumBlossom" in js_content

    # Performance & accessibility safeguards
    assert "requestAnimationFrame" in js_content
    assert "cancelAnimationFrame" in js_content
    assert "prefers-reduced-motion" in js_content
    assert "visibilitychange" in js_content
    assert "document.hidden" in js_content
