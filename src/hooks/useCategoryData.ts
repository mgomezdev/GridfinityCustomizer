import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Category, LibraryItem } from '../types/gridfinity';
import { discoverCategories } from '../utils/categoryDiscovery';

export interface UseCategoryDataResult {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  getCategoryById: (id: string) => Category | undefined;
}

/**
 * Hook for deriving categories from library items
 * Categories are automatically discovered from item category tags
 *
 * @param libraryItems - All loaded library items
 * @returns Discovered categories with auto-generated names and colors
 */
export function useCategoryData(libraryItems: LibraryItem[]): UseCategoryDataResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Derive categories from library items
  const categories = useMemo(() => {
    try {
      setError(null);
      return discoverCategories(libraryItems);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to discover categories');
      setError(error);
      console.error('Category discovery error:', error);
      return [];
    }
  }, [libraryItems]);

  const getCategoryById = useCallback((id: string): Category | undefined => {
    return categories.find(cat => cat.id === id);
  }, [categories]);

  return {
    categories,
    isLoading,
    error,
    getCategoryById,
  };
}
