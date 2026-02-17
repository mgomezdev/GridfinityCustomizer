import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BillOfMaterials } from './BillOfMaterials';
import type { BOMItem } from '../types/gridfinity';

const mockBOMItems: BOMItem[] = [
  { itemId: 'bins_standard:bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#3B82F6', categories: ['bin'], quantity: 3 },
  { itemId: 'bins_standard:bin-2x1', name: '2x1 Bin', widthUnits: 2, heightUnits: 1, color: '#10B981', categories: ['bin'], quantity: 2 },
];

describe('BillOfMaterials', () => {
  describe('existing behavior', () => {
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

  describe('Submit BOM button', () => {
    it('should not render submit button when no items', () => {
      render(<BillOfMaterials items={[]} />);
      expect(screen.queryByRole('button', { name: /submit bom/i })).not.toBeInTheDocument();
    });

    it('should render submit button when items are present', () => {
      const mockSubmit = vi.fn();
      render(
        <BillOfMaterials
          items={mockBOMItems}
          onSubmitBOM={mockSubmit}
        />
      );
      expect(screen.getByRole('button', { name: /submit bom/i })).toBeInTheDocument();
    });

    it('should call onSubmitBOM when button is clicked', () => {
      const mockSubmit = vi.fn();
      render(
        <BillOfMaterials
          items={mockBOMItems}
          onSubmitBOM={mockSubmit}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /submit bom/i }));
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    it('should disable button when isSubmitting is true', () => {
      const mockSubmit = vi.fn();
      render(
        <BillOfMaterials
          items={mockBOMItems}
          onSubmitBOM={mockSubmit}
          isSubmitting={true}
        />
      );
      const button = screen.getByRole('button', { name: /submitting/i });
      expect(button).toBeDisabled();
    });

    it('should show submitting text when isSubmitting', () => {
      render(
        <BillOfMaterials
          items={mockBOMItems}
          onSubmitBOM={vi.fn()}
          isSubmitting={true}
        />
      );
      expect(screen.getByText(/submitting/i)).toBeInTheDocument();
    });

    it('should not render button when onSubmitBOM is not provided', () => {
      render(<BillOfMaterials items={mockBOMItems} />);
      expect(screen.queryByRole('button', { name: /submit bom/i })).not.toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('should show error message when submitError is provided', () => {
      render(
        <BillOfMaterials
          items={mockBOMItems}
          onSubmitBOM={vi.fn()}
          submitError="Something went wrong"
        />
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should not show error when submitError is null', () => {
      render(
        <BillOfMaterials
          items={mockBOMItems}
          onSubmitBOM={vi.fn()}
          submitError={null}
        />
      );
      expect(screen.queryByText(/went wrong/)).not.toBeInTheDocument();
    });
  });

  describe('reference image notice', () => {
    it('should show reference image notice when submit button is visible', () => {
      render(
        <BillOfMaterials
          items={mockBOMItems}
          onSubmitBOM={vi.fn()}
        />
      );
      expect(screen.getByText(/reference images/i)).toBeInTheDocument();
      expect(screen.getByText(/not included/i)).toBeInTheDocument();
    });

    it('should not show notice when no submit button', () => {
      render(<BillOfMaterials items={mockBOMItems} />);
      expect(screen.queryByText(/reference images.*not included/i)).not.toBeInTheDocument();
    });
  });
});
