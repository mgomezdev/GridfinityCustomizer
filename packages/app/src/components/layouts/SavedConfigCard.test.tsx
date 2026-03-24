import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SavedConfigCard } from './SavedConfigCard';
import type { ApiLayout } from '@gridfinity/shared';

const mockLayout: ApiLayout = {
  id: 1,
  userId: 10,
  name: 'My Layout',
  description: 'A test layout',
  status: 'draft',
  gridX: 4,
  gridY: 4,
  widthMm: 168,
  depthMm: 168,
  spacerHorizontal: 'none',
  spacerVertical: 'none',
  isPublic: false,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const defaultProps = {
  layout: mockLayout,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onSubmit: vi.fn(),
  onWithdraw: vi.fn(),
  onDuplicate: vi.fn(),
  isDeleting: false,
};

function renderCard(props: Partial<typeof defaultProps> = {}) {
  return render(
    <MemoryRouter>
      <SavedConfigCard {...defaultProps} {...props} />
    </MemoryRouter>
  );
}

describe('SavedConfigCard', () => {
  it('renders layout name', () => {
    renderCard();
    expect(screen.getByText('My Layout')).toBeInTheDocument();
  });

  it('renders SVG thumbnail with correct cell count (gridX × gridY)', () => {
    renderCard();
    const svg = document.querySelector('.saved-config-thumbnail svg');
    expect(svg).toBeInTheDocument();
    // mockLayout has gridX: 4, gridY: 4 → 16 cells
    const cells = svg!.querySelectorAll('rect.grid-cell');
    expect(cells).toHaveLength(16);
  });

  it('renders status badge', () => {
    renderCard();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('shows Submit button for draft layouts', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('does not show Submit button for submitted layouts', () => {
    renderCard({ layout: { ...mockLayout, status: 'submitted' } });
    expect(screen.queryByRole('button', { name: /^submit$/i })).not.toBeInTheDocument();
  });

  it('shows Withdraw button for submitted layouts', () => {
    renderCard({ layout: { ...mockLayout, status: 'submitted' } });
    expect(screen.getByRole('button', { name: /withdraw/i })).toBeInTheDocument();
  });

  it('does not show Delete button for delivered layouts', () => {
    renderCard({ layout: { ...mockLayout, status: 'delivered' } });
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('calls onEdit when Edit is clicked', () => {
    const onEdit = vi.fn();
    renderCard({ onEdit });
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(1);
  });

  it('requires two clicks to delete (confirm flow)', () => {
    const onDelete = vi.fn();
    renderCard({ onDelete });
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
