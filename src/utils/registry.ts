import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { simpleGit } from 'simple-git';
import { Logger } from './logger.js';
import { AetherPackage, FileSystem } from './fs.js';

export interface RegistryPackage {
  name: string;
  version: string;
  description?: string;
  repository: string;
  author?: string;
}

export class Registry {
  private static REGISTRY_DIR = path.join(os.homedir(), '.aether', 'registry');
  private static REGISTRY_FILE = path.join(Registry.REGISTRY_DIR, 'packages.json');
  private static TEMP_DIR = path.join(os.tmpdir(), 'aether-temp');

  /**
   * Initialize the registry
   */
  static async init(): Promise<void> {
    try {
      await fs.ensureDir(this.REGISTRY_DIR);

      // Ensure user has correct permissions for the registry directory
      try {
        // Get current user info
        const uid = process.getuid?.() ?? -1;
        const gid = process.getgid?.() ?? -1;

        if (uid !== -1 && gid !== -1) {
          await fs.chown(this.REGISTRY_DIR, uid, gid);
        }
      } catch (permError) {
        // If permission change fails, just log a warning and continue
        Logger.debug('Unable to update registry directory permissions', permError);
      }

      // Create registry file if it doesn't exist
      if (!await fs.pathExists(this.REGISTRY_FILE)) {
        await fs.writeJSON(this.REGISTRY_FILE, { packages: [] }, { spaces: 2 });
      }

      // Create temp directory
      await fs.ensureDir(this.TEMP_DIR);
    } catch (error) {
      Logger.debug('Error initializing registry', error);
      throw new Error(`Failed to initialize registry: ${(error as Error).message}`);
    }
  }

  /**
   * Get all packages from the registry
   */
  static async getPackages(): Promise<RegistryPackage[]> {
    try {
      await this.init();
      const registry = await fs.readJSON(this.REGISTRY_FILE);
      return registry.packages || [];
    } catch (error) {
      Logger.debug('Error getting packages from registry', error);
      throw new Error(`Failed to get packages from registry: ${(error as Error).message}`);
    }
  }

  /**
   * Get a package from the registry by name
   */
  static async getPackage(packageName: string): Promise<RegistryPackage | null> {
    try {
      const packages = await this.getPackages();
      return packages.find(pkg => pkg.name === packageName) || null;
    } catch (error) {
      Logger.debug(`Error getting package ${packageName} from registry`, error);
      throw new Error(`Failed to get package ${packageName} from registry: ${(error as Error).message}`);
    }
  }

  /**
   * Add a package to the registry
   */
  static async addPackage(pkg: RegistryPackage): Promise<void> {
    try {
      await this.init();
      const registry = await fs.readJSON(this.REGISTRY_FILE);

      // Check if package already exists
      const existingIndex = registry.packages.findIndex((p: RegistryPackage) => p.name === pkg.name);

      if (existingIndex !== -1) {
        // Update existing package
        registry.packages[existingIndex] = pkg;
      } else {
        // Add new package
        registry.packages.push(pkg);
      }

      await fs.writeJSON(this.REGISTRY_FILE, registry, { spaces: 2 });
    } catch (error) {
      Logger.debug(`Error adding package ${pkg.name} to registry`, error);
      throw new Error(`Failed to add package ${pkg.name} to registry: ${(error as Error).message}`);
    }
  }

  /**
   * Remove a package from the registry
   */
  static async removePackage(packageName: string): Promise<void> {
    try {
      await this.init();
      const registry = await fs.readJSON(this.REGISTRY_FILE);

      registry.packages = registry.packages.filter((p: RegistryPackage) => p.name !== packageName);

      await fs.writeJSON(this.REGISTRY_FILE, registry, { spaces: 2 });
    } catch (error) {
      Logger.debug(`Error removing package ${packageName} from registry`, error);
      throw new Error(`Failed to remove package ${packageName} from registry: ${(error as Error).message}`);
    }
  }

  /**
   * Download a package from GitHub
   */
  static async downloadFromGitHub(repo: string, destination: string): Promise<AetherPackage> {
    const git = simpleGit();
    const tempDir = path.join(this.TEMP_DIR, `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

    try {
      Logger.info(`Cloning ${repo} to temporary directory...`);
      await fs.ensureDir(tempDir);

      // Clone the repository
      const repoUrl = repo.startsWith('http') ? repo : `https://github.com/${repo}.git`;
      await git.clone(repoUrl, tempDir);

      // Read package configuration
      const packageConfig = await FileSystem.readPackageConfig(tempDir);

      // Copy to destination
      await fs.emptyDir(destination);
      await fs.copy(tempDir, destination);

      // Clean up
      await fs.remove(tempDir);

      return packageConfig;
    } catch (error) {
      // Clean up on error
      try {
        await fs.remove(tempDir);
      } catch { /* ignore cleanup errors */ }

      Logger.debug(`Error downloading from GitHub: ${repo}`, error);
      throw new Error(`Failed to download from GitHub: ${(error as Error).message}`);
    }
  }

  /**
   * Parse a package specifier (name or GitHub URL)
   */
  static parsePackageSpecifier(specifier: string): { isGitHub: boolean; name: string; repo: string } {
    // GitHub URL or user/repo format
    if (specifier.includes('/')) {
      const isUrl = specifier.startsWith('http') || specifier.startsWith('git@');
      let repo = specifier;
      let name;

      if (isUrl) {
        // Extract repo name from URL
        const parts = specifier
          .replace(/\.git$/, '')
          .split('/')
          .filter(Boolean);
        name = parts[parts.length - 1];
      } else {
        // user/repo format
        name = specifier.split('/')[1];
      }

      return { isGitHub: true, name, repo };
    }

    // Just a package name, not a GitHub URL
    return { isGitHub: false, name: specifier, repo: '' };
  }
}
