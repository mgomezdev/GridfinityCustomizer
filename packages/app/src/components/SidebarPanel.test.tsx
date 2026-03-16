import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarPanel } from './SidebarPanel';

// Mock child components to keep tests focused on SidebarPanel logic
vi.mock('./ItemLibrary', () => ({
  ItemLibrary: () => <div data-testid="item-library" />,
}));

vi.mock('./RefImageLibrary', () => ({
  RefImageLibrary: () => <div data-testid="ref-image-library" />,
}));

describe('SidebarPanel', () => {
  const defaultProps = {
    sidebarTab: 'items' as const,
    onTabChange: vi.fn(),
    isAuthenticated: false,
    itemLibraryContent: <div data-testid="item-library-content" />,
    imageTabContent: <div data-testid="image-tab-content" />,
    selectionControls: null as React.ReactNode,
  };

  describe('Tab rendering', () => {
    it('should render Items and Images tab buttons', () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Items' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Images' })).toBeInTheDocument();
    });

    it('should mark Items tab as active when sidebarTab is items', () => {
      render(<SidebarPanel {...defaultProps} sidebarTab="items" />);

      const itemsBtn = screen.getByRole('button', { name: 'Items' });
      expect(itemsBtn.className).toContain('active');
    });

    it('should mark Images tab as active when sidebarTab is images', () => {
      render(<SidebarPanel {...defaultProps} sidebarTab="images" />);

      const imagesBtn = screen.getByRole('button', { name: 'Images' });
      expect(imagesBtn.className).toContain('active');
    });
  });

  describe('Tab switching', () => {
    it('should call onTabChange with items when Items tab is clicked', () => {
      const onTabChange = vi.fn();
      render(<SidebarPanel {...defaultProps} sidebarTab="images" onTabChange={onTabChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Items' }));
      expect(onTabChange).toHaveBeenCalledWith('items');
    });

    it('should call onTabChange with images when Images tab is clicked', () => {
      const onTabChange = vi.fn();
      render(<SidebarPanel {...defaultProps} onTabChange={onTabChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Images' }));
      expect(onTabChange).toHaveBeenCalledWith('images');
    });
  });

  describe('Content rendering', () => {
    it('should render itemLibraryContent when tab is items', () => {
      render(<SidebarPanel {...defaultProps} sidebarTab="items" />);

      expect(screen.getByTestId('item-library-content')).toBeInTheDocument();
      expect(screen.queryByTestId('image-tab-content')).not.toBeInTheDocument();
    });

    it('should render imageTabContent when tab is images', () => {
      render(<SidebarPanel {...defaultProps} sidebarTab="images" />);

      expect(screen.getByTestId('image-tab-content')).toBeInTheDocument();
      expect(screen.queryByTestId('item-library-content')).not.toBeInTheDocument();
    });

    it('should render selectionControls when provided', () => {
      render(
        <SidebarPanel
          {...defaultProps}
          selectionControls={<div data-testid="selection-controls" />}
        />
      );

      expect(screen.getByTestId('selection-controls')).toBeInTheDocument();
    });

    it('should not render selectionControls when null', () => {
      render(<SidebarPanel {...defaultProps} selectionControls={null} />);

      expect(screen.queryByTestId('selection-controls')).not.toBeInTheDocument();
    });
  });
});
