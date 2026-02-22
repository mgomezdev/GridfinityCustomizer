import { memo, useState, useCallback, useEffect } from 'react';
import type { PlacedItemWithValidity, LibraryItem, ImageViewMode, BinCustomization } from '../types/gridfinity';
import { isDefaultCustomization } from '../types/gridfinity';
import { usePointerDragSource } from '../hooks/usePointerDrag';
import { useImageLoadState } from '../hooks/useImageLoadState';
import { BinCustomizationPanel } from './BinCustomizationPanel';
import { getRotatedPerspectiveUrl } from '../utils/imageHelpers';
import { BinContextMenu } from './BinContextMenu';

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
  onCustomizationChange?: (instanceId: string, customization: BinCustomization) => void;
  onCustomizationReset?: (instanceId: string) => void;
  onDuplicate?: () => void;
  imageViewMode?: ImageViewMode;
}

const DEFAULT_VALID_COLOR = '#3B82F6';
const INVALID_COLOR = '#EF4444';

function getCustomizationBadges(customization: BinCustomization | undefined): string[] {
  if (!customization || isDefaultCustomization(customization)) return [];
  const badges: string[] = [];
  if (customization.wallPattern !== 'none') badges.push(customization.wallPattern);
  if (customization.lipStyle !== 'normal') badges.push(`lip: ${customization.lipStyle}`);
  if (customization.fingerSlide !== 'none') badges.push(`slide: ${customization.fingerSlide}`);
  if (customization.wallCutout !== 'none') badges.push(`cutout: ${customization.wallCutout}`);
  return badges;
}

export const PlacedItemOverlay = memo(function PlacedItemOverlay({ item, gridX, gridY, isSelected, onSelect, getItemById, onDelete, onRotateCw, onRotateCcw, onCustomizationChange, onCustomizationReset, onDuplicate, imageViewMode = 'ortho' }: PlacedItemOverlayProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

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

  const handleCustomizeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowPopover(prev => !prev);
  };

  const handlePopoverChange = useCallback((customization: BinCustomization) => {
    onCustomizationChange?.(item.instanceId, customization);
  }, [onCustomizationChange, item.instanceId]);

  const handlePopoverReset = useCallback(() => {
    onCustomizationReset?.(item.instanceId);
  }, [onCustomizationReset, item.instanceId]);

  const handleDuplicateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDuplicate?.();
  };

  const handleClosePopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowPopover(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(item.instanceId, { shift: false, ctrl: false });
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = () => setContextMenuPos(null);

  useEffect(() => {
    if (!isSelected) setContextMenuPos(null);
  }, [isSelected]);

  const badges = getCustomizationBadges(item.customization);

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
      onContextMenu={handleContextMenu}
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
      {badges.length > 0 && (
        <div className="placed-item-badges">
          {badges.map(badge => (
            <span key={badge} className="placed-item-badge">{badge}</span>
          ))}
        </div>
      )}
      {isSelected && (onRotateCcw || onRotateCw || onDuplicate || onCustomizationChange || onDelete) && (
        <div
          className="placed-item-toolbar"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {onRotateCcw && (
            <button
              className="placed-item-toolbar-btn"
              onClick={handleRotateCcwClick}
              draggable={false}
              aria-label="Rotate counter-clockwise"
              title="Rotate counter-clockwise (Shift+R)"
            >
              &#8634;
            </button>
          )}
          {onRotateCw && (
            <button
              className="placed-item-toolbar-btn"
              onClick={handleRotateCwClick}
              draggable={false}
              aria-label="Rotate clockwise"
              title="Rotate clockwise (R)"
            >
              &#8635;
            </button>
          )}
          {onDuplicate && (
            <button
              className="placed-item-toolbar-btn"
              onClick={handleDuplicateClick}
              draggable={false}
              aria-label="Duplicate"
              title="Duplicate (Ctrl+D)"
            >
              &#x29C9;
            </button>
          )}
          {onCustomizationChange && (
            <button
              className="placed-item-toolbar-btn"
              onClick={handleCustomizeClick}
              draggable={false}
              aria-label="Customize"
              title="Customize bin options"
            >
              &#9881;
            </button>
          )}
          {onDelete && (
            <button
              className="placed-item-toolbar-btn placed-item-toolbar-btn--danger"
              onClick={handleDeleteClick}
              draggable={false}
              aria-label="Remove item"
              title="Remove item (Del)"
            >
              &times;
            </button>
          )}
        </div>
      )}
      {showPopover && isSelected && onCustomizationChange && (
        <div
          className="placed-item-customize-popover"
          role="dialog"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="placed-item-customize-popover-header">
            <span className="placed-item-customize-popover-title">Customize</span>
            <button
              className="placed-item-customize-popover-close"
              onClick={handleClosePopover}
              aria-label="Close customization"
              title="Close"
            >
              &times;
            </button>
          </div>
          <BinCustomizationPanel
            customization={item.customization}
            onChange={handlePopoverChange}
            onReset={handlePopoverReset}
            idPrefix="inline-"
          />
        </div>
      )}
      {contextMenuPos && (
        <BinContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onRotateCw={() => onRotateCw?.(item.instanceId)}
          onRotateCcw={() => onRotateCcw?.(item.instanceId)}
          onDuplicate={() => onDuplicate?.()}
          onCustomize={() => setShowPopover(true)}
          onDelete={() => onDelete?.(item.instanceId)}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
});
