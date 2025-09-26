import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

type Domain = {
  name: string;
  subdirectories?: string[] | null;
  description?: string | null;
};

type SharedModule = {
  name: string;
  description?: string | null;
};

type TagSuggestion = {
  category?: string | null;
  pattern: string;
  description?: string | null;
};

type DependencyRule = {
  from: string;
  to: string[];
  description?: string | null;
};

type ProjectAnalysis = {
  overview?: {
    framework?: string;
    architecture?: string;
    description?: string;
  };
  domains?: Domain[];
  sharedModules?: SharedModule[];
  shell?: {
    description?: string | null;
    modules?: string[];
  };
  taggingStrategy?: {
    description?: string | null;
    domainTags?: TagSuggestion[];
    typeTags?: TagSuggestion[];
    sharedTags?: TagSuggestion[];
  };
  dependencyRules?: {
    description?: string | null;
    hierarchy?: string[];
    rules?: DependencyRule[];
  };
  currentConfig?: {
    usesNoTag?: boolean | null;
    hasStrictRules?: boolean | null;
    barrelLessEnabled?: boolean | null;
    entryFile?: string | null;
  };
  proposedGoals?: string[];
};

type ProjectAnalysisAction = {
  type: string;
  label?: string;
  params?: Record<string, unknown>;
};

type ProjectAnalysisViewModel = {
  hasContent: boolean;
  overview?: ProjectAnalysis['overview'];
  domains: Domain[];
  sharedModules: SharedModule[];
  shell?: ProjectAnalysis['shell'];
  taggingStrategy?: ProjectAnalysis['taggingStrategy'];
  dependencyRules?: ProjectAnalysis['dependencyRules'];
  currentConfig?: ProjectAnalysis['currentConfig'];
  proposedGoals: string[];
  actions: ProjectAnalysisAction[];
};

@Component({
  selector: 'app-project-analysis-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (vm(); as vm) {
      <div class="flex flex-col gap-6">
        @if (vm.overview) {
          <section class="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <div class="flex flex-wrap items-center gap-3">
              @if (vm.overview.framework) {
                <span class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  <span class="text-base">🛠️</span>
                  {{ vm.overview.framework }}
                </span>
              }
              @if (vm.overview.architecture) {
                <span class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  <span class="text-base">🏗️</span>
                  {{ vm.overview.architecture }}
                </span>
              }
            </div>
            @if (vm.overview.description) {
              <p class="mt-3 text-sm text-slate-700">{{ vm.overview.description }}</p>
            }
          </section>
        }

        @if (vm.domains.length > 0) {
          <section class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-600">Main Domains</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              @for (domain of vm.domains; track domain.name) {
                <div class="flex flex-col gap-3 rounded-xl border border-slate-200/70 bg-linear-to-br from-slate-50 to-white p-4 shadow-sm">
                  <div class="flex items-center justify-between">
                    <h4 class="text-base font-semibold text-slate-900">{{ domain.name }}</h4>
                    <span class="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-indigo-700">Domain</span>
                  </div>
                  @if (domain.description) {
                    <p class="text-xs text-slate-600">{{ domain.description }}</p>
                  }
                  @if (domain.subdirectories?.length) {
                    <div class="flex flex-col gap-2">
                      <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Subdirectories</span>
                      <div class="flex flex-wrap gap-2">
                        @for (subdir of domain.subdirectories ?? []; track subdir) {
                          <span class="rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-medium text-slate-700">{{ subdir }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </section>
        }

        @if (vm.sharedModules.length > 0) {
          <section class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-600">Shared Modules</h3>
            <div class="grid gap-3 sm:grid-cols-2">
              @for (module of vm.sharedModules; track module.name) {
                <div class="flex flex-col gap-1 rounded-xl border border-slate-200/70 bg-linear-to-br from-slate-50 to-white p-4">
                  <span class="text-sm font-semibold text-slate-900">{{ module.name }}</span>
                  @if (module.description) {
                    <span class="text-xs text-slate-600">{{ module.description }}</span>
                  }
                </div>
              }
            </div>
          </section>
        }

        @if (vm.shell) {
          <section class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-600">Shell &amp; Core</h3>
            @if (vm.shell.description) {
              <p class="text-sm text-slate-700">{{ vm.shell.description }}</p>
            }
            @if (vm.shell.modules?.length) {
              <div class="flex flex-wrap gap-2">
                @for (module of vm.shell.modules ?? []; track module) {
                  <span class="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">{{ module }}</span>
                }
              </div>
            }
          </section>
        }

        @if (vm.currentConfig) {
          <section class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-600">Current Sheriff Config</h3>
            <div class="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              @if (vm.currentConfig.usesNoTag !== undefined && vm.currentConfig.usesNoTag !== null) {
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Uses NoTag</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class.bg-emerald-100]="vm.currentConfig.usesNoTag" [class.text-emerald-700]="vm.currentConfig.usesNoTag" [class.bg-rose-100]="!vm.currentConfig.usesNoTag" [class.text-rose-700]="!vm.currentConfig.usesNoTag">
                    {{ vm.currentConfig.usesNoTag ? 'Yes' : 'No' }}
                  </span>
                </div>
              }
              @if (vm.currentConfig.hasStrictRules !== undefined && vm.currentConfig.hasStrictRules !== null) {
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Strict Rules</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class.bg-emerald-100]="vm.currentConfig.hasStrictRules" [class.text-emerald-700]="vm.currentConfig.hasStrictRules" [class.bg-rose-100]="!vm.currentConfig.hasStrictRules" [class.text-rose-700]="!vm.currentConfig.hasStrictRules">
                    {{ vm.currentConfig.hasStrictRules ? 'Yes' : 'No' }}
                  </span>
                </div>
              }
              @if (vm.currentConfig.barrelLessEnabled !== undefined && vm.currentConfig.barrelLessEnabled !== null) {
                <div class="flex items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Barrel-less Mode</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class.bg-emerald-100]="vm.currentConfig.barrelLessEnabled" [class.text-emerald-700]="vm.currentConfig.barrelLessEnabled" [class.bg-rose-100]="!vm.currentConfig.barrelLessEnabled" [class.text-rose-700]="!vm.currentConfig.barrelLessEnabled">
                    {{ vm.currentConfig.barrelLessEnabled ? 'Enabled' : 'Disabled' }}
                  </span>
                </div>
              }
              @if (vm.currentConfig.entryFile) {
                <div class="rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Entry File</span>
                  <code class="mt-1 block text-xs text-slate-800">{{ vm.currentConfig.entryFile }}</code>
                </div>
              }
            </div>
          </section>
        }

        @if (vm.taggingStrategy) {
          <section class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-600">Tagging Strategy</h3>
            @if (vm.taggingStrategy.description) {
              <p class="text-sm text-slate-700">{{ vm.taggingStrategy.description }}</p>
            }
            @if (vm.taggingStrategy.domainTags?.length) {
              <div class="flex flex-col gap-2">
                <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Domain Tags</span>
                <div class="flex flex-wrap gap-2">
                  @for (tag of vm.taggingStrategy.domainTags ?? []; track tag.pattern) {
                    <div class="flex items-start gap-2 rounded-lg border border-indigo-200/70 bg-indigo-50/60 px-3 py-2">
                      <span class="rounded-full bg-indigo-600/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">{{ tag.pattern }}</span>
                      @if (tag.description) {
                        <span class="text-xs text-indigo-700/90">{{ tag.description }}</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
            @if (vm.taggingStrategy.typeTags?.length) {
              <div class="flex flex-col gap-2">
                <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Type Tags</span>
                <div class="flex flex-wrap gap-2">
                  @for (tag of vm.taggingStrategy.typeTags ?? []; track tag.pattern) {
                    <div class="flex items-start gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50/60 px-3 py-2">
                      <span class="rounded-full bg-emerald-600/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">{{ tag.pattern }}</span>
                      @if (tag.description) {
                        <span class="text-xs text-emerald-700/90">{{ tag.description }}</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
            @if (vm.taggingStrategy.sharedTags?.length) {
              <div class="flex flex-col gap-2">
                <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Shared Tags</span>
                <div class="flex flex-wrap gap-2">
                  @for (tag of vm.taggingStrategy.sharedTags ?? []; track tag.pattern) {
                    <div class="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-2">
                      <span class="rounded-full bg-amber-600/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">{{ tag.pattern }}</span>
                      @if (tag.description) {
                        <span class="text-xs text-amber-700/90">{{ tag.description }}</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </section>
        }

        @if (vm.dependencyRules) {
          <section class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-600">Dependency Rules</h3>
            @if (vm.dependencyRules.description) {
              <p class="text-sm text-slate-700">{{ vm.dependencyRules.description }}</p>
            }
            @if (vm.dependencyRules.hierarchy?.length) {
              <div class="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3">
                @for (level of vm.dependencyRules.hierarchy ?? []; track level; let i = $index) {
                  <span class="rounded-full bg-slate-900/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-800">{{ level }}</span>
                  @if (i < vm.dependencyRules.hierarchy!.length - 1) {
                    <span class="text-sm text-slate-400">→</span>
                  }
                }
              </div>
            }
            @if (vm.dependencyRules.rules?.length) {
              <div class="overflow-hidden rounded-xl border border-slate-200/70">
                <table class="min-w-full divide-y divide-slate-200">
                  <thead class="bg-slate-50/80">
                    <tr class="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th class="px-4 py-2">From</th>
                      <th class="px-4 py-2">To</th>
                      <th class="px-4 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    @for (rule of vm.dependencyRules.rules ?? []; track rule.from) {
                      <tr class="text-sm text-slate-700">
                        <td class="px-4 py-2 align-top"><code class="text-xs text-slate-800">{{ rule.from }}</code></td>
                        <td class="px-4 py-2 align-top">
                          <div class="flex flex-wrap gap-2">
                            @for (target of rule.to; track target) {
                              <span class="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-medium text-indigo-700">{{ target }}</span>
                            }
                          </div>
                        </td>
                        <td class="px-4 py-2 align-top text-xs text-slate-600">{{ rule.description || '-' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        }

        @if (vm.proposedGoals.length > 0) {
          <section class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-600">Proposed Architecture Goals</h3>
            <div class="flex flex-col gap-2">
              @for (goal of vm.proposedGoals; track goal) {
                <div class="flex items-start gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-2">
                  <span class="text-lg">✅</span>
                  <span class="text-sm text-emerald-800">{{ goal }}</span>
                </div>
              }
            </div>
          </section>
        }

        @if (vm.actions.length > 0) {
          <section class="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <div class="flex flex-col gap-4">
              <p class="text-sm text-slate-700">
                <span class="font-semibold">Next steps:</span> Use the actions below to explore the analysis or request follow-up tasks.
              </p>
              <div class="flex flex-wrap gap-3">
                @for (action of vm.actions; track action.type) {
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
                    (click)="handleAction(action)"
                  >
                    {{ action.label || action.type }}
                  </button>
                }
              </div>
            </div>
          </section>
        }
      </div>
    }
  `,
})
export class ProjectAnalysisViewerComponent {
  readonly data = input<ProjectAnalysis | null>(null);
  readonly actions = input<ProjectAnalysisAction[]>([]);

  readonly onAction = output<ProjectAnalysisAction>();

  readonly vm = computed<ProjectAnalysisViewModel | null>(() => {
    const raw = this.data();
    if (!raw) {
      return null;
    }

    const actions = this.actions();

    return {
      hasContent:
        !!raw.overview ||
        !!raw.domains?.length ||
        !!raw.sharedModules?.length ||
        !!raw.shell ||
        !!raw.taggingStrategy ||
        !!raw.dependencyRules ||
        !!raw.currentConfig ||
        !!raw.proposedGoals?.length ||
        actions.length > 0,
      overview: raw.overview,
      domains: raw.domains ?? [],
      sharedModules: raw.sharedModules ?? [],
      shell: raw.shell,
      taggingStrategy: raw.taggingStrategy,
      dependencyRules: raw.dependencyRules,
      currentConfig: raw.currentConfig,
      proposedGoals: raw.proposedGoals ?? [],
      actions,
    } satisfies ProjectAnalysisViewModel;
  });

  handleAction(action: ProjectAnalysisAction): void {
    this.onAction.emit(action);
  }
}
