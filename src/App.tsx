import { useState } from 'react';
import type { UnitSystem, ImperialFormat } from './types/gridfinity';
import { calculateGrid, mmToInches, inchesToMm } from './utils/conversions';
import { useGridItems } from './hooks/useGridItems';
import { DimensionInput } from './components/DimensionInput';
import { GridPreview } from './components/GridPreview';
import { GridSummary } from './components/GridSummary';
import { ItemLibrary } from './components/ItemLibrary';
import { ItemControls } from './components/ItemControls';
import './App.css';

function App() {
  const [width, setWidth] = useState(168);
  const [depth, setDepth] = useState(168);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [imperialFormat, setImperialFormat] = useState<ImperialFormat>('decimal');

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

  const {
    placedItems,
    selectedItemId,
    rotateItem,
    deleteItem,
    selectItem,
    handleDrop,
  } = useGridItems(gridResult.gridX, gridResult.gridY);

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
          <ItemLibrary />

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
            onDrop={handleDrop}
            onSelectItem={selectItem}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
