import type { RectConfig } from 'konva/lib/shapes/Rect';
import type { TextConfig } from 'konva/lib/shapes/Text';
import type { OrgChartConfig } from '../../+state/models/org-chart-config';
import type { FolderNode } from '../../+state/models/folder-node';
import { measureTextWidth } from './measure-text-width';

type TagsCfg = {
  tags: Pick<
    OrgChartConfig['tags'],
    | 'paddingX'
    | 'startOffsetY'
    | 'lineHeight'
    | 'fontSize'
    | 'pillPaddingX'
    | 'pillPaddingXLeft'
    | 'pillPaddingXRight'
    | 'pillPaddingY'
    | 'pillRadius'
    | 'palette'
    | 'defaultFill'
    | 'gapY'
  >;
};

export function buildTags(
  node: FolderNode,
  position: { x: number; y: number },
  cfg: TagsCfg,
): Array<{ bg: RectConfig; label: TextConfig }> {
  const tags = node.tags || [];
  const tagsCfg: Array<{ bg: RectConfig; label: TextConfig }> = [];
  for (let i = 0; i < tags.length; i++) {
    const label = tags[i];
    const palette = cfg.tags.palette;
    const colorKey = Object.keys(palette).find((k) => label.startsWith(k));
    const bgFill = colorKey ? (palette as Record<string, string>)[colorKey] : cfg.tags.defaultFill;
    const tx = position.x + cfg.tags.paddingX;
    const ty = position.y + cfg.tags.startOffsetY + i * (cfg.tags.lineHeight + cfg.tags.gapY);
    const padXLeft = cfg.tags.pillPaddingXLeft !== undefined ? cfg.tags.pillPaddingXLeft : cfg.tags.pillPaddingX;
    const padXRight = cfg.tags.pillPaddingXRight !== undefined ? cfg.tags.pillPaddingXRight : cfg.tags.pillPaddingX;
    const padY = cfg.tags.pillPaddingY;
    const fontSize = cfg.tags.fontSize;
    const labelCfg: TextConfig = {
      x: tx + padXLeft,
      y: ty,
      text: label,
      fill: '#ffffff',
      fontSize,
    };
    const textWidth = measureTextWidth(label, fontSize);
    const bgCfg: RectConfig = {
      x: tx,
      y: ty - padY,
      width: textWidth + padXLeft + padXRight,
      height: cfg.tags.lineHeight,
      fill: bgFill,
      cornerRadius: cfg.tags.pillRadius,
    };
    tagsCfg.push({ bg: bgCfg, label: labelCfg });
  }
  return tagsCfg;
}


