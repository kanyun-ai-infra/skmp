import { Command } from 'commander';
import ora from 'ora';
import { SkillManager } from '../../core/skill-manager.js';
import { ConfigLoader } from '../../core/config-loader.js';
import { logger } from '../../utils/logger.js';

/**
 * update 命令 - 更新 skill
 */
export const updateCommand = new Command('update')
  .alias('up')
  .description('Update installed skills')
  .argument('[skill]', 'Skill name to update (updates all if not specified)')
  .action(async (skill) => {
    const configLoader = new ConfigLoader();

    if (!configLoader.exists()) {
      logger.error("skills.json not found. Run 'reskill init' first.");
      process.exit(1);
    }

    const skillManager = new SkillManager();
    const spinner = ora(skill ? `Updating ${skill}...` : 'Updating all skills...').start();

    try {
      const updated = await skillManager.update(skill);
      spinner.stop();

      if (updated.length === 0) {
        logger.info('No skills to update');
        return;
      }

      logger.success(`Updated ${updated.length} skill(s):`);
      for (const s of updated) {
        logger.log(`  - ${s.name}@${s.version}`);
      }
    } catch (error) {
      spinner.fail('Update failed');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

export default updateCommand;
