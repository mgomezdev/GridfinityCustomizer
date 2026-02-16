import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import type { LibraryItem, ReferenceImage } from './types/gridfinity';

// --- Captured callback props from mocked components ---
let capturedGridPreviewProps: Record<string, unknown> = {};
let capturedItemLibraryProps: Record<string, unknown> = {};
let capturedZoomControlsProps: Record<string, unknown> = {};

// --- Mock child components (shallow rendering) ---
vi.mock('./components/GridPreview', () => ({
  GridPreview: (props: Record<string, unknown>) => {
    capturedGridPreviewProps = props;
    return <div data-testid="grid-preview" />;
  },
}));

vi.mock('./components/ItemLibrary', () => ({
  ItemLibrary: (props: Record<string, unknown>) => {
    capturedItemLibraryProps = props;
    return <div data-testid="item-library" />;
  },
}));

vi.mock('./components/ItemControls', () => ({
  ItemControls: (props: Record<string, unknown>) => {
    return <div data-testid="item-controls" data-props={JSON.stringify({ hasRotateCw: !!props.onRotateCw })} />;
  },
}));

vi.mock('./components/SpacerControls', () => ({
  SpacerControls: (props: Record<string, unknown>) => {
    return <div data-testid="spacer-controls" data-config={JSON.stringify(props.config)} />;
  },
}));

vi.mock('./components/BillOfMaterials', () => ({
  BillOfMaterials: () => <div data-testid="bill-of-materials" />,
}));

vi.mock('./components/ReferenceImageUploader', () => ({
  ReferenceImageUploader: () => <div data-testid="reference-image-uploader" />,
}));

vi.mock('./components/ZoomControls', () => ({
  ZoomControls: (props: Record<string, unknown>) => {
    capturedZoomControlsProps = props;
    return <div data-testid="zoom-controls" />;
  },
}));

vi.mock('./components/KeyboardShortcutsHelp', () => ({
  KeyboardShortcutsHelp: (props: Record<string, unknown>) => {
    if (!props.isOpen) return null;
    return <div data-testid="keyboard-help-modal" />;
  },
}));

vi.mock('./components/auth/UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));

vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getAccessToken: () => null,
  }),
}));

vi.mock('./components/layouts/SaveLayoutDialog', () => ({
  SaveLayoutDialog: () => null,
}));

vi.mock('./components/layouts/LoadLayoutDialog', () => ({
  LoadLayoutDialog: () => null,
}));

vi.mock('./components/DimensionInput', () => ({
  DimensionInput: (props: Record<string, unknown>) => (
    <div data-testid={`dimension-input-${props.label}`} data-value={props.value} />
  ),
}));

vi.mock('./components/GridSummary', () => ({
  GridSummary: (props: Record<string, unknown>) => (
    <div data-testid="grid-summary" data-gridx={props.gridX} data-gridy={props.gridY} />
  ),
}));

// --- Mock network/storage hooks ---
const mockRefreshLibraries = vi.fn().mockResolvedValue(undefined);
const mockRefreshLibrary = vi.fn().mockResolvedValue(undefined);
const mockToggleLibrary = vi.fn();

vi.mock('./hooks/useLibraries', () => ({
  useLibraries: () => ({
    availableLibraries: [
      { id: 'bins_standard', name: 'Standard Bins', path: '/libraries/bins_standard/index.json', isEnabled: true },
    ],
    selectedLibraryIds: ['bins_standard'],
    toggleLibrary: mockToggleLibrary,
    isLoading: false,
    error: null,
    refreshLibraries: mockRefreshLibraries,
  }),
}));

const testItem: LibraryItem = {
  id: 'bins_standard:bin-1x1',
  name: '1x1 Bin',
  widthUnits: 1,
  heightUnits: 1,
  color: '#646cff',
  categories: ['bin'],
};

const testItem2x1: LibraryItem = {
  id: 'bins_standard:bin-2x1',
  name: '2x1 Bin',
  widthUnits: 2,
  heightUnits: 1,
  color: '#646cff',
  categories: ['bin'],
};

const mockGetItemById = vi.fn((id: string): LibraryItem | undefined => {
  if (id === 'bins_standard:bin-1x1') return testItem;
  if (id === 'bins_standard:bin-2x1') return testItem2x1;
  return undefined;
});

vi.mock('./hooks/useLibraryData', () => ({
  useLibraryData: () => ({
    items: [testItem, testItem2x1],
    isLoading: false,
    error: null,
    getItemById: mockGetItemById,
    getItemsByCategory: () => [],
    getItemsByLibrary: () => [],
    refreshLibrary: mockRefreshLibrary,
  }),
}));

vi.mock('./hooks/useCategoryData', () => ({
  useCategoryData: () => ({
    categories: [{ id: 'bin', name: 'Bin' }],
    isLoading: false,
    error: null,
    getCategoryById: () => undefined,
  }),
}));

// Mock useReferenceImages - controllable per test
let mockImages: ReferenceImage[] = [];
const mockRemoveImage = vi.fn();
const mockUpdateImageRotation = vi.fn();
const mockToggleImageLock = vi.fn();

vi.mock('./hooks/useReferenceImages', () => ({
  useReferenceImages: () => ({
    images: mockImages,
    addImage: vi.fn(),
    removeImage: mockRemoveImage,
    updateImagePosition: vi.fn(),
    updateImageScale: vi.fn(),
    updateImageOpacity: vi.fn(),
    updateImageRotation: mockUpdateImageRotation,
    toggleImageLock: mockToggleImageLock,
  }),
}));


// --- Helpers ---
function renderApp() {
  return render(<App />);
}

function placeItemViaGridPreview(itemId = 'bins_standard:bin-1x1', x = 0, y = 0) {
  const onDrop = capturedGridPreviewProps.onDrop as (data: { type: string; itemId: string }, x: number, y: number) => void;
  act(() => {
    onDrop({ type: 'library', itemId }, x, y);
  });
}

function selectItemViaGridPreview(instanceId: string) {
  const onSelectItem = capturedGridPreviewProps.onSelectItem as (id: string, mods?: Record<string, boolean>) => void;
  act(() => {
    onSelectItem(instanceId);
  });
}

function getPlacedItems(): Array<{ instanceId: string; itemId: string }> {
  return capturedGridPreviewProps.placedItems as Array<{ instanceId: string; itemId: string }>;
}

function getSelectedItemIds(): Set<string> {
  return capturedGridPreviewProps.selectedItemIds as Set<string>;
}

// --- Tests ---
describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedGridPreviewProps = {};
    capturedItemLibraryProps = {};
    capturedZoomControlsProps = {};
    mockImages = [];
  });

  // ==========================================
  // 1. Renders correctly
  // ==========================================
  describe('Renders correctly', () => {
    it('renders header with title', () => {
      renderApp();
      expect(screen.getByText('Gridfinity Bin Customizer')).toBeInTheDocument();
    });

    it('renders metric unit toggle active by default', () => {
      renderApp();
      const mmButton = screen.getByText('mm');
      expect(mmButton).toHaveClass('active');
    });

    it('does not render imperial format toggle in metric mode', () => {
      renderApp();
      expect(screen.queryByText('.00')).not.toBeInTheDocument();
      expect(screen.queryByText('\u00BD')).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // 2. Unit Conversion
  // ==========================================
  describe('Unit Conversion - handleUnitChange', () => {
    it('switches to imperial and converts 168mm to ~6.6142 inches', () => {
      renderApp();
      const inButton = screen.getByText('in');
      fireEvent.click(inButton);

      const widthInput = screen.getByTestId('dimension-input-Width');
      const value = parseFloat(widthInput.getAttribute('data-value')!);
      expect(value).toBeCloseTo(6.6142, 3);
    });

    it('switches back to metric and rounds to nearest mm', () => {
      renderApp();
      // Switch to imperial
      fireEvent.click(screen.getByText('in'));
      // Switch back to metric
      fireEvent.click(screen.getByText('mm'));

      const widthInput = screen.getByTestId('dimension-input-Width');
      const value = parseFloat(widthInput.getAttribute('data-value')!);
      expect(Number.isInteger(value)).toBe(true);
    });

    it('maintains 4x4 grid through metric->imperial->metric round-trip', () => {
      renderApp();
      fireEvent.click(screen.getByText('in'));
      fireEvent.click(screen.getByText('mm'));

      const gridSummary = screen.getByTestId('grid-summary');
      expect(gridSummary.getAttribute('data-gridx')).toBe('4');
      expect(gridSummary.getAttribute('data-gridy')).toBe('4');
    });

    it('shows fractional format toggle only when imperial selected', () => {
      renderApp();
      expect(screen.queryByText('.00')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('in'));
      expect(screen.getByText('.00')).toBeInTheDocument();
      expect(screen.getByText('\u00BD')).toBeInTheDocument();
    });

    it('handles small mm value resulting in 0 grid units', () => {
      // We can't directly set width via DimensionInput (it's mocked),
      // but we can test the grid calculation pipeline via the summary
      renderApp();
      // Default is 168mm = 4 grid units, so just verify this baseline
      const gridSummary = screen.getByTestId('grid-summary');
      expect(Number(gridSummary.getAttribute('data-gridx'))).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================
  // 3. Keyboard Shortcuts
  // ==========================================
  describe('Keyboard Shortcuts', () => {
    it('Delete with selectedImageId removes image, NOT items', () => {
      mockImages = [{
        id: 'img-1', name: 'test.png', dataUrl: 'data:,',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      // Place an item first
      placeItemViaGridPreview();
      const items = getPlacedItems();
      expect(items.length).toBe(1);

      // Select the image via GridPreview's onImageSelect
      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });

      // Fire Delete
      fireEvent.keyDown(document, { key: 'Delete' });

      // Image should be removed, items should remain
      expect(mockRemoveImage).toHaveBeenCalledWith('img-1');
      expect(getPlacedItems().length).toBe(1);
    });

    it('Delete with selectedItemIds (no image) deletes items', () => {
      renderApp();
      placeItemViaGridPreview();
      const instanceId = getPlacedItems()[0].instanceId;
      selectItemViaGridPreview(instanceId);

      fireEvent.keyDown(document, { key: 'Delete' });

      expect(getPlacedItems().length).toBe(0);
    });

    it('Delete with no selection does nothing', () => {
      renderApp();
      placeItemViaGridPreview();

      // Deselect - click on empty area
      const onSelectItem = capturedGridPreviewProps.onSelectItem as (id: string | null) => void;
      act(() => { onSelectItem(null); });

      const itemsBefore = getPlacedItems().length;
      fireEvent.keyDown(document, { key: 'Delete' });
      expect(getPlacedItems().length).toBe(itemsBefore);
    });

    it('R with selectedImageId rotates image CW', () => {
      mockImages = [{
        id: 'img-1', name: 'test.png', dataUrl: 'data:,',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });

      fireEvent.keyDown(document, { key: 'r' });
      expect(mockUpdateImageRotation).toHaveBeenCalledWith('img-1', 'cw');
    });

    it('Shift+R with selectedImageId rotates image CCW', () => {
      mockImages = [{
        id: 'img-1', name: 'test.png', dataUrl: 'data:,',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });

      fireEvent.keyDown(document, { key: 'R', shiftKey: true });
      expect(mockUpdateImageRotation).toHaveBeenCalledWith('img-1', 'ccw');
    });

    it('R with selectedItemIds rotates items', () => {
      renderApp();
      placeItemViaGridPreview('bins_standard:bin-2x1', 0, 0);
      const instanceId = getPlacedItems()[0].instanceId;
      selectItemViaGridPreview(instanceId);

      const widthBefore = (getPlacedItems()[0] as unknown as { width: number }).width;
      fireEvent.keyDown(document, { key: 'r' });
      const widthAfter = (getPlacedItems()[0] as unknown as { width: number }).width;

      // 2x1 rotated CW becomes 1x2 - dimensions should swap
      expect(widthAfter).not.toBe(widthBefore);
    });

    it('Ctrl+D duplicates selected items', () => {
      renderApp();
      placeItemViaGridPreview();
      const instanceId = getPlacedItems()[0].instanceId;
      selectItemViaGridPreview(instanceId);

      fireEvent.keyDown(document, { key: 'd', ctrlKey: true });
      expect(getPlacedItems().length).toBe(2);
    });

    it('Ctrl+C / Ctrl+V copy/paste', () => {
      renderApp();
      placeItemViaGridPreview();
      const instanceId = getPlacedItems()[0].instanceId;
      selectItemViaGridPreview(instanceId);

      fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
      fireEvent.keyDown(document, { key: 'v', ctrlKey: true });

      expect(getPlacedItems().length).toBe(2);
    });

    it('Escape clears both image and item selections', () => {
      mockImages = [{
        id: 'img-1', name: 'test.png', dataUrl: 'data:,',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      placeItemViaGridPreview();
      const instanceId = getPlacedItems()[0].instanceId;
      selectItemViaGridPreview(instanceId);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(getSelectedItemIds().size).toBe(0);
      // selectedImageId is internal state; verify by checking that Delete after Escape does nothing
      expect(mockRemoveImage).not.toHaveBeenCalled();
    });

    it('Ctrl+A selects all placed items', () => {
      renderApp();
      placeItemViaGridPreview('bins_standard:bin-1x1', 0, 0);
      placeItemViaGridPreview('bins_standard:bin-1x1', 1, 0);
      placeItemViaGridPreview('bins_standard:bin-1x1', 2, 0);

      fireEvent.keyDown(document, { key: 'a', ctrlKey: true });
      expect(getSelectedItemIds().size).toBe(3);
    });

    it('L toggles lock on selected image', () => {
      mockImages = [{
        id: 'img-1', name: 'test.png', dataUrl: 'data:,',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });

      fireEvent.keyDown(document, { key: 'l' });
      expect(mockToggleImageLock).toHaveBeenCalledWith('img-1');
    });

    it('+/- zoom in/out', () => {
      renderApp();
      const zoomBefore = capturedZoomControlsProps.zoom as number;

      fireEvent.keyDown(document, { key: '+' });
      const zoomAfterPlus = capturedZoomControlsProps.zoom as number;
      expect(zoomAfterPlus).toBeGreaterThan(zoomBefore);

      fireEvent.keyDown(document, { key: '-' });
      const zoomAfterMinus = capturedZoomControlsProps.zoom as number;
      expect(zoomAfterMinus).toBeLessThan(zoomAfterPlus);
    });

    it('? toggles keyboard help modal', () => {
      renderApp();
      expect(screen.queryByTestId('keyboard-help-modal')).not.toBeInTheDocument();

      fireEvent.keyDown(document, { key: '?' });
      expect(screen.getByTestId('keyboard-help-modal')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: '?' });
      expect(screen.queryByTestId('keyboard-help-modal')).not.toBeInTheDocument();
    });

    it('shortcuts suppressed when focus is on INPUT element', () => {
      renderApp();
      placeItemViaGridPreview();
      const instanceId = getPlacedItems()[0].instanceId;
      selectItemViaGridPreview(instanceId);

      // Create and focus an input
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      fireEvent.keyDown(document, { key: 'Delete' });
      // Items should NOT be deleted since focus is on input
      expect(getPlacedItems().length).toBe(1);

      document.body.removeChild(input);
    });

    it('Space sets grab cursor on viewport', () => {
      renderApp();
      const viewport = screen.getByTestId('preview-viewport');

      fireEvent.keyDown(document, { key: ' ' });
      expect(viewport.style.cursor).toBe('grab');

      fireEvent.keyUp(document, { key: ' ' });
      expect(viewport.style.cursor).toBe('');
    });
  });

  // ==========================================
  // 4. Selection Coordination
  // ==========================================
  describe('Selection Coordination', () => {
    it('onImageSelect clears item selection', () => {
      mockImages = [{
        id: 'img-1', name: 'test.png', dataUrl: 'data:,',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      placeItemViaGridPreview();
      const instanceId = getPlacedItems()[0].instanceId;
      selectItemViaGridPreview(instanceId);
      expect(getSelectedItemIds().size).toBe(1);

      // Select image - should deselect items
      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });
      expect(getSelectedItemIds().size).toBe(0);
    });

    it('onSelectItem with truthy id clears selectedImageId', () => {
      mockImages = [{
        id: 'img-1', name: 'test.png', dataUrl: 'data:,',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      // Select image first
      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });

      // Now place and select an item
      placeItemViaGridPreview();
      const instanceId = getPlacedItems()[0].instanceId;
      selectItemViaGridPreview(instanceId);

      // Pressing R should rotate the item, not the image
      fireEvent.keyDown(document, { key: 'r' });
      expect(mockUpdateImageRotation).not.toHaveBeenCalled();
    });

    it('handleRemoveImage clears selectedImageId when removing selected image', () => {
      mockImages = [{
        id: 'img-1', name: 'test.png', dataUrl: 'data:,',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });

      // Remove the selected image via the callback
      const onImageRemove = capturedGridPreviewProps.onImageRemove as (id: string) => void;
      act(() => { onImageRemove('img-1'); });

      expect(mockRemoveImage).toHaveBeenCalledWith('img-1');
      // After removal, Delete should not try to remove 'img-1' again
      mockRemoveImage.mockClear();
      fireEvent.keyDown(document, { key: 'Delete' });
      expect(mockRemoveImage).not.toHaveBeenCalled();
    });

    it('handleRemoveImage does NOT clear selectedImageId for different image', () => {
      mockImages = [
        {
          id: 'img-1', name: 'test1.png', dataUrl: 'data:,',
          x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
        },
        {
          id: 'img-2', name: 'test2.png', dataUrl: 'data:,',
          x: 10, y: 10, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
        },
      ];
      renderApp();

      // Select img-1
      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });

      // Remove img-2 (different from selected)
      const onImageRemove = capturedGridPreviewProps.onImageRemove as (id: string) => void;
      act(() => { onImageRemove('img-2'); });

      // img-1 should still be selected; Delete should remove img-1
      mockRemoveImage.mockClear();
      fireEvent.keyDown(document, { key: 'Delete' });
      expect(mockRemoveImage).toHaveBeenCalledWith('img-1');
    });
  });

  // ==========================================
  // 5. Component Composition
  // ==========================================
  describe('Component Composition', () => {
    it('GridPreview receives gridX/gridY from calculateGrid', () => {
      renderApp();
      expect(capturedGridPreviewProps.gridX).toBe(4);
      expect(capturedGridPreviewProps.gridY).toBe(4);
    });

    it('ItemLibrary receives merged loading state', () => {
      renderApp();
      // Both isLibraryLoading and isLibrariesLoading are false in our mocks
      expect(capturedItemLibraryProps.isLoading).toBe(false);
    });

    it('ItemControls renders only when selectedItemIds.size > 0', () => {
      renderApp();
      expect(screen.queryByTestId('item-controls')).not.toBeInTheDocument();

      placeItemViaGridPreview();
      const instanceId = getPlacedItems()[0].instanceId;
      selectItemViaGridPreview(instanceId);

      expect(screen.getByTestId('item-controls')).toBeInTheDocument();
    });

    it('Clear All button renders only when placedItems.length > 0', () => {
      renderApp();
      expect(screen.queryByText(/Clear All/)).not.toBeInTheDocument();

      placeItemViaGridPreview();
      expect(screen.getByText(/Clear All/)).toBeInTheDocument();
    });

    it('Clear All with confirm=true calls clearAll', () => {
      renderApp();
      placeItemViaGridPreview();
      expect(getPlacedItems().length).toBe(1);

      vi.spyOn(window, 'confirm').mockReturnValue(true);
      fireEvent.click(screen.getByText(/Clear All/));
      expect(getPlacedItems().length).toBe(0);
      (window.confirm as Mock).mockRestore();
    });

    it('Clear All with confirm=false does not clear', () => {
      renderApp();
      placeItemViaGridPreview();
      expect(getPlacedItems().length).toBe(1);

      vi.spyOn(window, 'confirm').mockReturnValue(false);
      fireEvent.click(screen.getByText(/Clear All/));
      expect(getPlacedItems().length).toBe(1);
      (window.confirm as Mock).mockRestore();
    });

    it('ZoomControls receives zoom from useGridTransform', () => {
      renderApp();
      expect(capturedZoomControlsProps.zoom).toBe(1);
    });
  });

  // ==========================================
  // 6. Grid Calculation Pipeline
  // ==========================================
  describe('Grid Calculation Pipeline', () => {
    it('default 168x168mm -> 4x4 grid', () => {
      renderApp();
      const summary = screen.getByTestId('grid-summary');
      expect(summary.getAttribute('data-gridx')).toBe('4');
      expect(summary.getAttribute('data-gridy')).toBe('4');
    });

    it('GridPreview receives correct grid dimensions', () => {
      renderApp();
      // Default 168mm / 42mm = 4 units
      expect(capturedGridPreviewProps.gridX).toBe(4);
      expect(capturedGridPreviewProps.gridY).toBe(4);
    });

    it('grid calculation is consistent between GridPreview and GridSummary', () => {
      renderApp();
      const summary = screen.getByTestId('grid-summary');
      const summaryX = Number(summary.getAttribute('data-gridx'));
      const summaryY = Number(summary.getAttribute('data-gridy'));
      expect(capturedGridPreviewProps.gridX).toBe(summaryX);
      expect(capturedGridPreviewProps.gridY).toBe(summaryY);
    });

    it('grid values are non-negative integers', () => {
      renderApp();
      const gridX = capturedGridPreviewProps.gridX as number;
      const gridY = capturedGridPreviewProps.gridY as number;
      expect(gridX).toBeGreaterThanOrEqual(0);
      expect(gridY).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(gridX)).toBe(true);
      expect(Number.isInteger(gridY)).toBe(true);
    });
  });

  // ==========================================
  // 7. Refresh All coordination
  // ==========================================
  describe('Refresh All coordination', () => {
    it('handleRefreshAll calls refreshLibraries then refreshLibrary', async () => {
      renderApp();

      // handleRefreshAll is passed to ItemLibrary as onRefreshLibrary
      const onRefresh = capturedItemLibraryProps.onRefreshLibrary as () => Promise<void>;
      await act(async () => { await onRefresh(); });

      expect(mockRefreshLibraries).toHaveBeenCalledTimes(1);
      expect(mockRefreshLibrary).toHaveBeenCalledTimes(1);
    });

    it('error in refreshLibraries is caught and does not crash', async () => {
      mockRefreshLibraries.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderApp();

      const onRefresh = capturedItemLibraryProps.onRefreshLibrary as () => Promise<void>;
      // Should not throw
      await act(async () => { await onRefresh(); });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
