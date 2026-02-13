import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGridItems } from './useGridItems';
import type { LibraryItem } from '../types/gridfinity';

describe('useGridItems', () => {
  // Mock library items
  const mockLibraryItems: Record<string, LibraryItem> = {
    'bin-1x1': { id: 'bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#646cff', categories: ['bin'] },
    'bin-2x2': { id: 'bin-2x2', name: '2x2 Bin', widthUnits: 2, heightUnits: 2, color: '#646cff', categories: ['bin'] },
    'bin-1x2': { id: 'bin-1x2', name: '1x2 Bin', widthUnits: 1, heightUnits: 2, color: '#646cff', categories: ['bin'] },
  };

  const mockGetItemById = (id: string): LibraryItem | undefined => {
    return mockLibraryItems[id];
  };

  describe('Initial State', () => {
    it('should initialize with empty placed items', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));
      expect(result.current.placedItems).toEqual([]);
    });

    it('should initialize with no selected item', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));
      expect(result.current.selectedItemId).toBeNull();
    });
  });

  describe('addItem', () => {
    it('should add a valid item at the specified position', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
        rotation: 0,
        isValid: true,
      });
    });

    it('should generate unique instance IDs for each item', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.addItem('bin-1x1', 1, 1);
      });

      expect(result.current.placedItems).toHaveLength(2);
      expect(result.current.placedItems[0].instanceId).not.toBe(result.current.placedItems[1].instanceId);
    });

    it('should select the newly added item', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      expect(result.current.selectedItemId).toBe(result.current.placedItems[0].instanceId);
    });

    it('should not add an item if the itemId is invalid', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('invalid-item', 0, 0);
      });

      expect(result.current.placedItems).toHaveLength(0);
    });

    it('should add item with correct dimensions from library', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
    it('should swap width and height when rotating CW from 0 to 90', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x2', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.rotateItem(instanceId, 'cw');
      });

      expect(result.current.placedItems[0]).toMatchObject({
        width: 2,
        height: 1,
        rotation: 90,
      });
    });

    it('should cycle CW through all four rotation states', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x2', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      // 0 -> 90
      act(() => { result.current.rotateItem(instanceId, 'cw'); });
      expect(result.current.placedItems[0].rotation).toBe(90);
      expect(result.current.placedItems[0]).toMatchObject({ width: 2, height: 1 });

      // 90 -> 180
      act(() => { result.current.rotateItem(instanceId, 'cw'); });
      expect(result.current.placedItems[0].rotation).toBe(180);
      expect(result.current.placedItems[0]).toMatchObject({ width: 1, height: 2 });

      // 180 -> 270
      act(() => { result.current.rotateItem(instanceId, 'cw'); });
      expect(result.current.placedItems[0].rotation).toBe(270);
      expect(result.current.placedItems[0]).toMatchObject({ width: 2, height: 1 });

      // 270 -> 0
      act(() => { result.current.rotateItem(instanceId, 'cw'); });
      expect(result.current.placedItems[0].rotation).toBe(0);
      expect(result.current.placedItems[0]).toMatchObject({ width: 1, height: 2 });
    });

    it('should cycle CCW through all four rotation states', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x2', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      // 0 -> 270
      act(() => { result.current.rotateItem(instanceId, 'ccw'); });
      expect(result.current.placedItems[0].rotation).toBe(270);
      expect(result.current.placedItems[0]).toMatchObject({ width: 2, height: 1 });

      // 270 -> 180
      act(() => { result.current.rotateItem(instanceId, 'ccw'); });
      expect(result.current.placedItems[0].rotation).toBe(180);
      expect(result.current.placedItems[0]).toMatchObject({ width: 1, height: 2 });

      // 180 -> 90
      act(() => { result.current.rotateItem(instanceId, 'ccw'); });
      expect(result.current.placedItems[0].rotation).toBe(90);
      expect(result.current.placedItems[0]).toMatchObject({ width: 2, height: 1 });

      // 90 -> 0
      act(() => { result.current.rotateItem(instanceId, 'ccw'); });
      expect(result.current.placedItems[0].rotation).toBe(0);
      expect(result.current.placedItems[0]).toMatchObject({ width: 1, height: 2 });
    });

    it('should restore original dimensions after two CW rotations', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x2', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.rotateItem(instanceId, 'cw');
        result.current.rotateItem(instanceId, 'cw');
      });

      expect(result.current.placedItems[0]).toMatchObject({
        width: 1,
        height: 2,
        rotation: 180,
      });
    });

    it('should default to CW rotation when no direction specified', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
        rotation: 90,
      });
    });
  });

  describe('deleteItem', () => {
    it('should remove the specified item', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-2x2', 0, 0);
        result.current.addItem('bin-2x2', 1, 1);
      });

      const invalidItems = result.current.placedItems.filter(item => !item.isValid);
      expect(invalidItems.length).toBeGreaterThan(0);
    });

    it('should mark non-overlapping items as valid', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.addItem('bin-1x1', 2, 2);
      });

      expect(result.current.placedItems[0].isValid).toBe(true);
      expect(result.current.placedItems[1].isValid).toBe(true);
    });

    it('should detect collision with adjacent touching items as valid', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-2x2', 2, 2);
      });

      expect(result.current.placedItems[0].isValid).toBe(true);
    });

    it('should mark item as valid at position (0, 0)', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      expect(result.current.placedItems[0].isValid).toBe(true);
    });

    it('should mark item as invalid after rotation causes out of bounds', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x2', 3, 2);
      });

      const instanceId = result.current.placedItems[0].instanceId;
      expect(result.current.placedItems[0].isValid).toBe(true);

      act(() => {
        result.current.rotateItem(instanceId, 'cw');
      });

      expect(result.current.placedItems[0].isValid).toBe(false);
    });
  });

  describe('Grid Dimension Changes', () => {
    it('should revalidate items when grid dimensions change', () => {
      const { result, rerender } = renderHook(
        ({ gridX, gridY }) => useGridItems(gridX, gridY, mockGetItemById),
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
        ({ gridX, gridY }) => useGridItems(gridX, gridY, mockGetItemById),
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

  describe('clearAll', () => {
    it('should remove all placed items', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.addItem('bin-1x1', 1, 0);
        result.current.addItem('bin-2x2', 2, 2);
      });

      expect(result.current.placedItems).toHaveLength(3);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.placedItems).toHaveLength(0);
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      expect(result.current.selectedItemId).not.toBeNull();

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.selectedItemId).toBeNull();
    });

    it('should handle empty state gracefully', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      expect(result.current.placedItems).toHaveLength(0);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.placedItems).toHaveLength(0);
      expect(result.current.selectedItemId).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-dimension grid', () => {
      const { result } = renderHook(() => useGridItems(0, 0, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      expect(result.current.placedItems[0].isValid).toBe(false);
    });

    it('should handle negative coordinates', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

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
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.addItem('bin-1x1', 1, 0);
        result.current.addItem('bin-1x1', 2, 0);
        result.current.addItem('bin-1x1', 3, 0);
      });

      expect(result.current.placedItems).toHaveLength(4);
      expect(result.current.placedItems.every(item => item.isValid)).toBe(true);
    });

    it('should handle very large grid (100x100)', () => {
      const { result } = renderHook(() => useGridItems(100, 100, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.addItem('bin-1x1', 99, 99);
      });

      expect(result.current.placedItems).toHaveLength(2);
      expect(result.current.placedItems.every(item => item.isValid)).toBe(true);
    });

    it('should handle placing item at exact boundary', () => {
      const { result } = renderHook(() => useGridItems(5, 5, mockGetItemById));

      act(() => {
        result.current.addItem('bin-2x2', 3, 3);
      });

      // 2x2 item at position (3,3) on a 5x5 grid:
      // occupies cells (3,3), (4,3), (3,4), (4,4) - all within bounds
      expect(result.current.placedItems[0].isValid).toBe(true);
    });

    it('should handle rotation on 1x1 item (dimensions unchanged)', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.rotateItem(instanceId, 'cw');
      });

      expect(result.current.placedItems[0]).toMatchObject({
        width: 1,
        height: 1,
        rotation: 90,
      });
    });

    it('should handle deleting non-existent item gracefully', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      act(() => {
        result.current.deleteItem('non-existent-id');
      });

      // Should not crash, item count unchanged
      expect(result.current.placedItems).toHaveLength(1);
    });

    it('should handle moving non-existent item gracefully', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      act(() => {
        result.current.moveItem('non-existent-id', 2, 2);
      });

      // Should not crash, item position unchanged
      expect(result.current.placedItems[0]).toMatchObject({ x: 0, y: 0 });
    });

    it('should handle rotating non-existent item gracefully', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      act(() => {
        result.current.rotateItem('non-existent-id');
      });

      // Should not crash, item rotation unchanged
      expect(result.current.placedItems[0].rotation).toBe(0);
    });
  });

  describe('duplicateItem', () => {
    it('should duplicate selected item with new instanceId', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      const originalId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.duplicateItem();
      });

      expect(result.current.placedItems).toHaveLength(2);
      expect(result.current.placedItems[1].instanceId).not.toBe(originalId);
    });

    it('should preserve rotation state on duplicate', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x2', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.rotateItem(instanceId, 'cw');
      });

      expect(result.current.placedItems[0].rotation).toBe(90);

      act(() => {
        result.current.duplicateItem();
      });

      expect(result.current.placedItems).toHaveLength(2);
      expect(result.current.placedItems[1].rotation).toBe(90);
    });

    it('should offset duplicate by (+1, +1) from original', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      act(() => {
        result.current.duplicateItem();
      });

      expect(result.current.placedItems[1]).toMatchObject({
        x: 1,
        y: 1,
      });
    });

    it('should not duplicate when nothing is selected', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.selectItem(null);
      });

      act(() => {
        result.current.duplicateItem();
      });

      expect(result.current.placedItems).toHaveLength(1);
    });

    it('should select the newly duplicated item', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      act(() => {
        result.current.duplicateItem();
      });

      const duplicatedId = result.current.placedItems[1].instanceId;
      expect(result.current.selectedItemId).toBe(duplicatedId);
    });

    it('should handle duplicate when item is at grid edge', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 3, 3);
      });

      act(() => {
        result.current.duplicateItem();
      });

      // Should try to find a valid nearby position
      expect(result.current.placedItems).toHaveLength(2);
    });

    it('should not duplicate if no valid nearby position exists', () => {
      const { result } = renderHook(() => useGridItems(2, 2, mockGetItemById));

      // Fill entire grid
      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.addItem('bin-1x1', 1, 0);
        result.current.addItem('bin-1x1', 0, 1);
        result.current.addItem('bin-1x1', 1, 1);
      });

      const firstId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.selectItem(firstId);
        result.current.duplicateItem();
      });

      // Grid is full, cannot duplicate
      expect(result.current.placedItems).toHaveLength(4);
    });

    it('should maintain original item unchanged', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 1, 1);
      });

      const originalItem = { ...result.current.placedItems[0] };

      act(() => {
        result.current.duplicateItem();
      });

      expect(result.current.placedItems[0]).toMatchObject({
        instanceId: originalItem.instanceId,
        itemId: originalItem.itemId,
        x: originalItem.x,
        y: originalItem.y,
        rotation: originalItem.rotation,
      });
    });

    it('should preserve the itemId reference to the same library item', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-2x2', 0, 0);
      });

      act(() => {
        result.current.duplicateItem();
      });

      expect(result.current.placedItems[0].itemId).toBe('bin-2x2');
      expect(result.current.placedItems[1].itemId).toBe('bin-2x2');
      expect(result.current.placedItems[0].itemId).toBe(result.current.placedItems[1].itemId);
    });
  });

  describe('copyItems', () => {
    it('should copy selected item to clipboard', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      act(() => {
        result.current.copyItems();
      });

      expect(result.current.clipboard).toHaveLength(1);
      expect(result.current.clipboard[0]).toMatchObject({
        itemId: 'bin-1x1',
        x: 0,
        y: 0,
      });
    });

    it('should return clipboard contents', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 1, 1);
      });

      act(() => {
        result.current.copyItems();
      });

      const clipboard = result.current.clipboard;
      expect(clipboard).toBeDefined();
      expect(clipboard).toHaveLength(1);
    });

    it('should not modify placed items when copying', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      const originalLength = result.current.placedItems.length;

      act(() => {
        result.current.copyItems();
      });

      expect(result.current.placedItems).toHaveLength(originalLength);
    });

    it('should handle copy when nothing is selected', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.selectItem(null);
      });

      act(() => {
        result.current.copyItems();
      });

      expect(result.current.clipboard).toHaveLength(0);
    });

    it('should overwrite previous clipboard on new copy', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      act(() => {
        result.current.copyItems();
      });

      expect(result.current.clipboard[0].itemId).toBe('bin-1x1');

      act(() => {
        result.current.addItem('bin-2x2', 1, 1);
      });

      const newItemId = result.current.placedItems[1].instanceId;

      act(() => {
        result.current.selectItem(newItemId);
        result.current.copyItems();
      });

      expect(result.current.clipboard).toHaveLength(1);
      expect(result.current.clipboard[0].itemId).toBe('bin-2x2');
    });
  });

  describe('pasteItems', () => {
    it('should paste clipboard item at grid center', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.copyItems();
      });

      act(() => {
        result.current.pasteItems();
      });

      expect(result.current.placedItems).toHaveLength(2);
      // Grid center for 4x4 is (2, 2)
      expect(result.current.placedItems[1]).toMatchObject({
        x: 2,
        y: 2,
      });
    });

    it('should create new instanceId for pasted item', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
      });

      const originalId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.copyItems();
        result.current.pasteItems();
      });

      expect(result.current.placedItems[1].instanceId).not.toBe(originalId);
    });

    it('should preserve rotation from clipboard', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x2', 0, 0);
      });

      const instanceId = result.current.placedItems[0].instanceId;

      act(() => {
        result.current.rotateItem(instanceId, 'cw');
        result.current.copyItems();
        result.current.pasteItems();
      });

      expect(result.current.placedItems[1].rotation).toBe(90);
    });

    it('should offset paste if position is occupied', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.copyItems();
        // Place item at grid center
        result.current.addItem('bin-1x1', 2, 2);
      });

      act(() => {
        result.current.pasteItems();
      });

      expect(result.current.placedItems).toHaveLength(3);
      // Should paste at offset position, not at grid center (2,2)
      expect(result.current.placedItems[2]).not.toMatchObject({
        x: 2,
        y: 2,
      });
    });

    it('should not paste when clipboard is empty', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.pasteItems();
      });

      expect(result.current.placedItems).toHaveLength(0);
    });

    it('should select the pasted item', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-1x1', 0, 0);
        result.current.copyItems();
        result.current.pasteItems();
      });

      const pastedId = result.current.placedItems[1].instanceId;
      expect(result.current.selectedItemId).toBe(pastedId);
    });

    it('should handle pasting item that would be out of bounds', () => {
      const { result } = renderHook(() => useGridItems(4, 4, mockGetItemById));

      act(() => {
        result.current.addItem('bin-2x2', 0, 0);
        result.current.copyItems();
      });

      act(() => {
        result.current.pasteItems();
      });

      // Grid center is (2,2), but 2x2 item at (2,2) would extend to (4,4) which is out of bounds
      // Should try to fit within grid
      expect(result.current.placedItems).toHaveLength(2);
      const pastedItem = result.current.placedItems[1];
      expect(pastedItem.x + pastedItem.width).toBeLessThanOrEqual(4);
      expect(pastedItem.y + pastedItem.height).toBeLessThanOrEqual(4);
    });
  });
});
