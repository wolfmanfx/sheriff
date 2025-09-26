import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { MonacoEditorInstance, MonacoDisposable } from './monaco-ambient';
@Component({
  selector: 'app-code-editor',
  standalone: true,
  template: `
    <div #container class="w-full min-h-96 border border-slate-200 rounded"></div>
  `,
})
export class CodeEditorComponent {
  private container = viewChild.required<ElementRef<HTMLElement>>('container');

  value = model<string>('');
  language = input<string>('typescript');

  private editor = signal<MonacoEditorInstance | null>(null);
  private changeSub: MonacoDisposable | null = null;

  constructor() {
    afterNextRender(() => {
      const el = this.container().nativeElement;
      if (!el) return;

      if (this.editor()) return;

      if (!window.monaco?.editor) {
        this.waitForMonaco(() => this.tryCreateEditor(el));
        return;
      }

      this.tryCreateEditor(el);
    });

    effect(() => {
      const ed = this.editor();
      if (!ed) return;
      const next = this.value();
      const curr = ed.getValue();
      if (next !== curr) {
        ed.setValue(next ?? '');
      }
    });

    inject(DestroyRef).onDestroy(() => this.teardown());
  }

  private tryCreateEditor(containerEl: HTMLElement): void {
    if (this.editor() || !window.monaco?.editor) return;

    const ed = window.monaco.editor.create(containerEl, {
      value: this.value() ?? '',
      language: this.language() || 'typescript',
      automaticLayout: true,
      minimap: { enabled: false },
      theme: 'vs-dark',
    });

    this.changeSub = ed.onDidChangeModelContent(() => {
      const current = ed.getValue() ?? '';
      if (current !== (this.value() ?? '')) {
        this.value.set(current);
      }
    });

    this.editor.set(ed);
  }

  private teardown(): void {
    try {
      this.changeSub?.dispose();
      this.editor()?.dispose();
    } finally {
      this.changeSub = null;
      this.editor.set(null);
    }
  }

  private waitForMonaco(onReady: () => void): void {
    const check = () => {
      if (window.monaco?.editor) {
        onReady();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  }
}
