/**
 * Tarball Extractor (Step 3.6)
 *
 * Extracts tarball buffers to the installation directory.
 * Used for extracting skills downloaded from the registry.
 */

import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { extract, type Headers } from 'tar-stream';

/**
 * Extract a gzipped tarball buffer to the installation directory
 *
 * tarball 内部结构应该是:
 * - skill-name/SKILL.md
 * - skill-name/examples.md
 * - skill-name/scripts/init.sh
 *
 * 解压后目录结构:
 * - installDir/skill-name/SKILL.md
 * - installDir/skill-name/examples.md
 * - installDir/skill-name/scripts/init.sh
 *
 * @param tarball - Gzipped tarball buffer
 * @param installDir - Installation directory path
 *
 * @example
 * await extractTarballBuffer(tarball, '/path/.claude/skills');
 * // Creates: /path/.claude/skills/planning-with-files/SKILL.md
 */
export async function extractTarballBuffer(tarball: Buffer, installDir: string): Promise<void> {
  // 确保安装目录存在
  if (!existsSync(installDir)) {
    mkdirSync(installDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const gunzip = createGunzip();
    const extractor = extract();

    // 处理每个文件
    extractor.on('entry', (header: Headers, stream, next) => {
      const entryPath = join(installDir, header.name);

      // 处理目录
      if (header.type === 'directory') {
        if (!existsSync(entryPath)) {
          mkdirSync(entryPath, { recursive: true });
        }
        stream.resume();
        next();
        return;
      }

      // 处理文件
      if (header.type === 'file') {
        // 确保父目录存在
        const parentDir = dirname(entryPath);
        if (!existsSync(parentDir)) {
          mkdirSync(parentDir, { recursive: true });
        }

        // 创建写入流
        const writeStream = createWriteStream(entryPath, {
          mode: header.mode,
        });

        // 写入文件内容
        stream.pipe(writeStream);

        writeStream.on('finish', () => {
          next();
        });

        writeStream.on('error', (err) => {
          reject(new Error(`Failed to write file ${entryPath}: ${err.message}`));
        });

        return;
      }

      // 跳过其他类型（如符号链接）
      stream.resume();
      next();
    });

    extractor.on('finish', () => {
      resolve();
    });

    extractor.on('error', (err) => {
      reject(new Error(`Failed to extract tarball: ${err.message}`));
    });

    gunzip.on('error', (err) => {
      reject(new Error(`Failed to decompress tarball: ${err.message}`));
    });

    // 开始解压
    gunzip.pipe(extractor);
    gunzip.end(tarball);
  });
}

/**
 * Get the top-level directory name from a tarball
 *
 * 用于验证 tarball 结构或获取 skill 名称
 *
 * @param tarball - Gzipped tarball buffer
 * @returns Top-level directory name or null if not found
 *
 * @example
 * const skillName = await getTarballTopDir(tarball);
 * // Returns: 'planning-with-files'
 */
export async function getTarballTopDir(tarball: Buffer): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const gunzip = createGunzip();
    const extractor = extract();
    let topDir: string | null = null;

    extractor.on('entry', (header: Headers, stream, next) => {
      if (!topDir && header.name) {
        // 从第一个 entry 获取顶层目录
        const parts = header.name.split('/');
        if (parts.length > 0 && parts[0]) {
          topDir = parts[0];
        }
      }
      stream.resume();
      next();
    });

    extractor.on('finish', () => {
      resolve(topDir);
    });

    extractor.on('error', (err) => {
      reject(new Error(`Failed to read tarball: ${err.message}`));
    });

    gunzip.on('error', (err) => {
      reject(new Error(`Failed to decompress tarball: ${err.message}`));
    });

    gunzip.pipe(extractor);
    gunzip.end(tarball);
  });
}
