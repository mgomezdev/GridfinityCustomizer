import { useState } from 'react';
import type { LibraryItem } from '../types/gridfinity';
import { usePointerDragSource } from '../hooks/usePointerDrag';

interface LibraryItemCardProps {
  item: LibraryItem;
}

interface ImageLoadState {
  forUrl: string;
  loaded: boolean;
  error: boolean;
}

export function LibraryItemCard({ item }: LibraryItemCardProps) {
  const [loadState, setLoadState] = useState<ImageLoadState>({
    forUrl: '',
    loaded: false,
    error: false,
  });

  // Derive current state - automatically "resets" when URL changes
  const isCurrentUrl = loadState.forUrl === item.imageUrl;
  const imageLoaded = isCurrentUrl && loadState.loaded;
  const imageError = isCurrentUrl && loadState.error;
  const shouldShowImage = item.imageUrl && imageLoaded && !imageError;

  const { onPointerDown } = usePointerDragSource({
    dragData: {
      type: 'library',
      itemId: item.id,
    },
  });

  const handleImageLoad = () => {
    setLoadState({ forUrl: item.imageUrl ?? '', loaded: true, error: false });
  };

  const handleImageError = () => {
    setLoadState({ forUrl: item.imageUrl ?? '', loaded: false, error: true });
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
      onPointerDown={onPointerDown}
      style={{ touchAction: 'none' }}
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
