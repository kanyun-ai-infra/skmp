import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { SkillManager } from '../../core/skill-manager.js';
import { ConfigLoader } from '../../core/config-loader.js';
import { logger } from '../../utils/logger.js';

/**
 * outdated 命令 - 检查过期的 skills
 */
export const outdatedCommand = new Command('outdated')
  .description('Check for outdated skills')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    const configLoader = new ConfigLoader();

    if (!configLoader.exists()) {
      logger.error("skills.json not found. Run 'skmp init' first.");
      process.exit(1);
    }

    const skills = configLoader.getSkills();
    if (Object.keys(skills).length === 0) {
      logger.info('No skills defined in skills.json');
      return;
    }

    const skillManager = new SkillManager();
    const spinner = ora('Checking for updates...').start();

    try {
      const results = await skillManager.checkOutdated();
      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      const outdated = results.filter(r => r.updateAvailable);

      if (outdated.length === 0) {
        logger.success('All skills are up to date!');
        return;
      }

      logger.package('Checking for updates...');
      logger.newline();

      const headers = ['Skill', 'Current', 'Latest', 'Status'];
      const rows = results.map(r => [
        r.name,
        r.current,
        r.latest,
        r.updateAvailable
          ? chalk.yellow('⬆️ Update available')
          : chalk.green('✅ Up to date'),
      ]);

      logger.table(headers, rows);
      logger.newline();

      if (outdated.length > 0) {
        logger.log(`Run ${chalk.cyan('skmp update')} to update all skills`);
        logger.log(`Or ${chalk.cyan('skmp update <skill>')} to update a specific skill`);
      }
    } catch (error) {
      spinner.fail('Check failed');
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

export default outdatedCommand;
