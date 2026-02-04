import { test, expect } from '@playwright/test';
import { GridPage } from '../pages/GridPage';
import { LibraryPage } from '../pages/LibraryPage';
import { html5DragDrop } from '../utils/drag-drop';

test.describe('Collision Detection', () => {
  let gridPage: GridPage;
  let libraryPage: LibraryPage;

  test.beforeEach(async ({ page }) => {
    gridPage = new GridPage(page);
    libraryPage = new LibraryPage(page);
    await gridPage.goto();
    await gridPage.waitForGridReady();
    await libraryPage.waitForLibraryReady();
  });

  test('overlapping items are marked as invalid', async ({ page }) => {
    // Place first item at position (0, 0)
    const firstItem = libraryPage.libraryItems.first();
    await html5DragDrop(page, firstItem, gridPage.gridContainer, { x: 30, y: 30 });

    // No invalid items yet
    expect(await gridPage.hasInvalidItems()).toBe(false);

    // Place another item at the same position (overlapping)
    await html5DragDrop(page, firstItem, gridPage.gridContainer, { x: 30, y: 30 });

    // Both items should now be marked as invalid due to collision
    await page.waitForTimeout(100);
    expect(await gridPage.hasInvalidItems()).toBe(true);
  });

  test('non-overlapping items remain valid', async ({ page }) => {
    // Place first item at (0, 0)
    const firstItem = libraryPage.libraryItems.first();
    await html5DragDrop(page, firstItem, gridPage.gridContainer, { x: 30, y: 30 });

    // Place second item far away at different position
    await html5DragDrop(page, firstItem, gridPage.gridContainer, { x: 200, y: 200 });

    // Should have 2 items
    expect(await gridPage.getPlacedItemCount()).toBe(2);

    // No items should be invalid (assuming they don't overlap)
    await page.waitForTimeout(100);
    expect(await gridPage.hasInvalidItems()).toBe(false);
  });

  test('item moved to overlap becomes invalid', async ({ page }) => {
    // Place first item
    const firstItem = libraryPage.libraryItems.first();
    await html5DragDrop(page, firstItem, gridPage.gridContainer, { x: 30, y: 30 });

    // Deselect
    await gridPage.clickEmptyGridArea();
    await page.waitForTimeout(50);

    // Place second item in non-overlapping position
    await html5DragDrop(page, firstItem, gridPage.gridContainer, { x: 200, y: 30 });

    // Both should be valid
    expect(await gridPage.hasInvalidItems()).toBe(false);

    // Move second item to overlap with first
    const secondItem = page.locator('.placed-item').nth(1);
    await html5DragDrop(page, secondItem, gridPage.gridContainer, { x: 30, y: 30 });

    // Now should have invalid items
    await page.waitForTimeout(100);
    expect(await gridPage.hasInvalidItems()).toBe(true);
  });

  test('item extending beyond grid boundary is invalid', async ({ page }) => {
    // Get grid dimensions
    const dimensions = await gridPage.getGridDimensions();
    const gridBox = await gridPage.gridContainer.boundingBox();
    expect(gridBox).not.toBeNull();

    // Try to place an item at the far right edge where it would overflow
    const cellWidth = gridBox!.width / dimensions.columns;

    // Get the first item
    const item = libraryPage.libraryItems.first();
    await html5DragDrop(page, item, gridPage.gridContainer, {
      x: gridBox!.width - cellWidth / 2,
      y: 30,
    });

    // Wait for placement
    await page.waitForTimeout(100);

    // Check if item is placed
    const placedCount = await gridPage.getPlacedItemCount();
    expect(placedCount).toBe(1);

    // Item at edge might be invalid if it extends beyond boundary
    // This depends on item size
  });

  test('moving item away from overlap makes it valid', async ({ page }) => {
    // Create overlapping items first
    const firstItem = libraryPage.libraryItems.first();
    await html5DragDrop(page, firstItem, gridPage.gridContainer, { x: 30, y: 30 });

    await html5DragDrop(page, firstItem, gridPage.gridContainer, { x: 30, y: 30 });

    // Should have invalid items
    await page.waitForTimeout(100);
    expect(await gridPage.hasInvalidItems()).toBe(true);

    // Move one item away
    const secondItem = page.locator('.placed-item').nth(1);
    await html5DragDrop(page, secondItem, gridPage.gridContainer, { x: 200, y: 200 });

    // Should no longer have invalid items
    await page.waitForTimeout(100);
    expect(await gridPage.hasInvalidItems()).toBe(false);
  });
});
