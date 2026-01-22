import * as p from '@clack/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import { type AgentType, agents } from '../../core/agent-registry.js';
import { Installer } from '../../core/installer.js';
import { SkillManager } from '../../core/skill-manager.js';

/**
 * uninstall command - Uninstall a skill
 */
export const uninstallCommand = new Command('uninstall')
  .alias('un')
  .alias('remove')
  .alias('rm')
  .description('Uninstall a skill')
  .argument('<skill>', 'Skill name to uninstall')
  .option('-g, --global', 'Uninstall from global installation (~/.claude/skills)')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (skillName, options) => {
    const isGlobal = options.global || false;
    const skipConfirm = options.yes || false;
    const skillManager = new SkillManager(undefined, { global: isGlobal });

    console.log();
    p.intro(chalk.bgCyan.black(' reskill '));

    // Check which agents have this skill installed
    const installer = new Installer({
      cwd: process.cwd(),
      global: isGlobal,
    });

    const allAgentTypes = Object.keys(agents) as AgentType[];
    const installedAgents = allAgentTypes.filter((agent) => installer.isInstalled(skillName, agent));

    if (installedAgents.length === 0) {
      const location = isGlobal ? '(global)' : '';
      p.log.warn(`Skill ${chalk.cyan(skillName)} is not installed ${location}`.trim());
      p.outro('Done');
      process.exit(0);
    }

    // Show uninstallation summary
    const summaryLines: string[] = [];
    summaryLines.push(`${chalk.cyan(skillName)}`);
    summaryLines.push(
      `  ${chalk.dim('→')} ${installedAgents.map((a) => agents[a].displayName).join(', ')}`,
    );
    summaryLines.push(
      `  ${chalk.dim('Scope:')} ${isGlobal ? 'Global' : 'Project'}`,
    );

    p.note(summaryLines.join('\n'), 'Uninstallation Summary');

    if (!skipConfirm) {
      const confirmed = await p.confirm({
        message: 'Proceed with uninstallation?',
      });

      if (p.isCancel(confirmed) || !confirmed) {
        p.cancel('Uninstallation cancelled');
        process.exit(0);
      }
    }

    // Uninstall from all detected agents
    const results = skillManager.uninstallFromAgents(skillName, installedAgents);
    const successCount = Array.from(results.values()).filter((r) => r).length;

    if (successCount > 0) {
      p.log.success(`Uninstalled ${chalk.cyan(skillName)} from ${successCount} agent(s)`);
    } else {
      p.log.error(`Failed to uninstall ${chalk.cyan(skillName)}`);
      process.exit(1);
    }

    console.log();
    p.outro(chalk.green('Done!'));
  });

export default uninstallCommand;
