/**
 * find command unit tests
 *
 * Tests for the find command with mocked RegistryClient
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted to ensure mockSearch is available when vi.mock factory runs
const { mockSearch, mockResolveRegistry } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
  mockResolveRegistry: vi.fn().mockReturnValue('https://reskill.info/'),
}));

vi.mock('../../core/registry-client.js', () => {
  class MockRegistryError extends Error {
    public statusCode?: number;
    constructor(message: string, statusCode?: number) {
      super(message);
      this.name = 'RegistryError';
      this.statusCode = statusCode;
    }
  }
  return {
    RegistryClient: vi.fn().mockImplementation(() => ({
      search: mockSearch,
    })),
    RegistryError: MockRegistryError,
  };
});

vi.mock('../../utils/registry.js', () => ({
  resolveRegistryForSearch: mockResolveRegistry,
}));

import { RegistryError } from '../../core/registry-client.js';
import { findAction, findCommand } from './find.js';

describe('find command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockSearch.mockReset();
    mockResolveRegistry.mockReset().mockReturnValue('https://reskill.info/');
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  // ==========================================================================
  // Command definition
  // ==========================================================================

  describe('command definition', () => {
    it('should have correct name and alias', () => {
      expect(findCommand.name()).toBe('find');
      expect(findCommand.aliases()).toContain('search');
    });

    it('should have registry option', () => {
      const registryOpt = findCommand.options.find((o) => o.long === '--registry');
      expect(registryOpt).toBeDefined();
    });

    it('should have limit option with default', () => {
      const limitOpt = findCommand.options.find((o) => o.long === '--limit');
      expect(limitOpt).toBeDefined();
      expect(limitOpt?.defaultValue).toBe('10');
    });

    it('should have json option', () => {
      const jsonOpt = findCommand.options.find((o) => o.long === '--json');
      expect(jsonOpt).toBeDefined();
    });
  });

  // ==========================================================================
  // Search execution
  // ==========================================================================

  describe('search execution', () => {
    it('should search with query and display results', async () => {
      mockSearch.mockResolvedValueOnce({
        items: [
          { name: '@kanyun/planning-with-files', description: 'Planning skill', version: '2.4.5' },
        ],
        total: 1,
      });

      await findAction('planning', {});

      expect(mockSearch).toHaveBeenCalledWith('planning', { limit: 10 });
      const output = (console.log as any).mock.calls.flat().join('\n');
      expect(output).toContain('planning-with-files');
      expect(output).toContain('1');
    });

    it('should pass --limit option to search', async () => {
      mockSearch.mockResolvedValueOnce({ items: [], total: 0 });

      await findAction('test', { limit: '5' });

      expect(mockSearch).toHaveBeenCalledWith('test', { limit: 5 });
    });

    it('should pass --registry option to resolver', async () => {
      mockSearch.mockResolvedValueOnce({ items: [], total: 0 });

      await findAction('test', { registry: 'https://my-private.registry.com' });

      expect(mockResolveRegistry).toHaveBeenCalledWith('https://my-private.registry.com');
    });

    it('should display no results message when empty', async () => {
      mockSearch.mockResolvedValueOnce({ items: [], total: 0 });

      await findAction('nonexistent', {});

      const output = (console.log as any).mock.calls.flat().join('\n');
      const errorOutput = (console.error as any).mock.calls.flat().join('\n');
      const combined = output + errorOutput;
      expect(combined).toContain('No skills found');
    });
  });

  // ==========================================================================
  // JSON output
  // ==========================================================================

  describe('JSON output', () => {
    it('should output valid JSON when --json is set', async () => {
      const mockItems = [{ name: '@kanyun/test-skill', description: 'Test', version: '1.0.0' }];
      mockSearch.mockResolvedValueOnce({ items: mockItems, total: 1 });

      await findAction('test', { json: true });

      const calls = (console.log as any).mock.calls;
      const jsonCall = calls.find((call: any[]) => {
        try {
          JSON.parse(call[0]);
          return true;
        } catch {
          return false;
        }
      });
      expect(jsonCall).toBeDefined();

      const parsed = JSON.parse(jsonCall[0]);
      expect(parsed.total).toBe(1);
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].name).toBe('@kanyun/test-skill');
    });
  });

  // ==========================================================================
  // Error handling
  // ==========================================================================

  describe('error handling', () => {
    it('should exit with code 1 on search failure', async () => {
      mockSearch.mockRejectedValueOnce(new Error('Network error'));

      await findAction('test', {});

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should show auth hint for 401 errors', async () => {
      const error = new RegistryError('Unauthorized', 401);
      mockSearch.mockRejectedValueOnce(error);

      await findAction('test', {});

      const errorOutput = (console.error as any).mock.calls.flat().join('\n');
      const logOutput = (console.log as any).mock.calls.flat().join('\n');
      const combined = errorOutput + logOutput;
      expect(combined).toContain('reskill login');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit with code 1 for invalid limit', async () => {
      await findAction('test', { limit: 'abc' });

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should exit with code 1 for zero limit', async () => {
      await findAction('test', { limit: '0' });

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
