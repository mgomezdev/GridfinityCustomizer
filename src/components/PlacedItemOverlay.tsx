import type { PlacedItemWithValidity, DragData } from '../types/gridfinity';
import { getItemById } from '../data/libraryItems';

interface PlacedItemOverlayProps {
  item: PlacedItemWithValidity;
  isSelected: boolean;
  onSelect: (instanceId: string) => void;
}

export function PlacedItemOverlay({ item, isSelected, onSelect }: PlacedItemOverlayProps) {
  const libraryItem = getItemById(item.itemId);
  const color = item.isValid ? (libraryItem?.color || '#646cff') : '#ef4444';

  const handleDragStart = (e: React.DragEvent) => {
    const dragData: DragData = {
      type: 'placed',
      itemId: item.itemId,
      instanceId: item.instanceId,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(item.instanceId);
  };

  return (
    <div
      className={`placed-item ${isSelected ? 'selected' : ''} ${!item.isValid ? 'invalid' : ''}`}
      style={{
        gridColumn: `${item.x + 1} / span ${item.width}`,
        gridRow: `${item.y + 1} / span ${item.height}`,
        backgroundColor: `${color}66`,
        borderColor: color,
      }}
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
    >
      <span className="placed-item-label">{libraryItem?.name}</span>
    </div>
  );
}
