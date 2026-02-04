/**
 * Registry-Scope mapping tests
 *
 * Tests for mapping registry URLs to their corresponding scopes
 */

import { describe, expect, it } from 'vitest';
import {
  buildFullSkillName,
  getRegistryForScope,
  getRegistryUrl,
  getScopeForRegistry,
  getShortName,
  PUBLIC_REGISTRY,
  parseSkillIdentifier,
  parseSkillName,
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

  describe('getRegistryForScope', () => {
    describe('without custom scopeRegistries (backward compatibility)', () => {
      it('should return registry for known scope @kanyun', () => {
        const registry = getRegistryForScope('@kanyun');
        expect(registry).toBe('https://reskill-test.zhenguanyu.com/');
      });

      it('should handle scope without @ prefix', () => {
        const registry = getRegistryForScope('kanyun');
        expect(registry).toBe('https://reskill-test.zhenguanyu.com/');
      });

      it('should return null for unknown scope', () => {
        expect(getRegistryForScope('@unknown')).toBeNull();
      });

      it('should return null for empty string', () => {
        expect(getRegistryForScope('')).toBeNull();
      });
    });

    describe('with custom scopeRegistries', () => {
      it('should use custom scopeRegistries when provided', () => {
        const customRegistries = {
          '@mycompany': 'https://registry.mycompany.com/',
        };
        const registry = getRegistryForScope('@mycompany', customRegistries);
        expect(registry).toBe('https://registry.mycompany.com/');
      });

      it('should prioritize custom config over hardcoded defaults', () => {
        const customRegistries = {
          '@kanyun': 'https://custom-kanyun-registry.com/',
        };
        const registry = getRegistryForScope('@kanyun', customRegistries);
        expect(registry).toBe('https://custom-kanyun-registry.com/');
      });

      it('should fall back to hardcoded defaults if not in custom config', () => {
        const customRegistries = {
          '@other': 'https://other.com/',
        };
        const registry = getRegistryForScope('@kanyun', customRegistries);
        expect(registry).toBe('https://reskill-test.zhenguanyu.com/');
      });

      it('should return null if scope not found in custom or hardcoded', () => {
        const customRegistries = {
          '@other': 'https://other.com/',
        };
        const registry = getRegistryForScope('@unknown', customRegistries);
        expect(registry).toBeNull();
      });

      it('should handle custom scope without @ prefix', () => {
        const customRegistries = {
          '@mycompany': 'https://registry.mycompany.com/',
        };
        const registry = getRegistryForScope('mycompany', customRegistries);
        expect(registry).toBe('https://registry.mycompany.com/');
      });

      it('should normalize trailing slash in custom registry URL', () => {
        const customRegistries = {
          '@mycompany': 'https://registry.mycompany.com',
        };
        const registry = getRegistryForScope('@mycompany', customRegistries);
        expect(registry).toBe('https://registry.mycompany.com/');
      });
    });
  });

  // ============================================================================
  // getRegistryUrl tests (Step 3.2)
  // 根据 scope 确定 Registry URL
  // ============================================================================

  describe('getRegistryUrl', () => {
    // 公共 Registry 常量
    it('PUBLIC_REGISTRY should be defined', () => {
      expect(PUBLIC_REGISTRY).toBe('https://reskill.info/');
    });

    // 私有 Registry（有 scope）- 向后兼容
    describe('private registry (with scope) - backward compatibility', () => {
      it('should resolve registry from known scope @kanyun', () => {
        const registry = getRegistryUrl('@kanyun');
        expect(registry).toBe('https://reskill-test.zhenguanyu.com/');
      });

      it('should handle scope without @ prefix', () => {
        const registry = getRegistryUrl('kanyun');
        expect(registry).toBe('https://reskill-test.zhenguanyu.com/');
      });

      it('should throw error for unknown scope', () => {
        expect(() => getRegistryUrl('@unknown')).toThrow(
          'Unknown scope @unknown. No registry configured for this scope.',
        );
      });

      it('should throw error for unknown scope without @ prefix', () => {
        expect(() => getRegistryUrl('unknown-org')).toThrow(
          'Unknown scope @unknown-org. No registry configured for this scope.',
        );
      });
    });

    // 私有 Registry（有 scope）- 使用自定义 scopeRegistries
    describe('private registry (with scope) - custom scopeRegistries', () => {
      it('should resolve custom scope from scopeRegistries', () => {
        const customRegistries = {
          '@mycompany': 'https://registry.mycompany.com/',
        };
        const url = getRegistryUrl('@mycompany', customRegistries);
        expect(url).toBe('https://registry.mycompany.com/');
      });

      it('should prioritize custom config over hardcoded defaults', () => {
        const customRegistries = {
          '@kanyun': 'https://custom-kanyun.com/',
        };
        const url = getRegistryUrl('@kanyun', customRegistries);
        expect(url).toBe('https://custom-kanyun.com/');
      });

      it('should fall back to hardcoded defaults for known scope not in custom', () => {
        const customRegistries = {
          '@other': 'https://other.com/',
        };
        const url = getRegistryUrl('@kanyun', customRegistries);
        expect(url).toBe('https://reskill-test.zhenguanyu.com/');
      });

      it('should throw error for unknown scope not in custom or hardcoded', () => {
        const customRegistries = {
          '@other': 'https://other.com/',
        };
        expect(() => getRegistryUrl('@unknown', customRegistries)).toThrow(
          'Unknown scope @unknown. No registry configured for this scope.',
        );
      });

      it('should still return public registry when scope is null with custom config', () => {
        const customRegistries = {
          '@mycompany': 'https://registry.mycompany.com/',
        };
        const url = getRegistryUrl(null, customRegistries);
        expect(url).toBe('https://reskill.info/');
      });
    });

    // 公共 Registry（无 scope）
    describe('public registry (no scope)', () => {
      it('should return public registry when scope is null', () => {
        const registry = getRegistryUrl(null);
        expect(registry).toBe('https://reskill.info/');
      });

      it('should return public registry when scope is undefined', () => {
        const registry = getRegistryUrl(undefined);
        expect(registry).toBe('https://reskill.info/');
      });

      it('should return public registry when scope is empty string', () => {
        const registry = getRegistryUrl('');
        expect(registry).toBe('https://reskill.info/');
      });
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
      expect(buildFullSkillName('@kanyun', 'planning-with-files')).toBe(
        '@kanyun/planning-with-files',
      );
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

  // ============================================================================
  // parseSkillIdentifier tests (Step 3.1)
  // 支持私有 Registry (@scope/name@version) 和公共 Registry (name@version)
  // ============================================================================

  describe('parseSkillIdentifier', () => {
    // -------------------------------------------------------------------------
    // 私有 Registry（带 @scope）
    // -------------------------------------------------------------------------
    describe('private registry (scoped)', () => {
      it('should parse scope and name', () => {
        const result = parseSkillIdentifier('@kanyun/planning-with-files');
        expect(result).toEqual({
          scope: '@kanyun',
          name: 'planning-with-files',
          version: undefined,
          fullName: '@kanyun/planning-with-files',
        });
      });

      it('should parse scope, name, and version', () => {
        const result = parseSkillIdentifier('@kanyun/planning-with-files@2.4.5');
        expect(result).toEqual({
          scope: '@kanyun',
          name: 'planning-with-files',
          version: '2.4.5',
          fullName: '@kanyun/planning-with-files',
        });
      });

      it('should parse scope, name, and tag', () => {
        const result = parseSkillIdentifier('@kanyun/planning-with-files@beta');
        expect(result).toEqual({
          scope: '@kanyun',
          name: 'planning-with-files',
          version: 'beta',
          fullName: '@kanyun/planning-with-files',
        });
      });

      it('should handle scope with hyphen', () => {
        const result = parseSkillIdentifier('@my-org/my-skill');
        expect(result.scope).toBe('@my-org');
        expect(result.name).toBe('my-skill');
      });

      it('should handle scope with underscore', () => {
        const result = parseSkillIdentifier('@my_org/my_skill');
        expect(result.scope).toBe('@my_org');
        expect(result.name).toBe('my_skill');
      });

      it('should handle version with prerelease tag', () => {
        const result = parseSkillIdentifier('@kanyun/skill@1.0.0-beta.1');
        expect(result).toEqual({
          scope: '@kanyun',
          name: 'skill',
          version: '1.0.0-beta.1',
          fullName: '@kanyun/skill',
        });
      });

      it('should handle latest tag', () => {
        const result = parseSkillIdentifier('@kanyun/skill@latest');
        expect(result).toEqual({
          scope: '@kanyun',
          name: 'skill',
          version: 'latest',
          fullName: '@kanyun/skill',
        });
      });
    });

    // -------------------------------------------------------------------------
    // 公共 Registry（无 scope）
    // -------------------------------------------------------------------------
    describe('public registry (unscoped)', () => {
      it('should parse name without scope', () => {
        const result = parseSkillIdentifier('planning-with-files');
        expect(result).toEqual({
          scope: null,
          name: 'planning-with-files',
          version: undefined,
          fullName: 'planning-with-files',
        });
      });

      it('should parse name and version without scope', () => {
        const result = parseSkillIdentifier('planning-with-files@2.4.5');
        expect(result).toEqual({
          scope: null,
          name: 'planning-with-files',
          version: '2.4.5',
          fullName: 'planning-with-files',
        });
      });

      it('should parse name and tag without scope', () => {
        const result = parseSkillIdentifier('my-skill@latest');
        expect(result).toEqual({
          scope: null,
          name: 'my-skill',
          version: 'latest',
          fullName: 'my-skill',
        });
      });

      it('should handle name with numbers', () => {
        const result = parseSkillIdentifier('skill-123');
        expect(result).toEqual({
          scope: null,
          name: 'skill-123',
          version: undefined,
          fullName: 'skill-123',
        });
      });

      it('should handle name with underscores', () => {
        const result = parseSkillIdentifier('my_skill@1.0.0');
        expect(result).toEqual({
          scope: null,
          name: 'my_skill',
          version: '1.0.0',
          fullName: 'my_skill',
        });
      });
    });

    // -------------------------------------------------------------------------
    // 边界情况和错误处理
    // -------------------------------------------------------------------------
    describe('edge cases and errors', () => {
      it('should throw error for empty string', () => {
        expect(() => parseSkillIdentifier('')).toThrow('Invalid skill identifier');
      });

      it('should throw error for whitespace only', () => {
        expect(() => parseSkillIdentifier('   ')).toThrow('Invalid skill identifier');
      });

      it('should throw error for @ only', () => {
        expect(() => parseSkillIdentifier('@')).toThrow('Invalid skill identifier');
      });

      it('should throw error for scope without name (@kanyun/)', () => {
        expect(() => parseSkillIdentifier('@kanyun/')).toThrow('Invalid skill identifier');
      });

      it('should throw error for multiple @ signs that are not version', () => {
        // @scope/name@version 是合法的，但 @@scope/name 不合法
        expect(() => parseSkillIdentifier('@@invalid')).toThrow('Invalid skill identifier');
      });
    });
  });
});
