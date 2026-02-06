# 私域 Skill 发布与安装 - 实施计划

> 基于 `private-registry-publish-install.md` 方案  
> 遵循 TDD：先写测试 → 实现 → 回测  
> 最后更新：2026-01-30

---

## 实施概览

```
Phase 1: 基础配置 ✅
  ├── Step 1.1: PRIVATE_REGISTRIES 配置模块 ✅
  └── Step 1.2: getRegistryForScope 函数 ✅

Phase 2: Publish 改进 ✅
  ├── Step 2.1: 路径参数可选（默认当前目录）✅
  ├── Step 2.2: 验证私域 Registry ✅
  ├── Step 2.3: 自动添加 scope 前缀 ✅
  └── Step 2.4: createTarball 使用短名称 ✅

Phase 3: Install 命令（从 Registry 安装，支持私有 + 公共）✅
  ├── Step 3.1: 解析 skill 标识 (@scope/name@version 或 name@version) ✅
  ├── Step 3.2: Registry URL 解析（有 scope → 私有，无 scope → 公共）✅
  ├── Step 3.3: 下载 + 验证 Integrity ✅
  ├── Step 3.4: 自动检测安装目录 ✅
  ├── Step 3.5: 冲突检测 ✅
  └── Step 3.6: 解压到目标目录 ✅

Phase 4: 集成测试 ✅
  └── Step 4.1: 端到端测试 ✅

Phase 5: 后续优化
  ├── Step 5.1: CLI 集成 ✅
  ├── Step 5.2: 进度提示 ⏳
  └── Step 5.3: --force 覆盖选项 ✅
```

### 进度统计

| 阶段     | 完成  | 待实现 | 进度    |
| -------- | ----- | ------ | ------- |
| Phase 1  | 2     | 0      | 100%    |
| Phase 2  | 4     | 0      | 100%    |
| Phase 3  | 0     | 6      | 0%      |
| Phase 4  | 0     | 1      | 0%      |
| **总计** | **6** | **7**  | **46%** |

---

## Phase 1: 基础配置

### Step 1.1: PRIVATE_REGISTRIES 配置模块 ✅ 已完成

**状态**：✅ 已完成

**实现位置**：`src/utils/registry-scope.ts`

**已实现功能**：
- `REGISTRY_SCOPE_MAP` - 私域 Registry 配置
- `getScopeForRegistry()` - Registry → Scope 查询
- `parseSkillName()` - 解析 skill 名称
- `buildFullSkillName()` - 构建完整名称
- `getShortName()` - 获取短名称

**现有测试**：`src/utils/registry-scope.test.ts` ✅

---

### Step 1.2: 补充 getRegistryForScope 函数 ✅ 已完成

**目标**：根据 scope 反查对应的 registry URL（Install 命令需要）

**文件**：`src/utils/registry-scope.ts`

#### 测试用例

```typescript
// src/utils/registry-scope.test.ts（补充）

describe('getRegistryForScope', () => {
  it('should return registry for known scope', () => {
    expect(getRegistryForScope('@kanyun')).toBe('https://rush-test.zhenguanyu.com/');
  });

  it('should return registry for localhost scope', () => {
    expect(getRegistryForScope('@kanyun')).toMatch(/reskill-test\.zhenguanyu\.com|localhost:3000/);
  });

  it('should return null for unknown scope', () => {
    expect(getRegistryForScope('@unknown')).toBeNull();
  });

  it('should handle scope without @ prefix', () => {
    expect(getRegistryForScope('kanyun')).toBe('https://rush-test.zhenguanyu.com/');
  });
});
```

---

## Phase 2: Publish 改进

### Step 2.1: 路径参数可选 ✅ 已完成

**状态**：✅ 已完成

**实现位置**：`src/cli/commands/publish.ts`

**实现方式**：
```typescript
.argument('[path]', 'Path to skill directory', '.')  // 默认 '.'
```

**现有测试**：`src/cli/commands/publish.test.ts` ✅

---

### Step 2.2: 验证私域 Registry ✅ 已完成

**状态**：✅ 已完成

**实现位置**：`src/cli/commands/publish.ts`

**实现方式**：
- `BLOCKED_PUBLIC_REGISTRIES` - 公域黑名单
- `isBlockedPublicRegistry()` - 检测是否为公域
- `validateRegistry()` - 验证并拒绝公域发布

**现有测试**：`src/cli/commands/publish.test.ts` ✅

---

### Step 2.3: 自动添加 scope 前缀 ✅ 已完成

**状态**：✅ 已完成

**实现位置**：`src/cli/commands/publish.ts`

**实现方式**：
```typescript
export function buildPublishSkillName(
  name: string,
  registry: string,
  userHandle: string,
): string {
  // 如果已有 scope，直接返回
  if (name.includes('/')) return name;
  
  // 从 registry 获取 scope
  const registryScope = getScopeForRegistry(registry);
  if (registryScope) {
    return buildFullSkillName(registryScope, name);
  }
  
  // 回退到用户 handle
  return buildFullSkillName(userHandle, name);
}
```

**现有测试**：`src/cli/commands/publish.test.ts` ✅

---

### Step 2.4: createTarball 使用短名称 ✅ 已完成

**目标**：Tarball 顶层目录使用短名称（不带 scope）

**当前实现**：`src/core/registry-client.ts` - 扁平结构（无顶层目录）

**需要改为**：添加短名称作为顶层目录

**文件**：`src/core/registry-client.ts`

#### 测试用例

```typescript
// src/core/registry-client.test.ts（补充）

describe('createTarball - short name as top-level directory', () => {
  it('should use short name as top-level directory', async () => {
    const skillPath = createTempSkillDir(['SKILL.md', 'examples.md']);
    const files = ['SKILL.md', 'examples.md'];
    const shortName = 'planning-with-files';
    
    const tarball = await client.createTarball(skillPath, files, shortName);
    const entries = await extractTarballEntries(tarball);
    
    expect(entries).toContain('planning-with-files/SKILL.md');
    expect(entries).toContain('planning-with-files/examples.md');
  });

  it('should not include scope in tarball paths', async () => {
    const skillPath = createTempSkillDir(['SKILL.md']);
    const files = ['SKILL.md'];
    const shortName = 'my-skill';
    
    const tarball = await client.createTarball(skillPath, files, shortName);
    const entries = await extractTarballEntries(tarball);
    
    expect(entries.some(e => e.includes('@kanyun'))).toBe(false);
    expect(entries).toContain('my-skill/SKILL.md');
  });

  it('should preserve nested directory structure', async () => {
    const skillPath = createTempSkillDir(['SKILL.md', 'scripts/init.sh']);
    const files = ['SKILL.md', 'scripts/init.sh'];
    const shortName = 'my-skill';
    
    const tarball = await client.createTarball(skillPath, files, shortName);
    const entries = await extractTarballEntries(tarball);
    
    expect(entries).toContain('my-skill/SKILL.md');
    expect(entries).toContain('my-skill/scripts/init.sh');
  });
});
```

---

## Phase 3: Install 命令（从 Registry 安装）

> **注意**：当前 `install.ts` 是从 Git/HTTP 安装 skill。  
> 需要新增从 **Registry** 下载安装的功能，支持**私有 Registry**（带 @scope）和**公共 Registry**（无 scope）。

### 格式识别入口

在现有 `install` 流程中新增 Registry 判断（优先级最高）：

```
输入: reskill install <identifier>
        │
        ▼
┌─────────────────────────────────────────┐
│  1. 是否为 Registry 格式？               │
│     - 以 @ 开头 → 私有 Registry         │
│     - 无 / 且非 URL → 公共 Registry     │
└─────────────────────────────────────────┘
        │
   ┌────┴────┐
   │ 是      │ 否
   ▼         ▼
Registry    ┌─────────────────────────────┐
下载        │  2. 是否为 Git URL？         │
            │     ...（现有逻辑）          │
            └─────────────────────────────┘
```

**判断函数**：

```typescript
// src/core/skill-manager.ts（修改）

function isRegistrySource(ref: string): boolean {
  // 1. 以 @ 开头 → 私有 Registry
  if (ref.startsWith('@')) return true;
  
  // 2. 不包含 / 且不是 URL → 公共 Registry
  if (!ref.includes('/') && !HttpResolver.isHttpUrl(ref) && !isGitUrl(ref)) {
    return true;
  }
  
  return false;
}
```

---

### Step 3.1: 解析 skill 标识 ✅ 已完成

**目标**：解析 Registry 格式的 skill 标识，支持私有和公共 Registry

**支持格式**：

| 格式          | scope     | name         | version     | 示例                        |
| ------------- | --------- | ------------ | ----------- | --------------------------- |
| 私有 Registry | `@kanyun` | `skill-name` | `undefined` | `@kanyun/planning`          |
| 私有 + 版本   | `@kanyun` | `skill-name` | `2.4.5`     | `@kanyun/planning@2.4.5`    |
| 公共 Registry | `null`    | `skill-name` | `undefined` | `planning-with-files`       |
| 公共 + 版本   | `null`    | `skill-name` | `2.4.5`     | `planning-with-files@2.4.5` |

**文件**：`src/utils/registry-scope.ts`（扩展 `parseSkillIdentifier`）

#### 测试用例

```typescript
// src/utils/registry-scope.test.ts（补充）

describe('parseSkillIdentifier', () => {
  // 私有 Registry（带 @scope）
  it('should parse scope and name', () => {
    const result = parseSkillIdentifier('@kanyun/planning-with-files');
    expect(result).toEqual({
      scope: '@kanyun',
      name: 'planning-with-files',
      version: undefined,
      fullName: '@kanyun/planning-with-files',
    });
  });

  it('should parse scope, name, and version', () => {
    const result = parseSkillIdentifier('@kanyun/planning-with-files@2.4.5');
    expect(result).toEqual({
      scope: '@kanyun',
      name: 'planning-with-files',
      version: '2.4.5',
      fullName: '@kanyun/planning-with-files',
    });
  });

  it('should parse scope, name, and tag', () => {
    const result = parseSkillIdentifier('@kanyun/planning-with-files@beta');
    expect(result).toEqual({
      scope: '@kanyun',
      name: 'planning-with-files',
      version: 'beta',
      fullName: '@kanyun/planning-with-files',
    });
  });

  // 公共 Registry（无 scope）
  it('should parse name without scope (public registry)', () => {
    const result = parseSkillIdentifier('planning-with-files');
    expect(result).toEqual({
      scope: null,
      name: 'planning-with-files',
      version: undefined,
      fullName: 'planning-with-files',
    });
  });

  it('should parse name and version without scope', () => {
    const result = parseSkillIdentifier('planning-with-files@2.4.5');
    expect(result).toEqual({
      scope: null,
      name: 'planning-with-files',
      version: '2.4.5',
      fullName: 'planning-with-files',
    });
  });

  it('should parse name and tag without scope', () => {
    const result = parseSkillIdentifier('my-skill@latest');
    expect(result).toEqual({
      scope: null,
      name: 'my-skill',
      version: 'latest',
      fullName: 'my-skill',
    });
  });

  // 边界情况
  it('should handle scope with hyphen', () => {
    const result = parseSkillIdentifier('@my-org/my-skill');
    expect(result.scope).toBe('@my-org');
  });

  it('should handle scope with underscore', () => {
    const result = parseSkillIdentifier('@my_org/my_skill');
    expect(result.scope).toBe('@my_org');
  });

  it('should handle version with prerelease tag', () => {
    const result = parseSkillIdentifier('@kanyun/skill@1.0.0-beta.1');
    expect(result.version).toBe('1.0.0-beta.1');
  });
});
```

---

### Step 3.2: Registry URL 解析 ✅ 已完成

**目标**：根据 scope 确定 Registry URL

**逻辑**：
- 有 scope → 反查私有 Registry（使用 `getRegistryForScope`）
- 无 scope → 使用公共 Registry（`https://reskill.info/`）

**依赖**：Step 1.2

**文件**：`src/utils/registry-scope.ts`（扩展）

**常量定义**：

```typescript
// src/utils/registry-scope.ts

export const PUBLIC_REGISTRY = 'https://reskill.info/';
```

#### 测试用例

```typescript
// src/utils/registry-scope.test.ts（补充）

describe('getRegistryUrl', () => {
  // 私有 Registry（有 scope）
  it('should resolve registry from known scope', () => {
    const registry = getRegistryUrl('@kanyun');
    expect(registry).toBe('https://rush-test.zhenguanyu.com/');
  });

  it('should throw error for unknown scope', () => {
    expect(() => getRegistryUrl('@unknown')).toThrow(
      'Unknown scope @unknown. No registry configured for this scope.'
    );
  });

  // 公共 Registry（无 scope）
  it('should return public registry when scope is null', () => {
    const registry = getRegistryUrl(null);
    expect(registry).toBe('https://reskill.info/');
  });

  it('should return public registry when scope is empty', () => {
    const registry = getRegistryUrl('');
    expect(registry).toBe('https://reskill.info/');
  });
});
```

---

### Step 3.3: 下载 + 验证 Integrity ✅ 已完成

**目标**：下载 tarball 并验证 SHA256 完整性

**文件**：`src/core/registry-client.ts`（扩展）

#### 测试用例

```typescript
// src/core/registry-client.test.ts（补充）

describe('downloadSkill', () => {
  it('should download tarball successfully', async () => {
    const mockTarball = createMockTarball('test-skill');
    mockFetch('/api/skills/@kanyun/test-skill/versions/1.0.0/download', {
      body: mockTarball,
      headers: { 'x-integrity': 'sha256-xxx' },
    });

    const result = await client.downloadSkill('@kanyun/test-skill', '1.0.0');
    expect(result.tarball).toBeInstanceOf(Buffer);
    expect(result.integrity).toBe('sha256-xxx');
  });

  it('should verify integrity matches', () => {
    const tarball = createMockTarball('test-skill');
    const expectedIntegrity = calculateIntegrity(tarball);

    const isValid = verifyIntegrity(tarball, expectedIntegrity);
    expect(isValid).toBe(true);
  });

  it('should throw error on integrity mismatch', () => {
    const tarball = createMockTarball('test-skill');
    const wrongIntegrity = 'sha256-wrong';

    expect(() => verifyIntegrity(tarball, wrongIntegrity)).toThrow(
      'Integrity check failed'
    );
  });

  it('should resolve tag to version', async () => {
    mockFetch('/api/skills/@kanyun/test-skill', {
      body: { 'dist-tags': { latest: '2.4.5' } },
    });

    const version = await client.resolveVersion('@kanyun/test-skill', 'latest');
    expect(version).toBe('2.4.5');
  });

  it('should throw error for non-existent skill', async () => {
    mockFetch('/api/skills/@kanyun/non-existent', { status: 404 });

    await expect(
      client.downloadSkill('@kanyun/non-existent', '1.0.0')
    ).rejects.toThrow('Skill not found');
  });
});
```

---

### Step 3.4: 自动检测安装目录 ✅ 已完成

**目标**：根据项目类型自动选择安装目录

**文件**：`src/core/install-directory.ts`（新建）

#### 测试用例

```typescript
// src/core/install-directory.test.ts

describe('detectInstallDirectory', () => {
  it('should detect .claude directory and use .claude/skills/', async () => {
    const projectDir = createTempProjectDir({ '.claude': {} });
    process.chdir(projectDir);

    const installDir = await detectInstallDirectory();
    expect(installDir).toBe(path.join(projectDir, '.claude/skills'));
  });

  it('should detect .cursor directory and use .cursor/skills/', async () => {
    const projectDir = createTempProjectDir({ '.cursor': {} });
    process.chdir(projectDir);

    const installDir = await detectInstallDirectory();
    expect(installDir).toBe(path.join(projectDir, '.cursor/skills'));
  });

  it('should prefer .claude over .cursor when both exist', async () => {
    const projectDir = createTempProjectDir({ '.claude': {}, '.cursor': {} });
    process.chdir(projectDir);

    const installDir = await detectInstallDirectory();
    expect(installDir).toBe(path.join(projectDir, '.claude/skills'));
  });

  it('should fall back to .ai-skills when no AI tool detected', async () => {
    const projectDir = createTempProjectDir({});
    process.chdir(projectDir);

    const installDir = await detectInstallDirectory();
    expect(installDir).toBe(path.join(projectDir, '.ai-skills'));
  });

  it('should create skills directory if not exists', async () => {
    const projectDir = createTempProjectDir({ '.claude': {} });
    process.chdir(projectDir);

    const installDir = await detectInstallDirectory();
    await ensureInstallDirectory(installDir);

    expect(fs.existsSync(installDir)).toBe(true);
  });
});
```

---

### Step 3.5: 冲突检测 ✅ 已完成

**目标**：检测安装目录是否已存在同名 skill

**文件**：`src/cli/commands/install-registry.ts`

#### 测试用例

```typescript
// src/cli/commands/install-registry.test.ts（补充）

describe('install from registry - conflict detection', () => {
  it('should throw error when skill directory already exists', async () => {
    const installDir = createTempDir();
    const skillName = 'planning-with-files';
    
    fs.mkdirSync(path.join(installDir, skillName));

    await expect(
      checkConflict(installDir, skillName)
    ).rejects.toThrow('Conflict: planning-with-files/ already exists');
  });

  it('should not throw when directory does not exist', async () => {
    const installDir = createTempDir();
    const skillName = 'new-skill';

    await expect(
      checkConflict(installDir, skillName)
    ).resolves.not.toThrow();
  });

  it('should provide helpful error message with removal command', async () => {
    const installDir = '/project/.claude/skills';
    const skillName = 'my-skill';
    
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    try {
      await checkConflict(installDir, skillName);
    } catch (error) {
      expect((error as Error).message).toContain('rm -rf');
      expect((error as Error).message).toContain(skillName);
    }
  });
});
```

---

### Step 3.6: 解压到目标目录 ✅ 已完成

**目标**：将 tarball 解压到安装目录

**文件**：`src/core/extractor.ts`（新建）

#### 测试用例

```typescript
// src/core/extractor.test.ts

describe('extractTarball', () => {
  it('should extract tarball to install directory', async () => {
    const tarball = createMockTarball('my-skill', ['SKILL.md', 'examples.md']);
    const installDir = createTempDir();

    await extractTarball(tarball, installDir);

    expect(fs.existsSync(path.join(installDir, 'my-skill/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'my-skill/examples.md'))).toBe(true);
  });

  it('should preserve nested directory structure', async () => {
    const tarball = createMockTarball('my-skill', [
      'SKILL.md',
      'scripts/init.sh',
      'templates/progress.md',
    ]);
    const installDir = createTempDir();

    await extractTarball(tarball, installDir);

    expect(fs.existsSync(path.join(installDir, 'my-skill/scripts/init.sh'))).toBe(true);
    expect(fs.existsSync(path.join(installDir, 'my-skill/templates/progress.md'))).toBe(true);
  });

  it('should preserve file permissions', async () => {
    const tarball = createMockTarballWithPermissions('my-skill', [
      { name: 'scripts/init.sh', mode: 0o755 },
    ]);
    const installDir = createTempDir();

    await extractTarball(tarball, installDir);

    const stat = fs.statSync(path.join(installDir, 'my-skill/scripts/init.sh'));
    expect(stat.mode & 0o755).toBe(0o755);
  });

  it('should handle empty tarball gracefully', async () => {
    const emptyTarball = createEmptyTarball();
    const installDir = createTempDir();

    await expect(extractTarball(emptyTarball, installDir)).rejects.toThrow(
      'Invalid tarball'
    );
  });
});
```

---

## Phase 4: 集成测试

### Step 4.1: 端到端测试 ✅ 已完成

**目标**：完整的 publish → install 流程测试

**文件**：`src/e2e/publish-install.test.ts`

#### 测试用例

```typescript
// src/e2e/publish-install.test.ts

describe('E2E: publish and install from registry', () => {
  const registry = 'https://rush-test.zhenguanyu.com/';
  
  beforeAll(async () => {
    // 启动测试 registry 服务或使用 mock
  });

  afterAll(async () => {
    // 清理测试数据
  });

  it('should publish skill and install it successfully', async () => {
    // 1. 创建测试 skill
    const skillDir = createTempSkillDir({
      'SKILL.md': '---\nname: e2e-test-skill\nversion: 1.0.0\n---\n# Test',
      'examples.md': '# Examples',
    });

    // 2. Publish
    const publishResult = await runCli([
      'publish',
      skillDir,
      `--registry=${registry}`,
    ]);
    
    expect(publishResult.exitCode).toBe(0);
    expect(publishResult.stdout).toContain('@kanyun/e2e-test-skill@1.0.0');

    // 3. 创建新项目目录
    const projectDir = createTempProjectDir({ '.claude': {} });
    process.chdir(projectDir);

    // 4. Install from registry
    const installResult = await runCli([
      'install-registry',  // 或其他命令名
      '@kanyun/e2e-test-skill',
    ]);

    expect(installResult.exitCode).toBe(0);
    expect(installResult.stdout).toContain('Installed @kanyun/e2e-test-skill@1.0.0');

    // 5. 验证安装结果
    const skillPath = path.join(projectDir, '.claude/skills/e2e-test-skill');
    expect(fs.existsSync(path.join(skillPath, 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(skillPath, 'examples.md'))).toBe(true);
  });

  it('should handle version upgrade', async () => {
    // 发布 v1.0.0，然后发布 v1.1.0
    // 安装 v1.0.0，验证内容
    // 删除后安装 v1.1.0，验证内容
  });

  it('should handle install conflict correctly', async () => {
    // 安装一次
    // 再次安装同一个 skill
    // 验证报错信息
  });
});
```

---

## 测试工具函数

### 辅助函数

```typescript
// src/test-utils/helpers.ts

/**
 * 创建临时 skill 目录
 */
export function createTempSkillDir(files?: Record<string, string>): string;

/**
 * 创建临时项目目录
 */
export function createTempProjectDir(structure: Record<string, any>): string;

/**
 * 创建模拟 tarball（带顶层目录）
 */
export function createMockTarball(name: string, files?: string[]): Buffer;

/**
 * 解压 tarball 并返回文件列表
 */
export function extractTarballEntries(tarball: Buffer): Promise<string[]>;

/**
 * 计算 integrity
 */
export function calculateIntegrity(data: Buffer): string;

/**
 * 运行 CLI 命令
 */
export async function runCli(args: string[]): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}>;
```

---

## 执行顺序（更新）

| 阶段    | 步骤                                  | 状态     | 依赖          | 估计时间 |
| ------- | ------------------------------------- | -------- | ------------- | -------- |
| Phase 1 | Step 1.1 PRIVATE_REGISTRIES           | ✅ 已完成 | 无            | —        |
| Phase 1 | Step 1.2 getRegistryForScope          | ✅ 已完成 | 无            | —        |
| Phase 2 | Step 2.1 路径参数可选                 | ✅ 已完成 | 无            | —        |
| Phase 2 | Step 2.2 验证私域 Registry            | ✅ 已完成 | Step 1.1      | —        |
| Phase 2 | Step 2.3 自动添加 scope               | ✅ 已完成 | Step 1.1, 2.2 | —        |
| Phase 2 | Step 2.4 createTarball 短名称         | ✅ 已完成 | Step 2.3      | —        |
| Phase 3 | Step 3.1 解析 skill 标识（私有+公共） | ✅ 已完成 | 无            | —        |
| Phase 3 | Step 3.2 Registry URL 解析            | ✅ 已完成 | Step 1.2, 3.1 | —        |
| Phase 3 | Step 3.3 下载 + 验证                  | ✅ 已完成 | Step 3.2      | —        |
| Phase 3 | Step 3.4 检测安装目录                 | ✅ 已完成 | 无            | —        |
| Phase 3 | Step 3.5 冲突检测                     | ✅ 已完成 | Step 3.4      | —        |
| Phase 3 | Step 3.6 解压                         | ✅ 已完成 | Step 3.5      | —        |
| Phase 4 | Step 4.1 E2E 测试                     | ✅ 已完成 | All           | —        |
| Phase 5 | Step 5.1 CLI 集成                     | ✅ 已完成 | Phase 4       | —        |
| Phase 5 | Step 5.2 进度提示                     | ⏳ 待实现 | Step 5.1      | 0.5h     |
| Phase 5 | Step 5.3 `--force` 覆盖选项           | ✅ 已完成 | Step 5.1      | —        |

**核心功能已完成** ✅ | **后续优化**：约 2 小时

---

## 检查清单

每个 Step 完成后，需要确认：

- [ ] 测试用例全部通过
- [ ] 代码覆盖率 > 80%
- [ ] 无 lint 错误
- [ ] 文档已更新（如需要）

### 已完成步骤确认

- [x] Step 1.1: PRIVATE_REGISTRIES 配置模块
- [x] Step 1.2: getRegistryForScope
- [x] Step 2.1: 路径参数可选
- [x] Step 2.2: 验证私域 Registry
- [x] Step 2.3: 自动添加 scope 前缀
- [x] Step 2.4: createTarball 短名称
- [x] Bug 修复: isHttpUrl() 排除 Git URL（`.git` 结尾、`/tree/`、`/blob/`、`/raw/` 路径）
- [x] Step 3.1: 解析 skill 标识（私有 + 公共 Registry）
- [x] Step 3.2: Registry URL 解析（`PUBLIC_REGISTRY` + `getRegistryUrl`）
- [x] Step 3.3: 下载 + 验证 Integrity（`resolveVersion`、`downloadSkill`、`verifyIntegrity`、`calculateIntegrity`）
- [x] Step 3.4: 自动检测安装目录（`detectInstallDirectory`、`ensureInstallDirectory`）
- [x] Step 3.5: 冲突检测（`checkConflict`）
- [x] Step 3.6: 解压到目标目录（`extractTarballBuffer`、`getTarballTopDir`）
- [x] Step 4.1: E2E 测试（完整的 download → verify → extract 流程）

### 后续优化（Phase 5）

- [x] Step 5.1: CLI 集成 - `RegistryResolver` + `SkillManager.installToAgentsFromRegistry`
- [ ] Step 5.2: 进度提示 - 下载进度条、安装状态显示
- [x] Step 5.3: `--force` 覆盖选项 - `installToAgentsFromRegistry` 检测已安装 + force 跳过
