import vm from 'vm';
import * as sheriffCore from '@softarc/sheriff-core';

type SerializableDepRule =
  | { kind: 'static'; tags: string[] }
  | { kind: 'function'; source: string }
  | { kind: 'mixed'; tags: string[]; functions: string[] }
  | { kind: 'unknown'; type: string };

export type SerializableDepRules = Record<string, SerializableDepRule>;

// Map of known function references (for same-context comparison)
// Note: noDependencies is an empty array [], not a function
const knownFunctions = new Map<unknown, string>([
  [sheriffCore.sameTag, 'sameTag'],
  [sheriffCore.anyTag, 'anyTag'],
]);

// Map of function signatures to names (for cross-VM-context comparison)
const knownFunctionSignatures = new Map<string, string>([
  [sheriffCore.sameTag.toString(), 'sameTag'],
  [sheriffCore.anyTag.toString(), 'anyTag'],
]);

function getFunctionName(fn: unknown): string {
  // Try reference equality first (same context)
  const knownName = knownFunctions.get(fn);
  if (knownName) return knownName;

  if (typeof fn === 'function') {
    const fnString = fn.toString();

    // Try matching by signature (cross VM context)
    const signatureName = knownFunctionSignatures.get(fnString);
    if (signatureName) return signatureName;

    // For unknown functions, return full source so it can be regenerated
    return fnString;
  }
  return String(fn);
}

/**
 * Checks if value is a RegExp from any VM context.
 * Note: `instanceof RegExp` fails across VM boundaries.
 */
function isRegExp(val: unknown): val is RegExp {
  return typeof val === 'object' && val !== null &&
         Object.prototype.toString.call(val) === '[object RegExp]';
}

/**
 * Serializes VM objects (RegExp, functions) to JSON-safe values.
 * This ensures the returned config can be safely passed around without VM context issues.
 * Uses getFunctionName to recognize known functions like sameTag, noDependencies.
 */
function serializeVMValue(val: unknown): unknown {
  if (isRegExp(val)) {
    return { kind: 'regex', pattern: val.source, flags: val.flags };
  }
  if (typeof val === 'function') {
    return { kind: 'function', source: getFunctionName(val) };
  }
  if (Array.isArray(val)) {
    return val.map(serializeVMValue);
  }
  if (typeof val === 'object' && val !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = serializeVMValue(v);
    }
    return out;
  }
  return val;
}

export function evaluateSheriffConfig(content: string): unknown {
  if (!content.trim()) {
    throw new Error('Config content cannot be empty');
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ts = require('typescript');

  const { outputText } = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const processedCode = outputText.replace(
    /require\(['"]@softarc\/sheriff-core['"]\)/g,
    '__sheriffCore',
  );

  const moduleScope: { exports: Record<string, unknown> } = { exports: {} };
  const sandbox = vm.createContext({
    module: moduleScope,
    exports: moduleScope.exports,
    __sheriffCore: sheriffCore,
    console,
    process,
    Buffer,
  });

  vm.runInContext(processedCode, sandbox, { filename: 'sheriff.config.ts' });

  const exported = moduleScope.exports ?? {};
  const config = (exported as Record<string, unknown>).config ??
    (exported as Record<string, unknown>).sheriffConfig ??
    (exported as Record<string, unknown>).default ??
    exported;

  // Serialize VM objects to JSON-safe values
  return serializeVMValue(config);
}

/**
 * Checks if a value is an already-serialized function object.
 * After serializeVMValue, functions become { kind: 'function', source: '...' }
 */
function isSerializedFunction(val: unknown): val is { kind: 'function'; source: string } {
  return (
    typeof val === 'object' &&
    val !== null &&
    (val as { kind?: string }).kind === 'function' &&
    typeof (val as { source?: string }).source === 'string'
  );
}

export type SerializableModules = {
  patterns: Record<string, string[]>;  // entries with <placeholders>
  explicit: Record<string, string[]>;  // concrete entries
};

/**
 * Extracts modules from evaluated config, separating patterns (with <placeholders>)
 * from explicit (concrete) entries.
 */
export function toSerializableModules(config: unknown): SerializableModules | undefined {
  if (typeof config !== 'object' || config === null) return undefined;
  if (!('modules' in config)) return undefined;

  const modules = (config as { modules?: unknown }).modules;
  if (typeof modules !== 'object' || modules === null || Array.isArray(modules)) {
    return undefined;
  }

  const patterns: Record<string, string[]> = {};
  const explicit: Record<string, string[]> = {};

  for (const [path, tags] of Object.entries(modules as Record<string, unknown>)) {
    if (!Array.isArray(tags)) continue;
    const tagList = tags.filter((t): t is string => typeof t === 'string');

    if (path.includes('<') && path.includes('>')) {
      patterns[path] = tagList;
    } else {
      explicit[path] = tagList;
    }
  }

  return { patterns, explicit };
}

export function toSerializableDepRules(config: unknown): SerializableDepRules | undefined {
  if (typeof config !== 'object' || config === null) return undefined;
  if (!('depRules' in config)) return undefined;

  const depRules = (config as { depRules?: unknown }).depRules;
  if (typeof depRules !== 'object' || depRules === null || Array.isArray(depRules)) {
    return undefined;
  }

  const out: SerializableDepRules = {};
  for (const [fromTag, raw] of Object.entries(depRules as Record<string, unknown>)) {
    // Handle string values (single tag)
    if (typeof raw === 'string') {
      out[fromTag] = { kind: 'static', tags: [raw] };
      continue;
    }

    // Handle raw functions (from VM context before serialization)
    if (typeof raw === 'function') {
      out[fromTag] = { kind: 'function', source: getFunctionName(raw) };
      continue;
    }

    // Handle already-serialized function objects (after serializeVMValue)
    if (isSerializedFunction(raw)) {
      out[fromTag] = { kind: 'function', source: raw.source };
      continue;
    }

    // Handle arrays (may contain strings, functions, or serialized functions)
    if (Array.isArray(raw)) {
      const tags: string[] = [];
      const functions: string[] = [];
      for (const v of raw) {
        if (typeof v === 'string') {
          tags.push(v);
        } else if (typeof v === 'function') {
          functions.push(getFunctionName(v));
        } else if (isSerializedFunction(v)) {
          functions.push(v.source);
        }
      }
      if (functions.length > 0 && tags.length > 0) {
        out[fromTag] = { kind: 'mixed', tags, functions };
      } else if (functions.length > 0) {
        out[fromTag] = { kind: 'mixed', tags: [], functions };
      } else {
        out[fromTag] = { kind: 'static', tags };
      }
      continue;
    }

    out[fromTag] = { kind: 'unknown', type: typeof raw };
  }

  return out;
}


