/**
 * reskill - AI Skills Package Manager
 *
 * Git-based skills management for AI agents
 * Supports 17+ coding agents: Cursor, Claude Code, GitHub Copilot, etc.
 */

// Core exports
export {
  // Multi-Agent support
  agents,
  CacheManager,
  ConfigLoader,
  DEFAULT_REGISTRIES,
  detectInstalledAgents, generateSkillMd,
  getAgentConfig,
  getAgentSkillsDir,
  getAllAgentTypes, GitResolver, hasValidSkillMd,
  // HTTP/OSS support
  HttpResolver,
  Installer,
  isValidAgentType,
  LockManager,
  parseSkillFromDir,
  // SKILL.md parsing
  parseSkillMd,
  parseSkillMdFile,
  SkillManager,
  SkillValidationError,
  validateSkillDescription,
  validateSkillName
} from './core/index.js';

// Type exports
export type {
  AgentConfig,
  // Multi-Agent types
  AgentType,
  InstalledSkill,
  InstallMode,
  InstallOptions,
  InstallResult,
  ListOptions,
  LockedSkill,
  ParsedSkill,
  ParsedSkillRef,
  ParsedVersion,
  SkillJson,
  SkillMdFrontmatter,
  SkillsJson,
  SkillsLock,
  UpdateOptions,
  VersionType
} from './types/index.js';
export {
  getCanonicalSkillPath,
  getCanonicalSkillsDir,
  isPathSafe,
  sanitizeName,
  shortenPath
} from './utils/fs.js';
// Utility exports
export { logger } from './utils/index.js';
