import { useMemo } from 'react';
import type { PlacedItem, BOMItem } from '../types/gridfinity';
import { getItemById } from '../data/libraryItems';

export function useBillOfMaterials(placedItems: PlacedItem[]): BOMItem[] {
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
      const libraryItem = getItemById(itemId);
      if (libraryItem) {
        bomItems.push({
          itemId: libraryItem.id,
          name: libraryItem.name,
          widthUnits: libraryItem.widthUnits,
          heightUnits: libraryItem.heightUnits,
          color: libraryItem.color,
          category: libraryItem.category,
          quantity,
        });
      }
    });

    // Sort by category, then by name for consistent display
    return bomItems.sort((a, b) => {
      if (a.category !== b.category) {
        // Category order: bin, divider, organizer
        const categoryOrder = { bin: 0, divider: 1, organizer: 2 };
        return categoryOrder[a.category] - categoryOrder[b.category];
      }
      return a.name.localeCompare(b.name);
    });
  }, [placedItems]);
}
