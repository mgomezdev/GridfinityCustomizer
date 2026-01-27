import { useMemo } from 'react';
import type { PlacedItem, BOMItem, LibraryItem } from '../types/gridfinity';

export function useBillOfMaterials(placedItems: PlacedItem[], libraryItems: LibraryItem[]): BOMItem[] {
  return useMemo(() => {
    // Group placed items by itemId and count quantities
    const itemCounts = new Map<string, number>();

    placedItems.forEach(placedItem => {
      const currentCount = itemCounts.get(placedItem.itemId) || 0;
      itemCounts.set(placedItem.itemId, currentCount + 1);
    });

    // Convert to BOMItem array with library item details
    const bomItems: BOMItem[] = [];

    itemCounts.forEach((quantity, itemId) => {
      const libraryItem = libraryItems.find(item => item.id === itemId);
      if (libraryItem) {
        bomItems.push({
          itemId: libraryItem.id,
          name: libraryItem.name,
          widthUnits: libraryItem.widthUnits,
          heightUnits: libraryItem.heightUnits,
          color: libraryItem.color,
          categories: libraryItem.categories,
          quantity,
        });
      }
    });

    // Sort by name only
    // TODO: Remove category-based sorting entirely - tracked in separate issue
    return bomItems.sort((a, b) => a.name.localeCompare(b.name));
  }, [placedItems, libraryItems]);
}
