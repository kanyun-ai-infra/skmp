/**
 * Tarball Extractor Tests (Step 3.6)
 *
 * Tests for extracting tarball buffers to the installation directory
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { pack } from 'tar-stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { extractTarballBuffer } from './extractor.js';

describe('extractor', () => {
  let tempDir: string;

  // 辅助函数：创建临时目录
  function createTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-extractor-test-'));
    return fs.realpathSync(dir);
  }

  // 辅助函数：创建 mock tarball
  function createMockTarball(
    topDir: string,
    files: Array<{ name: string; content: string; mode?: number }>,
  ): Buffer {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const tarPack = pack();
      const gzip = zlib.createGzip();

      gzip.on('data', (chunk: Buffer) => chunks.push(chunk));
      gzip.on('end', () => resolve(Buffer.concat(chunks)));
      gzip.on('error', reject);

      tarPack.pipe(gzip);

      for (const file of files) {
        const entryName = `${topDir}/${file.name}`;
        const content = Buffer.from(file.content);

        tarPack.entry(
          {
            name: entryName,
            size: content.length,
            mode: file.mode || 0o644,
          },
          content,
        );
      }

      tarPack.finalize();
    }) as unknown as Buffer;
  }

  // 辅助函数：创建空 tarball
  function createEmptyTarball(): Buffer {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const tarPack = pack();
      const gzip = zlib.createGzip();

      gzip.on('data', (chunk: Buffer) => chunks.push(chunk));
      gzip.on('end', () => resolve(Buffer.concat(chunks)));
      gzip.on('error', reject);

      tarPack.pipe(gzip);
      tarPack.finalize();
    }) as unknown as Buffer;
  }

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('extractTarballBuffer', () => {
    it('should extract tarball to install directory', async () => {
      const tarball = await createMockTarball('my-skill', [
        { name: 'SKILL.md', content: '# My Skill' },
        { name: 'examples.md', content: '# Examples' },
      ]);

      await extractTarballBuffer(tarball, tempDir);

      expect(fs.existsSync(path.join(tempDir, 'my-skill/SKILL.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'my-skill/examples.md'))).toBe(true);

      // 验证内容
      const content = fs.readFileSync(path.join(tempDir, 'my-skill/SKILL.md'), 'utf-8');
      expect(content).toBe('# My Skill');
    });

    it('should preserve nested directory structure', async () => {
      const tarball = await createMockTarball('my-skill', [
        { name: 'SKILL.md', content: '# Skill' },
        { name: 'scripts/init.sh', content: '#!/bin/bash' },
        { name: 'templates/progress.md', content: '# Progress' },
      ]);

      await extractTarballBuffer(tarball, tempDir);

      expect(fs.existsSync(path.join(tempDir, 'my-skill/SKILL.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'my-skill/scripts/init.sh'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'my-skill/templates/progress.md'))).toBe(true);
    });

    it('should preserve file permissions on Unix', async () => {
      // 只在 Unix 系统上测试权限
      if (process.platform === 'win32') {
        return;
      }

      const tarball = await createMockTarball('my-skill', [
        { name: 'scripts/init.sh', content: '#!/bin/bash', mode: 0o755 },
      ]);

      await extractTarballBuffer(tarball, tempDir);

      const stat = fs.statSync(path.join(tempDir, 'my-skill/scripts/init.sh'));
      // 检查是否有执行权限
      expect(stat.mode & 0o111).toBeGreaterThan(0);
    });

    it('should handle empty tarball gracefully', async () => {
      const emptyTarball = await createEmptyTarball();

      // 空 tarball 应该成功解压，只是没有文件
      await extractTarballBuffer(emptyTarball, tempDir);

      // tempDir 应该存在但为空（或只有解压时创建的目录）
      expect(fs.existsSync(tempDir)).toBe(true);
    });

    it('should handle tarball with deep nesting', async () => {
      const tarball = await createMockTarball('skill', [
        { name: 'a/b/c/d/deep.txt', content: 'deep content' },
      ]);

      await extractTarballBuffer(tarball, tempDir);

      expect(fs.existsSync(path.join(tempDir, 'skill/a/b/c/d/deep.txt'))).toBe(true);
      const content = fs.readFileSync(path.join(tempDir, 'skill/a/b/c/d/deep.txt'), 'utf-8');
      expect(content).toBe('deep content');
    });

    it('should handle tarball with special characters in filename', async () => {
      const tarball = await createMockTarball('my-skill', [
        { name: 'file with spaces.md', content: 'spaces' },
        { name: 'file-with-dashes.md', content: 'dashes' },
        { name: 'file_with_underscores.md', content: 'underscores' },
      ]);

      await extractTarballBuffer(tarball, tempDir);

      expect(fs.existsSync(path.join(tempDir, 'my-skill/file with spaces.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'my-skill/file-with-dashes.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'my-skill/file_with_underscores.md'))).toBe(true);
    });

    it('should throw error for invalid gzip data', async () => {
      const invalidData = Buffer.from('not a valid gzip');

      await expect(extractTarballBuffer(invalidData, tempDir)).rejects.toThrow();
    });

    it('should create install directory if not exists', async () => {
      const newInstallDir = path.join(tempDir, 'new-dir');
      expect(fs.existsSync(newInstallDir)).toBe(false);

      const tarball = await createMockTarball('skill', [
        { name: 'SKILL.md', content: '# Skill' },
      ]);

      await extractTarballBuffer(tarball, newInstallDir);

      expect(fs.existsSync(newInstallDir)).toBe(true);
      expect(fs.existsSync(path.join(newInstallDir, 'skill/SKILL.md'))).toBe(true);
    });
  });
});
