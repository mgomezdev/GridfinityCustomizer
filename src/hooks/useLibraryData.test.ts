import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLibraryData } from './useLibraryData';

describe('useLibraryData', () => {
  const mockLibraryData = {
    version: '1.0.0',
    items: [
      { id: 'bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#646cff', category: 'bin' },
      { id: 'bin-2x2', name: '2x2 Bin', widthUnits: 2, heightUnits: 2, color: '#646cff', category: 'bin' },
      { id: 'divider-1x1', name: '1x1 Divider', widthUnits: 1, heightUnits: 1, color: '#22c55e', category: 'divider' },
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
    expect(bins.every(item => item.category === 'bin')).toBe(true);

    const dividers = result.current.getItemsByCategory('divider');
    expect(dividers).toHaveLength(1);
    expect(dividers[0].category).toBe('divider');

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
});
