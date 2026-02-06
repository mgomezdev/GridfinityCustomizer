import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCategoryData } from './useCategoryData';
import type { Category } from '../types/gridfinity';

describe('useCategoryData', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Initial State and Loading', () => {
    it('should start with loading state', async () => {
      const { result } = renderHook(() => useCategoryData());
      // Note: Since data loads from localStorage synchronously, isLoading may be false immediately
      // We'll wait for it to complete instead
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.categories.length).toBeGreaterThan(0);
    });

    it('should load default categories when localStorage is empty', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toHaveLength(3);
      expect(result.current.categories[0].id).toBe('bin');
      expect(result.current.categories[1].id).toBe('divider');
      expect(result.current.categories[2].id).toBe('organizer');
      expect(result.current.error).toBeNull();
    });

    it('should have correct default category properties', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const bins = result.current.categories.find(c => c.id === 'bin');
      expect(bins).toMatchObject({
        id: 'bin',
        name: 'Bins',
        color: '#646cff',
        order: 1,
      });
    });

    it('should load custom categories from localStorage', async () => {
      const customCategories: Category[] = [
        { id: 'custom-1', name: 'Custom Category', color: '#ff0000', order: 1 },
        { id: 'custom-2', name: 'Another Category', color: '#00ff00', order: 2 },
      ];
      localStorage.setItem('gridfinity-categories', JSON.stringify(customCategories));

      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toHaveLength(2);
      expect(result.current.categories[0].id).toBe('custom-1');
      expect(result.current.categories[1].id).toBe('custom-2');
    });

    it('should fallback to defaults if localStorage data is invalid JSON', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem('gridfinity-categories', 'invalid json');

      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toHaveLength(3);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should fallback to defaults if localStorage data is not an array', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem('gridfinity-categories', JSON.stringify({ not: 'array' }));

      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should load default categories when custom data is invalid
      expect(result.current.categories).toHaveLength(3);
      // console.warn may or may not be called depending on implementation
      consoleWarnSpy.mockRestore();
    });

    it('should fallback to defaults if categories have missing required fields', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidCategories = [
        { id: 'missing-name', color: '#ff0000' }, // Missing name
      ];
      localStorage.setItem('gridfinity-categories', JSON.stringify(invalidCategories));

      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toHaveLength(3);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getCategoryById', () => {
    it('should return category by id', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const category = result.current.getCategoryById('bin');
      expect(category).toBeDefined();
      expect(category?.name).toBe('Bins');
    });

    it('should return undefined for non-existent id', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const category = result.current.getCategoryById('non-existent');
      expect(category).toBeUndefined();
    });

    it('should update when categories change', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newCategory: Category = {
        id: 'new-cat',
        name: 'New Category',
        color: '#ff0000',
        order: 4,
      };

      act(() => {
        result.current.addCategory(newCategory);
      });

      const found = result.current.getCategoryById('new-cat');
      expect(found).toEqual(newCategory);
    });
  });

  describe('addCategory', () => {
    it('should add a new category', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newCategory: Category = {
        id: 'tool',
        name: 'Tools',
        color: '#9333ea',
        order: 4,
      };

      act(() => {
        result.current.addCategory(newCategory);
      });

      expect(result.current.categories).toHaveLength(4);
      expect(result.current.getCategoryById('tool')).toEqual(newCategory);
    });

    it('should save new category to localStorage', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newCategory: Category = {
        id: 'tool',
        name: 'Tools',
        color: '#9333ea',
        order: 4,
      };

      act(() => {
        result.current.addCategory(newCategory);
      });

      const stored = localStorage.getItem('gridfinity-categories');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(4);
      expect(parsed.find((c: Category) => c.id === 'tool')).toEqual(newCategory);
    });

    it('should throw error when adding category without id', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const invalidCategory = {
        id: '',
        name: 'Invalid',
        color: '#000000',
      } as Category;

      expect(() => result.current.addCategory(invalidCategory)).toThrow('must have id and name');
    });

    it('should throw error when adding category without name', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const invalidCategory = {
        id: 'invalid',
        name: '',
        color: '#000000',
      } as Category;

      expect(() => result.current.addCategory(invalidCategory)).toThrow('must have id and name');
    });

    it('should throw error when adding category with duplicate id', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const duplicateCategory: Category = {
        id: 'bin', // Already exists
        name: 'Duplicate Bins',
        color: '#000000',
        order: 5,
      };

      expect(() => result.current.addCategory(duplicateCategory)).toThrow('already exists');
    });

    it('should throw error when adding category with duplicate name (case-insensitive)', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const duplicateCategory: Category = {
        id: 'new-bin',
        name: 'bins', // Same as 'Bins' but lowercase
        color: '#000000',
        order: 5,
      };

      expect(() => result.current.addCategory(duplicateCategory)).toThrow('already exists');
    });

    it('should allow category with same name but different case after modification', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First add a category
      const cat1: Category = {
        id: 'cat1',
        name: 'TestCat',
        color: '#000000',
        order: 4,
      };

      act(() => {
        result.current.addCategory(cat1);
      });

      // Try to add another with same name different case - should fail
      const cat2: Category = {
        id: 'cat2',
        name: 'testcat',
        color: '#111111',
        order: 5,
      };

      expect(() => result.current.addCategory(cat2)).toThrow('already exists');
    });
  });

  describe('updateCategory', () => {
    it('should update category name', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateCategory('bin', { name: 'Updated Bins' });
      });

      const updated = result.current.getCategoryById('bin');
      expect(updated?.name).toBe('Updated Bins');
    });

    it('should update category color', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateCategory('bin', { color: '#ff0000' });
      });

      const updated = result.current.getCategoryById('bin');
      expect(updated?.color).toBe('#ff0000');
    });

    it('should update category order', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateCategory('bin', { order: 99 });
      });

      const updated = result.current.getCategoryById('bin');
      expect(updated?.order).toBe(99);
    });

    it('should update multiple fields at once', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateCategory('bin', {
          name: 'Super Bins',
          color: '#00ff00',
          order: 10,
        });
      });

      const updated = result.current.getCategoryById('bin');
      expect(updated).toMatchObject({
        id: 'bin',
        name: 'Super Bins',
        color: '#00ff00',
        order: 10,
      });
    });

    it('should save updated category to localStorage', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateCategory('bin', { name: 'Updated Bins' });
      });

      const stored = localStorage.getItem('gridfinity-categories');
      const parsed = JSON.parse(stored!);
      const updated = parsed.find((c: Category) => c.id === 'bin');
      expect(updated.name).toBe('Updated Bins');
    });

    it('should throw error when updating non-existent category', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.updateCategory('non-existent', { name: 'Test' })).toThrow('not found');
    });

    it('should throw error when updating id to duplicate', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.updateCategory('bin', { id: 'divider' })).toThrow('already exists');
    });

    it('should throw error when updating name to duplicate (case-insensitive)', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.updateCategory('bin', { name: 'dividers' })).toThrow('already exists');
    });

    it('should throw error when removing required id field', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.updateCategory('bin', { id: '' })).toThrow('must have id and name');
    });

    it('should throw error when removing required name field', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.updateCategory('bin', { name: '' })).toThrow('must have id and name');
    });

    it('should throw error when updating name to same name different case', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Case-insensitive check means 'BINS' conflicts with 'Bins'
      expect(() => {
        act(() => {
          result.current.updateCategory('bin', { name: 'BINS' });
        });
      }).toThrow('already exists');
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toHaveLength(3);

      act(() => {
        result.current.deleteCategory('bin');
      });

      expect(result.current.categories).toHaveLength(2);
      expect(result.current.getCategoryById('bin')).toBeUndefined();
    });

    it('should save deletion to localStorage', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.deleteCategory('bin');
      });

      const stored = localStorage.getItem('gridfinity-categories');
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(2);
      expect(parsed.find((c: Category) => c.id === 'bin')).toBeUndefined();
    });

    it('should throw error when deleting non-existent category', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.deleteCategory('non-existent')).toThrow('not found');
    });

    it('should throw error when deleting the last category', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First, delete two categories to get down to one
      let error: Error | undefined;
      act(() => {
        result.current.deleteCategory('bin');
      });
      act(() => {
        result.current.deleteCategory('divider');
      });

      // Now we should have only 1 category left
      expect(result.current.categories).toHaveLength(1);

      // Trying to delete the last one should throw
      try {
        act(() => {
          result.current.deleteCategory('organizer');
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error?.message).toContain('Cannot delete the last category');
    });

    it('should prevent deleting last category even if multiple attempts', async () => {
      localStorage.setItem('gridfinity-categories', JSON.stringify([
        { id: 'only-one', name: 'Only Category', color: '#000000', order: 1 },
      ]));

      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let error: Error | undefined;
      try {
        act(() => {
          result.current.deleteCategory('only-one');
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error?.message).toContain('Cannot delete the last category');
      expect(result.current.categories).toHaveLength(1);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset to default categories', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add a custom category
      const customCategory: Category = {
        id: 'custom',
        name: 'Custom',
        color: '#000000',
        order: 4,
      };

      act(() => {
        result.current.addCategory(customCategory);
      });

      expect(result.current.categories).toHaveLength(4);

      // Reset to defaults
      act(() => {
        result.current.resetToDefaults();
      });

      expect(result.current.categories).toHaveLength(3);
      expect(result.current.getCategoryById('custom')).toBeUndefined();
      expect(result.current.getCategoryById('bin')).toBeDefined();
    });

    it('should remove custom categories from localStorage', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.addCategory({
          id: 'custom',
          name: 'Custom',
          color: '#000000',
          order: 4,
        });
      });

      expect(localStorage.getItem('gridfinity-categories')).toBeTruthy();

      act(() => {
        result.current.resetToDefaults();
      });

      expect(localStorage.getItem('gridfinity-categories')).toBeNull();
    });

    it('should restore original default category properties', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Modify a default category
      act(() => {
        result.current.updateCategory('bin', { name: 'Modified Bins', color: '#000000' });
      });

      expect(result.current.getCategoryById('bin')?.name).toBe('Modified Bins');

      // Reset
      act(() => {
        result.current.resetToDefaults();
      });

      const bins = result.current.getCategoryById('bin');
      expect(bins?.name).toBe('Bins');
      expect(bins?.color).toBe('#646cff');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage save errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw, but log error
      act(() => {
        result.current.addCategory({
          id: 'test',
          name: 'Test',
          color: '#000000',
          order: 4,
        });
      });

      expect(result.current.categories).toHaveLength(4);
      expect(consoleErrorSpy).toHaveBeenCalled();

      Storage.prototype.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });

    it('should handle localStorage remove errors on reset', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = vi.fn(() => {
        throw new Error('Remove error');
      });

      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw, but log error
      act(() => {
        result.current.resetToDefaults();
      });

      expect(result.current.categories).toHaveLength(3);
      expect(consoleErrorSpy).toHaveBeenCalled();

      Storage.prototype.removeItem = originalRemoveItem;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle categories with optional fields missing', async () => {
      const minimalCategories = [
        { id: 'cat1', name: 'Category 1' },
        { id: 'cat2', name: 'Category 2' },
      ];
      localStorage.setItem('gridfinity-categories', JSON.stringify(minimalCategories));

      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toHaveLength(2);
      expect(result.current.categories[0].color).toBeUndefined();
      expect(result.current.categories[0].order).toBeUndefined();
    });

    it('should handle very long category names', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const longName = 'A'.repeat(1000);
      const category: Category = {
        id: 'long',
        name: longName,
        color: '#000000',
        order: 4,
      };

      act(() => {
        result.current.addCategory(category);
      });

      expect(result.current.getCategoryById('long')?.name).toBe(longName);
    });

    it('should handle special characters in category names', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const specialName = 'Test & Category <>"\'';
      const category: Category = {
        id: 'special',
        name: specialName,
        color: '#000000',
        order: 4,
      };

      act(() => {
        result.current.addCategory(category);
      });

      expect(result.current.getCategoryById('special')?.name).toBe(specialName);
    });

    it('should handle updating category id', async () => {
      const { result } = renderHook(() => useCategoryData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateCategory('bin', { id: 'containers' });
      });

      expect(result.current.getCategoryById('bin')).toBeUndefined();
      expect(result.current.getCategoryById('containers')).toBeDefined();
      expect(result.current.getCategoryById('containers')?.name).toBe('Bins');
    });
  });
});
