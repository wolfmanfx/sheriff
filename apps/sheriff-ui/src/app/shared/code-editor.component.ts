import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import { ThemeService } from '../core/theme.service';

type Editor = CodeMirror.Editor;

/**
 * CodeMirror-based code editor component for editing Sheriff configuration files.
 * Provides syntax highlighting, line numbers, and automatic resize handling.
 */
@Component({
  selector: 'app-code-editor',
  standalone: true,
  template: `<div #container class="editor-root w-full border border-slate-200 dark:border-slate-700 rounded"></div>`,
  styles: [`
    :host {
      display: block;
      flex: 1 1 0;
      min-height: 0;
      width: 100%;
      height: 100%;
      position: relative;
    }
    .editor-root {
      position: absolute;
      inset: 0;
    }
    .editor-root :global(.CodeMirror) {
      height: 100% !important;
      font-size: 14px;
    }
  `],
})
export class CodeEditorComponent {
  private container = viewChild.required<ElementRef<HTMLElement>>('container');
  private themeService = inject(ThemeService);

  value = input<string>('');
  language = input<string>('typescript');
  valueChange = output<string>();

  private editor = signal<Editor | null>(null);
  private changeHandler: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isDestroyed = false;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      setTimeout(() => {
        if (!this.isDestroyed) this.initEditor();
      }, 100);
    });

    effect(() => {
      const ed = this.editor();
      if (!ed || this.isDestroyed) return;
      const next = this.value();
      if (next !== ed.getValue()) {
        ed.setValue(next ?? '');
      }
    });

    effect(() => {
      const ed = this.editor();
      if (!ed || this.isDestroyed) return;
      const theme = this.themeService.theme();
      ed.setOption('theme', theme === 'dark' ? 'material-darker' : 'default');
    });

    destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      this.teardown();
    });
  }

  private initEditor(): void {
    if (this.isDestroyed || this.editor()) return;

    const el = this.container()?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      const observer = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0 && !this.editor() && !this.isDestroyed) {
          observer.disconnect();
          this.createEditor(el);
        }
      });
      observer.observe(el);
      return;
    }

    this.createEditor(el);
  }

  private createEditor(el: HTMLElement): void {
    if (this.isDestroyed || this.editor()) return;

    const ed = CodeMirror(el, {
      value: this.value() ?? '',
      mode: 'javascript',
      theme: this.themeService.theme() === 'dark' ? 'material-darker' : 'default',
      lineNumbers: true,
      indentUnit: 2,
      tabSize: 2,
      lineWrapping: true,
    });

    ed.setSize('100%', '100%');

    this.changeHandler = () => {
      if (this.isDestroyed) return;
      const current = ed.getValue();
      if (current !== this.value()) {
        this.valueChange.emit(current);
      }
    };
    ed.on('change', this.changeHandler);

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.isDestroyed) ed.refresh();
    });
    this.resizeObserver.observe(el);

    this.editor.set(ed);
  }

  private teardown(): void {
    this.resizeObserver?.disconnect();
    const ed = this.editor();
    if (ed) {
      if (this.changeHandler) ed.off('change', this.changeHandler);
      const wrapper = ed.getWrapperElement();
      wrapper.parentNode?.removeChild(wrapper);
    }
    this.resizeObserver = null;
    this.changeHandler = null;
    this.editor.set(null);
  }
}
