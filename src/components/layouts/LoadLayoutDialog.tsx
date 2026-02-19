import { useState } from 'react';
import type { ApiLayout, ApiLayoutDetail, PlacedItem, Rotation, SpacerMode, GridSpacerConfig, LayoutStatus } from '@gridfinity/shared';
import type { RefImagePlacement } from '../../hooks/useRefImagePlacements';
import { useLayoutsQuery, useDeleteLayoutMutation, useSubmitLayoutMutation, useWithdrawLayoutMutation, useCloneLayoutMutation } from '../../hooks/useLayouts';
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
  layoutId: number;
  layoutName: string;
  layoutDescription: string | null;
  layoutStatus: LayoutStatus;
  widthMm: number;
  depthMm: number;
  spacerConfig: GridSpacerConfig;
  placedItems: PlacedItem[];
  refImagePlacements?: RefImagePlacement[];
  ownerUsername?: string;
  ownerEmail?: string;
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
    ...(item.customization ? { customization: item.customization } : {}),
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
  const submitLayoutMutation = useSubmitLayoutMutation();
  const withdrawLayoutMutation = useWithdrawLayoutMutation();
  const cloneLayoutMutation = useCloneLayoutMutation();

  if (!isOpen) return null;

  const handleSelect = async (layout: ApiLayout) => {
    if (hasItems) {
      const confirmed = window.confirm('Replace current layout? This will remove all placed items and reference images.');
      if (!confirmed) return;
    }

    setIsLoadingDetail(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');

      const detail = await fetchLayout(token, layout.id);
      const placedItems = apiToPlacedItems(detail);

      // Convert API ref image placements to frontend format
      const refImagePlacements: RefImagePlacement[] = (detail.refImagePlacements ?? []).map((p, index) => ({
        id: `loaded-ref-${index}`,
        refImageId: p.refImageId,
        name: p.name,
        imageUrl: p.imageUrl,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        opacity: p.opacity,
        scale: p.scale,
        isLocked: p.isLocked,
        rotation: p.rotation as Rotation,
      }));

      onLoad({
        layoutId: detail.id,
        layoutName: detail.name,
        layoutDescription: detail.description,
        layoutStatus: detail.status,
        widthMm: detail.widthMm,
        depthMm: detail.depthMm,
        spacerConfig: {
          horizontal: detail.spacerHorizontal as SpacerMode,
          vertical: detail.spacerVertical as SpacerMode,
        },
        placedItems,
        refImagePlacements,
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

  const handleSubmit = async (layoutId: number) => {
    try {
      await submitLayoutMutation.mutateAsync(layoutId);
    } catch {
      // Error is handled by mutation state
    }
  };

  const handleWithdraw = async (layoutId: number) => {
    try {
      await withdrawLayoutMutation.mutateAsync(layoutId);
    } catch {
      // Error is handled by mutation state
    }
  };

  const handleClone = async (layoutId: number) => {
    try {
      await cloneLayoutMutation.mutateAsync(layoutId);
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
            onSubmit={handleSubmit}
            onWithdraw={handleWithdraw}
            onClone={handleClone}
            isDeleting={deleteLayoutMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
