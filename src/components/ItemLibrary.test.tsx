import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemLibrary } from './ItemLibrary';
import type { LibraryItem } from '../types/gridfinity';

const mockLibraryItems: LibraryItem[] = [
  { id: 'bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#646cff', category: 'bin' },
  { id: 'bin-2x2', name: '2x2 Bin', widthUnits: 2, heightUnits: 2, color: '#646cff', category: 'bin' },
  { id: 'divider-1x1', name: '1x1 Divider', widthUnits: 1, heightUnits: 1, color: '#22c55e', category: 'divider' },
  { id: 'organizer-1x3', name: '1x3 Organizer', widthUnits: 1, heightUnits: 3, color: '#f59e0b', category: 'organizer' },
];

describe('ItemLibrary', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should render all categories', () => {
    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    expect(screen.getByText('Bins')).toBeInTheDocument();
    expect(screen.getByText('Dividers')).toBeInTheDocument();
    expect(screen.getByText('Organizers')).toBeInTheDocument();
  });

  it('should have all categories expanded by default', () => {
    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    const categoryItems = document.querySelectorAll('.category-items');
    categoryItems.forEach(items => {
      expect(items).toHaveClass('expanded');
      expect(items).not.toHaveClass('collapsed');
    });
  });

  it('should have all chevrons pointing down (expanded) by default', () => {
    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    const chevrons = document.querySelectorAll('.category-chevron');
    chevrons.forEach(chevron => {
      expect(chevron).toHaveClass('expanded');
      expect(chevron).not.toHaveClass('collapsed');
    });
  });

  it('should collapse category when clicked', () => {
    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    const binsTitle = screen.getByText('Bins');
    fireEvent.click(binsTitle);

    const binsItems = binsTitle.nextElementSibling;
    expect(binsItems).toHaveClass('collapsed');
    expect(binsItems).not.toHaveClass('expanded');
  });

  it('should expand category when clicked again', () => {
    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    const binsTitle = screen.getByText('Bins');

    // Collapse
    fireEvent.click(binsTitle);
    let binsItems = binsTitle.nextElementSibling;
    expect(binsItems).toHaveClass('collapsed');

    // Expand
    fireEvent.click(binsTitle);
    binsItems = binsTitle.nextElementSibling;
    expect(binsItems).toHaveClass('expanded');
  });

  it('should rotate chevron when category is collapsed', () => {
    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    const binsTitle = screen.getByText('Bins');
    const chevron = binsTitle.querySelector('.category-chevron');

    expect(chevron).toHaveClass('expanded');

    fireEvent.click(binsTitle);

    expect(chevron).toHaveClass('collapsed');
    expect(chevron).not.toHaveClass('expanded');
  });

  it('should handle keyboard interaction (Enter key)', () => {
    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    const binsTitle = screen.getByText('Bins');
    fireEvent.keyDown(binsTitle, { key: 'Enter' });

    const binsItems = binsTitle.nextElementSibling;
    expect(binsItems).toHaveClass('collapsed');
  });

  it('should handle keyboard interaction (Space key)', () => {
    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    const binsTitle = screen.getByText('Bins');
    fireEvent.keyDown(binsTitle, { key: ' ' });

    const binsItems = binsTitle.nextElementSibling;
    expect(binsItems).toHaveClass('collapsed');
  });

  it('should collapse categories independently', () => {
    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    const binsTitle = screen.getByText('Bins');
    const dividersTitle = screen.getByText('Dividers');

    fireEvent.click(binsTitle);

    const binsItems = binsTitle.nextElementSibling;
    const dividersItems = dividersTitle.nextElementSibling;

    expect(binsItems).toHaveClass('collapsed');
    expect(dividersItems).toHaveClass('expanded');
  });

  it('should save collapsed state to localStorage', () => {
    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    const binsTitle = screen.getByText('Bins');
    fireEvent.click(binsTitle);

    const stored = localStorage.getItem('gridfinity-collapsed-categories');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toContain('bins');
  });

  it('should load collapsed state from localStorage', () => {
    // Pre-populate localStorage
    localStorage.setItem('gridfinity-collapsed-categories', JSON.stringify(['dividers']));

    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    const dividersTitle = screen.getByText('Dividers');
    const dividersItems = dividersTitle.nextElementSibling;

    expect(dividersItems).toHaveClass('collapsed');
  });

  it('should handle localStorage errors gracefully', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock localStorage to throw an error
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error('Storage error');
    });

    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    const binsTitle = screen.getByText('Bins');
    fireEvent.click(binsTitle);

    // Should still work despite localStorage error
    const binsItems = binsTitle.nextElementSibling;
    expect(binsItems).toHaveClass('collapsed');
    expect(consoleWarnSpy).toHaveBeenCalled();

    // Restore
    Storage.prototype.setItem = originalSetItem;
    consoleWarnSpy.mockRestore();
  });

  it('should have correct accessibility attributes', () => {
    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    const binsTitle = screen.getByText('Bins');

    expect(binsTitle).toHaveAttribute('role', 'button');
    expect(binsTitle).toHaveAttribute('tabIndex', '0');
  });

  it('should maintain state across multiple toggles', () => {
    render(<ItemLibrary items={mockLibraryItems} isLoading={false} error={null} />);

    const binsTitle = screen.getByText('Bins');
    const dividersTitle = screen.getByText('Dividers');

    // Collapse bins
    fireEvent.click(binsTitle);
    // Collapse dividers
    fireEvent.click(dividersTitle);
    // Expand bins
    fireEvent.click(binsTitle);

    const binsItems = binsTitle.nextElementSibling;
    const dividersItems = dividersTitle.nextElementSibling;

    expect(binsItems).toHaveClass('expanded');
    expect(dividersItems).toHaveClass('collapsed');

    // Check localStorage has correct state
    const stored = localStorage.getItem('gridfinity-collapsed-categories');
    const parsed = JSON.parse(stored!);
    expect(parsed).toContain('dividers');
    expect(parsed).not.toContain('bins');
  });
});
