import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signalStore, withComputed, withMethods, withState, patchState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import type { AnalyzeMergeResponse } from '../../api/model/analyze-merge-response';
import type { FolderNode } from '../../module-renderer/+state/models/folder-node';
import { toFolderTreeFromMergedTree } from '../../shared/to-folder-tree-from-merged-tree';
import type { SerializableDepRules } from './models/dep-rules';
import type { TagsByPathRel } from './models/tag-types';
import type { ManualConfigOptions } from './models/config-options';
import type { NodeIndex } from './models/node-index';
import type { PreviewContext, InitResponse, MutationResponse } from './models/api-responses';
import { buildIdIndex } from './utils/tree-utils';
import { collectTags } from './utils/dep-rules-utils';
import { EnvironmentService } from '../../core/environment.service';

export type ManualTab = 'builder' | 'graph' | 'code';
export type TagTarget = 'selected' | 'module' | string;

export const ManualStore = signalStore(
  { providedIn: 'root' },

  withState({
    cwd: '',
    entry: 'src/main.ts',
    missingConfig: false,
    activeConfigContent: '',
    draft: '',
    draftDirty: false,

    preview: null as AnalyzeMergeResponse | null,
    previewValid: false,
    previewErrors: [] as string[],
    options: null as ManualConfigOptions | null,
    depRulesRaw: null as SerializableDepRules | null,
    inferredModulesByPathRel: {} as TagsByPathRel,
    originalModulesConfig: {} as TagsByPathRel,

    loading: false,
    validating: false,
    saving: false,
    errors: [] as string[],

    tab: 'builder' as ManualTab,
    selectedId: null as string | null,
    selectedFromTag: null as string | null,
    draggingTag: null as string | null,
  }),

  withComputed((store) => {
    const previewTree = computed((): FolderNode | null => {
      const p = store.preview();
      if (!p) return null;
      return toFolderTreeFromMergedTree(p);
    });

    const graphTree = computed(() => previewTree());

    const index = computed((): NodeIndex => buildIdIndex(graphTree()));

    const allTags = computed(() => collectTags(graphTree(), store.depRulesRaw()));

    const selectedNode = computed((): FolderNode | null => {
      const id = store.selectedId();
      const idx = index();
      return id ? idx.byId.get(id) ?? null : null;
    });

    const selectedModule = computed((): FolderNode | null => {
      const id = store.selectedId();
      if (!id) return null;
      const { byId, parentById } = index();
      let cur: string | null = id;
      while (cur) {
        const node = byId.get(cur);
        if (node?.isSheriffModule) return node;
        cur = parentById.get(cur) ?? null;
      }
      return null;
    });

    return { previewTree, graphTree, index, allTags, selectedNode, selectedModule };
  }),

  withMethods((store, http = inject(HttpClient), env = inject(EnvironmentService)) => {
    if (env.initialCwd && store.cwd() !== env.initialCwd) {
      patchState(store, { cwd: env.initialCwd });
    }
    if (env.initialEntry && store.entry() !== env.initialEntry) {
      patchState(store, { entry: env.initialEntry });
    }

    const applyPreviewToState = (preview: PreviewContext, draft: string): void => {
      const previewAsMerged: AnalyzeMergeResponse = {
        cwd: preview.cwd,
        tree: preview.tree,
        analysis: preview.analysis,
        fileIdByPathRel: preview.fileIdByPathRel,
      };

      patchState(store, {
        draft,
        draftDirty: false,
        preview: previewAsMerged,
        previewValid: preview.configValid,
        previewErrors: preview.errors ?? [],
        options: preview.options ?? null,
        depRulesRaw: preview.depRulesRaw ?? null,
        inferredModulesByPathRel: preview.inferredModulesByPathRel,
        originalModulesConfig: preview.originalModulesConfig ?? {},
        loading: false,
        validating: false,
        errors: [],
      });
    };

    const resolvePathRel = (target: TagTarget): string | null => {
      if (target === 'selected') return store.selectedNode()?.pathRel ?? null;
      if (target === 'module') return store.selectedModule()?.pathRel ?? null;
      return store.index().byId.get(target)?.pathRel ?? null;
    };

    const buildMutationBody = <T extends Record<string, unknown>>(extra: T) => ({
      draft: store.draft(),
      entry: store.entry(),
      cwd: store.cwd() || undefined,
      ...extra,
    });

    return {
      async init(): Promise<void> {
        patchState(store, { loading: true, errors: [] });
        try {
          const body: { cwd?: string; entry?: string } = {};
          if (store.cwd()) body.cwd = store.cwd();
          if (store.entry()) body.entry = store.entry();

          const res = await firstValueFrom(http.post<InitResponse>('/api/manual/init', body));

          patchState(store, {
            cwd: res.cwd,
            entry: res.entry,
            missingConfig: res.missingConfig,
            activeConfigContent: res.activeConfigContent,
          });

          if (res.preview) {
            applyPreviewToState(res.preview, res.draft);
          } else {
            patchState(store, {
              draft: res.draft,
              draftDirty: false,
              preview: null,
              previewValid: false,
              previewErrors: [],
              loading: false,
            });
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Init failed';
          patchState(store, { loading: false, errors: [msg] });
        }
      },

      async initDefault(): Promise<void> {
        patchState(store, { loading: true, errors: [] });
        try {
          const body: { cwd?: string; entry?: string } = {};
          if (store.cwd()) body.cwd = store.cwd();
          if (store.entry()) body.entry = store.entry();

          const res = await firstValueFrom(http.post<InitResponse>('/api/manual/init-default', body));

          patchState(store, {
            cwd: res.cwd,
            entry: res.entry,
            missingConfig: res.missingConfig,
            activeConfigContent: res.activeConfigContent,
          });

          if (res.preview) {
            applyPreviewToState(res.preview, res.draft);
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Init default failed';
          patchState(store, { loading: false, errors: [msg] });
        }
      },

      async addTag(pathRel: string, tag: string): Promise<void> {
        patchState(store, { loading: true, errors: [] });
        try {
          const res = await firstValueFrom(
            http.post<MutationResponse>('/api/manual/add-tag', buildMutationBody({ pathRel, tag })),
          );
          applyPreviewToState(res.preview, res.draft);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Add tag failed';
          patchState(store, { loading: false, errors: [msg] });
        }
      },

      async removeTag(pathRel: string, tag: string): Promise<void> {
        patchState(store, { loading: true, errors: [] });
        try {
          const res = await firstValueFrom(
            http.post<MutationResponse>('/api/manual/remove-tag', buildMutationBody({ pathRel, tag })),
          );
          applyPreviewToState(res.preview, res.draft);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Remove tag failed';
          patchState(store, { loading: false, errors: [msg] });
        }
      },

      async deleteTagEverywhere(tag: string): Promise<void> {
        patchState(store, { loading: true, errors: [] });
        try {
          const res = await firstValueFrom(
            http.post<MutationResponse>('/api/manual/delete-tag-everywhere', buildMutationBody({ tag })),
          );
          applyPreviewToState(res.preview, res.draft);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Delete tag failed';
          patchState(store, { loading: false, errors: [msg] });
        }
      },

      async toggleDepRule(from: string, to: string): Promise<void> {
        patchState(store, { loading: true, errors: [] });
        try {
          const res = await firstValueFrom(
            http.post<MutationResponse>('/api/manual/toggle-dep-rule', buildMutationBody({ from, to })),
          );
          applyPreviewToState(res.preview, res.draft);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Toggle dep rule failed';
          patchState(store, { loading: false, errors: [msg] });
        }
      },

      /**
       * High-level method: Modify a tag on a target (add or remove).
       * Resolves target to pathRel and calls the appropriate command.
       */
      async modifyTag(target: TagTarget, operation: 'add' | 'remove', tag: string): Promise<void> {
        if (typeof target === 'string' && target !== 'selected' && target !== 'module') {
          patchState(store, { selectedId: target });
        }

        const pathRel = resolvePathRel(target);
        if (!pathRel) return;

        if (operation === 'add') {
          await this.addTag(pathRel, tag);
        } else {
          await this.removeTag(pathRel, tag);
        }
      },

      /**
       * High-level method: Toggle a dep rule and regenerate.
       */
      async toggleDepRuleAndRegenerate(from: string, to: string): Promise<void> {
        await this.toggleDepRule(from, to);
      },

      async applyPreview(): Promise<void> {
        const draft = store.draft();
        if (!draft.trim()) {
          patchState(store, { previewValid: false, previewErrors: ['Config is empty'] });
          return;
        }

        patchState(store, { loading: true, errors: [] });

        try {
          const body = { draft, entry: store.entry(), cwd: store.cwd() || undefined };
          const res = await firstValueFrom(http.post<PreviewContext>('/api/manual/preview', body));
          applyPreviewToState(res, draft);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Preview failed';
          patchState(store, { loading: false, previewValid: false, previewErrors: [msg] });
        }
      },

      async validateDraft(): Promise<void> {
        const draft = store.draft();
        if (!draft.trim()) {
          patchState(store, { previewValid: false, previewErrors: ['Config is empty'], validating: false });
          return;
        }

        patchState(store, { validating: true });

        try {
          const body = { draft, entry: store.entry(), cwd: store.cwd() || undefined };
          const res = await firstValueFrom(http.post<PreviewContext>('/api/manual/preview', body));
          applyPreviewToState(res, draft);
          patchState(store, { draftDirty: true });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Validation failed';
          patchState(store, { previewValid: false, previewErrors: [msg], validating: false });
        }
      },

      async saveDraftToDisk(): Promise<void> {
        patchState(store, { saving: true, errors: [] });
        try {
          const body = { draft: store.draft(), cwd: store.cwd() || undefined };
          const res = await firstValueFrom(http.post<{ ok: boolean; checksum?: string; errors?: string[] }>('/api/manual/save', body));

          if (res.ok) {
            patchState(store, {
              activeConfigContent: store.draft(),
              draftDirty: false,
              saving: false,
            });
          } else {
            patchState(store, { saving: false, errors: res.errors ?? ['Save failed'] });
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Save failed';
          patchState(store, { saving: false, errors: [msg] });
        }
      },

      setDraft(draft: string): void {
        patchState(store, { draft, draftDirty: true });
      },

      setTab(tab: ManualTab): void {
        patchState(store, { tab });
      },

      setSelectedId(id: string | null): void {
        patchState(store, { selectedId: id });
      },

      setSelectedFromTag(tag: string | null): void {
        patchState(store, { selectedFromTag: tag });
      },

      setDraggingTag(tag: string | null): void {
        patchState(store, { draggingTag: tag });
      },

      setCwd(cwd: string): void {
        patchState(store, { cwd });
      },

      setEntry(entry: string): void {
        patchState(store, { entry });
      },
    };
  }),
);
