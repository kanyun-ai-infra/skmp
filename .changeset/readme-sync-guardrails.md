---
"reskill": patch
---

Add README localization sync guardrails for pull requests and CI.

**Changes:**
- Add a `check:readme-sync` script that enforces updating `README.*.md` when `README.md` changes
- Run README sync validation in CI
- Add a PR template checklist for README localization sync
- Add a new `readme-l10n-sync` skill for language-agnostic README synchronization workflow

---

为 README 多语言同步增加 PR 和 CI 守护机制。

**变更:**
- 新增 `check:readme-sync` 脚本，当 `README.md` 变更时要求同步 `README.*.md`
- 在 CI 中执行 README 同步校验
- 新增 PR 模板检查项，确保 README 多语言同步
- 新增 `readme-l10n-sync` skill，面向多语言 README 同步流程
