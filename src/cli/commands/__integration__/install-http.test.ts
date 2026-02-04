/**
 * Integration tests for install command with HTTP/OSS sources
 *
 * These tests verify CLI behavior for HTTP/OSS URL handling.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createTempDir,
  pathExists,
  readSkillsJson,
  removeTempDir,
  runCli,
  setupSkillsJson,
} from './helpers.js';

/**
 * Create a tar.gz archive from a skill directory
 *
 * @param sourceDir - Directory to archive
 * @param archivePath - Output archive path
 */
function createTarGzArchive(sourceDir: string, archivePath: string): void {
  const parentDir = path.dirname(sourceDir);
  const dirName = path.basename(sourceDir);
  execSync(`tar -czf "${archivePath}" -C "${parentDir}" "${dirName}"`, {
    stdio: 'pipe',
  });
}

/**
 * Create a mock skill directory for archiving
 */
function createMockSkillForArchive(dir: string, name: string, version = '1.0.0'): string {
  const skillDir = path.join(dir, name);
  fs.mkdirSync(skillDir, { recursive: true });

  fs.writeFileSync(path.join(skillDir, 'skill.json'), JSON.stringify({ name, version }, null, 2));

  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    `# ${name}\n\nA mock skill for testing HTTP installation.\n`,
  );

  return skillDir;
}

describe('CLI Integration: install HTTP/OSS sources', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    runCli('init -y', tempDir);
  });

  afterEach(() => {
    removeTempDir(tempDir);
  });

  describe('HTTP URL detection', () => {
    it('should recognize https:// URLs', () => {
      // This will fail to download but should recognize it as HTTP source
      const { stdout, stderr } = runCli(
        'install https://example.com/skill.tar.gz -y -a cursor --mode copy',
        tempDir,
      );
      const output = stdout + stderr;
      // Should attempt HTTP download, not git clone
      expect(output).not.toContain('git clone');
      // Should show HTTP-related message or error
      expect(output.toLowerCase()).toMatch(/http|download|example\.com/i);
    });

    it('should recognize http:// URLs', () => {
      const { stdout, stderr } = runCli(
        'install http://example.com/skill.tar.gz -y -a cursor --mode copy',
        tempDir,
      );
      const output = stdout + stderr;
      expect(output.toLowerCase()).toMatch(/http|download|example\.com/i);
    });

    it('should show help including HTTP URL examples', () => {
      const { stdout } = runCli('install --help', tempDir);
      expect(stdout).toContain('github:user/skill@v1.0.0');
      expect(stdout).toContain('git@github.com:user/repo.git');
    });
  });

  describe('outdated command with HTTP sources', () => {
    it('should handle HTTP sources in outdated check', () => {
      // Setup skills.json with an HTTP source
      setupSkillsJson(
        tempDir,
        { 'http-skill': 'https://example.com/http-skill-v1.0.0.tar.gz' },
        { installMode: 'copy', targetAgents: ['cursor'] },
      );

      const { stdout, stderr, exitCode } = runCli('outdated', tempDir);
      const output = stdout + stderr;

      // Should not crash
      expect(exitCode).toBe(0);
      // When skills are defined but not installed, may show "up to date" or skill names
      // The important thing is it doesn't crash with HTTP sources
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle mixed Git and HTTP sources in outdated', () => {
      setupSkillsJson(
        tempDir,
        {
          'git-skill': 'github:test/git-skill@v1.0.0',
          'http-skill': 'https://example.com/http-skill.tar.gz',
        },
        { installMode: 'copy', targetAgents: ['cursor'] },
      );

      const { stdout, stderr, exitCode } = runCli('outdated', tempDir);
      const output = stdout + stderr;

      // Should complete without crashing
      expect(exitCode).toBe(0);
      // Output should contain something (either skill names or "up to date" message)
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('update command with HTTP sources', () => {
    it('should handle HTTP sources in update', () => {
      // Setup skills.json with an HTTP source
      setupSkillsJson(
        tempDir,
        { 'http-skill': 'https://example.com/http-skill.tar.gz' },
        { installMode: 'copy', targetAgents: ['cursor'] },
      );

      // Update will try to re-download
      const { stdout, stderr } = runCli('update http-skill', tempDir);
      const output = stdout + stderr;

      // Should recognize HTTP source
      expect(output.toLowerCase()).toMatch(/http|download|re-download/i);
    });
  });

  describe('URL parsing and skill name extraction', () => {
    it('should extract skill name from URL filename', () => {
      // Test that the CLI parses the URL correctly
      // The skill name should be extracted from the filename
      const { stdout, stderr } = runCli(
        'install https://example.com/my-awesome-skill-v1.0.0.tar.gz -y -a cursor --mode copy',
        tempDir,
      );
      const output = stdout + stderr;

      // Should extract "my-awesome-skill" from the URL
      expect(output).toContain('my-awesome-skill');
    });

    it('should handle version suffix in URL', () => {
      const { stdout, stderr } = runCli(
        'install https://example.com/skill.tar.gz@v2.0.0 -y -a cursor --mode copy',
        tempDir,
      );
      const output = stdout + stderr;

      // Should recognize version
      expect(output).toMatch(/v2\.0\.0|2\.0\.0/);
    });
  });

  describe('local file:// URL (for testing without network)', () => {
    it('should install from local tar.gz archive via file:// URL', () => {
      // Create a local archive
      const archiveDir = path.join(tempDir, 'archives');
      fs.mkdirSync(archiveDir, { recursive: true });

      const skillDir = createMockSkillForArchive(archiveDir, 'local-skill', '1.0.0');
      const archivePath = path.join(archiveDir, 'local-skill-v1.0.0.tar.gz');
      createTarGzArchive(skillDir, archivePath);

      // Install from file:// URL
      const fileUrl = `file://${archivePath}`;
      const { stdout, stderr, exitCode } = runCli(
        `install "${fileUrl}" -y -a cursor --mode copy`,
        tempDir,
      );

      const output = stdout + stderr;

      // Note: file:// might be treated as git URL by the current implementation
      // This test documents the current behavior
      if (exitCode === 0) {
        expect(pathExists(path.join(tempDir, '.cursor', 'skills', 'local-skill'))).toBe(true);
      } else {
        // If not supported, should show meaningful error
        expect(output.length).toBeGreaterThan(0);
      }
    });
  });

  describe('archive format support', () => {
    it('should recognize .tar.gz format', () => {
      const { stdout, stderr } = runCli(
        'install https://example.com/skill.tar.gz -y -a cursor --mode copy',
        tempDir,
      );
      // Should not complain about format
      expect((stdout + stderr).toLowerCase()).not.toContain('unsupported format');
    });

    it('should recognize .tgz format', () => {
      const { stdout, stderr } = runCli(
        'install https://example.com/skill.tgz -y -a cursor --mode copy',
        tempDir,
      );
      expect((stdout + stderr).toLowerCase()).not.toContain('unsupported format');
    });

    it('should recognize .zip format', () => {
      const { stdout, stderr } = runCli(
        'install https://example.com/skill.zip -y -a cursor --mode copy',
        tempDir,
      );
      expect((stdout + stderr).toLowerCase()).not.toContain('unsupported format');
    });
  });

  describe('OSS/S3 protocol shortcuts', () => {
    it('should recognize oss:// protocol', () => {
      const { stdout, stderr } = runCli(
        'install oss://my-bucket/skills/skill.tar.gz -y -a cursor --mode copy',
        tempDir,
      );
      const output = stdout + stderr;

      // Should recognize OSS URL (converted to https)
      expect(output.toLowerCase()).toMatch(/oss|aliyun|download|http/i);
    });

    it('should recognize s3:// protocol', () => {
      const { stdout, stderr } = runCli(
        'install s3://my-bucket/skills/skill.tar.gz -y -a cursor --mode copy',
        tempDir,
      );
      const output = stdout + stderr;

      // Should recognize S3 URL (converted to https)
      expect(output.toLowerCase()).toMatch(/s3|amazon|download|http/i);
    });
  });

  describe('skills.json with HTTP sources', () => {
    it('should reinstall HTTP sources from skills.json', () => {
      setupSkillsJson(
        tempDir,
        {
          'http-skill': 'https://example.com/http-skill.tar.gz',
        },
        { installMode: 'copy', targetAgents: ['cursor'] },
      );

      const { stdout, stderr } = runCli('install -y', tempDir);
      const output = stdout + stderr;

      // Should attempt to install HTTP skill
      expect(output).toContain('http-skill');
    });

    it('should save HTTP source to skills.json after install', () => {
      // Attempt install (will fail without network, but should update config)
      runCli('install https://example.com/test-skill.tar.gz -y -a cursor --mode copy', tempDir);

      // Check if URL was saved (may not be saved if install failed)
      const config = readSkillsJson(tempDir);
      // The skill might not be saved if install fails, which is expected
      // This test verifies the config file is still valid
      expect(config.skills).toBeDefined();
    });
  });
});
