---
"reskill": minor
---

Use SKILL.md as the sole source of skill metadata

**Changes:**
- Skill name is now read from SKILL.md `name` field instead of folder name when installing from monorepo subpaths
- All metadata (name, version, description, license, keywords) is now exclusively read from SKILL.md
- `skill.json` is completely ignored during installation and publishing
- Publish command now uses SKILL.md name as the authoritative source (excluding scope)
- Doctor command only checks for SKILL.md existence, no longer validates skill.json

**Bug Fixes:**
- Fixed: Installing skills from monorepo subpaths (e.g., `github:user/repo/skill`) incorrectly used folder name instead of SKILL.md name

**Migration:**
- Ensure all skills have a valid SKILL.md with `name`, `description`, and optionally `version` in YAML frontmatter
- `skill.json` files are no longer required and will be ignored

---

使用 SKILL.md 作为技能元数据的唯一来源

**变更：**
- 从 monorepo 子路径安装技能时，技能名称现在从 SKILL.md 的 `name` 字段读取，而非文件夹名
- 所有元数据（name、version、description、license、keywords）现在完全从 SKILL.md 读取
- 安装和发布过程中完全忽略 `skill.json`
- 发布命令现在使用 SKILL.md 的 name 作为权威来源（不包括 scope 部分）
- doctor 命令只检查 SKILL.md 是否存在，不再验证 skill.json

**Bug 修复：**
- 修复：从 monorepo 子路径安装技能（如 `github:user/repo/skill`）时错误地使用文件夹名而非 SKILL.md 中的名称

**迁移指南：**
- 确保所有技能都有有效的 SKILL.md，并在 YAML frontmatter 中包含 `name`、`description`，以及可选的 `version`
- `skill.json` 文件不再需要，将被忽略
