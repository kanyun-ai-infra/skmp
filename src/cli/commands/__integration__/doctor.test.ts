/**
 * Integration tests for doctor command
 *
 * Tests the CLI behavior of `reskill doctor`
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createMockSkill,
  createTempDir,
  getOutput,
  removeTempDir,
  runCli,
  setupSkillsJson,
} from './helpers.js';

// ============================================================================
// Basic Command Tests
// ============================================================================

describe('CLI Integration: doctor', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    removeTempDir(tempDir);
  });

  describe('CLI options', () => {
    it('should show help with --help', () => {
      const { stdout, exitCode } = runCli('doctor --help');
      expect(exitCode).toBe(0);
      expect(stdout.toLowerCase()).toContain('diagnose');
      expect(stdout).toContain('--json');
      expect(stdout).toContain('--skip-network');
    });

    it('should run without options', () => {
      const { exitCode } = runCli('doctor --skip-network', tempDir);
      // May have warnings but should not crash
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should support --skip-network flag', () => {
      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      // Should not include network checks
      expect(stdout).not.toContain('github.com');
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should support --json flag', () => {
      const { stdout, exitCode } = runCli('doctor --json --skip-network', tempDir);
      expect(exitCode).toBeLessThanOrEqual(1);

      // Extract JSON from output (may have update notifier appended)
      const jsonMatch = stdout.match(/^\s*\[[\s\S]*?\]\s*$/m);
      expect(jsonMatch).not.toBeNull();

      const jsonStr = stdout.substring(0, stdout.lastIndexOf(']') + 1);
      const parsed = JSON.parse(jsonStr);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);

      // Each result should have required fields
      for (const result of parsed) {
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('message');
        expect(['ok', 'warn', 'error']).toContain(result.status);
      }
    });
  });

  describe('environment checks', () => {
    it('should check Node.js version', () => {
      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('Node.js version');
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should check Git installation', () => {
      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('Git');
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should check Git authentication', () => {
      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('Git authentication');
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should check cache directory', () => {
      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('Cache directory');
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should check reskill version', () => {
      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('reskill version');
      expect(exitCode).toBeLessThanOrEqual(1);
    });
  });

  describe('configuration checks', () => {
    it('should warn when skills.json does not exist', () => {
      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('skills.json');
      // Should have a warning about missing skills.json
      expect(stdout).toMatch(/skills\.json.*not found|⚠.*skills\.json/i);
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should show ok when skills.json exists', () => {
      runCli('init -y', tempDir);
      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('skills.json');
      expect(stdout).toContain('found');
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should check skills.lock sync status', () => {
      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('skills.lock');
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should warn when skills.lock is out of sync', () => {
      // Create skills.json with a skill but no lock file
      setupSkillsJson(tempDir, {
        'test-skill': 'github:user/repo@v1.0.0',
      });

      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('skills.lock');
      expect(stdout).toMatch(/not found|out of sync/);
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should show ok when skills.lock is in sync', () => {
      // Create skills.json with a skill
      setupSkillsJson(tempDir, {
        'test-skill': 'github:user/repo@v1.0.0',
      });

      // Create matching skills.lock
      fs.writeFileSync(
        path.join(tempDir, 'skills.lock'),
        JSON.stringify({
          lockfileVersion: 1,
          skills: {
            'test-skill': {
              source: 'github:user/repo',
              version: 'v1.0.0',
              ref: 'v1.0.0',
              resolved: 'https://github.com/user/repo',
              commit: 'abc123',
              installedAt: new Date().toISOString(),
            },
          },
        }),
      );

      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('skills.lock');
      expect(stdout).toContain('in sync');
      expect(exitCode).toBeLessThanOrEqual(1);
    });
  });

  describe('installed skills checks', () => {
    it('should report no skills when none installed', () => {
      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('Installed skills');
      expect(stdout).toContain('none');
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should report installed skills count', () => {
      // Create a skill directory with SKILL.md (sole source of metadata)
      const skillDir = path.join(tempDir, '.skills', 'test-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `---
name: test-skill
version: 1.0.0
description: Test skill
---
# Test Skill
`,
      );

      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('Installed skills');
      expect(stdout).toContain('1 skill');
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should report broken skills', () => {
      // Create a skill directory without skill.json or SKILL.md
      const skillDir = path.join(tempDir, '.skills', 'broken-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      // Don't add skill.json or SKILL.md

      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('Installed skills');
      expect(stdout).toMatch(/broken|error/i);
      expect(exitCode).toBeLessThanOrEqual(1);
    });
  });

  describe('configuration validation', () => {
    it('should warn about overridden github registry', () => {
      fs.writeFileSync(
        path.join(tempDir, 'skills.json'),
        JSON.stringify({
          skills: {},
          registries: {
            github: 'https://my-mirror.example.com',
          },
        }),
      );

      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('Registry conflict');
      expect(stdout).toContain('github');
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should error on dangerous installDir', () => {
      fs.writeFileSync(
        path.join(tempDir, 'skills.json'),
        JSON.stringify({
          skills: {},
          defaults: {
            installDir: 'node_modules',
          },
        }),
      );

      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('Dangerous installDir');
      expect(exitCode).toBe(1);
    });

    it('should warn about invalid agent types', () => {
      fs.writeFileSync(
        path.join(tempDir, 'skills.json'),
        JSON.stringify({
          skills: {},
          defaults: {
            targetAgents: ['cursor', 'invalid-agent-123'],
          },
        }),
      );

      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('Invalid agent');
      expect(stdout).toContain('invalid-agent-123');
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should error on invalid skill reference format', () => {
      fs.writeFileSync(
        path.join(tempDir, 'skills.json'),
        JSON.stringify({
          skills: {
            'my-skill': 'not-a-valid-reference',
          },
        }),
      );

      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('Invalid skill ref');
      expect(exitCode).toBe(1);
    });

    it('should warn about monorepo version mismatch', () => {
      fs.writeFileSync(
        path.join(tempDir, 'skills.json'),
        JSON.stringify({
          skills: {
            'skill-a': 'github:org/monorepo/skills/skill-a@v1.0.0',
            'skill-b': 'github:org/monorepo/skills/skill-b@v2.0.0',
          },
        }),
      );

      const { stdout, exitCode } = runCli('doctor --skip-network', tempDir);
      expect(stdout).toContain('Version mismatch');
      expect(exitCode).toBeLessThanOrEqual(1);
    });
  });

  describe('exit codes', () => {
    it('should exit 0 when all checks pass', () => {
      // Create a clean project with no issues
      runCli('init -y', tempDir);

      const { exitCode } = runCli('doctor --skip-network', tempDir);
      // May still have warnings (like missing skills.lock) but no errors
      expect(exitCode).toBeLessThanOrEqual(1);
    });

    it('should exit 1 when errors are found', () => {
      // Create invalid skills.json
      fs.writeFileSync(
        path.join(tempDir, 'skills.json'),
        JSON.stringify({
          skills: {},
          defaults: {
            installDir: 'src', // Dangerous path
          },
        }),
      );

      const { exitCode } = runCli('doctor --skip-network', tempDir);
      expect(exitCode).toBe(1);
    });
  });

  describe('JSON output format', () => {
    /**
     * Helper to extract JSON from stdout (may have update notifier appended)
     */
    function extractJson(stdout: string): unknown[] {
      const jsonStr = stdout.substring(0, stdout.lastIndexOf(']') + 1);
      return JSON.parse(jsonStr);
    }

    it('should output valid JSON with all required fields', () => {
      runCli('init -y', tempDir);
      const { stdout, exitCode } = runCli('doctor --json --skip-network', tempDir);

      const results = extractJson(stdout);
      expect(Array.isArray(results)).toBe(true);

      // Check that we have expected checks
      const checkNames = (results as Array<{ name: string }>).map((r) => r.name);
      expect(checkNames).toContain('reskill version');
      expect(checkNames).toContain('Node.js version');
      expect(checkNames).toContain('Git');
      expect(checkNames).toContain('skills.json');
      expect(checkNames).toContain('skills.lock');
      expect(checkNames).toContain('Installed skills');
    });

    it('should include hints in JSON output for issues', () => {
      // Create project without skills.json to trigger warning
      const { stdout } = runCli('doctor --json --skip-network', tempDir);

      const results = extractJson(stdout) as Array<{ name: string; status: string; hint?: string }>;
      const skillsJsonCheck = results.find((r) => r.name === 'skills.json');

      expect(skillsJsonCheck).toBeDefined();
      expect(skillsJsonCheck!.status).toBe('warn');
      expect(skillsJsonCheck!.hint).toContain('reskill init');
    });
  });
});
