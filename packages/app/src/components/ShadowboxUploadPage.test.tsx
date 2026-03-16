import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ShadowboxUploadPage } from './ShadowboxUploadPage';

const mockProcessImage = vi.fn();
vi.mock('../api/shadowboxes.api', () => ({
  processImage: (...args: unknown[]) => mockProcessImage(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { href: '' },
  });
});

describe('ShadowboxUploadPage', () => {
  it('renders photo input, name input, thickness slider, and Process button', () => {
    render(<ShadowboxUploadPage />);

    const photoInput = document.getElementById('photo') as HTMLInputElement;
    expect(photoInput).not.toBeNull();
    expect(photoInput.type).toBe('file');

    const nameInput = document.getElementById('name') as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    expect(nameInput.type).toBe('text');

    const thicknessInput = document.getElementById('thickness') as HTMLInputElement;
    expect(thicknessInput).not.toBeNull();
    expect(thicknessInput.type).toBe('range');
    expect(thicknessInput.min).toBe('4');
    expect(thicknessInput.max).toBe('20');
    expect(thicknessInput.value).toBe('8');

    expect(screen.getByRole('button', { name: /process/i })).toBeInTheDocument();
  });

  it('calls processImage with file, thickness, and name on submit', async () => {
    mockProcessImage.mockResolvedValue({
      shadowboxId: 'abc-123',
      svgPath: '/data/abc.svg',
      widthMm: 42,
      heightMm: 42,
      scaleMmPerPx: 1,
    });

    render(<ShadowboxUploadPage />);

    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
    const photoInput = document.getElementById('photo') as HTMLInputElement;
    fireEvent.change(photoInput, { target: { files: [file] } });

    const nameInput = document.getElementById('name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'My Tool' } });

    const thicknessInput = document.getElementById('thickness') as HTMLInputElement;
    fireEvent.change(thicknessInput, { target: { value: '12' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /process/i }));
    });

    await waitFor(() => {
      expect(mockProcessImage).toHaveBeenCalledWith(file, 12, 'My Tool');
    });
  });

  it('navigates to the shadowbox editor on success', async () => {
    mockProcessImage.mockResolvedValue({
      shadowboxId: 'abc-123',
      svgPath: '/data/abc.svg',
      widthMm: 42,
      heightMm: 42,
      scaleMmPerPx: 1,
    });

    render(<ShadowboxUploadPage />);

    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
    const photoInput = document.getElementById('photo') as HTMLInputElement;
    fireEvent.change(photoInput, { target: { files: [file] } });

    const nameInput = document.getElementById('name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'My Tool' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /process/i }));
    });

    await waitFor(() => {
      expect(window.location.href).toBe('/shadowbox/edit?id=abc-123');
    });
  });

  it('shows an error message on failure', async () => {
    mockProcessImage.mockRejectedValue(new Error('Upload failed'));

    render(<ShadowboxUploadPage />);

    const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
    const photoInput = document.getElementById('photo') as HTMLInputElement;
    fireEvent.change(photoInput, { target: { files: [file] } });

    const nameInput = document.getElementById('name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'My Tool' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /process/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
  });
});
