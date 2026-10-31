#!/usr/bin/env python3
"""Build an enhanced sentence bank for the sentence-ordering minigame.

Reads database/vocabs/hsk*.json and database/vocabs/topics/*.json,
segments example sentences into words with jieba, attaches punctuation,
classifies HSK levels, detects grammar points, and generates smart distractors
for HSK 4-6 to test grammar understanding.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import jieba
from pypinyin import Style, pinyin

REPO_ROOT = Path(__file__).resolve().parents[1]
VOCAB_DIR = REPO_ROOT / "database" / "vocabs"
OUTPUT_PATH = VOCAB_DIR / "sentence_bank.json"
TAG_RE = re.compile(r"</?u>")
END_PUNCT = "。！？!? \t\n\r"

GRAMMAR_PATTERNS = [
    (r"把", "Câu chữ 把 (S + 把 + O + V + Bổ ngữ)"),
    (r"被", "Câu chữ 被 (S + 被 + Tác nhân + V)"),
    (r"连.+?(都|也)", "Cấu trúc 连...都/也... (Nhấn mạnh)"),
    (r"越来越|越.+?越", "Cấu trúc 越来越 / 越...越... (Mức độ tăng tiến)"),
    (r"虽然.+?但是|尽管.+?还是", "Cặp liên từ chuyển tiếp (Mặc dù... nhưng...)"),
    (r"(不但|不仅).+?(而且|还|也)", "Cặp liên từ tăng tiến (Không những... mà còn...)"),
    (r"因为.+?所以|由于.+?因此", "Cặp liên từ nhân quả (Bởi vì... cho nên...)"),
    (r"如果.+?就|要是.+?就|假如.+?就", "Cặp liên từ giả thiết (Nếu... thì...)"),
    (r"只要.+?就", "Cặp liên từ điều kiện đủ (Chỉ cần... là...)"),
    (r"只有.+?才", "Cặp liên từ điều kiện cần (Chỉ có... mới...)"),
    (r"既然.+?就", "Cặp liên từ nhân quả lập luận (Đã... thì...)"),
    (r"即使.+?也|哪怕.+?也", "Cặp liên từ nhượng bộ (Cho dù... cũng...)"),
    (r"比", "Cấu trúc so sánh chữ 比"),
    (r"是.+?的", "Cấu trúc nhấn mạnh 是...的"),
    (r"得", "Bổ ngữ trạng thái / khả năng với 得"),
    (r"地", "Trạng ngữ chỉ phương thức với 地"),
    (r"让|叫|使|请", "Câu kiêm ngữ (Cho phép / Sai khiến / Yêu cầu)"),
    (r"(很|非常|十分|特别|真|挺)[^，。！？]+", "Cấu trúc vị ngữ miêu tả trạng thái"),
    (r"(应该|必须|需要|能够|愿意|敢|肯)", "Cấu trúc động từ năng nguyện (Trợ động từ)"),
    (r"(向|往|朝|替|为|给|关于).+?[^，。！？]+", "Cấu trúc trạng ngữ giới từ"),
    (r"(完|见|懂|开|错|清楚|到|上|下|进|出|回|过|起|来|去)[，。！？]", "Cấu trúc bổ ngữ kết quả / xu hướng"),
]

DISTRACTOR_RULES = [
    ("把", ["被", "让"]),
    ("被", ["把", "叫"]),
    ("的", ["地", "得"]),
    ("地", ["的", "得"]),
    ("得", ["的", "地"]),
    ("向", ["往"]),
    ("往", ["向", "朝"]),
    ("对", ["对于"]),
    ("关于", ["对于"]),
    ("虽然", ["尽管", "即使"]),
    ("但是", ["而且", "反而"]),
    ("不仅", ["除了"]),
    ("不但", ["除了"]),
    ("因为", ["因此", "由于"]),
    ("所以", ["因而", "因此"]),
    ("如果", ["即使", "只要"]),
    ("只要", ["只有"]),
    ("只有", ["只要"]),
    ("已经", ["曾经"]),
    ("刚才", ["刚刚"]),
    ("再", ["又"]),
    ("又", ["再"]),
    ("就", ["才"]),
    ("才", ["就"]),
    ("比", ["跟", "像"]),
    ("连", ["甚至"]),
    ("着", ["了", "过"]),
    ("过", ["着", "了"]),
    ("了", ["过", "着"]),
]

HIGH_LEVEL_FALLBACK_DISTRACTORS = {
    4: ["很", "也", "都", "常", "真", "再", "就", "更", "太", "还", "却", "正"],
    5: ["甚至", "究竟", "难道", "果然", "居然", "何必", "未免", "索性", "倒", "并", "反而", "总算"],
    6: ["毫无", "未免", "势必", "难免", "姑且", "固然", "暂且", "充其量", "鉴于", "索性", "分外", "格外"],
}


def strip_tags(text: str) -> str:
    return TAG_RE.sub("", text or "").strip()


def tokenize(sentence: str) -> list[str]:
    clean = sentence.rstrip(END_PUNCT)
    raw_tokens = [tok for tok in jieba.cut(clean) if tok.strip()]
    merged: list[str] = []
    for tok in raw_tokens:
        if tok in "，,、:：;；" and merged:
            merged[-1] += tok
        else:
            merged.append(tok)
    return merged


def pinyin_for(token: str) -> str:
    clean_tok = token.rstrip("，,、:：;；")
    syllables = pinyin(clean_tok, style=Style.TONE, strict=False)
    return "".join(s[0] for s in syllables)


def detect_grammar_point(sentence: str) -> str | None:
    for regex, label in GRAMMAR_PATTERNS:
        if re.search(regex, sentence):
            return label
    return None


def generate_distractors(tokens: list[str], level_num: int) -> list[str]:
    if level_num < 4:
        return []
    tok_set = set(t.rstrip("，,、:：;；") for t in tokens)
    distractors: list[str] = []
    for trigger, cands in DISTRACTOR_RULES:
        if trigger in tok_set:
            for c in cands:
                if c not in tok_set and c not in distractors:
                    distractors.append(c)
                    if len(distractors) >= 2:
                        return distractors

    fallbacks = HIGH_LEVEL_FALLBACK_DISTRACTORS.get(level_num, HIGH_LEVEL_FALLBACK_DISTRACTORS[4])
    for f in fallbacks:
        if f not in tok_set and f not in distractors:
            distractors.append(f)
            if len(distractors) >= (2 if level_num >= 5 else 1):
                break
    return distractors


def build_entries(vocab_path: Path, source: str, level_num: int) -> list[dict]:
    words = json.loads(vocab_path.read_text(encoding="utf-8"))
    seen: set[str] = set()
    entries = []
    idx = 0
    for word in words:
        raw_zh = word.get("example_zh")
        raw_vi = word.get("example_vi")
        raw_py = word.get("example_py")
        if not raw_zh or not raw_vi:
            continue
        sentence = strip_tags(raw_zh)
        if sentence in seen:
            continue
        seen.add(sentence)
        tokens = tokenize(sentence)
        if len(tokens) < 3:
            continue

        idx += 1
        distractors = generate_distractors(tokens, level_num)
        grammar = detect_grammar_point(sentence)
        if not grammar:
            if "，" in sentence or "," in sentence:
                grammar = "Câu ghép / Liên kết mệnh đề"
            else:
                grammar = "Cấu trúc câu đơn S + V + O"

        entries.append({
            "id": f"s_{source}_{idx:04d}",
            "level": source,
            "level_num": level_num,
            "zh_tokens": tokens,
            "pinyin_tokens": [pinyin_for(tok) for tok in tokens],
            "sentence_zh": sentence,
            "sentence_py": strip_tags(raw_py),
            "meaning": strip_tags(raw_vi),
            "grammar_point": grammar,
            "distractors": distractors,
            "distractor_pinyins": [pinyin_for(d) for d in distractors],
            "source": source,
        })
    return entries


def main() -> None:
    all_entries: list[dict] = []

    for level_num in range(1, 7):
        path = VOCAB_DIR / f"hsk{level_num}_vocabularies.json"
        if path.exists():
            all_entries.extend(build_entries(path, f"hsk{level_num}", level_num))

    topics_dir = VOCAB_DIR / "topics"
    if topics_dir.exists():
        for topic_path in sorted(topics_dir.glob("*.json")):
            all_entries.extend(build_entries(topic_path, f"topic_{topic_path.stem}", 4))

    OUTPUT_PATH.write_text(
        json.dumps(all_entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(all_entries)} enhanced sentences to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
