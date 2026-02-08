import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ReferenceImageOverlay } from './ReferenceImageOverlay';
import type { ReferenceImage } from '../types/gridfinity';

describe('ReferenceImageOverlay', () => {
  const mockOnPositionChange = vi.fn();
  const mockOnSelect = vi.fn();
  const mockOnScaleChange = vi.fn();
  const mockOnOpacityChange = vi.fn();
  const mockOnRemove = vi.fn();
  const mockOnToggleLock = vi.fn();

  beforeEach(() => {
    mockOnPositionChange.mockClear();
    mockOnSelect.mockClear();
    mockOnScaleChange.mockClear();
    mockOnOpacityChange.mockClear();
    mockOnRemove.mockClear();
    mockOnToggleLock.mockClear();
  });

  const createMockImage = (overrides?: Partial<ReferenceImage>): ReferenceImage => ({
    id: 'test-image-1',
    name: 'test-image.png',
    dataUrl: 'data:image/png;base64,mockBase64String',
    x: 10,
    y: 20,
    width: 50,
    height: 40,
    opacity: 0.5,
    scale: 1,
    isLocked: false,
    ...overrides,
  });

  const defaultProps = {
    isSelected: false,
    onPositionChange: mockOnPositionChange,
    onSelect: mockOnSelect,
    onScaleChange: mockOnScaleChange,
    onOpacityChange: mockOnOpacityChange,
    onRemove: mockOnRemove,
    onToggleLock: mockOnToggleLock,
  };

  describe('Image Rendering', () => {
    it('should render image with correct src (dataUrl)', () => {
      const image = createMockImage({ dataUrl: 'data:image/png;base64,testData' });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const imgElement = container.querySelector('img');
      expect(imgElement).toBeInTheDocument();
      expect(imgElement).toHaveAttribute('src', 'data:image/png;base64,testData');
    });

    it('should use image name as alt text', () => {
      const image = createMockImage({ name: 'my-reference.jpg' });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const imgElement = container.querySelector('img');
      expect(imgElement).toHaveAttribute('alt', 'my-reference.jpg');
    });

    it('should set draggable to false on image element', () => {
      const image = createMockImage();
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const imgElement = container.querySelector('img');
      expect(imgElement).toHaveAttribute('draggable', 'false');
    });
  });

  describe('Opacity Styling', () => {
    it('should apply opacity style on content div from image.opacity', () => {
      const image = createMockImage({ opacity: 0.7 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const contentElement = container.querySelector('.reference-image-overlay__content');
      expect(contentElement).toHaveStyle({ opacity: '0.7' });
    });

    it('should handle opacity of 0', () => {
      const image = createMockImage({ opacity: 0 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const contentElement = container.querySelector('.reference-image-overlay__content');
      expect(contentElement).toHaveStyle({ opacity: '0' });
    });

    it('should handle opacity of 1', () => {
      const image = createMockImage({ opacity: 1 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const contentElement = container.querySelector('.reference-image-overlay__content');
      expect(contentElement).toHaveStyle({ opacity: '1' });
    });
  });

  describe('Scale Transform', () => {
    it('should apply scale transform on content div from image.scale', () => {
      const image = createMockImage({ scale: 1.5 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const contentElement = container.querySelector('.reference-image-overlay__content');
      expect(contentElement).toHaveStyle({ transform: 'scale(1.5)' });
    });

    it('should handle scale of 1 (no scaling)', () => {
      const image = createMockImage({ scale: 1 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const contentElement = container.querySelector('.reference-image-overlay__content');
      expect(contentElement).toHaveStyle({ transform: 'scale(1)' });
    });

    it('should handle very large scale values', () => {
      const image = createMockImage({ scale: 5 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const contentElement = container.querySelector('.reference-image-overlay__content');
      expect(contentElement).toHaveStyle({ transform: 'scale(5)' });
    });

    it('should handle small scale values', () => {
      const image = createMockImage({ scale: 0.5 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const contentElement = container.querySelector('.reference-image-overlay__content');
      expect(contentElement).toHaveStyle({ transform: 'scale(0.5)' });
    });

    it('should use top-left transform-origin so scaled-down images can reach container edges', () => {
      const image = createMockImage({ scale: 0.5, x: 0, y: 0 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const contentElement = container.querySelector('.reference-image-overlay__content');
      expect(contentElement).toHaveStyle({ transformOrigin: 'top left' });
      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveStyle({ left: '0%' });
    });
  });

  describe('Percentage-based Positioning', () => {
    it('should apply left position as percentage', () => {
      const image = createMockImage({ x: 25 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveStyle({ left: '25%' });
    });

    it('should apply top position as percentage', () => {
      const image = createMockImage({ y: 30 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveStyle({ top: '30%' });
    });

    it('should apply width as percentage', () => {
      const image = createMockImage({ width: 60 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveStyle({ width: '60%' });
    });

    it('should apply height as percentage', () => {
      const image = createMockImage({ height: 45 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveStyle({ height: '45%' });
    });

    it('should position at (0, 0) correctly', () => {
      const image = createMockImage({ x: 0, y: 0 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveStyle({ left: '0%', top: '0%' });
    });

    it('should handle 100% dimensions', () => {
      const image = createMockImage({ x: 0, y: 0, width: 100, height: 100 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveStyle({
        left: '0%',
        top: '0%',
        width: '100%',
        height: '100%',
      });
    });
  });

  describe('Pointer Events', () => {
    it('should always have pointer-events: auto', () => {
      const image = createMockImage();
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveStyle({ pointerEvents: 'auto' });
    });
  });

  describe('CSS Classes', () => {
    it('should have base class reference-image-overlay', () => {
      const image = createMockImage();
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveClass('reference-image-overlay');
    });

    it('should always have interactive class', () => {
      const image = createMockImage();
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveClass('reference-image-overlay--interactive');
    });

    it('should have locked class when image.isLocked=true', () => {
      const image = createMockImage({ isLocked: true });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveClass('reference-image-overlay--locked');
    });

    it('should NOT have locked class when image.isLocked=false', () => {
      const image = createMockImage({ isLocked: false });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).not.toHaveClass('reference-image-overlay--locked');
    });

    it('should have dragging class when actively dragging', () => {
      const image = createMockImage({ isLocked: false });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).not.toHaveClass('reference-image-overlay--dragging');

      fireEvent.mouseDown(overlayElement!, { clientX: 100, clientY: 100 });

      expect(overlayElement).toHaveClass('reference-image-overlay--dragging');
    });

    it('should have selected class when isSelected=true', () => {
      const image = createMockImage();
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} isSelected={true} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveClass('reference-image-overlay--selected');
    });

    it('should NOT have selected class when isSelected=false', () => {
      const image = createMockImage();
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} isSelected={false} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).not.toHaveClass('reference-image-overlay--selected');
    });
  });

  describe('Click/Select Behavior', () => {
    it('should call onSelect on mousedown when interactive', () => {
      const image = createMockImage();
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      fireEvent.mouseDown(overlayElement!, { clientX: 100, clientY: 100 });

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect when image is locked (allows selecting to unlock)', () => {
      const image = createMockImage({ isLocked: true });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      fireEvent.mouseDown(overlayElement!, { clientX: 100, clientY: 100 });

      expect(mockOnSelect).toHaveBeenCalled();
    });

    it('should prevent default and stop propagation on mousedown when interactive and unlocked', () => {
      const image = createMockImage({ isLocked: false });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      const event = new MouseEvent('mousedown', { bubbles: true, clientX: 100, clientY: 100 });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      overlayElement!.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('Drag Behavior', () => {
    it('should initiate drag on mousedown when interactive and unlocked', () => {
      const image = createMockImage({ x: 10, y: 20, isLocked: false });
      const { container } = render(
        <div style={{ width: '1000px', height: '800px' }}>
          <ReferenceImageOverlay image={image} {...defaultProps} />
        </div>
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      fireEvent.mouseDown(overlayElement!, { clientX: 500, clientY: 400 });

      expect(overlayElement).toHaveClass('reference-image-overlay--dragging');
    });

    it('should NOT initiate drag when image is locked', () => {
      const image = createMockImage({ isLocked: true });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      fireEvent.mouseDown(overlayElement!, { clientX: 100, clientY: 100 });

      expect(overlayElement).not.toHaveClass('reference-image-overlay--dragging');
    });

    it('should update position on mousemove during drag', () => {
      const image = createMockImage({ x: 10, y: 20, isLocked: false });

      const { container } = render(
        <div style={{ width: '1000px', height: '800px' }}>
          <ReferenceImageOverlay image={image} {...defaultProps} />
        </div>
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      const parentElement = overlayElement!.parentElement!;

      vi.spyOn(parentElement, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 800,
        left: 0,
        top: 0,
        right: 1000,
        bottom: 800,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      fireEvent.mouseDown(overlayElement!, { clientX: 500, clientY: 400 });
      fireEvent.mouseMove(document, { clientX: 600, clientY: 500 });

      expect(mockOnPositionChange).toHaveBeenCalledWith(20, 32.5);
    });

    it('should clamp position to 0-100 range during drag', () => {
      const image = createMockImage({ x: 5, y: 5, isLocked: false });

      const { container } = render(
        <div style={{ width: '1000px', height: '800px' }}>
          <ReferenceImageOverlay image={image} {...defaultProps} />
        </div>
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      const parentElement = overlayElement!.parentElement!;

      vi.spyOn(parentElement, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 800,
        left: 0,
        top: 0,
        right: 1000,
        bottom: 800,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      fireEvent.mouseDown(overlayElement!, { clientX: 500, clientY: 400 });
      fireEvent.mouseMove(document, { clientX: -1000, clientY: -1000 });

      expect(mockOnPositionChange).toHaveBeenCalledWith(0, 0);

      fireEvent.mouseMove(document, { clientX: 2000, clientY: 2000 });

      expect(mockOnPositionChange).toHaveBeenCalledWith(100, 100);
    });

    it('should end drag on mouseup', () => {
      const image = createMockImage({ isLocked: false });
      const { container } = render(
        <div style={{ width: '1000px', height: '800px' }}>
          <ReferenceImageOverlay image={image} {...defaultProps} />
        </div>
      );

      const overlayElement = container.querySelector('.reference-image-overlay');

      fireEvent.mouseDown(overlayElement!, { clientX: 100, clientY: 100 });
      expect(overlayElement).toHaveClass('reference-image-overlay--dragging');

      fireEvent.mouseUp(document);
      expect(overlayElement).not.toHaveClass('reference-image-overlay--dragging');
    });

    it('should handle drag with no parent element gracefully', () => {
      const image = createMockImage({ isLocked: false });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');

      Object.defineProperty(overlayElement, 'parentElement', {
        value: null,
        writable: true,
        configurable: true,
      });

      fireEvent.mouseDown(overlayElement!, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(document, { clientX: 200, clientY: 200 });

      expect(mockOnPositionChange).not.toHaveBeenCalled();
    });

    it('should not update position during drag if no parent container', () => {
      const image = createMockImage({ isLocked: false });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');

      fireEvent.mouseDown(overlayElement!, { clientX: 100, clientY: 100 });

      const originalParentElement = overlayElement!.parentElement;
      Object.defineProperty(overlayElement, 'parentElement', {
        get: () => null,
        configurable: true,
      });

      fireEvent.mouseMove(document, { clientX: 200, clientY: 200 });

      expect(mockOnPositionChange).not.toHaveBeenCalled();

      Object.defineProperty(overlayElement, 'parentElement', {
        get: () => originalParentElement,
        configurable: true,
      });
    });
  });

  describe('Inline Toolbar', () => {
    it('should NOT render toolbar when isSelected=false', () => {
      const image = createMockImage();
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} isSelected={false} />
      );

      const toolbar = container.querySelector('.reference-image-overlay__toolbar');
      expect(toolbar).not.toBeInTheDocument();
    });

    it('should render toolbar when isSelected=true', () => {
      const image = createMockImage();
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} isSelected={true} />
      );

      const toolbar = container.querySelector('.reference-image-overlay__toolbar');
      expect(toolbar).toBeInTheDocument();
    });

    it('should call onOpacityChange with correct decimal value when slider changes', () => {
      const image = createMockImage({ opacity: 0.5 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} isSelected={true} />
      );

      const opacitySlider = container.querySelector('#opacity-slider') as HTMLInputElement;
      expect(opacitySlider).toBeInTheDocument();

      fireEvent.change(opacitySlider, { target: { value: '80' } });
      expect(mockOnOpacityChange).toHaveBeenCalledWith(0.8);
    });

    it('should call onScaleChange with correct decimal value when slider changes', () => {
      const image = createMockImage({ scale: 1 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} isSelected={true} />
      );

      const scaleSlider = container.querySelector('#scale-slider') as HTMLInputElement;
      expect(scaleSlider).toBeInTheDocument();

      fireEvent.change(scaleSlider, { target: { value: '150' } });
      expect(mockOnScaleChange).toHaveBeenCalledWith(1.5);
    });

    it('should call onToggleLock when lock button is clicked', () => {
      const image = createMockImage({ isLocked: false });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} isSelected={true} />
      );

      const lockButton = container.querySelector('.reference-image-overlay__toolbar-btn--lock');
      expect(lockButton).toBeInTheDocument();
      expect(lockButton).toHaveTextContent('Lock');

      fireEvent.click(lockButton!);
      expect(mockOnToggleLock).toHaveBeenCalledTimes(1);
    });

    it('should show "Unlock" text when image is locked', () => {
      const image = createMockImage({ isLocked: true });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} isSelected={true} />
      );

      const lockButton = container.querySelector('.reference-image-overlay__toolbar-btn--lock');
      expect(lockButton).toHaveTextContent('Unlock');
    });

    it('should call onRemove when remove button is clicked', () => {
      const image = createMockImage();
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} isSelected={true} />
      );

      const removeButton = container.querySelector('.reference-image-overlay__toolbar-btn--remove');
      expect(removeButton).toBeInTheDocument();

      fireEvent.click(removeButton!);
      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    it('should stop propagation on toolbar mousedown to prevent drag', () => {
      const image = createMockImage();
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} isSelected={true} />
      );

      const toolbar = container.querySelector('.reference-image-overlay__toolbar');
      const event = new MouseEvent('mousedown', { bubbles: true });
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      toolbar!.dispatchEvent(event);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should render toolbar outside the scaled content so it stays constant size', () => {
      const image = createMockImage({ scale: 2 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} isSelected={true} />
      );

      const toolbar = container.querySelector('.reference-image-overlay__toolbar');
      const content = container.querySelector('.reference-image-overlay__content');
      // Toolbar is a sibling of content, not a child — so it's not affected by content's scale
      expect(toolbar!.parentElement).toBe(content!.parentElement);
      expect(content).toHaveStyle({ transform: 'scale(2)' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle fractional percentage values', () => {
      const image = createMockImage({ x: 33.33, y: 66.67, width: 25.5, height: 12.75 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveStyle({
        left: '33.33%',
        top: '66.67%',
        width: '25.5%',
        height: '12.75%',
      });
    });

    it('should handle negative position values', () => {
      const image = createMockImage({ x: -10, y: -20 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveStyle({
        left: '-10%',
        top: '-20%',
      });
    });

    it('should handle position values greater than 100', () => {
      const image = createMockImage({ x: 150, y: 200 });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveStyle({
        left: '150%',
        top: '200%',
      });
    });

    it('should combine all styling properties correctly', () => {
      const image = createMockImage({
        x: 15,
        y: 25,
        width: 60,
        height: 40,
        opacity: 0.8,
        scale: 1.2,
      });
      const { container } = render(
        <ReferenceImageOverlay image={image} {...defaultProps} />
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      expect(overlayElement).toHaveStyle({
        left: '15%',
        top: '25%',
        width: '60%',
        height: '40%',
        pointerEvents: 'auto',
      });

      const contentElement = container.querySelector('.reference-image-overlay__content');
      expect(contentElement).toHaveStyle({
        opacity: '0.8',
        transform: 'scale(1.2)',
      });
    });

    it('should handle rapid drag movements', () => {
      const image = createMockImage({ x: 50, y: 50, isLocked: false });

      const { container } = render(
        <div style={{ width: '1000px', height: '800px' }}>
          <ReferenceImageOverlay image={image} {...defaultProps} />
        </div>
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      const parentElement = overlayElement!.parentElement!;

      vi.spyOn(parentElement, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 800,
        left: 0,
        top: 0,
        right: 1000,
        bottom: 800,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      fireEvent.mouseDown(overlayElement!, { clientX: 500, clientY: 400 });

      fireEvent.mouseMove(document, { clientX: 510, clientY: 410 });
      fireEvent.mouseMove(document, { clientX: 520, clientY: 420 });
      fireEvent.mouseMove(document, { clientX: 530, clientY: 430 });
      fireEvent.mouseMove(document, { clientX: 540, clientY: 440 });

      expect(mockOnPositionChange).toHaveBeenLastCalledWith(54, 55);
      expect(mockOnPositionChange.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe('Component Lifecycle', () => {
    it('should cleanup event listeners on unmount', () => {
      const image = createMockImage({ isLocked: false });
      const { container, unmount } = render(
        <div style={{ width: '1000px', height: '800px' }}>
          <ReferenceImageOverlay image={image} {...defaultProps} />
        </div>
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      fireEvent.mouseDown(overlayElement!, { clientX: 100, clientY: 100 });

      unmount();

      fireEvent.mouseMove(document, { clientX: 200, clientY: 200 });
      fireEvent.mouseUp(document);

      expect(mockOnPositionChange).not.toHaveBeenCalled();
    });

    it('should maintain original drag state when image properties change during drag', () => {
      const image = createMockImage({ x: 10, y: 20, isLocked: false });

      const { container, rerender } = render(
        <div style={{ width: '1000px', height: '800px' }}>
          <ReferenceImageOverlay image={image} {...defaultProps} />
        </div>
      );

      const overlayElement = container.querySelector('.reference-image-overlay');
      const parentElement = overlayElement!.parentElement!;

      vi.spyOn(parentElement, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 800,
        left: 0,
        top: 0,
        right: 1000,
        bottom: 800,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      fireEvent.mouseDown(overlayElement!, { clientX: 500, clientY: 400 });

      const updatedImage = createMockImage({ x: 30, y: 40, isLocked: false });
      rerender(
        <div style={{ width: '1000px', height: '800px' }}>
          <ReferenceImageOverlay image={updatedImage} {...defaultProps} />
        </div>
      );

      fireEvent.mouseMove(document, { clientX: 600, clientY: 500 });

      expect(mockOnPositionChange).toHaveBeenCalledWith(20, 32.5);
    });
  });
});
