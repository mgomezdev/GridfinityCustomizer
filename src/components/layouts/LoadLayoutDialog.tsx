import { useState } from 'react';
import type { ApiLayout, ApiLayoutDetail, PlacedItem, Rotation, SpacerMode, GridSpacerConfig } from '@gridfinity/shared';
import { useLayoutsQuery, useDeleteLayoutMutation } from '../../hooks/useLayouts';
import { useAuth } from '../../contexts/AuthContext';
import { fetchLayout } from '../../api/layouts.api';
import { LayoutList } from './LayoutList';

interface LoadLayoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (config: LoadedLayoutConfig) => void;
  hasItems: boolean;
}

export interface LoadedLayoutConfig {
  widthMm: number;
  depthMm: number;
  spacerConfig: GridSpacerConfig;
  placedItems: PlacedItem[];
}

function apiToPlacedItems(detail: ApiLayoutDetail): PlacedItem[] {
  return detail.placedItems.map((item, index) => ({
    instanceId: `loaded-${index}`,
    itemId: `${item.libraryId}:${item.itemId}`,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation as Rotation,
  }));
}

export function LoadLayoutDialog({
  isOpen,
  onClose,
  onLoad,
  hasItems,
}: LoadLayoutDialogProps) {
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getAccessToken } = useAuth();
  const layoutsQuery = useLayoutsQuery();
  const deleteLayoutMutation = useDeleteLayoutMutation();

  if (!isOpen) return null;

  const handleSelect = async (layout: ApiLayout) => {
    if (hasItems) {
      const confirmed = window.confirm('Replace current layout? This will remove all currently placed items.');
      if (!confirmed) return;
    }

    setIsLoadingDetail(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');

      const detail = await fetchLayout(token, layout.id);
      const placedItems = apiToPlacedItems(detail);

      onLoad({
        widthMm: detail.widthMm,
        depthMm: detail.depthMm,
        spacerConfig: {
          horizontal: detail.spacerHorizontal as SpacerMode,
          vertical: detail.spacerVertical as SpacerMode,
        },
        placedItems,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load layout');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleDelete = async (layoutId: number) => {
    try {
      await deleteLayoutMutation.mutateAsync(layoutId);
    } catch {
      // Error is handled by mutation state
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="layout-dialog-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div
        className="layout-dialog layout-dialog-wide"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Load Layout"
      >
        <div className="layout-dialog-header">
          <h2>My Layouts</h2>
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
          {isLoadingDetail && (
            <div className="layout-loading-overlay">Loading layout...</div>
          )}

          {error && (
            <div className="layout-error-message">{error}</div>
          )}

          {layoutsQuery.isError && (
            <div className="layout-error-message">
              {layoutsQuery.error?.message ?? 'Failed to load layouts'}
            </div>
          )}

          <LayoutList
            layouts={layoutsQuery.data ?? []}
            isLoading={layoutsQuery.isLoading}
            onSelect={handleSelect}
            onDelete={handleDelete}
            isDeleting={deleteLayoutMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
