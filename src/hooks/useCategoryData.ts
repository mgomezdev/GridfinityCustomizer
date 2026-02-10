import { useState, useEffect, useCallback } from 'react';
import type { Category } from '../types/gridfinity';

const STORAGE_KEY = 'gridfinity-categories';

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/categories.json');
  if (!response.ok) {
    throw new Error(`Failed to load categories: ${response.statusText}`);
  }
  const data = await response.json();
  if (!Array.isArray(data.categories)) {
    throw new Error('Invalid categories data format');
  }
  return data.categories;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'bin', name: 'Bins', color: '#646cff', order: 1 },
  { id: 'divider', name: 'Dividers', color: '#22c55e', order: 2 },
  { id: 'organizer', name: 'Organizers', color: '#f59e0b', order: 3 },
];

export interface UseCategoryDataResult {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  getCategoryById: (id: string) => Category | undefined;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  resetToDefaults: () => void;
  refreshCategories: () => Promise<void>;
}

export function useCategoryData(): UseCategoryDataResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [defaultCategories, setDefaultCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to load from file
      const fileCategories = await fetchCategories();
      setDefaultCategories(fileCategories);

      // Try to load custom from localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const customCategories: Category[] = JSON.parse(stored);

        // Validate custom categories
        if (Array.isArray(customCategories)) {
          for (const cat of customCategories) {
            if (!cat.id || !cat.name) {
              throw new Error('Invalid category: missing required fields');
            }
          }
          setCategories(customCategories);
        } else {
          setCategories(fileCategories);
        }
      } else {
        setCategories(fileCategories);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load categories from file:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setCategories(DEFAULT_CATEGORIES);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const saveToLocalStorage = (newCategories: Category[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCategories));
    } catch (err) {
      console.error('Failed to save categories to localStorage', err);
    }
  };

  const getCategoryById = useCallback((id: string): Category | undefined => {
    return categories.find(cat => cat.id === id);
  }, [categories]);

  const addCategory = (category: Category) => {
    // Validate required fields
    if (!category.id || !category.name) {
      throw new Error('Category must have id and name');
    }

    // Check for duplicate ID
    if (categories.find(existing => existing.id === category.id)) {
      throw new Error(`Category with id "${category.id}" already exists`);
    }

    // Check for duplicate name
    if (categories.find(existing => existing.name.toLowerCase() === category.name.toLowerCase())) {
      throw new Error(`Category with name "${category.name}" already exists`);
    }

    const newCategories = [...categories, category];
    setCategories(newCategories);
    saveToLocalStorage(newCategories);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    const categoryIndex = categories.findIndex(cat => cat.id === id);

    if (categoryIndex === -1) {
      throw new Error(`Category with id "${id}" not found`);
    }

    // If updating ID, check for duplicates
    if (updates.id && updates.id !== id) {
      if (categories.find(cat => cat.id === updates.id)) {
        throw new Error(`Category with id "${updates.id}" already exists`);
      }
    }

    // If updating name, check for duplicates
    if (updates.name && updates.name !== categories[categoryIndex].name) {
      if (categories.find(cat => cat.name.toLowerCase() === updates.name!.toLowerCase())) {
        throw new Error(`Category with name "${updates.name}" already exists`);
      }
    }

    const updatedCategory = { ...categories[categoryIndex], ...updates };

    // Validate required fields still exist
    if (!updatedCategory.id || !updatedCategory.name) {
      throw new Error('Updated category must have id and name');
    }

    const newCategories = [...categories];
    newCategories[categoryIndex] = updatedCategory;
    setCategories(newCategories);
    saveToLocalStorage(newCategories);
  };

  const deleteCategory = (id: string) => {
    const categoryExists = categories.find(cat => cat.id === id);

    if (!categoryExists) {
      throw new Error(`Category with id "${id}" not found`);
    }

    // Prevent deleting the last category
    if (categories.length === 1) {
      throw new Error('Cannot delete the last category');
    }

    const newCategories = categories.filter(cat => cat.id !== id);
    setCategories(newCategories);
    saveToLocalStorage(newCategories);
  };

  const resetToDefaults = () => {
    setCategories(defaultCategories);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to remove custom categories from localStorage', err);
    }
  };

  const refreshCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Reload from file
      const fileCategories = await fetchCategories();
      setDefaultCategories(fileCategories);
      setCategories(fileCategories);

      // Clear custom categories from localStorage
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.error('Failed to remove custom categories from localStorage', err);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to refresh categories:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsLoading(false);
    }
  };

  return {
    categories,
    isLoading,
    error,
    getCategoryById,
    addCategory,
    updateCategory,
    deleteCategory,
    resetToDefaults,
    refreshCategories,
  };
}
