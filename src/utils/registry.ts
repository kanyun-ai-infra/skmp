/**
 * Registry URL resolution utilities
 *
 * Shared utility for resolving registry URLs across CLI commands.
 */

import { ConfigLoader } from '../core/config-loader.js';
import { logger } from './logger.js';
import { PUBLIC_REGISTRY } from './registry-scope.js';

/**
 * Attempt to resolve registry URL from multiple sources.
 *
 * Priority (highest to lowest):
 * 1. --registry CLI option
 * 2. RESKILL_REGISTRY environment variable
 * 3. defaults.publishRegistry in skills.json
 *
 * Returns the resolved URL, or null if none found.
 *
 * @param cliRegistry - Registry URL from CLI option
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns Resolved registry URL, or null if not configured
 */
export function tryResolveRegistry(
  cliRegistry: string | undefined,
  projectRoot: string = process.cwd(),
): string | null {
  // 1. CLI option (highest priority)
  if (cliRegistry) {
    return cliRegistry;
  }

  // 2. Environment variable
  const envRegistry = process.env.RESKILL_REGISTRY;
  if (envRegistry) {
    return envRegistry;
  }

  // 3. From skills.json
  try {
    const configLoader = new ConfigLoader(projectRoot);
    if (configLoader.exists()) {
      const publishRegistry = configLoader.getPublishRegistry();
      if (publishRegistry) {
        return publishRegistry;
      }
    }
  } catch {
    // Config loading failed, return null
  }

  return null;
}

/**
 * Resolve registry URL from multiple sources (strict — required for publish)
 *
 * Priority (highest to lowest):
 * 1. --registry CLI option
 * 2. RESKILL_REGISTRY environment variable
 * 3. defaults.publishRegistry in skills.json
 *
 * Intentionally has NO default - users must explicitly configure their registry.
 *
 * @param cliRegistry - Registry URL from CLI option
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns Resolved registry URL
 * @throws Exits process with code 1 if no registry is configured
 */
export function resolveRegistry(
  cliRegistry: string | undefined,
  projectRoot: string = process.cwd(),
): string {
  const resolved = tryResolveRegistry(cliRegistry, projectRoot);
  if (resolved) {
    return resolved;
  }

  // No registry configured - error
  logger.error('No registry specified');
  logger.newline();
  logger.log('Please specify a registry using one of these methods:');
  logger.log('  • --registry <url> option');
  logger.log('  • RESKILL_REGISTRY environment variable');
  logger.log('  • "defaults.publishRegistry" in skills.json');
  process.exit(1);
}

/**
 * Resolve registry URL for search, with graceful fallback to public registry.
 *
 * Same priority as `resolveRegistry()`, but falls back to the public registry
 * instead of exiting when no registry is configured.
 *
 * @param cliRegistry - Registry URL from CLI option
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns Resolved registry URL (never null)
 */
export function resolveRegistryForSearch(
  cliRegistry: string | undefined,
  projectRoot: string = process.cwd(),
): string {
  return tryResolveRegistry(cliRegistry, projectRoot) ?? PUBLIC_REGISTRY;
}
