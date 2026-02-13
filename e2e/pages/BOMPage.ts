import type { Page, Locator } from '@playwright/test';

export interface BOMEntry {
  name: string;
  size: string;
  quantity: number;
}

export class BOMPage {
  readonly page: Page;
  readonly bomContainer: Locator;
  readonly bomItems: Locator;

  readonly submitButton: Locator;
  readonly submitNotice: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bomContainer = page.locator('.bill-of-materials');
    this.bomItems = page.locator('.bom-item');
    this.submitButton = page.locator('.bom-submit-button');
    this.submitNotice = page.locator('.bom-submit-notice');
  }

  async waitForBOMReady(): Promise<void> {
    await this.bomContainer.waitFor({ state: 'visible' });
  }

  async getItemCount(): Promise<number> {
    return await this.bomItems.count();
  }

  async getBOMEntries(): Promise<BOMEntry[]> {
    const entries: BOMEntry[] = [];
    const count = await this.bomItems.count();

    for (let i = 0; i < count; i++) {
      const item = this.bomItems.nth(i);
      const name = await item.locator('.bom-item-name').textContent() || '';
      const size = await item.locator('.bom-item-size').textContent() || '';
      const quantityText = await item.locator('.bom-item-quantity').textContent() || '0';
      const quantity = parseInt(quantityText.replace(/[^0-9]/g, ''), 10);

      entries.push({ name: name.trim(), size: size.trim(), quantity });
    }

    return entries;
  }

  async getEntryByName(name: string): Promise<BOMEntry | null> {
    const entries = await this.getBOMEntries();
    return entries.find((e) => e.name === name) || null;
  }

  async getTotalQuantity(): Promise<number> {
    const entries = await this.getBOMEntries();
    return entries.reduce((sum, entry) => sum + entry.quantity, 0);
  }

  async isEmpty(): Promise<boolean> {
    const count = await this.getItemCount();
    return count === 0;
  }

  async hasEntry(name: string): Promise<boolean> {
    const entry = await this.getEntryByName(name);
    return entry !== null;
  }
}
