import { useState, useCallback } from 'react';
import type { PlacedItemWithValidity, GridSpacerConfig } from '../../types/gridfinity';
import { useSaveLayoutMutation } from '../../hooks/useLayouts';

interface SaveLayoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gridX: number;
  gridY: number;
  widthMm: number;
  depthMm: number;
  spacerConfig: GridSpacerConfig;
  placedItems: PlacedItemWithValidity[];
}

interface SaveLayoutFormProps {
  onClose: () => void;
  gridX: number;
  gridY: number;
  widthMm: number;
  depthMm: number;
  spacerConfig: GridSpacerConfig;
  placedItems: PlacedItemWithValidity[];
}

function SaveLayoutForm({
  onClose,
  gridX,
  gridY,
  widthMm,
  depthMm,
  spacerConfig,
  placedItems,
}: SaveLayoutFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const saveLayoutMutation = useSaveLayoutMutation();

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      await saveLayoutMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        gridX,
        gridY,
        widthMm,
        depthMm,
        spacerHorizontal: spacerConfig.horizontal,
        spacerVertical: spacerConfig.vertical,
        placedItems: placedItems.map(item => ({
          itemId: item.itemId,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          rotation: item.rotation,
        })),
      });

      setSuccessMessage('Layout saved successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch {
      // Error is handled by mutation state
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && name.trim() && !saveLayoutMutation.isPending) {
      handleSave();
    }
  };

  const nameInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      setTimeout(() => node.focus(), 50);
    }
  }, []);

  return (
    <div className="layout-dialog-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div
        className="layout-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Save Layout"
      >
        <div className="layout-dialog-header">
          <h2>Save Layout</h2>
          <button
            className="layout-dialog-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="layout-dialog-body">
          {successMessage ? (
            <div className="layout-success-message">{successMessage}</div>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="layout-name">Name</label>
                <input
                  ref={nameInputRef}
                  id="layout-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="My Layout"
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="layout-description">Description (optional)</label>
                <textarea
                  id="layout-description"
                  className="layout-description-input"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="A brief description of this layout..."
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="layout-dialog-info">
                <span>Grid: {gridX} x {gridY}</span>
                <span>Items: {placedItems.length}</span>
              </div>

              {saveLayoutMutation.isError && (
                <div className="layout-error-message">
                  {saveLayoutMutation.error?.message ?? 'Failed to save layout'}
                </div>
              )}

              <div className="layout-dialog-actions">
                <button
                  className="cancel-button"
                  onClick={onClose}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="submit-button"
                  onClick={handleSave}
                  type="button"
                  disabled={!name.trim() || saveLayoutMutation.isPending}
                >
                  {saveLayoutMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SaveLayoutDialog({
  isOpen,
  onClose,
  gridX,
  gridY,
  widthMm,
  depthMm,
  spacerConfig,
  placedItems,
}: SaveLayoutDialogProps) {
  if (!isOpen) return null;

  // Mounting/unmounting the form component handles the state reset naturally
  return (
    <SaveLayoutForm
      onClose={onClose}
      gridX={gridX}
      gridY={gridY}
      widthMm={widthMm}
      depthMm={depthMm}
      spacerConfig={spacerConfig}
      placedItems={placedItems}
    />
  );
}
