import json
import os
import re

BANK_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "sentence", "hsk4_sentence_bank.json")
INDEX_PATH = os.path.join(os.path.dirname(__file__), "..", "index.html")

def test_hsk4_sentence_bank_structure_and_counts():
    assert os.path.isfile(BANK_PATH), "hsk4_sentence_bank.json must exist"
    with open(BANK_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    assert isinstance(data, list)
    assert len(data) == 120, f"Expected 120 questions across 12 Hanban exams, got {len(data)}"
    
    exams = {}
    for item in data:
        eid = item.get("exam_id")
        assert eid is not None
        exams.setdefault(eid, []).append(item)
    
    assert len(exams) == 12, f"Expected 12 exams (H41001 to H41012), got {len(exams)}"
    
    for i in range(1, 13):
        eid = f"H410{i:02d}"
        assert eid in exams, f"Missing exam {eid}"
        q_list = exams[eid]
        assert len(q_list) == 10, f"Exam {eid} should have 10 questions, got {len(q_list)}"
        
        # Verify question numbers 86 to 95
        q_nums = [q["question_number"] for q in q_list]
        assert q_nums == list(range(86, 96)), f"Exam {eid} questions must be 86-95, got {q_nums}"

def test_hsk4_sentence_entries_content_validity():
    with open(BANK_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    clean_regex = re.compile(r'[。？！，、“”《》\s]')

    for item in data:
        assert item["id"].startswith("H410")
        assert item["exam_name"].startswith("Đề ")
        assert isinstance(item["tokens"], list)
        assert len(item["tokens"]) >= 3, f"{item['id']} should have at least 3 tokens"
        
        # Meaning and grammar explanation must be non-empty
        assert len(item["meaning_vi"].strip()) > 0, f"{item['id']} missing meaning_vi"
        assert len(item["grammar_point"].strip()) > 0, f"{item['id']} missing grammar_point"
        assert item["punct"] in ["。", "？", "！"], f"{item['id']} invalid punct {item['punct']}"

        # Tokens characters must match solution characters
        tokens_chars = sorted(clean_regex.sub('', "".join(item["tokens"])))
        sol_chars = sorted(clean_regex.sub('', item["solution_zh"]))
        assert tokens_chars == sol_chars, (
            f"{item['id']} tokens mismatch solution: {''.join(tokens_chars)} vs {''.join(sol_chars)}"
        )

        # Acceptable solutions
        assert isinstance(item["acceptable_solutions"], list)
        assert len(item["acceptable_solutions"]) >= 1
        for sol in item["acceptable_solutions"]:
            sol_c = sorted(clean_regex.sub('', sol))
            assert sol_c == tokens_chars, f"{item['id']} acceptable solution {sol} has mismatched characters"

def test_index_html_sentence_game_ui_integration():
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # Tools menu tab label
    assert "Xếp câu HSK4" in content
    assert 'aria-controls="screenSentenceGame"' in content
    assert "setPrimaryTab('sentenceGame')" in content

    # Screen DOM elements
    assert 'id="screenSentenceGame"' in content
    assert 'id="sentenceGameExamSelect"' in content
    assert 'id="sentenceQuestionNav"' in content
    assert 'id="sentenceGameSlots"' in content
    assert 'id="sentenceGameBank"' in content
    assert 'id="sentenceResultCard"' in content
    assert 'id="sentenceResultVi"' in content
    assert 'id="sentenceGrammarDisclosure"' in content
