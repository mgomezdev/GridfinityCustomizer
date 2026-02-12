import { useState, useRef, useEffect } from 'react';
import type { ReferenceImage } from '../types/gridfinity';

interface ReferenceImageOverlayProps {
  image: ReferenceImage;
  isSelected: boolean;
  onPositionChange: (x: number, y: number) => void;
  onSelect: () => void;
  onScaleChange: (scale: number) => void;
  onOpacityChange: (opacity: number) => void;
  onRemove: () => void;
  onToggleLock: () => void;
  onRotateCw?: () => void;
  onRotateCcw?: () => void;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startImageX: number;
  startImageY: number;
}

const INITIAL_DRAG_STATE: DragState = {
  isDragging: false,
  startX: 0,
  startY: 0,
  startImageX: 0,
  startImageY: 0,
};

export function ReferenceImageOverlay({
  image,
  isSelected,
  onPositionChange,
  onSelect,
  onScaleChange,
  onOpacityChange,
  onRemove,
  onToggleLock,
  onRotateCw,
  onRotateCcw,
}: ReferenceImageOverlayProps) {
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
  const [imageLoadError, setImageLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageError = () => {
    console.error(`Failed to load reference image: ${image.name}`);
    setImageLoadError(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    onSelect();

    if (image.isLocked) return;

    setDragState({
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startImageX: image.x,
      startImageY: image.y,
    });
  };

  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = Number(e.target.value);
    onOpacityChange(percentage / 100);
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = Number(e.target.value);
    onScaleChange(percentage / 100);
  };

  // Attach global mouse event listeners during drag
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current?.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;

      // Convert pixel delta to percentage
      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      const newX = dragState.startImageX + deltaXPercent;
      const newY = dragState.startImageY + deltaYPercent;

      // Clamp to 0-100 range
      const clampedX = Math.max(0, Math.min(100, newX));
      const clampedY = Math.max(0, Math.min(100, newY));

      onPositionChange(clampedX, clampedY);
    };

    const handleMouseUp = () => {
      setDragState(INITIAL_DRAG_STATE);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, onPositionChange]);

  const baseClassName = 'reference-image-overlay';
  const interactiveClassName = `${baseClassName}--interactive`;
  const draggingClassName = dragState.isDragging ? `${baseClassName}--dragging` : '';
  const lockedClassName = image.isLocked ? `${baseClassName}--locked` : '';
  const selectedClassName = isSelected ? `${baseClassName}--selected` : '';

  const className = [
    baseClassName,
    interactiveClassName,
    draggingClassName,
    lockedClassName,
    selectedClassName,
  ]
    .filter(Boolean)
    .join(' ');

  // Outer wrapper handles positioning only — no transform or opacity
  const wrapperStyle: React.CSSProperties = {
    left: `${image.x}%`,
    top: `${image.y}%`,
    width: `${image.width}%`,
    height: `${image.height}%`,
    pointerEvents: 'auto',
  };

  // Inner content carries the visual transforms (scale + opacity)
  const contentStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    opacity: image.opacity,
    transform: `scale(${image.scale})${image.rotation ? ` rotate(${image.rotation}deg)` : ''}`,
    transformOrigin: 'top left',
  };

  const opacityPercentage = Math.round(image.opacity * 100);
  const scalePercentage = Math.round(image.scale * 100);

  return (
    <div
      ref={containerRef}
      className={className}
      style={wrapperStyle}
      onMouseDown={handleMouseDown}
    >
      {isSelected && (
        <div
          className="reference-image-overlay__toolbar"
          onMouseDown={handleToolbarMouseDown}
        >
          <label className="reference-image-overlay__toolbar-label">
            Op
            <input
              id="opacity-slider"
              type="range"
              min="0"
              max="100"
              value={opacityPercentage}
              onChange={handleOpacityChange}
              className="reference-image-overlay__toolbar-slider"
              title={`Opacity: ${opacityPercentage}%`}
            />
          </label>
          <label className="reference-image-overlay__toolbar-label">
            Sc
            <input
              id="scale-slider"
              type="range"
              min="10"
              max="200"
              value={scalePercentage}
              onChange={handleScaleChange}
              className="reference-image-overlay__toolbar-slider"
              title={`Scale: ${scalePercentage}%`}
            />
          </label>
          <button
            className="reference-image-overlay__toolbar-btn reference-image-overlay__toolbar-btn--lock"
            onClick={onToggleLock}
            title={image.isLocked ? 'Unlock image' : 'Lock image'}
          >
            {image.isLocked ? 'Unlock' : 'Lock'}
          </button>
          {onRotateCcw && (
            <button
              className="reference-image-overlay__toolbar-btn reference-image-overlay__toolbar-btn--rotate"
              onClick={onRotateCcw}
              title="Rotate counter-clockwise"
            >
              &#8634;
            </button>
          )}
          {onRotateCw && (
            <button
              className="reference-image-overlay__toolbar-btn reference-image-overlay__toolbar-btn--rotate"
              onClick={onRotateCw}
              title="Rotate clockwise"
            >
              &#8635;
            </button>
          )}
          <button
            className="reference-image-overlay__toolbar-btn reference-image-overlay__toolbar-btn--remove"
            onClick={onRemove}
            title="Remove image"
          >
            ×
          </button>
        </div>
      )}
      <div className="reference-image-overlay__content" style={contentStyle}>
        {imageLoadError ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(200, 50, 50, 0.2)',
              border: '2px dashed rgba(200, 50, 50, 0.5)',
              color: '#c83232',
              fontSize: '14px',
              fontWeight: 'bold',
              textAlign: 'center',
              padding: '10px',
            }}
          >
            Failed to load image
          </div>
        ) : (
          <img
            src={image.dataUrl}
            alt={image.name}
            draggable={false}
            onError={handleImageError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              userSelect: 'none',
            }}
          />
        )}
      </div>
    </div>
  );
}
