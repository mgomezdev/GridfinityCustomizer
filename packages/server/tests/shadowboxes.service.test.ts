import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Client } from '@libsql/client';

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
import {
  createPendingRow,
  updateToReady,
  updateToError,
  listByUser,
  getById,
  deleteShadowbox,
} from '../src/services/shadowboxes.service.js';

let db: Client;

beforeEach(async () => {
  db = testClient as Client;
  await runMigrations(db);
  // Clean up shadowboxes and users before each test for isolation
  await db.execute({ sql: 'DELETE FROM shadowboxes', args: [] });
  await db.execute({ sql: 'DELETE FROM users', args: [] });
  // Insert a test user
  await db.execute({ sql: "INSERT OR IGNORE INTO users (id, username, email, password_hash, role) VALUES (1, 'testuser', 'test@example.com', 'x', 'user')", args: [] });
});

describe('shadowboxes.service', () => {
  it('createPendingRow inserts a row with status=pending', async () => {
    const id = await createPendingRow(db, {
      userId: 1,
      name: 'screwdriver',
      thicknessMm: 8,
    });
    expect(typeof id).toBe('string');
    expect(id).toHaveLength(36); // UUID

    const rows = await db.execute({ sql: "SELECT * FROM shadowboxes WHERE id = ?", args: [id] });
    expect(rows.rows[0].status).toBe('pending');
    expect(rows.rows[0].name).toBe('screwdriver');
  });

  it('updateToReady sets status, stlPath, gridX, gridY, svgPath', async () => {
    const id = await createPendingRow(db, { userId: 1, name: 'allen', thicknessMm: 6 });
    await updateToReady(db, id, {
      stlPath: '/data/shadowboxes/1/abc.stl',
      gridX: 2,
      gridY: 3,
      svgPath: 'M 0 0 Z',
      rotationDeg: 45,
      toleranceMm: 0.4,
      stackable: false,
    });
    const rows = await db.execute({ sql: "SELECT * FROM shadowboxes WHERE id = ?", args: [id] });
    expect(rows.rows[0].status).toBe('ready');
    expect(rows.rows[0].grid_x).toBe(2);
  });

  it('updateToError sets status=error', async () => {
    const id = await createPendingRow(db, { userId: 1, name: 'bit', thicknessMm: 5 });
    await updateToError(db, id);
    const rows = await db.execute({ sql: "SELECT * FROM shadowboxes WHERE id = ?", args: [id] });
    expect(rows.rows[0].status).toBe('error');
  });

  it('listByUser returns only the requesting user rows', async () => {
    await db.execute({ sql: "INSERT OR IGNORE INTO users (id, username, email, password_hash, role) VALUES (2, 'other', 'other@example.com', 'x', 'user')", args: [] });
    await createPendingRow(db, { userId: 1, name: 'a', thicknessMm: 5 });
    await createPendingRow(db, { userId: 2, name: 'b', thicknessMm: 5 });
    const rows = await listByUser(db, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('a');
  });

  it('deleteShadowbox removes the row', async () => {
    const id = await createPendingRow(db, { userId: 1, name: 'drill', thicknessMm: 10 });
    await deleteShadowbox(db, id);
    const row = await getById(db, id);
    expect(row).toBeNull();
  });
});
