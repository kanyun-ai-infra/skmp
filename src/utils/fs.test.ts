import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  exists,
  readJson,
  writeJson,
  readText,
  writeText,
  ensureDir,
  remove,
  copyDir,
  listDir,
  isDirectory,
  isSymlink,
  createSymlink,
  findProjectRoot,
  getSkillsJsonPath,
  getSkillsLockPath,
  getSkillsDir,
  getCacheDir,
} from './fs.js';

describe('fs utilities', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('exists', () => {
    it('should return true for existing file', () => {
      const filePath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(filePath, 'test');
      expect(exists(filePath)).toBe(true);
    });

    it('should return false for non-existing file', () => {
      expect(exists(path.join(tempDir, 'non-existing.txt'))).toBe(false);
    });
  });

  describe('readJson/writeJson', () => {
    it('should read and write JSON files', () => {
      const filePath = path.join(tempDir, 'test.json');
      const data = { name: 'test', version: '1.0.0' };
      
      writeJson(filePath, data);
      expect(exists(filePath)).toBe(true);
      
      const read = readJson<typeof data>(filePath);
      expect(read).toEqual(data);
    });

    it('should create parent directories', () => {
      const filePath = path.join(tempDir, 'nested', 'dir', 'test.json');
      const data = { key: 'value' };
      
      writeJson(filePath, data);
      expect(exists(filePath)).toBe(true);
    });
  });

  describe('readText/writeText', () => {
    it('should read and write text files', () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Hello, World!';
      
      writeText(filePath, content);
      expect(readText(filePath)).toBe(content);
    });
  });

  describe('ensureDir', () => {
    it('should create directory if not exists', () => {
      const dirPath = path.join(tempDir, 'new-dir');
      expect(exists(dirPath)).toBe(false);
      
      ensureDir(dirPath);
      expect(exists(dirPath)).toBe(true);
      expect(isDirectory(dirPath)).toBe(true);
    });

    it('should not throw if directory exists', () => {
      const dirPath = path.join(tempDir, 'existing-dir');
      fs.mkdirSync(dirPath);
      
      expect(() => ensureDir(dirPath)).not.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove file', () => {
      const filePath = path.join(tempDir, 'to-remove.txt');
      fs.writeFileSync(filePath, 'test');
      expect(exists(filePath)).toBe(true);
      
      remove(filePath);
      expect(exists(filePath)).toBe(false);
    });

    it('should remove directory recursively', () => {
      const dirPath = path.join(tempDir, 'to-remove-dir');
      fs.mkdirSync(dirPath);
      fs.writeFileSync(path.join(dirPath, 'file.txt'), 'test');
      
      remove(dirPath);
      expect(exists(dirPath)).toBe(false);
    });

    it('should not throw for non-existing path', () => {
      expect(() => remove(path.join(tempDir, 'non-existing'))).not.toThrow();
    });
  });

  describe('copyDir', () => {
    it('should copy directory recursively', () => {
      const srcDir = path.join(tempDir, 'src');
      const destDir = path.join(tempDir, 'dest');
      
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, 'file1.txt'), 'content1');
      fs.mkdirSync(path.join(srcDir, 'subdir'));
      fs.writeFileSync(path.join(srcDir, 'subdir', 'file2.txt'), 'content2');
      
      copyDir(srcDir, destDir);
      
      expect(exists(path.join(destDir, 'file1.txt'))).toBe(true);
      expect(exists(path.join(destDir, 'subdir', 'file2.txt'))).toBe(true);
      expect(readText(path.join(destDir, 'file1.txt'))).toBe('content1');
    });

    it('should exclude specified files/directories', () => {
      const srcDir = path.join(tempDir, 'src');
      const destDir = path.join(tempDir, 'dest');
      
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, 'keep.txt'), 'keep');
      fs.mkdirSync(path.join(srcDir, '.git'));
      fs.writeFileSync(path.join(srcDir, '.git', 'config'), 'git');
      
      copyDir(srcDir, destDir, { exclude: ['.git'] });
      
      expect(exists(path.join(destDir, 'keep.txt'))).toBe(true);
      expect(exists(path.join(destDir, '.git'))).toBe(false);
    });
  });

  describe('listDir', () => {
    it('should list directory contents', () => {
      fs.writeFileSync(path.join(tempDir, 'a.txt'), '');
      fs.writeFileSync(path.join(tempDir, 'b.txt'), '');
      fs.mkdirSync(path.join(tempDir, 'subdir'));
      
      const list = listDir(tempDir);
      expect(list).toContain('a.txt');
      expect(list).toContain('b.txt');
      expect(list).toContain('subdir');
    });

    it('should return empty array for non-existing directory', () => {
      expect(listDir(path.join(tempDir, 'non-existing'))).toEqual([]);
    });
  });

  describe('isDirectory', () => {
    it('should return true for directory', () => {
      const dirPath = path.join(tempDir, 'dir');
      fs.mkdirSync(dirPath);
      expect(isDirectory(dirPath)).toBe(true);
    });

    it('should return false for file', () => {
      const filePath = path.join(tempDir, 'file.txt');
      fs.writeFileSync(filePath, '');
      expect(isDirectory(filePath)).toBe(false);
    });
  });

  describe('isSymlink and createSymlink', () => {
    it('should create and detect symlink', () => {
      const targetDir = path.join(tempDir, 'target');
      const linkPath = path.join(tempDir, 'link');
      
      fs.mkdirSync(targetDir);
      fs.writeFileSync(path.join(targetDir, 'file.txt'), 'content');
      
      createSymlink(targetDir, linkPath);
      
      expect(isSymlink(linkPath)).toBe(true);
      expect(exists(path.join(linkPath, 'file.txt'))).toBe(true);
    });
  });

  describe('findProjectRoot', () => {
    it('should find project root with skills.json', () => {
      const projectDir = path.join(tempDir, 'project');
      const subDir = path.join(projectDir, 'sub', 'dir');
      
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'skills.json'), '{}');
      
      expect(findProjectRoot(subDir)).toBe(projectDir);
    });

    it('should return null if no skills.json found', () => {
      expect(findProjectRoot(tempDir)).toBe(null);
    });
  });

  describe('path helpers', () => {
    it('should return correct skills.json path', () => {
      expect(getSkillsJsonPath('/project')).toBe('/project/skills.json');
    });

    it('should return correct skills.lock path', () => {
      expect(getSkillsLockPath('/project')).toBe('/project/skills.lock');
    });

    it('should return correct skills directory', () => {
      expect(getSkillsDir('/project')).toBe('/project/.skills');
      expect(getSkillsDir('/project', 'custom')).toBe('/project/custom');
    });

    it('should return cache directory', () => {
      const cacheDir = getCacheDir();
      expect(cacheDir).toContain('.reskill-cache');
    });
  });
});
