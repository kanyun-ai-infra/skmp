import { describe, expect, it } from 'vitest';
import { uninstallCommand } from './uninstall.js';

describe('uninstall command', () => {
  it('should have correct name and aliases', () => {
    expect(uninstallCommand.name()).toBe('uninstall');
    expect(uninstallCommand.aliases()).toContain('un');
    expect(uninstallCommand.aliases()).toContain('remove');
    expect(uninstallCommand.aliases()).toContain('rm');
  });

  it('should have -y option', () => {
    const options = uninstallCommand.options;
    const yesOption = options.find((opt) => opt.flags.includes('-y'));
    expect(yesOption).toBeDefined();
  });

  it('should have -g option', () => {
    const options = uninstallCommand.options;
    const globalOption = options.find((opt) => opt.flags.includes('-g'));
    expect(globalOption).toBeDefined();
  });
});
