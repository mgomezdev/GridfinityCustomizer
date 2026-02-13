import { useState, useCallback, useMemo, useRef } from 'react';
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

function findValidPosition(
  items: PlacedItem[],
  width: number,
  height: number,
  startX: number,
  startY: number,
  gridX: number,
  gridY: number,
  excludeId?: string
): { x: number; y: number } | null {
  if (
    !isOutOfBounds(startX, startY, width, height, gridX, gridY) &&
    !hasCollision(items, startX, startY, width, height, excludeId)
  ) {
    return { x: startX, y: startY };
  }

  for (let radius = 1; radius <= Math.max(gridX, gridY); radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const x = startX + dx;
        const y = startY + dy;
        if (
          !isOutOfBounds(x, y, width, height, gridX, gridY) &&
          !hasCollision(items, x, y, width, height, excludeId)
        ) {
          return { x, y };
        }
      }
    }
  }

  return null;
}

export function useGridItems(
  gridX: number,
  gridY: number,
  getItemById: (id: string) => LibraryItem | undefined
) {
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<PlacedItem[]>([]);

  // Refs for synchronous cross-state reads within the same React batch.
  // Updated eagerly so chained operations (e.g. addItem→copyItems) see latest values.
  const itemsRef = useRef<PlacedItem[]>(placedItems);
  const selectedRef = useRef<string | null>(selectedItemId);
  const clipboardRef = useRef<PlacedItem[]>(clipboard);

  const updateItems = useCallback((items: PlacedItem[]) => {
    itemsRef.current = items;
    setPlacedItems(items);
  }, []);

  const updateSelected = useCallback((id: string | null) => {
    selectedRef.current = id;
    setSelectedItemId(id);
  }, []);

  const updateClipboard = useCallback((items: PlacedItem[]) => {
    clipboardRef.current = items;
    setClipboard(items);
  }, []);

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

    updateItems([...itemsRef.current, newItem]);
    updateSelected(newItem.instanceId);
  }, [getItemById, updateItems, updateSelected]);

  const moveItem = useCallback((instanceId: string, newX: number, newY: number) => {
    const updated = itemsRef.current.map(item =>
      item.instanceId === instanceId ? { ...item, x: newX, y: newY } : item
    );
    updateItems(updated);
  }, [updateItems]);

  const rotateItem = useCallback((instanceId: string, direction: 'cw' | 'ccw' = 'cw') => {
    const updated = itemsRef.current.map(item => {
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
    });
    updateItems(updated);
  }, [updateItems]);

  const deleteItem = useCallback((instanceId: string) => {
    updateItems(itemsRef.current.filter(item => item.instanceId !== instanceId));
    if (selectedRef.current === instanceId) {
      updateSelected(null);
    }
  }, [updateItems, updateSelected]);

  const clearAll = useCallback(() => {
    updateItems([]);
    updateSelected(null);
  }, [updateItems, updateSelected]);

  const selectItem = useCallback((instanceId: string | null) => {
    updateSelected(instanceId);
  }, [updateSelected]);

  const handleDrop = useCallback((dragData: DragData, dropX: number, dropY: number) => {
    if (dragData.type === 'library') {
      addItem(dragData.itemId, dropX, dropY);
    } else if (dragData.type === 'placed' && dragData.instanceId) {
      moveItem(dragData.instanceId, dropX, dropY);
    }
  }, [addItem, moveItem]);

  const duplicateItem = useCallback(() => {
    const id = selectedRef.current;
    if (!id) return;

    const items = itemsRef.current;
    const source = items.find(item => item.instanceId === id);
    if (!source) return;

    const pos = findValidPosition(
      items, source.width, source.height,
      source.x + 1, source.y + 1,
      gridX, gridY
    );
    if (!pos) return;

    const newItem: PlacedItem = {
      instanceId: generateInstanceId(),
      itemId: source.itemId,
      x: pos.x,
      y: pos.y,
      width: source.width,
      height: source.height,
      rotation: source.rotation,
    };

    updateItems([...items, newItem]);
    updateSelected(newItem.instanceId);
  }, [gridX, gridY, updateItems, updateSelected]);

  const copyItems = useCallback(() => {
    const id = selectedRef.current;
    if (!id) {
      updateClipboard([]);
      return;
    }
    const selected = itemsRef.current.filter(item => item.instanceId === id);
    updateClipboard(selected);
  }, [updateClipboard]);

  const pasteItems = useCallback(() => {
    const clipboardItems = clipboardRef.current;
    if (clipboardItems.length === 0) return;

    const currentItems = itemsRef.current;
    const newItems: PlacedItem[] = [];

    for (const item of clipboardItems) {
      const centerX = Math.floor(gridX / 2);
      const centerY = Math.floor(gridY / 2);

      const pos = findValidPosition(
        [...currentItems, ...newItems], item.width, item.height,
        centerX, centerY,
        gridX, gridY
      );
      if (!pos) continue;

      newItems.push({
        instanceId: generateInstanceId(),
        itemId: item.itemId,
        x: pos.x,
        y: pos.y,
        width: item.width,
        height: item.height,
        rotation: item.rotation,
      });
    }

    if (newItems.length === 0) return;

    updateItems([...currentItems, ...newItems]);
    updateSelected(newItems[newItems.length - 1].instanceId);
  }, [gridX, gridY, updateItems, updateSelected]);

  return {
    placedItems: placedItemsWithValidity,
    selectedItemId,
    clipboard,
    addItem,
    moveItem,
    rotateItem,
    deleteItem,
    clearAll,
    selectItem,
    handleDrop,
    duplicateItem,
    copyItems,
    pasteItems,
  };
}
