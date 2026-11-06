#!/usr/bin/env python3
"""Build a "guess the word" (emoji) game bank from existing vocab files.

Only words with a clear, curated emoji mapping (EMOJI_MAP below) are
included. Reads every database/vocabs/hsk*.json and
database/vocabs/topics/*.json, and writes
database/vocabs/guess_word_bank.json with one entry per matched word:
{ emoji, hanzi, pinyin, meaning }
"""

from __future__ import annotations

from vocab_bank import VOCAB_DIR, build_bank
OUTPUT_PATH = VOCAB_DIR / "guess_word_bank.json"

# Curated hanzi -> emoji mapping. Only words with an unambiguous visual
# match are included; add more here as new vocab decks are built.
EMOJI_MAP = {
    "爸爸": "👨", "妈妈": "👩", "儿子": "👦", "女儿": "👧",
    "猫": "🐱", "狗": "🐶",
    "杯子": "🥤", "茶": "🍵", "水": "💧", "米饭": "🍚", "苹果": "🍎", "水果": "🍉",
    "书": "📖", "字": "🔤", "桌子": "🪑", "椅子": "🪑",
    "电脑": "💻", "电视": "📺", "电影": "🎬", "飞机": "✈️", "出租车": "🚕",
    "医院": "🏥", "医生": "🧑‍⚕️", "学校": "🏫", "商店": "🏬", "饭店": "🏨",
    "衣服": "👕", "钱": "💰",
    "太阳": "☀️", "下雨": "🌧️", "冷": "🥶", "热": "🥵",
    "中国": "🇨🇳", "北京": "🏯",
    "月": "🌙", "年": "📅",
    "笑": "😄", "哭": "😢",
    "手机": "📱", "软件": "💾", "硬件": "🖥️",
}


def make_entry(word: dict, source: str) -> dict | None:
    hanzi = word.get("hanzi")
    emoji = EMOJI_MAP.get(hanzi)
    if not emoji:
        return None
    return {
        "emoji": emoji,
        "hanzi": hanzi,
        "pinyin": word.get("pinyin"),
        "meaning": word.get("meaning"),
        "source": source,
    }


def main() -> None:
    build_bank(make_entry, OUTPUT_PATH)


if __name__ == "__main__":
    main()
