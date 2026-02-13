---
"reskill": minor
---

Support `metadata.alwaysApply` in SKILL.md frontmatter for Cursor bridge rules

**Changes:**
- The installer now reads `metadata.alwaysApply` from SKILL.md when generating `.cursor/rules/*.mdc` bridge files
- Skills can declare `alwaysApply: true` in their frontmatter metadata to be always active in Cursor
- Default behavior unchanged: `alwaysApply` is `false` when not specified
- Added unit test for the `alwaysApply: true` scenario

---

支持在 SKILL.md frontmatter 中通过 `metadata.alwaysApply` 声明 Cursor 桥接规则的 alwaysApply

**变更：**
- Installer 生成 `.cursor/rules/*.mdc` 桥接文件时，现在会读取 SKILL.md 中的 `metadata.alwaysApply` 字段
- Skill 可以在 frontmatter metadata 中声明 `alwaysApply: true`，安装后在 Cursor 中始终生效
- 默认行为不变：未指定时 `alwaysApply` 为 `false`
- 新增 `alwaysApply: true` 场景的单元测试
