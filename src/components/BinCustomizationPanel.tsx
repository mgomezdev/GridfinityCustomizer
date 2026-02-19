import {
  DEFAULT_BIN_CUSTOMIZATION,
  isDefaultCustomization,
} from '../types/gridfinity';
import type {
  BinCustomization,
  FingerSlide,
  LipStyle,
  WallCutout,
  WallPattern,
} from '../types/gridfinity';

interface BinCustomizationPanelProps {
  customization: BinCustomization | undefined;
  onChange: (customization: BinCustomization) => void;
  onReset: () => void;
}

const WALL_PATTERN_OPTIONS: WallPattern[] = [
  'none',
  'grid',
  'hexgrid',
  'voronoi',
  'voronoigrid',
  'voronoihexgrid',
];

const LIP_STYLE_OPTIONS: LipStyle[] = ['normal', 'reduced', 'minimum', 'none'];

const FINGER_SLIDE_OPTIONS: FingerSlide[] = ['none', 'rounded', 'chamfered'];

const WALL_CUTOUT_OPTIONS: WallCutout[] = ['none', 'vertical', 'horizontal', 'both'];

export function BinCustomizationPanel({
  customization,
  onChange,
  onReset,
}: BinCustomizationPanelProps) {
  const current: BinCustomization = customization ?? DEFAULT_BIN_CUSTOMIZATION;
  const isDefault = isDefaultCustomization(customization);

  const handleWallPatternChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...current, wallPattern: e.target.value as WallPattern });
  };

  const handleLipStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...current, lipStyle: e.target.value as LipStyle });
  };

  const handleFingerSlideChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...current, fingerSlide: e.target.value as FingerSlide });
  };

  const handleWallCutoutChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...current, wallCutout: e.target.value as WallCutout });
  };

  return (
    <div className="bin-customization-panel">
      <div className="bin-customization-field">
        <label htmlFor="wall-pattern-select">Wall Pattern</label>
        <select
          id="wall-pattern-select"
          value={current.wallPattern}
          onChange={handleWallPatternChange}
        >
          {WALL_PATTERN_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="bin-customization-field">
        <label htmlFor="lip-style-select">Lip Style</label>
        <select
          id="lip-style-select"
          value={current.lipStyle}
          onChange={handleLipStyleChange}
        >
          {LIP_STYLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="bin-customization-field">
        <label htmlFor="finger-slide-select">Finger Slide</label>
        <select
          id="finger-slide-select"
          value={current.fingerSlide}
          onChange={handleFingerSlideChange}
        >
          {FINGER_SLIDE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="bin-customization-field">
        <label htmlFor="wall-cutout-select">Wall Cutout</label>
        <select
          id="wall-cutout-select"
          value={current.wallCutout}
          onChange={handleWallCutoutChange}
        >
          {WALL_CUTOUT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onReset}
        disabled={isDefault}
      >
        Reset to Defaults
      </button>
    </div>
  );
}
