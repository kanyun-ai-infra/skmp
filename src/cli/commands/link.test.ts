import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { linkCommand, unlinkCommand } from './link.js';

describe('link command', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skmp-link-test-'));
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

  it('should have correct name', () => {
    expect(linkCommand.name()).toBe('link');
  });

  it('should link local skill', async () => {
    // Create a local skill directory
    const localSkillDir = path.join(tempDir, 'local-skill');
    fs.mkdirSync(localSkillDir);
    fs.writeFileSync(
      path.join(localSkillDir, 'skill.json'),
      JSON.stringify({ name: 'my-local-skill', version: '0.1.0' })
    );

    await linkCommand.parseAsync(['node', 'test', localSkillDir]);
    
    const linkedPath = path.join(tempDir, '.skills', 'my-local-skill');
    expect(fs.existsSync(linkedPath)).toBe(true);
    expect(fs.lstatSync(linkedPath).isSymbolicLink()).toBe(true);
  });

  it('should link with custom name', async () => {
    const localSkillDir = path.join(tempDir, 'local-skill');
    fs.mkdirSync(localSkillDir);
    fs.writeFileSync(path.join(localSkillDir, 'SKILL.md'), '# Skill');

    await linkCommand.parseAsync(['node', 'test', localSkillDir, '--name', 'custom-name']);
    
    const linkedPath = path.join(tempDir, '.skills', 'custom-name');
    expect(fs.existsSync(linkedPath)).toBe(true);
  });
});

describe('unlink command', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skmp-unlink-test-'));
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

  it('should have correct name', () => {
    expect(unlinkCommand.name()).toBe('unlink');
  });

  it('should unlink linked skill', async () => {
    // Create a local skill and link it
    const localSkillDir = path.join(tempDir, 'local-skill');
    fs.mkdirSync(localSkillDir);
    fs.writeFileSync(path.join(localSkillDir, 'SKILL.md'), '# Skill');

    const skillsDir = path.join(tempDir, '.skills');
    fs.mkdirSync(skillsDir);
    fs.symlinkSync(localSkillDir, path.join(skillsDir, 'my-skill'), 'dir');

    await unlinkCommand.parseAsync(['node', 'test', 'my-skill']);
    
    expect(fs.existsSync(path.join(skillsDir, 'my-skill'))).toBe(false);
  });
});
