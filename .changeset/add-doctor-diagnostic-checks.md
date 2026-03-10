---
"reskill": minor
---

Add 8 diagnostic checks to `doctor` command

**Changes:**
- Add registry authentication check (`RESKILL_TOKEN` env var and `~/.reskillrc`)
- Add environment variables reporting (`RESKILL_TOKEN`, `RESKILL_REGISTRY`, `RESKILL_CACHE_DIR`)
- Add lockfile version compatibility check
- Add detected agents reporting via `detectInstalledAgents()`
- Add invalid registry URL validation
- Add invalid install mode validation
- Add invalid publishRegistry validation
- Add custom registry network connectivity checks

---

为 `doctor` 命令添加 8 项诊断检查

**变更：**
- 添加注册表认证检查（`RESKILL_TOKEN` 环境变量和 `~/.reskillrc`）
- 添加环境变量报告（`RESKILL_TOKEN`、`RESKILL_REGISTRY`、`RESKILL_CACHE_DIR`）
- 添加锁文件版本兼容性检查
- 添加已安装代理检测报告（通过 `detectInstalledAgents()`）
- 添加无效注册表 URL 验证
- 添加无效安装模式验证
- 添加无效 publishRegistry 验证
- 添加自定义注册表网络连通性检查
