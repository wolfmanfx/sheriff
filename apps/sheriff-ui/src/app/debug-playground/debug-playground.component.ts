import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStore } from '../api/store';
import { OrgChartDiagramComponent } from '../module-renderer/org-chart-diagram.component';
import { PreviewPanelComponent } from '../shared/preview-panel.component';
import { toFolderTreeFromMergedTree } from '../shared/to-folder-tree-from-merged-tree';
import { FolderNode } from '../module-renderer/+state/models/folder-node';

/**
 * Debug Playground Component
 * Provides a debug interface for testing Sheriff configuration and analysis
 */
@Component({
  selector: 'app-debug-playground',
  standalone: true,
  imports: [
    CommonModule,
    OrgChartDiagramComponent,
    PreviewPanelComponent,
  ],
  styles: [`
    .split-view-container {
      display: flex;
      height: 600px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .asset-panel-left {
      width: 40%;
      display: flex;
      flex-direction: column;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    :host-context([data-theme="dark"]) .asset-panel-left {
      background: rgb(30, 41, 59);
      border-color: #334155;
    }
    .asset-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    :host-context([data-theme="dark"]) .asset-header {
      border-bottom-color: #334155;
      background: rgb(30, 41, 59);
    }
    .asset-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }
    :host-context([data-theme="dark"]) .asset-header h2 {
      color: #e2e8f0;
    }
    .asset-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }
    .asset-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-bottom: 0.25rem;
    }
    .asset-item:hover {
      background: #f3f4f6;
    }
    :host-context([data-theme="dark"]) .asset-item:hover {
      background: rgb(51, 65, 85);
    }
    .asset-item.active {
      background: #dbeafe;
      border: 1px solid #93c5fd;
    }
    :host-context([data-theme="dark"]) .asset-item.active {
      background: rgba(99, 102, 241, 0.2);
      border-color: #6366f1;
    }
    .asset-icon {
      font-size: 1.25rem;
    }
    .asset-name {
      flex: 1;
      font-weight: 500;
      color: #1f2937;
    }
    :host-context([data-theme="dark"]) .asset-name {
      color: #e2e8f0;
    }
    .asset-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .asset-badge.valid {
      background: #d1fae5;
      color: #065f46;
    }
    :host-context([data-theme="dark"]) .asset-badge.valid {
      background: rgba(6, 95, 70, 0.3);
      color: #6ee7b7;
    }
    .asset-badge.invalid {
      background: #fee2e2;
      color: #991b1b;
    }
    :host-context([data-theme="dark"]) .asset-badge.invalid {
      background: rgba(153, 27, 27, 0.3);
      color: #fca5a5;
    }
  `],
  template: `
    <section class="w-full">
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <label class="text-sm font-medium text-gray-700 whitespace-nowrap">Root:</label>
        <code class="text-xs bg-white px-3 py-2 rounded border border-gray-300 flex-1 min-w-[240px] break-all">{{ store.cwd() }}</code>
        <button class="btn btn-sm whitespace-nowrap" (click)="checkFolder()">Reload</button>
        @if (store.showAssetView()) {
          <button class="btn btn-secondary btn-sm whitespace-nowrap" (click)="store.toggleAssetView()">Close preview</button>
        } @else {
          <button class="btn btn-primary btn-sm whitespace-nowrap" (click)="store.toggleAssetView()">View Assets</button>
        }
      </div>

      @if (store.showAssetView()) {
        <div class="split-view-container">
          <!-- Left Panel: 40% - Asset List -->
          <div class="asset-panel-left">
            <div class="asset-header">
              <h2>Assets</h2>
              <button class="btn btn-secondary" (click)="store.toggleAssetView()">Close</button>
            </div>

            <div class="asset-list">
              <div class="asset-item"
                   [class.active]="store.selectedAsset()?.name === 'sheriff.config.ts'"
                   (click)="selectConfigAsset()">
                <span class="asset-icon">📄</span>
                <span class="asset-name">sheriff.config.ts</span>
                @if (store.configValid()) {
                  <span class="asset-badge valid">✓ Valid</span>
                } @else if (store.configErrors().length > 0) {
                  <span class="asset-badge invalid">✗ {{ store.configErrors().length }} error(s)</span>
                }
              </div>

              @if (store.configValid() && store.merged()) {
                <div class="asset-item"
                     [class.active]="store.selectedAsset()?.name === 'org-chart.json'"
                     (click)="selectOrgChartAsset()">
                  <span class="asset-icon">📊</span>
                  <span class="asset-name">org-chart.json</span>
                </div>
              }
            </div>
          </div>

          <app-preview-panel
            [mergedTree]="mergedTree()"
            (onSaveRequested)="saveConfig()"
            (onInitDefaultRequested)="initDefaultConfig()"
            (onPreviewOrgChartRequested)="previewOrgChart()"
            (onCloseRequested)="closeCanvas()">
          </app-preview-panel>
        </div>
      } @else {
        @if (store.missingConfig()) {
          <div class="mb-2 text-red-700">
            No sheriff.config.ts found in current folder.
          </div>
        }

        @if (store.configValid()) {
          <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded">
            <div class="flex items-center gap-2">
              <span class="text-green-700">✓ Config is valid</span>
              <button class="btn btn-sm" (click)="previewOrgChart()">Preview Org Chart</button>
            </div>
          </div>
        } @else if (store.configErrors().length > 0) {
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <div class="text-red-700 font-semibold mb-2">Config Validation Errors:</div>
            @for (error of store.configErrors(); track $index) {
              <div class="text-red-600 text-sm">{{ error }}</div>
            }
          </div>
        }

        <section class="w-full min-w-[320px]">
          <h2>Analyze</h2>
          <div class="flex gap-2 items-center">
            <label for="entry">Entry file:</label>
            <input id="entry" type="text" [value]="store.entry()" (input)="onEntryInput($event)" placeholder="src/main.ts" />
            <button class="btn btn-secondary" (click)="analyzeMerged()">Run (merged)</button>
          </div>

          @if (mergedTree()) {
            <app-org-chart-diagram class="w-full" [tree]="mergedTree()"></app-org-chart-diagram>
          }
        </section>
      }
    </section>
  `,
})
export class DebugPlaygroundComponent {
  protected store = inject(AppStore);

  mergedTree = computed((): FolderNode | null => {
    const merged = this.store.merged();
    return toFolderTreeFromMergedTree(
      typeof merged === 'object' ? merged : undefined,
    );
  });

  constructor() {
    this.store.initFromEnv();
    this.store.loadConfig();
  }

  checkFolder(): void {
    this.store.loadConfig();
  }

  saveConfig(): void {
    this.store.saveConfig();
  }

  initDefaultConfig(): void {
    this.store.initDefaultConfig();
  }

  analyzeMerged(): void {
    this.store.analyzeMerged();
  }

  onEntryInput(event: Event): void {
    this.store.onEntryInput(event);
  }

  selectConfigAsset(): void {
    this.store.selectAsset({
      name: 'sheriff.config.ts',
      content: this.store.config(),
      type: 'typescript',
    });
  }

  selectOrgChartAsset(): void {
    this.store.selectAsset({
      name: 'org-chart.json',
      content: '',
      type: 'json',
    });
  }

  previewOrgChart(): void {
    if (!this.store.merged()) {
      this.analyzeMerged();
      setTimeout(() => {
        if (!this.store.showAssetView()) {
          this.store.toggleAssetView();
        }
        this.selectOrgChartAsset();
      }, 1000);
    } else {
      if (!this.store.showAssetView()) {
        this.store.toggleAssetView();
      }
      this.selectOrgChartAsset();
    }
  }

  closeCanvas(): void {
    this.store.selectAsset(null);
    this.store.toggleAssetView();
  }
}

