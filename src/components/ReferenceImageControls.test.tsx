import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReferenceImageControls } from './ReferenceImageControls';
import type { ReferenceImage } from '../types/gridfinity';

describe('ReferenceImageControls', () => {
  const createMockImage = (overrides?: Partial<ReferenceImage>): ReferenceImage => ({
    id: 'test-image-1',
    name: 'Test Image.png',
    dataUrl: 'data:image/png;base64,test',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    opacity: 0.5,
    scale: 1.0,
    isLocked: false,
    ...overrides,
  });

  let mockCallbacks: {
    onScaleChange: ReturnType<typeof vi.fn>;
    onOpacityChange: ReturnType<typeof vi.fn>;
    onRemove: ReturnType<typeof vi.fn>;
    onToggleLock: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCallbacks = {
      onScaleChange: vi.fn(),
      onOpacityChange: vi.fn(),
      onRemove: vi.fn(),
      onToggleLock: vi.fn(),
    };
  });

  it('should render image name', () => {
    const image = createMockImage({ name: 'MyImage.jpg' });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    expect(screen.getByText('MyImage.jpg')).toBeInTheDocument();
  });

  it('should render opacity slider with correct initial value', () => {
    const image = createMockImage({ opacity: 0.75 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const slider = screen.getByLabelText(/Opacity:/);
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveValue('75'); // 0.75 * 100 = 75%
    expect(screen.getByText(/Opacity: 75%/)).toBeInTheDocument();
  });

  it('should render scale slider with correct initial value', () => {
    const image = createMockImage({ scale: 1.5 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const slider = screen.getByLabelText(/Scale:/);
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveValue('150'); // 1.5 * 100 = 150%
    expect(screen.getByText(/Scale: 150%/)).toBeInTheDocument();
  });

  it('should call onOpacityChange with correct value (0-1 range) when opacity slider changes', () => {
    const image = createMockImage({ opacity: 0.5 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const slider = screen.getByLabelText(/Opacity:/);
    fireEvent.change(slider, { target: { value: '80' } });

    expect(mockCallbacks.onOpacityChange).toHaveBeenCalledWith(0.8);
    expect(mockCallbacks.onOpacityChange).toHaveBeenCalledTimes(1);
  });

  it('should call onOpacityChange with 0 for minimum value', () => {
    const image = createMockImage({ opacity: 0.5 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const slider = screen.getByLabelText(/Opacity:/);
    fireEvent.change(slider, { target: { value: '0' } });

    expect(mockCallbacks.onOpacityChange).toHaveBeenCalledWith(0);
  });

  it('should call onOpacityChange with 1 for maximum value', () => {
    const image = createMockImage({ opacity: 0.5 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const slider = screen.getByLabelText(/Opacity:/);
    fireEvent.change(slider, { target: { value: '100' } });

    expect(mockCallbacks.onOpacityChange).toHaveBeenCalledWith(1);
  });

  it('should call onScaleChange with correct value (0.1-2.0 range) when scale slider changes', () => {
    const image = createMockImage({ scale: 1.0 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const slider = screen.getByLabelText(/Scale:/);
    fireEvent.change(slider, { target: { value: '125' } });

    expect(mockCallbacks.onScaleChange).toHaveBeenCalledWith(1.25);
    expect(mockCallbacks.onScaleChange).toHaveBeenCalledTimes(1);
  });

  it('should call onScaleChange with 0.1 for minimum value', () => {
    const image = createMockImage({ scale: 1.0 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const slider = screen.getByLabelText(/Scale:/);
    fireEvent.change(slider, { target: { value: '10' } });

    expect(mockCallbacks.onScaleChange).toHaveBeenCalledWith(0.1);
  });

  it('should call onScaleChange with 2.0 for maximum value', () => {
    const image = createMockImage({ scale: 1.0 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const slider = screen.getByLabelText(/Scale:/);
    fireEvent.change(slider, { target: { value: '200' } });

    expect(mockCallbacks.onScaleChange).toHaveBeenCalledWith(2);
  });

  it('should show "Lock" text when image is not locked', () => {
    const image = createMockImage({ isLocked: false });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const lockButton = screen.getByRole('button', { name: /^Lock$/ });
    expect(lockButton).toHaveTextContent('Lock');
  });

  it('should show "Unlock" text when image is locked', () => {
    const image = createMockImage({ isLocked: true });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const lockButton = screen.getByRole('button', { name: /^Unlock$/ });
    expect(lockButton).toHaveTextContent('Unlock');
  });

  it('should call onToggleLock when lock button is clicked', () => {
    const image = createMockImage({ isLocked: false });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const lockButton = screen.getByRole('button', { name: /^Lock$/ });
    fireEvent.click(lockButton);

    expect(mockCallbacks.onToggleLock).toHaveBeenCalledTimes(1);
  });

  it('should call onToggleLock when unlock button is clicked', () => {
    const image = createMockImage({ isLocked: true });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const lockButton = screen.getByRole('button', { name: /^Unlock$/ });
    fireEvent.click(lockButton);

    expect(mockCallbacks.onToggleLock).toHaveBeenCalledTimes(1);
  });

  it('should call onRemove when remove button is clicked', () => {
    const image = createMockImage();
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const removeButton = screen.getByRole('button', { name: /^Remove$/ });
    fireEvent.click(removeButton);

    expect(mockCallbacks.onRemove).toHaveBeenCalledTimes(1);
  });

  it('should render opacity slider with correct attributes', () => {
    const image = createMockImage({ opacity: 0.5 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const slider = screen.getByLabelText(/Opacity:/);
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('id', 'opacity-slider');
  });

  it('should render scale slider with correct attributes', () => {
    const image = createMockImage({ scale: 1.0 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const slider = screen.getByLabelText(/Scale:/);
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveAttribute('min', '10');
    expect(slider).toHaveAttribute('max', '200');
    expect(slider).toHaveAttribute('id', 'scale-slider');
  });

  it('should round opacity percentage to nearest integer', () => {
    const image = createMockImage({ opacity: 0.666 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    expect(screen.getByText(/Opacity: 67%/)).toBeInTheDocument();
  });

  it('should round scale percentage to nearest integer', () => {
    const image = createMockImage({ scale: 1.234 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    expect(screen.getByText(/Scale: 123%/)).toBeInTheDocument();
  });

  it('should have proper button titles for accessibility', () => {
    const image = createMockImage({ isLocked: false });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const lockButton = screen.getByRole('button', { name: /^Lock$/ });
    const removeButton = screen.getByRole('button', { name: /^Remove$/ });

    expect(lockButton).toHaveAttribute('title', 'Lock image');
    expect(removeButton).toHaveAttribute('title', 'Remove image');
  });

  it('should update lock button title when isLocked changes', () => {
    const image = createMockImage({ isLocked: false });
    const { rerender } = render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    let lockButton = screen.getByRole('button', { name: /^Lock$/ });
    expect(lockButton).toHaveAttribute('title', 'Lock image');

    const lockedImage = createMockImage({ isLocked: true });
    rerender(<ReferenceImageControls image={lockedImage} {...mockCallbacks} />);

    lockButton = screen.getByRole('button', { name: /^Unlock$/ });
    expect(lockButton).toHaveAttribute('title', 'Unlock image');
  });

  it('should handle multiple opacity slider changes', () => {
    const image = createMockImage({ opacity: 0.5 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const slider = screen.getByLabelText(/Opacity:/);

    fireEvent.change(slider, { target: { value: '25' } });
    fireEvent.change(slider, { target: { value: '75' } });
    fireEvent.change(slider, { target: { value: '90' } });

    expect(mockCallbacks.onOpacityChange).toHaveBeenCalledTimes(3);
    expect(mockCallbacks.onOpacityChange).toHaveBeenNthCalledWith(1, 0.25);
    expect(mockCallbacks.onOpacityChange).toHaveBeenNthCalledWith(2, 0.75);
    expect(mockCallbacks.onOpacityChange).toHaveBeenNthCalledWith(3, 0.9);
  });

  it('should handle multiple scale slider changes', () => {
    const image = createMockImage({ scale: 1.0 });
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    const slider = screen.getByLabelText(/Scale:/);

    fireEvent.change(slider, { target: { value: '50' } });
    fireEvent.change(slider, { target: { value: '150' } });
    fireEvent.change(slider, { target: { value: '200' } });

    expect(mockCallbacks.onScaleChange).toHaveBeenCalledTimes(3);
    expect(mockCallbacks.onScaleChange).toHaveBeenNthCalledWith(1, 0.5);
    expect(mockCallbacks.onScaleChange).toHaveBeenNthCalledWith(2, 1.5);
    expect(mockCallbacks.onScaleChange).toHaveBeenNthCalledWith(3, 2);
  });

  it('should not call callbacks on initial render', () => {
    const image = createMockImage();
    render(<ReferenceImageControls image={image} {...mockCallbacks} />);

    expect(mockCallbacks.onOpacityChange).not.toHaveBeenCalled();
    expect(mockCallbacks.onScaleChange).not.toHaveBeenCalled();
    expect(mockCallbacks.onRemove).not.toHaveBeenCalled();
    expect(mockCallbacks.onToggleLock).not.toHaveBeenCalled();
  });
});
