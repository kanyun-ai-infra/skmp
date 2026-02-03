import { Command } from 'commander';
import { SkillManager } from '../../core/skill-manager.js';
import { logger } from '../../utils/logger.js';

/**
 * info command - Show skill details
 */
export const infoCommand = new Command('info')
  .description('Show skill details')
  .argument('<skill>', 'Skill name')
  .option('-j, --json', 'Output as JSON')
  .action((skillName, options) => {
    const skillManager = new SkillManager();
    const info = skillManager.getInfo(skillName);

    if (options.json) {
      console.log(JSON.stringify(info, null, 2));
      return;
    }

    if (!info.installed && !info.config) {
      logger.error(`Skill ${skillName} not found`);
      process.exit(1);
    }

    logger.log(`Skill: ${skillName}`);
    logger.newline();

    if (info.config) {
      logger.log(`Configuration (skills.json):`);
      logger.log(`  Reference: ${info.config}`);
    }

    if (info.locked) {
      logger.log(`Locked Version (skills.lock):`);
      logger.log(`  Version: ${info.locked.version}`);
      logger.log(`  Source: ${info.locked.source}`);
      logger.log(`  Commit: ${info.locked.commit}`);
      logger.log(`  Installed: ${info.locked.installedAt}`);
    }

    if (info.installed) {
      logger.log(`Installed:`);
      logger.log(`  Path: ${info.installed.path}`);
      logger.log(`  Version: ${info.installed.version}`);
      logger.log(`  Linked: ${info.installed.isLinked ? 'Yes' : 'No'}`);

      if (info.installed.metadata) {
        const meta = info.installed.metadata;
        logger.log(`Metadata (SKILL.md):`);
        if (meta.description) logger.log(`  Description: ${meta.description}`);
        if (meta.author) logger.log(`  Author: ${meta.author}`);
        if (meta.license) logger.log(`  License: ${meta.license}`);
        if (meta.keywords?.length) logger.log(`  Keywords: ${meta.keywords.join(', ')}`);
      }
    } else {
      logger.warn(`Skill ${skillName} is not installed`);
    }
  });

export default infoCommand;
