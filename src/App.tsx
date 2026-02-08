import { useState, useEffect, useCallback, useRef } from 'react';
import type { UnitSystem, ImperialFormat, GridSpacerConfig } from './types/gridfinity';
import { calculateGrid, mmToInches, inchesToMm } from './utils/conversions';
import { useGridItems } from './hooks/useGridItems';
import { useSpacerCalculation } from './hooks/useSpacerCalculation';
import { useBillOfMaterials } from './hooks/useBillOfMaterials';
import { useLibraryData } from './hooks/useLibraryData';
import { useCategoryData } from './hooks/useCategoryData';
import { useReferenceImages } from './hooks/useReferenceImages';
import { DimensionInput } from './components/DimensionInput';
import { GridPreview } from './components/GridPreview';
import { GridSummary } from './components/GridSummary';
import { ItemLibrary } from './components/ItemLibrary';
import { ItemControls } from './components/ItemControls';
import { SpacerControls } from './components/SpacerControls';
import { BillOfMaterials } from './components/BillOfMaterials';
import { ReferenceImageUploader } from './components/ReferenceImageUploader';
import { InteractionModeToggle } from './components/InteractionModeToggle';
import { ReferenceImageControls } from './components/ReferenceImageControls';
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

  const {
    categories,
    isLoading: isCategoriesLoading,
    error: categoriesError,
    getCategoryById,
    addCategory,
    updateCategory,
    deleteCategory,
    resetToDefaults: resetCategories,
  } = useCategoryData();

  const {
    images,
    interactionMode,
    addImage,
    removeImage,
    updateImagePosition,
    updateImageScale,
    updateImageOpacity,
    toggleImageLock,
    setInteractionMode,
  } = useReferenceImages();

  const {
    items: libraryItems,
    isLoading: isLibraryLoading,
    error: libraryError,
    getItemById,
    addItem,
    updateItem,
    deleteItem: deleteLibraryItem,
    resetToDefaults,
    updateItemCategories,
    batchUpdateItems,
  } = useLibraryData();

  const handleDeleteCategory = (categoryId: string) => {
    // Batch-remove the category from all items in a single state update
    const updates = libraryItems
      .filter(item => item.categories.includes(categoryId))
      .map(item => ({
        id: item.id,
        updates: { categories: item.categories.filter(id => id !== categoryId) },
      }))
      .filter(u => u.updates.categories.length > 0);

    if (updates.length > 0) {
      batchUpdateItems(updates);
    }

    deleteCategory(categoryId);
  };

  const handleExportLibrary = () => {
    const libraryData = {
      version: '1.0.0',
      items: libraryItems,
    };

    const jsonString = JSON.stringify(libraryData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gridfinity-library-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const handleRotateSelected = useCallback(() => {
    if (selectedItemId) {
      rotateItem(selectedItemId);
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

  const handleInteractionModeChange = (mode: 'items' | 'images') => {
    setInteractionMode(mode);
    // Clear selected image when switching to 'items' mode
    if (mode === 'items') {
      setSelectedImageId(null);
    }
  };

  const handleRemoveImage = (id: string) => {
    removeImage(id);
    // Clear selection if we're removing the selected image
    if (selectedImageId === id) {
      setSelectedImageId(null);
    }
  };

  // Find the selected image (or null if it doesn't exist)
  const selectedImage = selectedImageId ? images.find(img => img.id === selectedImageId) ?? null : null;

  // Keyboard shortcuts — use ref to avoid re-registering listener on every state change
  const keyDownHandlerRef = useRef<(event: KeyboardEvent) => void>();

  keyDownHandlerRef.current = (event: KeyboardEvent) => {
    // Don't fire shortcuts when user is typing in an input element
    const activeElement = document.activeElement;
    const isTyping = activeElement?.tagName === 'INPUT' ||
                     activeElement?.tagName === 'TEXTAREA' ||
                     activeElement?.tagName === 'SELECT';

    if (isTyping) {
      return;
    }

    // Tab or M: Toggle interaction mode (only when images exist)
    if ((event.key === 'Tab' || event.key === 'm' || event.key === 'M') && images.length > 0) {
      event.preventDefault();
      setInteractionMode(interactionMode === 'items' ? 'images' : 'items');
      if (interactionMode === 'images') {
        setSelectedImageId(null);
      }
      return;
    }

    // Delete or Backspace: Remove selected image (images mode) or selected item (items mode)
    if ((event.key === 'Delete' || event.key === 'Backspace')) {
      if (interactionMode === 'images' && selectedImageId) {
        event.preventDefault();
        removeImage(selectedImageId);
        setSelectedImageId(null);
        return;
      }
      if (interactionMode === 'items' && selectedItemId) {
        event.preventDefault();
        handleDeleteSelected();
        return;
      }
    }

    // R: Rotate selected item (items mode only)
    if ((event.key === 'r' || event.key === 'R') &&
        interactionMode === 'items' &&
        selectedItemId) {
      event.preventDefault();
      handleRotateSelected();
      return;
    }

    // Escape: Deselect current selection
    if (event.key === 'Escape') {
      if (interactionMode === 'items' && selectedItemId) {
        selectItem(null);
        return;
      }
      setSelectedImageId(null);
      setInteractionMode('items');
      return;
    }

    // L: Toggle lock on selected image (only in images mode with selection)
    if ((event.key === 'l' || event.key === 'L') &&
        interactionMode === 'images' &&
        selectedImageId) {
      event.preventDefault();
      toggleImageLock(selectedImageId);
      return;
    }
  };

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

        <div className="reference-image-toolbar">
          <ReferenceImageUploader onUpload={addImage} />
          <InteractionModeToggle
            mode={interactionMode}
            onChange={handleInteractionModeChange}
            hasImages={images.length > 0}
          />
          {placedItems.length > 0 && (
            <button className="clear-all-button" onClick={handleClearAll}>
              Clear All ({placedItems.length})
            </button>
          )}
        </div>

        {selectedImage && interactionMode === 'images' && (
          <ReferenceImageControls
            image={selectedImage}
            onScaleChange={(scale) => updateImageScale(selectedImage.id, scale)}
            onOpacityChange={(opacity) => updateImageOpacity(selectedImage.id, opacity)}
            onRemove={() => handleRemoveImage(selectedImage.id)}
            onToggleLock={() => toggleImageLock(selectedImage.id)}
          />
        )}
      </section>

      <main className="app-main">
        <section className="sidebar">
          <ItemLibrary
            items={libraryItems}
            categories={categories}
            isLoading={isLibraryLoading || isCategoriesLoading}
            error={libraryError || categoriesError}
            onAddItem={addItem}
            onUpdateItem={updateItem}
            onDeleteItem={deleteLibraryItem}
            onResetToDefaults={resetToDefaults}
            onExportLibrary={handleExportLibrary}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={handleDeleteCategory}
            onResetCategories={resetCategories}
            onUpdateItemCategories={updateItemCategories}
            getCategoryById={getCategoryById}
          />

          {selectedItemId && (
            <ItemControls
              onRotate={handleRotateSelected}
              onDelete={handleDeleteSelected}
            />
          )}
        </section>

        <section className="preview">
          <GridPreview
            gridX={gridResult.gridX}
            gridY={gridResult.gridY}
            placedItems={placedItems}
            selectedItemId={selectedItemId}
            spacers={spacers}
            onDrop={handleDrop}
            onSelectItem={selectItem}
            getItemById={getItemById}
            onDeleteItem={deleteItem}
            referenceImages={images}
            interactionMode={interactionMode}
            selectedImageId={selectedImageId}
            onImagePositionChange={updateImagePosition}
            onImageSelect={setSelectedImageId}
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
