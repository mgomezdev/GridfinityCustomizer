import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { UnitSystem, ImperialFormat, GridSpacerConfig } from './types/gridfinity';
import { calculateGrid, mmToInches, inchesToMm } from './utils/conversions';
import { useGridItems } from './hooks/useGridItems';
import { useSpacerCalculation } from './hooks/useSpacerCalculation';
import { useBillOfMaterials } from './hooks/useBillOfMaterials';
import { useLibraries } from './hooks/useLibraries';
import { useLibraryData } from './hooks/useLibraryData';
import { useCategoryData } from './hooks/useCategoryData';
import { useReferenceImages } from './hooks/useReferenceImages';
import { useGridTransform } from './hooks/useGridTransform';
import { useSubmitBOM } from './hooks/useSubmitBOM';
import { migrateStoredItems, migrateLibrarySelection } from './utils/migration';
import { DimensionInput } from './components/DimensionInput';
import { GridPreview } from './components/GridPreview';
import { GridSummary } from './components/GridSummary';
import { ItemLibrary } from './components/ItemLibrary';
import { ItemControls } from './components/ItemControls';
import { SpacerControls } from './components/SpacerControls';
import { BillOfMaterials } from './components/BillOfMaterials';
import { ReferenceImageUploader } from './components/ReferenceImageUploader';
import { ZoomControls } from './components/ZoomControls';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import './App.css';

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

  // Run migrations on mount
  useEffect(() => {
    migrateStoredItems();
    migrateLibrarySelection();
  }, []);

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

  // Reference images
  const {
    images,
    addImage,
    removeImage,
    updateImagePosition,
    updateImageScale,
    updateImageOpacity,
    updateImageRotation,
    toggleImageLock,
  } = useReferenceImages();

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
    selectItem,
    selectAll,
    deselectAll,
    handleDrop,
    duplicateItem,
    copyItems,
    pasteItems,
    deleteSelected,
    rotateSelected,
  } = useGridItems(gridResult.gridX, gridResult.gridY, getItemById);

  const bomItems = useBillOfMaterials(placedItems, libraryItems);

  const gridSummaryData = {
    gridX: gridResult.gridX,
    gridY: gridResult.gridY,
    width,
    depth,
    unit: unitSystem,
    imperialFormat,
    gapWidth: gridResult.gapWidth,
    gapDepth: gridResult.gapDepth,
    spacerConfig,
  };

  const libraryNames = useMemo(
    () => new Map(availableLibraries.map(lib => [lib.id, lib.name])),
    [availableLibraries]
  );

  const { submitBOM, isSubmitting, error: submitError } = useSubmitBOM(
    gridSummaryData,
    placedItems,
    bomItems,
    getItemById,
    libraryNames,
  );

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
    if (window.confirm(`Remove all ${placedItems.length} placed items?`)) {
      clearAll();
    }
  };

  const handleRemoveImage = (id: string) => {
    removeImage(id);
    // Clear selection if we're removing the selected image
    if (selectedImageId === id) {
      setSelectedImageId(null);
    }
  };

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
          removeImage(selectedImageId);
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
          updateImageRotation(selectedImageId, event.shiftKey ? 'ccw' : 'cw');
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
        toggleImageLock(selectedImageId);
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
        <h1>Gridfinity Bin Customizer</h1>
        <p className="subtitle">Design your modular storage layout</p>
        <button
          className="keyboard-help-button"
          onClick={() => setShowKeyboardHelp(true)}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          ?
        </button>
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

          {selectedItemIds.size > 0 && (
            <ItemControls
              onRotateCw={handleRotateSelectedCw}
              onRotateCcw={handleRotateSelectedCcw}
              onDelete={handleDeleteSelected}
            />
          )}
        </section>

        <section className="preview">
          <div className="preview-toolbar">
            <div className="reference-image-toolbar">
              <ReferenceImageUploader onUpload={addImage} />
              {placedItems.length > 0 && (
                <button className="clear-all-button" onClick={handleClearAll}>
                  Clear All ({placedItems.length})
                </button>
              )}
            </div>
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
                onDrop={handleDrop}
                onSelectItem={(id, mods) => { selectItem(id, mods); if (id) setSelectedImageId(null); }}
                getItemById={getItemById}
                onDeleteItem={deleteItem}
                onRotateItemCw={(id) => rotateItem(id, 'cw')}
                onRotateItemCcw={(id) => rotateItem(id, 'ccw')}
                referenceImages={images}
                selectedImageId={selectedImageId}
                onImagePositionChange={updateImagePosition}
                onImageSelect={(id) => { setSelectedImageId(id); deselectAll(); }}
                onImageScaleChange={updateImageScale}
                onImageOpacityChange={updateImageOpacity}
                onImageRemove={handleRemoveImage}
                onImageToggleLock={toggleImageLock}
                onImageRotateCw={(id) => updateImageRotation(id, 'cw')}
                onImageRotateCcw={(id) => updateImageRotation(id, 'ccw')}
              />
            </div>
          </div>
        </section>

        <section className="bom-sidebar">
          <BillOfMaterials
            items={bomItems}
            onSubmitBOM={submitBOM}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        </section>
      </main>

      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </div>
  );
}

export default App;
