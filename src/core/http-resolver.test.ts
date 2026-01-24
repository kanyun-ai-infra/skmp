import { describe, expect, it } from 'vitest';
import { HttpResolver } from './http-resolver.js';

describe('HttpResolver', () => {
  const resolver = new HttpResolver();

  describe('isHttpUrl', () => {
    it('should return true for http:// URLs', () => {
      expect(HttpResolver.isHttpUrl('http://example.com/skill.tar.gz')).toBe(true);
    });

    it('should return true for https:// URLs', () => {
      expect(HttpResolver.isHttpUrl('https://example.com/skill.tar.gz')).toBe(true);
    });

    it('should return true for oss:// URLs', () => {
      expect(HttpResolver.isHttpUrl('oss://bucket/path/skill.tar.gz')).toBe(true);
    });

    it('should return true for s3:// URLs', () => {
      expect(HttpResolver.isHttpUrl('s3://bucket/path/skill.tar.gz')).toBe(true);
    });

    it('should return true for URLs with version suffix', () => {
      expect(HttpResolver.isHttpUrl('https://example.com/skill.tar.gz@v1.0.0')).toBe(true);
    });

    it('should return false for Git shorthand', () => {
      expect(HttpResolver.isHttpUrl('github:user/repo')).toBe(false);
    });

    it('should return false for SSH URLs', () => {
      expect(HttpResolver.isHttpUrl('git@github.com:user/repo.git')).toBe(false);
    });
  });

  describe('parseUrl', () => {
    it('should parse simple HTTPS URL', () => {
      const result = resolver.parseUrl('https://example.com/skills/my-skill.tar.gz');

      expect(result.url).toBe('https://example.com/skills/my-skill.tar.gz');
      expect(result.host).toBe('example.com');
      expect(result.path).toBe('/skills/my-skill.tar.gz');
      expect(result.filename).toBe('my-skill.tar.gz');
      expect(result.format).toBe('tar.gz');
      expect(result.skillName).toBe('my-skill');
      expect(result.version).toBeUndefined();
    });

    it('should parse URL with version in filename', () => {
      const result = resolver.parseUrl('https://example.com/skill-v1.0.0.tar.gz');

      expect(result.skillName).toBe('skill');
      expect(result.version).toBe('v1.0.0');
    });

    it('should parse URL with explicit version suffix', () => {
      const result = resolver.parseUrl('https://example.com/skill.tar.gz@v2.0.0');

      expect(result.url).toBe('https://example.com/skill.tar.gz');
      expect(result.skillName).toBe('skill');
      expect(result.version).toBe('v2.0.0');
    });

    it('should prefer explicit version over filename version', () => {
      const result = resolver.parseUrl('https://example.com/skill-v1.0.0.tar.gz@v2.0.0');

      expect(result.skillName).toBe('skill');
      expect(result.version).toBe('v2.0.0');
    });

    it('should parse Aliyun OSS URL', () => {
      const result = resolver.parseUrl('https://bucket.oss-cn-hangzhou.aliyuncs.com/path/skill.tar.gz');

      expect(result.host).toBe('bucket.oss-cn-hangzhou.aliyuncs.com');
      expect(result.skillName).toBe('skill');
      expect(result.format).toBe('tar.gz');
    });

    it('should parse AWS S3 URL', () => {
      const result = resolver.parseUrl('https://bucket.s3.amazonaws.com/path/skill-v1.2.3.zip');

      expect(result.host).toBe('bucket.s3.amazonaws.com');
      expect(result.skillName).toBe('skill');
      expect(result.version).toBe('v1.2.3');
      expect(result.format).toBe('zip');
    });

    it('should normalize oss:// protocol', () => {
      const result = resolver.parseUrl('oss://my-bucket/skills/test-skill.tar.gz');

      expect(result.url).toBe('https://my-bucket.oss.aliyuncs.com/skills/test-skill.tar.gz');
      expect(result.host).toBe('my-bucket.oss.aliyuncs.com');
      expect(result.skillName).toBe('test-skill');
    });

    it('should normalize s3:// protocol', () => {
      const result = resolver.parseUrl('s3://my-bucket/skills/test-skill.tar.gz');

      expect(result.url).toBe('https://my-bucket.s3.amazonaws.com/skills/test-skill.tar.gz');
      expect(result.host).toBe('my-bucket.s3.amazonaws.com');
      expect(result.skillName).toBe('test-skill');
    });

    it('should detect tgz format', () => {
      const result = resolver.parseUrl('https://example.com/skill.tgz');
      expect(result.format).toBe('tgz');
    });

    it('should detect zip format', () => {
      const result = resolver.parseUrl('https://example.com/skill.zip');
      expect(result.format).toBe('zip');
    });

    it('should detect tar format', () => {
      const result = resolver.parseUrl('https://example.com/skill.tar');
      expect(result.format).toBe('tar');
    });

    it('should handle version without v prefix', () => {
      const result = resolver.parseUrl('https://example.com/skill-1.0.0.tar.gz');
      expect(result.skillName).toBe('skill');
      expect(result.version).toBe('1.0.0');
    });

    it('should handle version with prerelease suffix', () => {
      const result = resolver.parseUrl('https://example.com/skill-v1.0.0-beta.1.tar.gz');
      expect(result.skillName).toBe('skill');
      expect(result.version).toBe('v1.0.0-beta.1');
    });

    it('should handle underscore version separator', () => {
      const result = resolver.parseUrl('https://example.com/my_skill_v2.0.0.tar.gz');
      expect(result.skillName).toBe('my_skill');
      expect(result.version).toBe('v2.0.0');
    });
  });

  describe('parseRef', () => {
    it('should return ParsedSkillRef compatible format', () => {
      const result = resolver.parseRef('https://example.com/skills/my-skill-v1.0.0.tar.gz');

      expect(result.registry).toBe('http');
      expect(result.owner).toBe('example.com');
      expect(result.repo).toBe('my-skill');
      expect(result.version).toBe('v1.0.0');
      expect(result.raw).toBe('https://example.com/skills/my-skill-v1.0.0.tar.gz');
    });
  });

  describe('parseVersion', () => {
    it('should parse empty version as exact latest', () => {
      const result = resolver.parseVersion(undefined);
      expect(result.type).toBe('exact');
      expect(result.value).toBe('latest');
    });

    it('should parse latest keyword', () => {
      const result = resolver.parseVersion('latest');
      expect(result.type).toBe('latest');
      expect(result.value).toBe('latest');
    });

    it('should parse exact version', () => {
      const result = resolver.parseVersion('v1.0.0');
      expect(result.type).toBe('exact');
      expect(result.value).toBe('v1.0.0');
    });
  });

  describe('buildRepoUrl', () => {
    it('should return the normalized URL from raw reference', () => {
      const parsed = resolver.parseRef('https://example.com/skill.tar.gz@v1.0.0');
      const url = resolver.buildRepoUrl(parsed);

      expect(url).toBe('https://example.com/skill.tar.gz');
    });

    it('should normalize oss:// in buildRepoUrl', () => {
      const parsed = resolver.parseRef('oss://bucket/skill.tar.gz');
      const url = resolver.buildRepoUrl(parsed);

      expect(url).toBe('https://bucket.oss.aliyuncs.com/skill.tar.gz');
    });
  });

  describe('resolve', () => {
    it('should resolve complete HTTP URL', async () => {
      const result = await resolver.resolve('https://example.com/skills/my-skill-v1.0.0.tar.gz');

      expect(result.parsed.registry).toBe('http');
      expect(result.parsed.owner).toBe('example.com');
      expect(result.parsed.repo).toBe('my-skill');
      expect(result.repoUrl).toBe('https://example.com/skills/my-skill-v1.0.0.tar.gz');
      expect(result.ref).toBe('v1.0.0');
      expect(result.httpInfo.skillName).toBe('my-skill');
      expect(result.httpInfo.format).toBe('tar.gz');
    });

    it('should resolve OSS URL with version', async () => {
      const result = await resolver.resolve('oss://my-bucket/skills/test-skill.tar.gz@v2.0.0');

      expect(result.repoUrl).toBe('https://my-bucket.oss.aliyuncs.com/skills/test-skill.tar.gz');
      expect(result.ref).toBe('v2.0.0');
      expect(result.httpInfo.skillName).toBe('test-skill');
    });

    it('should default to latest when no version specified', async () => {
      const result = await resolver.resolve('https://example.com/skill.tar.gz');

      expect(result.ref).toBe('latest');
    });
  });
});
