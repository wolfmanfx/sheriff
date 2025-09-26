import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MarkdownViewerComponent } from '../shared/markdown-viewer.component';
import type { MessageAnnotation } from '../api/message-metadata';

/**
 * Question Response Component
 * Renders multiple choice questions with selectable options
 */
@Component({
  selector: 'app-question-response',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MarkdownViewerComponent],
  template: `
    <div class="flex flex-col gap-4 p-4 bg-linear-to-br from-yellow-50 to-yellow-100 border border-yellow-300 rounded-xl">
      <app-markdown-viewer [content]="question().text" class="text-slate-800 text-sm leading-relaxed" />

      <div class="flex flex-col gap-3">
        @for (option of question().options; track option.value; let i = $index) {
          <button
            type="button"
            class="flex w-full py-3.5 px-4 border-2 rounded-lg bg-white cursor-pointer transition-all text-left hover:border-slate-300 hover:bg-slate-50"
            [class.border-slate-200]="!isSelected(option.value)"
            [class.border-blue-500]="isSelected(option.value)"
            [class.bg-blue-50]="isSelected(option.value)"
            (click)="toggleOption(option.value)"
          >
            <div class="flex items-start gap-3 w-full">
              <div class="shrink-0 mt-0.5">
                @if (question().multiple) {
                  <span
                    class="inline-flex items-center justify-center w-5 h-5 border-2 rounded transition-all text-xs"
                    [class.border-slate-300]="!isSelected(option.value)"
                    [class.bg-white]="!isSelected(option.value)"
                    [class.text-transparent]="!isSelected(option.value)"
                    [class.bg-blue-500]="isSelected(option.value)"
                    [class.border-blue-500]="isSelected(option.value)"
                    [class.text-white]="isSelected(option.value)"
                  >
                    @if (isSelected(option.value)) {
                      ✓
                    }
                  </span>
                } @else {
                  <span
                    class="inline-flex items-center justify-center w-5 h-5 border-2 rounded-full bg-white transition-all"
                    [class.border-slate-300]="!isSelected(option.value)"
                    [class.border-blue-500]="isSelected(option.value)"
                  >
                    @if (isSelected(option.value)) {
                      <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                    }
                  </span>
                }
              </div>
              <div class="flex-1 flex flex-col gap-1">
                <span class="text-sm font-semibold text-slate-800">{{ option.label }}</span>
                @if (option.description) {
                  <span class="text-xs text-slate-500 leading-snug">{{ option.description }}</span>
                }
              </div>
            </div>
          </button>
        }
      </div>

      @if (hasSelection()) {
        <button
          type="button"
          class="self-start py-2.5 px-5 rounded-lg text-sm font-semibold cursor-pointer transition-all border-none bg-linear-to-r from-blue-500 to-blue-600 text-white shadow-md hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          (click)="handleSubmit()"
        >
          Submit
        </button>
      }
      @if (actions().length > 0) {
        <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
          @for (action of actions(); track action.type) {
            @if (action.type === 'showConfig') {
              <button
                type="button"
                class="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all border border-blue-600 bg-linear-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                (click)="handleAction(action)"
              >
                {{ action.label || action.type }}
              </button>
            } @else {
              <button
                type="button"
                class="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-400"
                (click)="handleAction(action)"
              >
                {{ action.label || action.type }}
              </button>
            }
          }
        </div>
      }
      @if (annotations().length > 0) {
        <div class="flex flex-wrap gap-2">
          @for (annotation of annotations(); track $index) {
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-cyan-50 border border-cyan-200 text-cyan-900 tracking-wide">{{ formatAnnotation(annotation) }}</span>
          }
        </div>
      }
    </div>
  `,
})
export class QuestionResponseComponent {
  question = input.required<{
    text: string;
    options: Array<{ label: string; value: string; description?: string }>;
    multiple?: boolean;
    required?: boolean;
  }>();
  annotations = input<MessageAnnotation[]>([]);
  actions = input<Array<{ type: string; label?: string; params?: Record<string, unknown> }>>([]);

  onAnswer = output<string | string[]>();
  onAction = output<{ type: string; label?: string; params?: Record<string, unknown> }>();

  selectedValues = signal<Set<string>>(new Set());

  isSelected(value: string): boolean {
    return this.selectedValues().has(value);
  }

  toggleOption(value: string): void {
    const current = this.selectedValues();
    const newSet = new Set(current);

    if (this.question().multiple) {
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
    } else {
      newSet.clear();
      newSet.add(value);
    }

    this.selectedValues.set(newSet);
  }

  hasSelection(): boolean {
    return this.selectedValues().size > 0;
  }

  handleSubmit(): void {
    const selected = Array.from(this.selectedValues());
    if (this.question().multiple) {
      this.onAnswer.emit(selected);
    } else {
      this.onAnswer.emit(selected[0] || '');
    }
  }

  formatAnnotation(annotation: MessageAnnotation): string {
    if (annotation.type === 'TOOL_USAGE') {
      return `${annotation.toolName}: ${annotation.status}`;
    }
    return 'annotation';
  }

  handleAction(action: { type: string; label?: string; params?: Record<string, unknown> }): void {
    this.onAction.emit(action);
  }
}

