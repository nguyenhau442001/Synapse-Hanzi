/**
 * word-illustrations.js
 * Visual Mnemonic, Conceptual Illustration & Part of Speech (POS) Engine for HSK Flashcards.
 * Supports vector SVGs, curated mnemonic stories, remote URLs, and POS classification.
 */

const POS_TYPES = {
  adj: { code: 'adj', label: 'Tính từ', en: 'Adjective', full: 'Tính từ / Adjective' },
  verb: { code: 'verb', label: 'Động từ', en: 'Verb', full: 'Động từ / Verb' },
  noun: { code: 'noun', label: 'Danh từ', en: 'Noun', full: 'Danh từ / Noun' },
  adv: { code: 'adv', label: 'Phó từ', en: 'Adverb', full: 'Phó từ / Adverb' },
  measure: { code: 'measure', label: 'Lượng từ', en: 'Measure Word', full: 'Lượng từ / Measure Word' },
  pron: { code: 'pron', label: 'Đại từ', en: 'Pronoun', full: 'Đại từ / Pronoun' },
  prep: { code: 'prep', label: 'Giới từ', en: 'Preposition', full: 'Giới từ / Preposition' },
  conj: { code: 'conj', label: 'Liên từ', en: 'Conjunction', full: 'Liên từ / Conjunction' },
  num: { code: 'num', label: 'Số từ', en: 'Numeral', full: 'Số từ / Numeral' },
  particle: { code: 'particle', label: 'Trợ từ', en: 'Particle', full: 'Trợ từ / Particle' },
  interj: { code: 'interj', label: 'Thán từ', en: 'Interjection', full: 'Thán từ / Interjection' },
  phrase: { code: 'phrase', label: 'Cụm từ', en: 'Phrase', full: 'Cụm từ / Phrase' },
  idiom: { code: 'idiom', label: 'Thành ngữ', en: 'Idiom', full: 'Thành ngữ / Idiom' }
};

// Comprehensive HSK 1-6 Part of Speech lookup dictionary (Lazy-loaded)
let HSK_POS_DB = {};
if (typeof fetch !== 'undefined') {
  fetch('database/pos_dictionary.json')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data) {
        HSK_POS_DB = data;
        if (typeof window !== 'undefined') window.HSK_POS_DB = data;
      }
    })
    .catch(() => {});
}
/**
 * Returns normalized Part of Speech metadata for any vocabulary word.
 * Fallback to intelligent semantic analysis of Vietnamese definition if not in DB.
 */
function getWordPartOfSpeech(word) {
  if (!word) return null;
  // 1. Explicit POS field on word object
  if (word.pos) {
    if (typeof word.pos === 'object') return word.pos;
    if (POS_TYPES[word.pos]) return POS_TYPES[word.pos];
    return { code: 'noun', label: word.pos, en: word.pos, full: word.pos };
  }

  const hanzi = (word.hanzi || word.word || '').trim();
  const cleanHanzi = hanzi.replace(/[（\(].*?[）\)]/g, '').trim();

  // 2. Lookup in official HSK_POS_DB
  const code = (typeof HSK_POS_DB !== 'undefined' && (HSK_POS_DB[hanzi] || HSK_POS_DB[cleanHanzi])) || null;
  if (code && POS_TYPES[code]) {
    return POS_TYPES[code];
  }

  // 3. Intelligent heuristic fallback based on Vietnamese meaning
  const m = (word.meaning || '').toLowerCase().trim();
  if (!m) return POS_TYPES.noun;

  if (/\b(thán từ|ôi|chà|a|ha)\b/.test(m) || m.includes('(thán từ)')) return POS_TYPES.interj;
  if (/^(lượng từ|chiếc|cái|con|quyển|cuốn|bức|tấm|cây|bộ|đôi|ly|tách|bát|lần|chuyến|ngụm)\b/.test(m) || m.includes('lượng từ')) return POS_TYPES.measure;
  if (/^(đại từ|tôi|bạn|anh ấy|cô ấy|chúng tôi|chúng ta|mọi người|ai|gì|đây|đó|kia|mình|bản thân)\b/.test(m) || m.includes('đại từ')) return POS_TYPES.pron;
  if (/^(và|hơn nữa|nhưng|tuy nhiên|hoặc|nếu|bởi vì|cho nên|bất kể|mặc dù|cho dù|chỉ cần|thà rằng|ví như|chẳng hạn)\b/.test(m) || m.includes('liên từ')) return POS_TYPES.conj;
  if (/^(theo|dựa theo|đối với|hướng về|từ|đến|căn cứ vào|bởi|do|nhờ)\b/.test(m) || m.includes('giới từ')) return POS_TYPES.prep;
  if (/^(rất|quá|vô cùng|đều|luôn|thường|thường xuyên|lại|vừa|đang|đã|sẽ|chưa|không|chẳng|thực ra|đột nhiên|tự nhiên|nhất định|hầu như|đặc biệt|ban đầu|vốn dĩ|càng|buộc phải|lập tức|ngay)\b/.test(m) || m.includes('phó từ')) return POS_TYPES.adv;
  if (/^(phù hợp|thích hợp|đẹp|xấu|vui|buồn|tốt|khó|dễ|nhanh|chậm|lớn|to|nhỏ|mới|cũ|rẻ|đắt|an toàn|nguy hiểm|sạch|bẩn|thông minh|ngu ngốc|ấm|lạnh|nóng|ngon|ngọt|cay|đắng|mặn|dài|ngắn|cao|thấp|giàu|nghèo|rộng|hẹp|nổi tiếng|quan trọng|phức tạp|chính xác|nghiêm trọng|rõ ràng|đơn giản|tuyệt vời|nghiêm túc|cẩn thận|tự hào|tự tin|bận rộn|rảnh rỗi|gần|xa|khác biệt|thân thiết|nhiệt tình|kiên nhẫn|gầy|béo|sâu|nông|chắc chắn|vui vẻ|hạnh phúc|cô đơn|yên tĩnh|ồn ào)\b/.test(m) || m.includes('tính từ')) return POS_TYPES.adj;
  if (/^(làm|đi|nói|ăn|uống|xem|mua|bán|học|chạy|bay|đến|rời|giúp|tổ chức|chuẩn bị|phát hiện|tham gia|quyết định|giải quyết|sử dụng|cung cấp|tìm|gặp|nhớ|hiểu|yêu|ghét|thích|lo|nghĩ|biết|mặc|đeo|viết|đọc|nghe|sắp xếp|bố trí|ôm|xin lỗi|đăng ký|tốt nghiệp|biểu thị|thể hiện|biểu diễn|khen ngợi|bảo vệ|đảm bảo|thực hiện|hoàn thành|phát triển|mở rộng|thay đổi|tổng kết|du lịch|trao đổi|kết hôn|kinh doanh|nghiên cứu|chiến đấu|chúc mừng|cảm ơn|kính trọng|mời|chờ|đợi|hy vọng|ước|tin|nghi ngờ|chú ý|quan tâm|giảng|dạy|vẽ|hát|múa|bơi|chơi|sửa|chữa|chọn|chọn lựa)\b/.test(m) || m.includes('động từ')) return POS_TYPES.verb;

  return POS_TYPES.noun;
}

const WORD_ILLUSTRATIONS_DB = {
  // 合适 (héshì - thích hợp, phù hợp): Hai mảnh ghép ăn khớp hoàn hảo với ánh sáng kết nối và tick xác nhận
  '合适': {
    type: 'svg',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="puzzleLeftGrad" x1="42" y1="55" x2="100" y2="145" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
        <linearGradient id="puzzleRightGrad" x1="100" y1="55" x2="158" y2="145" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#34d399" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
      </defs>

      <!-- Ambient glow & alignment grid -->
      <circle cx="100" cy="100" r="82" fill="currentColor" fill-opacity="0.04" />
      <circle cx="100" cy="100" r="78" stroke="currentColor" stroke-opacity="0.1" stroke-width="1.5" stroke-dasharray="4 4" />

      <!-- Left Puzzle Piece (Coral/Amber - with knob tab) -->
      <path d="M 44 64 C 44 58 48 54 54 54 L 98 54 C 101 54 103 56 103 59 L 103 84 C 103 86 105 87 107 88 C 115 91 119 95 119 100 C 119 105 115 109 107 112 C 105 113 103 114 103 116 L 103 141 C 103 144 101 146 98 146 L 54 146 C 48 146 44 142 44 136 Z" fill="url(#puzzleLeftGrad)" stroke="#1e293b" stroke-width="2" />

      <!-- Right Puzzle Piece (Emerald - with matching socket receiving the tab) -->
      <path d="M 103 59 C 103 56 105 54 108 54 L 152 54 C 158 54 162 58 162 64 L 162 136 C 162 142 158 146 152 146 L 108 146 C 105 146 103 144 103 141 L 103 116 C 103 114 105 113 107 112 C 115 109 119 105 119 100 C 119 95 115 91 107 88 C 105 87 103 86 103 84 Z" fill="url(#puzzleRightGrad)" stroke="#1e293b" stroke-width="2" />

      <!-- Seam Highlight Line -->
      <path d="M 103 59 L 103 84 C 103 86 105 87 107 88 C 115 91 119 95 119 100 C 119 105 115 109 107 112 C 105 113 103 114 103 116 L 103 141" stroke="#ffffff" stroke-opacity="0.4" stroke-width="2" stroke-linecap="round" />

      <!-- Radiant Starburst at Interlocking Center -->
      <circle cx="111" cy="100" r="14" fill="#fef08a" fill-opacity="0.2" />
      <path d="M 111 88 L 113 97 L 122 100 L 113 103 L 111 112 L 109 103 L 100 100 L 109 97 Z" fill="#fef08a" />
      <circle cx="111" cy="100" r="3" fill="#ffffff" />

      <!-- Success Checkmark Badge (Vừa vặn - Đạt chuẩn) -->
      <circle cx="152" cy="52" r="14" fill="#10b981" stroke="#0f172a" stroke-width="2.5" />
      <path d="M 146 52 L 150 56 L 158 48" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Sparkle accents -->
      <path d="M 46 42 L 48 47 L 53 48 L 48 49 L 46 54 L 44 49 L 39 48 L 44 47 Z" fill="#fbbf24" opacity="0.9" />
      <path d="M 166 128 L 167 131 L 170 132 L 167 133 L 166 136 L 165 133 L 162 132 L 165 131 Z" fill="#38bdf8" opacity="0.85" />
    </svg>`,
    caption: '✨ Vừa vặn · Ăn khớp hoàn hảo'
  },

  // 总结 (zǒngjié - tổng kết): Người thuyết trình bên bục và bảng tổng kết gạch đầu dòng
  '总结': {
    type: 'svg',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="82" fill="currentColor" fill-opacity="0.04" />
      <circle cx="100" cy="100" r="80" stroke="currentColor" stroke-opacity="0.12" stroke-width="2" stroke-dasharray="4 4" />
      <rect x="36" y="38" width="86" height="108" rx="8" fill="#1e2230" stroke="#38bdf8" stroke-width="3" />
      <rect x="65" y="30" width="28" height="12" rx="4" fill="#38bdf8" />
      <circle cx="52" cy="58" r="4" fill="#38bdf8" />
      <line x1="64" y1="58" x2="104" y2="58" stroke="#f1f5f9" stroke-width="3.5" stroke-linecap="round" />
      <circle cx="52" cy="76" r="4" fill="#10b981" />
      <line x1="64" y1="76" x2="108" y2="76" stroke="#f1f5f9" stroke-width="3.5" stroke-linecap="round" />
      <circle cx="52" cy="94" r="4" fill="#f59e0b" />
      <line x1="64" y1="94" x2="96" y2="94" stroke="#f1f5f9" stroke-width="3.5" stroke-linecap="round" />
      <circle cx="102" cy="126" r="14" fill="#10b981" />
      <path d="M96 126L100 130L108 122" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="146" cy="62" r="16" fill="#fb923c" />
      <path d="M124 116C124 96 134 86 146 86C158 86 168 96 168 116" fill="#f97316" />
      <path d="M132 94L110 84" stroke="#fb923c" stroke-width="4.5" stroke-linecap="round" />
      <path d="M116 112L120 162H174L178 112H116Z" fill="#334155" stroke="#64748b" stroke-width="2.5" />
      <line x1="126" y1="124" x2="168" y2="124" stroke="#f97316" stroke-width="3" stroke-linecap="round" />
      <path d="M136 112L134 100" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" />
      <ellipse cx="133" cy="97" rx="3" ry="4" fill="#e2e8f0" />
      <line x1="22" y1="168" x2="178" y2="168" stroke="currentColor" stroke-opacity="0.2" stroke-width="3" stroke-linecap="round" />
    </svg>`,
    caption: 'Thuyết trình tổng kết nội dung'
  },

  // 休 (xiū - nghỉ ngơi): Người tựa gốc cây
  '休': {
    type: 'svg',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="82" fill="currentColor" fill-opacity="0.04" />
      <path d="M128 165V90M128 90C128 58 100 40 135 30C165 40 160 70 128 90Z" fill="#15803d" />
      <path d="M128 165V85M128 120L108 105M128 105L145 95" stroke="#854d0e" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M110 55C125 35 155 40 165 60C170 80 150 95 128 90" fill="#22c55e" fill-opacity="0.8" />
      <circle cx="82" cy="105" r="14" fill="#fb923c" />
      <path d="M72 155C72 135 84 125 96 122L120 128" stroke="#f97316" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M72 155L60 165" stroke="#f97316" stroke-width="6" stroke-linecap="round" />
      <text x="76" y="80" fill="#38bdf8" font-size="16" font-family="sans-serif" font-weight="bold">Z</text>
      <text x="88" y="70" fill="#38bdf8" font-size="20" font-family="sans-serif" font-weight="bold">z</text>
      <line x1="30" y1="168" x2="170" y2="168" stroke="currentColor" stroke-opacity="0.2" stroke-width="3" stroke-linecap="round" />
    </svg>`,
    caption: 'Người tựa gốc cây nghỉ ngơi'
  },

  // 明 (míng - sáng sủa, thông minh): Mặt trời + Mặt trăng
  '明': {
    type: 'svg',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="82" fill="currentColor" fill-opacity="0.04" />
      <circle cx="68" cy="98" r="32" fill="#f59e0b" />
      <path d="M68 54V60M68 136V142M24 98H30M106 98H112M37 67L42 72M94 124L99 129M37 129L42 124M94 72L99 67" stroke="#fbbf24" stroke-width="4" stroke-linecap="round" />
      <path d="M125 65C105 75 105 120 135 135C110 135 95 105 110 75C114 68 120 65 125 65Z" fill="#38bdf8" />
      <circle cx="150" cy="72" r="3" fill="#e0f2fe" />
      <circle cx="162" cy="95" r="2" fill="#e0f2fe" />
      <circle cx="142" cy="115" r="2.5" fill="#e0f2fe" />
    </svg>`,
    caption: 'Mặt trời & Mặt trăng hội tụ ánh sáng'
  },

  // 衣服 (yīfu - quần áo): Móc treo và áo thời trang
  '衣服': {
    type: 'svg',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="82" fill="currentColor" fill-opacity="0.04" />
      <path d="M100 42C94 42 90 46 90 52C90 58 98 62 100 66L62 82C58 84 58 90 62 90H138C142 90 142 84 138 82L100 66" stroke="#fbbf24" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M62 88L42 115L60 128L72 108V155C72 159 76 162 80 162H120C124 162 128 159 128 155V108L140 128L158 115L138 88H62Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="3" stroke-linejoin="round" />
      <path d="M88 88L100 112L112 88" stroke="#f8fafc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="100" cy="124" r="3" fill="#fbbf24" />
      <circle cx="100" cy="138" r="3" fill="#fbbf24" />
      <circle cx="100" cy="152" r="3" fill="#fbbf24" />
    </svg>`,
    caption: 'Trang phục thường ngày'
  },

  // 穿 (chuān - mặc): Mặc trang phục vừa vặn
  '穿': {
    type: 'svg',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="82" fill="currentColor" fill-opacity="0.04" />
      <circle cx="100" cy="52" r="16" fill="#fdba74" />
      <path d="M74 76C82 72 118 72 126 76L138 120L118 124L114 162H86L82 124L62 120L74 76Z" fill="#6366f1" stroke="#4338ca" stroke-width="3" />
      <line x1="100" y1="80" x2="100" y2="160" stroke="#fbbf24" stroke-width="3.5" stroke-dasharray="4 3" />
      <path d="M52 105L44 112M148 105L156 112" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" />
    </svg>`,
    caption: 'Mặc trang phục vừa vặn'
  },

  // 准备 (zhǔnbèi - chuẩn bị): Ba lô du lịch và sổ checklist sẵn sàng
  '准备': {
    type: 'svg',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="82" fill="currentColor" fill-opacity="0.04" />
      <rect x="44" y="62" width="58" height="82" rx="14" fill="#f97316" stroke="#c2410c" stroke-width="3" />
      <path d="M58 62V48C58 44 62 40 66 40H80C84 40 88 44 88 48V62" stroke="#c2410c" stroke-width="4" stroke-linecap="round" />
      <rect x="54" y="92" width="38" height="36" rx="6" fill="#fb923c" />
      <rect x="112" y="55" width="56" height="84" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="3" />
      <line x1="128" y1="76" x2="154" y2="76" stroke="#f8fafc" stroke-width="3" stroke-linecap="round" />
      <path d="M120 76L123 79L127 74" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <line x1="128" y1="94" x2="154" y2="94" stroke="#f8fafc" stroke-width="3" stroke-linecap="round" />
      <path d="M120 94L123 97L127 92" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <line x1="128" y1="112" x2="154" y2="112" stroke="#f8fafc" stroke-width="3" stroke-linecap="round" />
      <path d="M120 112L123 115L127 110" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`,
    caption: 'Sẵn sàng trước mọi việc'
  },

  // 高兴 (gāoxìng - vui vẻ): Nụ cười rạng rỡ và ánh sao
  '高兴': {
    type: 'svg',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="82" fill="currentColor" fill-opacity="0.04" />
      <circle cx="100" cy="100" r="54" fill="#fbbf24" />
      <path d="M78 88C80 82 88 82 90 88" stroke="#78350f" stroke-width="4.5" stroke-linecap="round" />
      <path d="M110 88C112 82 120 82 122 88" stroke="#78350f" stroke-width="4.5" stroke-linecap="round" />
      <path d="M76 106C76 126 124 126 124 106" fill="#ef4444" stroke="#78350f" stroke-width="4" stroke-linecap="round" />
      <path d="M84 106C88 116 112 116 116 106" fill="#ffffff" />
      <path d="M38 68L40 73L45 75L40 77L38 82L36 77L31 75L36 73Z" fill="#f59e0b" />
      <path d="M162 68L164 73L169 75L164 77L162 82L160 77L155 75L160 73Z" fill="#f59e0b" />
    </svg>`,
    caption: 'Tâm trạng hân hoan, vui mừng'
  },

  // 难过 (nánguò - buồn bã): Đám mây nhỏ và giọt mưa
  '难过': {
    type: 'svg',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="82" fill="currentColor" fill-opacity="0.04" />
      <path d="M65 110H140C152 110 162 100 162 88C162 76 152 66 140 66C138 52 124 42 108 42C94 42 82 50 78 62C64 64 54 75 54 88C54 100 62 110 65 110Z" fill="#64748b" />
      <path d="M80 126C80 132 75 137 75 137C75 137 70 132 70 126C70 122 72 120 75 120C78 120 80 122 80 126Z" fill="#38bdf8" />
      <path d="M105 132C105 138 100 143 100 143C100 143 95 138 95 132C95 128 97 126 100 126C103 126 105 128 105 132Z" fill="#38bdf8" />
      <path d="M130 126C130 132 125 137 125 137C125 137 120 132 120 126C120 122 122 120 125 120C128 120 130 122 130 126Z" fill="#38bdf8" />
    </svg>`,
    caption: 'Tâm trạng buồn bã'
  },

  // 成功 (chénggōng - thành công): Cúp vàng chiến thắng và ngôi sao
  '成功': {
    type: 'svg',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="82" fill="currentColor" fill-opacity="0.04" />
      <path d="M68 54H132V92C132 110 118 124 100 124C82 124 68 110 68 92V54Z" fill="#eab308" stroke="#ca8a04" stroke-width="3" />
      <path d="M68 64H52C46 64 42 70 46 78L54 94C58 100 64 104 70 102" stroke="#ca8a04" stroke-width="4" stroke-linecap="round" fill="none" />
      <path d="M132 64H148C154 64 158 70 154 78L146 94C142 100 136 104 130 102" stroke="#ca8a04" stroke-width="4" stroke-linecap="round" fill="none" />
      <rect x="94" y="124" width="12" height="22" fill="#ca8a04" />
      <path d="M72 146H128L134 162H66L72 146Z" fill="#78350f" stroke="#ca8a04" stroke-width="2" />
      <path d="M100 70L103 78L111 79L105 84L107 92L100 87L93 92L95 84L89 79L97 78Z" fill="#ffffff" />
    </svg>`,
    caption: 'Đạt được thắng lợi viên mãn'
  },

  // 保护 (bǎohù - bảo vệ): Chiếc khiên bảo vệ mầm cây xanh
  '保护': {
    type: 'svg',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="82" fill="currentColor" fill-opacity="0.04" />
      <path d="M100 38L152 56V104C152 136 128 158 100 168C72 158 48 136 48 104V56L100 38Z" fill="#059669" fill-opacity="0.15" stroke="#10b981" stroke-width="4" stroke-linejoin="round" />
      <path d="M100 138V100" stroke="#10b981" stroke-width="5" stroke-linecap="round" />
      <path d="M100 114C92 106 82 108 78 114C78 124 92 122 100 120" fill="#34d399" />
      <path d="M100 106C108 96 120 98 124 106C124 116 108 114 100 112" fill="#34d399" />
      <circle cx="100" cy="92" r="5" fill="#fbbf24" />
    </svg>`,
    caption: 'Che chở và gìn giữ an toàn'
  },

  // 时间 (shíjiān - thời gian): Đồng hồ cát tinh tế
  '时间': {
    type: 'svg',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="82" fill="currentColor" fill-opacity="0.04" />
      <line x1="62" y1="44" x2="138" y2="44" stroke="#fbbf24" stroke-width="6" stroke-linecap="round" />
      <line x1="62" y1="156" x2="138" y2="156" stroke="#fbbf24" stroke-width="6" stroke-linecap="round" />
      <path d="M74 48H126L104 96C102 98 102 102 104 104L126 152H74L96 104C98 102 98 98 96 96L74 48Z" stroke="#38bdf8" stroke-width="3" fill="rgba(56, 189, 248, 0.08)" stroke-linejoin="round" />
      <path d="M82 66H118L100 96L82 66Z" fill="#fbbf24" />
      <line x1="100" y1="96" x2="100" y2="138" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="3 3" />
      <path d="M78 152H122L108 134C104 130 96 130 92 134L78 152Z" fill="#fbbf24" />
    </svg>`,
    caption: 'Dòng chảy của khoảnh khắc'
  },

  // 爱情 (àiqíng - tình yêu): Hai trái tim gắn kết
  '爱情': {
    type: 'svg',
    svg: `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="82" fill="currentColor" fill-opacity="0.04" />
      <path d="M88 72C74 58 52 64 48 84C42 110 88 142 88 142C88 142 106 128 116 114C108 108 98 94 92 82C90 78 89 74 88 72Z" fill="#f43f5e" />
      <path d="M118 64C106 52 88 56 82 70C74 88 94 116 118 136C142 116 162 88 154 70C148 56 130 52 118 64Z" fill="#fb7185" fill-opacity="0.9" stroke="#1e293b" stroke-width="2.5" />
      <path d="M154 48L156 52L160 53L156 54L154 58L152 54L148 53L152 52Z" fill="#fbbf24" />
    </svg>`,
    caption: 'Tình cảm chân thành lứa đôi'
  }
};

// Pre-generated static illustration assets stored in assets/images/illustrations/
// Pre-generated static illustration index (Lazy-loaded)
let STATIC_ILLUSTRATIONS_INDEX = {};
if (typeof fetch !== 'undefined') {
  fetch('database/illustrations/illustrations_index.json')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data) {
        STATIC_ILLUSTRATIONS_INDEX = data;
        if (typeof window !== 'undefined') window.STATIC_ILLUSTRATIONS_INDEX = data;
      }
    })
    .catch(() => {});
}

/**
 * Returns illustration config for a word.
 * Fallback to intelligent POS-themed conceptual vector graphic.
 */
function getWordIllustration(word) {
  if (!word) return null;

  // 1. Direct word.image field (URL, base64 or inline SVG)
  if (word.image) {
    if (typeof word.image === 'string' && word.image.startsWith('<svg')) {
      return { type: 'svg', svg: word.image, caption: word.meaning || '' };
    }
    return { type: 'img', src: word.image, caption: word.meaning || '' };
  }

  const hanzi = (word.hanzi || word.word || '').trim();

  // 2. Pre-generated static AI illustrations from assets/images/illustrations/
  if (typeof STATIC_ILLUSTRATIONS_INDEX !== 'undefined' && STATIC_ILLUSTRATIONS_INDEX[hanzi]) {
    const item = STATIC_ILLUSTRATIONS_INDEX[hanzi];
    return {
      type: item.type || (item.file && item.file.endsWith('.svg') && !item.src ? 'svg' : 'img'),
      src: item.src || `assets/images/illustrations/${item.file}`,
      svg: item.svg,
      caption: item.caption || word.meaning || ''
    };
  }

  // 3. Preset curated illustrations
  if (WORD_ILLUSTRATIONS_DB[hanzi]) {
    return WORD_ILLUSTRATIONS_DB[hanzi];
  }

  // 4. Fallback: Sleek POS-Themed Conceptual Vector Graphic
  return generateAestheticFallback(word);
}

/**
 * Generates an aesthetic, modern conceptual vector motif based on Part of Speech (POS).
 * Completely eliminates raw character placeholders and generic "MINH HỌA" labels.
 */
function generateAestheticFallback(word) {
  const pos = getWordPartOfSpeech(word) || POS_TYPES.noun;
  const meaning = word.meaning || '';
  const code = pos.code || 'noun';

  let motifSvg = '';

  if (code === 'adj') {
    // Faceted Radiant Gem / Diamond (representing attributes, quality, radiance)
    motifSvg = `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gemGrad" x1="50" y1="60" x2="150" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#34d399" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="80" fill="currentColor" fill-opacity="0.03" />
      <circle cx="100" cy="100" r="74" stroke="#10b981" stroke-opacity="0.2" stroke-width="1.5" stroke-dasharray="4 4" />
      <path d="M64 78L82 54H118L136 78L100 146L64 78Z" fill="url(#gemGrad)" stroke="#065f46" stroke-width="2" />
      <path d="M82 54L100 78M118 54L100 78M64 78H136M82 78L100 146M118 78L100 146" stroke="#ffffff" stroke-opacity="0.4" stroke-width="1.5" />
      <path d="M146 56L148 62L154 64L148 66L146 72L144 66L138 64L144 62Z" fill="#fef08a" />
      <path d="M54 124L55 128L59 129L55 130L54 134L53 130L49 129L53 128Z" fill="#fef08a" />
    </svg>`;
  } else if (code === 'verb') {
    // Dynamic Kinetic Action Vortex & Flight Arrow (representing motion, action, execution)
    motifSvg = `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vortexGrad" x1="45" y1="45" x2="155" y2="155" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="80" fill="currentColor" fill-opacity="0.03" />
      <circle cx="100" cy="100" r="74" stroke="#f97316" stroke-opacity="0.2" stroke-width="1.5" stroke-dasharray="4 4" />
      <path d="M52 100C52 73 73 52 100 52C124 52 144 69 147 92" stroke="url(#vortexGrad)" stroke-width="7" stroke-linecap="round" />
      <path d="M148 100C148 127 127 148 100 148C76 148 56 131 53 108" stroke="url(#vortexGrad)" stroke-width="7" stroke-linecap="round" />
      <path d="M138 88L148 94L156 82" fill="none" stroke="#f97316" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M62 112L52 106L44 118" fill="none" stroke="#ea580c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="100" cy="100" r="16" fill="#fb923c" fill-opacity="0.25" />
      <circle cx="100" cy="100" r="8" fill="#f97316" />
      <circle cx="100" cy="100" r="3" fill="#ffffff" />
    </svg>`;
  } else if (code === 'adv') {
    // Precision Meter Gauge / Radar (representing degree, frequency, manner)
    motifSvg = `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" fill="currentColor" fill-opacity="0.03" />
      <circle cx="100" cy="100" r="74" stroke="#f59e0b" stroke-opacity="0.2" stroke-width="1.5" stroke-dasharray="4 4" />
      <path d="M54 135C45 112 50 84 68 66C86 48 114 43 137 52C150 58 160 68 166 82" stroke="#f59e0b" stroke-width="6" stroke-linecap="round" />
      <circle cx="100" cy="115" r="10" fill="#1e293b" stroke="#f59e0b" stroke-width="3" />
      <line x1="100" y1="115" x2="132" y2="75" stroke="#ea580c" stroke-width="4.5" stroke-linecap="round" />
      <circle cx="100" cy="115" r="3" fill="#ffffff" />
      <line x1="58" y1="100" x2="68" y2="100" stroke="#fcd34d" stroke-width="2.5" stroke-linecap="round" />
      <line x1="100" y1="58" x2="100" y2="68" stroke="#fcd34d" stroke-width="2.5" stroke-linecap="round" />
      <line x1="142" y1="100" x2="132" y2="100" stroke="#fcd34d" stroke-width="2.5" stroke-linecap="round" />
    </svg>`;
  } else if (code === 'measure') {
    // Modular Stacking Measure Units / Blocks
    motifSvg = `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" fill="currentColor" fill-opacity="0.03" />
      <circle cx="100" cy="100" r="74" stroke="#f43f5e" stroke-opacity="0.2" stroke-width="1.5" stroke-dasharray="4 4" />
      <rect x="56" y="116" width="88" height="28" rx="6" fill="#f43f5e" />
      <line x1="85" y1="116" x2="85" y2="144" stroke="#9f1239" stroke-width="2" stroke-dasharray="3 3" />
      <line x1="115" y1="116" x2="115" y2="144" stroke="#9f1239" stroke-width="2" stroke-dasharray="3 3" />
      <rect x="70" y="82" width="60" height="28" rx="6" fill="#fb7185" />
      <line x1="100" y1="82" x2="100" y2="110" stroke="#e11d48" stroke-width="2" stroke-dasharray="3 3" />
      <rect x="84" y="48" width="32" height="28" rx="6" fill="#fecdd3" />
    </svg>`;
  } else if (code === 'prep' || code === 'conj' || code === 'pron') {
    // Interlocking Nodes / Connection Bridge
    motifSvg = `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" fill="currentColor" fill-opacity="0.03" />
      <circle cx="100" cy="100" r="74" stroke="#14b8a6" stroke-opacity="0.2" stroke-width="1.5" stroke-dasharray="4 4" />
      <line x1="64" y1="100" x2="136" y2="100" stroke="#14b8a6" stroke-width="5" stroke-linecap="round" />
      <path d="M64 100C78 72 122 72 136 100" stroke="#2dd4bf" stroke-width="3" stroke-dasharray="4 4" />
      <circle cx="64" cy="100" r="16" fill="#0d9488" stroke="#115e59" stroke-width="3" />
      <circle cx="64" cy="100" r="6" fill="#ffffff" />
      <circle cx="136" cy="100" r="16" fill="#14b8a6" stroke="#0f766e" stroke-width="3" />
      <circle cx="136" cy="100" r="6" fill="#ffffff" />
    </svg>`;
  } else {
    // Noun / Default: Isometric 3D Crystal Cube (representing objects, entities, concepts)
    motifSvg = `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cubeTopGrad" x1="70" y1="55" x2="130" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#818cf8" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="80" fill="currentColor" fill-opacity="0.03" />
      <circle cx="100" cy="100" r="74" stroke="#6366f1" stroke-opacity="0.2" stroke-width="1.5" stroke-dasharray="4 4" />
      <path d="M100 55L144 80L100 105L56 80L100 55Z" fill="url(#cubeTopGrad)" stroke="#312e81" stroke-width="2" />
      <path d="M56 80L100 105V152L56 127V80Z" fill="#4338ca" stroke="#312e81" stroke-width="2" />
      <path d="M100 105L144 80V127L100 152V105Z" fill="#4f46e5" stroke="#312e81" stroke-width="2" />
      <circle cx="100" cy="105" r="4" fill="#c7d2fe" />
    </svg>`;
  }

  return {
    type: 'svg',
    isFallback: true,
    svg: motifSvg,
    caption: meaning || pos.label || 'Từ vựng HSK'
  };
}

/**
 * Dynamic Contextual Prompt Builder for AI Image Generation (DALL-E 3, Imagen 3, Gemini, Midjourney).
 * Automatically extracts real-world scenarios, human actions, or concrete physical objects
 * based on the word definition, part of speech, and contextual example sentences.
 *
 * @param {Object} word - Word item with hanzi, pinyin, meaning, part_of_speech/pos, and example sentences.
 * @returns {Object} Structured prompt metadata { prompt, style, visualSubject, negativePrompt }
 */
function buildContextualPrompt(word) {
  if (!word) return { prompt: '', style: '', visualSubject: '', negativePrompt: '' };

  const hanzi = (word.hanzi || word.word || '').trim();
  const pinyin = (word.pinyin || '').trim();
  const meaning = (word.meaning || '').trim();
  const pos = (typeof getWordPartOfSpeech === 'function' ? getWordPartOfSpeech(word) : null) || { code: 'noun', label: 'Danh từ', en: 'Noun' };
  const posCode = pos.code || 'noun';

  // Extract clean example context (without HTML tags like <u>...</u>)
  const exZh = (word.example_zh || word.example || '').replace(/<[^>]*>/g, '').trim();
  const exVi = (word.example_vi || '').replace(/<[^>]*>/g, '').trim();

  // Define visual scene anchor based on Part of Speech and concrete semantic role
  let actionScene = '';
  switch (posCode) {
    case 'verb':
      actionScene = `A rich, detailed scene-based real-world human action representing the exact definition of '${meaning}'. Show a stylized, expressive character actively performing the action with authentic body posture and emotion. Include environmental details and props (e.g. stage, room, tools, surfaces, lighting, foreground and background elements) to clearly establish the context of the action. Absolutely NO abstract symbols, geometric badges, or floating icons.`;
      break;
    case 'noun':
      actionScene = `A vivid, scene-based real-world environment or tangible physical object representing '${meaning}'. Place the subject in an authentic, tangible context with surrounding props, realistic surfaces, atmospheric depth, and spatial details rather than an isolated generic icon.`;
      break;
    case 'adj':
      actionScene = `A rich real-world scenario featuring an expressive character vividly embodying the state or emotion of '${meaning}'. Depict expressive facial emotion, dynamic body posture, and immersive atmospheric ambiance (e.g., dramatic lighting, weather, or room setting) making the concept immediately intuitive.`;
      break;
    case 'adv':
      actionScene = `An authentic, scene-based human story grounded directly in the example sentence depicting the situation or moment of '${meaning}' with relatable characters, expressive body posture, and environmental props. Absolutely NO abstract sliders, gauges, meters, emojis, or progress bars.`;
      break;
    case 'conj':
      actionScene = `A relatable real-world human scenario demonstrating the connecting context of '${meaning}' grounded in the example sentence, with expressive characters and environment props. Absolutely NO abstract bridge icons, arrows, or flowcharts.`;
      break;
    case 'measure':
      actionScene = `A modular grouping of everyday tangible items demonstrating the counting unit concept of '${meaning}', stacked or arranged neatly in an authentic real-world scene.`;
      break;
    default:
      actionScene = `An intuitive, scene-based real-world scenario illustrating the communicative concept of '${meaning}' with characters, props, and environment.`;
  }

  // Include contextual scenario clue if example sentence is available
  let contextClue = '';
  if (exVi) {
    contextClue = ` Contextual real-world reference: '${exVi}'.`;
  } else if (exZh) {
    contextClue = ` Context reference: '${exZh}'.`;
  }

  // Strict visual style guidelines
  const visualStyle = 'Clean, friendly 2D flat cartoon or minimalist vector illustration with expressive contours, rich narrative depth, and full-bleed composition filling the container space. Dark-mode friendly color palette with deep slate navy background (#0f172a, #1e293b), muted blues, warm golden/amber glows (#f59e0b, #fbbf24), and energetic modern accents (#38bdf8, #10b981, #ec4899, #fb923c).';

  // Strict negative constraints
  const negativeConstraints = 'STRICT NEGATIVE CONSTRAINTS: Absolutely NO abstract symbols, NO logos, NO minimalist icons, NO geometric badges, NO sliders, NO progress bars, NO gauges, NO meter dials, NO floating emojis. Absolutely NO text, NO letters, NO words, NO subtitles, NO typography, NO Chinese characters, NO Hanzi, NO English words, NO pinyin, NO brand logos, NO Gemini logos, NO watermarks, NO 3D photorealistic rendering.';

  const fullPrompt = `${visualStyle} Subject: ${actionScene}${contextClue} Designed for language flashcard memory anchoring. ${negativeConstraints}`;

  return {
    prompt: fullPrompt,
    style: visualStyle,
    visualSubject: actionScene,
    contextClue: contextClue,
    negativePrompt: negativeConstraints
  };
}

// ==========================================================================
// Synapse Instant-Load Acceleration Engine: Multi-Tier SVG Cache & Preloader
// ==========================================================================
const SynapseSvgCache = (typeof window !== 'undefined' && window.SynapseSvgCache) ? window.SynapseSvgCache : new Map();
const SynapseInflightFetches = (typeof window !== 'undefined' && window.SynapseInflightFetches) ? window.SynapseInflightFetches : new Map();
const SYNAPSE_ILLU_CACHE_NAME = 'synapse-illustrations-v1';

/**
 * Normalizes input to an illustration src string.
 */
function extractIllustrationSrc(illuOrSrcOrWord) {
  if (!illuOrSrcOrWord) return '';
  if (typeof illuOrSrcOrWord === 'string') return illuOrSrcOrWord;
  if (illuOrSrcOrWord.src) return illuOrSrcOrWord.src;
  if (illuOrSrcOrWord.hanzi || illuOrSrcOrWord.word) {
    const illu = getWordIllustration(illuOrSrcOrWord);
    return (illu && illu.src) ? illu.src : '';
  }
  return '';
}

const loadedIllustrationPacks = new Set();
const inFlightIllustrationPacks = new Map();

/**
 * Loads a whole level's illustration pack (pre-bundled minified SVGs in JSON).
 * Populates SynapseSvgCache in RAM for true 0ms zero-latency card reveal.
 * @param {string} level - e.g. 'hsk1'..'hsk6' or 'hsk30_1'..'hsk30_6'
 */
async function loadLevelIllustrationPack(level) {
  if (!level) return null;
  const levelKey = String(level).toLowerCase().trim();
  if (loadedIllustrationPacks.has(levelKey)) {
    return true;
  }
  if (inFlightIllustrationPacks.has(levelKey)) {
    return inFlightIllustrationPacks.get(levelKey);
  }

  const p = (async () => {
    try {
      const url = `database/illustrations/${levelKey}.json`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const pack = await res.json();
      if (!pack || typeof pack !== 'object') return null;

      for (const [hanzi, svgText] of Object.entries(pack)) {
        if (!svgText) continue;
        SynapseSvgCache.set(hanzi, svgText);
        SynapseSvgCache.set(`assets/images/illustrations/${hanzi}.svg`, svgText);
        if (levelKey.startsWith('hsk') && !levelKey.startsWith('hsk30')) {
          const num = levelKey.replace('hsk', '');
          SynapseSvgCache.set(`images/HSK_2.0/level${num}/${hanzi}.svg`, svgText);
        }
      }

      loadedIllustrationPacks.add(levelKey);

      // If active card in study mode matches an entry in this pack, update immediately without waiting
      if (typeof activeStudyWord !== 'undefined' && activeStudyWord && activeStudyWord.hanzi) {
        const activeHanzi = activeStudyWord.hanzi;
        const svgText = SynapseSvgCache.get(activeHanzi);
        if (svgText) {
          const svgEl = document.getElementById('cardIllustrationSvg');
          const imgEl = document.getElementById('cardIllustrationImg');
          const frameEl = document.getElementById('cardIllustrationFrame');
          if (svgEl && frameEl) {
            svgEl.innerHTML = svgText;
            svgEl.hidden = false;
            if (imgEl) { imgEl.hidden = true; imgEl.removeAttribute('src'); }
            frameEl.classList.remove('is-loading');
          }
        }
      }

      return pack;
    } catch (e) {
      return null;
    } finally {
      inFlightIllustrationPacks.delete(levelKey);
    }
  })();

  inFlightIllustrationPacks.set(levelKey, p);
  return p;
}

/**
 * Preload an individual illustration into browser RAM and persistent CacheStorage.
 * Returns a Promise that resolves with the raw SVG string if available.
 * @param {string|Object} illuOrSrc - Source path, illustration object, or word item.
 * @param {string} priority - 'high' | 'auto' | 'low'
 */
function preloadIllustration(illuOrSrc, priority = 'auto') {
  const src = extractIllustrationSrc(illuOrSrc);
  const hanzi = (typeof illuOrSrc === 'object' && (illuOrSrc.hanzi || illuOrSrc.word)) ? (illuOrSrc.hanzi || illuOrSrc.word) : null;

  // 1. Tier 1: Instant RAM Cache (<0.05ms)
  if (src && SynapseSvgCache.has(src)) {
    return Promise.resolve(SynapseSvgCache.get(src));
  }
  if (hanzi && SynapseSvgCache.has(hanzi)) {
    return Promise.resolve(SynapseSvgCache.get(hanzi));
  }
  if (!src && !hanzi) return Promise.resolve(null);

  // 2. Inflight deduplication to avoid redundant network requests
  const inflightKey = src || hanzi;
  if (SynapseInflightFetches.has(inflightKey)) {
    return SynapseInflightFetches.get(inflightKey);
  }

  const p = (async () => {
    try {
      // 3. Tier 2: Persistent CacheStorage check
      if (typeof window !== 'undefined' && 'caches' in window && src) {
        try {
          const illuCache = await caches.open(SYNAPSE_ILLU_CACHE_NAME);
          const cachedRes = await illuCache.match(src);
          if (cachedRes) {
            const cachedText = await cachedRes.text();
            if (cachedText && cachedText.includes('<svg')) {
              SynapseSvgCache.set(src, cachedText);
              if (hanzi) SynapseSvgCache.set(hanzi, cachedText);
              return cachedText;
            }
          }
        } catch (_) {}
      }

      // 4. Tier 3: Fetch directly over network
      const targetUrl = src || (hanzi ? `assets/images/illustrations/${hanzi}.svg` : '');
      if (!targetUrl) return null;
      const isSvg = targetUrl.endsWith('.svg') || targetUrl.includes('.svg');
      const fetchOpts = { cache: 'force-cache' };
      if (priority === 'high' && 'priority' in Request.prototype) {
        fetchOpts.priority = 'high';
      }

      if (isSvg) {
        const res = await fetch(targetUrl, fetchOpts);
        if (res.ok) {
          const text = await res.text();
          if (text && text.includes('<svg')) {
            SynapseSvgCache.set(targetUrl, text);
            if (src) SynapseSvgCache.set(src, text);
            if (hanzi) SynapseSvgCache.set(hanzi, text);

            // Persist into CacheStorage in background
            if (typeof window !== 'undefined' && 'caches' in window) {
              caches.open(SYNAPSE_ILLU_CACHE_NAME).then(c => {
                c.put(targetUrl, new Response(text, {
                  headers: { 'Content-Type': 'image/svg+xml' }
                })).catch(() => {});
              }).catch(() => {});
            }
            return text;
          }
        }
      } else {
        // Non-SVG: Warm up browser image decoder
        const img = new Image();
        img.src = targetUrl;
      }
      return null;
    } catch (e) {
      return null;
    } finally {
      SynapseInflightFetches.delete(inflightKey);
    }
  })();

  SynapseInflightFetches.set(inflightKey, p);
  return p;
}

/**
 * Preload illustration for a single word with optional priority.
 */
function preloadSingleWordIllustration(word, priority = 'auto') {
  if (!word) return Promise.resolve(null);
  const hanzi = (word.hanzi || word.word || '').trim();
  if (hanzi && SynapseSvgCache.has(hanzi)) {
    return Promise.resolve(SynapseSvgCache.get(hanzi));
  }
  const illu = getWordIllustration(word);
  if (illu && illu.src) {
    if (SynapseSvgCache.has(illu.src)) {
      return Promise.resolve(SynapseSvgCache.get(illu.src));
    }
    return preloadIllustration(illu.src, priority);
  }
  if (hanzi) {
    return preloadIllustration(word, priority);
  }
  return Promise.resolve(null);
}

/**
 * Batch preload illustrations for an array of words.
 */
function preloadWordsIllustrations(words, maxCount = 50) {
  if (!Array.isArray(words) || words.length === 0) return;
  const count = Math.min(words.length, maxCount);
  for (let i = 0; i < count; i++) {
    const w = words[i];
    if (w) preloadSingleWordIllustration(w, i < 5 ? 'high' : 'auto');
  }
}

/**
 * Predictive Sliding-Window Preloader for study mode:
 * Preloads the next 15 cards ahead and the previous 5 cards in background.
 */
function preloadNearbyIllustrations(wordList, activeFilteredOrder, currentIdx, lookahead = 15) {
  if (!Array.isArray(wordList) || !Array.isArray(activeFilteredOrder) || activeFilteredOrder.length === 0) return;
  const len = activeFilteredOrder.length;

  // Next cards: Top 5 with high priority, rest with auto priority
  for (let offset = 1; offset <= lookahead; offset++) {
    const nextIdx = (currentIdx + offset) % len;
    const w = wordList[activeFilteredOrder[nextIdx]];
    if (w) {
      preloadSingleWordIllustration(w, offset <= 5 ? 'high' : 'auto');
    }
  }

  // Previous 5 cards with high priority
  for (let offset = 1; offset <= 5; offset++) {
    const prevIdx = (currentIdx - offset + len) % len;
    const w = wordList[activeFilteredOrder[prevIdx]];
    if (w) {
      preloadSingleWordIllustration(w, 'high');
    }
  }
}

let activeDeckPreloadTimer = null;

/**
 * Progressive Deck Acceleration Engine:
 * 1. Immediate level illustration pack loading (all SVGs in memory at 0ms).
 * 2. VIP Wave: Starting card + next 3 cards + previous 2 cards (High Priority).
 */
function preloadDeckIllustrations(wordList, startIdx = 0, filteredOrder = null, level = null) {
  if (!Array.isArray(wordList) || wordList.length === 0) return;
  if (activeDeckPreloadTimer) {
    clearTimeout(activeDeckPreloadTimer);
    activeDeckPreloadTimer = null;
  }

  // Preload entire level illustration pack for instant zero latency
  const activeLevel = level || (typeof currentLevel !== 'undefined' ? currentLevel : null);
  if (activeLevel && typeof loadLevelIllustrationPack === 'function') {
    loadLevelIllustrationPack(activeLevel).catch(() => {});
  }

  const order = Array.isArray(filteredOrder) && filteredOrder.length > 0
    ? filteredOrder
    : Array.from({ length: wordList.length }, (_, i) => i);
  const len = order.length;
  const safeStart = ((startIdx % len) + len) % len;

  // 1. VIP Wave (Highest priority for current card and adjacent cards)
  const currentWord = wordList[order[safeStart]];
  if (currentWord) preloadSingleWordIllustration(currentWord, 'high');

  for (let offset = 1; offset <= 3; offset++) {
    const idx = (safeStart + offset) % len;
    const w = wordList[order[idx]];
    if (w) preloadSingleWordIllustration(w, 'high');
  }

  for (let offset = 1; offset <= 2; offset++) {
    const idx = (safeStart - offset + len) % len;
    const w = wordList[order[idx]];
    if (w) preloadSingleWordIllustration(w, 'high');
  }
}

// Global exposure
if (typeof window !== 'undefined') {
  window.POS_TYPES = POS_TYPES;
  window.HSK_POS_DB = HSK_POS_DB;
  window.getWordPartOfSpeech = getWordPartOfSpeech;
  window.WORD_ILLUSTRATIONS_DB = WORD_ILLUSTRATIONS_DB;
  window.STATIC_ILLUSTRATIONS_INDEX = STATIC_ILLUSTRATIONS_INDEX;
  window.getWordIllustration = getWordIllustration;
  window.buildContextualPrompt = buildContextualPrompt;
  window.SynapseSvgCache = SynapseSvgCache;
  window.loadLevelIllustrationPack = loadLevelIllustrationPack;
  window.preloadIllustration = preloadIllustration;
  window.preloadSingleWordIllustration = preloadSingleWordIllustration;
  window.preloadWordsIllustrations = preloadWordsIllustrations;
  window.preloadNearbyIllustrations = preloadNearbyIllustrations;
  window.preloadDeckIllustrations = preloadDeckIllustrations;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    POS_TYPES,
    HSK_POS_DB,
    getWordPartOfSpeech,
    WORD_ILLUSTRATIONS_DB,
    STATIC_ILLUSTRATIONS_INDEX,
    getWordIllustration,
    buildContextualPrompt,
    generateAestheticFallback,
    SynapseSvgCache,
    loadLevelIllustrationPack,
    preloadIllustration,
    preloadSingleWordIllustration,
    preloadWordsIllustrations,
    preloadNearbyIllustrations,
    preloadDeckIllustrations
  };
}
