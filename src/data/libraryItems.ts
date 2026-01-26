import type { LibraryItem } from '../types/gridfinity';

export const libraryItems: LibraryItem[] = [
  // Bins
  { id: 'bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#646cff', category: 'bin' },
  { id: 'bin-1x2', name: '1x2 Bin', widthUnits: 1, heightUnits: 2, color: '#646cff', category: 'bin' },
  { id: 'bin-2x1', name: '2x1 Bin', widthUnits: 2, heightUnits: 1, color: '#646cff', category: 'bin' },
  { id: 'bin-2x2', name: '2x2 Bin', widthUnits: 2, heightUnits: 2, color: '#646cff', category: 'bin' },
  { id: 'bin-3x2', name: '3x2 Bin', widthUnits: 3, heightUnits: 2, color: '#646cff', category: 'bin' },

  // Dividers
  { id: 'divider-1x1', name: '1x1 Divider', widthUnits: 1, heightUnits: 1, color: '#22c55e', category: 'divider' },
  { id: 'divider-2x1', name: '2x1 Divider', widthUnits: 2, heightUnits: 1, color: '#22c55e', category: 'divider' },
  { id: 'divider-3x1', name: '3x1 Divider', widthUnits: 3, heightUnits: 1, color: '#22c55e', category: 'divider' },

  // Organizers
  { id: 'organizer-1x3', name: '1x3 Organizer', widthUnits: 1, heightUnits: 3, color: '#f59e0b', category: 'organizer' },
  { id: 'organizer-2x3', name: '2x3 Organizer', widthUnits: 2, heightUnits: 3, color: '#f59e0b', category: 'organizer' },
];

export function getItemById(id: string): LibraryItem | undefined {
  return libraryItems.find(item => item.id === id);
}

export function getItemsByCategory(category: LibraryItem['category']): LibraryItem[] {
  return libraryItems.filter(item => item.category === category);
}
