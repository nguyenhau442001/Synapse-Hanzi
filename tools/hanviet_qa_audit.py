#!/usr/bin/env python3
"""
tools/hanviet_qa_audit.py
Audit and fix suspicious Sino-Vietnamese (Hán - Việt) readings in 汉字思维 (Hanzi Mind) dataset.

Reviewed & corrected suspicious cases:
- 听: [Dẫn] -> [Thính]
- 号: [Gào] -> [Hiệu]
- 儿: [Nhân] -> [Nhi] (especially erhua / child context)
- 哪儿: [Nả Nhân] -> [Nả Nhi]
- 儿子: [Nhân Tử] -> [Nhi Tử]
- 女儿: [Nữ Nhi/nữ Nhân] -> [Nữ Nhi]
- 一点儿 / 一会儿: [Nhất Điểm/Hội Nhân] -> [Nhất Điểm/Hội Nhi]
- 号码 / 挂号 / 称号 / 账号: [* Gào] -> [* Hiệu]
- 倾听 / 动听 / 听众: [* Dẫn] -> [* Thính]
"""

import json
import os
import re
import sys
import glob

CHAR_FIXES = {
    "听": ("Dẫn", "Thính"),
    "号": ("Gào", "Hiệu"),
    "儿": ("Nhân", "Nhi"),
}

WORD_FIXES = {
    "听": "Thính",
    "倾听": "Khuynh Thính",
    "动听": "Động Thính",
    "打听": "Đả Thính",
    "听众": "Thính Chúng",
    "好听": "Hảo Thính",
    "听说": "Thính Thuyết",
    "号": "Hiệu",
    "号码": "Hiệu Mã",
    "挂号": "Quải Hiệu",
    "称号": "Xưng Hiệu",
    "信号": "Tín Hiệu",
    "账号": "Trướng Hiệu",
    "儿子": "Nhi Tử",
    "女儿": "Nữ Nhi",
    "哪儿": "Nả Nhi",
    "一点儿": "Nhất Điểm Nhi",
    "一会儿": "Nhất Hội Nhi",
    "干活儿": "Can Hoạt Nhi",
    "使劲儿": "Sử Kình Nhi",
    "幼儿园": "Ấu Nhi Viên",
    "婴儿": "Anh Nhi",
    "墨水儿": "Mặc Thuỷ Nhi",
    "纳闷儿": "Nạp Muộn Nhi",
    "纽扣儿": "Nữu Khấu Nhi",
    "玩意儿": "Ngoạn Ý Nhi",
    "馅儿": "Hãm Nhi",
    "心眼儿": "Tâm Nhãn Nhi",
    "儿童": "Nhi Đồng",
    "花儿": "Hoa Nhi",
    "鸟儿": "Điểu Nhi"
}

def audit_and_fix_dict(dict_path, apply_changes=False):
    with open(dict_path, "r", encoding="utf-8") as f:
        content = f.read()

    modified = False
    report = []

    # 1. Update CHAR entries
    chars_idx = content.find("const HANVIET_CHARS =")
    if chars_idx != -1:
        chars_part = content[chars_idx:]
        prefix_part = content[:chars_idx]

        for char, (old_hv, new_hv) in CHAR_FIXES.items():
            pattern = f'"{char}": "{old_hv}"'
            replacement = f'"{char}": "{new_hv}"'
            if pattern in chars_part:
                report.append(f"[hanviet-dict CHAR] '{char}': '{old_hv}' -> '{new_hv}'")
                chars_part = chars_part.replace(pattern, replacement)
                modified = True

        content = prefix_part + chars_part

    # 2. Ensure compound entries in HANVIET_COMPOUNDS
    compounds_match = re.search(r'const HANVIET_COMPOUNDS = \{(.*?)\};', content, re.DOTALL)
    if compounds_match:
        comp_str = compounds_match.group(1)
        for hz, correct_hv in WORD_FIXES.items():
            entry_pattern = rf'"{re.escape(hz)}":\s*"([^"]+)"'
            match = re.search(entry_pattern, comp_str)
            if match:
                current_val = match.group(1)
                if current_val != correct_hv:
                    report.append(f"[hanviet-dict COMPOUND] '{hz}': '{current_val}' -> '{correct_hv}'")
                    comp_str = re.sub(entry_pattern, f'"{hz}": "{correct_hv}"', comp_str)
                    modified = True
            else:
                # Add compound to the beginning of the dictionary
                report.append(f"[hanviet-dict ADD COMPOUND] '{hz}': '{correct_hv}'")
                comp_str = f'"{hz}": "{correct_hv}", ' + comp_str
                modified = True

        new_compounds_def = f'const HANVIET_COMPOUNDS = {{{comp_str}}};'
        content = re.sub(r'const HANVIET_COMPOUNDS = \{.*?\};', new_compounds_def, content, flags=re.DOTALL)

    if apply_changes and modified:
        with open(dict_path, "w", encoding="utf-8") as f:
            f.write(content)

    return report

def audit_and_fix_vocabs(vocab_files, apply_changes=False):
    report = []
    for fpath in vocab_files:
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)

        modified = False
        for item in data:
            hz = item.get("hanzi", "")
            current_hv = item.get("hanviet", "")

            # Specific check for fixes
            new_hv = None
            if hz in WORD_FIXES:
                if current_hv != WORD_FIXES[hz]:
                    new_hv = WORD_FIXES[hz]
            elif "听" in hz and "Dẫn" in current_hv:
                new_hv = current_hv.replace("Dẫn", "Thính")
            elif "号" in hz and "Gào" in current_hv:
                new_hv = current_hv.replace("Gào", "Hiệu")
            elif "儿" in hz and "Nhân" in current_hv:
                new_hv = current_hv.replace("Nhân", "Nhi")

            if new_hv and new_hv != current_hv:
                report.append(f"[{os.path.basename(fpath)}] ID {item.get('id')} '{hz}': '{current_hv}' -> '{new_hv}'")
                item["hanviet"] = new_hv
                modified = True

        if apply_changes and modified:
            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

    return report

def audit_and_fix_readings(reading_files, apply_changes=False):
    report = []
    for fpath in reading_files:
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)

        modified = False
        sentences = data.get("sentences", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
        for s in sentences:
            tokens = s.get("tokens", [])
            for tok in tokens:
                txt = tok.get("text", "")
                current_hv = tok.get("hanviet", "")
                new_hv = None

                if txt in WORD_FIXES:
                    if current_hv != WORD_FIXES[txt]:
                        new_hv = WORD_FIXES[txt]
                elif "听" in txt and "Dẫn" in current_hv:
                    new_hv = current_hv.replace("Dẫn", "Thính")
                elif "号" in txt and "Gào" in current_hv:
                    new_hv = current_hv.replace("Gào", "Hiệu")
                elif "儿" in txt and "Nhân" in current_hv:
                    new_hv = current_hv.replace("Nhân", "Nhi")

                if new_hv and new_hv != current_hv:
                    report.append(f"[{os.path.basename(fpath)}] Token '{txt}': '{current_hv}' -> '{new_hv}'")
                    tok["hanviet"] = new_hv
                    modified = True

        if apply_changes and modified:
            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

    return report

def audit_and_fix_hsk4_reading(hsk4_reading_path, apply_changes=False):
    report = []
    if not os.path.exists(hsk4_reading_path):
        return report

    with open(hsk4_reading_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    modified = False
    for item in (data if isinstance(data, list) else data.get("sentences", [])):
        # Check token / breakdown if present
        for tok in item.get("tokens", []):
            txt = tok.get("text", "")
            current_hv = tok.get("hanviet", "")
            new_hv = None
            if txt in WORD_FIXES:
                if current_hv != WORD_FIXES[txt]:
                    new_hv = WORD_FIXES[txt]
            elif "听" in txt and "Dẫn" in current_hv:
                new_hv = current_hv.replace("Dẫn", "Thính")
            elif "号" in txt and "Gào" in current_hv:
                new_hv = current_hv.replace("Gào", "Hiệu")
            elif "儿" in txt and "Nhân" in current_hv:
                new_hv = current_hv.replace("Nhân", "Nhi")

            if new_hv and new_hv != current_hv:
                report.append(f"[hsk4_reading_analysis Token] '{txt}': '{current_hv}' -> '{new_hv}'")
                tok["hanviet"] = new_hv
                modified = True

    if apply_changes and modified:
        with open(hsk4_reading_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    return report

def main():
    apply_mode = "--apply" in sys.argv
    print(f"=== 汉字思维 (Hanzi Mind) Sino-Vietnamese (Hán - Việt) QA Audit (apply={apply_mode}) ===")

    dict_path = "assets/js/hanviet-dict.js"
    vocab_files = glob.glob("database/vocabs/*.json") + glob.glob("database/vocabs/topics/*.json")
    # exclude sentence bank which may not have hanviet field or is huge
    vocab_files = [f for f in vocab_files if not f.endswith("sentence_bank.json")]
    reading_files = glob.glob("database/readings/*/*.json")
    hsk4_reading_file = "database/reading/hsk4_reading_analysis.json"

    dict_report = audit_and_fix_dict(dict_path, apply_changes=apply_mode)
    vocab_report = audit_and_fix_vocabs(vocab_files, apply_changes=apply_mode)
    reading_report = audit_and_fix_readings(reading_files, apply_changes=apply_mode)
    hsk4_report = audit_and_fix_hsk4_reading(hsk4_reading_file, apply_changes=apply_mode)

    all_reports = dict_report + vocab_report + reading_report + hsk4_report
    print(f"\nTotal suspicious entries detected/reviewed: {len(all_reports)}")
    for r in all_reports[:30]:
        print("  *", r)
    if len(all_reports) > 30:
        print(f"  ... and {len(all_reports) - 30} more entries.")

    if not apply_mode:
        print("\n[INFO] Dry-run completed. Re-run with --apply to write changes.")
    else:
        print("\n[SUCCESS] Applied fixes cleanly without altering schemas or IDs.")

if __name__ == "__main__":
    main()
