import { HttpClient } from '@angular/common/http';
import {
  patchState,
  signalStore,
  withMethods,
  withState,
} from '@ngrx/signals';
import { on, withEffects, withReducer, Events } from '@ngrx/signals/events';
import { AnalyzeMergeResponse } from './model/analyze-merge-response';
import { inject } from '@angular/core';
import { firstValueFrom, from, switchMap, tap } from 'rxjs';
import { agentEvents } from './agent.events';
import { EnvironmentService } from '../core/environment.service';

export interface AppState {
  cwd: string;
  entry: string;
  config: string;
  missingConfig: boolean;
  data: unknown;
  merged: AnalyzeMergeResponse | '';
  configValid: boolean;
  configErrors: string[];
  showAssetView: boolean;
  selectedAsset: { name: string; content: string; type: 'json' | 'typescript' } | null;
  previewTab: 'graph' | 'config' | 'session';
}

export const AppStore = signalStore(
  { providedIn: 'root' },
  withState<AppState>({
    cwd: '',
    entry: 'src/main.ts',
    config: '',
    missingConfig: false,
    data: '',
    merged: '',
    configValid: false,
    configErrors: [],
    showAssetView: false,
    selectedAsset: null,
    previewTab: 'graph',
  }),
  withReducer(
    on(agentEvents.showAssetView, () => ({ showAssetView: true })),
    on(agentEvents.initializeConfigPreview, () => ({ showAssetView: true })),
  ),
  withMethods((store, http = inject(HttpClient), env = inject(EnvironmentService)) => {
    if (env.initialCwd && store.cwd() !== env.initialCwd) {
      patchState(store, { cwd: env.initialCwd });
    }
    if (env.initialEntry && store.entry() !== env.initialEntry) {
      patchState(store, { entry: env.initialEntry });
    }

    return {
    initFromEnv() {
      http
        .get<{ root: string }>(`/api/env`)
        .subscribe({
          next: (res) => patchState(store, { cwd: res.root || '' }),
        });
    },
    setCwd(cwd: string) {
      patchState(store, { cwd });
    },

    setEntry(entry: string) {
      patchState(store, { entry });
    },

    setConfig(config: string) {
      patchState(store, { config });
      if (config.trim()) {
        http
          .post<{ valid: boolean; errors?: string[] }>(`/api/config/preview`, {
            content: config,
            cwd: store.cwd() || undefined,
          })
          .subscribe({
            next: (res) =>
              patchState(store, {
                configValid: res.valid,
                configErrors: res.errors ?? [],
              }),
            error: () =>
              patchState(store, {
                configValid: false,
                configErrors: ['Failed to validate config'],
              }),
          });
      } else {
        patchState(store, { configValid: false, configErrors: [] });
      }
    },

    async initializePreview(config?: string): Promise<void> {
      if (config) {
        this.setConfig(config);
      }

      await this.analyzeMerged();
    },

    setData(data: unknown) {
      patchState(store, { data });
    },

    setMissingConfig(missing: boolean) {
      patchState(store, { missingConfig: missing });
    },

    onConfigInput(event: Event) {
      const target = event.target as HTMLTextAreaElement;
      patchState(store, { config: target.value });
    },

    onEntryInput(event: Event) {
      const target = event.target as HTMLInputElement;
      patchState(store, { entry: target.value });
    },

    onFolderSelect(event: Event) {
      const target = event.target as HTMLSelectElement;
      patchState(store, { cwd: target.value });
    },

    loadConfig() {
      const cwd = store.cwd()?.trim();
      const params = cwd ? new URLSearchParams({ cwd }) : undefined;
      const url = params ? `/api/config?${params.toString()}` : `/api/config`;
      http
        .get<{ content: string }>(url)
        .subscribe({
          next: (res) => {
            patchState(store, {
              missingConfig: false,
              config: res.content ?? '',
            });
            if (res.content?.trim()) {
              this.validateConfig(res.content);
            } else {
              patchState(store, { configValid: false, configErrors: [] });
            }
          },
          error: (err: unknown) =>
            patchState(store, {
              missingConfig:
                !!err && (err as { status?: number }).status === 404,
              config: '',
              configValid: false,
              configErrors: [],
            }),
        });
    },

    saveConfig() {
      http
        .post(`/api/config`, {
          content: store.config(),
          cwd: store.cwd() || undefined,
        })
        .subscribe(() => this.analyze());
    },

    initDefaultConfig() {
      http
        .post(`/api/config/init`, {
          entry: store.entry(),
          cwd: store.cwd() || undefined,
        })
        .subscribe(() => this.loadConfig());
    },

    analyze() {
      const params = new URLSearchParams({ entry: store.entry() });
      if (store.cwd()) params.set('cwd', store.cwd());
      http
        .get<{ data: unknown }>(`/api/data?${params.toString()}`)
        .subscribe({
          next: (res) => patchState(store, { data: res.data }),
          error: () => patchState(store, { data: '' }),
        });
    },

    async analyzeMerged(): Promise<AnalyzeMergeResponse> {
      const cwd = store.cwd()?.trim();
      const entry = store.entry()?.trim();
      if (!entry) {
        throw new Error('Entry file is required');
      }
      const body: { entry: string; cwd?: string } = { entry };
      if (cwd) body.cwd = cwd;
      try {
        const res = await firstValueFrom(
          http.post<AnalyzeMergeResponse>(`/api/analyze/merge`, body),
        );
        patchState(store, { merged: res });
        return res;
      } catch (error: unknown) {
        patchState(store, { merged: '' });
        const errorMessage =
          error && typeof error === 'object' && 'error' in error
            ? String((error as { error?: unknown }).error)
            : error instanceof Error
              ? error.message
              : 'Unknown error';
        console.error('Failed to analyze merged configuration:', {
          error,
          errorMessage,
          body,
        });
        throw new Error(`Failed to analyze merged configuration: ${errorMessage}`);
      }
    },

    validateConfig(config?: string) {
      const configToValidate = config ?? store.config();
      if (!configToValidate.trim()) {
        patchState(store, { configValid: false, configErrors: [] });
        return;
      }

      const body: { content: string; cwd?: string } = {
        content: configToValidate,
      };
      if (store.cwd()) body.cwd = store.cwd();

      http
        .post<{ valid: boolean; errors?: string[] }>(`/api/config/preview`, body)
        .subscribe({
          next: (res) =>
            patchState(store, {
              configValid: res.valid,
              configErrors: res.errors ?? [],
            }),
          error: () =>
            patchState(store, {
              configValid: false,
              configErrors: ['Failed to validate config'],
            }),
        });
    },

    toggleAssetView() {
      patchState(store, { showAssetView: !store.showAssetView() });
    },

    selectAsset(asset: { name: string; content: string; type: 'json' | 'typescript' } | null) {
      patchState(store, { selectedAsset: asset });
    },

    setPreviewTab(tab: 'graph' | 'config' | 'session') {
      patchState(store, { previewTab: tab });
    },

    clearMerged() {
      patchState(store, { merged: '' });
    },
    };
  }),
  withEffects((store, events = inject(Events)) => ({
    initializeConfigPreview$: events
      .on(agentEvents.initializeConfigPreview)
      .pipe(
        switchMap(({ payload }) => {
          store.setConfig(payload.content);
          return from(store.analyzeMerged());
        }),
      ),
    loadConfig$: events.on(agentEvents.loadConfig).pipe(
      tap(() => {
        store.loadConfig();
      }),
    ),
    analyzeProject$: events.on(agentEvents.analyzeProject).pipe(
      tap(() => {
        store.analyzeMerged();
      }),
    ),
    configApproved$: events.on(agentEvents.configApproved).pipe(
      tap(() => {
        store.loadConfig();
      }),
    ),
  })),
);
