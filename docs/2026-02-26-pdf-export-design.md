# PDF Export — Design Document

**Date:** 2026-02-26
**Feature:** Client-side PDF export of grid configuration and bill of materials

## Overview

Users can export their Gridfinity layout as a PDF containing a visual screenshot of the grid, the full configuration details, and the bill of materials. The export is available to both anonymous and logged-in users via an "Export PDF" button in the existing toolbar alongside the Save/Load buttons.

## Dependencies

Two new npm packages:

- **`html2canvas`** — captures the `<div class="grid-preview">` DOM element to a `<canvas>`
- **`jspdf`** + **`jspdf-autotable`** — assembles the PDF from the canvas image and renders the BOM as a styled table

## Architecture

### New Files

- **`src/utils/exportPdf.ts`** — pure async function:
  ```ts
  exportToPdf(
    gridElement: HTMLElement,
    placedItems: PlacedItem[],
    libraryItems: LibraryItem[],
    gridConfig: GridConfig,
    layoutName?: string,
    onError?: (err: unknown) => void
  ): Promise<void>
  ```

### Modified Files

- **`src/App.tsx`** — adds "Export PDF" button to the toolbar (same section as Save/Load); passes `gridRef.current` and current state to `exportToPdf`

## PDF Layout

### Orientation

Auto-selected based on grid aspect ratio:
- `gridX > gridY` → **landscape**
- Otherwise → **portrait**

### Page Structure (top to bottom)

1. **Header** — "Gridfinity Layout" title + layout name (if saved) on the left; export date on the right
2. **Grid screenshot** — html2canvas output at `scale: 2` (2× pixel density for print sharpness), scaled to fill page width minus margins, aspect ratio preserved
3. **Config block** — two columns:
   - Left: grid dimensions (e.g. `4×4 units · 168mm × 168mm`), spacer settings
   - Right: unit system (mm/in)
4. **BOM table** — rendered with `jspdf-autotable`:
   - Columns: Name | Size | Qty | Customization
   - Grand total row at the bottom (total item count)
   - Per-item customization shown as text (wall pattern, lip style, etc.)

### Filename

- Layout has been saved: sanitize layout name to kebab-case (e.g. `my-drawer-organizer.pdf`)
- No saved name: `gridfinity-YYYY-MM-DD.pdf`

## Data Flow

1. User clicks "Export PDF"
2. `App.tsx` calls `exportToPdf(gridRef.current, placedItems, libraryItems, gridConfig, layoutName)`
3. Inside `exportToPdf`:
   - `html2canvas(gridElement, { useCORS: true, scale: 2 })` → canvas
   - Determine orientation, create `jsPDF` instance
   - Draw header, canvas image, config block, BOM table
   - `pdf.save(filename)` — triggers browser download
4. No server round-trips; works identically for anonymous and logged-in users

## Button State

- **Disabled** when no items are placed (matching existing Save button behavior)
- No loading spinner (generation typically completes in under one second)

## Error Handling

`exportToPdf` is wrapped in `try/catch`. On failure it logs the error and invokes the `onError` callback. `App.tsx` displays a brief inline error message near the button — no modal.

## Testing

### Unit Tests (`src/utils/exportPdf.test.ts`)

- Mock `html2canvas`, `jspdf`, and `jspdf-autotable`; verify correct arguments
- Filename generation: layout name → kebab-case, special characters stripped, fallback to date
- Orientation logic: `gridX > gridY` → landscape, otherwise portrait
- BOM data passed to autotable matches `useBillOfMaterials` output

### E2E Tests (`e2e/tests/export-pdf.spec.ts`)

- Place items → click "Export PDF" → assert `page.waitForEvent('download')` fires
- Assert button is disabled when grid is empty
- Assert button is visible and enabled after placing one item
