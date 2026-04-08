/**
 * group command unit tests
 *
 * Tests for the group command definition.
 * For group-path utility tests (normalizeGroupPath, generateSlug, validateGroupPath),
 * see src/utils/group-path.test.ts
 */

import { describe, expect, it } from 'vitest';
import groupCommand from './group.js';

describe('group command', () => {
  describe('command definition', () => {
    it('should support --tree option in group list', () => {
      const listSubcommand = groupCommand.commands.find((command) => command.name() === 'list');
      expect(listSubcommand).toBeDefined();
      expect(listSubcommand?.options.some((option) => option.long === '--tree')).toBe(true);
    });

    it('should support --token option in all subcommands', () => {
      const subcommands = ['list', 'create', 'info', 'delete'];
      for (const name of subcommands) {
        const sub = groupCommand.commands.find((command) => command.name() === name);
        expect(sub, `subcommand "${name}" should exist`).toBeDefined();
        const tokenOpt = sub?.options.find((o) => o.long === '--token');
        expect(tokenOpt, `subcommand "${name}" should have --token`).toBeDefined();
        expect(tokenOpt?.short).toBe('-t');
      }
    });

    it('should support --token option in all member subcommands', () => {
      const memberCmd = groupCommand.commands.find((command) => command.name() === 'member');
      expect(memberCmd).toBeDefined();
      const memberSubcommands = ['list', 'add', 'remove', 'role'];
      for (const name of memberSubcommands) {
        const sub = memberCmd?.commands.find((command) => command.name() === name);
        expect(sub, `member subcommand "${name}" should exist`).toBeDefined();
        const tokenOpt = sub?.options.find((o) => o.long === '--token');
        expect(tokenOpt, `member subcommand "${name}" should have --token`).toBeDefined();
        expect(tokenOpt?.short).toBe('-t');
      }
    });
  });
});
