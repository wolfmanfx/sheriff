/**
 * Serializable representation of a RegExp for API transport.
 */
export type SerializableRegExp = {
  kind: 'regex';
  pattern: string;
  flags: string;
};

export type EncapsulationPattern = string | SerializableRegExp;

export type SerializableIgnoreFileExtensions =
  | string[]
  | { kind: 'function'; source: string };

/**
 * Configuration options extracted from sheriff.config.ts.
 * These are the non-module, non-depRule settings.
 */
export type ManualConfigOptions = {
  version?: number;
  autoTagging?: boolean;
  excludeRoot?: boolean;
  barrelFileName?: string;
  enableBarrelLess?: boolean;
  encapsulationPattern?: EncapsulationPattern;
  log?: boolean;
  entryFile?: string;
  entryPoints?: Record<string, string>;
  ignoreFileExtensions?: SerializableIgnoreFileExtensions;
};
