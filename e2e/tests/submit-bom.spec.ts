import { test, expect } from '@playwright/test';
import { GridPage } from '../pages/GridPage';
import { LibraryPage } from '../pages/LibraryPage';
import { BOMPage } from '../pages/BOMPage';
import { dragToGridCell } from '../utils/drag-drop';

test.describe('Submit BOM', () => {
  let gridPage: GridPage;
  let libraryPage: LibraryPage;
  let bomPage: BOMPage;

  test.beforeEach(async ({ page }) => {
    gridPage = new GridPage(page);
    libraryPage = new LibraryPage(page);
    bomPage = new BOMPage(page);
    await gridPage.goto();
    await gridPage.waitForGridReady();
    await libraryPage.waitForLibraryReady();
    await bomPage.waitForBOMReady();
  });

  test('submit button is not visible when grid is empty', async () => {
    await expect(bomPage.submitButton).not.toBeVisible();
  });

  test('submit button appears after placing an item', async ({ page }) => {
    const firstItem = libraryPage.libraryItems.first();
    await dragToGridCell(page, firstItem, gridPage.gridContainer, 0, 0, 4, 4);

    await expect(bomPage.submitButton).toBeVisible();
    await expect(bomPage.submitButton).toHaveText('Submit BOM');
  });

  test('reference image notice is visible when submit button is shown', async ({ page }) => {
    const firstItem = libraryPage.libraryItems.first();
    await dragToGridCell(page, firstItem, gridPage.gridContainer, 0, 0, 4, 4);

    await expect(bomPage.submitNotice).toBeVisible();
    await expect(bomPage.submitNotice).toContainText('Reference images');
    await expect(bomPage.submitNotice).toContainText('not included');
  });

  test('clicking submit triggers JSON file download', async ({ page }) => {
    const firstItem = libraryPage.libraryItems.first();
    await dragToGridCell(page, firstItem, gridPage.gridContainer, 0, 0, 4, 4);

    // Listen for download event
    const downloadPromise = page.waitForEvent('download');

    // Intercept window.open to prevent mailto navigation
    await page.evaluate(() => {
      window.open = () => null;
    });

    await bomPage.submitButton.click();

    const download = await downloadPromise;
    const filename = download.suggestedFilename();

    expect(filename).toMatch(/^gridfinity-layout-4x4-\d+\.json$/);
  });

  test('downloaded JSON contains valid layout data', async ({ page }) => {
    const firstItem = libraryPage.libraryItems.first();
    await dragToGridCell(page, firstItem, gridPage.gridContainer, 0, 0, 4, 4);

    const downloadPromise = page.waitForEvent('download');

    await page.evaluate(() => {
      window.open = () => null;
    });

    await bomPage.submitButton.click();

    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const content = Buffer.concat(chunks).toString('utf-8');
    const parsed = JSON.parse(content);

    expect(parsed.version).toBe('1.0.0');
    expect(parsed.generator).toBe('Gridfinity Bin Customizer');
    expect(parsed.grid.gridX).toBe(4);
    expect(parsed.grid.gridY).toBe(4);
    expect(parsed.items.length).toBeGreaterThan(0);
    expect(parsed.bom.length).toBeGreaterThan(0);
    expect(parsed.notes).toContain('Reference images');
  });

  test('submit button is not visible after clearing all items', async ({ page }) => {
    const firstItem = libraryPage.libraryItems.first();
    await dragToGridCell(page, firstItem, gridPage.gridContainer, 0, 0, 4, 4);

    await expect(bomPage.submitButton).toBeVisible();

    // Accept the confirm dialog for clear all
    page.on('dialog', dialog => dialog.accept());

    const clearButton = page.locator('.clear-all-button');
    await clearButton.click();

    await expect(bomPage.submitButton).not.toBeVisible();
  });
});
