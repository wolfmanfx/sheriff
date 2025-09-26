import { Component, input } from '@angular/core';
import { MarkdownComponent, provideMarkdown } from 'ngx-markdown';

@Component({
  selector: 'app-markdown-viewer',
  standalone: true,
  imports: [MarkdownComponent],
  providers: [provideMarkdown()],
  template: `
    <markdown [data]="content()" class="markdown-viewer"></markdown>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .markdown-viewer {
        color: inherit;
        /* Design tokens */
        --markdown-border-color: rgba(148, 163, 184, 0.4);
        --markdown-code-bg: rgba(255, 255, 255, 0.1);
        --markdown-pre-bg: rgba(255, 255, 255, 0.06);
        --markdown-table-header-bg: rgba(148, 163, 184, 0.1);
        --markdown-spacing-xs: 0.25rem;
        --markdown-spacing-sm: 0.5rem;
        --markdown-spacing-md: 1rem;
        --markdown-spacing-lg: 1.5rem;
        --markdown-border-radius-sm: 3px;
        --markdown-border-radius-md: 5px;
        --markdown-code-font-size: 0.875em;
        /* Typography */
        --markdown-line-height-body: 1.6;
        --markdown-line-height-heading: 1.25;
      }

      /* Paragraphs - optimal readability */
      .markdown-viewer :deep(p) {
        margin: var(--markdown-spacing-md) 0;
        line-height: var(--markdown-line-height-body);
      }

      .markdown-viewer :deep(p:first-child) {
        margin-top: 0;
      }

      .markdown-viewer :deep(p:last-child) {
        margin-bottom: 0;
      }

      /* Headings - hierarchical typography with proper spacing */
      .markdown-viewer :deep(h1),
      .markdown-viewer :deep(h2),
      .markdown-viewer :deep(h3),
      .markdown-viewer :deep(h4),
      .markdown-viewer :deep(h5),
      .markdown-viewer :deep(h6) {
        font-weight: 600;
        line-height: var(--markdown-line-height-heading);
        margin-top: var(--markdown-spacing-lg);
        margin-bottom: var(--markdown-spacing-sm);
      }

      .markdown-viewer :deep(h1:first-child),
      .markdown-viewer :deep(h2:first-child),
      .markdown-viewer :deep(h3:first-child),
      .markdown-viewer :deep(h4:first-child),
      .markdown-viewer :deep(h5:first-child),
      .markdown-viewer :deep(h6:first-child) {
        margin-top: 0;
      }

      .markdown-viewer :deep(h1) {
        font-size: 2rem;
        margin-top: 0;
      }

      .markdown-viewer :deep(h2) {
        font-size: 1.5rem;
      }

      .markdown-viewer :deep(h3) {
        font-size: 1.25rem;
      }

      .markdown-viewer :deep(h4) {
        font-size: 1.125rem;
      }

      .markdown-viewer :deep(h5),
      .markdown-viewer :deep(h6) {
        font-size: 1rem;
      }

      /* Code - inline code styling */
      .markdown-viewer :deep(code) {
        background-color: var(--markdown-code-bg);
        padding: var(--markdown-spacing-xs) var(--markdown-spacing-sm);
        border-radius: var(--markdown-border-radius-sm);
        font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
        font-size: var(--markdown-code-font-size);
        font-weight: 400;
      }

      /* Code blocks - preformatted code */
      .markdown-viewer :deep(pre) {
        background-color: var(--markdown-pre-bg);
        padding: var(--markdown-spacing-md);
        border-radius: var(--markdown-border-radius-md);
        overflow-x: auto;
        margin: var(--markdown-spacing-md) 0;
        line-height: var(--markdown-line-height-body);
      }

      .markdown-viewer :deep(pre code) {
        background-color: transparent;
        padding: 0;
        display: block;
        font-size: inherit;
        border-radius: 0;
        word-wrap: break-word;
        white-space: pre-wrap;
      }

      /* Lists - consistent spacing */
      .markdown-viewer :deep(ul),
      .markdown-viewer :deep(ol) {
        margin: var(--markdown-spacing-md) 0;
        padding-left: var(--markdown-spacing-lg);
      }

      .markdown-viewer :deep(li) {
        margin: var(--markdown-spacing-xs) 0;
        line-height: var(--markdown-line-height-body);
      }

      .markdown-viewer :deep(li > p) {
        margin-top: var(--markdown-spacing-sm);
        margin-bottom: var(--markdown-spacing-sm);
      }

      .markdown-viewer :deep(ul ul),
      .markdown-viewer :deep(ol ol),
      .markdown-viewer :deep(ul ol),
      .markdown-viewer :deep(ol ul) {
        margin-top: var(--markdown-spacing-xs);
        margin-bottom: var(--markdown-spacing-xs);
      }

      /* Blockquotes - emphasis styling */
      .markdown-viewer :deep(blockquote) {
        border-left: 3px solid var(--markdown-border-color);
        padding-left: var(--markdown-spacing-md);
        margin: var(--markdown-spacing-md) 0;
        font-style: italic;
        color: inherit;
      }

      .markdown-viewer :deep(blockquote p) {
        margin-top: var(--markdown-spacing-sm);
        margin-bottom: var(--markdown-spacing-sm);
      }

      .markdown-viewer :deep(blockquote p:first-child) {
        margin-top: 0;
      }

      .markdown-viewer :deep(blockquote p:last-child) {
        margin-bottom: 0;
      }

      /* Links - accessible and interactive */
      .markdown-viewer :deep(a) {
        color: inherit;
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .markdown-viewer :deep(a:hover) {
        opacity: 0.8;
      }

      .markdown-viewer :deep(a:focus-visible) {
        outline: 2px solid currentColor;
        outline-offset: 2px;
        border-radius: var(--markdown-border-radius-sm);
      }

      /* Tables - readable and structured */
      .markdown-viewer :deep(table) {
        border-collapse: collapse;
        width: 100%;
        margin: var(--markdown-spacing-md) 0;
        display: table;
        table-layout: auto;
      }

      .markdown-viewer :deep(table th),
      .markdown-viewer :deep(table td) {
        border: 1px solid var(--markdown-border-color);
        padding: var(--markdown-spacing-sm);
        text-align: left;
      }

      .markdown-viewer :deep(table th) {
        font-weight: 600;
        background-color: var(--markdown-table-header-bg);
      }

      /* Horizontal rules */
      .markdown-viewer :deep(hr) {
        border: none;
        border-top: 1px solid var(--markdown-border-color);
        margin: var(--markdown-spacing-lg) 0;
      }

      /* Images - responsive and contained */
      .markdown-viewer :deep(img) {
        max-width: 100%;
        height: auto;
        margin: var(--markdown-spacing-md) 0;
        border-radius: var(--markdown-border-radius-sm);
      }

      /* Strong and emphasis */
      .markdown-viewer :deep(strong) {
        font-weight: 600;
      }

      .markdown-viewer :deep(em) {
        font-style: italic;
      }
    `,
  ],
})
export class MarkdownViewerComponent {
  content = input<string>('');
}
