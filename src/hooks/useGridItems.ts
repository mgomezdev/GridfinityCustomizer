import { useState, useCallback, useMemo } from 'react';
import type { PlacedItem, PlacedItemWithValidity, DragData, LibraryItem, Rotation } from '../types/gridfinity';

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

const ROTATION_CW: Record<Rotation, Rotation> = { 0: 90, 90: 180, 180: 270, 270: 0 };
const ROTATION_CCW: Record<Rotation, Rotation> = { 0: 270, 90: 0, 180: 90, 270: 180 };

function isSideways(rotation: Rotation): boolean {
  return rotation === 90 || rotation === 270;
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
      rotation: 0,
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

  const rotateItem = useCallback((instanceId: string, direction: 'cw' | 'ccw' = 'cw') => {
    setPlacedItems(prev => prev.map(item => {
      if (item.instanceId !== instanceId) return item;

      const newRotation = direction === 'cw'
        ? ROTATION_CW[item.rotation]
        : ROTATION_CCW[item.rotation];

      const shouldSwap = isSideways(item.rotation) !== isSideways(newRotation);

      return {
        ...item,
        width: shouldSwap ? item.height : item.width,
        height: shouldSwap ? item.width : item.height,
        rotation: newRotation,
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
