import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import pino from 'pino';

// Mock the connection module to use in-memory DB
vi.mock('../src/db/connection.js', async () => {
  const { createClient } = await import('@libsql/client');
  const { drizzle } = await import('drizzle-orm/libsql');
  const schema = await import('../src/db/schema.js');

  const client = createClient({ url: ':memory:' });
  const db = drizzle(client, { schema });

  return { db, client };
});

// Mock the logger with a real pino instance (silent) so pino-http works
vi.mock('../src/logger.js', () => ({
  logger: pino({ level: 'silent' }),
}));

// Import after mocks
const { createApp } = await import('../src/app.js');
const { client: testClient } = await import('../src/db/connection.js');
const { runMigrations } = await import('../src/db/migrate.js');

async function seedTestData(): Promise<void> {
  const now = new Date().toISOString();

  // Insert categories
  await testClient.execute({
    sql: `INSERT INTO categories (id, name, color, sort_order) VALUES (?, ?, ?, ?)`,
    args: ['bin', 'Bin', '#3B82F6', 0],
  });
  await testClient.execute({
    sql: `INSERT INTO categories (id, name, color, sort_order) VALUES (?, ?, ?, ?)`,
    args: ['labeled', 'Labeled', '#8B5CF6', 1],
  });
  await testClient.execute({
    sql: `INSERT INTO categories (id, name, color, sort_order) VALUES (?, ?, ?, ?)`,
    args: ['utensil', 'Utensil', '#10B981', 2],
  });

  // Insert libraries
  await testClient.execute({
    sql: `INSERT INTO libraries (id, name, description, version, is_active, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
    args: ['default', 'Simple Bins', 'Default library', '1.0.0', 0, now, now],
  });
  await testClient.execute({
    sql: `INSERT INTO libraries (id, name, description, version, is_active, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
    args: ['inactive-lib', 'Inactive Library', 'An inactive library', '1.0.0', 1, now, now],
  });

  // Insert items
  await testClient.execute({
    sql: `INSERT INTO library_items (library_id, id, name, width_units, height_units, color, image_path, is_active, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    args: ['default', 'bin-1x1', '1x1 Bin', 1, 1, '#3B82F6', null, 0, now, now],
  });
  await testClient.execute({
    sql: `INSERT INTO library_items (library_id, id, name, width_units, height_units, color, image_path, is_active, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    args: ['default', 'bin-2x3', '2x3 Bin', 2, 3, '#3B82F6', null, 1, now, now],
  });
  await testClient.execute({
    sql: `INSERT INTO library_items (library_id, id, name, width_units, height_units, color, image_path, is_active, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    args: ['default', 'bin-labeled-1x1', '1x1 Bin (w label)', 1, 1, '#3B82F6', null, 2, now, now],
  });

  // Insert item-category associations
  await testClient.execute({
    sql: `INSERT INTO item_categories (library_id, item_id, category_id) VALUES (?, ?, ?)`,
    args: ['default', 'bin-1x1', 'bin'],
  });
  await testClient.execute({
    sql: `INSERT INTO item_categories (library_id, item_id, category_id) VALUES (?, ?, ?)`,
    args: ['default', 'bin-2x3', 'bin'],
  });
  await testClient.execute({
    sql: `INSERT INTO item_categories (library_id, item_id, category_id) VALUES (?, ?, ?)`,
    args: ['default', 'bin-labeled-1x1', 'bin'],
  });
  await testClient.execute({
    sql: `INSERT INTO item_categories (library_id, item_id, category_id) VALUES (?, ?, ?)`,
    args: ['default', 'bin-labeled-1x1', 'labeled'],
  });
}

describe('Library endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    await runMigrations(testClient);
    await seedTestData();
    app = createApp();
  });

  afterAll(() => {
    testClient.close();
  });

  describe('GET /api/v1/libraries', () => {
    it('returns list of libraries', async () => {
      const res = await request(app).get('/api/v1/libraries');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('filters to active-only libraries', async () => {
      const res = await request(app).get('/api/v1/libraries?active=true');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe('default');
    });

    it('includes item counts', async () => {
      const res = await request(app).get('/api/v1/libraries');

      const defaultLib = res.body.data.find((l: { id: string }) => l.id === 'default');
      expect(defaultLib).toBeDefined();
      expect(defaultLib.itemCount).toBe(3);
    });
  });

  describe('GET /api/v1/libraries/:id', () => {
    it('returns single library', async () => {
      const res = await request(app).get('/api/v1/libraries/default');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('default');
      expect(res.body.data.name).toBe('Simple Bins');
      expect(res.body.data.itemCount).toBe(3);
    });

    it('returns 404 for non-existent library', async () => {
      const res = await request(app).get('/api/v1/libraries/non-existent');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/libraries/:libraryId/items', () => {
    it('returns items for a library', async () => {
      const res = await request(app).get('/api/v1/libraries/default/items');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('includes categories for each item', async () => {
      const res = await request(app).get('/api/v1/libraries/default/items');

      const labeledItem = res.body.data.find(
        (i: { id: string }) => i.id === 'bin-labeled-1x1',
      );
      expect(labeledItem).toBeDefined();
      expect(labeledItem.categories).toContain('bin');
      expect(labeledItem.categories).toContain('labeled');
    });

    it('filters by category', async () => {
      const res = await request(app).get(
        '/api/v1/libraries/default/items?category=labeled',
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe('bin-labeled-1x1');
    });

    it('filters by width', async () => {
      const res = await request(app).get(
        '/api/v1/libraries/default/items?width=2',
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe('bin-2x3');
    });

    it('filters by height', async () => {
      const res = await request(app).get(
        '/api/v1/libraries/default/items?height=3',
      );

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe('bin-2x3');
    });

    it('returns 404 for non-existent library', async () => {
      const res = await request(app).get('/api/v1/libraries/non-existent/items');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/libraries/:libraryId/items/:itemId', () => {
    it('returns a single item', async () => {
      const res = await request(app).get(
        '/api/v1/libraries/default/items/bin-1x1',
      );

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('bin-1x1');
      expect(res.body.data.name).toBe('1x1 Bin');
      expect(res.body.data.categories).toContain('bin');
    });

    it('returns 404 for non-existent item', async () => {
      const res = await request(app).get(
        '/api/v1/libraries/default/items/non-existent',
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/categories', () => {
    it('returns all categories', async () => {
      const res = await request(app).get('/api/v1/categories');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('includes category properties', async () => {
      const res = await request(app).get('/api/v1/categories');

      const binCat = res.body.data.find((c: { id: string }) => c.id === 'bin');
      expect(binCat).toBeDefined();
      expect(binCat.name).toBe('Bin');
      expect(binCat.color).toBe('#3B82F6');
    });
  });
});
