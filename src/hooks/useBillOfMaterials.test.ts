import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBillOfMaterials } from './useBillOfMaterials';
import type { PlacedItem, LibraryItem } from '../types/gridfinity';

const mockLibraryItems: LibraryItem[] = [
  { id: 'bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#646cff', category: 'bin' },
  { id: 'bin-1x2', name: '1x2 Bin', widthUnits: 1, heightUnits: 2, color: '#646cff', category: 'bin' },
  { id: 'bin-2x1', name: '2x1 Bin', widthUnits: 2, heightUnits: 1, color: '#646cff', category: 'bin' },
  { id: 'bin-2x2', name: '2x2 Bin', widthUnits: 2, heightUnits: 2, color: '#646cff', category: 'bin' },
  { id: 'divider-1x1', name: '1x1 Divider', widthUnits: 1, heightUnits: 1, color: '#22c55e', category: 'divider' },
  { id: 'organizer-1x3', name: '1x3 Organizer', widthUnits: 1, heightUnits: 3, color: '#f59e0b', category: 'organizer' },
];

describe('useBillOfMaterials', () => {
  it('should return empty array when no items are placed', () => {
    const { result } = renderHook(() => useBillOfMaterials([], mockLibraryItems));
    expect(result.current).toEqual([]);
  });

  it('should count a single placed item', () => {
    const placedItems: PlacedItem[] = [
      {
        instanceId: 'instance-1',
        itemId: 'bin-1x1',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        isRotated: false,
      },
    ];

    const { result } = renderHook(() => useBillOfMaterials(placedItems, mockLibraryItems));

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      itemId: 'bin-1x1',
      name: '1x1 Bin',
      widthUnits: 1,
      heightUnits: 1,
      quantity: 1,
      category: 'bin',
    });
  });

  it('should count multiple instances of the same item', () => {
    const placedItems: PlacedItem[] = [
      {
        instanceId: 'instance-1',
        itemId: 'bin-2x2',
        x: 0,
        y: 0,
        width: 2,
        height: 2,
        isRotated: false,
      },
      {
        instanceId: 'instance-2',
        itemId: 'bin-2x2',
        x: 2,
        y: 0,
        width: 2,
        height: 2,
        isRotated: false,
      },
      {
        instanceId: 'instance-3',
        itemId: 'bin-2x2',
        x: 0,
        y: 2,
        width: 2,
        height: 2,
        isRotated: false,
      },
    ];

    const { result } = renderHook(() => useBillOfMaterials(placedItems, mockLibraryItems));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].quantity).toBe(3);
    expect(result.current[0].itemId).toBe('bin-2x2');
  });

  it('should not treat rotated items as unique', () => {
    const placedItems: PlacedItem[] = [
      {
        instanceId: 'instance-1',
        itemId: 'bin-1x2',
        x: 0,
        y: 0,
        width: 1,
        height: 2,
        isRotated: false,
      },
      {
        instanceId: 'instance-2',
        itemId: 'bin-1x2',
        x: 2,
        y: 0,
        width: 2,
        height: 1,
        isRotated: true,
      },
    ];

    const { result } = renderHook(() => useBillOfMaterials(placedItems, mockLibraryItems));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].quantity).toBe(2);
    expect(result.current[0].itemId).toBe('bin-1x2');
  });

  it('should handle multiple different item types', () => {
    const placedItems: PlacedItem[] = [
      {
        instanceId: 'instance-1',
        itemId: 'bin-1x1',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        isRotated: false,
      },
      {
        instanceId: 'instance-2',
        itemId: 'bin-2x2',
        x: 1,
        y: 0,
        width: 2,
        height: 2,
        isRotated: false,
      },
      {
        instanceId: 'instance-3',
        itemId: 'divider-1x1',
        x: 3,
        y: 0,
        width: 1,
        height: 1,
        isRotated: false,
      },
      {
        instanceId: 'instance-4',
        itemId: 'bin-1x1',
        x: 0,
        y: 1,
        width: 1,
        height: 1,
        isRotated: false,
      },
    ];

    const { result } = renderHook(() => useBillOfMaterials(placedItems, mockLibraryItems));

    expect(result.current).toHaveLength(3);

    const bin1x1 = result.current.find(item => item.itemId === 'bin-1x1');
    expect(bin1x1?.quantity).toBe(2);

    const bin2x2 = result.current.find(item => item.itemId === 'bin-2x2');
    expect(bin2x2?.quantity).toBe(1);

    const divider1x1 = result.current.find(item => item.itemId === 'divider-1x1');
    expect(divider1x1?.quantity).toBe(1);
  });

  it('should sort items by category (bins, dividers, organizers)', () => {
    const placedItems: PlacedItem[] = [
      {
        instanceId: 'instance-1',
        itemId: 'organizer-1x3',
        x: 0,
        y: 0,
        width: 1,
        height: 3,
        isRotated: false,
      },
      {
        instanceId: 'instance-2',
        itemId: 'divider-1x1',
        x: 1,
        y: 0,
        width: 1,
        height: 1,
        isRotated: false,
      },
      {
        instanceId: 'instance-3',
        itemId: 'bin-1x1',
        x: 2,
        y: 0,
        width: 1,
        height: 1,
        isRotated: false,
      },
    ];

    const { result } = renderHook(() => useBillOfMaterials(placedItems, mockLibraryItems));

    expect(result.current).toHaveLength(3);
    expect(result.current[0].category).toBe('bin');
    expect(result.current[1].category).toBe('divider');
    expect(result.current[2].category).toBe('organizer');
  });

  it('should sort items alphabetically within the same category', () => {
    const placedItems: PlacedItem[] = [
      {
        instanceId: 'instance-1',
        itemId: 'bin-2x2',
        x: 0,
        y: 0,
        width: 2,
        height: 2,
        isRotated: false,
      },
      {
        instanceId: 'instance-2',
        itemId: 'bin-1x1',
        x: 2,
        y: 0,
        width: 1,
        height: 1,
        isRotated: false,
      },
      {
        instanceId: 'instance-3',
        itemId: 'bin-1x2',
        x: 3,
        y: 0,
        width: 1,
        height: 2,
        isRotated: false,
      },
    ];

    const { result } = renderHook(() => useBillOfMaterials(placedItems, mockLibraryItems));

    expect(result.current).toHaveLength(3);
    expect(result.current[0].name).toBe('1x1 Bin');
    expect(result.current[1].name).toBe('1x2 Bin');
    expect(result.current[2].name).toBe('2x2 Bin');
  });

  it('should handle items with unknown itemId gracefully', () => {
    const placedItems: PlacedItem[] = [
      {
        instanceId: 'instance-1',
        itemId: 'bin-1x1',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        isRotated: false,
      },
      {
        instanceId: 'instance-2',
        itemId: 'unknown-item',
        x: 1,
        y: 0,
        width: 1,
        height: 1,
        isRotated: false,
      },
    ];

    const { result } = renderHook(() => useBillOfMaterials(placedItems, mockLibraryItems));

    // Should only include the valid item
    expect(result.current).toHaveLength(1);
    expect(result.current[0].itemId).toBe('bin-1x1');
  });

  it('should update when placed items change', () => {
    const initialItems: PlacedItem[] = [
      {
        instanceId: 'instance-1',
        itemId: 'bin-1x1',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        isRotated: false,
      },
    ];

    const { result, rerender } = renderHook(
      ({ items }) => useBillOfMaterials(items, mockLibraryItems),
      { initialProps: { items: initialItems } }
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].quantity).toBe(1);

    const updatedItems: PlacedItem[] = [
      ...initialItems,
      {
        instanceId: 'instance-2',
        itemId: 'bin-1x1',
        x: 1,
        y: 0,
        width: 1,
        height: 1,
        isRotated: false,
      },
    ];

    rerender({ items: updatedItems });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].quantity).toBe(2);
  });
});
