import type { Page, Locator } from '@playwright/test';
import { dragAndDropToGrid, getGridContainer, getAllPlacedItems } from '../utils/drag-drop';

export class GridPage {
  readonly page: Page;
  readonly gridContainer: Locator;
  readonly gridPreview: Locator;
  readonly drawerContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.gridContainer = page.locator('.grid-container');
    this.gridPreview = page.locator('.grid-preview');
    this.drawerContainer = page.locator('.drawer-container');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async waitForGridReady(): Promise<void> {
    await this.gridContainer.waitFor({ state: 'visible' });
  }

  async getGridDimensions(): Promise<{ columns: number; rows: number }> {
    return await this.gridContainer.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        columns: style.gridTemplateColumns.split(' ').length,
        rows: style.gridTemplateRows.split(' ').length,
      };
    });
  }

  async getPlacedItemCount(): Promise<number> {
    return await getAllPlacedItems(this.page).count();
  }

  async getPlacedItems(): Promise<Locator> {
    return getAllPlacedItems(this.page);
  }

  async clickPlacedItem(index: number): Promise<void> {
    await getAllPlacedItems(this.page).nth(index).click();
  }

  async getSelectedItem(): Promise<Locator | null> {
    const selected = this.page.locator('.placed-item.selected');
    if (await selected.count() > 0) {
      return selected;
    }
    return null;
  }

  async isItemSelected(index: number): Promise<boolean> {
    const item = getAllPlacedItems(this.page).nth(index);
    return await item.evaluate((el) => el.classList.contains('selected'));
  }

  async hasInvalidItems(): Promise<boolean> {
    const invalidItems = this.page.locator('.placed-item.invalid');
    return (await invalidItems.count()) > 0;
  }

  async getInvalidItemCount(): Promise<number> {
    return await this.page.locator('.placed-item.invalid').count();
  }

  async clickEmptyGridArea(): Promise<void> {
    // Click on an empty cell in the grid (bottom-right area to avoid placed items)
    const box = await this.gridContainer.boundingBox();
    if (box) {
      // Click in the bottom-right area where items are less likely to be
      await this.page.mouse.click(box.x + box.width - 20, box.y + box.height - 20);
    }
  }

  async setDimensions(width: number, depth: number): Promise<void> {
    const widthInput = this.page.locator('input').first();
    const depthInput = this.page.locator('input').nth(1);

    await widthInput.fill(String(width));
    await depthInput.fill(String(depth));
  }
}
