import { Component, input, output } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';

/**
 * Tool Call Component
 * Displays collapsible tool call information with request/response
 */
@Component({
  selector: 'app-tool-call',
  standalone: true,
  imports: [CommonModule, JsonPipe],
  template: `
    <div
      class="rounded-lg border border-slate-400/25 overflow-hidden bg-slate-50/95"
      [class.border-green-400/35]="!!output()"
      [class.bg-green-50/95]="!!output()"
    >
      <button
        class="w-full flex items-center gap-2 py-2.5 px-3.5 border-0 bg-transparent cursor-pointer text-sm transition-colors hover:bg-slate-100/80"
        (click)="handleToggle()"
      >
        <span
          class="w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs bg-slate-400/20 text-slate-600"
          [class.bg-amber-400/20]="!output()"
          [class.text-amber-900]="!output()"
          [class.bg-green-400/20]="!!output()"
          [class.text-green-900]="!!output()"
        >
          @if (output()) {
            ✓
          } @else {
            ⏳
          }
        </span>
        <span class="flex-1 font-medium text-slate-900 text-left">{{ toolName() }}</span>
        <span class="text-xs text-slate-600">{{ isExpanded() ? '▼' : '▶' }}</span>
      </button>
      @if (isExpanded()) {
        <div class="p-3.5 border-t border-slate-400/20 bg-white/70 flex flex-col gap-3">
          <div class="flex flex-col gap-1.5">
            <div class="text-xs font-semibold text-slate-600 uppercase tracking-wider">Request:</div>
            <pre class="m-0 p-2.5 bg-slate-900/5 rounded border-0 font-mono text-xs overflow-x-auto text-slate-900">{{ input() | json }}</pre>
          </div>
          @if (output()) {
            <div class="flex flex-col gap-1.5">
              <div class="text-xs font-semibold text-slate-600 uppercase tracking-wider">Response:</div>
              <pre class="m-0 p-2.5 bg-slate-900/5 rounded border-0 font-mono text-xs overflow-x-auto text-slate-900">{{ output() | json }}</pre>
            </div>
          } @else {
            <div class="p-2.5 text-center text-slate-600 text-xs italic">Awaiting result...</div>
          }
        </div>
      }
    </div>
  `,
})
export class ToolCallComponent {
  readonly toolName = input.required<string>();
  readonly input = input.required<unknown>();
  readonly output = input<unknown>();
  readonly isExpanded = input.required<boolean>();
  readonly toolKey = input.required<string>();

  readonly onToggle = output<string>();

  protected handleToggle(): void {
    this.onToggle.emit(this.toolKey());
  }
}






