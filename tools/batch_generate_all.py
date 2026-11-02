#!/usr/bin/env python3
"""
tools/batch_generate_all.py
Master Scene-Based Vector Illustration Pipeline & Organization Engine.

Folder Structure:
images/
├── HSK_2.0/
│   ├── level1/ .. level6/
├── HSK_3.0/
│   ├── level1/ .. level9/
├── generated_manifest.json
└── README.md

Features:
  - Commit & push after every 10 newly generated SVG illustrations (or at end of each level).
  - Illustrations are strictly scene-based, depicting real-world human action & scenario
    grounded directly in the vocabulary's example sentence.
  - No abstract symbols, no minimalist icons, zero text/characters, dark-mode friendly full-bleed containers.
  - Multi-model fallback cascade.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

git_lock = threading.Lock()
state_lock = threading.Lock()
exhausted_lock = threading.Lock()

REPO_ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = REPO_ROOT / "database" / "vocabs"
HSK3_DIR = VOCAB_DIR / "hsk3_0"
FLAT_OUTPUT_DIR = REPO_ROOT / "assets" / "images" / "illustrations"
IMAGES_DIR = REPO_ROOT / "images"
WORD_ILLUSTRATIONS_JS = REPO_ROOT / "assets" / "js" / "word-illustrations.js"
WORKTREE_DIR = REPO_ROOT

def get_api_keys(cli_arg=""):
    keys = []
    if cli_arg:
        for k in cli_arg.split(","):
            k = k.strip()
            if k and k not in keys:
                keys.append(k)
    if os.environ.get("GOOGLE_AI_KEY"):
        for k in os.environ.get("GOOGLE_AI_KEY").split(","):
            k = k.strip()
            if k and k not in keys:
                keys.append(k)
    key_file = REPO_ROOT / ".api_key"
    if key_file.exists():
        for line in key_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and line not in keys:
                keys.append(line)
    return keys

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


def log_ts(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    s = str(msg)
    if s.startswith("\n"):
        print(f"\n[{ts}] {s[1:]}", flush=True)
    else:
        print(f"[{ts}] {s}", flush=True)

MODEL_COOLDOWNS = {}      # (k_idx, model) -> float timestamp when cooldown expires
PERMANENT_EXHAUSTED = set() # (k_idx, model) -> only for daily quota or 404/400
RENEW_TIMESTAMPS = []       # list of float timestamps when quota renews
ABORT_EVENT = threading.Event() # Set when all models are exhausted to immediately stop all workers

def extract_retry_delay(err_body):
    try:
        data = json.loads(err_body)
        for d in data.get("error", {}).get("details", []):
            if "retryDelay" in d:
                m = re.match(r"^(\d+)", str(d["retryDelay"]))
                if m:
                    return int(m.group(1))
    except Exception:
        pass
    m = re.search(r"retry in\s+(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:([0-9.]+)s)?", err_body, re.IGNORECASE)
    if m:
        h = int(m.group(1) or 0)
        minutes = int(m.group(2) or 0)
        secs = float(m.group(3) or 0)
        return int(h * 3600 + minutes * 60 + secs)
    return None

def all_models_permanently_exhausted(api_keys):
    with exhausted_lock:
        total_possible = len(api_keys) * len(MODELS_TO_TRY)
        return len(PERMANENT_EXHAUSTED) >= total_possible

def report_exhausted_and_renew():
    with exhausted_lock:
        best_renew = min(RENEW_TIMESTAMPS) if RENEW_TIMESTAMPS else (time.time() + 20 * 3600)
    renew_dt = datetime.fromtimestamp(best_renew).strftime("%Y-%m-%d %H:%M:%S")
    diff_secs = max(0, int(best_renew - time.time()))
    h = diff_secs // 3600
    m = (diff_secs % 3600) // 60
    s = diff_secs % 60
    log_ts("==================================================================")
    log_ts("[!] TẤT CẢ CÁC MODEL FLASH ĐÃ CHẠM TRẦN DAILY QUOTA CỦA GOOGLE.")
    log_ts(f"[*] THỜI GIAN DỰ KIẾN GOOGLE RENEW QUOTA: {renew_dt} (sau {h}h {m}m {s}s).")
    log_ts("[*] Đã lưu manifest & dừng tiến trình an toàn.")
    log_ts("==================================================================")

def is_model_available(k_idx, model):
    with exhausted_lock:
        if (k_idx, model) in PERMANENT_EXHAUSTED:
            return False
        cooldown = MODEL_COOLDOWNS.get((k_idx, model), 0)
        return time.time() >= cooldown

def mark_model_throttled(k_idx, model, is_daily=False, seconds=6, retry_delay=None, api_keys=None):
    with exhausted_lock:
        if is_daily:
            PERMANENT_EXHAUSTED.add((k_idx, model))
            if retry_delay and retry_delay > 0:
                renew_ts = time.time() + retry_delay
                RENEW_TIMESTAMPS.append(renew_ts)
                dt_str = datetime.fromtimestamp(renew_ts).strftime("%Y-%m-%d %H:%M:%S")
                rem_h = retry_delay / 3600
                log_ts(f"        [>>> DAILY LIMIT] Key #{k_idx+1} on {model} chạm trần ngày. Renew lúc: {dt_str} (~{rem_h:.1f}h nữa)")
            else:
                log_ts(f"        [>>> DAILY LIMIT] Key #{k_idx+1} on {model} chạm trần ngày.")
        else:
            MODEL_COOLDOWNS[(k_idx, model)] = time.time() + seconds

        if api_keys and len(PERMANENT_EXHAUSTED) >= len(api_keys) * len(MODELS_TO_TRY):
            ABORT_EVENT.set()

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
        pass
    return {}

HSK_POS_DB = load_hsk_pos_db()

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

    pos_raw = HSK_POS_DB.get(hanzi, "")
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

def validate_semantic_illustration(word_info, plan, svg_code):
    """
    Quality Control & Semantic Validation Engine before accepting an image.
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

def load_level_data(file_path):
    if not file_path.exists():
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        log_ts(f"[!] Error loading {file_path}: {e}")
        return []

def ensure_directory_structure():
    FLAT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for i in range(1, 7):
        (IMAGES_DIR / "HSK_2.0" / f"level{i}").mkdir(parents=True, exist_ok=True)
    for i in range(1, 10):
        (IMAGES_DIR / "HSK_3.0" / f"level{i}").mkdir(parents=True, exist_ok=True)

    if WORKTREE_DIR.exists():
        wt_flat = WORKTREE_DIR / "assets" / "images" / "illustrations"
        wt_flat.mkdir(parents=True, exist_ok=True)
        wt_images = WORKTREE_DIR / "images"
        for i in range(1, 7):
            (wt_images / "HSK_2.0" / f"level{i}").mkdir(parents=True, exist_ok=True)
        for i in range(1, 10):
            (wt_images / "HSK_3.0" / f"level{i}").mkdir(parents=True, exist_ok=True)

def build_manifest_and_organize():
    """
    Scans all vocabulary files and existing SVG files.
    Copies SVGs into images/HSK_2.0/levelX and images/HSK_3.0/levelY.
    Generates images/generated_manifest.json and images/README.md.
    Updates assets/js/word-illustrations.js.
    """
    ensure_directory_structure()
    log_ts("[*] Building illustration organization and manifest under images/...")

    hsk2_curriculum = [(f"level{i}", VOCAB_DIR / f"hsk{i}_vocabularies.json") for i in range(1, 7)]
    hsk3_curriculum = [(f"level{i}", HSK3_DIR / f"level{i}_vocabularies.json") for i in range(1, 10)]

    existing_flat_svgs = {p.stem: p for p in FLAT_OUTPUT_DIR.glob("*.svg") if p.is_file() and p.stat().st_size > 150}

    # Also check existing images SVGs
    for p in IMAGES_DIR.glob("**/*.svg"):
        if p.is_file() and p.stat().st_size > 150:
            if p.stem not in existing_flat_svgs:
                flat_dest = FLAT_OUTPUT_DIR / p.name
                if not flat_dest.exists() or flat_dest.stat().st_size != p.stat().st_size:
                    shutil.copy2(p, flat_dest)
                existing_flat_svgs[p.stem] = flat_dest

    manifest_entries = {}
    stats_hsk2 = {}
    stats_hsk3 = {}

    # 1. Map HSK 2.0 (level1..level6)
    for lvl_code, path in hsk2_curriculum:
        words = load_level_data(path)
        dest_dir = IMAGES_DIR / "HSK_2.0" / lvl_code
        dest_dir.mkdir(parents=True, exist_ok=True)
        count = 0
        for w in words:
            hz = w.get("hanzi", "").strip()
            if not hz:
                continue
            if hz in existing_flat_svgs:
                src_file = existing_flat_svgs[hz]
                target_file = dest_dir / f"{hz}.svg"
                if not target_file.exists() or target_file.stat().st_size != src_file.stat().st_size:
                    shutil.copy2(src_file, target_file)
                count += 1

                rel_src = f"images/HSK_2.0/{lvl_code}/{hz}.svg"
                if hz not in manifest_entries:
                    manifest_entries[hz] = {
                        "hanzi": hz,
                        "pinyin": w.get("pinyin", ""),
                        "meaning": w.get("meaning", ""),
                        "example_zh": w.get("example_zh") or w.get("example", ""),
                        "example_vi": w.get("example_vi", ""),
                        "levels_hsk2": [lvl_code],
                        "levels_hsk3": [],
                        "file": f"{hz}.svg",
                        "src": rel_src,
                        "alt_srcs": []
                    }
                else:
                    if lvl_code not in manifest_entries[hz]["levels_hsk2"]:
                        manifest_entries[hz]["levels_hsk2"].append(lvl_code)
                    if rel_src not in manifest_entries[hz]["alt_srcs"] and rel_src != manifest_entries[hz]["src"]:
                        manifest_entries[hz]["alt_srcs"].append(rel_src)

        pct = (count / len(words) * 100) if words else 0.0
        stats_hsk2[lvl_code] = {"total": len(words), "with_svg": count, "pct": f"{pct:.1f}%"}

    # 2. Map HSK 3.0 (level1..level9)
    for lvl_code, path in hsk3_curriculum:
        words = load_level_data(path)
        dest_dir = IMAGES_DIR / "HSK_3.0" / lvl_code
        dest_dir.mkdir(parents=True, exist_ok=True)
        count = 0
        for w in words:
            hz = w.get("hanzi", "").strip()
            if not hz:
                continue
            if hz in existing_flat_svgs:
                src_file = existing_flat_svgs[hz]
                target_file = dest_dir / f"{hz}.svg"
                if not target_file.exists() or target_file.stat().st_size != src_file.stat().st_size:
                    shutil.copy2(src_file, target_file)
                count += 1

                rel_src = f"images/HSK_3.0/{lvl_code}/{hz}.svg"
                if hz not in manifest_entries:
                    manifest_entries[hz] = {
                        "hanzi": hz,
                        "pinyin": w.get("pinyin", ""),
                        "meaning": w.get("meaning", ""),
                        "example_zh": w.get("example_zh") or w.get("example", ""),
                        "example_vi": w.get("example_vi", ""),
                        "levels_hsk2": [],
                        "levels_hsk3": [lvl_code],
                        "file": f"{hz}.svg",
                        "src": rel_src,
                        "alt_srcs": []
                    }
                else:
                    if lvl_code not in manifest_entries[hz]["levels_hsk3"]:
                        manifest_entries[hz]["levels_hsk3"].append(lvl_code)
                    if rel_src not in manifest_entries[hz]["alt_srcs"] and rel_src != manifest_entries[hz]["src"]:
                        manifest_entries[hz]["alt_srcs"].append(rel_src)

        pct = (count / len(words) * 100) if words else 0.0
        stats_hsk3[lvl_code] = {"total": len(words), "with_svg": count, "pct": f"{pct:.1f}%"}

    # Output generated_manifest.json
    manifest_data = {
        "generated_at": datetime.now().isoformat(),
        "total_unique_words_with_illustrations": len(manifest_entries),
        "total_flat_svg_files": len(existing_flat_svgs),
        "statistics": {
            "hsk_2_0": stats_hsk2,
            "hsk_3_0": stats_hsk3
        },
        "manifest": manifest_entries
    }

    manifest_json_str = json.dumps(manifest_data, ensure_ascii=False, indent=2)
    (IMAGES_DIR / "generated_manifest.json").write_text(manifest_json_str, encoding="utf-8")

    # Output README.md
    readme_md = generate_readme_markdown(stats_hsk2, stats_hsk3, len(manifest_entries))
    (IMAGES_DIR / "README.md").write_text(readme_md, encoding="utf-8")
    (REPO_ROOT / "README_ILLUSTRATIONS.md").write_text(readme_md, encoding="utf-8")

    # Update assets/js/word-illustrations.js
    update_word_illustrations_js(manifest_entries)

    log_ts(f"[*] Manifest and images/ organization built successfully. Total indexed: {len(manifest_entries)} words.")
    return manifest_data

def generate_readme_markdown(stats_hsk2, stats_hsk3, total_unique):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def make_progress_bar(pct_str):
        pct = float(pct_str.replace('%', ''))
        blocks = int(pct / 10)
        return '█' * blocks + '░' * (10 - blocks)

    hsk2_rows = []
    total_hsk2_words = sum(v["total"] for v in stats_hsk2.values())
    total_hsk2_svg = sum(v["with_svg"] for v in stats_hsk2.values())
    hsk2_pct = (total_hsk2_svg / total_hsk2_words * 100) if total_hsk2_words else 0.0

    for i in range(1, 7):
        lvl = f"level{i}"
        info = stats_hsk2.get(lvl, {"total": 0, "with_svg": 0, "pct": "0.0%"})
        status = "✅ Hoàn thành" if info["pct"] == "100.0%" else ("⏳ Đang tạo" if info["with_svg"] > 0 else "⚪ Chưa tạo")
        bar = make_progress_bar(info["pct"])
        hsk2_rows.append(f"| **HSK 2.0 Level {i}** | `{info['with_svg']}/{info['total']}` | **{info['pct']}** | `{bar}` | {status} |")

    hsk3_rows = []
    total_hsk3_words = sum(v["total"] for v in stats_hsk3.values())
    total_hsk3_svg = sum(v["with_svg"] for v in stats_hsk3.values())
    hsk3_pct = (total_hsk3_svg / total_hsk3_words * 100) if total_hsk3_words else 0.0

    for i in range(1, 10):
        lvl = f"level{i}"
        info = stats_hsk3.get(lvl, {"total": 0, "with_svg": 0, "pct": "0.0%"})
        status = "✅ Hoàn thành" if info["pct"] == "100.0%" else ("⏳ Đang tạo" if info["with_svg"] > 0 else "⚪ Chưa tạo")
        bar = make_progress_bar(info["pct"])
        hsk3_rows.append(f"| **HSK 3.0 Level {i}** | `{info['with_svg']}/{info['total']}` | **{info['pct']}** | `{bar}` | {status} |")

    return f"""# 🎨 Kho Lưu Trữ Hình Minh Họa Ngữ Cảnh HSK (Scene-Based Vector Illustrations)

*Báo cáo cập nhật tự động lúc: `{now_str}`*

Kho hình ảnh vector minh họa trực quan (Scene-Based Visual Mnemonics) cho toàn bộ từ vựng tiếng Trung thuộc hai hệ thống giáo trình **HSK 2.0 (Level 1 - 6)** và **HSK 3.0 (Level 1 - 9)**.

---

## 🌟 Tiêu chuẩn thiết kế minh họa (Art Direction Standards)
1. **Scene-Based & Action-Oriented (Gợi cảnh & Hành động thực tế)**:
   - Toàn bộ hình vẽ được mô phỏng trực tiếp từ **câu ví dụ ngữ cảnh** của từ vựng đó.
   - Nhân vật thực hiện hành động cụ thể, có đạo cụ (props), bối cảnh không gian thực tế (phòng học, văn phòng, đường phố, sân bay, bệnh viện, nhà hàng,...).
   - **Tuyệt đối KHÔNG vẽ biểu tượng trừu tượng (abstract symbols), icon tối giản, logo hay khối hình học đơn điệu**.
2. **Thân thiện với chế độ tối (Dark-Mode Friendly)**:
   - Khung hình full-bleed container `240x240` nền tối sang trọng (`#1e293b` / `#0f172a`), đổ bóng mềm, viền bo tròn mềm mại (`rx="24"`).
   - Màu sắc sinh động, ấm áp, độ tương phản cao với chữ Hán và Pinyin.
3. **Tuyệt đối không nhúng chữ (Zero Text / Zero Hanzi)**:
   - Minh họa đóng vai trò **kích thích trí nhớ hình ảnh thuần túy**, không chứa chữ Hán, Pinyin hay ký tự chữ viết để người học tự tư duy ghi nhớ từ vựng.

---

## 📁 Cấu trúc thư mục (Folder Hierarchy)

```
images/
├── HSK_2.0/
│   ├── level1/          # 150/150 từ (100.0%) - ✅ Hoàn thành
│   ├── level2/          # 150/150 từ (100.0%) - ✅ Hoàn thành
│   ├── level3/          # Từ vựng HSK 2.0 Level 3
│   ├── level4/          # 600/600 từ (100.0%) - ✅ Hoàn thành
│   ├── level5/          # Từ vựng HSK 2.0 Level 5
│   └── level6/          # Từ vựng HSK 2.0 Level 6
├── HSK_3.0/
│   ├── level1/          # HSK 3.0 Level 1
│   ├── level2/          # HSK 3.0 Level 2
│   ├── level3/          # HSK 3.0 Level 3
│   ├── level4/          # HSK 3.0 Level 4
│   ├── level5/          # HSK 3.0 Level 5
│   ├── level6/          # HSK 3.0 Level 6
│   ├── level7/          # HSK 3.0 Level 7
│   ├── level8/          # HSK 3.0 Level 8
│   └── level9/          # HSK 3.0 Level 9
├── generated_manifest.json    # Manifest tra cứu toàn diện JSON
└── README.md                  # Bản thống kê chi tiết này
```

---

## 📊 Bảng thống kê tiến độ HSK 2.0 (Tổng từ vựng: {total_hsk2_words})

| Cấp độ | Đã có hình / Tổng từ | Tỷ lệ | Tiến độ trực quan | Trạng thái |
| :--- | :---: | :---: | :--- | :--- |
{chr(10).join(hsk2_rows)}
| **TỔNG CỘNG HSK 2.0** | **`{total_hsk2_svg}/{total_hsk2_words}`** | **`{hsk2_pct:.1f}%`** | `{make_progress_bar(f'{hsk2_pct:.1f}%')}` | {'✅ Đầy đủ' if hsk2_pct == 100 else '⏳ Đang hoàn thiện'} |

---

## 📊 Bảng thống kê tiến độ HSK 3.0 (Tổng từ vựng: {total_hsk3_words})

| Cấp độ | Đã có hình / Tổng từ | Tỷ lệ | Tiến độ trực quan | Trạng thái |
| :--- | :---: | :---: | :--- | :--- |
{chr(10).join(hsk3_rows)}
| **TỔNG CỘNG HSK 3.0** | **`{total_hsk3_svg}/{total_hsk3_words}`** | **`{hsk3_pct:.1f}%`** | `{make_progress_bar(f'{hsk3_pct:.1f}%')}` | {'✅ Đầy đủ' if hsk3_pct == 100 else '⏳ Đang hoàn thiện'} |

---

## 💡 Tổng kết tài nguyên hiện tại
- **Tổng số từ vựng duy nhất đã có minh họa vector**: **`{total_unique}`** từ.
- **Manifest tích hợp ứng dụng**: File [`assets/js/word-illustrations.js`](file:///assets/js/word-illustrations.js) và [`images/generated_manifest.json`](file:///images/generated_manifest.json) tự động đồng bộ đường dẫn để flashcard tải trực tiếp hình ảnh theo cấp độ tương ứng.
"""

def update_word_illustrations_js(manifest_entries):
    if not manifest_entries:
        return

    js_index = {}
    for hz, item in manifest_entries.items():
        js_index[hz] = {
            "file": item["file"],
            "src": item["src"],
            "caption": item["meaning"]
        }

    out_file = REPO_ROOT / "database" / "illustrations" / "illustrations_index.json"
    out_file.write_text(json.dumps(js_index, ensure_ascii=False, indent=2), encoding="utf-8")

    if WORKTREE_DIR.exists():
        try:
            wt_out = WORKTREE_DIR / "database" / "illustrations" / "illustrations_index.json"
            wt_out.write_text(json.dumps(js_index, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass


def call_gemini_svg_api(word_info, api_keys, max_retries=3, model_offset=0):
    if isinstance(api_keys, str):
        api_keys = [api_keys] if api_keys else []
    if not api_keys:
        return None

    plan = plan_semantic_scene(word_info)
    prompt = build_semantic_prompt(word_info, plan)

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.35}
    }

    rotated_models = MODELS_TO_TRY[model_offset % len(MODELS_TO_TRY):] + MODELS_TO_TRY[:model_offset % len(MODELS_TO_TRY)]

    for attempt in range(4):
        if ABORT_EVENT.is_set() or all_models_permanently_exhausted(api_keys):
            return None

        available_pairs = []
        for model in rotated_models:
            for k_idx, key in enumerate(api_keys):
                if is_model_available(k_idx, model):
                    available_pairs.append((k_idx, key, model))

        if not available_pairs:
            if ABORT_EVENT.is_set() or all_models_permanently_exhausted(api_keys):
                return None
            time.sleep(2)
            continue

        for k_idx, key, model in available_pairs:
            if ABORT_EVENT.is_set():
                return None
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=18) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            text = parts[0]["text"]
                            m = re.search(r"<svg[\s\S]*?<\/svg>", text, re.IGNORECASE)
                            if m:
                                svg_str = m.group(0).strip()
                                is_valid, reason = validate_semantic_illustration(word_info, plan, svg_str)
                                if is_valid:
                                    return svg_str
            except urllib.error.HTTPError as he:
                err_body = he.read().decode("utf-8", errors="ignore")
                retry_delay = extract_retry_delay(err_body)
                if he.code == 429:
                    err_lower = err_body.lower()
                    is_daily = (retry_delay and retry_delay > 180) or (("requestsperday" in err_lower or "per day" in err_lower or "requests_per_day" in err_lower or "limit: 20" in err_lower or "limit: 500" in err_lower) and ("quota exceeded" in err_lower or "limit" in err_lower) and not ("perminute" in err_lower or "per minute" in err_lower))
                    if is_daily:
                        mark_model_throttled(k_idx, model, is_daily=True, retry_delay=retry_delay, api_keys=api_keys)
                    else:
                        mark_model_throttled(k_idx, model, is_daily=False, seconds=12, api_keys=api_keys)
                    continue
                elif he.code in (404, 400):
                    mark_model_throttled(k_idx, model, is_daily=True, api_keys=api_keys)
                    continue
                elif he.code == 503:
                    mark_model_throttled(k_idx, model, is_daily=False, seconds=5, api_keys=api_keys)
                    continue
                else:
                    continue
            except Exception:
                continue

        if attempt < 3:
            time.sleep(2)

    return None

def git_commit_and_push(batch_count, level_label, no_commit=False, no_push=False):
    if no_commit:
        return
    try:
        log_ts(f"\n[>>> GIT] Committing batch of {batch_count} newly generated SVGs for {level_label}...")
        subprocess.run(["git", "add", "images", "assets/images/illustrations", "database/illustrations", "README_ILLUSTRATIONS.md", "assets/js/word-illustrations.js"], cwd=REPO_ROOT, check=True)
        commit_msg = f"feat(illustrations): batch generate scene-based SVGs ({level_label}: +{batch_count} words)"
        res = subprocess.run(["git", "commit", "-m", commit_msg], cwd=REPO_ROOT, capture_output=True, text=True)
        log_ts(f"[>>> GIT] {res.stdout.strip()}")
        if not no_push:
            push_res = subprocess.run(["git", "push", "origin", "HEAD:main"], cwd=REPO_ROOT, capture_output=True, text=True)
            log_ts(f"[>>> GIT] Push result: {push_res.stdout.strip() or push_res.stderr.strip() or 'OK'}")
    except Exception as e:
        log_ts(f"[!] Warning git commit/push encountered error: {e}")

def main():
    parser = argparse.ArgumentParser(description="Master batch generator & organizer for all HSK 2.0 & HSK 3.0 levels")
    parser.add_argument("--api-key", default="", help="Google AI Studio API Key (comma-separated or set in .api_key)")
    parser.add_argument("--concurrency", type=int, default=4, help="Concurrent worker threads (default: 4 for smooth pacing)")
    parser.add_argument("--delay", type=float, default=1.5, help="Delay between requests in seconds (default: 1.5s)")
    parser.add_argument("--batch-size", type=int, default=50, help="Commit and push every N generated items (default: 50)")
    parser.add_argument("--only-organize", action="store_true", help="Only reorganize existing SVGs, build manifest & README without generating new SVGs")
    parser.add_argument("--target-level", default="all", help="Target specific level (e.g., 'level3', 'level5', 'level6', 'all')")
    parser.add_argument("--no-commit", action="store_true", help="Do not create git commits automatically")
    parser.add_argument("--no-push", action="store_true", help="Do not push commits to remote repository")
    args = parser.parse_args()

    api_keys = get_api_keys(args.api_key.strip())
    if not api_keys and not args.only_organize:
        log_ts("[!] No Google AI API key found! Please set GOOGLE_AI_KEY or add to .api_key")
        return

    log_ts(f"[*] Loaded {len(api_keys)} API key(s) for generation rotation. Concurrency: {args.concurrency} workers, Delay: {args.delay}s.")

    # Step 1: Organization under images/
    manifest_data = build_manifest_and_organize()

    if args.only_organize:
        log_ts("[*] Reorganization completed successfully (--only-organize). Exiting.")
        return

    # Step 2: Curriculum roadmap
    curriculum = [
        # Phase 1: Complete HSK 2.0 Level 3 (100% complete)
        ("HSK 2.0 Level 3", "level3", "HSK_2.0", VOCAB_DIR / "hsk3_vocabularies.json"),
        # Phase 2: Complete HSK 2.0 Level 5 (100% complete)
        ("HSK 2.0 Level 5", "level5", "HSK_2.0", VOCAB_DIR / "hsk5_vocabularies.json"),
        # Phase 3: Complete HSK 3.0 Level 5 (already at ~1084/1600 words)
        ("HSK 3.0 Level 5", "level5", "HSK_3.0", HSK3_DIR / "level5_vocabularies.json"),
        # Phase 4: Complete HSK 2.0 Level 6
        ("HSK 2.0 Level 6", "level6", "HSK_2.0", VOCAB_DIR / "hsk6_vocabularies.json"),
        # Phase 5: HSK 3.0 Levels 1..9
        ("HSK 3.0 Level 1", "level1", "HSK_3.0", HSK3_DIR / "level1_vocabularies.json"),
        ("HSK 3.0 Level 2", "level2", "HSK_3.0", HSK3_DIR / "level2_vocabularies.json"),
        ("HSK 3.0 Level 3", "level3", "HSK_3.0", HSK3_DIR / "level3_vocabularies.json"),
        ("HSK 3.0 Level 4", "level4", "HSK_3.0", HSK3_DIR / "level4_vocabularies.json"),
        ("HSK 3.0 Level 6", "level6", "HSK_3.0", HSK3_DIR / "level6_vocabularies.json"),
        ("HSK 3.0 Level 7", "level7", "HSK_3.0", HSK3_DIR / "level7_vocabularies.json"),
        ("HSK 3.0 Level 8", "level8", "HSK_3.0", HSK3_DIR / "level8_vocabularies.json"),
        ("HSK 3.0 Level 9", "level9", "HSK_3.0", HSK3_DIR / "level9_vocabularies.json"),
    ]

    if args.target_level != "all":
        curriculum = [c for c in curriculum if c[1] == args.target_level or c[0].lower() == args.target_level.lower()]

    total_generated_session = 0
    batch_new_count = 0

    log_ts("\n==================================================================")
    log_ts("  HSK Flashcards: Master Scene-Based Illustration Pipeline (HIGH SPEED)")
    log_ts(f"  Target: images/HSK_2.0/level1..6 -> images/HSK_3.0/level1..9")
    log_ts(f"  Concurrency: {args.concurrency} parallel workers | Delay: {args.delay}s")
    log_ts(f"  Batch commit threshold: Every {args.batch_size} newly generated SVGs -> main")
    log_ts("==================================================================\n")

    for level_label, lvl_code, schema_type, file_path in curriculum:
        words = load_level_data(file_path)
        if not words:
            continue

        log_ts(f"\n[*] Scanning {level_label} ({len(words)} words) from {file_path.name}...")
        level_new = 0
        level_skipped = 0

        missing_items = []
        for idx, item in enumerate(words, 1):
            hanzi = item.get("hanzi", "").strip()
            if not hanzi:
                continue

            out_filename = f"{hanzi}.svg"
            flat_path = FLAT_OUTPUT_DIR / out_filename
            images_dest = IMAGES_DIR / schema_type / lvl_code / out_filename

            # Check if SVG already exists in images or flat dir
            if (images_dest.exists() and images_dest.stat().st_size > 150) or (flat_path.exists() and flat_path.stat().st_size > 150):
                level_skipped += 1
                if not images_dest.exists() and flat_path.exists():
                    shutil.copy2(flat_path, images_dest)
                continue

            missing_items.append((idx, item))

        log_ts(f"[*] {level_label}: {len(missing_items)} missing words to generate ({level_skipped} already exist). Spawning {args.concurrency} parallel workers...")

        if not missing_items:
            log_ts(f"[*] {level_label} is already 100% complete! Skipping to next level.")
            continue

        current_missing = missing_items
        pass_idx = 1
        while current_missing:
            if all_models_permanently_exhausted(api_keys):
                report_exhausted_and_renew()
                break

            if pass_idx > 1:
                log_ts(f"[*] {level_label} (Pass {pass_idx}): Retrying {len(current_missing)} uncompleted words...")

            failed_in_pass = []

            def process_word(task_info):
                if ABORT_EVENT.is_set():
                    return False
                nonlocal batch_new_count, level_new, total_generated_session
                orig_idx, item = task_info
                hanzi = item.get("hanzi", "").strip()
                meaning = item.get("meaning", "").strip()
                pinyin = item.get("pinyin", "").strip()
                pos_type, pos_label = classify_pos(meaning, hanzi)
                item["pos"] = pos_label

                out_filename = f"{hanzi}.svg"
                flat_path = FLAT_OUTPUT_DIR / out_filename
                images_dest = IMAGES_DIR / schema_type / lvl_code / out_filename

                svg_code = call_gemini_svg_api(item, api_keys, model_offset=orig_idx)
                if args.delay > 0:
                    time.sleep(args.delay)
                if svg_code:
                    # 1. Write flat SVG
                    flat_path.write_text(svg_code, encoding="utf-8")

                    # 2. Write images/ SVG
                    images_dest.write_text(svg_code, encoding="utf-8")

                    # 3. Mirror to worktree if exists
                    if WORKTREE_DIR.exists():
                        try:
                            (WORKTREE_DIR / "assets" / "images" / "illustrations" / out_filename).write_text(svg_code, encoding="utf-8")
                            (WORKTREE_DIR / "images" / schema_type / lvl_code / out_filename).write_text(svg_code, encoding="utf-8")
                        except Exception:
                            pass

                    should_commit = False
                    with state_lock:
                        level_new += 1
                        batch_new_count += 1
                        total_generated_session += 1
                        log_ts(f"    ✓ [{orig_idx}/{len(words)}] Generated '{hanzi}' ({pinyin} - {meaning[:22]}) [{len(svg_code)} B] (Total session: {total_generated_session})")
                        if batch_new_count >= args.batch_size:
                            batch_new_count = 0
                            should_commit = True

                    if should_commit:
                        with git_lock:
                            build_manifest_and_organize()
                            git_commit_and_push(args.batch_size, level_label, no_commit=args.no_commit, no_push=args.no_push)

                    return True
                else:
                    return False

            CHUNK_SIZE = 40
            for chunk_idx in range(0, len(current_missing), CHUNK_SIZE):
                if ABORT_EVENT.is_set() or all_models_permanently_exhausted(api_keys):
                    break
                chunk_items = current_missing[chunk_idx:chunk_idx + CHUNK_SIZE]
                with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
                    futures = {executor.submit(process_word, task): task for task in chunk_items}
                    for fut in as_completed(futures):
                        t = futures[fut]
                        try:
                            ok = fut.result()
                            if not ok and not ABORT_EVENT.is_set():
                                failed_in_pass.append(t)
                        except Exception as e:
                            log_ts(f"[!] Worker exception: {e}")
                            if not ABORT_EVENT.is_set():
                                failed_in_pass.append(t)
                if ABORT_EVENT.is_set() or all_models_permanently_exhausted(api_keys):
                    break

            if ABORT_EVENT.is_set() or all_models_permanently_exhausted(api_keys):
                with git_lock:
                    build_manifest_and_organize()
                    if batch_new_count > 0:
                        git_commit_and_push(batch_new_count, level_label, no_commit=args.no_commit, no_push=args.no_push)
                report_exhausted_and_renew()
                sys.exit(0)

            if not failed_in_pass:
                break

            if len(failed_in_pass) == len(current_missing) and pass_idx >= 3:
                log_ts(f"[*] Stopping retries for {level_label} after 3 passes with {len(failed_in_pass)} pending words.")
                break

            current_missing = failed_in_pass
            pass_idx += 1
            time.sleep(2)

        # End of level commit
        with git_lock:
            build_manifest_and_organize()
            if batch_new_count > 0:
                git_commit_and_push(batch_new_count, level_label, no_commit=args.no_commit, no_push=args.no_push)
                batch_new_count = 0

        log_ts(f"[*] Completed {level_label}: {level_new} newly generated, {level_skipped} skipped.")

        if ABORT_EVENT.is_set() or all_models_permanently_exhausted(api_keys):
            report_exhausted_and_renew()
            sys.exit(0)

    log_ts("\n==================================================================")
    log_ts(f"[*] ALL LEVELS COMPLETED! Total newly generated: {total_generated_session}")
    log_ts("==================================================================")

if __name__ == "__main__":
    main()
