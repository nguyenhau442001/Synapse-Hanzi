#!/usr/bin/env python3
"""
Generate Clean Chinese Rice Paper Background SVGs (宣纸温润底色 · 无杂饰东方美学)
for 汉字思维 (Hànzì Sīwéi) Light & Dark themes.
Eliminates all oversized branches, flowers, and landscape waves.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIGHT_SVG_PATH = ROOT / "assets/images/chinese_landscape_light.svg"
DARK_SVG_PATH = ROOT / "assets/images/chinese_landscape_dark.svg"


def build_light_xuan_paper_svg() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%" preserveAspectRatio="xMidYMax slice">
  <defs>
    <!-- Authentic Xuan Paper Canvas Gradient (Warm Ivory #F7F3EA to #F1EBDD) -->
    <linearGradient id="xuan_paper_light" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F7F3EA"/>
      <stop offset="50%" stop-color="#F4EFE5"/>
      <stop offset="100%" stop-color="#F1EBDD"/>
    </linearGradient>

    <!-- Microscopic Xuan Paper Fiber Texture Filter -->
    <filter id="xuan_fiber_grain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.02 0" in="noise" result="coloredNoise"/>
      <feBlend mode="multiply" in="SourceGraphic" in2="coloredNoise"/>
    </filter>

    <!-- Faint, Ethereal Atmospheric Ink Mist Wash at Horizon (Very Subtle) -->
    <linearGradient id="ethereal_mist_wash" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F7F3EA" stop-opacity="0"/>
      <stop offset="70%" stop-color="#EBE3D3" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#E2D8C5" stop-opacity="0.14"/>
    </linearGradient>
  </defs>

  <!-- Layer 1: Pristine Warm Xuan Paper Base -->
  <rect width="100%" height="100%" fill="url(#xuan_paper_light)"/>
  <rect width="100%" height="100%" fill="#F1EBDD" opacity="0.4" filter="url(#xuan_fiber_grain)"/>

  <!-- Layer 2: Ultra-subtle Lower Mist Diffusion (Distraction-Free) -->
  <rect y="720" width="100%" height="360" fill="url(#ethereal_mist_wash)"/>
</svg>
"""


def build_dark_xuan_paper_svg() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%" preserveAspectRatio="xMidYMax slice">
  <defs>
    <!-- Deep Pine-Soot Ink Canvas Gradient (#16181C to #1F2329) -->
    <linearGradient id="xuan_paper_dark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#16181C"/>
      <stop offset="55%" stop-color="#1A1D23"/>
      <stop offset="100%" stop-color="#1F2329"/>
    </linearGradient>

    <!-- Microscopic Grain Filter for Dark Canvas -->
    <filter id="dark_fiber_grain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.02 0" in="noise" result="coloredNoise"/>
      <feBlend mode="screen" in="SourceGraphic" in2="coloredNoise"/>
    </filter>

    <!-- Faint Lower Nocturnal Ink Mist -->
    <linearGradient id="dark_mist_wash" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#16181C" stop-opacity="0"/>
      <stop offset="70%" stop-color="#242A33" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#282F3A" stop-opacity="0.2"/>
    </linearGradient>
  </defs>

  <!-- Layer 1: Comfortable Deep Nocturnal Paper Base -->
  <rect width="100%" height="100%" fill="url(#xuan_paper_dark)"/>
  <rect width="100%" height="100%" fill="#1F2329" opacity="0.3" filter="url(#dark_fiber_grain)"/>

  <!-- Layer 2: Ultra-subtle Lower Nocturnal Mist Diffusion -->
  <rect y="720" width="100%" height="360" fill="url(#dark_mist_wash)"/>
</svg>
"""


def main():
    light_content = build_light_xuan_paper_svg().strip()
    dark_content = build_dark_xuan_paper_svg().strip()

    LIGHT_SVG_PATH.write_text(light_content, encoding="utf-8")
    DARK_SVG_PATH.write_text(dark_content, encoding="utf-8")

    print(f"Generated clean light Xuan paper SVG: {LIGHT_SVG_PATH} ({len(light_content)} bytes)")
    print(f"Generated clean dark Xuan paper SVG: {DARK_SVG_PATH} ({len(dark_content)} bytes)")


if __name__ == "__main__":
    main()
