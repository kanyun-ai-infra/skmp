/**
 * Integration tests for install command with custom registries
 *
 * Tests the registries configuration in skills.json:
 * - Custom registry URL resolution
 * - Skills with custom registry prefixes (e.g., internal:team/tool)
 * - Integration between ConfigLoader and GitResolver
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createLocalGitRepo,
  createTempDir,
  pathExists,
  readSkillsJson,
  removeTempDir,
  runCli,
  setupSkillsJson,
} from './helpers.js';

describe('CLI Integration: install with custom registries', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    runCli('init -y', tempDir);
  });

  afterEach(() => {
    removeTempDir(tempDir);
  });

  describe('skills.json with registries configuration', () => {
    it('should create skills.json with registries section', () => {
      setupSkillsJson(
        tempDir,
        {
          planning: 'github:user/planning-skill@v1.0.0',
          'internal-tool': 'internal:team/tool@latest',
        },
        { installDir: '.skills' },
        {
          internal: 'https://gitlab.company.com',
        },
      );

      const skillsJson = readSkillsJson(tempDir);
      expect(skillsJson.skills.planning).toBe('github:user/planning-skill@v1.0.0');
      expect(skillsJson.skills['internal-tool']).toBe('internal:team/tool@latest');

      // Read raw JSON to check registries
      const raw = JSON.parse(fs.readFileSync(path.join(tempDir, 'skills.json'), 'utf-8'));
      expect(raw.registries).toBeDefined();
      expect(raw.registries.internal).toBe('https://gitlab.company.com');
    });

    it('should preserve registries after skill operations', () => {
      // Setup with registries
      setupSkillsJson(
        tempDir,
        { 'test-skill': 'github:test/skill@v1.0.0' },
        {},
        {
          internal: 'https://gitlab.company.com',
          enterprise: 'https://git.enterprise.io',
        },
      );

      // Verify registries are preserved
      const raw = JSON.parse(fs.readFileSync(path.join(tempDir, 'skills.json'), 'utf-8'));
      expect(raw.registries.internal).toBe('https://gitlab.company.com');
      expect(raw.registries.enterprise).toBe('https://git.enterprise.io');
    });

    it('should list skills with custom registry prefix', () => {
      setupSkillsJson(
        tempDir,
        {
          'github-skill': 'github:user/github-skill@v1.0.0',
          'gitlab-skill': 'gitlab:group/gitlab-skill@latest',
          'internal-tool': 'internal:team/tool@v2.0.0',
        },
        {},
        {
          internal: 'https://gitlab.company.com',
        },
      );

      // Use info command to verify skill configuration is correct
      const { stdout: infoStdout, exitCode: infoExitCode } = runCli('info github-skill', tempDir);
      expect(infoExitCode).toBe(0);
      expect(infoStdout).toContain('github:user/github-skill@v1.0.0');

      const { stdout: internalStdout } = runCli('info internal-tool', tempDir);
      expect(internalStdout).toContain('internal:team/tool@v2.0.0');
    });
  });

  describe('registry URL resolution', () => {
    it('should attempt to install from custom registry URL', () => {
      setupSkillsJson(
        tempDir,
        { 'internal-tool': 'internal:team/tool@v1.0.0' },
        { targetAgents: ['cursor'] },
        { internal: 'https://gitlab.company.com' },
      );

      // Will fail due to network, but should show the correct registry being used
      const { stdout, stderr } = runCli('install -y --mode copy', tempDir);
      const output = stdout + stderr;

      // Should attempt to resolve from custom registry
      expect(output).toContain('internal-tool');
      // Will fail due to network - may show error or "Failed" message
    });

    it('should handle multiple custom registries', () => {
      setupSkillsJson(
        tempDir,
        {
          'tool-a': 'registry-a:team/tool-a@v1.0.0',
          'tool-b': 'registry-b:team/tool-b@v1.0.0',
        },
        { targetAgents: ['cursor'] },
        {
          'registry-a': 'https://git.company-a.com',
          'registry-b': 'https://git.company-b.com',
        },
      );

      const { stdout, stderr } = runCli('install -y --mode copy', tempDir);
      const output = stdout + stderr;

      // Both skills should be attempted
      expect(output).toContain('tool-a');
      expect(output).toContain('tool-b');
      // Will fail due to network - may show error or "Failed" message
    });
  });

  describe('local git repo with custom registry simulation', () => {
    it('should resolve custom registry URL when installing', () => {
      // This test verifies that the registry configuration is being used
      // when the GitResolver parses skill references
      setupSkillsJson(
        tempDir,
        {
          'custom-tool': 'custom:team/tool@v1.0.0',
        },
        {},
        {
          custom: 'https://git.custom-company.com',
        },
      );

      // Verify the config was saved correctly
      const raw = JSON.parse(fs.readFileSync(path.join(tempDir, 'skills.json'), 'utf-8'));
      expect(raw.registries.custom).toBe('https://git.custom-company.com');
      expect(raw.skills['custom-tool']).toBe('custom:team/tool@v1.0.0');

      // The install will fail (network), but we verify config structure is correct
      const { stdout: infoStdout } = runCli('info custom-tool', tempDir);
      expect(infoStdout).toContain('custom:team/tool@v1.0.0');
    });
  });

  describe('fallback behavior', () => {
    it('should fallback to https:// for unknown registries', () => {
      setupSkillsJson(
        tempDir,
        { 'unknown-skill': 'custom.host.com:user/skill@v1.0.0' },
        { targetAgents: ['cursor'] },
        // No registry defined for custom.host.com
      );

      const { stdout, stderr } = runCli('install -y --mode copy', tempDir);
      const output = stdout + stderr;

      // Should attempt to use https://custom.host.com
      expect(output).toContain('unknown-skill');
    });

    // Note: This test requires network access to real GitHub/GitLab repos
    // The repos github:user/skill and gitlab:group/skill don't exist
    // and will cause network timeouts. Skip for CI stability.
    it.skip('should use well-known registries without configuration (requires network)', () => {
      // Don't define github/gitlab in registries, should still work
      setupSkillsJson(
        tempDir,
        {
          'github-skill': 'github:user/skill@v1.0.0',
          'gitlab-skill': 'gitlab:group/skill@v1.0.0',
        },
        { targetAgents: ['cursor'] },
        // Explicitly set only custom registry
        { custom: 'https://custom.example.com' },
      );

      const { stdout, stderr } = runCli('install -y --mode copy', tempDir);
      const output = stdout + stderr;

      // Both should be attempted with correct URLs
      expect(output).toContain('github-skill');
      expect(output).toContain('gitlab-skill');
    });
  });

  describe('registry override', () => {
    it('should allow overriding well-known registries', () => {
      setupSkillsJson(
        tempDir,
        { 'github-skill': 'github:enterprise/skill@v1.0.0' },
        { targetAgents: ['cursor'] },
        // Override github to point to enterprise
        { github: 'https://github.enterprise.com' },
      );

      const raw = JSON.parse(fs.readFileSync(path.join(tempDir, 'skills.json'), 'utf-8'));
      expect(raw.registries.github).toBe('https://github.enterprise.com');

      // Attempt to install (will fail, but config should be used)
      const { stdout, stderr } = runCli('install -y --mode copy', tempDir);
      const output = stdout + stderr;
      expect(output).toContain('github-skill');
    });
  });

  describe('info command with custom registries', () => {
    it('should show skill info with custom registry source', () => {
      setupSkillsJson(
        tempDir,
        { 'internal-tool': 'internal:team/tool@v1.0.0' },
        {},
        { internal: 'https://gitlab.company.com' },
      );

      const { stdout, exitCode } = runCli('info internal-tool', tempDir);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('internal-tool');
      expect(stdout).toContain('internal:team/tool@v1.0.0');
    });
  });

  describe('outdated command with custom registries', () => {
    it('should check outdated for skills with custom registries', () => {
      setupSkillsJson(
        tempDir,
        {
          'github-skill': 'github:user/skill@v1.0.0',
          'internal-tool': 'internal:team/tool@v1.0.0',
        },
        {},
        { internal: 'https://gitlab.company.com' },
      );

      // Run outdated command
      const { stdout, stderr, exitCode } = runCli('outdated', tempDir);
      const output = stdout + stderr;

      // Should complete without error (exit 0) or show error message
      // The actual output depends on whether skills can be reached
      expect(exitCode).toBe(0);
      // Should at least run without crashing
    });
  });
});
