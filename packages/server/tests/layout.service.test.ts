import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { randomUUID } from 'crypto';

// Mock the connection module to use in-memory SQLite
vi.mock('../src/db/connection.js', async () => {
  const { createClient } = await import('@libsql/client');
  const { drizzle } = await import('drizzle-orm/libsql');
  const schema = await import('../src/db/schema.js');

  const client = createClient({ url: ':memory:' });
  const db = drizzle(client, { schema });

  return { db, client };
});

import { runMigrations } from '../src/db/migrate.js';
import { client as testClient } from '../src/db/connection.js';
import { createLayout, getLayoutById, updateLayout, cloneLayout } from '../src/services/layout.service.js';

beforeEach(async () => {
  await runMigrations(testClient);
  // Clean up tables in dependency order before each test
  await testClient.execute({ sql: 'DELETE FROM placed_items', args: [] });
  await testClient.execute({ sql: 'DELETE FROM reference_images', args: [] });
  await testClient.execute({ sql: 'DELETE FROM layouts', args: [] });
  await testClient.execute({ sql: 'DELETE FROM shadowboxes', args: [] });
  await testClient.execute({ sql: 'DELETE FROM user_storage', args: [] });
  await testClient.execute({ sql: 'DELETE FROM users', args: [] });
  // Insert a test user
  await testClient.execute({
    sql: "INSERT OR IGNORE INTO users (id, username, email, password_hash, role) VALUES (1, 'testuser', 'test@example.com', 'x', 'user')",
    args: [],
  });
});

describe('layout.service — shadowBoxId', () => {
  it('placed shadowbox item stores shadowBoxId on create', async () => {
    const sbId = randomUUID();
    await testClient.execute({
      sql: "INSERT INTO shadowboxes (id, user_id, name, thickness_mm, status) VALUES (?, 1, 'test', 8, 'ready')",
      args: [sbId],
    });

    const created = await createLayout(1, {
      name: 'Shadowbox Layout',
      gridX: 4,
      gridY: 4,
      widthMm: 168,
      depthMm: 168,
      placedItems: [
        {
          itemId: `shadowbox:${sbId}`,
          x: 0,
          y: 0,
          width: 2,
          height: 2,
          rotation: 0,
        },
      ],
    });

    expect(created.placedItems).toHaveLength(1);
    expect(created.placedItems[0].libraryId).toBe('shadowbox');
    expect(created.placedItems[0].itemId).toBe(sbId);
    expect(created.placedItems[0].shadowBoxId).toBe(sbId);
  });

  it('getLayoutById returns shadowBoxId on placed shadowbox items', async () => {
    const sbId = randomUUID();
    await testClient.execute({
      sql: "INSERT INTO shadowboxes (id, user_id, name, thickness_mm, status) VALUES (?, 1, 'test', 8, 'ready')",
      args: [sbId],
    });

    const created = await createLayout(1, {
      name: 'Shadowbox Fetch Layout',
      gridX: 4,
      gridY: 4,
      widthMm: 168,
      depthMm: 168,
      placedItems: [
        {
          itemId: `shadowbox:${sbId}`,
          x: 0,
          y: 0,
          width: 2,
          height: 2,
          rotation: 0,
        },
      ],
    });

    const layout = await getLayoutById(created.id, 1);
    expect(layout.placedItems).toHaveLength(1);
    expect(layout.placedItems[0].shadowBoxId).toBe(sbId);
  });

  it('placed shadowbox item stores shadowBoxId on updateLayout', async () => {
    const sbId = randomUUID();
    await testClient.execute({
      sql: "INSERT INTO shadowboxes (id, user_id, name, thickness_mm, status) VALUES (?, 1, 'test', 8, 'ready')",
      args: [sbId],
    });

    // Create an initial layout without a shadowbox item
    const created = await createLayout(1, {
      name: 'Update Test Layout',
      gridX: 4,
      gridY: 4,
      widthMm: 168,
      depthMm: 168,
      placedItems: [],
    });

    // Update the layout to include a shadowbox item
    const updated = await updateLayout(created.id, 1, {
      name: 'Update Test Layout',
      gridX: 4,
      gridY: 4,
      widthMm: 168,
      depthMm: 168,
      placedItems: [
        {
          itemId: `shadowbox:${sbId}`,
          x: 1,
          y: 1,
          width: 2,
          height: 2,
          rotation: 0,
        },
      ],
    });

    expect(updated.placedItems).toHaveLength(1);
    expect(updated.placedItems[0].libraryId).toBe('shadowbox');
    expect(updated.placedItems[0].itemId).toBe(sbId);
    expect(updated.placedItems[0].shadowBoxId).toBe(sbId);
  });

  it('cloned layout preserves shadowBoxId on placed shadowbox items', async () => {
    const sbId = randomUUID();
    await testClient.execute({
      sql: "INSERT INTO shadowboxes (id, user_id, name, thickness_mm, status) VALUES (?, 1, 'test', 8, 'ready')",
      args: [sbId],
    });

    // Create a layout with a shadowbox item
    const original = await createLayout(1, {
      name: 'Clone Source Layout',
      gridX: 4,
      gridY: 4,
      widthMm: 168,
      depthMm: 168,
      placedItems: [
        {
          itemId: `shadowbox:${sbId}`,
          x: 0,
          y: 0,
          width: 2,
          height: 2,
          rotation: 0,
        },
      ],
    });

    // Clone the layout
    const cloned = await cloneLayout(original.id, 1);

    expect(cloned.placedItems).toHaveLength(1);
    expect(cloned.placedItems[0].libraryId).toBe('shadowbox');
    expect(cloned.placedItems[0].itemId).toBe(sbId);
    expect(cloned.placedItems[0].shadowBoxId).toBe(sbId);
  });

  it('non-shadowbox items have shadowBoxId as null', async () => {
    const created = await createLayout(1, {
      name: 'Regular Layout',
      gridX: 4,
      gridY: 4,
      widthMm: 168,
      depthMm: 168,
      placedItems: [
        {
          itemId: 'bins_standard:bin-1x1',
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          rotation: 0,
        },
      ],
    });

    expect(created.placedItems[0].shadowBoxId).toBeNull();
  });
});
