import { useState } from 'react';
import type { UnitSystem, ImperialFormat, GridSpacerConfig } from './types/gridfinity';
import { calculateGrid, mmToInches, inchesToMm } from './utils/conversions';
import { useGridItems } from './hooks/useGridItems';
import { useSpacerCalculation } from './hooks/useSpacerCalculation';
import { useBillOfMaterials } from './hooks/useBillOfMaterials';
import { useLibraryData } from './hooks/useLibraryData';
import { useCategoryData } from './hooks/useCategoryData';
import { DimensionInput } from './components/DimensionInput';
import { GridPreview } from './components/GridPreview';
import { GridSummary } from './components/GridSummary';
import { ItemLibrary } from './components/ItemLibrary';
import { ItemControls } from './components/ItemControls';
import { SpacerControls } from './components/SpacerControls';
import { BillOfMaterials } from './components/BillOfMaterials';
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
    items: libraryItems,
    isLoading: isLibraryLoading,
    error: libraryError,
    getItemById,
    addItem,
    updateItem,
    deleteItem: deleteLibraryItem,
    resetToDefaults,
    updateItemCategories,
  } = useLibraryData();

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
    selectItem,
    handleDrop,
  } = useGridItems(gridResult.gridX, gridResult.gridY, getItemById);

  const bomItems = useBillOfMaterials(placedItems, libraryItems);

  const handleRotateSelected = () => {
    if (selectedItemId) {
      rotateItem(selectedItemId);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItemId) {
      deleteItem(selectedItemId);
    }
  };

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
            isLoading={isLibraryLoading || isCategoriesLoading}
            error={libraryError || categoriesError}
            onAddItem={addItem}
            onUpdateItem={updateItem}
            onDeleteItem={deleteLibraryItem}
            onResetToDefaults={resetToDefaults}
            onExportLibrary={handleExportLibrary}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
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
