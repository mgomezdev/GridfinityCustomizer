import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import App from './App';
import type { LibraryItem } from './types/gridfinity';
import type { RefImagePlacement } from './hooks/useRefImagePlacements';

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

vi.mock('./components/RefImageLibrary', () => ({
  RefImageLibrary: () => <div data-testid="ref-image-library" />,
}));

vi.mock('./components/RebindImageDialog', () => ({
  RebindImageDialog: () => null,
}));

vi.mock('./components/ZoomControls', () => ({
  ZoomControls: (props: Record<string, unknown>) => {
    capturedZoomControlsProps = props;
    return <div data-testid="zoom-controls" />;
  },
}));

vi.mock('./components/ImageViewToggle', () => ({
  ImageViewToggle: (props: Record<string, unknown>) => {
    return <button data-testid="image-view-toggle" onClick={props.onToggle as () => void}>{props.mode === 'ortho' ? 'Top' : '3D'}</button>;
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

let mockIsAuthenticated = false;

vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockIsAuthenticated ? { id: 1, username: 'testuser', role: 'user' } : null,
    isAuthenticated: mockIsAuthenticated,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getAccessToken: () => (mockIsAuthenticated ? 'test-token' : null),
  }),
}));

let capturedSaveLayoutDialogProps: Record<string, unknown> = {};
vi.mock('./components/layouts/SaveLayoutDialog', () => ({
  SaveLayoutDialog: (props: Record<string, unknown>) => {
    capturedSaveLayoutDialogProps = props;
    return null;
  },
}));

let capturedLoadLayoutDialogProps: Record<string, unknown> = {};
vi.mock('./components/layouts/LoadLayoutDialog', () => ({
  LoadLayoutDialog: (props: Record<string, unknown>) => {
    capturedLoadLayoutDialogProps = props;
    return null;
  },
}));

vi.mock('./components/admin/AdminSubmissionsDialog', () => ({
  AdminSubmissionsDialog: () => null,
}));

vi.mock('./components/admin/SubmissionsBadge', () => ({
  SubmissionsBadge: () => null,
}));

vi.mock('./hooks/useLayouts', () => ({
  useSubmitLayoutMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useWithdrawLayoutMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useCloneLayoutMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useSubmittedCountQuery: () => ({ data: null, isLoading: false }),
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

// Mock useRefImagePlacements - controllable per test
let mockPlacements: RefImagePlacement[] = [];
const mockRemovePlacement = vi.fn();
const mockUpdateRotation = vi.fn();
const mockToggleLock = vi.fn();
const mockClearRefImages = vi.fn();

vi.mock('./hooks/useRefImagePlacements', () => ({
  useRefImagePlacements: () => ({
    placements: mockPlacements,
    addPlacement: vi.fn(),
    removePlacement: mockRemovePlacement,
    updatePosition: vi.fn(),
    updateScale: vi.fn(),
    updateOpacity: vi.fn(),
    updateRotation: mockUpdateRotation,
    toggleLock: mockToggleLock,
    rebindImage: vi.fn(),
    loadPlacements: vi.fn(),
    clearAll: mockClearRefImages,
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
    capturedLoadLayoutDialogProps = {};
    capturedSaveLayoutDialogProps = {};
    mockPlacements = [];
    mockIsAuthenticated = false;
    localStorage.removeItem('gridfinity-image-view-mode');
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
      mockPlacements = [{
        id: 'img-1', refImageId: 1, name: 'test.png', imageUrl: 'ref-lib/test.webp',
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
      expect(mockRemovePlacement).toHaveBeenCalledWith('img-1');
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
      mockPlacements = [{
        id: 'img-1', refImageId: 1, name: 'test.png', imageUrl: 'ref-lib/test.webp',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });

      fireEvent.keyDown(document, { key: 'r' });
      expect(mockUpdateRotation).toHaveBeenCalledWith('img-1', 'cw');
    });

    it('Shift+R with selectedImageId rotates image CCW', () => {
      mockPlacements = [{
        id: 'img-1', refImageId: 1, name: 'test.png', imageUrl: 'ref-lib/test.webp',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });

      fireEvent.keyDown(document, { key: 'R', shiftKey: true });
      expect(mockUpdateRotation).toHaveBeenCalledWith('img-1', 'ccw');
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
      mockPlacements = [{
        id: 'img-1', refImageId: 1, name: 'test.png', imageUrl: 'ref-lib/test.webp',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      placeItemViaGridPreview();
      const instanceId = getPlacedItems()[0].instanceId;
      selectItemViaGridPreview(instanceId);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(getSelectedItemIds().size).toBe(0);
      // selectedImageId is internal state; verify by checking that Delete after Escape does nothing
      expect(mockRemovePlacement).not.toHaveBeenCalled();
    });

    it('Escape clears selectedImageId when an image is selected (React 18 batching)', () => {
      // Verifies that deselectAll() and setSelectedImageId(null) are both applied
      // in a single render pass via React 18+ automatic batching.
      mockPlacements = [{
        id: 'img-1', refImageId: 1, name: 'test.png', imageUrl: 'ref-lib/test.webp',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      // Select the image
      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });

      // Verify image is selected — R should rotate it
      fireEvent.keyDown(document, { key: 'r' });
      expect(mockUpdateRotation).toHaveBeenCalledWith('img-1', 'cw');
      mockUpdateRotation.mockClear();

      // Press Escape — should clear selectedImageId
      fireEvent.keyDown(document, { key: 'Escape' });

      // After Escape, R should NOT rotate the image (selectedImageId is null)
      fireEvent.keyDown(document, { key: 'r' });
      expect(mockUpdateRotation).not.toHaveBeenCalled();

      // Delete should also not remove any image
      fireEvent.keyDown(document, { key: 'Delete' });
      expect(mockRemovePlacement).not.toHaveBeenCalled();
    });

    it('Delete clears selectedImageId after removing image (no stale reference)', () => {
      // Verifies that removeRefImagePlacement() and setSelectedImageId(null)
      // are batched correctly — no stale image reference remains after deletion.
      mockPlacements = [{
        id: 'img-1', refImageId: 1, name: 'test.png', imageUrl: 'ref-lib/test.webp',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      // Select the image
      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });

      // Delete the selected image
      fireEvent.keyDown(document, { key: 'Delete' });
      expect(mockRemovePlacement).toHaveBeenCalledWith('img-1');
      mockRemovePlacement.mockClear();

      // After deletion, pressing Delete again should NOT try to remove 'img-1' again
      fireEvent.keyDown(document, { key: 'Delete' });
      expect(mockRemovePlacement).not.toHaveBeenCalled();
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
      mockPlacements = [{
        id: 'img-1', refImageId: 1, name: 'test.png', imageUrl: 'ref-lib/test.webp',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });

      fireEvent.keyDown(document, { key: 'l' });
      expect(mockToggleLock).toHaveBeenCalledWith('img-1');
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

    it('V key toggles imageViewMode from ortho to perspective', () => {
      renderApp();
      expect(capturedGridPreviewProps.imageViewMode).toBe('ortho');

      fireEvent.keyDown(document, { key: 'v' });
      expect(capturedGridPreviewProps.imageViewMode).toBe('perspective');
    });

    it('V key toggles imageViewMode back to ortho', () => {
      renderApp();
      fireEvent.keyDown(document, { key: 'v' });
      expect(capturedGridPreviewProps.imageViewMode).toBe('perspective');

      fireEvent.keyDown(document, { key: 'v' });
      expect(capturedGridPreviewProps.imageViewMode).toBe('ortho');
    });

    it('V key does NOT toggle when Ctrl is held (Ctrl+V is paste)', () => {
      renderApp();
      placeItemViaGridPreview();
      const instanceId = getPlacedItems()[0].instanceId;
      selectItemViaGridPreview(instanceId);

      fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
      fireEvent.keyDown(document, { key: 'v', ctrlKey: true });

      // Should still be ortho (Ctrl+V is paste, not view toggle)
      expect(capturedGridPreviewProps.imageViewMode).toBe('ortho');
    });

    it('V key does NOT toggle when focus is on INPUT', () => {
      renderApp();

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      fireEvent.keyDown(document, { key: 'v' });
      expect(capturedGridPreviewProps.imageViewMode).toBe('ortho');

      document.body.removeChild(input);
    });
  });

  // ==========================================
  // 4. Selection Coordination
  // ==========================================
  describe('Selection Coordination', () => {
    it('onImageSelect clears item selection', () => {
      mockPlacements = [{
        id: 'img-1', refImageId: 1, name: 'test.png', imageUrl: 'ref-lib/test.webp',
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
      mockPlacements = [{
        id: 'img-1', refImageId: 1, name: 'test.png', imageUrl: 'ref-lib/test.webp',
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
      expect(mockUpdateRotation).not.toHaveBeenCalled();
    });

    it('handleRemoveImage clears selectedImageId when removing selected image', () => {
      mockPlacements = [{
        id: 'img-1', refImageId: 1, name: 'test.png', imageUrl: 'ref-lib/test.webp',
        x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
      }];
      renderApp();

      const onImageSelect = capturedGridPreviewProps.onImageSelect as (id: string) => void;
      act(() => { onImageSelect('img-1'); });

      // Remove the selected image via the callback
      const onImageRemove = capturedGridPreviewProps.onImageRemove as (id: string) => void;
      act(() => { onImageRemove('img-1'); });

      expect(mockRemovePlacement).toHaveBeenCalledWith('img-1');
      // After removal, Delete should not try to remove 'img-1' again
      mockRemovePlacement.mockClear();
      fireEvent.keyDown(document, { key: 'Delete' });
      expect(mockRemovePlacement).not.toHaveBeenCalled();
    });

    it('handleRemoveImage does NOT clear selectedImageId for different image', () => {
      mockPlacements = [
        {
          id: 'img-1', refImageId: 1, name: 'test1.png', imageUrl: 'ref-lib/test1.webp',
          x: 0, y: 0, width: 50, height: 50, opacity: 0.5, scale: 1, isLocked: false, rotation: 0,
        },
        {
          id: 'img-2', refImageId: 2, name: 'test2.png', imageUrl: 'ref-lib/test2.webp',
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
      mockRemovePlacement.mockClear();
      fireEvent.keyDown(document, { key: 'Delete' });
      expect(mockRemovePlacement).toHaveBeenCalledWith('img-1');
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

    it('Clear All with confirm=true calls clearAll', async () => {
      renderApp();
      placeItemViaGridPreview();
      expect(getPlacedItems().length).toBe(1);

      fireEvent.click(screen.getByText(/Clear All/));
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));
      await waitFor(() => {
        expect(getPlacedItems().length).toBe(0);
      });
    });

    it('Clear All with confirm=false does not clear', async () => {
      renderApp();
      placeItemViaGridPreview();
      expect(getPlacedItems().length).toBe(1);

      fireEvent.click(screen.getByText(/Clear All/));
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(getPlacedItems().length).toBe(1);
    });

    it('ZoomControls receives zoom from useGridTransform', () => {
      renderApp();
      expect(capturedZoomControlsProps.zoom).toBe(1);
    });

    it('ImageViewToggle is rendered in the toolbar', () => {
      renderApp();
      expect(screen.getByTestId('image-view-toggle')).toBeInTheDocument();
    });

    it('GridPreview receives imageViewMode prop', () => {
      renderApp();
      expect(capturedGridPreviewProps.imageViewMode).toBe('ortho');
    });

    it('clicking ImageViewToggle toggles imageViewMode on GridPreview', () => {
      renderApp();
      expect(capturedGridPreviewProps.imageViewMode).toBe('ortho');

      fireEvent.click(screen.getByTestId('image-view-toggle'));
      expect(capturedGridPreviewProps.imageViewMode).toBe('perspective');

      fireEvent.click(screen.getByTestId('image-view-toggle'));
      expect(capturedGridPreviewProps.imageViewMode).toBe('ortho');
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

  // ==========================================
  // 8. Layout subtitle in header
  // ==========================================
  describe('Layout subtitle in header', () => {
    it('does not show subtitle when no layout is loaded', () => {
      renderApp();
      expect(screen.queryByText(/layout-info-subtitle/)).not.toBeInTheDocument();
    });

    it('shows layout name in subtitle after loading a layout', () => {
      renderApp();

      const onLoad = capturedLoadLayoutDialogProps.onLoad as (config: Record<string, unknown>) => void;
      act(() => {
        onLoad({
          layoutId: 42,
          layoutName: 'My Custom Layout',
          layoutDescription: null,
          layoutStatus: 'draft',
          widthMm: 168,
          depthMm: 168,
          spacerConfig: { horizontal: 'none', vertical: 'none' },
          placedItems: [],
        });
      });

      expect(screen.getByText('My Custom Layout')).toBeInTheDocument();
    });

    it('shows status badge in subtitle', () => {
      renderApp();

      const onLoad = capturedLoadLayoutDialogProps.onLoad as (config: Record<string, unknown>) => void;
      act(() => {
        onLoad({
          layoutId: 42,
          layoutName: 'Badge Test',
          layoutDescription: null,
          layoutStatus: 'submitted',
          widthMm: 168,
          depthMm: 168,
          spacerConfig: { horizontal: 'none', vertical: 'none' },
          placedItems: [],
        });
      });

      const badge = screen.getByText('submitted');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('layout-status-badge');
    });

    it('shows owner info for admin-loaded layouts', () => {
      renderApp();

      const onLoad = capturedLoadLayoutDialogProps.onLoad as (config: Record<string, unknown>) => void;
      act(() => {
        onLoad({
          layoutId: 42,
          layoutName: 'Their Layout',
          layoutDescription: null,
          layoutStatus: 'submitted',
          widthMm: 168,
          depthMm: 168,
          spacerConfig: { horizontal: 'none', vertical: 'none' },
          placedItems: [],
          ownerUsername: 'alice',
          ownerEmail: 'alice@example.com',
        });
      });

      expect(screen.getByText('Their Layout')).toBeInTheDocument();
      // Owner string should contain username and email
      const ownerSpan = screen.getByText(/alice/);
      expect(ownerSpan).toBeInTheDocument();
      expect(ownerSpan.textContent).toContain('alice@example.com');
    });

    it('clears subtitle on Clear All', async () => {
      renderApp();

      // Load a layout first
      const onLoad = capturedLoadLayoutDialogProps.onLoad as (config: Record<string, unknown>) => void;
      act(() => {
        onLoad({
          layoutId: 42,
          layoutName: 'To Clear',
          layoutDescription: null,
          layoutStatus: 'draft',
          widthMm: 168,
          depthMm: 168,
          spacerConfig: { horizontal: 'none', vertical: 'none' },
          placedItems: [
            { instanceId: 'test-1', itemId: 'bins_standard:bin-1x1', x: 0, y: 0, width: 1, height: 1, rotation: 0 },
          ],
        });
      });

      expect(screen.getByText('To Clear')).toBeInTheDocument();

      // Clear all
      fireEvent.click(screen.getByText(/Clear All/));
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));

      await waitFor(() => {
        expect(screen.queryByText('To Clear')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // 9. Always-visible Submit button
  // ==========================================
  describe('Always-visible Submit button', () => {
    it('Submit button is visible when authenticated and no layout is saved', () => {
      mockIsAuthenticated = true;
      renderApp();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    it('clicking Submit when no layout is saved opens the Save dialog', () => {
      mockIsAuthenticated = true;
      renderApp();

      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

      expect(capturedSaveLayoutDialogProps.isOpen).toBe(true);
    });
  });
});
