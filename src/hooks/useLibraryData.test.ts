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

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Multi-Library Loading', () => {
    it('should load single library', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDefaultLibrary,
      });

      const { result } = renderHook(() =>
        useLibraryData(['default'], manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].id).toBe('default:bin-1x1');
      expect(result.current.items[1].id).toBe('default:bin-2x2');
    });

    it('should load multiple libraries in parallel', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDefaultLibrary,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommunityLibrary,
        });

      const { result } = renderHook(() =>
        useLibraryData(['default', 'community'], manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items.map(i => i.id)).toContain('default:bin-1x1');
      expect(result.current.items.map(i => i.id)).toContain('community:custom-1x1');
    });

    it('should prefix item IDs with library name', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDefaultLibrary,
      });

      const { result } = renderHook(() =>
        useLibraryData(['default'], manifestLibraries)
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
            imageUrl: '/images/bin-1x1.png'
          },
        ],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => libraryWithImages,
      });

      const { result } = renderHook(() =>
        useLibraryData(['default'], manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items[0].imageUrl).toBe('/libraries/default/images/bin-1x1.png');
    });

    it('should handle empty library selection', async () => {
      const { result } = renderHook(() =>
        useLibraryData([], manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      const { result } = renderHook(() =>
        useLibraryData(['default'], manifestLibraries)
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
        useLibraryData(['non-existent'], manifestLibraries)
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
      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDefaultLibrary,
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Server Error',
        });

      const { result } = renderHook(() =>
        useLibraryData(['default', 'community'], manifestLibraries)
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
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockDefaultLibrary,
      });
    });

    it('getItemById should find item by prefixed ID', async () => {
      const { result } = renderHook(() =>
        useLibraryData(['default'], manifestLibraries)
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
        useLibraryData(['default'], manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const item = result.current.getItemById('non-existent');
      expect(item).toBeUndefined();
    });

    it('getItemsByCategory should filter by category', async () => {
      const { result } = renderHook(() =>
        useLibraryData(['default'], manifestLibraries)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const binItems = result.current.getItemsByCategory('bin');
      expect(binItems).toHaveLength(2);
      expect(binItems.every(item => item.categories.includes('bin'))).toBe(true);
    });

    it('getItemsByLibrary should filter by library ID', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDefaultLibrary,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommunityLibrary,
        });

      const { result } = renderHook(() =>
        useLibraryData(['default', 'community'], manifestLibraries)
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
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockDefaultLibrary,
      });

      const { result } = renderHook(() =>
        useLibraryData(['default'], manifestLibraries)
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
      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDefaultLibrary,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCommunityLibrary,
        });

      const { result, rerender } = renderHook(
        ({ libs }) => useLibraryData(libs, manifestLibraries),
        { initialProps: { libs: ['default'] } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);

      // Change to community library
      rerender({ libs: ['community'] });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe('community:custom-1x1');
    });
  });
});
