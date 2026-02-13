import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSubmitBOM } from './useSubmitBOM';
import type { GridSummaryData } from '../utils/bomFormatter';
import type { BOMItem, PlacedItem, LibraryItem } from '../types/gridfinity';

const mockBOMItems: BOMItem[] = [
  { itemId: 'default:bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#3B82F6', categories: ['bin'], quantity: 3 },
];

const mockPlacedItems: PlacedItem[] = [
  { instanceId: 'item-1-1000', itemId: 'default:bin-1x1', x: 0, y: 0, width: 1, height: 1, rotation: 0 },
  { instanceId: 'item-2-1001', itemId: 'default:bin-1x1', x: 1, y: 0, width: 1, height: 1, rotation: 0 },
  { instanceId: 'item-3-1002', itemId: 'default:bin-1x1', x: 2, y: 0, width: 1, height: 1, rotation: 90 },
];

const mockLibraryItems: Record<string, LibraryItem> = {
  'default:bin-1x1': { id: 'default:bin-1x1', name: '1x1 Bin', widthUnits: 1, heightUnits: 1, color: '#3B82F6', categories: ['bin'] },
};

const mockGetItemById = (id: string): LibraryItem | undefined => mockLibraryItems[id];

const defaultSummary: GridSummaryData = {
  gridX: 4,
  gridY: 4,
  width: 168,
  depth: 168,
  unit: 'metric',
  imperialFormat: 'decimal',
  gapWidth: 0,
  gapDepth: 0,
  spacerConfig: { horizontal: 'none', vertical: 'none' },
};

const mockLibraryNames = new Map([['default', 'Simple Bins']]);

describe('useSubmitBOM', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockClickFn: ReturnType<typeof vi.fn>;
  let mockCreateElement: typeof document.createElement;
  let capturedAnchor: { href: string; download: string; click: () => void } | null;

  beforeEach(() => {
    capturedAnchor = null;
    mockClickFn = vi.fn();
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:http://localhost/fake-blob');
    mockRevokeObjectURL = vi.fn();

    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document.createElement to capture anchor element
    mockCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const anchor = mockCreateElement.call(document, 'a') as HTMLAnchorElement;
        anchor.click = mockClickFn;
        // Track anchor properties after click
        const origClick = mockClickFn;
        mockClickFn.mockImplementation(() => {
          capturedAnchor = { href: anchor.href, download: anchor.download, click: origClick };
        });
        return anchor;
      }
      return mockCreateElement.call(document, tag);
    });

    // Mock window.open for mailto
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with isSubmitting false and no error', () => {
    const { result } = renderHook(() =>
      useSubmitBOM(defaultSummary, mockPlacedItems, mockBOMItems, mockGetItemById, mockLibraryNames)
    );

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not submit when BOM is empty', () => {
    const { result } = renderHook(() =>
      useSubmitBOM(defaultSummary, [], [], mockGetItemById, mockLibraryNames)
    );

    act(() => {
      result.current.submitBOM();
    });

    expect(mockCreateObjectURL).not.toHaveBeenCalled();
    expect(window.open).not.toHaveBeenCalled();
  });

  it('should trigger JSON file download on submit', () => {
    const { result } = renderHook(() =>
      useSubmitBOM(defaultSummary, mockPlacedItems, mockBOMItems, mockGetItemById, mockLibraryNames)
    );

    act(() => {
      result.current.submitBOM();
    });

    // Should create a blob URL
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = mockCreateObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('application/json');

    // Should click anchor to trigger download
    expect(mockClickFn).toHaveBeenCalledTimes(1);
  });

  it('should use descriptive filename for JSON download', () => {
    const { result } = renderHook(() =>
      useSubmitBOM(defaultSummary, mockPlacedItems, mockBOMItems, mockGetItemById, mockLibraryNames)
    );

    act(() => {
      result.current.submitBOM();
    });

    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor!.download).toMatch(/^gridfinity-layout-4x4-/);
    expect(capturedAnchor!.download).toMatch(/\.json$/);
  });

  it('should revoke blob URL after download', () => {
    const { result } = renderHook(() =>
      useSubmitBOM(defaultSummary, mockPlacedItems, mockBOMItems, mockGetItemById, mockLibraryNames)
    );

    act(() => {
      result.current.submitBOM();
    });

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/fake-blob');
  });

  it('should open mailto link with subject and body', () => {
    const { result } = renderHook(() =>
      useSubmitBOM(defaultSummary, mockPlacedItems, mockBOMItems, mockGetItemById, mockLibraryNames)
    );

    act(() => {
      result.current.submitBOM();
    });

    expect(window.open).toHaveBeenCalledTimes(1);
    const mailtoUrl = (window.open as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(mailtoUrl).toMatch(/^mailto:\?/);
    expect(mailtoUrl).toContain('subject=');
    expect(mailtoUrl).toContain('body=');
  });

  it('should have empty recipient in mailto', () => {
    const { result } = renderHook(() =>
      useSubmitBOM(defaultSummary, mockPlacedItems, mockBOMItems, mockGetItemById, mockLibraryNames)
    );

    act(() => {
      result.current.submitBOM();
    });

    const mailtoUrl = (window.open as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // mailto:? means no recipient
    expect(mailtoUrl).toMatch(/^mailto:\?/);
  });

  it('should generate valid JSON in the downloaded blob', async () => {
    let capturedJson = '';
    vi.spyOn(JSON, 'stringify').mockImplementationOnce((value, replacer, space) => {
      const result = JSON.stringify(value, replacer as undefined, space);
      capturedJson = result;
      return result;
    });

    const { result } = renderHook(() =>
      useSubmitBOM(defaultSummary, mockPlacedItems, mockBOMItems, mockGetItemById, mockLibraryNames)
    );

    act(() => {
      result.current.submitBOM();
    });

    const parsed = JSON.parse(capturedJson);

    expect(parsed.version).toBe('1.0.0');
    expect(parsed.grid.gridX).toBe(4);
    expect(parsed.items).toHaveLength(3);
    expect(parsed.bom).toHaveLength(1);
    expect(parsed.notes).toMatch(/reference images/i);
  });

  it('should include rotation data in exported items', async () => {
    let capturedJson = '';
    vi.spyOn(JSON, 'stringify').mockImplementationOnce((value, replacer, space) => {
      const result = JSON.stringify(value, replacer as undefined, space);
      capturedJson = result;
      return result;
    });

    const { result } = renderHook(() =>
      useSubmitBOM(defaultSummary, mockPlacedItems, mockBOMItems, mockGetItemById, mockLibraryNames)
    );

    act(() => {
      result.current.submitBOM();
    });

    const parsed = JSON.parse(capturedJson);

    const rotatedItem = parsed.items.find((i: { rotation: number }) => i.rotation === 90);
    expect(rotatedItem).toBeDefined();
    expect(rotatedItem.x).toBe(2);
    expect(rotatedItem.y).toBe(0);
  });

  it('should set error if blob creation throws', () => {
    mockCreateObjectURL.mockImplementation(() => {
      throw new Error('Blob creation failed');
    });

    const { result } = renderHook(() =>
      useSubmitBOM(defaultSummary, mockPlacedItems, mockBOMItems, mockGetItemById, mockLibraryNames)
    );

    act(() => {
      result.current.submitBOM();
    });

    expect(result.current.error).toBe('Failed to generate BOM submission. Please try again.');
  });

  it('should still open mailto even if download fails', () => {
    mockCreateObjectURL.mockImplementation(() => {
      throw new Error('Blob creation failed');
    });

    const { result } = renderHook(() =>
      useSubmitBOM(defaultSummary, mockPlacedItems, mockBOMItems, mockGetItemById, mockLibraryNames)
    );

    act(() => {
      result.current.submitBOM();
    });

    // mailto should still be attempted
    expect(window.open).toHaveBeenCalledTimes(1);
  });

  it('should return stable submitBOM function reference', () => {
    const { result, rerender } = renderHook(() =>
      useSubmitBOM(defaultSummary, mockPlacedItems, mockBOMItems, mockGetItemById, mockLibraryNames)
    );

    const firstRef = result.current.submitBOM;
    rerender();
    expect(result.current.submitBOM).toBe(firstRef);
  });
});
