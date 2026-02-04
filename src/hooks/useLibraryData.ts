import { useState, useEffect, useCallback } from 'react';
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
  getItemsByCategory: (category: string) => LibraryItem[];
  addItem: (item: LibraryItem) => void;
  updateItem: (id: string, updates: Partial<LibraryItem>) => void;
  deleteItem: (id: string) => void;
  resetToDefaults: () => void;
  updateItemCategories: (oldCategoryId: string, newCategoryId: string) => void;
}

const STORAGE_KEY = 'gridfinity-library-custom';

export function useLibraryData(): UseLibraryDataResult {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [defaultItems, setDefaultItems] = useState<LibraryItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadLibrary() {
      try {
        setIsLoading(true);
        setError(null);

        // Load default library from JSON
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
          if (!item.id || !item.name || !item.categories || item.categories.length === 0) {
            throw new Error(`Invalid item: missing required fields or empty categories`);
          }
        }

        if (isMounted) {
          setDefaultItems(data.items);

          // Check for custom library in localStorage
          try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
              const customItems: LibraryItem[] = JSON.parse(stored);

              // Validate custom items
              if (Array.isArray(customItems)) {
                for (const item of customItems) {
                  if (!item.id || !item.name || !item.categories || item.categories.length === 0) {
                    throw new Error('Invalid custom item: missing required fields or empty categories');
                  }
                }
                setItems(customItems);
              } else {
                setItems(data.items);
              }
            } else {
              setItems(data.items);
            }
          } catch (storageError) {
            console.warn('Failed to load custom library from localStorage, using defaults', storageError);
            setItems(data.items);
          }

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

  const getItemById = useCallback((id: string): LibraryItem | undefined => {
    return items.find(item => item.id === id);
  }, [items]);

  const getItemsByCategory = useCallback((category: string): LibraryItem[] => {
    return items.filter(item => item.categories.includes(category));
  }, [items]);

  const saveToLocalStorage = (newItems: LibraryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (err) {
      console.error('Failed to save library to localStorage', err);
    }
  };

  const addItem = (item: LibraryItem) => {
    // Validate required fields
    if (!item.id || !item.name || !item.categories || item.categories.length === 0) {
      throw new Error('Item must have id, name, and at least one category');
    }

    // Normalize categories (remove duplicates)
    item.categories = [...new Set(item.categories)];

    // Check for duplicate ID
    if (items.find(existing => existing.id === item.id)) {
      throw new Error(`Item with id "${item.id}" already exists`);
    }

    const newItems = [...items, item];
    setItems(newItems);
    saveToLocalStorage(newItems);
  };

  const updateItem = (id: string, updates: Partial<LibraryItem>) => {
    const itemIndex = items.findIndex(item => item.id === id);

    if (itemIndex === -1) {
      throw new Error(`Item with id "${id}" not found`);
    }

    // If updating ID, check for duplicates
    if (updates.id && updates.id !== id) {
      if (items.find(item => item.id === updates.id)) {
        throw new Error(`Item with id "${updates.id}" already exists`);
      }
    }

    const updatedItem = { ...items[itemIndex], ...updates };

    // Validate required fields still exist
    if (!updatedItem.id || !updatedItem.name || !updatedItem.categories || updatedItem.categories.length === 0) {
      throw new Error('Updated item must have id, name, and at least one category');
    }

    // Normalize categories (remove duplicates)
    updatedItem.categories = [...new Set(updatedItem.categories)];

    const newItems = [...items];
    newItems[itemIndex] = updatedItem;
    setItems(newItems);
    saveToLocalStorage(newItems);
  };

  const deleteItem = (id: string) => {
    const itemExists = items.find(item => item.id === id);

    if (!itemExists) {
      throw new Error(`Item with id "${id}" not found`);
    }

    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    saveToLocalStorage(newItems);
  };

  const resetToDefaults = () => {
    setItems(defaultItems);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to remove custom library from localStorage', err);
    }
  };

  const updateItemCategories = useCallback((oldCategoryId: string, newCategoryId: string) => {
    const updatedItems = items.map(item => ({
      ...item,
      categories: item.categories
        .filter(id => id !== oldCategoryId)
        .concat(item.categories.includes(oldCategoryId) ? [newCategoryId] : [])
    }));
    setItems(updatedItems);
    saveToLocalStorage(updatedItems);
  }, [items]);

  return {
    items,
    isLoading,
    error,
    getItemById,
    getItemsByCategory,
    addItem,
    updateItem,
    deleteItem,
    resetToDefaults,
    updateItemCategories,
  };
}
