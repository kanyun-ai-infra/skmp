# skmp

**AI Skills Package Manager** - Git-based skills management for AI agents

[![npm version](https://img.shields.io/npm/v/skmp.svg)](https://www.npmjs.com/package/skmp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 概述

skmp 是一个基于 Git 的 AI Skills 包管理系统，类似 npm/Go modules 的架构，实现 AI Skills 的版本化管理、共享和复用。

## 特性

- 🚀 **Git 即 Registry** - 无需额外服务，git 仓库就是 skill 存储源
- 📦 **声明式配置** - skills.json 清晰表达项目依赖
- 🔒 **版本锁定** - 支持精确版本、范围版本、latest
- 🔗 **本地开发** - 支持 link 本地 skill 进行开发调试
- ⚡ **全局缓存** - 避免重复下载，加速安装

## 安装

```bash
# 全局安装
npm install -g skmp

# 或使用 npx
npx skmp <command>
```

## 快速开始

```bash
# 1. 初始化项目
skmp init

# 2. 安装 skill
skmp install github:user/my-skill@v1.0.0

# 3. 列出已安装的 skills
skmp list
```

## 命令

### 初始化

```bash
skmp init                    # 创建 skills.json
skmp init --name my-project  # 指定项目名称
skmp init --registry gitlab  # 使用 gitlab 作为默认 registry
```

### 安装

```bash
skmp install                          # 安装 skills.json 中的所有 skills
skmp install <skill>                  # 安装单个 skill
skmp install github:user/skill@v1.0.0 # 安装指定版本
skmp install user/skill@latest        # 安装最新版本
skmp install user/skill@^1.0.0        # 安装 semver 范围
skmp install --force                  # 强制重新安装
```

### 管理

```bash
skmp list                    # 列出已安装 skills
skmp list --json             # JSON 格式输出
skmp info <skill>            # 查看 skill 详情
skmp update                  # 更新所有 skills
skmp update <skill>          # 更新单个 skill
skmp outdated                # 检查过期 skills
skmp uninstall <skill>       # 卸载 skill
```

### 开发

```bash
skmp link <path>             # 链接本地 skill（开发用）
skmp link <path> --name xxx  # 链接并指定名称
skmp unlink <skill>          # 取消链接
```

## 配置文件

### skills.json

```json
{
  "name": "my-project",
  "skills": {
    "planning": "github:user/planning-skill@v1.0.0",
    "code-review": "gitlab:team/code-review@latest"
  },
  "defaults": {
    "registry": "github",
    "installDir": ".skills"
  },
  "registries": {
    "internal": "https://gitlab.company.com"
  }
}
```

### 版本规范

| 格式 | 示例 | 说明 |
|-----|------|------|
| 精确版本 | `@v1.0.0` | 锁定到指定 tag |
| 最新版本 | `@latest` | 获取最新 tag |
| 范围版本 | `@^2.0.0` | semver 兼容（>=2.0.0 <3.0.0） |
| 分支 | `@branch:develop` | 指定分支 |
| Commit | `@commit:abc1234` | 指定 commit hash |

### 仓库引用格式

```
完整格式: <registry>:<owner>/<repo>@<version>
简写格式: <owner>/<repo>@<version>  (使用默认 registry)

示例:
  github:user/skill@v1.0.0
  gitlab:group/skill@latest
  gitlab.company.com:team/skill@v1.0.0
  user/skill@v1.0.0  → 使用 defaults.registry
```

## 目录结构

安装后的项目结构：

```
my-project/
├── skills.json          # 依赖声明
├── skills.lock          # 版本锁定
└── .skills/             # 安装目录
    ├── planning/
    │   ├── skill.json
    │   └── SKILL.md
    └── code-review/
        ├── skill.json
        └── SKILL.md
```

## Skill 仓库结构

每个 Skill 仓库应遵循以下结构：

```
my-skill/
├── skill.json           # 元数据（必需）
├── SKILL.md             # 主入口文档（必需）
├── README.md            # 仓库说明
└── templates/           # 模板文件（可选）
```

### skill.json

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "A skill for ...",
  "author": "Your Name",
  "license": "MIT",
  "entry": "SKILL.md",
  "keywords": ["ai", "skill"]
}
```

## 环境变量

| 变量 | 说明 | 默认值 |
|-----|------|-------|
| `SKPM_CACHE_DIR` | 全局缓存目录 | `~/.skmp-cache` |
| `DEBUG` | 启用调试日志 | - |

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 运行测试
pnpm test

# 类型检查
pnpm typecheck
```

## License

MIT
