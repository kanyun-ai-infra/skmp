/**
 * Skill Parser - SKILL.md parser
 *
 * Following agentskills.io specification: https://agentskills.io/specification
 *
 * SKILL.md format requirements:
 * - YAML frontmatter containing name and description (required)
 * - name: max 64 characters, lowercase letters, numbers, hyphens
 * - description: max 1024 characters
 * - Optional fields: license, compatibility, metadata, allowed-tools
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * SKILL.md frontmatter raw data
 */
export interface SkillMdFrontmatter {
  /** Skill name (required) - lowercase letters, numbers, hyphens */
  name: string;
  /** Skill description (required) */
  description: string;
  /** Version (optional, semver format) */
  version?: string;
  /** License */
  license?: string;
  /** Compatibility requirements */
  compatibility?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** List of allowed tools (space separated) */
  'allowed-tools'?: string;
}

/**
 * Parsed Skill information
 */
export interface ParsedSkill {
  /** Skill name */
  name: string;
  /** Skill description */
  description: string;
  /** Version (optional, semver format) */
  version?: string;
  /** License */
  license?: string;
  /** Compatibility requirements */
  compatibility?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** List of allowed tools */
  allowedTools?: string[];
  /** Markdown content (without frontmatter) */
  content: string;
  /** Original full content */
  rawContent: string;
}

/**
 * Skill validation error
 */
export class SkillValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = 'SkillValidationError';
  }
}

/**
 * Simple YAML frontmatter parser
 * Parses --- delimited YAML header
 *
 * Supports:
 * - Basic key: value pairs
 * - Multiline strings (| and >)
 * - Nested objects (one level deep, for metadata field)
 */
function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { data: {}, content };
  }

  const yamlContent = match[1];
  const markdownContent = match[2];

  // Simple YAML parsing (supports basic key: value format and one level of nesting)
  const data: Record<string, unknown> = {};
  const lines = yamlContent.split('\n');
  let currentKey = '';
  let currentValue = '';
  let inMultiline = false;
  let inNestedObject = false;
  let nestedObject: Record<string, unknown> = {};

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Check if it's a nested key: value pair (indented with 2 spaces)
    const nestedMatch = line.match(/^ {2}([a-zA-Z_-]+):\s*(.*)$/);
    if (nestedMatch && inNestedObject) {
      const [, nestedKey, nestedValue] = nestedMatch;
      nestedObject[nestedKey] = parseYamlValue(nestedValue.trim());
      continue;
    }

    // Check if it's a new key: value pair (no indent)
    const keyValueMatch = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);

    if (keyValueMatch && !inMultiline) {
      // Save previous nested object if any
      if (inNestedObject && currentKey) {
        data[currentKey] = nestedObject;
        nestedObject = {};
        inNestedObject = false;
      }

      // Save previous value
      if (currentKey && !inNestedObject) {
        data[currentKey] = parseYamlValue(currentValue.trim());
      }

      currentKey = keyValueMatch[1];
      currentValue = keyValueMatch[2];

      // Check if it's start of multiline string
      if (currentValue === '|' || currentValue === '>') {
        inMultiline = true;
        currentValue = '';
      } else if (currentValue === '') {
        // Empty value - might be start of nested object
        inNestedObject = true;
        nestedObject = {};
      }
    } else if (inMultiline && line.startsWith('  ')) {
      // Multiline string continuation
      currentValue += (currentValue ? '\n' : '') + line.slice(2);
    } else if (inMultiline && !line.startsWith('  ')) {
      // Multiline string end
      inMultiline = false;
      data[currentKey] = currentValue.trim();

      // Try to parse new line
      const newKeyMatch = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
      if (newKeyMatch) {
        currentKey = newKeyMatch[1];
        currentValue = newKeyMatch[2];
      }
    }
  }

  // Save last value
  if (inNestedObject && currentKey) {
    data[currentKey] = nestedObject;
  } else if (currentKey) {
    data[currentKey] = parseYamlValue(currentValue.trim());
  }

  return { data, content: markdownContent };
}

/**
 * Parse YAML value
 */
function parseYamlValue(value: string): unknown {
  if (!value) return '';

  // Boolean value
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Number
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

  // Remove quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

/**
 * Validate skill name format
 *
 * Specification requirements:
 * - Max 64 characters
 * - Only lowercase letters, numbers, hyphens allowed
 * - Cannot start or end with hyphen
 * - Cannot contain consecutive hyphens
 */
export function validateSkillName(name: string): void {
  if (!name) {
    throw new SkillValidationError('Skill name is required', 'name');
  }

  if (name.length > 64) {
    throw new SkillValidationError('Skill name must be at most 64 characters', 'name');
  }

  if (!/^[a-z0-9]/.test(name)) {
    throw new SkillValidationError(
      'Skill name must start with a lowercase letter or number',
      'name',
    );
  }

  if (!/[a-z0-9]$/.test(name)) {
    throw new SkillValidationError('Skill name must end with a lowercase letter or number', 'name');
  }

  if (/--/.test(name)) {
    throw new SkillValidationError('Skill name cannot contain consecutive hyphens', 'name');
  }

  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name) && name.length > 1) {
    throw new SkillValidationError(
      'Skill name can only contain lowercase letters, numbers, and hyphens',
      'name',
    );
  }

  // Single character name
  if (name.length === 1 && !/^[a-z0-9]$/.test(name)) {
    throw new SkillValidationError(
      'Single character skill name must be a lowercase letter or number',
      'name',
    );
  }
}

/**
 * Validate skill description
 *
 * Specification requirements:
 * - Max 1024 characters
 * - Angle brackets are allowed per agentskills.io spec
 */
export function validateSkillDescription(description: string): void {
  if (!description) {
    throw new SkillValidationError('Skill description is required', 'description');
  }

  if (description.length > 1024) {
    throw new SkillValidationError(
      'Skill description must be at most 1024 characters',
      'description',
    );
  }

  // Note: angle brackets are allowed per agentskills.io spec
}

/**
 * Parse SKILL.md content
 *
 * @param content - SKILL.md file content
 * @param options - Parse options
 * @returns Parsed skill info, or null if format is invalid
 * @throws SkillValidationError if validation fails in strict mode
 */
export function parseSkillMd(
  content: string,
  options: { strict?: boolean } = {},
): ParsedSkill | null {
  const { strict = false } = options;

  try {
    const { data, content: body } = parseFrontmatter(content);

    // Check required fields
    if (!data.name || !data.description) {
      if (strict) {
        throw new SkillValidationError('SKILL.md must have name and description in frontmatter');
      }
      return null;
    }

    const name = String(data.name);
    const description = String(data.description);

    // Validate field format
    if (strict) {
      validateSkillName(name);
      validateSkillDescription(description);
    }

    // Parse allowed-tools
    let allowedTools: string[] | undefined;
    if (data['allowed-tools']) {
      const toolsStr = String(data['allowed-tools']);
      allowedTools = toolsStr.split(/\s+/).filter(Boolean);
    }

    return {
      name,
      description,
      version: data.version ? String(data.version) : undefined,
      license: data.license ? String(data.license) : undefined,
      compatibility: data.compatibility ? String(data.compatibility) : undefined,
      metadata: data.metadata as Record<string, unknown> | undefined,
      allowedTools,
      content: body,
      rawContent: content,
    };
  } catch (error) {
    if (error instanceof SkillValidationError) {
      throw error;
    }
    if (strict) {
      throw new SkillValidationError(`Failed to parse SKILL.md: ${error}`);
    }
    return null;
  }
}

/**
 * Parse SKILL.md from file path
 */
export function parseSkillMdFile(
  filePath: string,
  options: { strict?: boolean } = {},
): ParsedSkill | null {
  if (!fs.existsSync(filePath)) {
    if (options.strict) {
      throw new SkillValidationError(`SKILL.md not found: ${filePath}`);
    }
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return parseSkillMd(content, options);
}

/**
 * Parse SKILL.md from skill directory
 */
export function parseSkillFromDir(
  dirPath: string,
  options: { strict?: boolean } = {},
): ParsedSkill | null {
  const skillMdPath = path.join(dirPath, 'SKILL.md');
  return parseSkillMdFile(skillMdPath, options);
}

/**
 * Check if directory contains valid SKILL.md
 */
export function hasValidSkillMd(dirPath: string): boolean {
  const skillMdPath = path.join(dirPath, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    return false;
  }

  try {
    const skill = parseSkillMdFile(skillMdPath);
    return skill !== null;
  } catch {
    return false;
  }
}

/**
 * Generate SKILL.md content
 */
export function generateSkillMd(skill: Omit<ParsedSkill, 'rawContent'>): string {
  const frontmatter: string[] = ['---'];

  frontmatter.push(`name: ${skill.name}`);
  frontmatter.push(`description: ${skill.description}`);

  if (skill.license) {
    frontmatter.push(`license: ${skill.license}`);
  }

  if (skill.compatibility) {
    frontmatter.push(`compatibility: ${skill.compatibility}`);
  }

  if (skill.allowedTools && skill.allowedTools.length > 0) {
    frontmatter.push(`allowed-tools: ${skill.allowedTools.join(' ')}`);
  }

  frontmatter.push('---');
  frontmatter.push('');

  return frontmatter.join('\n') + skill.content;
}

export default {
  parseSkillMd,
  parseSkillMdFile,
  parseSkillFromDir,
  hasValidSkillMd,
  validateSkillName,
  validateSkillDescription,
  generateSkillMd,
};
