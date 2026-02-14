---
"reskill": minor
---

Add Agents column to `list` command and fix global path

**Changes:**
- `list` and `list -g` now display an **Agents** column showing which agents have each skill installed
- Header changed from showing a hardcoded path to `(project)` / `(global)` scope label
- `getInstallDir()` in global mode now returns canonical `~/.agents/skills/` instead of Claude-specific `~/.claude/skills/`
- New `detectSkillAgents()` method scans all agent directories to determine per-skill agent coverage
- `InstalledSkill` type gains an optional `agents` field

---

`list` 命令新增 Agents 列，修复全局路径问题

**Changes:**
- `list` 和 `list -g` 新增 **Agents** 列，展示每个 skill 安装到了哪些 agent
- 表头从显示硬编码路径改为 `(project)` / `(global)` 作用域标签
- 全局模式下 `getInstallDir()` 返回规范路径 `~/.agents/skills/`，不再硬编码到 Claude 的 `~/.claude/skills/`
- 新增 `detectSkillAgents()` 方法，通过扫描各 agent 目录反向检测 skill 的 agent 覆盖范围
- `InstalledSkill` 类型新增可选的 `agents` 字段
