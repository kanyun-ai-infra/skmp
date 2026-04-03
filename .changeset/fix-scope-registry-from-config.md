---
"reskill": patch
---

Fix scoped registry resolution to respect skills.json registries

**Bug Fix:**
- `resolveRegistryUrl` now reads `@scope`-prefixed entries from `skills.json` `registries` and passes them to `getRegistryUrl` as `customRegistries`
- Previously, only the hardcoded `REGISTRY_SCOPE_MAP` was used for scope→registry resolution, ignoring user-configured scope mappings in `skills.json`
- Custom scope registries in `skills.json` take priority over hardcoded defaults, with fallback to the hardcoded map for backward compatibility

---

修复 scoped registry 解析逻辑，使其读取 skills.json 中的 registries 配置

**Bug 修复：**
- `resolveRegistryUrl` 现在会从 `skills.json` 的 `registries` 中提取 `@scope` 开头的条目，作为 `customRegistries` 传递给 `getRegistryUrl`
- 之前仅使用硬编码的 `REGISTRY_SCOPE_MAP` 进行 scope→registry 解析，忽略了用户在 `skills.json` 中配置的 scope 映射
- `skills.json` 中的自定义 scope 配置优先于硬编码默认值，未配置时仍回退到硬编码映射，保持向后兼容
