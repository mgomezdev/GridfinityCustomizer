import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLibraryData } from './useLibraryData';

describe('useLibraryData', () => {
  const mockDefaultLibrary = {
    version: '1.0.0',
    items: [
      { id: 'bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#3B82F6', categories: ['bin'] },
      { id: 'bin-2x2', name: '2x2 Bin', widthUnits: 2, heightUnits: 2, color: '#3B82F6', categories: ['bin'] },
    ],
  };

  const mockCommunityLibrary = {
    version: '1.0.0',
    items: [
      { id: 'custom-1x1', name: 'Custom 1x1', widthUnits: 1, heightUnits: 1, color: '#EF4444', categories: ['custom'] },
    ],
  };

  const manifestLibraries = [
    { id: 'default', path: '/libraries/default/index.json' },
    { id: 'community', path: '/libraries/community/index.json' },
  ];

  // Stable array references for tests
  const singleLibrary = ['default'];
  const multipleLibraries = ['default', 'community'];
  const emptyLibraries: string[] = [];
  const nonExistentLibrary = ['non-existent'];

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create mock function with sensible default that returns valid Response
    mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ version: '1.0.0', items: [] }),
      } as Response)
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  // Helper to get the mocked fetch function
  const getMockFetch = () => mockFetch;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Multi-Library Loading', () => {
    it('should load single library', async () => {
      getMockFetch().mockResolvedValueOnce({
        ok: true,
        json: async () => mockDefaultLibrary,
      } as Response);

      const { result } = renderHook(() =>
        useLibraryData(singleLibrary, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].id).toBe('default:bin-1x1');
      expect(result.current.items[1].id).toBe('default:bin-2x2');
    });

    it('should load multiple libraries in parallel', async () => {
      getMockFetch()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDefaultLibrary,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommunityLibrary,
        } as Response);

      const { result } = renderHook(() =>
        useLibraryData(multipleLibraries, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items.map(i => i.id)).toContain('default:bin-1x1');
      expect(result.current.items.map(i => i.id)).toContain('community:custom-1x1');
    });

    it('should prefix item IDs with library name', async () => {
      getMockFetch().mockResolvedValueOnce({
        ok: true,
        json: async () => mockDefaultLibrary,
      } as Response);

      const { result } = renderHook(() =>
        useLibraryData(singleLibrary, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.items.forEach(item => {
        expect(item.id).toMatch(/^default:/);
      });
    });

    it('should resolve image paths to library-specific directories', async () => {
      const libraryWithImages = {
        version: '1.0.0',
        items: [
          {
            id: 'bin-1x1',
            name: '1x1 Bin',
            widthUnits: 1,
            heightUnits: 1,
            color: '#3B82F6',
            categories: ['bin'],
            imageUrl: 'bin-1x1.png'  // Changed to relative path
          },
        ],
      };

      getMockFetch().mockResolvedValueOnce({
        ok: true,
        json: async () => libraryWithImages,
      } as Response);

      const { result } = renderHook(() =>
        useLibraryData(singleLibrary, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items[0].imageUrl).toBe('/libraries/default/bin-1x1.png');
    });

    it('should maintain backward compatibility with absolute paths', async () => {
      const libraryWithAbsolutePaths = {
        version: '1.0.0',
        items: [
          {
            id: 'bin-1x1',
            name: '1x1 Bin',
            widthUnits: 1,
            heightUnits: 1,
            color: '#3B82F6',
            categories: ['bin'],
            imageUrl: '/libraries/default/images/bin-1x1.png'
          },
        ],
      };

      getMockFetch().mockResolvedValueOnce({
        ok: true,
        json: async () => libraryWithAbsolutePaths,
      } as Response);

      const { result } = renderHook(() =>
        useLibraryData(singleLibrary, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should pass through unchanged
      expect(result.current.items[0].imageUrl).toBe('/libraries/default/images/bin-1x1.png');
    });

    it('should handle empty library selection', async () => {
      const { result } = renderHook(() =>
        useLibraryData(emptyLibraries, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      getMockFetch().mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response);

      const { result } = renderHook(() =>
        useLibraryData(singleLibrary, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still complete loading even with errors
      expect(result.current.items).toEqual([]);
    });

    it('should skip libraries not in manifest', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useLibraryData(nonExistentLibrary, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Library "non-existent" not found in manifest')
      );
      expect(result.current.items).toEqual([]);

      consoleWarnSpy.mockRestore();
    });

    it('should handle partial failures (some libraries load, others fail)', async () => {
      getMockFetch()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDefaultLibrary,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Server Error',
        } as Response);

      const { result } = renderHook(() =>
        useLibraryData(multipleLibraries, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should load items from successful library
      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].id).toBe('default:bin-1x1');
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      getMockFetch().mockResolvedValue({
        ok: true,
        json: async () => mockDefaultLibrary,
      } as Response);
    });

    it('getItemById should find item by prefixed ID', async () => {
      const { result } = renderHook(() =>
        useLibraryData(singleLibrary, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item = result.current.getItemById('default:bin-1x1');
      expect(item).toBeDefined();
      expect(item?.name).toBe('1x1 Bin');
    });

    it('getItemById should return undefined for non-existent item', async () => {
      const { result } = renderHook(() =>
        useLibraryData(singleLibrary, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item = result.current.getItemById('non-existent');
      expect(item).toBeUndefined();
    });

    it('getItemsByCategory should filter by category', async () => {
      const { result } = renderHook(() =>
        useLibraryData(singleLibrary, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const binItems = result.current.getItemsByCategory('bin');
      expect(binItems).toHaveLength(2);
      expect(binItems.every(item => item.categories.includes('bin'))).toBe(true);
    });

    it('getItemsByLibrary should filter by library ID', async () => {
      getMockFetch()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDefaultLibrary,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommunityLibrary,
        } as Response);

      const { result } = renderHook(() =>
        useLibraryData(multipleLibraries, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const defaultItems = result.current.getItemsByLibrary('default');
      expect(defaultItems).toHaveLength(2);
      expect(defaultItems.every(item => item.id.startsWith('default:'))).toBe(true);

      const communityItems = result.current.getItemsByLibrary('community');
      expect(communityItems).toHaveLength(1);
      expect(communityItems[0].id).toBe('community:custom-1x1');
    });
  });

  describe('Refresh', () => {
    it('should reload libraries when refreshLibrary is called', async () => {
      getMockFetch().mockResolvedValue({
        ok: true,
        json: async () => mockDefaultLibrary,
      } as Response);

      const { result } = renderHook(() =>
        useLibraryData(singleLibrary, manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);

      // Call refresh
      await result.current.refreshLibrary();

      // Should still have items after refresh
      expect(result.current.items).toHaveLength(2);
    });
  });

  describe('Library Selection Changes', () => {
    it('should reload when selected libraries change', async () => {
      getMockFetch()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDefaultLibrary,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommunityLibrary,
        } as Response);

      const { result, rerender } = renderHook(
        ({ libs }) => useLibraryData(libs, manifestLibraries),
        { initialProps: { libs: singleLibrary } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);

      // Change to community library - use stable reference
      const communityOnly = ['community'];
      rerender({ libs: communityOnly });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe('community:custom-1x1');
    });
  });
});
