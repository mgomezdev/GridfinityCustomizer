import { useState, useEffect, useCallback } from 'react';
import type { LibraryItem, LibraryIndex } from '../types/gridfinity';
import { prefixItemId, resolveImagePath } from '../utils/libraryHelpers';

interface UseLibraryDataResult {
  items: LibraryItem[];
  isLoading: boolean;
  error: Error | null;
  getItemById: (prefixedId: string) => LibraryItem | undefined;
  getItemsByCategory: (category: string) => LibraryItem[];
  getItemsByLibrary: (libraryId: string) => LibraryItem[];
  refreshLibrary: () => Promise<void>;
}

/**
 * Hook for loading library items from multiple library sources
 *
 * @param selectedLibraryIds - Array of library IDs to load (e.g., ['default', 'community'])
 * @param manifestLibraries - Library metadata from manifest (for resolving paths)
 * @returns Library items with prefixed IDs and resolved image paths
 */
export function useLibraryData(
  selectedLibraryIds: string[],
  manifestLibraries: Array<{ id: string; path: string }>
): UseLibraryDataResult {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadLibraries = useCallback(async () => {
    if (selectedLibraryIds.length === 0) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all selected libraries in parallel
      const promises = selectedLibraryIds.map(async (libraryId) => {
        // Find library path from manifest
        const libraryMeta = manifestLibraries.find(lib => lib.id === libraryId);
        if (!libraryMeta) {
          console.warn(`Library "${libraryId}" not found in manifest, skipping`);
          return [];
        }

        try {
          const response = await fetch(libraryMeta.path);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${libraryId}: ${response.statusText}`);
          }

          const data: LibraryIndex = await response.json();

          if (!data.items || !Array.isArray(data.items)) {
            throw new Error(`Invalid library data format for ${libraryId}`);
          }

          // Derive library base path from manifest path
          // Example: "/libraries/simple-utensils/index.json" -> "/libraries/simple-utensils"
          const libraryBasePath = libraryMeta.path.substring(
            0,
            libraryMeta.path.lastIndexOf('/')
          );

          // Prefix item IDs and resolve image paths
          return data.items.map((item) => ({
            ...item,
            id: prefixItemId(libraryId, item.id),
            imageUrl: resolveImagePath(libraryBasePath, item.imageUrl),
          }));
        } catch (err) {
          console.error(`Failed to load library "${libraryId}":`, err);
          // Return empty array for failed libraries (partial failure)
          return [];
        }
      });

      // Wait for all libraries to load
      const results = await Promise.all(promises);

      // Flatten and merge all items
      const allItems = results.flat();

      setItems(allItems);
      setIsLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error loading libraries');
      setError(error);
      setIsLoading(false);
      console.error('Failed to load libraries:', error);
    }
  }, [selectedLibraryIds, manifestLibraries]);

  // Load libraries on mount or when selection changes
  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  const getItemById = useCallback((prefixedId: string): LibraryItem | undefined => {
    return items.find(item => item.id === prefixedId);
  }, [items]);

  const getItemsByCategory = useCallback((category: string): LibraryItem[] => {
    return items.filter(item => item.categories.includes(category));
  }, [items]);

  const getItemsByLibrary = useCallback((libraryId: string): LibraryItem[] => {
    const prefix = `${libraryId}:`;
    return items.filter(item => item.id.startsWith(prefix));
  }, [items]);

  const refreshLibrary = useCallback(async () => {
    await loadLibraries();
  }, [loadLibraries]);

  return {
    items,
    isLoading,
    error,
    getItemById,
    getItemsByCategory,
    getItemsByLibrary,
    refreshLibrary,
  };
}
