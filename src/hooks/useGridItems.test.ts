import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGridItems } from './useGridItems';
import type { LibraryItem } from '../types/gridfinity';
import * as libraryItemsModule from '../data/libraryItems';

// Mock the libraryItems module
vi.mock('../data/libraryItems', () => ({
  getItemById: vi.fn(),
}));

describe('useGridItems', () => {
  const mockGetItemById = libraryItemsModule.getItemById as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    mockGetItemById.mockImplementation((id: string) => {
      const items: Record<string, LibraryItem> = {
        'bin-1x1': { id: 'bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#646cff', category: 'bin' },
        'bin-2x2': { id: 'bin-2x2', name: '2x2 Bin', widthUnits: 2, heightUnits: 2, color: '#646cff', category: 'bin' },
        'bin-1x2': { id: 'bin-1x2', name: '1x2 Bin', widthUnits: 1, heightUnits: 2, color: '#646cff', category: 'bin' },
      };
      return items[id];
    });
  });

  describe('Initial State', () => {
    it('should initialize with empty placed items', () => {
      const { result } = renderHook(() => useGridItems(4, 4));
      expect(result.current.placedItems).toEqual([]);
    });

    it('should initialize with no selected item', () => {
      const { result } = renderHook(() => useGridItems(4, 4));
      expect(result.current.selectedItemId).toBeNull();
    });
  });

  describe('addItem', () => {
    it('should add a valid item at the specified position', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      expect(result.current.placedItems).toHaveLength(1);
      expect(result.current.placedItems[0]).toMatchObject({
        itemId: 'bin-1x1',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        isRotated: false,
        isValid: true,
      });
    });

    it('should generate unique instance IDs for each item', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.addItem('bin-1x1', 1, 1);
      });

      expect(result.current.placedItems).toHaveLength(2);
      expect(result.current.placedItems[0].instanceId).not.toBe(result.current.placedItems[1].instanceId);
    });

    it('should select the newly added item', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      expect(result.current.selectedItemId).toBe(result.current.placedItems[0].instanceId);
    });

    it('should not add an item if the itemId is invalid', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('invalid-item', 0, 0);
      });

      expect(result.current.placedItems).toHaveLength(0);
    });

    it('should add item with correct dimensions from library', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-2x2', 0, 0);
      });

      expect(result.current.placedItems[0]).toMatchObject({
        width: 2,
        height: 2,
      });
    });
  });

  describe('moveItem', () => {
    it('should move an item to a new position', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.moveItem(instanceId, 2, 2);
      });

      expect(result.current.placedItems[0]).toMatchObject({
        x: 2,
        y: 2,
      });
    });

    it('should not affect other items when moving one item', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.addItem('bin-1x1', 1, 1);
      });

      const firstId = result.current.placedItems[0].instanceId;
      const secondId = result.current.placedItems[1].instanceId;

      act(() => {
        result.current.moveItem(firstId, 3, 3);
      });

      expect(result.current.placedItems[1]).toMatchObject({
        instanceId: secondId,
        x: 1,
        y: 1,
      });
    });
  });

  describe('rotateItem', () => {
    it('should swap width and height when rotating', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x2', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.rotateItem(instanceId);
      });

      expect(result.current.placedItems[0]).toMatchObject({
        width: 2,
        height: 1,
        isRotated: true,
      });
    });

    it('should toggle isRotated flag', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x2', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.rotateItem(instanceId);
      });
      expect(result.current.placedItems[0].isRotated).toBe(true);

      act(() => {
        result.current.rotateItem(instanceId);
      });
      expect(result.current.placedItems[0].isRotated).toBe(false);
    });

    it('should restore original dimensions after double rotation', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x2', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.rotateItem(instanceId);
        result.current.rotateItem(instanceId);
      });

      expect(result.current.placedItems[0]).toMatchObject({
        width: 1,
        height: 2,
        isRotated: false,
      });
    });
  });

  describe('deleteItem', () => {
    it('should remove the specified item', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.deleteItem(instanceId);
      });

      expect(result.current.placedItems).toHaveLength(0);
    });

    it('should clear selection if deleted item was selected', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;
      expect(result.current.selectedItemId).toBe(instanceId);

      act(() => {
        result.current.deleteItem(instanceId);
      });

      expect(result.current.selectedItemId).toBeNull();
    });

    it('should not affect other items when deleting one', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.addItem('bin-1x1', 1, 1);
      });

      const firstId = result.current.placedItems[0].instanceId;
      const secondId = result.current.placedItems[1].instanceId;

      act(() => {
        result.current.deleteItem(firstId);
      });

      expect(result.current.placedItems).toHaveLength(1);
      expect(result.current.placedItems[0].instanceId).toBe(secondId);
    });
  });

  describe('selectItem', () => {
    it('should select an item by instance ID', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.selectItem(instanceId);
      });

      expect(result.current.selectedItemId).toBe(instanceId);
    });

    it('should deselect when null is passed', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;
      expect(result.current.selectedItemId).toBe(instanceId);

      act(() => {
        result.current.selectItem(null);
      });

      expect(result.current.selectedItemId).toBeNull();
    });
  });

  describe('handleDrop', () => {
    it('should add a library item when drag type is library', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.handleDrop({ type: 'library', itemId: 'bin-1x1' }, 1, 1);
      });

      expect(result.current.placedItems).toHaveLength(1);
      expect(result.current.placedItems[0]).toMatchObject({
        itemId: 'bin-1x1',
        x: 1,
        y: 1,
      });
    });

    it('should move a placed item when drag type is placed', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.handleDrop({ type: 'placed', itemId: 'bin-1x1', instanceId }, 2, 2);
      });

      expect(result.current.placedItems).toHaveLength(1);
      expect(result.current.placedItems[0]).toMatchObject({
        x: 2,
        y: 2,
      });
    });
  });

  describe('Collision Detection', () => {
    it('should mark overlapping items as invalid', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-2x2', 0, 0);
        result.current.addItem('bin-2x2', 1, 1);
      });

      const invalidItems = result.current.placedItems.filter(item => !item.isValid);
      expect(invalidItems.length).toBeGreaterThan(0);
    });

    it('should mark non-overlapping items as valid', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.addItem('bin-1x1', 2, 2);
      });

      expect(result.current.placedItems[0].isValid).toBe(true);
      expect(result.current.placedItems[1].isValid).toBe(true);
    });

    it('should detect collision with adjacent touching items as valid', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.addItem('bin-1x1', 1, 0);
      });

      expect(result.current.placedItems[0].isValid).toBe(true);
      expect(result.current.placedItems[1].isValid).toBe(true);
    });
  });

  describe('Out of Bounds Detection', () => {
    it('should mark item as invalid when positioned outside grid', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-2x2', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.moveItem(instanceId, 3, 3);
      });

      expect(result.current.placedItems[0].isValid).toBe(false);
    });

    it('should mark item as valid at the maximum valid position', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-2x2', 2, 2);
      });

      expect(result.current.placedItems[0].isValid).toBe(true);
    });

    it('should mark item as valid at position (0, 0)', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      expect(result.current.placedItems[0].isValid).toBe(true);
    });

    it('should mark item as invalid after rotation causes out of bounds', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x2', 3, 2);
      });

      const instanceId = result.current.placedItems[0].instanceId;
      expect(result.current.placedItems[0].isValid).toBe(true);

      act(() => {
        result.current.rotateItem(instanceId);
      });

      expect(result.current.placedItems[0].isValid).toBe(false);
    });
  });

  describe('Grid Dimension Changes', () => {
    it('should revalidate items when grid dimensions change', () => {
      const { result, rerender } = renderHook(
        ({ gridX, gridY }) => useGridItems(gridX, gridY),
        { initialProps: { gridX: 4, gridY: 4 } }
      );

      act(() => {
        result.current.addItem('bin-2x2', 2, 2);
      });

      expect(result.current.placedItems[0].isValid).toBe(true);

      rerender({ gridX: 3, gridY: 3 });

      expect(result.current.placedItems[0].isValid).toBe(false);
    });

    it('should mark all items as valid when grid expands', () => {
      const { result, rerender } = renderHook(
        ({ gridX, gridY }) => useGridItems(gridX, gridY),
        { initialProps: { gridX: 3, gridY: 3 } }
      );

      act(() => {
        result.current.addItem('bin-2x2', 1, 1);
      });

      expect(result.current.placedItems[0].isValid).toBe(true);

      rerender({ gridX: 5, gridY: 5 });

      expect(result.current.placedItems[0].isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-dimension grid', () => {
      const { result } = renderHook(() => useGridItems(0, 0));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      expect(result.current.placedItems[0].isValid).toBe(false);
    });

    it('should handle negative coordinates', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.moveItem(instanceId, -1, -1);
      });

      expect(result.current.placedItems[0].isValid).toBe(false);
    });

    it('should handle multiple items in the same scenario', () => {
      const { result } = renderHook(() => useGridItems(4, 4));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.addItem('bin-1x1', 1, 0);
        result.current.addItem('bin-1x1', 2, 0);
        result.current.addItem('bin-1x1', 3, 0);
      });

      expect(result.current.placedItems).toHaveLength(4);
      expect(result.current.placedItems.every(item => item.isValid)).toBe(true);
    });
  });
});
