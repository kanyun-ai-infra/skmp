/**
 * Install Directory Detection Tests (Step 3.4)
 *
 * Tests for detecting the correct installation directory based on project context
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  checkConflict,
  DEFAULT_SKILLS_DIR,
  detectInstallDirectory,
  ensureInstallDirectory,
} from './install-directory.js';

describe('install-directory', () => {
  let tempDir: string;
  let originalCwd: string;

  // 辅助函数：创建临时项目目录
  function createTempProjectDir(structure: Record<string, unknown>): string {
    const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-install-dir-test-'));
    // macOS 上 /var 是 /private/var 的软链接，需要获取真实路径
    const projectDir = fs.realpathSync(tempBase);

    // 递归创建目录结构
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

  beforeEach(() => {
    originalCwd = process.cwd();
    const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-install-test-'));
    tempDir = fs.realpathSync(tempBase);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectInstallDirectory', () => {
    it('should detect .claude directory and use .claude/skills/', async () => {
      const projectDir = createTempProjectDir({ '.claude': {} });
      process.chdir(projectDir);

      const installDir = await detectInstallDirectory();
      expect(installDir).toBe(path.join(projectDir, '.claude/skills'));

      // 清理
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should detect .cursor directory and use .cursor/skills/', async () => {
      const projectDir = createTempProjectDir({ '.cursor': {} });
      process.chdir(projectDir);

      const installDir = await detectInstallDirectory();
      expect(installDir).toBe(path.join(projectDir, '.cursor/skills'));

      // 清理
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should prefer .claude over .cursor when both exist', async () => {
      const projectDir = createTempProjectDir({ '.claude': {}, '.cursor': {} });
      process.chdir(projectDir);

      const installDir = await detectInstallDirectory();
      // claude-code 优先级更高
      expect(installDir).toBe(path.join(projectDir, '.claude/skills'));

      // 清理
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should fall back to default skills directory when no AI tool detected', async () => {
      const projectDir = createTempProjectDir({});
      process.chdir(projectDir);

      const installDir = await detectInstallDirectory();
      expect(installDir).toBe(path.join(projectDir, DEFAULT_SKILLS_DIR));

      // 清理
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should detect .github directory and use .github/skills/', async () => {
      const projectDir = createTempProjectDir({ '.github': {} });
      process.chdir(projectDir);

      const installDir = await detectInstallDirectory();
      expect(installDir).toBe(path.join(projectDir, '.github/skills'));

      // 清理
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should respect cwd option', async () => {
      const projectDir = createTempProjectDir({ '.claude': {} });

      const installDir = await detectInstallDirectory({ cwd: projectDir });
      expect(installDir).toBe(path.join(projectDir, '.claude/skills'));

      // 清理
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should use global directory when global option is true', async () => {
      const installDir = await detectInstallDirectory({ global: true });
      const home = os.homedir();

      // 全局安装应该使用 home 目录下的路径
      expect(installDir.startsWith(home)).toBe(true);
      expect(installDir).toContain('skills');
    });
  });

  describe('ensureInstallDirectory', () => {
    it('should create skills directory if not exists', async () => {
      const projectDir = createTempProjectDir({ '.claude': {} });
      const installDir = path.join(projectDir, '.claude/skills');

      expect(fs.existsSync(installDir)).toBe(false);

      await ensureInstallDirectory(installDir);

      expect(fs.existsSync(installDir)).toBe(true);

      // 清理
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should not fail if directory already exists', async () => {
      const projectDir = createTempProjectDir({ '.claude': { skills: {} } });
      const installDir = path.join(projectDir, '.claude/skills');

      expect(fs.existsSync(installDir)).toBe(true);

      // 不应该抛出错误
      await expect(ensureInstallDirectory(installDir)).resolves.not.toThrow();

      // 清理
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should create nested directory structure', async () => {
      const installDir = path.join(tempDir, 'deep/nested/skills/dir');

      await ensureInstallDirectory(installDir);

      expect(fs.existsSync(installDir)).toBe(true);
    });
  });

  describe('DEFAULT_SKILLS_DIR', () => {
    it('should be .skills', () => {
      expect(DEFAULT_SKILLS_DIR).toBe('.skills');
    });
  });

  // ============================================================================
  // checkConflict tests (Step 3.5)
  // ============================================================================

  describe('checkConflict', () => {
    it('should throw error when skill directory already exists', async () => {
      const projectDir = createTempProjectDir({
        '.claude': {
          skills: {
            'planning-with-files': {
              'SKILL.md': '# Existing Skill',
            },
          },
        },
      });
      const installDir = path.join(projectDir, '.claude/skills');
      const skillName = 'planning-with-files';

      await expect(checkConflict(installDir, skillName)).rejects.toThrow(/already exists/);

      // 清理
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should not throw when directory does not exist', async () => {
      const projectDir = createTempProjectDir({ '.claude': { skills: {} } });
      const installDir = path.join(projectDir, '.claude/skills');
      const skillName = 'new-skill';

      await expect(checkConflict(installDir, skillName)).resolves.not.toThrow();

      // 清理
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should include skill name in error message', async () => {
      const projectDir = createTempProjectDir({
        '.claude': {
          skills: {
            'my-skill': {},
          },
        },
      });
      const installDir = path.join(projectDir, '.claude/skills');
      const skillName = 'my-skill';

      try {
        await checkConflict(installDir, skillName);
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect((error as Error).message).toContain('my-skill');
      }

      // 清理
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should include removal hint in error message', async () => {
      const projectDir = createTempProjectDir({
        '.claude': {
          skills: {
            'existing-skill': {},
          },
        },
      });
      const installDir = path.join(projectDir, '.claude/skills');
      const skillName = 'existing-skill';

      try {
        await checkConflict(installDir, skillName);
        expect.fail('Expected error to be thrown');
      } catch (error) {
        // 应该包含删除提示
        expect((error as Error).message).toMatch(/rm|remove|delete|--force/i);
      }

      // 清理
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('should work with different install directories', async () => {
      const projectDir = createTempProjectDir({
        '.cursor': {
          skills: {
            'cursor-skill': {},
          },
        },
      });
      const installDir = path.join(projectDir, '.cursor/skills');
      const skillName = 'cursor-skill';

      await expect(checkConflict(installDir, skillName)).rejects.toThrow(/already exists/);

      // 清理
      fs.rmSync(projectDir, { recursive: true, force: true });
    });
  });
});
