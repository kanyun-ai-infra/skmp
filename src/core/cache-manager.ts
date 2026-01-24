import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ParsedSkillRef } from '../types/index.js';
import {
  copyDir,
  ensureDir,
  exists,
  getCacheDir,
  isDirectory,
  listDir,
  remove,
} from '../utils/fs.js';
import { clone, getCurrentCommit } from '../utils/git.js';
import { downloadAndExtract } from '../utils/http.js';
import { DEFAULT_EXCLUDE_FILES } from './installer.js';

/**
 * CacheManager - Manage global skill cache
 *
 * Cache directory structure:
 * ~/.reskill-cache/
 * ├── github/                          # Shorthand format registry
 * │   └── user/
 * │       └── skill/
 * │           ├── v1.0.0/
 * │           └── v1.1.0/
 * ├── github.com/                      # Git URL format, using host as directory
 * │   └── user/
 * │       └── private-skill/
 * │           └── v1.0.0/
 * └── gitlab.company.com/              # Private GitLab instance
 *     └── team/
 *         └── skill/
 *             └── v2.0.0/
 *
 * For Git URL format (SSH/HTTPS):
 * - git@github.com:user/repo.git -> github.com/user/repo/version
 * - https://gitlab.company.com/team/skill.git -> gitlab.company.com/team/skill/version
 */
export class CacheManager {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || getCacheDir();
  }

  /**
   * Get cache directory
   */
  getCacheDir(): string {
    return this.cacheDir;
  }

  /**
   * Get skill path in cache
   *
   * For different reference formats, cache paths are:
   * - github:user/repo@v1.0.0 -> ~/.reskill-cache/github/user/repo/v1.0.0
   * - git@github.com:user/repo.git@v1.0.0 -> ~/.reskill-cache/github.com/user/repo/v1.0.0
   * - https://gitlab.company.com/team/skill.git@v2.0.0 -> ~/.reskill-cache/gitlab.company.com/team/skill/v2.0.0
   */
  getSkillCachePath(parsed: ParsedSkillRef, version: string): string {
    return path.join(this.cacheDir, parsed.registry, parsed.owner, parsed.repo, version);
  }

  /**
   * Get cache path (alias for getSkillCachePath)
   */
  getCachePath(parsed: ParsedSkillRef, version: string): string {
    return this.getSkillCachePath(parsed, version);
  }

  /**
   * Check if skill is cached
   */
  isCached(parsed: ParsedSkillRef, version: string): boolean {
    const cachePath = this.getSkillCachePath(parsed, version);
    return exists(cachePath) && isDirectory(cachePath);
  }

  /**
   * Get cached skill
   */
  async get(
    parsed: ParsedSkillRef,
    version: string,
  ): Promise<{ path: string; commit: string } | null> {
    const cachePath = this.getSkillCachePath(parsed, version);

    if (!this.isCached(parsed, version)) {
      return null;
    }

    // Read cached commit info
    const commitFile = path.join(cachePath, '.reskill-commit');
    let commit = '';

    try {
      const fs = await import('node:fs');
      if (exists(commitFile)) {
        commit = fs.readFileSync(commitFile, 'utf-8').trim();
      }
    } catch {
      // Ignore read errors
    }

    return { path: cachePath, commit };
  }

  /**
   * Cache skill from Git repository
   */
  async cache(
    repoUrl: string,
    parsed: ParsedSkillRef,
    ref: string,
    version: string,
  ): Promise<{ path: string; commit: string }> {
    const cachePath = this.getSkillCachePath(parsed, version);

    // If exists, delete first
    if (exists(cachePath)) {
      remove(cachePath);
    }

    ensureDir(path.dirname(cachePath));

    // Clone repository
    const tempPath = `${cachePath}.tmp`;
    remove(tempPath);

    await clone(repoUrl, tempPath, { depth: 1, branch: ref });

    // Get commit hash
    const commit = await getCurrentCommit(tempPath);

    // If has subPath, only keep subdirectory
    if (parsed.subPath) {
      const subDir = path.join(tempPath, parsed.subPath);
      if (!exists(subDir)) {
        remove(tempPath);
        throw new Error(`Subpath ${parsed.subPath} not found in repository`);
      }
      copyDir(subDir, cachePath, { exclude: ['.git'] });
    } else {
      copyDir(tempPath, cachePath, { exclude: ['.git'] });
    }

    // Save commit info
    fs.writeFileSync(path.join(cachePath, '.reskill-commit'), commit);

    // Clean up temp directory
    remove(tempPath);

    return { path: cachePath, commit };
  }

  /**
   * Cache skill from HTTP/OSS URL
   *
   * Downloads and extracts an archive from the given URL.
   * Supports tar.gz, tgz, zip, and tar formats.
   *
   * @param url - HTTP/HTTPS URL to download from
   * @param parsed - Parsed skill reference
   * @param version - Version string for cache path
   * @returns Cache path and a hash of the download URL as commit identifier
   */
  async cacheFromHttp(
    url: string,
    parsed: ParsedSkillRef,
    version: string,
  ): Promise<{ path: string; commit: string }> {
    const cachePath = this.getSkillCachePath(parsed, version);

    // If exists, delete first
    if (exists(cachePath)) {
      remove(cachePath);
    }

    ensureDir(path.dirname(cachePath));

    // Download and extract to cache path
    await downloadAndExtract(url, cachePath);

    // Generate a commit-like identifier from URL and version
    // This serves as a pseudo-commit for HTTP sources
    const crypto = await import('node:crypto');
    const commit = crypto
      .createHash('sha256')
      .update(`${url}@${version}`)
      .digest('hex')
      .slice(0, 40);

    // Save commit info
    fs.writeFileSync(path.join(cachePath, '.reskill-commit'), commit);

    // Also save the source URL for reference
    fs.writeFileSync(path.join(cachePath, '.reskill-source'), url);

    return { path: cachePath, commit };
  }

  /**
   * Copy from cache to target directory
   *
   * Uses the same exclude rules as Installer to ensure consistency:
   * - DEFAULT_EXCLUDE_FILES (README.md, metadata.json, .reskill-commit)
   */
  async copyTo(parsed: ParsedSkillRef, version: string, destPath: string): Promise<void> {
    const cached = await this.get(parsed, version);

    if (!cached) {
      throw new Error(`Skill ${parsed.raw} version ${version} not found in cache`);
    }

    // If target exists, delete first
    if (exists(destPath)) {
      remove(destPath);
    }

    // Use same exclude rules as Installer for consistency
    copyDir(cached.path, destPath, { exclude: DEFAULT_EXCLUDE_FILES });
  }

  /**
   * Clear cache for specific skill
   */
  clearSkill(parsed: ParsedSkillRef, version?: string): void {
    if (version) {
      const cachePath = this.getSkillCachePath(parsed, version);
      remove(cachePath);
    } else {
      // Clear all versions
      const skillDir = path.join(this.cacheDir, parsed.registry, parsed.owner, parsed.repo);
      remove(skillDir);
    }
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    remove(this.cacheDir);
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalSkills: number; registries: string[] } {
    if (!exists(this.cacheDir)) {
      return { totalSkills: 0, registries: [] };
    }

    const registries = listDir(this.cacheDir).filter((name) =>
      isDirectory(path.join(this.cacheDir, name)),
    );

    let totalSkills = 0;

    for (const registry of registries) {
      const registryPath = path.join(this.cacheDir, registry);
      const owners = listDir(registryPath).filter((name) =>
        isDirectory(path.join(registryPath, name)),
      );

      for (const owner of owners) {
        const ownerPath = path.join(registryPath, owner);
        const repos = listDir(ownerPath).filter((name) => isDirectory(path.join(ownerPath, name)));
        totalSkills += repos.length;
      }
    }

    return { totalSkills, registries };
  }

  /**
   * Get the remote commit hash for a specific ref without cloning
   *
   * Uses `git ls-remote` to fetch the commit hash efficiently.
   *
   * @param repoUrl - Repository URL
   * @param ref - Git reference (branch, tag, or commit)
   * @returns Commit hash string
   */
  async getRemoteCommit(repoUrl: string, ref: string): Promise<string> {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    try {
      // Try to get commit for the ref
      const { stdout } = await execAsync(`git ls-remote ${repoUrl} ${ref}`, {
        encoding: 'utf-8',
      });

      if (stdout.trim()) {
        const [commit] = stdout.trim().split('\t');
        return commit;
      }

      // If ref is not found directly, try refs/heads/ and refs/tags/
      const { stdout: allRefs } = await execAsync(`git ls-remote ${repoUrl}`, {
        encoding: 'utf-8',
      });

      const lines = allRefs.trim().split('\n');
      for (const line of lines) {
        const [commit, refPath] = line.split('\t');
        if (refPath === `refs/heads/${ref}` || refPath === `refs/tags/${ref}` || refPath === ref) {
          return commit;
        }
      }

      // If still not found, return empty string (will trigger update)
      return '';
    } catch {
      // On error, return empty string to trigger update
      return '';
    }
  }
}

export default CacheManager;
