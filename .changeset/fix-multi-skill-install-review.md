---
"reskill": patch
---

Fix multi-skill install review issues for PR #101

**Bug Fixes:**
- Fix unsafe type assertion in `--list` path: use discriminated union (`result.listOnly`) before accessing `result.skills`
- Forward `--force` option to `installSkillsFromRepo` with skip-if-installed logic consistent with other install paths
- Show meaningful message when all skills are already installed instead of empty "Installed 0 skill(s)"
- Only skip installation when exact same ref is locked; allow version upgrades without `--force`

**Improvements:**
- Replace `console.log()` with `p.log.message('')` for consistent `@clack/prompts` formatting
- Warn when `--skill`/`--list` used with multiple refs (flags are silently ignored in that case)
- Optimize `discoverSkillsInDir` to skip already-scanned priority directories during recursive scan
- Add symlink cycle protection via `visitedDirs` tracking in `findSkillDirsRecursive`
- Add `try/catch` around `fs.statSync` in priority directory scan for race condition safety

**Tests:**
- Add `--force` integration test verifying reinstallation output and negative test for skip-without-force
- Add `--no-save` integration test verifying `skills.json` is not modified

---

修复 PR #101 多技能安装功能的代码审查问题

**Bug 修复：**
- 修复 `--list` 路径中不安全的类型断言：在访问 `result.skills` 前使用判别联合 (`result.listOnly`) 进行类型收窄
- 将 `--force` 选项正确传递到 `installSkillsFromRepo`，添加与其他安装路径一致的跳过已安装逻辑
- 所有技能已安装时显示有意义的提示信息，而非空的 "Installed 0 skill(s)"
- 仅在完全相同的 ref 已锁定时跳过安装；允许不同版本的升级无需 `--force`

**改进：**
- 将 `console.log()` 替换为 `p.log.message('')`，统一使用 `@clack/prompts` 格式化
- 当 `--skill`/`--list` 与多个 ref 同时使用时发出警告（此时标志会被忽略）
- 优化 `discoverSkillsInDir`，递归扫描时跳过已扫描的优先目录，减少冗余 I/O
- 通过 `visitedDirs` 跟踪为 `findSkillDirsRecursive` 添加 symlink 循环保护
- 在优先目录扫描的 `fs.statSync` 调用中添加 `try/catch`，防止竞态条件

**测试：**
- 添加 `--force` 集成测试，验证重新安装输出及无 `--force` 时的跳过行为
- 添加 `--no-save` 集成测试，验证 `skills.json` 不被修改
