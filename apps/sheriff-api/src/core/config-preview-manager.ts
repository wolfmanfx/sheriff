import * as fs from 'fs';

/**
 * Manages temporary config file operations for preview.
 * Handles backup, write, and restore of config files during preview operations.
 */
export class ConfigPreviewManager {
  /**
   * Creates a new ConfigPreviewManager instance.
   *
   * @param configPath - The path to the config file to manage
   * @param backupPath - The path where the backup file will be stored
   */
  constructor(
    private readonly configPath: string,
    private readonly backupPath: string,
  ) {}

  /**
   * Backs up the existing config file if it exists.
   *
   * @returns An object containing the original config content and whether a config file existed
   */
  backup(): { originalConfig: string | null; configExists: boolean } {
    let originalConfig: string | null = null;
    let configExists = false;

    if (fs.existsSync(this.configPath)) {
      originalConfig = fs.readFileSync(this.configPath, { encoding: 'utf-8' });
      configExists = true;
      fs.writeFileSync(this.backupPath, originalConfig, { encoding: 'utf-8' });
    }

    return { originalConfig, configExists };
  }

  /**
   * Writes the preview config content to the config file.
   *
   * @param content - The config content to write
   */
  writePreview(content: string): void {
    fs.writeFileSync(this.configPath, content, { encoding: 'utf-8' });
  }

  /**
   * Restores the original config file or removes the temporary one.
   * Also cleans up the backup file.
   *
   * @param configExists - Whether a config file existed before backup
   * @param originalConfig - The original config content to restore, or null if no config existed
   */
  restore(configExists: boolean, originalConfig: string | null): void {
    try {
      if (configExists && originalConfig) {
        fs.writeFileSync(this.configPath, originalConfig, { encoding: 'utf-8' });
      } else if (!configExists && fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath);
      }
      if (fs.existsSync(this.backupPath)) {
        fs.unlinkSync(this.backupPath);
      }
    } catch (restoreError) {
      console.error('Failed to restore config:', restoreError);
    }
  }
}

