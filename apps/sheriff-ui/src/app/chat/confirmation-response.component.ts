import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MarkdownViewerComponent } from '../shared/markdown-viewer.component';
import type { MessageAnnotation } from '../api/message-metadata';

/**
 * Confirmation Response Component
 * Renders confirmation requests with yes/no buttons and optional custom input
 */
@Component({
  selector: 'app-confirmation-response',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MarkdownViewerComponent],
  template: `
    <div class="flex flex-col gap-4 p-4 bg-linear-to-br from-blue-50 to-cyan-100 border border-cyan-200 rounded-xl">
      <app-markdown-viewer [content]="confirmation().text" class="text-slate-800 text-sm leading-relaxed" />

      <div class="flex flex-col gap-4">
        @if (annotations().length > 0) {
          <div class="flex flex-wrap gap-2">
            @for (annotation of annotations(); track $index) {
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-cyan-50 border border-cyan-200 text-cyan-900 tracking-wide">{{ formatAnnotation(annotation) }}</span>
            }
          </div>
        }

        <div class="flex gap-3 flex-wrap">
          <button
            type="button"
            class="py-2.5 px-5 rounded-lg text-sm font-semibold cursor-pointer transition-all border-none bg-linear-to-r from-blue-500 to-blue-600 text-white shadow-md hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            (click)="handleConfirm()"
          >
            {{ confirmation().confirmLabel || 'Yes' }}
          </button>
        </div>

        @if (confirmation().allowCustomInput) {
          <div class="flex items-center my-2 before:content-[''] before:flex-1 before:h-px before:bg-slate-300 after:content-[''] after:flex-1 after:h-px after:bg-slate-300">
            <span class="px-4 text-slate-500 text-sm font-medium lowercase">or</span>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">{{ confirmation().customInputLabel || 'Provide a custom path' }}</label>
            <div class="flex gap-2">
              <input
                type="text"
                [formControl]="customInput"
                [placeholder]="confirmation().customInputPlaceholder || 'Enter path'"
                class="flex-1 py-2.5 px-3.5 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                (keydown.enter)="handleCustomSubmit()"
              />
              <button
                type="button"
                class="shrink-0 py-2.5 px-5 rounded-lg text-sm font-semibold cursor-pointer transition-all border-none bg-linear-to-r from-blue-500 to-blue-600 text-white shadow-md hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                [disabled]="!customInput.value?.trim()"
                (click)="handleCustomSubmit()"
              >
                Submit
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ConfirmationResponseComponent {
  confirmation = input.required<{
    text: string;
    confirmLabel?: string;
    cancelLabel?: string;
    allowCustomInput?: boolean;
    customInputLabel?: string;
    customInputPlaceholder?: string;
    customInputType?: 'text' | 'path';
    onConfirm?: string;
    onCancel?: string;
    onCustomSubmit?: string;
  }>();
  annotations = input<MessageAnnotation[]>([]);

  onConfirm = output<string>();
  onCancel = output<string>();
  onCustomSubmit = output<string>();

  customInput = new FormControl('');

  formatAnnotation(annotation: MessageAnnotation): string {
    if (annotation.type === 'TOOL_USAGE') {
      return `${annotation.toolName}: ${annotation.status}`;
    }
    return 'annotation';
  }

  handleConfirm(): void {
    const text = this.confirmation().onConfirm || this.confirmation().confirmLabel || 'yes';
    const pathFromPrompt = this.extractPathFromConfirmationText(this.confirmation().text);
    // Emit the path directly if we can extract it so the parent can set cwd deterministically
    this.onConfirm.emit(pathFromPrompt || text);
  }

  handleCancel(): void {
    const text = this.confirmation().onCancel || this.confirmation().cancelLabel || 'cancel';
    this.onCancel.emit(text);
  }

  handleCustomSubmit(): void {
    const value = this.customInput.value?.trim();
    if (!value) return;

    const pattern = this.confirmation().onCustomSubmit || '{value}';
    const text = pattern.replace('{value}', value);
    this.onCustomSubmit.emit(text);
    this.customInput.setValue('');
  }

  private extractPathFromConfirmationText(text: string | undefined): string | null {
    if (!text) return null;
    const boldMatch = text.match(/\*\*(.+?)\*\*/);
    if (boldMatch) {
      return boldMatch[1].trim();
    }
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return lines.length > 0 ? lines[lines.length - 1] : null;
  }
}

