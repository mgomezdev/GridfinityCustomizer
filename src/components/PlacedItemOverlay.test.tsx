import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlacedItemOverlay } from './PlacedItemOverlay';
import type { PlacedItemWithValidity, LibraryItem } from '../types/gridfinity';

describe('PlacedItemOverlay', () => {
  const mockGetItemById = (id: string): LibraryItem | undefined => {
    const items: Record<string, LibraryItem> = {
      'bin-1x1': { id: 'bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#646cff', categories: ['bin'] },
      'bin-2x2': { id: 'bin-2x2', name: '2x2 Bin', widthUnits: 2, heightUnits: 2, color: '#646cff', categories: ['bin'] },
    };
    return items[id];
  };

  const mockOnSelect = vi.fn();

  const createMockItem = (overrides?: Partial<PlacedItemWithValidity>): PlacedItemWithValidity => ({
    instanceId: 'test-item-1',
    itemId: 'bin-1x1',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    isRotated: false,
    isValid: true,
    ...overrides,
  });

  describe('Percentage-based Positioning', () => {
    it('should calculate left position as percentage of gridX', () => {
      const item = createMockItem({ x: 1, width: 1 });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({ left: '25%' }); // 1/4 = 25%
    });

    it('should calculate top position as percentage of gridY', () => {
      const item = createMockItem({ y: 2, height: 1 });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({ top: '50%' }); // 2/4 = 50%
    });

    it('should calculate width as percentage of gridX', () => {
      const item = createMockItem({ width: 2 });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({ width: '50%' }); // 2/4 = 50%
    });

    it('should calculate height as percentage of gridY', () => {
      const item = createMockItem({ height: 3 });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({ height: '75%' }); // 3/4 = 75%
    });

    it('should position item at (0, 0) as 0%', () => {
      const item = createMockItem({ x: 0, y: 0 });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({ left: '0%', top: '0%' });
    });

    it('should handle non-square grids correctly', () => {
      const item = createMockItem({ x: 2, y: 1, width: 1, height: 1 });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={5}
          gridY={3}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({
        left: '40%',    // 2/5 = 40%
        top: '33.33333333333333%',     // 1/3 = 33.33%
        width: '20%',   // 1/5 = 20%
        height: '33.33333333333333%',  // 1/3 = 33.33%
      });
    });

    it('should handle large bins spanning multiple units', () => {
      const item = createMockItem({ x: 1, y: 1, width: 3, height: 2 });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={5}
          gridY={5}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({
        left: '20%',   // 1/5 = 20%
        top: '20%',    // 1/5 = 20%
        width: '60%',  // 3/5 = 60%
        height: '40%', // 2/5 = 40%
      });
    });

    it('should position at maximum valid position correctly', () => {
      const item = createMockItem({ x: 3, y: 3, width: 1, height: 1 });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({
        left: '75%',
        top: '75%',
        width: '25%',
        height: '25%',
      });
    });
  });

  describe('Valid/Invalid Styling', () => {
    it('should apply valid item color when isValid is true', () => {
      const item = createMockItem({ isValid: true });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({
        backgroundColor: '#646cff66',
        borderColor: '#646cff',
      });
      expect(element).not.toHaveClass('invalid');
    });

    it('should apply invalid styling when isValid is false', () => {
      const item = createMockItem({ isValid: false });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({
        backgroundColor: '#ef444466',
        borderColor: '#ef4444',
      });
      expect(element).toHaveClass('invalid');
    });

    it('should use library item color for valid items', () => {
      const customGetItemById = () => ({
        id: 'custom-item',
        name: 'Custom',
        widthUnits: 1,
        heightUnits: 1,
        color: '#22c55e',
        categories: ['divider'],
      });

      const item = createMockItem({ isValid: true });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={customGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({
        backgroundColor: '#22c55e66',
        borderColor: '#22c55e',
      });
    });

    it('should use default color if library item not found', () => {
      const emptyGetItemById = () => undefined;

      const item = createMockItem({ isValid: true });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={emptyGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({
        backgroundColor: '#646cff66',
        borderColor: '#646cff',
      });
    });
  });

  describe('Selection State', () => {
    it('should apply selected class when isSelected is true', () => {
      const item = createMockItem();
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={true}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveClass('selected');
    });

    it('should not apply selected class when isSelected is false', () => {
      const item = createMockItem();
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).not.toHaveClass('selected');
    });
  });

  describe('Click Handling', () => {
    it('should call onSelect with instanceId when clicked', () => {
      const item = createMockItem({ instanceId: 'test-item-123' });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      fireEvent.click(element!);

      expect(mockOnSelect).toHaveBeenCalledWith('test-item-123');
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('should stop event propagation on click', () => {
      const item = createMockItem();
      const parentClickHandler = vi.fn();
      const { container } = render(
        <div onClick={parentClickHandler}>
          <PlacedItemOverlay
            item={item}
            gridX={4}
            gridY={4}
            isSelected={false}
            onSelect={mockOnSelect}
            getItemById={mockGetItemById}
          />
        </div>
      );

      const element = container.querySelector('.placed-item');
      fireEvent.click(element!);

      expect(mockOnSelect).toHaveBeenCalled();
      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe('Drag and Drop', () => {
    it('should be draggable', () => {
      const item = createMockItem();
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveAttribute('draggable', 'true');
    });

    it('should set correct drag data on drag start', () => {
      const item = createMockItem({ instanceId: 'drag-item-1', itemId: 'bin-2x2' });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      };

      fireEvent.dragStart(element!, { dataTransfer });

      expect(dataTransfer.setData).toHaveBeenCalledWith(
        'application/json',
        JSON.stringify({
          type: 'placed',
          itemId: 'bin-2x2',
          instanceId: 'drag-item-1',
        })
      );
      expect(dataTransfer.effectAllowed).toBe('move');
    });
  });

  describe('Label Display', () => {
    it('should display item name from library', () => {
      const item = createMockItem();
      render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      expect(screen.getByText('1x1 Bin')).toBeInTheDocument();
    });

    it('should handle missing library item gracefully', () => {
      const emptyGetItemById = () => undefined;
      const item = createMockItem();
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={emptyGetItemById}
        />
      );

      const label = container.querySelector('.placed-item-label');
      expect(label).toBeInTheDocument();
      expect(label?.textContent).toBe('');
    });

    it('should display custom item name', () => {
      const customGetItemById = () => ({
        id: 'organizer-2x3',
        name: '2x3 Organizer',
        widthUnits: 2,
        heightUnits: 3,
        color: '#f59e0b',
        categories: ['organizer'],
      });

      const item = createMockItem();
      render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={customGetItemById}
        />
      );

      expect(screen.getByText('2x3 Organizer')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero grid dimensions', () => {
      const item = createMockItem({ x: 0, y: 0, width: 1, height: 1 });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={0}
          gridY={0}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      // Division by zero results in Infinity
      expect(element).toBeInTheDocument();
    });

    it('should handle very small items', () => {
      const item = createMockItem({ x: 0, y: 0, width: 1, height: 1 });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={10}
          gridY={10}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({
        width: '10%',
        height: '10%',
      });
    });

    it('should handle both selected and invalid states', () => {
      const item = createMockItem({ isValid: false });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={true}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveClass('selected');
      expect(element).toHaveClass('invalid');
    });

    it('should render with rotated item dimensions', () => {
      const item = createMockItem({
        x: 1,
        y: 1,
        width: 2,
        height: 1,
        isRotated: true,
      });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({
        width: '50%',  // 2/4
        height: '25%', // 1/4
      });
    });
  });

  describe('Regression Tests', () => {
    it('should have placed-item class for CSS absolute positioning', () => {
      const item = createMockItem({ x: 0, y: 0, width: 1, height: 1 });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      // The .placed-item class applies position: absolute in CSS
      const element = container.querySelector('.placed-item');
      expect(element).toBeInTheDocument();
      expect(element).toHaveClass('placed-item');
    });

    it('should handle percentage precision with repeating decimals (1/3 grid)', () => {
      const item = createMockItem({ x: 1, y: 1, width: 1, height: 1 });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={3}
          gridY={3}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      // 1/3 = 33.33333...%
      expect(element).toHaveStyle({
        left: '33.33333333333333%',
        top: '33.33333333333333%',
        width: '33.33333333333333%',
        height: '33.33333333333333%',
      });
    });

    it('should handle large grid (100x100) calculations correctly', () => {
      const item = createMockItem({ x: 50, y: 75, width: 2, height: 3 });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={100}
          gridY={100}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemById}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({
        left: '50%',
        top: '75%',
        width: '2%',
        height: '3%',
      });
    });
  });

  describe('Image Rendering', () => {
    const mockGetItemByIdWithImage = (id: string): LibraryItem | undefined => {
      const items: Record<string, LibraryItem> = {
        'bin-with-image': {
          id: 'bin-with-image',
          name: 'Bin with Image',
          widthUnits: 1,
          heightUnits: 1,
          color: '#646cff',
          categories: ['bin'],
          imageUrl: 'https://example.com/image.png',
        },
        'bin-no-image': {
          id: 'bin-no-image',
          name: 'Bin without Image',
          widthUnits: 1,
          heightUnits: 1,
          color: '#646cff',
          categories: ['bin'],
        },
      };
      return items[id];
    };

    it('should render image when imageUrl is provided', () => {
      const item = createMockItem({ itemId: 'bin-with-image' });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemByIdWithImage}
        />
      );

      const image = container.querySelector('.placed-item-image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.png');
    });

    it('should have loading="lazy" attribute on image', () => {
      const item = createMockItem({ itemId: 'bin-with-image' });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemByIdWithImage}
        />
      );

      const image = container.querySelector('.placed-item-image');
      expect(image).toHaveAttribute('loading', 'lazy');
    });

    it('should use item name as alt text', () => {
      const item = createMockItem({ itemId: 'bin-with-image' });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemByIdWithImage}
        />
      );

      const image = container.querySelector('.placed-item-image');
      expect(image).toHaveAttribute('alt', 'Bin with Image');
    });

    it('should have hidden class before image loads', () => {
      const item = createMockItem({ itemId: 'bin-with-image' });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemByIdWithImage}
        />
      );

      const image = container.querySelector('.placed-item-image');
      expect(image).toHaveClass('hidden');
      expect(image).not.toHaveClass('visible');
    });

    it('should toggle to visible class when image loads', () => {
      const item = createMockItem({ itemId: 'bin-with-image' });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemByIdWithImage}
        />
      );

      const image = container.querySelector('.placed-item-image') as HTMLImageElement;
      expect(image).toHaveClass('hidden');

      fireEvent.load(image);

      expect(image).toHaveClass('visible');
      expect(image).not.toHaveClass('hidden');
    });

    it('should not render image when no imageUrl is provided', () => {
      const item = createMockItem({ itemId: 'bin-no-image' });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemByIdWithImage}
        />
      );

      const image = container.querySelector('.placed-item-image');
      expect(image).not.toBeInTheDocument();
    });

    it('should show colored background when no imageUrl is provided', () => {
      const item = createMockItem({ itemId: 'bin-no-image' });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemByIdWithImage}
        />
      );

      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({
        backgroundColor: '#646cff66',
        borderColor: '#646cff',
      });
    });

    it('should hide image and show colored background when image fails to load', () => {
      const item = createMockItem({ itemId: 'bin-with-image' });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemByIdWithImage}
        />
      );

      const image = container.querySelector('.placed-item-image') as HTMLImageElement;
      expect(image).toBeInTheDocument();

      fireEvent.error(image);

      // Image element should be removed from DOM after error
      const imageAfterError = container.querySelector('.placed-item-image');
      expect(imageAfterError).not.toBeInTheDocument();

      // Background color should still be visible
      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({
        backgroundColor: '#646cff66',
        borderColor: '#646cff',
      });
    });

    it('should show colored background while image is loading', () => {
      const item = createMockItem({ itemId: 'bin-with-image' });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemByIdWithImage}
        />
      );

      // Before image loads, background should be visible
      const element = container.querySelector('.placed-item');
      expect(element).toHaveStyle({
        backgroundColor: '#646cff66',
        borderColor: '#646cff',
      });
    });

    it('should handle imageUrl changing during load', () => {
      const item = createMockItem({ itemId: 'bin-with-image' });
      const { container, rerender } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemByIdWithImage}
        />
      );

      const image = container.querySelector('.placed-item-image') as HTMLImageElement;
      expect(image).toHaveAttribute('src', 'https://example.com/image.png');

      // Change the imageUrl
      const updatedGetItemById = (id: string): LibraryItem | undefined => {
        if (id === 'bin-with-image') {
          return {
            id: 'bin-with-image',
            name: 'Bin with Image',
            widthUnits: 1,
            heightUnits: 1,
            color: '#646cff',
            categories: ['bin'],
            imageUrl: 'https://example.com/new-image.png',
          };
        }
        return undefined;
      };

      rerender(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={updatedGetItemById}
        />
      );

      const newImage = container.querySelector('.placed-item-image');
      expect(newImage).toHaveAttribute('src', 'https://example.com/new-image.png');
      // Should be hidden again since it's a new URL
      expect(newImage).toHaveClass('hidden');
    });

    it('should render multiple placed items with images independently', () => {
      const item1 = createMockItem({ instanceId: 'item-1', itemId: 'bin-with-image', x: 0, y: 0 });
      const item2 = createMockItem({ instanceId: 'item-2', itemId: 'bin-with-image', x: 1, y: 0 });

      const { container } = render(
        <>
          <PlacedItemOverlay
            item={item1}
            gridX={4}
            gridY={4}
            isSelected={false}
            onSelect={mockOnSelect}
            getItemById={mockGetItemByIdWithImage}
          />
          <PlacedItemOverlay
            item={item2}
            gridX={4}
            gridY={4}
            isSelected={false}
            onSelect={mockOnSelect}
            getItemById={mockGetItemByIdWithImage}
          />
        </>
      );

      const images = container.querySelectorAll('.placed-item-image');
      expect(images).toHaveLength(2);
      expect(images[0]).toHaveClass('hidden');
      expect(images[1]).toHaveClass('hidden');

      // Load first image
      fireEvent.load(images[0]);
      expect(images[0]).toHaveClass('visible');
      expect(images[1]).toHaveClass('hidden');

      // Load second image
      fireEvent.load(images[1]);
      expect(images[0]).toHaveClass('visible');
      expect(images[1]).toHaveClass('visible');
    });

    it('should keep label visible on top of image', () => {
      const item = createMockItem({ itemId: 'bin-with-image' });
      const { container } = render(
        <PlacedItemOverlay
          item={item}
          gridX={4}
          gridY={4}
          isSelected={false}
          onSelect={mockOnSelect}
          getItemById={mockGetItemByIdWithImage}
        />
      );

      const label = container.querySelector('.placed-item-label');
      expect(label).toBeInTheDocument();
      expect(label?.textContent).toBe('Bin with Image');
    });
  });
});
