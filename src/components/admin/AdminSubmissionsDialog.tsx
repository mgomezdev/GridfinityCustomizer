import { useState } from 'react';
import type { ApiLayout, LayoutStatus } from '@gridfinity/shared';
import type { LoadedLayoutConfig } from '../layouts/LoadLayoutDialog';
import { useAdminLayoutsQuery, useDeliverLayoutMutation, useCloneLayoutMutation } from '../../hooks/useLayouts';
import { useAuth } from '../../contexts/AuthContext';
import { fetchLayout } from '../../api/layouts.api';
import type { PlacedItem, Rotation, SpacerMode } from '@gridfinity/shared';
import type { RefImagePlacement } from '../../hooks/useRefImagePlacements';
import { groupLayouts } from './groupLayouts';
import type { GroupMode } from './groupLayouts';

interface AdminSubmissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (config: LoadedLayoutConfig) => void;
  hasItems: boolean;
}

type FilterTab = 'submitted' | 'delivered' | 'all';

function StatusBadge({ status }: { status: LayoutStatus }) {
  const className = `layout-status-badge layout-status-${status}`;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={className}>{label}</span>;
}

export function AdminSubmissionsDialog({
  isOpen,
  onClose,
  onLoad,
  hasItems,
}: AdminSubmissionsDialogProps) {
  const [filter, setFilter] = useState<FilterTab>('submitted');
  const [groupBy, setGroupBy] = useState<GroupMode>('none');
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getAccessToken } = useAuth();
  const statusFilter = filter === 'all' ? undefined : filter;
  const layoutsQuery = useAdminLayoutsQuery(statusFilter);
  const deliverMutation = useDeliverLayoutMutation();
  const cloneMutation = useCloneLayoutMutation();

  if (!isOpen) return null;

  const handleLoad = async (layout: ApiLayout) => {
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

      const placedItems: PlacedItem[] = detail.placedItems.map((item, index) => ({
        instanceId: `loaded-${index}`,
        itemId: `${item.libraryId}:${item.itemId}`,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        rotation: item.rotation as Rotation,
        ...(item.customization ? { customization: item.customization } : {}),
      }));

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
        ownerUsername: layout.ownerUsername,
        ownerEmail: layout.ownerEmail,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load layout');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleDeliver = async (e: React.MouseEvent, layoutId: number) => {
    e.stopPropagation();
    try {
      await deliverMutation.mutateAsync(layoutId);
    } catch {
      // Error handled by mutation state
    }
  };

  const handleClone = async (e: React.MouseEvent, layoutId: number) => {
    e.stopPropagation();
    try {
      await cloneMutation.mutateAsync(layoutId);
    } catch {
      // Error handled by mutation state
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
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

  const layouts = layoutsQuery.data ?? [];
  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'submitted', label: 'Pending' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="layout-dialog-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div
        className="layout-dialog layout-dialog-wide"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Admin Submissions"
      >
        <div className="layout-dialog-header">
          <h2>Submissions</h2>
          <button
            className="layout-dialog-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="admin-filter-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`admin-filter-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="admin-group-controls">
          <label htmlFor="admin-group-select">Group by</label>
          <select
            id="admin-group-select"
            className="admin-group-select"
            value={groupBy}
            onChange={e => setGroupBy(e.target.value as GroupMode)}
          >
            <option value="none">None</option>
            <option value="owner">Owner</option>
            <option value="lastEdited">Last Edited</option>
          </select>
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
              {layoutsQuery.error?.message ?? 'Failed to load submissions'}
            </div>
          )}

          {layoutsQuery.isLoading ? (
            <div className="layout-list-loading">Loading submissions...</div>
          ) : layouts.length === 0 ? (
            <div className="layout-list-empty">
              <p>No {filter === 'all' ? '' : filter} submissions.</p>
            </div>
          ) : (
            <div className="layout-list">
              {groupLayouts(layouts, groupBy).map(group => (
                <div key={group.label}>
                  {groupBy !== 'none' && (
                    <h3 className="admin-group-header">{group.label}</h3>
                  )}
                  {group.layouts.map(layout => (
                    <div
                      key={layout.id}
                      className="layout-list-item"
                      onClick={() => handleLoad(layout)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleLoad(layout);
                        }
                      }}
                    >
                      <div className="layout-list-item-info">
                        <div className="layout-list-item-name-row">
                          <span className="layout-list-item-name">{layout.name}</span>
                          <StatusBadge status={layout.status} />
                        </div>
                        <div className="layout-list-item-meta">
                          <span>{layout.gridX} x {layout.gridY} grid</span>
                          <span>{formatDate(layout.updatedAt)}</span>
                          {layout.ownerUsername && (
                            <span>by {layout.ownerUsername}</span>
                          )}
                        </div>
                      </div>
                      <div className="layout-list-item-actions">
                        {layout.status === 'submitted' && (
                          <button
                            className="layout-action-btn layout-deliver-action"
                            onClick={e => handleDeliver(e, layout.id)}
                            type="button"
                            disabled={deliverMutation.isPending}
                            aria-label={`Deliver ${layout.name}`}
                          >
                            {deliverMutation.isPending ? 'Delivering...' : 'Mark Delivered'}
                          </button>
                        )}
                        {layout.status === 'delivered' && (
                          <button
                            className="layout-action-btn layout-clone-action"
                            onClick={e => handleClone(e, layout.id)}
                            type="button"
                            disabled={cloneMutation.isPending}
                            aria-label={`Clone ${layout.name}`}
                          >
                            Clone
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
