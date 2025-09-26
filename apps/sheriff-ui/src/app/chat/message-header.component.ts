import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Message Header Component
 * Displays message avatar, role badge, and sender name
 */
@Component({
  selector: 'app-message-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-3" [class.flex-row-reverse]="role() === 'user'">
      <div
        class="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-linear-to-br from-blue-500/12 to-blue-500/45 text-blue-900 shadow-lg"
        [class.bg-linear-to-br]="role() === 'user'"
        [class.from-amber-500/18]="role() === 'user'"
        [class.to-orange-500/50]="role() === 'user'"
        [class.text-amber-900]="role() === 'user'"
      >
        @if (role() === 'user') {
          🙋
        } @else {
          🤖
        }
      </div>
      <div
        class="flex flex-col items-start gap-0.5"
        [class.items-end]="role() === 'user'"
      >
        <span
          class="font-semibold text-slate-900 text-sm tracking-tight"
          [class.text-slate-800]="role() === 'user'"
        >
          @if (role() === 'user') {
            You
          } @else {
            Sheriff Assistant
          }
        </span>
        @if (role() === 'assistant' || role() === 'system') {
          @if (agentRole(); as role) {
            @switch (role) {
              @case ('orchestrator') {
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded bg-blue-50/90 border border-blue-400/35 text-blue-900 text-xs font-semibold uppercase tracking-wider"
                  >Prompt Orchestrator</span
                >
              }
              @case ('config-engineer') {
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded bg-green-50/90 border border-green-400/35 text-green-900 text-xs font-semibold uppercase tracking-wider"
                  >Config Engineer</span
                >
              }
              @case ('validator-reporter') {
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded bg-yellow-50/90 border border-yellow-400/35 text-yellow-900 text-xs font-semibold uppercase tracking-wider"
                  >Validator &amp; Reporter</span
                >
              }
            }
          } @else {
            <span class="text-xs text-slate-500">Collaborative agent team</span>
          }
        }
      </div>
    </div>
  `,
})
export class MessageHeaderComponent {
  readonly role = input.required<'user' | 'assistant' | 'system'>();
  readonly agentRole = input<string | null>(null);
}

