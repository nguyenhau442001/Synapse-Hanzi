# Agent Memory - HSK Flashcards Generator

## Git Workflow Rules

- Work directly on the existing `main` branch.
- Do not create new branches unless I explicitly ask.
- Do not create pull requests unless I explicitly ask.
- Do not merge branches unless I explicitly ask.
- Do not rename branches or change remote settings.
- Do not run GitHub PR workflows.

## Commit & Push Rules

- When done with a task, run tests and checks, commit directly on `main`, and push up.
- Keep commits small, focused, and meaningful.
- Use clear conventional commit messages (e.g. `feat: ...`, `fix: ...`).

## Semantic Versioning (SemVer) & Release Rules

Bắt buộc tuân thủ chuẩn phiên bản **`x.x.x` (Semantic Versioning)** cho mọi lần phát hành/cập nhật:
- Định dạng: `MAJOR.MINOR.PATCH` (gắn git tag `vX.Y.Z`).
  - **MAJOR (x.0.0)**: Phá vỡ tương thích ngược (breaking changes), tái cấu trúc kiến trúc cốt lõi hoặc đại tu giao diện hoàn toàn.
  - **MINOR (0.x.0)**: Thêm tính năng mới, bài tập/màn hình/công cụ mới mà không phá vỡ tính năng cũ (`feat: ...`).
  - **PATCH (0.0.x)**: Sửa lỗi (`fix: ...`), cải thiện hiệu năng (`perf: ...`), tinh chỉnh UI/UX nhỏ hoặc sửa audio (`fix`, `style`, `refactor`).

### Đồng bộ phiên bản khi phát hành
Mỗi lần release, số phiên bản `x.x.x` phải được cập nhật đồng bộ ở các vị trí:
1. `VERSION`: chứa chuỗi phiên bản `x.x.x`.
2. `package.json`: trường `"version": "x.x.x"`.
3. `sw.js`: `const APP_VERSION = 'x.x.x'; const ASSET_VERSION = APP_VERSION;`.
4. `index.html`: `<span class="footer-version" title="Phiên bản ứng dụng">vx.x.x</span>` ở footer.
> Tip: Chạy script `python3 tools/bump_version.py [patch|minor|major|X.Y.Z]` để tự động cập nhật đồng bộ tất cả các vị trí trên.

### Quy trình đánh dấu Release & Git Tag
Sau khi kiểm tra và commit lên `main`:
1. Tạo annotated git tag với **ghi chú chi tiết về các thay đổi (detailed release notes)**:
   - **BẮT BUỘC viết 100% bằng tiếng Anh (English only)**: Tuyệt đối không dùng tiếng Việt, không pha trộn nửa Anh nửa Việt (no bilingual mixing).
   - **BẮT BUỘC note kỹ những gì đã thay đổi trong tag đó**: Tuyệt đối không ghi tag message chung chung (như chỉ ghi cụt ngủn `"Release vX.Y.Z"` hay `"update"`).
   - Nội dung tag message phải gồm:
     - Dòng tiêu đề tóm tắt ngắn gọn mục tiêu phát hành bằng tiếng Anh.
     - Danh sách gạch đầu dòng mô tả cụ thể từng thay đổi hoàn toàn bằng tiếng Anh: tính năng mới, lỗi đã sửa, cải tiến UI/UX, logic hoặc module bị ảnh hưởng.
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z: <Concise summary in English>" \
     -m "- <Detailed change 1: new feature / fix in English>
   - <Detailed change 2: UI/UX improvement / styling in English>
   - <Detailed change 3: data logic / test coverage in English>"
   ```
2. Đẩy commit và git tag lên GitHub:
   ```bash
   git push origin HEAD:main
   git push origin vX.Y.Z
   ```

## Dangerous Git Commands

Before running any of these commands, stop and ask me first:

- `git reset`
- `git rebase`
- `git clean`
- `git checkout`
- `git restore`
- `git push --force`
- any command that may delete files, rewrite history, or discard local changes

## Development Style

- Make changes directly in the current working tree.
- Keep edits simple and incremental.
- Do not rewrite the whole project unless I explicitly ask.
- Follow the existing code style and file structure.
- After finishing:
  - run tests or checks
  - commit and push to `main`
  - summarize:
    - what files changed
    - what behavior changed
    - what tests or checks were run

## Project Preference

This is a personal project. I prefer a simple single-branch workflow because I do not want to review pull requests for every small change. Read AGENTS.md first and follow it strictly. This project uses only one branch: main.
