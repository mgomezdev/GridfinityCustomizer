# E2E Test Writer Agent

## Purpose

Specialized agent for writing end-to-end tests using Playwright.

## Capabilities

- Write E2E tests that simulate real user workflows
- Use Page Object Model pattern for maintainability
- Handle file uploads in browser context
- Test drag-and-drop interactions
- Verify visual state (opacity, position, visibility)
- Test localStorage persistence across page reloads
- Handle async operations and wait for elements
- Create test fixtures and utilities

## Tools Access

- Read files (to understand app behavior)
- Write/Edit E2E test files
- Run E2E tests (`npm run test:e2e`)
- Run E2E tests with UI (`npm run test:e2e:ui`)
- Run E2E tests in debug mode (`npm run test:e2e:debug`)

## Constraints

- Test files must use `.spec.ts` extension
- Use page objects from `e2e/pages/`
- Use test utilities from `e2e/utils/`
- Tests must be independent and idempotent
- Clean up test data after each test
- Use meaningful test descriptions

## Files Typically Modified

- `e2e/tests/*.spec.ts`
- `e2e/pages/*.ts` (page objects)
- `e2e/utils/*.ts` (test utilities)
- `e2e/fixtures/*.ts` (test data)

## E2E Patterns

### Basic Test Structure with Page Object

```typescript
import { test, expect } from '@playwright/test';
import { GridPage } from '../pages/GridPage';

test.describe('Reference Images', () => {
  test('user can upload and adjust reference image', async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Upload image
    await gridPage.uploadReferenceImage('test-image.png');

    // Verify and interact
    await expect(gridPage.referenceImageOverlay).toBeVisible();
    await gridPage.setImageOpacity(50);

    // Verify state
    const opacity = await gridPage.getImageOpacity();
    expect(opacity).toBe(50);
  });
});
```

### Page Object Model

```typescript
import { Page, Locator } from '@playwright/test';

export class GridPage {
  readonly page: Page;
  readonly referenceImageOverlay: Locator;
  readonly opacitySlider: Locator;
  readonly uploadButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.referenceImageOverlay = page.locator('.reference-image-overlay');
    this.opacitySlider = page.locator('[data-testid="opacity-slider"]');
    this.uploadButton = page.locator('[data-testid="upload-button"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async uploadReferenceImage(fileName: string) {
    const filePath = `e2e/fixtures/${fileName}`;
    await this.uploadButton.setInputFiles(filePath);
  }

  async setImageOpacity(value: number) {
    await this.opacitySlider.fill(value.toString());
  }

  async getImageOpacity(): Promise<number> {
    const value = await this.opacitySlider.inputValue();
    return parseInt(value, 10);
  }

  async dragImageTo(x: number, y: number) {
    const box = await this.referenceImageOverlay.boundingBox();
    if (!box) throw new Error('Image overlay not found');

    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(x, y);
    await this.page.mouse.up();
  }
}
```

### Testing File Uploads

```typescript
test('user can upload reference image', async ({ page }) => {
  const gridPage = new GridPage(page);
  await gridPage.goto();

  // Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('e2e/fixtures/test-image.png');

  // Verify upload
  await expect(gridPage.referenceImageOverlay).toBeVisible();
  await expect(page.locator('.upload-success')).toBeVisible();
});
```

### Testing Drag and Drop

```typescript
import { dragAndDrop } from '../utils/drag-drop';

test('user can drag and drop library item onto grid', async ({ page }) => {
  const gridPage = new GridPage(page);
  await gridPage.goto();

  const libraryItem = page.locator('[data-testid="library-item-bin"]');
  const dropTarget = page.locator('.grid-cell[data-x="0"][data-y="0"]');

  // Perform drag and drop
  await dragAndDrop(page, libraryItem, dropTarget);

  // Verify item was placed
  const placedItem = page.locator('.placed-item[data-x="0"][data-y="0"]');
  await expect(placedItem).toBeVisible();
});
```

### Testing localStorage Persistence

```typescript
import { getLocalStorage, setLocalStorage } from '../utils/localStorage';

test('grid state persists across page reloads', async ({ page }) => {
  const gridPage = new GridPage(page);
  await gridPage.goto();

  // Place an item
  await gridPage.placeItemAt(0, 0, 'bin');

  // Get localStorage state
  const state = await getLocalStorage(page, 'grid-items');
  expect(state).toBeDefined();

  // Reload page
  await page.reload();

  // Verify item still exists
  const placedItem = page.locator('.placed-item[data-x="0"][data-y="0"]');
  await expect(placedItem).toBeVisible();
});
```

### Testing Visual State

```typescript
test('opacity slider controls image transparency', async ({ page }) => {
  const gridPage = new GridPage(page);
  await gridPage.goto();
  await gridPage.uploadReferenceImage('test-image.png');

  // Set opacity to 50%
  await gridPage.setImageOpacity(50);

  // Verify CSS opacity
  const opacity = await gridPage.referenceImageOverlay.evaluate(
    (el) => window.getComputedStyle(el).opacity
  );
  expect(parseFloat(opacity)).toBeCloseTo(0.5, 1);
});
```

### Test Utilities

```typescript
// e2e/utils/drag-drop.ts
import { Page, Locator } from '@playwright/test';

export async function dragAndDrop(
  page: Page,
  source: Locator,
  target: Locator
) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Could not get bounding boxes');
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2
  );
  await page.mouse.up();
}
```

```typescript
// e2e/utils/localStorage.ts
import { Page } from '@playwright/test';

export async function getLocalStorage(
  page: Page,
  key: string
): Promise<string | null> {
  return await page.evaluate((k) => localStorage.getItem(k), key);
}

export async function setLocalStorage(
  page: Page,
  key: string,
  value: string
): Promise<void> {
  await page.evaluate(
    ({ k, v }) => localStorage.setItem(k, v),
    { k: key, v: value }
  );
}

export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}
```

### Setup and Teardown

```typescript
import { test } from '@playwright/test';
import { clearLocalStorage } from '../utils/localStorage';

test.beforeEach(async ({ page }) => {
  // Clear localStorage before each test
  await clearLocalStorage(page);
});

test.afterEach(async ({ page }) => {
  // Clean up any test data
  await clearLocalStorage(page);
});
```

### Waiting for Elements

```typescript
test('waits for async operations to complete', async ({ page }) => {
  const gridPage = new GridPage(page);
  await gridPage.goto();

  // Click button that triggers async operation
  await page.click('[data-testid="load-button"]');

  // Wait for loading indicator to disappear
  await expect(page.locator('.loading-spinner')).toBeHidden();

  // Wait for content to appear
  await expect(page.locator('.content')).toBeVisible();

  // Alternative: wait for specific state
  await page.waitForLoadState('networkidle');
});
```

### Testing Multiple Scenarios

```typescript
test.describe('Reference Image Manipulation', () => {
  test.beforeEach(async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();
    await gridPage.uploadReferenceImage('test-image.png');
  });

  test('can adjust opacity', async ({ page }) => {
    // Test opacity adjustment
  });

  test('can move image', async ({ page }) => {
    // Test image movement
  });

  test('can lock/unlock image', async ({ page }) => {
    // Test lock functionality
  });

  test('can remove image', async ({ page }) => {
    // Test removal
  });
});
```
