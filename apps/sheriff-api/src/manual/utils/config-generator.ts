import type {
  ManualConfigOptions,
  SerializableDepRule,
  SerializableDepRules,
  SerializableRegExp,
  TagsByPathRel,
} from '../models';

// ---- Tag Normalization ----

const PLACEHOLDER_TAGS = new Set(['noTag', 'root']);

export interface NormalizeTagsOptions {
  /**
   * When true, removes placeholder tags (noTag, root) if real tags exist.
   * Falls back to keeping placeholders if no real tags remain.
   */
  removePlaceholders?: boolean;
}

/**
 * Normalizes tags by trimming, deduplicating, and sorting alphabetically.
 * Optionally removes placeholder tags if real tags exist.
 */
export function normalizeTags(
  tags: readonly string[],
  options: NormalizeTagsOptions = {},
): string[] {
  const { removePlaceholders = false } = options;

  const cleaned = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];

  if (removePlaceholders) {
    const realTags = cleaned.filter((t) => !PLACEHOLDER_TAGS.has(t));
    return (realTags.length > 0 ? realTags : cleaned).sort((a, b) => a.localeCompare(b));
  }

  return cleaned.sort((a, b) => a.localeCompare(b));
}

// ---- Module Tag Optimizer ----

/**
 * Checks if two tag arrays are equivalent after normalization.
 */
function tagsMatch(a: readonly string[], b: readonly string[]): boolean {
  const normA = normalizeTags(a, { removePlaceholders: true });
  const normB = normalizeTags(b, { removePlaceholders: true });
  return normA.length === normB.length && normA.every((tag, i) => tag === normB[i]);
}

/**
 * Optimizes module tags by removing entries that match their inferred values.
 * Returns only modules that differ from inference (need explicit config).
 */
export function optimizeModuleTags(
  desiredModulesByPathRel: Record<string, string[]>,
  inferredModulesByPathRel: Record<string, string[]>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const [path, desiredTags] of Object.entries(desiredModulesByPathRel)) {
    const inferredTags = inferredModulesByPathRel[path] ?? [];
    if (!tagsMatch(desiredTags, inferredTags)) {
      result[path] = normalizeTags(desiredTags, { removePlaceholders: true });
    }
  }

  return result;
}

// ---- Standard Sheriff Helpers ----
// Note: noDependencies is just an empty array [], not an import
// noTag is a string tag, not an import

const SHERIFF_HELPERS = ['sameTag', 'anyTag'] as const;
type SheriffHelper = (typeof SHERIFF_HELPERS)[number];

// ---- Type Guards ----

function isSerializableRegExp(v: unknown): v is SerializableRegExp {
  return typeof v === 'object' && v !== null && (v as SerializableRegExp).kind === 'regex';
}

function isSerializableFunction(v: unknown): v is { kind: 'function'; source: string } {
  return typeof v === 'object' && v !== null && (v as { kind: string }).kind === 'function';
}

// ---- TypeScript Code Serializer ----

function quote(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function toTsCode(value: unknown, indent = 0): string {
  if (value === undefined || value === null) return String(value);
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return quote(value);
  if (isSerializableRegExp(value)) return `/${value.pattern}/${value.flags}`;
  if (isSerializableFunction(value)) return normalizeFunction(value.source);
  if (Array.isArray(value)) return `[${value.map((v) => toTsCode(v)).join(', ')}]`;
  if (typeof value === 'object') return objectToTsCode(value as Record<string, unknown>, indent);
  return String(value);
}

function objectToTsCode(obj: Record<string, unknown>, indent: number): string {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '{}';

  const pad = '  '.repeat(indent + 2);
  const closePad = '  '.repeat(indent + 1);
  const lines = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${pad}${quote(k)}: ${toTsCode(v, indent + 1)},`);

  return `{\n${lines.join('\n')}\n${closePad}}`;
}

// ---- Function Normalization ----

function normalizeFunction(source: string): string {
  // Normalize common patterns to standard helpers
  if (source === 'sameTag' || source.includes('from === to') || source.includes('from==to')) return 'sameTag';
  if (source === 'noDependencies' || source.includes('=> false') || source === '() => false') return 'noDependencies';
  if (source === 'noTag') return 'noTag';
  return source;
}

function isSheriffHelper(name: string): name is SheriffHelper {
  return SHERIFF_HELPERS.includes(name as SheriffHelper);
}


// ---- Dep Rule Formatting ----

interface FormattedDepRule {
  code: string;
  usedHelpers: Set<SheriffHelper>;
}

function formatDepRule(tags: string[], raw?: SerializableDepRule): FormattedDepRule {
  const normalized = normalizeTags(tags);
  const usedHelpers = new Set<SheriffHelper>();

  // Pure function rule
  if (raw?.kind === 'function') {
    const fn = normalizeFunction(raw.source);
    if (isSheriffHelper(fn)) usedHelpers.add(fn);
    return { code: fn, usedHelpers };
  }

  // Mixed rule: functions + tags
  if (raw?.kind === 'mixed' && raw.functions.length > 0) {
    const parts: string[] = [];

    // Add function references (unquoted)
    for (const f of raw.functions) {
      const fn = normalizeFunction(f);
      if (isSheriffHelper(fn)) usedHelpers.add(fn);
      parts.push(fn);
    }

    // Add tag strings (quoted)
    parts.push(...normalized.map(quote));

    return { code: `[${parts.join(', ')}]`, usedHelpers };
  }

  // Pure static tags
  return { code: toTsCode(normalized), usedHelpers };
}

// ---- Config Section Builders ----

function buildModules(original: TagsByPathRel = {}, concrete: TagsByPathRel): Record<string, string[]> {
  const merged = { ...original, ...concrete };
  const result: Record<string, string[]> = {};

  for (const [path, tags] of Object.entries(merged)) {
    if (path.trim() && tags.length > 0) {
      result[path] = normalizeTags(tags);
    }
  }
  return result;
}

interface DepRulesResult {
  lines: string[];
  usedHelpers: Set<SheriffHelper>;
}

function buildDepRules(rules: Record<string, string[]>, raw: SerializableDepRules = {}): DepRulesResult {
  const usedHelpers = new Set<SheriffHelper>();

  // Merge keys from both sources - important because function-only rules
  // (like sameTag) won't appear in the static `rules` but exist in `raw`
  const allKeys = new Set([...Object.keys(rules), ...Object.keys(raw)]);
  const sortedKeys = Array.from(allKeys)
    .filter((k) => k.trim())
    .sort((a, b) => a.localeCompare(b));

  if (sortedKeys.length === 0) {
    return {
      lines: ["    'root': 'noTag',", "    'noTag': 'noTag',"],
      usedHelpers,
    };
  }

  const lines = sortedKeys.map((from) => {
    const tos = rules[from] ?? []; // Empty for function-only rules
    const formatted = formatDepRule(tos, raw[from]);
    formatted.usedHelpers.forEach((h) => usedHelpers.add(h));
    return `    ${quote(from)}: ${formatted.code},`;
  });

  return { lines, usedHelpers };
}

function buildOptions(opts?: ManualConfigOptions): string[] {
  if (!opts) return [];

  const lines: string[] = [];

  // Simple options (sorted alphabetically)
  const simpleKeys = ['autoTagging', 'barrelFileName', 'enableBarrelLess', 'entryFile', 'excludeRoot', 'log', 'version'] as const;
  for (const key of simpleKeys) {
    const value = opts[key];
    if (value !== undefined) {
      lines.push(`  ${key}: ${toTsCode(value)},`);
    }
  }

  // Complex options
  if (opts.encapsulationPattern !== undefined) {
    lines.push(`  encapsulationPattern: ${toTsCode(opts.encapsulationPattern)},`);
  }
  if (opts.entryPoints !== undefined) {
    lines.push(`  entryPoints: ${toTsCode(opts.entryPoints)},`);
  }
  if (opts.ignoreFileExtensions !== undefined) {
    lines.push(`  ignoreFileExtensions: ${toTsCode(opts.ignoreFileExtensions)},`);
  }

  return lines.sort();
}

// ---- Import Generation ----

function buildImports(usedHelpers: Set<SheriffHelper>, originalConfig?: string): string {
  // Start with helpers we detected from the generated config
  const helpers = new Set(usedHelpers);

  // If we have the original config, preserve any existing helper imports
  if (originalConfig) {
    const importMatch = originalConfig.match(/import\s*\{([^}]+)\}\s*from\s*['"]@softarc\/sheriff-core['"]/);
    if (importMatch) {
      const imported = importMatch[1].split(',').map((s) => s.trim());
      for (const name of imported) {
        if (isSheriffHelper(name)) {
          helpers.add(name);
        }
      }
    }
  }

  // Build import statement
  const importList = ['SheriffConfig', ...Array.from(helpers).sort()];
  return `import { ${importList.join(', ')} } from '@softarc/sheriff-core';`;
}

// ---- Main Generator ----

export interface GenerateConfigInput {
  options?: ManualConfigOptions;
  originalModulesConfig?: TagsByPathRel;
  modulesByPathRel: TagsByPathRel;
  depRules: Record<string, string[]>;
  depRulesRaw?: SerializableDepRules | null;
  /** Original config content - used to preserve imports and detect patterns */
  originalConfig?: string;
}

export function generateManualSheriffConfig(input: GenerateConfigInput): string {
  const { options, originalModulesConfig, modulesByPathRel, depRules, depRulesRaw, originalConfig } = input;

  // Build sections and collect used helpers
  const depRulesResult = buildDepRules(depRules, depRulesRaw ?? undefined);

  const imports = buildImports(depRulesResult.usedHelpers, originalConfig);

  const modules = buildModules(originalModulesConfig, modulesByPathRel);
  const modulesLines =
    Object.keys(modules).length > 0
      ? Object.entries(modules)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([p, tags]) => `    ${quote(p)}: ${toTsCode(tags)},`)
      : ['    // add module tags via the UI'];

  return [
    imports,
    '',
    'export const sheriffConfig: SheriffConfig = {',
    ...buildOptions(options),
    '  modules: {',
    ...modulesLines,
    '  },',
    '  depRules: {',
    ...depRulesResult.lines,
    '  },',
    '};',
    '',
  ].join('\n');
}
