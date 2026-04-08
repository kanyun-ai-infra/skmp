---
"reskill": minor
---

Add `--token` (`-t`) option to all `group` and `group member` subcommands

Support passing auth token directly via CLI flag for CI/CD scenarios. Token resolution priority: `--token` flag > `RESKILL_TOKEN` env > `~/.reskillrc`.

---

为所有 `group` 和 `group member` 子命令添加 `--token`（`-t`）选项

支持通过 CLI 参数直接传入认证 token，适用于 CI/CD 场景。Token 优先级：`--token` 参数 > `RESKILL_TOKEN` 环境变量 > `~/.reskillrc`。
