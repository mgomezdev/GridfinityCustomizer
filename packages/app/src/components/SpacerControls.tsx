import type { GridSpacerConfig, SpacerMode } from '../types/gridfinity';

interface SpacerControlsProps {
  config: GridSpacerConfig;
  onConfigChange: (config: GridSpacerConfig) => void;
}

export function SpacerControls({ config, onConfigChange }: SpacerControlsProps) {
  const handleHorizontalChange = (mode: SpacerMode) => {
    onConfigChange({ ...config, horizontal: mode });
  };

  const handleVerticalChange = (mode: SpacerMode) => {
    onConfigChange({ ...config, vertical: mode });
  };

  return (
    <div className="spacer-controls">
      <span className="spacer-label">Spacers:</span>

      <div className="spacer-group">
        <span className="spacer-axis-label">H:</span>
        <div className="spacer-button-group">
          <button
            className={config.horizontal === 'none' ? 'active' : ''}
            onClick={() => handleHorizontalChange('none')}
            title="No horizontal spacers"
          >
            None
          </button>
          <button
            className={config.horizontal === 'one-sided' ? 'active' : ''}
            onClick={() => handleHorizontalChange('one-sided')}
            title="Horizontal spacer on left side"
          >
            One-sided
          </button>
          <button
            className={config.horizontal === 'symmetrical' ? 'active' : ''}
            onClick={() => handleHorizontalChange('symmetrical')}
            title="Horizontal spacers on both sides"
          >
            Symmetrical
          </button>
        </div>
      </div>

      <div className="spacer-group">
        <span className="spacer-axis-label">V:</span>
        <div className="spacer-button-group">
          <button
            className={config.vertical === 'none' ? 'active' : ''}
            onClick={() => handleVerticalChange('none')}
            title="No vertical spacers"
          >
            None
          </button>
          <button
            className={config.vertical === 'one-sided' ? 'active' : ''}
            onClick={() => handleVerticalChange('one-sided')}
            title="Vertical spacer on top side"
          >
            One-sided
          </button>
          <button
            className={config.vertical === 'symmetrical' ? 'active' : ''}
            onClick={() => handleVerticalChange('symmetrical')}
            title="Vertical spacers on both sides"
          >
            Symmetrical
          </button>
        </div>
      </div>
    </div>
  );
}
