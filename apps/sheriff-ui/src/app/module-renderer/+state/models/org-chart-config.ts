export type OrgChartConfig = {
  stage: { initial: { width: number; height: number }; padding: number };
  layout: { nodeWidth: number; hGap: number; vGap: number; safePad: number };
  nodeBox: {
    cornerRadius: number;
    paddingBottom: number;
    fill: string;
    borderColor: string;
    borderWidth: number;
    topBorderColor: string;
    topBorderInset: number;
  };
  sheriffModuleBackgroundColor: string;
  title: {
    paddingX: number;
    offsetY: number;
    offsetYWithTags: number;
    fontSize: number;
    height: number;
    fill: string;
  };
  tags: {
    paddingX: number;
    startOffsetY: number;
    lineHeight: number;
    fontSize: number;
    fill: string;
    pillPaddingX: number;
    pillPaddingXLeft?: number;
    pillPaddingXRight?: number;
    pillPaddingY: number;
    pillRadius: number;
    palette: Record<string, string>;
    defaultFill: string;
    gapY: number;
    endGap: number;
  };
  toggle: {
    radius: number;
    circleFill: string;
    circleStroke: string;
    signFill: string;
    signFontSize: number;
    signFontWeight: string;
    signOffsetX: number;
    signOffsetY: number;
  };
  link: { stroke: string; strokeWidth: number };
  wheel: { scaleBy: number };
};

export const ORG_CHART_DEFAULT_CONFIG: OrgChartConfig = {
  stage: { initial: { width: 1200, height: 1000 }, padding: 40 },
  layout: { nodeWidth: 220, hGap: 40, vGap: 30, safePad: 32 },
  nodeBox: {
    cornerRadius: 10,
    paddingBottom: 12,
    fill: '#ffffff',
    borderColor: '#9ca3af',
    borderWidth: 2,
    topBorderColor: '#4f46e5',
    topBorderInset: 8,
  },
  sheriffModuleBackgroundColor: '#f0f9ff',
  title: { paddingX: 12, offsetY: 10, offsetYWithTags: 6, fontSize: 16, height: 34, fill: '#111827' },
  tags: {
    paddingX: 12,
    startOffsetY: 40,
    lineHeight: 16,
    fontSize: 12,
    fill: '#111827',
    pillPaddingX: 6,
    pillPaddingXLeft: 6,
    pillPaddingXRight: 6,
    pillPaddingY: 2,
    pillRadius: 8,
    palette: {
      'domain': '#10b981',
      'ui': '#6366f1',
      'util': '#f59e0b',
      'shared': '#06b6d4',
      'feature': '#ef4444',
    },
    defaultFill: '#6b7280',
    gapY: 4,
    endGap: 6,
  },
  toggle: {
    radius: 10,
    circleFill: '#ffffff',
    circleStroke: '#9ca3af',
    signFill: '#111827',
    signFontSize: 14,
    signFontWeight: '700',
    signOffsetX: -5,
    signOffsetY: -1,
  },
  link: { stroke: '#9ca3af', strokeWidth: 2 },
  wheel: { scaleBy: 1.1 },
};
