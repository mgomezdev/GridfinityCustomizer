import type { BOMItem } from '../types/gridfinity';

export function generateFilename(layoutName?: string): string {
  if (layoutName && layoutName.trim()) {
    const slug = layoutName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${slug}.pdf`;
  }
  const date = new Date().toISOString().slice(0, 10);
  return `gridfinity-${date}.pdf`;
}

export function getOrientation(gridX: number, gridY: number): 'l' | 'p' {
  return gridX > gridY ? 'l' : 'p';
}

function formatCustomizationText(item: BOMItem): string {
  if (!item.customization) return '';
  const parts: string[] = [];
  if (item.customization.wallPattern !== 'none') parts.push(item.customization.wallPattern);
  if (item.customization.lipStyle !== 'normal') parts.push(`lip: ${item.customization.lipStyle}`);
  if (item.customization.fingerSlide !== 'none') parts.push(`slide: ${item.customization.fingerSlide}`);
  if (item.customization.wallCutout !== 'none') parts.push(`cutout: ${item.customization.wallCutout}`);
  return parts.join(', ');
}

export function formatBomRows(items: BOMItem[]): string[][] {
  return items.map(item => [
    item.name,
    `${item.widthUnits}×${item.heightUnits}`,
    String(item.quantity),
    formatCustomizationText(item),
  ]);
}
