import { useCallback, useState } from 'react';
import type { BOMItem, PlacedItem, LibraryItem } from '../types/gridfinity';
import {
  formatBOMEmailBody,
  formatBOMSubjectLine,
  buildLayoutExport,
} from '../utils/bomFormatter';
import type { GridSummaryData, LibraryNameMap } from '../utils/bomFormatter';

interface UseSubmitBOMReturn {
  submitBOM: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export function useSubmitBOM(
  gridSummary: GridSummaryData,
  placedItems: PlacedItem[],
  bomItems: BOMItem[],
  getItemById: (id: string) => LibraryItem | undefined,
  libraryNames: LibraryNameMap,
): UseSubmitBOMReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitBOM = useCallback(() => {
    if (bomItems.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    const totalItems = bomItems.reduce((sum, item) => sum + item.quantity, 0);
    const subject = formatBOMSubjectLine(gridSummary.gridX, gridSummary.gridY, totalItems);
    const body = formatBOMEmailBody(gridSummary, bomItems, libraryNames);

    // Attempt JSON file download
    try {
      const layoutExport = buildLayoutExport(gridSummary, placedItems, bomItems, getItemById, libraryNames);
      const json = JSON.stringify(layoutExport, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const timestamp = Date.now();
      const filename = `gridfinity-layout-${gridSummary.gridX}x${gridSummary.gridY}-${timestamp}.json`;

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();

      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to generate BOM submission. Please try again.');
    }

    // Open mailto regardless of download success
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_self');

    setIsSubmitting(false);
  }, [gridSummary, placedItems, bomItems, getItemById, libraryNames]);

  return { submitBOM, isSubmitting, error };
}
