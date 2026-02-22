import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BinCustomizationPanel } from './BinCustomizationPanel';
import type { BinCustomization } from '../types/gridfinity';
import { DEFAULT_BIN_CUSTOMIZATION } from '../types/gridfinity';

describe('BinCustomizationPanel', () => {
  const mockOnChange = vi.fn();
  const mockOnReset = vi.fn();

  const nonDefaultCustomization: BinCustomization = {
    wallPattern: 'grid',
    lipStyle: 'reduced',
    fingerSlide: 'rounded',
    wallCutout: 'vertical',
  };

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnReset.mockClear();
  });

  describe('Rendering', () => {
    it('should render all four customization selects', () => {
      render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByLabelText(/wall pattern/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/lip style/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/finger slide/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/wall cutout/i)).toBeInTheDocument();
    });

    it('should render a reset button', () => {
      render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });
  });

  describe('Displaying current customization values', () => {
    it('should display current wallPattern value in the select', () => {
      render(
        <BinCustomizationPanel
          customization={nonDefaultCustomization}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const wallPatternSelect = screen.getByLabelText(/wall pattern/i) as HTMLSelectElement;
      expect(wallPatternSelect.value).toBe('grid');
    });

    it('should display current lipStyle value in the select', () => {
      render(
        <BinCustomizationPanel
          customization={nonDefaultCustomization}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const lipStyleSelect = screen.getByLabelText(/lip style/i) as HTMLSelectElement;
      expect(lipStyleSelect.value).toBe('reduced');
    });

    it('should display current fingerSlide value in the select', () => {
      render(
        <BinCustomizationPanel
          customization={nonDefaultCustomization}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const fingerSlideSelect = screen.getByLabelText(/finger slide/i) as HTMLSelectElement;
      expect(fingerSlideSelect.value).toBe('rounded');
    });

    it('should display current wallCutout value in the select', () => {
      render(
        <BinCustomizationPanel
          customization={nonDefaultCustomization}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const wallCutoutSelect = screen.getByLabelText(/wall cutout/i) as HTMLSelectElement;
      expect(wallCutoutSelect.value).toBe('vertical');
    });
  });

  describe('Default values when customization is undefined', () => {
    it('should show default wallPattern when customization is undefined', () => {
      render(
        <BinCustomizationPanel
          customization={undefined}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const wallPatternSelect = screen.getByLabelText(/wall pattern/i) as HTMLSelectElement;
      expect(wallPatternSelect.value).toBe(DEFAULT_BIN_CUSTOMIZATION.wallPattern);
    });

    it('should show default lipStyle when customization is undefined', () => {
      render(
        <BinCustomizationPanel
          customization={undefined}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const lipStyleSelect = screen.getByLabelText(/lip style/i) as HTMLSelectElement;
      expect(lipStyleSelect.value).toBe(DEFAULT_BIN_CUSTOMIZATION.lipStyle);
    });

    it('should show default fingerSlide when customization is undefined', () => {
      render(
        <BinCustomizationPanel
          customization={undefined}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const fingerSlideSelect = screen.getByLabelText(/finger slide/i) as HTMLSelectElement;
      expect(fingerSlideSelect.value).toBe(DEFAULT_BIN_CUSTOMIZATION.fingerSlide);
    });

    it('should show default wallCutout when customization is undefined', () => {
      render(
        <BinCustomizationPanel
          customization={undefined}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const wallCutoutSelect = screen.getByLabelText(/wall cutout/i) as HTMLSelectElement;
      expect(wallCutoutSelect.value).toBe(DEFAULT_BIN_CUSTOMIZATION.wallCutout);
    });
  });

  describe('onChange callbacks', () => {
    it('should call onChange with updated wallPattern when wall pattern select changes', () => {
      render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const wallPatternSelect = screen.getByLabelText(/wall pattern/i);
      fireEvent.change(wallPatternSelect, { target: { value: 'hexgrid' } });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ wallPattern: 'hexgrid' })
      );
    });

    it('should call onChange with updated lipStyle when lip style select changes', () => {
      render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const lipStyleSelect = screen.getByLabelText(/lip style/i);
      fireEvent.change(lipStyleSelect, { target: { value: 'minimum' } });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ lipStyle: 'minimum' })
      );
    });

    it('should call onChange with updated fingerSlide when finger slide select changes', () => {
      render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const fingerSlideSelect = screen.getByLabelText(/finger slide/i);
      fireEvent.change(fingerSlideSelect, { target: { value: 'chamfered' } });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ fingerSlide: 'chamfered' })
      );
    });

    it('should call onChange with updated wallCutout when wall cutout select changes', () => {
      render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const wallCutoutSelect = screen.getByLabelText(/wall cutout/i);
      fireEvent.change(wallCutoutSelect, { target: { value: 'both' } });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ wallCutout: 'both' })
      );
    });

    it('should preserve other customization fields when changing wallPattern', () => {
      render(
        <BinCustomizationPanel
          customization={nonDefaultCustomization}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const wallPatternSelect = screen.getByLabelText(/wall pattern/i);
      fireEvent.change(wallPatternSelect, { target: { value: 'voronoi' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        wallPattern: 'voronoi',
        lipStyle: 'reduced',
        fingerSlide: 'rounded',
        wallCutout: 'vertical',
      });
    });

    it('should preserve other customization fields when changing lipStyle', () => {
      render(
        <BinCustomizationPanel
          customization={nonDefaultCustomization}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const lipStyleSelect = screen.getByLabelText(/lip style/i);
      fireEvent.change(lipStyleSelect, { target: { value: 'none' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        wallPattern: 'grid',
        lipStyle: 'none',
        fingerSlide: 'rounded',
        wallCutout: 'vertical',
      });
    });
  });

  describe('onReset callback', () => {
    it('should call onReset when reset button is clicked', () => {
      render(
        <BinCustomizationPanel
          customization={nonDefaultCustomization}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });

    it('should not call onChange when reset button is clicked', () => {
      render(
        <BinCustomizationPanel
          customization={nonDefaultCustomization}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Reset button disabled state', () => {
    it('should disable reset button when customization is undefined', () => {
      render(
        <BinCustomizationPanel
          customization={undefined}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
    });

    it('should disable reset button when customization matches default values', () => {
      render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
    });

    it('should enable reset button when customization differs from defaults', () => {
      render(
        <BinCustomizationPanel
          customization={nonDefaultCustomization}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reset/i })).not.toBeDisabled();
    });

    it('should enable reset button when only wallPattern differs from default', () => {
      render(
        <BinCustomizationPanel
          customization={{ ...DEFAULT_BIN_CUSTOMIZATION, wallPattern: 'grid' }}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reset/i })).not.toBeDisabled();
    });

    it('should enable reset button when only lipStyle differs from default', () => {
      render(
        <BinCustomizationPanel
          customization={{ ...DEFAULT_BIN_CUSTOMIZATION, lipStyle: 'none' }}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reset/i })).not.toBeDisabled();
    });

    it('should enable reset button when only fingerSlide differs from default', () => {
      render(
        <BinCustomizationPanel
          customization={{ ...DEFAULT_BIN_CUSTOMIZATION, fingerSlide: 'chamfered' }}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reset/i })).not.toBeDisabled();
    });

    it('should enable reset button when only wallCutout differs from default', () => {
      render(
        <BinCustomizationPanel
          customization={{ ...DEFAULT_BIN_CUSTOMIZATION, wallCutout: 'horizontal' }}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reset/i })).not.toBeDisabled();
    });

    it('should not call onReset when disabled reset button is clicked', () => {
      render(
        <BinCustomizationPanel
          customization={undefined}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      expect(mockOnReset).not.toHaveBeenCalled();
    });
  });

  describe('Wall pattern select options', () => {
    it('should have all 6 wall pattern options (none, grid, hexgrid, voronoi, voronoigrid, voronoihexgrid)', () => {
      render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const wallPatternSelect = screen.getByLabelText(/wall pattern/i);
      const options = Array.from((wallPatternSelect as HTMLSelectElement).options).map(
        (opt) => opt.value
      );

      expect(options).toContain('none');
      expect(options).toContain('grid');
      expect(options).toContain('hexgrid');
      expect(options).toContain('voronoi');
      expect(options).toContain('voronoigrid');
      expect(options).toContain('voronoihexgrid');
    });

    it('should have exactly 6 wall pattern options', () => {
      render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const wallPatternSelect = screen.getByLabelText(/wall pattern/i);
      const options = (wallPatternSelect as HTMLSelectElement).options;

      expect(options).toHaveLength(6);
    });
  });

  describe('Lip style select options', () => {
    it('should have all 4 lip style options (normal, reduced, minimum, none)', () => {
      render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const lipStyleSelect = screen.getByLabelText(/lip style/i);
      const options = Array.from((lipStyleSelect as HTMLSelectElement).options).map(
        (opt) => opt.value
      );

      expect(options).toContain('normal');
      expect(options).toContain('reduced');
      expect(options).toContain('minimum');
      expect(options).toContain('none');
    });
  });

  describe('Finger slide select options', () => {
    it('should have all 3 finger slide options (none, rounded, chamfered)', () => {
      render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const fingerSlideSelect = screen.getByLabelText(/finger slide/i);
      const options = Array.from((fingerSlideSelect as HTMLSelectElement).options).map(
        (opt) => opt.value
      );

      expect(options).toContain('none');
      expect(options).toContain('rounded');
      expect(options).toContain('chamfered');
    });
  });

  describe('Wall cutout select options', () => {
    it('should have all 4 wall cutout options (none, vertical, horizontal, both)', () => {
      render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const wallCutoutSelect = screen.getByLabelText(/wall cutout/i);
      const options = Array.from((wallCutoutSelect as HTMLSelectElement).options).map(
        (opt) => opt.value
      );

      expect(options).toContain('none');
      expect(options).toContain('vertical');
      expect(options).toContain('horizontal');
      expect(options).toContain('both');
    });
  });

  describe('Props updates (rerender)', () => {
    it('should update displayed values when customization prop changes', () => {
      const { rerender } = render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const wallPatternSelect = screen.getByLabelText(/wall pattern/i) as HTMLSelectElement;
      expect(wallPatternSelect.value).toBe('none');

      rerender(
        <BinCustomizationPanel
          customization={nonDefaultCustomization}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(wallPatternSelect.value).toBe('grid');
    });

    it('should update reset button disabled state when customization prop changes to default', () => {
      const { rerender } = render(
        <BinCustomizationPanel
          customization={nonDefaultCustomization}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reset/i })).not.toBeDisabled();

      rerender(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
    });

    it('should update reset button disabled state when customization prop changes from default to non-default', () => {
      const { rerender } = render(
        <BinCustomizationPanel
          customization={DEFAULT_BIN_CUSTOMIZATION}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();

      rerender(
        <BinCustomizationPanel
          customization={nonDefaultCustomization}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /reset/i })).not.toBeDisabled();
    });
  });
});
