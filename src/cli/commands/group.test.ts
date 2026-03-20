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
  });
});
