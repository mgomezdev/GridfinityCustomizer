import { useState } from 'react';
import type { ApiLayout } from '@gridfinity/shared';

interface SavedConfigCardProps {
  layout: ApiLayout;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onSubmit: (id: number) => void;
  onWithdraw: (id: number) => void;
  onDuplicate: (id: number) => void;
  isDeleting: boolean;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function SavedConfigCard({
  layout,
  onEdit,
  onDelete,
  onSubmit,
  onWithdraw,
  onDuplicate,
  isDeleting,
}: SavedConfigCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="saved-config-card">
      <div className="saved-config-thumbnail">
        <span className="saved-config-grid-dims">{layout.gridX}&times;{layout.gridY}</span>
      </div>

      <div className="saved-config-info">
        <div className="saved-config-name-row">
          <span className="saved-config-name">{layout.name}</span>
          <span className={`layout-status-badge layout-status-${layout.status}`}>{layout.status}</span>
        </div>
        <span className="saved-config-date">Saved {formatDate(layout.updatedAt)}</span>
      </div>

      <div className="saved-config-actions">
        <button
          className="saved-config-btn"
          onClick={() => onEdit(layout.id)}
          type="button"
        >
          Edit
        </button>
        <button
          className="saved-config-btn"
          onClick={() => onDuplicate(layout.id)}
          type="button"
        >
          Duplicate
        </button>
        {layout.status === 'draft' && (
          <button
            className="saved-config-btn saved-config-submit"
            onClick={() => onSubmit(layout.id)}
            type="button"
          >
            Submit
          </button>
        )}
        {layout.status === 'submitted' && (
          <button
            className="saved-config-btn"
            onClick={() => onWithdraw(layout.id)}
            type="button"
          >
            Withdraw
          </button>
        )}
        {layout.status !== 'delivered' && (
          confirmDelete ? (
            <button
              className="saved-config-btn saved-config-delete confirming"
              onClick={() => {
                onDelete(layout.id);
                setConfirmDelete(false);
              }}
              onBlur={() => setConfirmDelete(false)}
              disabled={isDeleting}
              type="button"
            >
              Confirm
            </button>
          ) : (
            <button
              className="saved-config-btn saved-config-delete"
              onClick={() => setConfirmDelete(true)}
              disabled={isDeleting}
              type="button"
            >
              Delete
            </button>
          )
        )}
      </div>
    </div>
  );
}
