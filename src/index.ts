/**
 * reskill - AI Skills Package Manager
 * 
 * Git-based skills management for AI agents
 */

// Core exports
export {
  GitResolver,
  CacheManager,
  ConfigLoader,
  LockManager,
  SkillManager,
  DEFAULT_REGISTRIES,
} from './core/index.js';

// Type exports
export type {
  SkillsJson,
  SkillsLock,
  SkillJson,
  LockedSkill,
  ParsedSkillRef,
  ParsedVersion,
  VersionType,
  InstalledSkill,
  InstallOptions,
  UpdateOptions,
  ListOptions,
} from './types/index.js';

// Utility exports
export { logger } from './utils/index.js';
