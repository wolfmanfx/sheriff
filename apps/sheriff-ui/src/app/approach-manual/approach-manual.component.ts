import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal, viewChild, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ManualStore } from './+state/manual.store';
import { TagCreatedEvent } from './create-tag-modal.component';
import type { FolderNode } from '../module-renderer/+state/models/folder-node';
import { getStaticTags } from './+state/utils/dep-rules-utils';
import { TagsPanelComponent } from './tags-panel.component';
import { SelectedNodePanelComponent } from './selected-node-panel.component';
import { ModuleChartPanelComponent } from './module-chart-panel.component';
import { DependencyMatrixPanelComponent } from './dependency-matrix-panel.component';
import { CodePreviewPanelComponent } from './code-preview-panel.component';

@Component({
  selector: 'app-approach-manual',
  standalone: true,
  imports: [
    CommonModule,
    TagsPanelComponent,
    SelectedNodePanelComponent,
    ModuleChartPanelComponent,
    DependencyMatrixPanelComponent,
    CodePreviewPanelComponent,
  ],
  templateUrl: './approach-manual.component.html',
})
export class ApproachManualComponent {
  protected manual = inject(ManualStore);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  private chartPanel = viewChild(ModuleChartPanelComponent);
  private validateTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly VALIDATION_DEBOUNCE_MS = 800;

  // UI state signals
  protected matrixCollapsed = signal(false);
  protected chartCollapsed = signal(false);
  protected tagsCollapsed = signal(false);
  protected codePreviewCollapsed = signal(false);
  protected selectedCollapsed = signal(false);

  private tagCreatedHandler = (event: Event): void => {
    const customEvent = event as CustomEvent<TagCreatedEvent>;
    if (customEvent.detail?.tag) {
      this.manual.modifyTag('selected', 'add', customEvent.detail.tag);
    }
  };

  protected tagUsageCount = computed(() => {
    const counts = new Map<string, number>();
    const tree = this.manual.graphTree();
    if (!tree) return counts;

    const walk = (n: FolderNode): void => {
      if (n.isSheriffModule) {
        for (const t of n.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
      }
      for (const c of n.children ?? []) walk(c);
    };

    walk(tree);
    return counts;
  });

  protected detectedTagKinds = computed(() => {
    const tags = this.manual.allTags();
    const kinds = new Set<string>();
    for (const t of tags) {
      const idx = t.indexOf(':');
      if (idx > 0) kinds.add(t.substring(0, idx));
    }
    const sorted = [...kinds].sort();
    if (sorted.length === 0) return ['type', 'domain', 'shared', 'feature', 'scope'];
    return sorted;
  });

  // Compute target modules based on the selected node's tags and draft depRules
  protected computedTargetModules = computed(() => {
    const selectedNode = this.manual.selectedNode();
    if (!selectedNode) return new Set<string>();

    const depRulesRaw = this.manual.depRulesRaw();
    const selectedTags = selectedNode.tags ?? [];

    // Collect all tags that the selected node can access
    const accessibleTags = new Set<string>();
    for (const tag of selectedTags) {
      const rule = depRulesRaw?.[tag];
      const canAccess = rule ? getStaticTags(rule) : [];
      for (const t of canAccess) {
        accessibleTags.add(t);
      }
    }

    // Find all modules that have any of the accessible tags
    const tree = this.manual.graphTree();
    if (!tree) return new Set<string>();

    const targetIds = new Set<string>();
    const findNodes = (node: FolderNode): void => {
      const nodeTags = node.tags ?? [];
      for (const t of nodeTags) {
        if (accessibleTags.has(t)) {
          targetIds.add(node.id);
          break;
        }
      }
      if (node.children) {
        for (const child of node.children) {
          findNodes(child);
        }
      }
    };
    findNodes(tree);

    return targetIds;
  });

  constructor() {
    window.addEventListener('tagCreated', this.tagCreatedHandler);

    this.manual.init();
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('tagCreated', this.tagCreatedHandler);
      if (this.validateTimeout) {
        clearTimeout(this.validateTimeout);
      }
    });
  }

  // ============================================================
  // EVENT HANDLERS FROM CHILD COMPONENTS
  // ============================================================

  // Tags Panel Events
  protected onTagDragStart(event: { event: DragEvent; tag: string }): void {
    this.manual.setDraggingTag(event.tag);
  }

  protected onTagDragEnd(): void {
    this.manual.setDraggingTag(null);
  }

  protected onOpenNewTagModal(): void {
    const kinds = this.detectedTagKinds();
    this.router.navigate([{ outlets: { popup: ['create-tag'] } }], {
      queryParams: { kinds: JSON.stringify(kinds) },
      queryParamsHandling: 'merge',
    });
  }

  // Selected Node Panel Events
  protected onSelectedAddTag(tag: string): void {
    this.manual.modifyTag('selected', 'add', tag);
  }

  protected onSelectedRemoveTag(tag: string): void {
    this.manual.modifyTag('selected', 'remove', tag);
  }

  // Module Chart Panel Events
  protected onGraphSelectionChange(id: string | null): void {
    this.manual.setSelectedId(id);
  }

  protected onTagRemove(evt: { nodeId: string; tag: string }): void {
    this.manual.modifyTag(evt.nodeId, 'remove', evt.tag);
  }

  protected onTagDropped(evt: { nodeId: string | null; tag: string }): void {
    if (evt.nodeId) {
      this.manual.modifyTag(evt.nodeId, 'add', evt.tag);
    }
    this.manual.setDraggingTag(null);
  }

  protected onFitChart(): void {
    this.chartPanel()?.fitChart();
  }

  protected onRefreshChart(): void {
    this.manual.applyPreview();
  }

  // Dependency Matrix Events
  protected onToggleDepRule(evt: { from: string; to: string }): void {
    this.manual.toggleDepRuleAndRegenerate(evt.from, evt.to);
  }

  // Code Preview Events
  protected onDraftChange(draft: string): void {
    this.manual.setDraft(draft);

    if (this.validateTimeout) {
      clearTimeout(this.validateTimeout);
    }

    this.validateTimeout = setTimeout(() => {
      this.manual.validateDraft();
    }, this.VALIDATION_DEBOUNCE_MS);
  }

  // Header Actions
  protected activate(): void {
    this.manual.init();
  }

  // Collapse toggles
  protected toggleTagsCollapsed(): void {
    this.tagsCollapsed.update((v) => !v);
  }

  protected toggleSelectedCollapsed(): void {
    this.selectedCollapsed.update((v) => !v);
  }

  protected toggleChartCollapsed(): void {
    this.chartCollapsed.update((v) => !v);
  }

  protected toggleMatrixCollapsed(): void {
    this.matrixCollapsed.update((v) => !v);
  }

  protected toggleCodePreviewCollapsed(): void {
    this.codePreviewCollapsed.update((v) => !v);
  }
}
