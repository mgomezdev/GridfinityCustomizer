import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import pino from 'pino';

// Mock the connection module to use in-memory SQLite
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

vi.mock('../src/services/shadowboxSidecar.service.js', () => ({
  processImage: vi.fn(),
  generateShadowbox: vi.fn(),
  SidecarError: class SidecarError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 500) {
      super(message);
      this.name = 'SidecarError';
      this.statusCode = statusCode;
    }
  },
}));

vi.mock('../src/middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { userId: 1, role: 'user' };
    next();
  },
  optionalAuth: (_req: any, _res: any, next: any) => {
    next();
  },
}));

// Import after mocks
const { createApp } = await import('../src/app.js');
const { client: testClient } = await import('../src/db/connection.js');
const { runMigrations } = await import('../src/db/migrate.js');
import * as sidecar from '../src/services/shadowboxSidecar.service.js';

beforeEach(async () => {
  await runMigrations(testClient);
  await testClient.execute({ sql: 'DELETE FROM shadowboxes', args: [] });
  await testClient.execute({ sql: 'DELETE FROM users', args: [] });
  await testClient.execute({
    sql: "INSERT OR IGNORE INTO users (id, username, email, password_hash, role) VALUES (1, 'testuser', 'test@example.com', 'x', 'user')",
    args: [],
  });
});

describe('POST /api/v1/shadowboxes/process-image', () => {
  it('returns svgPath on success', async () => {
    const app = createApp();
    (sidecar.processImage as any).mockResolvedValueOnce({
      svgPath: 'M 0 0 Z',
      widthMm: 10,
      heightMm: 10,
      scaleMmPerPx: 0.1,
    });

    const res = await request(app)
      .post('/api/v1/shadowboxes/process-image')
      .attach('image', Buffer.from('fake'), { filename: 'test.jpg', contentType: 'image/jpeg' })
      .field('thicknessMm', '8')
      .field('name', 'my-tool');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ svgPath: 'M 0 0 Z', shadowboxId: expect.any(String) });
  });

  it('returns 400 when image is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/v1/shadowboxes/process-image')
      .field('thicknessMm', '8')
      .field('name', 'my-tool');

    expect(res.status).toBe(400);
  });

  it('returns 400 when thicknessMm is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/v1/shadowboxes/process-image')
      .attach('image', Buffer.from('fake'), { filename: 'test.jpg', contentType: 'image/jpeg' })
      .field('name', 'my-tool');

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/shadowboxes', () => {
  it('generates STL and updates row to ready', async () => {
    const app = createApp();

    // First create a pending row via process-image
    (sidecar.processImage as any).mockResolvedValueOnce({
      svgPath: 'M 0 0 Z',
      widthMm: 10,
      heightMm: 10,
      scaleMmPerPx: 0.1,
    });
    const processRes = await request(app)
      .post('/api/v1/shadowboxes/process-image')
      .attach('image', Buffer.from('fake'), { filename: 'test.jpg', contentType: 'image/jpeg' })
      .field('thicknessMm', '8')
      .field('name', 'gen-test');

    const { shadowboxId } = processRes.body;

    (sidecar.generateShadowbox as any).mockResolvedValueOnce({
      stlBase64: Buffer.from('FAKE-STL').toString('base64'),
      gridX: 2,
      gridY: 3,
    });

    const genRes = await request(app)
      .post('/api/v1/shadowboxes')
      .send({
        shadowboxId,
        svgPath: 'M 0 0 Z',
        rotationDeg: 0,
        toleranceMm: 0.4,
        stackable: false,
      });

    expect(genRes.status).toBe(201);
    expect(genRes.body).toMatchObject({ id: shadowboxId, status: 'ready', gridX: 2, gridY: 3 });
  });

  it('returns 400 when shadowboxId is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/v1/shadowboxes')
      .send({ svgPath: 'M 0 0 Z', rotationDeg: 0 });

    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent shadowboxId', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/v1/shadowboxes')
      .send({
        shadowboxId: 'nonexistent-uuid',
        svgPath: 'M 0 0 Z',
        rotationDeg: 0,
        toleranceMm: 0.4,
        stackable: false,
      });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/shadowboxes', () => {
  it('returns list of user shadowboxes', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/shadowboxes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('DELETE /api/v1/shadowboxes/:id', () => {
  it('returns 404 for non-existent id', async () => {
    const app = createApp();
    const res = await request(app).delete('/api/v1/shadowboxes/nonexistent-uuid');
    expect(res.status).toBe(404);
  });

  it('deletes existing shadowbox and returns 204', async () => {
    const app = createApp();

    // Create a pending row first
    (sidecar.processImage as any).mockResolvedValueOnce({
      svgPath: 'M 0 0 Z',
      widthMm: 10,
      heightMm: 10,
      scaleMmPerPx: 0.1,
    });
    const processRes = await request(app)
      .post('/api/v1/shadowboxes/process-image')
      .attach('image', Buffer.from('fake'), { filename: 'test.jpg', contentType: 'image/jpeg' })
      .field('thicknessMm', '8')
      .field('name', 'delete-test');

    const { shadowboxId } = processRes.body;

    const delRes = await request(app).delete(`/api/v1/shadowboxes/${shadowboxId}`);
    expect(delRes.status).toBe(204);
  });
});
