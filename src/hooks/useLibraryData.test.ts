import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLibraryData } from './useLibraryData';
import type { LibraryItem } from '../types/gridfinity';
import type { DataSourceAdapter } from '../api/adapters/types';
import { createTestWrapper, createTestWrapperWithAdapter } from '../test/testWrapper';

describe('useLibraryData', () => {
  const mockDefaultItems: LibraryItem[] = [
    { id: 'bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#3B82F6', categories: ['bin'] },
    { id: 'bin-2x2', name: '2x2 Bin', widthUnits: 2, heightUnits: 2, color: '#3B82F6', categories: ['bin'] },
  ];

  const mockCommunityItems: LibraryItem[] = [
    { id: 'custom-1x1', name: 'Custom 1x1', widthUnits: 1, heightUnits: 1, color: '#EF4444', categories: ['custom'] },
  ];

  // Stable array references for tests
  const singleLibrary = ['default'];
  const multipleLibraries = ['default', 'community'];
  const emptyLibraries: string[] = [];

  function createAdapter(
    itemsByLibrary: Record<string, LibraryItem[]>,
    options?: { failFor?: string[] }
  ): DataSourceAdapter {
    return {
      async getLibraries() {
        return Object.keys(itemsByLibrary).map((id) => ({
          id,
          name: id,
          path: `/libraries/${id}/index.json`,
          itemCount: itemsByLibrary[id].length,
        }));
      },
      async getLibraryItems(libraryId: string) {
        if (options?.failFor?.includes(libraryId)) {
          throw new Error(`Failed to fetch ${libraryId}: Server Error`);
        }
        return itemsByLibrary[libraryId] ?? [];
      },
      resolveImageUrl(_libraryId: string, imagePath: string) {
        return imagePath;
      },
    };
  }

  describe('Multi-Library Loading', () => {
    it('should load single library', async () => {
      const adapter = createAdapter({ default: mockDefaultItems });
      const wrapper = createTestWrapper(adapter);

      const { result } = renderHook(() => useLibraryData(singleLibrary), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].id).toBe('default:bin-1x1');
      expect(result.current.items[1].id).toBe('default:bin-2x2');
    });

    it('should load multiple libraries in parallel', async () => {
      const adapter = createAdapter({
        default: mockDefaultItems,
        community: mockCommunityItems,
      });
      const wrapper = createTestWrapper(adapter);

      const { result } = renderHook(() => useLibraryData(multipleLibraries), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items.map((i) => i.id)).toContain('default:bin-1x1');
      expect(result.current.items.map((i) => i.id)).toContain('community:custom-1x1');
    });

    it('should prefix item IDs with library name', async () => {
      const adapter = createAdapter({ default: mockDefaultItems });
      const wrapper = createTestWrapper(adapter);

      const { result } = renderHook(() => useLibraryData(singleLibrary), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.items.forEach((item) => {
        expect(item.id).toMatch(/^default:/);
      });
    });

    it('should resolve image paths to library-specific directories', async () => {
      const itemsWithImages: LibraryItem[] = [
        {
          id: 'bin-1x1',
          name: '1x1 Bin',
          widthUnits: 1,
          heightUnits: 1,
          color: '#3B82F6',
          categories: ['bin'],
          imageUrl: 'bin-1x1.png',
        },
      ];

      const adapter = createAdapter({ default: itemsWithImages });
      const wrapper = createTestWrapper(adapter);

      const { result } = renderHook(() => useLibraryData(singleLibrary), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items[0].imageUrl).toBe('/libraries/default/bin-1x1.png');
    });

    it('should maintain backward compatibility with absolute paths', async () => {
      const itemsWithAbsolutePaths: LibraryItem[] = [
        {
          id: 'bin-1x1',
          name: '1x1 Bin',
          widthUnits: 1,
          heightUnits: 1,
          color: '#3B82F6',
          categories: ['bin'],
          imageUrl: '/libraries/default/images/bin-1x1.png',
        },
      ];

      const adapter = createAdapter({ default: itemsWithAbsolutePaths });
      const wrapper = createTestWrapper(adapter);

      const { result } = renderHook(() => useLibraryData(singleLibrary), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should pass through unchanged
      expect(result.current.items[0].imageUrl).toBe('/libraries/default/images/bin-1x1.png');
    });

    it('should handle empty library selection', async () => {
      const adapter = createAdapter({});
      const wrapper = createTestWrapper(adapter);

      const { result } = renderHook(() => useLibraryData(emptyLibraries), {
        wrapper,
      });

      // With no library IDs, useQueries creates zero queries, so isLoading should be false
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const adapter = createAdapter({}, { failFor: ['default'] });
      const wrapper = createTestWrapper(adapter);

      const { result } = renderHook(() => useLibraryData(singleLibrary), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // With TanStack Query, a failed query results in error state
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should skip libraries not in adapter (returns empty)', async () => {
      const adapter = createAdapter({ default: mockDefaultItems });
      const wrapper = createTestWrapper(adapter);
      const nonExistentLibrary = ['non-existent'];

      const { result } = renderHook(() => useLibraryData(nonExistentLibrary), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
    });

    it('should handle partial failures (some libraries load, others fail)', async () => {
      const adapter = createAdapter(
        { default: mockDefaultItems, community: mockCommunityItems },
        { failFor: ['community'] }
      );
      const wrapper = createTestWrapper(adapter);

      const { result } = renderHook(() => useLibraryData(multipleLibraries), {
        wrapper,
      });

      await waitFor(() => {
        // Wait for all queries to settle
        const allSettled = result.current.items.length > 0 || result.current.error !== null;
        expect(allSettled).toBe(true);
      });

      // Default library items should still load
      expect(result.current.items.length).toBeGreaterThanOrEqual(2);
      expect(result.current.items[0].id).toBe('default:bin-1x1');
    });
  });

  describe('Helper Methods', () => {
    it('getItemById should find item by prefixed ID', async () => {
      const adapter = createAdapter({ default: mockDefaultItems });
      const wrapper = createTestWrapper(adapter);

      const { result } = renderHook(() => useLibraryData(singleLibrary), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item = result.current.getItemById('default:bin-1x1');
      expect(item).toBeDefined();
      expect(item?.name).toBe('1x1 Bin');
    });

    it('getItemById should return undefined for non-existent item', async () => {
      const adapter = createAdapter({ default: mockDefaultItems });
      const wrapper = createTestWrapper(adapter);

      const { result } = renderHook(() => useLibraryData(singleLibrary), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item = result.current.getItemById('non-existent');
      expect(item).toBeUndefined();
    });

    it('getItemsByCategory should filter by category', async () => {
      const adapter = createAdapter({ default: mockDefaultItems });
      const wrapper = createTestWrapper(adapter);

      const { result } = renderHook(() => useLibraryData(singleLibrary), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const binItems = result.current.getItemsByCategory('bin');
      expect(binItems).toHaveLength(2);
      expect(binItems.every((item) => item.categories.includes('bin'))).toBe(true);
    });

    it('getItemsByLibrary should filter by library ID', async () => {
      const adapter = createAdapter({
        default: mockDefaultItems,
        community: mockCommunityItems,
      });
      const wrapper = createTestWrapper(adapter);

      const { result } = renderHook(() => useLibraryData(multipleLibraries), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const defaultItems = result.current.getItemsByLibrary('default');
      expect(defaultItems).toHaveLength(2);
      expect(defaultItems.every((item) => item.id.startsWith('default:'))).toBe(true);

      const communityItems = result.current.getItemsByLibrary('community');
      expect(communityItems).toHaveLength(1);
      expect(communityItems[0].id).toBe('community:custom-1x1');
    });
  });

  describe('Refresh', () => {
    it('should reload libraries when refreshLibrary is called', async () => {
      let callCount = 0;
      const adapter: DataSourceAdapter = {
        async getLibraries() {
          return [{ id: 'default', name: 'default', path: '/libraries/default/index.json' }];
        },
        async getLibraryItems() {
          callCount++;
          return mockDefaultItems;
        },
        resolveImageUrl(_libraryId: string, imagePath: string) {
          return imagePath;
        },
      };

      const wrapper = createTestWrapperWithAdapter(adapter);

      const { result } = renderHook(() => useLibraryData(singleLibrary), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);
      const initialCallCount = callCount;

      // Call refresh
      await result.current.refreshLibrary();

      await waitFor(() => {
        expect(callCount).toBeGreaterThan(initialCallCount);
      });

      // Should still have items after refresh
      expect(result.current.items).toHaveLength(2);
    });
  });

  describe('Library Selection Changes', () => {
    it('should reload when selected libraries change', async () => {
      const adapter = createAdapter({
        default: mockDefaultItems,
        community: mockCommunityItems,
      });
      const wrapper = createTestWrapperWithAdapter(adapter);

      const { result, rerender } = renderHook(
        ({ libs }) => useLibraryData(libs),
        { initialProps: { libs: singleLibrary }, wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);

      // Change to community library
      const communityOnly = ['community'];
      rerender({ libs: communityOnly });

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1);
      });

      expect(result.current.items[0].id).toBe('community:custom-1x1');
    });
  });
});
