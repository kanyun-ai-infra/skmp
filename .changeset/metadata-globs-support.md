---
"reskill": minor
---

Add `metadata.globs` support for Cursor bridge rules

**Changes:**
- `reskill install` now reads `metadata.globs` from SKILL.md frontmatter and populates the `globs` field in generated `.mdc` bridge files for Cursor
- Sync reskill-usage skill documentation with README.md (added `find` command, registry options, OpenCode agent, etc.)
- Add auto-trigger guidance and `metadata.globs` to skill-sync-checker
- Add skill-sync-checker README.md with usage docs and token consumption notes

**Bug Fixes:**
- Fix empty string `metadata.globs` being treated as valid globs value

---

新增 `metadata.globs` 支持，用于 Cursor bridge 规则自动激活

**Changes:**
- `reskill install` 现在会从 SKILL.md frontmatter 中读取 `metadata.globs`，并自动填充到 Cursor 生成的 `.mdc` bridge 文件的 `globs` 字段
- 同步 reskill-usage skill 文档与 README.md（新增 `find` 命令、registry 选项、OpenCode agent 等）
- 为 skill-sync-checker 添加自动触发指引和 `metadata.globs`
- 新增 skill-sync-checker README.md，包含使用文档和 token 消耗提示

**Bug Fixes:**
- 修复空字符串 `metadata.globs` 被错误视为有效 globs 值的问题
