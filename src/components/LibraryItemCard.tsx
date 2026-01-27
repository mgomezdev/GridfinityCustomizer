import { useState } from 'react';
import type { LibraryItem, DragData } from '../types/gridfinity';

interface LibraryItemCardProps {
  item: LibraryItem;
}

interface ImageState {
  url: string | undefined;
  loaded: boolean;
  error: boolean;
}

export function LibraryItemCard({ item }: LibraryItemCardProps) {
  const [imageState, setImageState] = useState<ImageState>({
    url: item.imageUrl,
    loaded: false,
    error: false,
  });

  // Reset state if imageUrl has changed
  if (imageState.url !== item.imageUrl) {
    setImageState({
      url: item.imageUrl,
      loaded: false,
      error: false,
    });
  }

  const shouldShowImage = item.imageUrl && imageState.loaded && !imageState.error;
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
      <div className="library-item-preview-container">
        {item.imageUrl && !imageState.error && (
          <img
            src={item.imageUrl}
            alt={item.name}
            className={`library-item-image ${shouldShowImage ? 'visible' : 'hidden'}`}
            loading="lazy"
            onLoad={() => setImageState(prev => ({ ...prev, loaded: true }))}
            onError={() => setImageState(prev => ({ ...prev, error: true }))}
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
