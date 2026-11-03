#!/usr/bin/env python3
"""
tools/generate_all_hsk1_anatomy.py
Generates high-precision, dark-mode Visual Hanzi Anatomy & Iconic Mnemonic SVGs
for all 150 words in HSK 1.
Conforms strictly to hanzi_anatomy_design_guideline.md.
Zero text dependencies, pure vector paths, scalable 100x100 viewBox.
"""

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
HSK1_VOCAB_PATH = REPO_ROOT / "database" / "vocabs" / "hsk1_vocabularies.json"
HSK1_JSON_PATH = REPO_ROOT / "database" / "illustrations" / "hsk1.json"
HSK2_DIR = REPO_ROOT / "images" / "HSK_2.0" / "level1"
HSK3_DIR = REPO_ROOT / "images" / "HSK_3.0" / "level1"

BG = '<rect width="100" height="100" rx="16" fill="#131b2e" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>'

def wrap(body):
    return f'<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">\n  {BG}\n{body}\n</svg>'

# Comprehensive dictionary of pure vector SVGs for all 150 HSK 1 words
SVGS = {
    # 1. 爱 (yêu, thích): Móng vuốt/tay 爫 + Mái nhà 冖 + Tình bạn 友
    "爱": """  <path d="M50 78 C30 64 20 50 20 38 A14 14 0 0 1 50 30 A14 14 0 0 1 80 38 C80 50 70 64 50 78 Z" fill="#f43f5e" opacity="0.12"/>
  <path d="M46 16 Q36 24 30 26" stroke="#f43f5e" stroke-width="3.8" stroke-linecap="round"/>
  <circle cx="48" cy="22" r="2.5" fill="#f43f5e"/>
  <circle cx="62" cy="20" r="2.5" fill="#f43f5e"/>
  <path d="M24 32 V36 M24 32 H76 V36" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <line x1="28" y1="46" x2="72" y2="46" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <path d="M46 36 Q38 60 22 74" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <path d="M36 54 Q56 62 76 78" stroke="#fb923c" stroke-width="4.2" stroke-linecap="round"/>""",

    # 2. 八 (tám): Hai nét mở rộng sang hai bên
    "八": """  <path d="M42 30 Q34 52 20 74" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
  <path d="M58 24 Q68 50 82 74" stroke="#fb923c" stroke-width="5" stroke-linecap="round"/>""",

    # 3. 爸爸 (ba, bố): Phụ 父 (tay cầm gậy lao động)
    "爸爸": """  <path d="M36 24 Q44 34 48 42" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <path d="M64 24 Q56 34 52 42" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <path d="M24 44 Q50 48 76 44" stroke="#fb923c" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M32 44 Q42 62 26 78" stroke="#fb923c" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M68 44 Q58 62 74 78" stroke="#fb923c" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M40 76 Q50 70 60 76" stroke="#34d399" stroke-width="3.5" stroke-linecap="round"/>""",

    # 4. 杯子 (cái cốc): Chiếc cốc có quai và hơi ấm bốc lên
    "杯子": """  <rect x="26" y="34" width="36" height="42" rx="6" stroke="#38bdf8" stroke-width="4" fill="none"/>
  <path d="M62 42 H72 C76 42 78 44 78 48 V58 C78 62 76 64 72 64 H62" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="M36 26 Q34 20 38 16" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M46 28 Q44 20 48 14" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round"/>""",

    # 5. 北京 (Bắc Kinh): Mái cổng thành cung điện hoàng gia cổ kính
    "北京": """  <path d="M18 36 Q50 30 82 36" stroke="#fbbf24" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M26 36 L34 22 H66 L74 36" stroke="#fbbf24" stroke-width="3.8" stroke-linejoin="round" fill="none"/>
  <rect x="28" y="44" width="44" height="38" rx="2" stroke="#f43f5e" stroke-width="4" fill="none"/>
  <path d="M42 82 V60 Q50 56 58 60 V82" stroke="#38bdf8" stroke-width="3.5" fill="none"/>""",

    # 6. 本 (cuốn, gốc): Cây 木 + Nét gạch ở gốc 一
    "本": """  <line x1="20" y1="38" x2="80" y2="38" stroke="#34d399" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="50" y1="16" x2="50" y2="80" stroke="#34d399" stroke-width="4.8" stroke-linecap="round"/>
  <path d="M50 38 Q32 60 20 74" stroke="#34d399" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M50 38 Q68 60 80 74" stroke="#34d399" stroke-width="4.2" stroke-linecap="round"/>
  <line x1="34" y1="68" x2="66" y2="68" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>""",

    # 7. 不客气 (không có gì): Bàn tay mở đón chào lịch thiệp
    "不客气": """  <circle cx="50" cy="50" r="32" fill="#38bdf8" opacity="0.1"/>
  <path d="M24 58 Q36 46 50 46 Q64 46 76 58" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <path d="M34 48 L50 32 L66 48" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="50" cy="24" r="6" fill="#34d399"/>""",

    # 8. 不 (không): Mầm cây chưa kịp vươn lên mặt đất
    "不": """  <line x1="18" y1="26" x2="82" y2="26" stroke="#38bdf8" stroke-width="4.8" stroke-linecap="round"/>
  <path d="M50 26 Q46 54 24 76" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="50" y1="26" x2="50" y2="82" stroke="#38bdf8" stroke-width="4.8" stroke-linecap="round"/>
  <path d="M50 46 Q64 58 76 68" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>""",

    # 9. 菜 (rau, món ăn): Thảo 艹 + Bàn tay hái rau 采
    "菜": """  <line x1="18" y1="24" x2="82" y2="24" stroke="#34d399" stroke-width="4" stroke-linecap="round"/>
  <line x1="34" y1="16" x2="34" y2="28" stroke="#34d399" stroke-width="4" stroke-linecap="round"/>
  <line x1="66" y1="16" x2="66" y2="28" stroke="#34d399" stroke-width="4" stroke-linecap="round"/>
  <path d="M28 50 Q50 42 72 50 Q76 76 50 78 Q24 76 28 50 Z" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <path d="M42 46 Q50 34 58 46" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>""",

    # 10. 茶 (trà): Búp non 艹 + Mái nhà/người 人 + Cây gỗ 木
    "茶": """  <line x1="20" y1="24" x2="80" y2="24" stroke="#34d399" stroke-width="4" stroke-linecap="round"/>
  <line x1="36" y1="16" x2="36" y2="28" stroke="#34d399" stroke-width="4" stroke-linecap="round"/>
  <line x1="64" y1="16" x2="64" y2="28" stroke="#34d399" stroke-width="4" stroke-linecap="round"/>
  <path d="M50 28 Q40 44 24 50" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <path d="M48 34 Q60 44 76 50" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <line x1="50" y1="46" x2="50" y2="82" stroke="#fb923c" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M50 56 Q36 68 26 78" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <path d="M50 56 Q64 68 74 78" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>""",

    # 11. 吃 (ăn): Miệng 口 + Khất 乞 (nuốt vào)
    "吃": """  <rect x="16" y="32" width="22" height="26" rx="2" stroke="#38bdf8" stroke-width="4" fill="none"/>
  <path d="M50 26 Q46 36 42 42" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <line x1="44" y1="36" x2="80" y2="36" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <line x1="44" y1="50" x2="78" y2="50" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M54 50 V66 Q54 78 72 78 Q82 78 84 70" stroke="#fb923c" stroke-width="4" stroke-linecap="round" fill="none"/>""",

    # 12. 出租车 (taxi): Xe ô tô với biển báo TAXI trên nóc
    "出租车": """  <rect x="42" y="22" width="16" height="8" rx="2" fill="#fbbf24"/>
  <path d="M22 52 L32 34 H68 L78 52 Z" stroke="#38bdf8" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
  <rect x="16" y="52" width="68" height="22" rx="4" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <circle cx="30" cy="74" r="7" stroke="#fb923c" stroke-width="3.5" fill="#131b2e"/>
  <circle cx="70" cy="74" r="7" stroke="#fb923c" stroke-width="3.5" fill="#131b2e"/>""",

    # 13. 打电话 (gọi điện thoại): Ống nghe điện thoại phát sóng âm
    "打电话": """  <path d="M28 32 C28 26 34 22 40 24 L48 30 C52 34 50 38 46 40 C44 42 42 46 46 54 C50 62 54 64 56 62 C58 58 62 56 66 60 L72 68 C74 74 70 80 64 80 C44 80 28 52 28 32 Z" stroke="#38bdf8" stroke-width="3.8" stroke-linejoin="round" fill="none"/>
  <path d="M64 26 A20 20 0 0 1 78 40" stroke="#fb923c" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M72 18 A32 32 0 0 1 88 34" stroke="#fb923c" stroke-width="3" stroke-linecap="round" fill="none"/>""",

    # 14. 大 (to, lớn): Dáng người dang rộng 2 tay và 2 chân
    "大": """  <circle cx="50" cy="50" r="34" fill="#38bdf8" opacity="0.12"/>
  <line x1="18" y1="42" x2="82" y2="42" stroke="#fb923c" stroke-width="4.8" stroke-linecap="round"/>
  <path d="M50 20 Q50 48 24 82" stroke="#38bdf8" stroke-width="4.8" stroke-linecap="round"/>
  <path d="M46 44 Q60 62 78 82" stroke="#38bdf8" stroke-width="4.8" stroke-linecap="round"/>""",

    # 15. 的 (của, đích): Tâm bia bắn trúng đích
    "的": """  <circle cx="50" cy="50" r="28" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <circle cx="50" cy="50" r="16" stroke="#fb923c" stroke-width="3" fill="none"/>
  <circle cx="50" cy="50" r="5" fill="#f43f5e"/>
  <line x1="20" y1="50" x2="80" y2="50" stroke="#38bdf8" stroke-width="2" stroke-dasharray="2 4"/>""",

    # 16. 点 (giờ, giọt, chấm): Mặt đồng hồ tròn và các chấm thời gian
    "点": """  <circle cx="50" cy="42" r="24" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <line x1="50" y1="42" x2="50" y2="28" stroke="#fb923c" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="50" y1="42" x2="62" y2="42" stroke="#fb923c" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="50" cy="42" r="3" fill="#fb923c"/>
  <circle cx="28" cy="78" r="3" fill="#34d399"/>
  <circle cx="42" cy="80" r="3" fill="#34d399"/>
  <circle cx="58" cy="80" r="3" fill="#34d399"/>
  <circle cx="72" cy="78" r="3" fill="#34d399"/>""",

    # 17. 电脑 (máy tính): Màn hình máy tính phát sáng và bàn phím
    "电脑": """  <rect x="20" y="20" width="60" height="42" rx="4" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <path d="M34 36 L44 44 L34 52" stroke="#fb923c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="48" y1="52" x2="62" y2="52" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>
  <path d="M42 62 L38 74 H62 L58 62" stroke="#38bdf8" stroke-width="3" stroke-linejoin="round" fill="none"/>
  <line x1="30" y1="74" x2="70" y2="74" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>""",

    # 18. 电视 (tivi): Tivi cổ điển có 2 râu ăng-ten
    "电视": """  <line x1="36" y1="16" x2="48" y2="28" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>
  <line x1="64" y1="16" x2="52" y2="28" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>
  <rect x="18" y="28" width="64" height="46" rx="6" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <rect x="24" y="34" width="42" height="34" rx="3" stroke="#38bdf8" stroke-width="2.5" fill="none"/>
  <circle cx="73" cy="42" r="3" fill="#34d399"/>
  <circle cx="73" cy="54" r="3" fill="#fb923c"/>
  <line x1="30" y1="74" x2="24" y2="84" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
  <line x1="70" y1="74" x2="76" y2="84" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>""",

    # 19. 电影 (phim điện ảnh): Cuộn phim nhựa chiếu bóng
    "电影": """  <rect x="22" y="24" width="56" height="52" rx="6" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <line x1="22" y1="36" x2="78" y2="36" stroke="#38bdf8" stroke-width="2"/>
  <line x1="22" y1="64" x2="78" y2="64" stroke="#38bdf8" stroke-width="2"/>
  <rect x="26" y="27" width="6" height="6" rx="1" fill="#fb923c"/>
  <rect x="40" y="27" width="6" height="6" rx="1" fill="#fb923c"/>
  <rect x="54" y="27" width="6" height="6" rx="1" fill="#fb923c"/>
  <rect x="68" y="27" width="6" height="6" rx="1" fill="#fb923c"/>
  <polygon points="44,42 60,50 44,58" fill="#34d399"/>""",

    # 20. 东西 (đồ vật): Hộp quà kiện hàng gói gọn
    "东西": """  <rect x="24" y="32" width="52" height="48" rx="4" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <line x1="24" y1="56" x2="76" y2="56" stroke="#fb923c" stroke-width="3"/>
  <line x1="50" y1="32" x2="50" y2="80" stroke="#fb923c" stroke-width="3"/>
  <path d="M50 32 C42 22 36 26 44 32 C38 20 50 18 50 32 Z" fill="#f43f5e"/>
  <path d="M50 32 C58 22 64 26 56 32 C62 20 50 18 50 32 Z" fill="#f43f5e"/>""",

    # 21. 都 (đều, tất cả): Vòng tròn hội tụ bao hàm toàn thể
    "都": """  <circle cx="50" cy="50" r="32" stroke="#38bdf8" stroke-width="3.5" stroke-dasharray="4 4" fill="none"/>
  <circle cx="36" cy="46" r="6" fill="#fb923c"/>
  <circle cx="64" cy="46" r="6" fill="#34d399"/>
  <circle cx="50" cy="62" r="6" fill="#f43f5e"/>
  <circle cx="50" cy="34" r="5" fill="#a78bfa"/>""",

    # 22. 读 (đọc sách): Trang sách mở và đôi mắt chăm chú
    "读": """  <path d="M20 32 Q50 38 50 74 Q24 70 20 32 Z" stroke="#38bdf8" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
  <path d="M80 32 Q50 38 50 74 Q76 70 80 32 Z" stroke="#38bdf8" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
  <line x1="28" y1="44" x2="44" y2="46" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="28" y1="54" x2="44" y2="56" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="56" y1="46" x2="72" y2="44" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="56" y1="56" x2="72" y2="54" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>""",

    # 23. 对不起 (xin lỗi): Cử chỉ cúi đầu đặt tay lên ngực chân thành
    "对不起": """  <circle cx="50" cy="26" r="10" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <path d="M30 76 Q34 46 50 46 Q66 46 70 76" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="M50 54 C46 50 40 54 44 60 L50 66 L56 60 C60 54 54 50 50 54 Z" fill="#f43f5e"/>""",

    # 24. 多 (nhiều): Hai vầng trăng Tịch 夕 xếp chồng lên nhau
    "多": """  <path d="M46 16 Q36 28 32 38" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <path d="M36 24 H62 Q66 24 62 34 Q50 46 34 50" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" fill="none"/>
  <circle cx="48" cy="36" r="2.5" fill="#fb923c"/>
  <path d="M52 46 Q42 58 38 68" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <path d="M42 54 H68 Q72 54 68 64 Q56 76 40 80" stroke="#fb923c" stroke-width="4" stroke-linecap="round" fill="none"/>
  <circle cx="54" cy="66" r="2.5" fill="#38bdf8"/>""",

    # 25. 多少 (bao nhiêu): Cán cân so sánh nhiều và ít
    "多少": """  <line x1="50" y1="20" x2="50" y2="76" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="22" y1="36" x2="78" y2="36" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M22 36 L16 54 H36 Z" stroke="#fb923c" stroke-width="2.8" stroke-linejoin="round" fill="none"/>
  <path d="M78 36 L72 48 H90 Z" stroke="#34d399" stroke-width="2.8" stroke-linejoin="round" fill="none"/>
  <circle cx="26" cy="50" r="2" fill="#fb923c"/>
  <circle cx="81" cy="44" r="2" fill="#34d399"/>
  <line x1="36" y1="76" x2="64" y2="76" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>""",

    # 26. 儿子 (con trai): Cậu bé đội mũ tinh nghịch
    "儿子": """  <circle cx="50" cy="34" r="14" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <path d="M36 28 Q50 20 64 28" stroke="#fb923c" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M34 68 Q34 52 50 52 Q66 52 66 68" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round" fill="none"/>
  <line x1="42" y1="68" x2="42" y2="82" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="58" y1="68" x2="58" y2="82" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>""",

    # 27. 二 (hai): Hai que tính song song
    "二": """  <circle cx="50" cy="50" r="30" fill="#38bdf8" opacity="0.08"/>
  <line x1="30" y1="36" x2="70" y2="36" stroke="#38bdf8" stroke-width="4.8" stroke-linecap="round"/>
  <line x1="18" y1="64" x2="82" y2="64" stroke="#fb923c" stroke-width="5.2" stroke-linecap="round"/>""",

    # 28. 饭店 (nhà hàng): Nắp đậy món ăn sang trọng trên đĩa
    "饭店": """  <line x1="16" y1="68" x2="84" y2="68" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <path d="M24 64 C24 38 40 32 50 32 C60 32 76 38 76 64 Z" stroke="#fb923c" stroke-width="3.8" stroke-linejoin="round" fill="none"/>
  <circle cx="50" cy="28" r="4" fill="#fb923c"/>
  <line x1="28" y1="74" x2="72" y2="74" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>""",

    # 29. 飞机 (máy bay): Máy bay vươn cánh bay lên bầu trời
    "飞机": """  <path d="M50 18 L56 38 L84 52 V58 L56 52 V72 L66 78 V82 L50 78 L34 82 V78 L44 72 V52 L16 58 V52 L44 38 Z" stroke="#38bdf8" stroke-width="3" stroke-linejoin="round" fill="none"/>
  <circle cx="50" cy="24" r="2.5" fill="#fb923c"/>""",

    # 30. 分钟 (phút): Đồng hồ bấm giờ chính xác từng phút
    "分钟": """  <circle cx="50" cy="54" r="28" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <line x1="50" y1="26" x2="50" y2="20" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <line x1="50" y1="54" x2="50" y2="36" stroke="#fb923c" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="50" y1="54" x2="64" y2="44" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>
  <circle cx="50" cy="54" r="3.5" fill="#fb923c"/>""",

    # 31. 高兴 (vui mừng): Khuôn mặt cười rạng rỡ hạnh phúc
    "高兴": """  <circle cx="50" cy="50" r="32" stroke="#38bdf8" stroke-width="4" fill="none"/>
  <circle cx="38" cy="42" r="3.5" fill="#fb923c"/>
  <circle cx="62" cy="42" r="3.5" fill="#fb923c"/>
  <path d="M34 54 Q50 72 66 54" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" fill="none"/>
  <path d="M26 44 Q30 40 34 44" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M66 44 Q70 40 74 44" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round"/>""",

    # 32. 个 (cái, chiếc): Dấu gạch đếm đơn vị
    "个": """  <path d="M50 22 Q40 40 24 54" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M48 30 Q60 42 76 54" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="50" y1="36" x2="50" y2="82" stroke="#34d399" stroke-width="4.8" stroke-linecap="round"/>""",

    # 33. 工作 (công việc): Chiếc cặp tài liệu công sở
    "工作": """  <rect x="22" y="34" width="56" height="42" rx="4" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <path d="M38 34 V26 C38 22 42 20 46 20 H54 C58 20 62 22 62 26 V34" stroke="#fb923c" stroke-width="3.5" fill="none"/>
  <line x1="22" y1="52" x2="78" y2="52" stroke="#38bdf8" stroke-width="2.5"/>
  <rect x="46" y="48" width="8" height="8" rx="2" fill="#34d399"/>""",

    # 34. 狗 (chó): Chú cún tai cụp dễ thương
    "狗": """  <circle cx="50" cy="46" r="20" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <path d="M32 34 Q22 44 26 56" stroke="#fb923c" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M68 34 Q78 44 74 56" stroke="#fb923c" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="42" cy="44" r="2.5" fill="#38bdf8"/>
  <circle cx="58" cy="44" r="2.5" fill="#38bdf8"/>
  <polygon points="50,52 46,48 54,48" fill="#f43f5e"/>
  <path d="M46 56 Q50 60 54 56" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>""",

    # 35. 汉语 (tiếng Trung): Sách Hán ngữ mở ra
    "汉语": """  <rect x="24" y="22" width="52" height="60" rx="4" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <line x1="34" y1="22" x2="34" y2="82" stroke="#fb923c" stroke-width="3"/>
  <line x1="44" y1="36" x2="66" y2="36" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>
  <line x1="44" y1="48" x2="66" y2="48" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>
  <line x1="44" y1="60" x2="58" y2="60" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>""",

    # 36. 好 (tốt): Nữ 女 (mẹ) + Tử 子 (con)
    "好": """  <path d="M34 22 L22 46 Q34 52 38 78" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M38 34 Q30 54 18 68" stroke="#f43f5e" stroke-width="4" stroke-linecap="round"/>
  <line x1="14" y1="46" x2="48" y2="44" stroke="#f43f5e" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M60 26 H76 L66 46 Q76 48 76 60 Q76 78 68 78 Q62 78 60 74" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" fill="none"/>
  <line x1="52" y1="46" x2="88" y2="46" stroke="#38bdf8" stroke-width="4.2" stroke-linecap="round"/>""",

    # 37. 号 (số, ngày): Biểu tượng thẻ số / hashtag
    "号": """  <rect x="24" y="24" width="32" height="26" rx="3" stroke="#38bdf8" stroke-width="4" fill="none"/>
  <path d="M40 50 V66 Q40 76 56 76 Q68 76 72 70" stroke="#fb923c" stroke-width="4.2" stroke-linecap="round" fill="none"/>
  <line x1="18" y1="52" x2="82" y2="52" stroke="#34d399" stroke-width="4" stroke-linecap="round"/>""",

    # 38. 喝 (uống): Ly nước với ống hút mát lạnh
    "喝": """  <rect x="14" y="34" width="20" height="24" rx="2" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <path d="M48 24 L56 78 H74 L82 24 Z" stroke="#34d399" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
  <line x1="68" y1="14" x2="58" y2="60" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>""",

    # 39. 和 (và, cùng): Bông lúa Hòa 禾 + Miệng 口
    "和": """  <line x1="16" y1="38" x2="52" y2="38" stroke="#34d399" stroke-width="3.8" stroke-linecap="round"/>
  <line x1="34" y1="20" x2="34" y2="78" stroke="#34d399" stroke-width="4" stroke-linecap="round"/>
  <path d="M34 38 Q22 56 14 68" stroke="#34d399" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M34 38 Q44 54 50 64" stroke="#34d399" stroke-width="3.8" stroke-linecap="round"/>
  <rect x="58" y="34" width="26" height="28" rx="2" stroke="#38bdf8" stroke-width="3.8" fill="none"/>""",

    # 40. 很 (rất): Mũi tên tăng tiến chỉ mức độ mạnh mẽ
    "很": """  <path d="M28 22 Q20 36 16 50" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M28 42 Q20 56 16 76" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round"/>
  <line x1="22" y1="46" x2="22" y2="80" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M50 76 L70 30 L84 44" stroke="#fb923c" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <polygon points="84,44 86,30 72,32" fill="#fb923c"/>""",

    # 41. 后面 (phía sau): Mũi tên uốn lượn vòng ra phía sau
    "后面": """  <circle cx="64" cy="50" r="16" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <path d="M20 50 Q20 32 38 32 H48" stroke="#fb923c" stroke-width="4" stroke-linecap="round" fill="none"/>
  <polygon points="46,26 56,32 46,38" fill="#fb923c"/>
  <circle cx="28" cy="50" r="4" fill="#94a3b8"/>""",

    # 42. 回 (về, quay lại): Hai hình vuông lồng nhau
    "回": """  <rect x="18" y="20" width="64" height="60" rx="6" stroke="#38bdf8" stroke-width="4.5" fill="none"/>
  <rect x="36" y="36" width="28" height="28" rx="3" stroke="#fb923c" stroke-width="4" fill="none"/>""",

    # 43. 会 (biết, hội tụ): Mái nhà Nhân hợp lại
    "会": """  <path d="M50 18 Q36 34 18 46" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M48 24 Q60 36 82 46" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="28" y1="52" x2="72" y2="52" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <path d="M34 64 H66 L44 80 H74" stroke="#fb923c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>""",

    # 44. 几 (mấy, vài): Vài ba dấu chấm hỏi
    "几": """  <path d="M30 24 V76" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M30 26 H62 Q70 26 70 36 V70 Q70 78 78 78" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round" fill="none"/>""",

    # 45. 家 (nhà): Mái nhà 宀 ấm cúng
    "家": """  <circle cx="50" cy="16" r="3" fill="#38bdf8"/>
  <path d="M20 26 V32 M20 26 H80 V32" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="30" y1="36" x2="70" y2="36" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M48 36 Q42 56 34 76" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <path d="M48 44 Q58 54 66 60" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M38 52 Q30 64 22 72" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M50 56 Q66 70 78 80" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>""",

    # 46. 叫 (gọi, kêu): Khẩu 口 + Loa phóng thanh
    "叫": """  <rect x="18" y="32" width="22" height="26" rx="2" stroke="#38bdf8" stroke-width="4" fill="none"/>
  <path d="M52 46 L76 28 V64 Z" stroke="#fb923c" stroke-width="3.8" stroke-linejoin="round" fill="none"/>
  <line x1="52" y1="46" x2="52" y2="76" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>""",

    # 47. 今天 (hôm nay): Tờ lịch đánh dấu ngôi sao ngày hiện tại
    "今天": """  <rect x="22" y="24" width="56" height="56" rx="6" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <line x1="22" y1="40" x2="78" y2="40" stroke="#38bdf8" stroke-width="2.5"/>
  <line x1="36" y1="18" x2="36" y2="28" stroke="#fb923c" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="64" y1="18" x2="64" y2="28" stroke="#fb923c" stroke-width="3.5" stroke-linecap="round"/>
  <polygon points="50,48 53,55 60,55 55,60 57,67 50,62 43,67 45,60 40,55 47,55" fill="#fbbf24"/>""",

    # 48. 九 (chín): Nét uốn số 9
    "九": """  <path d="M54 20 Q42 52 24 78" stroke="#38bdf8" stroke-width="4.8" stroke-linecap="round"/>
  <path d="M32 38 H64 V56 Q64 74 76 74 Q80 74 82 68" stroke="#fb923c" stroke-width="4.8" stroke-linecap="round" fill="none"/>""",

    # 49. 开 (mở): Hai cánh cửa mở rộng đón ánh sáng
    "开": """  <line x1="20" y1="32" x2="80" y2="32" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="16" y1="52" x2="84" y2="52" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="36" y1="32" x2="36" y2="78" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M64 32 Q64 60 58 78" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>""",

    # 50. 看 (nhìn): Tay che trên mắt nhìn xa
    "看": """  <ellipse cx="50" cy="66" rx="18" ry="10" fill="#38bdf8" opacity="0.1"/>
  <path d="M68 18 Q46 26 28 32" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M22 36 H78" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M20 46 H80" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M58 20 Q44 42 30 52" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <rect x="36" y="52" width="28" height="38" rx="2" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <line x1="36" y1="65" x2="64" y2="65" stroke="#38bdf8" stroke-width="3"/>
  <line x1="36" y1="77" x2="64" y2="77" stroke="#38bdf8" stroke-width="3"/>
  <circle cx="50" cy="65" r="2.5" fill="#38bdf8"/>""",

    # 51. 看见 (nhìn thấy): Tia sáng từ con mắt chạm tới vật thể
    "看见": """  <rect x="22" y="32" width="28" height="42" rx="3" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <line x1="22" y1="46" x2="50" y2="46" stroke="#38bdf8" stroke-width="2.5"/>
  <line x1="22" y1="60" x2="50" y2="60" stroke="#38bdf8" stroke-width="2.5"/>
  <circle cx="36" cy="46" r="3" fill="#fb923c"/>
  <path d="M56 46 H76" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>
  <polygon points="74,40 82,46 74,52" fill="#fb923c"/>""",

    # 52. 块 (miếng, cục, khối): Khối lập phương chắc chắn
    "块": """  <rect x="14" y="34" width="20" height="36" stroke="#fb923c" stroke-width="3.5" fill="none"/>
  <line x1="14" y1="52" x2="34" y2="48" stroke="#fb923c" stroke-width="3"/>
  <polygon points="60,26 80,34 62,42 42,34" stroke="#38bdf8" stroke-width="3" fill="none"/>
  <polygon points="42,34 62,42 62,68 42,60" stroke="#38bdf8" stroke-width="3" fill="none"/>
  <polygon points="62,42 80,34 80,60 62,68" stroke="#38bdf8" stroke-width="3" fill="none"/>""",

    # 53. 来 (đến): Bông lúa từ xa đi tới
    "来": """  <line x1="20" y1="28" x2="80" y2="28" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="18" y1="52" x2="82" y2="52" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="50" y1="18" x2="50" y2="82" stroke="#fb923c" stroke-width="4.8" stroke-linecap="round"/>
  <circle cx="34" cy="42" r="3" fill="#34d399"/>
  <circle cx="66" cy="42" r="3" fill="#34d399"/>
  <path d="M50 52 Q34 66 22 78" stroke="#fb923c" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M50 52 Q66 66 78 78" stroke="#fb923c" stroke-width="4.2" stroke-linecap="round"/>""",

    # 54. 老师 (thầy cô giáo): Giáo viên đứng bên bục giảng với thước kẻ
    "老师": """  <circle cx="44" cy="28" r="8" stroke="#38bdf8" stroke-width="3" fill="none"/>
  <path d="M32 64 Q32 46 44 46 Q56 46 56 64" stroke="#38bdf8" stroke-width="3" fill="none"/>
  <line x1="48" y1="48" x2="76" y2="34" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>
  <rect x="62" y="22" width="22" height="18" rx="2" stroke="#34d399" stroke-width="2.5" fill="none"/>""",

    # 55. 了 (rồi, kết thúc): Dấu tích hoàn thành nhiệm vụ
    "了": """  <circle cx="50" cy="50" r="32" stroke="#34d399" stroke-width="3.5" fill="none"/>
  <path d="M34 50 L46 62 L68 38" stroke="#34d399" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>""",

    # 56. 冷 (lạnh): Băng tuyết 冫 và bông tuyết rơi
    "冷": """  <line x1="22" y1="36" x2="28" y2="32" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <path d="M18 64 Q26 60 30 52" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <path d="M60 20 Q48 38 34 48" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round"/>
  <path d="M56 26 Q68 40 82 48" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round"/>
  <path d="M46 54 L68 54 L52 78 H76" stroke="#0ea5e9" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>""",

    # 57. 里 (trong): Nằm bên trong ô vuông
    "里": """  <rect x="24" y="20" width="52" height="34" rx="3" stroke="#38bdf8" stroke-width="4" fill="none"/>
  <line x1="24" y1="36" x2="76" y2="36" stroke="#38bdf8" stroke-width="3"/>
  <line x1="50" y1="20" x2="50" y2="82" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="30" y1="64" x2="70" y2="64" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <line x1="18" y1="80" x2="82" y2="80" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>""",

    # 58. 六 (sáu): Chóp đầu 亠 + Hai chân 八
    "六": """  <circle cx="50" cy="22" r="3.5" fill="#38bdf8"/>
  <line x1="22" y1="38" x2="78" y2="38" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M38 48 Q32 62 26 76" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M62 48 Q68 62 76 76" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>""",

    # 59. 吗 (hả, chăng): Miệng 口 + Dấu chấm hỏi tò mò
    "吗": """  <rect x="18" y="34" width="22" height="26" rx="2" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <path d="M54 36 C54 28 64 24 70 28 C76 32 74 40 68 44 C64 48 64 54 64 58" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round" fill="none"/>
  <circle cx="64" cy="72" r="3" fill="#fb923c"/>""",

    # 60. 妈妈 (mẹ): Người mẹ hiền từ ôm con
    "妈妈": """  <path d="M32 24 L22 46 Q32 52 36 78" stroke="#f43f5e" stroke-width="3.8" stroke-linecap="round" fill="none"/>
  <path d="M36 34 Q28 54 18 68" stroke="#f43f5e" stroke-width="3.8" stroke-linecap="round"/>
  <line x1="14" y1="46" x2="44" y2="44" stroke="#f43f5e" stroke-width="3.8" stroke-linecap="round"/>
  <circle cx="66" cy="34" r="10" stroke="#fb923c" stroke-width="3" fill="none"/>
  <path d="M56 68 Q56 52 66 52 Q76 52 76 68" stroke="#fb923c" stroke-width="3" fill="none"/>""",

    # 61. 买 (mua): Giỏ hàng đi siêu thị
    "买": """  <path d="M22 30 H32 L40 62 H72 L78 38 H34" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="44" cy="74" r="5" fill="#fb923c"/>
  <circle cx="68" cy="74" r="5" fill="#fb923c"/>""",

    # 62. 猫 (mèo): Khuôn mặt mèo có ria
    "猫": """  <polygon points="26,42 32,24 44,36" stroke="#fb923c" stroke-width="3" fill="none"/>
  <polygon points="74,42 68,24 56,36" stroke="#fb923c" stroke-width="3" fill="none"/>
  <circle cx="50" cy="52" r="24" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <circle cx="40" cy="48" r="3" fill="#38bdf8"/>
  <circle cx="60" cy="48" r="3" fill="#38bdf8"/>
  <polygon points="50,56 46,52 54,52" fill="#f43f5e"/>
  <line x1="26" y1="52" x2="36" y2="54" stroke="#94a3b8" stroke-width="2"/>
  <line x1="74" y1="52" x2="64" y2="54" stroke="#94a3b8" stroke-width="2"/>""",

    # 63. 没关系 (không sao đâu): Bàn tay vẫy nhẹ "mọi chuyện ổn thỏa"
    "没关系": """  <circle cx="50" cy="50" r="32" stroke="#34d399" stroke-width="3" stroke-dasharray="4 4" fill="none"/>
  <path d="M34 50 L46 62 L66 40" stroke="#34d399" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>""",

    # 64. 没有 (không có): Vòng tròn gạch chéo rỗng
    "没有": """  <circle cx="50" cy="50" r="28" stroke="#f43f5e" stroke-width="4" fill="none"/>
  <line x1="30" y1="70" x2="70" y2="30" stroke="#f43f5e" stroke-width="4" stroke-linecap="round"/>""",

    # 65. 米饭 (cơm): Bát cơm trắng bốc khói nghi ngút
    "米饭": """  <path d="M22 46 Q50 36 78 46 Q74 76 50 78 Q26 76 22 46 Z" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <line x1="38" y1="78" x2="62" y2="78" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M36 34 Q34 24 38 18" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M50 32 Q48 20 52 14" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M64 34 Q62 24 66 18" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round"/>""",

    # 66. 名字 (tên): Chiếc thẻ tên cài áo
    "名字": """  <rect x="22" y="30" width="56" height="42" rx="5" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <circle cx="50" cy="22" r="4" fill="#fb923c"/>
  <line x1="50" y1="26" x2="50" y2="30" stroke="#fb923c" stroke-width="2.5"/>
  <circle cx="36" cy="51" r="7" stroke="#34d399" stroke-width="2.5" fill="none"/>
  <line x1="50" y1="46" x2="68" y2="46" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="50" y1="56" x2="64" y2="56" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>""",

    # 67. 明天 (ngày mai): Nhật 日 (mặt trời) + Nguyệt 月 (mặt trăng)
    "明天": """  <circle cx="32" cy="50" r="16" fill="#fbbf24" opacity="0.12"/>
  <rect x="18" y="32" width="22" height="36" rx="2" stroke="#fbbf24" stroke-width="3.5" fill="none"/>
  <line x1="18" y1="50" x2="40" y2="50" stroke="#fbbf24" stroke-width="3"/>
  <circle cx="70" cy="50" r="16" fill="#38bdf8" opacity="0.12"/>
  <path d="M56 26 V76" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M56 30 H78 C80 30 82 32 82 35 V74 C82 77 79 78 75 76" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <line x1="56" y1="46" x2="80" y2="46" stroke="#38bdf8" stroke-width="3"/>
  <line x1="56" y1="60" x2="80" y2="60" stroke="#38bdf8" stroke-width="3"/>""",

    # 68. 哪 (nào, đâu): Mũi tên định hướng hỏi lựa chọn
    "哪": """  <rect x="16" y="34" width="20" height="24" rx="2" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <circle cx="62" cy="38" r="14" stroke="#fb923c" stroke-width="3" stroke-dasharray="3 3" fill="none"/>
  <path d="M56 58 L62 52 L68 58" stroke="#fb923c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="62" y1="52" x2="62" y2="76" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>""",

    # 69. 哪儿 (ở đâu): Ghim định vị vị trí bản đồ
    "哪儿": """  <path d="M50 20 C38 20 28 30 28 42 C28 58 50 80 50 80 C50 80 72 58 72 42 C72 30 62 20 50 20 Z" stroke="#f43f5e" stroke-width="3.8" fill="none"/>
  <circle cx="50" cy="40" r="8" fill="#f43f5e"/>""",

    # 70. 那 (đó, kia): Bàn tay chỉ về phía xa
    "那": """  <line x1="24" y1="50" x2="66" y2="50" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <polygon points="64,42 78,50 64,58" fill="#fb923c"/>
  <circle cx="84" cy="50" r="4" fill="#fb923c" opacity="0.4"/>""",

    # 71. 呢 (nhỉ, nhé): Bong bóng thoại nhẹ nhàng
    "呢": """  <rect x="18" y="36" width="22" height="24" rx="2" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <path d="M48 30 H78 C82 30 84 32 84 36 V54 C84 58 82 60 78 60 H58 L48 70 V36 C48 32 50 30 54 30 Z" stroke="#34d399" stroke-width="3.2" fill="none"/>
  <circle cx="60" cy="45" r="2" fill="#34d399"/>
  <circle cx="68" cy="45" r="2" fill="#34d399"/>
  <circle cx="76" cy="45" r="2" fill="#34d399"/>""",

    # 72. 能 (có thể): Cánh tay gập cơ bắp khỏe khoắn
    "能": """  <path d="M26 62 Q34 44 48 44 Q56 44 62 52 L72 38" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" fill="none"/>
  <circle cx="76" cy="34" r="6" fill="#fb923c"/>
  <path d="M24 74 H64" stroke="#34d399" stroke-width="4" stroke-linecap="round"/>""",

    # 73. 你 (bạn): Nhân đứng 亻 + Mũi tên hướng về bạn
    "你": """  <path d="M30 22 Q22 42 16 62" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <line x1="24" y1="44" x2="24" y2="80" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <circle cx="62" cy="38" r="14" stroke="#fb923c" stroke-width="3.5" fill="none"/>
  <path d="M50 74 Q50 58 62 58 Q74 58 74 74" stroke="#fb923c" stroke-width="3.5" fill="none"/>""",

    # 74. 年 (năm): Chu kỳ 4 mùa của Trái Đất quay quanh Mặt Trời
    "年": """  <line x1="26" y1="26" x2="74" y2="26" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <line x1="20" y1="44" x2="80" y2="44" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <line x1="30" y1="44" x2="26" y2="76" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <line x1="16" y1="62" x2="84" y2="62" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="50" y1="26" x2="50" y2="82" stroke="#fb923c" stroke-width="4.8" stroke-linecap="round"/>""",

    # 75. 女儿 (con gái): Bé gái thắt nơ bím tóc xinh xắn
    "女儿": """  <circle cx="50" cy="36" r="14" stroke="#f43f5e" stroke-width="3.5" fill="none"/>
  <path d="M34 26 C38 28 40 32 36 34" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>
  <path d="M66 26 C62 28 60 32 64 34" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>
  <path d="M36 72 Q36 54 50 54 Q64 54 64 72" stroke="#f43f5e" stroke-width="3.5" fill="none"/>""",

    # 76. 朋友 (bạn bè): Hai bàn tay nắm chặt gắn kết
    "朋友": """  <path d="M24 50 Q36 40 48 50" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <path d="M76 50 Q64 40 52 50" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <circle cx="50" cy="50" r="7" fill="#34d399"/>
  <line x1="20" y1="62" x2="80" y2="62" stroke="#94a3b8" stroke-width="2" stroke-dasharray="2 4"/>""",

    # 77. 漂亮 (xinh đẹp): Viên kim cương tỏa sáng lấp lánh
    "漂亮": """  <polygon points="50,22 74,38 50,78 26,38" stroke="#38bdf8" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
  <line x1="26" y1="38" x2="74" y2="38" stroke="#38bdf8" stroke-width="2.5"/>
  <line x1="50" y1="22" x2="50" y2="78" stroke="#38bdf8" stroke-width="2.5"/>
  <path d="M20 26 L26 30 M80 26 L74 30" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>""",

    # 78. 苹果 (quả táo): Quả táo tròn với cuống lá nhỏ
    "苹果": """  <path d="M50 26 Q54 18 64 18" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>
  <circle cx="64" cy="18" r="3" fill="#34d399"/>
  <path d="M50 32 C34 26 22 40 24 58 C26 74 44 80 50 76 C56 80 74 74 76 58 C78 40 66 26 50 32 Z" stroke="#f43f5e" stroke-width="3.8" fill="none"/>""",

    # 79. 七 (bảy): Số bảy góc cạnh
    "七": """  <line x1="20" y1="48" x2="80" y2="38" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M46 22 V62 Q46 76 66 76 Q76 76 78 68" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round" fill="none"/>""",

    # 80. 前面 (phía trước): Mũi tên tiến thẳng về phía trước
    "前面": """  <line x1="50" y1="78" x2="50" y2="28" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M34 44 L50 26 L66 44" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="50" cy="80" r="3" fill="#94a3b8"/>""",

    # 81. 钱 (tiền): Đồng xu tròn có lỗ vuông ở giữa
    "钱": """  <circle cx="50" cy="50" r="30" stroke="#fbbf24" stroke-width="4" fill="none"/>
  <rect x="40" y="40" width="20" height="20" rx="2" stroke="#fbbf24" stroke-width="3.5" fill="none"/>""",

    # 82. 请 (xin mời, mời): Bàn tay mở rộng đón khách vào
    "请": """  <path d="M22 62 Q36 50 54 50 Q68 50 80 40" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round" fill="none"/>
  <path d="M72 34 L82 40 L76 48" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="50" cy="30" r="7" fill="#34d399"/>""",

    # 83. 去 (đi): Bàn chân bước đi xa
    "去": """  <line x1="28" y1="28" x2="72" y2="28" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <line x1="50" y1="16" x2="50" y2="44" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <line x1="18" y1="44" x2="82" y2="44" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M44 46 L30 76 H76" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="68" cy="62" r="3" fill="#fb923c"/>""",

    # 84. 热 (nóng): Nhiệt độ cao và 4 đốm lửa bốc hơi
    "热": """  <path d="M30 36 H70" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <line x1="50" y1="22" x2="50" y2="54" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <line x1="26" y1="54" x2="74" y2="54" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <circle cx="26" cy="74" r="3.5" fill="#f43f5e"/>
  <circle cx="42" cy="76" r="3.5" fill="#f43f5e"/>
  <circle cx="58" cy="76" r="3.5" fill="#f43f5e"/>
  <circle cx="74" cy="74" r="3.5" fill="#f43f5e"/>""",

    # 85. 人 (người): Dáng người sải bước
    "人": """  <circle cx="50" cy="22" r="9" fill="#38bdf8" opacity="0.2"/>
  <path d="M50 28 Q44 54 22 80" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
  <path d="M42 46 Q58 64 78 80" stroke="#fb923c" stroke-width="5" stroke-linecap="round"/>""",

    # 86. 认识 (quen biết): Hai người bắt tay chào nhau
    "认识": """  <circle cx="34" cy="36" r="8" stroke="#38bdf8" stroke-width="3" fill="none"/>
  <circle cx="66" cy="36" r="8" stroke="#fb923c" stroke-width="3" fill="none"/>
  <path d="M26 66 Q26 50 36 50 H64 Q74 50 74 66" stroke="#94a3b8" stroke-width="3" fill="none"/>
  <path d="M42 56 L50 62 L58 56" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>""",

    # 87. 三 (ba): Ba que tính song song
    "三": """  <circle cx="50" cy="50" r="32" fill="#38bdf8" opacity="0.08"/>
  <line x1="28" y1="30" x2="72" y2="30" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="34" y1="50" x2="66" y2="50" stroke="#34d399" stroke-width="4.2" stroke-linecap="round"/>
  <line x1="18" y1="70" x2="82" y2="70" stroke="#fb923c" stroke-width="5" stroke-linecap="round"/>""",

    # 88. 商店 (cửa hàng): Mái hiên sọc che cửa tiệm
    "商店": """  <path d="M20 34 L26 24 H74 L80 34 Z" stroke="#38bdf8" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
  <rect x="24" y="34" width="52" height="42" rx="3" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <rect x="34" y="46" width="14" height="30" stroke="#fb923c" stroke-width="2.5" fill="none"/>
  <rect x="54" y="46" width="16" height="18" stroke="#34d399" stroke-width="2.5" fill="none"/>""",

    # 89. 上 (trên): Mốc chuẩn và nét chỉ lên trên
    "上": """  <line x1="16" y1="74" x2="84" y2="74" stroke="#64748b" stroke-width="5" stroke-linecap="round"/>
  <line x1="42" y1="22" x2="42" y2="74" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
  <line x1="42" y1="44" x2="74" y2="44" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M42 16 L36 24 M42 16 L48 24" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round"/>""",

    # 90. 上午 (buổi sáng): Mặt trời nhô lên từ đường chân trời
    "上午": """  <line x1="16" y1="64" x2="84" y2="64" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>
  <path d="M30 64 A20 20 0 0 1 70 64" stroke="#fbbf24" stroke-width="4" fill="none"/>
  <line x1="50" y1="36" x2="50" y2="24" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
  <line x1="68" y1="44" x2="78" y2="36" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
  <line x1="32" y1="44" x2="22" y2="36" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>""",

    # 91. 少 (ít): Tiểu 小 + Phiệt 丿 cắt bớt
    "少": """  <g opacity="0.25">
    <circle cx="28" cy="80" r="3" fill="#94a3b8"/>
    <circle cx="48" cy="80" r="3" fill="#94a3b8"/>
    <line x1="24" y1="80" x2="52" y2="80" stroke="#f43f5e" stroke-width="1.5" stroke-linecap="round"/>
  </g>
  <circle cx="74" cy="80" r="3.5" fill="#38bdf8"/>
  <path d="M50 18 V62 M50 62 C46 62 44 58 44 55" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M30 36 C34 46 38 52 40 54" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <path d="M70 36 C66 46 62 52 60 54" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <path d="M62 48 Q45 74 22 84" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="62" cy="48" r="2.5" fill="#f43f5e"/>""",

    # 92. 谁 (ai): Bộ Ngôn 讠 + Dấu chấm hỏi
    "谁": """  <circle cx="24" cy="30" r="2.5" fill="#38bdf8"/>
  <path d="M18 42 H32 L20 70" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M54 34 C54 26 66 22 72 26 C78 30 76 38 70 42 C66 46 66 52 66 56" stroke="#fb923c" stroke-width="4" stroke-linecap="round" fill="none"/>
  <circle cx="66" cy="70" r="3.5" fill="#fb923c"/>""",

    # 93. 什么 (cái gì): Dấu hỏi thắc mắc trên tấm bảng
    "什么": """  <rect x="24" y="24" width="52" height="52" rx="8" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <path d="M44 42 C44 36 50 34 54 36 C58 38 58 42 54 46 C52 48 52 52 52 56" stroke="#fb923c" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <circle cx="52" cy="64" r="2.5" fill="#fb923c"/>""",

    # 94. 十 (mười): Chữ thập đầy đủ vuông vức
    "十": """  <circle cx="50" cy="50" r="30" fill="#38bdf8" opacity="0.08"/>
  <line x1="20" y1="50" x2="80" y2="50" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
  <line x1="50" y1="20" x2="50" y2="80" stroke="#fb923c" stroke-width="5" stroke-linecap="round"/>""",

    # 95. 时候 (thời gian, lúc): Mặt đồng hồ quả lắc
    "时候": """  <circle cx="50" cy="40" r="22" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <line x1="50" y1="40" x2="50" y2="28" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>
  <line x1="50" y1="40" x2="60" y2="40" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>
  <line x1="50" y1="62" x2="50" y2="82" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>
  <circle cx="50" cy="82" r="5" fill="#34d399"/>""",

    # 96. 是 (là, đúng): Dấu kiểm đúng (tick) rực rỡ
    "是": """  <circle cx="50" cy="50" r="30" fill="#34d399" opacity="0.12"/>
  <path d="M30 50 L44 64 L70 34" stroke="#34d399" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>""",

    # 97. 书 (sách): Gáy sách và các trang sách mở
    "书": """  <rect x="26" y="22" width="48" height="58" rx="4" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <line x1="36" y1="22" x2="36" y2="80" stroke="#fb923c" stroke-width="3"/>
  <line x1="46" y1="36" x2="64" y2="36" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>
  <line x1="46" y1="48" x2="64" y2="48" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>""",

    # 98. 水 (nước): Dòng chảy cuộn sóng và các giọt nước
    "水": """  <path d="M50 16 Q36 40 36 54 A14 14 0 0 0 64 54 Q64 40 50 16 Z" fill="#38bdf8" opacity="0.14"/>
  <path d="M50 18 V78 Q50 84 42 80" stroke="#38bdf8" stroke-width="4.8" stroke-linecap="round" fill="none"/>
  <path d="M22 42 H38 L24 64" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M74 34 Q62 46 52 50" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round"/>
  <path d="M54 54 Q66 70 78 78" stroke="#0ea5e9" stroke-width="4.2" stroke-linecap="round"/>""",

    # 99. 水果 (hoa quả, trái cây): Quả táo và chùm nho tươi mọng
    "水果": """  <circle cx="44" cy="54" r="18" stroke="#f43f5e" stroke-width="3.5" fill="none"/>
  <path d="M44 36 Q48 28 54 28" stroke="#34d399" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="66" cy="50" r="12" stroke="#fb923c" stroke-width="3.2" fill="none"/>""",

    # 100. 睡觉 (ngủ): Vầng trăng khuyết và ký hiệu zZz êm đềm
    "睡觉": """  <path d="M34 26 C46 26 56 36 56 50 C56 64 46 74 34 74 C42 68 46 58 46 50 C46 42 42 32 34 26 Z" stroke="#38bdf8" stroke-width="4" fill="#38bdf8" fill-opacity="0.12"/>
  <path d="M60 30 H70 L60 40 H70" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M70 46 H78 L70 54 H78" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>""",

    # 101. 说 (nói): Bong bóng lời nói phát ra từ miệng
    "说": """  <rect x="18" y="34" width="20" height="24" rx="2" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <path d="M46 32 H78 C82 32 84 34 84 38 V56 C84 60 82 62 78 62 H56 L46 72 V38 C46 34 48 32 52 32 Z" stroke="#fb923c" stroke-width="3.5" fill="none"/>
  <line x1="56" y1="44" x2="74" y2="44" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="56" y1="52" x2="68" y2="52" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round"/>""",

    # 102. 四 (bốn): Khung bao 囗 với 2 nét cong bên trong
    "四": """  <rect x="22" y="24" width="56" height="52" rx="4" stroke="#38bdf8" stroke-width="4" fill="none"/>
  <path d="M38 34 Q34 50 32 62" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M54 34 V52 Q54 60 64 62" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round" fill="none"/>""",

    # 103. 岁 (tuổi): Chiếc bánh sinh nhật có ngọn nến
    "岁": """  <rect x="26" y="50" width="48" height="28" rx="4" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <line x1="50" y1="36" x2="50" y2="50" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
  <circle cx="50" cy="30" r="3.5" fill="#f43f5e"/>
  <line x1="26" y1="62" x2="74" y2="62" stroke="#38bdf8" stroke-width="2"/>""",

    # 104. 他 (anh ấy): Dáng hình nam giới
    "他": """  <path d="M30 22 Q22 42 16 62" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <line x1="24" y1="44" x2="24" y2="80" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <circle cx="64" cy="32" r="10" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <path d="M50 72 Q50 54 64 54 Q78 54 78 72" stroke="#38bdf8" stroke-width="3.5" fill="none"/>""",

    # 105. 她 (cô ấy): Dáng hình nữ giới
    "她": """  <path d="M30 24 L20 46 Q30 52 34 76" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" fill="none"/>
  <path d="M34 34 Q26 54 16 68" stroke="#f43f5e" stroke-width="4" stroke-linecap="round"/>
  <line x1="12" y1="46" x2="42" y2="44" stroke="#f43f5e" stroke-width="4" stroke-linecap="round"/>
  <circle cx="66" cy="32" r="10" stroke="#f43f5e" stroke-width="3.5" fill="none"/>
  <path d="M52 72 Q52 54 66 54 Q80 54 80 72" stroke="#f43f5e" stroke-width="3.5" fill="none"/>""",

    # 106. 太 (quá): Đại 大 có thêm dấu chấm cực độ 丶
    "太": """  <line x1="18" y1="38" x2="82" y2="38" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M50 18 Q50 48 24 80" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M46 40 Q60 60 78 80" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="50" cy="58" r="4.5" fill="#f43f5e"/>""",

    # 107. 天气 (thời tiết): Mặt trời lấp ló sau đám mây
    "天气": """  <circle cx="62" cy="38" r="14" fill="#fbbf24"/>
  <path d="M26 62 H66 A12 12 0 0 0 66 38 A16 16 0 0 0 36 44 A12 12 0 0 0 26 62 Z" stroke="#38bdf8" stroke-width="3.5" fill="#131b2e"/>""",

    # 108. 听 (nghe): Nốt nhạc vang lên bên tai
    "听": """  <rect x="18" y="34" width="22" height="26" rx="2" stroke="#38bdf8" stroke-width="4" fill="none"/>
  <circle cx="62" cy="64" r="6" fill="#fb923c"/>
  <path d="M68 64 V32 L82 28 V40" stroke="#fb923c" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>""",

    # 109. 同学 (bạn học): Hai bạn cùng đeo ba lô đến trường
    "同学": """  <circle cx="36" cy="36" r="8" stroke="#38bdf8" stroke-width="3" fill="none"/>
  <circle cx="64" cy="36" r="8" stroke="#34d399" stroke-width="3" fill="none"/>
  <path d="M26 68 Q26 52 36 52 Q46 52 46 68" stroke="#38bdf8" stroke-width="3" fill="none"/>
  <path d="M54 68 Q54 52 64 52 Q74 52 74 68" stroke="#34d399" stroke-width="3" fill="none"/>""",

    # 110. 喂 (a-lô): Ống nghe điện thoại trả lời
    "喂": """  <rect x="16" y="36" width="20" height="22" rx="2" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <path d="M48 34 C48 28 54 26 60 30 L66 36 C68 40 66 44 62 46 C64 52 68 56 74 58 C76 54 80 52 84 54 L90 60 C94 66 92 72 86 72 C68 72 48 52 48 34 Z" stroke="#fb923c" stroke-width="3.5" fill="none"/>""",

    # 111. 我 (tôi): Biểu tượng cá nhân / cái tôi
    "我": """  <circle cx="50" cy="32" r="12" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <path d="M30 76 Q30 54 50 54 Q70 54 70 76" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round" fill="none"/>
  <polygon points="50,46 54,54 50,62 46,54" fill="#fb923c"/>""",

    # 112. 我们 (chúng tôi): Nhóm ba người thân thiết
    "我们": """  <circle cx="50" cy="30" r="8" stroke="#38bdf8" stroke-width="3" fill="none"/>
  <path d="M38 60 Q38 46 50 46 Q62 46 62 60" stroke="#38bdf8" stroke-width="3" fill="none"/>
  <circle cx="28" cy="40" r="6" stroke="#fb923c" stroke-width="2.5" fill="none"/>
  <path d="M18 70 Q18 56 28 56 Q38 56 38 70" stroke="#fb923c" stroke-width="2.5" fill="none"/>
  <circle cx="72" cy="40" r="6" stroke="#34d399" stroke-width="2.5" fill="none"/>
  <path d="M62 70 Q62 56 72 56 Q82 56 82 70" stroke="#34d399" stroke-width="2.5" fill="none"/>""",

    # 113. 五 (năm): Số năm
    "五": """  <line x1="22" y1="26" x2="78" y2="26" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="50" y1="26" x2="42" y2="74" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <path d="M42 50 H66 V74" stroke="#34d399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="18" y1="74" x2="82" y2="74" stroke="#38bdf8" stroke-width="4.8" stroke-linecap="round"/>""",

    # 114. 喜欢 (thích): Trái tim hồng vui vẻ
    "喜欢": """  <path d="M50 74 C32 60 22 48 22 36 A12 12 0 0 1 48 28 A12 12 0 0 1 78 36 C78 48 68 60 50 74 Z" stroke="#f43f5e" stroke-width="3.8" fill="#f43f5e" fill-opacity="0.15"/>
  <path d="M42 46 Q50 54 58 46" stroke="#f43f5e" stroke-width="3" stroke-linecap="round"/>""",

    # 115. 下 (dưới): Mốc chuẩn và nét chỉ xuống dưới
    "下": """  <line x1="16" y1="26" x2="84" y2="26" stroke="#64748b" stroke-width="5" stroke-linecap="round"/>
  <line x1="50" y1="26" x2="50" y2="78" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
  <path d="M50 48 Q64 60 72 68" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M50 84 L44 76 M50 84 L56 76" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round"/>""",

    # 116. 下午 (buổi chiều): Mặt trời lặn dần về phía chân trời
    "下午": """  <line x1="16" y1="64" x2="84" y2="64" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>
  <circle cx="50" cy="46" r="16" stroke="#fb923c" stroke-width="3.8" fill="none"/>
  <path d="M50 64 V78" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>
  <polygon points="46,72 50,78 54,72" fill="#fb923c"/>""",

    # 117. 下雨 (trời mưa): Đám mây xám và những hạt mưa rơi
    "下雨": """  <path d="M26 44 H66 A12 12 0 0 0 66 22 A16 16 0 0 0 36 28 A12 12 0 0 0 26 44 Z" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <line x1="32" y1="54" x2="28" y2="68" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
  <line x1="48" y1="54" x2="44" y2="68" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
  <line x1="64" y1="54" x2="60" y2="68" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>""",

    # 118. 先生 (ông, ngài): Chiếc nơ cổ lịch lãm
    "先生": """  <polygon points="30,40 50,48 30,56" fill="#38bdf8"/>
  <polygon points="70,40 50,48 70,56" fill="#38bdf8"/>
  <circle cx="50" cy="48" r="4" fill="#fbbf24"/>""",

    # 119. 现在 (bây giờ): Đồng hồ chỉ đúng thời khắc này
    "现在": """  <circle cx="50" cy="50" r="30" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <line x1="50" y1="50" x2="50" y2="30" stroke="#f43f5e" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="50" y1="50" x2="68" y2="50" stroke="#f43f5e" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="50" cy="50" r="3.5" fill="#f43f5e"/>""",

    # 120. 想 (muốn, nhớ): Mắt nhìn cây 相 để trong Tim 心
    "想": """  <circle cx="50" cy="32" r="16" fill="#38bdf8" opacity="0.12"/>
  <line x1="28" y1="36" x2="72" y2="36" stroke="#34d399" stroke-width="3.5" stroke-linecap="round"/>
  <rect x="36" y="24" width="28" height="24" rx="2" stroke="#38bdf8" stroke-width="3" fill="none"/>
  <path d="M26 66 Q36 78 50 78 Q64 78 74 66" stroke="#f43f5e" stroke-width="3.8" stroke-linecap="round" fill="none"/>
  <circle cx="34" cy="62" r="2.5" fill="#f43f5e"/>
  <circle cx="50" cy="64" r="2.5" fill="#f43f5e"/>
  <circle cx="66" cy="62" r="2.5" fill="#f43f5e"/>""",

    # 121. 小 (nhỏ): Các mẩu bé xíu tách đôi
    "小": """  <path d="M50 20 V72 M50 72 C45 72 43 68 43 64" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M28 42 C32 54 38 60 40 62" stroke="#38bdf8" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M72 42 C68 54 62 60 60 62" stroke="#38bdf8" stroke-width="4.2" stroke-linecap="round"/>""",

    # 122. 小姐 (cô gái): Bông hoa nhỏ thanh lịch
    "小姐": """  <circle cx="50" cy="46" r="8" fill="#fbbf24"/>
  <circle cx="50" cy="30" r="7" stroke="#f43f5e" stroke-width="3" fill="none"/>
  <circle cx="66" cy="46" r="7" stroke="#f43f5e" stroke-width="3" fill="none"/>
  <circle cx="50" cy="62" r="7" stroke="#f43f5e" stroke-width="3" fill="none"/>
  <circle cx="34" cy="46" r="7" stroke="#f43f5e" stroke-width="3" fill="none"/>
  <line x1="50" y1="62" x2="50" y2="82" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>""",

    # 123. 些 (vài, một số): Vài chấm nhỏ cạnh nhau
    "些": """  <circle cx="30" cy="50" r="6" fill="#38bdf8"/>
  <circle cx="50" cy="50" r="6" fill="#fb923c"/>
  <circle cx="70" cy="50" r="6" fill="#34d399"/>""",

    # 124. 写 (viết): Bút mực đưa nét
    "写": """  <path d="M22 28 V36 M22 28 H78 V36" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="32" y1="46" x2="68" y2="46" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <path d="M48 46 V62 H68 V76 Q68 82 58 80 Q48 78 44 72" stroke="#fb923c" stroke-width="4" stroke-linecap="round" fill="none"/>
  <line x1="26" y1="78" x2="74" y2="78" stroke="#fb923c" stroke-width="4.2" stroke-linecap="round"/>""",

    # 125. 谢谢 (cảm ơn): Hai tay chắp lại cảm tạ
    "谢谢": """  <circle cx="50" cy="50" r="32" fill="#f43f5e" opacity="0.1"/>
  <path d="M34 68 L50 36 L66 68 Z" stroke="#38bdf8" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
  <circle cx="50" cy="48" r="5" fill="#f43f5e"/>""",

    # 126. 星期 (tuần): Lưới lịch 7 ngày
    "星期": """  <rect x="20" y="24" width="60" height="52" rx="6" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <line x1="20" y1="40" x2="80" y2="40" stroke="#38bdf8" stroke-width="2.5"/>
  <circle cx="32" cy="52" r="3" fill="#fb923c"/>
  <circle cx="50" cy="52" r="3" fill="#fb923c"/>
  <circle cx="68" cy="52" r="3" fill="#fb923c"/>
  <circle cx="32" cy="64" r="3" fill="#34d399"/>
  <circle cx="50" cy="64" r="3" fill="#34d399"/>
  <circle cx="68" cy="64" r="3" fill="#34d399"/>""",

    # 127. 学生 (học sinh): Chiếc mũ tốt nghiệp cử nhân
    "学生": """  <polygon points="50,26 82,40 50,54 18,40" stroke="#38bdf8" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
  <path d="M32 47 V64 Q50 74 68 64 V47" stroke="#38bdf8" stroke-width="3" fill="none"/>
  <path d="M78 44 V68" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>
  <circle cx="78" cy="70" r="3" fill="#fb923c"/>""",

    # 128. 学习 (học tập): Trang sách mở và bóng đèn sáng tạo
    "学习": """  <path d="M22 44 Q50 48 50 74 Q24 70 22 44 Z" stroke="#38bdf8" stroke-width="3" fill="none"/>
  <path d="M78 44 Q50 48 50 74 Q76 70 78 44 Z" stroke="#38bdf8" stroke-width="3" fill="none"/>
  <circle cx="50" cy="28" r="10" stroke="#fbbf24" stroke-width="3" fill="#fbbf24" fill-opacity="0.2"/>""",

    # 129. 学校 (trường học): Ngôi trường với tháp chuông
    "学校": """  <polygon points="50,18 78,36 22,36" stroke="#fbbf24" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
  <rect x="26" y="36" width="48" height="44" rx="2" stroke="#38bdf8" stroke-width="3.5" fill="none"/>
  <rect x="42" y="54" width="16" height="26" stroke="#fb923c" stroke-width="3" fill="none"/>""",

    # 130. 一 (một): Que tính duy nhất
    "一": """  <circle cx="50" cy="50" r="28" fill="#38bdf8" opacity="0.08"/>
  <circle cx="50" cy="34" r="3" fill="#38bdf8" opacity="0.4"/>
  <line x1="20" y1="50" x2="80" y2="50" stroke="#38bdf8" stroke-width="5.5" stroke-linecap="round"/>""",

    # 131. 一点儿 (một chút): Cử chỉ ngón cái ngón trỏ véo một chút xíu
    "一点儿": """  <circle cx="50" cy="50" r="4" fill="#38bdf8"/>
  <path d="M34 44 Q44 40 46 48" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>
  <path d="M34 56 Q44 60 46 52" stroke="#fb923c" stroke-width="3" stroke-linecap="round"/>""",

    # 132. 医生 (bác sĩ): Dấu thập chữ đỏ y tế
    "医生": """  <rect x="42" y="24" width="16" height="52" rx="3" fill="#f43f5e"/>
  <rect x="24" y="42" width="52" height="16" rx="3" fill="#f43f5e"/>""",

    # 133. 医院 (bệnh viện): Tòa nhà bệnh viện có dấu thập y tế
    "医院": """  <rect x="22" y="26" width="56" height="54" rx="4" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <rect x="46" y="36" width="8" height="20" rx="1" fill="#f43f5e"/>
  <rect x="40" y="42" width="20" height="8" rx="1" fill="#f43f5e"/>
  <rect x="42" y="62" width="16" height="18" stroke="#38bdf8" stroke-width="2.5" fill="none"/>""",

    # 134. 衣服 (quần áo): Chiếc áo thun sạch sẽ
    "衣服": """  <path d="M34 24 H66 L82 38 L72 48 L64 42 V76 H36 V42 L28 48 L18 38 Z" stroke="#38bdf8" stroke-width="3.8" stroke-linejoin="round" fill="none"/>
  <path d="M44 24 C44 30 56 30 56 24" stroke="#fb923c" stroke-width="3" fill="none"/>""",

    # 135. 椅子 (ghế): Chiếc ghế tựa bốn chân vững chãi
    "椅子": """  <line x1="32" y1="20" x2="32" y2="80" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <line x1="32" y1="52" x2="68" y2="52" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <line x1="68" y1="52" x2="68" y2="80" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <line x1="32" y1="34" x2="56" y2="34" stroke="#34d399" stroke-width="3.5" stroke-linecap="round"/>""",

    # 136. 有 (có): Bàn tay nắm giữ món đồ
    "有": """  <line x1="20" y1="36" x2="80" y2="36" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M48 20 Q40 50 22 74" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <rect x="38" y="44" width="34" height="34" rx="3" stroke="#fb923c" stroke-width="4" fill="none"/>
  <line x1="38" y1="58" x2="72" y2="58" stroke="#fb923c" stroke-width="3.5"/>""",

    # 137. 月 (tháng, trăng): Vầng trăng thanh khiết
    "月": """  <circle cx="56" cy="50" r="28" fill="#38bdf8" opacity="0.12"/>
  <path d="M34 18 V82" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M34 22 H64 C68 22 70 24 70 28 V76 Q70 82 62 80" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round" fill="none"/>
  <line x1="34" y1="42" x2="68" y2="42" stroke="#38bdf8" stroke-width="3.8"/>
  <line x1="34" y1="58" x2="68" y2="58" stroke="#38bdf8" stroke-width="3.8"/>""",

    # 138. 再见 (tạm biệt): Bàn tay vẫy chào hẹn gặp lại
    "再见": """  <path d="M40 76 V56 C40 48 48 48 48 56 V40 C48 34 56 34 56 40 V42 C56 36 64 36 64 42 V46 C64 40 72 40 72 48 V66 C72 80 40 82 40 76 Z" stroke="#38bdf8" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
  <path d="M26 36 Q30 32 36 36" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M22 46 Q28 42 34 46" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>""",

    # 139. 在 (ở, tại): Điểm mốc tọa độ trên bản đồ
    "在": """  <line x1="18" y1="36" x2="82" y2="36" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M46 20 Q38 52 22 76" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="42" y1="48" x2="42" y2="82" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="26" y1="62" x2="74" y2="62" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <line x1="18" y1="82" x2="82" y2="82" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>""",

    # 140. 怎么 (thế nào): Dấu chấm hỏi trong tâm trí
    "怎么": """  <path d="M36 36 C36 26 48 22 54 26 C60 30 58 38 52 42 C48 46 48 52 48 56" stroke="#fb923c" stroke-width="4" stroke-linecap="round" fill="none"/>
  <circle cx="48" cy="68" r="3.5" fill="#fb923c"/>""",

    # 141. 怎么样 (như thế nào): Bàn tay ngón cái đưa lên (thumbs up)
    "怎么样": """  <path d="M36 68 H28 V48 H36 M36 48 L46 28 C48 24 54 26 54 32 V46 H72 C78 46 80 50 78 54 L72 68 H36" stroke="#34d399" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>""",

    # 142. 这 (đây, này): Bàn tay trỏ xuống ngay tại vị trí này
    "这": """  <line x1="50" y1="24" x2="50" y2="64" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
  <polygon points="42,56 50,72 58,56" fill="#fb923c"/>
  <circle cx="50" cy="78" r="3" fill="#fb923c"/>""",

    # 143. 中国 (Trung Quốc): Trung tâm bia bắn và thành quách vuông
    "中国": """  <rect x="22" y="24" width="56" height="52" rx="4" stroke="#f43f5e" stroke-width="4" fill="none"/>
  <polygon points="50,34 54,44 64,44 56,50 59,60 50,54 41,60 44,50 36,44 46,44" fill="#fbbf24"/>""",

    # 144. 中午 (buổi trưa): Mặt trời đứng bóng ngay đỉnh đầu
    "中午": """  <circle cx="50" cy="38" r="18" stroke="#fbbf24" stroke-width="4" fill="#fbbf24" fill-opacity="0.2"/>
  <line x1="50" y1="14" x2="50" y2="6" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="50" y1="62" x2="50" y2="78" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>
  <line x1="20" y1="78" x2="80" y2="78" stroke="#64748b" stroke-width="4.5" stroke-linecap="round"/>""",

    # 145. 住 (ở, sinh sống): Người đứng bên ngọn đèn chủ nhà
    "住": """  <path d="M30 22 Q22 42 16 62" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <line x1="24" y1="44" x2="24" y2="80" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <line x1="42" y1="36" x2="78" y2="36" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <line x1="60" y1="24" x2="60" y2="78" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <line x1="44" y1="56" x2="76" y2="56" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <line x1="36" y1="78" x2="84" y2="78" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>""",

    # 146. 桌子 (cái bàn): Chiếc bàn bốn chân vững chãi
    "桌子": """  <polygon points="18,36 82,36 74,48 26,48" stroke="#38bdf8" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
  <line x1="26" y1="48" x2="26" y2="78" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>
  <line x1="74" y1="48" x2="74" y2="78" stroke="#fb923c" stroke-width="3.8" stroke-linecap="round"/>""",

    # 147. 字 (chữ Hán): Mái nhà 宀 che cho trẻ con 子 học chữ
    "字": """  <circle cx="50" cy="18" r="3" fill="#38bdf8"/>
  <path d="M22 28 V34 M22 28 H78 V34" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M38 42 H64 L52 56 Q68 58 68 70 Q68 82 58 82 Q50 82 46 76" stroke="#fb923c" stroke-width="4" stroke-linecap="round" fill="none"/>
  <line x1="28" y1="58" x2="74" y2="58" stroke="#fb923c" stroke-width="4.2" stroke-linecap="round"/>""",

    # 148. 昨天 (hôm qua): Tờ lịch lật ngược về quá khứ
    "昨天": """  <rect x="24" y="24" width="52" height="56" rx="6" stroke="#38bdf8" stroke-width="3.8" fill="none"/>
  <path d="M60 48 L44 48 L50 40" stroke="#fb923c" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="24" y1="38" x2="76" y2="38" stroke="#38bdf8" stroke-width="2.5"/>""",

    # 149. 做 (làm): Người cầm công cụ khéo léo chế tác
    "做": """  <path d="M24 24 Q18 42 14 62" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round"/>
  <line x1="20" y1="44" x2="20" y2="78" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round"/>
  <rect x="36" y="32" width="22" height="24" rx="2" stroke="#fb923c" stroke-width="3.2" fill="none"/>
  <line x1="36" y1="68" x2="58" y2="68" stroke="#fb923c" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M72 26 L64 78 M60 46 H80" stroke="#34d399" stroke-width="3.5" stroke-linecap="round"/>""",

    # 150. 坐 (ngồi): Hai người ngồi đối diện nhau trên mảnh đất 土
    "坐": """  <path d="M30 26 Q24 40 18 52" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M26 38 Q34 46 38 52" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M70 26 Q64 40 58 52" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M66 38 Q74 46 78 52" stroke="#38bdf8" stroke-width="3.8" stroke-linecap="round"/>
  <line x1="48" y1="18" x2="48" y2="78" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="28" y1="56" x2="68" y2="56" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
  <line x1="16" y1="78" x2="84" y2="78" stroke="#fb923c" stroke-width="5" stroke-linecap="round"/>"""
}

def main():
    print(f"Total curated SVGs defined: {len(SVGS)}")
    vocabs = json.load(open(HSK1_VOCAB_PATH, encoding="utf-8"))
    
    missing = [w['hanzi'] for w in vocabs if w['hanzi'] not in SVGS]
    if missing:
        print(f"Warning! Missing {len(missing)} words: {missing}")
        return
    
    print("All 150 HSK 1 words have dedicated pure vector anatomy definitions!")
    
    HSK2_DIR.mkdir(parents=True, exist_ok=True)
    HSK3_DIR.mkdir(parents=True, exist_ok=True)
    
    hsk1_dict = {}
    
    for w in vocabs:
        hz = w['hanzi']
        full_svg = wrap(SVGS[hz])
        
        # Write to images/HSK_2.0/level1/<word>.svg
        p2 = HSK2_DIR / f"{hz}.svg"
        p2.write_text(full_svg, encoding="utf-8")
        
        # Write to images/HSK_3.0/level1/<word>.svg
        p3 = HSK3_DIR / f"{hz}.svg"
        p3.write_text(full_svg, encoding="utf-8")
        
        hsk1_dict[hz] = full_svg
        
    # Write to database/illustrations/hsk1.json
    HSK1_JSON_PATH.write_text(json.dumps(hsk1_dict, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"🎉 Successfully generated and saved all {len(vocabs)} HSK 1 visual anatomy SVGs!")

if __name__ == "__main__":
    main()
