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

// Mock image service
vi.mock('../src/services/image.service.js', () => ({
  processAndSaveImage: vi.fn().mockResolvedValue({
    filePath: 'ref-lib/test-image.png',
    sizeBytes: 2048,
  }),
  deleteImage: vi.fn().mockResolvedValue(2048),
}));

// Import after mocks
const { createApp } = await import('../src/app.js');
const { client: testClient } = await import('../src/db/connection.js');
const { runMigrations } = await import('../src/db/migrate.js');

describe('Layout status workflow', () => {
  let app: ReturnType<typeof createApp>;
  let userToken: string;
  let user2Token: string;
  let adminToken: string;

  beforeAll(async () => {
    await runMigrations(testClient);
    app = createApp();

    // Register regular user
    const res1 = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'status-user@example.com', username: 'statususer', password: 'password123' });
    userToken = res1.body.data.accessToken;

    // Register second user
    const res2 = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'status-user2@example.com', username: 'statususer2', password: 'password123' });
    user2Token = res2.body.data.accessToken;

    // Register and promote admin
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'status-admin@example.com', username: 'statusadmin', password: 'password123' });

    await testClient.execute({
      sql: "UPDATE users SET role = 'admin' WHERE username = 'statusadmin'",
      args: [],
    });

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'status-admin@example.com', password: 'password123' });
    adminToken = adminLoginRes.body.data.accessToken;
  });

  afterAll(() => {
    testClient.close();
  });

  // Helper to create a layout
  async function createLayout(token: string, name = 'Test Layout') {
    const res = await request(app)
      .post('/api/v1/layouts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name,
        gridX: 4,
        gridY: 4,
        widthMm: 168,
        depthMm: 168,
        placedItems: [
          { itemId: 'bins_standard:bin-1x1', x: 0, y: 0, width: 1, height: 1, rotation: 0 },
        ],
      });
    expect(res.status).toBe(201);
    return res.body.data;
  }

  describe('Layout creation includes status', () => {
    it('new layouts have draft status', async () => {
      const layout = await createLayout(userToken, 'Draft Check');
      expect(layout.status).toBe('draft');
    });

    it('list endpoint includes status field', async () => {
      const res = await request(app)
        .get('/api/v1/layouts')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0]).toHaveProperty('status');
      expect(res.body.data[0].status).toBe('draft');
    });

    it('detail endpoint includes status field', async () => {
      const layout = await createLayout(userToken, 'Detail Status Check');
      const res = await request(app)
        .get(`/api/v1/layouts/${layout.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('draft');
    });
  });

  describe('PATCH /api/v1/layouts/:id/submit', () => {
    it('submits a draft layout', async () => {
      const layout = await createLayout(userToken, 'Submit Test');

      const res = await request(app)
        .patch(`/api/v1/layouts/${layout.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('submitted');
    });

    it('rejects submitting a non-draft layout', async () => {
      const layout = await createLayout(userToken, 'Already Submitted');
      await request(app)
        .patch(`/api/v1/layouts/${layout.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`);

      const res = await request(app)
        .patch(`/api/v1/layouts/${layout.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(409);
    });

    it('rejects non-owner submit', async () => {
      const layout = await createLayout(userToken, 'Owner Only Submit');

      const res = await request(app)
        .patch(`/api/v1/layouts/${layout.id}/submit`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
    });

    it('requires authentication', async () => {
      const res = await request(app)
        .patch('/api/v1/layouts/1/submit');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/layouts/:id/withdraw', () => {
    it('owner can withdraw a submitted layout', async () => {
      const layout = await createLayout(userToken, 'Withdraw Test');
      await request(app)
        .patch(`/api/v1/layouts/${layout.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`);

      const res = await request(app)
        .patch(`/api/v1/layouts/${layout.id}/withdraw`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('draft');
    });

    it('admin can withdraw a submitted layout', async () => {
      const layout = await createLayout(userToken, 'Admin Withdraw');
      await request(app)
        .patch(`/api/v1/layouts/${layout.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`);

      const res = await request(app)
        .patch(`/api/v1/layouts/${layout.id}/withdraw`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('draft');
    });

    it('rejects withdrawing a non-submitted layout', async () => {
      const layout = await createLayout(userToken, 'Draft Withdraw');

      const res = await request(app)
        .patch(`/api/v1/layouts/${layout.id}/withdraw`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(409);
    });

    it('non-owner non-admin cannot withdraw', async () => {
      const layout = await createLayout(userToken, 'Unauthorized Withdraw');
      await request(app)
        .patch(`/api/v1/layouts/${layout.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`);

      const res = await request(app)
        .patch(`/api/v1/layouts/${layout.id}/withdraw`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/admin/layouts/:id/deliver', () => {
    it('admin can deliver a submitted layout', async () => {
      const layout = await createLayout(userToken, 'Deliver Test');
      await request(app)
        .patch(`/api/v1/layouts/${layout.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`);

      const res = await request(app)
        .patch(`/api/v1/admin/layouts/${layout.id}/deliver`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('delivered');
    });

    it('rejects delivering a non-submitted layout', async () => {
      const layout = await createLayout(userToken, 'Draft Deliver');

      const res = await request(app)
        .patch(`/api/v1/admin/layouts/${layout.id}/deliver`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });

    it('non-admin cannot deliver', async () => {
      const layout = await createLayout(userToken, 'User Deliver');
      await request(app)
        .patch(`/api/v1/layouts/${layout.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`);

      const res = await request(app)
        .patch(`/api/v1/admin/layouts/${layout.id}/deliver`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Delivered layout protection', () => {
    let deliveredLayoutId: number;

    beforeAll(async () => {
      const layout = await createLayout(userToken, 'Protected Delivered');
      await request(app)
        .patch(`/api/v1/layouts/${layout.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`);
      await request(app)
        .patch(`/api/v1/admin/layouts/${layout.id}/deliver`)
        .set('Authorization', `Bearer ${adminToken}`);
      deliveredLayoutId = layout.id;
    });

    it('rejects PUT update on delivered layout', async () => {
      const res = await request(app)
        .put(`/api/v1/layouts/${deliveredLayoutId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Hacked',
          gridX: 4,
          gridY: 4,
          widthMm: 168,
          depthMm: 168,
          placedItems: [],
        });

      expect(res.status).toBe(409);
    });

    it('rejects PATCH update on delivered layout', async () => {
      const res = await request(app)
        .patch(`/api/v1/layouts/${deliveredLayoutId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hacked' });

      expect(res.status).toBe(409);
    });

    it('rejects DELETE on delivered layout', async () => {
      const res = await request(app)
        .delete(`/api/v1/layouts/${deliveredLayoutId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(409);
    });

    it('rejects withdraw on delivered layout', async () => {
      const res = await request(app)
        .patch(`/api/v1/layouts/${deliveredLayoutId}/withdraw`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });

    it('allows GET on delivered layout', async () => {
      const res = await request(app)
        .get(`/api/v1/layouts/${deliveredLayoutId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('delivered');
    });
  });

  describe('Admin layout access', () => {
    it('admin can view any layout (bypass ownership)', async () => {
      const layout = await createLayout(userToken, 'Admin Viewable');

      const res = await request(app)
        .get(`/api/v1/layouts/${layout.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Admin Viewable');
      expect(res.body.data.ownerUsername).toBe('statususer');
    });

    it('admin can update submitted layout they do not own', async () => {
      const layout = await createLayout(userToken, 'Admin Editable');
      await request(app)
        .patch(`/api/v1/layouts/${layout.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`);

      const res = await request(app)
        .put(`/api/v1/layouts/${layout.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Edited',
          gridX: 4,
          gridY: 4,
          widthMm: 168,
          depthMm: 168,
          placedItems: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Admin Edited');
    });
  });

  describe('GET /api/v1/admin/layouts', () => {
    it('lists all layouts for admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/layouts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      // Should include ownerUsername and ownerEmail
      expect(res.body.data[0]).toHaveProperty('ownerUsername');
      expect(res.body.data[0]).toHaveProperty('ownerEmail');
      expect(typeof res.body.data[0].ownerEmail).toBe('string');
    });

    it('filters by status', async () => {
      const res = await request(app)
        .get('/api/v1/admin/layouts?status=delivered')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      for (const layout of res.body.data) {
        expect(layout.status).toBe('delivered');
      }
    });

    it('non-admin cannot access', async () => {
      const res = await request(app)
        .get('/api/v1/admin/layouts')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('supports pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/layouts?limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      if (res.body.hasMore) {
        expect(res.body.nextCursor).toBeDefined();
      }
    });
  });

  describe('GET /api/v1/admin/layouts/count', () => {
    it('returns submitted count for admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/layouts/count')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('submitted');
      expect(typeof res.body.data.submitted).toBe('number');
    });

    it('non-admin cannot access', async () => {
      const res = await request(app)
        .get('/api/v1/admin/layouts/count')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });
});
