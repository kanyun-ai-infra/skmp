/**
 * Publisher - Handle Git information and publish payload building
 *
 * Extracts Git metadata and builds the payload for publishing to registry.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SkillJson } from '../types/index.js';
import type { ParsedSkill } from './skill-parser.js';

// ============================================================================
// Types
// ============================================================================

export interface GitInfo {
  isRepo: boolean;
  remoteUrl: string | null;
  currentBranch: string | null;
  currentCommit: string | null;
  commitDate: string | null;
  tag: string | null;
  tagCommit: string | null;
  isDirty: boolean;
  sourceRef: string | null;
}

export interface LoadedSkillForPublish {
  path: string;
  skillJson: SkillJson;
  skillMd: ParsedSkill | null;
  readme: string | null;
  files: string[];
}

export interface PublishPayload {
  version: string;
  description: string;
  gitRef: string;
  gitCommit: string;
  gitCommitDate?: string;
  repositoryUrl: string;
  sourceRef: string;
  skillJson: SkillJson;
  skillMd?: {
    name: string;
    description: string;
    license?: string;
    compatibility?: string;
    allowedTools?: string[];
  };
  readmePreview?: string;
  files: string[];
  entry: string;
  keywords?: string[];
  compatibility?: Record<string, string>;
  integrity: string;
}

export class PublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublishError';
  }
}

// ============================================================================
// Publisher Class
// ============================================================================

export class Publisher {
  /**
   * Get Git information from a skill directory
   */
  async getGitInfo(skillPath: string, specifiedTag?: string): Promise<GitInfo> {
    const info: GitInfo = {
      isRepo: false,
      remoteUrl: null,
      currentBranch: null,
      currentCommit: null,
      commitDate: null,
      tag: null,
      tagCommit: null,
      isDirty: false,
      sourceRef: null,
    };

    // Check if it's a git repository
    try {
      execSync('git rev-parse --git-dir', { cwd: skillPath, stdio: 'pipe' });
      info.isRepo = true;
    } catch {
      return info;
    }

    // Get remote URL
    try {
      info.remoteUrl = execSync('git remote get-url origin', {
        cwd: skillPath,
        encoding: 'utf-8',
      }).trim();

      // Parse to sourceRef format
      info.sourceRef = this.parseRemoteToSourceRef(info.remoteUrl);
    } catch {
      // No remote configured
    }

    // Get current branch
    try {
      info.currentBranch =
        execSync('git branch --show-current', {
          cwd: skillPath,
          encoding: 'utf-8',
        }).trim() || null;
    } catch {
      // Detached HEAD or other error
    }

    // Get current commit
    try {
      info.currentCommit = execSync('git rev-parse HEAD', {
        cwd: skillPath,
        encoding: 'utf-8',
      }).trim();

      // Get commit date
      info.commitDate = execSync('git show -s --format=%cI HEAD', {
        cwd: skillPath,
        encoding: 'utf-8',
      }).trim();
    } catch {
      // No commits yet
    }

    // Get tag
    if (specifiedTag) {
      // Use specified tag
      try {
        info.tagCommit = execSync(`git rev-parse "${specifiedTag}^{commit}"`, {
          cwd: skillPath,
          encoding: 'utf-8',
        }).trim();
        info.tag = specifiedTag;
      } catch {
        throw new PublishError(`Tag "${specifiedTag}" not found`);
      }
    } else {
      // Try to get tag on current commit
      try {
        const tag = execSync('git describe --exact-match --tags HEAD', {
          cwd: skillPath,
          encoding: 'utf-8',
        }).trim();
        info.tag = tag;
        info.tagCommit = info.currentCommit;
      } catch {
        // No tag on current commit
      }
    }

    // Check if working tree is dirty
    try {
      const status = execSync('git status --porcelain', {
        cwd: skillPath,
        encoding: 'utf-8',
      }).trim();
      info.isDirty = status.length > 0;
    } catch {
      // Ignore errors
    }

    return info;
  }

  /**
   * Parse remote URL to sourceRef format (e.g., github:user/repo)
   */
  parseRemoteToSourceRef(remoteUrl: string): string | null {
    // SSH format: git@github.com:user/repo.git
    const sshMatch = remoteUrl.match(/^git@([^:]+):([^/]+)\/(.+?)(\.git)?$/);
    if (sshMatch) {
      const [, host, owner, repo] = sshMatch;
      const registry = this.normalizeHost(host);
      return `${registry}:${owner}/${repo.replace(/\.git$/, '')}`;
    }

    // HTTPS format: https://github.com/user/repo.git
    const httpsMatch = remoteUrl.match(/^https?:\/\/([^/]+)\/([^/]+)\/(.+?)(\.git)?$/);
    if (httpsMatch) {
      const [, host, owner, repo] = httpsMatch;
      const registry = this.normalizeHost(host);
      return `${registry}:${owner}/${repo.replace(/\.git$/, '')}`;
    }

    return null;
  }

  /**
   * Normalize host to registry name
   */
  private normalizeHost(host: string): string {
    if (host === 'github.com') return 'github';
    if (host === 'gitlab.com') return 'gitlab';
    return host;
  }

  /**
   * Build publish payload
   */
  buildPayload(
    skill: {
      path: string;
      skillJson: SkillJson;
      skillMd: ParsedSkill | null;
      readme: string | null;
      files: string[];
    },
    gitInfo: GitInfo,
    integrity: string,
  ): PublishPayload {
    const { skillJson, skillMd, readme, files } = skill;

    const payload: PublishPayload = {
      version: skillJson.version,
      description: skillJson.description || '',
      gitRef: gitInfo.tag || gitInfo.currentCommit || 'HEAD',
      gitCommit: gitInfo.tagCommit || gitInfo.currentCommit || '',
      gitCommitDate: gitInfo.commitDate || undefined,
      repositoryUrl: gitInfo.remoteUrl || '',
      sourceRef: gitInfo.sourceRef || '',
      skillJson,
      files,
      entry: skillJson.entry || 'SKILL.md',
      integrity,
    };

    // Add optional fields
    if (skillMd) {
      payload.skillMd = {
        name: skillMd.name,
        description: skillMd.description,
        license: skillMd.license,
        compatibility: skillMd.compatibility,
        allowedTools: skillMd.allowedTools,
      };
    }

    if (readme) {
      payload.readmePreview = readme;
    }

    if (skillJson.keywords && skillJson.keywords.length > 0) {
      payload.keywords = skillJson.keywords;
    }

    if (skillJson.compatibility) {
      // Filter out undefined values from compatibility
      const compat: Record<string, string> = {};
      for (const [key, value] of Object.entries(skillJson.compatibility)) {
        if (value !== undefined) {
          compat[key] = value;
        }
      }
      if (Object.keys(compat).length > 0) {
        payload.compatibility = compat;
      }
    }

    return payload;
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Calculate total size of files
   */
  calculateTotalSize(skillPath: string, files: string[]): number {
    let total = 0;
    for (const file of files) {
      const filePath = path.join(skillPath, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        total += stats.size;
      }
    }
    return total;
  }
}

export default Publisher;
