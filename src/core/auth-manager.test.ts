/**
 * AuthManager unit tests
 *
 * Tests for authentication token management
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthManager } from './auth-manager.js';

describe('AuthManager', () => {
  let tempDir: string;
  let originalHome: string | undefined;
  let originalToken: string | undefined;
  let originalRegistry: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-auth-test-'));

    // Save original env vars
    originalHome = process.env.HOME;
    originalToken = process.env.RESKILL_TOKEN;
    originalRegistry = process.env.RESKILL_REGISTRY;

    // Set temp dir as HOME for tests
    process.env.HOME = tempDir;

    // Clear env vars
    delete process.env.RESKILL_TOKEN;
    delete process.env.RESKILL_REGISTRY;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Restore original env vars
    process.env.HOME = originalHome;
    if (originalToken !== undefined) {
      process.env.RESKILL_TOKEN = originalToken;
    } else {
      delete process.env.RESKILL_TOKEN;
    }
    if (originalRegistry !== undefined) {
      process.env.RESKILL_REGISTRY = originalRegistry;
    } else {
      delete process.env.RESKILL_REGISTRY;
    }

    vi.restoreAllMocks();
  });

  // Helper function
  function createReskillrc(content: object): void {
    fs.writeFileSync(path.join(tempDir, '.reskillrc'), JSON.stringify(content, null, 2));
  }

  function readReskillrc(): object {
    const content = fs.readFileSync(path.join(tempDir, '.reskillrc'), 'utf-8');
    return JSON.parse(content);
  }

  // ============================================================================
  // getToken tests
  // ============================================================================

  describe('getToken', () => {
    it('should return undefined when no token configured', () => {
      const manager = new AuthManager();
      expect(manager.getToken()).toBeUndefined();
    });

    it('should return token from RESKILL_TOKEN env var', () => {
      process.env.RESKILL_TOKEN = 'env_token_123';

      const manager = new AuthManager();
      expect(manager.getToken()).toBe('env_token_123');
    });

    it('should return token from ~/.reskillrc', () => {
      createReskillrc({
        registries: {
          'https://registry.reskill.dev': {
            token: 'file_token_456',
          },
        },
      });

      const manager = new AuthManager();
      expect(manager.getToken()).toBe('file_token_456');
    });

    it('should prefer RESKILL_TOKEN over ~/.reskillrc', () => {
      process.env.RESKILL_TOKEN = 'env_token_123';
      createReskillrc({
        registries: {
          'https://registry.reskill.dev': {
            token: 'file_token_456',
          },
        },
      });

      const manager = new AuthManager();
      expect(manager.getToken()).toBe('env_token_123');
    });

    it('should return token for specific registry', () => {
      createReskillrc({
        registries: {
          'https://registry.reskill.dev': {
            token: 'default_token',
          },
          'https://custom.registry.com': {
            token: 'custom_token',
          },
        },
      });

      const manager = new AuthManager();
      expect(manager.getToken('https://custom.registry.com')).toBe('custom_token');
    });

    it('should return undefined for unknown registry', () => {
      createReskillrc({
        registries: {
          'https://registry.reskill.dev': {
            token: 'default_token',
          },
        },
      });

      const manager = new AuthManager();
      expect(manager.getToken('https://unknown.registry.com')).toBeUndefined();
    });

    it('should handle malformed ~/.reskillrc gracefully', () => {
      fs.writeFileSync(path.join(tempDir, '.reskillrc'), '{ invalid json }');

      const manager = new AuthManager();
      expect(manager.getToken()).toBeUndefined();
    });

    it('should handle empty ~/.reskillrc', () => {
      fs.writeFileSync(path.join(tempDir, '.reskillrc'), '');

      const manager = new AuthManager();
      expect(manager.getToken()).toBeUndefined();
    });

    it('should use default registry when not specified', () => {
      createReskillrc({
        registries: {
          'https://registry.reskill.dev': {
            token: 'default_token',
          },
        },
      });

      const manager = new AuthManager();
      // Should use default registry
      expect(manager.getToken()).toBe('default_token');
    });
  });

  // ============================================================================
  // setToken tests
  // ============================================================================

  describe('setToken', () => {
    it('should create ~/.reskillrc if not exists', () => {
      const manager = new AuthManager();
      manager.setToken('new_token_123');

      expect(fs.existsSync(path.join(tempDir, '.reskillrc'))).toBe(true);
    });

    it('should save token to default registry', () => {
      const manager = new AuthManager();
      manager.setToken('new_token_123');

      const config = readReskillrc() as { registries: Record<string, { token: string }> };
      expect(config.registries['https://registry.reskill.dev'].token).toBe('new_token_123');
    });

    it('should save token to specific registry', () => {
      const manager = new AuthManager();
      manager.setToken('custom_token', 'https://custom.registry.com');

      const config = readReskillrc() as { registries: Record<string, { token: string }> };
      expect(config.registries['https://custom.registry.com'].token).toBe('custom_token');
    });

    it('should preserve existing registries', () => {
      createReskillrc({
        registries: {
          'https://existing.registry.com': {
            token: 'existing_token',
            email: 'user@example.com',
          },
        },
      });

      const manager = new AuthManager();
      manager.setToken('new_token', 'https://new.registry.com');

      const config = readReskillrc() as { registries: Record<string, { token: string }> };
      expect(config.registries['https://existing.registry.com'].token).toBe('existing_token');
      expect(config.registries['https://new.registry.com'].token).toBe('new_token');
    });

    it('should overwrite existing token for same registry', () => {
      createReskillrc({
        registries: {
          'https://registry.reskill.dev': {
            token: 'old_token',
          },
        },
      });

      const manager = new AuthManager();
      manager.setToken('new_token');

      const config = readReskillrc() as { registries: Record<string, { token: string }> };
      expect(config.registries['https://registry.reskill.dev'].token).toBe('new_token');
    });

    it('should save email if provided', () => {
      const manager = new AuthManager();
      manager.setToken('token', undefined, 'user@example.com');

      const config = readReskillrc() as {
        registries: Record<string, { token: string; email?: string }>;
      };
      expect(config.registries['https://registry.reskill.dev'].email).toBe('user@example.com');
    });
  });

  // ============================================================================
  // removeToken tests
  // ============================================================================

  describe('removeToken', () => {
    it('should remove token for default registry', () => {
      createReskillrc({
        registries: {
          'https://registry.reskill.dev': {
            token: 'token_to_remove',
          },
        },
      });

      const manager = new AuthManager();
      manager.removeToken();

      const config = readReskillrc() as { registries: Record<string, unknown> };
      expect(config.registries['https://registry.reskill.dev']).toBeUndefined();
    });

    it('should remove token for specific registry', () => {
      createReskillrc({
        registries: {
          'https://registry.reskill.dev': {
            token: 'default_token',
          },
          'https://custom.registry.com': {
            token: 'custom_token',
          },
        },
      });

      const manager = new AuthManager();
      manager.removeToken('https://custom.registry.com');

      const config = readReskillrc() as { registries: Record<string, { token: string }> };
      expect(config.registries['https://registry.reskill.dev'].token).toBe('default_token');
      expect(config.registries['https://custom.registry.com']).toBeUndefined();
    });

    it('should not throw when token does not exist', () => {
      const manager = new AuthManager();
      expect(() => manager.removeToken()).not.toThrow();
    });

    it('should not throw when ~/.reskillrc does not exist', () => {
      const manager = new AuthManager();
      expect(() => manager.removeToken()).not.toThrow();
    });
  });

  // ============================================================================
  // hasToken tests
  // ============================================================================

  describe('hasToken', () => {
    it('should return false when no token', () => {
      const manager = new AuthManager();
      expect(manager.hasToken()).toBe(false);
    });

    it('should return true when token from env var', () => {
      process.env.RESKILL_TOKEN = 'env_token';

      const manager = new AuthManager();
      expect(manager.hasToken()).toBe(true);
    });

    it('should return true when token from config file', () => {
      createReskillrc({
        registries: {
          'https://registry.reskill.dev': {
            token: 'file_token',
          },
        },
      });

      const manager = new AuthManager();
      expect(manager.hasToken()).toBe(true);
    });

    it('should check specific registry', () => {
      createReskillrc({
        registries: {
          'https://registry.reskill.dev': {
            token: 'default_token',
          },
        },
      });

      const manager = new AuthManager();
      expect(manager.hasToken('https://registry.reskill.dev')).toBe(true);
      expect(manager.hasToken('https://other.registry.com')).toBe(false);
    });
  });

  // ============================================================================
  // getDefaultRegistry tests
  // ============================================================================

  describe('getDefaultRegistry', () => {
    it('should return default registry URL', () => {
      const manager = new AuthManager();
      expect(manager.getDefaultRegistry()).toBe('https://registry.reskill.dev');
    });

    it('should return RESKILL_REGISTRY env var if set', () => {
      process.env.RESKILL_REGISTRY = 'https://custom.registry.com';

      const manager = new AuthManager();
      expect(manager.getDefaultRegistry()).toBe('https://custom.registry.com');
    });
  });

  // ============================================================================
  // getConfigPath tests
  // ============================================================================

  describe('getConfigPath', () => {
    it('should return path to ~/.reskillrc', () => {
      const manager = new AuthManager();
      expect(manager.getConfigPath()).toBe(path.join(tempDir, '.reskillrc'));
    });
  });

  // ============================================================================
  // getEmail tests
  // ============================================================================

  describe('getEmail', () => {
    it('should return email from config', () => {
      createReskillrc({
        registries: {
          'https://registry.reskill.dev': {
            token: 'token',
            email: 'user@example.com',
          },
        },
      });

      const manager = new AuthManager();
      expect(manager.getEmail()).toBe('user@example.com');
    });

    it('should return undefined when no email', () => {
      createReskillrc({
        registries: {
          'https://registry.reskill.dev': {
            token: 'token',
          },
        },
      });

      const manager = new AuthManager();
      expect(manager.getEmail()).toBeUndefined();
    });

    it('should return email for specific registry', () => {
      createReskillrc({
        registries: {
          'https://registry.reskill.dev': {
            token: 'token1',
            email: 'default@example.com',
          },
          'https://custom.registry.com': {
            token: 'token2',
            email: 'custom@example.com',
          },
        },
      });

      const manager = new AuthManager();
      expect(manager.getEmail('https://custom.registry.com')).toBe('custom@example.com');
    });
  });
});
