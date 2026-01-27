import type { PlacedItemWithValidity, DragData, LibraryItem } from '../types/gridfinity';

interface PlacedItemOverlayProps {
  item: PlacedItemWithValidity;
  gridX: number;
  gridY: number;
  isSelected: boolean;
  onSelect: (instanceId: string) => void;
  getItemById: (id: string) => LibraryItem | undefined;
}

export function PlacedItemOverlay({ item, gridX, gridY, isSelected, onSelect, getItemById }: PlacedItemOverlayProps) {
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
        left: `${(item.x / gridX) * 100}%`,
        top: `${(item.y / gridY) * 100}%`,
        width: `${(item.width / gridX) * 100}%`,
        height: `${(item.height / gridY) * 100}%`,
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
