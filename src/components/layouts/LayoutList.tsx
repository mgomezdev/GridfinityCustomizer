import { useState } from 'react';
import type { ApiLayout } from '@gridfinity/shared';

interface LayoutListProps {
  layouts: ApiLayout[];
  isLoading: boolean;
  onSelect: (layout: ApiLayout) => void;
  onDelete: (layoutId: number) => void;
  isDeleting: boolean;
}

export function LayoutList({ layouts, isLoading, onSelect, onDelete, isDeleting }: LayoutListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  if (isLoading) {
    return <div className="layout-list-loading">Loading layouts...</div>;
  }

  if (layouts.length === 0) {
    return (
      <div className="layout-list-empty">
        <p>No saved layouts yet.</p>
        <p className="layout-list-empty-hint">
          Design a layout and save it to see it here.
        </p>
      </div>
    );
  }

  const handleDeleteClick = (e: React.MouseEvent, layoutId: number) => {
    e.stopPropagation();
    if (confirmDeleteId === layoutId) {
      onDelete(layoutId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(layoutId);
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="layout-list">
      {layouts.map(layout => (
        <div
          key={layout.id}
          className="layout-list-item"
          onClick={() => onSelect(layout)}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(layout);
            }
          }}
        >
          <div className="layout-list-item-info">
            <span className="layout-list-item-name">{layout.name}</span>
            {layout.description && (
              <span className="layout-list-item-description">{layout.description}</span>
            )}
            <div className="layout-list-item-meta">
              <span>{layout.gridX} x {layout.gridY} grid</span>
              <span>{formatDate(layout.createdAt)}</span>
            </div>
          </div>
          <div className="layout-list-item-actions">
            <button
              className={`layout-delete-btn ${confirmDeleteId === layout.id ? 'confirming' : ''}`}
              onClick={e => handleDeleteClick(e, layout.id)}
              onBlur={() => setConfirmDeleteId(null)}
              type="button"
              disabled={isDeleting}
              aria-label={confirmDeleteId === layout.id ? 'Confirm delete' : `Delete ${layout.name}`}
            >
              {confirmDeleteId === layout.id ? 'Confirm' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
