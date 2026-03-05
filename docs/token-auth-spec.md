# Token 认证 CLI 命令规范

## 概述

本文档定义 reskill CLI 的 Token 认证相关命令规范。

## 命令列表

| 命令 | 说明 |
|-----|------|
| `reskill login` | 使用 Token 登录到 Registry |
| `reskill logout` | 退出登录 |
| `reskill whoami` | 显示当前登录用户 |
| `reskill install` | 安装 Skill（自动携带 Token 访问私有 Skill） |

---

## reskill login

使用 Token 登录到 Registry。

### 语法

```bash
reskill login --registry <url> --token <token>
reskill login -r <url> -t <token>
```

### 选项

| 选项 | 缩写 | 必需 | 说明 |
|-----|------|-----|------|
| `--registry <url>` | `-r` | 否 | Registry URL，未指定时使用环境变量或配置 |
| `--token <token>` | `-t` | **是** | API Token (从 Web UI 获取) |

### 行为

1. 如果未提供 `--token`，显示错误并退出
2. 调用 `GET /api/auth/me` 验证 Token
3. 验证成功后，将 Token 保存到 `~/.reskillrc`
4. 显示登录成功信息

### 输出

**成功：**
```
Verifying token with https://rush-test.zhenguanyu.com/...

✓ Token verified and saved!

  Handle: @kanyun
  Username: wangzirenbj
  Registry: https://rush-test.zhenguanyu.com/

Token saved to /Users/xxx/.reskillrc
```

**失败 - 未提供 Token：**
```
Error: Token is required

获取 Token:
  1. 访问 Registry Web UI
  2. 生成 API Token
  3. 运行: reskill login --registry <url> --token <token>
```

**失败 - Token 无效：**
```
Error: Token verification failed: Invalid token

The token is invalid or expired. Please generate a new token from the web UI.
```

### 退出码

| 退出码 | 说明 |
|-------|------|
| 0 | 成功 |
| 1 | 失败 (未提供 token / token 无效 / 网络错误) |

---

## reskill logout

退出登录，删除本地保存的 Token。

### 语法

```bash
reskill logout [--registry <url>]
reskill logout [-r <url>]
```

### 选项

| 选项 | 缩写 | 必需 | 说明 |
|-----|------|-----|------|
| `--registry <url>` | `-r` | 否 | Registry URL，未指定时使用环境变量或配置 |

### 行为

1. 从 `~/.reskillrc` 删除对应 registry 的 Token
2. 显示退出成功信息

### 输出

**成功：**
```
Logged out from https://rush-test.zhenguanyu.com/
```

**未登录：**
```
Not logged in to https://rush-test.zhenguanyu.com/
```

### 退出码

| 退出码 | 说明 |
|-------|------|
| 0 | 成功 |

---

## reskill whoami

显示当前登录用户信息。

### 语法

```bash
reskill whoami [--registry <url>]
reskill whoami [-r <url>]
```

### 选项

| 选项 | 缩写 | 必需 | 说明 |
|-----|------|-----|------|
| `--registry <url>` | `-r` | 否 | Registry URL，未指定时使用环境变量或配置 |

### 行为

1. 从 `~/.reskillrc` 读取 Token
2. 调用 `GET /api/auth/me` 获取用户信息
3. 显示用户 handle、username 和 registry

### 输出

**成功：**
```
@kanyun
  Username: wangzirenbj
  Registry: https://rush-test.zhenguanyu.com/
```

**未登录：**
```
Not logged in to https://rush-test.zhenguanyu.com/

Run 'reskill login' to authenticate.
```

**Token 失效：**
```
Error: Token is invalid or expired

Run 'reskill login' to re-authenticate.
```

### 退出码

| 退出码 | 说明 |
|-------|------|
| 0 | 成功 |
| 1 | 未登录 / Token 失效 |

---

## reskill install 的 Token 认证

`reskill install` 在访问 Registry API 时自动携带 Token，用于安装私有 Skill。

### 语法

```bash
reskill install <skill> [--registry <url>] [--token <token>]
reskill install <skill> [-r <url>] [-t <token>]
```

### Token 解析优先级

1. `--token` 命令行参数（最高优先级，适用于 CI/CD）
2. `RESKILL_TOKEN` 环境变量
3. `~/.reskillrc` 中对应 registry 的 token

### 行为

- Token 是**可选的**：公开 Skill 不需要 Token 即可安装
- 私有 Skill 需要 Token：无 Token 时服务端返回 404（隐藏存在性）
- Token 会传递给所有 Registry API 请求（skill 详情、版本解析、下载）

### 示例

```bash
# 自动使用 ~/.reskillrc 中的 token
reskill install @kanyun/private-skill -r https://rush.zhenguanyu.com/

# CI/CD 环境：通过 --token 显式传入
reskill install @kanyun/private-skill -r https://rush.zhenguanyu.com/ -t eyJhbG...

# 或通过环境变量
RESKILL_TOKEN=eyJhbG... reskill install @kanyun/private-skill
```

---

## 配置文件

### ~/.reskillrc

Token 存储文件。

**格式：**
```json
{
  "registries": {
    "<registry-url>": {
      "token": "<jwt-token>"
    }
  }
}
```

**示例：**
```json
{
  "registries": {
    "https://rush-test.zhenguanyu.com/": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**权限：** 600 (仅用户可读写)

---

## 环境变量

| 变量 | 说明 |
|-----|------|
| `RESKILL_REGISTRY` | 默认 Registry URL |
| `RESKILL_TOKEN` | Token (优先级高于 ~/.reskillrc) |

---

## Registry URL 解析优先级

1. `--registry` 命令行参数
2. `RESKILL_REGISTRY` 环境变量
3. `skills.json` 中的 `defaults.publishRegistry`
4. 报错 (无默认值)

---

## 错误处理

### 网络错误

```
Error: Failed to connect to https://rush-test.zhenguanyu.com/

Please check your network connection and registry URL.
```

### 401 Unauthorized

```
Error: Token is invalid or expired

Run 'reskill login' to re-authenticate.
```

### 403 Forbidden (publish 时)

```
Error: Permission denied

You can only publish to @kanyun/* scope.
Your handle: @wangzirenbj
```

---

## 与 publish 命令的集成

`reskill publish` 命令使用 Token 进行身份验证：

1. 从 `~/.reskillrc` 读取 Token
2. 从 `REGISTRY_SCOPE_MAP` 获取 registry 对应的 scope
3. 构建 skill name: `@{scope}/{name}`
4. 发送请求，服务端验证 Token 和 Scope
5. 显示成功或错误信息

详见 [CLI Spec](cli-spec.md) 中的 publish 命令部分。
