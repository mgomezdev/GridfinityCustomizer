import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarPanel } from './SidebarPanel';

describe('SidebarPanel', () => {
  const defaultProps = {
    dimensionsContent: <div data-testid="dimensions-content">Dimensions</div>,
    spacerContent: <div data-testid="spacer-content">Grid Settings</div>,
    onClearCanvas: vi.fn(),
    onReset: vi.fn(),
    isReadOnly: false,
  };

  describe('Nav rendering', () => {
    it('should render DIMENSIONS and GRID SETTINGS nav buttons', () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(screen.getByText('DIMENSIONS')).toBeInTheDocument();
      expect(screen.getByText('GRID SETTINGS')).toBeInTheDocument();
    });

    it('should render CLEAR CANVAS and RESET action buttons when not read-only', () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(screen.getByText('CLEAR CANVAS')).toBeInTheDocument();
      expect(screen.getByText('RESET')).toBeInTheDocument();
    });

    it('should not render CLEAR CANVAS when isReadOnly is true', () => {
      render(<SidebarPanel {...defaultProps} isReadOnly={true} />);

      expect(screen.queryByText('CLEAR CANVAS')).not.toBeInTheDocument();
      expect(screen.getByText('RESET')).toBeInTheDocument();
    });

    it('should mark DIMENSIONS as active by default', () => {
      render(<SidebarPanel {...defaultProps} />);

      const dimensionsBtn = screen.getByText('DIMENSIONS').closest('button');
      expect(dimensionsBtn?.className).toContain('active');
    });
  });

  describe('Section switching', () => {
    it('should show dimensionsContent by default', () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(screen.getByTestId('dimensions-content')).toBeInTheDocument();
      expect(screen.queryByTestId('spacer-content')).not.toBeInTheDocument();
    });

    it('should show spacerContent when GRID SETTINGS is clicked', () => {
      render(<SidebarPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('GRID SETTINGS'));

      expect(screen.getByTestId('spacer-content')).toBeInTheDocument();
      expect(screen.queryByTestId('dimensions-content')).not.toBeInTheDocument();
    });

    it('should switch back to dimensionsContent when DIMENSIONS is clicked', () => {
      render(<SidebarPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('GRID SETTINGS'));
      fireEvent.click(screen.getByText('DIMENSIONS'));

      expect(screen.getByTestId('dimensions-content')).toBeInTheDocument();
      expect(screen.queryByTestId('spacer-content')).not.toBeInTheDocument();
    });

    it('should mark GRID SETTINGS as active after clicking it', () => {
      render(<SidebarPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('GRID SETTINGS'));

      const gridBtn = screen.getByText('GRID SETTINGS').closest('button');
      expect(gridBtn?.className).toContain('active');

      const dimensionsBtn = screen.getByText('DIMENSIONS').closest('button');
      expect(dimensionsBtn?.className).not.toContain('active');
    });
  });

  describe('Action callbacks', () => {
    it('should call onClearCanvas when CLEAR CANVAS is clicked', () => {
      const onClearCanvas = vi.fn();
      render(<SidebarPanel {...defaultProps} onClearCanvas={onClearCanvas} />);

      fireEvent.click(screen.getByText('CLEAR CANVAS'));
      expect(onClearCanvas).toHaveBeenCalledTimes(1);
    });

    it('should call onReset when RESET is clicked', () => {
      const onReset = vi.fn();
      render(<SidebarPanel {...defaultProps} onReset={onReset} />);

      fireEvent.click(screen.getByText('RESET'));
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });
});
