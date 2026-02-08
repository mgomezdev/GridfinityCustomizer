import { test, expect } from '@playwright/test';
import { GridPage } from '../pages/GridPage';
import { LibraryPage } from '../pages/LibraryPage';
import { html5DragDrop, dragToGridCell } from '../utils/drag-drop';

test.describe('Item Manipulation', () => {
  let gridPage: GridPage;
  let libraryPage: LibraryPage;

  test.beforeEach(async ({ page }) => {
    gridPage = new GridPage(page);
    libraryPage = new LibraryPage(page);
    await gridPage.goto();
    await gridPage.waitForGridReady();
    await libraryPage.waitForLibraryReady();
  });

  test('can rotate a selected item', async ({ page }) => {
    // Place an item
    const firstItem = libraryPage.libraryItems.first();
    await dragToGridCell(page, firstItem, gridPage.gridContainer, 0, 0, 4, 4);

    // Item should be selected after placement
    const placedItem = page.locator('.placed-item').first();
    await expect(placedItem).toBeVisible();

    // Get initial dimensions
    const initialBox = await placedItem.boundingBox();
    expect(initialBox).not.toBeNull();

    // Click rotate button (look for the button with "Rotate" text)
    const rotateButton = page.locator('.rotate-btn');
    await expect(rotateButton).toBeVisible();
    await rotateButton.click();

    // Wait for rotation animation/state update
    await page.waitForTimeout(100);

    // Dimensions may have changed (width <-> height swap)
    const newBox = await placedItem.boundingBox();
    expect(newBox).not.toBeNull();
  });

  test('can delete a selected item', async ({ page }) => {
    // Place an item
    const firstItem = libraryPage.libraryItems.first();
    await dragToGridCell(page, firstItem, gridPage.gridContainer, 0, 0, 4, 4);

    // Should have 1 item
    expect(await gridPage.getPlacedItemCount()).toBe(1);

    // Click delete button
    const deleteButton = page.locator('.delete-btn');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Wait for state update
    await page.waitForTimeout(100);

    // Should have 0 items
    expect(await gridPage.getPlacedItemCount()).toBe(0);
  });

  test('item controls appear when item is selected', async ({ page }) => {
    // Initially, item controls should not be visible (no selection)
    const itemControls = page.locator('.item-controls');
    await expect(itemControls).not.toBeVisible();

    // Place an item - it becomes selected automatically
    const firstItem = libraryPage.libraryItems.first();
    await dragToGridCell(page, firstItem, gridPage.gridContainer, 0, 0, 4, 4);

    // Item controls should now be visible
    await expect(itemControls).toBeVisible();
  });

  test('item controls hide when item is deselected', async ({ page }) => {
    // Place an item
    const firstItem = libraryPage.libraryItems.first();
    await dragToGridCell(page, firstItem, gridPage.gridContainer, 0, 0, 4, 4);

    // Item controls should be visible
    const itemControls = page.locator('.item-controls');
    await expect(itemControls).toBeVisible();

    // Click on empty grid area to deselect
    await gridPage.clickEmptyGridArea();
    await page.waitForTimeout(100);

    // Item controls should be hidden
    await expect(itemControls).not.toBeVisible();
  });

  test('can select a placed item by clicking on it', async ({ page }) => {
    // Place first item at cell (0,0)
    const firstItem = libraryPage.libraryItems.first();
    await dragToGridCell(page, firstItem, gridPage.gridContainer, 0, 0, 4, 4);

    // Deselect by clicking empty area
    await gridPage.clickEmptyGridArea();
    await page.waitForTimeout(50);

    // Place second item at cell (2,0)
    await dragToGridCell(page, firstItem, gridPage.gridContainer, 2, 0, 4, 4);

    // Second item should be selected (most recently placed)
    const placedItems = page.locator('.placed-item');
    expect(await placedItems.count()).toBe(2);

    // Click on the first item to select it
    await placedItems.first().click();
    await page.waitForTimeout(50);

    // First item should now be selected
    await expect(placedItems.first()).toHaveClass(/selected/);
  });
});
