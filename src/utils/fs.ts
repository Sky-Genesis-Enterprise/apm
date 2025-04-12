import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger.js';

export interface AetherPackage {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
  author?: string;
  repository?: string;
  [key: string]: any;
}

export interface AetherConfig {
  name: string;
  version: string;
  description?: string;
  dependencies: Record<string, string>;
  [key: string]: any;
}

export class FileSystem {
  static readonly AETHER_CONFIG_FILENAME = 'aether.json';
  static readonly PACKAGE_CONFIG_FILENAME = 'package.aether.json';
  static readonly MODULES_DIR = 'aether_modules';

  /**
   * Check if the current directory is an Aether project
   */
  static async isAetherProject(dir = process.cwd()): Promise<boolean> {
    try {
      return await fs.pathExists(path.join(dir, this.AETHER_CONFIG_FILENAME));
    } catch (error) {
      Logger.debug('Error checking if directory is an Aether project', error);
      return false;
    }
  }

  /**
   * Read the Aether configuration file
   */
  static async readAetherConfig(dir = process.cwd()): Promise<AetherConfig> {
    try {
      const configPath = path.join(dir, this.AETHER_CONFIG_FILENAME);
      if (!await fs.pathExists(configPath)) {
        throw new Error(`No ${this.AETHER_CONFIG_FILENAME} found in ${dir}. Run 'apm init' first.`);
      }

      const configData = await fs.readJSON(configPath);
      return {
        name: configData.name ?? '',
        version: configData.version ?? '0.1.0',
        description: configData.description,
        dependencies: configData.dependencies ?? {},
        ...configData
      };
    } catch (error) {
      Logger.debug('Error reading Aether config', error);
      throw new Error(`Failed to read ${this.AETHER_CONFIG_FILENAME}: ${(error as Error).message}`);
    }
  }

  /**
   * Write the Aether configuration file
   */
  static async writeAetherConfig(config: AetherConfig, dir = process.cwd()): Promise<void> {
    try {
      await fs.writeJSON(path.join(dir, this.AETHER_CONFIG_FILENAME), config, { spaces: 2 });
    } catch (error) {
      Logger.debug('Error writing Aether config', error);
      throw new Error(`Failed to write ${this.AETHER_CONFIG_FILENAME}: ${(error as Error).message}`);
    }
  }

  /**
   * Read a package's configuration file
   */
  static async readPackageConfig(packageDir: string): Promise<AetherPackage> {
    try {
      const configPath = path.join(packageDir, this.PACKAGE_CONFIG_FILENAME);
      if (!await fs.pathExists(configPath)) {
        throw new Error(`No ${this.PACKAGE_CONFIG_FILENAME} found in ${packageDir}.`);
      }

      return await fs.readJSON(configPath);
    } catch (error) {
      Logger.debug('Error reading package config', error);
      throw new Error(`Failed to read package config: ${(error as Error).message}`);
    }
  }

  /**
   * Write a package's configuration file
   */
  static async writePackageConfig(packageDir: string, config: AetherPackage): Promise<void> {
    try {
      await fs.writeJSON(path.join(packageDir, this.PACKAGE_CONFIG_FILENAME), config, { spaces: 2 });
    } catch (error) {
      Logger.debug('Error writing package config', error);
      throw new Error(`Failed to write package config: ${(error as Error).message}`);
    }
  }

  /**
   * Ensure the Aether modules directory exists
   */
  static async ensureModulesDir(dir = process.cwd()): Promise<string> {
    const modulesDir = path.join(dir, this.MODULES_DIR);
    try {
      await fs.ensureDir(modulesDir);

      // Ensure user has correct permissions if run with sudo
      try {
        const uid = process.getuid?.() ?? -1;
        const gid = process.getgid?.() ?? -1;

        if (uid !== -1 && gid !== -1) {
          // Only change permissions if we're not running as the real user
          const sudoUid = parseInt(process.env.SUDO_UID || '-1', 10);
          if (sudoUid !== -1 && uid !== sudoUid) {
            await fs.chown(modulesDir, sudoUid, parseInt(process.env.SUDO_GID || '-1', 10));
          }
        }
      } catch (permError) {
        // Just log a warning if permission change fails
        Logger.debug('Unable to update modules directory permissions', permError);
      }

      return modulesDir;
    } catch (error) {
      Logger.debug('Error ensuring modules directory', error);
      throw new Error(`Failed to create ${this.MODULES_DIR} directory: ${(error as Error).message}`);
    }
  }

  /**
   * Get the path to an installed package
   */
  static getPackagePath(packageName: string, dir = process.cwd()): string {
    return path.join(dir, this.MODULES_DIR, packageName);
  }

  /**
   * Check if a package is installed
   */
  static async isPackageInstalled(packageName: string, dir = process.cwd()): Promise<boolean> {
    try {
      const packagePath = this.getPackagePath(packageName, dir);
      const exists = await fs.pathExists(packagePath);
      const hasConfig = exists && await fs.pathExists(path.join(packagePath, this.PACKAGE_CONFIG_FILENAME));
      return exists && hasConfig;
    } catch (error) {
      Logger.debug('Error checking if package is installed', error);
      return false;
    }
  }
}
