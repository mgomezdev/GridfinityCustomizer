import { test, expect, type Page, type Route } from '@playwright/test';
import { ShadowboxPage } from '../pages/ShadowboxPage';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ApiShadowbox } from '../../shared/src/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Mock auth helpers (same pattern as reference-images.spec.ts) ---

const JWT_HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
const JWT_PAYLOAD = Buffer.from(
  JSON.stringify({ userId: 1, role: 'user', exp: 9999999999 }),
).toString('base64');
const FAKE_ACCESS_TOKEN = `${JWT_HEADER}.${JWT_PAYLOAD}.fakesig`;

const FAKE_SHADOWBOX_ID = 'sb-e2e-001';

const MOCK_PROCESS_RESULT = {
  shadowboxId: FAKE_SHADOWBOX_ID,
  svgPath: 'M 0 0 L 50 0 L 50 50 L 0 50 Z',
  widthMm: 50,
  heightMm: 50,
  scaleMmPerPx: 1.0,
};

function makeMockShadowbox(name: string, status: ApiShadowbox['status'] = 'ready'): ApiShadowbox {
  return {
    id: FAKE_SHADOWBOX_ID,
    name,
    thicknessMm: 8,
    gridX: 2,
    gridY: 2,
    status,
    createdAt: '2024-01-01T00:00:00.000Z',
  };
}

async function setupApiMocks(page: Page, shadowboxName: string) {
  // Auth refresh — makes AuthContext think we're logged in
  await page.route('**/api/v1/auth/refresh', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          accessToken: FAKE_ACCESS_TOKEN,
          refreshToken: 'e2e-fake-refresh-token',
        },
      }),
    });
  });

  // Auth me — returns the current user
  await page.route('**/api/v1/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' },
      }),
    });
  });

  // Process image — returns fake SVG path and dimensions
  await page.route('**/api/v1/shadowboxes/process-image', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PROCESS_RESULT),
    });
  });

  // GET/POST shadowboxes list and generation
  await page.route('**/api/v1/shadowboxes', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([makeMockShadowbox(shadowboxName)]),
      });
    } else if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeMockShadowbox(shadowboxName)),
      });
    } else {
      await route.continue();
    }
  });
}

async function seedAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('gridfinity_refresh_token', 'e2e-fake-refresh-token');
  });
}

// --- Tests ---

test.describe('Shadowbox creation flow', () => {
  const testImagePath = path.join(__dirname, '../fixtures/test-tool.jpg');

  test.beforeEach(async ({ page }) => {
    const testName = 'e2e-test-tool';
    await setupApiMocks(page, testName);
    await seedAuth(page);
  });

  test('upload → edit → library section shows new item', async ({ page }) => {
    const shadowboxPage = new ShadowboxPage(page);

    await shadowboxPage.navigateToNew();
    await expect(page.locator('h1')).toContainText('New Shadowbox');

    await shadowboxPage.uploadPhoto(testImagePath);
    await shadowboxPage.fillName('e2e-test-tool');
    await shadowboxPage.clickProcess();

    await shadowboxPage.waitForEditor();
    expect(page.url()).toContain('/shadowbox/edit');
    await expect(page.locator('h1')).toContainText('Edit Shadowbox');

    await shadowboxPage.clickGenerateAndSave();

    await page.waitForURL('/');
    await shadowboxPage.waitForLibraryItem('e2e-test-tool');
    await expect(page.locator('.shadowbox-library-item:has-text("e2e-test-tool")')).toBeVisible();
  });

  test('upload page shows error when no file selected', async ({ page }) => {
    const shadowboxPage = new ShadowboxPage(page);

    await shadowboxPage.navigateToNew();
    await shadowboxPage.fillName('e2e-test-tool');
    await shadowboxPage.clickProcess();

    await expect(page.locator('[role="alert"]')).toContainText('Please select a photo');
  });

  test('editor page shows fallback when no session state', async ({ page }) => {
    // Navigate directly without going through upload (no sessionStorage state)
    await page.goto('/shadowbox/edit?id=nonexistent');

    await expect(page.locator('.shadowbox-editor-page')).toBeVisible();
    await expect(page.locator('text=No editor state found')).toBeVisible();
  });
});
