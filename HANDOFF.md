# Bàn giao cho Antigravity — Synapse Hanzi (汉字思维 · Hanzi Mind)

> Cập nhật: 2026-11-07, sau commit `b4519caa9`, phiên bản `3.18.0` (tag `v3.18.0`).
> Tài liệu này tóm tắt mọi việc đã làm ở các session trước và những việc còn dở, để agent khác làm tiếp mà không phải đoán.
> **Đọc `AGENTS.md` và `CLAUDE.md` trước** — các quy tắc ở đó là bắt buộc.

---

## 0. TL;DR — việc cần làm tiếp theo

1. **Đã hoàn thành và release v3.17.0**:
   - Gộp CSS trùng lặp trong `assets/css/workstation.css` và `assets/css/flashcard.css` (commit `ad25b331e`).
   - Port flashcard Bộ thủ và tab tổng quan sang Preact island `src/islands/RadicalCards.jsx` với parity 100% verified (commit `754e7eebd`).
   - Release `v3.17.0` (tag `v3.17.0`).
   - Port bảng tập viết nét chữ sang Preact island `src/islands/StrokeCanvas.jsx` (commit `b3b6fcfbc`).
   - Port hub danh sách bộ thủ & primary tab router sang Preact island `src/islands/RadicalHub.jsx` (commit `1b317374d`).
   - Port màn Ôn nhanh 5 mạng & modal câu sai sang Preact island `src/islands/FastReview.jsx` (commit `1c5aaa041`).
   - Port flashcard study controller & celebration overlay sang Preact island `src/islands/StudyProgress.jsx` (commit `10a6b090d`).
   - Port home dashboard level enhancements sang Preact island `src/islands/DashboardEnhancements.jsx` (commit `52e200d18`).
   - Port flashcard touch gestures & reveal interactions sang Preact island `src/islands/CardInteractions.jsx` (commit `22b2fe0d4`).
   - Bundle word illustrations & visual mnemonic engine into islands `src/islands/WordIllustrations.js` (commit `ca9e54325`).
   - Port HSK 3.0 level grid & version switcher sang Preact island `src/islands/Hsk30Grid.jsx` (commit `f66941df0`).
   - Port topic decks grid sang Preact island `src/islands/TopicGrid.jsx` (commit `ec7e8702e`).
   - Port backup & sync logic sang Preact island `src/islands/BackupSync.jsx` (commit `9e236dae0`).
   - Port time-based theme and toggle logic sang Preact island `src/islands/ThemeManager.js` (commit `8aab75e75`).
   - Port TTS Web Speech & prebuilt audio player sang Preact island `src/islands/SpeechAudio.js` (commit `bbe6a5c80`).
   - Port radicals state and app bootstrapping sang Preact islands `src/islands/radicalsState.js` & `src/islands/AppBootstrap.js` (commit `9b400735a`).
   - Port levels management, study history modal & streaks sang Preact island `src/islands/Levels.js` (commit `a13711146`).
   - Port main flashcard study workspace & card render engine sang Preact island `src/islands/FlashcardStudy.jsx` (commit `ea853ce9f`).
   - Port SPA History API router & navigation coordinator sang Preact island `src/islands/SpaRouter.js` (commit `39c62ead9`).
   - Port FSRS spaced repetition engine wrapper sang Preact island `src/islands/SrsEngine.js` (commit `a7b660ccb`).
   - Port localStorage persistence & cross-level progress coordinator sang Preact island `src/islands/StorageEngine.js` (commit `9944ec96c`).
   - Port shared utils, Pinyin matchers & version constants sang Preact island `src/islands/AppUtils.js` (commit `a2bc2d562`).
   - Port global state & application configuration sang Preact island `src/islands/AppState.js` (commit `3e3bc0385`).
   - Gỡ bỏ script CDN `ts-fsrs` thừa (commit `8abe813ac`) do `SrsEngine` đã đóng gói trực tiếp thư viện.
   - Port mobile navigation & stats dialog controller sang Preact island `src/islands/MobileBottomNav.js`, dọn sạch 160 dòng inline scripts trong `index.html` (commit `57904ce21`).
2. File `database/prebuilt_audio/hsk30_6/words/0687.mp3` (untracked) là **của người dùng** (họ chạy build audio song song). **Không được `git add` file này**, không dùng `git add -A` / `git add .`.
3. Toàn bộ 100% các module mã nguồn và script tính năng trong ứng dụng đã chuyển đổi sang hệ thống Preact islands hiện đại. `index.html` hoàn toàn sạch sẽ, chỉ còn load dữ liệu từ điển `hanviet-dict.js` và bundle islands.

---

## 1. Quy tắc làm việc (rút từ AGENTS.md, CLAUDE.md và các yêu cầu của người dùng)

- Chỉ dùng nhánh `main`. Không tạo branch, không mở PR, không merge, không đổi remote.
- Xong mỗi task: chạy test → `git commit` trên `main` → `git push origin HEAD:main`. Một task chưa push thì chưa coi là xong.
- Commit nhỏ, theo chuẩn conventional (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore(release):`).
- **Không thêm dòng `Co-Authored-By: Claude ...`** (hay attribution AI nào khác) vào commit, tag hoặc PR. Người dùng đã yêu cầu rõ.
- **Chỉ stage đúng file mình sửa** (`git add <đường dẫn>`). Người dùng hay chạy job sinh audio song song trong cùng working tree.
- Phải hỏi người dùng trước khi chạy: `git reset`, `git rebase`, `git clean`, `git checkout`, `git restore`, `git push --force`, hay bất cứ lệnh nào xóa file / viết lại history / bỏ thay đổi local.
- Tóm tắt cuối mỗi task: **tối đa 3 dòng**.
- Phiên bản: `VERSION` là nguồn duy nhất. Không sửa tay số phiên bản ở chỗ khác; luôn chạy `python3 tools/bump_version.py [patch|minor|major|X.Y.Z]` (tool tự cập nhật `package.json`, `APP_VERSION` trong `sw.js` và `assets/js/utils.js`, mọi `?v=` trong `index.html` / `assets/flashcards.css`, badge ở footer). File CSS/JS mới thêm vào `index.html` thì dùng `?v=<version hiện tại>`.
- Release: commit `chore(release): vX.Y.Z` → annotated tag `vX.Y.Z` với release notes **100% tiếng Anh**, chi tiết theo gạch đầu dòng (không ghi chung chung kiểu "Release vX.Y.Z") → `git push origin HEAD:main` và `git push origin vX.Y.Z`. Các lần trước: port tính năng (feat) → bump **minor**; chỉ refactor/fix → bump **patch**.

---

## 2. Bối cảnh & quyết định của người dùng

Kế hoạch người dùng chốt ngày 2026-11-06, theo thứ tự:
1. **Refactor** để xóa code/CSS thừa và trùng lặp. (Đã làm, mục 3.1.)
2. **Viết lại git history theo từng nhóm tính năng, giữ nguyên các tag.** (Đã làm ở session trước, trước loạt commit liệt kê dưới đây.)
3. **Chuyển sang Preact + Vite từng phần một.**

Ngày 2026-11-07 người dùng nhấn mạnh: tiếp tục chuyển sang Preact theo từng phần, nhưng **giao diện PHẢI giống hệt `index.html` hiện tại** (không đổi một pixel nào nếu tránh được).

Thông tin thêm:
- Tranh minh họa (illustrations) **mặc định ẩn** (key localStorage `hsk_show_illustrations_v2`).
- `tools/tests/*.py` **không phải test**: chúng là dữ liệu nguồn cho `tools/build_reading_analysis_data.py`. Giữ nguyên.
- `src/views` + `app.html` là bản redesign cũ, đã đi lệch hướng, **không dùng** cho trang đang chạy. Không lấy nó làm chuẩn.

---

## 3. Những gì đã làm (theo thứ tự thời gian)

### 3.1 Giai đoạn refactor (2026-11-05 → 2026-11-06, v3.14.3 → v3.14.6)

| Commit | Nội dung |
|---|---|
| `e626d7b69` | `escapeHtml` dùng chung qua `utils.js`, xóa các hàm chết |
| `62f668f66` | `VERSION` thành nguồn duy nhất cho mọi cache-buster (`tools/bump_version.py`) |
| `9e5164839` | fix(css): xóa các dấu `{}` thừa vốn làm vô hiệu hóa ngầm một số rule |
| `e3099b5ae` | xóa ~2.9k dòng CSS cho các class không markup/script nào dùng |
| `e20db24ff` | fix(home): xóa hàm `openWordInLevel` trùng lặp đang che bản đầy đủ |
| `64e987112` | xóa 459 khai báo CSS luôn bị rule sau ghi đè |
| `2cf0ce7cb`, `49ba7045a`, `2773a3652`, `f8d147ea7`, `a5c2e761b`, `2ab5077d1` | gộp code copy-paste: show/hide illustration, `getFilteredManifest`, helper feedback cho reading, template nút thành phần chữ, helper chung cho `selectLevel`/`openWordInLevel`, một hàm `speakerIconSvg()` |
| `1f6ef167b` | xóa 47 custom property CSS không ai đọc |
| `75c93743c` | xóa các script tool chỉ dùng một lần (sinh story/illustration) |
| `381dc842b` | **v3.14.3** |
| `0de1013fc`, `2661d9e83`, `6b267a125`, `101e773ec`, `ef06e004b`, `268a203c2` | helper dùng chung (help modal, style Preact, nút rating render từ bảng, vòng lặp build vocab bank, đọc legacy progress qua một hàm, sửa Hán-Việt cho token) |
| `bbd373b04`, `860e4fe38` | gộp các rule CSS cùng selector bị tách ra |
| `ee6a786bf` | **v3.14.4** |
| `31ff8b524`, `861d82551`, `719f57368`, `467c7a180` | gộp thêm CSS; mọi word list tải qua `fetchLevelWords`; hai accordion của card render từ một template; một player clip-hoặc-speech dùng chung |
| `64c1b9d51` | **v3.14.5** |
| `afa318942`, `e9d2e1b4a`, `50c595006` | xóa khai báo CSS bị ghi đè giữa các file; rule header dashboard mobile chỉ còn ở `level-picker.css`; gộp rule đã được chứng minh độc lập trong DOM thật |
| `434ac86d1` | **v3.14.6** |
| `e6246ca87` | gộp các lớp "polish" CSS của màn học thành một rule mỗi selector |

Nguyên tắc khi gộp CSS: chỉ gộp/xóa khi **chứng minh** được rằng không có rule nào khác chen giữa có thể khớp cùng phần tử (kiểm tra trên DOM thật), nếu không thì thứ tự cascade sẽ đổi và giao diện thay đổi.

### 3.2 Chuyển sang Preact "islands" (2026-11-07, v3.15.0 → v3.16.0 → HEAD)

**Kiến trúc đã chọn ("islands")**:
- `index.html` vẫn là app đang chạy thật (host tĩnh từ thư mục gốc repo, **không có bước build trên CI**).
- `npm run build:islands` (config `vite.islands.config.mjs`) build `src/islands/main.jsx` → `assets/js/preact/islands.js`. **File bundle này được commit** và được load bằng `<script type="module" src="assets/js/preact/islands.js?v=...">` (dòng ~955 của `index.html`, sau mọi classic script).
- `tests/test_preact_islands.py` **fail nếu bundle cũ hơn source** → mỗi lần sửa `src/islands/**` phải chạy lại `npm run build:islands` và commit cả bundle.
- Mỗi island render **đúng markup và class CSS cũ** vào container cũ (hoặc vào `body`), và gắn lại **đúng các hàm `window.*`** mà router/code legacy gọi (ví dụ `window.setRadicalViewMode`, `window.ListeningPractice`, ...).
- Các hằng số top-level của code legacy (`APP_VERSION`, `SPEECH_RATE`, `exampleSpeechSpeed`, `HSK4_MOCK_EXAMS`, các biến trong `radicals-state.js`, ...) được module đọc như **biến global trần** (khai báo trong comment `/* global ... */`).
- `src/islands/main.jsx` import và gọi `mountXxx()` của từng island; **thứ tự mount phải theo đúng thứ tự `<script>` legacy cũ**.

Các commit port (mỗi commit: thêm island, xóa file legacy, bỏ `<script>` khỏi `index.html`, bỏ khỏi precache `sw.js`, rebuild bundle, cập nhật README/test nếu test đọc file theo đường dẫn):

| Commit | Island (`src/islands/`) | Thay thế cho |
|---|---|---|
| `ed42bc6cc` | `StudyHelpModal.jsx` + cơ chế mount islands | modal trợ giúp màn học |
| `60b08338e` | `GuessWordGame.jsx` | game đoán từ |
| `a333ae9bd` | `SpeedQuizGame.jsx` | quiz điền chỗ trống tốc độ |
| `e56c39380` | `SentenceGame.jsx` | game sắp xếp câu HSK 4 |
| `b7b8f8de7` | (fix riêng) | sentence-game: hiện token của câu đã giải theo thứ tự đáp án |
| `a38c91da4` | — | **v3.15.0** |
| `7edd98310` | `VocabularyOverview.jsx` | tổng quan từ vựng |
| `b0f22669d` | `MemoryCurve.jsx` | panel + dialog đường cong trí nhớ |
| `46c20b578` | `WeakWords.jsx` | panel từ yếu (gắn sao) |
| `3090b341b` | `SidebarRadicalsFilter.jsx`, `GrammarBreakdown.jsx` | card tra bộ thủ + panel phân tích ngữ pháp |
| `3e651f1fc` | `WordCompanion.jsx` | panel word-companion ở sidebar |
| `023e2dd6c` | `SidebarTabs.jsx` | chuyển tab sidebar màn học |
| `a952524d9` (+ test `a8cf8e2ee`) | `TodayReview.jsx` | màn ôn tập hôm nay |
| `482a3868c` | `HanziDecomposition.jsx` | phân tích chữ (ô nét, hàng card, panel bộ thủ) |
| `b9f92b3cd` (+ test `d78494fe2`) | `RelatedWords.jsx` | chip từ liên quan + gợi ý cụm |
| `bd7d86056` | `GradedReading.jsx` | Đọc phân cấp (hub, reader, popover token, quiz) |
| `d972c9dc7` | `ReadingAnalysis.jsx` | Đọc & phân tích HSK 4 |
| `7073f3083` | (fix riêng) | reading: render câu cloze có options dạng string |
| `a82092b08` | `ListeningPractice.jsx` | Luyện nghe HSK 4 + editor ranh giới (xóa 1952 dòng legacy) |
| `0ba7ca83f` | — | **v3.16.0** (tag mới nhất) |
| `940d4f885` | `QuickAccessDrawer.jsx` | drawer truy cập nhanh + bảng quick-search (Ctrl+K / `/`) |
| `76d316ab1` | `SidebarSearch.jsx` | ô tìm kiếm ở dock + search index dùng chung |
| `455525705` | `HomeWidgets.jsx` | widget trang chủ (từ của ngày, dự báo ôn 7 ngày) |
| `5087a34c5` | `ambientBackground.js` | engine nền mực/hoa mai (`plum-blossom-background.js`) chuyển thành ES module |

**4 commit sau v3.16.0 (`940d4f885` → `5087a34c5`) chưa được release.** Khi xong phần Bộ thủ nên bump minor lên **v3.17.0** (vì có `feat:`) và tạo tag với release notes tiếng Anh.

Ghi chú quan trọng từ các commit:
- `HomeWidgets`: các hàm lên lịch refresh (`isHomeScreen`, `syncHomeScreen`, `invalidateHomeWidgets`) được **chuyển vào `assets/js/levels.js`** vì dashboard gọi chúng ngay khi classic script đang load (module chưa chạy). Renderer legacy cho `#hwForgotten` bị bỏ vì phần tử đó không tồn tại trong trang.
- `QuickAccessDrawer`: render vào `<aside>` và `<dialog>` **có sẵn trong `index.html`** (giữ lại để grid workstation không đổi), mount ngay khi bundle load vì panel khác tìm chúng lúc DOMContentLoaded. Badge ở header/mobile vẫn được cập nhật trực tiếp.
- `SidebarSearch`: `buildSidebarSearchIndex` / `searchSidebarIndex` vẫn gắn trên `window` cho quick-search, speed quiz và weak words dùng. Mount **trước** các panel dock khác.
- `ListeningPractice`: `render()` của Preact gọi **đồng bộ** như `innerHTML` cũ; các khối legacy bị dựng lại mỗi lần render (player, transport của editor, message box) được gắn `key` theo từng lần render để hành vi giống hệt. Khác biệt duy nhất được chấp nhận: nút play từng câu giữ tooltip thời lượng.

---

## 4. Phần đang làm dở (CHƯA commit) — cần hoàn tất trước tiên

### 4.1 Trạng thái `git status` hiện tại

```
 M assets/css/flashcard.css          <- gộp CSS, việc riêng từ 2026-11-06 (mục 4.3)
 M assets/css/workstation.css        <- gộp CSS, việc riêng từ 2026-11-06 (mục 4.3)
 M assets/js/preact/islands.js       <- bundle đã rebuild, đã có RadicalCards
D  assets/js/radical-card.js         <- đã `git rm` (đã stage), 418 dòng
 M index.html                        <- bỏ markup #screenRadicalCards (~88 dòng) và <script radical-card.js>
 M src/islands/main.jsx              <- import + mountRadicalCards() (cuối file)
?? database/prebuilt_audio/hsk30_6/words/0687.mp3   <- CỦA NGƯỜI DÙNG, KHÔNG ĐỤNG VÀO
?? src/islands/RadicalCards.jsx      <- island mới, 450 dòng
```

### 4.2 Port màn Bộ thủ: `src/islands/RadicalCards.jsx`

- Thay cho `assets/js/radical-card.js`: màn `#screenRadicalCards` gồm flashcard bộ thủ (bộ lọc, thống kê, vuốt), tab tổng quan bộ thủ, panel sao lưu/chuyển thiết bị (`#radicalTransferPanel`, export/import tiến trình bộ thủ).
- **State học vẫn nằm ở các global của `assets/js/radicals-state.js`** (`radicalOrder`, `radicalFilteredOrder`, `radicalIdx`, `radicalWords`, `radicalReturnTab`, `radicalProgress`, `radicalCurrentFilter`, `radicalCurrentView`, `radicalOverview*`, ...), vì `assets/js/radicals.js` (router tab) cũng ghi vào đó. Island đọc/ghi các global này (có `/* eslint-disable no-global-assign */`).
- Render **đồng bộ** (giống ghi DOM legacy) vì code gọi (setup swipe, `scrollIntoView`) dùng phần tử ngay sau đó.
- `Object.assign(window, {...})` ở cuối file (dòng ~442) gắn lại 21 hàm: `buildRadicalCardArea`, `setRadicalViewMode`, `renderRadicalFilters`, `radicalLearningStatus`, `filteredRadicalIndexes`, `setRadicalFilter`, `updateRadicalStats`, `updateRadicalOverviewSearch`, `updateRadicalOverviewStatus`, `updateRadicalOverviewStroke`, `renderRadicalOverview`, `openRadicalInCards`, `toggleRadicalTransferPanel`, `renderRadicalCard`, `radicalFlip`, `nextRadicalCard`, `prevRadicalCard`, `markRadicalKnown`, `markRadicalUnknown`, `shuffleRadicalDeck`, `toggleRadicalPinyin`.
  - Các hàm legacy không gắn lên window (`advanceAfterRadicalMark`, `radicalOverviewStrokeCount`, `radicalRelationLabel`, `radicalSetLabel`) chỉ dùng nội bộ; `renderRadicalOverviewStrokeOptions`, `updateRadicalProgress` đã bỏ — grep xác nhận không file nào khác gọi chúng.
  - `exportRadicalProgress` nằm ở `assets/js/backup.js` (island gọi qua `window.exportRadicalProgress()`).
- Markup cũ của `#screenRadicalCards` trong `index.html` đã bị xóa, chỉ còn chỗ đặt container; island render lại đúng markup đó (xem `git diff -- index.html` để có markup gốc làm chuẩn so sánh).
- `sw.js` không có tham chiếu tới `radical-card.js` (đã kiểm tra bằng grep), không cần sửa.

**Đã kiểm tra (2026-11-07, trên working tree hiện tại):**
- `python3 -m pytest -q tests` → 90 passed
- `npm test` → 22 tests passed
- `python3 tools/test_ui_layout.py` → 93 tests OK
- `python3 tools/test_related_words.py` → 7 tests OK
- Bundle `assets/js/preact/islands.js` đã chứa code RadicalCards (không stale).

**Chưa làm:**
1. **Kiểm chứng parity** giao diện so với bản legacy (HEAD) theo quy trình ở mục 6: vào Bộ thủ → chọn 50 bộ cơ bản / 214 bộ Khang Hy → tab flashcard (lật thẻ, đã nhớ/chưa nhớ, next/prev, vuốt, từng bộ lọc all/known/unknown/unseen, trạng thái rỗng, hiện/ẩn pinyin) → tab tổng quan (tìm kiếm, lọc trạng thái, lọc số nét) → panel sao lưu (mở/đóng, Esc) → quay lại; cả light/dark, desktop/mobile.
2. Kiểm tra `README.md`: các commit port trước đều sửa 1 dòng trong README (mục "Preact islands trong `index.html`", quanh dòng 191) để liệt kê island đã port — thêm "radical cards" vào danh sách.
3. Kiểm tra các test trong `tools/` / `tests/` có đọc `assets/js/radical-card.js` theo đường dẫn không (grep hiện không thấy, nhưng nên kiểm lại).
4. Commit + push:
   ```bash
   git add src/islands/RadicalCards.jsx src/islands/main.jsx assets/js/preact/islands.js index.html README.md
   # assets/js/radical-card.js đã được stage là deleted
   git commit -m "feat(preact): port the radical flashcards and overview screen to a Preact island"
   git push origin HEAD:main
   ```
   Thân commit nên mô tả như các commit trước (state giữ ở radicals-state.js, render đồng bộ, đã kiểm chứng gì).

### 4.3 Thay đổi CSS chưa commit (không thuộc phần Bộ thủ)

`assets/css/workstation.css` (−118/+… dòng) và `assets/css/flashcard.css` (−3 dòng), sửa lúc 2026-11-06 17:37, ngay sau commit `e6246ca87`. Đây là bước tiếp theo của loạt gộp CSS:
- `flashcard.css`: gộp hai rule `:root[data-theme="dark"] .rating-btn--good:active` thành một (xóa `background-color: rgba(45,102,77,0.34)` vì rule trước có `!important` thắng), giữ `transform: translateY(1px)`.
- `workstation.css`: chuyển các khối `:root[data-theme="dark"] body.flashcard-study-mode {...}`, `body.flashcard-study-mode .study-nav-btn {...}` (trong media query), `body.flashcard-study-mode {padding...}` ở `@media (min-width:768px) and (max-height:720px)`, `.progress-nav-card`, `.study-nav-controls/.nav-row` vào khối **sau cùng** của cùng selector, xóa bản trước.

⚠️ **Rủi ro**: chuyển khai báo từ rule trước xuống rule sau có thể đổi kết quả cascade nếu giữa hai vị trí có một rule khác (cùng hoặc khác selector) khớp cùng phần tử với cùng property. Trước khi commit phải chứng minh giao diện không đổi: so computed style / ảnh chụp màn học (flashcard study mode) light + dark, desktop + mobile + viewport `768×700`, với bản HEAD. Nếu không chắc chắn → **hỏi người dùng** thay vì tự ý `git restore` (lệnh đó cần xin phép). Commit riêng:
```bash
git add assets/css/workstation.css assets/css/flashcard.css
git commit -m "refactor(css): fold remaining split study-screen rules into their last block"
```

### 4.4 Release sau khi xong
```bash
python3 tools/bump_version.py minor     # 3.16.0 -> 3.17.0
# chạy lại toàn bộ test (mục 6)
git add VERSION package.json sw.js assets/js/utils.js index.html assets/flashcards.css   # đúng các file tool đã sửa (xem git status)
git commit -m "chore(release): v3.17.0"
git tag -a v3.17.0 -m "Release v3.17.0: <English summary>" -m "- Port the quick-access drawer and quick-search palette to a Preact island
- Port the dock search box and shared search index to a Preact island
- Port the home widgets (word of the day, 7-day review forecast) to a Preact island
- Bundle the ambient ink background engine as an ES module
- Port the radical flashcards and overview screen to a Preact island
- <CSS fold if committed>"
git push origin HEAD:main && git push origin v3.17.0
```

---

## 5. Tình trạng chuyển đổi mã nguồn

Toàn bộ các file logic JavaScript cũ trong `assets/js/` và `assets/flashcards.js` đã được port 100% sang Preact island modules:
- `assets/js/theme.js` → `src/islands/ThemeManager.js`
- `assets/js/speechService.js` + `speech.js` → `src/islands/SpeechAudio.js`
- `assets/js/backup.js` → `src/islands/BackupSync.jsx`
- `assets/js/radicals-state.js` → `src/islands/radicalsState.js`
- `assets/flashcards.js` → `src/islands/AppBootstrap.js`
- `assets/js/levels.js` → `src/islands/Levels.js`
- `assets/js/flashcard.js` → `src/islands/FlashcardStudy.jsx`
- `assets/js/spa-router.js` → `src/islands/SpaRouter.js`
- `assets/js/srs.js` → `src/islands/SrsEngine.js`
- `assets/js/storage.js` → `src/islands/StorageEngine.js`
- `assets/js/utils.js` → `src/islands/AppUtils.js`
- `assets/js/state.js` → `src/islands/AppState.js`

Trong `index.html` chỉ còn lại duy nhất `assets/js/hanviet-dict.js` (file dữ liệu tĩnh 341KB tra cứu âm Hán-Việt, được build bởi `tools/build_hanviet_data.py`).

---

## 6. Quy trình cho mỗi phần port (công thức đã dùng)

1. Đọc file legacy, liệt kê: markup nó tạo, các hàm đặt trên `window`, các global nó đọc/ghi, thời điểm nó chạy (top-level / DOMContentLoaded / khi được gọi), ai gọi nó.
2. Viết `src/islands/<Name>.jsx` render **đúng** markup/class/thuộc tính/text cũ; export `mount<Name>()`; gắn lại các hàm `window.*`.
3. Thêm import + `mount<Name>()` vào `src/islands/main.jsx` **đúng vị trí tương ứng thứ tự script legacy**.
4. Xóa file legacy (`git rm`), bỏ `<script>` trong `index.html`, bỏ khỏi danh sách precache trong `sw.js` (có test canh), sửa các test trong `tests/` và `tools/` đọc file theo đường dẫn.
5. `npm run build:islands`.
6. Chạy tất cả:
   ```bash
   python3 -m pytest -q tests
   npm test
   python3 tools/test_ui_layout.py
   python3 tools/test_related_words.py
   ```
7. Kiểm chứng parity (bên dưới), sửa đến khi giống hệt.
8. Commit **chỉ các file của mình**, push. Nếu phát hiện bug legacy: commit parity trước, sửa bug ở **commit `fix:` riêng** sau.

### Các bẫy về thời điểm chạy (đã gặp)
- Module script chạy **sau** mọi classic script nhưng **trước** `DOMContentLoaded`, lúc `document.readyState` đã là `'interactive'` → không dựa vào `readyState`; dùng `onDomReady` trong `src/islands/domReady.js` (chạy sau handler DOMContentLoaded của legacy).
- Panel gắn vào `#workstationLeft` / `#workstationRight` phải được chèn **sau đúng phần tử hàng xóm legacy** (so thứ tự con), không `appendChild` mù.
- Module mà caller ghi DOM ngay sau `render()` → dùng `render()` đồng bộ của Preact và `key` theo từng lần render cho các khối mà `innerHTML` cũ dựng lại từ đầu.
- JSX tách text thành nhiều text node → lệch kerning rất nhỏ trong ảnh chụp; dùng template string (`{`${a} ${b}`}`) để giữ một text node như bản cũ.

### Kiểm chứng parity (cách đã làm)
- Tạo **git worktree của HEAD** (bản legacy) và serve trên một port khác làm baseline; bản đang sửa serve trên port khác (ví dụ `python3 -m http.server`).
- Dùng **Playwright** (Chromium đã cache `chromium-1194`; module ở `NODE_PATH=~/.npm/_npx/9833c18b2d85bc59/node_modules`) chạy cùng một kịch bản trên cả hai.
- Seed `Math.random` (và đặt `window.__reseed` trước khi vào mỗi màn) — nền mực animated là nguồn khác biệt ảnh chụp duy nhất nếu không seed; `page.clock.install()` + `pauseAt` cho timer; nạp sẵn dữ liệu SRS/localStorage giống nhau; làm ấm cache để tránh race khi load.
- So **DOM chuẩn hóa**: một serializer chạy trong trang (sắp xếp thuộc tính, style lấy từ `cssText`, giá trị form lấy từ property) rồi diff hai bản dump; cộng với diff pixel ảnh chụp và log state. Lặp qua: light/dark × desktop/mobile × mọi trạng thái của màn.
- (Các script `canon.js` / `cmpdump.py` trước đây nằm trong scratchpad tạm của Claude, không còn trong repo — cần viết lại nếu muốn dùng.)

---

## 7. Bản đồ file hữu ích

- `index.html` — app chính thức chạy Preact islands và PWA offline.
- `src/islands/` — toàn bộ các Preact island `.jsx` và module `.js` của ứng dụng.
- `assets/js/preact/islands.js` — bundle đã build, **commit cùng source**.
- `vite.islands.config.mjs` — config build islands (lib mode, ES, minify).
- `vite.config.mjs` — dev server config (`npm run dev` mở `index.html`).
- `tools/bump_version.py` — đồng bộ phiên bản.
- `tests/` (pytest, gồm `test_preact_islands.py` kiểm bundle stale), `tools/test_ui_layout.py`, `tools/test_related_words.py`, `tools/test_fast_review_pinyin.js` (`npm test`).
- `sw.js` — service worker, danh sách precache + `APP_VERSION`.
- `database/prebuilt_audio/` — audio do người dùng sinh, không tự ý thêm/xóa.
