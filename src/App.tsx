import { useState } from 'react';
import type { UnitSystem, ImperialFormat } from './types/gridfinity';
import { calculateGrid, mmToInches, inchesToMm } from './utils/conversions';
import { DimensionInput } from './components/DimensionInput';
import { UnitToggle } from './components/UnitToggle';
import { GridPreview } from './components/GridPreview';
import { GridInfo } from './components/GridInfo';
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Gridfinity Bin Customizer</h1>
        <p className="subtitle">Design your modular storage layout</p>
      </header>

      <main className="app-main">
        <section className="controls">
          <UnitToggle
            unit={unitSystem}
            imperialFormat={imperialFormat}
            onUnitChange={handleUnitChange}
            onImperialFormatChange={setImperialFormat}
          />

          <div className="dimension-inputs">
            <DimensionInput
              label="Width"
              value={width}
              onChange={setWidth}
              unit={unitSystem}
              imperialFormat={imperialFormat}
            />
            <DimensionInput
              label="Depth"
              value={depth}
              onChange={setDepth}
              unit={unitSystem}
              imperialFormat={imperialFormat}
            />
          </div>

          <GridInfo
            gridX={gridResult.gridX}
            gridY={gridResult.gridY}
            actualWidth={gridResult.actualWidth}
            actualDepth={gridResult.actualDepth}
            gapWidth={gridResult.gapWidth}
            gapDepth={gridResult.gapDepth}
            unit={unitSystem}
            imperialFormat={imperialFormat}
          />
        </section>

        <section className="preview">
          <GridPreview gridX={gridResult.gridX} gridY={gridResult.gridY} />
        </section>
      </main>
    </div>
  );
}

export default App;
