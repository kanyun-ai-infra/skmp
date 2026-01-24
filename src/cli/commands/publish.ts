/**
 * publish command - Publish a skill to the registry
 *
 * Validates and publishes skill metadata to the reskill registry.
 * Use --dry-run to validate without actually publishing.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createInterface } from 'node:readline';
import { Command } from 'commander';
import { AuthManager } from '../../core/auth-manager.js';
import { Publisher, PublishError, type GitInfo, type PublishPayload } from '../../core/publisher.js';
import {
  SkillValidator,
  type LoadedSkill,
  type ValidationResult,
} from '../../core/skill-validator.js';
import { logger } from '../../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

interface PublishOptions {
  registry?: string;
  tag?: string;
  access?: 'public' | 'restricted';
  dryRun?: boolean;
  yes?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_REGISTRY = 'https://registry.reskill.dev';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check authentication
 */
function checkAuth(registry: string, dryRun: boolean): { token: string } | null {
  const authManager = new AuthManager();
  const token = authManager.getToken(registry);

  if (!token) {
    if (dryRun) {
      logger.debug('Not logged in (skipped for dry-run)');
      return null;
    }
    logger.error('Authentication required');
    logger.newline();
    logger.log("You must be logged in to publish skills.");
    logger.log("Run 'reskill login' to authenticate.");
    process.exit(1);
  }

  return { token };
}

/**
 * Display validation results
 */
function displayValidation(
  skill: LoadedSkill,
  validation: ValidationResult,
): void {
  logger.log('Validating skill...');

  if (skill.skillJson) {
    logger.log('  ✓ skill.json found');
  }

  if (skill.skillMd) {
    logger.log('  ✓ SKILL.md found');
  } else {
    logger.log('  ⚠ SKILL.md not found');
  }

  if (validation.valid && skill.skillJson) {
    logger.log(`  ✓ Name: ${skill.skillJson.name}`);
    logger.log(`  ✓ Version: ${skill.skillJson.version}`);
    if (skill.skillJson.description) {
      const desc =
        skill.skillJson.description.length > 50
          ? skill.skillJson.description.slice(0, 50) + '...'
          : skill.skillJson.description;
      logger.log(`  ✓ Description: ${desc}`);
    }
  }

  // Display errors
  for (const err of validation.errors) {
    logger.log(`  ✗ ${err.field}: ${err.message}`);
  }
}

/**
 * Display git information
 */
function displayGitInfo(gitInfo: GitInfo): void {
  logger.newline();
  logger.log('Git information:');

  if (gitInfo.remoteUrl) {
    logger.log(`  ✓ Repository: ${gitInfo.remoteUrl}`);
  } else {
    logger.log('  ⚠ Repository: not configured');
  }

  if (gitInfo.tag) {
    logger.log(`  ✓ Tag: ${gitInfo.tag}`);
  } else {
    logger.log('  ⚠ Tag: none (using commit)');
  }

  if (gitInfo.currentCommit) {
    const shortCommit = gitInfo.currentCommit.slice(0, 7);
    const date = gitInfo.commitDate
      ? ` (${new Date(gitInfo.commitDate).toLocaleDateString()})`
      : '';
    logger.log(`  ✓ Commit: ${shortCommit}${date}`);
  }

  if (gitInfo.isDirty) {
    logger.log('  ⚠ Working tree has uncommitted changes');
  } else if (gitInfo.isRepo) {
    logger.log('  ✓ Working tree clean');
  }
}

/**
 * Display files to publish
 */
function displayFiles(skillPath: string, files: string[], publisher: Publisher): void {
  logger.newline();
  logger.log('Files to publish:');

  const maxFilesToShow = 10;
  const filesToShow = files.slice(0, maxFilesToShow);

  for (const file of filesToShow) {
    const filePath = path.join(skillPath, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      logger.log(`  • ${file} (${publisher.formatBytes(stats.size)})`);
    } else {
      logger.log(`  • ${file}`);
    }
  }

  if (files.length > maxFilesToShow) {
    logger.log(`  ... and ${files.length - maxFilesToShow} more files`);
  }

  const totalSize = publisher.calculateTotalSize(skillPath, files);
  logger.log(`  Total: ${files.length} file(s), ${publisher.formatBytes(totalSize)}`);
}

/**
 * Display metadata
 */
function displayMetadata(skill: LoadedSkill): void {
  if (!skill.skillJson) return;

  const { keywords, license, compatibility } = skill.skillJson;

  if (keywords || license || compatibility) {
    logger.newline();
    logger.log('Metadata:');

    if (keywords && keywords.length > 0) {
      logger.log(`  • Keywords: ${keywords.join(', ')}`);
    }

    if (license) {
      logger.log(`  • License: ${license}`);
    }

    if (compatibility) {
      const compat = Object.entries(compatibility)
        .map(([k, v]) => `${k} ${v}`)
        .join(', ');
      logger.log(`  • Compatibility: ${compat}`);
    }
  }
}

/**
 * Display validation errors in detail
 */
function displayValidationErrors(validation: ValidationResult): void {
  logger.newline();
  logger.error(`Validation failed with ${validation.errors.length} error(s):`);
  logger.newline();

  validation.errors.forEach((err, index) => {
    logger.log(`  ${index + 1}. ${err.field}: ${err.message}`);
    if (err.suggestion) {
      logger.log(`     → ${err.suggestion}`);
    }
  });
}

/**
 * Display warnings
 */
function displayWarnings(validation: ValidationResult): void {
  if (validation.warnings.length > 0) {
    logger.newline();
    logger.warn(`${validation.warnings.length} warning(s):`);
    for (const warn of validation.warnings) {
      logger.log(`  ⚠ ${warn.field}: ${warn.message}`);
      if (warn.suggestion) {
        logger.log(`    → ${warn.suggestion}`);
      }
    }
  }
}

/**
 * Confirm publish
 */
async function confirmPublish(
  name: string,
  version: string,
  registry: string,
): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `\n? Publish ${name}@${version} to ${registry}? (y/N) `,
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      },
    );
  });
}

/**
 * Display dry run summary
 */
function displayDryRunSummary(payload: PublishPayload): void {
  logger.newline();
  logger.log(`Integrity: ${payload.integrity}`);
  logger.newline();
  logger.log('No changes made (--dry-run)');
}

// ============================================================================
// Main Action
// ============================================================================

async function publishAction(
  skillPath: string,
  options: PublishOptions,
): Promise<void> {
  const registry = options.registry || DEFAULT_REGISTRY;
  const absolutePath = path.resolve(skillPath);

  // Check directory exists
  if (!fs.existsSync(absolutePath)) {
    logger.error(`Directory not found: ${skillPath}`);
    process.exit(1);
  }

  const validator = new SkillValidator();
  const publisher = new Publisher();

  try {
    // 1. Check authentication (skip for dry-run)
    // Note: checkAuth exits the process if not authenticated (unless dry-run)
    checkAuth(registry, options.dryRun || false);

    // 2. Load skill
    const skill = validator.loadSkill(absolutePath);

    // 3. Validate
    const validation = validator.validate(absolutePath);

    // 4. Get git info
    let gitInfo: GitInfo;
    try {
      gitInfo = await publisher.getGitInfo(absolutePath, options.tag);
    } catch (error) {
      if (error instanceof PublishError) {
        logger.error(error.message);
        process.exit(1);
      }
      throw error;
    }

    // 5. Generate integrity
    const integrity = validator.generateIntegrity(absolutePath, skill.files);

    // 6. Build payload (only if valid)
    let payload: PublishPayload | null = null;
    if (validation.valid && skill.skillJson) {
      payload = publisher.buildPayload(
        {
          path: absolutePath,
          skillJson: skill.skillJson,
          skillMd: skill.skillMd,
          readme: skill.readme,
          files: skill.files,
        },
        gitInfo,
        integrity,
      );
    }

    // 7. Display preview
    logger.newline();
    if (options.dryRun) {
      logger.log(`📦 Dry run: ${skill.skillJson?.name || 'unknown'}@${skill.skillJson?.version || 'unknown'}`);
    } else {
      logger.log(`📦 Publishing ${skill.skillJson?.name || 'unknown'}@${skill.skillJson?.version || 'unknown'}...`);
    }
    logger.newline();

    displayValidation(skill, validation);

    // Show warnings
    displayWarnings(validation);

    // Show errors and exit if invalid
    if (!validation.valid) {
      displayValidationErrors(validation);
      process.exit(1);
    }

    // Display git info
    displayGitInfo(gitInfo);

    // Display files
    displayFiles(absolutePath, skill.files, publisher);

    // Display metadata
    displayMetadata(skill);

    // 8. Dry run mode ends here
    if (options.dryRun && payload) {
      displayDryRunSummary(payload);
      return;
    }

    // 9. Confirm publish
    if (!options.yes && skill.skillJson) {
      const confirmed = await confirmPublish(
        skill.skillJson.name,
        skill.skillJson.version,
        registry,
      );
      if (!confirmed) {
        logger.log('Cancelled.');
        return;
      }
    }

    // 10. Actually publish (TODO: implement registry client)
    logger.newline();
    logger.log(`Publishing to ${registry}...`);

    // TODO: Call registry API
    // const client = new RegistryClient({ registry, token: auth!.token });
    // const result = await client.publish(skill.skillJson!.name, payload!);

    logger.newline();
    logger.error('Registry API not yet implemented.');
    logger.log('Use --dry-run to validate your skill locally.');
    process.exit(1);

  } catch (error) {
    if (error instanceof PublishError) {
      logger.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

// ============================================================================
// Command Definition
// ============================================================================

export const publishCommand = new Command('publish')
  .alias('pub')
  .description('Publish a skill to the registry')
  .argument('[path]', 'Path to skill directory', '.')
  .option('-r, --registry <url>', 'Registry URL', DEFAULT_REGISTRY)
  .option('-t, --tag <tag>', 'Git tag to publish')
  .option('--access <level>', 'Access level: public or restricted', 'public')
  .option('-n, --dry-run', 'Validate without publishing')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(publishAction);

export default publishCommand;
