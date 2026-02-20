import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { UnitSystem, ImperialFormat, GridSpacerConfig, ImageViewMode, ReferenceImage, DragData } from './types/gridfinity';
import type { LayoutStatus } from '@gridfinity/shared';
import { calculateGrid, mmToInches, inchesToMm } from './utils/conversions';
import { useGridItems } from './hooks/useGridItems';
import { useSpacerCalculation } from './hooks/useSpacerCalculation';
import { useBillOfMaterials } from './hooks/useBillOfMaterials';
import { useLibraries } from './hooks/useLibraries';
import { useLibraryData } from './hooks/useLibraryData';
import { useCategoryData } from './hooks/useCategoryData';
import { useRefImagePlacements } from './hooks/useRefImagePlacements';
import { useGridTransform } from './hooks/useGridTransform';
import { useAuth } from './contexts/AuthContext';
import { useSubmitLayoutMutation, useWithdrawLayoutMutation, useCloneLayoutMutation, useSubmittedCountQuery } from './hooks/useLayouts';
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
import { UserMenu } from './components/auth/UserMenu';
import { SaveLayoutDialog } from './components/layouts/SaveLayoutDialog';
import { LoadLayoutDialog } from './components/layouts/LoadLayoutDialog';
import type { LoadedLayoutConfig } from './components/layouts/LoadLayoutDialog';
import { AdminSubmissionsDialog } from './components/admin/AdminSubmissionsDialog';
import { SubmissionsBadge } from './components/admin/SubmissionsBadge';
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
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showRebindDialog, setShowRebindDialog] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [rebindTargetId, setRebindTargetId] = useState<string | null>(null);
  const [currentLayoutId, setCurrentLayoutId] = useState<number | null>(null);
  const [currentLayoutName, setCurrentLayoutName] = useState('');
  const [currentLayoutDescription, setCurrentLayoutDescription] = useState('');
  const [currentLayoutStatus, setCurrentLayoutStatus] = useState<LayoutStatus | null>(null);
  const [currentLayoutOwner, setCurrentLayoutOwner] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'items' | 'images'>('items');
  const [imageViewMode, setImageViewMode] = useState<ImageViewMode>(
    () => (localStorage.getItem('gridfinity-image-view-mode') as ImageViewMode) || 'ortho'
  );

  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isReadOnly = currentLayoutStatus === 'delivered';

  const submitLayoutMutation = useSubmitLayoutMutation();
  const withdrawLayoutMutation = useWithdrawLayoutMutation();
  const cloneLayoutMutation = useCloneLayoutMutation();
  const submittedCountQuery = useSubmittedCountQuery();

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
  const {
    categories,
  } = useCategoryData(libraryItems);

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
    // Refresh library manifest and all selected libraries
    // Categories will be auto-derived from refreshed items
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
    placedItems,
    selectedItemIds,
    rotateItem,
    deleteItem,
    clearAll,
    loadItems,
    selectItem,
    selectAll,
    deselectAll,
    handleDrop,
    duplicateItem,
    copyItems,
    pasteItems,
    deleteSelected,
    rotateSelected,
    updateItemCustomization,
  } = useGridItems(gridResult.gridX, gridResult.gridY, getItemById);

  const bomItems = useBillOfMaterials(placedItems, libraryItems);

  // Convert ref image placements to ReferenceImage format for GridPreview
  const referenceImagesForGrid: ReferenceImage[] = useMemo(() =>
    refImagePlacements.map(p => ({
      id: p.id,
      name: p.name,
      dataUrl: '',
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      opacity: p.opacity,
      scale: p.scale,
      isLocked: p.isLocked,
      rotation: p.rotation,
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
      // Convert grid cell coordinates to percentage of grid
      const xPercent = (x / gridResult.gridX) * 100;
      const yPercent = (y / gridResult.gridY) * 100;
      addRefImagePlacement({
        refImageId: dragData.refImageId,
        name: dragData.refImageName ?? 'Reference Image',
        imageUrl: dragData.refImageUrl ?? '',
        x: xPercent,
        y: yPercent,
        width: 25,
        height: 25,
        opacity: 0.5,
        scale: 1,
        isLocked: false,
        rotation: 0,
      });
    } else {
      handleDrop(dragData, x, y);
    }
  }, [isReadOnly, gridResult.gridX, gridResult.gridY, addRefImagePlacement, handleDrop]);

  const handleSaveComplete = useCallback((layoutId: number, name: string, status: LayoutStatus) => {
    setCurrentLayoutId(layoutId);
    setCurrentLayoutName(name);
    setCurrentLayoutStatus(status);
  }, []);

  const handleSubmitLayout = useCallback(async () => {
    if (!currentLayoutId) return;
    try {
      const result = await submitLayoutMutation.mutateAsync(currentLayoutId);
      setCurrentLayoutStatus(result.status);
    } catch {
      // Error handled by mutation
    }
  }, [currentLayoutId, submitLayoutMutation]);

  const handleWithdrawLayout = useCallback(async () => {
    if (!currentLayoutId) return;
    try {
      const result = await withdrawLayoutMutation.mutateAsync(currentLayoutId);
      setCurrentLayoutStatus(result.status);
    } catch {
      // Error handled by mutation
    }
  }, [currentLayoutId, withdrawLayoutMutation]);

  const handleCloneCurrentLayout = useCallback(async () => {
    if (!currentLayoutId) return;
    try {
      const result = await cloneLayoutMutation.mutateAsync(currentLayoutId);
      setCurrentLayoutId(result.id);
      setCurrentLayoutName(result.name);
      setCurrentLayoutStatus(result.status);
    } catch {
      // Error handled by mutation
    }
  }, [currentLayoutId, cloneLayoutMutation]);

  // Zoom and pan
  const {
    transform,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    handleWheel,
    setZoomLevel,
    pan,
  } = useGridTransform();

  const viewportRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const isSpaceHeldRef = useRef(false);

  // Wheel zoom handler
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      const rect = viewport.getBoundingClientRect();
      handleWheel(e, rect);
    };

    // passive: false is required — handler calls preventDefault() to capture wheel zoom
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [handleWheel]);

  // Middle-mouse and space+drag pan
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onMouseDown = (e: MouseEvent) => {
      // Middle mouse button (button === 1) or space held
      if (e.button === 1 || isSpaceHeldRef.current) {
        e.preventDefault();
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        viewport.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = (e.clientX - panStartRef.current.x) / transform.zoom;
      const dy = (e.clientY - panStartRef.current.y) / transform.zoom;
      pan(dx, dy);
      panStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        viewport.style.cursor = isSpaceHeldRef.current ? 'grab' : '';
      }
    };

    viewport.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      viewport.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [pan, transform.zoom]);

  // Pinch-to-zoom touch support
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let lastPinchDist = 0;
    let lastPinchZoom = 1;

    const getDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastPinchDist = getDistance(e.touches[0], e.touches[1]);
        lastPinchZoom = transform.zoom;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const scale = dist / lastPinchDist;
        setZoomLevel(lastPinchZoom * scale);
      }
    };

    // passive: false is required — handlers call preventDefault() to capture pinch-to-zoom
    viewport.addEventListener('touchstart', onTouchStart, { passive: false });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchmove', onTouchMove);
    };
  }, [transform.zoom, setZoomLevel]);

  const handleFitToScreen = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const content = viewport.querySelector('.grid-preview') as HTMLElement | null;
    if (!content) return;
    const viewportRect = viewport.getBoundingClientRect();
    fitToScreen(viewportRect.width, viewportRect.height, content.offsetWidth, content.offsetHeight);
  }, [fitToScreen]);

  const handleRotateSelectedCw = useCallback(() => {
    rotateSelected('cw');
  }, [rotateSelected]);

  const handleRotateSelectedCcw = useCallback(() => {
    rotateSelected('ccw');
  }, [rotateSelected]);

  const handleDeleteSelected = useCallback(() => {
    deleteSelected();
  }, [deleteSelected]);

  const handleClearAll = () => {
    const message = refImagePlacements.length > 0
      ? `Remove all ${placedItems.length} placed items and ${refImagePlacements.length} reference images?`
      : `Remove all ${placedItems.length} placed items?`;
    if (window.confirm(message)) {
      clearAll();
      clearRefImages();
      setSelectedImageId(null);
      setCurrentLayoutId(null);
      setCurrentLayoutName('');
      setCurrentLayoutDescription('');
      setCurrentLayoutStatus(null);
      setCurrentLayoutOwner('');
    }
  };

  const handleLoadLayout = useCallback((config: LoadedLayoutConfig) => {
    // Set dimensions (always in mm)
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
    setCurrentLayoutId(config.layoutId);
    setCurrentLayoutName(config.layoutName);
    setCurrentLayoutDescription(config.layoutDescription ?? '');
    setCurrentLayoutStatus(config.layoutStatus);

    // Build owner string for admin views
    if (config.ownerUsername) {
      let owner = config.ownerUsername;
      if (config.ownerEmail) {
        owner += `<${config.ownerEmail}>`;
      }
      setCurrentLayoutOwner(owner);
    } else {
      setCurrentLayoutOwner('');
    }
  }, [unitSystem, loadItems, loadRefImagePlacements]);

  const handleRemoveImage = (id: string) => {
    removeRefImagePlacement(id);
    if (selectedImageId === id) {
      setSelectedImageId(null);
    }
  };

  const handleRebindImage = useCallback((id: string) => {
    setRebindTargetId(id);
    setShowRebindDialog(true);
  }, []);

  const handleRebindSelect = useCallback((refImageId: number, imageUrl: string, name: string) => {
    if (rebindTargetId) {
      rebindRefImage(rebindTargetId, refImageId, imageUrl, name);
    }
    setShowRebindDialog(false);
    setRebindTargetId(null);
  }, [rebindTargetId, rebindRefImage]);

  const toggleImageViewMode = useCallback(() => {
    setImageViewMode(prev => {
      const next = prev === 'ortho' ? 'perspective' : 'ortho';
      localStorage.setItem('gridfinity-image-view-mode', next);
      return next;
    });
  }, []);

  // Keyboard shortcuts — use ref to avoid re-registering listener on every state change
  const keyDownHandlerRef = useRef<((event: KeyboardEvent) => void) | undefined>(undefined);

  useEffect(() => {
    keyDownHandlerRef.current = (event: KeyboardEvent) => {
      // Don't fire shortcuts when user is typing in an input element
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' ||
                       activeElement?.tagName === 'TEXTAREA' ||
                       activeElement?.tagName === 'SELECT';

      if (isTyping) {
        return;
      }

      // Delete or Backspace: Remove selected image or selected items
      if ((event.key === 'Delete' || event.key === 'Backspace')) {
        if (selectedImageId) {
          event.preventDefault();
          removeRefImagePlacement(selectedImageId);
          setSelectedImageId(null);
          return;
        }
        if (selectedItemIds.size > 0) {
          event.preventDefault();
          deleteSelected();
          return;
        }
      }

      // R: Rotate selected item(s) CW, Shift+R: CCW
      if (event.key === 'r' || event.key === 'R') {
        if (selectedImageId) {
          event.preventDefault();
          updateRefImageRotation(selectedImageId, event.shiftKey ? 'ccw' : 'cw');
          return;
        }
        if (selectedItemIds.size > 0) {
          event.preventDefault();
          if (event.shiftKey) {
            rotateSelected('ccw');
          } else {
            rotateSelected('cw');
          }
          return;
        }
      }

      // Ctrl+D: Duplicate selected item
      if ((event.key === 'd' || event.key === 'D') && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        duplicateItem();
        return;
      }

      // Ctrl+C: Copy selected item
      if ((event.key === 'c' || event.key === 'C') && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        copyItems();
        return;
      }

      // Ctrl+V: Paste from clipboard
      if ((event.key === 'v' || event.key === 'V') && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        pasteItems();
        return;
      }

      // V (no modifier): Toggle image view mode
      if ((event.key === 'v' || event.key === 'V') && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        toggleImageViewMode();
        return;
      }

      // Escape: Clear both selections
      if (event.key === 'Escape') {
        deselectAll();
        setSelectedImageId(null);
        return;
      }

      // Ctrl+A: Select all items
      if ((event.key === 'a' || event.key === 'A') && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        selectAll();
        return;
      }

      // L: Toggle lock on selected image
      if ((event.key === 'l' || event.key === 'L') && selectedImageId) {
        event.preventDefault();
        toggleRefImageLock(selectedImageId);
        return;
      }

      // +/=: Zoom in, -: Zoom out, 0: Reset zoom
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomIn();
        return;
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        zoomOut();
        return;
      }
      if (event.key === '0' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        resetZoom();
        return;
      }

      // ?: Show keyboard shortcuts help
      if (event.key === '?') {
        event.preventDefault();
        setShowKeyboardHelp(prev => !prev);
        return;
      }

      // Space: Track for pan mode
      if (event.key === ' ') {
        event.preventDefault();
        isSpaceHeldRef.current = true;
        if (viewportRef.current) {
          viewportRef.current.style.cursor = 'grab';
        }
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
        if (viewportRef.current) {
          viewportRef.current.style.cursor = '';
        }
      }
    };
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handler);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title-group">
          <h1>Gridfinity Bin Customizer</h1>
          {currentLayoutId && (
            <p className="layout-info-subtitle">
              {currentLayoutOwner && <span className="layout-owner">{currentLayoutOwner} — </span>}
              <span className="layout-name">{currentLayoutName}</span>
              {currentLayoutStatus && <span className={`layout-status-badge layout-status-${currentLayoutStatus}`}>{currentLayoutStatus}</span>}
            </p>
          )}
        </div>
        <div className="header-actions">
          <UserMenu />
          <button
            className="keyboard-help-button"
            onClick={() => setShowKeyboardHelp(true)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
        </div>
      </header>

      <section className="grid-controls">
        <div className="unit-toggle-compact">
          <button
            className={unitSystem === 'metric' ? 'active' : ''}
            onClick={() => handleUnitChange('metric')}
          >
            mm
          </button>
          <button
            className={unitSystem === 'imperial' ? 'active' : ''}
            onClick={() => handleUnitChange('imperial')}
          >
            in
          </button>
        </div>

        {unitSystem === 'imperial' && (
          <div className="format-toggle-compact">
            <button
              className={imperialFormat === 'decimal' ? 'active' : ''}
              onClick={() => setImperialFormat('decimal')}
            >
              .00
            </button>
            <button
              className={imperialFormat === 'fractional' ? 'active' : ''}
              onClick={() => setImperialFormat('fractional')}
            >
              ½
            </button>
          </div>
        )}

        <div className="dimension-inputs-row">
          <DimensionInput
            label="Width"
            value={width}
            onChange={setWidth}
            unit={unitSystem}
            imperialFormat={imperialFormat}
          />
          <span className="dimension-separator">x</span>
          <DimensionInput
            label="Depth"
            value={depth}
            onChange={setDepth}
            unit={unitSystem}
            imperialFormat={imperialFormat}
          />
        </div>

        <SpacerControls
          config={spacerConfig}
          onConfigChange={setSpacerConfig}
        />

        <GridSummary
          gridX={gridResult.gridX}
          gridY={gridResult.gridY}
          gapWidth={gridResult.gapWidth}
          gapDepth={gridResult.gapDepth}
          unit={unitSystem}
          imperialFormat={imperialFormat}
        />

      </section>

      <main className="app-main">
        <section className="sidebar">
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab${sidebarTab === 'items' ? ' active' : ''}`}
              onClick={() => setSidebarTab('items')}
              type="button"
            >
              Items
            </button>
            <button
              className={`sidebar-tab${sidebarTab === 'images' ? ' active' : ''}`}
              onClick={() => setSidebarTab('images')}
              type="button"
            >
              Images
            </button>
          </div>

          {sidebarTab === 'items' ? (
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
          ) : (
            isAuthenticated ? (
              <RefImageLibrary />
            ) : (
              <div className="ref-image-auth-prompt">
                <p>Sign in to upload and manage reference images.</p>
              </div>
            )
          )}

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
        </section>

        <section className="preview">
          <div className="preview-toolbar">
            <div className="reference-image-toolbar">
              {isAuthenticated && (
                <button
                  className="layout-toolbar-btn layout-load-btn"
                  onClick={() => setShowLoadDialog(true)}
                  type="button"
                >
                  Load
                </button>
              )}
              {isAuthenticated && (placedItems.length > 0 || refImagePlacements.length > 0) && (
                <button
                  className="layout-toolbar-btn layout-save-btn"
                  onClick={() => setShowSaveDialog(true)}
                  type="button"
                >
                  {currentLayoutId && !isReadOnly ? 'Save' : 'Save'}
                </button>
              )}
              {isAuthenticated && currentLayoutId && currentLayoutStatus === 'draft' && (
                <button
                  className="layout-toolbar-btn layout-submit-btn"
                  onClick={handleSubmitLayout}
                  type="button"
                  disabled={submitLayoutMutation.isPending}
                >
                  {submitLayoutMutation.isPending ? 'Submitting...' : 'Submit'}
                </button>
              )}
              {isAuthenticated && currentLayoutId && currentLayoutStatus === 'submitted' && (
                <button
                  className="layout-toolbar-btn layout-withdraw-btn"
                  onClick={handleWithdrawLayout}
                  type="button"
                  disabled={withdrawLayoutMutation.isPending}
                >
                  {withdrawLayoutMutation.isPending ? 'Withdrawing...' : 'Withdraw'}
                </button>
              )}
              {isAuthenticated && isReadOnly && (
                <button
                  className="layout-toolbar-btn layout-clone-btn"
                  onClick={handleCloneCurrentLayout}
                  type="button"
                  disabled={cloneLayoutMutation.isPending}
                >
                  {cloneLayoutMutation.isPending ? 'Cloning...' : 'Clone'}
                </button>
              )}
              {!isReadOnly && (placedItems.length > 0 || refImagePlacements.length > 0) && (
                <button className="clear-all-button" onClick={handleClearAll}>
                  Clear All ({placedItems.length + refImagePlacements.length})
                </button>
              )}
              {isAdmin && (
                <SubmissionsBadge
                  count={submittedCountQuery.data?.submitted ?? 0}
                  onClick={() => setShowAdminDialog(true)}
                />
              )}
            </div>
            <ImageViewToggle mode={imageViewMode} onToggle={toggleImageViewMode} />
            <ZoomControls
              zoom={transform.zoom}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onResetZoom={resetZoom}
              onFitToScreen={handleFitToScreen}
            />
          </div>
          <div
            ref={viewportRef}
            className={`preview-viewport${transform.zoom !== 1 || transform.panX !== 0 || transform.panY !== 0 ? ' zoomed' : ''}`}
            data-testid="preview-viewport"
          >
            <div
              className={`preview-content${transform.zoom !== 1 || transform.panX !== 0 || transform.panY !== 0 ? ' transformed' : ''}`}
              style={transform.zoom !== 1 || transform.panX !== 0 || transform.panY !== 0 ? {
                transform: `scale(${transform.zoom}) translate(${transform.panX}px, ${transform.panY}px)`,
                transformOrigin: '0 0',
              } : undefined}
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
            </div>
          </div>
        </section>

        <section className="bom-sidebar">
          <BillOfMaterials
            items={bomItems}
          />
        </section>
      </main>

      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      <SaveLayoutDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        gridX={gridResult.gridX}
        gridY={gridResult.gridY}
        widthMm={drawerWidth}
        depthMm={drawerDepth}
        spacerConfig={spacerConfig}
        placedItems={placedItems}
        refImagePlacements={refImagePlacements}
        currentLayoutId={currentLayoutId}
        currentLayoutName={currentLayoutName}
        currentLayoutDescription={currentLayoutDescription}
        currentLayoutStatus={currentLayoutStatus}
        onSaveComplete={handleSaveComplete}
      />

      <LoadLayoutDialog
        isOpen={showLoadDialog}
        onClose={() => setShowLoadDialog(false)}
        onLoad={handleLoadLayout}
        hasItems={placedItems.length > 0 || refImagePlacements.length > 0}
      />

      <RebindImageDialog
        isOpen={showRebindDialog}
        onClose={() => { setShowRebindDialog(false); setRebindTargetId(null); }}
        onSelect={handleRebindSelect}
      />

      <AdminSubmissionsDialog
        isOpen={showAdminDialog}
        onClose={() => setShowAdminDialog(false)}
        onLoad={handleLoadLayout}
        hasItems={placedItems.length > 0 || refImagePlacements.length > 0}
      />

      {isReadOnly && (
        <div className="read-only-banner">
          This layout has been delivered and is read-only. Clone to make changes.
        </div>
      )}
    </div>
  );
}

export default App;
