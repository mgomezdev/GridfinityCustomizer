import { useRef } from 'react';
import type { PlacedItemWithValidity, DragData } from '../types/gridfinity';
import { PlacedItemOverlay } from './PlacedItemOverlay';

interface GridPreviewProps {
  gridX: number;
  gridY: number;
  placedItems: PlacedItemWithValidity[];
  selectedItemId: string | null;
  onDrop: (dragData: DragData, x: number, y: number) => void;
  onSelectItem: (instanceId: string | null) => void;
}

export function GridPreview({
  gridX,
  gridY,
  placedItems,
  selectedItemId,
  onDrop,
  onSelectItem,
}: GridPreviewProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  if (gridX <= 0 || gridY <= 0) {
    return (
      <div className="grid-preview empty">
        <p>Enter dimensions to see grid preview</p>
      </div>
    );
  }

  const cells = [];
  for (let y = 0; y < gridY; y++) {
    for (let x = 0; x < gridX; x++) {
      cells.push(<div key={`${x}-${y}`} className="grid-cell" />);
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    const jsonData = e.dataTransfer.getData('application/json');
    if (!jsonData) return;

    const dragData: DragData = JSON.parse(jsonData);
    const gridContainer = gridRef.current;
    if (!gridContainer) return;

    const rect = gridContainer.getBoundingClientRect();
    const cellWidth = rect.width / gridX;
    const cellHeight = rect.height / gridY;

    const dropX = Math.floor((e.clientX - rect.left) / cellWidth);
    const dropY = Math.floor((e.clientY - rect.top) / cellHeight);

    const clampedX = Math.max(0, Math.min(dropX, gridX - 1));
    const clampedY = Math.max(0, Math.min(dropY, gridY - 1));

    onDrop(dragData, clampedX, clampedY);
  };

  const handleGridClick = () => {
    onSelectItem(null);
  };

  return (
    <div className="grid-preview">
      <div
        ref={gridRef}
        className="grid-container"
        style={{
          gridTemplateColumns: `repeat(${gridX}, 1fr)`,
          gridTemplateRows: `repeat(${gridY}, 1fr)`,
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleGridClick}
      >
        {cells}
        {placedItems.map(item => (
          <PlacedItemOverlay
            key={item.instanceId}
            item={item}
            gridX={gridX}
            gridY={gridY}
            isSelected={item.instanceId === selectedItemId}
            onSelect={onSelectItem}
          />
        ))}
      </div>
    </div>
  );
}
