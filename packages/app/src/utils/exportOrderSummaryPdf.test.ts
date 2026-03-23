import { describe, it, expect } from 'vitest';
import { formatOrderSummaryRows, calculateOrderTotal } from './exportOrderSummaryPdf';
import type { BOMItem } from '../types/gridfinity';

const item1: BOMItem = {
  itemId: 'lib1:bin1', name: 'Small Bin', widthUnits: 1, heightUnits: 1,
  color: '#ff0000', categories: ['bin'], quantity: 3, price: 10.00,
};
const item2: BOMItem = {
  itemId: 'lib1:bin2', name: 'Large Bin', widthUnits: 2, heightUnits: 2,
  color: '#0000ff', categories: ['bin'], quantity: 2,
  // no price
};

describe('formatOrderSummaryRows', () => {
  it('formats row with price', () => {
    const rows = formatOrderSummaryRows([item1]);
    expect(rows[0]).toEqual(['Small Bin', '1\u00d71', '3', '$10.00', '$30.00']);
  });

  it('shows TBD when no price', () => {
    const rows = formatOrderSummaryRows([item2]);
    expect(rows[0][3]).toBe('Price TBD');
    expect(rows[0][4]).toBe('—');
  });
});

describe('calculateOrderTotal', () => {
  it('sums only items with known prices', () => {
    expect(calculateOrderTotal([item1, item2])).toBe(30.00);
  });

  it('returns 0 when no items have prices', () => {
    expect(calculateOrderTotal([item2])).toBe(0);
  });

  it('returns true for hasTbd when any item has no price', () => {
    const { hasTbd } = calculateOrderTotal([item1, item2], true);
    expect(hasTbd).toBe(true);
  });
});
