import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateFilename, getOrientation, formatBomRows } from './exportPdf';
import type { BOMItem } from '../types/gridfinity';

describe('generateFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-26'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('slugifies a layout name', () => {
    expect(generateFilename('My Drawer Organizer')).toBe('my-drawer-organizer.pdf');
  });

  it('strips special characters', () => {
    expect(generateFilename('Test! Layout #1')).toBe('test-layout-1.pdf');
  });

  it('collapses multiple separators', () => {
    expect(generateFilename('A  --  B')).toBe('a-b.pdf');
  });

  it('falls back to date when name is undefined', () => {
    expect(generateFilename()).toBe('gridfinity-2026-02-26.pdf');
  });

  it('falls back to date when name is empty string', () => {
    expect(generateFilename('')).toBe('gridfinity-2026-02-26.pdf');
  });

  it('falls back to date when name is whitespace only', () => {
    expect(generateFilename('   ')).toBe('gridfinity-2026-02-26.pdf');
  });
});

describe('getOrientation', () => {
  it('returns landscape for wide grid', () => {
    expect(getOrientation(6, 4)).toBe('l');
  });

  it('returns portrait for tall grid', () => {
    expect(getOrientation(3, 5)).toBe('p');
  });

  it('returns portrait for square grid', () => {
    expect(getOrientation(4, 4)).toBe('p');
  });
});

describe('formatBomRows', () => {
  const baseItem: BOMItem = {
    itemId: 'bin-2x3',
    name: '2x3 Bin',
    widthUnits: 2,
    heightUnits: 3,
    color: '#3B82F6',
    categories: ['bin'],
    quantity: 4,
  };

  it('formats a row with no customization', () => {
    expect(formatBomRows([baseItem])).toEqual([['2x3 Bin', '2×3', '4', '']]);
  });

  it('formats wall pattern customization', () => {
    const item: BOMItem = {
      ...baseItem,
      customization: { wallPattern: 'grid', lipStyle: 'normal', fingerSlide: 'none', wallCutout: 'none' },
    };
    expect(formatBomRows([item])).toEqual([['2x3 Bin', '2×3', '4', 'grid']]);
  });

  it('formats multiple customization fields', () => {
    const item: BOMItem = {
      ...baseItem,
      customization: { wallPattern: 'none', lipStyle: 'reduced', fingerSlide: 'chamfered', wallCutout: 'none' },
    };
    expect(formatBomRows([item])).toEqual([['2x3 Bin', '2×3', '4', 'lip: reduced, slide: chamfered']]);
  });

  it('returns multiple rows for multiple items', () => {
    const item2: BOMItem = { ...baseItem, name: 'Other', quantity: 2 };
    expect(formatBomRows([baseItem, item2])).toHaveLength(2);
  });
});
