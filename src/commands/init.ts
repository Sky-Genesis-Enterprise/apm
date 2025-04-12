import { Command } from 'commander';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { Logger } from '../utils/logger.js';
import { FileSystem, AetherConfig } from '../utils/fs.js';

export function initCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a new Aether package')
    .option('-y, --yes', 'Skip prompts and use default values')
    .action(async (options) => {
      try {
        const cwd = process.cwd();

        // Check if aether.json already exists
        if (await FileSystem.isAetherProject(cwd)) {
          const overwrite = await inquirer.prompt([{
            type: 'confirm',
            name: 'overwrite',
            message: `${FileSystem.AETHER_CONFIG_FILENAME} already exists. Overwrite?`,
            default: false
          }]);

          if (!overwrite.overwrite) {
            Logger.info('Initialization cancelled');
            return;
          }
        }

        let config: AetherConfig;

        if (options.yes) {
          // Use defaults
          const folderName = path.basename(cwd);
          config = {
            name: folderName,
            version: '0.1.0',
            description: `Aether package for ${folderName}`,
            dependencies: {}
          };
        } else {
          // Prompt for package information
          Logger.header('Initialize a new Aether package');

          const folderName = path.basename(cwd);
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Package name:',
              default: folderName,
              validate: (input) => {
                if (input.trim() === '') return 'Package name cannot be empty';
                if (!/^[a-z0-9-_.]+$/.test(input)) return 'Package name can only contain lowercase letters, numbers, hyphens, underscores, and dots';
                return true;
              }
            },
            {
              type: 'input',
              name: 'version',
              message: 'Version:',
              default: '0.1.0',
              validate: (input) => {
                if (!/^\d+\.\d+\.\d+$/.test(input)) return 'Version must be in format x.y.z';
                return true;
              }
            },
            {
              type: 'input',
              name: 'description',
              message: 'Description:',
              default: `Aether package for ${folderName}`
            },
            {
              type: 'input',
              name: 'author',
              message: 'Author:',
            },
            {
              type: 'input',
              name: 'repository',
              message: 'Repository URL:',
            }
          ]);

          config = {
            ...answers,
            dependencies: {}
          };
        }

        // Create the aether.json file
        await FileSystem.writeAetherConfig(config, cwd);

        // Create aether_modules directory
        await FileSystem.ensureModulesDir(cwd);

        // Create basic file structure if directory is empty
        const files = await fs.readdir(cwd);
        if (files.length <= 3) { // Only has aether.json, aether_modules, and maybe .git
          await fs.ensureDir(path.join(cwd, 'src'));
          await fs.writeFile(path.join(cwd, 'src', 'index.js'), '// Aether package entry point\n', 'utf8');
          await fs.writeFile(path.join(cwd, '.gitignore'), 'aether_modules/\nnode_modules/\n.DS_Store\n', 'utf8');
          await fs.writeFile(path.join(cwd, 'README.md'), `# ${config.name}\n\n${config.description || ''}\n`, 'utf8');

          // Also create a package.aether.json file for publishing
          const packageConfig = {
            name: config.name,
            version: config.version,
            description: config.description,
            author: config.author,
            repository: config.repository,
            main: 'src/index.js',
            dependencies: {}
          };

          await FileSystem.writePackageConfig(cwd, packageConfig);
        }

        Logger.success(`Initialized new Aether package: ${chalk.cyan(config.name)}`);
        Logger.info(`Run ${chalk.yellow('apm install <package>')} to install dependencies`);
      } catch (error) {
        Logger.error('Failed to initialize package', error as Error);
      }
    });
}
