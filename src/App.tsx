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
import { migrateStoredItems, migrateLibrarySelection } from './utils/migration';
import { DimensionInput } from './components/DimensionInput';
import { GridPreview } from './components/GridPreview';
import { GridSummary } from './components/GridSummary';
import { ItemLibrary } from './components/ItemLibrary';
import { ItemControls } from './components/ItemControls';
import { SpacerControls } from './components/SpacerControls';
import { BillOfMaterials } from './components/BillOfMaterials';
import { ReferenceImageUploader } from './components/ReferenceImageUploader';
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

  // Memoize library metadata to prevent infinite re-renders
  const manifestLibraries = useMemo(
    () => availableLibraries.map(lib => ({ id: lib.id, path: lib.path })),
    [availableLibraries]
  );

  // Library data loading (multi-library)
  const {
    items: libraryItems,
    isLoading: isLibraryLoading,
    error: libraryError,
    getItemById,
    refreshLibrary,
  } = useLibraryData(selectedLibraryIds, manifestLibraries);

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

  const gridResult = calculateGrid(width, depth, unitSystem);

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
    selectedItemId,
    rotateItem,
    deleteItem,
    clearAll,
    selectItem,
    handleDrop,
  } = useGridItems(gridResult.gridX, gridResult.gridY, getItemById);

  const bomItems = useBillOfMaterials(placedItems, libraryItems);

  const handleRotateSelectedCw = useCallback(() => {
    if (selectedItemId) {
      rotateItem(selectedItemId, 'cw');
    }
  }, [selectedItemId, rotateItem]);

  const handleRotateSelectedCcw = useCallback(() => {
    if (selectedItemId) {
      rotateItem(selectedItemId, 'ccw');
    }
  }, [selectedItemId, rotateItem]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedItemId) {
      deleteItem(selectedItemId);
    }
  }, [selectedItemId, deleteItem]);

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

      // Delete or Backspace: Remove selected image or selected item
      if ((event.key === 'Delete' || event.key === 'Backspace')) {
        if (selectedImageId) {
          event.preventDefault();
          removeImage(selectedImageId);
          setSelectedImageId(null);
          return;
        }
        if (selectedItemId) {
          event.preventDefault();
          handleDeleteSelected();
          return;
        }
      }

      // R: Rotate selected item CW, Shift+R: CCW
      if (event.key === 'r' || event.key === 'R') {
        if (selectedImageId) {
          event.preventDefault();
          updateImageRotation(selectedImageId, event.shiftKey ? 'ccw' : 'cw');
          return;
        }
        if (selectedItemId) {
          event.preventDefault();
          if (event.shiftKey) {
            handleRotateSelectedCcw();
          } else {
            handleRotateSelectedCw();
          }
          return;
        }
      }

      // Escape: Clear both selections
      if (event.key === 'Escape') {
        selectItem(null);
        setSelectedImageId(null);
        return;
      }

      // L: Toggle lock on selected image
      if ((event.key === 'l' || event.key === 'L') && selectedImageId) {
        event.preventDefault();
        toggleImageLock(selectedImageId);
        return;
      }
    };
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyDownHandlerRef.current?.(e);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Gridfinity Bin Customizer</h1>
        <p className="subtitle">Design your modular storage layout</p>
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
            label="W"
            value={width}
            onChange={setWidth}
            unit={unitSystem}
            imperialFormat={imperialFormat}
          />
          <span className="dimension-separator">x</span>
          <DimensionInput
            label="D"
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

          {selectedItemId && (
            <ItemControls
              onRotateCw={handleRotateSelectedCw}
              onRotateCcw={handleRotateSelectedCcw}
              onDelete={handleDeleteSelected}
            />
          )}
        </section>

        <section className="preview">
          <div className="reference-image-toolbar">
            <ReferenceImageUploader onUpload={addImage} />
            {placedItems.length > 0 && (
              <button className="clear-all-button" onClick={handleClearAll}>
                Clear All ({placedItems.length})
              </button>
            )}
          </div>
          <GridPreview
            gridX={gridResult.gridX}
            gridY={gridResult.gridY}
            placedItems={placedItems}
            selectedItemId={selectedItemId}
            spacers={spacers}
            onDrop={handleDrop}
            onSelectItem={(id) => { selectItem(id); if (id) setSelectedImageId(null); }}
            getItemById={getItemById}
            onDeleteItem={deleteItem}
            onRotateItemCw={(id) => rotateItem(id, 'cw')}
            onRotateItemCcw={(id) => rotateItem(id, 'ccw')}
            referenceImages={images}
            selectedImageId={selectedImageId}
            onImagePositionChange={updateImagePosition}
            onImageSelect={(id) => { setSelectedImageId(id); selectItem(null); }}
            onImageScaleChange={updateImageScale}
            onImageOpacityChange={updateImageOpacity}
            onImageRemove={handleRemoveImage}
            onImageToggleLock={toggleImageLock}
            onImageRotateCw={(id) => updateImageRotation(id, 'cw')}
            onImageRotateCcw={(id) => updateImageRotation(id, 'ccw')}
          />
        </section>

        <section className="bom-sidebar">
          <BillOfMaterials items={bomItems} />
        </section>
      </main>
    </div>
  );
}

export default App;
