import { Command } from 'commander';
import chalk from 'chalk';
import { SkillManager } from '../../core/skill-manager.js';
import { logger } from '../../utils/logger.js';

/**
 * list 命令 - 列出已安装的 skills
 */
export const listCommand = new Command('list')
  .alias('ls')
  .description('List installed skills')
  .option('-j, --json', 'Output as JSON')
  .option('-g, --global', 'List globally installed skills')
  .action((options) => {
    const isGlobal = options.global || false;
    const skillManager = new SkillManager(undefined, { global: isGlobal });
    const skills = skillManager.list();

    if (skills.length === 0) {
      const location = isGlobal ? 'globally' : 'in this project';
      logger.info(`No skills installed ${location}`);
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(skills, null, 2));
      return;
    }

    const locationLabel = isGlobal ? chalk.dim(' (global)') : '';
    logger.log(`Installed Skills (${skillManager.getInstallDir()})${locationLabel}:`);
    logger.newline();

    const headers = ['Name', 'Version', 'Source'];
    const rows = skills.map(skill => [
      skill.name,
      skill.isLinked ? `${skill.version} (linked)` : skill.version,
      skill.source || '-',
    ]);

    logger.table(headers, rows);
    logger.newline();
    logger.log(`Total: ${skills.length} skill(s)`);
  });

export default listCommand;
