import { Command } from 'commander';
import chalk from 'chalk';
import { Logger } from '../utils/logger.js';

export function helpCommand(program: Command): void {
  program
    .command('help [command]')
    .description('Display help information')
    .action((commandName) => {
      if (commandName) {
        const command = program.commands.find(cmd => cmd.name() === commandName);
        if (command) {
          command.help();
        } else {
          Logger.error(`Unknown command: ${chalk.yellow(commandName)}`);
          program.help();
        }
      } else {
        displayGeneralHelp();
      }
    });
}

function displayGeneralHelp(): void {
  const version = '0.1.0';

  console.log(`
${chalk.bold.cyan('💫 Aether Packet Manager (APM)')} ${chalk.green(`v${version}`)}

${chalk.bold('DESCRIPTION')}
  A package manager for the Aether Framework

${chalk.bold('USAGE')}
  ${chalk.yellow('apm')} [command] [options]

${chalk.bold('COMMANDS')}
  ${chalk.green('init')}              Initialize a new Aether package
  ${chalk.green('install [package]')} Install a package from registry or GitHub
  ${chalk.green('publish')}           Publish a package to the registry
  ${chalk.green('list, ls')}          List installed packages
  ${chalk.green('help [command]')}    Display help information

${chalk.bold('EXAMPLES')}
  ${chalk.yellow('apm init')}
  ${chalk.yellow('apm install example-package')}
  ${chalk.yellow('apm install user/repo')}
  ${chalk.yellow('apm install https://github.com/user/repo')}
  ${chalk.yellow('apm publish')}
  ${chalk.yellow('apm list --all')}
  ${chalk.yellow('apm help install')}

${chalk.bold('CONFIGURATION')}
  Packages use ${chalk.cyan('aether.json')} for project configuration
  Package metadata is stored in ${chalk.cyan('package.aether.json')}
  Packages are installed to ${chalk.cyan('aether_modules/')} directory
  `);
}
