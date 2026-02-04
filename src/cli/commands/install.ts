import * as p from '@clack/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import { type AgentType, agents, detectInstalledAgents } from '../../core/agent-registry.js';
import { ConfigLoader } from '../../core/config-loader.js';
import type { InstallMode } from '../../core/installer.js';
import { SkillManager } from '../../core/skill-manager.js';
import { shortenPath } from '../../utils/fs.js';

// ============================================================================
// Types
// ============================================================================

interface InstallOptions {
  force?: boolean;
  global?: boolean;
  save?: boolean;
  agent?: string[];
  mode?: InstallMode;
  yes?: boolean;
  all?: boolean;
}

interface InstallContext {
  skills: string[];
  options: InstallOptions;
  configLoader: ConfigLoader;
  allAgentTypes: AgentType[];
  hasSkillsJson: boolean;
  storedAgents: AgentType[] | undefined;
  hasStoredAgents: boolean;
  storedMode: InstallMode | undefined;
  isReinstallAll: boolean;
  isBatchInstall: boolean;
  skipConfirm: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format agent names list for display
 * Truncates long lists with "+N more" suffix
 */
function formatAgentNames(agentTypes: AgentType[], maxShow = 5): string {
  const names = agentTypes.map((a) => agents[a].displayName);
  if (names.length <= maxShow) {
    return names.join(', ');
  }
  const shown = names.slice(0, maxShow);
  const remaining = names.length - maxShow;
  return `${shown.join(', ')} +${remaining} more`;
}

/**
 * Format agent names with chalk coloring
 */
function formatColoredAgentNames(agentTypes: AgentType[]): string {
  return agentTypes.map((a) => chalk.cyan(agents[a].displayName)).join(', ');
}

/**
 * Filter valid agent types from stored configuration
 */
function filterValidAgents(
  storedAgents: string[] | undefined,
  validAgents: AgentType[],
): AgentType[] | undefined {
  if (!storedAgents || storedAgents.length === 0) {
    return undefined;
  }
  const filtered = storedAgents.filter((a) => validAgents.includes(a as AgentType)) as AgentType[];
  return filtered.length > 0 ? filtered : undefined;
}

/**
 * Create install context from command arguments and options
 */
function createInstallContext(skills: string[], options: InstallOptions): InstallContext {
  const configLoader = new ConfigLoader();
  const allAgentTypes = Object.keys(agents) as AgentType[];
  const hasSkillsJson = configLoader.exists();

  // Load stored defaults from skills.json
  const storedDefaults = hasSkillsJson ? configLoader.getDefaults() : null;
  const storedAgents = filterValidAgents(storedDefaults?.targetAgents, allAgentTypes);
  const storedMode = storedDefaults?.installMode;

  return {
    skills,
    options,
    configLoader,
    allAgentTypes,
    hasSkillsJson,
    storedAgents,
    hasStoredAgents: !!storedAgents && storedAgents.length > 0,
    storedMode,
    isReinstallAll: skills.length === 0,
    isBatchInstall: skills.length > 1,
    skipConfirm: options.yes ?? false,
  };
}

// ============================================================================
// Agent Selection Logic
// ============================================================================

/**
 * Resolve target agents based on options and context
 */
async function resolveTargetAgents(
  ctx: InstallContext,
  spinner: ReturnType<typeof p.spinner>,
): Promise<AgentType[]> {
  const { options, allAgentTypes, storedAgents, hasStoredAgents, isReinstallAll } = ctx;

  // Priority 1: --all flag
  if (options.all) {
    p.log.info(`Installing to all ${chalk.cyan(allAgentTypes.length)} agents`);
    return allAgentTypes;
  }

  // Priority 2: -a/--agent flag
  if (options.agent && options.agent.length > 0) {
    return resolveAgentsFromCLI(options.agent, allAgentTypes);
  }

  // Priority 3: Reinstall all with stored agents
  if (isReinstallAll && hasStoredAgents && storedAgents) {
    p.log.info(`Using saved agents: ${formatColoredAgentNames(storedAgents)}`);
    return storedAgents;
  }

  // Priority 4: Auto-detect and/or prompt
  return await detectAndPromptAgents(ctx, spinner);
}

/**
 * Resolve agents from CLI -a option
 */
function resolveAgentsFromCLI(agentArgs: string[], validAgents: AgentType[]): AgentType[] {
  const invalidAgents = agentArgs.filter((a) => !validAgents.includes(a as AgentType));

  if (invalidAgents.length > 0) {
    p.log.error(`Invalid agents: ${invalidAgents.join(', ')}`);
    p.log.info(`Valid agents: ${validAgents.join(', ')}`);
    process.exit(1);
  }

  const targetAgents = agentArgs as AgentType[];
  p.log.info(`Installing to: ${formatAgentNames(targetAgents)}`);
  return targetAgents;
}

/**
 * Auto-detect agents and optionally prompt user
 */
async function detectAndPromptAgents(
  ctx: InstallContext,
  spinner: ReturnType<typeof p.spinner>,
): Promise<AgentType[]> {
  const { allAgentTypes, storedAgents, hasStoredAgents, skipConfirm } = ctx;

  spinner.start('Detecting installed agents...');
  const installedAgents = await detectInstalledAgents();
  spinner.stop(
    `Detected ${chalk.green(installedAgents.length)} agent${installedAgents.length !== 1 ? 's' : ''}`,
  );

  // No agents detected
  if (installedAgents.length === 0) {
    if (skipConfirm) {
      p.log.info('Installing to all agents (none detected)');
      return allAgentTypes;
    }
    return await promptAgentSelection(
      allAgentTypes,
      hasStoredAgents ? storedAgents : allAgentTypes,
    );
  }

  // Single agent or skip confirmation
  if (installedAgents.length === 1 || skipConfirm) {
    const displayNames = formatColoredAgentNames(installedAgents);
    p.log.info(`Installing to: ${displayNames}`);
    return installedAgents;
  }

  // Multiple agents: let user select
  const initialAgents = hasStoredAgents ? storedAgents! : installedAgents;
  return await promptAgentSelection(installedAgents, initialAgents, true);
}

/**
 * Prompt user to select agents
 */
async function promptAgentSelection(
  availableAgents: AgentType[],
  initialValues: AgentType[] | undefined,
  showHint = false,
): Promise<AgentType[]> {
  if (availableAgents.length === 0) {
    p.log.warn('No coding agents detected. You can still install skills.');
  }

  const agentChoices = availableAgents.map((a) => ({
    value: a,
    label: agents[a].displayName,
    ...(showHint && { hint: agents[a].skillsDir }),
  }));

  const selected = await p.multiselect({
    message: `Select agents to install skills to ${chalk.dim('(Space to toggle, Enter to confirm)')}`,
    options:
      agentChoices.length > 0
        ? agentChoices
        : Object.entries(agents).map(([key, config]) => ({
            value: key as AgentType,
            label: config.displayName,
          })),
    required: true,
    initialValues: initialValues ?? availableAgents,
  });

  if (p.isCancel(selected)) {
    p.cancel('Installation cancelled');
    process.exit(0);
  }

  return selected as AgentType[];
}

// ============================================================================
// Installation Scope Logic
// ============================================================================

/**
 * Resolve installation scope (global vs project)
 */
async function resolveInstallScope(ctx: InstallContext): Promise<boolean> {
  const { options, isReinstallAll, skipConfirm } = ctx;

  // Explicit --global flag
  if (options.global !== undefined) {
    return options.global;
  }

  // Skip prompt for reinstall-all (always project scope)
  if (isReinstallAll) {
    return false;
  }

  // Skip prompt if --yes
  if (skipConfirm) {
    return false;
  }

  // Prompt user
  const scope = await p.select({
    message: 'Installation scope',
    options: [
      {
        value: false,
        label: 'Project',
        hint: 'Install in current directory (committed with your project)',
      },
      {
        value: true,
        label: 'Global',
        hint: 'Install in home directory (available across all projects)',
      },
    ],
  });

  if (p.isCancel(scope)) {
    p.cancel('Installation cancelled');
    process.exit(0);
  }

  return scope as boolean;
}

// ============================================================================
// Installation Mode Logic
// ============================================================================

/**
 * Resolve installation mode (symlink vs copy)
 */
async function resolveInstallMode(ctx: InstallContext): Promise<InstallMode> {
  const { options, storedMode, isReinstallAll, skipConfirm } = ctx;

  // Priority 1: CLI --mode option
  if (options.mode) {
    return options.mode;
  }

  // Priority 2: Reinstall all with stored mode
  if (isReinstallAll && storedMode) {
    p.log.info(`Using saved install mode: ${chalk.cyan(storedMode)}`);
    return storedMode;
  }

  // Priority 3: Skip confirmation
  if (skipConfirm) {
    return storedMode ?? 'symlink';
  }

  // Priority 4: Prompt user
  const modeChoice = await p.select({
    message: 'Installation method',
    initialValue: storedMode ?? 'symlink',
    options: [
      {
        value: 'symlink',
        label: 'Symlink (Recommended)',
        hint: 'Single source of truth, easy updates',
      },
      {
        value: 'copy',
        label: 'Copy to all agents',
        hint: 'Independent copies for each agent',
      },
    ],
  });

  if (p.isCancel(modeChoice)) {
    p.cancel('Installation cancelled');
    process.exit(0);
  }

  return modeChoice as InstallMode;
}

// ============================================================================
// Installation Execution
// ============================================================================

/**
 * Install all skills from skills.json
 */
async function installAllSkills(
  ctx: InstallContext,
  targetAgents: AgentType[],
  installMode: InstallMode,
  spinner: ReturnType<typeof p.spinner>,
): Promise<void> {
  const { configLoader, options } = ctx;

  if (!configLoader.exists()) {
    p.log.error("skills.json not found. Run 'reskill init' first.");
    process.exit(1);
  }

  const skills = configLoader.getSkills();
  if (Object.keys(skills).length === 0) {
    p.log.info('No skills defined in skills.json');
    p.outro('Done');
    return;
  }

  // Show installation summary
  displayInstallSummary({
    skillCount: Object.keys(skills).length,
    agentCount: targetAgents.length,
    scope: 'Project (./) ',
    mode: installMode,
  });

  // Execute installation (no confirmation for reinstall all)
  spinner.start('Installing skills...');

  const skillManager = new SkillManager(undefined, { global: false });
  let totalInstalled = 0;
  let totalFailed = 0;

  for (const [name, ref] of Object.entries(skills)) {
    try {
      const { results } = await skillManager.installToAgents(ref, targetAgents, {
        force: options.force,
        save: false, // Already in skills.json
        mode: installMode,
      });

      const successCount = Array.from(results.values()).filter((r) => r.success).length;
      totalInstalled += successCount;
      totalFailed += results.size - successCount;
    } catch (error) {
      p.log.error(`Failed to install ${name}: ${(error as Error).message}`);
      totalFailed += targetAgents.length;
    }
  }

  spinner.stop('Installation complete');

  // Show results
  displayInstallResults(
    Object.keys(skills).length,
    targetAgents.length,
    totalInstalled,
    totalFailed,
  );

  // Save installation defaults
  if (totalInstalled > 0) {
    configLoader.updateDefaults({ targetAgents, installMode });
  }
}

/**
 * Install a single skill
 */
async function installSingleSkill(
  ctx: InstallContext,
  targetAgents: AgentType[],
  installGlobally: boolean,
  installMode: InstallMode,
  spinner: ReturnType<typeof p.spinner>,
): Promise<void> {
  const { skills, options, configLoader, skipConfirm } = ctx;
  const skill = skills[0];
  const cwd = process.cwd();

  // Show installation summary
  const summaryLines = [
    chalk.cyan(skill),
    `  ${chalk.dim('→')} ${formatAgentNames(targetAgents)}`,
    `  ${chalk.dim('Scope:')} ${installGlobally ? 'Global' : 'Project'}${chalk.dim(', Mode:')} ${installMode}`,
  ];
  p.note(summaryLines.join('\n'), 'Installation Summary');

  // Confirm installation
  if (!skipConfirm) {
    const confirmed = await p.confirm({ message: 'Proceed with installation?' });
    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Installation cancelled');
      process.exit(0);
    }
  }

  // Execute installation
  spinner.start(`Installing ${skill}...`);

  const skillManager = new SkillManager(undefined, { global: installGlobally });
  const { skill: installed, results } = await skillManager.installToAgents(skill, targetAgents, {
    force: options.force,
    save: options.save !== false && !installGlobally,
    mode: installMode,
  });

  spinner.stop('Installation complete');

  // Process and display results
  const successful = Array.from(results.entries()).filter(([, r]) => r.success);
  const failed = Array.from(results.entries()).filter(([, r]) => !r.success);

  displaySingleSkillResults(installed, successful, failed, cwd);

  // Save installation defaults (only for project installs with success)
  if (!installGlobally && successful.length > 0 && configLoader.exists()) {
    configLoader.reload(); // Sync with SkillManager's changes
    configLoader.updateDefaults({ targetAgents, installMode });
  }
}

/**
 * Install multiple skills in batch
 */
async function installMultipleSkills(
  ctx: InstallContext,
  targetAgents: AgentType[],
  installGlobally: boolean,
  installMode: InstallMode,
  spinner: ReturnType<typeof p.spinner>,
): Promise<void> {
  const { skills, options, configLoader, skipConfirm } = ctx;

  // Show installation summary
  const summaryLines = [
    `${chalk.cyan(skills.length)} skills:`,
    ...skills.map((s) => `  ${chalk.dim('•')} ${s}`),
    '',
    `  ${chalk.dim('→')} ${formatAgentNames(targetAgents)}`,
    `  ${chalk.dim('Scope:')} ${installGlobally ? 'Global' : 'Project'}${chalk.dim(', Mode:')} ${installMode}`,
  ];
  p.note(summaryLines.join('\n'), 'Installation Summary');

  // Confirm installation
  if (!skipConfirm) {
    const confirmed = await p.confirm({ message: 'Proceed with installation?' });
    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Installation cancelled');
      process.exit(0);
    }
  }

  // Execute installation for all skills in parallel
  const skillManager = new SkillManager(undefined, { global: installGlobally });
  const successfulSkills: { name: string; version: string }[] = [];
  const failedSkills: { ref: string; error: string }[] = [];

  spinner.start(`Installing ${skills.length} skills in parallel...`);

  // Create install promises for all skills
  const installPromises = skills.map(async (skillRef) => {
    try {
      const { skill: installed, results } = await skillManager.installToAgents(
        skillRef,
        targetAgents,
        {
          force: options.force,
          save: options.save !== false && !installGlobally,
          mode: installMode,
        },
      );

      const successful = Array.from(results.values()).filter((r) => r.success);
      if (successful.length > 0) {
        return { success: true as const, skillRef, skill: installed };
      }
      const firstError = Array.from(results.values()).find((r) => !r.success)?.error;
      return { success: false as const, skillRef, error: firstError || 'Unknown error' };
    } catch (error) {
      return { success: false as const, skillRef, error: (error as Error).message };
    }
  });

  // Wait for all installations to complete
  const results = await Promise.all(installPromises);

  spinner.stop(`Processed ${skills.length} skills`);

  // Aggregate results
  for (const result of results) {
    if (result.success) {
      successfulSkills.push(result.skill);
      p.log.success(`${chalk.green('✓')} ${result.skill.name}@${result.skill.version}`);
    } else {
      failedSkills.push({ ref: result.skillRef, error: result.error });
      p.log.error(`${chalk.red('✗')} ${result.skillRef}`);
    }
  }

  // Display batch results
  console.log();
  displayBatchInstallResults(successfulSkills, failedSkills, targetAgents.length);

  // Save installation defaults (only for project installs with success)
  if (!installGlobally && successfulSkills.length > 0 && configLoader.exists()) {
    configLoader.reload(); // Sync with SkillManager's changes
    configLoader.updateDefaults({ targetAgents, installMode });
  }

  // Exit with error if any skills failed
  if (failedSkills.length > 0) {
    process.exit(1);
  }
}

// ============================================================================
// Display Helpers
// ============================================================================

interface SummaryInfo {
  skillCount: number;
  agentCount: number;
  scope: string;
  mode: InstallMode;
}

/**
 * Display installation summary note
 */
function displayInstallSummary(info: SummaryInfo): void {
  const summaryLines = [
    `${chalk.cyan(info.skillCount)} skill(s) → ${chalk.cyan(info.agentCount)} agent(s)`,
    `${chalk.dim('Scope:')} ${info.scope}${chalk.dim(', Mode:')} ${info.mode}`,
  ];
  p.note(summaryLines.join('\n'), 'Installation Summary');
}

/**
 * Display installation results for batch install
 */
function displayInstallResults(
  skillCount: number,
  agentCount: number,
  totalInstalled: number,
  totalFailed: number,
): void {
  if (totalFailed === 0) {
    p.log.success(
      `Installed ${chalk.green(skillCount)} skill(s) to ${chalk.green(agentCount)} agent(s)`,
    );
  } else {
    p.log.warn(
      `Installed ${chalk.green(totalInstalled)} successfully, ${chalk.red(totalFailed)} failed`,
    );
  }
}

/**
 * Display results for batch skill installation
 */
function displayBatchInstallResults(
  successfulSkills: { name: string; version: string }[],
  failedSkills: { ref: string; error: string }[],
  agentCount: number,
): void {
  if (successfulSkills.length > 0) {
    const resultLines = successfulSkills.map((s) => `  ${chalk.green('✓')} ${s.name}@${s.version}`);
    p.note(
      resultLines.join('\n'),
      chalk.green(`Installed ${successfulSkills.length} skill(s) to ${agentCount} agent(s)`),
    );
  }

  if (failedSkills.length > 0) {
    p.log.error(chalk.red(`Failed to install ${failedSkills.length} skill(s):`));
    for (const { ref, error } of failedSkills) {
      p.log.message(`  ${chalk.red('✗')} ${ref}: ${chalk.dim(error)}`);
    }
  }
}

/**
 * Display results for single skill installation
 */
function displaySingleSkillResults(
  installed: { name: string; version: string },
  successful: [
    AgentType,
    {
      success: boolean;
      path: string;
      mode: InstallMode;
      canonicalPath?: string;
      symlinkFailed?: boolean;
    },
  ][],
  failed: [AgentType, { success: boolean; error?: string }][],
  cwd: string,
): void {
  if (successful.length > 0) {
    const resultLines: string[] = [];
    const firstResult = successful[0][1];

    if (firstResult.mode === 'copy') {
      resultLines.push(
        `${chalk.green('✓')} ${installed.name}@${installed.version} ${chalk.dim('(copied)')}`,
      );
      for (const [, result] of successful) {
        resultLines.push(`  ${chalk.dim('→')} ${shortenPath(result.path, cwd)}`);
      }
    } else {
      // Symlink mode
      const displayPath = firstResult.canonicalPath
        ? shortenPath(firstResult.canonicalPath, cwd)
        : `${installed.name}@${installed.version}`;
      resultLines.push(`${chalk.green('✓')} ${displayPath}`);

      const symlinked = successful
        .filter(([, r]) => !r.symlinkFailed)
        .map(([a]) => agents[a].displayName);
      const copied = successful
        .filter(([, r]) => r.symlinkFailed)
        .map(([a]) => agents[a].displayName);

      if (symlinked.length > 0) {
        resultLines.push(`  ${chalk.dim('symlink →')} ${symlinked.join(', ')}`);
      }
      if (copied.length > 0) {
        resultLines.push(`  ${chalk.yellow('copied →')} ${copied.join(', ')}`);
      }
    }

    p.note(
      resultLines.join('\n'),
      chalk.green(
        `Installed 1 skill to ${successful.length} agent${successful.length !== 1 ? 's' : ''}`,
      ),
    );

    // Symlink failure warning
    const symlinkFailed = successful.filter(([, r]) => r.mode === 'symlink' && r.symlinkFailed);
    if (symlinkFailed.length > 0) {
      const copiedAgentNames = symlinkFailed.map(([a]) => agents[a].displayName);
      p.log.warn(chalk.yellow(`Symlinks failed for: ${copiedAgentNames.join(', ')}`));
      p.log.message(
        chalk.dim(
          '  Files were copied instead. On Windows, enable Developer Mode for symlink support.',
        ),
      );
    }
  }

  // Show failure message
  if (failed.length > 0) {
    p.log.error(chalk.red(`Failed to install to ${failed.length} agent(s)`));
    for (const [agent, result] of failed) {
      p.log.message(`  ${chalk.red('✗')} ${agents[agent].displayName}: ${chalk.dim(result.error)}`);
    }
  }
}

// ============================================================================
// Command Definition
// ============================================================================

/**
 * install command - Install a skill or all skills from skills.json
 *
 * Installation Flow:
 * 1. Resolve target agents (CLI > stored > detected > prompt)
 * 2. Resolve installation scope (global vs project)
 * 3. Resolve installation mode (symlink vs copy)
 * 4. Execute installation
 * 5. Save defaults for future installs
 *
 * Behavior:
 * - Single skill install: Prompts for agents/mode (stored config as defaults)
 * - Reinstall all (no args): Uses stored config directly, no confirmation
 */
export const installCommand = new Command('install')
  .alias('i')
  .description('Install one or more skills, or all skills from skills.json')
  .argument(
    '[skills...]',
    'Skill references (e.g., github:user/skill@v1.0.0 or git@github.com:user/repo.git)',
  )
  .option('-f, --force', 'Force reinstall even if already installed')
  .option('-g, --global', 'Install globally to user home directory')
  .option('--no-save', 'Do not save to skills.json')
  .option('-a, --agent <agents...>', 'Specify target agents (e.g., cursor, claude-code)')
  .option('--mode <mode>', 'Installation mode: symlink or copy')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--all', 'Install to all agents (implies -y -g)')
  .action(async (skills: string[], options: InstallOptions) => {
    // Handle --all flag implications
    if (options.all) {
      options.yes = true;
      options.global = true;
    }

    // Create execution context
    const ctx = createInstallContext(skills, options);

    // Print banner
    console.log();
    p.intro(chalk.bgCyan.black(' reskill '));

    try {
      const spinner = p.spinner();

      // Step 1: Resolve target agents
      const targetAgents = await resolveTargetAgents(ctx, spinner);

      // Step 2: Resolve installation scope
      const installGlobally = await resolveInstallScope(ctx);

      // Validate: Cannot install all skills globally
      if (ctx.isReinstallAll && installGlobally) {
        p.log.error('Cannot install all skills globally. Please specify a skill to install.');
        process.exit(1);
      }

      // Step 3: Resolve installation mode
      const installMode = await resolveInstallMode(ctx);

      // Step 4: Execute installation
      if (ctx.isReinstallAll) {
        await installAllSkills(ctx, targetAgents, installMode, spinner);
      } else if (ctx.isBatchInstall) {
        await installMultipleSkills(ctx, targetAgents, installGlobally, installMode, spinner);
      } else {
        await installSingleSkill(ctx, targetAgents, installGlobally, installMode, spinner);
      }

      // Done
      console.log();
      p.outro(chalk.green('Done!'));
    } catch (error) {
      p.log.error((error as Error).message);
      p.outro(chalk.red('Installation failed'));
      process.exit(1);
    }
  });

export default installCommand;
