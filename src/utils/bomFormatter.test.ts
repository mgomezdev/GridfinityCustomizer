import { describe, it, expect } from 'vitest';
import {
  formatBOMEmailBody,
  formatBOMSubjectLine,
  buildLayoutExport,
} from './bomFormatter';
import type { GridSummaryData, GridLayoutExport } from './bomFormatter';
import type { BOMItem, PlacedItem, LibraryItem } from '../types/gridfinity';

const mockBOMItems: BOMItem[] = [
  { itemId: 'bins_standard:bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#3B82F6', categories: ['bin'], quantity: 3 },
  { itemId: 'bins_standard:bin-2x1', name: '2x1 Bin', widthUnits: 2, heightUnits: 1, color: '#10B981', categories: ['bin'], quantity: 2 },
  { itemId: 'bins_standard:bin-3x2', name: '3x2 Bin', widthUnits: 3, heightUnits: 2, color: '#EF4444', categories: ['bin'], quantity: 1 },
];

const mockPlacedItems: PlacedItem[] = [
  { instanceId: 'item-1-1000', itemId: 'bins_standard:bin-1x1', x: 0, y: 0, width: 1, height: 1, rotation: 0 },
  { instanceId: 'item-2-1001', itemId: 'bins_standard:bin-1x1', x: 1, y: 0, width: 1, height: 1, rotation: 0 },
  { instanceId: 'item-3-1002', itemId: 'bins_standard:bin-1x1', x: 2, y: 0, width: 1, height: 1, rotation: 90 },
  { instanceId: 'item-4-1003', itemId: 'bins_standard:bin-2x1', x: 0, y: 1, width: 2, height: 1, rotation: 0 },
  { instanceId: 'item-5-1004', itemId: 'bins_standard:bin-2x1', x: 0, y: 2, width: 1, height: 2, rotation: 90 },
  { instanceId: 'item-6-1005', itemId: 'bins_standard:bin-3x2', x: 1, y: 2, width: 3, height: 2, rotation: 0 },
];

const mockLibraryItems: Record<string, LibraryItem> = {
  'bins_standard:bin-1x1': { id: 'bins_standard:bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#3B82F6', categories: ['bin'] },
  'bins_standard:bin-2x1': { id: 'bins_standard:bin-2x1', name: '2x1 Bin', widthUnits: 2, heightUnits: 1, color: '#10B981', categories: ['bin'] },
  'bins_standard:bin-3x2': { id: 'bins_standard:bin-3x2', name: '3x2 Bin', widthUnits: 3, heightUnits: 2, color: '#EF4444', categories: ['bin'] },
};

const mockGetItemById = (id: string): LibraryItem | undefined => mockLibraryItems[id];

const mockLibraryNames = new Map([
  ['bins_standard', 'Standard Bins'],
  ['simple-utensils', 'Simple Utensils'],
]);

const defaultSummary: GridSummaryData = {
  gridX: 4,
  gridY: 4,
  width: 168,
  depth: 168,
  unit: 'metric',
  imperialFormat: 'decimal',
  gapWidth: 0,
  gapDepth: 0,
  spacerConfig: { horizontal: 'none', vertical: 'none' },
};

describe('bomFormatter', () => {
  describe('formatBOMSubjectLine', () => {
    it('should format subject with grid dimensions and total items', () => {
      const subject = formatBOMSubjectLine(4, 4, 6);
      expect(subject).toContain('4x4');
      expect(subject).toContain('6');
      expect(subject).toContain('Gridfinity');
    });

    it('should handle singular item count', () => {
      const subject = formatBOMSubjectLine(2, 3, 1);
      expect(subject).toContain('2x3');
      expect(subject).toContain('1');
    });

    it('should handle zero items', () => {
      const subject = formatBOMSubjectLine(4, 4, 0);
      expect(subject).toContain('4x4');
      expect(subject).toContain('0');
    });
  });

  describe('formatBOMEmailBody', () => {
    it('should include grid size in units', () => {
      const body = formatBOMEmailBody(defaultSummary, mockBOMItems, mockLibraryNames);
      expect(body).toContain('4 x 4');
      expect(body).toContain('units');
    });

    it('should include dimensions with metric unit label', () => {
      const body = formatBOMEmailBody(defaultSummary, mockBOMItems, mockLibraryNames);
      expect(body).toContain('168');
      expect(body).toContain('mm');
    });

    it('should include dimensions with imperial unit label', () => {
      const summary: GridSummaryData = {
        ...defaultSummary,
        unit: 'imperial',
        width: 6.61,
        depth: 6.61,
        gapWidth: 0.0,
        gapDepth: 0.0,
      };
      const body = formatBOMEmailBody(summary, mockBOMItems, mockLibraryNames);
      expect(body).toContain('6.61');
      expect(body).toContain('in');
    });

    it('should group gap and spacer by axis — horizontal line', () => {
      const summary: GridSummaryData = {
        ...defaultSummary,
        gapWidth: 2.5,
        spacerConfig: { horizontal: 'one-sided', vertical: 'none' },
      };
      const body = formatBOMEmailBody(summary, mockBOMItems, mockLibraryNames);
      expect(body).toMatch(/Horizontal:.*2\.5.*mm.*gap.*one-sided.*spacer/);
    });

    it('should group gap and spacer by axis — vertical line', () => {
      const summary: GridSummaryData = {
        ...defaultSummary,
        gapDepth: 3.0,
        spacerConfig: { horizontal: 'none', vertical: 'symmetrical' },
      };
      const body = formatBOMEmailBody(summary, mockBOMItems, mockLibraryNames);
      expect(body).toMatch(/Vertical:.*3\.0.*mm.*gap.*symmetrical.*spacer/);
    });

    it('should show none spacer mode on both axes', () => {
      const body = formatBOMEmailBody(defaultSummary, mockBOMItems, mockLibraryNames);
      expect(body).toMatch(/Horizontal:.*none spacer/);
      expect(body).toMatch(/Vertical:.*none spacer/);
    });

    it('should list each BOM item with quantity, size, ID, and name', () => {
      const body = formatBOMEmailBody(defaultSummary, mockBOMItems, mockLibraryNames);
      expect(body).toContain('1x1 Bin');
      expect(body).toContain('2x1 Bin');
      expect(body).toContain('3x2 Bin');
      expect(body).toContain('Standard Bins/bin-1x1');
      expect(body).toContain('Standard Bins/bin-2x1');
      expect(body).toContain('Standard Bins/bin-3x2');
      expect(body).toContain('3');  // quantity
      expect(body).toContain('2');  // quantity
      expect(body).toContain('1');  // quantity
    });

    it('should include total unique and total quantity counts', () => {
      const body = formatBOMEmailBody(defaultSummary, mockBOMItems, mockLibraryNames);
      expect(body).toContain('3 unique');
      expect(body).toContain('6 total');
    });

    it('should handle empty BOM', () => {
      const body = formatBOMEmailBody(defaultSummary, [], mockLibraryNames);
      expect(body).toContain('0 unique');
      expect(body).toContain('0 total');
    });

    it('should handle single item BOM', () => {
      const singleItem: BOMItem[] = [
        { itemId: 'bins_standard:bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#3B82F6', categories: ['bin'], quantity: 1 },
      ];
      const body = formatBOMEmailBody(defaultSummary, singleItem, mockLibraryNames);
      expect(body).toContain('1 unique');
      expect(body).toContain('1 total');
      expect(body).toContain('1x1 Bin');
    });

    it('should include reference image exclusion note', () => {
      const body = formatBOMEmailBody(defaultSummary, mockBOMItems, mockLibraryNames);
      expect(body).toMatch(/reference images/i);
      expect(body).toMatch(/not included/i);
    });

    it('should include JSON layout file note', () => {
      const body = formatBOMEmailBody(defaultSummary, mockBOMItems, mockLibraryNames);
      expect(body).toMatch(/json/i);
      expect(body).toMatch(/layout/i);
    });

    it('should include generator attribution', () => {
      const body = formatBOMEmailBody(defaultSummary, mockBOMItems, mockLibraryNames);
      expect(body).toContain('Gridfinity Bin Customizer');
    });

    it('should format part IDs as library name/part id', () => {
      const body = formatBOMEmailBody(defaultSummary, mockBOMItems, mockLibraryNames);
      expect(body).toContain('Standard Bins/bin-1x1');
      expect(body).not.toContain('bins_standard:bin-1x1');
    });

    it('should fall back to library ID when library name is unknown', () => {
      const unknownLibItem: BOMItem[] = [
        { itemId: 'unknown-lib:part-1', name: 'Part 1', widthUnits: 1, heightUnits: 1, color: '#000', categories: [], quantity: 1 },
      ];
      const body = formatBOMEmailBody(defaultSummary, unknownLibItem, mockLibraryNames);
      expect(body).toContain('unknown-lib/part-1');
    });

    it('should format item sizes as WxH', () => {
      const body = formatBOMEmailBody(defaultSummary, mockBOMItems, mockLibraryNames);
      expect(body).toMatch(/1x1/);
      expect(body).toMatch(/2x1/);
      expect(body).toMatch(/3x2/);
    });
  });

  describe('buildLayoutExport', () => {
    let result: GridLayoutExport;

    beforeEach(() => {
      result = buildLayoutExport(defaultSummary, mockPlacedItems, mockBOMItems, mockGetItemById, mockLibraryNames);
    });

    it('should include version field', () => {
      expect(result.version).toBe('1.0.0');
    });

    it('should include exportedAt as valid ISO timestamp', () => {
      expect(result.exportedAt).toBeDefined();
      const date = new Date(result.exportedAt);
      expect(date.getTime()).not.toBeNaN();
    });

    it('should include generator name', () => {
      expect(result.generator).toBe('Gridfinity Bin Customizer');
    });

    it('should include grid configuration', () => {
      expect(result.grid).toEqual({
        gridX: 4,
        gridY: 4,
        width: 168,
        depth: 168,
        unit: 'metric',
        gapWidth: 0,
        gapDepth: 0,
      });
    });

    it('should include spacer configuration', () => {
      expect(result.spacers).toEqual({
        horizontal: 'none',
        vertical: 'none',
      });
    });

    it('should include all placed items with positions and rotations', () => {
      expect(result.items).toHaveLength(6);
      expect(result.items[0]).toEqual({
        itemId: 'Standard Bins/bin-1x1',
        name: '1x1 Bin',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        rotation: 0,
      });
    });

    it('should preserve rotation values in items', () => {
      const rotated90 = result.items.find(i => i.rotation === 90);
      expect(rotated90).toBeDefined();
      expect(rotated90!.itemId).toBe('Standard Bins/bin-1x1');
      expect(rotated90!.x).toBe(2);
      expect(rotated90!.y).toBe(0);
    });

    it('should include items with swapped dimensions when rotated', () => {
      // item-5-1004: bin-2x1 rotated 90, so width=1, height=2
      // Items don't have instanceId in export, find by position
      const item = result.items.find(i => i.x === 0 && i.y === 2);
      expect(item).toBeDefined();
      expect(item!.width).toBe(1);
      expect(item!.height).toBe(2);
      expect(item!.rotation).toBe(90);
    });

    it('should include aggregated BOM', () => {
      expect(result.bom).toHaveLength(3);
      const bin1x1 = result.bom.find(b => b.itemId === 'Standard Bins/bin-1x1');
      expect(bin1x1).toEqual({
        itemId: 'Standard Bins/bin-1x1',
        name: '1x1 Bin',
        widthUnits: 1,
        heightUnits: 1,
        quantity: 3,
      });
    });

    it('should include reference image exclusion note', () => {
      expect(result.notes).toMatch(/reference images/i);
      expect(result.notes).toMatch(/not included/i);
    });

    it('should handle empty placed items', () => {
      const emptyResult = buildLayoutExport(defaultSummary, [], [], mockGetItemById, mockLibraryNames);
      expect(emptyResult.items).toEqual([]);
      expect(emptyResult.bom).toEqual([]);
    });

    it('should include imperial grid configuration', () => {
      const imperialSummary: GridSummaryData = {
        gridX: 4,
        gridY: 4,
        width: 6.61,
        depth: 6.61,
        unit: 'imperial',
        imperialFormat: 'decimal',
        gapWidth: 0,
        gapDepth: 0,
        spacerConfig: { horizontal: 'none', vertical: 'none' },
      };
      const imperialResult = buildLayoutExport(imperialSummary, [], [], mockGetItemById, mockLibraryNames);
      expect(imperialResult.grid.unit).toBe('imperial');
      expect(imperialResult.grid.width).toBe(6.61);
    });

    it('should include spacer modes in export', () => {
      const spacerSummary: GridSummaryData = {
        ...defaultSummary,
        spacerConfig: { horizontal: 'symmetrical', vertical: 'one-sided' },
      };
      const spacerResult = buildLayoutExport(spacerSummary, [], [], mockGetItemById, mockLibraryNames);
      expect(spacerResult.spacers.horizontal).toBe('symmetrical');
      expect(spacerResult.spacers.vertical).toBe('one-sided');
    });

    it('should skip items whose library entry is not found', () => {
      const unknownItem: PlacedItem = {
        instanceId: 'item-99-9999',
        itemId: 'unknown:item',
        x: 0, y: 0, width: 1, height: 1, rotation: 0,
      };
      const resultWithUnknown = buildLayoutExport(defaultSummary, [unknownItem], [], mockGetItemById, mockLibraryNames);
      expect(resultWithUnknown.items).toHaveLength(0);
    });

    it('should produce valid JSON when serialized', () => {
      const json = JSON.stringify(result, null, 2);
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.items).toHaveLength(6);
      expect(parsed.bom).toHaveLength(3);
    });
  });
});
