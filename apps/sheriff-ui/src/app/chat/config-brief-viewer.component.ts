import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownViewerComponent } from '../shared/markdown-viewer.component';
import type { ConfigBriefViewModel } from '../api/message-parts';

type Action = {
  type: string;
  label?: string;
  params?: Record<string, unknown>;
};

/**
 * Config Brief Viewer Component
 * Displays config brief with entry file, architectural goals, constraints, and actions
 */
@Component({
  selector: 'app-config-brief-viewer',
  standalone: true,
  imports: [CommonModule, MarkdownViewerComponent],
  template: `
    <div class="flex flex-col gap-4 rounded-2xl border border-blue-200/60 bg-linear-to-br from-blue-50/70 via-sky-50 to-white p-5 shadow-sm">
      <div class="flex flex-col gap-2">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-blue-800">Project Requirements Summary</h3>
        @if (brief().text) {
          <app-markdown-viewer [content]="brief().text ?? ''" class="text-sm text-slate-700" />
        }
      </div>
      @if (brief().entryFile) {
        <div class="flex flex-col gap-1 rounded-xl border border-blue-200/60 bg-white/80 px-4 py-3 text-sm">
          <span class="text-xs font-semibold uppercase tracking-wide text-blue-600">Entry File</span>
          <code class="text-xs text-slate-800">{{ brief().entryFile }}</code>
        </div>
      }
      @if (brief().architecturalGoals.length > 0) {
        <div class="flex flex-col gap-2 rounded-xl border border-blue-200/60 bg-white/80 px-4 py-3">
          <span class="text-xs font-semibold uppercase tracking-wide text-blue-600">Architectural Goals</span>
          <div class="flex flex-col gap-1">
            @for (goal of brief().architecturalGoals; track goal) {
              <div class="flex items-center gap-2 text-sm text-slate-700">
                <span class="text-blue-500">•</span>
                <span>{{ goal }}</span>
              </div>
            }
          </div>
        </div>
      }
      @if (brief().constraints.length > 0) {
        <div class="flex flex-col gap-2 rounded-xl border border-blue-200/60 bg-white/80 px-4 py-3">
          <span class="text-xs font-semibold uppercase tracking-wide text-blue-600">Constraints</span>
          <div class="flex flex-col gap-1 text-sm text-slate-700">
            @for (constraint of brief().constraints; track constraint) {
              <div class="flex items-center gap-2">
                <span class="text-blue-500">–</span>
                <span>{{ constraint }}</span>
              </div>
            }
          </div>
        </div>
      }
      <pre class="overflow-x-auto rounded-xl bg-slate-900/90 p-4 text-xs text-slate-100 shadow-inner">{{ brief().raw }}</pre>
      @if (actions().length > 0) {
        <div class="flex flex-wrap gap-3">
          @for (action of actions(); track action.type) {
            <button
              type="button"
              class="btn btn-primary btn-sm"
              (click)="handleAction(action)">
              {{ action.label || action.type }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ConfigBriefViewerComponent {
  readonly brief = input.required<ConfigBriefViewModel>();
  readonly actions = input<Action[]>([]);

  readonly onAction = output<Action>();

  protected handleAction(action: Action): void {
    this.onAction.emit(action);
  }
}

