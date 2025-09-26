import {
  Component,
  input,
  viewChild,
  afterNextRender,
  inject,
  HostListener,
  effect,
  DestroyRef,
} from '@angular/core';
import { StageComponent, CoreShapeComponent } from 'ng2-konva';
import {
  ORG_CHART_DEFAULT_CONFIG,
  type OrgChartConfig,
} from './+state/models/org-chart-config';
import { CanvasWheelZoomDirective } from './canvas-wheel-zoom.directive';
import { RenderStore } from './+state/render.store';
import { FolderNode } from './+state/models/folder-node';

@Component({
  selector: 'app-org-chart-diagram',
  standalone: true,
  imports: [StageComponent, CoreShapeComponent, CanvasWheelZoomDirective],
  templateUrl: './org-chart-diagram.component.html',
  providers: [RenderStore],
})
export class OrgChartDiagramComponent {
  private stageCmp = viewChild(StageComponent);
  tree = input<FolderNode | null>(null);
  expandDepth = input<number>(1);
  config = input<Partial<OrgChartConfig>>(ORG_CHART_DEFAULT_CONFIG);
  protected render = inject(RenderStore);

  stage: { width: number; height: number; draggable: boolean } = {
    width:
      this.config().stage?.initial.width ??
      ORG_CHART_DEFAULT_CONFIG.stage.initial.width,
    height:
      this.config().stage?.initial.height ??
      ORG_CHART_DEFAULT_CONFIG.stage.initial.height,
    draggable: true,
  };

  constructor() {
    afterNextRender(() => {
      const stage = this.stageCmp()?.getStage?.();
      if (!stage) return;
      console.log('[OrgChart] afterNextRender: stage ready');
      this.onWindowResize();
      this.render['load'](this.config(), this.tree(), this.expandDepth());
    });
    const destroyRef = inject(DestroyRef);
    const stop = effect(() => {
      const cfg = this.config();
      const tr = this.tree();
      const exp = this.expandDepth();
      this.render['load'](cfg, tr, exp);
    });
    destroyRef.onDestroy(() => stop.destroy());
  }

  onBackgroundClick(e: unknown) {
    const evt = e as { target?: { getClassName?: () => string } };
    const className = evt.target?.getClassName?.() ?? '';
    // Only clear selection if the user clicked on the Stage or Layer (not shapes)
    if (className === 'Stage' || className === 'Layer') {
      this.render['clearSelection']();
      const stage = this.stageCmp()?.getStage?.();
      stage?.batchDraw();
    }
  }

  onSelectNode(e: unknown, id: string) {
    // Stop bubbling to Stage click handler
    const evt = e as { cancelBubble?: boolean };
    if (evt) evt.cancelBubble = true;
    this.render['toggleSelected'](id);
    const stage = this.stageCmp()?.getStage?.();
    stage?.batchDraw();
  }

  onToggle(e: unknown, id: string) {
    // Stop bubbling to Stage click handler
    const evt = e as { cancelBubble?: boolean };
    if (evt) evt.cancelBubble = true;
    const stage = this.stageCmp()?.getStage?.();
    const pointer = stage?.getPointerPosition?.();

    this.render['toggleCollapsed'](id);

    stage?.batchDraw();

    if (stage && pointer) {
      const { pos, lw, heightById, baseH } = this.render['layout']();
      const p = pos.get(id);
      if (p) {
        const h = heightById.get(id) ?? baseH;
        const toggle = { x: p.x + lw / 2, y: p.y + h };
        const scale = stage.scaleX() || 1;
        const newX = pointer.x - toggle.x * scale;
        const newY = pointer.y - toggle.y * scale;
        stage.position({ x: newX, y: newY });
        stage.batchDraw();
      }
    }
  }

  fit(): void {
    const stage = this.stageCmp()?.getStage?.();
    if (!stage) return;
    console.log('[OrgChart] fit called');
    this.onWindowResize();
    const { pos, lw, heightById, baseH } = this.render['layout']();
    const ids = [...pos.keys()];
    if (ids.length === 0) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const id of ids) {
      const p = pos.get(id)!;
      const h = heightById.get(id) ?? baseH;
      const x1 = p.x,
        y1 = p.y;
      const x2 = p.x + lw,
        y2 = p.y + h;
      if (x1 < minX) minX = x1;
      if (y1 < minY) minY = y1;
      if (x2 > maxX) maxX = x2;
      if (y2 > maxY) maxY = y2;
    }
    const padding =
      this.config().stage?.padding ?? ORG_CHART_DEFAULT_CONFIG.stage.padding;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const viewW = stage.width();
    const viewH = stage.height();
    const scale = Math.min(viewW / contentW, viewH / contentH);
    stage.scale({ x: scale, y: scale });
    const offsetX = (viewW - (maxX - minX) * scale) / 2 - minX * scale;
    const offsetY = (viewH - (maxY - minY) * scale) / 2 - minY * scale;
    stage.position({ x: offsetX, y: offsetY });
    stage.batchDraw();
  }

  zoom(factor: number): void {
    const stage = this.stageCmp()?.getStage?.();
    if (!stage) return;
    console.log('[OrgChart] zoom', factor);
    const oldScale = stage.scaleX() || 1;
    const pointer = stage.getPointerPosition() || {
      x: (stage.width() ?? 1200) / 2,
      y: (stage.height() ?? 700) / 2,
    };
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const newScale = oldScale * factor;
    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
    stage.batchDraw();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const stage = this.stageCmp()?.getStage?.();
    if (!stage) return;
    const container = stage.container();
    const rect = container.getBoundingClientRect();
    const width = rect.width || stage.width();
    const height = rect.height || stage.height();
    if (width !== stage.width() || height !== stage.height()) {
      stage.size({ width, height });
    }
  }
}
