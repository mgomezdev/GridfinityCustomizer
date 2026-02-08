import { useState, useCallback, useMemo } from 'react';
import type { PlacedItem, PlacedItemWithValidity, DragData, LibraryItem } from '../types/gridfinity';

function hasCollision(
  items: PlacedItem[],
  x: number,
  y: number,
  width: number,
  height: number,
  excludeId?: string
): boolean {
  for (const item of items) {
    if (excludeId && item.instanceId === excludeId) continue;

    // AABB overlap check
    const overlapX = x < item.x + item.width && x + width > item.x;
    const overlapY = y < item.y + item.height && y + height > item.y;

    if (overlapX && overlapY) {
      return true;
    }
  }
  return false;
}

function isOutOfBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  gridX: number,
  gridY: number
): boolean {
  return x < 0 || y < 0 || x + width > gridX || y + height > gridY;
}

let instanceCounter = 0;

function generateInstanceId(): string {
  return `item-${++instanceCounter}-${Date.now()}`;
}

export function useGridItems(
  gridX: number,
  gridY: number,
  getItemById: (id: string) => LibraryItem | undefined
) {
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const placedItemsWithValidity: PlacedItemWithValidity[] = useMemo(() => {
    return placedItems.map(item => ({
      ...item,
      isValid: !hasCollision(placedItems, item.x, item.y, item.width, item.height, item.instanceId) &&
               !isOutOfBounds(item.x, item.y, item.width, item.height, gridX, gridY)
    }));
  }, [placedItems, gridX, gridY]);

  const addItem = useCallback((itemId: string, x: number, y: number) => {
    const libraryItem = getItemById(itemId);
    if (!libraryItem) return;

    const newItem: PlacedItem = {
      instanceId: generateInstanceId(),
      itemId,
      x,
      y,
      width: libraryItem.widthUnits,
      height: libraryItem.heightUnits,
      isRotated: false,
    };

    setPlacedItems(prev => [...prev, newItem]);
    setSelectedItemId(newItem.instanceId);
  }, [getItemById]);

  const moveItem = useCallback((instanceId: string, newX: number, newY: number) => {
    setPlacedItems(prev => prev.map(item =>
      item.instanceId === instanceId
        ? { ...item, x: newX, y: newY }
        : item
    ));
  }, []);

  const rotateItem = useCallback((instanceId: string) => {
    setPlacedItems(prev => prev.map(item => {
      if (item.instanceId !== instanceId) return item;

      return {
        ...item,
        width: item.height,
        height: item.width,
        isRotated: !item.isRotated,
      };
    }));
  }, []);

  const deleteItem = useCallback((instanceId: string) => {
    setPlacedItems(prev => prev.filter(item => item.instanceId !== instanceId));
    if (selectedItemId === instanceId) {
      setSelectedItemId(null);
    }
  }, [selectedItemId]);

  const clearAll = useCallback(() => {
    setPlacedItems([]);
    setSelectedItemId(null);
  }, []);

  const selectItem = useCallback((instanceId: string | null) => {
    setSelectedItemId(instanceId);
  }, []);

  const handleDrop = useCallback((dragData: DragData, dropX: number, dropY: number) => {
    if (dragData.type === 'library') {
      addItem(dragData.itemId, dropX, dropY);
    } else if (dragData.type === 'placed' && dragData.instanceId) {
      moveItem(dragData.instanceId, dropX, dropY);
    }
  }, [addItem, moveItem]);

  return {
    placedItems: placedItemsWithValidity,
    selectedItemId,
    addItem,
    moveItem,
    rotateItem,
    deleteItem,
    clearAll,
    selectItem,
    handleDrop,
  };
}
