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
 * Semantic Categories and Visual Illustration Rules
 * Primary objective: Semantic accuracy over artistic decoration.
 */
const SEMANTIC_CATEGORIES = {
  profession: {
    code: 'profession',
    label: '人物 / Professions',
    nameVi: 'Nhân vật / Nghề nghiệp',
    rule: 'Show the actual person performing their professional role in authentic attire with realistic anatomy, natural proportions, and believable tools in an appropriate environment. Clear visual distinction from students, clients, or recipients.'
  },
  animal: {
    code: 'animal',
    label: '动物 / Animals',
    nameVi: 'Động vật',
    rule: 'Show the actual animal with recognizable, realistic anatomy, natural body proportions, authentic fur/scales/feathers, in a subtle natural habitat setting.'
  },
  food: {
    code: 'food',
    label: '食物 / Food',
    nameVi: 'Thức ăn / Đồ uống',
    rule: 'Show the actual food or beverage clearly and appetizingly, preferably in a realistic culinary setting (clean plate, bowl, cutting board, or dining table).'
  },
  object: {
    code: 'object',
    label: '物品 / Objects',
    nameVi: 'Đồ vật / Phương tiện',
    rule: 'Show the actual object, tool, vehicle, or item clearly and accurately with authentic physical materials, textures, and clean contextual surfaces.'
  },
  verb: {
    code: 'verb',
    label: '动词 / Verbs',
    nameVi: 'Động từ / Hành động',
    rule: 'Show a person or subject visibly performing the exact physical action with natural biomechanics, believable body posture, and cause-and-effect interaction.'
  },
  adj: {
    code: 'adj',
    label: '形容词 / Adjectives',
    nameVi: 'Tính từ / Trạng thái',
    rule: 'Show a clear, visually recognizable real-world situation or distinct visual comparison demonstrating the adjective characteristic.'
  },
  place: {
    code: 'place',
    label: '地点 / Places',
    nameVi: 'Địa điểm / Nơi chốn',
    rule: 'Show a recognizable real-world environment and architecture with characteristic architectural features and ambient lighting.'
  },
  abstract: {
    code: 'abstract',
    label: '抽象概念 / Abstract concepts',
    nameVi: 'Khái niệm trừu tượng / Ngữ pháp',
    rule: 'Use a simple, intuitive contextual real-world scene directly grounded in the example sentence. Absolutely NO abstract geometric diagrams, dials, meters, or misleading metaphors.'
  }
};

/**
 * Helper to match Vietnamese phrases safely without ASCII word boundary pitfalls
 */
function matchVietnamesePhrase(text, phrases) {
  if (!text) return false;
  const pattern = '(^|[^a-zà-ỹ0-9_])(' + phrases + ')([^a-zà-ỹ0-9_]|$)';
  return new RegExp(pattern, 'i').test(text);
}

/**
 * Classifies vocabulary into one of 8 semantic categories:
 * profession, animal, food, object, verb, adj, place, abstract.
 * Treats Vietnamese meaning and Hanzi patterns as authoritative semantic references.
 *
 * @param {Object|string} word
 * @returns {Object} { code, label, nameVi, rule }
 */
function classifySemanticCategory(word) {
  if (!word) return SEMANTIC_CATEGORIES.abstract;

  let hanzi = '';
  let meaning = '';
  let posCode = '';

  if (typeof word === 'string') {
    hanzi = word.trim();
    meaning = word.trim();
  } else {
    hanzi = (word.hanzi || word.word || '').trim();
    meaning = (word.meaning || '').trim().toLowerCase();
    const pos = (typeof getWordPartOfSpeech === 'function' ? getWordPartOfSpeech(word) : null);
    posCode = (pos && pos.code) || (word.pos ? String(word.pos).toLowerCase() : '');
  }

  const m = meaning.toLowerCase();

  // 0. GRAMMAR / CONJUNCTIONS / PREPOSITIONS / ADVERBS / PRONOUNS / NUMERALS -> abstract
  if (['adv', 'conj', 'prep', 'pron', 'measure', 'particle', 'interj', 'num'].includes(posCode) ||
      matchVietnamesePhrase(m, 'phó từ|liên từ|giới từ|đại từ|lượng từ|trợ từ|thán từ|số từ|mặc dù|tuy rằng|cho nên|bởi vì|thậm chí')) {
    return SEMANTIC_CATEGORIES.abstract;
  }

  // 0b. TIME & TEMPORAL CONCEPTS -> abstract
  const timeHanzi = /^(今天|明天|昨天|早上|上午|中午|下午|晚上|以前|以后|现在|刚才|最近|星期|月|年|春天|夏天|秋天|冬天|节日|生日|时间|小时|分钟|秒|时候|什么时候)$/;
  const timeViPhrases = 'hôm nay|ngày mai|hôm qua|sáng sớm|buổi sáng|buổi trưa|buổi chiều|buổi tối|ban ngày|ban đêm|thời gian|hiện tại|quá khứ|tương lai|vừa nãy|dạo này|gần đây|tháng|tuần|mùa xuân|mùa hè|mùa thu|mùa đông|ngày lễ|sinh nhật';
  if (timeHanzi.test(hanzi) || matchVietnamesePhrase(m, timeViPhrases)) {
    return SEMANTIC_CATEGORIES.abstract;
  }

  // 1. FOOD / BEVERAGE check (Check before animal so eggs/meat are food)
  const foodHanzi = /(米饭|面条|菜|水果|苹果|香蕉|西瓜|葡萄|桔子|橙子|桃|梨|草莓|蔬菜|土豆|西红柿|番茄|鸡蛋|蛋|羊肉|牛肉|猪肉|鱼肉|鸡肉|肉|汤|蛋糕|面包|饼干|包子|饺子|烤鸭|小吃|零食|糖|巧克力|盐|醋|酱油|辣椒|豆腐|冰激凌|牛奶|茶|咖啡|啤酒|饮料|果汁|矿泉水|葡萄酒|白酒|酒|粮食|玉米|花生)/;
  const foodViPhrases = 'cơm|mì|bún|phở|món ăn|thức ăn|đồ ăn|hoa quả|trái cây|quả táo|táo|chuối|dưa hấu|nho|quýt|cam|đào|lê|dâu tây|rau|khoai tây|cà chua|trứng gà|trứng vịt|trứng|thịt cừu|thịt bò|thịt lợn|thịt heo|thịt gà|thịt vịt|thịt|súp|canh|bánh ngọt|bánh gato|bánh mì|bánh quy|bánh bao|sủi cảo|bánh chẻo|vịt quay|đồ ăn vặt|kẹo|đường|sô cô la|sôcôla|muối|giấm|nước tương|xì dầu|ớt|đậu phụ|tàu hũ|kem|sữa|sữa bò|trà|chè|cà phê|cafe|bia|nước ngọt|đồ uống|thức uống|nước ép|sinh tố|rượu|bữa sáng|bữa trưa|bữa tối|lương thực|ngô|bắp|đậu phộng|lạc';
  if (foodHanzi.test(hanzi) || matchVietnamesePhrase(m, foodViPhrases)) {
    return SEMANTIC_CATEGORIES.food;
  }

  // 2. ANIMAL check
  const animalHanzi = /^(狗|猫|鸟|鱼|熊猫|老虎|狮子|大象|猴子|兔子|马|牛|羊|猪|鸡|鸭|鹅|蛇|鼠|老鼠|昆虫|蝴蝶|蜜蜂|苍蝇|蚊子|蜘蛛|蚂蚁|龙|企鹅|鲸鱼|鲨鱼|乌龟)$/;
  const animalViPhrases = 'con chó|chó|con mèo|mèo|con chim|chim|con cá|cá|gấu trúc|động vật|thú|con hổ|hổ|cọp|sư tử|con voi|voi|con khỉ|khỉ|con thỏ|thỏ|con ngựa|ngựa|con bò|bò|con dê|dê|con cừu|cừu|con heo|heo|con lợn|lợn|con gà|gà|con vịt|vịt|ngỗng|con rắn|rắn|con chuột|chuột|côn trùng|sâu bọ|bướm|con ong|ong|ruồi|muỗi|nhện|kiến|con rồng|rồng|chim cánh cụt|cá voi|cá mập|con rùa|rùa';
  if (animalHanzi.test(hanzi) || matchVietnamesePhrase(m, animalViPhrases)) {
    return SEMANTIC_CATEGORIES.animal;
  }

  // 3. PROFESSIONS / PEOPLE check
  const profHanzi = /(老师|教师|教授|医生|大夫|护士|厨师|律师|司机|警察|演员|导游|售货员|服务员|记者|作家|科学家|工程师|经理|校长|总裁|总理|主任|师傅|会计|模特|志愿者|读者|观众|乘客|顾客|客人|朋友|同事|同学|邻居|亲戚|孩子|儿童|父母|父亲|母亲|爸爸|妈妈|爷爷|奶奶|姥姥|外公|叔叔|姑姑|舅舅|哥哥|姐姐|弟弟|妹妹|丈夫|妻子|老公|老婆|先生|女士|小姐|小伙子|姑娘|男人|女人|人物|专家|运动员|学生)$/;
  const profViPhrases = 'thầy giáo|cô giáo|giáo viên|giảng viên|giáo sư|bác sĩ|y tá|y sĩ|điều dưỡng|đầu bếp|nấu bếp|luật sư|lái xe|tài xế|cảnh sát|công an|diễn viên|hướng dẫn viên|nhân viên|phục vụ|người bán hàng|bồi bàn|nhà báo|phóng viên|nhà văn|nhà khoa học|kỹ sư|giám đốc|hiệu trưởng|thủ tướng|chủ nhiệm|thợ|kế toán|người mẫu|tình nguyện viên|độc giả|khán giả|hành khách|khách hàng|bạn bè|đồng nghiệp|bạn học|hàng xóm|họ hàng|trẻ em|con cái|bố mẹ|cha mẹ|bố|ba|mẹ|ông nội|bà nội|ông ngoại|bà ngoại|chú|bác|cô|dì|anh trai|chị gái|em trai|em gái|chồng|vợ|ông chủ|quý ông|quý bà|quý cô|thanh niên|chàng trai|cô gái|con người|nhân vật|chuyên gia|vận động viên|học sinh|sinh viên';
  if (profHanzi.test(hanzi) || matchVietnamesePhrase(m, profViPhrases)) {
    return SEMANTIC_CATEGORIES.profession;
  }

  // 4. PLACES / VENUES check
  const placeHanzi = /(学校|大学|中学|小学|教室|图书馆|办公室|实验室|操场|体育馆|医院|诊所|药店|饭店|餐厅|咖啡馆|酒吧|超市|商店|商场|市场|银行|邮局|宾馆|酒店|机场|火车站|地铁站|公车站|公共汽车站|码头|公园|动物园|博物馆|电影院|剧场|街道|马路|高速公路|桥|岛|海洋|海滩|沙滩|河流|河|湖|森林|山|农村|城市|国家|中国|北京|家|房间|卧室|客厅|厨房|洗手间|厕所|阳台)/;
  const placeViPhrases = 'trường học|trường đại học|trường trung học|trường tiểu học|lớp học|phòng học|thư viện|văn phòng|phòng thí nghiệm|sân tập|nhà thi đấu|bệnh viện|phòng khám|hiệu thuốc|tiệm thuốc|nhà hàng|quán ăn|quán cà phê|quán bar|siêu thị|cửa hàng|trung tâm thương mại|chợ|ngân hàng|bưu điện|khách sạn|nhà nghỉ|sân bay|phi trường|ga tàu|nhà ga|bến xe|bến cảng|công viên|sở thú|viện bảo tàng|rạp chiếu phim|nhà hát|đường phố|con đường|đường cao tốc|cây cầu|hòn đảo|đại dương|bờ biển|bãi biển|dòng sông|hồ|rừng|ngọn núi|nông thôn|thành phố|đất nước|quốc gia|phòng ngủ|phòng khách|nhà bếp|nhà vệ sinh|ban công';
  if (placeHanzi.test(hanzi) || matchVietnamesePhrase(m, placeViPhrases)) {
    return SEMANTIC_CATEGORIES.place;
  }

  // 5. OBJECTS / TOOLS / VEHICLES check
  const objHanzi = /(电脑|电视|手机|电话|桌子|椅子|床|门|窗户|笔|铅笔|书|词典|笔记本|纸|报纸|地图|衣服|衬衫|裤子|裙子|大衣|毛衣|帽子|鞋子|皮鞋|袜子|手套|围巾|眼镜|手表|钱包|行李箱|包|钥匙|伞|雨伞|药|杯子|瓶子|盘子|碗|筷子|勺子|刀|叉子|剪刀|钟|照相机|自行车|摩托车|汽车|出租车|公共汽车|火车|地铁|飞机|船|轮船|轮椅|玩具|礼物|镜子|梳子|牙刷|牙膏|毛巾|肥皂|垃圾桶|盒子|绳子|电池|充电器|鼠标|键盘|笛子|吉他|钢琴|提琴)/;
  const objViPhrases = 'máy tính|vi tính|tivi|ti vi|điện thoại|cái bàn|cái ghế|bàn|ghế|giường|cửa sổ|cánh cửa|bút|bút chì|sách|từ điển|cuốn vở|cuốn sổ|tờ giấy|tờ báo|bản đồ|quần áo|áo sơ mi|chiếc áo|chiếc quần|váy|đầm|áo khoác|áo len|mũ|nón|giày|dép|bít tất|đôi tất|đôi vớ|găng tay|khăn quàng|kính mắt|đồng hồ đeo tay|ví tiền|va li|vali|túi xách|ba lô|cặp sách|chìa khóa|cái ô|chiếc ô|cây dù|thuốc|cái cốc|cái chén|cái ly|tách trà|bình nước|chai nước|cái lọ|chiếc đĩa|chiếc dĩa|cái bát|cái tô|đôi đũa|cái thìa|cái muỗng|con dao|chiếc kéo|đồng hồ treo tường|máy ảnh|máy chụp hình|xe đạp|xe máy|xe mô tô|xe ô tô|taxi|xe buýt|tàu hỏa|tàu lửa|tàu điện ngầm|máy bay|tàu thủy|thuyền|xe lăn|đồ chơi|quà tặng|món quà|gương soi|cái lược|bàn chải|kem đánh răng|khăn mặt|xà phòng|thùng rác|cái hộp|dây thừng|cục pin|dây sạc|chuột máy tính|bàn phím|cây đàn|ống sáo';
  if (objHanzi.test(hanzi) || matchVietnamesePhrase(m, objViPhrases)) {
    return SEMANTIC_CATEGORIES.object;
  }

  // 6. ADJECTIVE check
  const adjHanzi = /(大|小|多|少|高|矮|低|长|短|粗|细|胖|瘦|重|轻|快|慢|新|旧|破|热|冷|暖和|凉快|晴|阴|甜|苦|辣|酸|咸|好吃|难吃|好喝|难喝|贵|便宜|干净|脏|容易|难|简单|复杂|漂亮|美丽|帅|丑|亮|暗|吵|安静|远|近|累|饿|饱|渴|忙|闲|疼|舒服|难受|高兴|快乐|伤心|难过|生气|害怕|紧张|轻松|奇怪|热情|认真|聪明|笨|勇敢|害羞)/;
  if (posCode === 'adj' || adjHanzi.test(hanzi) || matchVietnamesePhrase(m, 'tính từ')) {
    return SEMANTIC_CATEGORIES.adj;
  }
  const adjVi = /^(đẹp|tốt|xấu|to|nhỏ|lớn|cao|thấp|lùn|nhanh|chậm|dài|ngắn|nóng|lạnh|mới|cũ|đắt|rẻ|khó|dễ|buồn|vui|sạch|bẩn|ngon|ngọt|đắng|cay|mặn|chua|mệt|đói|no|bận|rảnh|đúng|sai|tiện|phức tạp|đơn giản|quan trọng|an toàn|nguy hiểm|nghiêm túc|cẩn thận|nhiệt tình|tự tin|hạnh phúc|khỏe|yếu|trắng|đen|đỏ|vàng|xanh|gầy|béo|sáng|tối|ấm|mát|sâu|nông|rộng|hẹp|yên tĩnh|ồn ào|tươi|héo|cứng|mềm|khô|ướt|giàu|nghèo|thông minh|ngốc|lười|chăm chỉ|thân thiện|lịch sự|độc ác|hiền lành|dũng cảm|nhút nhát|tuyệt vời|hoàn hảo|kỳ lạ|bình thường|ổn định|rõ ràng)\b/;
  if (adjVi.test(m)) {
    return SEMANTIC_CATEGORIES.adj;
  }

  // 7. DYNAMIC VERB check
  const verbHanzi = /(跑|跑步|游泳|踢|踢足球|打|打篮球|打羽毛球|打网球|骑|骑自行车|跳|跳舞|唱歌|爬|爬山|走|散步|飞|起飞|降落|开车|坐|站|躺|蹲|睡|睡觉|起床|洗|洗澡|洗手|刷牙|梳头|买|卖|拿|抓|扔|推|拉|抬|抱|握手|拥抱|挥手|笑|哭|喊|读书|看书|写字|画画|做饭|打扫|修理)/;
  if (posCode === 'verb' || verbHanzi.test(hanzi) || matchVietnamesePhrase(m, 'động từ')) {
    return SEMANTIC_CATEGORIES.verb;
  }
  const verbVi = /^(làm|đi|nói|ăn|uống|xem|mua|bán|học|chạy|bay|đến|rời|giúp|tổ chức|chuẩn bị|tham gia|quyết định|sử dụng|cung cấp|tìm|gặp|nhớ|hiểu|viết|đọc|nghe|sắp xếp|ôm|xin lỗi|đăng ký|biểu diễn|bảo vệ|thực hiện|hoàn thành|phát triển|du lịch|trao đổi|kết hôn|nghiên cứu|chiến đấu|chúc mừng|cảm ơn|mời|chờ|đợi|hy vọng|giảng|dạy|vẽ|hát|múa|bơi|chơi|sửa|chữa|chọn|ném|bắt|kéo|đẩy|cắt|rửa|nấu|xây|phá|mở|đóng|tắt|bật|gửi|nhận|trả lời|hỏi|dừng|bắt đầu|kết thúc|thắng|thua|trèo|leo|vứt|bỏ|rơi|đổ|ngã|cười|khóc|la|hét|gọi|thăm|tặng|chịu|tắm|đánh|đá|ngồi|đứng|nằm|ngủ)\b/;
  if (verbVi.test(m)) {
    return SEMANTIC_CATEGORIES.verb;
  }

  // 8. Abstract concept / grammar / fallback
  return SEMANTIC_CATEGORIES.abstract;
}

/**
 * Plans a structured semantic scene before drawing.
 * Ensures the AI understands the vocabulary's real-world meaning,
 * focal subject, professional role/action, setting, and confusable distinctions.
 *
 * @param {Object} word
 * @returns {Object} Structured semantic scene blueprint
 */
function planSemanticVisualScene(word) {
  if (!word) return null;

  const hanzi = (word.hanzi || word.word || '').trim();
  const pinyin = (word.pinyin || '').trim();
  const meaning = (word.meaning || '').trim();
  const exZh = (word.example_zh || word.example || '').replace(/<[^>]*>/g, '').trim();
  const exVi = (word.example_vi || '').replace(/<[^>]*>/g, '').trim();

  const category = classifySemanticCategory(word);

  let focalSubject = '';
  let roleOrAction = '';
  let environmentContext = '';
  let supportingElements = '';
  let confusableDistinctions = '';

  switch (category.code) {
    case 'profession':
      focalSubject = `A recognizable professional person accurately representing '${hanzi}' (${meaning}) in authentic work attire and natural human anatomy`;
      roleOrAction = `Actively performing their professional duties (e.g. instructing, treating a patient, cooking, driving) with believable pose, expression, and realistic tools`;
      environmentContext = `An appropriate, authentic real-world workplace setting (e.g. classroom, hospital examination room, commercial kitchen, driver cabin)`;
      supportingElements = `Authentic professional instruments and work tools; natural workplace lighting`;
      confusableDistinctions = `Must clearly communicate the professional role rather than a client, patient, or student; absolutely NO generic stick figures, NO flat generic icons, NO sign-holders`;
      break;

    case 'animal':
      focalSubject = `A recognizable, living ${meaning} ('${hanzi}') with realistic anatomy, natural proportions, and authentic physical features`;
      roleOrAction = `Natural resting or gentle moving posture characteristic of this animal species`;
      environmentContext = `A simple, natural habitat background providing context`;
      supportingElements = `Subtle environmental ground, soft natural lighting`;
      confusableDistinctions = `Depict the actual animal with believable biology; absolutely NO abstract geometric icons, NO cartoon cliparts, NO emojis`;
      break;

    case 'food':
      focalSubject = `The actual, appetizing culinary food item '${meaning}' ('${hanzi}') with realistic textures, colors, and authentic fresh appearance`;
      roleOrAction = `Freshly prepared, served, or presented ready for consumption`;
      environmentContext = `A realistic dining or kitchen setting (e.g. on a ceramic plate, wooden board, or clean dining table)`;
      supportingElements = `Clean tableware, subtle garnish, soft warm natural lighting`;
      confusableDistinctions = `Depict the real food realistically; absolutely NO abstract fruit icons, NO generic clipart shapes`;
      break;

    case 'object':
      focalSubject = `The tangible physical object '${meaning}' ('${hanzi}') shown clearly, centered, and accurately with authentic materials`;
      roleOrAction = `In its natural orientation or functional resting state`;
      environmentContext = `A clean, realistic real-world environment where this item is typically found`;
      supportingElements = `Clean surface, subtle natural shadow and highlights giving spatial depth`;
      confusableDistinctions = `Must be the actual functional object; absolutely NO flat generic minimalist icons, NO glyph badges`;
      break;

    case 'verb':
      focalSubject = `A person or subject visibly and dynamically executing the exact action of '${meaning}' ('${hanzi}')`;
      roleOrAction = `Natural biomechanical body posture, believable muscle tension, and cause-and-effect interaction`;
      environmentContext = `A realistic setting appropriate for this activity (e.g. track for running, pool for swimming, room for reading)`;
      supportingElements = `Essential props directly involved in the action; dynamic sense of movement`;
      confusableDistinctions = `Show the actual person performing the action; absolutely NO arrows, NO isolated shoe/hand icons, NO stick figures`;
      break;

    case 'adj':
      focalSubject = `A clear real-world situation or visual comparison vividly demonstrating the characteristic '${meaning}' ('${hanzi}')`;
      roleOrAction = `Expressive posture, physical state, or environmental contrast illustrating the quality`;
      environmentContext = `A context-rich environment that reinforces the adjective`;
      supportingElements = `Subtle visual cues (e.g. clothing for weather, scale comparison for size, facial expression for mood)`;
      confusableDistinctions = `Use an intuitive visual scenario; absolutely NO abstract gauges, NO meter dials, NO progress bars`;
      break;

    case 'place':
      focalSubject = `An unmistakable, recognizable architectural or environmental view of '${meaning}' ('${hanzi}')`;
      roleOrAction = `Authentic daily environment with characteristic architectural and spatial landmarks`;
      environmentContext = `The real-world location under natural daylight or characteristic ambient illumination`;
      supportingElements = `Signature environmental details (e.g. runway for airport, desks for classroom, ward for hospital)`;
      confusableDistinctions = `Depict the actual place environment; absolutely NO generic pin icons, NO map markers`;
      break;

    case 'abstract':
    default:
      focalSubject = `An intuitive, relatable real-world human moment grounded in '${meaning}' ('${hanzi}') and example context: "${exVi || exZh || meaning}"`;
      roleOrAction = `Authentic human interaction, timing, or situation clearly demonstrating the meaning without text`;
      environmentContext = `A believable daily life setting providing the natural backdrop`;
      supportingElements = `Contextual elements that anchor the situation`;
      confusableDistinctions = `Ground in the example sentence story; absolutely NO abstract flowcharts, NO geometric badges, NO misleading metaphors`;
      break;
  }

  return {
    hanzi,
    pinyin,
    meaning,
    category,
    focalSubject,
    roleOrAction,
    environmentContext,
    supportingElements,
    confusableDistinctions,
    exampleZh: exZh,
    exampleVi: exVi
  };
}

/**
 * Quality Control & Semantic Validation Engine.
 * Evaluates an illustration or plan before accepting it into the cache/database:
 * 1. Correct Subject: Does it accurately represent the intended vocabulary subject?
 * 2. Correct Context: Is the environment context appropriate?
 * 3. Correct Action: Is the subject performing the expected professional role or action?
 * 4. No Confusing Associations: Does it avoid misleading visual associations/confusions?
 * 5. Strict Visual Standards: Single focal subject, 1:1 square ratio, text-free, no stick figures/clipart/emojis.
 *
 * @param {Object} word - The vocabulary entry
 * @param {string|Object} illustrationData - SVG string or illustration metadata
 * @returns {Object} Validation report { isValid, score, checks, issues, refinementSuggestion }
 */
function validateSemanticIllustration(word, illustrationData) {
  const issues = [];
  const checks = {
    correctSubject: true,
    correctContext: true,
    correctAction: true,
    noConfusion: true,
    visualStandards: true
  };

  if (!word) {
    return { isValid: false, score: 0, checks, issues: ['Missing word input'], refinementSuggestion: 'Provide valid word input.' };
  }

  const hanzi = (word.hanzi || word.word || '').trim();
  const meaning = (word.meaning || '').trim();
  const plan = planSemanticVisualScene(word);

  let contentStr = '';
  if (typeof illustrationData === 'string') {
    contentStr = illustrationData;
  } else if (illustrationData && illustrationData.svg) {
    contentStr = illustrationData.svg;
  } else if (illustrationData && illustrationData.prompt) {
    contentStr = illustrationData.prompt;
  }

  // 1. Text & Character Check (Strict Zero-Text Standard)
  if (contentStr) {
    // Check for <text> or <tspan> elements in SVG
    if (/<text\b[^>]*>/i.test(contentStr) || /<tspan\b[^>]*>/i.test(contentStr)) {
      checks.visualStandards = false;
      issues.push('SVG contains embedded <text> or <tspan> tags. Illustrations must be 100% text-free.');
    }
    // Check if the Chinese character itself is embedded in text form
    if (hanzi && new RegExp(hanzi).test(contentStr.replace(/<!--[\s\S]*?-->/g, ''))) {
      if (/<text\b[^>]*>[\s\S]*?<\/text>/i.test(contentStr)) {
        checks.visualStandards = false;
        issues.push(`SVG embeds the Chinese word '${hanzi}' inside text elements.`);
      }
    }
  }

  // 2. Aspect ratio / viewBox check
  if (contentStr && /<svg\b/i.test(contentStr)) {
    const vbMatch = contentStr.match(/viewBox=["']([^"']+)["']/i);
    if (vbMatch) {
      const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4) {
        const w = parts[2];
        const h = parts[3];
        if (w !== h) {
          checks.visualStandards = false;
          issues.push(`SVG must use square 1:1 aspect ratio, got ${w}x${h}.`);
        }
      }
    }
  }

  // 3. Minimum Visual Complexity Check (Prevent trivial stick figures / primitive clipart)
  if (contentStr && /<svg\b/i.test(contentStr)) {
    const cleanSvg = contentStr.replace(/<!--[\s\S]*?-->/g, '').trim();
    if (cleanSvg.length < 280) {
      checks.visualStandards = false;
      issues.push('SVG is too simplistic or primitive (< 280 bytes), indicating a generic icon or stick figure.');
    }
  }

  // 4. Role & Confusion Safeguards
  if (plan.category.code === 'profession') {
    // Teacher check
    if (hanzi === '老师' && /student sitting|stick figure|blank board/i.test(contentStr)) {
      checks.noConfusion = false;
      issues.push('Teacher illustration must show an adult teacher actively instructing, not a student at a desk.');
    }
    // Doctor check
    if (hanzi === '医生' && /red cross symbol|generic person with cross/i.test(contentStr)) {
      checks.noConfusion = false;
      issues.push('Doctor illustration must show a doctor examining in a medical clinic, not a generic person with a cross icon.');
    }
  }

  const passedCount = Object.values(checks).filter(Boolean).length;
  const score = Math.round((passedCount / 5) * 10);
  const isValid = issues.length === 0 && score >= 8;

  let refinementSuggestion = '';
  if (!isValid) {
    refinementSuggestion = `Regenerate with focal subject: "${plan.focalSubject}", role/action: "${plan.roleOrAction}", in "${plan.environmentContext}". ${plan.confusableDistinctions}.`;
  }

  return {
    isValid,
    score,
    checks,
    issues,
    refinementSuggestion,
    plan
  };
}

/**
 * Dynamic Contextual Prompt Builder for Semantic Vocabulary Illustrations.
 * Standards:
 * - High-quality educational photography / realistic 3D educational illustration style.
 * - Semantic accuracy first: Represents the actual meaning, not abstract decoration.
 * - Grounded in Chinese word, pinyin, Vietnamese meaning, and 8 semantic categories.
 * - Realistic human anatomy, natural body proportions, believable poses, authentic attire/tools.
 * - One dominant focal subject, square 1:1 aspect ratio, soft natural lighting.
 * - Recognizable at 100-150px on mobile screens.
 * - Zero text: Absolutely NO Chinese characters, pinyin, English words, labels, or watermarks.
 * - Negative constraints: NO stick figures, NO elementary clipart, NO flat generic icons, NO emojis.
 *
 * @param {Object} word - Word item with hanzi, pinyin, meaning, and contextual examples.
 * @returns {Object} Structured prompt metadata { prompt, style, visualSubject, category, semanticPlan, negativePrompt }
 */
function buildContextualPrompt(word) {
  if (!word) return { prompt: '', style: '', visualSubject: '', negativePrompt: '' };

  const hanzi = (word.hanzi || word.word || '').trim();
  const pinyin = (word.pinyin || '').trim();
  const meaning = (word.meaning || '').trim();

  // 1. Semantic Planning
  const plan = planSemanticVisualScene(word);
  const category = plan.category;

  // 2. Realistic Educational Visual Style
  const visualStyle = 'Consistent, high-quality educational photography and realistic 3D educational illustration style. Professional, clean, modern educational visuals with realistic human anatomy, natural body proportions, believable poses, and expressive facial features. Appropriate clothing, uniforms, professional tools, and authentic environmental context. Soft natural lighting, balanced colors, and dark-mode harmonized container (#0f172a / #1e293b). Centered composition with one clear dominant focal subject in square 1:1 aspect ratio, immediately recognizable when displayed at 100-150 pixels on mobile flashcards.';

  // 3. Concrete Semantic Visual Subject Anchor
  let contextClue = '';
  if (plan.exampleVi) {
    contextClue = ` Real-world context reference: '${plan.exampleVi}'.`;
  } else if (plan.exampleZh) {
    contextClue = ` Contextual usage: '${plan.exampleZh}'.`;
  }

  const subjectDescription = `Visualizing the exact semantic meaning of the Chinese vocabulary '${hanzi}' (${pinyin}), meaning '${meaning}' in Vietnamese (${category.label}). Focal subject: ${plan.focalSubject}. Role & Action: ${plan.roleOrAction}. Environment context: ${plan.environmentContext}. Supporting elements: ${plan.supportingElements}.${contextClue} Disambiguation requirement: ${plan.confusableDistinctions}.`;

  // 4. Strict Negative Constraints (Quality Control)
  const negativeConstraints = 'STRICT NEGATIVE CONSTRAINTS: Absolutely NO childish elementary-school clipart, NO stick figures, NO flat generic icons, NO emoji-style illustrations, NO abstract geometric shapes or badges, NO random decorative objects, NO floating hearts or stars. Absolutely NO text, NO letters, NO words, NO subtitles, NO Chinese characters (NO ' + hanzi + '), NO English labels, NO pinyin, NO numbers, NO watermarks, NO brand logos.';

  const fullPrompt = `${visualStyle} Subject: ${subjectDescription} Primary objective: Semantic accuracy and immediate learner recall. ${negativeConstraints}`;

  return {
    prompt: fullPrompt,
    style: visualStyle,
    visualSubject: subjectDescription,
    category: category.code,
    semanticPlan: plan,
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
  window.SEMANTIC_CATEGORIES = SEMANTIC_CATEGORIES;
  window.classifySemanticCategory = classifySemanticCategory;
  window.planSemanticVisualScene = planSemanticVisualScene;
  window.validateSemanticIllustration = validateSemanticIllustration;
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
    SEMANTIC_CATEGORIES,
    classifySemanticCategory,
    planSemanticVisualScene,
    validateSemanticIllustration,
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
