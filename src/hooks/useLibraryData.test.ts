import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLibraryData } from './useLibraryData';
import type { LibraryItem } from '../types/gridfinity';

describe('useLibraryData', () => {
  const mockLibraryData = {
    version: '1.0.0',
    items: [
      { id: 'bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#646cff', categories: ['bin'] },
      { id: 'bin-2x2', name: '2x2 Bin', widthUnits: 2, heightUnits: 2, color: '#646cff', categories: ['bin'] },
      { id: 'divider-1x1', name: '1x1 Divider', widthUnits: 1, heightUnits: 1, color: '#22c55e', categories: ['divider'] },
    ],
  };

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start with loading state', () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useLibraryData());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should load library data successfully', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLibraryData,
    });

    const { result } = renderHook(() => useLibraryData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual(mockLibraryData.items);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    const { result } = renderHook(() => useLibraryData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain('Failed to load library');
  });

  it('should handle invalid JSON format', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ version: '1.0.0' }), // Missing items array
    });

    const { result } = renderHook(() => useLibraryData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain('Invalid library data format');
  });

  it('should validate items have required fields', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        version: '1.0.0',
        items: [
          { id: 'bin-1x1', name: '1x1 Bin' }, // Missing category and other fields
        ],
      }),
    });

    const { result } = renderHook(() => useLibraryData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain('Invalid item');
  });

  it('should provide getItemById function', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLibraryData,
    });

    const { result } = renderHook(() => useLibraryData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const item = result.current.getItemById('bin-1x1');
    expect(item).toEqual(mockLibraryData.items[0]);

    const notFound = result.current.getItemById('non-existent');
    expect(notFound).toBeUndefined();
  });

  it('should provide getItemsByCategory function', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLibraryData,
    });

    const { result } = renderHook(() => useLibraryData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const bins = result.current.getItemsByCategory('bin');
    expect(bins).toHaveLength(2);
    expect(bins.every(item => item.categories.includes('bin'))).toBe(true);

    const dividers = result.current.getItemsByCategory('divider');
    expect(dividers).toHaveLength(1);
    expect(dividers[0].categories[0]).toBe('divider');

    const organizers = result.current.getItemsByCategory('organizer');
    expect(organizers).toHaveLength(0);
  });

  it('should handle network errors', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network error')
    );

    const { result } = renderHook(() => useLibraryData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain('Network error');
  });

  it('should cleanup on unmount', async () => {
    let resolvePromise: (value: unknown) => void;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(slowPromise);

    const { unmount } = renderHook(() => useLibraryData());

    unmount();

    // Resolve after unmount
    resolvePromise!({
      ok: true,
      json: async () => mockLibraryData,
    });

    // Should not cause errors or state updates after unmount
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  describe('Write Operations', () => {
    beforeEach(() => {
      localStorage.clear();
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockLibraryData,
      });
    });

    it('should add a new item', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newItem = {
        id: 'organizer-2x2',
        name: '2x2 Organizer',
        widthUnits: 2,
        heightUnits: 2,
        color: '#f59e0b',
        categories: ['organizer'],
      };

      act(() => {
        result.current.addItem(newItem);
      });

      expect(result.current.items).toHaveLength(4);
      expect(result.current.getItemById('organizer-2x2')).toEqual(newItem);
    });

    it('should save new item to localStorage', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newItem = {
        id: 'test-item',
        name: 'Test Item',
        widthUnits: 1,
        heightUnits: 1,
        color: '#000000',
        categories: ['bin'],
      };

      act(() => {
        result.current.addItem(newItem);
      });

      const stored = localStorage.getItem('gridfinity-library-custom');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(4);
      expect(parsed.find((item: LibraryItem) => item.id === 'test-item')).toEqual(newItem);
    });

    it('should throw error when adding item with duplicate id', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const duplicateItem = {
        id: 'bin-1x1', // Already exists
        name: 'Duplicate Bin',
        widthUnits: 1,
        heightUnits: 1,
        color: '#000000',
        categories: ['bin'],
      };

      expect(() => result.current.addItem(duplicateItem)).toThrow('already exists');
    });

    it('should throw error when adding item without required fields', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const invalidItem = {
        id: 'invalid',
        name: '',
        widthUnits: 1,
        heightUnits: 1,
        color: '#000000',
        categories: ['bin'],
      };

      expect(() => result.current.addItem(invalidItem)).toThrow('must have id, name, and at least one category');
    });

    it('should update an existing item', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateItem('bin-1x1', { name: 'Updated 1x1 Bin' });
      });

      const updatedItem = result.current.getItemById('bin-1x1');
      expect(updatedItem?.name).toBe('Updated 1x1 Bin');
    });

    it('should save updated item to localStorage', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateItem('bin-1x1', { color: '#ff0000' });
      });

      const stored = localStorage.getItem('gridfinity-library-custom');
      const parsed = JSON.parse(stored!);
      const updatedItem = parsed.find((item: LibraryItem) => item.id === 'bin-1x1');
      expect(updatedItem.color).toBe('#ff0000');
    });

    it('should throw error when updating non-existent item', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.updateItem('non-existent', { name: 'Test' })).toThrow('not found');
    });

    it('should throw error when updating id to duplicate', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.updateItem('bin-1x1', { id: 'bin-2x2' })).toThrow('already exists');
    });

    it('should throw error when updating removes required fields', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.updateItem('bin-1x1', { name: '' })).toThrow('must have id, name, and at least one category');
    });

    it('should delete an item', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.deleteItem('bin-1x1');
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.getItemById('bin-1x1')).toBeUndefined();
    });

    it('should save deletion to localStorage', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.deleteItem('bin-1x1');
      });

      const stored = localStorage.getItem('gridfinity-library-custom');
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(2);
      expect(parsed.find((item: LibraryItem) => item.id === 'bin-1x1')).toBeUndefined();
    });

    it('should throw error when deleting non-existent item', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.deleteItem('non-existent')).toThrow('not found');
    });

    it('should reset to defaults', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add a custom item
      const newItem = {
        id: 'custom-item',
        name: 'Custom Item',
        widthUnits: 1,
        heightUnits: 1,
        color: '#000000',
        categories: ['bin'],
      };
      act(() => {
        result.current.addItem(newItem);
      });
      expect(result.current.items).toHaveLength(4);

      // Reset to defaults
      act(() => {
        result.current.resetToDefaults();
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.getItemById('custom-item')).toBeUndefined();
    });

    it('should remove custom library from localStorage on reset', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add a custom item
      act(() => {
        result.current.addItem({
          id: 'custom-item',
          name: 'Custom Item',
          widthUnits: 1,
          heightUnits: 1,
          color: '#000000',
          categories: ['bin'],
        });
      });

      expect(localStorage.getItem('gridfinity-library-custom')).toBeTruthy();

      // Reset to defaults
      act(() => {
        result.current.resetToDefaults();
      });

      expect(localStorage.getItem('gridfinity-library-custom')).toBeNull();
    });

    it('should load custom library from localStorage on mount', async () => {
      const customLibrary = [
        { id: 'custom-1', name: 'Custom Bin', widthUnits: 1, heightUnits: 1, color: '#000000', categories: ['bin'] },
      ];
      localStorage.setItem('gridfinity-library-custom', JSON.stringify(customLibrary));

      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.getItemById('custom-1')).toBeTruthy();
    });

    it('should fallback to defaults if custom library is invalid', async () => {
      localStorage.setItem('gridfinity-library-custom', 'invalid json');

      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual(mockLibraryData.items);
    });

    it('should fallback to defaults if custom library has invalid items', async () => {
      const invalidLibrary = [
        { id: 'missing-name', widthUnits: 1, heightUnits: 1, color: '#000000', categories: ['bin'] },
      ];
      localStorage.setItem('gridfinity-library-custom', JSON.stringify(invalidLibrary));

      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual(mockLibraryData.items);
    });
  });

  describe('updateItemCategories', () => {
    beforeEach(() => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockLibraryData,
      });
    });

    it('should update all items in a category', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Initially, 2 items in 'bin' category
      const binItems = result.current.items.filter(item => item.categories.includes('bin'));
      expect(binItems).toHaveLength(2);

      act(() => {
        result.current.updateItemCategories('bin', 'container');
      });

      // After update, 0 items in 'bin', 2 in 'container'
      const binItemsAfter = result.current.items.filter(item => item.categories.includes('bin'));
      const containerItems = result.current.items.filter(item => item.categories[0] === 'container');
      expect(binItemsAfter).toHaveLength(0);
      expect(containerItems).toHaveLength(2);
    });

    it('should save updated categories to localStorage', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateItemCategories('bin', 'container');
      });

      const stored = localStorage.getItem('gridfinity-library-custom');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      const containerItems = parsed.filter((item: LibraryItem) => item.categories[0] === 'container');
      expect(containerItems).toHaveLength(2);
    });

    it('should not affect items in other categories', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const dividerItemsBefore = result.current.items.filter(item => item.categories.includes('divider'));
      expect(dividerItemsBefore).toHaveLength(1);

      act(() => {
        result.current.updateItemCategories('bin', 'container');
      });

      const dividerItemsAfter = result.current.items.filter(item => item.categories.includes('divider'));
      expect(dividerItemsAfter).toHaveLength(1);
      expect(dividerItemsAfter[0]).toEqual(dividerItemsBefore[0]);
    });

    it('should handle updating non-existent category', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialLength = result.current.items.length;

      act(() => {
        result.current.updateItemCategories('non-existent', 'new-category');
      });

      // Should not affect any items
      expect(result.current.items.length).toBe(initialLength);
    });

    it('should handle renaming category to itself', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialBinCount = result.current.items.filter(item => item.categories.includes('bin')).length;

      act(() => {
        result.current.updateItemCategories('bin', 'bin');
      });

      const binItems = result.current.items.filter(item => item.categories.includes('bin'));
      // When renaming to itself, category remains the same
      expect(binItems).toHaveLength(initialBinCount);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockLibraryData,
      });
    });

    it('should handle adding item with minimum valid dimensions', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const minItem: LibraryItem = {
        id: 'min-item',
        name: 'Minimum Item',
        widthUnits: 1,
        heightUnits: 1,
        color: '#000000',
        categories: ['bin'],
      };

      act(() => {
        result.current.addItem(minItem);
      });

      expect(result.current.getItemById('min-item')).toEqual(minItem);
    });

    it('should handle adding item with very large dimensions', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const largeItem: LibraryItem = {
        id: 'large-item',
        name: 'Large Item',
        widthUnits: 100,
        heightUnits: 100,
        color: '#000000',
        categories: ['bin'],
      };

      act(() => {
        result.current.addItem(largeItem);
      });

      expect(result.current.getItemById('large-item')?.widthUnits).toBe(100);
      expect(result.current.getItemById('large-item')?.heightUnits).toBe(100);
    });

    it('should handle items with special characters in name', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const specialItem: LibraryItem = {
        id: 'special',
        name: 'Item & "Special" <Chars>',
        widthUnits: 1,
        heightUnits: 1,
        color: '#000000',
        categories: ['bin'],
      };

      act(() => {
        result.current.addItem(specialItem);
      });

      expect(result.current.getItemById('special')?.name).toBe('Item & "Special" <Chars>');
    });

    it('should handle updating multiple fields simultaneously', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateItem('bin-1x1', {
          name: 'Updated Bin',
          color: '#ff0000',
          widthUnits: 3,
          heightUnits: 3,
        });
      });

      const updated = result.current.getItemById('bin-1x1');
      expect(updated).toMatchObject({
        name: 'Updated Bin',
        color: '#ff0000',
        widthUnits: 3,
        heightUnits: 3,
      });
    });

    it('should preserve other properties when updating', async () => {
      const { result } = renderHook(() => useLibraryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalCategories = result.current.getItemById('bin-1x1')?.categories;

      act(() => {
        result.current.updateItem('bin-1x1', { name: 'New Name' });
      });

      const updated = result.current.getItemById('bin-1x1');
      expect(updated?.categories).toEqual(originalCategories);
    });
  });
});
