import { Command } from 'commander';
import { SkillManager } from '../../core/skill-manager.js';

/**
 * uninstall 命令 - 卸载 skill
 */
export const uninstallCommand = new Command('uninstall')
  .alias('un')
  .alias('remove')
  .alias('rm')
  .description('Uninstall a skill')
  .argument('<skill>', 'Skill name to uninstall')
  .option('-g, --global', 'Uninstall from global installation (~/.claude/skills)')
  .action((skillName, options) => {
    const isGlobal = options.global || false;
    const skillManager = new SkillManager(undefined, { global: isGlobal });
    const result = skillManager.uninstall(skillName);

    if (!result) {
      process.exit(1);
    }
  });

export default uninstallCommand;
