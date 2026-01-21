#!/usr/bin/env node

import { Command } from 'commander';
import {
  initCommand,
  installCommand,
  listCommand,
  infoCommand,
  updateCommand,
  outdatedCommand,
  uninstallCommand,
  linkCommand,
  unlinkCommand,
} from './commands/index.js';

const program = new Command();

program
  .name('reskill')
  .description('AI Skills Package Manager - Git-based skills management for AI agents')
  .version('0.1.0');

// Register all commands
program.addCommand(initCommand);
program.addCommand(installCommand);
program.addCommand(listCommand);
program.addCommand(infoCommand);
program.addCommand(updateCommand);
program.addCommand(outdatedCommand);
program.addCommand(uninstallCommand);
program.addCommand(linkCommand);
program.addCommand(unlinkCommand);

// Parse arguments
program.parse();
