#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { installCommand } from './commands/install.js';
import { publishCommand } from './commands/publish.js';
import { listCommand } from './commands/list.js';
import { helpCommand } from './commands/help.js';

// Display info about environment when debugging
function logEnvironmentInfo() {
  // Get environment variables for debugging sudo issues
  const userId = process.getuid?.() ?? 'N/A';
  const groupId = process.getgid?.() ?? 'N/A';
  const sudoUser = process.env.SUDO_USER || 'N/A';
  const sudoUid = process.env.SUDO_UID || 'N/A';
  const sudoGid = process.env.SUDO_GID || 'N/A';

  console.log(`
Debug Environment Info:
  Running as UID: ${userId}
  Running as GID: ${groupId}
  SUDO_USER: ${sudoUser}
  SUDO_UID: ${sudoUid}
  SUDO_GID: ${sudoGid}
  CWD: ${process.cwd()}
  `);
}

async function main() {
  const program = new Command();

  // If DEBUG environment variable is set, show debug info
  if (process.env.DEBUG) {
    logEnvironmentInfo();
  }

  program
    .name('apm')
    .description('Aether Packet Manager - CLI tool for managing Aether Framework packages')
    .version('0.1.0');

  // Register commands
  initCommand(program);
  installCommand(program);
  publishCommand(program);
  listCommand(program);
  helpCommand(program);

  // Custom help formatting
  program.configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => chalk.green(cmd.name()),
    commandUsage: (cmd) => chalk.yellow(cmd.usage()),
    argumentTerm: (arg) => chalk.cyan(`<${arg.name()}>`),
    optionTerm: (option) => chalk.cyan(option.flags),
  });

  // Parse args and handle errors
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Always run the main function - ES modules don't have the same require.main check
main().catch((error) => {
  console.error(chalk.red('Fatal Error:'), error instanceof Error ? error.message : String(error));
  process.exit(1);
});
