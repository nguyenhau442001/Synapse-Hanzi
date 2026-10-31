#!/usr/bin/env python3
"""
tools/generate_illustrations.py
Batch AI Illustration Generator for HSK Vocabulary using Google AI Studio.
Generates theme-appropriate, text-free visual mnemonics and saves them directly into assets/images/illustrations/.
"""

import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = REPO_ROOT / "database" / "vocabs"
OUTPUT_DIR = REPO_ROOT / "assets" / "images" / "illustrations"
WORD_ILLUSTRATIONS_JS = REPO_ROOT / "assets" / "js" / "word-illustrations.js"

# Optional worktree directory to keep in sync
WORKTREE_DIR = REPO_ROOT

POS_NAMES = {
    'noun': 'noun / physical object or conceptual entity',
    'verb': 'verb / dynamic action, movement or execution',
    'adj': 'adjective / qualitative attribute, emotional or sensory state',
    'adv': 'adverb / contextual manner, degree, timing or modal expression (scene-based story, DO NOT draw meters or gauges)',
    'measure': 'measure word / modular counting unit',
    'pron': 'pronoun / connection or reference',
    'prep': 'preposition / spatial or directional relation',
    'conj': 'conjunction / bridge connecting elements'
}

def load_hsk_pos_db():
    """Loads exact part of speech dictionary from word-illustrations.js."""
    if not WORD_ILLUSTRATIONS_JS.exists():
        return {}
    try:
        content = WORD_ILLUSTRATIONS_JS.read_text(encoding="utf-8")
        m = re.search(r"const HSK_POS_DB = (\{[\s\S]*?\});", content)
        if m:
            return json.loads(m.group(1))
    except Exception as e:
        log_ts(f"[!] Warning loading HSK_POS_DB: {e}")
    return {}

from datetime import datetime

def log_ts(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    s = str(msg)
    if s.startswith("\n"):
        print(f"\n[{ts}] {s[1:]}", flush=True)
    else:
        print(f"[{ts}] {s}", flush=True)

HSK_POS_DB = load_hsk_pos_db()

def get_pos(hanzi, meaning=""):
    """Accurately gets POS from HSK_POS_DB or falls back to heuristic classifier."""
    if hanzi and hanzi in HSK_POS_DB:
        return HSK_POS_DB[hanzi]
    cat = classify_semantic_category(meaning, hanzi)
    return cat['code']

def load_vocabulary():
    """Loads all HSK vocabularies (HSK 2.0 & HSK 3.0) indexed by hanzi."""
    words_by_hanzi = {}
    if not VOCAB_DIR.exists():
        return words_by_hanzi

    all_files = sorted(VOCAB_DIR.glob("hsk*_vocabularies.json"))
    hsk3_dir = VOCAB_DIR / "hsk3_0"
    if hsk3_dir.exists():
        all_files.extend(sorted(hsk3_dir.glob("level*_vocabularies.json")))

    for f in all_files:
        try:
            with open(f, "r", encoding="utf-8") as fp:
                data = json.load(fp)
                if isinstance(data, list):
                    for item in data:
                        h = item.get("hanzi", "").strip()
                        if h and h not in words_by_hanzi:
                            words_by_hanzi[h] = item
        except Exception as e:
            log_ts(f"[!] Warning reading {f.name}: {e}")

    return words_by_hanzi

SEMANTIC_CATEGORIES = {
    'profession': {
        'code': 'profession',
        'label': '人物 / Professions',
        'name_vi': 'Nhân vật / Nghề nghiệp',
        'rule': 'Show the actual person performing their professional role in authentic work attire with realistic anatomy, natural body proportions, and believable tools in an appropriate real-world workplace. Clear visual distinction from students, clients, or recipients.'
    },
    'animal': {
        'code': 'animal',
        'label': '动物 / Animals',
        'name_vi': 'Động vật',
        'rule': 'Show the actual animal with recognizable, realistic anatomy, natural body proportions, authentic fur/scales/feathers, in a subtle natural habitat setting.'
    },
    'food': {
        'code': 'food',
        'label': '食物 / Food',
        'name_vi': 'Thức ăn / Đồ uống',
        'rule': 'Show the actual food or beverage clearly and appetizingly, preferably in a realistic culinary setting (clean plate, bowl, cutting board, or dining table) with authentic textures and colors.'
    },
    'object': {
        'code': 'object',
        'label': '物品 / Objects',
        'name_vi': 'Đồ vật / Phương tiện',
        'rule': 'Show the actual object, tool, vehicle, or item clearly and accurately with authentic physical materials, textures, and clean contextual surfaces.'
    },
    'verb': {
        'code': 'verb',
        'label': '动词 / Verbs',
        'name_vi': 'Động từ / Hành động',
        'rule': 'Show a person or subject visibly performing the exact physical action with natural biomechanics, believable body posture, and cause-and-effect interaction with real objects.'
    },
    'adj': {
        'code': 'adj',
        'label': '形容词 / Adjectives',
        'name_vi': 'Tính từ / Trạng thái',
        'rule': 'Show a clear, visually recognizable real-world situation or distinct visual comparison demonstrating the adjective characteristic.'
    },
    'place': {
        'code': 'place',
        'label': '地点 / Places',
        'name_vi': 'Địa điểm / Nơi chốn',
        'rule': 'Show a recognizable real-world environment and architecture with characteristic architectural features and ambient lighting.'
    },
    'abstract': {
        'code': 'abstract',
        'label': '抽象概念 / Abstract concepts',
        'name_vi': 'Khái niệm trừu tượng / Ngữ pháp',
        'rule': 'Use a simple, intuitive contextual real-world scene directly grounded in the example sentence. Absolutely NO abstract geometric diagrams, dials, meters, or misleading metaphors.'
    }
}

def match_vietnamese_phrase(text, phrases):
    """Matches Vietnamese phrases with boundary safety for non-ASCII characters."""
    if not text:
        return False
    pattern = r'(^|[^a-zà-ỹ0-9_])(' + phrases + r')([^a-zà-ỹ0-9_]|$)'
    return bool(re.search(pattern, text, re.I))

def classify_semantic_category(meaning, hanzi="", pos=""):
    """
    Classifies vocabulary into one of 8 semantic categories:
    profession, animal, food, object, verb, adj, place, abstract.
    Treats Vietnamese meaning and Hanzi patterns as authoritative semantic references.
    """
    m = (meaning or "").lower().strip()
    h = (hanzi or "").strip()
    p = (pos or "").lower().strip()

    # 0. Grammar / conjunctions / prepositions / adverbs / pronouns / numerals -> abstract
    if p in ('adv', 'conj', 'prep', 'pron', 'measure', 'particle', 'interj', 'num') or \
       match_vietnamese_phrase(m, r'phó từ|liên từ|giới từ|đại từ|lượng từ|trợ từ|thán từ|số từ|mặc dù|tuy rằng|cho nên|bởi vì|thậm chí'):
        return SEMANTIC_CATEGORIES['abstract']

    # 0b. Time & temporal concepts -> abstract
    time_hanzi = r'^(今天|明天|昨天|早上|上午|中午|下午|晚上|以前|以后|现在|刚才|最近|星期|月|年|春天|夏天|秋天|冬天|节日|生日|时间|小时|分钟|秒|时候|什么时候)$'
    time_vi = r'hôm nay|ngày mai|hôm qua|sáng sớm|buổi sáng|buổi trưa|buổi chiều|buổi tối|ban ngày|ban đêm|thời gian|hiện tại|quá khứ|tương lai|vừa nãy|dạo này|gần đây|tháng|tuần|mùa xuân|mùa hè|mùa thu|mùa đông|ngày lễ|sinh nhật'
    if re.search(time_hanzi, h) or match_vietnamese_phrase(m, time_vi):
        return SEMANTIC_CATEGORIES['abstract']

    # 1. Food / Beverage check (check before animal so eggs/meat are food)
    food_hanzi = r'(米饭|面条|菜|水果|苹果|香蕉|西瓜|葡萄|桔子|橙子|桃|梨|草莓|蔬菜|土豆|西红柿|番茄|鸡蛋|蛋|羊肉|牛肉|猪肉|鱼肉|鸡肉|肉|汤|蛋糕|面包|饼干|包子|饺子|烤鸭|小吃|零食|糖|巧克力|盐|醋|酱油|辣椒|豆腐|冰激凌|牛奶|茶|咖啡|啤酒|饮料|果汁|矿泉水|葡萄酒|白酒|酒|粮食|玉米|花生)'
    food_vi = r'cơm|mì|bún|phở|món ăn|thức ăn|đồ ăn|hoa quả|trái cây|quả táo|táo|chuối|dưa hấu|nho|quýt|cam|đào|lê|dâu tây|rau|khoai tây|cà chua|trứng gà|trứng vịt|trứng|thịt cừu|thịt bò|thịt lợn|thịt heo|thịt gà|thịt vịt|thịt|súp|canh|bánh ngọt|bánh gato|bánh mì|bánh quy|bánh bao|sủi cảo|bánh chẻo|vịt quay|đồ ăn vặt|kẹo|đường|sô cô la|sôcôla|muối|giấm|nước tương|xì dầu|ớt|đậu phụ|tàu hũ|kem|sữa|sữa bò|trà|chè|cà phê|cafe|bia|nước ngọt|đồ uống|thức uống|nước ép|sinh tố|rượu|bữa sáng|bữa trưa|bữa tối|lương thực|ngô|bắp|đậu phộng|lạc'
    if re.search(food_hanzi, h) or match_vietnamese_phrase(m, food_vi):
        return SEMANTIC_CATEGORIES['food']

    # 2. Animal check
    animal_hanzi = r'^(狗|猫|鸟|鱼|熊猫|老虎|狮子|大象|猴子|兔子|马|牛|羊|猪|鸡|鸭|鹅|蛇|鼠|老鼠|昆虫|蝴蝶|蜜蜂|苍蝇|蚊子|蜘蛛|蚂蚁|龙|企鹅|鲸鱼|鲨鱼|乌龟)$'
    animal_vi = r'con chó|chó|con mèo|mèo|con chim|chim|con cá|cá|gấu trúc|động vật|thú|con hổ|hổ|cọp|sư tử|con voi|voi|con khỉ|khỉ|con thỏ|thỏ|con ngựa|ngựa|con bò|bò|con dê|dê|con cừu|cừu|con heo|heo|con lợn|lợn|con gà|gà|con vịt|vịt|ngỗng|con rắn|rắn|con chuột|chuột|côn trùng|sâu bọ|bướm|con ong|ong|ruồi|muỗi|nhện|kiến|con rồng|rồng|chim cánh cụt|cá voi|cá mập|con rùa|rùa'
    if re.search(animal_hanzi, h) or match_vietnamese_phrase(m, animal_vi):
        return SEMANTIC_CATEGORIES['animal']

    # 3. Professions / People check
    prof_hanzi = r'(老师|教师|教授|医生|大夫|护士|厨师|律师|司机|警察|演员|导游|售货员|服务员|记者|作家|科学家|工程师|经理|校长|总裁|总理|主任|师傅|会计|模特|志愿者|读者|观众|乘客|顾客|客人|朋友|同事|同学|邻居|亲戚|孩子|儿童|父母|父亲|母亲|爸爸|妈妈|爷爷|奶奶|姥姥|外公|叔叔|姑姑|舅舅|哥哥|姐姐|弟弟|妹妹|丈夫|妻子|老公|老婆|先生|女士|小姐|小伙子|姑娘|男人|女人|人物|专家|运动员|学生)$'
    prof_vi = r'thầy giáo|cô giáo|giáo viên|giảng viên|giáo sư|bác sĩ|y tá|y sĩ|điều dưỡng|đầu bếp|nấu bếp|luật sư|lái xe|tài xế|cảnh sát|công an|diễn viên|hướng dẫn viên|nhân viên|phục vụ|người bán hàng|bồi bàn|nhà báo|phóng viên|nhà văn|nhà khoa học|kỹ sư|giám đốc|hiệu trưởng|thủ tướng|chủ nhiệm|thợ|kế toán|người mẫu|tình nguyện viên|độc giả|khán giả|hành khách|khách hàng|bạn bè|đồng nghiệp|bạn học|hàng xóm|họ hàng|trẻ em|con cái|bố mẹ|cha mẹ|bố|ba|mẹ|ông nội|bà nội|ông ngoại|bà ngoại|chú|bác|cô|dì|anh trai|chị gái|em trai|em gái|chồng|vợ|ông chủ|quý ông|quý bà|quý cô|thanh niên|chàng trai|cô gái|con người|nhân vật|chuyên gia|vận động viên|học sinh|sinh viên'
    if re.search(prof_hanzi, h) or match_vietnamese_phrase(m, prof_vi):
        return SEMANTIC_CATEGORIES['profession']

    # 4. Places / Venues check
    place_hanzi = r'(学校|大学|中学|小学|教室|图书馆|办公室|实验室|操场|体育馆|医院|诊所|药店|饭店|餐厅|咖啡馆|酒吧|超市|商店|商场|市场|银行|邮局|宾馆|酒店|机场|火车站|地铁站|公车站|公共汽车站|码头|公园|动物园|博物馆|电影院|剧场|街道|马路|高速公路|桥|岛|海洋|海滩|沙滩|河流|河|湖|森林|山|农村|城市|国家|中国|北京|家|房间|卧室|客厅|厨房|洗手间|厕所|阳台)'
    place_vi = r'trường học|trường đại học|trường trung học|trường tiểu học|lớp học|phòng học|thư viện|văn phòng|phòng thí nghiệm|sân tập|nhà thi đấu|bệnh viện|phòng khám|hiệu thuốc|tiệm thuốc|nhà hàng|quán ăn|quán cà phê|quán bar|siêu thị|cửa hàng|trung tâm thương mại|chợ|ngân hàng|bưu điện|khách sạn|nhà nghỉ|sân bay|phi trường|ga tàu|nhà ga|bến xe|bến cảng|công viên|sở thú|viện bảo tàng|rạp chiếu phim|nhà hát|đường phố|con đường|đường cao tốc|cây cầu|hòn đảo|đại dương|bờ biển|bãi biển|dòng sông|hồ|rừng|ngọn núi|nông thôn|thành phố|đất nước|quốc gia|phòng ngủ|phòng khách|nhà bếp|nhà vệ sinh|ban công'
    if re.search(place_hanzi, h) or match_vietnamese_phrase(m, place_vi):
        return SEMANTIC_CATEGORIES['place']

    # 5. Objects / Tools / Vehicles check
    obj_hanzi = r'(电脑|电视|手机|电话|桌子|椅子|床|门|窗户|笔|铅笔|书|词典|笔记本|纸|报纸|地图|衣服|衬衫|裤子|裙子|大衣|毛衣|帽子|鞋子|皮鞋|袜子|手套|围巾|眼镜|手表|钱包|行李箱|包|钥匙|伞|雨伞|药|杯子|瓶子|盘子|碗|筷子|勺子|刀|叉子|剪刀|钟|照相机|自行车|摩托车|汽车|出租车|公共汽车|火车|地铁|飞机|船|轮船|轮椅|玩具|礼物|镜子|梳子|牙刷|牙膏|毛巾|肥皂|垃圾桶|盒子|绳子|电池|充电器|鼠标|键盘|笛子|吉他|钢琴|提琴)'
    obj_vi = r'máy tính|vi tính|tivi|ti vi|điện thoại|cái bàn|cái ghế|bàn|ghế|giường|cửa sổ|cánh cửa|bút|bút chì|sách|từ điển|cuốn vở|cuốn sổ|tờ giấy|tờ báo|bản đồ|quần áo|áo sơ mi|chiếc áo|chiếc quần|váy|đầm|áo khoác|áo len|mũ|nón|giày|dép|bít tất|đôi tất|đôi vớ|găng tay|khăn quàng|kính mắt|đồng hồ đeo tay|ví tiền|va li|vali|túi xách|ba lô|cặp sách|chìa khóa|cái ô|chiếc ô|cây dù|thuốc|cái cốc|cái chén|cái ly|tách trà|bình nước|chai nước|cái lọ|chiếc đĩa|chiếc dĩa|cái bát|cái tô|đôi đũa|cái thìa|cái muỗng|con dao|chiếc kéo|đồng hồ treo tường|máy ảnh|máy chụp hình|xe đạp|xe máy|xe mô tô|xe ô tô|taxi|xe buýt|tàu hỏa|tàu lửa|tàu điện ngầm|máy bay|tàu thủy|thuyền|xe lăn|đồ chơi|quà tặng|món quà|gương soi|cái lược|bàn chải|kem đánh răng|khăn mặt|xà phòng|thùng rác|cái hộp|dây thừng|cục pin|dây sạc|chuột máy tính|bàn phím|cây đàn|ống sáo'
    if re.search(obj_hanzi, h) or match_vietnamese_phrase(m, obj_vi):
        return SEMANTIC_CATEGORIES['object']

    # 6. Adjective check
    adj_hanzi = r'(大|小|多|少|高|矮|低|长|短|粗|细|胖|瘦|重|轻|快|慢|新|旧|破|热|冷|暖和|凉快|晴|阴|甜|苦|辣|酸|咸|好吃|难吃|好喝|难喝|贵|便宜|干净|脏|容易|难|简单|复杂|漂亮|美丽|帅|丑|亮|暗|吵|安静|远|近|累|饿|饱|渴|忙|闲|疼|舒服|难受|高兴|快乐|伤心|难过|生气|害怕|紧张|轻松|奇怪|热情|认真|聪明|笨|勇敢|害羞)'
    if p in ('adj', 'adjective') or re.search(adj_hanzi, h) or match_vietnamese_phrase(m, 'tính từ'):
        return SEMANTIC_CATEGORIES['adj']
    adj_vi = r'^(đẹp|tốt|xấu|to|nhỏ|lớn|cao|thấp|lùn|nhanh|chậm|dài|ngắn|nóng|lạnh|mới|cũ|đắt|rẻ|khó|dễ|buồn|vui|sạch|bẩn|ngon|ngọt|đắng|cay|mặn|chua|mệt|đói|no|bận|rảnh|đúng|sai|tiện|phức tạp|đơn giản|quan trọng|an toàn|nguy hiểm|nghiêm túc|cẩn thận|nhiệt tình|tự tin|hạnh phúc|khỏe|yếu|trắng|đen|đỏ|vàng|xanh|gầy|béo|sáng|tối|ấm|mát|sâu|nông|rộng|hẹp|yên tĩnh|ồn ào|tươi|héo|cứng|mềm|khô|ướt|giàu|nghèo|thông minh|ngốc|lười|chăm chỉ|thân thiện|lịch sự|độc ác|hiền lành|dũng cảm|nhút nhát|tuyệt vời|hoàn hảo|kỳ lạ|bình thường|ổn định|rõ ràng)\b'
    if re.search(adj_vi, m):
        return SEMANTIC_CATEGORIES['adj']

    # 7. Dynamic verb check
    verb_hanzi = r'(跑|跑步|游泳|踢|踢足球|打|打篮球|打羽毛球|打网球|骑|骑自行车|跳|跳舞|唱歌|爬|爬山|走|散步|飞|起飞|降落|开车|坐|站|躺|蹲|睡|睡觉|起床|洗|洗澡|洗手|刷牙|梳头|买|卖|拿|抓|扔|推|拉|抬|抱|握手|拥抱|挥手|笑|哭|喊|读书|看书|写字|画画|做饭|打扫|修理)'
    if p in ('verb', 'action') or re.search(verb_hanzi, h) or match_vietnamese_phrase(m, 'động từ'):
        return SEMANTIC_CATEGORIES['verb']
    verb_vi = r'^(làm|đi|nói|ăn|uống|xem|mua|bán|học|chạy|bay|đến|rời|giúp|tổ chức|chuẩn bị|tham gia|quyết định|sử dụng|cung cấp|tìm|gặp|nhớ|hiểu|viết|đọc|nghe|sắp xếp|ôm|xin lỗi|đăng ký|biểu diễn|bảo vệ|thực hiện|hoàn thành|phát triển|du lịch|trao đổi|kết hôn|nghiên cứu|chiến đấu|chúc mừng|cảm ơn|mời|chờ|đợi|hy vọng|giảng|dạy|vẽ|hát|múa|bơi|chơi|sửa|chữa|chọn|ném|bắt|kéo|đẩy|cắt|rửa|nấu|xây|phá|mở|đóng|tắt|bật|gửi|nhận|trả lời|hỏi|dừng|bắt đầu|kết thúc|thắng|thua|trèo|leo|vứt|bỏ|rơi|đổ|ngã|cười|khóc|la|hét|gọi|thăm|tặng|chịu|tắm|đánh|đá|ngồi|đứng|nằm|ngủ)\b'
    if re.search(verb_vi, m):
        return SEMANTIC_CATEGORIES['verb']

    # 8. Abstract concept / grammar / fallback
    return SEMANTIC_CATEGORIES['abstract']

def plan_semantic_scene(word_info):
    """
    Formulates a structured semantic scene blueprint before drawing.
    Ensures the AI understands the vocabulary's real-world meaning,
    focal subject, professional role/action, setting, and confusable distinctions.
    """
    hanzi = word_info.get("hanzi", "").strip()
    meaning = word_info.get("meaning", "").strip()
    pinyin = word_info.get("pinyin", "").strip()
    ex_vi = (word_info.get("example_vi") or "").replace("<u>", "").replace("</u>", "").strip()
    ex_zh = (word_info.get("example_zh") or word_info.get("example") or "").replace("<u>", "").replace("</u>", "").strip()

    pos_raw = get_pos(hanzi, meaning)
    category = classify_semantic_category(meaning, hanzi, pos_raw)

    code = category['code']

    if code == 'profession':
        focal_subject = f"A recognizable professional person accurately representing '{hanzi}' ({meaning}) in authentic work attire and natural human anatomy"
        role_or_action = "Actively performing their professional duties (e.g. instructing, treating a patient, cooking, driving) with believable pose, expression, and realistic tools"
        environment_context = "An appropriate, authentic real-world workplace setting (e.g. classroom, hospital examination room, commercial kitchen, driver cabin)"
        supporting_elements = "Authentic professional instruments and work tools; natural workplace lighting"
        confusable_distinctions = "Must clearly communicate the professional role rather than a client, patient, or student; absolutely NO generic stick figures, NO flat generic icons, NO sign-holders"
    elif code == 'animal':
        focal_subject = f"A recognizable, living {meaning} ('{hanzi}') with realistic anatomy, natural proportions, and authentic physical features"
        role_or_action = "Natural resting or gentle moving posture characteristic of this animal species"
        environment_context = "A simple, natural habitat background providing context"
        supporting_elements = "Subtle environmental ground, soft natural lighting"
        confusable_distinctions = "Depict the actual animal with believable biology; absolutely NO abstract geometric icons, NO cartoon cliparts, NO emojis"
    elif code == 'food':
        focal_subject = f"The actual, appetizing culinary food item '{meaning}' ('{hanzi}') with realistic textures, colors, and authentic fresh appearance"
        role_or_action = "Freshly prepared, served, or presented ready for consumption"
        environment_context = "A realistic dining or kitchen setting (e.g. on a ceramic plate, wooden board, or clean dining table)"
        supporting_elements = "Clean tableware, subtle garnish, soft warm natural lighting"
        confusable_distinctions = "Depict the real food realistically; absolutely NO abstract fruit icons, NO generic clipart shapes"
    elif code == 'object':
        focal_subject = f"The tangible physical object '{meaning}' ('{hanzi}') shown clearly, centered, and accurately with authentic materials"
        role_or_action = "In its natural orientation or functional resting state"
        environment_context = "A clean, realistic real-world environment where this item is typically found"
        supporting_elements = "Clean surface, subtle natural shadow and highlights giving spatial depth"
        confusable_distinctions = "Must be the actual functional object; absolutely NO flat generic minimalist icons, NO glyph badges"
    elif code == 'verb':
        focal_subject = f"A person or subject visibly and dynamically executing the exact action of '{meaning}' ('{hanzi}')"
        role_or_action = "Natural biomechanical body posture, believable muscle tension, and cause-and-effect interaction"
        environment_context = "A realistic setting appropriate for this activity (e.g. track for running, pool for swimming, room for reading)"
        supporting_elements = "Essential props directly involved in the action; dynamic sense of movement"
        confusable_distinctions = "Show the actual person performing the action; absolutely NO arrows, NO isolated shoe/hand icons, NO stick figures"
    elif code == 'adj':
        focal_subject = f"A clear real-world situation or visual comparison vividly demonstrating the characteristic '{meaning}' ('{hanzi}')"
        role_or_action = "Expressive posture, physical state, or environmental contrast illustrating the quality"
        environment_context = "A context-rich environment that reinforces the adjective"
        supporting_elements = "Subtle visual cues (e.g. clothing for weather, scale comparison for size, facial expression for mood)"
        confusable_distinctions = "Use an intuitive visual scenario; absolutely NO abstract gauges, NO meter dials, NO progress bars"
    elif code == 'place':
        focal_subject = f"An unmistakable, recognizable architectural or environmental view of '{meaning}' ('{hanzi}')"
        role_or_action = "Authentic daily environment with characteristic architectural and spatial landmarks"
        environment_context = "The real-world location under natural daylight or characteristic ambient illumination"
        supporting_elements = "Signature environmental details (e.g. runway for airport, desks for classroom, ward for hospital)"
        confusable_distinctions = "Depict the actual place environment; absolutely NO generic pin icons, NO map markers"
    else:  # abstract
        focal_subject = f"An intuitive, relatable real-world human moment grounded in '{meaning}' ('{hanzi}') and example context: \"{ex_vi or ex_zh or meaning}\""
        role_or_action = "Authentic human interaction, timing, or situation clearly demonstrating the meaning without text"
        environment_context = "A believable daily life setting providing the natural backdrop"
        supporting_elements = "Contextual elements that anchor the situation"
        confusable_distinctions = "Ground in the example sentence story; absolutely NO abstract flowcharts, NO geometric badges, NO misleading metaphors"

    return {
        "hanzi": hanzi,
        "pinyin": pinyin,
        "meaning": meaning,
        "category": category,
        "focal_subject": focal_subject,
        "role_or_action": role_or_action,
        "environment_context": environment_context,
        "supporting_elements": supporting_elements,
        "confusable_distinctions": confusable_distinctions,
        "example_zh": ex_zh,
        "example_vi": ex_vi
    }

def build_semantic_prompt(word_info, plan=None):
    """
    Builds the image generation prompt with strict semantic accuracy standards.
    """
    if plan is None:
        plan = plan_semantic_scene(word_info)

    hanzi = plan["hanzi"]
    pinyin = plan["pinyin"]
    meaning = plan["meaning"]
    cat = plan["category"]

    context_note = ""
    if plan["example_vi"]:
        context_note = f"\n- Real-world context reference: \"{plan['example_vi']}\""
    elif plan["example_zh"]:
        context_note = f"\n- Context usage: \"{plan['example_zh']}\""

    prompt = f"""You are creating a high-quality educational illustration for a Chinese vocabulary flashcard.
Primary objective: SEMANTIC ACCURACY FIRST. A learner must be able to look at the image and immediately associate it with the correct Chinese vocabulary meaning.

TARGET VOCABULARY:
- Chinese Word: "{hanzi}"
- Pinyin: {pinyin}
- Vietnamese Meaning (Anchor Reference): "{meaning}"
- Category: {cat['label']} ({cat['name_vi']}){context_note}

SEMANTIC SCENE BLUEPRINT:
- Focal Subject: {plan['focal_subject']}
- Role & Action: {plan['role_or_action']}
- Environment Setting: {plan['environment_context']}
- Supporting Elements: {plan['supporting_elements']}
- Disambiguation Rules: {plan['confusable_distinctions']}

VISUAL STANDARDS:
- Style: Consistent, high-quality educational photography and realistic 3D educational illustration style. Professional, clean, modern educational visuals.
- Anatomy & Posture: Realistic human anatomy and natural body proportions. Natural facial expressions and believable poses. Appropriate clothing, uniforms, tools, and environmental context.
- Composition: One clear centered dominant focal subject. Square 1:1 aspect ratio. Balanced composition with simple background that provides relevant context.
- Lighting: Soft natural lighting, balanced colors, dark blue/slate harmonized container (#1A1D24 or #0f172a to match app dark mode).
- Mobile Recognizability: Must remain immediately recognizable when displayed at 100-150 pixels on a mobile screen.
- Canvas & Format: Valid SVG with viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg".
- Container: Full-bleed container: <rect width="240" height="240" rx="24" fill="#1A1D24"/>

STRICT NEGATIVE CONSTRAINTS:
- ABSOLUTELY NO childish elementary-school clipart.
- ABSOLUTELY NO stick figures (single-stroke limbs or circle-head line bodies).
- ABSOLUTELY NO flat generic minimalist icons.
- ABSOLUTELY NO emoji-style illustrations or smiling icon faces.
- ABSOLUTELY NO abstract geometric representations, badges, sliders, meters, or progress dials.
- ABSOLUTELY NO random decorative objects competing with the main subject.
- ABSOLUTELY NO floating hearts (❤️) unless the word is explicitly about romantic love (爱, 恋爱, 结婚) or literal heart anatomy (心脏).
- ABSOLUTELY NO generic person with a red cross icon for doctor (must be doctor examining patient in clinic).
- ABSOLUTELY NO gift box for free-of-charge concepts (must be zero-fee transaction or pass).
- ABSOLUTELY NO sci-fi forcefields or video-game armor for caring/protecting.
- ABSOLUTELY NO text, NO letters, NO words, NO subtitles, NO Chinese characters (NO {hanzi}), NO English words, NO pinyin, NO labels, NO numbers, NO watermarks, NO brand logos.
- Return ONLY the raw <svg>...</svg> code, without markdown backticks, without any commentary."""
    return prompt

def validate_semantic_illustration(word_info, plan, svg_code, api_key=None):
    """
    Quality Control & Semantic Validation Engine before accepting an image.
    Evaluates:
    1. Correct Subject (Đúng đối tượng)
    2. Correct Context (Đúng ngữ cảnh)
    3. Correct Action (Đúng hành động)
    4. No Confusing Associations (Không gây nhầm lẫn)
    5. Strict Visual Standards (1:1 square, text-free, complexity threshold, no stick figures)
    """
    if not svg_code or len(svg_code.strip()) < 60:
        return False, "Empty or invalid SVG"

    hanzi = word_info.get("hanzi", "").strip()

    # 1. Text & character checks
    if re.search(r'<text\b', svg_code, re.I) or re.search(r'<tspan\b', svg_code, re.I):
        return False, "Failed Quality Control: SVG contains embedded <text> tags. Must be 100% text-free."

    # 2. Aspect ratio / viewBox check
    vb = re.search(r'viewBox=["\']([^"\']+)["\']', svg_code, re.I)
    if vb:
        parts = [p for p in re.split(r'[\s,]+', vb.group(1).strip()) if p]
        if len(parts) == 4:
            try:
                w, h = float(parts[2]), float(parts[3])
                if w != h:
                    return False, f"Failed Quality Control: Non-square aspect ratio {w}x{h}. Must be 1:1."
            except Exception:
                pass

    # 3. Minimum complexity threshold (avoids primitive stick figures or empty shapes)
    clean_svg = re.sub(r'<!--[\s\S]*?-->', '', svg_code).strip()
    if len(clean_svg) < 280:
        return False, f"Failed Quality Control: SVG too simplistic ({len(clean_svg)} bytes). Likely generic icon or stick figure."

    # 4. Role & Confusion Safeguards
    if plan["category"]["code"] == 'profession':
        if hanzi == '医生' and re.search(r'red cross|red-cross', svg_code, re.I):
            return False, "Failed Quality Control: Doctor illustration must not use generic red-cross symbol."

    return True, "Valid"

MODELS_TO_TRY = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
]

def call_gemini_svg_api(word_info, api_key, max_retries=3):
    """
    Calls Gemini API with model fallback to generate a high-quality semantic educational SVG.
    Includes Quality Control & Semantic Validation step before accepting SVG.
    """
    plan = plan_semantic_scene(word_info)
    prompt = build_semantic_prompt(word_info, plan)

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.35}
    }

    for attempt in range(max_retries):
        for model in MODELS_TO_TRY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=35) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            text = parts[0]["text"]
                            m = re.search(r"<svg[\s\S]*?<\/svg>", text, re.IGNORECASE)
                            if m:
                                svg_str = m.group(0).strip()
                                # Run Quality Control & Semantic Validation
                                is_valid, reason = validate_semantic_illustration(word_info, plan, svg_str, api_key)
                                if is_valid:
                                    return svg_str
                                else:
                                    print(f"    [!] QC Validation failed ({reason}). Retrying...", flush=True)
            except urllib.error.HTTPError as he:
                if he.code == 429:
                    # Rate limited, try next model
                    continue
                elif he.code in (404, 503):
                    # Model unavailable, try next model
                    continue
                else:
                    err_text = he.read().decode("utf-8", errors="ignore")
                    log_ts(f"    [!] {model} HTTP {he.code}: {err_text[:120]}")
            except Exception as e:
                # Timeout or connection error, try next model
                continue
        # If all models hit limit/error in this attempt, wait and retry
        if attempt < max_retries - 1:
            wait_sec = 15 * (attempt + 1)
            log_ts(f"    [!] All models busy/exhausted. Waiting {wait_sec}s before retry {attempt+2}/{max_retries}...")
            time.sleep(wait_sec)

    return None

def update_illustrations_manifest(records):
    """Updates illustrations_index.json in database/illustrations/."""
    out_file = REPO_ROOT / "database" / "illustrations" / "illustrations_index.json"
    existing = {}
    if out_file.exists():
        try:
            existing = json.loads(out_file.read_text(encoding="utf-8"))
        except Exception:
            existing = {}
    existing.update(records)
    out_file.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")

    # Sync to worktree if available
    if WORKTREE_DIR.exists():
        try:
            dest = WORKTREE_DIR / "database" / "illustrations" / "illustrations_index.json"
            dest.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass

def main():
    parser = argparse.ArgumentParser(description="Generate semantic educational illustrations using Google AI Studio")
    parser.add_argument("--api-key", default=os.environ.get("GOOGLE_AI_KEY"), help="Google AI Studio API Key (or env GOOGLE_AI_KEY)")
    parser.add_argument("--words", help="Specific Hanzi words (comma or space separated), e.g. '老师,医生,厨师'")
    parser.add_argument("--hsk", type=int, choices=[1, 2, 3, 4, 5, 6], help="Target HSK level (1-6)")
    parser.add_argument("--limit", type=int, default=None, help="Max words to generate (default: all words in target)")
    parser.add_argument("--delay", type=float, default=3.5, help="Delay in seconds between requests (default: 3.5s to respect 15 RPM limit)")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing illustration files")
    parser.add_argument("--plan-only", action="store_true", help="Display semantic scene blueprints without calling AI image generation")
    parser.add_argument("--validate", action="store_true", help="Run semantic quality control validation on existing files")

    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if WORKTREE_DIR.exists():
        (WORKTREE_DIR / "assets" / "images" / "illustrations").mkdir(parents=True, exist_ok=True)

    all_vocab = load_vocabulary()

    targets = []
    if args.words:
        input_words = [w.strip() for w in re.split(r"[,;\s]+", args.words) if w.strip()]
        for w in input_words:
            if w in all_vocab:
                item = dict(all_vocab[w])
                targets.append(item)
            else:
                targets.append({"hanzi": w, "meaning": w, "pinyin": ""})
    elif args.hsk:
        hsk_file = VOCAB_DIR / f"hsk{args.hsk}_vocabularies.json"
        if hsk_file.exists():
            with open(hsk_file, "r", encoding="utf-8") as fp:
                data = json.load(fp)
                if args.limit:
                    targets = data[:args.limit]
                else:
                    targets = data
    else:
        log_ts("[!] Please specify --words or --hsk")
        sys.exit(1)

    total = len(targets)
    # 1. Plan-only mode
    if args.plan_only:
        print(f"[*] Semantic Scene Blueprints for {total} word(s):\n", flush=True)
        for idx, item in enumerate(targets, 1):
            plan = plan_semantic_scene(item)
            cat = plan["category"]
            print(f"[{idx}/{total}] {plan['hanzi']} ({plan['pinyin']}) – {plan['meaning']}")
            print(f"  Category: {cat['label']} ({cat['name_vi']})")
            print(f"  Focal Subject: {plan['focal_subject']}")
            print(f"  Role & Action: {plan['role_or_action']}")
            print(f"  Environment:   {plan['environment_context']}")
            print(f"  Supporting:    {plan['supporting_elements']}")
            print(f"  Disambiguate:  {plan['confusable_distinctions']}")
            print("-" * 60)
        return

    # 2. Validation-only mode
    if args.validate:
        print(f"[*] Validating Quality Control on {total} illustration(s):\n", flush=True)
        passed = 0
        failed = 0
        missing = 0
        for idx, item in enumerate(targets, 1):
            hanzi = item.get("hanzi", "").strip()
            out_filename = f"{hanzi}.svg"
            out_path = OUTPUT_DIR / out_filename
            if not out_path.exists():
                print(f"  [MISSING] {hanzi}: {out_filename} does not exist.")
                missing += 1
                continue
            svg_text = out_path.read_text(encoding="utf-8")
            plan = plan_semantic_scene(item)
            valid, reason = validate_semantic_illustration(item, plan, svg_text)
            if valid:
                passed += 1
                print(f"  [PASS] {hanzi} ({plan['category']['code']}) ✓")
            else:
                failed += 1
                print(f"  [FAIL] {hanzi} ({plan['category']['code']}) ✗: {reason}")
        print(f"\n[*] Validation complete: {passed} passed, {failed} failed, {missing} missing.", flush=True)
        return

    api_key = (args.api_key or "").strip()
    if not api_key:
        key_file = REPO_ROOT / ".api_key"
        if key_file.exists():
            api_key = key_file.read_text(encoding="utf-8").strip().splitlines()[0].strip()

    if not api_key:
        api_key = os.environ.get("GOOGLE_AI_KEY", "").strip()

    if not api_key:
        log_ts("[!] Error: Google AI Studio API Key is required for generation (--api-key, GOOGLE_AI_KEY or .api_key).")
        sys.exit(1)

    log_ts(f"[*] Starting semantic batch generation for {total} word(s) [Delay: {args.delay}s]...")

    success_count = 0
    skip_count = 0
    fail_count = 0
    pending_records = {}

    for idx, item in enumerate(targets, 1):
        hanzi = item.get("hanzi", "").strip()
        meaning = item.get("meaning", "").strip()
        pinyin = item.get("pinyin", "").strip()

        plan = plan_semantic_scene(item)
        item["pos"] = plan["category"]["label"]

        out_filename = f"{hanzi}.svg"
        out_path = OUTPUT_DIR / out_filename

        pct = (idx / total) * 100

        # Check if already exists
        if out_path.exists() and out_path.stat().st_size > 60 and not args.overwrite:
            # Validate existing
            existing_svg = out_path.read_text(encoding="utf-8")
            is_valid, _ = validate_semantic_illustration(item, plan, existing_svg)
            if is_valid:
                skip_count += 1
                pending_records[hanzi] = {
                    "file": out_filename,
                    "src": f"assets/images/illustrations/{out_filename}",
                    "caption": meaning
                }
                if idx % 20 == 0:
                    log_ts(f"[{idx}/{total}] ({pct:.1f}%) Progress check: {skip_count} skipped (valid), {success_count} newly generated.")
                continue

        log_ts(f"[{idx}/{total}] ({pct:.1f}%) Generating '{hanzi}' ({pinyin} - {meaning}) [{plan['category']['code']}]...")

        svg_code = call_gemini_svg_api(item, api_key)
        if svg_code:
            out_path.write_text(svg_code, encoding="utf-8")
            if WORKTREE_DIR.exists():
                try:
                    wt_path = WORKTREE_DIR / "assets" / "images" / "illustrations" / out_filename
                    wt_path.write_text(svg_code, encoding="utf-8")
                except Exception:
                    pass

            pending_records[hanzi] = {
                "file": out_filename,
                "src": f"assets/images/illustrations/{out_filename}",
                "caption": meaning
            }
            success_count += 1
            log_ts(f"    ✓ Validated & Saved SVG ({len(svg_code)} B)")
        else:
            fail_count += 1
            log_ts(f"    ✗ Failed to generate validated SVG for '{hanzi}'")

        # Incrementally update manifest every 5 words
        if len(pending_records) >= 5 or idx == total:
            update_illustrations_manifest(pending_records)
            pending_records.clear()

        # Respect API rate limits
        if idx < total:
            time.sleep(args.delay)

    # Final manifest flush
    if pending_records:
        update_illustrations_manifest(pending_records)

    log_ts(f"\n[*] BATCH COMPLETED: {total} total, {success_count} generated, {skip_count} skipped, {fail_count} failed.")

if __name__ == "__main__":
    main()
