import { useRef } from 'react';
import type { PlacedItemWithValidity, DragData, ComputedSpacer, LibraryItem, ReferenceImage, InteractionMode } from '../types/gridfinity';
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
  referenceImages?: ReferenceImage[];
  interactionMode?: InteractionMode;
  selectedImageId?: string | null;
  onImagePositionChange?: (id: string, x: number, y: number) => void;
  onImageSelect?: (id: string) => void;
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
  referenceImages = [],
  interactionMode = 'items',
  onImagePositionChange,
  onImageSelect,
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

  // Calculate grid offset based on spacers (for one-sided mode)
  const hasLeftSpacer = spacers.some(s => s.position === 'left');
  const hasTopSpacer = spacers.some(s => s.position === 'top');

  const gridOffsetX = hasLeftSpacer
    ? spacers.find(s => s.position === 'left')!.renderWidth
    : spacers.some(s => s.position === 'right')
      ? spacers.find(s => s.position === 'right')!.renderWidth
      : 0;

  const gridOffsetY = hasTopSpacer
    ? spacers.find(s => s.position === 'top')!.renderHeight
    : spacers.some(s => s.position === 'bottom')
      ? spacers.find(s => s.position === 'bottom')!.renderHeight
      : 0;

  // Calculate grid size as percentage (100% minus spacer widths)
  const totalHorizontalSpacers = spacers
    .filter(s => s.position === 'left' || s.position === 'right')
    .reduce((sum, s) => sum + s.renderWidth, 0);

  const totalVerticalSpacers = spacers
    .filter(s => s.position === 'top' || s.position === 'bottom')
    .reduce((sum, s) => sum + s.renderHeight, 0);

  const gridWidth = 100 - totalHorizontalSpacers;
  const gridHeight = 100 - totalVerticalSpacers;

  // Disable placed item interactions when in 'images' mode
  const itemsStyle: React.CSSProperties = interactionMode === 'images'
    ? { pointerEvents: 'none' }
    : {};

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
          <div style={itemsStyle}>
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
              />
            ))}
          </div>
          {referenceImages.map(image => (
            <ReferenceImageOverlay
              key={image.id}
              image={image}
              isInteractive={interactionMode === 'images'}
              onPositionChange={(x, y) => onImagePositionChange?.(image.id, x, y)}
              onSelect={() => onImageSelect?.(image.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
