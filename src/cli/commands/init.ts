import { Command } from 'commander';
import { ConfigLoader } from '../../core/config-loader.js';
import { logger } from '../../utils/logger.js';

/**
 * init 命令 - 初始化 skills.json
 */
export const initCommand = new Command('init')
  .description('Initialize a new skills.json configuration')
  .option('-n, --name <name>', 'Project name')
  .option('-r, --registry <registry>', 'Default registry', 'github')
  .option('-d, --install-dir <dir>', 'Skills installation directory', '.skills')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(async (options) => {
    const configLoader = new ConfigLoader();

    if (configLoader.exists()) {
      logger.warn('skills.json already exists');
      return;
    }

    const config = configLoader.create({
      name: options.name,
      defaults: {
        registry: options.registry,
        installDir: options.installDir,
      },
    });

    logger.success('Created skills.json');
    logger.newline();
    logger.log('Configuration:');
    logger.log(`  Name: ${config.name || '(not set)'}`);
    logger.log(`  Default registry: ${config.defaults?.registry}`);
    logger.log(`  Install directory: ${config.defaults?.installDir}`);
    logger.newline();
    logger.log('Next steps:');
    logger.log('  skmp install <skill>  Install a skill');
    logger.log('  skmp list             List installed skills');
  });

export default initCommand;
