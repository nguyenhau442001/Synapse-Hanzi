// Right sidebar companion: real-world example sentences, antonyms/synonyms, and compound words.

const HSK_ANTONYMS = {
  '大': { word: '小', py: 'xiǎo', vi: 'nhỏ' },
  '小': { word: '大', py: 'dà', vi: 'to, lớn' },
  '多': { word: '少', py: 'shǎo', vi: 'ít' },
  '少': { word: '多', py: 'duō', vi: 'nhiều' },
  '长': { word: '短', py: 'duǎn', vi: 'ngắn' },
  '短': { word: '长', py: 'cháng', vi: 'dài' },
  '高': { word: '矮', py: 'ǎi', vi: 'thấp' },
  '矮': { word: '高', py: 'gāo', vi: 'cao' },
  '快': { word: '慢', py: 'màn', vi: 'chậm' },
  '慢': { word: '快', py: 'kuài', vi: 'nhanh' },
  '买': { word: '卖', py: 'mài', vi: 'bán' },
  '卖': { word: '买', py: 'mǎi', vi: 'mua' },
  '冷': { word: '热', py: 'rè', vi: 'nóng' },
  '热': { word: '冷', py: 'lěng', vi: 'lạnh' },
  '新': { word: '旧', py: 'jiù', vi: 'cũ' },
  '旧': { word: '新', py: 'xīn', vi: 'mới' },
  '好': { word: '坏', py: 'huài', vi: 'xấu, hỏng' },
  '坏': { word: '好', py: 'hǎo', vi: 'tốt' },
  '对': { word: '错', py: 'cuò', vi: 'sai' },
  '错': { word: '对', py: 'duì', vi: 'đúng' },
  '早': { word: '晚', py: 'wǎn', vi: 'muộn' },
  '晚': { word: '早', py: 'zǎo', vi: 'sớm' },
  '前': { word: '后', py: 'hòu', vi: 'sau' },
  '后': { word: '前', py: 'qián', vi: 'trước' },
  '左': { word: '右', py: 'yòu', vi: 'phải' },
  '右': { word: '左', py: 'zuǒ', vi: 'trái' },
  '上': { word: '下', py: 'xià', vi: 'dưới' },
  '下': { word: '上', py: 'shàng', vi: 'trên' },
  '远': { word: '近', py: 'jìn', vi: 'gần' },
  '近': { word: '远', py: 'yuǎn', vi: 'xa' },
  '开': { word: '关', py: 'guān', vi: 'đóng' },
  '关': { word: '开', py: 'kāi', vi: 'mở' },
  '进': { word: '出', py: 'chū', vi: 'ra' },
  '出': { word: '进', py: 'jìn', vi: 'vào' },
  '贵': { word: '便宜', py: 'piányi', vi: 'rẻ' },
  '便宜': { word: '贵', py: 'guì', vi: 'đắt' },
  '难': { word: '容易', py: 'róngyì', vi: 'dễ' },
  '容易': { word: '难', py: 'nán', vi: 'khó' },
  '黑': { word: '白', py: 'bái', vi: 'trắng' },
  '白': { word: '黑', py: 'hēi', vi: 'đen' },
  '轻': { word: '重', py: 'zhòng', vi: 'nặng' },
  '重': { word: '轻', py: 'qīng', vi: 'nhẹ' },
  '男': { word: '女', py: 'nǚ', vi: 'nữ' },
  '女': { word: '男', py: 'nán', vi: 'nam' },
  '去': { word: '来', py: 'lái', vi: 'đến' },
  '来': { word: '去', py: 'qù', vi: 'đi' },
  '问': { word: '答', py: 'dá', vi: 'trả lời' },
  '哭': { word: '笑', py: 'xiào', vi: 'cười' },
  '笑': { word: '哭', py: 'kū', vi: 'khóc' },
  '饱': { word: '饿', py: 'è', vi: 'đói' },
  '饿': { word: '饱', py: 'bǎo', vi: 'no' },
  '真': { word: '假', py: 'jiǎ', vi: 'giả' },
  '亮': { word: '暗', py: 'àn', vi: 'tối' },
  '香': { word: '臭', py: 'chòu', vi: 'thối' },
  '甜': { word: '苦', py: 'kǔ', vi: 'đắng' },
  '爱': { word: '恨', py: 'hèn', vi: 'hận, ghét' },
  '生': { word: '死', py: 'sǐ', vi: 'chết' },
  '胜': { word: '败', py: 'bài', vi: 'bại' },
};

const HSK_SYNONYMS = {
  '好看': { word: '漂亮', py: 'piàoliang', vi: 'đẹp' },
  '漂亮': { word: '好看', py: 'hǎokàn', vi: 'đẹp, ưa nhìn' },
  '高兴': { word: '快乐', py: 'kuàilè', vi: 'vui vẻ' },
  '快乐': { word: '高兴', py: 'gāoxìng', vi: 'vui mừng' },
  '开心': { word: '高兴', py: 'gāoxìng', vi: 'vui vẻ' },
  '常常': { word: '经常', py: 'jīngcháng', vi: 'thường xuyên' },
  '经常': { word: '常常', py: 'chángcháng', vi: 'thường hay' },
  '马上': { word: '立刻', py: 'lìkè', vi: 'ngay lập tức' },
  '说话': { word: '聊天', py: 'liáotiān', vi: 'trò chuyện' },
  '特别': { word: '非常', py: 'fēicháng', vi: 'rất, đặc biệt' },
  '可能': { word: '也许', py: 'yěxǔ', vi: 'có lẽ' },
  '简单': { word: '容易', py: 'róngyì', vi: 'dễ dàng' },
  '难过': { word: '伤心', py: 'shāngxīn', vi: 'buồn bã' },
  '帮助': { word: '帮忙', py: 'bāngmáng', vi: 'giúp đỡ' },
};

function findRelatedWordsInLesson(hanzi) {
  if (!Array.isArray(WORDS) || !hanzi) return [];
  const chars = Array.from(hanzi);
  return WORDS.filter(w => {
    if (w.hanzi === hanzi) return false;
    return chars.some(c => w.hanzi.includes(c));
  }).slice(0, 4);
}

function renderWordCompanion(word) {
  const panel = document.getElementById('wordCompanionPanel');
  if (!panel) return;

  if (!word) {
    panel.innerHTML = '<div class="companion-empty">Chọn một từ để xem câu ví dụ thực tế và từ liên quan.</div>';
    return;
  }

  const hasExample = Boolean(word.example_zh || word.example_py || word.example_vi);
  const antonym = HSK_ANTONYMS[word.hanzi];
  const synonym = HSK_SYNONYMS[word.hanzi];
  const relatedWords = findRelatedWordsInLesson(word.hanzi);

  let html = '';

  // 1. Real-world example sentence
  if (hasExample) {
    html += `
      <div class="companion-section companion-example-section">
        <div class="companion-section-header">
          <span class="companion-section-title">Câu ví dụ thực tế</span>
          <button type="button" class="companion-sound-btn" onclick="event.stopPropagation(); speakExample()" title="Nghe câu ví dụ" aria-label="Nghe câu ví dụ">
            <span aria-hidden="true">🔊</span>
          </button>
        </div>
        <div class="companion-example-card">
          <div class="companion-ex-zh">${word.example_zh || ''}</div>
          <div class="companion-ex-py">${word.example_py || ''}</div>
          <div class="companion-ex-vi">${word.example_vi || ''}</div>
        </div>
      </div>
    `;
  }

  // 2. Synonyms & Antonyms
  if (antonym || synonym) {
    html += `<div class="companion-section companion-rel-section"><div class="companion-section-title">Từ đối chiếu</div><div class="companion-chips-row">`;
    if (antonym) {
      html += `
        <div class="companion-chip companion-chip--antonym" title="Từ trái nghĩa: ${antonym.vi}">
          <span class="companion-chip-badge">Trái nghĩa ↔</span>
          <strong class="companion-chip-word">${antonym.word}</strong>
          <span class="companion-chip-py">${antonym.py}</span>
          <span class="companion-chip-vi">${antonym.vi}</span>
        </div>
      `;
    }
    if (synonym) {
      html += `
        <div class="companion-chip companion-chip--synonym" title="Từ đồng nghĩa: ${synonym.vi}">
          <span class="companion-chip-badge">Đồng nghĩa ≈</span>
          <strong class="companion-chip-word">${synonym.word}</strong>
          <span class="companion-chip-py">${synonym.py}</span>
          <span class="companion-chip-vi">${synonym.vi}</span>
        </div>
      `;
    }
    html += `</div></div>`;
  }

  // 3. Collocations / Related words in current lesson
  if (relatedWords.length > 0) {
    html += `
      <div class="companion-section companion-compounds-section">
        <div class="companion-section-title">Từ ghép trong bài (${relatedWords.length})</div>
        <div class="companion-compounds-list">
          ${relatedWords.map(w => {
            const wordIdx = WORDS.indexOf(w);
            return `
              <button type="button" class="companion-compound-pill" onclick="jumpToWordByIndex(${wordIdx})" title="Chuyển đến từ: ${w.meaning}">
                <span class="compound-hanzi">${w.hanzi}</span>
                <span class="compound-py">${w.pinyin || ''}</span>
                <span class="compound-vi">${w.meaning || ''}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  panel.innerHTML = html || '<div class="companion-empty">Đang cập nhật thêm ví dụ và từ liên quan cho từ này.</div>';
}

function initWordCompanion() {
  const mount = document.getElementById('workstationRight') || document.getElementById('screenCards');
  if (!mount) return;

  if (document.getElementById('wordCompanionWrap')) return;

  const wrap = document.createElement('div');
  wrap.className = 'word-companion-panel';
  wrap.id = 'wordCompanionWrap';
  const title = document.createElement('div');
  title.className = 'sidebar-panel-title';
  title.textContent = 'Câu ví dụ & Hỗ trợ từ vựng';
  wrap.appendChild(title);

  const body = document.createElement('div');
  body.id = 'wordCompanionPanel';
  body.className = 'word-companion-body';
  wrap.appendChild(body);
  mount.appendChild(wrap);

  onActiveWordChange(renderWordCompanion);
  renderWordCompanion(typeof activeStudyWord !== 'undefined' ? activeStudyWord : null);
}

document.addEventListener('DOMContentLoaded', initWordCompanion);
