#!/usr/bin/env python3
"""Build Hanzi radical and character decomposition database for all HSK words.

Sources:
1. Makemeahanzi character dictionary & stroke-component match trees
2. Kangxi 214 radicals database (database/radicals/kangxi_214_radicals)
3. Basic 50 radicals database (database/radicals/basic_50_radicals)
4. Sino-Vietnamese dictionary (assets/js/hanviet-dict.js)
5. HSK 1-6 and HSK 3.0 vocabulary definitions (database/vocabs)
"""

import glob
import json
import os
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
RADICALS_DIR = ROOT / 'database/radicals'
KANGXI_DIR = RADICALS_DIR / 'kangxi_214_radicals'
VOCAB_DIR = ROOT / 'database/vocabs'
OUTPUT_FILE = RADICALS_DIR / 'hanzi_decompositions.json'
CACHE_DICT = ROOT / '.cache/makemeahanzi_dictionary.txt'

BINARY_IDC = set('⿰⿱⿴⿵⿶⿷⿸⿹⿺⿻')
TERNARY_IDC = set('⿲⿳')

STRUCTURE_NAMES = {
    '⿰': {'name': 'Trái - Phải', 'type': 'Tả hữu'},
    '⿱': {'name': 'Trên - Dưới', 'type': 'Thượng hạ'},
    '⿲': {'name': 'Trái - Giữa - Phải', 'type': 'Tả trung hữu'},
    '⿳': {'name': 'Trên - Giữa - Dưới', 'type': 'Thượng trung hạ'},
    '⿴': {'name': 'Bao quanh toàn bộ', 'type': 'Toàn bao vi'},
    '⿵': {'name': 'Bao quanh từ trên xuống', 'type': 'Thượng bao hạ'},
    '⿶': {'name': 'Bao quanh từ dưới lên', 'type': 'Hạ bao thượng'},
    '⿷': {'name': 'Bao quanh từ bên trái', 'type': 'Tả bao hữu'},
    '⿸': {'name': 'Bao quanh góc trên trái', 'type': 'Tả thượng bao'},
    '⿹': {'name': 'Bao quanh góc trên phải', 'type': 'Hữu thượng bao'},
    '⿺': {'name': 'Bao quanh góc dưới trái', 'type': 'Tả hạ bao'},
    '⿻': {'name': 'Đan xen lồng nhau', 'type': 'Khảm hiệp'},
}

RADICAL_ALIASES = {
    '⺼': '肉', '⺗': '心', '⺳': '网', '⺌': '小', '西': '襾', '覀': '襾',
    '户': '戶', '川': '巛', '母': '毋', '虎': '虍', '⺀': '冫', '氺': '水',
    '⺊': '卜', '㔾': '卩', '肀': '聿', '乚': '乙', '乛': '乙', '巳': '己',
    '丷': '八', '刁': '刀', '兀': '儿', '旡': '无', '民': '氏', '⺅': '人',
    '⺡': '水', '⺘': '手', '⺨': '犬', '⺾': '艸', '艹': '艸', '⻓': '長',
    '⻔': '門', '⻉': '貝', '⻋': '車', '⻢': '馬', '⻦': '鳥', '⻥': '魚',
    '饣': '食', '纟': '糸', '讠': '言', '钅': '金', '礻': '示', '衤': '衣'
}

COMMON_COMPONENT_NAMES = {
    '不': {'name': 'Bộ Bất', 'meaning': 'không, chẳng', 'hanviet': 'Bất', 'pinyin': 'bù'},
    '乞': {'name': 'Bộ Khất', 'meaning': 'xin, cầu xin', 'hanviet': 'Khất', 'pinyin': 'qǐ'},
    '反': {'name': 'Bộ Phản', 'meaning': 'ngược lại, quay lại', 'hanviet': 'Phản', 'pinyin': 'fǎn'},
    '兑': {'name': 'Bộ Đoái', 'meaning': 'vui vẻ, quẻ Đoái', 'hanviet': 'Đoái', 'pinyin': 'duì'},
    '射': {'name': 'Xạ', 'meaning': 'bắn tên', 'hanviet': 'Xạ', 'pinyin': 'shè'},
    '故': {'name': 'Cố', 'meaning': 'cũ, duyên cớ', 'hanviet': 'Cố', 'pinyin': 'gù'},
    '尔': {'name': 'Nhĩ', 'meaning': 'ngươi, bạn', 'hanviet': 'Nhĩ', 'pinyin': 'ěr'},
    '古': {'name': 'Cổ', 'meaning': 'cổ xưa', 'hanviet': 'Cổ', 'pinyin': 'gǔ'},
    '相': {'name': 'Tương', 'meaning': 'cùng nhau, xem xét', 'hanviet': 'Tương', 'pinyin': 'xiāng'},
    '巴': {'name': 'Ba', 'meaning': 'mong mỏi', 'hanviet': 'Ba', 'pinyin': 'bā'},
    '丁': {'name': 'Đinh', 'meaning': 'tráng đinh', 'hanviet': 'Đinh', 'pinyin': 'dīng'},
    '可': {'name': 'Khả', 'meaning': 'có thể', 'hanviet': 'Khả', 'pinyin': 'kě'},
    '也': {'name': 'Dã', 'meaning': 'cũng, vậy', 'hanviet': 'Dã', 'pinyin': 'yě'},
    '包': {'name': 'Bao', 'meaning': 'gói, bao bọc', 'hanviet': 'Bao', 'pinyin': 'bāo'},
    '分': {'name': 'Phân', 'meaning': 'phân chia', 'hanviet': 'Phân', 'pinyin': 'fēn'},
    '交': {'name': 'Giao', 'meaning': 'giao tiếp', 'hanviet': 'Giao', 'pinyin': 'jiāo'},
    '正': {'name': 'Chính', 'meaning': 'ngay thẳng', 'hanviet': 'Chính', 'pinyin': 'zhèng'},
    '平': {'name': 'Bình', 'meaning': 'bằng phẳng', 'hanviet': 'Bình', 'pinyin': 'píng'},
    '央': {'name': 'Ương', 'meaning': 'ở giữa', 'hanviet': 'Ương', 'pinyin': 'yāng'},
    '及': {'name': 'Cập', 'meaning': 'kịp, đến', 'hanviet': 'Cập', 'pinyin': 'jí'},
    '成': {'name': 'Thành', 'meaning': 'hoàn thành', 'hanviet': 'Thành', 'pinyin': 'chéng'},
    '元': {'name': 'Nguyên', 'meaning': 'đầu tiên, nguồn gốc', 'hanviet': 'Nguyên', 'pinyin': 'yuán'},
    '井': {'name': 'Tỉnh', 'meaning': 'giếng nước', 'hanviet': 'Tỉnh', 'pinyin': 'jǐng'},
    '寸': {'name': 'Bộ Thốn', 'meaning': 'tấc, gang tay', 'hanviet': 'Thốn', 'pinyin': 'cùn'},
    '身': {'name': 'Bộ Thân', 'meaning': 'thân thể', 'hanviet': 'Thân', 'pinyin': 'shēn'},
    '舌': {'name': 'Bộ Thiệt', 'meaning': 'cái lưỡi', 'hanviet': 'Thiệt', 'pinyin': 'shé'},
    '斤': {'name': 'Bộ Cân', 'meaning': 'cái búa rìu', 'hanviet': 'Cân', 'pinyin': 'jīn'},
    '豕': {'name': 'Bộ Thỉ', 'meaning': 'con lợn, con heo', 'hanviet': 'Thỉ', 'pinyin': 'shǐ'},
    '宀': {'name': 'Bộ Miên', 'meaning': 'mái nhà', 'hanviet': 'Miên', 'pinyin': 'mián'},
    '辶': {'name': 'Bộ Sước', 'meaning': 'bước đi, con đường', 'hanviet': 'Sước', 'pinyin': 'chuò'},
    '亻': {'name': 'Bộ Nhân', 'meaning': 'con người', 'hanviet': 'Nhân', 'pinyin': 'rén'},
    '氵': {'name': 'Bộ Thủy', 'meaning': 'nước, dòng chảy', 'hanviet': 'Thủy', 'pinyin': 'shuǐ'},
    '扌': {'name': 'Bộ Thủ', 'meaning': 'bàn tay', 'hanviet': 'Thủ', 'pinyin': 'shǒu'},
    '忄': {'name': 'Bộ Tâm', 'meaning': 'trái tim, tình cảm', 'hanviet': 'Tâm', 'pinyin': 'xīn'},
    '讠': {'name': 'Bộ Ngôn', 'meaning': 'lời nói, ngôn ngữ', 'hanviet': 'Ngôn', 'pinyin': 'yán'},
    '饣': {'name': 'Bộ Thực', 'meaning': 'thức ăn', 'hanviet': 'Thực', 'pinyin': 'shí'},
    '纟': {'name': 'Bộ Mịch', 'meaning': 'sợi tơ', 'hanviet': 'Mịch', 'pinyin': 'mì'},
    '钅': {'name': 'Bộ Kim', 'meaning': 'kim loại', 'hanviet': 'Kim', 'pinyin': 'jīn'},
    '阝': {'name': 'Bộ Phụ/Ấp', 'meaning': 'gò đất / vùng đất', 'hanviet': 'Phụ/Ấp', 'pinyin': 'fù'},
    '犭': {'name': 'Bộ Khuyển', 'meaning': 'loài thú', 'hanviet': 'Khuyển', 'pinyin': 'quǎn'},
    '艹': {'name': 'Bộ Thảo', 'meaning': 'cỏ cây, hoa lá', 'hanviet': 'Thảo', 'pinyin': 'cǎo'},
    '⺍': {'name': 'Bộ Quang', 'meaning': 'ba chấm đầu', 'hanviet': 'Quang', 'pinyin': 'guāng'},
    '冖': {'name': 'Bộ Mịch', 'meaning': 'khăn phủ, trùm lên', 'hanviet': 'Mịch', 'pinyin': 'mì'},
}

MANUAL_DECOMP_OVERRIDES = {
    '不': [
        {'char': '一', 'name': 'Bộ Nhất', 'meaning': 'một', 'is_radical': True, 'kangxi_id': 1},
        {'char': '丨', 'name': 'Bộ Cổn', 'meaning': 'nét sổ', 'is_radical': True, 'kangxi_id': 2}
    ],
    '客': [
        {'char': '宀', 'name': 'Bộ Miên', 'meaning': 'mái nhà', 'is_radical': True, 'kangxi_id': 40},
        {'char': '口', 'name': 'Bộ Khẩu', 'meaning': 'miệng', 'is_radical': True, 'kangxi_id': 30}
    ]
}

def parse_ids(s):
    if not s or s == '？':
        return None
    pos = 0
    def parse_node():
        nonlocal pos
        if pos >= len(s):
            return None
        ch = s[pos]
        pos += 1
        if ch in BINARY_IDC:
            left = parse_node()
            right = parse_node()
            children = [c for c in [left, right] if c is not None]
            return {'idc': ch, 'children': children}
        elif ch in TERNARY_IDC:
            c1 = parse_node()
            c2 = parse_node()
            c3 = parse_node()
            children = [c for c in [c1, c2, c3] if c is not None]
            return {'idc': ch, 'children': children}
        else:
            return {'char': ch}
    return parse_node()

def get_leaf_by_path(tree, path):
    curr = tree
    for step in path:
        if curr and 'children' in curr and step < len(curr['children']):
            curr = curr['children'][step]
        else:
            return None
    return curr

def load_kangxi_radicals():
    kangxi = {}
    for path in sorted(glob.glob(str(KANGXI_DIR / '*.json'))):
        with open(path, 'r', encoding='utf-8') as f:
            for item in json.load(f):
                for v in item.get('variants', []):
                    kangxi[v] = item
    for path in sorted(glob.glob(str(KANGXI_DIR / '*.json'))):
        with open(path, 'r', encoding='utf-8') as f:
            for item in json.load(f):
                kangxi[item['radical']] = item
    for k, v in RADICAL_ALIASES.items():
        if v in kangxi and k not in kangxi:
            kangxi[k] = kangxi[v]
    return kangxi

def load_hanviet():
    dict_file = ROOT / 'assets/js/hanviet-dict.js'
    if not dict_file.exists():
        return {}
    with open(dict_file, 'r', encoding='utf-8') as f:
        content = f.read()
    m = re.search(r'const HANVIET_CHARS\s*=\s*(\{.*?\});', content, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    return {}

def iter_vocab_items():
    """Every word entry in the HSK 2.0 and HSK 3.0 vocab files (unreadable files are skipped)."""
    files = list(VOCAB_DIR.glob('*.json')) + list((VOCAB_DIR / 'hsk3_0').glob('*.json'))
    for f in files:
        if not f.is_file():
            continue
        try:
            with open(f, 'r', encoding='utf-8') as fp:
                data = json.load(fp)
        except Exception:
            continue
        if isinstance(data, list):
            yield from data

def load_vocab_meanings():
    meanings = {}
    pinyins = {}
    for item in iter_vocab_items():
        hz = item.get('hanzi', '')
        if len(hz) == 1:
            if hz not in meanings and item.get('meaning'):
                meanings[hz] = item['meaning']
            if hz not in pinyins and item.get('pinyin'):
                pinyins[hz] = item['pinyin']
    return meanings, pinyins

def get_all_hsk_characters():
    unique_chars = set()
    for item in iter_vocab_items():
        for c in item.get('hanzi', ''):
            if '\u4e00' <= c <= '\u9fff':
                unique_chars.add(c)
    return unique_chars

def get_makemeahanzi_entries():
    CACHE_DICT.parent.mkdir(parents=True, exist_ok=True)
    entries = {}
    with open(CACHE_DICT, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    e = json.loads(line)
                    ch = e.get('character')
                    if ch:
                        entries[ch] = e
                except Exception:
                    pass
    return entries

def build_decomposition_database():
    print('Starting character decomposition build...')
    kangxi = load_kangxi_radicals()
    hanviet = load_hanviet()
    vocab_meanings, vocab_pinyins = load_vocab_meanings()
    hsk_chars = get_all_hsk_characters()

    raw_dict = get_makemeahanzi_entries()
    database = {}

    for ch in sorted(hsk_chars):
        entry = raw_dict.get(ch, {})
        decomp_str = entry.get('decomposition', '')
        radical_char = entry.get('radical', '')
        matches = entry.get('matches', [])
        pinyin_list = entry.get('pinyin', [])
        char_pinyin = pinyin_list[0] if pinyin_list else vocab_pinyins.get(ch, '')
        char_hv = hanviet.get(ch, '')
        char_meaning = vocab_meanings.get(ch, '')

        target_rad = radical_char
        if target_rad in RADICAL_ALIASES:
            target_rad = RADICAL_ALIASES[target_rad]
        kangxi_rad = kangxi.get(radical_char) or kangxi.get(target_rad) or kangxi.get(ch)

        # 1. Check if character itself is a Kangxi radical or in override
        is_self_radical = (ch in kangxi) and (radical_char == ch or '？' in decomp_str or decomp_str == '？')

        components = []
        if ch in MANUAL_DECOMP_OVERRIDES:
            components = list(MANUAL_DECOMP_OVERRIDES[ch])
        elif is_self_radical:
            k = kangxi[ch]
            components = [{
                'char': ch,
                'name': k.get('name', f'Bộ {ch}'),
                'meaning': k.get('meaning', ''),
                'pinyin': char_pinyin or k.get('pinyin', ''),
                'hanviet': char_hv,
                'stroke_count': k.get('stroke_count', len(matches)),
                'stroke_indices': list(range(len(matches))),
                'is_radical': True,
                'kangxi_id': k.get('id', 0)
            }]
        else:
            tree = parse_ids(decomp_str)
            if tree and 'idc' in tree:
                # Match strokes to leaf nodes
                leaf_stroke_map = {}
                if matches:
                    for s_idx, m in enumerate(matches):
                        if m is not None:
                            leaf = get_leaf_by_path(tree, m)
                            if leaf and 'char' in leaf:
                                leaf_id = id(leaf)
                                if leaf_id not in leaf_stroke_map:
                                    leaf_stroke_map[leaf_id] = {'char': leaf['char'], 'strokes': []}
                                leaf_stroke_map[leaf_id]['strokes'].append(s_idx)

                def extract_leaves(node):
                    if not node:
                        return []
                    if 'char' in node:
                        return [node]
                    res = []
                    for child in node.get('children', []):
                        res.extend(extract_leaves(child))
                    return res

                leaves = extract_leaves(tree)
                for leaf in leaves:
                    comp_char = leaf.get('char', '')
                    if not comp_char or comp_char in '？':
                        continue
                    strokes = leaf_stroke_map.get(id(leaf), {}).get('strokes', [])
                    k_info = kangxi.get(comp_char) or kangxi.get(RADICAL_ALIASES.get(comp_char, ''))
                    override = COMMON_COMPONENT_NAMES.get(comp_char, {})

                    comp_name = ''
                    comp_meaning = ''
                    comp_py = override.get('pinyin') or vocab_pinyins.get(comp_char, '')
                    comp_hv = override.get('hanviet') or hanviet.get(comp_char, '')

                    if k_info:
                        comp_name = k_info.get('name', f'Bộ {comp_hv or comp_char}')
                        comp_meaning = k_info.get('meaning', '')
                        if not comp_py:
                            comp_py = k_info.get('pinyin', '')
                        if not comp_hv:
                            comp_hv = hanviet.get(k_info.get('radical', ''), '')
                    elif override:
                        comp_name = override.get('name', f'Bộ {comp_hv or comp_char}')
                        comp_meaning = override.get('meaning', '')
                    else:
                        comp_name = f'Bộ {comp_hv}' if comp_hv else comp_char
                        comp_meaning = vocab_meanings.get(comp_char, '')

                    components.append({
                        'char': comp_char,
                        'name': comp_name,
                        'meaning': comp_meaning,
                        'pinyin': comp_py,
                        'hanviet': comp_hv,
                        'stroke_count': len(strokes),
                        'stroke_indices': sorted(strokes),
                        'is_radical': bool(k_info),
                        'kangxi_id': k_info.get('id', 0) if k_info else 0
                    })

            if not components:
                # Fallback to character itself
                k = kangxi.get(ch)
                components = [{
                    'char': ch,
                    'name': k.get('name', f'Bộ {char_hv or ch}') if k else f'Chữ {char_hv or ch}',
                    'meaning': k.get('meaning', char_meaning) if k else char_meaning,
                    'pinyin': char_pinyin,
                    'hanviet': char_hv,
                    'stroke_count': len(matches),
                    'stroke_indices': list(range(len(matches))),
                    'is_radical': bool(k),
                    'kangxi_id': k.get('id', 0) if k else 0
                }]

        # Build clean formula
        if len(components) == 1 and components[0]['char'] == ch:
            formula = f"{ch} ({components[0]['name']})"
        else:
            comp_strs = [f"{c['char']} ({c['name'].replace('Bộ ', '')})" for c in components]
            formula = f"{ch} = {' + '.join(comp_strs)}"

        database[ch] = {
            'character': ch,
            'pinyin': char_pinyin,
            'hanviet': char_hv,
            'components': components,
            'formula': formula
        }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(database, f, ensure_ascii=False, indent=2)

    print(f'Successfully rebuilt decomposition database for {len(database)} characters!')

if __name__ == '__main__':
    build_decomposition_database()
