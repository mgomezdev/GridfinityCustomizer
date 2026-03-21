import type { Page } from '@playwright/test';

export class ShadowboxPage {
  constructor(private page: Page) {}

  async navigateToNew() {
    await this.page.goto('/shadowbox/new');
  }

  async uploadPhoto(filePath: string) {
    await this.page.setInputFiles('[id="photo"]', filePath);
  }

  async fillName(name: string) {
    await this.page.fill('[id="name"]', name);
  }

  async clickProcess() {
    await this.page.click('button:has-text("Process")');
  }

  async waitForEditor() {
    await this.page.waitForURL('**/shadowbox/edit**');
  }

  async clickGenerateAndSave() {
    await this.page.click('button:has-text("Generate")');
  }

  async waitForLibraryItem(name: string) {
    await this.page.waitForSelector(`.shadowbox-library-item:has-text("${name}")`);
  }
}
