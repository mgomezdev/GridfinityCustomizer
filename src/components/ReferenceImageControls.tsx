import type { ReferenceImage } from '../types/gridfinity';

interface ReferenceImageControlsProps {
  image: ReferenceImage;
  onScaleChange: (scale: number) => void;
  onOpacityChange: (opacity: number) => void;
  onRemove: () => void;
  onToggleLock: () => void;
}

export function ReferenceImageControls({
  image,
  onScaleChange,
  onOpacityChange,
  onRemove,
  onToggleLock,
}: ReferenceImageControlsProps) {
  const handleOpacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = Number(event.target.value);
    const opacity = percentage / 100;
    onOpacityChange(opacity);
  };

  const handleScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = Number(event.target.value);
    const scale = percentage / 100;
    onScaleChange(scale);
  };

  const opacityPercentage = Math.round(image.opacity * 100);
  const scalePercentage = Math.round(image.scale * 100);

  return (
    <div className="reference-image-controls">
      <div className="reference-image-controls__header">
        <span className="reference-image-controls__name">{image.name}</span>
      </div>

      <div className="reference-image-controls__slider-group">
        <label htmlFor="opacity-slider" className="reference-image-controls__label">
          Opacity: {opacityPercentage}%
        </label>
        <input
          id="opacity-slider"
          type="range"
          min="0"
          max="100"
          value={opacityPercentage}
          onChange={handleOpacityChange}
          className="reference-image-controls__slider"
          title={`Opacity: ${opacityPercentage}%`}
        />
      </div>

      <div className="reference-image-controls__slider-group">
        <label htmlFor="scale-slider" className="reference-image-controls__label">
          Scale: {scalePercentage}%
        </label>
        <input
          id="scale-slider"
          type="range"
          min="10"
          max="200"
          value={scalePercentage}
          onChange={handleScaleChange}
          className="reference-image-controls__slider"
          title={`Scale: ${scalePercentage}%`}
        />
      </div>

      <div className="reference-image-controls__buttons">
        <button
          onClick={onToggleLock}
          className="reference-image-controls__button reference-image-controls__button--lock"
          title={image.isLocked ? 'Unlock image' : 'Lock image'}
        >
          {image.isLocked ? 'Unlock' : 'Lock'}
        </button>
        <button
          onClick={onRemove}
          className="reference-image-controls__button reference-image-controls__button--remove"
          title="Remove image"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
