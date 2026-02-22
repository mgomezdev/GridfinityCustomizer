import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { UnitSystem, ImperialFormat, GridSpacerConfig, ImageViewMode, ReferenceImage, DragData } from './types/gridfinity';
import type { LayoutStatus } from '@gridfinity/shared';
import { calculateGrid, mmToInches, inchesToMm } from './utils/conversions';
import { useLayoutMeta } from './hooks/useLayoutMeta';
import { useDialogState } from './hooks/useDialogState';
import { useGridItems } from './hooks/useGridItems';
import { useSpacerCalculation } from './hooks/useSpacerCalculation';
import { useBillOfMaterials } from './hooks/useBillOfMaterials';
import { useLibraries } from './hooks/useLibraries';
import { useLibraryData } from './hooks/useLibraryData';
import { useCategoryData } from './hooks/useCategoryData';
import { useRefImagePlacements } from './hooks/useRefImagePlacements';
import { useGridTransform } from './hooks/useGridTransform';
import { useAuth } from './contexts/AuthContext';
import { useWalkthrough, WALKTHROUGH_STEPS } from './contexts/WalkthroughContext';
import { useSubmitLayoutMutation, useWithdrawLayoutMutation, useCloneLayoutMutation, useSubmittedCountQuery } from './hooks/useLayouts';
import { useConfirmDialog } from './hooks/useConfirmDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DimensionInput } from './components/DimensionInput';
import { GridPreview } from './components/GridPreview';
import { GridSummary } from './components/GridSummary';
import { ItemLibrary } from './components/ItemLibrary';
import { ItemControls } from './components/ItemControls';
import { BinCustomizationPanel } from './components/BinCustomizationPanel';
import { SpacerControls } from './components/SpacerControls';
import { BillOfMaterials } from './components/BillOfMaterials';
import { RefImageLibrary } from './components/RefImageLibrary';
import { RebindImageDialog } from './components/RebindImageDialog';
import { ZoomControls } from './components/ZoomControls';
import { ImageViewToggle } from './components/ImageViewToggle';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { GridViewport } from './components/GridViewport';
import { SidebarPanel } from './components/SidebarPanel';
import { UserMenu } from './components/auth/UserMenu';
import { SaveLayoutDialog } from './components/layouts/SaveLayoutDialog';
import { LoadLayoutDialog } from './components/layouts/LoadLayoutDialog';
import type { LoadedLayoutConfig } from './components/layouts/LoadLayoutDialog';
import { AdminSubmissionsDialog } from './components/admin/AdminSubmissionsDialog';
import { SubmissionsBadge } from './components/admin/SubmissionsBadge';
import { WalkthroughOverlay } from './components/WalkthroughOverlay';
import { STORAGE_KEYS } from './utils/storageKeys';
import './App.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001/api/v1';

function App() {
  const [width, setWidth] = useState(168);
  const [depth, setDepth] = useState(168);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [imperialFormat, setImperialFormat] = useState<ImperialFormat>('decimal');
  const [spacerConfig, setSpacerConfig] = useState<GridSpacerConfig>({
    horizontal: 'none',
    vertical: 'none',
  });
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'items' | 'images'>('items');
  const [imageViewMode, setImageViewMode] = useState<ImageViewMode>(
    () => (localStorage.getItem('gridfinity-image-view-mode') as ImageViewMode) || 'ortho'
  );

  const { dialogs, dialogDispatch, closeRebind } = useDialogState();
  const {
    layoutMeta, layoutDispatch, isReadOnly,
    handleSaveComplete, handleSetStatus, handleCloneComplete, handleClearLayout,
  } = useLayoutMeta();

  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { isActive, currentStep, startTour, nextStep, dismissTour } = useWalkthrough();
  const prevAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && !prevAuthenticatedRef.current) {
      if (!localStorage.getItem(STORAGE_KEYS.WALKTHROUGH_SEEN)) {
        startTour();
      }
    }
    prevAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, startTour]);

  const submitLayoutMutation = useSubmitLayoutMutation();
  const withdrawLayoutMutation = useWithdrawLayoutMutation();
  const cloneLayoutMutation = useCloneLayoutMutation();
  const submittedCountQuery = useSubmittedCountQuery();
  const { confirm, dialogProps: confirmDialogProps } = useConfirmDialog();

  // Library selection and discovery
  const {
    availableLibraries,
    selectedLibraryIds,
    toggleLibrary,
    isLoading: isLibrariesLoading,
    error: librariesError,
    refreshLibraries,
  } = useLibraries();

  // Library data loading (multi-library)
  const {
    items: libraryItems,
    isLoading: isLibraryLoading,
    error: libraryError,
    getItemById,
    refreshLibrary,
  } = useLibraryData(selectedLibraryIds);

  // Category discovery from items
  const { categories } = useCategoryData(libraryItems);

  // Reference image placements (server-backed)
  const {
    placements: refImagePlacements,
    addPlacement: addRefImagePlacement,
    removePlacement: removeRefImagePlacement,
    updatePosition: updateRefImagePosition,
    updateScale: updateRefImageScale,
    updateOpacity: updateRefImageOpacity,
    updateRotation: updateRefImageRotation,
    toggleLock: toggleRefImageLock,
    rebindImage: rebindRefImage,
    loadPlacements: loadRefImagePlacements,
    clearAll: clearRefImages,
  } = useRefImagePlacements();

  const handleRefreshAll = async () => {
    try {
      await refreshLibraries();
      await refreshLibrary();
    } catch (err) {
      console.error('Library refresh failed:', err);
    }
  };

  const handleUnitChange = (newUnit: UnitSystem) => {
    if (newUnit === unitSystem) return;
    if (newUnit === 'imperial') {
      setWidth(parseFloat(mmToInches(width).toFixed(4)));
      setDepth(parseFloat(mmToInches(depth).toFixed(4)));
    } else {
      setWidth(Math.round(inchesToMm(width)));
      setDepth(Math.round(inchesToMm(depth)));
    }
    setUnitSystem(newUnit);
  };

  const gridResult = useMemo(() => calculateGrid(width, depth, unitSystem), [width, depth, unitSystem]);
  const drawerWidth = unitSystem === 'metric' ? width : inchesToMm(width);
  const drawerDepth = unitSystem === 'metric' ? depth : inchesToMm(depth);

  const spacers = useSpacerCalculation(
    unitSystem === 'metric' ? gridResult.gapWidth : inchesToMm(gridResult.gapWidth),
    unitSystem === 'metric' ? gridResult.gapDepth : inchesToMm(gridResult.gapDepth),
    spacerConfig,
    drawerWidth,
    drawerDepth
  );

  const {
    placedItems, selectedItemIds, rotateItem, deleteItem, clearAll, loadItems,
    selectItem, selectAll, deselectAll, handleDrop, duplicateItem,
    copyItems, pasteItems, deleteSelected, rotateSelected, updateItemCustomization,
  } = useGridItems(gridResult.gridX, gridResult.gridY, getItemById);

  const bomItems = useBillOfMaterials(placedItems, libraryItems);

  // Convert ref image placements to ReferenceImage format for GridPreview
  const referenceImagesForGrid: ReferenceImage[] = useMemo(() =>
    refImagePlacements.map(p => ({
      id: p.id, name: p.name, dataUrl: '',
      x: p.x, y: p.y, width: p.width, height: p.height,
      opacity: p.opacity, scale: p.scale, isLocked: p.isLocked, rotation: p.rotation,
    })),
    [refImagePlacements]
  );

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

  const handleSubmitLayout = useCallback(async () => {
    if (!layoutMeta.id) return;
    try {
      const result = await submitLayoutMutation.mutateAsync(layoutMeta.id);
      handleSetStatus(result.status);
    } catch {
      // Error handled by mutation
    }
  }, [layoutMeta.id, submitLayoutMutation, handleSetStatus]);

  const submitAfterSaveRef = useRef(false);

  const handleSubmitClick = useCallback(() => {
    if (!layoutMeta.id) {
      submitAfterSaveRef.current = true;
      dialogDispatch({ type: 'OPEN', dialog: 'save' });
    } else {
      handleSubmitLayout();
    }
  }, [layoutMeta.id, dialogDispatch, handleSubmitLayout]);

  const handleSaveCompleteWithSubmit = useCallback((layoutId: number, name: string, status: LayoutStatus) => {
    handleSaveComplete(layoutId, name, status);
    if (submitAfterSaveRef.current) {
      submitAfterSaveRef.current = false;
      submitLayoutMutation.mutate(layoutId, {
        onSuccess: (result) => handleSetStatus(result.status),
      });
    }
  }, [handleSaveComplete, submitLayoutMutation, handleSetStatus]);

  const handleWithdrawLayout = useCallback(async () => {
    if (!layoutMeta.id) return;
    try {
      const result = await withdrawLayoutMutation.mutateAsync(layoutMeta.id);
      handleSetStatus(result.status);
    } catch {
      // Error handled by mutation
    }
  }, [layoutMeta.id, withdrawLayoutMutation, handleSetStatus]);

  const handleCloneCurrentLayout = useCallback(async () => {
    if (!layoutMeta.id) return;
    try {
      const result = await cloneLayoutMutation.mutateAsync(layoutMeta.id);
      handleCloneComplete(result.id, result.name, result.status);
    } catch {
      // Error handled by mutation
    }
  }, [layoutMeta.id, cloneLayoutMutation, handleCloneComplete]);

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

  const handleRotateSelectedCw = useCallback(() => { rotateSelected('cw'); }, [rotateSelected]);
  const handleRotateSelectedCcw = useCallback(() => { rotateSelected('ccw'); }, [rotateSelected]);
  const handleDeleteSelected = useCallback(() => { deleteSelected(); }, [deleteSelected]);

  const handleClearAll = async () => {
    const message = refImagePlacements.length > 0
      ? `Remove all ${placedItems.length} placed items and ${refImagePlacements.length} reference images?`
      : `Remove all ${placedItems.length} placed items?`;
    if (await confirm({ title: 'Clear All', message, variant: 'danger', confirmLabel: 'Clear All', cancelLabel: 'Cancel' })) {
      clearAll();
      clearRefImages();
      setSelectedImageId(null);
      handleClearLayout();
    }
  };

  const handleLoadLayout = useCallback((config: LoadedLayoutConfig) => {
    if (unitSystem === 'imperial') {
      setWidth(parseFloat(mmToInches(config.widthMm).toFixed(4)));
      setDepth(parseFloat(mmToInches(config.depthMm).toFixed(4)));
    } else {
      setWidth(config.widthMm);
      setDepth(config.depthMm);
    }
    setSpacerConfig(config.spacerConfig);
    loadItems(config.placedItems);
    loadRefImagePlacements(config.refImagePlacements ?? []);
    setSelectedImageId(null);

    let owner = '';
    if (config.ownerUsername) {
      owner = config.ownerUsername;
      if (config.ownerEmail) {
        owner += `<${config.ownerEmail}>`;
      }
    }

    layoutDispatch({
      type: 'LOAD_LAYOUT',
      payload: {
        id: config.layoutId, name: config.layoutName,
        description: config.layoutDescription ?? '', status: config.layoutStatus, owner,
      },
    });
  }, [unitSystem, loadItems, loadRefImagePlacements, layoutDispatch]);

  const handleRemoveImage = (id: string) => {
    removeRefImagePlacement(id);
    if (selectedImageId === id) setSelectedImageId(null);
  };

  const handleRebindImage = useCallback((id: string) => {
    dialogDispatch({ type: 'OPEN_REBIND', targetId: id });
  }, [dialogDispatch]);

  const handleRebindSelect = useCallback((refImageId: number, imageUrl: string, name: string) => {
    if (dialogs.rebindTargetId) {
      rebindRefImage(dialogs.rebindTargetId, refImageId, imageUrl, name);
    }
    closeRebind();
  }, [dialogs.rebindTargetId, rebindRefImage, closeRebind]);

  const toggleImageViewMode = useCallback(() => {
    setImageViewMode(prev => {
      const next = prev === 'ortho' ? 'perspective' : 'ortho';
      localStorage.setItem('gridfinity-image-view-mode', next);
      return next;
    });
  }, []);

  // Keyboard shortcuts
  const keyDownHandlerRef = useRef<((event: KeyboardEvent) => void) | undefined>(undefined);

  useEffect(() => {
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
  });

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

  // Sidebar content
  const itemLibraryContent = (
    <ItemLibrary
      items={libraryItems}
      categories={categories}
      isLoading={isLibraryLoading || isLibrariesLoading}
      error={libraryError || librariesError}
      onRefreshLibrary={handleRefreshAll}
      availableLibraries={availableLibraries}
      selectedLibraryIds={selectedLibraryIds}
      onToggleLibrary={toggleLibrary}
      isLibrariesLoading={isLibrariesLoading}
    />
  );

  const imageTabContent = isAuthenticated ? (
    <RefImageLibrary />
  ) : (
    <div className="ref-image-auth-prompt">
      <p>Sign in to upload and manage reference images.</p>
    </div>
  );

  const selectionControls = (
    <>
      {selectedItemIds.size > 0 && (
        <ItemControls
          onRotateCw={handleRotateSelectedCw}
          onRotateCcw={handleRotateSelectedCcw}
          onDelete={handleDeleteSelected}
        />
      )}
      {selectedItemIds.size === 1 && (() => {
        const selectedId = selectedItemIds.values().next().value as string;
        const selectedItem = placedItems.find(i => i.instanceId === selectedId);
        if (!selectedItem) return null;
        return (
          <BinCustomizationPanel
            customization={selectedItem.customization}
            onChange={(c) => updateItemCustomization(selectedId, c)}
            onReset={() => updateItemCustomization(selectedId, undefined)}
          />
        );
      })()}
    </>
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title-group">
          <h1>Gridfinity Bin Customizer</h1>
          {layoutMeta.id && (
            <p className="layout-info-subtitle">
              {layoutMeta.owner && <span className="layout-owner">{layoutMeta.owner} — </span>}
              <span className="layout-name">{layoutMeta.name}</span>
              {layoutMeta.status && <span className={`layout-status-badge layout-status-${layoutMeta.status}`}>{layoutMeta.status}</span>}
            </p>
          )}
        </div>
        <div className="header-actions">
          <UserMenu />
          <button
            className="keyboard-help-button"
            onClick={() => dialogDispatch({ type: 'OPEN', dialog: 'keyboard' })}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
        </div>
      </header>

      <section className="grid-controls">
        <div className="unit-toggle-compact">
          <button className={unitSystem === 'metric' ? 'active' : ''} onClick={() => handleUnitChange('metric')}>mm</button>
          <button className={unitSystem === 'imperial' ? 'active' : ''} onClick={() => handleUnitChange('imperial')}>in</button>
        </div>

        {unitSystem === 'imperial' && (
          <div className="format-toggle-compact">
            <button className={imperialFormat === 'decimal' ? 'active' : ''} onClick={() => setImperialFormat('decimal')}>.00</button>
            <button className={imperialFormat === 'fractional' ? 'active' : ''} onClick={() => setImperialFormat('fractional')}>{'\u00BD'}</button>
          </div>
        )}

        <div className="dimension-inputs-row">
          <DimensionInput label="Width" value={width} onChange={setWidth} unit={unitSystem} imperialFormat={imperialFormat} />
          <span className="dimension-separator">x</span>
          <DimensionInput label="Depth" value={depth} onChange={setDepth} unit={unitSystem} imperialFormat={imperialFormat} />
        </div>

        <SpacerControls config={spacerConfig} onConfigChange={setSpacerConfig} />

        <GridSummary
          gridX={gridResult.gridX} gridY={gridResult.gridY}
          gapWidth={gridResult.gapWidth} gapDepth={gridResult.gapDepth}
          unit={unitSystem} imperialFormat={imperialFormat}
        />
      </section>

      <main className="app-main">
        <SidebarPanel
          sidebarTab={sidebarTab}
          onTabChange={setSidebarTab}
          itemLibraryContent={itemLibraryContent}
          imageTabContent={imageTabContent}
          selectionControls={selectionControls}
        />

        <section className="preview">
          <div className="preview-toolbar">
            <div className="reference-image-toolbar">
              {isAuthenticated && (
                <button className="layout-toolbar-btn layout-load-btn" onClick={() => dialogDispatch({ type: 'OPEN', dialog: 'load' })} type="button">Load</button>
              )}
              {isAuthenticated && (
                <button
                  className="layout-toolbar-btn layout-save-btn"
                  onClick={() => dialogDispatch({ type: 'OPEN', dialog: 'save' })}
                  type="button"
                  disabled={placedItems.length === 0 && refImagePlacements.length === 0}
                >
                  Save
                </button>
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
              {isAuthenticated && isReadOnly && (
                <button className="layout-toolbar-btn layout-clone-btn" onClick={handleCloneCurrentLayout} type="button" disabled={cloneLayoutMutation.isPending}>
                  {cloneLayoutMutation.isPending ? 'Cloning...' : 'Clone'}
                </button>
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

        <section className="bom-sidebar">
          <BillOfMaterials items={bomItems} />
        </section>
      </main>

      <KeyboardShortcutsHelp isOpen={dialogs.keyboard} onClose={() => dialogDispatch({ type: 'CLOSE', dialog: 'keyboard' })} />

      <SaveLayoutDialog
        isOpen={dialogs.save}
        onClose={() => dialogDispatch({ type: 'CLOSE', dialog: 'save' })}
        gridX={gridResult.gridX} gridY={gridResult.gridY}
        widthMm={drawerWidth} depthMm={drawerDepth}
        spacerConfig={spacerConfig} placedItems={placedItems}
        refImagePlacements={refImagePlacements}
        currentLayoutId={layoutMeta.id} currentLayoutName={layoutMeta.name}
        currentLayoutDescription={layoutMeta.description} currentLayoutStatus={layoutMeta.status}
        onSaveComplete={handleSaveCompleteWithSubmit}
      />

      <LoadLayoutDialog
        isOpen={dialogs.load}
        onClose={() => dialogDispatch({ type: 'CLOSE', dialog: 'load' })}
        onLoad={handleLoadLayout}
        hasItems={placedItems.length > 0 || refImagePlacements.length > 0}
      />

      <RebindImageDialog
        isOpen={dialogs.rebind}
        onClose={() => dialogDispatch({ type: 'CLOSE_REBIND' })}
        onSelect={handleRebindSelect}
      />

      <AdminSubmissionsDialog
        isOpen={dialogs.admin}
        onClose={() => dialogDispatch({ type: 'CLOSE', dialog: 'admin' })}
        onLoad={handleLoadLayout}
        hasItems={placedItems.length > 0 || refImagePlacements.length > 0}
      />

      {isReadOnly && (
        <div className="read-only-banner">
          This layout has been delivered and is read-only. Clone to make changes.
        </div>
      )}

      <ConfirmDialog {...confirmDialogProps} />

      <WalkthroughOverlay
        isActive={isActive}
        currentStep={currentStep}
        steps={WALKTHROUGH_STEPS}
        onNext={nextStep}
        onDismiss={dismissTour}
      />
    </div>
  );
}

export default App;
