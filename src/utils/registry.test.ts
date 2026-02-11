import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveRegistry, resolveRegistryForSearch, tryResolveRegistry } from './registry.js';

describe('tryResolveRegistry', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-registry-test-'));
    originalEnv = { ...process.env };
    delete process.env.RESKILL_REGISTRY;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should return CLI option when provided', () => {
    const result = tryResolveRegistry('https://cli-registry.example.com', tempDir);
    expect(result).toBe('https://cli-registry.example.com');
  });

  it('should return env var when CLI option is not provided', () => {
    process.env.RESKILL_REGISTRY = 'https://env-registry.example.com';
    const result = tryResolveRegistry(undefined, tempDir);
    expect(result).toBe('https://env-registry.example.com');
  });

  it('should prioritize CLI option over env var', () => {
    process.env.RESKILL_REGISTRY = 'https://env-registry.example.com';
    const result = tryResolveRegistry('https://cli-registry.example.com', tempDir);
    expect(result).toBe('https://cli-registry.example.com');
  });

  it('should return registry from skills.json when no CLI option or env var', () => {
    const skillsJson = {
      skills: {},
      defaults: { publishRegistry: 'https://config-registry.example.com' },
    };
    fs.writeFileSync(path.join(tempDir, 'skills.json'), JSON.stringify(skillsJson, null, 2));

    const result = tryResolveRegistry(undefined, tempDir);
    expect(result).toBe('https://config-registry.example.com');
  });

  it('should prioritize env var over skills.json', () => {
    process.env.RESKILL_REGISTRY = 'https://env-registry.example.com';
    const skillsJson = {
      skills: {},
      defaults: { publishRegistry: 'https://config-registry.example.com' },
    };
    fs.writeFileSync(path.join(tempDir, 'skills.json'), JSON.stringify(skillsJson, null, 2));

    const result = tryResolveRegistry(undefined, tempDir);
    expect(result).toBe('https://env-registry.example.com');
  });

  it('should return null when nothing is configured', () => {
    const result = tryResolveRegistry(undefined, tempDir);
    expect(result).toBeNull();
  });

  it('should return null when skills.json is invalid', () => {
    fs.writeFileSync(path.join(tempDir, 'skills.json'), '{invalid json');
    const result = tryResolveRegistry(undefined, tempDir);
    expect(result).toBeNull();
  });
});

describe('resolveRegistry', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-registry-test-'));
    originalEnv = { ...process.env };
    delete process.env.RESKILL_REGISTRY;
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
      defaults: { publishRegistry: 'https://config-registry.example.com' },
    };
    fs.writeFileSync(path.join(tempDir, 'skills.json'), JSON.stringify(skillsJson, null, 2));

    const result = resolveRegistry(undefined, tempDir);
    expect(result).toBe('https://config-registry.example.com');
  });

  it('should prioritize env var over skills.json', () => {
    process.env.RESKILL_REGISTRY = 'https://env-registry.example.com';
    const skillsJson = {
      skills: {},
      defaults: { publishRegistry: 'https://config-registry.example.com' },
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
    process.env.RESKILL_REGISTRY = 'https://default-test.example.com';
    const result = resolveRegistry(undefined);
    expect(result).toBe('https://default-test.example.com');
  });
});

describe('resolveRegistryForSearch', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-registry-search-test-'));
    originalEnv = { ...process.env };
    delete process.env.RESKILL_REGISTRY;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should return CLI registry when provided', () => {
    const result = resolveRegistryForSearch('https://my-registry.com');
    expect(result).toBe('https://my-registry.com');
  });

  it('should return RESKILL_REGISTRY env when no CLI option', () => {
    process.env.RESKILL_REGISTRY = 'https://env-registry.com';
    const result = resolveRegistryForSearch(undefined);
    expect(result).toBe('https://env-registry.com');
  });

  it('should return skills.json publishRegistry when no CLI or env', () => {
    const skillsJson = {
      skills: {},
      defaults: { publishRegistry: 'https://config-registry.com' },
    };
    fs.writeFileSync(path.join(tempDir, 'skills.json'), JSON.stringify(skillsJson));

    const result = resolveRegistryForSearch(undefined, tempDir);
    expect(result).toBe('https://config-registry.com');
  });

  it('should fallback to public registry when nothing configured', () => {
    const result = resolveRegistryForSearch(undefined, tempDir);
    expect(result).toBe('https://reskill.info/');
  });

  it('should prioritize CLI over env', () => {
    process.env.RESKILL_REGISTRY = 'https://env-registry.com';
    const result = resolveRegistryForSearch('https://cli-registry.com');
    expect(result).toBe('https://cli-registry.com');
  });

  it('should prioritize env over skills.json', () => {
    process.env.RESKILL_REGISTRY = 'https://env-registry.com';
    const skillsJson = {
      skills: {},
      defaults: { publishRegistry: 'https://config-registry.com' },
    };
    fs.writeFileSync(path.join(tempDir, 'skills.json'), JSON.stringify(skillsJson));

    const result = resolveRegistryForSearch(undefined, tempDir);
    expect(result).toBe('https://env-registry.com');
  });

  it('should not crash when skills.json is invalid', () => {
    fs.writeFileSync(path.join(tempDir, 'skills.json'), '{invalid json');

    const result = resolveRegistryForSearch(undefined, tempDir);
    expect(result).toBe('https://reskill.info/');
  });
});
