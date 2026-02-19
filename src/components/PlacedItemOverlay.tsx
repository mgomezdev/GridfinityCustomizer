import { memo } from 'react';
import type { PlacedItemWithValidity, LibraryItem, ImageViewMode } from '../types/gridfinity';
import { usePointerDragSource } from '../hooks/usePointerDrag';
import { useImageLoadState } from '../hooks/useImageLoadState';
import { getRotatedPerspectiveUrl } from '../utils/imageHelpers';

interface PlacedItemOverlayProps {
  item: PlacedItemWithValidity;
  gridX: number;
  gridY: number;
  isSelected: boolean;
  onSelect: (instanceId: string, modifiers: { shift: boolean; ctrl: boolean }) => void;
  getItemById: (id: string) => LibraryItem | undefined;
  onDelete?: (instanceId: string) => void;
  onRotateCw?: (instanceId: string) => void;
  onRotateCcw?: (instanceId: string) => void;
  imageViewMode?: ImageViewMode;
}

const DEFAULT_VALID_COLOR = '#3B82F6';
const INVALID_COLOR = '#EF4444';

export const PlacedItemOverlay = memo(function PlacedItemOverlay({ item, gridX, gridY, isSelected, onSelect, getItemById, onDelete, onRotateCw, onRotateCcw, imageViewMode = 'ortho' }: PlacedItemOverlayProps) {
  const libraryItem = getItemById(item.itemId);
  const color = item.isValid ? (libraryItem?.color || DEFAULT_VALID_COLOR) : INVALID_COLOR;

  const perspectiveUrl = libraryItem?.perspectiveImageUrl;
  const orthoUrl = libraryItem?.imageUrl;
  const usingPerspective = imageViewMode === 'perspective' && !!perspectiveUrl;

  const imageSrc = (() => {
    if (imageViewMode === 'perspective' && perspectiveUrl) {
      if (item.rotation === 0) return perspectiveUrl;
      return getRotatedPerspectiveUrl(perspectiveUrl, item.rotation);
    }
    return imageViewMode === 'perspective' ? (perspectiveUrl || orthoUrl) : orthoUrl;
  })();

  const { imageError, shouldShowImage, handleImageLoad, handleImageError } =
    useImageLoadState(imageSrc);

  // Calculate image dimensions for rotation
  // When rotated 90° or 270°, we need to swap dimensions to fill the container
  const isSideways = item.rotation === 90 || item.rotation === 270;
  const aspectRatio = item.width / item.height;

  const getImageStyle = (): React.CSSProperties | undefined => {
    // Perspective images are pre-rendered at the correct angle — no CSS rotation needed
    if (usingPerspective) return undefined;
    if (!item.rotation) return undefined;

    if (isSideways) {
      // When sideways, the image box needs to be inversely proportioned
      // so that after rotation it fills the swapped container
      return {
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
        transformOrigin: 'center center',
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: `${(1 / aspectRatio) * 100}%`,
        height: `${aspectRatio * 100}%`,
      };
    }

    return { transform: `rotate(${item.rotation}deg)` };
  };

  const { onPointerDown } = usePointerDragSource({
    dragData: {
      type: 'placed',
      itemId: item.itemId,
      instanceId: item.instanceId,
    },
    onTap: (e: PointerEvent) => onSelect(item.instanceId, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey }),
  });

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete?.(item.instanceId);
  };

  const handleRotateCwClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRotateCw?.(item.instanceId);
  };

  const handleRotateCcwClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRotateCcw?.(item.instanceId);
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
        touchAction: 'none',
      }}
      role="button"
      tabIndex={0}
      aria-label={`${libraryItem?.name ?? 'Item'} at position ${item.x},${item.y}${isSelected ? ', selected' : ''}${!item.isValid ? ', invalid placement' : ''}`}
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item.instanceId, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey });
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onDelete?.(item.instanceId);
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          if (e.shiftKey) {
            onRotateCcw?.(item.instanceId);
          } else {
            onRotateCw?.(item.instanceId);
          }
        }
      }}
    >
      {imageSrc && !imageError && (
        <div className="placed-item-image-container">
          <img
            src={imageSrc}
            alt={libraryItem?.name ?? 'Item'}
            className={`placed-item-image ${shouldShowImage ? 'visible' : 'hidden'}`}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={getImageStyle()}
          />
        </div>
      )}
      <span className="placed-item-label">{libraryItem?.name}</span>
      {isSelected && (onRotateCcw || onRotateCw) && (
        <>
          {onRotateCcw && (
            <button
              className="placed-item-rotate-btn placed-item-rotate-btn--ccw"
              onClick={handleRotateCcwClick}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              draggable={false}
              aria-label="Rotate counter-clockwise"
              title="Rotate counter-clockwise"
            >
              &#8634;
            </button>
          )}
          {onRotateCw && (
            <button
              className="placed-item-rotate-btn placed-item-rotate-btn--cw"
              onClick={handleRotateCwClick}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              draggable={false}
              aria-label="Rotate clockwise"
              title="Rotate clockwise"
            >
              &#8635;
            </button>
          )}
        </>
      )}
      {isSelected && onDelete && (
        <button
          className="placed-item-delete-btn"
          onClick={handleDeleteClick}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          draggable={false}
          aria-label="Remove item"
          title="Remove item"
        >
          &times;
        </button>
      )}
    </div>
  );
});
