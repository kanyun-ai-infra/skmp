import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { SkillManager } from '../../core/skill-manager.js';
import { ConfigLoader } from '../../core/config-loader.js';
import { logger } from '../../utils/logger.js';
import { getGlobalSkillsDir } from '../../utils/fs.js';

/**
 * install 命令 - 安装 skill
 * 
 * 支持两种安装模式:
 * - 项目安装 (默认): 安装到 .skills/ 目录，更新 skills.json 和 skills.lock
 * - 全局安装 (-g): 安装到 ~/.claude/skills/，不更新配置文件
 */
export const installCommand = new Command('install')
  .alias('i')
  .description('Install a skill or all skills from skills.json')
  .argument('[skill]', 'Skill reference (e.g., github:user/skill@v1.0.0 or git@github.com:user/repo.git)')
  .option('-f, --force', 'Force reinstall even if already installed')
  .option('-g, --global', 'Install globally to ~/.claude/skills')
  .option('--no-save', 'Do not save to skills.json')
  .action(async (skill, options) => {
    const isGlobal = options.global || false;
    const configLoader = new ConfigLoader();
    const skillManager = new SkillManager(undefined, { global: isGlobal });

    // 显示安装位置信息
    if (isGlobal) {
      logger.info(`Installing to ${chalk.cyan(getGlobalSkillsDir())} ${chalk.dim('(global)')}`);
    }

    if (!skill) {
      // Install all from skills.json
      if (isGlobal) {
        logger.error('Cannot install all skills globally. Please specify a skill to install.');
        process.exit(1);
      }

      if (!configLoader.exists()) {
        logger.error("skills.json not found. Run 'skpm init' first.");
        process.exit(1);
      }

      const skills = configLoader.getSkills();
      if (Object.keys(skills).length === 0) {
        logger.info('No skills defined in skills.json');
        return;
      }

      logger.package('Installing all skills from skills.json...');
      const spinner = ora('Installing...').start();

      try {
        const installed = await skillManager.installAll({ force: options.force });
        spinner.stop();
        
        logger.newline();
        logger.success(`Installed ${installed.length} skill(s)`);
      } catch (error) {
        spinner.fail('Installation failed');
        logger.error((error as Error).message);
        process.exit(1);
      }
    } else {
      // Install single skill
      const spinner = ora(`Installing ${skill}...`).start();

      try {
        const installed = await skillManager.install(skill, {
          force: options.force,
          save: options.save && !isGlobal, // 全局安装不保存到 skills.json
          global: isGlobal,
        });
        
        const location = isGlobal ? chalk.dim(' (global)') : '';
        spinner.succeed(`Installed ${installed.name}@${installed.version}${location}`);
      } catch (error) {
        spinner.fail('Installation failed');
        logger.error((error as Error).message);
        process.exit(1);
      }
    }
  });

export default installCommand;
