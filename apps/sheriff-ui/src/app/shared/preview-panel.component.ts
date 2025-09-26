import { Component, inject, input, output, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { AppStore } from '../api/store';
import { OrgChartDiagramComponent } from '../module-renderer/org-chart-diagram.component';
import { CodeEditorComponent } from './code-editor.component';
import { StateMachineDiagramComponent } from './state-machine-diagram.component';
import { FolderNode } from '../module-renderer/+state/models/folder-node';
import { ThemeService } from '../core/theme.service';
import { ORG_CHART_DEFAULT_CONFIG, ORG_CHART_DARK_CONFIG } from '../module-renderer/+state/models/org-chart-config';

/**
 * Preview Panel Component
 * Displays asset previews (config editor, org chart, generic assets) in a side panel
 */
@Component({
  selector: 'app-preview-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OrgChartDiagramComponent, CodeEditorComponent, StateMachineDiagramComponent],
  styles: [`
    .preview-panel-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      background: white;
      overflow: hidden;
    }
    :host-context([data-theme="dark"]) .preview-panel-container {
      background: rgb(15, 23, 42);
    }
    .preview-panel-header {
      flex-shrink: 0;
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    :host-context([data-theme="dark"]) .preview-panel-header {
      border-bottom-color: #334155;
      background: rgb(30, 41, 59);
    }
    .root-url-input-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
    }
    .root-url-icon {
      flex-shrink: 0;
      color: #6b7280;
    }
    :host-context([data-theme="dark"]) .root-url-icon {
      color: #94a3b8;
    }
    .root-url-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      color: #374151;
      transition: all 0.2s;
    }
    :host-context([data-theme="dark"]) .root-url-input {
      background: rgb(30, 41, 59);
      border-color: #475569;
      color: #e2e8f0;
    }
    .root-url-input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    :host-context([data-theme="dark"]) .root-url-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }
    .root-url-input::placeholder {
      color: #9ca3af;
    }
    :host-context([data-theme="dark"]) .root-url-input::placeholder {
      color: #64748b;
    }
    .root-url-activate-button {
      flex-shrink: 0;
      padding: 0.5rem 1rem;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    :host-context([data-theme="dark"]) .root-url-activate-button {
      background: #6366f1;
    }
    .root-url-activate-button:hover {
      background: #1d4ed8;
    }
    :host-context([data-theme="dark"]) .root-url-activate-button:hover {
      background: #818cf8;
    }
    .root-url-activate-button:active {
      background: #1e40af;
    }
    :host-context([data-theme="dark"]) .root-url-activate-button:active {
      background: #4f46e5;
    }
    .preview-panel-tabs {
      flex-shrink: 0;
      display: flex;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    :host-context([data-theme="dark"]) .preview-panel-tabs {
      border-bottom-color: #334155;
      background: rgb(30, 41, 59);
    }
    .preview-tab {
      flex: 1;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
      transition: all 0.2s;
    }
    :host-context([data-theme="dark"]) .preview-tab {
      color: #94a3b8;
    }
    .preview-tab:hover {
      background: #f3f4f6;
      color: #374151;
    }
    :host-context([data-theme="dark"]) .preview-tab:hover {
      background: rgb(51, 65, 85);
      color: #e2e8f0;
    }
    .preview-tab.active {
      color: #2563eb;
      border-bottom-color: #2563eb;
      background: white;
    }
    :host-context([data-theme="dark"]) .preview-tab.active {
      color: #818cf8;
      border-bottom-color: #818cf8;
      background: rgb(15, 23, 42);
    }
    .preview-panel-content {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .preview-tab-panel {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .preview-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 2rem;
      color: #6b7280;
      font-size: 0.875rem;
      text-align: center;
    }
    :host-context([data-theme="dark"]) .preview-empty-state {
      color: #94a3b8;
    }
    .config-editor-container {
      display: flex;
      flex-direction: column;
      flex: 1 1 0;
      min-height: 0;
      overflow: hidden;
    }
    .config-editor-actions {
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
      gap: 0.5rem;
    }
    :host-context([data-theme="dark"]) .config-editor-actions {
      border-top-color: #334155;
      background: rgb(30, 41, 59);
    }
    .valid-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      background: #d1fae5;
      color: #065f46;
    }
    :host-context([data-theme="dark"]) .valid-badge {
      background: rgba(6, 95, 70, 0.3);
      color: #6ee7b7;
    }
    .invalid-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      background: #fee2e2;
      color: #991b1b;
    }
    :host-context([data-theme="dark"]) .invalid-badge {
      background: rgba(153, 27, 27, 0.3);
      color: #fca5a5;
    }
    .config-errors {
      flex-shrink: 0;
      padding: 1rem;
      background: #fef2f2;
      border-bottom: 1px solid #fee2e2;
    }
    :host-context([data-theme="dark"]) .config-errors {
      background: rgba(127, 29, 29, 0.2);
      border-bottom-color: rgba(153, 27, 27, 0.3);
    }
    .error-item {
      padding: 0.5rem;
      color: #991b1b;
      font-size: 0.875rem;
    }
    :host-context([data-theme="dark"]) .error-item {
      color: #fca5a5;
    }
    .asset-code-editor {
      flex: 1 1 0;
      min-height: 0;
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .org-chart-canvas {
      flex: 1;
      min-height: 400px;
      overflow: hidden;
    }
    .canvas-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #6b7280;
      font-size: 1rem;
    }
    :host-context([data-theme="dark"]) .canvas-placeholder {
      color: #94a3b8;
    }
  `],
  template: `
    <div class="preview-panel-container">
      <!-- Root URL Header -->
      <div class="preview-panel-header">
        <div class="root-url-input-container">
          <svg class="w-4 h-4 root-url-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <input
            type="text"
            [formControl]="rootUrlInput"
            class="root-url-input"
            placeholder="Enter root directory path..."
            (keydown.enter)="onRootUrlActivate()"
          />
          <button
            type="button"
            class="root-url-activate-button"
            (click)="onRootUrlActivate()"
            title="Activate graph and load sheriff config"
          >
            Activate
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="preview-panel-tabs">
        <button
          type="button"
          class="preview-tab"
          [class.active]="store.previewTab() === 'graph'"
          (click)="onGraphTabClick()"
        >
          Graph
        </button>
        <button
          type="button"
          class="preview-tab"
          [class.active]="store.previewTab() === 'config'"
          (click)="onConfigTabClick()"
        >
          Config
        </button>
        <button
          type="button"
          class="preview-tab"
          [class.active]="store.previewTab() === 'session'"
          (click)="onSessionTabClick()"
        >
          Session
        </button>
      </div>

      <!-- Tab Content -->
      <div class="preview-panel-content">
        @if (store.previewTab() === 'graph') {
          <div class="preview-tab-panel">
            @if (mergedTree()) {
              <div class="org-chart-canvas">
                <app-org-chart-diagram class="w-full h-full" [tree]="mergedTree()" [config]="chartConfig()"></app-org-chart-diagram>
              </div>
            } @else {
              <div class="preview-empty-state">
                <p>No graph data available. Enter a root directory path above and click "Activate" to load the graph.</p>
              </div>
            }
          </div>
        } @else if (store.previewTab() === 'session') {
          <div class="preview-tab-panel">
            @if (sessionData()) {
              <div class="p-4 space-y-4">
                <div>
                  <h3 class="text-sm font-semibold text-slate-700 mb-3">State Machine</h3>
                  <app-state-machine-diagram [currentState]="sessionData()?.state"></app-state-machine-diagram>
                </div>
                <div>
                  <div class="mb-3 flex items-center gap-2">
                    <span class="text-sm font-semibold text-slate-700">Current State:</span>
                    <span class="px-2 py-1 text-xs font-medium rounded-full" [class]="getStateBadgeClasses(sessionData()?.state)">
                      {{ sessionData()?.state }}
                    </span>
                  </div>
                  <pre class="m-0 p-3 rounded-lg bg-slate-900/5 border border-slate-400/20 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{{ sessionData() | json }}</pre>
                </div>
              </div>
            } @else {
              <div class="preview-empty-state">
                <p>No session data available.</p>
              </div>
            }
          </div>
        } @else {
          <div class="preview-tab-panel">
            @if (store.missingConfig()) {
              <div class="preview-empty-state">
                <p class="text-red-700 mb-4">No sheriff.config.ts found in current folder.</p>
                <button class="btn btn-primary" (click)="onInitDefault()">Create default config</button>
              </div>
            } @else {
              <div class="config-editor-container">
                @if (store.configErrors().length > 0) {
                  <div class="config-errors">
                    @for (error of store.configErrors(); track $index) {
                      <div class="error-item">{{ error }}</div>
                    }
                  </div>
                }
                @if (store.previewTab() === 'config' && store.config() !== undefined) {
                  <app-code-editor
                    class="asset-code-editor"
                    [value]="store.config() || ''"
                    [language]="'typescript'"
                    (valueChange)="store.setConfig($event)">
                  </app-code-editor>
                } @else if (store.config() === undefined) {
                  <div class="preview-empty-state">
                    <p>Loading config...</p>
                  </div>
                }
                <div class="config-editor-actions">
                  <div class="flex items-center gap-2">
                    @if (store.configValid()) {
                      <span class="valid-badge">✓ Valid</span>
                    } @else if (store.configErrors().length > 0) {
                      <span class="invalid-badge">✗ {{ store.configErrors().length }} error(s)</span>
                    }
                  </div>
                  <div class="flex gap-2">
                    <button class="btn btn-secondary" (click)="onInitDefault()">Create default config</button>
                    <button class="btn" (click)="onSave()">Save</button>
                    @if (store.configValid()) {
                      <button class="btn btn-primary" (click)="onPreview()">Preview</button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  host: {
    class: 'w-full h-full',
  },
})
export class PreviewPanelComponent {
  protected store = inject(AppStore);
  private themeService = inject(ThemeService);
  protected chartConfig = computed(() =>
    this.themeService.theme() === 'dark' ? ORG_CHART_DARK_CONFIG : ORG_CHART_DEFAULT_CONFIG
  );

  readonly mergedTree = input.required<FolderNode | null>();
  readonly sessionData = input<any>(null);

  readonly onSaveRequested = output<void>();
  readonly onInitDefaultRequested = output<void>();
  readonly onPreviewOrgChartRequested = output<void>();
  readonly onCloseRequested = output<void>();

  rootUrlInput = new FormControl('');

  constructor() {
    // Sync store.cwd() with input value
    effect(() => {
      const cwd = this.store.cwd();
      if (this.rootUrlInput.value !== cwd) {
        this.rootUrlInput.setValue(cwd || '', { emitEvent: false });
      }
    });
  }

  protected onSave(): void {
    this.onSaveRequested.emit();
  }

  protected onInitDefault(): void {
    this.onInitDefaultRequested.emit();
  }

  protected onPreview(): void {
    this.onPreviewOrgChartRequested.emit();
  }

  protected onRootUrlActivate(): void {
    const newCwd = this.rootUrlInput.value?.trim() || '';
    if (newCwd) {
      this.store.setCwd(newCwd);
    }
    // Always load config when activating
    this.store.loadConfig();
    // Always refresh the graph when activating (clear and re-analyze)
    this.store.clearMerged();
    void this.store.analyzeMerged();
    // Switch to config tab to show the loaded config
    this.store.setPreviewTab('config');
  }

  protected onGraphTabClick(): void {
    this.store.setPreviewTab('graph');
    // Reload graph data from server when switching to graph tab
    if (this.store.cwd()) {
      this.store.clearMerged();
      void this.store.analyzeMerged();
    }
  }

  protected onConfigTabClick(): void {
    this.store.setPreviewTab('config');
    // Load config if not already loaded
    if (!this.store.config() && !this.store.missingConfig()) {
      this.store.loadConfig();
    }
  }

  protected onSessionTabClick(): void {
    this.store.setPreviewTab('session');
  }

  protected getStateBadgeClasses(state?: string): string {
    switch (state) {
      case 'INIT':
        return 'bg-blue-100 text-blue-700';
      case 'STRUCTURE':
        return 'bg-purple-100 text-purple-700';
      case 'DEPENDENCY_RULES':
        return 'bg-orange-100 text-orange-700';
      case 'DONE':
        return 'bg-green-100 text-green-700';
      default:
        return '';
    }
  }
}

