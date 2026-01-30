/**
 * Registry-Scope Mapping Utilities
 *
 * Maps registry URLs to their corresponding scopes.
 * Currently hardcoded; TODO: fetch from /api/registry/info in the future.
 */

/**
 * Hardcoded registry to scope mapping
 * TODO: Replace with dynamic fetching from /api/registry/info
 */
const REGISTRY_SCOPE_MAP: Record<string, string> = {
  'https://reskill-test.zhenguanyu.com': '@kanyun',
  'https://reskill-test.zhenguanyu.com/': '@kanyun',
  // Local development
  'http://localhost:3000': '@kanyun',
  'http://localhost:3000/': '@kanyun',
};

/**
 * Parsed skill name result
 */
export interface ParsedSkillName {
  /** Scope including @ prefix, e.g., "@kanyun" */
  scope: string | null;
  /** Short name without scope, e.g., "planning-with-files" */
  name: string;
  /** Full name as provided, e.g., "@kanyun/planning-with-files" */
  fullName: string;
}

/**
 * Get the scope for a given registry URL
 *
 * @param registry - Registry URL
 * @returns Scope string (e.g., "@kanyun") or null if not found
 *
 * @example
 * getScopeForRegistry('https://reskill-test.zhenguanyu.com') // '@kanyun'
 * getScopeForRegistry('https://unknown.com') // null
 */
export function getScopeForRegistry(registry: string): string | null {
  if (!registry) {
    return null;
  }

  // Try exact match first
  if (REGISTRY_SCOPE_MAP[registry]) {
    return REGISTRY_SCOPE_MAP[registry];
  }

  // Try with/without trailing slash
  const normalized = registry.endsWith('/')
    ? registry.slice(0, -1)
    : `${registry}/`;

  return REGISTRY_SCOPE_MAP[normalized] || null;
}

/**
 * Parse a skill name into its components
 *
 * @param skillName - Full or short skill name
 * @returns Parsed skill name with scope and name
 *
 * @example
 * parseSkillName('@kanyun/planning-with-files')
 * // { scope: '@kanyun', name: 'planning-with-files', fullName: '@kanyun/planning-with-files' }
 *
 * parseSkillName('planning-with-files')
 * // { scope: null, name: 'planning-with-files', fullName: 'planning-with-files' }
 */
export function parseSkillName(skillName: string): ParsedSkillName {
  // Match @scope/name pattern
  const match = skillName.match(/^(@[^/]+)\/(.+)$/);

  if (match) {
    return {
      scope: match[1],
      name: match[2],
      fullName: skillName,
    };
  }

  return {
    scope: null,
    name: skillName,
    fullName: skillName,
  };
}

/**
 * Build full skill name from scope and name
 *
 * @param scope - Scope (with or without @ prefix), or null
 * @param name - Short skill name
 * @returns Full skill name (e.g., "@kanyun/planning-with-files")
 *
 * @example
 * buildFullSkillName('@kanyun', 'planning-with-files') // '@kanyun/planning-with-files'
 * buildFullSkillName('kanyun', 'my-skill') // '@kanyun/my-skill'
 * buildFullSkillName(null, 'my-skill') // 'my-skill'
 */
export function buildFullSkillName(scope: string | null, name: string): string {
  if (!scope) {
    return name;
  }

  // Ensure scope starts with @
  const normalizedScope = scope.startsWith('@') ? scope : `@${scope}`;

  return `${normalizedScope}/${name}`;
}

/**
 * Get short name from a skill name (removes scope if present)
 *
 * @param skillName - Full or short skill name
 * @returns Short name without scope
 *
 * @example
 * getShortName('@kanyun/planning-with-files') // 'planning-with-files'
 * getShortName('planning-with-files') // 'planning-with-files'
 */
export function getShortName(skillName: string): string {
  return parseSkillName(skillName).name;
}
