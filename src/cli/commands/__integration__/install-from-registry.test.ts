/**
 * Integration tests for installing skills from npm-style registry
 *
 * Tests the complete install flow for @scope/name format:
 * - Parse skill identifier (@kanyun/planning-with-files@2.4.5)
 * - Resolve registry URL from scope
 * - Download tarball and verify integrity
 * - Extract to installation directory
 *
 * NOTE: These tests require a running registry server.
 * Set REGISTRY_URL environment variable to run against a real server.
 * By default, tests use http://localhost:3000 and will be skipped if unavailable.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { extractTarballBuffer } from '../../../core/extractor.js';
import {
  checkConflict,
  detectInstallDirectory,
  ensureInstallDirectory,
  getSkillInstallPath,
} from '../../../core/install-directory.js';
import { RegistryClient } from '../../../core/registry-client.js';
import {
  getRegistryUrl,
  getShortName,
  parseSkillIdentifier,
} from '../../../utils/registry-scope.js';

// 测试配置
const REGISTRY_URL = process.env.REGISTRY_URL || 'http://localhost:3000';
const TEST_SKILL = process.env.TEST_SKILL || '@kanyun/planning-with-files';

// 检查 registry 是否可用
async function isRegistryAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${REGISTRY_URL}/api/skills/%40kanyun%2Fplanning-with-files`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// 在模块级别检查 registry
let registryAvailable = false;

describe('Install from npm-style Registry', () => {
  let tempDir: string;

  // 辅助函数：创建临时目录
  function createTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-registry-e2e-'));
    return fs.realpathSync(dir);
  }

  // 辅助函数：创建项目目录结构
  function createProjectDir(structure: Record<string, unknown>): string {
    const projectDir = createTempDir();

    function createStructure(basePath: string, obj: Record<string, unknown>) {
      for (const [name, value] of Object.entries(obj)) {
        const fullPath = path.join(basePath, name);
        if (typeof value === 'object' && value !== null) {
          fs.mkdirSync(fullPath, { recursive: true });
          createStructure(fullPath, value as Record<string, unknown>);
        } else if (typeof value === 'string') {
          fs.writeFileSync(fullPath, value);
        }
      }
    }

    createStructure(projectDir, structure);
    return projectDir;
  }

  beforeAll(async () => {
    registryAvailable = await isRegistryAvailable();
    if (!registryAvailable) {
      console.log(`⚠️  Registry not available at ${REGISTRY_URL}, some tests will be skipped`);
    } else {
      console.log(`✅ Registry available at ${REGISTRY_URL}`);
    }
  });

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ============================================================================
  // Unit-level integration tests (不需要 registry)
  // ============================================================================

  describe('parseSkillIdentifier', () => {
    it('should parse private registry format', () => {
      const result = parseSkillIdentifier('@kanyun/planning-with-files@2.4.5');

      expect(result.scope).toBe('@kanyun');
      expect(result.name).toBe('planning-with-files');
      expect(result.version).toBe('2.4.5');
      expect(result.fullName).toBe('@kanyun/planning-with-files');
    });

    it('should parse public registry format', () => {
      const result = parseSkillIdentifier('my-skill@1.0.0');

      expect(result.scope).toBeNull();
      expect(result.name).toBe('my-skill');
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('getRegistryUrl', () => {
    it('should resolve @kanyun to private registry', () => {
      const registry = getRegistryUrl('@kanyun');
      expect(registry).toBe('https://reskill-test.zhenguanyu.com/');
    });

    it('should return public registry for null scope', () => {
      const registry = getRegistryUrl(null);
      expect(registry).toBe('https://reskill.info/');
    });
  });

  describe('detectInstallDirectory', () => {
    it('should detect .claude directory', async () => {
      const projectDir = createProjectDir({ '.claude': {} });

      const installDir = await detectInstallDirectory({ cwd: projectDir });
      expect(installDir).toBe(path.join(projectDir, '.claude/skills'));

      fs.rmSync(projectDir, { recursive: true, force: true });
    });
  });

  describe('checkConflict', () => {
    it('should throw when skill already exists', async () => {
      const projectDir = createProjectDir({
        '.claude': {
          skills: {
            'existing-skill': {
              'SKILL.md': '# Existing',
            },
          },
        },
      });
      const installDir = path.join(projectDir, '.claude/skills');

      await expect(checkConflict(installDir, 'existing-skill')).rejects.toThrow(/already exists/);

      fs.rmSync(projectDir, { recursive: true, force: true });
    });
  });

  // ============================================================================
  // E2E tests (需要 registry)
  // ============================================================================

  describe('Complete install flow (requires registry)', () => {
    it(
      'should download skill and verify integrity',
      async () => {
        if (!registryAvailable) {
          console.log('Skipping: registry not available');
          return;
        }
        const client = new RegistryClient({ registry: REGISTRY_URL });
        const { scope, name, version } = parseSkillIdentifier(TEST_SKILL);

        // 1. 解析版本
        const resolvedVersion = await client.resolveVersion(
          `${scope}/${name}`,
          version || 'latest',
        );
        expect(resolvedVersion).toMatch(/^\d+\.\d+\.\d+/);

        // 2. 下载
        const { tarball, integrity } = await client.downloadSkill(
          `${scope}/${name}`,
          resolvedVersion,
        );

        expect(tarball).toBeInstanceOf(Buffer);
        expect(tarball.length).toBeGreaterThan(0);
        expect(integrity).toMatch(/^sha256-/);

        // 3. 验证 integrity
        if (integrity) {
          const isValid = RegistryClient.verifyIntegrity(tarball, integrity);
          expect(isValid).toBe(true);
        }
      },
      { timeout: 30000 },
    );

    it(
      'should extract tarball to installation directory',
      async () => {
        if (!registryAvailable) {
          console.log('Skipping: registry not available');
          return;
        }
        const client = new RegistryClient({ registry: REGISTRY_URL });
        const { scope, name } = parseSkillIdentifier(TEST_SKILL);
        const shortName = getShortName(`${scope}/${name}`);

        // 1. 下载
        const resolvedVersion = await client.resolveVersion(`${scope}/${name}`, 'latest');
        const { tarball } = await client.downloadSkill(`${scope}/${name}`, resolvedVersion);

        // 2. 创建项目目录
        const projectDir = createProjectDir({ '.claude': {} });
        const installDir = path.join(projectDir, '.claude/skills');
        await ensureInstallDirectory(installDir);

        // 3. 检查冲突
        await checkConflict(installDir, shortName);

        // 4. 解压
        await extractTarballBuffer(tarball, installDir);

        // 5. 验证结果
        const skillPath = getSkillInstallPath(installDir, shortName);

        // 检查文件是否存在（可能有顶层目录，也可能没有）
        const exists =
          fs.existsSync(path.join(skillPath, 'SKILL.md')) ||
          fs.existsSync(path.join(installDir, 'SKILL.md'));

        expect(exists).toBe(true);

        // 清理
        fs.rmSync(projectDir, { recursive: true, force: true });
      },
      { timeout: 30000 },
    );

    it(
      'should complete full install flow',
      async () => {
        if (!registryAvailable) {
          console.log('Skipping: registry not available');
          return;
        }
        // 完整流程测试
        const identifier = TEST_SKILL;
        const { scope, name, version } = parseSkillIdentifier(identifier);
        const shortName = getShortName(`${scope}/${name}`);

        // 1. 获取 registry URL
        const registryUrl = scope ? getRegistryUrl(scope) : getRegistryUrl(null);
        expect(registryUrl).toBeTruthy();

        // 使用测试 registry
        const client = new RegistryClient({ registry: REGISTRY_URL });

        // 2. 解析版本
        const resolvedVersion = await client.resolveVersion(
          `${scope}/${name}`,
          version || 'latest',
        );

        // 3. 下载并验证
        const { tarball, integrity } = await client.downloadSkill(
          `${scope}/${name}`,
          resolvedVersion,
        );

        if (integrity) {
          expect(RegistryClient.verifyIntegrity(tarball, integrity)).toBe(true);
        }

        // 4. 检测安装目录
        const projectDir = createProjectDir({ '.claude': {} });
        const installDir = await detectInstallDirectory({ cwd: projectDir });
        await ensureInstallDirectory(installDir);

        // 5. 检查冲突
        await checkConflict(installDir, shortName);

        // 6. 解压
        await extractTarballBuffer(tarball, installDir);

        // 7. 验证最终结果
        console.log(`✅ Installed ${identifier}@${resolvedVersion} to ${installDir}`);
        console.log(`   Files:`, fs.readdirSync(installDir));

        // 清理
        fs.rmSync(projectDir, { recursive: true, force: true });
      },
      { timeout: 30000 },
    );
  });

  // ============================================================================
  // Error handling tests
  // ============================================================================

  describe('Error handling', () => {
    it('should handle non-existent skill', async () => {
      if (!registryAvailable) {
        console.log('Skipping: registry not available');
        return;
      }
      const client = new RegistryClient({ registry: REGISTRY_URL });

      await expect(
        client.resolveVersion('@kanyun/non-existent-skill-xyz', 'latest'),
      ).rejects.toThrow();
    });

    it('should handle non-existent version', async () => {
      if (!registryAvailable) {
        console.log('Skipping: registry not available');
        return;
      }
      const client = new RegistryClient({ registry: REGISTRY_URL });
      const { scope, name } = parseSkillIdentifier(TEST_SKILL);

      await expect(client.downloadSkill(`${scope}/${name}`, '999.999.999')).rejects.toThrow();
    });

    it('should throw for unknown scope', () => {
      expect(() => getRegistryUrl('@unknown-scope')).toThrow(/Unknown scope/);
    });
  });
});
