import { useCallback, useRef } from 'react';
import type { ApiRefImage } from '@gridfinity/shared';
import { usePointerDragSource } from '../hooks/usePointerDrag';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001/api/v1';

interface RefImageCardProps {
  image: ApiRefImage;
  onDelete?: (id: number) => void;
  onRename?: (id: number, newName: string) => void;
}

export function RefImageCard({ image, onDelete, onRename }: RefImageCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const imageUrl = `${API_BASE_URL}/images/${image.imageUrl}`;

  const { onPointerDown } = usePointerDragSource({
    dragData: {
      type: 'ref-image',
      itemId: `ref-${image.id}`,
      refImageId: image.id,
      refImageUrl: image.imageUrl,
      refImageName: image.name,
    },
  });

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete && window.confirm(`Delete "${image.name}"?`)) {
      onDelete(image.id);
    }
  }, [image.id, image.name, onDelete]);

  const handleDoubleClick = useCallback(() => {
    if (!onRename) return;
    const newName = window.prompt('Rename image:', image.name);
    if (newName && newName.trim() && newName !== image.name) {
      onRename(image.id, newName.trim());
    }
  }, [image.id, image.name, onRename]);

  return (
    <div
      ref={cardRef}
      className="ref-image-card"
      onPointerDown={onPointerDown}
      onDoubleClick={handleDoubleClick}
      style={{ touchAction: 'none' }}
      role="button"
      tabIndex={0}
      aria-label={`${image.name}. Drag to place on grid.`}
    >
      <div className="ref-image-card-thumbnail">
        <img
          src={imageUrl}
          alt={image.name}
          loading="lazy"
          draggable={false}
        />
      </div>
      <div className="ref-image-card-info">
        <span className="ref-image-card-name" title={image.name}>{image.name}</span>
      </div>
      {onDelete && (
        <button
          className="ref-image-card-delete"
          onClick={handleDelete}
          title="Delete image"
          aria-label={`Delete ${image.name}`}
        >
          &times;
        </button>
      )}
    </div>
  );
}
