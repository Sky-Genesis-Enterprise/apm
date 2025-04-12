import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { Logger } from '../utils/logger.js';
import { FileSystem, AetherPackage } from '../utils/fs.js';
import { Registry } from '../utils/registry.js';

export function publishCommand(program: Command): void {
  program
    .command('publish')
    .description('Publish a package to the registry')
    .option('--dry-run', 'Show what would be published without actually publishing')
    .action(async (options) => {
      try {
        const cwd = process.cwd();

        // Make sure we're in an Aether project
        if (!await FileSystem.isAetherProject(cwd)) {
          Logger.error('Not an Aether project. Run "apm init" first.');
          return;
        }

        // Check if package.aether.json exists
        const packageConfigPath = path.join(cwd, FileSystem.PACKAGE_CONFIG_FILENAME);
        if (!await fs.pathExists(packageConfigPath)) {
          Logger.error(`No ${FileSystem.PACKAGE_CONFIG_FILENAME} found. Create one first.`);

          const createPackageConfig = await inquirer.prompt([{
            type: 'confirm',
            name: 'create',
            message: `Create ${FileSystem.PACKAGE_CONFIG_FILENAME} from ${FileSystem.AETHER_CONFIG_FILENAME}?`,
            default: true
          }]);

          if (!createPackageConfig.create) {
            return;
          }

          // Create package.aether.json from aether.json
          const config = await FileSystem.readAetherConfig(cwd);

          // Collect additional information
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'author',
              message: 'Package author:',
              default: config.author || ''
            },
            {
              type: 'input',
              name: 'repository',
              message: 'Repository URL:',
              default: config.repository || ''
            },
            {
              type: 'input',
              name: 'main',
              message: 'Main entry point:',
              default: 'src/index.js'
            }
          ]);

          const packageConfig: AetherPackage = {
            name: config.name,
            version: config.version,
            description: config.description,
            dependencies: config.dependencies,
            author: answers.author,
            repository: answers.repository,
            main: answers.main
          };

          await FileSystem.writePackageConfig(cwd, packageConfig);
          Logger.success(`Created ${FileSystem.PACKAGE_CONFIG_FILENAME}`);
        }

        // Read the package configuration
        const packageConfig = await FileSystem.readPackageConfig(cwd);

        // Validate package configuration
        if (!packageConfig.name) {
          Logger.error('Package name is required');
          return;
        }

        if (!packageConfig.version) {
          Logger.error('Package version is required');
          return;
        }

        if (!packageConfig.repository) {
          Logger.warning('Repository URL is missing. It is recommended to specify a repository URL.');

          const addRepo = await inquirer.prompt([{
            type: 'input',
            name: 'repository',
            message: 'Repository URL (leave empty to skip):',
            default: ''
          }]);

          if (addRepo.repository) {
            packageConfig.repository = addRepo.repository;
            await FileSystem.writePackageConfig(cwd, packageConfig);
          }
        }

        // Check if the package already exists in the registry
        const existingPackage = await Registry.getPackage(packageConfig.name);

        if (existingPackage) {
          if (existingPackage.version === packageConfig.version) {
            Logger.warning(`Package ${chalk.cyan(packageConfig.name)}@${chalk.yellow(packageConfig.version)} already exists in the registry`);

            const overwrite = await inquirer.prompt([{
              type: 'confirm',
              name: 'overwrite',
              message: 'Overwrite?',
              default: false
            }]);

            if (!overwrite.overwrite) {
              Logger.info('Publication cancelled');
              return;
            }
          } else {
            Logger.info(`Updating package ${chalk.cyan(packageConfig.name)} from version ${chalk.yellow(existingPackage.version)} to ${chalk.green(packageConfig.version)}`);
          }
        }

        // List files to be published
        const filesToIgnore = ['node_modules', 'aether_modules', '.git'];
        const files = await listFilesRecursively(cwd, filesToIgnore);

        Logger.header('Files to be published');
        files.forEach(file => console.log(`  ${file}`));

        if (options.dryRun) {
          Logger.info('Dry run: Package not published');
          return;
        }

        // Confirm publication
        const confirmPublish = await inquirer.prompt([{
          type: 'confirm',
          name: 'publish',
          message: `Publish ${chalk.cyan(packageConfig.name)}@${chalk.yellow(packageConfig.version)}?`,
          default: true
        }]);

        if (!confirmPublish.publish) {
          Logger.info('Publication cancelled');
          return;
        }

        // Add the package to the registry
        await Registry.addPackage({
          name: packageConfig.name,
          version: packageConfig.version,
          description: packageConfig.description,
          repository: packageConfig.repository || '',
          author: packageConfig.author
        });

        Logger.success(`Published ${chalk.cyan(packageConfig.name)}@${chalk.green(packageConfig.version)}`);
        Logger.info(`You can now install with ${chalk.yellow(`apm install ${packageConfig.name}`)}`);
      } catch (error) {
        Logger.error('Failed to publish package', error as Error);
      }
    });
}

async function listFilesRecursively(
  dir: string,
  ignorePatterns: string[] = [],
  rootDir: string = dir,
  fileList: string[] = []
): Promise<string[]> {
  const files = await fs.readdir(dir);

  for (const file of files) {
    const absolutePath = path.join(dir, file);
    const relativePath = path.relative(rootDir, absolutePath);

    // Check if the file should be ignored
    if (ignorePatterns.some(pattern => {
      return file === pattern || relativePath.startsWith(pattern + path.sep);
    })) {
      continue;
    }

    const stat = await fs.stat(absolutePath);

    if (stat.isDirectory()) {
      await listFilesRecursively(absolutePath, ignorePatterns, rootDir, fileList);
    } else {
      fileList.push(relativePath);
    }
  }

  return fileList;
}
