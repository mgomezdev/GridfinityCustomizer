import { useEffect, useRef } from 'react';
import type { Library } from '../types/gridfinity';

interface LibrarySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableLibraries: Library[];
  selectedLibraryIds: string[];
  onToggleLibrary: (libraryId: string) => void;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

export function LibrarySelectionModal({
  isOpen,
  onClose,
  availableLibraries,
  selectedLibraryIds,
  onToggleLibrary,
  isLoading,
  onRefresh,
}: LibrarySelectionModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) dialogRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="layout-dialog-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className="layout-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lib-select-title"
        tabIndex={-1}
        style={{ maxWidth: 360 }}
      >
        <div className="layout-dialog-header">
          <h2 id="lib-select-title">Libraries</h2>
          <button className="layout-dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="layout-dialog-body">
          <p className="lib-select-hint">Choose which libraries appear in the component panel.</p>
          <div className="lib-select-list">
            {availableLibraries.map((library) => {
              const isSelected = selectedLibraryIds.includes(library.id);
              const isLastSelected = selectedLibraryIds.length === 1 && isSelected;
              return (
                <label key={library.id} className={`lib-select-item${isSelected ? ' selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isLoading || isLastSelected}
                    onChange={() => onToggleLibrary(library.id)}
                  />
                  <span className="lib-select-name">{library.name}</span>
                  {library.itemCount !== undefined && (
                    <span className="lib-select-count">{library.itemCount} items</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <div className="layout-dialog-actions">
          <button className="lib-select-refresh-btn" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="lib-select-done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
