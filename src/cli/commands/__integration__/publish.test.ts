/**
 * CLI Integration Tests: publish command
 *
 * Tests for the publish command --dry-run validation
 * (API calls are not tested here, only local validation)
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createTempDir,
  getOutput,
  removeTempDir,
  runCli,
} from './helpers.js';

describe('CLI Integration: publish', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    removeTempDir(tempDir);
  });

  // Helper functions
  function createSkillJson(content: object): void {
    fs.writeFileSync(
      path.join(tempDir, 'skill.json'),
      JSON.stringify(content, null, 2),
    );
  }

  function createSkillMd(content: string): void {
    fs.writeFileSync(path.join(tempDir, 'SKILL.md'), content);
  }

  function initGitRepo(): void {
    execSync('git init', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
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
  // --help tests
  // ============================================================================

  describe('--help', () => {
    it('should show help message', () => {
      const { stdout, exitCode } = runCli('publish --help', tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Publish a skill to the registry');
      expect(stdout).toContain('--dry-run');
      expect(stdout).toContain('--registry');
      expect(stdout).toContain('--tag');
      expect(stdout).toContain('--yes');
    });

    it('should show alias pub', () => {
      const { stdout, exitCode } = runCli('pub --help', tempDir);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Publish a skill to the registry');
    });
  });

  // ============================================================================
  // --dry-run validation: skill.json
  // ============================================================================

  describe('--dry-run: skill.json validation', () => {
    it('should fail without skill.json', () => {
      const { exitCode } = runCli('publish --dry-run', tempDir);
      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('skill.json');
      expect(getOutput(result)).toContain('not found');
    });

    it('should fail with invalid JSON', () => {
      fs.writeFileSync(path.join(tempDir, 'skill.json'), '{ invalid json }');

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('skill.json');
    });

    it('should fail without name', () => {
      createSkillJson({
        version: '1.0.0',
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('name');
    });

    it('should fail without version', () => {
      createSkillJson({
        name: 'my-skill',
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('version');
    });

    it('should fail without description', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('description');
    });

    it('should fail with uppercase name', () => {
      createSkillJson({
        name: 'MySkill',
        version: '1.0.0',
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('lowercase');
    });

    it('should fail with invalid version format', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0',
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('semver');
    });

    it('should fail with name starting with hyphen', () => {
      createSkillJson({
        name: '-my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
    });

    it('should pass with valid skill.json', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'A helpful AI skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('Dry run');
      expect(getOutput(result)).toContain('my-skill');
      expect(getOutput(result)).toContain('1.0.0');
      expect(getOutput(result)).toContain('No changes made');
    });

    it('should collect multiple validation errors', () => {
      createSkillJson({
        name: 'MySkill',
        version: '1.0',
        // missing description
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      // Should report all errors
      const output = getOutput(result);
      expect(output).toContain('name');
      expect(output).toContain('version');
      expect(output).toContain('description');
    });
  });

  // ============================================================================
  // --dry-run validation: SKILL.md
  // ============================================================================

  describe('--dry-run: SKILL.md validation', () => {
    it('should warn when SKILL.md is missing', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('SKILL.md');
    });

    it('should pass with valid SKILL.md', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });
      createSkillMd(`---
name: my-skill
description: A test skill for validation
---
# My Skill

This is the skill content.`);

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('SKILL.md found');
    });

    it('should fail when SKILL.md name mismatches skill.json', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });
      createSkillMd(`---
name: different-skill
description: A different skill
---
# Content`);

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('mismatch');
    });

    it('should warn for SKILL.md without frontmatter', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });
      createSkillMd('# My Skill\n\nNo frontmatter here.');

      const result = runCli('publish --dry-run', tempDir);

      // Should pass but with warning
      expect(result.exitCode).toBe(0);
    });
  });

  // ============================================================================
  // --dry-run validation: Git information
  // ============================================================================

  describe('--dry-run: Git information', () => {
    it('should show commit information', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });
      initGitRepo();
      gitCommit();

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('Commit');
    });

    it('should show tag information', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });
      initGitRepo();
      gitCommit();
      gitTag('v1.0.0');

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('v1.0.0');
    });

    it('should show repository URL', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });
      initGitRepo();
      gitCommit();
      setRemote('https://github.com/user/my-skill.git');

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('github.com');
    });

    it('should warn about dirty working tree', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });
      initGitRepo();
      gitCommit();

      // Create uncommitted file
      fs.writeFileSync(path.join(tempDir, 'uncommitted.txt'), 'uncommitted content');

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('uncommitted');
    });

    it('should use specified tag with --tag', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });
      initGitRepo();
      gitCommit();
      gitTag('v1.0.0');

      // Add another commit
      fs.writeFileSync(path.join(tempDir, 'new-file.txt'), 'new content');
      gitCommit('second commit');
      gitTag('v2.0.0');

      const result = runCli('publish --dry-run --tag v1.0.0', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('v1.0.0');
    });

    it('should fail with non-existent tag', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });
      initGitRepo();
      gitCommit();

      const result = runCli('publish --dry-run --tag v999.0.0', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('not found');
    });

    it('should work without git repository', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      // Should pass but without git info
      expect(result.exitCode).toBe(0);
    });
  });

  // ============================================================================
  // --dry-run: Files listing
  // ============================================================================

  describe('--dry-run: Files listing', () => {
    it('should list files to publish', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });
      createSkillMd(`---
name: my-skill
description: Test
---
# Content`);

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('skill.json');
      expect(getOutput(result)).toContain('SKILL.md');
    });

    it('should include files from files array', () => {
      fs.mkdirSync(path.join(tempDir, 'examples'));
      fs.writeFileSync(path.join(tempDir, 'examples', 'basic.md'), '# Basic Example');

      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
        files: ['examples/'],
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('examples');
    });

    it('should show total file count and size', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });
      createSkillMd(`---
name: my-skill
description: Test
---
# Content`);

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toMatch(/\d+ files?/);
    });
  });

  // ============================================================================
  // --dry-run: Integrity hash
  // ============================================================================

  describe('--dry-run: Integrity hash', () => {
    it('should display integrity hash', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toMatch(/sha256-[a-f0-9]{64}/);
    });
  });

  // ============================================================================
  // --dry-run: Metadata display
  // ============================================================================

  describe('--dry-run: Metadata display', () => {
    it('should display keywords', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
        keywords: ['typescript', 'testing', 'ai'],
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('typescript');
      expect(getOutput(result)).toContain('testing');
    });

    it('should display license', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
        license: 'MIT',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('MIT');
    });

    it('should display compatibility', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
        compatibility: {
          cursor: '>=0.40',
          claude: '>=3.5',
        },
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('cursor');
      expect(getOutput(result)).toContain('>=0.40');
    });
  });

  // ============================================================================
  // Authentication check (without --dry-run)
  // ============================================================================

  describe('authentication check', () => {
    it('should fail without token when not using --dry-run', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });

      const result = runCli('publish --yes', tempDir);

      expect(result.exitCode).not.toBe(0);
      expect(getOutput(result)).toContain('login');
    });

    it('should not require auth for --dry-run', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      // Should not mention login
    });
  });

  // ============================================================================
  // Path argument
  // ============================================================================

  describe('path argument', () => {
    it('should publish from specified directory', () => {
      const subDir = path.join(tempDir, 'subdir');
      fs.mkdirSync(subDir);
      fs.writeFileSync(
        path.join(subDir, 'skill.json'),
        JSON.stringify({
          name: 'sub-skill',
          version: '1.0.0',
          description: 'A skill in subdirectory',
        }, null, 2),
      );

      const result = runCli(`publish ${subDir} --dry-run`, tempDir);

      expect(result.exitCode).toBe(0);
      expect(getOutput(result)).toContain('sub-skill');
    });

    it('should fail with non-existent directory', () => {
      const result = runCli('publish /nonexistent/path --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
    });
  });

  // ============================================================================
  // Custom entry file
  // ============================================================================

  describe('custom entry file', () => {
    it('should fail when custom entry file does not exist', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
        entry: 'CUSTOM.md',
      });

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('entry');
      expect(getOutput(result)).toContain('CUSTOM.md');
    });

    it('should pass when custom entry file exists', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'Test skill',
        entry: 'CUSTOM.md',
      });
      fs.writeFileSync(path.join(tempDir, 'CUSTOM.md'), '# Custom Entry');

      const result = runCli('publish --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
    });
  });
});
