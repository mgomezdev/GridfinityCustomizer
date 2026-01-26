import type { LibraryItem, DragData } from '../types/gridfinity';

interface LibraryItemCardProps {
  item: LibraryItem;
}

export function LibraryItemCard({ item }: LibraryItemCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    const dragData: DragData = {
      type: 'library',
      itemId: item.id,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Generate mini grid preview
  const previewCells = [];
  const maxPreviewSize = 3;
  for (let y = 0; y < maxPreviewSize; y++) {
    for (let x = 0; x < maxPreviewSize; x++) {
      const isActive = x < item.widthUnits && y < item.heightUnits;
      previewCells.push(
        <div
          key={`${x}-${y}`}
          className={`library-item-preview-cell ${isActive ? 'active' : ''}`}
          style={isActive ? { backgroundColor: item.color } : undefined}
        />
      );
    }
  }

  return (
    <div
      className="library-item-card"
      draggable
      onDragStart={handleDragStart}
    >
      <div className="library-item-preview">
        {previewCells}
      </div>
      <div className="library-item-info">
        <span className="library-item-name">{item.name}</span>
        <span className="library-item-size">{item.widthUnits}x{item.heightUnits}</span>
      </div>
    </div>
  );
}
