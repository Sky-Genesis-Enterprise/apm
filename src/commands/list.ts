import { Command } from 'commander';
import chalk from 'chalk';
import { Logger } from '../utils/logger.js';
import { FileSystem } from '../utils/fs.js';
import { Registry, RegistryPackage } from '../utils/registry.js';

export function listCommand(program: Command): void {
  program
    .command('list')
    .alias('ls')
    .description('List installed packages or packages in the registry')
    .option('-a, --all', 'Show all available packages in the registry')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      try {
        if (options.all) {
          await listAllPackages(options.json);
        } else {
          await listInstalledPackages(options.json);
        }
      } catch (error) {
        Logger.error('Failed to list packages', error as Error);
      }
    });
}

async function listInstalledPackages(jsonOutput = false): Promise<void> {
  try {
    const cwd = process.cwd();

    // Check if we're in an Aether project
    if (!await FileSystem.isAetherProject(cwd)) {
      Logger.error('Not an Aether project. Run "apm init" first.');
      return;
    }

    // Read the project configuration
    const config = await FileSystem.readAetherConfig(cwd);

    const dependencies = Object.entries(config.dependencies || {}).map(([name, version]) => ({
      name,
      version,
      type: 'dependency'
    }));

    const devDependencies = Object.entries(config.devDependencies || {}).map(([name, version]) => ({
      name,
      version,
      type: 'devDependency'
    }));

    const allDependencies = [...dependencies, ...devDependencies];

    if (allDependencies.length === 0) {
      if (jsonOutput) {
        console.log('[]');
      } else {
        Logger.info('No packages installed');
      }
      return;
    }

    if (jsonOutput) {
      console.log(JSON.stringify(allDependencies, null, 2));
      return;
    }

    Logger.header(`Installed packages in ${chalk.cyan(config.name)}`);

    if (dependencies.length > 0) {
      console.log(chalk.bold('\nDependencies:'));
      dependencies.forEach(dep => {
        console.log(`  ${chalk.cyan(dep.name)}@${chalk.green(dep.version)}`);
      });
    }

    if (devDependencies.length > 0) {
      console.log(chalk.bold('\nDev Dependencies:'));
      devDependencies.forEach(dep => {
        console.log(`  ${chalk.cyan(dep.name)}@${chalk.green(dep.version)}`);
      });
    }

    console.log('\n');
  } catch (error) {
    Logger.error('Failed to list installed packages', error as Error);
  }
}

async function listAllPackages(jsonOutput = false): Promise<void> {
  try {
    // Get all packages from the registry
    const packages = await Registry.getPackages();

    if (packages.length === 0) {
      if (jsonOutput) {
        console.log('[]');
      } else {
        Logger.info('No packages available in the registry');
      }
      return;
    }

    if (jsonOutput) {
      console.log(JSON.stringify(packages, null, 2));
      return;
    }

    Logger.header('Available packages in registry');

    // Group packages by name
    const groupedPackages: Record<string, RegistryPackage[]> = {};
    packages.forEach(pkg => {
      if (!groupedPackages[pkg.name]) {
        groupedPackages[pkg.name] = [];
      }
      groupedPackages[pkg.name].push(pkg);
    });

    // Sort packages by name
    const sortedNames = Object.keys(groupedPackages).sort();

    for (const name of sortedNames) {
      const pkgVersions = groupedPackages[name];
      const latestPkg = pkgVersions[pkgVersions.length - 1];

      console.log(`${chalk.cyan(name)} - ${latestPkg.description || 'No description'}`);

      if (pkgVersions.length > 1) {
        console.log(`  ${chalk.green('Available versions:')} ${pkgVersions.map(p => p.version).join(', ')}`);
      } else {
        console.log(`  ${chalk.green('Version:')} ${latestPkg.version}`);
      }

      if (latestPkg.author) {
        console.log(`  ${chalk.yellow('Author:')} ${latestPkg.author}`);
      }

      if (latestPkg.repository) {
        console.log(`  ${chalk.yellow('Repository:')} ${latestPkg.repository}`);
      }

      console.log(''); // Add empty line between packages
    }
  } catch (error) {
    Logger.error('Failed to list available packages', error as Error);
  }
}
