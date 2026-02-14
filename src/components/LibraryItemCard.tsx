import type { LibraryItem } from '../types/gridfinity';
import { usePointerDragSource } from '../hooks/usePointerDrag';
import { useImageLoadState } from '../hooks/useImageLoadState';

interface LibraryItemCardProps {
  item: LibraryItem;
}

export function LibraryItemCard({ item }: LibraryItemCardProps) {
  const { imageError, shouldShowImage, handleImageLoad, handleImageError } =
    useImageLoadState(item.imageUrl);

  const { onPointerDown } = usePointerDragSource({
    dragData: {
      type: 'library',
      itemId: item.id,
    },
  });

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
      onPointerDown={onPointerDown}
      style={{ touchAction: 'none' }}
      role="button"
      tabIndex={0}
      aria-label={`${item.name}, ${item.widthUnits} by ${item.heightUnits} units. Drag to place on grid.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
        }
      }}
    >
      <div className="library-item-preview-container">
        {item.imageUrl && !imageError && (
          <img
            src={item.imageUrl}
            alt={item.name}
            className={`library-item-image ${shouldShowImage ? 'visible' : 'hidden'}`}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        {!shouldShowImage && (
          <div className="library-item-preview">
            {previewCells}
          </div>
        )}
      </div>
      <div className="library-item-info">
        <span className="library-item-name">{item.name}</span>
        <span className="library-item-size">{item.widthUnits}x{item.heightUnits}</span>
      </div>
    </div>
  );
}
