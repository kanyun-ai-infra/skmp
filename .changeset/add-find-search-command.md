---
"reskill": minor
---

Add `find` / `search` command to search for skills in the registry

**New Features:**
- `reskill find <query>` (alias: `reskill search`) — Search skills in public or private registries
- `--registry <url>` — Specify a registry URL (or use `RESKILL_REGISTRY` env, or `defaults.publishRegistry` in skills.json)
- `--limit <n>` — Limit the number of results (default: 10)
- `--json` — Output search results as JSON

**Core Changes:**
- `registry-client.ts`: Add `search()` method with query, limit/offset support, and pagination metadata handling
- `registry.ts`: Add `resolveRegistryForSearch()` with fallback to public registry (unlike `resolveRegistry()` which exits on missing config)
- `find.ts`: New CLI command with human-readable and JSON output modes, auth error hints

**Tests:**
- Unit tests: command definition, search execution, JSON output, error handling, registry resolution
- Integration tests: real CLI execution with `--registry`, `--limit`, `--json`, error cases

---

新增 `find` / `search` 命令，用于在 registry 中搜索 skill

**新功能：**
- `reskill find <query>`（别名：`reskill search`）— 在公共或私有 registry 中搜索 skill
- `--registry <url>` — 指定 registry URL（或使用 `RESKILL_REGISTRY` 环境变量，或 skills.json 中的 `defaults.publishRegistry`）
- `--limit <n>` — 限制结果数量（默认：10）
- `--json` — 以 JSON 格式输出搜索结果

**核心变更：**
- `registry-client.ts`：新增 `search()` 方法，支持 query、limit/offset 和分页元数据处理
- `registry.ts`：新增 `resolveRegistryForSearch()`，未配置时回退到公共 registry（不同于 `resolveRegistry()` 会直接退出）
- `find.ts`：新增 CLI 命令，支持人类可读和 JSON 两种输出模式，认证错误提示

**测试：**
- 单元测试：命令定义、搜索执行、JSON 输出、错误处理、registry 解析
- 集成测试：使用 `--registry`、`--limit`、`--json` 和错误场景的真实 CLI 执行测试
