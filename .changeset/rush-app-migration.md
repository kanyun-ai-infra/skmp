---
"reskill": minor
---

Support rush-app private registry with `/api/reskill` API prefix

**Changes:**
- Added `REGISTRY_API_PREFIX` mapping and `getApiPrefix()` to automatically resolve API path prefix per registry
- Added `apiPrefix` option to `RegistryClient` with `getApiBase()` helper (handles trailing slash normalization)
- Updated all `RegistryClient` instantiation sites to pass `apiPrefix`
- Added 302/301 redirect handling in `downloadSkill()` to capture `x-integrity` header from registry before following redirect to OSS
- Added `rush-test.zhenguanyu.com` (test) and `rush.zhenguanyu.com` (production) to scope mapping
- Preserved backward compatibility with legacy `reskill-test.zhenguanyu.com` (uses default `/api` prefix)

**Bug Fixes:**
- Fixed potential double-slash in API URLs when registry URL has trailing slash

---

支持 rush-app 私域 Registry，使用 `/api/reskill` API 前缀

**变更：**
- 新增 `REGISTRY_API_PREFIX` 映射和 `getApiPrefix()` 函数，按域名自动选择 API 前缀
- `RegistryClient` 新增 `apiPrefix` 配置项和 `getApiBase()` 方法（含尾斜杠归一化处理）
- 所有 `RegistryClient` 实例化位置传入 `apiPrefix`
- `downloadSkill()` 新增 302/301 重定向手动跟随，从 registry 的 302 响应中捕获 `x-integrity` 头后再从 OSS 下载 tarball
- 新增 `rush-test.zhenguanyu.com`（测试）和 `rush.zhenguanyu.com`（生产）域名到 scope 映射
- 保留旧域名 `reskill-test.zhenguanyu.com` 的向后兼容（使用默认 `/api` 前缀）

**Bug 修复：**
- 修复 registry URL 带尾斜杠时 API URL 产生双斜杠的问题
