import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SkillManager } from './skill-manager.js';

describe('SkillManager', () => {
  let tempDir: string;
  let skillManager: SkillManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-skill-manager-test-'));
    skillManager = new SkillManager(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getProjectRoot', () => {
    it('should return project root', () => {
      expect(skillManager.getProjectRoot()).toBe(tempDir);
    });
  });

  describe('getInstallDir', () => {
    it('should return default install directory', () => {
      expect(skillManager.getInstallDir()).toBe(path.join(tempDir, '.skills'));
    });

    it('should return global install directory when in global mode', () => {
      const globalManager = new SkillManager(tempDir, { global: true });
      const home = process.env.HOME || process.env.USERPROFILE || '';
      expect(globalManager.getInstallDir()).toBe(path.join(home, '.claude', 'skills'));
    });
  });

  describe('isGlobalMode', () => {
    it('should return false by default', () => {
      expect(skillManager.isGlobalMode()).toBe(false);
    });

    it('should return true when global option is set', () => {
      const globalManager = new SkillManager(tempDir, { global: true });
      expect(globalManager.isGlobalMode()).toBe(true);
    });
  });

  describe('getSkillPath', () => {
    it('should return skill path', () => {
      expect(skillManager.getSkillPath('my-skill')).toBe(
        path.join(tempDir, '.skills', 'my-skill')
      );
    });
  });

  describe('list', () => {
    it('should return empty array when no skills installed', () => {
      expect(skillManager.list()).toEqual([]);
    });

    it('should return installed skills', () => {
      const skillsDir = path.join(tempDir, '.skills');
      const skillPath = path.join(skillsDir, 'test-skill');
      
      fs.mkdirSync(skillPath, { recursive: true });
      fs.writeFileSync(
        path.join(skillPath, 'skill.json'),
        JSON.stringify({ name: 'test-skill', version: '1.0.0' })
      );

      const skills = skillManager.list();
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('test-skill');
    });
  });

  describe('getInstalledSkill', () => {
    it('should return null for non-installed skill', () => {
      expect(skillManager.getInstalledSkill('non-existent')).toBeNull();
    });

    it('should return skill info for installed skill', () => {
      const skillsDir = path.join(tempDir, '.skills');
      const skillPath = path.join(skillsDir, 'test-skill');
      
      fs.mkdirSync(skillPath, { recursive: true });
      fs.writeFileSync(
        path.join(skillPath, 'skill.json'),
        JSON.stringify({ name: 'test-skill', version: '1.0.0', description: 'Test skill' })
      );

      const skill = skillManager.getInstalledSkill('test-skill');
      expect(skill).not.toBeNull();
      expect(skill?.name).toBe('test-skill');
      expect(skill?.metadata?.version).toBe('1.0.0');
    });
  });

  describe('link/unlink', () => {
    it('should link local skill', () => {
      // Create a local skill directory
      const localSkillDir = path.join(tempDir, 'local-skill');
      fs.mkdirSync(localSkillDir);
      fs.writeFileSync(
        path.join(localSkillDir, 'skill.json'),
        JSON.stringify({ name: 'my-local-skill', version: '0.1.0' })
      );
      fs.writeFileSync(path.join(localSkillDir, 'SKILL.md'), '# My Local Skill');

      const linked = skillManager.link(localSkillDir);
      
      expect(linked.name).toBe('my-local-skill');
      expect(linked.isLinked).toBe(true);
      expect(fs.existsSync(skillManager.getSkillPath('my-local-skill'))).toBe(true);
    });

    it('should link with custom name', () => {
      const localSkillDir = path.join(tempDir, 'local-skill');
      fs.mkdirSync(localSkillDir);
      fs.writeFileSync(path.join(localSkillDir, 'SKILL.md'), '# Skill');

      const linked = skillManager.link(localSkillDir, 'custom-name');
      expect(linked.name).toBe('custom-name');
    });

    it('should unlink linked skill', () => {
      const localSkillDir = path.join(tempDir, 'local-skill');
      fs.mkdirSync(localSkillDir);
      fs.writeFileSync(path.join(localSkillDir, 'SKILL.md'), '# Skill');

      skillManager.link(localSkillDir, 'to-unlink');
      const result = skillManager.unlink('to-unlink');
      
      expect(result).toBe(true);
      expect(fs.existsSync(skillManager.getSkillPath('to-unlink'))).toBe(false);
    });

    it('should return false when unlinking non-existent skill', () => {
      expect(skillManager.unlink('non-existent')).toBe(false);
    });
  });

  describe('uninstall', () => {
    it('should uninstall skill', () => {
      const skillPath = path.join(tempDir, '.skills', 'test-skill');
      fs.mkdirSync(skillPath, { recursive: true });
      fs.writeFileSync(path.join(skillPath, 'skill.json'), '{}');

      // Create skills.json
      fs.writeFileSync(
        path.join(tempDir, 'skills.json'),
        JSON.stringify({ skills: { 'test-skill': 'github:user/test-skill@v1.0.0' } })
      );

      const result = skillManager.uninstall('test-skill');
      
      expect(result).toBe(true);
      expect(fs.existsSync(skillPath)).toBe(false);
    });

    it('should return false for non-installed skill', () => {
      expect(skillManager.uninstall('non-existent')).toBe(false);
    });
  });

  describe('getInfo', () => {
    it('should return skill info', () => {
      // Create skills.json
      fs.writeFileSync(
        path.join(tempDir, 'skills.json'),
        JSON.stringify({ skills: { 'test-skill': 'github:user/test-skill@v1.0.0' } })
      );

      const info = skillManager.getInfo('test-skill');
      expect(info.config).toBe('github:user/test-skill@v1.0.0');
      expect(info.installed).toBeNull(); // Not installed yet
    });
  });
});

// Integration tests (require network)
describe('SkillManager integration', () => {
  it.skip('should install from real repository', async () => {
    // This test requires network access
  });

  it.skip('should update skill', async () => {
    // This test requires network access
  });
});
