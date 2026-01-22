---
"reskill": minor
---

Add smart installation defaults with persistent configuration

**Changes:**
- Store user's agent selection (`targetAgents`) and installation method (`installMode`) in `skills.json` defaults section
- `reskill install` without arguments now uses stored config directly, skips all prompts, and reinstalls all skills from `skills.json`
- `reskill install <skill>` uses stored config as default values in prompts, allowing user modification

**Code Quality:**
- Refactored `config-loader.ts` with better code organization, JSDoc comments, and private helper methods
- Refactored `install.ts` by extracting types (`InstallOptions`, `InstallContext`), utility functions, and separating concerns into focused functions
- Added comprehensive unit tests for the new defaults behavior

---

新增智能安装默认配置持久化功能

**主要变更：**
- 将用户的 agent 选择（`targetAgents`）和安装方式（`installMode`）存储到 `skills.json` 的 defaults 配置中
- `reskill install` 不带参数时直接使用存储的配置，跳过所有提示，重新安装 `skills.json` 中的所有 skills
- `reskill install <skill>` 使用存储的配置作为提示的默认值，用户仍可修改

**代码质量：**
- 重构 `config-loader.ts`，改进代码组织结构，添加 JSDoc 注释和私有辅助方法
- 重构 `install.ts`，提取类型定义（`InstallOptions`、`InstallContext`）和工具函数，将关注点分离到专注的函数中
- 为新的默认配置行为添加了全面的单元测试
