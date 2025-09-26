import { HttpClient } from '@angular/common/http';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { AnalyzeMergeResponse } from './model/analyze-merge-response';
import { inject } from '@angular/core';

export interface AppState {
  cwd: string;
  entry: string;
  config: string;
  missingConfig: boolean;
  data: unknown;
  merged: AnalyzeMergeResponse | '';
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
  }),
  withMethods((store, http = inject(HttpClient)) => ({
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
      const params = store.cwd()
        ? new URLSearchParams({ cwd: store.cwd() })
        : undefined;
      const url = params ? `/api/config?${params.toString()}` : `/api/config`;
      http
        .get<{ content: string }>(url)
        .subscribe({
          next: (res) =>
            patchState(store, {
              missingConfig: false,
              config: res.content ?? '',
            }),
          error: (err: unknown) =>
            patchState(store, {
              missingConfig:
                !!err && (err as { status?: number }).status === 404,
              config: '',
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

    analyzeMerged() {
      const body: { entry: string; cwd?: string } = { entry: store.entry() };
      if (store.cwd()) body.cwd = store.cwd();
      http
        .post<AnalyzeMergeResponse>(`/api/analyze/merge`, body)
        .subscribe({
          next: (res) => patchState(store, { merged: res }),
          error: () => patchState(store, { merged: '' }),
        });
    },
  })),
);
