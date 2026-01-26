import { useState, useEffect } from 'react';
import type { LibraryItem } from '../types/gridfinity';

interface LibraryData {
  version: string;
  items: LibraryItem[];
}

interface UseLibraryDataResult {
  items: LibraryItem[];
  isLoading: boolean;
  error: Error | null;
  getItemById: (id: string) => LibraryItem | undefined;
  getItemsByCategory: (category: LibraryItem['category']) => LibraryItem[];
}

export function useLibraryData(): UseLibraryDataResult {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLibrary() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/library.json');

        if (!response.ok) {
          throw new Error(`Failed to load library: ${response.statusText}`);
        }

        const data: LibraryData = await response.json();

        if (!data.items || !Array.isArray(data.items)) {
          throw new Error('Invalid library data format');
        }

        // Basic validation of items
        for (const item of data.items) {
          if (!item.id || !item.name || !item.category) {
            throw new Error(`Invalid item: missing required fields`);
          }
        }

        if (isMounted) {
          setItems(data.items);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          const error = err instanceof Error ? err : new Error('Unknown error loading library');
          setError(error);
          setIsLoading(false);
          console.error('Failed to load library:', error);
        }
      }
    }

    loadLibrary();

    return () => {
      isMounted = false;
    };
  }, []);

  const getItemById = (id: string): LibraryItem | undefined => {
    return items.find(item => item.id === id);
  };

  const getItemsByCategory = (category: LibraryItem['category']): LibraryItem[] => {
    return items.filter(item => item.category === category);
  };

  return {
    items,
    isLoading,
    error,
    getItemById,
    getItemsByCategory,
  };
}
