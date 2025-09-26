import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getSheriffAssetUrl } from './asset-url';

export interface ExamplePrompt {
  title: string;
  description: string;
  prompt: string;
  icon?: string;
}

/**
 * Chat Empty State Component
 * Displays welcome screen with example prompts
 * Reusable component that accepts an array of example prompts
 */
@Component({
  selector: 'app-chat-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-1 flex flex-col items-center justify-center gap-6 py-12 px-4">
      <div class="flex flex-col items-center gap-3 text-center max-w-2xl">
        <div class="w-16 h-16 flex items-center justify-center">
          <img [src]="logoUrl" alt="Sheriff Logo" class="w-full h-full object-contain" />
        </div>
        <h2 class="text-2xl font-bold text-slate-900 m-0">{{ title() }}</h2>
        <p class="text-slate-600 text-sm m-0">{{ description() }}</p>
      </div>

      @if (examples().length > 0) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-3xl">
          @for (example of examples(); track example.prompt) {
            <button
              type="button"
              (click)="handleExampleClick(example.prompt)"
              class="text-left p-4 rounded-xl border border-slate-300 bg-white hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                  <span class="text-lg">{{ example.icon || '📁' }}</span>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-slate-900 text-sm m-0 mb-1">{{ example.title }}</h3>
                  <p class="text-xs text-slate-600 m-0">{{ example.description }}</p>
                </div>
              </div>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ChatEmptyStateComponent {
  readonly title = input<string>('Welcome to Sheriff Assistant');
  readonly description = input<string>('Get started by selecting an example or asking a question:');
  readonly examples = input<ExamplePrompt[]>([]);
  readonly onExampleClick = output<string>();
  protected readonly logoUrl = getSheriffAssetUrl('logo.png');

  protected handleExampleClick(prompt: string): void {
    this.onExampleClick.emit(prompt);
  }
}

