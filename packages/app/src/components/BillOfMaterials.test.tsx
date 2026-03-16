import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BillOfMaterials } from './BillOfMaterials';
import type { BOMItem } from '../types/gridfinity';

const mockBOMItems: BOMItem[] = [
  { itemId: 'bins_standard:bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#3B82F6', categories: ['bin'], quantity: 3 },
  { itemId: 'bins_standard:bin-2x1', name: '2x1 Bin', widthUnits: 2, heightUnits: 1, color: '#10B981', categories: ['bin'], quantity: 2 },
];

describe('BillOfMaterials', () => {
  it('should render empty state when no items', () => {
    render(<BillOfMaterials items={[]} />);
    expect(screen.getByText('No items placed yet')).toBeInTheDocument();
  });

  it('should render item list when items provided', () => {
    render(<BillOfMaterials items={mockBOMItems} />);
    expect(screen.getByText('1x1 Bin')).toBeInTheDocument();
    expect(screen.getByText('2x1 Bin')).toBeInTheDocument();
  });

  it('should show total item count', () => {
    render(<BillOfMaterials items={mockBOMItems} />);
    expect(screen.getByText('5 items')).toBeInTheDocument();
  });

  it('should show singular item text', () => {
    const singleItem: BOMItem[] = [
      { itemId: 'bins_standard:bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#3B82F6', categories: ['bin'], quantity: 1 },
    ];
    render(<BillOfMaterials items={singleItem} />);
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });
});
