#!/usr/bin/env python3
"""
tools/recheck_hsk30_illustrations.py
Recheck and regenerate vague/abstract SVGs for HSK 3.0 Level 1 vocabulary into
rich, scene-based contextual visual mnemonics based on their example_zh sentences.
Conforms strictly to README_ILLUSTRATIONS.md:
- 240x240 full-bleed with rx="24"
- Dark aesthetic container (#0f172a -> #1e293b)
- Zero text / Zero Hanzi
- Action-oriented scene with human figures, props, environment
"""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ILLUST_PACK_FILE = REPO_ROOT / "database" / "illustrations" / "hsk30_1.json"
SVG_DIR = REPO_ROOT / "images" / "HSK_3.0" / "level1"
VOCAB_FILE = REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level1_vocabularies.json"

SCENE_REPLACEMENTS = {
    # 1. 白天: 他白天都在公司认真上班。(Working diligently at the office during the daytime)
    "白天": """<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="windowSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#bae6fd"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="24" fill="url(#bgGrad)"/>
  <!-- Sunny Office Window -->
  <rect x="25" y="25" width="100" height="90" rx="8" fill="url(#windowSky)"/>
  <!-- Sun & Cloud outside window -->
  <circle cx="95" cy="48" r="14" fill="#fbbf24"/>
  <ellipse cx="55" cy="65" rx="18" ry="10" fill="#ffffff" opacity="0.85"/>
  <ellipse cx="68" cy="62" rx="14" ry="11" fill="#ffffff" opacity="0.95"/>
  <line x1="75" y1="25" x2="75" y2="115" stroke="#475569" stroke-width="2.5"/>
  <line x1="25" y1="70" x2="125" y2="70" stroke="#475569" stroke-width="2.5"/>
  <rect x="23" y="23" width="104" height="94" rx="8" fill="none" stroke="#64748b" stroke-width="3"/>
  <!-- Office Wall Clock -->
  <circle cx="185" cy="55" r="20" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
  <line x1="185" y1="55" x2="185" y2="42" stroke="#f8fafc" stroke-width="2" stroke-linecap="round"/>
  <line x1="185" y1="55" x2="195" y2="55" stroke="#f8fafc" stroke-width="2" stroke-linecap="round"/>
  <!-- Wooden Office Desk Surface -->
  <path d="M10 160 L230 160 L240 215 L0 215 Z" fill="#334155"/>
  <rect x="0" y="215" width="240" height="25" fill="#1e293b"/>
  <!-- Laptop on desk with working graph -->
  <rect x="65" y="115" width="85" height="52" rx="4" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
  <rect x="71" y="121" width="73" height="40" fill="#1e293b"/>
  <!-- Screen Chart -->
  <rect x="78" y="142" width="8" height="15" fill="#38bdf8" rx="1"/>
  <rect x="91" y="134" width="8" height="23" fill="#10b981" rx="1"/>
  <rect x="104" y="127" width="8" height="30" fill="#fbbf24" rx="1"/>
  <rect x="117" y="137" width="8" height="20" fill="#f43f5e" rx="1"/>
  <!-- Laptop Keyboard Base -->
  <polygon points="50,170 165,170 175,178 40,178" fill="#475569"/>
  <!-- Steaming Coffee Cup -->
  <rect x="180" y="145" width="22" height="25" rx="3" fill="#e2e8f0"/>
  <path d="M202 150 Q212 157 202 165" stroke="#e2e8f0" stroke-width="2.5" fill="none"/>
  <path d="M185 138 Q188 132 186 126" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M192 138 Q195 132 193 126" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <!-- Small Potted Plant -->
  <polygon points="25,172 41,172 38,188 28,188" fill="#ea580c"/>
  <circle cx="33" cy="165" r="9" fill="#10b981"/>
  <circle cx="28" cy="168" r="6" fill="#059669"/>
  <circle cx="38" cy="168" r="6" fill="#059669"/>
</svg>""",

    # 2. 八: 我有八本书。(I have eight books neatly arranged on my study table)
    "八": """<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#fef08a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="240" height="240" rx="24" fill="url(#bgGrad)"/>
  <!-- Study Desk Wooden Surface -->
  <rect x="0" y="175" width="240" height="65" fill="#334155"/>
  <line x1="0" y1="175" x2="240" y2="175" stroke="#475569" stroke-width="3"/>
  <!-- Cozy Reading Lamp -->
  <path d="M25 175 L45 175 M35 175 L35 70 Q35 50 65 50 L75 50" stroke="#94a3b8" stroke-width="4" fill="none" stroke-linecap="round"/>
  <polygon points="68,45 92,35 98,65 74,60" fill="#f59e0b"/>
  <circle cx="110" cy="80" r="45" fill="url(#lampGlow)"/>
  <!-- Exactly 8 Distinct, Beautiful Books on the Desk -->
  <!-- Stack 1: 3 horizontal books on left -->
  <g id="stack3">
    <!-- Book 1 (bottom) -->
    <rect x="55" y="156" width="60" height="18" rx="2" fill="#0284c7"/>
    <rect x="110" y="158" width="5" height="14" fill="#f8fafc"/>
    <line x1="58" y1="165" x2="105" y2="165" stroke="#38bdf8" stroke-width="1.5"/>
    <!-- Book 2 (middle) -->
    <rect x="58" y="139" width="54" height="17" rx="2" fill="#059669"/>
    <rect x="107" y="141" width="5" height="13" fill="#f8fafc"/>
    <line x1="62" y1="147" x2="102" y2="147" stroke="#34d399" stroke-width="1.5"/>
    <!-- Book 3 (top) -->
    <rect x="62" y="123" width="48" height="16" rx="2" fill="#e11d48"/>
    <rect x="105" y="125" width="5" height="12" fill="#f8fafc"/>
    <line x1="65" y1="131" x2="100" y2="131" stroke="#fb7185" stroke-width="1.5"/>
  </g>
  <!-- Row 2: 5 standing & leaning books on right (Total 3 + 5 = 8 books) -->
  <g id="row5">
    <!-- Book 4 (standing) -->
    <rect x="130" y="85" width="16" height="90" rx="2" fill="#d97706"/>
    <rect x="133" y="90" width="10" height="80" fill="#f59e0b" rx="1"/>
    <!-- Book 5 (standing) -->
    <rect x="148" y="92" width="15" height="83" rx="2" fill="#7c3aed"/>
    <rect x="151" y="97" width="9" height="73" fill="#8b5cf6" rx="1"/>
    <!-- Book 6 (standing with ribbon bookmark) -->
    <rect x="165" y="78" width="18" height="97" rx="2" fill="#0d9488"/>
    <rect x="168" y="83" width="12" height="87" fill="#14b8a6" rx="1"/>
    <path d="M174 78 L174 65 L178 70 L182 65 L182 78" fill="#f43f5e"/>
    <!-- Book 7 (standing) -->
    <rect x="185" y="98" width="15" height="77" rx="2" fill="#c026d3"/>
    <rect x="188" y="103" width="9" height="67" fill="#d946ef" rx="1"/>
    <!-- Book 8 (leaning against bookend) -->
    <g transform="translate(202, 175) rotate(-16) translate(-202, -175)">
      <rect x="202" y="88" width="16" height="87" rx="2" fill="#4338ca"/>
      <rect x="205" y="93" width="10" height="77" fill="#6366f1" rx="1"/>
    </g>
  </g>
  <!-- Bookend on far right -->
  <path d="M224 175 L224 135 L234 175 Z" fill="#64748b"/>
</svg>""",

    # 3. 不客气: 谢谢你！不客气。(Friendly "You're welcome" greeting outside cozy cafe)
    "不客气": """<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="24" fill="url(#bgGrad)"/>
  <!-- Warm background cafe awning -->
  <path d="M20 30 L220 30 L220 50 Q205 65 190 50 Q175 65 160 50 Q145 65 130 50 Q115 65 100 50 Q85 65 70 50 Q55 65 40 50 Q25 65 20 50 Z" fill="#ea580c"/>
  <path d="M20 30 L220 30 L220 38 L20 38 Z" fill="#c2410c"/>
  <rect x="0" y="185" width="240" height="55" fill="#334155"/>
  <!-- Person A (Left - thankful friend with gift bag, bowing politely) -->
  <g transform="translate(45, 80)">
    <!-- Head -->
    <circle cx="25" cy="20" r="16" fill="#fcd34d"/>
    <!-- Hair -->
    <path d="M10 20 C10 6 38 6 39 18 C34 14 18 16 10 20 Z" fill="#1e293b"/>
    <!-- Smiling eye & blush -->
    <path d="M23 20 Q27 24 31 20" stroke="#0f172a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="28" cy="24" r="3" fill="#fb7185" opacity="0.6"/>
    <!-- Body slightly leaning/bowing in gratitude -->
    <path d="M12 40 L38 40 L45 95 L5 95 Z" fill="#0284c7"/>
    <!-- Hand on chest gesture -->
    <path d="M12 45 Q26 55 30 50" stroke="#fcd34d" stroke-width="6" stroke-linecap="round"/>
    <!-- Gift bag in other hand -->
    <rect x="-8" y="70" width="22" height="28" rx="3" fill="#f43f5e"/>
    <path d="M-3 70 Q3 60 9 70" stroke="#fecdd3" stroke-width="2" fill="none"/>
  </g>
  <!-- Person B (Right - welcoming host smiling with open palm gesture "You're welcome") -->
  <g transform="translate(135, 75)">
    <!-- Head -->
    <circle cx="30" cy="22" r="16" fill="#fcd34d"/>
    <!-- Hair -->
    <path d="M16 20 C16 8 44 8 44 20 C38 15 24 16 16 20 Z" fill="#334155"/>
    <!-- Smiling face -->
    <path d="M27 22 Q31 26 35 22" stroke="#0f172a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="34" cy="26" r="3" fill="#fb7185" opacity="0.6"/>
    <!-- Body -->
    <path d="M16 43 L44 43 L52 100 L8 100 Z" fill="#10b981"/>
    <!-- Welcoming open hand gesture toward friend -->
    <path d="M16 50 Q-2 60 -10 52" stroke="#fcd34d" stroke-width="6" stroke-linecap="round"/>
    <!-- Gentle open palm -->
    <circle cx="-12" cy="51" r="5" fill="#fcd34d"/>
  </g>
  <!-- Floating pleasant warmth aura -->
  <circle cx="115" cy="115" r="4" fill="#fbbf24" opacity="0.8"/>
  <circle cx="125" cy="98" r="3" fill="#38bdf8" opacity="0.8"/>
  <circle cx="108" cy="85" r="2.5" fill="#f43f5e" opacity="0.8"/>
</svg>""",

    # 4. 对不起: 对不起，我来晚了。(Apologizing politely for arriving late with clock)
    "对不起": """<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="24" fill="url(#bgGrad)"/>
  <!-- Room Doorway Frame -->
  <rect x="25" y="30" width="110" height="155" rx="4" fill="#1e293b" stroke="#475569" stroke-width="3"/>
  <rect x="0" y="185" width="240" height="55" fill="#334155"/>
  <!-- Wall Clock showing late time (8:25) -->
  <g transform="translate(180, 55)">
    <circle cx="0" cy="0" r="24" fill="#0f172a" stroke="#f59e0b" stroke-width="3"/>
    <circle cx="0" cy="0" r="2" fill="#f8fafc"/>
    <!-- Hour hand at 8, Minute hand at 5 (25 mins past) -->
    <line x1="0" y1="0" x2="-10" y2="7" stroke="#f8fafc" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="0" y1="0" x2="13" y2="10" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
    <circle cx="0" cy="-18" r="1.5" fill="#94a3b8"/>
    <circle cx="18" cy="0" r="1.5" fill="#94a3b8"/>
    <circle cx="0" cy="18" r="1.5" fill="#94a3b8"/>
    <circle cx="-18" cy="0" r="1.5" fill="#94a3b8"/>
  </g>
  <!-- Character arriving in a hurry, bowing with hands clasped in apology -->
  <g transform="translate(60, 68)">
    <!-- Commuter Backpack -->
    <rect x="-10" y="42" width="16" height="32" rx="4" fill="#ea580c"/>
    <!-- Body bending forward in apology -->
    <path d="M5 38 L32 38 L38 95 L-2 95 Z" fill="#6366f1"/>
    <!-- Head bowed forward -->
    <circle cx="18" cy="16" r="15" fill="#fcd34d"/>
    <path d="M5 14 C5 2 30 2 32 12 C25 9 14 11 5 14 Z" fill="#1e293b"/>
    <!-- Apologetic expression (sweat drop & shut eyes) -->
    <path d="M14 17 L21 17" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
    <!-- Blue sweat drop -->
    <path d="M34 12 Q36 6 38 12 Q38 16 34 16 Z" fill="#38bdf8"/>
    <!-- Hands clasped in respectful apology (合十 / 抱歉) -->
    <ellipse cx="28" cy="46" rx="7" ry="5" fill="#fcd34d" transform="rotate(-15 28 46)"/>
  </g>
  <!-- Meeting table edge with papers on the right -->
  <path d="M150 145 L240 145 L240 185 L140 185 Z" fill="#475569"/>
  <rect x="160" y="138" width="22" height="15" rx="1" fill="#f8fafc" transform="rotate(6 160 138)"/>
  <rect x="190" y="136" width="24" height="16" rx="1" fill="#f8fafc" transform="rotate(-8 190 136)"/>
  <circle cx="225" cy="140" r="6" fill="#0284c7"/>
</svg>""",

    # 5. 和: 我和妈妈去商店。(Mother and child holding hands happily walking to the shop)
    "和": """<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="24" fill="url(#bgGrad)"/>
  <!-- Boutique Shop Storefront in the background -->
  <rect x="135" y="35" width="85" height="120" rx="4" fill="#1e293b" stroke="#475569" stroke-width="2"/>
  <!-- Striped Awning -->
  <path d="M130 35 L225 35 L220 55 L125 55 Z" fill="#f43f5e"/>
  <line x1="145" y1="35" x2="140" y2="55" stroke="#fecdd3" stroke-width="6"/>
  <line x1="170" y1="35" x2="165" y2="55" stroke="#fecdd3" stroke-width="6"/>
  <line x1="195" y1="35" x2="190" y2="55" stroke="#fecdd3" stroke-width="6"/>
  <!-- Warm Display Window -->
  <rect x="145" y="70" width="40" height="50" rx="3" fill="#fef08a" opacity="0.85"/>
  <circle cx="165" cy="95" r="10" fill="#ea580c"/>
  <!-- Ground / Sidewalk -->
  <rect x="0" y="175" width="240" height="65" fill="#334155"/>
  <line x1="0" y1="175" x2="240" y2="175" stroke="#64748b" stroke-width="2"/>
  <!-- Mother (Left) and Child (Right) Holding Hands (和 = with / together) -->
  <g id="mother" transform="translate(35, 75)">
    <!-- Mother Head -->
    <circle cx="20" cy="18" r="15" fill="#fcd34d"/>
    <!-- Elegant hair bun -->
    <circle cx="8" cy="14" r="8" fill="#1e293b"/>
    <path d="M8 18 C8 6 32 6 33 18 Z" fill="#1e293b"/>
    <!-- Smiling profile -->
    <circle cx="24" cy="19" r="2" fill="#0f172a"/>
    <path d="M22 24 Q26 28 30 24" stroke="#0f172a" stroke-width="1.5" fill="none"/>
    <!-- Dress -->
    <path d="M10 38 L30 38 L38 100 L2 100 Z" fill="#0284c7"/>
    <!-- Arm reaching down holding child's hand -->
    <path d="M26 45 Q42 62 48 72" stroke="#fcd34d" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g id="child" transform="translate(85, 105)">
    <!-- Child Head -->
    <circle cx="15" cy="14" r="12" fill="#fcd34d"/>
    <path d="M5 14 C5 4 25 4 25 14 Z" fill="#334155"/>
    <circle cx="18" cy="14" r="1.5" fill="#0f172a"/>
    <!-- Cute child outfit -->
    <rect x="5" y="28" width="20" height="42" rx="3" fill="#f59e0b"/>
    <!-- Arm raised holding mother's hand -->
    <path d="M6 35 Q-2 42 -2 42" stroke="#fcd34d" stroke-width="4.5" stroke-linecap="round"/>
  </g>
  <!-- Joined Hands Clasp Highlight -->
  <circle cx="83" cy="147" r="5" fill="#fcd34d"/>
  <circle cx="83" cy="147" r="8" fill="#fbbf24" opacity="0.3"/>
</svg>""",

    # 6. 病: 医生诊断了他的病 (Doctor examining patient in clinic with stethoscope)
    "病": """<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="24" fill="url(#bgGrad)"/>
  <!-- Clinic Room Wall with Cross Emblem -->
  <circle cx="120" cy="45" r="18" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <rect x="116" y="34" width="8" height="22" rx="2" fill="#ef4444"/>
  <rect x="109" y="41" width="22" height="8" rx="2" fill="#ef4444"/>
  <!-- Clinic Floor -->
  <rect x="0" y="180" width="240" height="60" fill="#334155"/>
  <!-- Examination Desk -->
  <rect x="75" y="130" width="90" height="50" fill="#475569" rx="3"/>
  <line x1="75" y1="130" x2="165" y2="130" stroke="#64748b" stroke-width="2"/>
  <!-- Doctor (Left - white coat with stethoscope) -->
  <g transform="translate(30, 75)">
    <!-- Head -->
    <circle cx="20" cy="18" r="15" fill="#fcd34d"/>
    <path d="M8 18 C8 6 32 6 33 18 Z" fill="#334155"/>
    <circle cx="25" cy="18" r="2" fill="#0f172a"/>
    <!-- White Medical Coat -->
    <path d="M8 38 L32 38 L38 95 L2 95 Z" fill="#f8fafc"/>
    <!-- Stethoscope around neck -->
    <path d="M12 38 Q20 58 28 38" stroke="#0284c7" stroke-width="3" fill="none"/>
    <circle cx="20" cy="58" r="4" fill="#0284c7"/>
    <!-- Arm with medical clipboard -->
    <rect x="28" y="55" width="18" height="25" rx="2" fill="#d97706"/>
    <rect x="31" y="58" width="12" height="19" fill="#f8fafc"/>
  </g>
  <!-- Patient (Right - listening attentively to diagnosis) -->
  <g transform="translate(165, 85)">
    <!-- Head -->
    <circle cx="18" cy="16" r="14" fill="#fcd34d"/>
    <path d="M6 16 C6 4 28 4 30 16 Z" fill="#475569"/>
    <circle cx="12" cy="16" r="2" fill="#0f172a"/>
    <!-- Casual Shirt -->
    <path d="M6 35 L30 35 L36 85 L0 85 Z" fill="#059669"/>
  </g>
  <!-- Medicine bottle on desk -->
  <rect x="110" y="112" width="14" height="20" rx="2" fill="#f59e0b"/>
  <rect x="112" y="108" width="10" height="4" fill="#e2e8f0"/>
  <rect x="130" y="118" width="12" height="14" rx="2" fill="#38bdf8"/>
</svg>""",

    # 7. 公司: 她在一家公司工作。(Modern corporate office interior with skyline)
    "公司": """<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="glassSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="24" fill="url(#bgGrad)"/>
  <!-- Floor-to-ceiling Glass Windows with City Skyline -->
  <rect x="20" y="20" width="200" height="110" rx="6" fill="url(#glassSky)"/>
  <!-- City Skyscraper Silhouettes -->
  <rect x="35" y="55" width="22" height="75" fill="#0f172a" opacity="0.6"/>
  <rect x="62" y="40" width="26" height="90" fill="#0f172a" opacity="0.7"/>
  <polygon points="75,25 65,40 85,40" fill="#0f172a" opacity="0.7"/>
  <rect x="94" y="65" width="20" height="65" fill="#0f172a" opacity="0.5"/>
  <rect x="120" y="48" width="28" height="82" fill="#0f172a" opacity="0.7"/>
  <rect x="154" y="60" width="24" height="70" fill="#0f172a" opacity="0.6"/>
  <rect x="184" y="70" width="22" height="60" fill="#0f172a" opacity="0.5"/>
  <!-- Window mullions -->
  <line x1="88" y1="20" x2="88" y2="130" stroke="#475569" stroke-width="2"/>
  <line x1="152" y1="20" x2="152" y2="130" stroke="#475569" stroke-width="2"/>
  <!-- Modern Office Carpet Floor -->
  <rect x="0" y="165" width="240" height="75" fill="#1e293b"/>
  <!-- Ergonomic Workstation Desk -->
  <path d="M20 150 L220 150 L230 185 L10 185 Z" fill="#475569"/>
  <!-- Dual Professional Monitors -->
  <rect x="60" y="98" width="55" height="42" rx="3" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
  <rect x="64" y="102" width="47" height="34" fill="#38bdf8" opacity="0.85"/>
  <rect x="120" y="98" width="55" height="42" rx="3" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
  <rect x="124" y="102" width="47" height="34" fill="#10b981" opacity="0.85"/>
  <!-- Monitor stands -->
  <rect x="84" y="140" width="7" height="12" fill="#64748b"/>
  <rect x="144" y="140" width="7" height="12" fill="#64748b"/>
  <!-- Office Chair Silhouette -->
  <ellipse cx="117" cy="175" rx="22" ry="7" fill="#334155"/>
  <!-- Office Indoor Potted Plant -->
  <polygon points="195,148 215,148 210,175 200,175" fill="#ea580c"/>
  <circle cx="205" cy="138" r="12" fill="#10b981"/>
  <circle cx="200" cy="130" r="9" fill="#059669"/>
  <circle cx="212" cy="132" r="8" fill="#047857"/>
</svg>""",

    # 8. 火车: 我们乘坐火车去北京 (Sleek high speed bullet train CRH gliding through landscape)
    "火车": """<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="trainBody" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="70%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="24" fill="url(#bgGrad)"/>
  <!-- Distant mountain ridges -->
  <path d="M0 110 Q50 85 100 105 Q160 80 240 100 L240 150 L0 150 Z" fill="#1e293b" opacity="0.6"/>
  <path d="M0 125 Q70 110 140 120 Q190 108 240 125 L240 160 L0 160 Z" fill="#334155" opacity="0.7"/>
  <!-- Railway Embankment & Tracks -->
  <rect x="0" y="170" width="240" height="70" fill="#1e293b"/>
  <!-- Steel Rails -->
  <line x1="0" y1="188" x2="240" y2="188" stroke="#94a3b8" stroke-width="4"/>
  <line x1="0" y1="195" x2="240" y2="195" stroke="#64748b" stroke-width="3"/>
  <!-- Railway Sleepers -->
  <line x1="15" y1="185" x2="15" y2="200" stroke="#475569" stroke-width="3"/>
  <line x1="45" y1="185" x2="45" y2="200" stroke="#475569" stroke-width="3"/>
  <line x1="75" y1="185" x2="75" y2="200" stroke="#475569" stroke-width="3"/>
  <line x1="105" y1="185" x2="105" y2="200" stroke="#475569" stroke-width="3"/>
  <line x1="135" y1="185" x2="135" y2="200" stroke="#475569" stroke-width="3"/>
  <line x1="165" y1="185" x2="165" y2="200" stroke="#475569" stroke-width="3"/>
  <line x1="195" y1="185" x2="195" y2="200" stroke="#475569" stroke-width="3"/>
  <line x1="225" y1="185" x2="225" y2="200" stroke="#475569" stroke-width="3"/>
  <!-- Sleek Aerodynamic Bullet Train (CRH) -->
  <path d="M-20 140 L160 140 Q215 142 225 160 Q228 178 180 178 L-20 178 Z" fill="url(#trainBody)"/>
  <!-- Blue Speed Ribbon on Train -->
  <path d="M-20 156 L180 156 Q205 158 212 165 L-20 165 Z" fill="#0284c7"/>
  <path d="M-20 158 L180 158 Q202 160 210 165 L-20 165 Z" fill="#38bdf8"/>
  <!-- Streamlined Cockpit Windshield -->
  <path d="M165 144 Q198 147 205 155 L168 155 Z" fill="#0f172a"/>
  <!-- Passenger Tinted Windows -->
  <rect x="0" y="146" width="22" height="10" rx="2" fill="#0f172a"/>
  <rect x="28" y="146" width="22" height="10" rx="2" fill="#0f172a"/>
  <rect x="56" y="146" width="22" height="10" rx="2" fill="#0f172a"/>
  <rect x="84" y="146" width="22" height="10" rx="2" fill="#0f172a"/>
  <rect x="112" y="146" width="22" height="10" rx="2" fill="#0f172a"/>
  <rect x="140" y="146" width="16" height="10" rx="2" fill="#0f172a"/>
  <!-- Overhead Electric Pantograph -->
  <path d="M60 140 L70 120 L85 120" stroke="#f43f5e" stroke-width="2.5" fill="none"/>
  <line x1="65" y1="120" x2="90" y2="120" stroke="#f43f5e" stroke-width="3"/>
</svg>""",

    # 9. 鸡蛋: 我每天吃一个鸡蛋。(Breakfast table with boiled egg in egg cup, toast & milk)
    "鸡蛋": """<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="24" fill="url(#bgGrad)"/>
  <!-- Breakfast Dining Table -->
  <rect x="0" y="165" width="240" height="75" fill="#334155"/>
  <line x1="0" y1="165" x2="240" y2="165" stroke="#475569" stroke-width="3"/>
  <!-- Table Mat / Runner -->
  <ellipse cx="120" cy="180" rx="95" ry="32" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
  <!-- Fresh Milk Glass (Left) -->
  <rect x="35" y="125" width="28" height="42" rx="3" fill="#ffffff" opacity="0.9"/>
  <ellipse cx="49" cy="125" rx="14" ry="4" fill="#f8fafc"/>
  <rect x="40" y="110" width="4" height="45" rx="2" fill="#f43f5e" transform="rotate(-12 40 110)"/>
  <!-- Central Ceramic Egg Cup with Boiled Egg -->
  <g transform="translate(120, 160)">
    <!-- Egg cup base & stem -->
    <ellipse cx="0" cy="12" rx="22" ry="6" fill="#0284c7"/>
    <path d="M-8 12 L-6 0 L6 0 L8 12 Z" fill="#0284c7"/>
    <!-- Egg cup bowl -->
    <path d="M-20 -15 C-20 4 20 4 20 -15 Z" fill="#0284c7"/>
    <!-- The Boiled Egg (with top sliced open revealing golden yolk) -->
    <!-- White outer shell -->
    <path d="M-18 -15 C-18 -50 18 -50 18 -15 Z" fill="#f8fafc"/>
    <!-- Soft boiled golden egg yolk inside -->
    <ellipse cx="0" cy="-26" rx="11" ry="9" fill="#f59e0b"/>
    <ellipse cx="-2" cy="-28" rx="8" ry="6" fill="#fbbf24"/>
    <circle cx="2" cy="-30" r="2" fill="#ffffff" opacity="0.8"/>
    <!-- Egg spoon beside cup -->
    <path d="M26 10 Q32 -5 36 -25" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" fill="none"/>
    <ellipse cx="37" cy="-27" rx="5" ry="3" fill="#cbd5e1"/>
  </g>
  <!-- Toasted Bread Slices in Basket (Right) -->
  <g transform="translate(185, 140)">
    <rect x="-16" y="5" width="30" height="26" rx="4" fill="#b45309" transform="rotate(-8)"/>
    <rect x="-13" y="7" width="24" height="22" rx="3" fill="#f59e0b" transform="rotate(-8)"/>
    <rect x="-8" y="2" width="30" height="26" rx="4" fill="#b45309" transform="rotate(8)"/>
    <rect x="-5" y="4" width="24" height="22" rx="3" fill="#fbbf24" transform="rotate(8)"/>
  </g>
</svg>""",

    # 10. 好玩儿: 这个游乐园真好玩儿。(Amusement park at dusk with glowing Ferris wheel and balloons)
    "好玩儿": """<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="240" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="24" fill="url(#bgGrad)"/>
  <!-- Carnival Pennant Bunting (String Flags across top) -->
  <path d="M10 25 Q120 45 230 25" stroke="#94a3b8" stroke-width="1.5" fill="none"/>
  <polygon points="30,28 42,29 36,46" fill="#ef4444"/>
  <polygon points="55,31 67,32 61,49" fill="#f59e0b"/>
  <polygon points="80,34 92,35 86,52" fill="#10b981"/>
  <polygon points="105,35 117,35 111,53" fill="#38bdf8"/>
  <polygon points="130,35 142,34 136,52" fill="#8b5cf6"/>
  <polygon points="155,33 167,31 161,49" fill="#ec4899"/>
  <polygon points="180,30 192,28 186,46" fill="#fbbf24"/>
  <!-- Park Ground -->
  <rect x="0" y="185" width="240" height="55" fill="#334155"/>
  <!-- Grand Glowing Ferris Wheel -->
  <g transform="translate(100, 115)">
    <!-- Main wheel supports A-frame -->
    <line x1="-35" y1="70" x2="0" y2="0" stroke="#64748b" stroke-width="4"/>
    <line x1="35" y1="70" x2="0" y2="0" stroke="#64748b" stroke-width="4"/>
    <line x1="-20" y1="40" x2="20" y2="40" stroke="#64748b" stroke-width="2.5"/>
    <!-- Outer and inner wheel rings -->
    <circle cx="0" cy="0" r="62" stroke="#38bdf8" stroke-width="3" fill="none" opacity="0.8"/>
    <circle cx="0" cy="0" r="45" stroke="#f59e0b" stroke-width="2" fill="none" opacity="0.6"/>
    <!-- Wheel spokes -->
    <line x1="0" y1="-62" x2="0" y2="62" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="-62" y1="0" x2="62" y2="0" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="-44" y1="-44" x2="44" y2="44" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="44" y1="-44" x2="-44" y2="44" stroke="#94a3b8" stroke-width="1.5"/>
    <!-- Center hub -->
    <circle cx="0" cy="0" r="7" fill="#f43f5e"/>
    <!-- 8 Colorful Passenger Gondolas / Pods -->
    <circle cx="0" cy="-62" r="7" fill="#ef4444"/>
    <circle cx="44" cy="-44" r="7" fill="#f59e0b"/>
    <circle cx="62" cy="0" r="7" fill="#10b981"/>
    <circle cx="44" cy="44" r="7" fill="#06b6d4"/>
    <circle cx="0" cy="62" r="7" fill="#3b82f6"/>
    <circle cx="-44" cy="44" r="7" fill="#8b5cf6"/>
    <circle cx="-62" cy="0" r="7" fill="#ec4899"/>
    <circle cx="-44" cy="-44" r="7" fill="#eab308"/>
  </g>
  <!-- Cluster of Floating Festive Balloons (Right) -->
  <g transform="translate(195, 140)">
    <line x1="0" y1="45" x2="-10" y2="0" stroke="#94a3b8" stroke-width="1"/>
    <line x1="0" y1="45" x2="2" y2="-12" stroke="#94a3b8" stroke-width="1"/>
    <line x1="0" y1="45" x2="14" y2="2" stroke="#94a3b8" stroke-width="1"/>
    <ellipse cx="-10" cy="-2" rx="9" ry="12" fill="#ef4444"/>
    <ellipse cx="2" cy="-14" rx="9" ry="12" fill="#38bdf8"/>
    <ellipse cx="14" cy="0" rx="9" ry="12" fill="#facc15"/>
  </g>
</svg>"""
}

def apply_scene_replacements():
    with open(ILLUST_PACK_FILE, "r", encoding="utf-8") as f:
        pack = json.load(f)

    updated = 0
    for hanzi, svg_code in SCENE_REPLACEMENTS.items():
        pack[hanzi] = svg_code
        file_path = SVG_DIR / f"{hanzi}.svg"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(svg_code)
        updated += 1
        print(f"[✓] Updated {hanzi}.svg with context-rich scene.")

    with open(ILLUST_PACK_FILE, "w", encoding="utf-8") as f:
        json.dump(pack, f, ensure_ascii=False, indent=2)

    print(f"\n[✓] Successfully updated {updated} SVGs in database and images folder.")

if __name__ == "__main__":
    apply_scene_replacements()
