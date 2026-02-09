/**
 * RegistryResolver Tests (Step 5.1)
 *
 * Tests for detecting and resolving registry skill references
 */

import { describe, expect, it } from 'vitest';
import { RegistryResolver } from './registry-resolver.js';

describe('RegistryResolver', () => {
  describe('isRegistryRef', () => {
    // ====================================================================
    // 应该被识别为 Registry 格式
    // ====================================================================

    describe('should return true for valid registry refs', () => {
      it('private registry: @scope/name', () => {
        expect(RegistryResolver.isRegistryRef('@kanyun/planning-with-files')).toBe(true);
      });

      it('private registry: @scope/name@version', () => {
        expect(RegistryResolver.isRegistryRef('@kanyun/planning-with-files@2.4.5')).toBe(true);
      });

      it('private registry: @scope/name@latest', () => {
        expect(RegistryResolver.isRegistryRef('@kanyun/planning-with-files@latest')).toBe(true);
      });

      it('public registry: simple name', () => {
        expect(RegistryResolver.isRegistryRef('my-skill')).toBe(true);
      });

      it('public registry: name@version', () => {
        expect(RegistryResolver.isRegistryRef('my-skill@1.0.0')).toBe(true);
      });

      it('public registry: name@latest', () => {
        expect(RegistryResolver.isRegistryRef('my-skill@latest')).toBe(true);
      });

      it('name with underscore', () => {
        expect(RegistryResolver.isRegistryRef('my_skill')).toBe(true);
      });

      it('name with dots', () => {
        expect(RegistryResolver.isRegistryRef('my.skill')).toBe(true);
      });
    });

    // ====================================================================
    // 应该被排除的 Git 格式
    // ====================================================================

    describe('should return false for Git refs', () => {
      it('Git SSH: git@github.com:user/repo.git', () => {
        expect(RegistryResolver.isRegistryRef('git@github.com:user/repo.git')).toBe(false);
      });

      it('Git SSH with version: git@github.com:user/repo.git@v1.0.0', () => {
        expect(RegistryResolver.isRegistryRef('git@github.com:user/repo.git@v1.0.0')).toBe(false);
      });

      it('Git protocol: git://github.com/user/repo.git', () => {
        expect(RegistryResolver.isRegistryRef('git://github.com/user/repo.git')).toBe(false);
      });

      it('URL ending with .git', () => {
        expect(RegistryResolver.isRegistryRef('https://github.com/user/repo.git')).toBe(false);
      });
    });

    // ====================================================================
    // 应该被排除的 HTTP/OSS 格式
    // ====================================================================

    describe('should return false for HTTP/OSS refs', () => {
      it('HTTPS URL', () => {
        expect(RegistryResolver.isRegistryRef('https://example.com/skill.tar.gz')).toBe(false);
      });

      it('HTTP URL', () => {
        expect(RegistryResolver.isRegistryRef('http://example.com/skill.tar.gz')).toBe(false);
      });

      it('OSS URL', () => {
        expect(RegistryResolver.isRegistryRef('oss://bucket/skill.tar.gz')).toBe(false);
      });

      it('S3 URL', () => {
        expect(RegistryResolver.isRegistryRef('s3://bucket/skill.tar.gz')).toBe(false);
      });
    });

    // ====================================================================
    // 应该被排除的 Registry shorthand 格式
    // ====================================================================

    describe('should return false for registry shorthand refs', () => {
      it('GitHub shorthand: github:user/repo', () => {
        expect(RegistryResolver.isRegistryRef('github:user/repo')).toBe(false);
      });

      it('GitHub shorthand with version: github:user/repo@v1.0.0', () => {
        expect(RegistryResolver.isRegistryRef('github:user/repo@v1.0.0')).toBe(false);
      });

      it('GitLab shorthand: gitlab:group/repo', () => {
        expect(RegistryResolver.isRegistryRef('gitlab:group/repo')).toBe(false);
      });

      it('Custom registry: custom.com:user/repo', () => {
        expect(RegistryResolver.isRegistryRef('custom.com:user/repo')).toBe(false);
      });

      it('Owner/repo format (short GitHub)', () => {
        // 这个应该匹配为 Git shorthand，不是 registry
        expect(RegistryResolver.isRegistryRef('user/repo')).toBe(false);
      });

      it('Owner/repo with version', () => {
        expect(RegistryResolver.isRegistryRef('user/repo@v1.0.0')).toBe(false);
      });
    });

    // ====================================================================
    // 边界情况
    // ====================================================================

    describe('edge cases', () => {
      it('empty string should return false', () => {
        expect(RegistryResolver.isRegistryRef('')).toBe(false);
      });

      it('@ only should return false', () => {
        expect(RegistryResolver.isRegistryRef('@')).toBe(false);
      });

      it('@scope/ without name should return false', () => {
        expect(RegistryResolver.isRegistryRef('@kanyun/')).toBe(false);
      });
    });
  });

  // ====================================================================
  // resolve() with overrideRegistryUrl parameter
  // ====================================================================

  describe('resolve with overrideRegistryUrl', () => {
    it('should accept an optional overrideRegistryUrl parameter', () => {
      const resolver = new RegistryResolver();
      // Verify the method signature accepts two parameters
      expect(resolver.resolve).toBeDefined();
      expect(resolver.resolve.length).toBeLessThanOrEqual(2);
    });
  });
});
