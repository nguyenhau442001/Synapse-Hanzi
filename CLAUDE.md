# CLAUDE.md

Read and follow all project rules in AGENTS.md:

@AGENTS.md

## Always commit and push after each task

- After every finished task: run tests/checks, then `git commit` directly on `main` and `git push origin HEAD:main`.
- Do not wait for the user to ask; a task is not done until it is committed and pushed.
- Use small, focused conventional commit messages (`feat: ...`, `fix: ...`, `docs: ...`).
- If tests or checks fail, fix them first, or report the failure instead of pushing broken code.

## Final summary

- After finishing a task, summarize the result in **at most 3 lines** (overrides the longer summary format in AGENTS.md).
