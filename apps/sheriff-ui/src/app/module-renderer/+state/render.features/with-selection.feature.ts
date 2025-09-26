import { signalStoreFeature, withState, type, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { AnalyzeMergeResponse } from '../../../api/model/analyze-merge-response';
import { AppStore } from '../../../api/store';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const withSelection = <_>() =>
  signalStoreFeature(
    {
      state: type<{
        collapsed: Set<string>;
      }>(),
    },
    withState({
      selectedId: null as string | null,
      targetModules: new Set<string>(),
    }),
    withMethods((store, http = inject(HttpClient), app = inject(AppStore)) => ({
      computeTargets(sel: string) {
        const body: { entry: string; cwd?: string; selectedModuleIds: string[] } = {
          entry: app.entry(),
          selectedModuleIds: [sel],
        };
        if (app.cwd()) body.cwd = app.cwd();
        http
          .post<{ allowedMatrixById: Record<string, Record<string, boolean>> }>(`/api/allowed-modules`, body)
          .subscribe({
            next: (res) => {
              const row = res.allowedMatrixById?.[sel] ?? {};
              patchState(store, {
                targetModules: new Set(Object.keys(row).filter((k) => row[k])),
              });
            },
            error: () => patchState(store, { targetModules: new Set<string>() }),
          });
      },
      select(id: string) {
        patchState(store, { selectedId: id });
        this.computeTargets(id);
      },
      clearSelection() {
        patchState(store, { selectedId: null, targetModules: new Set<string>() });
      },
      toggleSelected(id: string) {
        const current = store.selectedId();
        const nextId = current === id ? null : id;
        patchState(store, { selectedId: nextId });
        if (nextId) this.computeTargets(nextId);
        else patchState(store, { targetModules: new Set<string>() });
      },
      toggleCollapsed(id: string) {
        const s = new Set(store.collapsed());
        if (s.has(id)) s.delete(id);
        else s.add(id);
        patchState(store, { collapsed: s });
      },
    })),
  );
