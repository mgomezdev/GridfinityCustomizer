import { useState } from 'react';
import { processImage } from '../api/shadowboxes.api';

export function ShadowboxUploadPage() {
  const [thickness, setThickness] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const photoInput = form.elements.namedItem('photo') as HTMLInputElement;
    const nameInput = form.elements.namedItem('name') as HTMLInputElement;

    const file = photoInput.files?.[0];
    if (!file) {
      setError('Please select a photo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await processImage(file, thickness, nameInput.value);
      // Store editor state in sessionStorage for the editor page to read
      sessionStorage.setItem(
        `shadowbox-edit-${result.shadowboxId}`,
        JSON.stringify({
          shadowboxId: result.shadowboxId,
          svgPath: result.svgPath,
          widthMm: result.widthMm,
          heightMm: result.heightMm,
          scaleMmPerPx: result.scaleMmPerPx,
          thicknessMm: thickness,
          name: nameInput.value,
        })
      );
      window.location.href = `/shadowbox/edit?id=${result.shadowboxId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="shadowbox-upload-page">
      <h1>New Shadowbox</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="photo">Photo</label>
          <input
            type="file"
            id="photo"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
          />
        </div>

        <div className="form-field">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
          />
        </div>

        <div className="form-field">
          <label htmlFor="thickness">Thickness ({thickness} mm)</label>
          <input
            type="range"
            id="thickness"
            name="thickness"
            min="4"
            max="20"
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
          />
        </div>

        {error && (
          <div role="alert" className="upload-error">
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Processing…' : 'Process'}
        </button>
      </form>
    </div>
  );
}
