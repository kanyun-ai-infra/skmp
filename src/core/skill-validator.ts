/**
 * SkillValidator - Validate skills for publishing
 *
 * Validates skill.json and SKILL.md files according to the publishing requirements.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as semver from 'semver';
import type { SkillJson } from '../types/index.js';
import { parseSkillMdFile, type ParsedSkill } from './skill-parser.js';

// ============================================================================
// Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface LoadedSkill {
  path: string;
  skillJson: SkillJson | null;
  skillMd: ParsedSkill | null;
  readme: string | null;
  files: string[];
}

// ============================================================================
// Constants
// ============================================================================

const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_KEYWORDS = 10;
const SINGLE_CHAR_NAME_PATTERN = /^[a-z0-9]$/;

// Default files to include in publish
const DEFAULT_FILES = ['skill.json', 'SKILL.md', 'README.md', 'LICENSE'];

// ============================================================================
// SkillValidator Class
// ============================================================================

export class SkillValidator {
  /**
   * Validate skill name format
   *
   * Requirements:
   * - Lowercase letters, numbers, and hyphens only
   * - 1-64 characters
   * - Cannot start or end with hyphen
   * - Cannot have consecutive hyphens
   */
  validateName(name: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!name) {
      errors.push({
        field: 'name',
        message: 'Skill name is required',
        suggestion: 'Add "name" field to skill.json',
      });
      return { valid: false, errors, warnings: [] };
    }

    if (name.length > MAX_NAME_LENGTH) {
      errors.push({
        field: 'name',
        message: `Skill name must be at most ${MAX_NAME_LENGTH} characters`,
        suggestion: `Shorten the name to ${MAX_NAME_LENGTH} characters or less`,
      });
    }

    // Check for uppercase
    if (/[A-Z]/.test(name)) {
      errors.push({
        field: 'name',
        message: 'Skill name must be lowercase',
        suggestion: `Change "${name}" to "${name.toLowerCase()}"`,
      });
    }

    // Check for invalid characters
    if (/[^a-z0-9-]/.test(name)) {
      errors.push({
        field: 'name',
        message: 'Skill name can only contain lowercase letters, numbers, and hyphens',
        suggestion: 'Remove special characters from the name',
      });
    }

    // Check pattern for multi-char names
    if (name.length === 1) {
      if (!SINGLE_CHAR_NAME_PATTERN.test(name)) {
        errors.push({
          field: 'name',
          message: 'Single character name must be a lowercase letter or number',
        });
      }
    } else if (name.length > 1) {
      // Check start/end with hyphen
      if (name.startsWith('-')) {
        errors.push({
          field: 'name',
          message: 'Skill name cannot start with a hyphen',
        });
      }
      if (name.endsWith('-')) {
        errors.push({
          field: 'name',
          message: 'Skill name cannot end with a hyphen',
        });
      }
      // Check consecutive hyphens
      if (/--/.test(name)) {
        errors.push({
          field: 'name',
          message: 'Skill name cannot contain consecutive hyphens',
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings: [] };
  }

  /**
   * Validate version format (semver)
   */
  validateVersion(version: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!version) {
      errors.push({
        field: 'version',
        message: 'Version is required',
        suggestion: 'Add "version" field to skill.json (e.g., "1.0.0")',
      });
      return { valid: false, errors, warnings: [] };
    }

    // Check for v prefix
    if (version.startsWith('v')) {
      errors.push({
        field: 'version',
        message: 'Version should not have "v" prefix in skill.json',
        suggestion: `Change "${version}" to "${version.slice(1)}"`,
      });
      return { valid: false, errors, warnings: [] };
    }

    if (!semver.valid(version)) {
      errors.push({
        field: 'version',
        message: `Invalid version format: "${version}". Must follow semver (x.y.z)`,
        suggestion: 'Use format like "1.0.0" or "1.0.0-beta.1"',
      });
    }

    return { valid: errors.length === 0, errors, warnings: [] };
  }

  /**
   * Validate description
   */
  validateDescription(description: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!description) {
      errors.push({
        field: 'description',
        message: 'Description is required',
        suggestion: 'Add "description" field to skill.json',
      });
      return { valid: false, errors, warnings: [] };
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push({
        field: 'description',
        message: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`,
      });
    }

    if (/<|>/.test(description)) {
      errors.push({
        field: 'description',
        message: 'Description cannot contain angle brackets (< or >)',
        suggestion: 'Remove HTML-like tags from description',
      });
    }

    return { valid: errors.length === 0, errors, warnings: [] };
  }

  /**
   * Load skill information from directory
   */
  loadSkill(skillPath: string): LoadedSkill {
    const result: LoadedSkill = {
      path: skillPath,
      skillJson: null,
      skillMd: null,
      readme: null,
      files: [],
    };

    // Load skill.json
    const skillJsonPath = path.join(skillPath, 'skill.json');
    if (fs.existsSync(skillJsonPath)) {
      try {
        const content = fs.readFileSync(skillJsonPath, 'utf-8');
        result.skillJson = JSON.parse(content) as SkillJson;
      } catch {
        // Will be caught in validation
      }
    }

    // Load SKILL.md
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      try {
        result.skillMd = parseSkillMdFile(skillMdPath);
      } catch {
        // Will be caught in validation
      }
    }

    // Load README.md
    const readmePath = path.join(skillPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      const content = fs.readFileSync(readmePath, 'utf-8');
      // Only keep first 500 chars as preview
      result.readme = content.slice(0, 500);
    }

    // Scan files
    result.files = this.scanFiles(skillPath, result.skillJson?.files);

    return result;
  }

  /**
   * Scan files to include in publish
   */
  private scanFiles(skillPath: string, includePatterns?: string[]): string[] {
    const files: string[] = [];
    const seen = new Set<string>();

    // Add default files
    for (const file of DEFAULT_FILES) {
      const filePath = path.join(skillPath, file);
      if (fs.existsSync(filePath) && !seen.has(file)) {
        files.push(file);
        seen.add(file);
      }
    }

    // Add files from skill.json files array
    if (includePatterns && includePatterns.length > 0) {
      for (const pattern of includePatterns) {
        const targetPath = path.join(skillPath, pattern);

        if (fs.existsSync(targetPath)) {
          const stat = fs.statSync(targetPath);
          if (stat.isDirectory()) {
            // Recursively add all files in directory
            this.addFilesFromDir(skillPath, pattern, files, seen);
          } else if (!seen.has(pattern)) {
            files.push(pattern);
            seen.add(pattern);
          }
        }
      }
    }

    return files;
  }

  /**
   * Recursively add files from directory
   */
  private addFilesFromDir(basePath: string, dirPath: string, files: string[], seen: Set<string>): void {
    const fullPath = path.join(basePath, dirPath);
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        this.addFilesFromDir(basePath, relativePath, files, seen);
      } else if (!seen.has(relativePath)) {
        files.push(relativePath);
        seen.add(relativePath);
      }
    }
  }

  /**
   * Validate a skill directory for publishing
   */
  validate(skillPath: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check skill.json exists
    const skillJsonPath = path.join(skillPath, 'skill.json');
    if (!fs.existsSync(skillJsonPath)) {
      errors.push({
        field: 'skill.json',
        message: 'skill.json not found. This file is required for publishing.',
        suggestion: 'Create a skill.json file with name, version, and description',
      });
      return { valid: false, errors, warnings };
    }

    // Parse skill.json
    let skillJson: SkillJson;
    try {
      const content = fs.readFileSync(skillJsonPath, 'utf-8');
      skillJson = JSON.parse(content) as SkillJson;
    } catch (error) {
      errors.push({
        field: 'skill.json',
        message: `Failed to parse skill.json: ${(error as Error).message}`,
        suggestion: 'Check the JSON syntax is valid',
      });
      return { valid: false, errors, warnings };
    }

    // Validate required fields
    const nameResult = this.validateName(skillJson.name);
    errors.push(...nameResult.errors);

    const versionResult = this.validateVersion(skillJson.version);
    errors.push(...versionResult.errors);

    const descResult = this.validateDescription(skillJson.description || '');
    errors.push(...descResult.errors);

    // Check SKILL.md
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
      warnings.push({
        field: 'SKILL.md',
        message: 'SKILL.md not found (recommended for better AI agent integration)',
        suggestion: 'Create a SKILL.md file with name and description in frontmatter',
      });
    } else {
      // Parse and validate SKILL.md
      try {
        const skillMd = parseSkillMdFile(skillMdPath);
        if (!skillMd) {
          warnings.push({
            field: 'SKILL.md',
            message: 'SKILL.md has no valid frontmatter',
            suggestion: 'Add frontmatter with name and description',
          });
        } else {
          // Check name matches
          if (skillMd.name !== skillJson.name) {
            errors.push({
              field: 'SKILL.md',
              message: `Name mismatch: SKILL.md has "${skillMd.name}", skill.json has "${skillJson.name}"`,
              suggestion: 'Ensure name in SKILL.md matches skill.json',
            });
          }
        }
      } catch {
        warnings.push({
          field: 'SKILL.md',
          message: 'Failed to parse SKILL.md frontmatter',
        });
      }
    }

    // Check optional fields
    if (!skillJson.license) {
      warnings.push({
        field: 'license',
        message: 'No license specified',
        suggestion: 'Add a license field (e.g., "MIT", "Apache-2.0")',
      });
    }

    if (skillJson.keywords && skillJson.keywords.length > MAX_KEYWORDS) {
      warnings.push({
        field: 'keywords',
        message: `Too many keywords (${skillJson.keywords.length}). Recommended max: ${MAX_KEYWORDS}`,
      });
    }

    // Check entry file exists
    const entry = skillJson.entry || 'SKILL.md';
    const entryPath = path.join(skillPath, entry);
    if (entry !== 'SKILL.md' && !fs.existsSync(entryPath)) {
      errors.push({
        field: 'entry',
        message: `Entry file not found: ${entry}`,
        suggestion: `Create ${entry} or update "entry" in skill.json`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate integrity hash for files
   */
  generateIntegrity(skillPath: string, files: string[]): string {
    const hash = crypto.createHash('sha256');

    // Sort files for consistent ordering
    const sortedFiles = [...files].sort();

    for (const file of sortedFiles) {
      const filePath = path.join(skillPath, file);
      if (fs.existsSync(filePath)) {
        hash.update(file);
        const content = fs.readFileSync(filePath);
        hash.update(content);
      }
    }

    return `sha256-${hash.digest('hex')}`;
  }
}

export default SkillValidator;
