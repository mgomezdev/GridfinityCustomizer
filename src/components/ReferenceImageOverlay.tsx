import { useState, useRef, useEffect } from 'react';
import type { ReferenceImage } from '../types/gridfinity';

interface ReferenceImageOverlayProps {
  image: ReferenceImage;
  isInteractive: boolean;
  onPositionChange: (x: number, y: number) => void;
  onSelect: () => void;
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
  isInteractive,
  onPositionChange,
  onSelect,
}: ReferenceImageOverlayProps) {
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
  const [imageLoadError, setImageLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageError = () => {
    console.error(`Failed to load reference image: ${image.name}`);
    setImageLoadError(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isInteractive) return;

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
  const interactiveClassName = isInteractive ? `${baseClassName}--interactive` : '';
  const draggingClassName = dragState.isDragging ? `${baseClassName}--dragging` : '';
  const lockedClassName = image.isLocked ? `${baseClassName}--locked` : '';

  const className = [
    baseClassName,
    interactiveClassName,
    draggingClassName,
    lockedClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = {
    left: `${image.x}%`,
    top: `${image.y}%`,
    width: `${image.width}%`,
    height: `${image.height}%`,
    opacity: image.opacity,
    transform: `scale(${image.scale})`,
    transformOrigin: 'top left',
    pointerEvents: isInteractive ? 'auto' : 'none',
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      onMouseDown={handleMouseDown}
    >
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
  );
}
