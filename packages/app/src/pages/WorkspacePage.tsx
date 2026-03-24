import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ImageViewMode, DragData } from '../types/gridfinity';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useGridTransform } from '../hooks/useGridTransform';
import { useUpdateLayoutMutation } from '../hooks/useLayouts';
import { buildPayload } from '../components/layouts/SaveLayoutDialog';
import { DimensionInput } from '../components/DimensionInput';
import { GridPreview } from '../components/GridPreview';
import { GridSummary } from '../components/GridSummary';
import { ItemLibrary } from '../components/ItemLibrary';
import { SpacerControls } from '../components/SpacerControls';
import { RefImageLibrary } from '../components/RefImageLibrary';
import { ZoomControls } from '../components/ZoomControls';
import { ImageViewToggle } from '../components/ImageViewToggle';
import { GridViewport } from '../components/GridViewport';
import { SidebarPanel } from '../components/SidebarPanel';
import { SubmissionsBadge } from '../components/admin/SubmissionsBadge';
import { UserStlLibrarySection } from '../components/UserStlLibrarySection';
import { exportToPdf } from '../utils/exportPdf';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001/api/v1';

const LIBRARY_MIN_WIDTH = 160;
const LIBRARY_MAX_WIDTH = 520;
const LIBRARY_DEFAULT_WIDTH = 260;
const GRIDFINITY_UNIT_MM = 42;

export function WorkspacePage() {
  const navigate = useNavigate();
  const ws = useWorkspace();

  const {
    width, setWidth, depth, setDepth, unitSystem, imperialFormat, setImperialFormat,
    spacerConfig, setSpacerConfig, handleUnitChange,
    gridResult, spacers,
    placedItems, selectedItemIds,
    rotateItem, deleteItem,
    selectItem, selectAll, deselectAll, handleDrop, duplicateItem,
    copyItems, pasteItems, deleteSelected, rotateSelected, updateItemCustomization,
    bomItems,
    layoutMeta, isReadOnly,
    handleSaveComplete,
    drawerWidth,
    drawerDepth,
    refImagePlacements, addRefImagePlacement, removeRefImagePlacement,
    updateRefImagePosition, updateRefImageScale, updateRefImageOpacity,
    updateRefImageRotation, toggleRefImageLock,
    referenceImagesForGrid,
    libraryItems, isLibraryLoading, isLibrariesLoading, libraryError, librariesError,
    categories, getItemById, getLibraryMeta,
    handleSubmitClick, handleWithdrawLayout,
    handleClearAll, handleReset,
    submitLayoutMutation, withdrawLayoutMutation,
    submittedCountQuery,
    dialogDispatch,
    isAuthenticated, isAdmin,
    exportPdfError, setExportPdfError,
  } = ws;

  // Local UI state
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [libraryTab, setLibraryTab] = useState<'items' | 'images'>('items');
  const [libraryCategory, setLibraryCategory] = useState<string | null>(null);
  const [libraryWidth, setLibraryWidth] = useState(LIBRARY_DEFAULT_WIDTH);
  const libraryDragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const [imageViewMode, setImageViewMode] = useState<ImageViewMode>(
    () => (localStorage.getItem('gridfinity-image-view-mode') as ImageViewMode) || 'ortho'
  );

  const updateLayoutMutation = useUpdateLayoutMutation();

  const [toast, setToast] = useState<{ visible: boolean; isError: boolean }>({
    visible: false,
    isError: false,
  });

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const handleDirectSave = useCallback(async () => {
    if (!layoutMeta.id) return;
    try {
      const payload = buildPayload(
        layoutMeta.name,
        layoutMeta.description,
        gridResult.gridX,
        gridResult.gridY,
        drawerWidth,
        drawerDepth,
        spacerConfig,
        placedItems,
        refImagePlacements,
      );
      const result = await updateLayoutMutation.mutateAsync({ id: layoutMeta.id, data: payload });
      handleSaveComplete(result.id, result.name, result.status);
      setToast({ visible: true, isError: false });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 1500);
    } catch {
      setToast({ visible: true, isError: true });
    }
  }, [layoutMeta, gridResult, drawerWidth, drawerDepth, spacerConfig, placedItems,
      refImagePlacements, updateLayoutMutation, handleSaveComplete]);

  const handleLibraryResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    libraryDragRef.current = { startX: e.clientX, startWidth: libraryWidth };
    const onMove = (ev: MouseEvent) => {
      if (!libraryDragRef.current) return;
      const delta = libraryDragRef.current.startX - ev.clientX;
      setLibraryWidth(Math.min(LIBRARY_MAX_WIDTH, Math.max(LIBRARY_MIN_WIDTH, libraryDragRef.current.startWidth + delta)));
    };
    const onUp = () => {
      libraryDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [libraryWidth]);

  // Zoom and pan
  const {
    transform, zoomIn, zoomOut, resetZoom, fitToScreen,
    handleWheel, setZoomLevel, pan,
  } = useGridTransform();

  const viewportRef = useRef<HTMLDivElement>(null);
  const isSpaceHeldRef = useRef(false);

  const handleFitToScreen = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const content = viewport.querySelector('.grid-preview') as HTMLElement | null;
    if (!content) return;
    const viewportRect = viewport.getBoundingClientRect();
    fitToScreen(viewportRect.width, viewportRect.height, content.offsetWidth, content.offsetHeight);
  }, [fitToScreen]);

  // Metadata map for broken state / image URLs
  const refImageMetadata = useMemo(() => {
    const map = new Map<string, { isBroken: boolean; imageUrl: string | null }>();
    for (const p of refImagePlacements) {
      map.set(p.id, {
        isBroken: p.refImageId === null,
        imageUrl: p.imageUrl ? `${API_BASE_URL}/images/${p.imageUrl}` : null,
      });
    }
    return map;
  }, [refImagePlacements]);

  // Combined drop handler for both library items and ref images
  const handleCombinedDrop = useCallback((dragData: DragData, x: number, y: number) => {
    if (isReadOnly) return;
    if (dragData.type === 'ref-image' && dragData.refImageId != null) {
      const xPercent = (x / gridResult.gridX) * 100;
      const yPercent = (y / gridResult.gridY) * 100;
      addRefImagePlacement({
        refImageId: dragData.refImageId, name: dragData.refImageName ?? 'Reference Image',
        imageUrl: dragData.refImageUrl ?? '', x: xPercent, y: yPercent,
        width: 25, height: 25, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      });
    } else {
      handleDrop(dragData, x, y);
    }
  }, [isReadOnly, gridResult.gridX, gridResult.gridY, addRefImagePlacement, handleDrop]);

  const handleExportPdf = useCallback(async () => {
    setExportPdfError(null);
    const gridEl = viewportRef.current?.querySelector('.grid-preview') as HTMLElement | null;
    if (!gridEl) return;
    await exportToPdf(
      gridEl,
      bomItems,
      { gridResult, spacerConfig, unitSystem, layoutName: layoutMeta.name },
      () => setExportPdfError('PDF export failed. Please try again.'),
    );
  }, [bomItems, gridResult, spacerConfig, unitSystem, layoutMeta.name, setExportPdfError]);

  const handleFitWidth = useCallback(() => {
    const mm = unitSystem === 'imperial' ? width * 25.4 : width;
    const fitted = Math.max(GRIDFINITY_UNIT_MM, Math.floor(mm / GRIDFINITY_UNIT_MM) * GRIDFINITY_UNIT_MM);
    setWidth(unitSystem === 'imperial' ? fitted / 25.4 : fitted);
  }, [width, unitSystem, setWidth]);

  const handleFitDepth = useCallback(() => {
    const mm = unitSystem === 'imperial' ? depth * 25.4 : depth;
    const fitted = Math.max(GRIDFINITY_UNIT_MM, Math.floor(mm / GRIDFINITY_UNIT_MM) * GRIDFINITY_UNIT_MM);
    setDepth(unitSystem === 'imperial' ? fitted / 25.4 : fitted);
  }, [depth, unitSystem, setDepth]);

  const handleRemoveImage = (id: string) => {
    removeRefImagePlacement(id);
    if (selectedImageId === id) setSelectedImageId(null);
  };

  const handleRebindImage = useCallback((id: string) => {
    dialogDispatch({ type: 'OPEN_REBIND', targetId: id });
  }, [dialogDispatch]);

  const toggleImageViewMode = useCallback(() => {
    setImageViewMode(prev => {
      const next = prev === 'ortho' ? 'perspective' : 'ortho';
      localStorage.setItem('gridfinity-image-view-mode', next);
      return next;
    });
  }, []);

  // Keyboard shortcuts
  const keyDownHandlerRef = useRef<((event: KeyboardEvent) => void) | undefined>(undefined);

  keyDownHandlerRef.current = (event: KeyboardEvent) => {
    const activeElement = document.activeElement;
    const isTyping = activeElement?.tagName === 'INPUT' ||
                     activeElement?.tagName === 'TEXTAREA' ||
                     activeElement?.tagName === 'SELECT';
    if (isTyping) return;

    if ((event.key === 'Delete' || event.key === 'Backspace')) {
      if (selectedImageId) {
        event.preventDefault();
        removeRefImagePlacement(selectedImageId);
        setSelectedImageId(null);
        return;
      }
      if (selectedItemIds.size > 0) { event.preventDefault(); deleteSelected(); return; }
    }

    if (event.key === 'r' || event.key === 'R') {
      if (selectedImageId) {
        event.preventDefault();
        updateRefImageRotation(selectedImageId, event.shiftKey ? 'ccw' : 'cw');
        return;
      }
      if (selectedItemIds.size > 0) {
        event.preventDefault();
        rotateSelected(event.shiftKey ? 'ccw' : 'cw');
        return;
      }
    }

    if ((event.key === 'd' || event.key === 'D') && (event.ctrlKey || event.metaKey)) {
      event.preventDefault(); duplicateItem(); return;
    }
    if ((event.key === 'c' || event.key === 'C') && (event.ctrlKey || event.metaKey)) {
      event.preventDefault(); copyItems(); return;
    }
    if ((event.key === 'v' || event.key === 'V') && (event.ctrlKey || event.metaKey)) {
      event.preventDefault(); pasteItems(); return;
    }
    if ((event.key === 'v' || event.key === 'V') && !event.ctrlKey && !event.metaKey) {
      event.preventDefault(); toggleImageViewMode(); return;
    }
    if (event.key === 'Escape') { deselectAll(); setSelectedImageId(null); return; }
    if ((event.key === 'a' || event.key === 'A') && (event.ctrlKey || event.metaKey)) {
      event.preventDefault(); selectAll(); return;
    }
    if ((event.key === 'l' || event.key === 'L') && selectedImageId) {
      event.preventDefault(); toggleRefImageLock(selectedImageId); return;
    }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomIn(); return; }
    if (event.key === '-' || event.key === '_') { event.preventDefault(); zoomOut(); return; }
    if (event.key === '0' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault(); resetZoom(); return;
    }
    if (event.key === '?') {
      event.preventDefault(); dialogDispatch({ type: 'TOGGLE', dialog: 'keyboard' }); return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      isSpaceHeldRef.current = true;
      if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
      return;
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyDownHandlerRef.current?.(e);
    document.addEventListener('keydown', handler);

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        isSpaceHeldRef.current = false;
        if (viewportRef.current) viewportRef.current.style.cursor = '';
      }
    };
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const dimensionsContent = (
    <>
      <div className="unit-toggle-compact">
        <button className={unitSystem === 'metric' ? 'active' : ''} onClick={() => handleUnitChange('metric')}>mm</button>
        <button className={unitSystem === 'imperial' ? 'active' : ''} onClick={() => handleUnitChange('imperial')}>in</button>
      </div>
      {unitSystem === 'imperial' && (
        <div className="format-toggle-compact">
          <button className={imperialFormat === 'decimal' ? 'active' : ''} onClick={() => setImperialFormat('decimal')}>.00</button>
          <button className={imperialFormat === 'fractional' ? 'active' : ''} onClick={() => setImperialFormat('fractional')}>½</button>
        </div>
      )}
      <div className="dimension-input-row">
        <DimensionInput label="Width" value={width} onChange={setWidth} unit={unitSystem} imperialFormat={imperialFormat} />
        <button className="fit-btn" onClick={handleFitWidth} type="button" title="Snap to nearest full grid unit">FIT W</button>
      </div>
      <div className="dimension-input-row">
        <DimensionInput label="Depth" value={depth} onChange={setDepth} unit={unitSystem} imperialFormat={imperialFormat} />
        <button className="fit-btn" onClick={handleFitDepth} type="button" title="Snap to nearest full grid unit">FIT D</button>
      </div>
      <GridSummary
        gridX={gridResult.gridX} gridY={gridResult.gridY}
        gapWidth={gridResult.gapWidth} gapDepth={gridResult.gapDepth}
        unit={unitSystem} imperialFormat={imperialFormat}
      />
    </>
  );

  const spacerContent = (
    <SpacerControls config={spacerConfig} onConfigChange={setSpacerConfig} />
  );

  return (
    <>
      <SidebarPanel
        dimensionsContent={dimensionsContent}
        spacerContent={spacerContent}
        onClearCanvas={handleClearAll}
        onReset={handleReset}
        isReadOnly={isReadOnly}
      />

      <section className={`preview${isReadOnly ? ' canvas-readonly' : ''}`}>
        <nav className="canvas-breadcrumb" aria-label="breadcrumb">
          <span className="canvas-breadcrumb-item">Workspace</span>
          {layoutMeta.name && (
            <>
              <span className="canvas-breadcrumb-sep">›</span>
              <span className="canvas-breadcrumb-item canvas-breadcrumb-current">{layoutMeta.name}</span>
            </>
          )}
        </nav>
        <div className="preview-toolbar">
          <div className="reference-image-toolbar">
            {isAuthenticated && (
              <button className="layout-toolbar-btn layout-load-btn" onClick={() => navigate('/configs')} type="button">Load</button>
            )}
            {/* Unsaved layout */}
            {isAuthenticated && !isReadOnly && !layoutMeta.id && (
              <button
                className="layout-toolbar-btn layout-save-btn"
                onClick={() => dialogDispatch({ type: 'OPEN', dialog: 'save' })}
                type="button"
                disabled={placedItems.length === 0 && refImagePlacements.length === 0}
              >
                Save
              </button>
            )}

            {/* Saved layout — draft or submitted */}
            {isAuthenticated && !isReadOnly && !!layoutMeta.id && (
              <>
                <button
                  className="layout-toolbar-btn"
                  onClick={() => dialogDispatch({ type: 'OPEN', dialog: 'save' })}
                  type="button"
                >
                  Save as New
                </button>
                <button
                  className="layout-toolbar-btn layout-save-btn"
                  onClick={handleDirectSave}
                  type="button"
                  disabled={updateLayoutMutation.isPending || (placedItems.length === 0 && refImagePlacements.length === 0)}
                >
                  {updateLayoutMutation.isPending ? 'Saving\u2026' : 'Save Changes'}
                </button>
              </>
            )}

            {/* Delivered (read-only) layout */}
            {isAuthenticated && isReadOnly && (
              <button
                className="layout-toolbar-btn layout-save-btn"
                onClick={() => dialogDispatch({ type: 'OPEN', dialog: 'save' })}
                type="button"
              >
                Build from This
              </button>
            )}

            {toast.visible && (
              <div className={`save-toast ${toast.isError ? 'save-toast-error' : 'save-toast-success'}`}>
                {toast.isError ? (
                  <>
                    <span>Save failed. Try again.</span>
                    <button
                      type="button"
                      className="save-toast-dismiss"
                      onClick={() => setToast(t => ({ ...t, visible: false }))}
                      aria-label="Dismiss"
                    >
                      &times;
                    </button>
                  </>
                ) : (
                  <span>Saved!</span>
                )}
              </div>
            )}

            {isAuthenticated && layoutMeta.status !== 'submitted' && layoutMeta.status !== 'delivered' && (
              <button
                className="layout-toolbar-btn layout-submit-btn"
                onClick={handleSubmitClick}
                type="button"
                disabled={submitLayoutMutation.isPending}
              >
                {submitLayoutMutation.isPending ? 'Submitting...' : 'Submit'}
              </button>
            )}
            {isAuthenticated && layoutMeta.status === 'delivered' && (
              <button className="layout-toolbar-btn layout-submit-btn" disabled type="button" title="This layout has been fulfilled">
                Submit
              </button>
            )}
            {isAuthenticated && layoutMeta.id && layoutMeta.status === 'submitted' && (
              <button className="layout-toolbar-btn layout-withdraw-btn" onClick={handleWithdrawLayout} type="button" disabled={withdrawLayoutMutation.isPending}>
                {withdrawLayoutMutation.isPending ? 'Withdrawing...' : 'Withdraw'}
              </button>
            )}
            <button
              className="layout-toolbar-btn layout-export-btn"
              onClick={handleExportPdf}
              type="button"
              disabled={placedItems.length === 0}
              title="Export layout as PDF"
            >
              Export PDF
            </button>
            {exportPdfError && (
              <span className="export-pdf-error" role="alert">{exportPdfError}</span>
            )}
            {!isReadOnly && (placedItems.length > 0 || refImagePlacements.length > 0) && (
              <button className="clear-all-button" onClick={handleClearAll}>Clear All ({placedItems.length + refImagePlacements.length})</button>
            )}
            {isAdmin && (
              <SubmissionsBadge count={submittedCountQuery.data?.submitted ?? 0} onClick={() => dialogDispatch({ type: 'OPEN', dialog: 'admin' })} />
            )}
          </div>
          <ImageViewToggle mode={imageViewMode} onToggle={toggleImageViewMode} />
          <ZoomControls zoom={transform.zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onResetZoom={resetZoom} onFitToScreen={handleFitToScreen} />
        </div>
        <GridViewport
          viewportRef={viewportRef}
          transform={transform}
          handleWheel={handleWheel}
          setZoomLevel={setZoomLevel}
          pan={pan}
          isSpaceHeldRef={isSpaceHeldRef}
        >
          <GridPreview
            gridX={gridResult.gridX}
            gridY={gridResult.gridY}
            placedItems={placedItems}
            selectedItemIds={selectedItemIds}
            spacers={spacers}
            imageViewMode={imageViewMode}
            onDrop={handleCombinedDrop}
            onSelectItem={(id, mods) => { selectItem(id, mods); if (id) setSelectedImageId(null); }}
            getItemById={getItemById}
            onDeleteItem={deleteItem}
            onRotateItemCw={(id) => rotateItem(id, 'cw')}
            onRotateItemCcw={(id) => rotateItem(id, 'ccw')}
            onItemCustomizationChange={updateItemCustomization}
            onItemCustomizationReset={(id) => updateItemCustomization(id, undefined)}
            onDuplicateItem={duplicateItem}
            getLibraryMeta={getLibraryMeta}
            referenceImages={referenceImagesForGrid}
            selectedImageId={selectedImageId}
            onImagePositionChange={updateRefImagePosition}
            onImageSelect={(id) => { setSelectedImageId(id); deselectAll(); }}
            onImageScaleChange={updateRefImageScale}
            onImageOpacityChange={updateRefImageOpacity}
            onImageRemove={handleRemoveImage}
            onImageToggleLock={toggleRefImageLock}
            onImageRotateCw={(id) => updateRefImageRotation(id, 'cw')}
            onImageRotateCcw={(id) => updateRefImageRotation(id, 'ccw')}
            refImageMetadata={refImageMetadata}
            onRefImageRebind={handleRebindImage}
          />
        </GridViewport>
      </section>

      <div className="library-resize-handle" onMouseDown={handleLibraryResizeStart} role="separator" aria-label="Resize library panel" />
      <section className="library-panel" style={{ width: libraryWidth, minWidth: libraryWidth }}>
        <div className="library-panel-header">
          <div className="library-panel-header-icon">⊞</div>
          <div className="library-panel-header-text">
            <span className="library-panel-title">Component Library</span>
            <span className="library-panel-subtitle">Drag to workspace</span>
          </div>
        </div>
        <div className="library-panel-tabs">
          <button
            className={`library-cat-tab${libraryTab === 'items' && !libraryCategory ? ' active' : ''}`}
            onClick={() => { setLibraryTab('items'); setLibraryCategory(null); }}
            type="button"
          >All</button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`library-cat-tab${libraryTab === 'items' && libraryCategory === cat.id ? ' active' : ''}`}
              onClick={() => { setLibraryTab('items'); setLibraryCategory(cat.id); }}
              type="button"
            >{cat.name}</button>
          ))}
          {isAuthenticated && (
            <button
              className={`library-cat-tab${libraryTab === 'images' ? ' active' : ''}`}
              onClick={() => setLibraryTab('images')}
              type="button"
            >Images</button>
          )}
        </div>
        <div className="library-panel-content">
          {libraryTab === 'items' ? (
            <>
              <ItemLibrary
                items={libraryItems}
                isLoading={isLibraryLoading || isLibrariesLoading}
                error={libraryError || librariesError}
                activeCategory={libraryCategory}
              />
              {isAuthenticated && <UserStlLibrarySection />}
            </>
          ) : isAuthenticated ? (
            <RefImageLibrary />
          ) : (
            <div className="ref-image-auth-prompt">
              <p>Sign in to upload and manage reference images.</p>
            </div>
          )}
        </div>
      </section>

    </>
  );
}
