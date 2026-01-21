import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { uninstallCommand } from './uninstall.js';

describe('uninstall command', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-uninstall-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should have correct name and aliases', () => {
    expect(uninstallCommand.name()).toBe('uninstall');
    expect(uninstallCommand.aliases()).toContain('un');
    expect(uninstallCommand.aliases()).toContain('remove');
    expect(uninstallCommand.aliases()).toContain('rm');
  });

  it('should uninstall installed skill', async () => {
    // Create a skill
    const skillPath = path.join(tempDir, '.skills', 'test-skill');
    fs.mkdirSync(skillPath, { recursive: true });
    fs.writeFileSync(path.join(skillPath, 'skill.json'), '{}');

    // Create skills.json
    fs.writeFileSync(
      path.join(tempDir, 'skills.json'),
      JSON.stringify({ skills: { 'test-skill': 'github:user/test-skill@v1.0.0' } })
    );

    await uninstallCommand.parseAsync(['node', 'test', 'test-skill']);
    
    expect(fs.existsSync(skillPath)).toBe(false);
  });
});
