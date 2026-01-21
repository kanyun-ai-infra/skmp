import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { initCommand } from './init.js';

describe('init command', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-init-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    
    // Mock console
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should create skills.json with defaults', async () => {
    await initCommand.parseAsync(['node', 'test', '-y']);

    const configPath = path.join(tempDir, 'skills.json');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.defaults.registry).toBe('github');
    expect(config.defaults.installDir).toBe('.skills');
  });

  it('should create skills.json with custom options', async () => {
    await initCommand.parseAsync([
      'node', 'test',
      '-y',
      '--name', 'my-project',
      '--registry', 'gitlab',
      '--install-dir', 'custom-skills',
    ]);

    const configPath = path.join(tempDir, 'skills.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    expect(config.name).toBe('my-project');
    expect(config.defaults.registry).toBe('gitlab');
    expect(config.defaults.installDir).toBe('custom-skills');
  });

  it('should not overwrite existing skills.json', async () => {
    // Create existing config
    fs.writeFileSync(
      path.join(tempDir, 'skills.json'),
      JSON.stringify({ name: 'existing', skills: {} })
    );

    await initCommand.parseAsync(['node', 'test', '-y']);

    // Should still be the original
    const config = JSON.parse(
      fs.readFileSync(path.join(tempDir, 'skills.json'), 'utf-8')
    );
    expect(config.name).toBe('existing');
  });
});
