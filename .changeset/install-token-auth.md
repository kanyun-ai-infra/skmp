---
"reskill": minor
---

Add token authentication to install command

**Changes:**
- Added `-t, --token <token>` option to `install` command for CI/CD environments
- Install now automatically reads auth token from `~/.reskillrc` (same as `publish`)
- Token priority: `--token` flag > `RESKILL_TOKEN` env > `~/.reskillrc`
- Token is passed to all registry API requests (skill info, version resolve, download)
- Registry probe phase intentionally omits token to prevent credential leakage

**Docs:**
- Updated `cli-spec.md`, `token-auth-spec.md`, `token-auth-design.md`, `README.md`

---

为 install 命令添加 Token 认证支持

**变更：**
- 新增 `-t, --token <token>` 选项，支持 CI/CD 环境显式传入 token
- install 现在自动从 `~/.reskillrc` 读取 token（与 publish 一致）
- Token 优先级：`--token` 参数 > `RESKILL_TOKEN` 环境变量 > `~/.reskillrc`
- Token 透传到所有 Registry API 请求（skill 详情、版本解析、下载）
- Registry 探测阶段不带 token，防止凭证泄露到无关 registry

**文档：**
- 更新了 `cli-spec.md`、`token-auth-spec.md`、`token-auth-design.md`、`README.md`
