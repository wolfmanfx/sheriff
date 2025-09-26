import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { z } from 'zod';
import { MarkdownViewerComponent } from '../shared/markdown-viewer.component';

const configDraftSchema = z.object({
  content: z.string(),
  checksum: z.string().optional().nullable(),
});

type ConfigDraftViewModel =
  | {
      kind: 'draft';
      markdown: string;
      checksum?: string | null;
    }
  | {
      kind: 'fallback';
      fallback: string;
    };

@Component({
  selector: 'app-config-draft-message',
  standalone: true,
  imports: [CommonModule, MarkdownViewerComponent],
  template: `
    @if (vm(); as vm) {
      @switch (vm.kind) {
        @case ('draft') {
          <div class="flex flex-col gap-3 rounded-2xl border border-indigo-200/70 bg-linear-to-br from-indigo-50/70 via-blue-50 to-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm font-semibold uppercase tracking-wide text-indigo-700">Suggested Configuration</span>
              @if (vm.checksum) {
                <span class="rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-indigo-500">checksum: {{ vm.checksum }}</span>
              }
            </div>
            <app-markdown-viewer [content]="vm.markdown" class="rounded-xl bg-white/90 p-3 text-sm text-slate-800 shadow-inner" />
          </div>
        }
        @default {
          <pre class="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-900/90 p-4 text-xs text-slate-100 shadow-inner">{{ vm.fallback }}</pre>
        }
      }
    }
  `,
})
export class ConfigDraftMessageComponent {
  readonly payload = input.required<unknown>();

  readonly vm = computed<ConfigDraftViewModel>(() => {
    const parsed = configDraftSchema.safeParse(this.payload());
    if (parsed.success) {
      return {
        kind: 'draft',
        markdown: this.buildCodeBlock(parsed.data.content),
        checksum: parsed.data.checksum ?? undefined,
      } as const;
    }

    return {
      kind: 'fallback',
      fallback: JSON.stringify(this.payload(), null, 2),
    } as const;
  });

  private buildCodeBlock(content: string): string {
    return `\`\`\`typescript\n${content}\n\`\`\``;
  }
}
