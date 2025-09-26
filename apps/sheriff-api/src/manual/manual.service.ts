import { resolveCwd, readConfig, writeConfig, applyConfigPreview } from '../core';
import { evaluateSheriffConfig, toSerializableDepRules, toSerializableModules } from '../core/config-evaluator';
import { previewWriteConfig } from '../core/config-operations';
import { optimizeModuleTags, generateManualSheriffConfig, materializeModulesByPathRel, applyModulesToTree } from './utils';
import {
  ManualConfigOptionsSchema,
  type InitRequestDto,
  type InitResponseDto,
  type PreviewRequestDto,
  type PreviewResponseDto,
  type GenerateRequestDto,
  type GenerateResponseDto,
  type SaveRequestDto,
  type SaveResponseDto,
  type PreviewContext,
  type SerializableDepRules,
  type ManualConfigOptions,
  type AddTagRequestDto,
  type RemoveTagRequestDto,
  type DeleteTagRequestDto,
  type ToggleDepRuleRequestDto,
  type MutationResponseDto,
  type TagsByPathRel,
} from './models';

const DEFAULT_ENTRY = 'src/main.ts';

/**
 * Service for manual sheriff configuration operations.
 *
 * Provides pure business logic for creating, previewing, and mutating
 * sheriff configurations without HTTP concerns. This service handles:
 *
 * - **Initialization**: Loading existing configs or creating defaults
 * - **Preview**: Evaluating draft configs and building file tree previews
 * - **Generation**: Creating config content from modules and dependency rules
 * - **Mutations**: Adding/removing tags, toggling dependency rules
 * - **Persistence**: Validating and saving configs to disk
 *
 * @example
 * ```typescript
 * const service = new ManualService();
 * const init = service.init({ cwd: '/path/to/project' });
 * const preview = service.preview({ draft: init.draft, entry: 'src/main.ts', cwd: init.cwd });
 * ```
 */
export class ManualService {
  /**
   * Extracts static tags from serializable dependency rules.
   * Converts raw dep rules (which may include functions) to a simple tag mapping.
   */
  private static deriveStaticDepRules(raw: SerializableDepRules | null | undefined): Record<string, string[]> {
    if (!raw) return {};
    const result: Record<string, string[]> = {};
    for (const [from, rule] of Object.entries(raw)) {
      result[from] = rule.kind === 'static' || rule.kind === 'mixed' ? rule.tags : [];
    }
    return result;
  }

  /**
   * Initializes the manual flow by loading the current config.
   * @param input - Request containing working directory and optional entry file
   * @returns Init response with config content, draft, and optional preview
   */
  init(input: InitRequestDto): InitResponseDto {
    const cwd = resolveCwd(input.cwd);
    const entry = input.entry?.trim() || DEFAULT_ENTRY;

    let missingConfig = false;
    let activeConfigContent = '';
    try {
      activeConfigContent = readConfig(cwd).content ?? '';
    } catch {
      missingConfig = true;
    }

    const draft = activeConfigContent;
    const preview = draft.trim() ? this.buildPreviewContext({ draft, entry, cwd }) : undefined;

    return { cwd, entry, missingConfig, activeConfigContent, draft, preview };
  }

  /**
   * Creates a default sheriff.config.ts on disk, then returns init payload.
   * @param input - Request containing working directory and optional entry file
   * @returns Init response with newly created config and preview
   */
  initDefault(input: InitRequestDto): InitResponseDto {
    const cwd = resolveCwd(input.cwd);
    const entry = input.entry?.trim() || DEFAULT_ENTRY;

    const defaultConfig = `import { SheriffConfig } from '@softarc/sheriff-core';\n\nexport const config: SheriffConfig = {\n  enableBarrelLess: true,\n  modules: {},\n  depRules: {\n    'root': 'noTag',\n    'noTag': 'noTag',\n  },\n  ${entry ? `entryFile: '${entry}',` : ''}\n};\n`;

    writeConfig(cwd, defaultConfig);

    const draft = readConfig(cwd).content ?? '';
    const preview = this.buildPreviewContext({ draft, entry, cwd });

    return { cwd, entry, missingConfig: false, activeConfigContent: draft, draft, preview };
  }

  /**
   * Generates a preview from the given draft configuration.
   * @param input - Request with draft content, entry file, and working directory
   * @returns Preview context with file tree, modules, and dependency rules
   */
  preview(input: PreviewRequestDto): PreviewResponseDto {
    const cwd = resolveCwd(input.cwd);
    return this.buildPreviewContext({ draft: input.draft, entry: input.entry, cwd });
  }

  /**
   * Generates a new draft configuration from modules and dependency rules.
   * @param input - Request with modules, dep rules, options, and base draft
   * @returns Generated draft configuration content
   */
  generate(input: GenerateRequestDto): GenerateResponseDto {
    const optimizedModules = optimizeModuleTags(input.desiredModulesByPathRel, input.inferredModulesByPathRel);
    const depRules = input.depRules ?? ManualService.deriveStaticDepRules(input.depRulesRaw);

    const draft = generateManualSheriffConfig({
      options: input.options,
      originalModulesConfig: input.originalModulesConfig,
      modulesByPathRel: optimizedModules,
      depRules,
      depRulesRaw: input.depRulesRaw ?? null,
      originalConfig: input.baseDraft,
    });

    return { draft };
  }

  /**
   * Validates and saves the draft configuration to disk.
   * @param input - Request with draft content and working directory
   * @returns Save result with success status and optional checksum or errors
   */
  save(input: SaveRequestDto): SaveResponseDto {
    const cwd = resolveCwd(input.cwd);

    const validation = previewWriteConfig(input.draft, cwd);
    if (!validation.valid) {
      return { ok: false, errors: validation.errors ?? ['Validation failed'] };
    }

    const { checksum } = writeConfig(cwd, input.draft);
    return { ok: true, checksum };
  }

  /**
   * Adds a tag to a module at the specified path.
   * @param input - Request with path, tag to add, draft, entry, and cwd
   * @returns Updated draft and preview after mutation
   */
  addTag(input: AddTagRequestDto): MutationResponseDto {
    const cwd = resolveCwd(input.cwd);
    const { draft, entry, pathRel, tag } = input;

    const preview = this.buildPreviewContext({ draft, entry, cwd });
    const currentModules = this.mergeModules(preview.explicitModulesConfig, preview.inferredModulesByPathRel);

    const currentTags = currentModules[pathRel] ?? [];
    const filteredTags = currentTags.filter((t) => t !== 'noTag');
    const newTags = [...new Set([...filteredTags, tag])];

    return this.regenerateFromMutation({
      cwd,
      entry,
      originalDraft: draft,
      options: preview.options,
      originalModulesConfig: preview.originalModulesConfig,
      modulesByPathRel: { ...currentModules, [pathRel]: newTags },
      inferredModulesByPathRel: preview.inferredModulesByPathRel,
      depRulesRaw: preview.depRulesRaw,
    });
  }

  /**
   * Removes a tag from a module at the specified path.
   * @param input - Request with path, tag to remove, draft, entry, and cwd
   * @returns Updated draft and preview after mutation
   */
  removeTag(input: RemoveTagRequestDto): MutationResponseDto {
    const cwd = resolveCwd(input.cwd);
    const { draft, entry, pathRel, tag } = input;

    const preview = this.buildPreviewContext({ draft, entry, cwd });
    const currentModules = this.mergeModules(preview.explicitModulesConfig, preview.inferredModulesByPathRel);

    const currentTags = currentModules[pathRel] ?? [];
    const newTags = currentTags.filter((t) => t !== tag);

    return this.regenerateFromMutation({
      cwd,
      entry,
      originalDraft: draft,
      options: preview.options,
      originalModulesConfig: preview.originalModulesConfig,
      modulesByPathRel: { ...currentModules, [pathRel]: newTags },
      inferredModulesByPathRel: preview.inferredModulesByPathRel,
      depRulesRaw: preview.depRulesRaw,
    });
  }

  /**
   * Deletes a tag from all modules and dependency rules globally.
   * @param input - Request with tag to delete, draft, entry, and cwd
   * @returns Updated draft and preview with tag removed everywhere
   */
  deleteTagEverywhere(input: DeleteTagRequestDto): MutationResponseDto {
    const cwd = resolveCwd(input.cwd);
    const { draft, entry, tag } = input;

    const preview = this.buildPreviewContext({ draft, entry, cwd });
    const currentModules = this.mergeModules(preview.explicitModulesConfig, preview.inferredModulesByPathRel);

    const updatedModules: TagsByPathRel = {};
    for (const [p, tags] of Object.entries(currentModules)) {
      updatedModules[p] = tags.filter((t) => t !== tag);
    }

    return this.regenerateFromMutation({
      cwd,
      entry,
      originalDraft: draft,
      options: preview.options,
      originalModulesConfig: preview.originalModulesConfig,
      modulesByPathRel: updatedModules,
      inferredModulesByPathRel: preview.inferredModulesByPathRel,
      depRulesRaw: this.removeTagFromDepRules(preview.depRulesRaw, tag),
    });
  }

  /**
   * Toggles a dependency rule between two tags (adds if missing, removes if present).
   * @param input - Request with source tag, target tag, draft, entry, and cwd
   * @returns Updated draft and preview with toggled dependency rule
   */
  toggleDepRule(input: ToggleDepRuleRequestDto): MutationResponseDto {
    const cwd = resolveCwd(input.cwd);
    const { draft, entry, from, to } = input;

    const preview = this.buildPreviewContext({ draft, entry, cwd });

    return this.regenerateFromMutation({
      cwd,
      entry,
      originalDraft: draft,
      options: preview.options,
      originalModulesConfig: preview.originalModulesConfig,
      modulesByPathRel: this.mergeModules(preview.explicitModulesConfig, preview.inferredModulesByPathRel),
      inferredModulesByPathRel: preview.inferredModulesByPathRel,
      depRulesRaw: this.toggleDepRuleInRaw(preview.depRulesRaw, from, to),
    });
  }

  /**
   * Builds a PreviewContext by evaluating a draft configuration.
   * Extracts modules, dependency rules, and config options from the draft.
   * @param options - Draft content, entry file path, and working directory
   * @returns Complete preview context with tree, modules, and dep rules
   */
  private buildPreviewContext(options: { draft: string; entry: string; cwd: string }): PreviewContext {
    const { draft, entry, cwd } = options;
    const previewRes = applyConfigPreview(draft, entry, cwd);

    let depRulesRaw: SerializableDepRules | undefined;
    let configOptions: ManualConfigOptions | undefined;
    let originalModulesConfig: Record<string, string[]> = {};
    let explicitModulesConfig: Record<string, string[]> = {};

    try {
      const evaluated = evaluateSheriffConfig(draft);
      depRulesRaw = toSerializableDepRules(evaluated);
      const parsed = ManualConfigOptionsSchema.safeParse(evaluated);
      configOptions = parsed.success && Object.values(parsed.data).some((v) => v !== undefined) ? parsed.data : undefined;

      const modulesFromConfig = toSerializableModules(evaluated);
      if (modulesFromConfig) {
        originalModulesConfig = modulesFromConfig.patterns;
        explicitModulesConfig = modulesFromConfig.explicit;
      }
    } catch {
      depRulesRaw = undefined;
      configOptions = undefined;
    }

    const materializedModules = materializeModulesByPathRel(previewRes.tree);
    // Remove entries that exist in explicitModulesConfig — those tags came from the
    // config itself (written temporarily to disk for analysis), not from the file
    // structure. Keeping them would cause optimizeModuleTags to treat user-set tags
    // as "already inferred" and strip them from subsequent mutations.
    const inferredModulesByPathRel: TagsByPathRel = {};
    for (const [path, tags] of Object.entries(materializedModules)) {
      if (!(path in explicitModulesConfig)) {
        inferredModulesByPathRel[path] = tags;
      }
    }
    const mergedModules = this.mergeModules(explicitModulesConfig, inferredModulesByPathRel);
    applyModulesToTree(previewRes.tree, mergedModules);

    return {
      ...previewRes,
      depRulesRaw,
      options: configOptions,
      inferredModulesByPathRel,
      originalModulesConfig,
      explicitModulesConfig,
    };
  }

  /** Merges explicit and inferred modules, with explicit taking precedence. */
  private mergeModules(explicit: TagsByPathRel, inferred: TagsByPathRel): TagsByPathRel {
    return { ...inferred, ...explicit };
  }

  /**
   * Removes a tag from all dependency rules (both as source and target).
   * @param raw - Current serializable dep rules
   * @param tag - Tag to remove
   * @returns Updated dep rules with tag removed
   */
  private removeTagFromDepRules(raw: SerializableDepRules | undefined, tag: string): SerializableDepRules | undefined {
    if (!raw) return undefined;

    const updated: SerializableDepRules = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k === tag) continue; // Skip entries where tag is the source

      if (v.kind === 'static') {
        updated[k] = { kind: 'static', tags: v.tags.filter((t) => t !== tag) };
      } else if (v.kind === 'mixed') {
        updated[k] = { kind: 'mixed', tags: v.tags.filter((t) => t !== tag), functions: v.functions };
      } else {
        updated[k] = v; // function/unknown kinds have no static tags
      }
    }
    return updated;
  }

  /**
   * Toggles a dependency rule between two tags.
   * If the rule exists, removes it; if it doesn't, adds it.
   * Preserves function rules when converting to mixed.
   * @param raw - Current serializable dep rules
   * @param from - Source tag
   * @param to - Target tag to toggle
   * @returns Updated dep rules with toggled rule
   */
  private toggleDepRuleInRaw(raw: SerializableDepRules | undefined, from: string, to: string): SerializableDepRules {
    const result: SerializableDepRules = { ...(raw ?? {}) };
    const existing = result[from];

    const currentTags = existing && (existing.kind === 'static' || existing.kind === 'mixed') ? existing.tags : [];
    const tagSet = new Set(currentTags);

    if (tagSet.has(to)) {
      tagSet.delete(to);
    } else {
      tagSet.add(to);
    }

    const updatedTags = [...tagSet];
    if (existing?.kind === 'mixed') {
      result[from] = { kind: 'mixed', tags: updatedTags, functions: existing.functions };
    } else if (existing?.kind === 'function') {
      result[from] = { kind: 'mixed', tags: updatedTags, functions: [existing.source] };
    } else {
      result[from] = { kind: 'static', tags: updatedTags };
    }

    return result;
  }

  /**
   * Regenerates draft and preview after a mutation.
   * Optimizes modules by removing tags that match inferred values.
   */
  private regenerateFromMutation(args: {
    cwd: string;
    entry: string;
    originalDraft: string;
    options: ManualConfigOptions | undefined;
    originalModulesConfig: TagsByPathRel;
    modulesByPathRel: TagsByPathRel;
    inferredModulesByPathRel: TagsByPathRel;
    depRulesRaw: SerializableDepRules | undefined;
  }): MutationResponseDto {
    const { cwd, entry, originalDraft, options, originalModulesConfig, modulesByPathRel, inferredModulesByPathRel, depRulesRaw } = args;

    const optimizedModules = optimizeModuleTags(modulesByPathRel, inferredModulesByPathRel);
    const depRules = ManualService.deriveStaticDepRules(depRulesRaw);

    const newDraft = generateManualSheriffConfig({
      options,
      originalModulesConfig,
      modulesByPathRel: optimizedModules,
      depRules,
      depRulesRaw: depRulesRaw ?? null,
      originalConfig: originalDraft,
    });

    const preview = this.buildPreviewContext({ draft: newDraft, entry, cwd });
    return { draft: newDraft, preview };
  }
}
