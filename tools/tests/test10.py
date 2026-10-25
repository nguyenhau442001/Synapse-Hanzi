# -*- coding: utf-8 -*-
"""
Authentic items curated from HSK 4 模拟试卷 10 (Mock Test 10).
Source: Tiengtrungthuonghai.vn_Mô phỏng đề thi HSK4 mới.pdf
"""

TEST10_ENTRIES = [
    # =========================================================================
    # PART A: 书写 第一部分 - 组句 (Sentence Building 86-95)
    # =========================================================================
    {
        "id": "hsk4_test10_q86",
        "category": "sentence_building",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 书写 第一部分 (第86题)",
        "zh": "很多困难是可以克服的。",
        "pinyin": "hěn duō kùn nan shì kě yǐ kè fú de 。",
        "hanviet": "Hẩn Đa Khốn Nan Thị Khả Dĩ Khắc Phục Đích 。",
        "meaning": "Rất nhiều khó khăn là hoàn toàn có thể khắc phục được.",
        "tokens": [
            { "text": "很多", "type": "normal", "role": "Định ngữ chỉ số lượng, bổ nghĩa cho 困难" },
            { "text": "困难", "type": "core", "role": "Trung tâm ngữ của chủ ngữ (khó khăn, trở ngại)" },
            { "text": "是", "type": "grammar", "role": "Thành phần mở đầu khung khẳng định 是...的" },
            { "text": "可以", "type": "normal", "role": "Động từ năng nguyện biểu thị khả năng (có thể)" },
            { "text": "克服", "type": "core", "role": "Động từ chính làm vị ngữ (vượt qua, khắc phục)" },
            { "text": "的", "type": "grammar", "role": "Trợ từ kết thúc khung khẳng định 是...的" }
        ],
        "grammar_point": {
            "name": "Cấu trúc khẳng định: 是……的",
            "pattern": "Chủ ngữ + 是 + 可以 + Động từ + 的",
            "pattern_applied": "很多困难 + 是 + 可以 + 克服 + 的",
            "level": "HSK 4 Trọng điểm",
            "trap_note": "Lưu ý vị trí: Cấu trúc '是……的' ở đây dùng để khẳng định khả năng giải quyết của vấn đề. Động từ năng nguyện '可以' phải đứng sau '是' và đứng trước động từ chính '克服'.",
            "explanation": "Trong câu này, '很多' bổ nghĩa cho '困难' làm chủ ngữ ('nhiều khó khăn'). Cấu trúc '是……的' dùng để khẳng định và nhấn mạnh khả năng, kẹp giữa là động từ năng nguyện '可以' và động từ '克服' ('có thể khắc phục')."
        },
        "breakdown": [
            { "role": "Chủ ngữ", "text": "很多困难", "type": "subject", "desc": "Nhiều khó khăn (很多 bổ nghĩa cho 困难)" },
            { "role": "Khung khẳng định", "text": "是……的", "type": "grammar", "desc": "Khung khẳng định, nhấn mạnh trong câu này" },
            { "role": "Vị ngữ", "text": "可以克服", "type": "verb", "desc": "Có thể khắc phục (động từ năng nguyện 可以 + động từ 克服)" }
        ],
        "practice": {
            "type": "sentence_building",
            "scrambled_chunks": ["克服的", "很多困难", "是可以"],
            "target_chunks": ["很多困难", "是", "可以", "克服的"],
            "hint": "Cấu trúc: 很多困难 + 是 + 可以 + 克服的."
        }
    },
    {
        "id": "hsk4_test10_q87",
        "category": "sentence_building",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 书写 第一部分 (第87题)",
        "zh": "她激动得流下了眼泪。",
        "pinyin": "tā jī dòng de liú xià le yǎn lèi 。",
        "hanviet": "Tha Kích Động Đắc Lưu Hạ Liễu Nhãn Lệ 。",
        "meaning": "Cô ấy xúc động đến mức rơi cả nước mắt.",
        "tokens": [
            { "text": "她", "type": "normal", "role": "Chủ ngữ" },
            { "text": "激动", "type": "core", "role": "Tính từ vị ngữ biểu cảm (xúc động/kích động)" },
            { "text": "得", "type": "grammar", "role": "Trợ từ kết cấu bổ ngữ mức độ/trạng thái" },
            { "text": "流下", "type": "core", "role": "Động từ + bổ ngữ xu hướng (chảy xuống, rơi)" },
            { "text": "了", "type": "normal", "role": "Trợ từ động thái" },
            { "text": "眼泪", "type": "core", "role": "Tân ngữ trực tiếp (giọt nước mắt)" }
        ],
        "grammar_point": {
            "name": "Bổ ngữ mức độ trạng thái chỉ phản ứng cơ thể: Tính từ + 得 + V + Tân ngữ",
            "pattern": "Chủ ngữ + Tính từ cảm xúc + 得 + Động từ xu hướng + (了) + Tân ngữ",
            "level": "HSK 4 Trọng điểm",
            "trap_note": "BẪY TỪ HƯ: '得' nối tính từ biểu cảm '激动' với phản ứng trào dâng '流下了眼泪'. Cụm '流下眼泪' có bổ ngữ xu hướng '下'.",
            "explanation": "Miêu tả khoảnh khắc cảm xúc dâng trào tột độ (như lúc hội ngộ hoặc nhận giải thưởng)."
        },
        "breakdown": [
            { "role": "Chủ ngữ", "text": "她", "type": "subject", "desc": "Người phụ nữ trải nghiệm cảm xúc" },
            { "role": "Vị ngữ cảm xúc", "text": "激动", "type": "verb", "desc": "Tâm trạng dâng trào" },
            { "role": "Trợ từ bổ ngữ", "text": "得", "type": "grammar", "desc": "Nối liền mức độ biểu hiện" },
            { "role": "Bổ ngữ phản ứng sinh lý", "text": "流下了眼泪", "type": "modifier", "desc": "Nước mắt tự nhiên lăn dài trên má" }
        ],
        "practice": {
            "type": "sentence_building",
            "scrambled_chunks": ["流下了眼泪", "她", "激动得"],
            "target_chunks": ["她", "激动得", "流下了眼泪"],
            "hint": "Chủ ngữ (她) + Tính từ kèm 得 (激动得) + Phản ứng (流下了眼泪)."
        }
    },
    {
        "id": "hsk4_test10_q88",
        "category": "sentence_building",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 书写 第一部分 (第88题)",
        "zh": "这家银行的利息高吗？",
        "pinyin": "zhè jiā yín háng de lì xī gāo ma ？",
        "hanviet": "Giá Gia Ngân Hàng Đích Lợi Tức Cao Ma ？",
        "meaning": "Lãi suất của ngân hàng này có cao không?",
        "tokens": [
            { "text": "这家", "type": "normal", "role": "Lượng từ chỉ doanh nghiệp/ngân hàng" },
            { "text": "银行", "type": "core", "role": "Danh từ nơi chốn kinh doanh (ngân hàng)" },
            { "text": "的", "type": "normal", "role": "Trợ từ kết cấu" },
            { "text": "利息", "type": "core", "role": "Chủ ngữ trung tâm (lãi suất, tiền lãi)" },
            { "text": "高", "type": "normal", "role": "Tính từ vị ngữ (cao)" },
            { "text": "吗", "type": "grammar", "role": "Trợ từ nghi vấn" }
        ],
        "grammar_point": {
            "name": "Cụm danh từ định-trung tài chính và Câu vị ngữ tính từ nghi vấn",
            "pattern": "Lượng từ + 银行 + 的 + 利息 + (很) + 高 + 吗？",
            "level": "HSK 4 Căn bản",
            "trap_note": "BẪY TỪ VỰNG: Lượng từ của ngân hàng là '家' (这家银行). Từ vựng trọng điểm HSK 4: '利息' (lãi suất). Đi với tính từ '高/低'.",
            "explanation": "Câu hỏi thực tế của khách hàng quan tâm đến việc gửi tiền tiết kiệm hoặc vay vốn ngân hàng."
        },
        "breakdown": [
            { "role": "Chủ ngữ định-trung", "text": "这家银行的利息", "type": "subject", "desc": "Mức tiền lãi của chi nhánh ngân hàng này" },
            { "role": "Vị ngữ tính từ nghi vấn", "text": "高吗", "type": "verb", "desc": "Hỏi về mức độ cao thấp" }
        ],
        "practice": {
            "type": "sentence_building",
            "scrambled_chunks": ["这家银行的", "高吗", "利息"],
            "target_chunks": ["这家银行的", "利息", "高吗"],
            "hint": "Chủ ngữ (这家银行的利息) + Vị ngữ (高吗)."
        }
    },
    {
        "id": "hsk4_test10_q89",
        "category": "sentence_building",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 书写 第一部分 (第89题)",
        "zh": "玛丽送男朋友两条领带。",
        "pinyin": "mǎ lì sòng nán péng you liǎng tiáo lǐng dài 。",
        "hanviet": "Mã Lệ Tống Nam Bằng Hữu Lưỡng Điều Lĩnh Đái 。",
        "meaning": "Mary tặng cho bạn trai hai chiếc cà vạt.",
        "tokens": [
            { "text": "玛丽", "type": "normal", "role": "Chủ ngữ tên riêng (Mary)" },
            { "text": "送", "type": "core", "role": "Động từ mang 2 tân ngữ (tặng)" },
            { "text": "男朋友", "type": "core", "role": "Tân ngữ gián tiếp chỉ người (bạn trai)" },
            { "text": "两", "type": "normal", "role": "Số từ chỉ số 2" },
            { "text": "条", "type": "grammar", "role": "Lượng từ cho vật thon dài (chiếc/sợi)" },
            { "text": "领带", "type": "core", "role": "Tân ngữ trực tiếp chỉ vật (cà vạt)" }
        ],
        "grammar_point": {
            "name": "Câu mang hai tân ngữ (双宾语): Động từ + Người (Tân ngữ 1) + Vật (Tân ngữ 2)",
            "pattern": "Chủ ngữ + 送 / 给 / 借 / 教 + Người (Tân ngữ gián tiếp) + Số lượng + Vật (Tân ngữ trực tiếp)",
            "level": "HSK 4 Trọng điểm",
            "trap_note": "BẪY CẤU TRÚC: Trong câu có 2 tân ngữ, tân ngữ chỉ NGƯỜI ('男朋友') bắt buộc phải đứng trước tân ngữ chỉ VẬT ('两条领带'). Lượng từ của cà vạt là '条' (tiáo).",
            "explanation": "Động từ '送' trực tiếp mang hai tân ngữ mà không cần dùng thêm giới từ '给'."
        },
        "breakdown": [
            { "role": "Chủ ngữ", "text": "玛丽", "type": "subject", "desc": "Cô gái tặng quà" },
            { "role": "Vị ngữ động từ 2 tân ngữ", "text": "送", "type": "verb", "desc": "Hành vi trao tặng" },
            { "role": "Tân ngữ gián tiếp (Người)", "text": "男朋友", "type": "object", "desc": "Người tiếp nhận món quà" },
            { "role": "Tân ngữ trực tiếp (Vật)", "text": "两条领带", "type": "object", "desc": "Hai chiếc dây thắt lưng/cà vạt" }
        ],
        "practice": {
            "type": "sentence_building",
            "scrambled_chunks": ["两条领带", "玛丽", "男朋友", "送"],
            "target_chunks": ["玛丽", "送", "男朋友", "两条领带"],
            "hint": "Quy tắc 2 tân ngữ: Ai (玛丽) + 送 + Người (男朋友) + Đồ vật (两条领带)."
        }
    },
    {
        "id": "hsk4_test10_q90",
        "category": "sentence_building",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 书写 第一部分 (第90题)",
        "zh": "你不是说不出国留学吗？",
        "pinyin": "nǐ bú shì shuō bù chū guó liú xué ma ？",
        "hanviet": "Nhĩ Bất Thị Thuyết Bất Xuất Quốc Lưu Học Ma ？",
        "meaning": "Bạn chẳng phải đã bảo là không đi du học nước ngoài sao?",
        "tokens": [
            { "text": "你", "type": "normal", "role": "Chủ ngữ" },
            { "text": "不是", "type": "grammar", "role": "Thành phần mở đầu câu phản vấn" },
            { "text": "说", "type": "normal", "role": "Động từ phát ngôn (nói, bảo)" },
            { "text": "不", "type": "grammar", "role": "Phó từ phủ định ý định" },
            { "text": "出国", "type": "core", "role": "Động từ liên động 1 (ra nước ngoài)" },
            { "text": "留学", "type": "core", "role": "Động từ liên động 2 (du học)" },
            { "text": "吗", "type": "grammar", "role": "Trợ từ nghi vấn" }
        ],
        "grammar_point": {
            "name": "Câu hỏi phản vấn phức hợp: 不是说...吗？",
            "pattern": "Chủ ngữ + 不是 + 说 + Mệnh đề nội dung đã nói + 吗？",
            "level": "HSK 4 Trọng điểm",
            "trap_note": "BẪY TẦNG NGHĨA: Cấu trúc lồng ghép: '不是...吗' tạo khung phản vấn nhắc lại lời hứa trước đây, bên trong lồng mệnh đề phủ định '不出国留学'.",
            "explanation": "Người nói cảm thấy bất ngờ khi đối phương dường như đang chuẩn bị hồ sơ du học, trái ngược với tuyên bố trước đó."
        },
        "breakdown": [
            { "role": "Chủ ngữ", "text": "你", "type": "subject", "desc": "Người đưa ra tuyên bố trước đó" },
            { "role": "Khung câu phản vấn", "text": "不是...吗", "type": "grammar", "desc": "Nhắc lại lời đã cam kết để đối chất" },
            { "role": "Nội dung trích dẫn", "text": "说不出国留学", "type": "verb", "desc": "Khẳng định không đi học ở nước ngoài" }
        ],
        "practice": {
            "type": "sentence_building",
            "scrambled_chunks": ["不出国留学吗", "你不是说"],
            "target_chunks": ["你不是说", "不出国留学吗"],
            "hint": "Cấu trúc phản vấn: 你不是说 + 不出国留学吗？"
        }
    },
    {
        "id": "hsk4_test10_q91",
        "category": "sentence_building",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 书写 第一部分 (第91题)",
        "zh": "我的自行车被借走了。",
        "pinyin": "wǒ de zì xíng chē bèi jiè zǒu le 。",
        "hanviet": "Ngã Đích Tự Hành Xa Bị Tá Tẩu Liễu 。",
        "meaning": "Xe đạp của tôi đã bị người ta mượn đi mất rồi.",
        "tokens": [
            { "text": "我的", "type": "normal", "role": "Định ngữ sở hữu" },
            { "text": "自行车", "type": "core", "role": "Chủ ngữ chịu tác động (xe đạp)" },
            { "text": "被", "type": "grammar", "role": "Giới từ câu bị động" },
            { "text": "借", "type": "core", "role": "Động từ chính (mượn)" },
            { "text": "走", "type": "grammar", "role": "Bổ ngữ xu hướng (đi, rời xa)" },
            { "text": "了", "type": "normal", "role": "Trợ từ hoàn thành" }
        ],
        "grammar_point": {
            "name": "Câu bị động khuyết tác nhân: Vật + 被 + Động từ + Bổ ngữ xu hướng + 了",
            "pattern": "Đồ vật sở hữu + 被 + (Ai đó ẩn) + Động từ + 走 / 掉 / 坏 + 了",
            "level": "HSK 4 Trọng điểm",
            "trap_note": "BẪY THI: Trong câu chữ 被, tác nhân thực hiện hành vi hoàn toàn có thể được LƯỢC BỎ nếu không rõ hoặc không muốn nêu danh tính ('被借走了').",
            "explanation": "Diễn tả chiếc xe đạp hiện tại không còn ở chỗ cũ vì ai đó đã mượn mang đi nơi khác."
        },
        "breakdown": [
            { "role": "Chủ ngữ chịu chuyển dời", "text": "我的自行车", "type": "subject", "desc": "Phương tiện cá nhân bị tác động" },
            { "role": "Giới từ bị động khuyết chủ ngữ", "text": "被", "type": "grammar", "desc": "Nhận hành vi từ người khác" },
            { "role": "Vị ngữ + Bổ ngữ xu hướng", "text": "借走了", "type": "verb", "desc": "Động từ '借' kết hợp bổ ngữ '走'" }
        ],
        "practice": {
            "type": "sentence_building",
            "scrambled_chunks": ["借走了", "我的自行车", "被"],
            "target_chunks": ["我的自行车", "被", "借走了"],
            "hint": "Cấu trúc bị động: Vật (我的自行车) + 被 + 借走了."
        }
    },
    {
        "id": "hsk4_test10_q92",
        "category": "sentence_building",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 书写 第一部分 (第92题)",
        "zh": "那是一本著名的时尚杂志。",
        "pinyin": "nà shì yì běn zhù míng de shí shàng zá zhì 。",
        "hanviet": "Na Thị Nhất Bổn Trứ Danh Đích Thời Thượng Tạp Chí 。",
        "meaning": "Đó là một cuốn tạp chí thời trang nổi tiếng.",
        "tokens": [
            { "text": "那", "type": "normal", "role": "Đại từ chỉ thị xa (đó, kia)" },
            { "text": "是", "type": "grammar", "role": "Động từ hệ từ" },
            { "text": "一本", "type": "core", "role": "Số lượng từ (cuốn/quyển)" },
            { "text": "著名的", "type": "core", "role": "Định ngữ tính từ (nổi tiếng, trứ danh)" },
            { "text": "时尚", "type": "core", "role": "Định ngữ danh từ (thời trang, sành điệu)" },
            { "text": "杂志", "type": "core", "role": "Tân ngữ danh từ trung tâm (tạp chí)" }
        ],
        "grammar_point": {
            "name": "Cụm danh từ định ngữ nhiều tầng: Số lượng + Tính từ 的 + Danh từ thuộc tính + Trung tâm ngữ",
            "pattern": "这 / 那 + 是 + Số lượng + Tính từ + 的 + Danh từ thuộc tính + Trung tâm ngữ",
            "level": "HSK 4 Căn bản",
            "trap_note": "BẪY TRẬT TỰ ĐỊNH NGỮ: Trật tự định ngữ chuẩn trong tiếng Trung: Số lượng từ ('一本') -> Tính từ miêu tả ('著名的') -> Danh từ phân loại thuộc tính ('时尚') -> Trung tâm ngữ ('杂志').",
            "explanation": "Câu giới thiệu về một ấn phẩm truyền thông uy tín trong làng thời trang quốc tế."
        },
        "breakdown": [
            { "role": "Chủ ngữ chỉ thị", "text": "那", "type": "subject", "desc": "Vật thể ở xa" },
            { "role": "Vị ngữ hệ từ", "text": "是", "type": "verb", "desc": "Xác nhận thể loại ấn phẩm" },
            { "role": "Cụm định ngữ nhiều tầng + Tân ngữ", "text": "一本著名的时尚杂志", "type": "object", "desc": "Ấn phẩm tạp chí thời trang danh tiếng" }
        ],
        "practice": {
            "type": "sentence_building",
            "scrambled_chunks": ["时尚杂志", "著名的", "那是", "一本"],
            "target_chunks": ["那是", "一本", "著名的", "时尚杂志"],
            "hint": "Chỉ thị (那是) + Số lượng (一本) + Định ngữ (著名的) + Danh từ (时尚杂志)."
        }
    },
    {
        "id": "hsk4_test10_q93",
        "category": "sentence_building",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 书写 第一部分 (第93题)",
        "zh": "他刚起床就听到了敲门声。",
        "pinyin": "tā gāng qǐ chuáng jiù tīng dào le qiāo mén shēng 。",
        "hanviet": "Tha Cương Khởi Sàng Tựu Thính Đáo Liễu Cao Môn Thanh 。",
        "meaning": "Cậu ấy vừa mới thức dậy thì liền nghe thấy tiếng gõ cửa.",
        "tokens": [
            { "text": "他", "type": "normal", "role": "Chủ ngữ" },
            { "text": "刚", "type": "grammar", "role": "Phó từ thời gian (vừa mới)" },
            { "text": "起床", "type": "core", "role": "Hành động 1 (ngủ dậy)" },
            { "text": "就", "type": "grammar", "role": "Phó từ liên kết phản ứng tức thì (thì/liền)" },
            { "text": "听到了", "type": "core", "role": "Hành động 2 mang bổ ngữ kết quả (nghe thấy)" },
            { "text": "敲门声", "type": "core", "role": "Tân ngữ trực tiếp (tiếng gõ cửa)" }
        ],
        "grammar_point": {
            "name": "Cặp phó từ liên kết diễn tiến liên tiếp: 刚...就...",
            "pattern": "Chủ ngữ + 刚 + Hành động 1 + 就 + Động từ + 到 + 了 + Âm thanh / Hiện tượng",
            "level": "HSK 4 Trọng điểm",
            "trap_note": "BẪY CẤU TRÚC: Cặp từ '刚...就...' tương tự '一...就...', chỉ sự việc thứ hai diễn ra ngay sát nút sau sự việc thứ nhất. '听到' có bổ ngữ kết quả '到' ghi nhận âm thanh.",
            "explanation": "Tình huống buổi sáng sớm bất ngờ khi có khách đến thăm vừa đúng lúc chủ nhà thức giấc."
        },
        "breakdown": [
            { "role": "Chủ ngữ", "text": "他", "type": "subject", "desc": "Người tiếp nhận âm thanh" },
            { "role": "Hành động vừa xảy ra", "text": "刚起床", "type": "modifier", "desc": "Vừa rời khỏi giường ngủ" },
            { "role": "Sự việc kế tiếp tức thời", "text": "就听到了敲门声", "type": "verb", "desc": "Lập tức nghe thấy tiếng gõ cửa phòng" }
        ],
        "practice": {
            "type": "sentence_building",
            "scrambled_chunks": ["刚起床", "他", "就听到了敲门声"],
            "target_chunks": ["他", "刚起床", "就听到了敲门声"],
            "hint": "Cấu trúc: 主语 (他) + 刚起床 + 就听到了敲门声."
        }
    },
    {
        "id": "hsk4_test10_q94",
        "category": "sentence_building",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 书写 第一部分 (第94题)",
        "zh": "有意见请写在表格里。",
        "pinyin": "yǒu yì jiàn qǐng xiě zài biǎo gé lǐ 。",
        "hanviet": "Hữu Ý Kiến Thỉnh Tả Tại Biểu Cách Lý 。",
        "meaning": "Nếu có ý kiến xin vui lòng ghi vào trong biểu mẫu.",
        "tokens": [
            { "text": "有意见", "type": "core", "role": "Vế điều kiện giả thiết ẩn (nếu có ý kiến góp ý)" },
            { "text": "请", "type": "normal", "role": "Từ lịch sự đề nghị" },
            { "text": "写在", "type": "core", "role": "Động từ + bổ ngữ định vị nơi chốn (viết vào)" },
            { "text": "表格里", "type": "core", "role": "Phương vị từ nơi chốn (trong biểu mẫu)" }
        ],
        "grammar_point": {
            "name": "Mệnh đề điều kiện rút gọn và Động từ mang bổ ngữ nơi chốn 写在...里",
            "pattern": "(如果) + 有 + Ý kiến / Vấn đề + 请 + 写在 + Biểu mẫu / Sổ + 里 / 上",
            "level": "HSK 4 Trọng điểm",
            "trap_note": "BẪY CẤU TRÚC: Vế '有意见' đóng vai trò điều kiện mở đầu. Cụm '写在表格里' có '在' nối giữa động từ '写' và vị trí đích đến '表格里'.",
            "explanation": "Câu hướng dẫn thủ tục hành chính hoặc khảo sát ý kiến khách hàng quen thuộc."
        },
        "breakdown": [
            { "role": "Điều kiện mở đầu", "text": "有意见", "type": "modifier", "desc": "Nếu có bất kỳ quan điểm phản ánh nào" },
            { "role": "Lời thỉnh cầu hành động", "text": "请写在表格里", "type": "verb", "desc": "Vui lòng ghi chép vào tờ phiếu khảo sát" }
        ],
        "practice": {
            "type": "sentence_building",
            "scrambled_chunks": ["写在表格里", "有意见", "请"],
            "target_chunks": ["有意见", "请", "写在表格里"],
            "hint": "Cấu trúc: Điều kiện (有意见) + 请 + 写在表格里."
        }
    },
    {
        "id": "hsk4_test10_q95",
        "category": "sentence_building",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 书写 第一部分 (第95题)",
        "zh": "黑板上写着老师的名字。",
        "pinyin": "hēi bǎn shang xiě zhe lǎo shī de míng zi 。",
        "hanviet": "Hắc Bản Thượng Tả Trước Lão Sư Đích Danh Tự 。",
        "meaning": "Trên bảng đen có viết tên của thầy cô giáo.",
        "tokens": [
            { "text": "黑板上", "type": "core", "role": "Chủ ngữ nơi chốn tồn hiện (trên bảng đen)" },
            { "text": "写", "type": "core", "role": "Động từ lưu dấu vết (viết)" },
            { "text": "着", "type": "grammar", "role": "Trợ từ động thái duy trì kết quả hành động" },
            { "text": "老师的", "type": "normal", "role": "Định ngữ sở hữu" },
            { "text": "名字", "type": "core", "role": "Tân ngữ tồn tại (họ tên)" }
        ],
        "grammar_point": {
            "name": "Câu tồn hiện trạng thái: Nơi chốn + 写着 + Tân ngữ danh từ",
            "pattern": "Phương vị từ / Địa điểm + 写 / 贴 / 画 + 着 + Cụm danh từ tồn tại",
            "level": "HSK 4 Trọng điểm",
            "trap_note": "BẪY THI: Câu tồn hiện miêu tả sự vật hiển hiện trên một bề mặt, không được thêm giới từ '在' ở đầu câu ('黑板上' chứ không phải '在黑板上'). '写着' biểu thị nét chữ vẫn đang còn lưu lại.",
            "explanation": "Câu miêu tả quang cảnh lớp học đầu năm khi giáo viên ghi tên mình lên bảng để làm quen với học sinh."
        },
        "breakdown": [
            { "role": "Vị trí không gian", "text": "黑板上", "type": "subject", "desc": "Mặt phẳng bảng lớp học" },
            { "role": "Vị ngữ tồn hiện tĩnh", "text": "写着", "type": "verb", "desc": "Động từ '写' gắn kèm trợ từ '着'" },
            { "role": "Thực thể tồn tại", "text": "老师的名字", "type": "object", "desc": "Họ và tên của người giảng dạy" }
        ],
        "practice": {
            "type": "sentence_building",
            "scrambled_chunks": ["老师的名字", "黑板上", "写着"],
            "target_chunks": ["黑板上", "写着", "老师的名字"],
            "hint": "Cấu trúc tồn hiện: Nơi chốn (黑板上) + 写着 + Tân ngữ (老师的名字)."
        }
    },

    # =========================================================================
    # PART B: 阅读 第二部分 - 排列顺序 (Sentence Logic 56-65)
    # =========================================================================
    {
        "id": "hsk4_test10_q57",
        "category": "sentence_logic",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 阅读 第二部分 (第57题)",
        "zh": "我喜欢在安静的地方学习，可是宿舍里音乐声总是不断，所以我只好去图书馆了。",
        "pinyin": "wǒ xǐ huan zài ān jìng de dì fang xué xí ， kě shì sù shè lǐ yīn yuè shēng zǒng shì bú duàn ， suǒ yǐ wǒ zhǐ hǎo qù tú shū guǎn le 。",
        "hanviet": "Ngã Hỷ Hoan Tại An Tĩnh Đích Địa Phương Học Tập ， Khả Thị Túc Xá Lý Âm Nhạc Thanh Tổng Thị Bất Đoán ， Sở Dĩ Ngã Chỉ Hảo Khứ Đồ Thư Quán Liễu 。",
        "meaning": "Tôi thích học ở nơi yên tĩnh, nhưng tiếng nhạc trong ký túc xá cứ vang lên không ngớt, vì vậy tôi đành phải lên thư viện.",
        "tokens": [
            { "text": "我喜欢在安静的地方学习", "type": "core", "role": "Sở thích và thói quen mở đầu (C)" },
            { "text": "可是", "type": "grammar", "role": "Liên từ chuyển ngoặt trở ngại (nhưng)" },
            { "text": "宿舍里音乐声总是不断", "type": "core", "role": "Thực tế mâu thuẫn ồn ào (B)" },
            { "text": "所以", "type": "grammar", "role": "Liên từ kết quả" },
            { "text": "我只好去图书馆了", "type": "core", "role": "Giải pháp ứng phó đành phải thực hiện (A)" }
        ],
        "grammar_point": {
            "name": "Mô hình logic: Sở thích (C) + Chuyển ngoặt 可是 (B) + Kết quả bất đắc dĩ 所以只好 (A)",
            "pattern": "Thói quen ban đầu (C) + 可是 + Thực tế trái ngược (B) + 所以 + 只好 + Hành động đành phải làm (A)",
            "level": "HSK 4 Trọng điểm",
            "trap_note": "BẪY LOGIC: '可是' dẫn ra trở ngại (B) phải đứng sau sở thích (C). '所以只好' (A) dẫn dắt giải pháp cứu cánh sau khi gặp trở ngại nên phải đứng cuối.",
            "explanation": "C khẳng định gu yên tĩnh. B phản ánh tiếng ồn ký túc xá. A là giải pháp lên thư viện đọc sách."
        },
        "breakdown": [
            { "role": "Thói quen mở đầu (C)", "text": "我喜欢在安静的地方学习", "type": "subject", "desc": "Giới thiệu nhu cầu không gian tĩnh lặng" },
            { "role": "Trở ngại nảy sinh (B)", "text": "可是宿舍里音乐声总是不断", "type": "verb", "desc": "Liên từ '可是' chỉ tình trạng ồn ào bất khả kháng" },
            { "role": "Hệ quả ứng phó (A)", "text": "所以我只好去图书馆了", "type": "object", "desc": "Cặp từ '所以只好' chọn phương án thay thế tối ưu" }
        ],
        "practice": {
            "type": "sentence_logic",
            "options": [
                { "id": "A", "text": "所以我只好去图书馆了" },
                { "id": "B", "text": "可是宿舍里音乐声总是不断" },
                { "id": "C", "text": "我喜欢在安静的地方学习" }
            ],
            "correct_order": "CBA",
            "hint": "Thói quen (C) -> Trở ngại '可是' (B) -> Giải pháp '所以只好' (A)."
        }
    },
    {
        "id": "hsk4_test10_q58",
        "category": "sentence_logic",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 阅读 第二部分 (第58题)",
        "zh": "我之所以喜欢王宣，不是因为她长得漂亮，而是因为她性格非常好。",
        "pinyin": "wǒ zhī suǒ yǐ xǐ huan wáng xuān ， bú shì yīn wèi tā zhǎng de piào liang ， ér shì yīn wèi tā xìng gé fēi cháng hǎo 。",
        "hanviet": "Ngã Chi Sở Dĩ Hỷ Hoan Vương Tuyên ， Bất Thị Nhân Vi Tha Trưởng Đắc Phiêu Lượng ， Nhi Thị Nhân Vi Tha Tính Cách Phi Thường Hảo 。",
        "meaning": "Tôi sở dĩ thích Vương Tuyên, không phải vì cô ấy có ngoại hình xinh đẹp, mà là vì tính cách của cô ấy vô cùng tốt.",
        "tokens": [
            { "text": "我之所以喜欢王宣", "type": "core", "role": "Mở đầu với 之所以 (sở dĩ) (B)" },
            { "text": "不是因为", "type": "grammar", "role": "Cặp liên từ bác bỏ lý do bề nổi (không phải vì) (C)" },
            { "text": "她长得漂亮", "type": "normal", "role": "Yếu tố ngoại hình" },
            { "text": "而是因为", "type": "grammar", "role": "Cặp liên từ khẳng định căn nguyên cốt lõi (mà là vì) (A)" },
            { "text": "她性格非常好", "type": "core", "role": "Phẩm chất nội tâm đích thực" }
        ],
        "grammar_point": {
            "name": "Cấu trúc giải thích nguyên nhân kinh điển: 之所以...不是因为...而是因为...",
            "pattern": "Chủ ngữ + 之所以 + Hành động/Tình cảm (B) + 不是因为 + Lý do phụ (C) + 而是因为 + Lý do chính (A)",
            "level": "HSK 4 Trọng điểm",
            "trap_note": "BẪY LIÊN TỪ: Cấu trúc cân xứng cố định: '之所以' (nêu kết quả trước) -> '不是因为...' (phủ định nguyên nhân giả định) -> '而是因为...' (khẳng định nguyên nhân thực chất). Trật tự duy nhất đúng là B -> C -> A.",
            "explanation": "Câu phân tích tình cảm sâu sắc, coi trọng vẻ đẹp tâm hồn và tính cách hơn là sự lôi cuốn về nhan sắc bên ngoài."
        },
        "breakdown": [
            { "role": "Nêu hiện tượng tình cảm (B)", "text": "我之所以喜欢王宣", "type": "subject", "desc": "Cụm '之所以' đặt vấn đề vì sao tôi có tình cảm với Vương Tuyên" },
            { "role": "Phủ định lý do nông cạn (C)", "text": "不是因为她长得漂亮", "type": "verb", "desc": "Bác bỏ định kiến chỉ thích vì dung mạo" },
            { "role": "Khẳng định giá trị thực chất (A)", "text": "而是因为她性格非常好", "type": "object", "desc": "Chốt lại lý do đích thực đến từ tính nết tuyệt vời" }
        ],
        "practice": {
            "type": "sentence_logic",
            "options": [
                { "id": "A", "text": "而是因为她性格非常好" },
                { "id": "B", "text": "我之所以喜欢王宣" },
                { "id": "C", "text": "不是因为她长得漂亮" }
            ],
            "correct_order": "BCA",
            "hint": "Bộ ba liên từ: 之所以 (B) -> 不是因为 (C) -> 而是因为 (A)."
        }
    },

    # =========================================================================
    # PART C: 阅读 第一部分 - 选词填空 (Cloze Test 46-55)
    # =========================================================================
    {
        "id": "hsk4_test10_q52",
        "category": "cloze",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 阅读 第一部分 (第52题)",
        "zh": "不知道，自从毕业以后，我就再也没见过他。",
        "pinyin": "bù zhī dào ， zì cóng bì yè yǐ hòu ， wǒ jiù zài yě méi jiàn guo tā 。",
        "hanviet": "Bất Tri Đáo ， Tự Tùng Tất Nghiệp Dĩ Hậu ， Ngã Tựu Tái Dã Một Kiến Quá Tha 。",
        "meaning": "Không biết nữa, kể từ sau khi tốt nghiệp đến nay, tôi chưa từng gặp lại cậu ấy thêm một lần nào nữa.",
        "tokens": [
            { "text": "不知道", "type": "normal", "role": "Lời đáp" },
            { "text": "自从", "type": "grammar", "role": "Giới từ chỉ mốc khởi đầu quá khứ (kể từ/từ khi)" },
            { "text": "毕业以后", "type": "core", "role": "Mốc sự kiện thời gian (sau khi tốt nghiệp)" },
            { "text": "我就", "type": "normal", "role": "Chủ ngữ kèm phó từ liên kết" },
            { "text": "再也没", "type": "grammar", "role": "Phó từ phủ định tuyệt đối (không bao giờ... nữa)" },
            { "text": "见过他", "type": "core", "role": "Gặp gỡ anh ấy" }
        ],
        "grammar_point": {
            "name": "Giới từ chỉ khởi điểm thời gian: 自从...以后 / 以来 kết hợp 再也没...",
            "pattern": "自从 + Sự kiện mốc + 以后 / 以来 ， 主语 + 就 + 再也没 / 不 + Động từ + 过",
            "level": "HSK 4 Trọng điểm",
            "trap_note": "BẪY TỪ HƯ: '自从' luôn đi với các mốc thời gian hoặc sự kiện đã diễn ra trong quá khứ ('毕业以后'). Cụm '再也没见过' diễn tả sự bặt vô âm tín.",
            "explanation": "Câu trả lời bùi ngùi về sự mất liên lạc giữa những người bạn sau ngày rời ghế nhà trường."
        },
        "breakdown": [
            { "role": "Lời phủ nhận thông tin", "text": "不知道", "type": "subject", "desc": "Không có tin tức hiện tại" },
            { "role": "Trạng ngữ mốc thời gian", "text": "自从毕业以后", "type": "modifier", "desc": "Giới từ '自从' xác định mốc từ khi ra trường" },
            { "role": "Tình trạng mất liên lạc tuyệt đối", "text": "我就再也没见过他", "type": "verb", "desc": "Hoàn toàn chưa từng tái ngộ" }
        ],
        "practice": {
            "type": "cloze",
            "cloze_text": "不知道，（  ）毕业以后，我就再也没见过他。",
            "options": ["自从", "换", "回忆", "开玩笑", "刚"],
            "blank_index": 0,
            "correct_answer": "自从",
            "hint": "Cần một giới từ đi với '...毕业以后' mang nghĩa 'kể từ khi'. Chọn '自从'."
        }
    },
    {
        "id": "hsk4_test10_q54",
        "category": "cloze",
        "test_id": 10,
        "source": "HSK 4 模拟试卷 10 阅读 第一部分 (第54题)",
        "zh": "别开玩笑了，我还差得远呢。",
        "pinyin": "bié kāi wán xiào le ， wǒ hái chà de yuǎn ne 。",
        "hanviet": "Biệt Khai Ngoạn Tiếu Liễu ， Ngã Hoàn Sai Đắc Viễn Nê 。",
        "meaning": "Đừng nói đùa nữa, tôi còn kém xa lắm.",
        "tokens": [
            { "text": "别", "type": "grammar", "role": "Phó từ khuyên can (đừng)" },
            { "text": "开玩笑", "type": "core", "role": "Cụm động tân khẩu ngữ (đùa cợt, nói giỡn)" },
            { "text": "了", "type": "normal", "role": "Trợ từ ngữ khí" },
            { "text": "我还", "type": "normal", "role": "Tôi vẫn còn" },
            { "text": "差得远", "type": "core", "role": "Cụm cố định thể hiện sự khiêm tốn (còn kém xa/còn xa mới tới)" },
            { "text": "呢", "type": "grammar", "role": "Trợ từ ngữ khí" }
        ],
        "grammar_point": {
            "name": "Cụm khẩu ngữ khiêm nhường 别开玩笑了 và 差得远",
            "pattern": "别 + 开玩笑 + 了 ， 我 / 他 + 还 + 差得远 + 呢",
            "level": "HSK 4 Trọng điểm",
            "trap_note": "BẪY KHẨU NGỮ: Khi người Trung Quốc nhận được lời tán dương khen ngợi quá mức, cách đáp lễ tao nhã, khiêm tốn đặc trưng nhất là '别开玩笑了，我还差得远呢' (đừng trêu tôi nữa, tôi còn kém xa).",
            "explanation": "Cụm thành ngữ khẩu ngữ phản ánh nét văn hóa khiêm tốn của người phương Đông trước những lời khen."
        },
        "breakdown": [
            { "role": "Lời thoái thác khiêm tốn", "text": "别开玩笑了", "type": "subject", "desc": "Cụm '别开玩笑' xua đi lời tán dương quá đà" },
            { "role": "Nhận định tự biết mình", "text": "我还差得远呢", "type": "verb", "desc": "Thừa nhận trình độ bản thân còn nhiều thiếu sót" }
        ],
        "practice": {
            "type": "cloze",
            "cloze_text": "别（  ）了，我还差得远呢。",
            "options": ["开玩笑", "自从", "换", "回忆", "刚"],
            "blank_index": 0,
            "correct_answer": "开玩笑",
            "hint": "Cụm khẩu ngữ đi sau '别...了' mang nghĩa 'đừng nói đùa / trêu đùa nữa'. Chọn '开玩笑'."
        }
    }
]
