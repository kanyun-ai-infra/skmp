import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { listCommand } from './list.js';

describe('list command', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skmp-list-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should have correct name and alias', () => {
    expect(listCommand.name()).toBe('list');
    expect(listCommand.aliases()).toContain('ls');
  });

  it('should have json option', () => {
    const jsonOption = listCommand.options.find(o => o.long === '--json');
    expect(jsonOption).toBeDefined();
  });

  it('should show no skills message when empty', async () => {
    await listCommand.parseAsync(['node', 'test']);
    
    // Check that console.log was called with something containing "No skills"
    const calls = (console.log as any).mock.calls;
    const hasNoSkillsMessage = calls.some((call: any[]) => 
      call.some((arg: any) => typeof arg === 'string' && arg.includes('No skills'))
    );
    expect(hasNoSkillsMessage).toBe(true);
  });

  it('should list installed skills', async () => {
    // Create a skill
    const skillPath = path.join(tempDir, '.skills', 'test-skill');
    fs.mkdirSync(skillPath, { recursive: true });
    fs.writeFileSync(
      path.join(skillPath, 'skill.json'),
      JSON.stringify({ name: 'test-skill', version: '1.0.0' })
    );

    await listCommand.parseAsync(['node', 'test']);
    
    const calls = (console.log as any).mock.calls.flat().join(' ');
    expect(calls).toContain('test-skill');
  });

  it('should output JSON when --json flag is used', async () => {
    const skillPath = path.join(tempDir, '.skills', 'test-skill');
    fs.mkdirSync(skillPath, { recursive: true });
    fs.writeFileSync(
      path.join(skillPath, 'skill.json'),
      JSON.stringify({ name: 'test-skill', version: '1.0.0' })
    );

    await listCommand.parseAsync(['node', 'test', '--json']);
    
    const calls = (console.log as any).mock.calls;
    // Should have JSON output
    const jsonCall = calls.find((call: any[]) => {
      try {
        JSON.parse(call[0]);
        return true;
      } catch {
        return false;
      }
    });
    expect(jsonCall).toBeDefined();
  });
});
