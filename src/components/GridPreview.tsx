import { useRef, useMemo } from 'react';
import type { PlacedItemWithValidity, DragData, ComputedSpacer, LibraryItem, ReferenceImage } from '../types/gridfinity';
import { PlacedItemOverlay } from './PlacedItemOverlay';
import { SpacerOverlay } from './SpacerOverlay';
import { ReferenceImageOverlay } from './ReferenceImageOverlay';

interface GridPreviewProps {
  gridX: number;
  gridY: number;
  placedItems: PlacedItemWithValidity[];
  selectedItemId: string | null;
  spacers?: ComputedSpacer[];
  onDrop: (dragData: DragData, x: number, y: number) => void;
  onSelectItem: (instanceId: string | null) => void;
  getItemById: (id: string) => LibraryItem | undefined;
  onDeleteItem?: (instanceId: string) => void;
  onRotateItemCw?: (instanceId: string) => void;
  onRotateItemCcw?: (instanceId: string) => void;
  referenceImages?: ReferenceImage[];
  selectedImageId?: string | null;
  onImagePositionChange?: (id: string, x: number, y: number) => void;
  onImageSelect?: (id: string) => void;
  onImageScaleChange?: (id: string, scale: number) => void;
  onImageOpacityChange?: (id: string, opacity: number) => void;
  onImageRemove?: (id: string) => void;
  onImageToggleLock?: (id: string) => void;
  onImageRotateCw?: (id: string) => void;
  onImageRotateCcw?: (id: string) => void;
}

export function GridPreview({
  gridX,
  gridY,
  placedItems,
  selectedItemId,
  spacers = [],
  onDrop,
  onSelectItem,
  getItemById,
  onDeleteItem,
  onRotateItemCw,
  onRotateItemCcw,
  referenceImages = [],
  selectedImageId,
  onImagePositionChange,
  onImageSelect,
  onImageScaleChange,
  onImageOpacityChange,
  onImageRemove,
  onImageToggleLock,
  onImageRotateCw,
  onImageRotateCcw,
}: GridPreviewProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Memoize cells array (must be before early return per Rules of Hooks)
  const cells = useMemo(() => {
    if (gridX <= 0 || gridY <= 0) return [];
    const result = [];
    for (let y = 0; y < gridY; y++) {
      for (let x = 0; x < gridX; x++) {
        result.push(<div key={`${x}-${y}`} className="grid-cell" />);
      }
    }
    return result;
  }, [gridX, gridY]);

  // Calculate grid offset and size based on spacers (optimized single-loop)
  const { gridOffsetX, gridOffsetY, gridWidth, gridHeight } = useMemo(() => {
    let leftWidth = 0, rightWidth = 0, topHeight = 0, bottomHeight = 0;

    for (const s of spacers) {
      if (s.position === 'left') leftWidth = s.renderWidth;
      else if (s.position === 'right') rightWidth = s.renderWidth;
      else if (s.position === 'top') topHeight = s.renderHeight;
      else if (s.position === 'bottom') bottomHeight = s.renderHeight;
    }

    return {
      gridOffsetX: leftWidth || rightWidth,
      gridOffsetY: topHeight || bottomHeight,
      gridWidth: 100 - (leftWidth + rightWidth),
      gridHeight: 100 - (topHeight + bottomHeight),
    };
  }, [spacers]);

  if (gridX <= 0 || gridY <= 0) {
    return (
      <div className="grid-preview empty">
        <p>Enter dimensions to see grid preview</p>
      </div>
    );
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Allow both copy (from library) and move (relocating placed items)
    e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === 'move' ? 'move' : 'copy';
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
    <div className="grid-preview" style={{ aspectRatio: `${gridX} / ${gridY}` }}>
      <div className="drawer-container">
        {spacers.map(spacer => (
          <SpacerOverlay key={spacer.id} spacer={spacer} />
        ))}
        <div
          ref={gridRef}
          className="grid-container"
          style={{
            gridTemplateColumns: `repeat(${gridX}, 1fr)`,
            gridTemplateRows: `repeat(${gridY}, 1fr)`,
            left: `${gridOffsetX}%`,
            top: `${gridOffsetY}%`,
            width: `${gridWidth}%`,
            height: `${gridHeight}%`,
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleGridClick}
        >
          {cells}
          {referenceImages.map(image => (
            <ReferenceImageOverlay
              key={image.id}
              image={image}
              isSelected={image.id === selectedImageId}
              onPositionChange={(x, y) => onImagePositionChange?.(image.id, x, y)}
              onSelect={() => onImageSelect?.(image.id)}
              onScaleChange={(scale) => onImageScaleChange?.(image.id, scale)}
              onOpacityChange={(opacity) => onImageOpacityChange?.(image.id, opacity)}
              onRemove={() => onImageRemove?.(image.id)}
              onToggleLock={() => onImageToggleLock?.(image.id)}
              onRotateCw={() => onImageRotateCw?.(image.id)}
              onRotateCcw={() => onImageRotateCcw?.(image.id)}
            />
          ))}
          {placedItems.map(item => (
            <PlacedItemOverlay
              key={item.instanceId}
              item={item}
              gridX={gridX}
              gridY={gridY}
              isSelected={item.instanceId === selectedItemId}
              onSelect={onSelectItem}
              getItemById={getItemById}
              onDelete={onDeleteItem}
              onRotateCw={onRotateItemCw}
              onRotateCcw={onRotateItemCcw}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
