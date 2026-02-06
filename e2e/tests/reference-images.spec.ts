import { test, expect } from '@playwright/test';
import { GridPage } from '../pages/GridPage';
import { LibraryPage } from '../pages/LibraryPage';
import { html5DragDrop } from '../utils/drag-drop';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REFERENCE_IMAGES_STORAGE_KEY = 'gridfinity-reference-images';

// Create a small test image as a Buffer (1x1 red pixel PNG)
const createTestImageBuffer = (): Buffer => {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    'base64'
  );
};

test.describe('Reference Images', () => {
  let gridPage: GridPage;
  let libraryPage: LibraryPage;
  let testImagePath: string;

  test.beforeEach(async ({ page }) => {
    gridPage = new GridPage(page);
    libraryPage = new LibraryPage(page);

    // Create a temporary test image file
    const testDir = path.join(__dirname, '..', 'fixtures');
    testImagePath = path.join(testDir, 'test-reference-image.png');

    // Ensure fixtures directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Write test image
    fs.writeFileSync(testImagePath, createTestImageBuffer());

    // Navigate first, then clear localStorage
    await gridPage.goto();

    await page.evaluate((key) => {
      localStorage.removeItem(key);
    }, REFERENCE_IMAGES_STORAGE_KEY);

    // Reload to apply clean state
    await page.reload();
    await gridPage.waitForGridReady();
    await libraryPage.waitForLibraryReady();
  });

  test.afterEach(() => {
    // Clean up test image file
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  test('can upload a reference image', async ({ page }) => {
    // Verify no reference images initially
    const initialImages = page.locator('.reference-image-overlay');
    await expect(initialImages).toHaveCount(0);

    // Find and click the upload button
    const uploadButton = page.locator('.reference-image-uploader__button');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toHaveText('Upload Reference Image');

    // Get the file input
    const fileInput = page.locator('input[type="file"][accept="image/*"]');

    // Upload the test image
    await fileInput.setInputFiles(testImagePath);

    // Wait for image to be processed and rendered
    await page.waitForTimeout(200);

    // Verify image appears on grid
    const referenceImages = page.locator('.reference-image-overlay');
    await expect(referenceImages).toHaveCount(1);

    // Verify image element is rendered
    const imageElement = page.locator('.reference-image-overlay img');
    await expect(imageElement).toBeVisible();
  });

  test('can adjust image opacity', async ({ page }) => {
    // Upload an image first
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(200);

    // Switch to images mode
    const imagesButton = page.locator('.interaction-mode-toggle__button').filter({ hasText: 'Images' });
    await expect(imagesButton).toBeEnabled();
    await imagesButton.click();

    // Select the image by clicking on it
    const referenceImage = page.locator('.reference-image-overlay').first();
    await referenceImage.click();

    // Wait for controls to appear
    await page.waitForTimeout(100);

    // Verify controls are visible
    const controls = page.locator('.reference-image-controls');
    await expect(controls).toBeVisible();

    // Find and adjust opacity slider
    const opacitySlider = page.locator('#opacity-slider');
    await expect(opacitySlider).toBeVisible();

    // Get initial opacity
    const initialOpacity = await referenceImage.evaluate((el) => {
      return window.getComputedStyle(el).opacity;
    });

    // Change opacity to 80%
    await opacitySlider.fill('80');
    await page.waitForTimeout(100);

    // Verify opacity changed
    const newOpacity = await referenceImage.evaluate((el) => {
      return window.getComputedStyle(el).opacity;
    });
    expect(parseFloat(newOpacity)).toBeCloseTo(0.8, 1);
    expect(newOpacity).not.toBe(initialOpacity);

    // Verify label shows percentage
    const opacityLabel = page.locator('.reference-image-controls__label').filter({ hasText: 'Opacity' });
    await expect(opacityLabel).toContainText('80%');
  });

  test('can adjust image scale', async ({ page }) => {
    // Upload an image first
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(200);

    // Switch to images mode
    const imagesButton = page.locator('.interaction-mode-toggle__button').filter({ hasText: 'Images' });
    await imagesButton.click();

    // Select the image
    const referenceImage = page.locator('.reference-image-overlay').first();
    await referenceImage.click();
    await page.waitForTimeout(100);

    // Find and adjust scale slider
    const scaleSlider = page.locator('#scale-slider');
    await expect(scaleSlider).toBeVisible();

    // Get initial transform
    const initialTransform = await referenceImage.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });

    // Change scale to 150%
    await scaleSlider.fill('150');
    await page.waitForTimeout(100);

    // Verify scale changed
    const newTransform = await referenceImage.evaluate((el) => {
      return window.getComputedStyle(el).transform;
    });
    expect(newTransform).not.toBe(initialTransform);

    // Verify label shows percentage
    const scaleLabel = page.locator('.reference-image-controls__label').filter({ hasText: 'Scale' });
    await expect(scaleLabel).toContainText('150%');
  });

  test('can toggle interaction mode', async ({ page }) => {
    // Initially, Images button should be disabled (no images)
    const imagesButton = page.locator('.interaction-mode-toggle__button').filter({ hasText: 'Images' });
    await expect(imagesButton).toBeDisabled();

    // Items button should be active initially
    const itemsButton = page.locator('.interaction-mode-toggle__button').filter({ hasText: 'Items' });
    await expect(itemsButton).toHaveClass(/interaction-mode-toggle__button--active/);

    // Upload an image
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(200);

    // Images button should now be enabled
    await expect(imagesButton).toBeEnabled();

    // Click Images button
    await imagesButton.click();
    await page.waitForTimeout(100);

    // Images button should now be active
    await expect(imagesButton).toHaveClass(/interaction-mode-toggle__button--active/);
    await expect(itemsButton).not.toHaveClass(/interaction-mode-toggle__button--active/);

    // Switch back to Items mode
    await itemsButton.click();
    await page.waitForTimeout(100);

    // Items button should be active again
    await expect(itemsButton).toHaveClass(/interaction-mode-toggle__button--active/);
    await expect(imagesButton).not.toHaveClass(/interaction-mode-toggle__button--active/);
  });

  test('can lock and unlock image', async ({ page }) => {
    // Upload an image
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(200);

    // Switch to images mode and select image
    const imagesButton = page.locator('.interaction-mode-toggle__button').filter({ hasText: 'Images' });
    await imagesButton.click();

    const referenceImage = page.locator('.reference-image-overlay').first();
    await referenceImage.click();
    await page.waitForTimeout(100);

    // Find lock button
    const lockButton = page.locator('.reference-image-controls__button--lock');
    await expect(lockButton).toBeVisible();
    await expect(lockButton).toHaveText('Lock');

    // Get initial position
    const initialBox = await referenceImage.boundingBox();
    expect(initialBox).not.toBeNull();

    // Lock the image
    await lockButton.click();
    await page.waitForTimeout(100);

    // Button text should change to "Unlock"
    await expect(lockButton).toHaveText('Unlock');

    // Image should have locked class
    await expect(referenceImage).toHaveClass(/reference-image-overlay--locked/);

    // Try to drag the locked image (should not move)
    const gridContainer = gridPage.gridContainer;
    const gridBox = await gridContainer.boundingBox();
    if (gridBox) {
      // Attempt to drag to a new position
      await page.mouse.move(initialBox!.x + initialBox!.width / 2, initialBox!.y + initialBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(gridBox.x + 200, gridBox.y + 200);
      await page.mouse.up();
      await page.waitForTimeout(100);

      // Position should not have changed significantly
      const newBox = await referenceImage.boundingBox();
      expect(newBox?.x).toBeCloseTo(initialBox!.x, 0);
      expect(newBox?.y).toBeCloseTo(initialBox!.y, 0);
    }

    // Unlock the image
    await lockButton.click();
    await page.waitForTimeout(100);

    // Button text should change back to "Lock"
    await expect(lockButton).toHaveText('Lock');

    // Image should not have locked class
    await expect(referenceImage).not.toHaveClass(/reference-image-overlay--locked/);
  });

  test('can remove image', async ({ page }) => {
    // Upload an image
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(200);

    // Verify image exists
    let referenceImages = page.locator('.reference-image-overlay');
    await expect(referenceImages).toHaveCount(1);

    // Switch to images mode and select image
    const imagesButton = page.locator('.interaction-mode-toggle__button').filter({ hasText: 'Images' });
    await imagesButton.click();

    const referenceImage = page.locator('.reference-image-overlay').first();
    await referenceImage.click();
    await page.waitForTimeout(100);

    // Find and click remove button
    const removeButton = page.locator('.reference-image-controls__button--remove');
    await expect(removeButton).toBeVisible();
    await expect(removeButton).toHaveText('Remove');
    await removeButton.click();

    // Wait for removal
    await page.waitForTimeout(200);

    // Image should be gone
    referenceImages = page.locator('.reference-image-overlay');
    await expect(referenceImages).toHaveCount(0);

    // Controls should be gone
    const controls = page.locator('.reference-image-controls');
    await expect(controls).not.toBeVisible();

    // Images button should be disabled again
    await expect(imagesButton).toBeDisabled();
  });

  test('reference images persist after page reload', async ({ page }) => {
    // Upload an image
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(200);

    // Verify image exists
    let referenceImages = page.locator('.reference-image-overlay');
    await expect(referenceImages).toHaveCount(1);

    // Get the image data from localStorage
    const imageDataBefore = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, REFERENCE_IMAGES_STORAGE_KEY);

    expect(imageDataBefore).not.toBeNull();
    const parsedData = JSON.parse(imageDataBefore!);
    expect(parsedData.length).toBe(1);

    // Reload the page
    await page.reload();
    await gridPage.waitForGridReady();
    await page.waitForTimeout(200);

    // Image should still be there
    referenceImages = page.locator('.reference-image-overlay');
    await expect(referenceImages).toHaveCount(1);

    // Verify the image is actually visible
    const imageElement = page.locator('.reference-image-overlay img');
    await expect(imageElement).toBeVisible();

    // Verify localStorage still has the data
    const imageDataAfter = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, REFERENCE_IMAGES_STORAGE_KEY);

    expect(imageDataAfter).toBe(imageDataBefore);
  });

  test('placed items still work in items mode', async ({ page }) => {
    // Upload a reference image first
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(200);

    // Verify we're in items mode
    const itemsButton = page.locator('.interaction-mode-toggle__button').filter({ hasText: 'Items' });
    await expect(itemsButton).toHaveClass(/interaction-mode-toggle__button--active/);

    // Get initial placed item count
    const initialCount = await gridPage.getPlacedItemCount();
    expect(initialCount).toBe(0);

    // Drag a library item onto the grid
    const firstItem = libraryPage.libraryItems.first();
    await expect(firstItem).toBeVisible();

    await html5DragDrop(page, firstItem, gridPage.gridContainer, { x: 30, y: 30 });

    // Should have one placed item now
    const newCount = await gridPage.getPlacedItemCount();
    expect(newCount).toBe(1);

    // The item should be selected
    const selectedItems = page.locator('.placed-item.selected');
    await expect(selectedItems).toHaveCount(1);

    // Reference image should be visible with pointer-events: none in items mode
    const referenceImage = page.locator('.reference-image-overlay').first();
    await expect(referenceImage).toBeVisible();

    const pointerEvents = await referenceImage.evaluate((el) => {
      return window.getComputedStyle(el).pointerEvents;
    });
    expect(pointerEvents).toBe('none');
  });

  test('reference image is interactive only in images mode', async ({ page }) => {
    // Upload an image
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(200);

    const referenceImage = page.locator('.reference-image-overlay').first();

    // In items mode, image should have pointer-events: none
    let pointerEvents = await referenceImage.evaluate((el) => {
      return window.getComputedStyle(el).pointerEvents;
    });
    expect(pointerEvents).toBe('none');

    // Should not have interactive class
    await expect(referenceImage).not.toHaveClass(/reference-image-overlay--interactive/);

    // Switch to images mode
    const imagesButton = page.locator('.interaction-mode-toggle__button').filter({ hasText: 'Images' });
    await imagesButton.click();
    await page.waitForTimeout(100);

    // In images mode, image should have pointer-events: auto
    pointerEvents = await referenceImage.evaluate((el) => {
      return window.getComputedStyle(el).pointerEvents;
    });
    expect(pointerEvents).toBe('auto');

    // Should have interactive class
    await expect(referenceImage).toHaveClass(/reference-image-overlay--interactive/);
  });

  test('can upload multiple reference images', async ({ page }) => {
    // Upload first image
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(200);

    // Verify one image exists
    let referenceImages = page.locator('.reference-image-overlay');
    await expect(referenceImages).toHaveCount(1);

    // Upload second image
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(200);

    // Verify two images exist
    referenceImages = page.locator('.reference-image-overlay');
    await expect(referenceImages).toHaveCount(2);

    // Upload third image
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(200);

    // Verify three images exist
    referenceImages = page.locator('.reference-image-overlay');
    await expect(referenceImages).toHaveCount(3);
  });

  test('displays error for invalid file type', async ({ page }) => {
    // Create a text file instead of an image
    const testDir = path.join(__dirname, '..', 'fixtures');
    const textFilePath = path.join(testDir, 'test-text-file.txt');
    fs.writeFileSync(textFilePath, 'This is not an image');

    try {
      // Try to upload the text file
      const fileInput = page.locator('input[type="file"][accept="image/*"]');
      await fileInput.setInputFiles(textFilePath);
      await page.waitForTimeout(200);

      // Error message should appear
      const errorMessage = page.locator('.reference-image-uploader__error');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Please select a valid image file');

      // No images should be added
      const referenceImages = page.locator('.reference-image-overlay');
      await expect(referenceImages).toHaveCount(0);
    } finally {
      // Clean up text file
      if (fs.existsSync(textFilePath)) {
        fs.unlinkSync(textFilePath);
      }
    }
  });
});
