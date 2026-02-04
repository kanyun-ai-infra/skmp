import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveRegistry } from './registry.js';

describe('resolveRegistry', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-registry-test-'));
    originalEnv = { ...process.env };
    // Clear env var before each test
    delete process.env.RESKILL_REGISTRY;
    // Mock process.exit to prevent actual exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should return CLI option when provided', () => {
    const result = resolveRegistry('https://cli-registry.example.com', tempDir);
    expect(result).toBe('https://cli-registry.example.com');
  });

  it('should return env var when CLI option is not provided', () => {
    process.env.RESKILL_REGISTRY = 'https://env-registry.example.com';
    const result = resolveRegistry(undefined, tempDir);
    expect(result).toBe('https://env-registry.example.com');
  });

  it('should prioritize CLI option over env var', () => {
    process.env.RESKILL_REGISTRY = 'https://env-registry.example.com';
    const result = resolveRegistry('https://cli-registry.example.com', tempDir);
    expect(result).toBe('https://cli-registry.example.com');
  });

  it('should return registry from skills.json when no CLI option or env var', () => {
    const skillsJson = {
      skills: {},
      defaults: {
        publishRegistry: 'https://config-registry.example.com',
      },
    };
    fs.writeFileSync(path.join(tempDir, 'skills.json'), JSON.stringify(skillsJson, null, 2));

    const result = resolveRegistry(undefined, tempDir);
    expect(result).toBe('https://config-registry.example.com');
  });

  it('should prioritize env var over skills.json', () => {
    process.env.RESKILL_REGISTRY = 'https://env-registry.example.com';
    const skillsJson = {
      skills: {},
      defaults: {
        publishRegistry: 'https://config-registry.example.com',
      },
    };
    fs.writeFileSync(path.join(tempDir, 'skills.json'), JSON.stringify(skillsJson, null, 2));

    const result = resolveRegistry(undefined, tempDir);
    expect(result).toBe('https://env-registry.example.com');
  });

  it('should exit with code 1 when no registry is configured', () => {
    expect(() => resolveRegistry(undefined, tempDir)).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should use cwd as default projectRoot', () => {
    // Set env var to test the default behavior
    process.env.RESKILL_REGISTRY = 'https://default-test.example.com';
    const result = resolveRegistry(undefined);
    expect(result).toBe('https://default-test.example.com');
  });
});
