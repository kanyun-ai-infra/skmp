/**
 * AuthManager - Handle authentication token management
 *
 * Manages tokens for registry authentication.
 * Tokens are stored in ~/.reskillrc or via RESKILL_TOKEN environment variable.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// Types
// ============================================================================

export interface RegistryAuth {
  token: string;
  email?: string;
  handle?: string;
}

export interface ReskillConfig {
  registries?: Record<string, RegistryAuth>;
}

// ============================================================================
// Constants
// ============================================================================

const CONFIG_FILE_NAME = '.reskillrc';

// ============================================================================
// AuthManager Class
// ============================================================================

export class AuthManager {
  private configPath: string;

  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    this.configPath = path.join(home, CONFIG_FILE_NAME);
  }

  /**
   * Get the default registry URL from environment variable
   *
   * Returns undefined if no registry is configured - there is no hardcoded default
   * to prevent accidental publishing to unintended registries.
   */
  getDefaultRegistry(): string | undefined {
    return process.env.RESKILL_REGISTRY;
  }

  /**
   * Get path to config file
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Get token for a registry
   *
   * Priority:
   * 1. RESKILL_TOKEN environment variable
   * 2. Token from ~/.reskillrc for the specified registry
   */
  getToken(registry?: string): string | undefined {
    // Check environment variable first
    const envToken = process.env.RESKILL_TOKEN;
    if (envToken) {
      return envToken;
    }

    // Read from config file
    const config = this.readConfig();
    if (!config?.registries) {
      return undefined;
    }

    const targetRegistry = registry || this.getDefaultRegistry();
    if (!targetRegistry) {
      return undefined;
    }
    const auth = config.registries[targetRegistry];
    return auth?.token;
  }

  /**
   * Check if token exists for a registry
   */
  hasToken(registry?: string): boolean {
    return this.getToken(registry) !== undefined;
  }

  /**
   * Get email for a registry
   */
  getEmail(registry?: string): string | undefined {
    const config = this.readConfig();
    if (!config?.registries) {
      return undefined;
    }

    const targetRegistry = registry || this.getDefaultRegistry();
    if (!targetRegistry) {
      return undefined;
    }
    const auth = config.registries[targetRegistry];
    return auth?.email;
  }

  /**
   * Get handle for a registry
   */
  getHandle(registry?: string): string | undefined {
    const config = this.readConfig();
    if (!config?.registries) {
      return undefined;
    }

    const targetRegistry = registry || this.getDefaultRegistry();
    if (!targetRegistry) {
      return undefined;
    }
    const auth = config.registries[targetRegistry];
    return auth?.handle;
  }

  /**
   * Set token for a registry
   *
   * Note: When no registry is specified and RESKILL_REGISTRY env var is not set,
   * this method will throw an error. The calling code should ensure a registry
   * is always provided (either explicitly or via environment variable).
   */
  setToken(token: string, registry?: string, email?: string, handle?: string): void {
    const config = this.readConfig() || {};
    const targetRegistry = registry || this.getDefaultRegistry();

    if (!targetRegistry) {
      throw new Error(
        'No registry specified. Set RESKILL_REGISTRY environment variable or provide registry explicitly.',
      );
    }

    if (!config.registries) {
      config.registries = {};
    }

    config.registries[targetRegistry] = {
      token,
      ...(email && { email }),
      ...(handle && { handle }),
    };

    this.writeConfig(config);
  }

  /**
   * Remove token for a registry
   */
  removeToken(registry?: string): void {
    const config = this.readConfig();
    if (!config?.registries) {
      return;
    }

    const targetRegistry = registry || this.getDefaultRegistry();
    if (!targetRegistry) {
      return;
    }
    delete config.registries[targetRegistry];

    this.writeConfig(config);
  }

  /**
   * Read config file
   */
  private readConfig(): ReskillConfig | null {
    try {
      if (!fs.existsSync(this.configPath)) {
        return null;
      }

      const content = fs.readFileSync(this.configPath, 'utf-8');
      if (!content.trim()) {
        return null;
      }

      return JSON.parse(content) as ReskillConfig;
    } catch {
      return null;
    }
  }

  /**
   * Write config file
   */
  private writeConfig(config: ReskillConfig): void {
    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(this.configPath, content, { mode: 0o600 });
  }
}

export default AuthManager;
