import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibrarySelector } from './LibrarySelector';
import type { Library } from '../types/gridfinity';

describe('LibrarySelector', () => {
  const mockLibraries: Library[] = [
    {
      id: 'bins_standard',
      name: 'Standard Bins',
      path: '/libraries/bins_standard/index.json',
      isEnabled: true,
      itemCount: 40,
    },
    {
      id: 'simple-utensils',
      name: 'Simple Utensils',
      path: '/libraries/simple-utensils/index.json',
      isEnabled: true,
      itemCount: 1,
    },
  ];

  it('renders all available libraries', () => {
    render(
      <LibrarySelector
        availableLibraries={mockLibraries}
        selectedLibraryIds={['bins_standard', 'simple-utensils']}
        onToggleLibrary={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText(/Standard Bins/)).toBeInTheDocument();
    expect(screen.getByText(/Simple Utensils/)).toBeInTheDocument();
  });

  it('displays item counts when available', () => {
    render(
      <LibrarySelector
        availableLibraries={mockLibraries}
        selectedLibraryIds={['bins_standard', 'simple-utensils']}
        onToggleLibrary={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText(/\(40 items\)/)).toBeInTheDocument();
    expect(screen.getByText(/\(1 item\)/)).toBeInTheDocument();
  });

  it('shows singular "item" for count of 1', () => {
    render(
      <LibrarySelector
        availableLibraries={mockLibraries}
        selectedLibraryIds={['bins_standard', 'simple-utensils']}
        onToggleLibrary={vi.fn()}
        isLoading={false}
      />
    );

    const itemText = screen.getByText(/\(1 item\)/);
    expect(itemText).toBeInTheDocument();
    expect(itemText.textContent).not.toContain('items');
  });

  it('checks checkboxes for selected libraries', () => {
    render(
      <LibrarySelector
        availableLibraries={mockLibraries}
        selectedLibraryIds={['bins_standard']}
        onToggleLibrary={vi.fn()}
        isLoading={false}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it('calls onToggleLibrary when checkbox is clicked', () => {
    const onToggleLibrary = vi.fn();

    render(
      <LibrarySelector
        availableLibraries={mockLibraries}
        selectedLibraryIds={['bins_standard', 'simple-utensils']}
        onToggleLibrary={onToggleLibrary}
        isLoading={false}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    expect(onToggleLibrary).toHaveBeenCalledWith('simple-utensils');
  });

  it('disables checkboxes when loading', () => {
    render(
      <LibrarySelector
        availableLibraries={mockLibraries}
        selectedLibraryIds={['bins_standard', 'simple-utensils']}
        onToggleLibrary={vi.fn()}
        isLoading={true}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeDisabled();
    });
  });

  it('disables last selected library checkbox', () => {
    render(
      <LibrarySelector
        availableLibraries={mockLibraries}
        selectedLibraryIds={['bins_standard']}
        onToggleLibrary={vi.fn()}
        isLoading={false}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeDisabled(); // Last selected
    expect(checkboxes[1]).not.toBeDisabled();
  });

  it('allows unchecking when multiple libraries are selected', () => {
    render(
      <LibrarySelector
        availableLibraries={mockLibraries}
        selectedLibraryIds={['bins_standard', 'simple-utensils']}
        onToggleLibrary={vi.fn()}
        isLoading={false}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).not.toBeDisabled();
    expect(checkboxes[1]).not.toBeDisabled();
  });

  it('does not display item count when undefined', () => {
    const librariesWithoutCounts: Library[] = [
      {
        id: 'bins_standard',
        name: 'Standard Bins',
        path: '/libraries/bins_standard/index.json',
        isEnabled: true,
      },
    ];

    render(
      <LibrarySelector
        availableLibraries={librariesWithoutCounts}
        selectedLibraryIds={['bins_standard']}
        onToggleLibrary={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.queryByText(/items/)).not.toBeInTheDocument();
  });

  it('renders with empty libraries array', () => {
    render(
      <LibrarySelector
        availableLibraries={[]}
        selectedLibraryIds={[]}
        onToggleLibrary={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('Library Selection')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
