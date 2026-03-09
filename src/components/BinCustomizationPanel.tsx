import {
  DEFAULT_BIN_CUSTOMIZATION,
  isDefaultCustomization,
} from '../types/gridfinity';
import type {
  BinCustomization,
  CustomizableField,
  FingerSlide,
  LipStyle,
  WallCutout,
  WallPattern,
} from '../types/gridfinity';

interface BinCustomizationPanelProps {
  customization: BinCustomization | undefined;
  onChange: (customization: BinCustomization) => void;
  onReset: () => void;
  customizableFields: CustomizableField[];
  customizationDefaults?: Partial<BinCustomization>;
  idPrefix?: string;
}

const WALL_PATTERN_OPTIONS: WallPattern[] = [
  'none', 'grid', 'hexgrid', 'voronoi', 'voronoigrid', 'voronoihexgrid',
];
const LIP_STYLE_OPTIONS: LipStyle[] = ['normal', 'reduced', 'minimum', 'none'];
const FINGER_SLIDE_OPTIONS: FingerSlide[] = ['none', 'rounded', 'chamfered'];
const WALL_CUTOUT_OPTIONS: WallCutout[] = ['none', 'vertical', 'horizontal', 'both'];

export function BinCustomizationPanel({
  customization,
  onChange,
  onReset,
  customizableFields,
  customizationDefaults,
  idPrefix = '',
}: BinCustomizationPanelProps) {
  if (customizableFields.length === 0) return null;

  const effectiveDefaults = { ...DEFAULT_BIN_CUSTOMIZATION, ...customizationDefaults };
  const current: BinCustomization = customization ?? effectiveDefaults;
  const isDefault = isDefaultCustomization(customization)
    && (!customizationDefaults || Object.entries(customizationDefaults).every(
      ([k, v]) => current[k as keyof BinCustomization] === v
    ));

  const has = (f: CustomizableField) => customizableFields.includes(f);

  return (
    <div className="bin-customization-panel">
      {has('wallPattern') && (
        <div className="bin-customization-field">
          <label htmlFor={`${idPrefix}wall-pattern-select`}>Wall Pattern</label>
          <select
            id={`${idPrefix}wall-pattern-select`}
            value={current.wallPattern}
            onChange={(e) => onChange({ ...current, wallPattern: e.target.value as WallPattern })}
          >
            {WALL_PATTERN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )}

      {has('lipStyle') && (
        <div className="bin-customization-field">
          <label htmlFor={`${idPrefix}lip-style-select`}>Lip Style</label>
          <select
            id={`${idPrefix}lip-style-select`}
            value={current.lipStyle}
            onChange={(e) => onChange({ ...current, lipStyle: e.target.value as LipStyle })}
          >
            {LIP_STYLE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )}

      {has('fingerSlide') && (
        <div className="bin-customization-field">
          <label htmlFor={`${idPrefix}finger-slide-select`}>Finger Slide</label>
          <select
            id={`${idPrefix}finger-slide-select`}
            value={current.fingerSlide}
            onChange={(e) => onChange({ ...current, fingerSlide: e.target.value as FingerSlide })}
          >
            {FINGER_SLIDE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )}

      {has('wallCutout') && (
        <div className="bin-customization-field">
          <label htmlFor={`${idPrefix}wall-cutout-select`}>Wall Cutout</label>
          <select
            id={`${idPrefix}wall-cutout-select`}
            value={current.wallCutout}
            onChange={(e) => onChange({ ...current, wallCutout: e.target.value as WallCutout })}
          >
            {WALL_CUTOUT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )}

      {has('height') && (
        <div className="bin-customization-field">
          <label htmlFor={`${idPrefix}height-input`}>
            Height ({current.height * 7}mm)
          </label>
          <input
            id={`${idPrefix}height-input`}
            type="number"
            min={1}
            max={20}
            value={current.height}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1 && v <= 20) {
                onChange({ ...current, height: v });
              }
            }}
          />
        </div>
      )}

      <button type="button" onClick={onReset} disabled={isDefault}>
        Reset to Defaults
      </button>
    </div>
  );
}
