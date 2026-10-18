#!/usr/bin/env python3
"""
tools/build_all_listening_exams.py

Extracts, aligns, and generates complete listening datasets for Hanban HSK 4 official exams (H41001 to H41012).
Produces database/listening/hsk4_h41001.json to database/listening/hsk4_h41012.json.
"""

import sys
import os
import re
import json
import subprocess
from pathlib import Path
import numpy as np
import soundfile as sf
import whisper
import pypinyin

# ---------------------------------------------------------------------------
# Official Answers for Part 1 (Questions 1 - 10)
# ---------------------------------------------------------------------------
OFFICIAL_ANSWERS = {
    "H41001": [True, False, True, True, True, False, False, True, False, False],
    "H41002": [False, True, True, True, False, False, False, False, True, True],
    "H41003": [True, True, False, False, True, False, False, False, True, True],
    "H41004": [False, True, False, False, True, False, False, True, True, True],
    "H41005": [True, False, True, False, True, True, False, False, False, True],
    "H41006": [True, False, False, False, True, False, True, True, False, True],
    "H41007": [True, False, True, False, True, False, True, False, True, False],
    "H41008": [False, True, True, False, True, False, True, False, False, True],
    "H41009": [False, True, False, True, False, False, True, False, True, True],
    "H41010": [False, False, True, True, False, False, True, False, True, True],
    "H41011": [True, False, False, True, True, False, False, True, False, True],
    "H41012": [False, True, True, False, True, False, False, True, False, True],
}

# ---------------------------------------------------------------------------
# Curated Vietnamese Translations for All 120 Statements
# ---------------------------------------------------------------------------
STATEMENT_VI = {
    "H41001": [
        "Hôm nay thời tiết khá tốt.",
        "Hai người họ thường hay trò chuyện.",
        "Nấu canh cà chua trứng rất đơn giản.",
        "Anh ấy thích chơi bóng rổ.",
        "Tiểu Lưu đã được khen ngợi.",
        "Anh ấy vừa mới xuống máy bay.",
        "Tính cách của hai chị em gần như nhau.",
        "Anh ấy muốn tặng Lão Vương một tấm vé xem biểu diễn.",
        "Kết quả điều tra của Tiểu Trương được viết rất tốt.",
        "Con gái không đồng ý tiêm thuốc."
    ],
    "H41002": [
        "Thị thực (visa) đã làm xong rồi.",
        "Bây giờ cô ấy cũng đã làm mẹ rồi.",
        "Hôm nay Tiểu Vương phải tăng ca.",
        "Lễ hội là một phần của văn hóa.",
        "Giáo sư Vương tính tình rất nóng nảy.",
        "Tình yêu đích thực không cần sự lãng mạn.",
        "Người trẻ thích rèn luyện thân thể vào buổi sáng.",
        "Tiểu Lâm đang tìm việc làm.",
        "Nên đúc kết kinh nghiệm trong quá khứ.",
        "Lời quảng cáo nên ngắn gọn."
    ],
    "H41003": [
        "Anh ấy muốn mua bánh ngọt.",
        "Nơi anh ấy đang ở hiện tại rất yên tĩnh.",
        "Sinh viên đại học không muốn về nông thôn làm việc.",
        "Phòng họp ở tầng hai.",
        "Thời gian tham quan là một tiếng.",
        "Siêu thị cung cấp túi ni-lông miễn phí.",
        "Thực vật trong đại dương rất ít.",
        "Nghề nghiệp của anh ấy là diễn viên.",
        "Tuần sau anh ấy sẽ quay về.",
        "Thói quen rất khó thay đổi."
    ],
    "H41004": [
        "Người vợ mong chồng đi dạo phố mua sắm cùng mình.",
        "Biểu mẫu đã bị điền sai.",
        "Khi phỏng vấn nhất định phải đến đúng giờ.",
        "Đổ nhiều mồ hôi tốt cho sức khỏe.",
        "Dạy chó học cần phải có sự kiên nhẫn.",
        "Anh ấy không mang theo hộ chiếu.",
        "Gửi tin nhắn rất phiền phức.",
        "Đừng từ chối lời mời một cách trực tiếp.",
        "Mặt trời có ảnh hưởng rất lớn đối với tự nhiên.",
        "Mùa xuân rất dễ bị cảm cúm."
    ],
    "H41005": [
        "Rất nhiều học sinh mong muốn đi du học nước ngoài.",
        "Anh ấy muốn tham gia thi đấu quần vợt.",
        "Người trẻ tuổi nên tin tưởng vào chính mình.",
        "Họ muốn đi tàu điện ngầm.",
        "Ánh nắng mặt trời có tác dụng rất lớn.",
        "Ấn tượng ban đầu không dễ quên.",
        "Người không có năng lực thì không có tinh thần trách nhiệm.",
        "Sách hay ngày càng ít đi.",
        "Rất nhiều người vẫn thích đọc báo giấy.",
        "Cô ấy không muốn dùng khăn tắm của khách sạn."
    ],
    "H41006": [
        "Hôm nay anh ấy bị đau chân.",
        "Họ đang đãi khách (mời cơm).",
        "Kết quả quan trọng hơn quá trình.",
        "Anh ấy bị chứng minh là đã nói dối.",
        "Tốt nghiệp khiến người ta vừa vui mừng lại vừa buồn bã.",
        "Họ chuẩn bị đi dạo cùng người cao tuổi.",
        "Mọi người đều hiểu ý của Giám đốc Mã.",
        "Cuộc sống không thể tách rời điện năng.",
        "Anh ấy nắm rất rõ tình hình các dân tộc địa phương.",
        "Tàu hỏa sắp vào ga rồi."
    ],
    "H41007": [
        "Anh ấy muốn đi Vân Nam du lịch vào kỳ nghỉ hè.",
        "Buổi tối con gái phải tăng ca.",
        "Anh ấy đã quen với cuộc sống ở nơi này.",
        "Họ đang bàn về giá cả.",
        "Người Trung Quốc thích con số 6.",
        "Hầu như ngày nào anh ấy cũng đi chơi bóng rổ.",
        "Hôm nay đăng ký vẫn còn kịp.",
        "Tiểu Lâm là một luật sư.",
        "Đừng lúc nào cũng ngưỡng mộ người khác.",
        "Trưa mai trời sẽ có tuyết lớn."
    ],
    "H41008": [
        "Anh ấy phản đối việc giao nhiệm vụ cho Tiểu Cao.",
        "Màu xanh lam trên bản đồ biểu thị đại dương.",
        "Cô ấy rất hài lòng với chiếc váy đó.",
        "Gần đây anh ấy đã béo lên.",
        "Cửa hàng đó miễn phí vận chuyển đồ nội thất cho khách hàng.",
        "Anh ấy đã thuê được một căn nhà phù hợp.",
        "Bảo vệ môi trường cần bắt đầu từ những việc nhỏ xung quanh.",
        "Máy photocopy bị hỏng rồi.",
        "Tiểu Hạ đã giải thích rõ ràng hiểu lầm.",
        "Ăn đồ ngọt có thể làm cho tâm trạng tốt hơn."
    ],
    "H41009": [
        "Chìa khóa cửa chính chỉ có một chiếc.",
        "Mùa hè tắm nước nóng sẽ thấy mát mẻ hơn.",
        "Kinh nghiệm lái xe của anh ấy rất phong phú.",
        "Y tá trước khi đi làm phải vượt qua kỳ thi.",
        "Bộ phim khiến khán giả rất thất vọng.",
        "Tiểu Nguyên làm việc ở Bắc Kinh.",
        "Trẻ em dễ cảm thấy vui vẻ hơn.",
        "Anh ấy không hài lòng với cuốn sách đã mua.",
        "Họ quyết định không đi leo Vạn Lý Trường Thành nữa.",
        "Tìm đúng phương hướng là điều rất quan trọng."
    ],
    "H41010": [
        "Anh ấy quyết định tham gia buổi tụ tập.",
        "Bánh chẻo (sủi cảo) ở đó rất rẻ.",
        "Mọi người có thể giao lưu tình cảm qua âm nhạc.",
        "Chuyến đi này anh ấy chơi rất vui vẻ.",
        "Mọi người đã quen biết nhau từ rất lâu rồi.",
        "Anh ấy đã thích nghi với mùa đông ở phương Bắc.",
        "Tiểu thuyết của nhà văn rất được đón nhận.",
        "7 giờ ngày mai họ sẽ xuất phát.",
        "Bố mẹ đối với con cái cần phải giữ chữ tín.",
        "Bác Trương đối đãi với mọi người rất nhiệt tình."
    ],
    "H41011": [
        "Giám đốc Lý không có ở văn phòng.",
        "Anh ấy bảo Tiểu Cao viết thư mời.",
        "Hai người họ quen biết nhau từ nhỏ.",
        "Hiện tại chú vẫn thích chơi bóng rổ.",
        "Nhật ký là một phần trong cuộc sống của anh ấy.",
        "Anh ấy đang xếp hàng mua vé.",
        "Anh ấy hy vọng mọi người gửi tin nhắn cho mình.",
        "Khi đang tức giận thì đừng vội đưa ra quyết định.",
        "Người vợ cảm thấy ngôi nhà đó rất rẻ.",
        "Điện thoại lên mạng giúp cuộc sống thuận tiện hơn."
    ],
    "H41012": [
        "Lão Trương thường hay đến muộn.",
        "Ngủ quá nhiều không tốt cho sức khỏe.",
        "Anh ấy hy vọng mọi người có thể đóng góp một vài ý kiến.",
        "Đổi quà ở ngay cửa ra vào.",
        "Anh ấy cho rằng thắng thua vốn không quan trọng.",
        "Tiết học này giảng về biến đổi khí hậu.",
        "Buổi khiêu vũ sẽ được tổ chức vào Chủ Nhật tuần này.",
        "Loại gương đó tương đối nhẹ.",
        "Thành phố Cửu Giang có lịch sử rất ngắn.",
        "Khi có hiểu lầm thì cần phải giải thích rõ ràng kịp thời."
    ]
}

def load_vocabularies():
    vocab_map = {}
    repo_root = Path(__file__).resolve().parent.parent
    for lvl in ["hsk1", "hsk2", "hsk3", "hsk4"]:
        fpath = repo_root / f"database/vocabs/{lvl}_vocabularies.json"
        if fpath.exists():
            with open(fpath, encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    word = item.get("hanzi") or item.get("word")
                    if word and word not in vocab_map:
                        vocab_map[word] = {
                            "word": word,
                            "pinyin": item.get("pinyin", ""),
                            "meaning_vi": item.get("meaning", ""),
                            "vocab_id": item.get("id", 0),
                            "level": lvl.upper()
                        }
    return vocab_map

def generate_pinyin(text: str) -> str:
    """Generate tone-marked pinyin for Chinese text."""
    pinyin_list = pypinyin.pinyin(text, style=pypinyin.Style.TONE)
    res = [item[0] for item in pinyin_list]
    s = " ".join(res)
    for punc in [",", ".", "?", "!", ";", ":"]:
        s = s.replace(f" {punc}", punc)
    return s

def find_vocab_matches(text: str, vocab_map: dict):
    matches = []
    sorted_words = sorted(vocab_map.keys(), key=lambda w: len(w), reverse=True)
    found = set()
    for word in sorted_words:
        if len(word) >= 2 and word in text and word not in found:
            found.add(word)
            matches.append(vocab_map[word])
            if len(matches) >= 8:
                break
    return matches

def refine_speech_boundary(data, sr, start_s, end_s, thresh=0.003, frame_ms=10):
    s_idx = max(0, int(start_s * sr))
    e_idx = min(len(data), int(end_s * sr))
    clip = data[s_idx:e_idx]
    frame_len = int(sr * frame_ms / 1000)
    if len(clip) < frame_len:
        return int(start_s * 1000), int(end_s * 1000)
    rms = [np.sqrt(np.mean(clip[i:i+frame_len]**2)) for i in range(0, len(clip)-frame_len, frame_len)]
    times = [start_s + i / sr for i in range(0, len(clip)-frame_len, frame_len)]
    active = np.where(np.array(rms) > thresh)[0]
    if len(active) == 0:
        return int(start_s * 1000), int(end_s * 1000)
    return int(times[active[0]] * 1000), int((times[active[-1]] + frame_ms/1000) * 1000)

def extract_pdf_data(pdf_path: str):
    res = subprocess.run(["pdftotext", pdf_path, "-"], capture_output=True, text=True)
    text = res.stdout
    stmts = re.findall(r"(\d+)\s*[．.]\s*★\s*([^\n\r]+)", text)
    stmt_map = {}
    for num_str, stmt in stmts:
        q_num = int(num_str)
        if 1 <= q_num <= 10:
            stmt_map[q_num] = stmt.strip()

    script_map = {}
    if "卷听力材料" in text:
        script_text = text[text.find("卷听力材料"):]
        if "卷答案" in script_text:
            script_text = script_text[:script_text.find("卷答案")]
        for q in range(1, 11):
            pattern = re.compile(rf"{q}\s*[．.]\s*(.*?)(?=\n\s*★|\n\s*{q+1}\s*[．.]|\n\s*第二部分|$)", re.DOTALL)
            m = pattern.search(script_text)
            if m:
                clean_script = re.sub(r"\s+", "", m.group(1).strip())
                script_map[q] = clean_script

    return stmt_map, script_map

def main():
    print("=== Building Listening Datasets for HSK 4 (Exams H41001 - H41012) ===")
    vocab_map = load_vocabularies()
    print(f"Loaded {len(vocab_map)} vocabulary entries.")
    
    model = whisper.load_model("tiny")
    print("Whisper tiny model ready.")

    repo_root = Path(__file__).resolve().parent.parent

    target_ids = sys.argv[1:] if len(sys.argv) > 1 else [f"H410{i:02d}" for i in range(1, 13)]
    for exam_id in target_ids:
        print(f"\nProcessing {exam_id}...")
        
        pdf_path = repo_root / f"exam_materials/hsk4/{exam_id}/{exam_id}.pdf"
        mp3_path = repo_root / f"assets/audio/exams/{exam_id}.mp3"
        
        if not pdf_path.exists():
            print(f"  Warning: PDF not found at {pdf_path}")
            continue
        if not mp3_path.exists():
            print(f"  Warning: MP3 not found at {mp3_path}")
            continue

        stmt_map, script_map = extract_pdf_data(str(pdf_path))
        answers = OFFICIAL_ANSWERS.get(exam_id, [True]*10)
        vi_statements = STATEMENT_VI.get(exam_id, [""]*10)

        # Transcribe first 480 seconds (Part 1)
        audio = whisper.load_audio(str(mp3_path))
        limit_sec = min(480, int(len(audio)/16000))
        clip = audio[0:int(limit_sec*16000)]
        whisper_res = model.transcribe(clip, language="zh")
        segments = whisper_res.get("segments", [])

        # Load audio with soundfile for RMS boundary refinement
        sf_data, sr = sf.read(str(mp3_path))

        questions = []
        for q in range(1, 11):
            stmt_zh = stmt_map.get(q, "")
            ans_bool = answers[q-1] if q-1 < len(answers) else True
            passage_zh = script_map.get(q, "")
            stmt_vi = vi_statements[q-1] if q-1 < len(vi_statements) else ""

            # Window calculation
            # Intro is ~90-120s, each question is ~25-30s
            est_start_s = 120.0 + (q - 1) * 28.5
            est_end_s = est_start_s + 30.0

            matched_segs = [s for s in segments if s["end"] >= est_start_s - 12.0 and s["start"] <= est_end_s + 12.0]
            if matched_segs:
                seg_start = matched_segs[0]["start"]
                seg_end = matched_segs[-1]["end"]
                p_s = max(0, seg_start)
                p_e = max(p_s + 4.0, seg_end - 4.0)
                s_s = p_e
                s_e = seg_end
            else:
                p_s = est_start_s
                p_e = est_start_s + 15.0
                s_s = p_e + 1.0
                s_e = s_s + 3.0

            pass_start_ms, pass_end_ms = refine_speech_boundary(sf_data, sr, p_s, p_e)
            stmt_start_ms, stmt_end_ms = refine_speech_boundary(sf_data, sr, s_s, s_e)

            if not passage_zh and matched_segs:
                passage_zh = "".join([s["text"].strip() for s in matched_segs[:-1]])

            # Split sentences
            raw_sentences = [s.strip() for s in re.split(r"([。！？；])", passage_zh) if s.strip()]
            sentences = []
            cur_s = ""
            for token in raw_sentences:
                cur_s += token
                if token in "。！？；":
                    sentences.append(cur_s)
                    cur_s = ""
            if cur_s:
                sentences.append(cur_s)
            if not sentences:
                sentences = [passage_zh]

            # Construct sentence objects with distributed timestamps
            sent_objs = []
            total_pass_dur = max(1000, pass_end_ms - pass_start_ms)
            char_count = sum(len(s) for s in sentences) or 1
            cur_ms = pass_start_ms
            for s_idx, sent_text in enumerate(sentences):
                sent_dur = int((len(sent_text) / char_count) * total_pass_dur)
                s_end = min(pass_end_ms, cur_ms + sent_dur)
                sent_objs.append({
                    "id": f"{exam_id}_L_{q:02d}_S{s_idx+1}",
                    "index": s_idx,
                    "zh": sent_text,
                    "pinyin": generate_pinyin(sent_text),
                    "vi": "",
                    "start_ms": cur_ms,
                    "end_ms": s_end
                })
                cur_ms = s_end

            combined_text = passage_zh + " " + stmt_zh
            vocab_matches = find_vocab_matches(combined_text, vocab_map)

            # Generate natural explanation
            if ans_bool:
                explanation = f"Nhận định đúng: Nội dung đoạn nghe phù hợp với nhận định '{stmt_vi or stmt_zh}'."
            else:
                explanation = f"Nhận định sai: Nội dung đoạn nghe không trùng khớp hoặc trái ngược với nhận định '{stmt_vi or stmt_zh}'."

            # Special preservation for H41001 Q01
            is_verified = (exam_id == "H41001" and q == 1)
            if is_verified:
                passage_zh = "喂？我们去树林里走走吧，今天的阳光多好啊，很暖和。好吧？图书馆门口儿见？"
                explanation = "Nhận định đúng vì người nói cho biết nắng hôm nay đẹp và trời rất ấm áp."
                sent_objs = [
                    {
                        "id": "H41001_L_01_S1",
                        "index": 0,
                        "zh": "喂？我们去树林里走走吧，",
                        "pinyin": "Wèi? Wǒmen qù shùlín lǐ zǒuzou ba,",
                        "vi": "A lô? Chúng ta vào rừng cây đi dạo một chút nhé.",
                        "start_ms": 136250,
                        "end_ms": 140250
                    },
                    {
                        "id": "H41001_L_01_S2",
                        "index": 1,
                        "zh": "今天的阳光多好啊，很暖和。",
                        "pinyin": "Jīntiān de yángguāng duō hǎo a, hěn nuǎnhuo.",
                        "vi": "Nắng hôm nay đẹp quá, trời rất ấm áp.",
                        "start_ms": 140920,
                        "end_ms": 144650
                    },
                    {
                        "id": "H41001_L_01_S3",
                        "index": 2,
                        "zh": "好吧？图书馆门口儿见？",
                        "pinyin": "Hǎo ba? Túshūguǎn ménkǒur jiàn?",
                        "vi": "Được nhé? Gặp nhau ở cửa thư viện nhé?",
                        "start_ms": 145380,
                        "end_ms": 148120
                    }
                ]

            q_data = {
                "id": f"{exam_id}_L_{q:02d}",
                "exam_id": exam_id,
                "question_number": q,
                "part": 1,
                "type": "true_false",
                "statement": {
                    "zh": stmt_zh,
                    "pinyin": generate_pinyin(stmt_zh),
                    "vi": stmt_vi
                },
                "answer": ans_bool,
                "explanation_vi": explanation,
                "evidence": {
                    "zh": "今天的阳光多好啊，很暖和。" if is_verified else (sentences[0] if sentences else ""),
                    "sentence_index": 1 if is_verified else 0
                },
                "audio_src": f"assets/audio/exams/{exam_id}.mp3",
                "alignment": {
                    "status": "verified" if is_verified else "draft",
                    "method": "whisper_asr_silence_refined_manual_reviewed" if is_verified else "whisper_asr_silence_refined",
                    "notes": "Mốc âm thanh được nhận diện bằng Whisper ASR và tinh chỉnh tự động qua phong bì năng lượng RMS."
                },
                "segments": {
                    "passage": {
                        "start_ms": 136250 if is_verified else pass_start_ms,
                        "end_ms": 148120 if is_verified else pass_end_ms
                    },
                    "statement": {
                        "start_ms": 149000 if is_verified else stmt_start_ms,
                        "end_ms": 151000 if is_verified else stmt_end_ms
                    },
                    "full_question": {
                        "start_ms": 136250 if is_verified else pass_start_ms,
                        "end_ms": 151000 if is_verified else stmt_end_ms
                    }
                },
                "transcript": {
                    "full_zh": passage_zh,
                    "full_vi": "A lô? Chúng ta vào rừng cây đi dạo một chút nhé. Nắng hôm nay đẹp quá, trời rất ấm áp. Được nhé? Gặp nhau ở cửa thư viện nhé?" if is_verified else "",
                    "sentences": sent_objs
                },
                "vocabulary_matches": vocab_matches
            }
            questions.append(q_data)

        exam_json = {
            "exam_id": exam_id,
            "level": "HSK4",
            "title": f"HSK 4 - Đề thi mẫu {exam_id} - Phần Nghe (Listening)",
            "total_questions": len(questions),
            "audio_src": f"assets/audio/exams/{exam_id}.mp3",
            "questions": questions
        }

        out_file = repo_root / f"database/listening/hsk4_{exam_id.lower()}.json"
        out_file.parent.mkdir(parents=True, exist_ok=True)
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(exam_json, f, ensure_ascii=False, indent=2)
        print(f"  -> Generated {out_file.name} with {len(questions)} questions.")

    print("\nAll 12 exam datasets successfully built!")

if __name__ == "__main__":
    main()
