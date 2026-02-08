import { useState } from 'react';
import type { PlacedItemWithValidity, DragData, LibraryItem } from '../types/gridfinity';

interface PlacedItemOverlayProps {
  item: PlacedItemWithValidity;
  gridX: number;
  gridY: number;
  isSelected: boolean;
  onSelect: (instanceId: string) => void;
  getItemById: (id: string) => LibraryItem | undefined;
  onDelete?: (instanceId: string) => void;
}

interface ImageLoadState {
  forUrl: string;
  loaded: boolean;
  error: boolean;
}

// Get CSS variables once
const getCSSVariable = (varName: string, fallback: string): string => {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
};

const DEFAULT_VALID_COLOR = getCSSVariable('--grid-primary', '#3B82F6');
const INVALID_COLOR = getCSSVariable('--invalid-primary', '#EF4444');

export function PlacedItemOverlay({ item, gridX, gridY, isSelected, onSelect, getItemById, onDelete }: PlacedItemOverlayProps) {
  const libraryItem = getItemById(item.itemId);
  const color = item.isValid ? (libraryItem?.color || DEFAULT_VALID_COLOR) : INVALID_COLOR;

  const [loadState, setLoadState] = useState<ImageLoadState>({
    forUrl: '',
    loaded: false,
    error: false,
  });

  // Derive current state - automatically "resets" when URL changes
  const isCurrentUrl = loadState.forUrl === libraryItem?.imageUrl;
  const imageLoaded = isCurrentUrl && loadState.loaded;
  const imageError = isCurrentUrl && loadState.error;
  const shouldShowImage = libraryItem?.imageUrl && imageLoaded && !imageError;

  const handleImageLoad = () => {
    setLoadState({ forUrl: libraryItem?.imageUrl ?? '', loaded: true, error: false });
  };

  const handleImageError = () => {
    setLoadState({ forUrl: libraryItem?.imageUrl ?? '', loaded: false, error: true });
  };

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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete?.(item.instanceId);
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
      {libraryItem?.imageUrl && !imageError && (
        <div className="placed-item-image-container">
          <img
            src={libraryItem.imageUrl}
            alt={libraryItem.name}
            className={`placed-item-image ${shouldShowImage ? 'visible' : 'hidden'}`}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      )}
      <span className="placed-item-label">{libraryItem?.name}</span>
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
}
