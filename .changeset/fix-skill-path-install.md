---
"reskill": patch
---

Fix multi-skill repo installation path using skill_path

**Problem:**
When installing skills from multi-skill repositories (e.g. `github:user/web-quality-skills`),
the entire repository was cloned and installed as-is, resulting in incorrect directory structures
like `.skills/web-quality-skills/skills/accessibility/SKILL.md` instead of the expected
`.skills/accessibility/SKILL.md`. Skills from different repos with the same repo name would
also overwrite each other.

**Root Cause:**
The `SkillInfo` type was missing the `skill_path` field returned by the registry API, causing
`installFromWebPublished` to use only `source_url` (the repo-level URL) without knowledge of
the skill's subdirectory.

**Fix:**
- Added `skill_path` to `SkillInfo` type
- New `buildGitRefForWebPublished` method constructs `{source_type}:{owner}/{repo}/{skill_path}`
  refs, leveraging existing `GitResolver` + `CacheManager` subPath logic to cache and install
  only the target subdirectory
- Fallback to `#shortName` selector when `parseGitUrl` fails; backward-compatible when
  `skill_path` is absent

---

修复多技能仓库安装路径错误（skill_path 支持）

**问题：**
从多技能仓库安装 skill 时，整个仓库被克隆并安装，导致目录结构错误。
例如 `.skills/web-quality-skills/skills/accessibility/SKILL.md`，
而非期望的 `.skills/accessibility/SKILL.md`。不同仓库同名时还会互相覆盖。

**根因：**
`SkillInfo` 类型缺少 registry API 返回的 `skill_path` 字段，
`installFromWebPublished` 只使用 `source_url`（仓库级 URL），无法定位子目录。

**修复：**
- `SkillInfo` 新增 `skill_path` 字段
- 新增 `buildGitRefForWebPublished` 方法，构造 `{type}:{owner}/{repo}/{skill_path}` 格式的
  Git ref，复用 `GitResolver` + `CacheManager` 的 subPath 逻辑只缓存子目录
- `parseGitUrl` 失败时退化为 `#shortName` 选择器；无 `skill_path` 时完全向后兼容
