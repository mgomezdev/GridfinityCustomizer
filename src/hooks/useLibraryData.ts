import { useCallback, useMemo } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import type { LibraryItem } from '../types/gridfinity';
import { useDataSource } from '../contexts/DataSourceContext';
import { prefixItemId } from '../utils/libraryHelpers';

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
 * @param selectedLibraryIds - Array of library IDs to load (e.g., ['bins_standard', 'simple-utensils'])
 * @returns Library items with prefixed IDs and resolved image paths
 */
export function useLibraryData(
  selectedLibraryIds: string[]
): UseLibraryDataResult {
  const adapter = useDataSource();
  const queryClient = useQueryClient();

  // Use useQueries to fetch items for each selected library in parallel
  const queries = useQueries({
    queries: selectedLibraryIds.map((libraryId) => ({
      queryKey: ['library-items', libraryId],
      queryFn: () => adapter.getLibraryItems(libraryId),
      select: (rawItems: LibraryItem[]) =>
        rawItems.map((item) => ({
          ...item,
          id: prefixItemId(libraryId, item.id),
          imageUrl: item.imageUrl
            ? adapter.resolveImageUrl(libraryId, item.imageUrl)
            : undefined,
          perspectiveImageUrl: item.perspectiveImageUrl
            ? adapter.resolveImageUrl(libraryId, item.perspectiveImageUrl)
            : undefined,
        })),
    })),
  });

  // Combine results from all queries
  const items = useMemo(() => {
    return queries.flatMap((q) => q.data ?? []);
  }, [queries]);

  const isLoading = queries.some((q) => q.isLoading);

  const error = useMemo(() => {
    const firstError = queries.find((q) => q.error)?.error;
    return firstError instanceof Error ? firstError : firstError ? new Error(String(firstError)) : null;
  }, [queries]);

  const getItemById = useCallback(
    (prefixedId: string): LibraryItem | undefined => {
      return items.find((item) => item.id === prefixedId);
    },
    [items]
  );

  const getItemsByCategory = useCallback(
    (category: string): LibraryItem[] => {
      return items.filter((item) => item.categories.includes(category));
    },
    [items]
  );

  const getItemsByLibrary = useCallback(
    (libraryId: string): LibraryItem[] => {
      const prefix = `${libraryId}:`;
      return items.filter((item) => item.id.startsWith(prefix));
    },
    [items]
  );

  const refreshLibrary = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['library-items'] });
  }, [queryClient]);

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
