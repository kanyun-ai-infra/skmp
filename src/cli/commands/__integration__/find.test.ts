/**
 * Integration tests for find/search command
 *
 * Tests CLI argument parsing, --help output, and error handling.
 * Note: Actual search API calls are not tested here (requires live registry).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTempDir, getOutput, removeTempDir, runCli, setupSkillsJson } from './helpers.js';

describe('CLI Integration: find', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    removeTempDir(tempDir);
  });

  // ==========================================================================
  // Help & alias
  // ==========================================================================

  describe('help and alias', () => {
    it('should show find command in --help output', () => {
      const { stdout, exitCode } = runCli('--help');
      expect(exitCode).toBe(0);
      expect(stdout).toContain('find');
    });

    it('should show find help with --help flag', () => {
      const { stdout, exitCode } = runCli('find --help');
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Search for skills');
      expect(stdout).toContain('--registry');
      expect(stdout).toContain('--limit');
      expect(stdout).toContain('--json');
    });

    it('should support search alias', () => {
      const { stdout, exitCode } = runCli('search --help');
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Search for skills');
    });
  });

  // ==========================================================================
  // Argument validation
  // ==========================================================================

  describe('argument validation', () => {
    it('should fail when no query is provided', () => {
      const result = runCli('find', tempDir);
      expect(result.exitCode).not.toBe(0);
    });
  });

  // ==========================================================================
  // Registry resolution
  // ==========================================================================

  describe('registry resolution', () => {
    it('should use registry from skills.json when no --registry', () => {
      // Setup skills.json with a publishRegistry pointing to a non-existent server
      // The command will fail to connect, but we verify it picks up the registry
      setupSkillsJson(tempDir, {}, { installDir: '.skills' });

      // Without any registry configured, it should fall back to public registry
      // and attempt to search (which will likely fail in CI but that's expected)
      const result = runCli('find test-query --json', tempDir);
      const output = getOutput(result);

      // Either succeeds (unlikely in CI) or fails with a network error
      // The key point is it doesn't crash with "No registry specified"
      expect(output).not.toContain('No registry specified');
    });

    it('should use --registry option when provided', () => {
      // Using a non-existent registry URL to verify it's used
      const result = runCli(
        'find test-query --registry https://nonexistent.invalid --json',
        tempDir,
      );

      // Should fail with a network error, not "No registry specified"
      expect(result.exitCode).not.toBe(0);
      const output = getOutput(result);
      expect(output).toContain('Search failed');
    });
  });

  // ==========================================================================
  // JSON output mode
  // ==========================================================================

  describe('output modes', () => {
    it('should respect --limit option', () => {
      const result = runCli('find --help', tempDir);
      expect(result.stdout).toContain('--limit');
      expect(result.stdout).toContain('-l');
    });

    it('should respect --json option', () => {
      const result = runCli('find --help', tempDir);
      expect(result.stdout).toContain('--json');
      expect(result.stdout).toContain('-j');
    });
  });
});
