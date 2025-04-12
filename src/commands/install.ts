import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { Logger } from '../utils/logger.js';
import { FileSystem } from '../utils/fs.js';
import { Registry } from '../utils/registry.js';

export function installCommand(program: Command): void {
  program
    .command('install [package]')
    .description('Install a package from registry or GitHub')
    .option('-D, --dev', 'Install as a development dependency')
    .option('-g, --global', 'Install globally')
    .action(async (packageName, options) => {
      try {
        const cwd = process.cwd();

        // Make sure we're in an Aether project (unless installing globally)
        if (!options.global && !await FileSystem.isAetherProject(cwd)) {
          Logger.error('Not an Aether project. Run "apm init" first.');
          return;
        }

        // If no package name, install all dependencies from aether.json
        if (!packageName) {
          await installAllDependencies(cwd);
          return;
        }

        // Read the project configuration
        const config = await FileSystem.readAetherConfig(cwd);

        // Parse the package name to see if it's a GitHub repository
        const { isGitHub, name, repo } = Registry.parsePackageSpecifier(packageName);

        let installedVersion = '';

        // Create the modules directory if it doesn't exist
        const modulesDir = await FileSystem.ensureModulesDir(cwd);
        const packageDir = path.join(modulesDir, name);

        if (isGitHub) {
          Logger.info(`Installing ${chalk.cyan(name)} from GitHub repository: ${chalk.yellow(repo)}`);

          // Download from GitHub
          const packageConfig = await Registry.downloadFromGitHub(repo, packageDir);
          installedVersion = packageConfig.version;

          // Register the package in the local registry
          await Registry.addPackage({
            name,
            version: packageConfig.version,
            description: packageConfig.description,
            repository: repo,
            author: packageConfig.author
          });

          Logger.success(`Package ${chalk.cyan(name)}@${chalk.green(installedVersion)} installed from GitHub`);
        } else {
          // First check if the package exists in the local registry
          const registryPackage = await Registry.getPackage(name);

          if (registryPackage) {
            Logger.info(`Installing ${chalk.cyan(name)} from registry`);

            // Download from the repository specified in the registry
            const packageConfig = await Registry.downloadFromGitHub(registryPackage.repository, packageDir);
            installedVersion = packageConfig.version;

            Logger.success(`Package ${chalk.cyan(name)}@${chalk.green(installedVersion)} installed from registry`);
          } else {
            Logger.error(`Package ${chalk.cyan(name)} not found in registry`);
            Logger.info(`To install from GitHub, use the format: ${chalk.yellow('apm install user/repo')} or ${chalk.yellow('apm install https://github.com/user/repo')}`);
            return;
          }
        }

        // Update aether.json with the new dependency
        if (!options.global) {
          if (options.dev) {
            config.devDependencies = config.devDependencies || {};
            config.devDependencies[name] = installedVersion;
          } else {
            config.dependencies[name] = installedVersion;
          }
          await FileSystem.writeAetherConfig(config, cwd);
        }

        // Check for sub-dependencies
        await installSubDependencies(packageDir, modulesDir);

        Logger.success('All packages installed successfully');
      } catch (error) {
        Logger.error('Failed to install package', error as Error);
      }
    });
}

async function installAllDependencies(projectDir: string): Promise<void> {
  try {
    const config = await FileSystem.readAetherConfig(projectDir);

    const dependencies = {
      ...config.dependencies,
      ...(config.devDependencies || {})
    };

    if (Object.keys(dependencies).length === 0) {
      Logger.info('No dependencies to install');
      return;
    }

    Logger.info(`Installing ${Object.keys(dependencies).length} packages...`);

    for (const [name, version] of Object.entries(dependencies)) {
      try {
        Logger.info(`Installing ${chalk.cyan(name)}@${chalk.yellow(version)}`);

        // Check if already installed
        if (await FileSystem.isPackageInstalled(name, projectDir)) {
          const packageDir = FileSystem.getPackagePath(name, projectDir);
          const packageConfig = await FileSystem.readPackageConfig(packageDir);

          if (packageConfig.version === version) {
            Logger.info(`Package ${chalk.cyan(name)}@${chalk.green(version)} is already installed`);
            continue;
          }
        }

        // Get the package from registry
        const registryPackage = await Registry.getPackage(name);

        if (registryPackage) {
          // Download the package
          const packageDir = FileSystem.getPackagePath(name, projectDir);
          await Registry.downloadFromGitHub(registryPackage.repository, packageDir);
          Logger.success(`Installed ${chalk.cyan(name)}@${chalk.green(registryPackage.version)}`);

          // Install sub-dependencies
          const modulesDir = path.join(projectDir, FileSystem.MODULES_DIR);
          await installSubDependencies(packageDir, modulesDir);
        } else {
          Logger.warning(`Package ${chalk.cyan(name)} not found in registry, skipping`);
        }
      } catch (error) {
        Logger.error(`Failed to install ${name}`, error as Error);
      }
    }

    Logger.success('All dependencies installed');
  } catch (error) {
    Logger.error('Failed to install dependencies', error as Error);
    throw error;
  }
}

async function installSubDependencies(packageDir: string, modulesDir: string): Promise<void> {
  try {
    // Check if the package has dependencies
    const packageConfig = await FileSystem.readPackageConfig(packageDir);

    if (!packageConfig.dependencies || Object.keys(packageConfig.dependencies).length === 0) {
      return;
    }

    Logger.info(`Installing sub-dependencies for ${chalk.cyan(packageConfig.name)}...`);

    for (const [name, version] of Object.entries(packageConfig.dependencies)) {
      try {
        // Check if already installed
        const subPackageDir = path.join(modulesDir, name);
        if (await fs.pathExists(subPackageDir)) {
          try {
            const subPackageConfig = await FileSystem.readPackageConfig(subPackageDir);
            if (subPackageConfig.version === version) {
              Logger.info(`Sub-dependency ${chalk.cyan(name)}@${chalk.green(version)} is already installed`);
              continue;
            }
          } catch (e) {
            // If can't read the package config, try to reinstall
          }
        }

        // Get the package from registry
        const registryPackage = await Registry.getPackage(name);

        if (registryPackage) {
          // Download the package
          await Registry.downloadFromGitHub(registryPackage.repository, subPackageDir);
          Logger.success(`Installed sub-dependency ${chalk.cyan(name)}@${chalk.green(registryPackage.version)}`);

          // Recursively install its dependencies
          await installSubDependencies(subPackageDir, modulesDir);
        } else {
          Logger.warning(`Sub-dependency ${chalk.cyan(name)} not found in registry, skipping`);
        }
      } catch (error) {
        Logger.error(`Failed to install sub-dependency ${name}`, error as Error);
      }
    }
  } catch (error) {
    Logger.error('Failed to install sub-dependencies', error as Error);
  }
}
