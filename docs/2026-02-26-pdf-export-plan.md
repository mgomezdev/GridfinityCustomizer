# PDF Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an "Export PDF" button to the toolbar that downloads a PDF containing a screenshot of the grid, full configuration details, and a bill of materials.

**Architecture:** A pure async utility function `exportToPdf` in `src/utils/exportPdf.ts` captures the live `.grid-preview` DOM element with `html2canvas`, assembles a PDF with `jspdf`, and renders the BOM table with `jspdf-autotable`. The "Export PDF" button lives in the existing `reference-image-toolbar` div in `App.tsx` alongside the Save/Load buttons. No backend changes required.

**Tech Stack:** `html2canvas` (DOM capture), `jspdf` (PDF assembly), `jspdf-autotable` (table rendering), Vitest (unit tests), Playwright (E2E tests)

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via npm)

**Step 1: Install packages**

```bash
npm install html2canvas jspdf jspdf-autotable
npm install --save-dev @types/jspdf-autotable
```

**Step 2: Verify installs**

```bash
node -e "require('html2canvas'); require('jspdf'); require('jspdf-autotable'); console.log('OK')"
```
Expected output: `OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install html2canvas, jspdf, jspdf-autotable"
```

---

### Task 2: `generateFilename` helper + tests

**Files:**
- Create: `src/utils/exportPdf.ts`
- Create: `src/utils/exportPdf.test.ts`

**Step 1: Write the failing tests**

Create `src/utils/exportPdf.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateFilename } from './exportPdf';

describe('generateFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-26'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('slugifies a layout name', () => {
    expect(generateFilename('My Drawer Organizer')).toBe('my-drawer-organizer.pdf');
  });

  it('strips special characters', () => {
    expect(generateFilename('Test! Layout #1')).toBe('test-layout-1.pdf');
  });

  it('collapses multiple separators', () => {
    expect(generateFilename('A  --  B')).toBe('a-b.pdf');
  });

  it('falls back to date when name is undefined', () => {
    expect(generateFilename()).toBe('gridfinity-2026-02-26.pdf');
  });

  it('falls back to date when name is empty string', () => {
    expect(generateFilename('')).toBe('gridfinity-2026-02-26.pdf');
  });

  it('falls back to date when name is whitespace only', () => {
    expect(generateFilename('   ')).toBe('gridfinity-2026-02-26.pdf');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test:run -- --reporter=verbose src/utils/exportPdf.test.ts
```
Expected: FAIL with `Cannot find module './exportPdf'`

**Step 3: Create `src/utils/exportPdf.ts` with `generateFilename`**

```typescript
export function generateFilename(layoutName?: string): string {
  if (layoutName && layoutName.trim()) {
    const slug = layoutName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${slug}.pdf`;
  }
  const date = new Date().toISOString().slice(0, 10);
  return `gridfinity-${date}.pdf`;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test:run -- --reporter=verbose src/utils/exportPdf.test.ts
```
Expected: 6 passed

**Step 5: Commit**

```bash
git add src/utils/exportPdf.ts src/utils/exportPdf.test.ts
git commit -m "feat(pdf-export): add generateFilename helper with tests"
```

---

### Task 3: `getOrientation` helper + tests

**Files:**
- Modify: `src/utils/exportPdf.ts`
- Modify: `src/utils/exportPdf.test.ts`

**Step 1: Write the failing tests**

Append to `src/utils/exportPdf.test.ts`:

```typescript
import { generateFilename, getOrientation } from './exportPdf';

describe('getOrientation', () => {
  it('returns landscape for wide grid', () => {
    expect(getOrientation(6, 4)).toBe('l');
  });

  it('returns portrait for tall grid', () => {
    expect(getOrientation(3, 5)).toBe('p');
  });

  it('returns portrait for square grid', () => {
    expect(getOrientation(4, 4)).toBe('p');
  });
});
```

**Step 2: Run tests to verify the new ones fail**

```bash
npm run test:run -- --reporter=verbose src/utils/exportPdf.test.ts
```
Expected: 3 new tests FAIL with `getOrientation is not a function`

**Step 3: Add `getOrientation` to `src/utils/exportPdf.ts`**

```typescript
export function getOrientation(gridX: number, gridY: number): 'l' | 'p' {
  return gridX > gridY ? 'l' : 'p';
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test:run -- --reporter=verbose src/utils/exportPdf.test.ts
```
Expected: 9 passed

**Step 5: Commit**

```bash
git add src/utils/exportPdf.ts src/utils/exportPdf.test.ts
git commit -m "feat(pdf-export): add getOrientation helper with tests"
```

---

### Task 4: `formatBomRows` helper + tests

**Files:**
- Modify: `src/utils/exportPdf.ts`
- Modify: `src/utils/exportPdf.test.ts`

**Step 1: Write the failing tests**

Append to `src/utils/exportPdf.test.ts`:

```typescript
import { generateFilename, getOrientation, formatBomRows } from './exportPdf';
import type { BOMItem } from '../types/gridfinity';

describe('formatBomRows', () => {
  const baseItem: BOMItem = {
    itemId: 'bin-2x3',
    name: '2x3 Bin',
    widthUnits: 2,
    heightUnits: 3,
    color: '#3B82F6',
    categories: ['bin'],
    quantity: 4,
  };

  it('formats a row with no customization', () => {
    expect(formatBomRows([baseItem])).toEqual([['2x3 Bin', '2×3', '4', '']]);
  });

  it('formats wall pattern customization', () => {
    const item: BOMItem = {
      ...baseItem,
      customization: { wallPattern: 'grid', lipStyle: 'normal', fingerSlide: 'none', wallCutout: 'none' },
    };
    expect(formatBomRows([item])).toEqual([['2x3 Bin', '2×3', '4', 'grid']]);
  });

  it('formats multiple customization fields', () => {
    const item: BOMItem = {
      ...baseItem,
      customization: { wallPattern: 'none', lipStyle: 'reduced', fingerSlide: 'chamfered', wallCutout: 'none' },
    };
    expect(formatBomRows([item])).toEqual([['2x3 Bin', '2×3', '4', 'lip: reduced, slide: chamfered']]);
  });

  it('returns multiple rows for multiple items', () => {
    const item2: BOMItem = { ...baseItem, name: 'Other', quantity: 2 };
    expect(formatBomRows([baseItem, item2])).toHaveLength(2);
  });
});
```

**Step 2: Run tests to verify the new ones fail**

```bash
npm run test:run -- --reporter=verbose src/utils/exportPdf.test.ts
```
Expected: 4 new tests FAIL

**Step 3: Add `formatBomRows` to `src/utils/exportPdf.ts`**

```typescript
import type { BOMItem } from '../types/gridfinity';

function formatCustomizationText(item: BOMItem): string {
  if (!item.customization) return '';
  const parts: string[] = [];
  if (item.customization.wallPattern !== 'none') parts.push(item.customization.wallPattern);
  if (item.customization.lipStyle !== 'normal') parts.push(`lip: ${item.customization.lipStyle}`);
  if (item.customization.fingerSlide !== 'none') parts.push(`slide: ${item.customization.fingerSlide}`);
  if (item.customization.wallCutout !== 'none') parts.push(`cutout: ${item.customization.wallCutout}`);
  return parts.join(', ');
}

export function formatBomRows(items: BOMItem[]): string[][] {
  return items.map(item => [
    item.name,
    `${item.widthUnits}×${item.heightUnits}`,
    String(item.quantity),
    formatCustomizationText(item),
  ]);
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test:run -- --reporter=verbose src/utils/exportPdf.test.ts
```
Expected: 13 passed

**Step 5: Commit**

```bash
git add src/utils/exportPdf.ts src/utils/exportPdf.test.ts
git commit -m "feat(pdf-export): add formatBomRows helper with tests"
```

---

### Task 5: Main `exportToPdf` function + mock test

**Files:**
- Modify: `src/utils/exportPdf.ts`
- Modify: `src/utils/exportPdf.test.ts`

**Step 1: Write the failing mock test**

Append to `src/utils/exportPdf.test.ts`:

```typescript
import { generateFilename, getOrientation, formatBomRows, exportToPdf } from './exportPdf';
import type { GridResult, GridSpacerConfig } from '../types/gridfinity';

// Mock html2canvas and jspdf at module level
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    width: 800,
    height: 600,
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,fake'),
  }),
}));

const mockSave = vi.fn();
const mockAddImage = vi.fn();
const mockText = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetFont = vi.fn();
const mockGetWidth = vi.fn().mockReturnValue(297);
const mockGetHeight = vi.fn().mockReturnValue(210);

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: mockGetWidth, getHeight: mockGetHeight } },
    setFontSize: mockSetFontSize,
    setFont: mockSetFont,
    text: mockText,
    addImage: mockAddImage,
    save: mockSave,
  })),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

describe('exportToPdf', () => {
  const gridEl = document.createElement('div');
  const gridResult: GridResult = {
    gridX: 4,
    gridY: 4,
    actualWidth: 168,
    actualDepth: 168,
    gapWidth: 0,
    gapDepth: 0,
  };
  const spacerConfig: GridSpacerConfig = { horizontal: 'none', vertical: 'none' };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-26'));
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls pdf.save with layout name slug when name provided', async () => {
    await exportToPdf(gridEl, [], { gridResult, spacerConfig, unitSystem: 'metric', layoutName: 'My Layout' });
    expect(mockSave).toHaveBeenCalledWith('my-layout.pdf');
  });

  it('calls pdf.save with date fallback when no name', async () => {
    await exportToPdf(gridEl, [], { gridResult, spacerConfig, unitSystem: 'metric' });
    expect(mockSave).toHaveBeenCalledWith('gridfinity-2026-02-26.pdf');
  });

  it('calls onError when html2canvas rejects', async () => {
    const { default: html2canvas } = await import('html2canvas');
    vi.mocked(html2canvas).mockRejectedValueOnce(new Error('canvas failed'));
    const onError = vi.fn();
    await exportToPdf(gridEl, [], { gridResult, spacerConfig, unitSystem: 'metric' }, onError);
    expect(onError).toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run tests to verify the new ones fail**

```bash
npm run test:run -- --reporter=verbose src/utils/exportPdf.test.ts
```
Expected: 3 new tests FAIL with `exportToPdf is not a function`

**Step 3: Implement `exportToPdf` in `src/utils/exportPdf.ts`**

Add to the top of the file:

```typescript
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GridResult, GridSpacerConfig, UnitSystem } from '../types/gridfinity';

export interface ExportPdfConfig {
  gridResult: GridResult;
  spacerConfig: GridSpacerConfig;
  unitSystem: UnitSystem;
  layoutName?: string;
}
```

Add the function:

```typescript
export async function exportToPdf(
  gridElement: HTMLElement,
  bomItems: BOMItem[],
  config: ExportPdfConfig,
  onError?: (err: unknown) => void,
): Promise<void> {
  try {
    const { gridResult, spacerConfig, unitSystem, layoutName } = config;
    const orientation = getOrientation(gridResult.gridX, gridResult.gridY);
    const filename = generateFilename(layoutName);

    const canvas = await html2canvas(gridElement, { useCORS: true, scale: 2 });

    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let cursorY = margin;

    // Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Gridfinity Layout', margin, cursorY);
    if (layoutName) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(layoutName, margin, cursorY + 7);
    }
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(new Date().toLocaleDateString(), pageWidth - margin, cursorY, { align: 'right' });
    cursorY += layoutName ? 18 : 12;

    // Grid screenshot
    const imgAspect = canvas.width / canvas.height;
    const imgWidth = contentWidth;
    const imgHeight = imgWidth / imgAspect;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, cursorY, imgWidth, imgHeight);
    cursorY += imgHeight + 8;

    // Config block
    const unit = unitSystem === 'metric' ? 'mm' : 'in';
    const w = unitSystem === 'metric'
      ? Math.round(gridResult.actualWidth)
      : (gridResult.actualWidth / 25.4).toFixed(2);
    const d = unitSystem === 'metric'
      ? Math.round(gridResult.actualDepth)
      : (gridResult.actualDepth / 25.4).toFixed(2);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Configuration', margin, cursorY);
    cursorY += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Grid: ${gridResult.gridX}×${gridResult.gridY} units  ·  ${w}${unit} × ${d}${unit}`, margin, cursorY);
    cursorY += 5;
    pdf.text(
      `Spacers: horizontal ${spacerConfig.horizontal}, vertical ${spacerConfig.vertical}`,
      margin,
      cursorY,
    );
    pdf.text(`Units: ${unitSystem}`, pageWidth - margin, cursorY - 5, { align: 'right' });
    cursorY += 8;

    // BOM table
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bill of Materials', margin, cursorY);
    cursorY += 4;

    const totalQty = bomItems.reduce((sum, item) => sum + item.quantity, 0);

    autoTable(pdf, {
      startY: cursorY,
      head: [['Name', 'Size', 'Qty', 'Customization']],
      body: [
        ...formatBomRows(bomItems),
        [{ content: `Total: ${totalQty} item${totalQty !== 1 ? 's' : ''}`, colSpan: 4, styles: { fontStyle: 'bold' } }],
      ],
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    pdf.save(filename);
  } catch (err) {
    console.error('PDF export failed:', err);
    onError?.(err);
  }
}
```

**Step 4: Run all tests to verify they pass**

```bash
npm run test:run -- --reporter=verbose src/utils/exportPdf.test.ts
```
Expected: 16 passed

**Step 5: Commit**

```bash
git add src/utils/exportPdf.ts src/utils/exportPdf.test.ts
git commit -m "feat(pdf-export): implement exportToPdf with mock tests"
```

---

### Task 6: Add "Export PDF" button to App.tsx

**Files:**
- Modify: `src/App.tsx`

**Context:** `bomItems` is already computed at line 165 (`const bomItems = useBillOfMaterials(placedItems, libraryItems)`). The grid element lives inside `viewportRef` and is retrieved via `viewportRef.current?.querySelector('.grid-preview')`. `gridResult`, `spacerConfig`, `unitSystem`, `layoutMeta.name`, and `placedItems` are all in scope.

**Step 1: Add the import at the top of `src/App.tsx`**

Find the existing utils imports and add:

```typescript
import { exportToPdf } from './utils/exportPdf';
```

**Step 2: Add error state and handler after existing handlers in `App.tsx`**

Find the `handleClearAll` function (around line 278) and add after it:

```typescript
const [exportPdfError, setExportPdfError] = useState<string | null>(null);

const handleExportPdf = useCallback(async () => {
  setExportPdfError(null);
  const gridEl = viewportRef.current?.querySelector('.grid-preview') as HTMLElement | null;
  if (!gridEl) return;
  await exportToPdf(
    gridEl,
    bomItems,
    { gridResult, spacerConfig, unitSystem, layoutName: layoutMeta.name },
    () => setExportPdfError('PDF export failed. Please try again.'),
  );
}, [bomItems, gridResult, spacerConfig, unitSystem, layoutMeta.name]);
```

**Step 3: Add the button in the toolbar**

Find this block in `App.tsx` (around line 583):
```tsx
{!isReadOnly && (placedItems.length > 0 || refImagePlacements.length > 0) && (
  <button className="clear-all-button" onClick={handleClearAll}>Clear All ...</button>
)}
```

Add the Export PDF button **before** it (so it appears between the auth-gated buttons and Clear All):

```tsx
<button
  className="layout-toolbar-btn layout-export-btn"
  onClick={handleExportPdf}
  type="button"
  disabled={placedItems.length === 0}
  title="Export layout as PDF"
>
  Export PDF
</button>
{exportPdfError && (
  <span className="export-pdf-error" role="alert">{exportPdfError}</span>
)}
```

**Step 4: Run unit tests to verify nothing broke**

```bash
npm run test:run
```
Expected: all existing tests pass

**Step 5: Verify button appears in dev server**

```bash
npm run dev
```
Open `http://localhost:5173`. Place an item on the grid. Confirm "Export PDF" button appears in the toolbar and is disabled when no items are placed. Click it — a PDF should download.

**Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(pdf-export): add Export PDF button to toolbar"
```

---

### Task 7: E2E tests

**Files:**
- Create: `e2e/tests/export-pdf.spec.ts`

**Step 1: Check how existing E2E tests place items**

Read `e2e/tests/` for an existing test that places items on the grid to use as a reference pattern. The page object and drag utilities live in `e2e/pages/` and `e2e/utils/`.

**Step 2: Write the E2E test**

Create `e2e/tests/export-pdf.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { GridPage } from '../pages/GridPage';

test.describe('Export PDF', () => {
  test('button is disabled when grid is empty', async ({ page }) => {
    const grid = new GridPage(page);
    await grid.goto();
    const btn = page.getByRole('button', { name: 'Export PDF' });
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });

  test('button is enabled after placing an item', async ({ page }) => {
    const grid = new GridPage(page);
    await grid.goto();
    await grid.placeFirstLibraryItem();
    const btn = page.getByRole('button', { name: 'Export PDF' });
    await expect(btn).toBeEnabled();
  });

  test('clicking Export PDF triggers a download', async ({ page }) => {
    const grid = new GridPage(page);
    await grid.goto();
    await grid.placeFirstLibraryItem();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export PDF' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
```

> **Note:** `grid.placeFirstLibraryItem()` is a helper you will need to add to `GridPage` if it doesn't already exist. Look at how other tests place items (likely via drag-and-drop using `dragToGridCell`). Add the helper to the page object following the existing pattern.

**Step 3: Run E2E tests**

```bash
npm run test:e2e -- e2e/tests/export-pdf.spec.ts
```
Expected: 3 passed

**Step 4: Run full test suite**

```bash
npm run test:run
npm run test:e2e
```
Expected: all pass

**Step 5: Commit**

```bash
git add e2e/tests/export-pdf.spec.ts e2e/pages/GridPage.ts
git commit -m "test(pdf-export): add E2E tests for Export PDF button"
```
