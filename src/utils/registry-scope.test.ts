/**
 * Registry-Scope mapping tests
 *
 * Tests for mapping registry URLs to their corresponding scopes
 */

import { describe, expect, it } from 'vitest';
import {
  getScopeForRegistry,
  parseSkillName,
  buildFullSkillName,
  getShortName,
} from './registry-scope.js';

describe('registry-scope', () => {
  describe('getScopeForRegistry', () => {
    it('should return @kanyun for reskill-test.zhenguanyu.com', () => {
      expect(getScopeForRegistry('https://reskill-test.zhenguanyu.com')).toBe('@kanyun');
    });

    it('should handle trailing slash', () => {
      expect(getScopeForRegistry('https://reskill-test.zhenguanyu.com/')).toBe('@kanyun');
    });

    it('should return null for unknown registry', () => {
      expect(getScopeForRegistry('https://unknown-registry.com')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(getScopeForRegistry('')).toBeNull();
    });
  });

  describe('parseSkillName', () => {
    it('should parse scoped name correctly', () => {
      const result = parseSkillName('@kanyun/planning-with-files');
      expect(result.scope).toBe('@kanyun');
      expect(result.name).toBe('planning-with-files');
      expect(result.fullName).toBe('@kanyun/planning-with-files');
    });

    it('should handle name without scope', () => {
      const result = parseSkillName('planning-with-files');
      expect(result.scope).toBeNull();
      expect(result.name).toBe('planning-with-files');
      expect(result.fullName).toBe('planning-with-files');
    });

    it('should handle different scopes', () => {
      const result = parseSkillName('@myorg/my-skill');
      expect(result.scope).toBe('@myorg');
      expect(result.name).toBe('my-skill');
    });

    it('should handle scope with numbers and hyphens', () => {
      const result = parseSkillName('@my-org-123/skill-name');
      expect(result.scope).toBe('@my-org-123');
      expect(result.name).toBe('skill-name');
    });
  });

  describe('buildFullSkillName', () => {
    it('should combine scope and name', () => {
      expect(buildFullSkillName('@kanyun', 'planning-with-files')).toBe('@kanyun/planning-with-files');
    });

    it('should return name only if scope is null', () => {
      expect(buildFullSkillName(null, 'my-skill')).toBe('my-skill');
    });

    it('should return name only if scope is empty', () => {
      expect(buildFullSkillName('', 'my-skill')).toBe('my-skill');
    });

    it('should handle scope without @ prefix', () => {
      expect(buildFullSkillName('kanyun', 'my-skill')).toBe('@kanyun/my-skill');
    });
  });

  describe('getShortName', () => {
    it('should extract name from scoped skill name', () => {
      expect(getShortName('@kanyun/planning-with-files')).toBe('planning-with-files');
    });

    it('should return name as-is if no scope', () => {
      expect(getShortName('planning-with-files')).toBe('planning-with-files');
    });

    it('should handle different scopes', () => {
      expect(getShortName('@other/my-skill')).toBe('my-skill');
    });
  });
});
