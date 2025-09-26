import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppStore } from './api/store';
import { OrgChartDiagramComponent } from './module-renderer/org-chart-diagram.component';
import { CodeEditorComponent } from './shared/code-editor.component';
import { toFolderTreeFromMergedTree } from './shared/to-folder-tree-from-merged-tree';
import { FolderNode } from './module-renderer/+state/models/folder-node';
import { toFolderNodesFromMergedTree } from './shared/to-folder-nodes-from-merged-tree';

@Component({
  imports: [RouterModule, OrgChartDiagramComponent, CodeEditorComponent],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected title = 'sheriff-ui';
  protected store = inject(AppStore);
  protected folderOptions: Array<{ label: string; value: string }> = [
    { label: 'Workspace root', value: '' },
    { label: 'Angular IV test project', value: 'test-projects/angular-iv' },
  ];

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

  loadConfig() {
    this.store.loadConfig();
  }

  saveConfig() {
    this.store.saveConfig();
  }

  initDefaultConfig() {
    this.store.initDefaultConfig();
  }

  analyze() {
    this.store.analyze();
  }

  analyzeMerged() {
    this.store.analyzeMerged();
  }

  onConfigInput(event: Event) {
    this.store.onConfigInput(event);
  }

  onEntryInput(event: Event) {
    this.store.onEntryInput(event);
  }

  onFolderSelect(event: Event) {
    this.store.onFolderSelect(event);
  }

  checkFolder() {
    this.store.loadConfig();
  }
}
