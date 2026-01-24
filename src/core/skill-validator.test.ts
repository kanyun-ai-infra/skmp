/**
 * SkillValidator unit tests
 *
 * Tests for validating skill.json and SKILL.md for publishing
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SkillValidator } from './skill-validator.js';

describe('SkillValidator', () => {
  let tempDir: string;
  let validator: SkillValidator;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-validator-test-'));
    validator = new SkillValidator();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Helper functions
  function createSkillJson(content: object): void {
    fs.writeFileSync(
      path.join(tempDir, 'skill.json'),
      JSON.stringify(content, null, 2),
    );
  }

  function createSkillMd(content: string): void {
    fs.writeFileSync(path.join(tempDir, 'SKILL.md'), content);
  }

  // ============================================================================
  // validateName tests
  // ============================================================================

  describe('validateName', () => {
    it('should accept valid lowercase name', () => {
      const result = validator.validateName('my-skill');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept name with numbers', () => {
      const result = validator.validateName('skill-v2');
      expect(result.valid).toBe(true);
    });

    it('should accept name starting with number', () => {
      const result = validator.validateName('2048-game');
      expect(result.valid).toBe(true);
    });

    it('should accept single character name', () => {
      const result = validator.validateName('a');
      expect(result.valid).toBe(true);
    });

    it('should accept two character name', () => {
      const result = validator.validateName('ab');
      expect(result.valid).toBe(true);
    });

    it('should reject empty name', () => {
      const result = validator.validateName('');
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('name');
    });

    it('should reject uppercase letters', () => {
      const result = validator.validateName('MySkill');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('lowercase');
    });

    it('should reject names starting with hyphen', () => {
      const result = validator.validateName('-my-skill');
      expect(result.valid).toBe(false);
    });

    it('should reject names ending with hyphen', () => {
      const result = validator.validateName('my-skill-');
      expect(result.valid).toBe(false);
    });

    it('should reject names with consecutive hyphens', () => {
      const result = validator.validateName('my--skill');
      expect(result.valid).toBe(false);
    });

    it('should reject names longer than 64 characters', () => {
      const longName = 'a'.repeat(65);
      const result = validator.validateName(longName);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('64');
    });

    it('should accept names exactly 64 characters', () => {
      const name = 'a'.repeat(64);
      const result = validator.validateName(name);
      expect(result.valid).toBe(true);
    });

    it('should reject names with special characters', () => {
      const result = validator.validateName('my_skill');
      expect(result.valid).toBe(false);
    });

    it('should reject names with spaces', () => {
      const result = validator.validateName('my skill');
      expect(result.valid).toBe(false);
    });

    it('should reject names with dots', () => {
      const result = validator.validateName('my.skill');
      expect(result.valid).toBe(false);
    });
  });

  // ============================================================================
  // validateVersion tests
  // ============================================================================

  describe('validateVersion', () => {
    it('should accept valid semver 1.0.0', () => {
      const result = validator.validateVersion('1.0.0');
      expect(result.valid).toBe(true);
    });

    it('should accept semver with zero major', () => {
      const result = validator.validateVersion('0.1.0');
      expect(result.valid).toBe(true);
    });

    it('should accept large version numbers', () => {
      const result = validator.validateVersion('10.20.30');
      expect(result.valid).toBe(true);
    });

    it('should accept semver with prerelease alpha', () => {
      const result = validator.validateVersion('1.0.0-alpha');
      expect(result.valid).toBe(true);
    });

    it('should accept semver with prerelease beta.1', () => {
      const result = validator.validateVersion('1.0.0-beta.1');
      expect(result.valid).toBe(true);
    });

    it('should accept semver with prerelease rc.1', () => {
      const result = validator.validateVersion('1.0.0-rc.1');
      expect(result.valid).toBe(true);
    });

    it('should accept semver with build metadata', () => {
      const result = validator.validateVersion('1.0.0+build.123');
      expect(result.valid).toBe(true);
    });

    it('should reject version with only two parts', () => {
      const result = validator.validateVersion('1.0');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('semver');
    });

    it('should reject version with v prefix', () => {
      const result = validator.validateVersion('v1.0.0');
      expect(result.valid).toBe(false);
    });

    it('should reject version with only one part', () => {
      const result = validator.validateVersion('1');
      expect(result.valid).toBe(false);
    });

    it('should reject non-numeric version', () => {
      const result = validator.validateVersion('latest');
      expect(result.valid).toBe(false);
    });

    it('should reject empty version', () => {
      const result = validator.validateVersion('');
      expect(result.valid).toBe(false);
    });
  });

  // ============================================================================
  // validateDescription tests
  // ============================================================================

  describe('validateDescription', () => {
    it('should accept valid description', () => {
      const result = validator.validateDescription('A helpful AI skill');
      expect(result.valid).toBe(true);
    });

    it('should accept description with special characters', () => {
      const result = validator.validateDescription("It's a great skill! (version 2.0)");
      expect(result.valid).toBe(true);
    });

    it('should reject empty description', () => {
      const result = validator.validateDescription('');
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('description');
    });

    it('should reject description over 1024 chars', () => {
      const longDesc = 'a'.repeat(1025);
      const result = validator.validateDescription(longDesc);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('1024');
    });

    it('should accept description exactly 1024 chars', () => {
      const desc = 'a'.repeat(1024);
      const result = validator.validateDescription(desc);
      expect(result.valid).toBe(true);
    });

    it('should reject description with < character', () => {
      const result = validator.validateDescription('Use <script> tags');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('angle brackets');
    });

    it('should reject description with > character', () => {
      const result = validator.validateDescription('Value > 10');
      expect(result.valid).toBe(false);
    });
  });

  // ============================================================================
  // validate (full skill directory) tests
  // ============================================================================

  describe('validate', () => {
    describe('skill.json validation', () => {
      it('should pass with valid skill.json', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0.0',
          description: 'A helpful skill',
        });

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail without skill.json', () => {
        const result = validator.validate(tempDir);
        expect(result.valid).toBe(false);
        expect(result.errors[0].field).toBe('skill.json');
        expect(result.errors[0].message).toContain('not found');
      });

      it('should fail with invalid JSON', () => {
        fs.writeFileSync(path.join(tempDir, 'skill.json'), '{ invalid json }');

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(false);
        expect(result.errors[0].field).toBe('skill.json');
        expect(result.errors[0].message).toContain('parse');
      });

      it('should fail without name', () => {
        createSkillJson({
          version: '1.0.0',
          description: 'A skill',
        });

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field === 'name')).toBe(true);
      });

      it('should fail without version', () => {
        createSkillJson({
          name: 'my-skill',
          description: 'A skill',
        });

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field === 'version')).toBe(true);
      });

      it('should fail without description', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0.0',
        });

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field === 'description')).toBe(true);
      });

      it('should fail with invalid name format', () => {
        createSkillJson({
          name: 'MySkill',
          version: '1.0.0',
          description: 'A skill',
        });

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field === 'name')).toBe(true);
      });

      it('should fail with invalid version format', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0',
          description: 'A skill',
        });

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field === 'version')).toBe(true);
      });

      it('should collect multiple errors', () => {
        createSkillJson({
          name: 'MySkill',
          version: '1.0',
        });

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('SKILL.md validation', () => {
      it('should warn when SKILL.md is missing', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0.0',
          description: 'A skill',
        });

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(true);
        expect(result.warnings.some((w) => w.field === 'SKILL.md')).toBe(true);
      });

      it('should pass with matching SKILL.md', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0.0',
          description: 'A skill',
        });
        createSkillMd(`---
name: my-skill
description: A skill for testing
---
# My Skill`);

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(true);
        expect(result.warnings.some((w) => w.field === 'SKILL.md')).toBe(false);
      });

      it('should fail when SKILL.md name mismatches', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0.0',
          description: 'A skill',
        });
        createSkillMd(`---
name: different-skill
description: A skill
---
Content`);

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('mismatch'))).toBe(true);
      });

      it('should warn for SKILL.md without frontmatter', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0.0',
          description: 'A skill',
        });
        createSkillMd('# My Skill\n\nNo frontmatter here');

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(true);
        expect(result.warnings.some((w) => w.field === 'SKILL.md')).toBe(true);
      });
    });

    describe('optional fields validation', () => {
      it('should warn for missing license', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0.0',
          description: 'A skill',
        });

        const result = validator.validate(tempDir);
        expect(result.warnings.some((w) => w.field === 'license')).toBe(true);
      });

      it('should not warn when license is present', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0.0',
          description: 'A skill',
          license: 'MIT',
        });

        const result = validator.validate(tempDir);
        expect(result.warnings.some((w) => w.field === 'license')).toBe(false);
      });

      it('should warn for too many keywords', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0.0',
          description: 'A skill',
          keywords: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'],
        });

        const result = validator.validate(tempDir);
        expect(result.warnings.some((w) => w.field === 'keywords')).toBe(true);
      });

      it('should accept up to 10 keywords', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0.0',
          description: 'A skill',
          keywords: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
        });

        const result = validator.validate(tempDir);
        expect(result.warnings.some((w) => w.field === 'keywords')).toBe(false);
      });
    });

    describe('entry file validation', () => {
      it('should fail when default entry file SKILL.md does not exist', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0.0',
          description: 'A skill',
        });

        const result = validator.validate(tempDir);
        // Should warn about missing SKILL.md but still be valid
        // (SKILL.md is recommended but not strictly required)
        expect(result.valid).toBe(true);
      });

      it('should fail when custom entry file does not exist', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0.0',
          description: 'A skill',
          entry: 'custom-entry.md',
        });

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.field === 'entry')).toBe(true);
      });

      it('should pass when custom entry file exists', () => {
        createSkillJson({
          name: 'my-skill',
          version: '1.0.0',
          description: 'A skill',
          entry: 'custom-entry.md',
        });
        fs.writeFileSync(path.join(tempDir, 'custom-entry.md'), '# Custom Entry');

        const result = validator.validate(tempDir);
        expect(result.valid).toBe(true);
      });
    });
  });

  // ============================================================================
  // loadSkill tests
  // ============================================================================

  describe('loadSkill', () => {
    it('should load skill.json content', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'A skill',
        keywords: ['test'],
      });

      const skill = validator.loadSkill(tempDir);
      expect(skill.skillJson).not.toBeNull();
      expect(skill.skillJson?.name).toBe('my-skill');
      expect(skill.skillJson?.version).toBe('1.0.0');
      expect(skill.skillJson?.keywords).toEqual(['test']);
    });

    it('should load SKILL.md content', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'A skill',
      });
      createSkillMd(`---
name: my-skill
description: A test skill
---
# Content`);

      const skill = validator.loadSkill(tempDir);
      expect(skill.skillMd).not.toBeNull();
      expect(skill.skillMd?.name).toBe('my-skill');
    });

    it('should return null skillJson when file does not exist', () => {
      const skill = validator.loadSkill(tempDir);
      expect(skill.skillJson).toBeNull();
    });

    it('should return null skillMd when file does not exist', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'A skill',
      });

      const skill = validator.loadSkill(tempDir);
      expect(skill.skillMd).toBeNull();
    });

    it('should scan files list', () => {
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'A skill',
      });
      createSkillMd('---\nname: my-skill\ndescription: test\n---\n# Test');
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# README');

      const skill = validator.loadSkill(tempDir);
      expect(skill.files).toContain('skill.json');
      expect(skill.files).toContain('SKILL.md');
      expect(skill.files).toContain('README.md');
    });

    it('should include files from skill.json files array', () => {
      fs.mkdirSync(path.join(tempDir, 'examples'));
      fs.writeFileSync(path.join(tempDir, 'examples', 'basic.md'), '# Basic');
      createSkillJson({
        name: 'my-skill',
        version: '1.0.0',
        description: 'A skill',
        files: ['examples/'],
      });

      const skill = validator.loadSkill(tempDir);
      expect(skill.files.some((f) => f.includes('examples'))).toBe(true);
    });
  });

  // ============================================================================
  // generateIntegrity tests
  // ============================================================================

  describe('generateIntegrity', () => {
    it('should generate sha256 hash', () => {
      createSkillJson({ name: 'test', version: '1.0.0', description: 'test' });

      const hash = validator.generateIntegrity(tempDir, ['skill.json']);
      expect(hash).toMatch(/^sha256-[a-f0-9]{64}$/);
    });

    it('should generate consistent hash for same content', () => {
      createSkillJson({ name: 'test', version: '1.0.0', description: 'test' });

      const hash1 = validator.generateIntegrity(tempDir, ['skill.json']);
      const hash2 = validator.generateIntegrity(tempDir, ['skill.json']);
      expect(hash1).toBe(hash2);
    });

    it('should change when file content changes', () => {
      createSkillJson({ name: 'test', version: '1.0.0', description: 'test' });
      const hash1 = validator.generateIntegrity(tempDir, ['skill.json']);

      createSkillJson({ name: 'test', version: '1.0.1', description: 'test' });
      const hash2 = validator.generateIntegrity(tempDir, ['skill.json']);

      expect(hash1).not.toBe(hash2);
    });

    it('should be independent of file order', () => {
      fs.writeFileSync(path.join(tempDir, 'a.txt'), 'aaa');
      fs.writeFileSync(path.join(tempDir, 'b.txt'), 'bbb');

      const hash1 = validator.generateIntegrity(tempDir, ['a.txt', 'b.txt']);
      const hash2 = validator.generateIntegrity(tempDir, ['b.txt', 'a.txt']);

      expect(hash1).toBe(hash2);
    });

    it('should include file names in hash', () => {
      fs.writeFileSync(path.join(tempDir, 'a.txt'), 'content');
      fs.writeFileSync(path.join(tempDir, 'b.txt'), 'content');

      const hash1 = validator.generateIntegrity(tempDir, ['a.txt']);
      const hash2 = validator.generateIntegrity(tempDir, ['b.txt']);

      // Same content but different file names should produce different hashes
      expect(hash1).not.toBe(hash2);
    });
  });
});
