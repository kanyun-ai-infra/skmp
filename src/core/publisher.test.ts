/**
 * Publisher unit tests
 *
 * Tests for Git information extraction and publish payload building
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Publisher } from './publisher.js';

describe('Publisher', () => {
  let tempDir: string;
  let publisher: Publisher;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-publisher-test-'));
    publisher = new Publisher();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Helper functions
  function initGitRepo(): void {
    execSync('git init', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
  }

  function createFile(name: string, content: string): void {
    const filePath = path.join(tempDir, name);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
  }

  function gitCommit(message = 'test commit'): string {
    execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
    execSync(`git commit -m "${message}"`, { cwd: tempDir, stdio: 'pipe' });
    return execSync('git rev-parse HEAD', { cwd: tempDir, encoding: 'utf-8' }).trim();
  }

  function gitTag(tag: string): void {
    execSync(`git tag ${tag}`, { cwd: tempDir, stdio: 'pipe' });
  }

  function setRemote(url: string): void {
    execSync(`git remote add origin ${url}`, { cwd: tempDir, stdio: 'pipe' });
  }

  // ============================================================================
  // getGitInfo tests
  // ============================================================================

  describe('getGitInfo', () => {
    describe('repository detection', () => {
      it('should detect non-git directory', async () => {
        const info = await publisher.getGitInfo(tempDir);
        expect(info.isRepo).toBe(false);
      });

      it('should detect git repository', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();

        const info = await publisher.getGitInfo(tempDir);
        expect(info.isRepo).toBe(true);
      });
    });

    describe('commit information', () => {
      it('should get current commit hash', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        const commit = gitCommit();

        const info = await publisher.getGitInfo(tempDir);
        expect(info.currentCommit).toBe(commit);
        expect(info.currentCommit).toMatch(/^[a-f0-9]{40}$/);
      });

      it('should get commit date', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();

        const info = await publisher.getGitInfo(tempDir);
        expect(info.commitDate).not.toBeNull();
        // Should be ISO 8601 format
        expect(new Date(info.commitDate!).toISOString()).toBeTruthy();
      });

      it('should handle repo with no commits', async () => {
        initGitRepo();

        const info = await publisher.getGitInfo(tempDir);
        expect(info.isRepo).toBe(true);
        expect(info.currentCommit).toBeNull();
      });
    });

    describe('tag detection', () => {
      it('should detect tag on current commit', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();
        gitTag('v1.0.0');

        const info = await publisher.getGitInfo(tempDir);
        expect(info.tag).toBe('v1.0.0');
      });

      it('should return null when no tag on current commit', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();
        gitTag('v1.0.0');

        createFile('README.md', '# Test v2');
        gitCommit();

        const info = await publisher.getGitInfo(tempDir);
        expect(info.tag).toBeNull();
      });

      it('should use specified tag with --tag option', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();
        gitTag('v1.0.0');

        createFile('README.md', '# Test v2');
        gitCommit();
        gitTag('v2.0.0');

        const info = await publisher.getGitInfo(tempDir, 'v1.0.0');
        expect(info.tag).toBe('v1.0.0');
      });

      it('should throw for non-existent specified tag', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();

        await expect(publisher.getGitInfo(tempDir, 'v999.0.0')).rejects.toThrow('not found');
      });

      it('should get tag commit hash', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        const commit = gitCommit();
        gitTag('v1.0.0');

        const info = await publisher.getGitInfo(tempDir);
        expect(info.tagCommit).toBe(commit);
      });
    });

    describe('remote URL', () => {
      it('should get remote URL', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();
        setRemote('https://github.com/user/repo.git');

        const info = await publisher.getGitInfo(tempDir);
        expect(info.remoteUrl).toBe('https://github.com/user/repo.git');
      });

      it('should return null when no remote', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();

        const info = await publisher.getGitInfo(tempDir);
        expect(info.remoteUrl).toBeNull();
      });

      it('should parse SSH remote URL', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();
        setRemote('git@github.com:user/repo.git');

        const info = await publisher.getGitInfo(tempDir);
        expect(info.remoteUrl).toBe('git@github.com:user/repo.git');
        expect(info.sourceRef).toBe('github:user/repo');
      });

      it('should parse HTTPS remote URL', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();
        setRemote('https://github.com/user/repo.git');

        const info = await publisher.getGitInfo(tempDir);
        expect(info.sourceRef).toBe('github:user/repo');
      });

      it('should parse GitLab remote URL', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();
        setRemote('git@gitlab.com:user/repo.git');

        const info = await publisher.getGitInfo(tempDir);
        expect(info.sourceRef).toBe('gitlab:user/repo');
      });
    });

    describe('working tree status', () => {
      it('should detect clean working tree', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();

        const info = await publisher.getGitInfo(tempDir);
        expect(info.isDirty).toBe(false);
      });

      it('should detect dirty working tree with modified file', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();

        createFile('README.md', '# Test modified');

        const info = await publisher.getGitInfo(tempDir);
        expect(info.isDirty).toBe(true);
      });

      it('should detect dirty working tree with untracked file', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();

        createFile('new-file.txt', 'new content');

        const info = await publisher.getGitInfo(tempDir);
        expect(info.isDirty).toBe(true);
      });

      it('should detect dirty working tree with staged changes', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();

        createFile('new-file.txt', 'new content');
        execSync('git add .', { cwd: tempDir, stdio: 'pipe' });

        const info = await publisher.getGitInfo(tempDir);
        expect(info.isDirty).toBe(true);
      });
    });

    describe('branch information', () => {
      it('should get current branch name', async () => {
        initGitRepo();
        createFile('README.md', '# Test');
        gitCommit();

        const info = await publisher.getGitInfo(tempDir);
        // Default branch is usually 'master' or 'main'
        expect(['master', 'main']).toContain(info.currentBranch);
      });
    });
  });

  // ============================================================================
  // parseRemoteToSourceRef tests
  // ============================================================================

  describe('parseRemoteToSourceRef', () => {
    it('should parse GitHub SSH URL', () => {
      const ref = publisher.parseRemoteToSourceRef('git@github.com:user/repo.git');
      expect(ref).toBe('github:user/repo');
    });

    it('should parse GitHub HTTPS URL', () => {
      const ref = publisher.parseRemoteToSourceRef('https://github.com/user/repo.git');
      expect(ref).toBe('github:user/repo');
    });

    it('should parse GitHub HTTPS URL without .git', () => {
      const ref = publisher.parseRemoteToSourceRef('https://github.com/user/repo');
      expect(ref).toBe('github:user/repo');
    });

    it('should parse GitLab SSH URL', () => {
      const ref = publisher.parseRemoteToSourceRef('git@gitlab.com:user/repo.git');
      expect(ref).toBe('gitlab:user/repo');
    });

    it('should parse GitLab HTTPS URL', () => {
      const ref = publisher.parseRemoteToSourceRef('https://gitlab.com/user/repo.git');
      expect(ref).toBe('gitlab:user/repo');
    });

    it('should parse custom GitLab instance URL', () => {
      const ref = publisher.parseRemoteToSourceRef('git@gitlab.company.com:team/repo.git');
      expect(ref).toBe('gitlab.company.com:team/repo');
    });

    it('should return null for invalid URL', () => {
      const ref = publisher.parseRemoteToSourceRef('invalid-url');
      expect(ref).toBeNull();
    });

    it('should handle URL with nested path', () => {
      const ref = publisher.parseRemoteToSourceRef('https://github.com/org/team/repo.git');
      // This might be org:team/repo or handled differently
      expect(ref).not.toBeNull();
    });
  });

  // ============================================================================
  // buildPayload tests
  // ============================================================================

  describe('buildPayload', () => {
    it('should build complete payload with all fields', () => {
      const skill = {
        path: tempDir,
        skillJson: {
          name: 'my-skill',
          version: '1.0.0',
          description: 'Test skill',
          keywords: ['test', 'skill'],
          license: 'MIT',
          author: 'Test Author',
          entry: 'SKILL.md',
          compatibility: {
            cursor: '>=0.40',
            claude: '>=3.5',
          },
        },
        skillMd: {
          name: 'my-skill',
          description: 'A test skill',
          content: '# Content',
          rawContent: '---\nname: my-skill\n---\n# Content',
        },
        readme: '# My Skill\n\nThis is a test skill.',
        files: ['skill.json', 'SKILL.md', 'README.md'],
      };

      const gitInfo = {
        isRepo: true,
        remoteUrl: 'https://github.com/user/my-skill.git',
        currentBranch: 'main',
        currentCommit: 'abc1234567890def1234567890abc1234567890de',
        commitDate: '2026-01-24T00:00:00Z',
        tag: 'v1.0.0',
        tagCommit: 'abc1234567890def1234567890abc1234567890de',
        isDirty: false,
        sourceRef: 'github:user/my-skill',
      };

      const payload = publisher.buildPayload(skill, gitInfo, 'sha256-xxx');

      expect(payload.version).toBe('1.0.0');
      expect(payload.description).toBe('Test skill');
      expect(payload.gitRef).toBe('v1.0.0');
      expect(payload.gitCommit).toBe('abc1234567890def1234567890abc1234567890de');
      expect(payload.gitCommitDate).toBe('2026-01-24T00:00:00Z');
      expect(payload.repositoryUrl).toBe('https://github.com/user/my-skill.git');
      expect(payload.sourceRef).toBe('github:user/my-skill');
      expect(payload.integrity).toBe('sha256-xxx');
      expect(payload.keywords).toEqual(['test', 'skill']);
      expect(payload.entry).toBe('SKILL.md');
      expect(payload.files).toEqual(['skill.json', 'SKILL.md', 'README.md']);
      expect(payload.compatibility).toEqual({
        cursor: '>=0.40',
        claude: '>=3.5',
      });
      expect(payload.skillJson).toEqual(skill.skillJson);
      expect(payload.skillMd).toEqual({
        name: 'my-skill',
        description: 'A test skill',
      });
      expect(payload.readmePreview).toBe('# My Skill\n\nThis is a test skill.');
    });

    it('should use commit hash when no tag', () => {
      const skill = {
        path: tempDir,
        skillJson: {
          name: 'my-skill',
          version: '1.0.0',
          description: 'Test skill',
        },
        skillMd: null,
        readme: null,
        files: ['skill.json'],
      };

      const gitInfo = {
        isRepo: true,
        remoteUrl: 'https://github.com/user/my-skill.git',
        currentBranch: 'main',
        currentCommit: 'abc1234567890',
        commitDate: '2026-01-24T00:00:00Z',
        tag: null,
        tagCommit: null,
        isDirty: false,
        sourceRef: 'github:user/my-skill',
      };

      const payload = publisher.buildPayload(skill, gitInfo, 'sha256-xxx');

      expect(payload.gitRef).toBe('abc1234567890');
    });

    it('should handle missing optional fields', () => {
      const skill = {
        path: tempDir,
        skillJson: {
          name: 'my-skill',
          version: '1.0.0',
          description: 'Test skill',
        },
        skillMd: null,
        readme: null,
        files: ['skill.json'],
      };

      const gitInfo = {
        isRepo: true,
        remoteUrl: null,
        currentBranch: 'main',
        currentCommit: 'abc123',
        commitDate: null,
        tag: null,
        tagCommit: null,
        isDirty: false,
        sourceRef: null,
      };

      const payload = publisher.buildPayload(skill, gitInfo, 'sha256-xxx');

      expect(payload.version).toBe('1.0.0');
      expect(payload.repositoryUrl).toBe('');
      expect(payload.sourceRef).toBe('');
      expect(payload.skillMd).toBeUndefined();
      expect(payload.readmePreview).toBeUndefined();
      expect(payload.keywords).toBeUndefined();
      expect(payload.compatibility).toBeUndefined();
    });

    it('should use default entry when not specified', () => {
      const skill = {
        path: tempDir,
        skillJson: {
          name: 'my-skill',
          version: '1.0.0',
          description: 'Test skill',
          // no entry field
        },
        skillMd: null,
        readme: null,
        files: ['skill.json'],
      };

      const gitInfo = {
        isRepo: true,
        remoteUrl: null,
        currentBranch: 'main',
        currentCommit: 'abc123',
        commitDate: null,
        tag: null,
        tagCommit: null,
        isDirty: false,
        sourceRef: null,
      };

      const payload = publisher.buildPayload(skill, gitInfo, 'sha256-xxx');

      expect(payload.entry).toBe('SKILL.md');
    });
  });
});
