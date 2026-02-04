/**
 * Registry Resolver (Step 5.1)
 *
 * Resolves skill references from npm-style registries:
 * - Private registry: @scope/name[@version] (e.g., @kanyun/planning-with-files@2.4.5)
 * - Public registry: name[@version] (e.g., my-skill@1.0.0)
 *
 * Uses RegistryClient to download and verify skills.
 */

import {
  getRegistryUrl,
  getShortName,
  type ParsedSkillIdentifier,
  parseSkillIdentifier,
} from '../utils/registry-scope.js';
import { extractTarballBuffer, getTarballTopDir } from './extractor.js';
import { RegistryClient } from './registry-client.js';

// ============================================================================
// Types
// ============================================================================

export interface RegistryResolveResult {
  /** Parsed skill identifier */
  parsed: ParsedSkillIdentifier;
  /** Short skill name (without scope) */
  shortName: string;
  /** Resolved version */
  version: string;
  /** Registry URL */
  registryUrl: string;
  /** Downloaded tarball buffer */
  tarball: Buffer;
  /** Integrity hash from server */
  integrity: string;
}

// ============================================================================
// RegistryResolver Class
// ============================================================================

export class RegistryResolver {
  /**
   * Check if a reference is a registry source (not Git or HTTP)
   *
   * Registry formats:
   * - @scope/name[@version] - private registry
   * - name[@version] - public registry (if not matching other formats)
   *
   * Explicitly excluded:
   * - Git SSH: git@github.com:user/repo.git
   * - Git HTTPS: https://github.com/user/repo.git
   * - GitHub web: https://github.com/user/repo/tree/...
   * - HTTP/OSS: https://example.com/skill.tar.gz
   * - Registry shorthand: github:user/repo, gitlab:org/repo
   */
  static isRegistryRef(ref: string): boolean {
    // 排除 Git SSH 格式 (git@...)
    if (ref.startsWith('git@') || ref.startsWith('git://')) {
      return false;
    }

    // 排除 .git 结尾的 URL
    if (ref.includes('.git')) {
      return false;
    }

    // 排除 HTTP/HTTPS/OSS URL
    if (
      ref.startsWith('http://') ||
      ref.startsWith('https://') ||
      ref.startsWith('oss://') ||
      ref.startsWith('s3://')
    ) {
      return false;
    }

    // 排除 registry shorthand 格式 (github:, gitlab:, custom.com:)
    // 这类格式是 "registry:owner/repo" 而不是 "@scope/name"
    if (/^[a-zA-Z0-9.-]+:[^@]/.test(ref)) {
      return false;
    }

    // 检查是否是 @scope/name 格式（私有 registry）
    if (ref.startsWith('@') && ref.includes('/')) {
      // @scope/name 或 @scope/name@version
      const scopeNamePattern = /^@[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(@[a-zA-Z0-9._-]+)?$/;
      return scopeNamePattern.test(ref);
    }

    // 检查是否是简单的 name 或 name@version 格式（公共 registry）
    // 简单名称只包含字母、数字、连字符、下划线和点
    const namePattern = /^[a-zA-Z0-9._-]+(@[a-zA-Z0-9._-]+)?$/;
    return namePattern.test(ref);
  }

  /**
   * Resolve a registry skill reference
   *
   * @param ref - Skill reference (e.g., "@kanyun/planning-with-files@2.4.5" or "my-skill@latest")
   * @returns Resolved skill information including downloaded tarball
   *
   * @example
   * const result = await resolver.resolve('@kanyun/planning-with-files@2.4.5');
   * console.log(result.shortName); // 'planning-with-files'
   * console.log(result.version); // '2.4.5'
   */
  async resolve(ref: string): Promise<RegistryResolveResult> {
    // 1. 解析 skill 标识
    const parsed = parseSkillIdentifier(ref);
    const shortName = getShortName(parsed.fullName);

    // 2. 获取 registry URL
    const registryUrl = getRegistryUrl(parsed.scope);

    // 3. 创建 client 并解析版本
    const client = new RegistryClient({ registry: registryUrl });
    const version = await client.resolveVersion(parsed.fullName, parsed.version);

    // 4. 下载 tarball
    const { tarball, integrity } = await client.downloadSkill(parsed.fullName, version);

    // 5. 验证 integrity
    const isValid = RegistryClient.verifyIntegrity(tarball, integrity);
    if (!isValid) {
      throw new Error(`Integrity verification failed for ${ref}`);
    }

    return {
      parsed,
      shortName,
      version,
      registryUrl,
      tarball,
      integrity,
    };
  }

  /**
   * Extract tarball to a target directory
   *
   * @param tarball - Tarball buffer
   * @param destDir - Destination directory
   * @returns Path to the extracted skill directory
   */
  async extract(tarball: Buffer, destDir: string): Promise<string> {
    await extractTarballBuffer(tarball, destDir);

    // 获取顶层目录名（即 skill 名称）
    const topDir = await getTarballTopDir(tarball);
    if (topDir) {
      return `${destDir}/${topDir}`;
    }

    return destDir;
  }
}
