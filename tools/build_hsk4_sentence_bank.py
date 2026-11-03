#!/usr/bin/env python3
"""
tools/build_hsk4_sentence_bank.py

Extracts and compiles all 120 official Hanban HSK 4 sentence-ordering questions
(HSK 4 书写 第一部分: 完成句子 - 第 86-95 题) from official mock exams H41001 to H41012.
Validates character counts, token integrity, and acceptable permutations.
Generates database/sentence/hsk4_sentence_bank.json.
"""

import json
from pathlib import Path
import re
import pypinyin

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_FILE = ROOT / "database" / "sentence" / "hsk4_sentence_bank.json"

RAW_EXAMS = {
    "H41001": [
        {
            "q": 86,
            "tokens": ["会弹钢琴的人", "羡慕", "很", "她"],
            "answers": ["她很羡慕会弹钢琴的人。", "会弹钢琴的人很羡慕她。"],
            "vi": "Cô ấy rất ngưỡng mộ người biết chơi đàn piano.",
            "grammar": "Vị ngữ miêu tả tâm lý: S + 很 + 羡慕 + O",
            "punct": "。"
        },
        {
            "q": 87,
            "tokens": ["亚洲经济的", "正在", "逐渐", "提高", "增长速度"],
            "answers": ["亚洲经济的增长速度正在逐渐提高。"],
            "vi": "Tốc độ tăng trưởng của kinh tế châu Á đang dần dần được nâng cao.",
            "grammar": "Trạng ngữ chỉ tiến trình: 正在 + 逐渐 + Động từ",
            "punct": "。"
        },
        {
            "q": 88,
            "tokens": ["专为老年人", "提供的", "这椅子", "是"],
            "answers": ["这椅子是专为老年人提供的。"],
            "vi": "Chiếc ghế này được cung cấp dành riêng cho người cao tuổi.",
            "grammar": "Cấu trúc nhấn mạnh 是...的: S + 是 + 专为...提供的",
            "punct": "。"
        },
        {
            "q": 89,
            "tokens": ["中文", "很流利", "说得", "他的"],
            "answers": ["他的中文说得很流利。"],
            "vi": "Tiếng Trung của anh ấy nói rất lưu loát.",
            "grammar": "Bổ ngữ trạng thái với 得: S + V + 得 + Tính từ",
            "punct": "。"
        },
        {
            "q": 90,
            "tokens": ["已经", "报名人数", "900", "超过了"],
            "answers": ["报名人数已经超过了 900。", "报名人数已经超过了900。"],
            "vi": "Số lượng người đăng ký đã vượt quá 900.",
            "grammar": "Trạng ngữ thời gian 已经 + Động từ kết quả 超过了 + Số lượng",
            "punct": "。"
        },
        {
            "q": 91,
            "tokens": ["请", "从小到大的顺序", "按", "排列", "这些数字"],
            "answers": ["请按从小到大的顺序排列这些数字。", "这些数字请按从小到大的顺序排列。"],
            "vi": "Xin hãy sắp xếp các con số này theo thứ tự từ nhỏ đến lớn.",
            "grammar": "Cấu trúc giới từ 按: 请 + 按...的顺序 + V + O",
            "punct": "。"
        },
        {
            "q": 92,
            "tokens": ["作者", "很有名", "小说的", "那本"],
            "answers": ["那本小说的作者很有名。"],
            "vi": "Tác giả của cuốn tiểu thuyết đó rất nổi tiếng.",
            "grammar": "Cụm định ngữ trung tâm ngữ: Lượng từ + Danh từ + 的 + Danh từ",
            "punct": "。"
        },
        {
            "q": 93,
            "tokens": ["合格的警察", "最需要的", "一个", "是责任感"],
            "answers": ["一个合格的警察最需要的是责任感。"],
            "vi": "Điều một cảnh sát đủ tiêu chuẩn cần nhất là tinh thần trách nhiệm.",
            "grammar": "Cấu trúc vị ngữ phán đoán 是: S + 最需要的是 + O",
            "punct": "。"
        },
        {
            "q": 94,
            "tokens": ["代表们", "结束", "会议", "决定"],
            "answers": ["代表们决定结束会议。"],
            "vi": "Các đại biểu quyết định kết thúc cuộc họp.",
            "grammar": "Động từ mang tân ngữ là cụm động từ: 决定 + [V + O]",
            "punct": "。"
        },
        {
            "q": 95,
            "tokens": ["对", "很熟悉", "我", "这个城市"],
            "answers": ["我对这个城市很熟悉。", "对这个城市我很熟悉。"],
            "vi": "Tôi rất quen thuộc với thành phố này.",
            "grammar": "Cấu trúc giới từ 对 biểu thị đối tượng: S + 对 + O + 很熟悉",
            "punct": "。"
        }
    ],
    "H41002": [
        {
            "q": 86,
            "tokens": ["好处", "抽烟", "对身体", "没有"],
            "answers": ["抽烟对身体没有好处。"],
            "vi": "Hút thuốc không có lợi ích gì cho sức khỏe.",
            "grammar": "Cấu trúc giới từ: 对...没有好处 (Không có lợi cho...)",
            "punct": "。"
        },
        {
            "q": 87,
            "tokens": ["我", "陪叔叔", "去长城", "看看", "打算"],
            "answers": ["我打算陪叔叔去长城看看。"],
            "vi": "Tôi dự định đi cùng chú đến Vạn Lý Trường Thành ngắm nhìn.",
            "grammar": "Câu liên động: S + 打算 + V1 (陪) + O1 + V2 (去) + O2 + V3 (看看)",
            "punct": "。"
        },
        {
            "q": 88,
            "tokens": ["个", "又脏又破", "那", "白色的盒子"],
            "answers": ["那个白色的盒子又脏又破。"],
            "vi": "Chiếc hộp màu trắng đó vừa bẩn vừa rách.",
            "grammar": "Cấu trúc liên kết tính từ: 又...又... (Vừa... lại vừa...)",
            "punct": "。"
        },
        {
            "q": 89,
            "tokens": ["妹妹", "弹钢琴的声音", "吵醒了", "把爷爷"],
            "answers": ["妹妹弹钢琴的声音把爷爷吵醒了。"],
            "vi": "Tiếng đàn piano của em gái đã đánh thức ông nội dậy.",
            "grammar": "Câu chữ 把: S + 把 + O + V + Bổ ngữ kết quả (吵醒了)",
            "punct": "。"
        },
        {
            "q": 90,
            "tokens": ["语言表达能力", "经常阅读报纸", "提高", "能"],
            "answers": ["经常阅读报纸能提高语言表达能力。"],
            "vi": "Thường xuyên đọc báo có thể nâng cao khả năng diễn đạt ngôn ngữ.",
            "grammar": "Cụm động từ làm chủ ngữ: [V + O] + 能 + V + O",
            "punct": "。"
        },
        {
            "q": 91,
            "tokens": ["举行", "这次电影艺术节", "在北京", "也许", "会"],
            "answers": ["这次电影艺术节也许会在北京举行。", "也许这次电影艺术节会在北京举行。"],
            "vi": "Liên hoan nghệ thuật điện ảnh lần này có lẽ sẽ được tổ chức tại Bắc Kinh.",
            "grammar": "Trạng ngữ giới từ chỉ nơi chốn: 也许 + 会 + 在... + 举行",
            "punct": "。"
        },
        {
            "q": 92,
            "tokens": ["整理", "儿子的复习笔记", "得", "很详细"],
            "answers": ["儿子的复习笔记整理得很详细。"],
            "vi": "Vở ghi ôn tập của con trai được sắp xếp rất tỉ mỉ, chi tiết.",
            "grammar": "Bổ ngữ trạng thái câu bị động ngầm: S + V + 得 + 很详细",
            "punct": "。"
        },
        {
            "q": 93,
            "tokens": ["请假休息", "重感冒", "让他", "不得不"],
            "answers": ["重感冒让他不得不请假休息。"],
            "vi": "Trận cảm nặng khiến anh ấy không thể không xin nghỉ ngơi.",
            "grammar": "Câu kiêm ngữ: S + 让 + Người + 不得不 + V",
            "punct": "。"
        },
        {
            "q": 94,
            "tokens": ["范围", "他说的问题", "今天讨论的", "超出了"],
            "answers": ["他说的问题超出了今天讨论的范围。"],
            "vi": "Vấn đề anh ấy nêu ra đã vượt quá phạm vi thảo luận của ngày hôm nay.",
            "grammar": "Vị ngữ động từ: S + 超出了 + Định ngữ + 范围",
            "punct": "。"
        },
        {
            "q": 95,
            "tokens": ["告诉他", "答案", "你", "最好", "别"],
            "answers": ["你最好别告诉他答案。"],
            "vi": "Bạn tốt nhất đừng nói cho anh ấy biết đáp án.",
            "grammar": "Phó từ đưa ra lời khuyên: 最好 + 别 + [V + O1 + O2]",
            "punct": "。"
        }
    ],
    "H41003": [
        {
            "q": 86,
            "tokens": ["爷爷", "非常", "感兴趣", "对", "京剧"],
            "answers": ["爷爷对京剧非常感兴趣。"],
            "vi": "Ông nội vô cùng hứng thú với kinh kịch.",
            "grammar": "Cấu trúc: 对...感兴趣 (Hứng thú với...)",
            "punct": "。"
        },
        {
            "q": 87,
            "tokens": ["请", "那张表格", "把", "两份", "打印"],
            "answers": ["请把那张表格打印两份。"],
            "vi": "Xin hãy in bảng biểu đó thành hai bản.",
            "grammar": "Câu chữ 把: 请 + 把 + O + V + Bổ ngữ số lượng",
            "punct": "。"
        },
        {
            "q": 88,
            "tokens": ["很详细", "这个传真机的", "写", "得", "说明书"],
            "answers": ["这个传真机的说明书写得很详细。"],
            "vi": "Bản hướng dẫn sử dụng của chiếc máy fax này viết rất chi tiết.",
            "grammar": "Bổ ngữ chỉ mức độ trạng thái: S + 写 + 得 + 很详细",
            "punct": "。"
        },
        {
            "q": 89,
            "tokens": ["2009 年 7 月 8 号", "我孙子", "是", "出生的"],
            "answers": ["我孙子是 2009 年 7 月 8 号出生的。", "我孙子是2009年7月8号出生的。"],
            "vi": "Cháu trai tôi sinh vào ngày 8 tháng 7 năm 2009.",
            "grammar": "Cấu trúc nhấn mạnh thời gian: 是...出生的",
            "punct": "。"
        },
        {
            "q": 90,
            "tokens": ["亿元", "许多家饭店的", "都超过了", "年收入"],
            "answers": ["许多家饭店的年收入都超过了亿元。"],
            "vi": "Thu nhập hàng năm của nhiều nhà hàng đều đã vượt qua mức trăm triệu tệ.",
            "grammar": "Phó từ 都 kết hợp bổ ngữ kết quả: 都 + 超过了 + Số từ",
            "punct": "。"
        },
        {
            "q": 91,
            "tokens": ["保证", "我", "完成", "按时", "任务"],
            "answers": ["我保证按时完成任务。"],
            "vi": "Tôi đảm bảo sẽ hoàn thành nhiệm vụ đúng giờ.",
            "grammar": "Động từ biểu thị cam kết: 保证 + [Trạng ngữ 按时 + V + O]",
            "punct": "。"
        },
        {
            "q": 92,
            "tokens": ["这个", "没有", "语法错误", "句子"],
            "answers": ["这个句子没有语法错误。"],
            "vi": "Câu văn này không hề có lỗi sai ngữ pháp.",
            "grammar": "Câu vị ngữ chữ 有/没有 biểu thị sự tồn tại hoặc sở hữu",
            "punct": "。"
        },
        {
            "q": 93,
            "tokens": ["马上", "结束了", "就要", "这场足球赛"],
            "answers": ["这场足球赛马上就要结束了。", "马上这场足球赛就要结束了。"],
            "vi": "Trận đấu bóng đá này sắp kết thúc ngay bây giờ.",
            "grammar": "Cấu trúc thời gian tương lai gần: 马上就要...了",
            "punct": "。"
        },
        {
            "q": 94,
            "tokens": ["不知道", "难道你", "连这个规定", "都"],
            "answers": ["难道你连这个规定都不知道？"],
            "vi": "Lẽ nào ngay cả quy định này mà bạn cũng không biết sao?",
            "grammar": "Câu phản vấn kết hợp cấu trúc nhấn mạnh: 难道... + 连...都...",
            "punct": "？"
        },
        {
            "q": 95,
            "tokens": ["顺利", "祝", "你们", "这次访问", "一切"],
            "answers": ["祝你们这次访问一切顺利。"],
            "vi": "Chúc chuyến thăm lần này của các bạn mọi sự thuận lợi.",
            "grammar": "Cấu trúc câu chúc tụng: 祝 + Đối tượng + 一切顺利",
            "punct": "。"
        }
    ],
    "H41004": [
        {
            "q": 86,
            "tokens": ["钥匙", "里", "在", "塑料袋"],
            "answers": ["钥匙在塑料袋里。"],
            "vi": "Chìa khóa ở bên trong túi ni-lông.",
            "grammar": "Câu vị ngữ giới từ vị trí: S + 在 + Địa điểm / Phương vị từ 里",
            "punct": "。"
        },
        {
            "q": 87,
            "tokens": ["这次机会", "把", "教授", "竟然", "放弃了"],
            "answers": ["教授竟然把这次机会放弃了。"],
            "vi": "Giáo sư thế mà lại từ bỏ cơ hội lần này.",
            "grammar": "Phó từ 竟然 biểu thị bất ngờ kết hợp câu chữ 把",
            "punct": "。"
        },
        {
            "q": 88,
            "tokens": ["一头牛", "看起来", "那座山", "像"],
            "answers": ["那座山看起来像一头牛。"],
            "vi": "Ngọn núi đó nhìn trông giống như một con bò.",
            "grammar": "Cấu trúc nhận xét: S + 看起来像 + O",
            "punct": "。"
        },
        {
            "q": 89,
            "tokens": ["下雨", "很湿润", "后", "空气"],
            "answers": ["下雨后空气很湿润。", "空气下雨后很湿润。"],
            "vi": "Sau khi mưa không khí rất ẩm ướt, dễ chịu.",
            "grammar": "Trạng ngữ chỉ thời gian: ...后 + S + 很 + Tính từ",
            "punct": "。"
        },
        {
            "q": 90,
            "tokens": ["招聘", "银行", "高级主管", "决定", "一名"],
            "answers": ["银行决定招聘一名高级主管。"],
            "vi": "Ngân hàng quyết định tuyển dụng một giám đốc điều hành cấp cao.",
            "grammar": "Động từ mang tân ngữ phức: 决定 + [招聘 + Lượng từ + Danh từ]",
            "punct": "。"
        },
        {
            "q": 91,
            "tokens": ["那位", "深受", "演员", "观众的喜爱", "著名的"],
            "answers": ["那位著名的演员深受观众的喜爱。"],
            "vi": "Người diễn viên nổi tiếng đó nhận được sự yêu thích sâu sắc của khán giả.",
            "grammar": "Cấu trúc cố định: 深受...的喜爱 (Rất được... yêu thích)",
            "punct": "。"
        },
        {
            "q": 92,
            "tokens": ["北京语音", "标准音", "普通话", "以", "为"],
            "answers": ["普通话以北京语音为标准音。"],
            "vi": "Tiếng phổ thông lấy ngữ âm Bắc Kinh làm âm chuẩn.",
            "grammar": "Cấu trúc ngữ pháp HSK 4: 以...为... (Lấy... làm...)",
            "punct": "。"
        },
        {
            "q": 93,
            "tokens": ["反对的", "知道校长", "原因", "没人"],
            "answers": ["没人知道校长反对的原因。"],
            "vi": "Không một ai biết lý do hiệu trưởng phản đối.",
            "grammar": "Đại từ phủ định 没人 + V + Cụm định ngữ [校长反对的] + 原因",
            "punct": "。"
        },
        {
            "q": 94,
            "tokens": ["禁止", "打电话", "加油站", "附近"],
            "answers": ["加油站附近禁止打电话。"],
            "vi": "Gần trạm xăng cấm gọi điện thoại.",
            "grammar": "Cụm danh từ nơi chốn + Động từ cấm đoán 禁止 + Hành động",
            "punct": "。"
        },
        {
            "q": 95,
            "tokens": ["进行了", "同学们", "调查", "在超市"],
            "answers": ["同学们在超市进行了调查。"],
            "vi": "Các bạn học sinh đã tiến hành cuộc điều tra tại siêu thị.",
            "grammar": "Trạng ngữ địa điểm 在... + Động từ 进行 + Tân ngữ 调查",
            "punct": "。"
        }
    ],
    "H41005": [
        {
            "q": 86,
            "tokens": ["你", "关了", "把窗户", "吗"],
            "answers": ["你把窗户关了吗？"],
            "vi": "Bạn đã đóng cửa sổ lại chưa?",
            "grammar": "Câu chữ 把 dạng nghi vấn: S + 把 + O + V + 了 + 吗",
            "punct": "？"
        },
        {
            "q": 87,
            "tokens": ["拉近", "了", "人与人之间的", "手机", "距离"],
            "answers": ["手机拉近了人与人之间的距离。"],
            "vi": "Điện thoại di động đã kéo gần khoảng cách giữa người với người.",
            "grammar": "Bổ ngữ kết quả: 拉近 + 了 + [Định ngữ + 距离]",
            "punct": "。"
        },
        {
            "q": 88,
            "tokens": ["去年秋天", "我孙子", "出生", "是", "的"],
            "answers": ["我孙子是去年秋天出生的。"],
            "vi": "Cháu trai tôi sinh vào mùa thu năm ngoái.",
            "grammar": "Cấu trúc nhấn mạnh thời gian quá khứ: 是...的",
            "punct": "。"
        },
        {
            "q": 89,
            "tokens": ["打针", "好", "比吃药", "效果"],
            "answers": ["打针比吃药效果好。"],
            "vi": "Tiêm thuốc có hiệu quả tốt hơn là uống thuốc.",
            "grammar": "Câu so sánh chữ 比: A + 比 + B + Vị ngữ chủ vị (效果好)",
            "punct": "。"
        },
        {
            "q": 90,
            "tokens": ["这个城市", "出租车的数量", "决定", "增加"],
            "answers": ["这个城市决定增加出租车的数量。"],
            "vi": "Thành phố này quyết định gia tăng số lượng xe taxi.",
            "grammar": "Chủ ngữ chỉ địa phương + 决定 + V + Tân ngữ",
            "punct": "。"
        },
        {
            "q": 91,
            "tokens": ["非常", "大", "影响范围", "这场降水", "的"],
            "answers": ["这场降水的影响范围非常大。"],
            "vi": "Phạm vi ảnh hưởng của trận mưa này vô cùng rộng lớn.",
            "grammar": "Định ngữ + 的 + Trung tâm ngữ + Phó từ mức độ 非常 + Tính từ 大",
            "punct": "。"
        },
        {
            "q": 92,
            "tokens": ["工具书", "是", "一本", "现代汉语词典"],
            "answers": ["现代汉语词典是一本工具书。", "《现代汉语词典》是一本工具书。"],
            "vi": "Từ điển Hán ngữ hiện đại là một cuốn sách công cụ tra cứu.",
            "grammar": "Câu vị ngữ phán đoán 是: S + 是 + Lượng từ + Danh từ",
            "punct": "。"
        },
        {
            "q": 93,
            "tokens": ["哥哥", "睡不着觉", "得", "兴奋"],
            "answers": ["哥哥兴奋得睡不着觉。"],
            "vi": "Anh trai phấn khích đến mức không ngủ được.",
            "grammar": "Bổ ngữ mức độ / trạng thái: Tính từ 兴奋 + 得 + Cụm động từ",
            "punct": "。"
        },
        {
            "q": 94,
            "tokens": ["好处", "抽烟对你", "没有", "一点儿"],
            "answers": ["抽烟对你没有一点儿好处。", "抽烟对你一点儿好处没有。"],
            "vi": "Hút thuốc không có một chút lợi ích nào cho bạn cả.",
            "grammar": "Cấu trúc nhấn mạnh phủ định: 没有 + 一点儿 + Danh từ",
            "punct": "。"
        },
        {
            "q": 95,
            "tokens": ["完全", "国家的", "这么做", "符合", "法律规定"],
            "answers": ["这么做完全符合国家的法律规定。"],
            "vi": "Làm như vậy hoàn toàn phù hợp với quy định pháp luật của quốc gia.",
            "grammar": "Phó từ 完全 + Động từ 符合 + Cụm danh từ định tân",
            "punct": "。"
        }
    ],
    "H41006": [
        {
            "q": 86,
            "tokens": ["质量", "你的", "怎么样", "笔记本电脑"],
            "answers": ["你的笔记本电脑质量怎么样？"],
            "vi": "Máy tính xách tay của bạn chất lượng thế nào?",
            "grammar": "Câu nghi vấn hỏi trạng thái: Chủ ngữ lớn + Chủ ngữ nhỏ + 怎么样",
            "punct": "？"
        },
        {
            "q": 87,
            "tokens": ["为我们", "提供了", "牙刷和牙膏", "宾馆"],
            "answers": ["宾馆为我们提供了牙刷和牙膏。"],
            "vi": "Khách sạn đã cung cấp bàn chải và kem đánh răng cho chúng tôi.",
            "grammar": "Cấu trúc giới từ 为: 为... + 提供 + O",
            "punct": "。"
        },
        {
            "q": 88,
            "tokens": ["温度", "比较", "室内", "低"],
            "answers": ["室内温度比较低。"],
            "vi": "Nhiệt độ trong phòng tương đối thấp.",
            "grammar": "Phó từ 比较 bổ nghĩa cho tính từ: 比较 + 低",
            "punct": "。"
        },
        {
            "q": 89,
            "tokens": ["把", "家里", "母亲", "整整齐齐", "收拾得"],
            "answers": ["母亲把家里收拾得整整齐齐。"],
            "vi": "Mẹ đã dọn dẹp nhà cửa ngăn nắp, gọn gàng đâu ra đấy.",
            "grammar": "Câu chữ 把 kết hợp bổ ngữ trạng thái: S + 把 + O + V + 得 + Tính từ láy AABB",
            "punct": "。"
        },
        {
            "q": 90,
            "tokens": ["俩", "没通过", "普通话考试", "她们"],
            "answers": ["她们俩没通过普通话考试。"],
            "vi": "Hai người họ đã không vượt qua kỳ thi tiếng phổ thông.",
            "grammar": "Chủ ngữ số lượng 她们俩 + Phó từ phủ định 没 + Động từ 通过 + Tân ngữ",
            "punct": "。"
        },
        {
            "q": 91,
            "tokens": ["效果", "很", "好", "这个方法"],
            "answers": ["这个方法效果很好。"],
            "vi": "Phương pháp này hiệu quả rất tốt.",
            "grammar": "Câu vị ngữ chủ vị: Chủ ngữ lớn (这个方法) + Vị ngữ chủ vị (效果很好)",
            "punct": "。"
        },
        {
            "q": 92,
            "tokens": ["那个警察", "任务", "完成了", "顺利地"],
            "answers": ["那个警察顺利地完成了任务。"],
            "vi": "Người cảnh sát đó đã hoàn thành nhiệm vụ một cách thuận lợi.",
            "grammar": "Trạng ngữ phương thức với 地: S + 顺利地 + V + 了 + O",
            "punct": "。"
        },
        {
            "q": 93,
            "tokens": ["邀请信", "收到", "三分之一的报名者", "会"],
            "answers": ["三分之一的报名者会收到邀请信。"],
            "vi": "Một phần ba số người đăng ký sẽ nhận được thư mời.",
            "grammar": "Chủ ngữ phân số: 三分之一的... + Động từ năng nguyện 会 + V + O",
            "punct": "。"
        },
        {
            "q": 94,
            "tokens": ["他", "负责", "技术工作", "网站", "的"],
            "answers": ["他负责网站的技术工作。"],
            "vi": "Anh ấy phụ trách công tác kỹ thuật của trang web.",
            "grammar": "Động từ 负责 mang cụm tân ngữ định tân: 负责 + [网站的技术工作]",
            "punct": "。"
        },
        {
            "q": 95,
            "tokens": ["两名售货员", "招聘", "楼下的商店", "要"],
            "answers": ["楼下的商店要招聘两名售货员。"],
            "vi": "Cửa hàng dưới lầu muốn tuyển dụng hai nhân viên bán hàng.",
            "grammar": "Trợ động từ 要 biểu thị ý định: S + 要 + 招聘 + Số lượng từ + Danh từ",
            "punct": "。"
        }
    ],
    "H41007": [
        {
            "q": 86,
            "tokens": ["你最好", "一个密码", "重新", "换"],
            "answers": ["你最好重新换一个密码。"],
            "vi": "Bạn tốt nhất nên đổi lại một mật khẩu mới.",
            "grammar": "Phó từ khuyên can 最好 + Phó từ 重新 + V + O",
            "punct": "。"
        },
        {
            "q": 87,
            "tokens": ["不允许", "医院", "抽烟", "里"],
            "answers": ["医院里不允许抽烟。"],
            "vi": "Trong bệnh viện không cho phép hút thuốc lá.",
            "grammar": "Chủ ngữ nơi chốn + 不允许 + Động từ hành vi",
            "punct": "。"
        },
        {
            "q": 88,
            "tokens": ["看法", "我", "跟你的", "差不多"],
            "answers": ["我跟你的看法差不多。"],
            "vi": "Quan điểm của tôi gần như tương đồng với bạn.",
            "grammar": "Cấu trúc so sánh tương đồng: A + 跟 + B + 差不多",
            "punct": "。"
        },
        {
            "q": 89,
            "tokens": ["发生了", "这儿究竟", "什么", "事情"],
            "answers": ["这儿究竟发生了什么事情？"],
            "vi": "Ở đây rốt cuộc đã xảy ra chuyện gì vậy?",
            "grammar": "Phó từ nhấn mạnh truy vấn 究竟 + V + 什么 + Danh từ",
            "punct": "？"
        },
        {
            "q": 90,
            "tokens": ["他", "一个", "美丽的", "小城市", "出生在"],
            "answers": ["他出生在一个美丽的小城市。"],
            "vi": "Anh ấy sinh ra tại một thành phố nhỏ xinh đẹp.",
            "grammar": "Động từ mang bổ ngữ kết quả giới từ: 出生在 + [Cụm danh từ]",
            "punct": "。"
        },
        {
            "q": 91,
            "tokens": ["房间", "把", "收拾得", "姐姐", "很整齐"],
            "answers": ["姐姐把房间收拾得很整齐。"],
            "vi": "Chị gái đã dọn dẹp căn phòng rất ngăn nắp gọn gàng.",
            "grammar": "Câu chữ 把 kết hợp bổ ngữ trạng thái: S + 把 + O + V + 得 + 很整齐",
            "punct": "。"
        },
        {
            "q": 92,
            "tokens": ["是", "负责的", "由李经理", "这次调查"],
            "answers": ["这次调查是由李经理负责的。"],
            "vi": "Cuộc điều tra này là do giám đốc Lý chịu trách nhiệm thực hiện.",
            "grammar": "Cấu trúc nhấn mạnh chủ thể thực hiện: 是由...负责的",
            "punct": "。"
        },
        {
            "q": 93,
            "tokens": ["反对这样做", "大概", "三分之二的人", "有"],
            "answers": ["大概有三分之二的人反对这样做。"],
            "vi": "Khoảng chừng có tới hai phần ba số người phản đối làm như thế này.",
            "grammar": "Phó từ ước lượng 大概 + Động từ 有 + Chủ ngữ kiêm ngữ + V",
            "punct": "。"
        },
        {
            "q": 94,
            "tokens": ["学校", "去参观", "长城", "将", "组织大家"],
            "answers": ["学校将组织大家去参观长城。"],
            "vi": "Nhà trường sẽ tổ chức cho mọi người đi tham quan Vạn Lý Trường Thành.",
            "grammar": "Phó từ thời gian 将 + Câu kiêm ngữ liên động: 组织大家 + 去参观...",
            "punct": "。"
        },
        {
            "q": 95,
            "tokens": ["对", "非常感谢您", "理解和支持", "我们工作的"],
            "answers": ["非常感谢您对我们工作的理解和支持。"],
            "vi": "Vô cùng cảm ơn bạn đã thấu hiểu và ủng hộ công việc của chúng tôi.",
            "grammar": "Cấu trúc giới từ 对 biểu thị đối tượng đón nhận sự biết ơn",
            "punct": "。"
        }
    ],
    "H41008": [
        {
            "q": 86,
            "tokens": ["电梯", "正常", "使用了", "已经可以"],
            "answers": ["电梯已经可以正常使用了。"],
            "vi": "Thang máy đã có thể sử dụng bình thường được rồi.",
            "grammar": "Trạng ngữ phương thức 正常 + Sử dụng: 可以 + 正常使用 + 了",
            "punct": "。"
        },
        {
            "q": 87,
            "tokens": ["乘坐我们的", "航班", "欢迎", "您再次"],
            "answers": ["欢迎您再次乘坐我们的航班。"],
            "vi": "Hoan nghênh quý khách một lần nữa đi trên chuyến bay của chúng tôi.",
            "grammar": "Câu chào mừng khách hàng: 欢迎您 + 再次 + V + Tân ngữ",
            "punct": "。"
        },
        {
            "q": 88,
            "tokens": ["你们", "解决问题的", "方法了吗", "商量出"],
            "answers": ["你们商量出解决问题的方法了吗？"],
            "vi": "Các bạn đã bàn bạc ra phương pháp giải quyết vấn đề chưa?",
            "grammar": "Bổ ngữ kết quả: 商量出 + [Định ngữ + 方法] + 了吗",
            "punct": "？"
        },
        {
            "q": 89,
            "tokens": ["改变", "第一印象往往", "很", "难"],
            "answers": ["第一印象往往很难改变。"],
            "vi": "Ấn tượng đầu tiên thường rất khó để thay đổi.",
            "grammar": "Phó từ tần suất quy luật 往往 + [很 + 难 + V]",
            "punct": "。"
        },
        {
            "q": 90,
            "tokens": ["消息", "真是", "这个", "激动了", "太让人"],
            "answers": ["这个消息真是太让人激动了！", "这个消息真是太让人激动了。"],
            "vi": "Tin tức này quả thực khiến người ta quá đỗi xúc động vui mừng!",
            "grammar": "Cấu trúc cảm thán kiêm ngữ: 真是 + 太让人 + Tính từ + 了",
            "punct": "！"
        },
        {
            "q": 91,
            "tokens": ["共同语言", "他们俩", "许多", "有"],
            "answers": ["他们俩有许多共同语言。"],
            "vi": "Hai người bọn họ có rất nhiều tiếng nói chung.",
            "grammar": "Câu chữ 有: S + 有 + Số lượng từ 许多 + Danh từ",
            "punct": "。"
        },
        {
            "q": 92,
            "tokens": ["这场", "赢得", "比赛", "非常漂亮"],
            "answers": ["这场比赛赢得非常漂亮。"],
            "vi": "Trận thi đấu này đã giành chiến thắng vô cùng đẹp mắt.",
            "grammar": "Bổ ngữ trạng thái câu bị động ngầm: S + 赢得 + 非常漂亮",
            "punct": "。"
        },
        {
            "q": 93,
            "tokens": ["任何事情的", "发生", "有原因的", "都是"],
            "answers": ["任何事情的发生都是有原因的。"],
            "vi": "Sự xảy ra của bất cứ việc gì đều có nguyên nhân của nó.",
            "grammar": "Cấu trúc khẳng định tuyệt đối: 都是...的",
            "punct": "。"
        },
        {
            "q": 94,
            "tokens": ["互联网", "距离", "人与人之间的", "拉近了"],
            "answers": ["互联网拉近了人与人之间的距离。"],
            "vi": "Internet đã kéo gần khoảng cách giữa người với người.",
            "grammar": "Động từ kết quả 拉近 + 了 + [Định ngữ + 距离]",
            "punct": "。"
        },
        {
            "q": 95,
            "tokens": ["这篇文章", "把", "请", "翻译成", "中文"],
            "answers": ["请把这篇文章翻译成中文。"],
            "vi": "Xin hãy dịch bài viết này sang tiếng Trung.",
            "grammar": "Câu chữ 把 kết hợp bổ ngữ kết quả 成: 请 + 把 + O + 翻译成 + Ngôn ngữ",
            "punct": "。"
        }
    ],
    "H41009": [
        {
            "q": 86,
            "tokens": ["就想", "她从小", "成为", "一名演员"],
            "answers": ["她从小就想成为一名演员。"],
            "vi": "Cô ấy từ nhỏ đã muốn trở thành một diễn viên.",
            "grammar": "Trạng ngữ thời gian 从小 + 就想 + 成为 + Danh từ",
            "punct": "。"
        },
        {
            "q": 87,
            "tokens": ["儿童牙膏", "十分", "受欢迎", "这种"],
            "answers": ["这种儿童牙膏十分受欢迎。"],
            "vi": "Loại kem đánh răng trẻ em này vô cùng được ưa chuộng.",
            "grammar": "Phó từ mức độ 十分 + Cụm tính từ 受欢迎",
            "punct": "。"
        },
        {
            "q": 88,
            "tokens": ["他", "越来越", "厉害", "得", "咳嗽"],
            "answers": ["他咳嗽得越来越厉害。"],
            "vi": "Anh ấy ho ngày càng dữ dội hơn.",
            "grammar": "Bổ ngữ trạng thái kết hợp cấu trúc tăng tiến: V + 得 + 越来越 + Tính từ",
            "punct": "。"
        },
        {
            "q": 89,
            "tokens": ["先", "调查一下", "难道", "你没有"],
            "answers": ["难道你没有先调查一下？"],
            "vi": "Chẳng lẽ bạn đã không điều tra qua trước hay sao?",
            "grammar": "Phó từ phản vấn 难道 + [Phủ định 没有 + 先 + V一下]",
            "punct": "？"
        },
        {
            "q": 90,
            "tokens": ["把", "扔进", "空瓶子", "请", "垃圾桶"],
            "answers": ["请把空瓶子扔进垃圾桶。"],
            "vi": "Xin vui lòng vứt vỏ chai rỗng vào thùng rác.",
            "grammar": "Câu chữ 把 kết hợp bổ ngữ xu hướng / kết quả: 把 + O + 扔进 + Nơi chốn",
            "punct": "。"
        },
        {
            "q": 91,
            "tokens": ["大家的", "共同努力", "保护环境", "需要"],
            "answers": ["保护环境需要大家的共同努力。"],
            "vi": "Bảo vệ môi trường cần có sự nỗ lực chung của tất cả mọi người.",
            "grammar": "Cụm động tân làm chủ ngữ: [保护环境] + 需要 + Cụm tân ngữ",
            "punct": "。"
        },
        {
            "q": 92,
            "tokens": ["里", "有两棵", "张教授家的院子", "苹果树"],
            "answers": ["张教授家的院子里有两棵苹果树。"],
            "vi": "Trong sân nhà giáo sư Trương có hai cây táo.",
            "grammar": "Câu vị ngữ tồn hiện: Từ chỉ nơi chốn 里 + 有 + Số lượng từ + Danh từ",
            "punct": "。"
        },
        {
            "q": 93,
            "tokens": ["大约", "1084 公里", "北京", "离上海"],
            "answers": ["北京离上海大约 1084 公里。", "北京离上海大约1084公里。"],
            "vi": "Bắc Kinh cách Thượng Hải khoảng chừng 1084 ki-lô-mét.",
            "grammar": "Cấu trúc khoảng cách giới từ 离: A + 离 + B + 大约 + Khoảng cách",
            "punct": "。"
        },
        {
            "q": 94,
            "tokens": ["很快就被", "亲戚朋友们", "这个消息", "知道了"],
            "answers": ["这个消息很快就被亲戚朋友们知道了。"],
            "vi": "Tin tức này rất nhanh chóng đã được người thân và bạn bè biết đến.",
            "grammar": "Câu chữ 被 biểu thị bị động: S + 很快就被 + Tác nhân + 知道了",
            "punct": "。"
        },
        {
            "q": 95,
            "tokens": ["收入", "比去年", "今年公司的", "增加了一倍"],
            "answers": ["今年公司的收入比去年增加了一倍。"],
            "vi": "Thu nhập năm nay của công ty so với năm ngoái đã tăng lên gấp đôi.",
            "grammar": "Câu so sánh mức độ chữ 比: A + 比 + B + 增加了一倍",
            "punct": "。"
        }
    ],
    "H41010": [
        {
            "q": 86,
            "tokens": ["吃光了", "那盒饼干", "被", "儿子"],
            "answers": ["那盒饼干被儿子吃光了。"],
            "vi": "Hộp bánh quy đó đã bị con trai ăn sạch sành sanh rồi.",
            "grammar": "Câu chữ 被: S + 被 + Tác nhân + V + Bổ ngữ kết quả 光了",
            "punct": "。"
        },
        {
            "q": 87,
            "tokens": ["都进行得", "顺利", "很", "所有的事"],
            "answers": ["所有的事都进行得很顺利。"],
            "vi": "Mọi việc đều được tiến hành rất suôn sẻ thuận lợi.",
            "grammar": "Bổ ngữ trạng thái: 都 + 进行 + 得 + 很顺利",
            "punct": "。"
        },
        {
            "q": 88,
            "tokens": ["解决", "问题", "发脾气", "并", "不能"],
            "answers": ["发脾气并不能解决问题。"],
            "vi": "Nổi nóng tức giận vốn chẳng thể giải quyết được vấn đề.",
            "grammar": "Phó từ nhấn mạnh 并 kết hợp phủ định: 并 + 不能 + V + O",
            "punct": "。"
        },
        {
            "q": 89,
            "tokens": ["经验", "慢慢", "是需要", "积累的"],
            "answers": ["经验是需要慢慢积累的。"],
            "vi": "Kinh nghiệm là điều cần phải từ từ tích lũy.",
            "grammar": "Cấu trúc nhấn mạnh tính chất: 是需要...的",
            "punct": "。"
        },
        {
            "q": 90,
            "tokens": ["词语的用法", "区别", "这两个", "有什么"],
            "answers": ["这两个词语的用法有什么区别？"],
            "vi": "Cách dùng của hai từ ngữ này có điểm gì khác biệt?",
            "grammar": "Câu hỏi nghi vấn tồn tại: S + 有什么区别？",
            "punct": "？"
        },
        {
            "q": 91,
            "tokens": ["这条", "稍微", "裤子", "厚", "有点儿"],
            "answers": ["这条裤子稍微有点儿厚。"],
            "vi": "Chiếc quần này hơi có phần hơi dày một chút.",
            "grammar": "Phó từ mức độ: 稍微 + 有点儿 + Tính từ 厚",
            "punct": "。"
        },
        {
            "q": 92,
            "tokens": ["不打算", "留学", "我暂时", "还"],
            "answers": ["我暂时还不打算留学。"],
            "vi": "Tôi tạm thời vẫn chưa có kế hoạch đi du học.",
            "grammar": "Trạng ngữ thời gian 暂时 + Phó từ 还 + 不打算 + Động từ",
            "punct": "。"
        },
        {
            "q": 93,
            "tokens": ["比去年", "今年报名的", "人数", "减少了", "一半儿"],
            "answers": ["今年报名的人数比去年减少了一半儿。"],
            "vi": "Số lượng người đăng ký năm nay so với năm ngoái đã giảm đi một nửa.",
            "grammar": "Câu so sánh biến động số lượng: A + 比 + B + 减少了 + Số lượng",
            "punct": "。"
        },
        {
            "q": 94,
            "tokens": ["能帮我", "把", "抬到客厅", "吗", "沙发"],
            "answers": ["能帮我把沙发抬到客厅吗？"],
            "vi": "Bạn có thể giúp tôi khiêng chiếc ghế sô-pha ra phòng khách được không?",
            "grammar": "Câu cầu khiến chữ 把: 能帮我 + 把 + O + 抬到 + Nơi chốn + 吗",
            "punct": "？"
        },
        {
            "q": 95,
            "tokens": ["降落在", "飞机", "首都机场", "将于 15 分钟后"],
            "answers": ["飞机将于 15 分钟后降落在首都机场。", "飞机将于15分钟后降落在首都机场。"],
            "vi": "Máy bay sẽ hạ cánh xuống sân bay thủ đô sau 15 phút nữa.",
            "grammar": "Giới từ trang trọng 于: 将 + 于...后 + 降落在 + Địa điểm",
            "punct": "。"
        }
    ],
    "H41011": [
        {
            "q": 86,
            "tokens": ["不错", "这台", "质量", "洗衣机的"],
            "answers": ["这台洗衣机的质量不错。"],
            "vi": "Chất lượng của chiếc máy giặt này khá tốt.",
            "grammar": "Câu vị ngữ tính từ: Định ngữ + 的 + Danh từ + 不错",
            "punct": "。"
        },
        {
            "q": 87,
            "tokens": ["著名的", "是", "她丈夫", "京剧演员"],
            "answers": ["她丈夫是著名的京剧演员。"],
            "vi": "Chồng của cô ấy là một diễn viên kinh kịch nổi tiếng.",
            "grammar": "Câu phán đoán 是: S + 是 + Định ngữ + Danh từ",
            "punct": "。"
        },
        {
            "q": 88,
            "tokens": ["我", "客厅", "把", "收拾", "好了"],
            "answers": ["我把客厅收拾好了。"],
            "vi": "Tôi đã dọn dẹp phòng khách tươm tất xong xuôi rồi.",
            "grammar": "Câu chữ 把 kết hợp bổ ngữ kết quả 好: S + 把 + O + 收拾好了",
            "punct": "。"
        },
        {
            "q": 89,
            "tokens": ["两", "公里", "大概有", "加油站离这儿"],
            "answers": ["加油站离这儿大概有两公里。"],
            "vi": "Trạm xăng cách chỗ này khoảng chừng hai cây số.",
            "grammar": "Cấu trúc cự ly: A + 离 + B + 大概有 + Khoảng cách",
            "punct": "。"
        },
        {
            "q": 90,
            "tokens": ["发生", "在", "这个故事", "上个世纪末"],
            "answers": ["这个故事发生在上个世纪末。"],
            "vi": "Câu chuyện này xảy ra vào cuối thế kỷ trước.",
            "grammar": "Động từ mang bổ ngữ kết quả giới từ: 发生在 + Thời gian",
            "punct": "。"
        },
        {
            "q": 91,
            "tokens": ["意见和看法", "谈了", "大家", "都", "自己的"],
            "answers": ["大家都谈了自己的意见和看法。"],
            "vi": "Mọi người đều đã phát biểu ý kiến và quan điểm của bản thân mình.",
            "grammar": "Phó từ 都 + Động từ 谈了 + [Định ngữ + Danh từ kết hợp]",
            "punct": "。"
        },
        {
            "q": 92,
            "tokens": ["要", "好习惯", "的", "养成", "节约用水"],
            "answers": ["要养成节约用水的好习惯。"],
            "vi": "Cần phải rèn luyện thói quen tốt tiết kiệm nước.",
            "grammar": "Động từ năng nguyện 要 + 养成 + [Định ngữ + 的 + 好习惯]",
            "punct": "。"
        },
        {
            "q": 93,
            "tokens": ["普通话", "他的", "说得", "不太标准"],
            "answers": ["他的普通话说得不太标准。"],
            "vi": "Tiếng phổ thông của anh ấy nói chưa được chuẩn xác lắm.",
            "grammar": "Bổ ngữ trạng thái: S + 说得 + 不太 + Tính từ",
            "punct": "。"
        },
        {
            "q": 94,
            "tokens": ["出发还", "吗", "你现在", "来得及"],
            "answers": ["你现在出发还来得及吗？"],
            "vi": "Bây giờ bạn mới xuất phát thì có còn kịp không?",
            "grammar": "Động từ khả năng 来得及 trong câu hỏi nghi vấn",
            "punct": "？"
        },
        {
            "q": 95,
            "tokens": ["排好队", "按照", "顺序", "请同学们"],
            "answers": ["请同学们按照顺序排好队。"],
            "vi": "Mời các bạn học sinh xếp hàng theo đúng thứ tự.",
            "grammar": "Cấu trúc giới từ 按照: 请 + 按照 + 顺序 + V bổ ngữ kết quả 好",
            "punct": "。"
        }
    ],
    "H41012": [
        {
            "q": 86,
            "tokens": ["我", "适应了这里的", "已经", "气候"],
            "answers": ["我已经适应了这里的气候。"],
            "vi": "Tôi đã thích nghi được với khí hậu ở nơi đây rồi.",
            "grammar": "Phó từ thời gian 已经 + Động từ 适应了 + Cụm tân ngữ",
            "punct": "。"
        },
        {
            "q": 87,
            "tokens": ["计划", "原来的", "他不得不", "改变"],
            "answers": ["他不得不改变原来的计划。"],
            "vi": "Anh ấy buộc phải thay đổi kế hoạch ban đầu.",
            "grammar": "Phó từ kép phủ định kép: 不得不 + V + Định ngữ + Tân ngữ",
            "punct": "。"
        },
        {
            "q": 88,
            "tokens": ["举个例子", "你能", "证明", "吗"],
            "answers": ["你能举个例子证明吗？"],
            "vi": "Bạn có thể nêu ra một ví dụ để chứng minh không?",
            "grammar": "Câu liên động biểu thị mục đích: 能 + [举个例子] + [证明] + 吗",
            "punct": "？"
        },
        {
            "q": 89,
            "tokens": ["都", "完成了", "今年所有的", "任务"],
            "answers": ["今年所有的任务都完成了。"],
            "vi": "Tất cả các nhiệm vụ của năm nay đều đã được hoàn thành.",
            "grammar": "Câu bị động ngầm: Chủ ngữ chỉ vật + 都 + 完成了",
            "punct": "。"
        },
        {
            "q": 90,
            "tokens": ["这个班的", "大部分学生", "亚洲", "来自"],
            "answers": ["这个班的大部分学生来自亚洲。"],
            "vi": "Đa số học sinh của lớp này đều đến từ châu Á.",
            "grammar": "Động từ phương hướng 来自 + Địa danh châu lục",
            "punct": "。"
        },
        {
            "q": 91,
            "tokens": ["生活的压力", "并没有", "放弃", "理想", "使他"],
            "answers": ["生活的压力并没有使他放弃理想。"],
            "vi": "Áp lực của cuộc sống không hề khiến anh ấy từ bỏ lý tưởng.",
            "grammar": "Câu kiêm ngữ chữ 使 kết hợp phó từ phủ định 并没有",
            "punct": "。"
        },
        {
            "q": 92,
            "tokens": ["每个人的", "是我们", "责任", "保护环境"],
            "answers": ["保护环境是我们每个人的责任。"],
            "vi": "Bảo vệ môi trường là trách nhiệm của mỗi một người trong chúng ta.",
            "grammar": "Cụm động tân làm chủ ngữ + 是 + Cụm danh từ định tân",
            "punct": "。"
        },
        {
            "q": 93,
            "tokens": ["您女儿", "真", "棒", "钢琴", "弹得"],
            "answers": ["您女儿钢琴弹得真棒！", "您女儿钢琴弹得真棒。"],
            "vi": "Con gái của bác chơi đàn piano thật là tuyệt vời!",
            "grammar": "Bổ ngữ trạng thái câu vị ngữ chủ vị: S + O + V + 得 + 真棒",
            "punct": "！"
        },
        {
            "q": 94,
            "tokens": ["那些", "旧杂志", "你", "把", "整理一下"],
            "answers": ["你把那些旧杂志整理一下。"],
            "vi": "Bạn hãy thu dọn, sắp xếp lại số tạp chí cũ đó một chút.",
            "grammar": "Câu chữ 把 biểu thị xử lý đối tượng: S + 把 + O + V一下",
            "punct": "。"
        },
        {
            "q": 95,
            "tokens": ["最多", "这部电梯", "16 个人", "乘坐", "能"],
            "answers": ["这部电梯最多能乘坐 16 个人。", "这部电梯最多能乘坐16个人。"],
            "vi": "Chiếc thang máy này tối đa có thể chở được 16 người.",
            "grammar": "Trạng ngữ mức độ 最多 + Năng nguyện 能 + Động từ + Số lượng từ",
            "punct": "。"
        }
    ]
}

def generate_pinyin(zh: str) -> str:
    # clean punctuation
    clean = re.sub(r'[。？！，、“”《》\s]', '', zh)
    py_list = pypinyin.lazy_pinyin(clean, style=pypinyin.Style.TONE)
    # Join with capitalization on first word
    py_str = " ".join(py_list)
    if py_str:
        py_str = py_str[0].upper() + py_str[1:]
    return py_str

def main():
    compiled_data = []
    total_valid = 0

    for exam_id, q_list in RAW_EXAMS.items():
        exam_num = int(exam_id.replace("H410", ""))
        exam_name = f"Đề {exam_num} ({exam_id})"
        assert len(q_list) == 10, f"{exam_id} has {len(q_list)} questions instead of 10"

        for item in q_list:
            q_num = item["q"]
            tokens = item["tokens"]
            answers = item["answers"]
            punct = item.get("punct", "。")
            primary_answer = answers[0]
            py = generate_pinyin(primary_answer)

            # Verification: make sure each answer can be formed by tokens
            char_count_tokens = sum(len(re.sub(r'\s', '', t)) for t in tokens)
            for ans in answers:
                clean_ans = re.sub(r'[。？！，、“”《》\s]', '', ans)
                clean_tokens_str = "".join(tokens)
                clean_tokens_sorted = "".join(sorted(re.sub(r'\s', '', clean_tokens_str)))
                clean_ans_sorted = "".join(sorted(clean_ans))
                if clean_tokens_sorted != clean_ans_sorted:
                    raise AssertionError(f"Mismatch in {exam_id} Q{q_num}: tokens chars {clean_tokens_sorted} vs ans chars {clean_ans_sorted}")

            entry = {
                "id": f"{exam_id}_{q_num}",
                "exam_id": exam_id,
                "exam_name": exam_name,
                "question_number": q_num,
                "tokens": tokens,
                "solution_zh": primary_answer,
                "acceptable_solutions": answers,
                "sentence_py": py,
                "meaning_vi": item["vi"],
                "grammar_point": item["grammar"],
                "punct": punct,
                "level": "hsk4"
            }
            compiled_data.append(entry)
            total_valid += 1

    print(f"✓ Successfully verified and compiled all {total_valid} Hanban HSK 4 sentence questions!")
    OUTPUT_FILE.write_text(json.dumps(compiled_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
