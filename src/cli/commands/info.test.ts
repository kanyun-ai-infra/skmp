import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { infoCommand } from './info.js';

describe('info command', () => {
  let tempDir: string;
  let originalCwd: string;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-info-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should have correct name', () => {
    expect(infoCommand.name()).toBe('info');
  });

  it('should show skill info for installed skill', async () => {
    // Create a skill
    const skillPath = path.join(tempDir, '.skills', 'test-skill');
    fs.mkdirSync(skillPath, { recursive: true });
    fs.writeFileSync(
      path.join(skillPath, 'skill.json'),
      JSON.stringify({
        name: 'test-skill',
        version: '1.0.0',
        description: 'A test skill',
        author: 'Test Author',
      })
    );

    await infoCommand.parseAsync(['node', 'test', 'test-skill']);
    
    const calls = (console.log as any).mock.calls.flat().join(' ');
    expect(calls).toContain('test-skill');
    expect(calls).toContain('1.0.0');
  });

  it('should output JSON when --json flag is used', async () => {
    const skillPath = path.join(tempDir, '.skills', 'test-skill');
    fs.mkdirSync(skillPath, { recursive: true });
    fs.writeFileSync(
      path.join(skillPath, 'skill.json'),
      JSON.stringify({ name: 'test-skill', version: '1.0.0' })
    );

    await infoCommand.parseAsync(['node', 'test', 'test-skill', '--json']);
    
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
  });

  it('should handle non-existent skill', async () => {
    await infoCommand.parseAsync(['node', 'test', 'non-existent']);
    // When skill doesn't exist, it should either show error or show null
    const allCalls = [
      ...(console.log as any).mock.calls.flat(),
      ...(console.error as any).mock.calls.flat(),
    ].join(' ');
    // Should contain either "not found" or "null" (indicating skill not installed)
    const hasExpectedOutput = allCalls.includes('not found') || allCalls.includes('null');
    expect(hasExpectedOutput).toBe(true);
  });
});
