# Shadowbox Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shadowbox creation workflow to Gridfinity Customizer — users photograph a tool, the sidecar traces its silhouette, an SVG editor lets them adjust the shape, and a Gridfinity bin with a form-fitting cavity is generated as an STL for 3D printing.

**Architecture:** A Python/Flask sidecar container handles image processing (OpenCV) and STL generation (OpenSCAD). The Express backend proxies calls to the sidecar, persists metadata and STL files, and exposes CRUD endpoints. The React frontend adds an upload page, an SVG editor page, and a draggable "My Shadowboxes" sidebar section.

**Tech Stack:** Python 3.12 + Flask + OpenCV (sidecar), Express + TypeScript + Drizzle ORM + SQLite + multer (backend), React 19 + TypeScript + TanStack Query + Vite (frontend), Docker Compose (orchestration), Vitest + Supertest (tests), Playwright (E2E).

---

## Chunk 1: Database & Config

### Task 1: DB migration + schema + config

**Files:**
- Modify: `server/src/db/migrate.ts`
- Modify: `server/src/db/schema.ts`
- Modify: `server/src/config.ts`
- Modify: `shared/src/types.ts`
- Test: `server/tests/migration.test.ts` (already exists — extend it)

- [ ] **Step 1: Read existing files**

Read `server/src/db/migrate.ts`, `server/src/db/schema.ts`, `server/src/config.ts`, `shared/src/types.ts`.

- [ ] **Step 2: Write failing migration test**

In `server/tests/migration.test.ts`, add (or create the file if absent):

```typescript
it('creates shadowboxes table', async () => {
  const db = getTestDb(); // use existing test DB helper
  const tables = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='shadowboxes'"
  );
  expect(tables.rows).toHaveLength(1);
});

it('adds shadow_box_id column to placed_items', async () => {
  const db = getTestDb();
  const cols = await db.execute("PRAGMA table_info(placed_items)");
  const names = cols.rows.map((r: any) => r.name);
  expect(names).toContain('shadow_box_id');
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /home/michael/projects/gridfinitycustomizer
npm run test:run -- server/tests/migration.test.ts
```

Expected: FAIL — `shadowboxes` table not found.

- [ ] **Step 4: Add migration SQL to `server/src/db/migrate.ts`**

At the end of the `runMigrations` function, before the closing brace, add:

```typescript
  // Shadowboxes
  await client.execute(`CREATE TABLE IF NOT EXISTS shadowboxes (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    thickness_mm REAL NOT NULL,
    svg_path TEXT,
    rotation_deg REAL,
    tolerance_mm REAL,
    stackable INTEGER,
    stl_path TEXT,
    grid_x INTEGER,
    grid_y INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
  await client.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_shadowboxes_user_name ON shadowboxes(user_id, name);`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_shadowboxes_user ON shadowboxes(user_id);`
  );
  try {
    await client.execute(
      `ALTER TABLE placed_items ADD COLUMN shadow_box_id TEXT REFERENCES shadowboxes(id) ON DELETE SET NULL;`
    );
  } catch {
    // column already exists — safe to ignore
  }
```

- [ ] **Step 5: Add Drizzle schema definitions to `server/src/db/schema.ts`**

Add after the existing `userStorage` table definition:

```typescript
export const shadowboxes = sqliteTable('shadowboxes', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  thicknessMm: real('thickness_mm').notNull(),
  svgPath: text('svg_path'),
  rotationDeg: real('rotation_deg'),
  toleranceMm: real('tolerance_mm'),
  stackable: integer('stackable'), // 0 or 1
  stlPath: text('stl_path'),
  gridX: integer('grid_x'),
  gridY: integer('grid_y'),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});
```

Add `shadowBoxId` to the existing `placedItems` table definition:

```typescript
shadowBoxId: text('shadow_box_id').references(() => shadowboxes.id, { onDelete: 'set null' }),
```

- [ ] **Step 6: Add config vars to `server/src/config.ts`**

Inside the `z.object({...})` call, add:

```typescript
SHADOWBOX_SIDECAR_URL: z.string().default('http://localhost:5001'),
SHADOWBOX_STL_DIR: z.string().default('./data/shadowboxes'),
```

- [ ] **Step 7: Add shared types to `shared/src/types.ts`**

Add these interfaces:

```typescript
export interface ApiShadowbox {
  id: string;
  name: string;
  thicknessMm: number;
  gridX: number;
  gridY: number;
  status: 'pending' | 'ready' | 'error';
  createdAt: string;
}

export interface ApiShadowboxAdmin extends ApiShadowbox {
  userId: number;
  userName: string;
}
```

Add `shadowBoxId` to the existing `ApiPlacedItem` interface:

```typescript
shadowBoxId?: string | null;
```

Add `shadowboxId` to the existing `BOMItem` interface (if it exists; create it if not):

```typescript
shadowboxId?: string;
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npm run test:run -- server/tests/migration.test.ts
```

Expected: PASS

- [ ] **Step 9: Commit**

```bash
cd /home/michael/projects/gridfinitycustomizer
git add server/src/db/migrate.ts server/src/db/schema.ts server/src/config.ts shared/src/types.ts server/tests/migration.test.ts
git commit -m "feat(shadowbox): add DB schema, migration, config vars, and shared types"
```

---

## Chunk 2: Sidecar Service

### Task 2: Python/Flask sidecar

**Files:**
- Create: `shadowbox-sidecar/app.py`
- Create: `shadowbox-sidecar/requirements.txt`
- Create: `shadowbox-sidecar/Dockerfile`
- Create: `shadowbox-sidecar/lib/image_processor.py` (copy from `3d-modeling` sibling repo)
- Create: `shadowbox-sidecar/lib/scad_generator.py` (copy from `3d-modeling` sibling repo)

> **Note:** This task creates Docker/Python files. Tests are integration-level and done by curl in the next step after `docker compose up`. Unit testing of the sidecar itself is out of scope for this plan.

- [ ] **Step 1: Create `shadowbox-sidecar/requirements.txt`**

```
flask>=3.0
opencv-python-headless==4.10.0.84
numpy>=1.26
```

- [ ] **Step 2: Create `shadowbox-sidecar/app.py`**

```python
import base64
import os
import subprocess
import sys
import tempfile
import uuid

from flask import Flask, jsonify, request

# Allow importing from sibling lib/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))

from image_processor import ImageProcessor  # noqa: E402
from scad_generator import SCADGenerator   # noqa: E402

app = Flask(__name__)

OPENSCAD = os.environ.get('OPENSCAD_PATH', '/usr/bin/openscad')
GRIDFINITY_LIB = os.environ.get(
    'GRIDFINITY_LIB_PATH',
    '/opt/gridfinity-rebuilt-openscad'
)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


@app.route('/process-image', methods=['POST'])
def process_image():
    if 'image' not in request.files:
        return jsonify({'error': 'image field required'}), 400

    image_file = request.files['image']
    thickness_mm = request.form.get('thickness_mm')
    if thickness_mm is None:
        return jsonify({'error': 'thickness_mm field required'}), 400
    try:
        thickness_mm = float(thickness_mm)
    except ValueError:
        return jsonify({'error': 'thickness_mm must be a number'}), 400

    image_bytes = image_file.read(MAX_UPLOAD_BYTES + 1)
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        return jsonify({'error': 'image too large'}), 400

    try:
        processor = ImageProcessor(image_bytes, thickness_mm)
        result = processor.process()
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:
        app.logger.exception('process-image failed')
        return jsonify({'error': 'internal error'}), 500

    return jsonify({
        'svg_path': result['svg_path'],
        'width_mm': result['width_mm'],
        'height_mm': result['height_mm'],
        'scale_mm_per_px': result['scale_mm_per_px'],
    })


@app.route('/generate', methods=['POST'])
def generate():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({'error': 'JSON body required'}), 400

    required = ['svg_path', 'thickness_mm', 'rotation_deg', 'tolerance_mm', 'stackable']
    for field in required:
        if field not in body:
            return jsonify({'error': f'{field} required'}), 400

    try:
        thickness_mm = float(body['thickness_mm'])
        if thickness_mm < 4:
            return jsonify({'error': 'thickness_mm must be >= 4'}), 400
    except (TypeError, ValueError):
        return jsonify({'error': 'thickness_mm must be a number'}), 400

    try:
        generator = SCADGenerator(
            svg_path=body['svg_path'],
            thickness_mm=thickness_mm,
            rotation_deg=float(body.get('rotation_deg', 0)),
            tolerance_mm=float(body.get('tolerance_mm', 0.4)),
            stackable=bool(body.get('stackable', False)),
            gridfinity_lib=GRIDFINITY_LIB,
        )
        scad_content, grid_x, grid_y = generator.generate()
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception:
        app.logger.exception('SCAD generation failed')
        return jsonify({'error': 'internal error'}), 500

    with tempfile.TemporaryDirectory() as tmpdir:
        scad_path = os.path.join(tmpdir, 'model.scad')
        stl_path = os.path.join(tmpdir, 'model.stl')

        with open(scad_path, 'w') as f:
            f.write(scad_content)

        result = subprocess.run(
            [OPENSCAD, '-o', stl_path, scad_path],
            capture_output=True,
            timeout=55,
        )

        if result.returncode != 0 or not os.path.exists(stl_path):
            app.logger.error('OpenSCAD stderr: %s', result.stderr.decode())
            return jsonify({'error': 'OpenSCAD render failed'}), 500

        with open(stl_path, 'rb') as f:
            stl_bytes = f.read()

    return jsonify({
        'stl_base64': base64.b64encode(stl_bytes).decode(),
        'grid_x': grid_x,
        'grid_y': grid_y,
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
```

- [ ] **Step 3: Create `shadowbox-sidecar/Dockerfile`**

```dockerfile
FROM python:3.12-slim

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    libgl1 \
    libglib2.0-0 \
    git \
    fuse \
    && rm -rf /var/lib/apt/lists/*

# Install OpenSCAD AppImage
RUN wget -q https://files.openscad.org/OpenSCAD-2021.01-x86_64.AppImage -O /tmp/openscad.AppImage \
    && chmod +x /tmp/openscad.AppImage \
    && cd /tmp && ./openscad.AppImage --appimage-extract \
    && mv /tmp/squashfs-root /opt/openscad-appimage \
    && ln -s /opt/openscad-appimage/AppRun /usr/local/bin/openscad \
    && rm /tmp/openscad.AppImage

# Pin gridfinity-rebuilt-openscad library
RUN git clone https://github.com/kennetek/gridfinity-rebuilt-openscad.git /opt/gridfinity-rebuilt-openscad \
    && cd /opt/gridfinity-rebuilt-openscad \
    && git checkout 910e22d8607fd7f5f51ad5e5cbc5287a76810bfd

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV OPENSCAD_PATH=/usr/local/bin/openscad
ENV GRIDFINITY_LIB_PATH=/opt/gridfinity-rebuilt-openscad

EXPOSE 5001
CMD ["python", "app.py"]
```

- [ ] **Step 4: Copy lib files from 3d-modeling repo**

```bash
mkdir -p /home/michael/projects/gridfinitycustomizer/shadowbox-sidecar/lib
cp /home/michael/projects/3d-modeling/image_processor.py \
   /home/michael/projects/gridfinitycustomizer/shadowbox-sidecar/lib/
cp /home/michael/projects/3d-modeling/scad_generator.py \
   /home/michael/projects/gridfinitycustomizer/shadowbox-sidecar/lib/
touch /home/michael/projects/gridfinitycustomizer/shadowbox-sidecar/lib/__init__.py
```

> **Note:** If the 3d-modeling repo path differs, adjust accordingly. If it doesn't exist yet, create stub files with the expected interfaces and note them as TODO.

- [ ] **Step 5: Update `docker-compose.yml`**

Add the sidecar service and env vars for the backend:

```yaml
  shadowbox-sidecar:
    build: ./shadowbox-sidecar
    restart: unless-stopped
    environment:
      - OPENSCAD_PATH=/usr/local/bin/openscad
      - GRIDFINITY_LIB_PATH=/opt/gridfinity-rebuilt-openscad
    networks:
      - internal

  # In the backend service, add these environment variables:
  # - SHADOWBOX_SIDECAR_URL=http://shadowbox-sidecar:5001
  # - SHADOWBOX_STL_DIR=/data/shadowboxes
```

Also add to the `backend` service volumes:
```yaml
      - gridfinity-data:/data
```

And add `gridfinity-data:` under the top-level `volumes:` section.

- [ ] **Step 6: Commit**

```bash
cd /home/michael/projects/gridfinitycustomizer
git add shadowbox-sidecar/ docker-compose.yml
git commit -m "feat(shadowbox): add Python/Flask sidecar with image processing and STL generation"
```

---

## Chunk 3: Backend Services

### Task 3: Sidecar HTTP client service

**Files:**
- Create: `server/src/services/shadowboxSidecar.service.ts`
- Test: `server/tests/shadowboxSidecar.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/tests/shadowboxSidecar.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('../src/config.js', () => ({
  config: { SHADOWBOX_SIDECAR_URL: 'http://mock-sidecar:5001' },
}));

import { processImage, generateShadowbox } from '../src/services/shadowboxSidecar.service.js';

describe('shadowboxSidecar.service', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('processImage sends multipart and returns camelCase result', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        svg_path: 'M 0 0 L 10 0 Z',
        width_mm: 38.4,
        height_mm: 22.1,
        scale_mm_per_px: 0.14,
      }),
    });

    const formData = new FormData();
    formData.append('image', new Blob(['fake'], { type: 'image/jpeg' }));
    formData.append('thickness_mm', '8');

    const result = await processImage(formData);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://mock-sidecar:5001/process-image',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toEqual({
      svgPath: 'M 0 0 L 10 0 Z',
      widthMm: 38.4,
      heightMm: 22.1,
      scaleMmPerPx: 0.14,
    });
  });

  it('generateShadowbox sends JSON and returns camelCase result', async () => {
    const fakeBase64 = Buffer.from('fake-stl').toString('base64');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stl_base64: fakeBase64, grid_x: 2, grid_y: 3 }),
    });

    const result = await generateShadowbox({
      svgPath: 'M 0 0 Z',
      thicknessMm: 8,
      rotationDeg: 0,
      toleranceMm: 0.4,
      stackable: false,
    });

    expect(result).toEqual({
      stlBase64: fakeBase64,
      gridX: 2,
      gridY: 3,
    });
  });

  it('throws SidecarError when sidecar returns non-ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'no red square found' }),
    });

    const formData = new FormData();
    await expect(processImage(formData)).rejects.toThrow('no red square found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- server/tests/shadowboxSidecar.service.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `server/src/services/shadowboxSidecar.service.ts`**

```typescript
import { config } from '../config.js';

export class SidecarError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'SidecarError';
  }
}

async function sidecarFetch(
  path: string,
  init: RequestInit
): Promise<unknown> {
  const url = `${config.SHADOWBOX_SIDECAR_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (body as any)?.error ?? `Sidecar error ${res.status}`;
    throw new SidecarError(msg, res.status);
  }

  return body;
}

export interface ProcessImageResult {
  svgPath: string;
  widthMm: number;
  heightMm: number;
  scaleMmPerPx: number;
}

export async function processImage(
  formData: FormData
): Promise<ProcessImageResult> {
  const raw = (await sidecarFetch('/process-image', {
    method: 'POST',
    body: formData,
  })) as any;

  return {
    svgPath: raw.svg_path,
    widthMm: raw.width_mm,
    heightMm: raw.height_mm,
    scaleMmPerPx: raw.scale_mm_per_px,
  };
}

export interface GenerateParams {
  svgPath: string;
  thicknessMm: number;
  rotationDeg: number;
  toleranceMm: number;
  stackable: boolean;
}

export interface GenerateResult {
  stlBase64: string;
  gridX: number;
  gridY: number;
}

export async function generateShadowbox(
  params: GenerateParams
): Promise<GenerateResult> {
  const raw = (await sidecarFetch('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      svg_path: params.svgPath,
      thickness_mm: params.thicknessMm,
      rotation_deg: params.rotationDeg,
      tolerance_mm: params.toleranceMm,
      stackable: params.stackable,
    }),
  })) as any;

  return {
    stlBase64: raw.stl_base64,
    gridX: raw.grid_x,
    gridY: raw.grid_y,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- server/tests/shadowboxSidecar.service.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/services/shadowboxSidecar.service.ts server/tests/shadowboxSidecar.service.test.ts
git commit -m "feat(shadowbox): add sidecar HTTP client service"
```

---

### Task 4: Shadowboxes DB service

**Files:**
- Create: `server/src/services/shadowboxes.service.ts`
- Test: `server/tests/shadowboxes.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/tests/shadowboxes.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/db/connection.js'); // uses in-memory SQLite

import { runMigrations } from '../src/db/migrate.js';
import { getDb } from '../src/db/connection.js';
import {
  createPendingRow,
  updateToReady,
  updateToError,
  listByUser,
  getById,
  deleteShadowbox,
} from '../src/services/shadowboxes.service.js';

let db: ReturnType<typeof getDb>;

beforeEach(async () => {
  db = getDb();
  await runMigrations(db);
  // Insert a test user
  await db.execute("INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (1, 'testuser', 'x', 'user')");
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

    const rows = await db.execute("SELECT * FROM shadowboxes WHERE id = ?", [id]);
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
    const rows = await db.execute("SELECT * FROM shadowboxes WHERE id = ?", [id]);
    expect(rows.rows[0].status).toBe('ready');
    expect(rows.rows[0].grid_x).toBe(2);
  });

  it('updateToError sets status=error', async () => {
    const id = await createPendingRow(db, { userId: 1, name: 'bit', thicknessMm: 5 });
    await updateToError(db, id);
    const rows = await db.execute("SELECT * FROM shadowboxes WHERE id = ?", [id]);
    expect(rows.rows[0].status).toBe('error');
  });

  it('listByUser returns only the requesting user rows', async () => {
    await db.execute("INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (2, 'other', 'x', 'user')");
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- server/tests/shadowboxes.service.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `server/src/services/shadowboxes.service.ts`**

```typescript
import { randomUUID } from 'crypto';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

export interface PendingRowParams {
  userId: number;
  name: string;
  thicknessMm: number;
}

export interface ReadyParams {
  stlPath: string;
  gridX: number;
  gridY: number;
  svgPath: string;
  rotationDeg: number;
  toleranceMm: number;
  stackable: boolean;
}

export interface ShadowboxRow {
  id: string;
  userId: number;
  name: string;
  thicknessMm: number;
  svgPath: string | null;
  rotationDeg: number | null;
  toleranceMm: number | null;
  stackable: number | null;
  stlPath: string | null;
  gridX: number | null;
  gridY: number | null;
  status: string;
  createdAt: string;
}

export async function createPendingRow(
  db: any,
  params: PendingRowParams
): Promise<string> {
  const id = randomUUID();
  await db.execute(
    `INSERT INTO shadowboxes (id, user_id, name, thickness_mm, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [id, params.userId, params.name, params.thicknessMm]
  );
  return id;
}

export async function updateToReady(
  db: any,
  id: string,
  params: ReadyParams
): Promise<void> {
  await db.execute(
    `UPDATE shadowboxes
     SET status = 'ready',
         stl_path = ?,
         grid_x = ?,
         grid_y = ?,
         svg_path = ?,
         rotation_deg = ?,
         tolerance_mm = ?,
         stackable = ?
     WHERE id = ?`,
    [
      params.stlPath,
      params.gridX,
      params.gridY,
      params.svgPath,
      params.rotationDeg,
      params.toleranceMm,
      params.stackable ? 1 : 0,
      id,
    ]
  );
}

export async function updateToError(db: any, id: string): Promise<void> {
  await db.execute(
    `UPDATE shadowboxes SET status = 'error' WHERE id = ?`,
    [id]
  );
}

export async function listByUser(
  db: any,
  userId: number
): Promise<ShadowboxRow[]> {
  const result = await db.execute(
    `SELECT id, user_id as userId, name, thickness_mm as thicknessMm,
            svg_path as svgPath, rotation_deg as rotationDeg,
            tolerance_mm as toleranceMm, stackable, stl_path as stlPath,
            grid_x as gridX, grid_y as gridY, status, created_at as createdAt
     FROM shadowboxes
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows as ShadowboxRow[];
}

export async function getById(
  db: any,
  id: string
): Promise<ShadowboxRow | null> {
  const result = await db.execute(
    `SELECT id, user_id as userId, name, thickness_mm as thicknessMm,
            svg_path as svgPath, rotation_deg as rotationDeg,
            tolerance_mm as toleranceMm, stackable, stl_path as stlPath,
            grid_x as gridX, grid_y as gridY, status, created_at as createdAt
     FROM shadowboxes WHERE id = ?`,
    [id]
  );
  return (result.rows[0] as ShadowboxRow) ?? null;
}

export async function deleteShadowbox(db: any, id: string): Promise<void> {
  await db.execute(`DELETE FROM shadowboxes WHERE id = ?`, [id]);
}

export async function listAllForAdmin(db: any): Promise<(ShadowboxRow & { userName: string })[]> {
  const result = await db.execute(
    `SELECT s.id, s.user_id as userId, u.username as userName,
            s.name, s.thickness_mm as thicknessMm,
            s.svg_path as svgPath, s.rotation_deg as rotationDeg,
            s.tolerance_mm as toleranceMm, s.stackable,
            s.stl_path as stlPath, s.grid_x as gridX, s.grid_y as gridY,
            s.status, s.created_at as createdAt
     FROM shadowboxes s
     JOIN users u ON s.user_id = u.id
     ORDER BY s.created_at DESC`
  );
  return result.rows as (ShadowboxRow & { userName: string })[];
}

export async function getStlPath(db: any, id: string): Promise<string | null> {
  const row = await getById(db, id);
  return row?.stlPath ?? null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- server/tests/shadowboxes.service.test.ts
```

Expected: PASS (5+ tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/services/shadowboxes.service.ts server/tests/shadowboxes.service.test.ts
git commit -m "feat(shadowbox): add shadowboxes DB service"
```

---

## Chunk 4: Backend Controllers & Routes

### Task 5: Shadowboxes controller + routes

**Files:**
- Create: `server/src/controllers/shadowboxes.controller.ts`
- Create: `server/src/routes/shadowboxes.routes.ts`
- Create: `server/src/controllers/adminShadowboxes.controller.ts`
- Create: `server/src/routes/adminShadowboxes.routes.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/shadowboxes.routes.test.ts`

- [ ] **Step 1: Read `server/src/app.ts`**

Understand the existing pattern for mounting routers so you can replicate it.

- [ ] **Step 2: Write failing route tests**

Create `server/tests/shadowboxes.routes.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/db/connection.js');
vi.mock('../src/services/shadowboxSidecar.service.js', () => ({
  processImage: vi.fn(),
  generateShadowbox: vi.fn(),
}));
vi.mock('../src/middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 1, username: 'testuser', role: 'user' };
    next();
  },
}));

import { app } from '../src/app.js';
import * as sidecar from '../src/services/shadowboxSidecar.service.js';
import { runMigrations } from '../src/db/migrate.js';
import { getDb } from '../src/db/connection.js';

beforeEach(async () => {
  const db = getDb();
  await runMigrations(db);
  await db.execute(
    "INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (1, 'testuser', 'x', 'user')"
  );
});

describe('POST /api/v1/shadowboxes/process-image', () => {
  it('returns svgPath on success', async () => {
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
});

describe('POST /api/v1/shadowboxes', () => {
  it('generates STL and updates row to ready', async () => {
    // First create a pending row via process-image
    (sidecar.processImage as any).mockResolvedValueOnce({
      svgPath: 'M 0 0 Z', widthMm: 10, heightMm: 10, scaleMmPerPx: 0.1,
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
});

describe('GET /api/v1/shadowboxes', () => {
  it('returns list of user shadowboxes', async () => {
    const res = await request(app).get('/api/v1/shadowboxes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('DELETE /api/v1/shadowboxes/:id', () => {
  it('returns 404 for non-existent id', async () => {
    const res = await request(app).delete('/api/v1/shadowboxes/nonexistent-uuid');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm run test:run -- server/tests/shadowboxes.routes.test.ts
```

Expected: FAIL — routes not registered.

- [ ] **Step 4: Create `server/src/controllers/shadowboxes.controller.ts`**

```typescript
import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import type { Request, Response } from 'express';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';
import { SidecarError, processImage as sidecarProcess, generateShadowbox as sidecarGenerate } from '../services/shadowboxSidecar.service.js';
import {
  createPendingRow,
  updateToReady,
  updateToError,
  listByUser,
  getById,
  deleteShadowbox as dbDelete,
} from '../services/shadowboxes.service.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_MIME.has(file.mimetype));
  },
});

export async function processImageHandler(req: Request, res: Response) {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'image file required' });

  const { thicknessMm, name } = req.body as { thicknessMm: string; name: string };
  if (!thicknessMm) return res.status(400).json({ error: 'thicknessMm required' });
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });

  const db = getDb();
  const userId = (req as any).user.id as number;

  const formData = new FormData();
  formData.append('image', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
  formData.append('thickness_mm', thicknessMm);

  let sidecarResult;
  try {
    sidecarResult = await sidecarProcess(formData);
  } catch (err) {
    if (err instanceof SidecarError) {
      return res.status(err.statusCode >= 500 ? 502 : 400).json({ error: err.message });
    }
    return res.status(502).json({ error: 'sidecar unavailable' });
  }

  const shadowboxId = await createPendingRow(db, {
    userId,
    name: name.trim(),
    thicknessMm: parseFloat(thicknessMm),
  });

  return res.status(200).json({
    shadowboxId,
    svgPath: sidecarResult.svgPath,
    widthMm: sidecarResult.widthMm,
    heightMm: sidecarResult.heightMm,
    scaleMmPerPx: sidecarResult.scaleMmPerPx,
  });
}

export async function generateShadowboxHandler(req: Request, res: Response) {
  const { shadowboxId, svgPath, rotationDeg, toleranceMm, stackable } = req.body as {
    shadowboxId: string;
    svgPath: string;
    rotationDeg: number;
    toleranceMm: number;
    stackable: boolean;
  };

  if (!shadowboxId || !svgPath) {
    return res.status(400).json({ error: 'shadowboxId and svgPath required' });
  }

  const db = getDb();
  const userId = (req as any).user.id as number;

  const row = await getById(db, shadowboxId);
  if (!row) return res.status(404).json({ error: 'shadowbox not found' });
  if (row.userId !== userId) return res.status(403).json({ error: 'forbidden' });

  let sidecarResult;
  try {
    sidecarResult = await sidecarGenerate({
      svgPath,
      thicknessMm: row.thicknessMm,
      rotationDeg: rotationDeg ?? 0,
      toleranceMm: toleranceMm ?? 0.4,
      stackable: stackable ?? false,
    });
  } catch (err) {
    await updateToError(db, shadowboxId);
    if (err instanceof SidecarError) {
      return res.status(err.statusCode >= 500 ? 502 : 400).json({ error: err.message });
    }
    return res.status(502).json({ error: 'sidecar unavailable' });
  }

  const stlBuffer = Buffer.from(sidecarResult.stlBase64, 'base64');
  const stlDir = path.join(config.SHADOWBOX_STL_DIR, String(userId));
  await fs.mkdir(stlDir, { recursive: true });
  const stlPath = path.join(stlDir, `${shadowboxId}.stl`);
  await fs.writeFile(stlPath, stlBuffer);

  await updateToReady(db, shadowboxId, {
    stlPath,
    gridX: sidecarResult.gridX,
    gridY: sidecarResult.gridY,
    svgPath,
    rotationDeg: rotationDeg ?? 0,
    toleranceMm: toleranceMm ?? 0.4,
    stackable: stackable ?? false,
  });

  return res.status(201).json({
    id: shadowboxId,
    name: row.name,
    thicknessMm: row.thicknessMm,
    gridX: sidecarResult.gridX,
    gridY: sidecarResult.gridY,
    status: 'ready',
    createdAt: row.createdAt,
  });
}

export async function listShadowboxesHandler(req: Request, res: Response) {
  const db = getDb();
  const userId = (req as any).user.id as number;
  const rows = await listByUser(db, userId);
  return res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      thicknessMm: r.thicknessMm,
      gridX: r.gridX,
      gridY: r.gridY,
      status: r.status,
      createdAt: r.createdAt,
    }))
  );
}

export async function deleteShadowboxHandler(req: Request, res: Response) {
  const { id } = req.params;
  const db = getDb();
  const userId = (req as any).user.id as number;

  const row = await getById(db, id);
  if (!row) return res.status(404).json({ error: 'shadowbox not found' });
  if (row.userId !== userId) return res.status(403).json({ error: 'forbidden' });

  // Delete STL file if it exists
  if (row.stlPath) {
    await fs.unlink(row.stlPath).catch(() => { /* ignore missing file */ });
  }

  await dbDelete(db, id);
  return res.status(204).send();
}
```

- [ ] **Step 5: Create `server/src/routes/shadowboxes.routes.ts`**

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  upload,
  processImageHandler,
  generateShadowboxHandler,
  listShadowboxesHandler,
  deleteShadowboxHandler,
} from '../controllers/shadowboxes.controller.js';

const router = Router();

// IMPORTANT: register literal path before /:id to prevent param collision
router.post('/process-image', requireAuth, upload.single('image'), processImageHandler);
router.post('/', requireAuth, generateShadowboxHandler);
router.get('/', requireAuth, listShadowboxesHandler);
router.delete('/:id', requireAuth, deleteShadowboxHandler);

export default router;
```

- [ ] **Step 6: Create `server/src/controllers/adminShadowboxes.controller.ts`**

```typescript
import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import { getDb } from '../db/connection.js';
import { listAllForAdmin, getStlPath, getById } from '../services/shadowboxes.service.js';

export async function listAllHandler(_req: Request, res: Response) {
  const db = getDb();
  const rows = await listAllForAdmin(db);
  return res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      thicknessMm: r.thicknessMm,
      gridX: r.gridX,
      gridY: r.gridY,
      status: r.status,
      createdAt: r.createdAt,
      userId: r.userId,
      userName: r.userName,
    }))
  );
}

export async function downloadStlHandler(req: Request, res: Response) {
  const { id } = req.params;
  const db = getDb();

  const stlPath = await getStlPath(db, id);
  if (!stlPath) return res.status(404).json({ error: 'shadowbox not found' });

  const row = await getById(db, id);
  const filename = row ? `${row.name}.stl` : `${id}.stl`;

  if (!fs.existsSync(stlPath)) {
    return res.status(404).json({ error: 'STL file not found on disk' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  fs.createReadStream(stlPath).pipe(res);
}
```

- [ ] **Step 7: Create `server/src/routes/adminShadowboxes.routes.ts`**

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { listAllHandler, downloadStlHandler } from '../controllers/adminShadowboxes.controller.js';

const router = Router();

router.get('/admin/shadowboxes', requireAuth, requireAdmin, listAllHandler);
router.get('/admin/shadowboxes/:id/stl', requireAuth, requireAdmin, downloadStlHandler);

export default router;
```

- [ ] **Step 8: Mount routers in `server/src/app.ts`**

Add these imports and `app.use` calls alongside the existing route registrations:

```typescript
import shadowboxesRoutes from './routes/shadowboxes.routes.js';
import adminShadowboxesRoutes from './routes/adminShadowboxes.routes.js';

// ... (in the route mounting section):
app.use('/api/v1/shadowboxes', shadowboxesRoutes);
app.use('/api/v1', adminShadowboxesRoutes);
```

- [ ] **Step 9: Run tests to verify they pass**

```bash
npm run test:run -- server/tests/shadowboxes.routes.test.ts
```

Expected: PASS

- [ ] **Step 10: Run full backend test suite to check for regressions**

```bash
npm run test:run
```

Expected: All pass.

- [ ] **Step 11: Commit**

```bash
git add \
  server/src/controllers/shadowboxes.controller.ts \
  server/src/controllers/adminShadowboxes.controller.ts \
  server/src/routes/shadowboxes.routes.ts \
  server/src/routes/adminShadowboxes.routes.ts \
  server/src/app.ts \
  server/tests/shadowboxes.routes.test.ts
git commit -m "feat(shadowbox): add backend controllers and routes"
```

---

## Chunk 5: Backend — layout.service.ts + placed_items

### Task 6: Wire shadowboxId into layout service

**Files:**
- Modify: `server/src/services/layout.service.ts`
- Test: `server/tests/layout.service.test.ts` (already exists — extend)

- [ ] **Step 1: Read `server/src/services/layout.service.ts`**

Understand where `formatPlacedItem` and the placed item insert mappings live.

- [ ] **Step 2: Write failing tests**

In the existing `server/tests/layout.service.test.ts`, add:

```typescript
it('placed shadowbox item stores shadowBoxId', async () => {
  // Create a shadowbox row first
  const sbId = await createPendingRow(db, { userId: 1, name: 'sb1', thicknessMm: 8 });

  // Save a layout with a shadowbox item using itemId="shadowbox:<uuid>"
  await saveLayout(db, 1, 'layout1', [
    { itemId: `shadowbox:${sbId}`, x: 0, y: 0, rotation: 0, libraryId: 'shadowbox', itemKey: sbId },
  ]);

  const layout = await getLayout(db, 1, 'layout1');
  expect(layout.items[0].shadowBoxId).toBe(sbId);
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test:run -- server/tests/layout.service.test.ts
```

Expected: FAIL on the new test.

- [ ] **Step 4: Update `layout.service.ts`**

In `formatPlacedItem` (the function that maps a DB row to the API response shape), add:

```typescript
shadowBoxId: row.shadowBoxId ?? null,
```

In all 4 placed item insert mappings (new item, saved item, cloned item), detect shadowbox by `libraryId`:

```typescript
// When libraryId === 'shadowbox', store itemId (the UUID part) as shadowBoxId
shadowBoxId: libraryId === 'shadowbox' ? itemId : null,
```

> **Note:** `itemId` here is the part after the colon in `"shadowbox:<uuid>"`. Use `unprefixItemId()` if it's available; otherwise split manually: `const [libraryId, itemId] = fullItemId.split(':', 2)`.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:run -- server/tests/layout.service.test.ts
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/layout.service.ts server/tests/layout.service.test.ts
git commit -m "feat(shadowbox): wire shadowBoxId into placed_items via layout service"
```

---

## Chunk 6: Frontend — API + Hooks + Library Section

### Task 7: Frontend API module

**Files:**
- Create: `src/api/shadowboxes.api.ts`
- Test: `src/api/shadowboxes.api.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/api/shadowboxes.api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { fetchShadowboxes, deleteShadowbox } from './shadowboxes.api';

beforeEach(() => mockFetch.mockReset());

describe('fetchShadowboxes', () => {
  it('returns parsed array', async () => {
    const mockData = [{ id: 'abc', name: 'tool', gridX: 2, gridY: 3, status: 'ready', createdAt: 'now', thicknessMm: 8 }];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockData });
    const result = await fetchShadowboxes();
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/shadowboxes', expect.any(Object));
  });
});

describe('deleteShadowbox', () => {
  it('calls DELETE endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    await deleteShadowbox('abc-123');
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/shadowboxes/abc-123', expect.objectContaining({ method: 'DELETE' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/api/shadowboxes.api.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/api/shadowboxes.api.ts`**

```typescript
import type { ApiShadowbox } from '../../shared/src/types';

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any)?.error ?? `Request failed: ${res.status}`);
  }
  return res;
}

export interface ProcessImageResult {
  shadowboxId: string;
  svgPath: string;
  widthMm: number;
  heightMm: number;
  scaleMmPerPx: number;
}

export async function processImage(
  file: File,
  thicknessMm: number,
  name: string
): Promise<ProcessImageResult> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('thicknessMm', String(thicknessMm));
  formData.append('name', name);

  const res = await fetch('/api/v1/shadowboxes/process-image', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any)?.error ?? 'Upload failed');
  }
  return res.json();
}

export interface GenerateParams {
  shadowboxId: string;
  svgPath: string;
  rotationDeg: number;
  toleranceMm: number;
  stackable: boolean;
}

export async function generateShadowbox(params: GenerateParams): Promise<ApiShadowbox> {
  const res = await apiFetch('/api/v1/shadowboxes', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function fetchShadowboxes(): Promise<ApiShadowbox[]> {
  const res = await apiFetch('/api/v1/shadowboxes');
  return res.json();
}

export async function deleteShadowbox(id: string): Promise<void> {
  await apiFetch(`/api/v1/shadowboxes/${id}`, { method: 'DELETE' });
}

export async function fetchAdminShadowboxes(): Promise<ApiShadowbox[]> {
  const res = await apiFetch('/api/v1/admin/shadowboxes');
  return res.json();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/api/shadowboxes.api.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/shadowboxes.api.ts src/api/shadowboxes.api.test.ts
git commit -m "feat(shadowbox): add frontend API module"
```

---

### Task 8: useShadowboxes hook + ShadowboxLibrarySection

**Files:**
- Create: `src/hooks/useShadowboxes.ts`
- Create: `src/components/ShadowboxLibrarySection.tsx`
- Modify: existing library sidebar component (identify the file by reading the codebase)
- Test: `src/hooks/useShadowboxes.test.ts`
- Test: `src/components/ShadowboxLibrarySection.test.tsx`

- [ ] **Step 1: Read the existing library sidebar component**

Search for the component that renders the library sections (Standard, Labeled, etc.) to understand how to plug in the new section.

```bash
grep -r "Standard\|Labeled\|library" src/components --include="*.tsx" -l
```

Read the relevant file to understand props, drag interface, and how items are rendered.

- [ ] **Step 2: Write failing hook test**

Create `src/hooks/useShadowboxes.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useShadowboxesQuery } from './useShadowboxes';

vi.mock('../api/shadowboxes.api', () => ({
  fetchShadowboxes: vi.fn().mockResolvedValue([
    { id: 'abc', name: 'screwdriver', gridX: 2, gridY: 3, status: 'ready', createdAt: 'now', thicknessMm: 8 },
  ]),
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, children);

describe('useShadowboxesQuery', () => {
  it('returns shadowboxes list', async () => {
    const { result } = renderHook(() => useShadowboxesQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name).toBe('screwdriver');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test:run -- src/hooks/useShadowboxes.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Create `src/hooks/useShadowboxes.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchShadowboxes, deleteShadowbox } from '../api/shadowboxes.api';

export const SHADOWBOXES_QUERY_KEY = ['shadowboxes'] as const;

export function useShadowboxesQuery() {
  return useQuery({
    queryKey: SHADOWBOXES_QUERY_KEY,
    queryFn: fetchShadowboxes,
  });
}

export function useDeleteShadowboxMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShadowbox,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHADOWBOXES_QUERY_KEY });
    },
  });
}
```

- [ ] **Step 5: Run hook test to verify it passes**

```bash
npm run test:run -- src/hooks/useShadowboxes.test.ts
```

Expected: PASS

- [ ] **Step 6: Write failing ShadowboxLibrarySection test**

Create `src/components/ShadowboxLibrarySection.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { ShadowboxLibrarySection } from './ShadowboxLibrarySection';

vi.mock('../api/shadowboxes.api', () => ({
  fetchShadowboxes: vi.fn().mockResolvedValue([
    { id: 'abc-123', name: 'screwdriver', gridX: 2, gridY: 3, status: 'ready', createdAt: 'now', thicknessMm: 8 },
    { id: 'def-456', name: 'pending-tool', gridX: 1, gridY: 1, status: 'pending', createdAt: 'now', thicknessMm: 5 },
  ]),
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, children);

describe('ShadowboxLibrarySection', () => {
  it('renders section header', async () => {
    render(createElement(ShadowboxLibrarySection, null), { wrapper });
    expect(await screen.findByText(/My Shadowboxes/i)).toBeInTheDocument();
  });

  it('renders ready items', async () => {
    render(createElement(ShadowboxLibrarySection, null), { wrapper });
    expect(await screen.findByText('screwdriver')).toBeInTheDocument();
  });

  it('shows pending indicator for in-progress items', async () => {
    render(createElement(ShadowboxLibrarySection, null), { wrapper });
    expect(await screen.findByText('pending-tool')).toBeInTheDocument();
  });

  it('renders a link to create new shadowbox', async () => {
    render(createElement(ShadowboxLibrarySection, null), { wrapper });
    const link = await screen.findByRole('link', { name: /new shadowbox/i });
    expect(link).toHaveAttribute('href', '/shadowbox/new');
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

```bash
npm run test:run -- src/components/ShadowboxLibrarySection.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 8: Create `src/components/ShadowboxLibrarySection.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { useShadowboxesQuery, useDeleteShadowboxMutation } from '../hooks/useShadowboxes';
import type { ApiShadowbox } from '../../../shared/src/types';

interface ShadowboxItemProps {
  item: ApiShadowbox;
  onDelete: (id: string) => void;
}

function ShadowboxItem({ item, onDelete }: ShadowboxItemProps) {
  const dragData = JSON.stringify({ type: 'library', itemId: `shadowbox:${item.id}` });

  return (
    <div
      className="shadowbox-library-item"
      draggable={item.status === 'ready'}
      onDragStart={(e) => {
        if (item.status !== 'ready') return;
        e.dataTransfer.setData('application/json', dragData);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <span className={`shadowbox-item-name ${item.status !== 'ready' ? 'shadowbox-item-pending' : ''}`}>
        {item.name}
      </span>
      {item.status === 'pending' && <span className="shadowbox-status-badge">⏳</span>}
      {item.status === 'error' && <span className="shadowbox-status-badge shadowbox-status-error">⚠</span>}
      {item.status === 'ready' && (
        <button
          className="shadowbox-delete-btn"
          onClick={() => onDelete(item.id)}
          aria-label={`Delete ${item.name}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function ShadowboxLibrarySection() {
  const { data: shadowboxes = [], isLoading } = useShadowboxesQuery();
  const { mutate: deleteShadowbox } = useDeleteShadowboxMutation();

  return (
    <div className="shadowbox-library-section">
      <div className="library-section-header">My Shadowboxes</div>
      {isLoading && <div className="library-loading">Loading…</div>}
      {shadowboxes.map((item) => (
        <ShadowboxItem key={item.id} item={item} onDelete={deleteShadowbox} />
      ))}
      <Link to="/shadowbox/new" className="shadowbox-new-link">+ New shadowbox</Link>
    </div>
  );
}
```

- [ ] **Step 9: Plug `ShadowboxLibrarySection` into the sidebar**

Read the existing library sidebar component (found in Step 1). Add `<ShadowboxLibrarySection />` at the bottom of the sections list, wrapped in an `isAuthenticated` check (use the same auth check pattern as other auth-gated content in that component).

- [ ] **Step 10: Run all component tests to verify they pass**

```bash
npm run test:run -- src/components/ShadowboxLibrarySection.test.tsx src/hooks/useShadowboxes.test.ts
```

Expected: All pass.

- [ ] **Step 11: Commit**

```bash
git add \
  src/hooks/useShadowboxes.ts src/hooks/useShadowboxes.test.ts \
  src/components/ShadowboxLibrarySection.tsx src/components/ShadowboxLibrarySection.test.tsx
git add src/components/<sidebar-file>  # whichever file was modified in Step 9
git commit -m "feat(shadowbox): add useShadowboxes hook and ShadowboxLibrarySection component"
```

---

## Chunk 7: Frontend Pages + Grid Integration

### Task 9: ShadowboxUploadPage

**Files:**
- Create: `src/pages/ShadowboxUploadPage.tsx`
- Test: `src/pages/ShadowboxUploadPage.test.tsx`

- [ ] **Step 1: Read existing page components**

Look at one existing page (e.g., the login page or a similar form page) to understand routing, navigation, and `ProtectedRoute` usage.

- [ ] **Step 2: Write failing test**

Create `src/pages/ShadowboxUploadPage.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { ShadowboxUploadPage } from './ShadowboxUploadPage';

const mockProcessImage = vi.fn();
vi.mock('../api/shadowboxes.api', () => ({
  processImage: mockProcessImage,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const wrapper = ({ children }: any) =>
  createElement(QueryClientProvider, { client: new QueryClient() },
    createElement(MemoryRouter, { initialEntries: ['/shadowbox/new'] },
      createElement(Routes, null,
        createElement(Route, { path: '/shadowbox/new', element: children })
      )
    )
  );

describe('ShadowboxUploadPage', () => {
  it('renders upload form', () => {
    render(createElement(ShadowboxUploadPage), { wrapper });
    expect(screen.getByLabelText(/photo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/thickness/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /process/i })).toBeInTheDocument();
  });

  it('navigates to /shadowbox/edit on success', async () => {
    mockProcessImage.mockResolvedValueOnce({
      shadowboxId: 'uuid-1',
      svgPath: 'M 0 0 Z',
      widthMm: 10,
      heightMm: 10,
      scaleMmPerPx: 0.1,
    });

    render(createElement(ShadowboxUploadPage), { wrapper });

    const file = new File(['fake'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText(/photo/i), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'my-tool' } });
    fireEvent.click(screen.getByRole('button', { name: /process/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(
      '/shadowbox/edit',
      expect.objectContaining({ state: expect.objectContaining({ shadowboxId: 'uuid-1' }) })
    ));
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test:run -- src/pages/ShadowboxUploadPage.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 4: Create `src/pages/ShadowboxUploadPage.tsx`**

```tsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { processImage } from '../api/shadowboxes.api';
import type { ProcessImageResult } from '../api/shadowboxes.api';

const MIN_THICKNESS_MM = 4;
const MAX_THICKNESS_MM = 20;
const DEFAULT_THICKNESS_MM = 8;

export function ShadowboxUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [thicknessMm, setThicknessMm] = useState(DEFAULT_THICKNESS_MM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Please select a photo.'); return; }
    if (!name.trim()) { setError('Please enter a name.'); return; }

    setLoading(true);
    setError(null);

    try {
      const result: ProcessImageResult = await processImage(file, thicknessMm, name.trim());
      navigate('/shadowbox/edit', {
        state: {
          shadowboxId: result.shadowboxId,
          svgPath: result.svgPath,
          widthMm: result.widthMm,
          heightMm: result.heightMm,
          scaleMmPerPx: result.scaleMmPerPx,
          thicknessMm,
          name: name.trim(),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shadowbox-upload-page">
      <h1>New Shadowbox</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="photo">Photo</label>
          <input
            id="photo"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. screwdriver-8mm"
            maxLength={80}
          />
        </div>

        <div className="form-field">
          <label htmlFor="thickness">
            Thickness: {thicknessMm} mm
          </label>
          <input
            id="thickness"
            type="range"
            min={MIN_THICKNESS_MM}
            max={MAX_THICKNESS_MM}
            value={thicknessMm}
            onChange={(e) => setThicknessMm(Number(e.target.value))}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Processing…' : 'Process'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:run -- src/pages/ShadowboxUploadPage.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/ShadowboxUploadPage.tsx src/pages/ShadowboxUploadPage.test.tsx
git commit -m "feat(shadowbox): add ShadowboxUploadPage"
```

---

### Task 10: ShadowboxEditorPage

**Files:**
- Create: `src/pages/ShadowboxEditorPage.tsx`
- Test: `src/pages/ShadowboxEditorPage.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/pages/ShadowboxEditorPage.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { ShadowboxEditorPage } from './ShadowboxEditorPage';

const mockGenerate = vi.fn();
vi.mock('../api/shadowboxes.api', () => ({
  generateShadowbox: mockGenerate,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const locationState = {
  shadowboxId: 'uuid-1',
  svgPath: 'M -5 -5 L 5 -5 L 5 5 L -5 5 Z',
  widthMm: 10,
  heightMm: 10,
  scaleMmPerPx: 0.1,
  thicknessMm: 8,
  name: 'test-tool',
};

function renderEditor() {
  return render(
    createElement(QueryClientProvider, { client: new QueryClient() },
      createElement(MemoryRouter, { initialEntries: [{ pathname: '/shadowbox/edit', state: locationState }] },
        createElement(Routes, null,
          createElement(Route, { path: '/shadowbox/edit', element: createElement(ShadowboxEditorPage) })
        )
      )
    )
  );
}

describe('ShadowboxEditorPage', () => {
  it('renders SVG canvas with control points', () => {
    renderEditor();
    expect(screen.getByRole('img', { name: /shadowbox preview/i })).toBeInTheDocument();
  });

  it('shows tolerance and stackable controls', () => {
    renderEditor();
    expect(screen.getByLabelText(/tolerance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/stackable/i)).toBeInTheDocument();
  });

  it('calls generateShadowbox and navigates on save', async () => {
    mockGenerate.mockResolvedValueOnce({ id: 'uuid-1', gridX: 2, gridY: 3, status: 'ready', name: 'test-tool', createdAt: 'now', thicknessMm: 8 });

    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ shadowboxId: 'uuid-1' })
    ));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/pages/ShadowboxEditorPage.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/pages/ShadowboxEditorPage.tsx`**

The SVG editor is a React port of the interactive editor from `shadowbox-generator`. Key helper functions:

```typescript
// Parse SVG path string into array of {x, y} points
function parseSvgPath(svgPath: string): Array<{x: number; y: number}> {
  const points: Array<{x: number; y: number}> = [];
  const tokens = svgPath.trim().split(/\s+/);
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M' || cmd === 'L') {
      points.push({ x: parseFloat(tokens[i++]), y: parseFloat(tokens[i++]) });
    }
    // Skip Z
  }
  return points;
}

// Convert points array back to SVG path string
function pointsToSvgPath(points: Array<{x: number; y: number}>): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ` + rest.map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';
}

// Rotate a point around origin
function rotatePoint(p: {x: number; y: number}, deg: number): {x: number; y: number} {
  const rad = (deg * Math.PI) / 180;
  return {
    x: p.x * Math.cos(rad) - p.y * Math.sin(rad),
    y: p.x * Math.sin(rad) + p.y * Math.cos(rad),
  };
}

// Compute Gridfinity grid size from bounding box in mm
function computeGridSize(widthMm: number, heightMm: number): {gridX: number; gridY: number} {
  const CELL_MM = 42;
  return {
    gridX: Math.ceil(widthMm / CELL_MM),
    gridY: Math.ceil(heightMm / CELL_MM),
  };
}
```

The full component renders:
- An SVG element with `role="img"` and `aria-label="shadowbox preview"` showing the current shape
- Draggable `<circle>` elements for each control point
- A rotation handle
- `<input type="range">` for `tolerance` (0.1–1.0 mm, step 0.1, default 0.4), labeled "Tolerance"
- `<input type="checkbox">` for `stackable`, labeled "Stackable"
- A "Generate & Save" button that calls `generateShadowbox()` and navigates to `/` on success

```tsx
import { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { generateShadowbox } from '../api/shadowboxes.api';
import { SHADOWBOXES_QUERY_KEY } from '../hooks/useShadowboxes';

// ... (paste helpers above here) ...

interface LocationState {
  shadowboxId: string;
  svgPath: string;
  widthMm: number;
  heightMm: number;
  scaleMmPerPx: number;
  thicknessMm: number;
  name: string;
}

const DEFAULT_TOLERANCE_MM = 0.4;
const SVG_VIEWBOX_PADDING = 20;

export function ShadowboxEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const state = location.state as LocationState;

  const [points, setPoints] = useState(() => parseSvgPath(state.svgPath));
  const [rotationDeg, setRotationDeg] = useState(0);
  const [toleranceMm, setToleranceMm] = useState(DEFAULT_TOLERANCE_MM);
  const [stackable, setStackable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<number | null>(null);

  // Compute viewBox from points + padding
  const allX = points.map(p => p.x);
  const allY = points.map(p => p.y);
  const minX = Math.min(...allX) - SVG_VIEWBOX_PADDING;
  const minY = Math.min(...allY) - SVG_VIEWBOX_PADDING;
  const vbW = Math.max(...allX) - minX + SVG_VIEWBOX_PADDING;
  const vbH = Math.max(...allY) - minY + SVG_VIEWBOX_PADDING;

  function svgCoords(e: React.MouseEvent<SVGSVGElement>): {x: number; y: number} {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM()!.inverse());
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (dragging.current === null) return;
    const {x, y} = svgCoords(e);
    setPoints(prev => prev.map((p, i) => i === dragging.current ? {x, y} : p));
  }

  function onMouseUp() { dragging.current = null; }

  async function handleSave() {
    setLoading(true);
    setError(null);
    const currentSvgPath = pointsToSvgPath(
      rotationDeg !== 0 ? points.map(p => rotatePoint(p, rotationDeg)) : points
    );
    try {
      await generateShadowbox({
        shadowboxId: state.shadowboxId,
        svgPath: currentSvgPath,
        rotationDeg,
        toleranceMm,
        stackable,
      });
      queryClient.invalidateQueries({ queryKey: SHADOWBOXES_QUERY_KEY });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setLoading(false);
    }
  }

  const pathD = pointsToSvgPath(points);

  return (
    <div className="shadowbox-editor-page">
      <h1>Edit Shadowbox — {state.name}</h1>

      <svg
        ref={svgRef}
        role="img"
        aria-label="shadowbox preview"
        viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
        className="shadowbox-svg-editor"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <path d={pathD} fill="rgba(100,180,255,0.3)" stroke="#448aff" strokeWidth={0.5} />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={2}
            fill="#fff"
            stroke="#448aff"
            strokeWidth={0.5}
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => { e.preventDefault(); dragging.current = i; }}
          />
        ))}
      </svg>

      <div className="editor-controls">
        <div className="form-field">
          <label htmlFor="rotation">Rotation: {rotationDeg}°</label>
          <input
            id="rotation"
            type="range"
            min={-180}
            max={180}
            value={rotationDeg}
            onChange={(e) => setRotationDeg(Number(e.target.value))}
          />
        </div>

        <div className="form-field">
          <label htmlFor="tolerance">Tolerance: {toleranceMm} mm</label>
          <input
            id="tolerance"
            type="range"
            min={0.1}
            max={1.0}
            step={0.1}
            value={toleranceMm}
            onChange={(e) => setToleranceMm(Number(e.target.value))}
          />
        </div>

        <div className="form-field">
          <label htmlFor="stackable">
            <input
              id="stackable"
              type="checkbox"
              checked={stackable}
              onChange={(e) => setStackable(e.target.checked)}
            />
            {' '}Stackable
          </label>
        </div>

        {error && <div className="form-error">{error}</div>}

        <button onClick={handleSave} disabled={loading}>
          {loading ? 'Generating…' : 'Generate & Save'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/pages/ShadowboxEditorPage.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/ShadowboxEditorPage.tsx src/pages/ShadowboxEditorPage.test.tsx
git commit -m "feat(shadowbox): add ShadowboxEditorPage with SVG editor"
```

---

### Task 11: Register routes in React app

**Files:**
- Modify: `src/App.tsx` (or wherever the React Router routes are defined)

- [ ] **Step 1: Read `src/App.tsx`**

Understand the existing route structure, how `ProtectedRoute` is used, and where to add the new routes.

- [ ] **Step 2: Add routes**

Add these inside the authenticated route section:

```tsx
import { ShadowboxUploadPage } from './pages/ShadowboxUploadPage';
import { ShadowboxEditorPage } from './pages/ShadowboxEditorPage';

// Inside the Routes block, wrapped in ProtectedRoute:
<Route path="/shadowbox/new" element={<ProtectedRoute><ShadowboxUploadPage /></ProtectedRoute>} />
<Route path="/shadowbox/edit" element={<ProtectedRoute><ShadowboxEditorPage /></ProtectedRoute>} />
```

- [ ] **Step 3: Run full unit test suite**

```bash
npm run test:run
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(shadowbox): register /shadowbox/new and /shadowbox/edit routes"
```

---

### Task 12: Grid — render orphaned shadowbox warning

**Files:**
- Modify: `src/components/GridPreview.tsx` (or the cell renderer component)
- Modify: `src/hooks/useGridItems.ts` (or wherever `allLibraryItems` is assembled)
- Test: `src/components/GridPreview.test.tsx` (extend) or create new test

- [ ] **Step 1: Read `src/components/GridPreview.tsx` and `src/hooks/useGridItems.ts`**

Understand how placed items are rendered and how `allLibraryItems` is assembled.

- [ ] **Step 2: Write failing test for synthetic LibraryItems**

In `src/hooks/useGridItems.test.ts` (or create it), add:

```typescript
it('converts shadowbox to LibraryItem with correct gridX/gridY', () => {
  const shadowbox: ApiShadowbox = {
    id: 'abc-123', name: 'screwdriver', gridX: 2, gridY: 3,
    status: 'ready', createdAt: 'now', thicknessMm: 8,
  };
  const item = shadowboxToLibraryItem(shadowbox);
  expect(item.id).toBe('shadowbox:abc-123');
  expect(item.widthUnits).toBe(2);
  expect(item.heightUnits).toBe(3);
});
```

- [ ] **Step 3: Add `shadowboxToLibraryItem` helper to `useGridItems.ts`**

```typescript
export function shadowboxToLibraryItem(sb: ApiShadowbox): LibraryItem {
  return {
    id: `shadowbox:${sb.id}`,
    name: sb.name,
    widthUnits: sb.gridX ?? 1,
    heightUnits: sb.gridY ?? 1,
    color: '#9C27B0',
    libraryId: 'shadowbox',
  };
}
```

Then integrate into `allLibraryItems`:

```typescript
const { data: shadowboxes = [] } = useShadowboxesQuery();
const shadowboxLibraryItems = shadowboxes
  .filter(sb => sb.status === 'ready')
  .map(shadowboxToLibraryItem);

const allLibraryItems = [...existingItems, ...shadowboxLibraryItems];
```

- [ ] **Step 4: Write failing test for orphan warning**

```typescript
it('renders orphan warning for placed shadowbox with null shadowboxId', () => {
  // Render a GridCell with a placed item where itemId starts with 'shadowbox:'
  // but shadowboxId is null
  // Expect a warning overlay to be present
});
```

- [ ] **Step 5: Add orphan warning to grid cell renderer**

In the component that renders individual placed items (find by reading `GridPreview.tsx`), add:

```tsx
// Detect orphaned shadowbox: placed item refers to a shadowbox that was deleted
const isOrphanedShadowbox =
  item.itemId.startsWith('shadowbox:') && item.shadowBoxId === null;

// In the render:
{isOrphanedShadowbox && (
  <div className="orphaned-shadowbox-warning" title="Shadowbox was deleted">
    ⚠ Deleted
  </div>
)}
```

- [ ] **Step 6: Run all unit tests to verify they pass**

```bash
npm run test:run
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/GridPreview.tsx src/hooks/useGridItems.ts
git add src/components/GridPreview.test.tsx src/hooks/useGridItems.test.ts
git commit -m "feat(shadowbox): integrate shadowboxes into grid — synthetic LibraryItems and orphan warning"
```

---

### Task 13: BOM integration

**Files:**
- Modify: `src/hooks/useBillOfMaterials.ts` (or wherever BOM is assembled)
- Test: extend existing BOM test

- [ ] **Step 1: Read `src/hooks/useBillOfMaterials.ts`**

Understand how `BOMItem` objects are created from placed items.

- [ ] **Step 2: Write failing test**

Add test verifying that a placed shadowbox item includes `shadowboxId` in the BOM:

```typescript
it('BOM item for shadowbox includes shadowboxId', () => {
  const placedItem = { itemId: 'shadowbox:abc-123', shadowBoxId: 'abc-123', ... };
  const bomItem = buildBomItem(placedItem, libraryItem);
  expect(bomItem.shadowboxId).toBe('abc-123');
});
```

- [ ] **Step 3: Update BOM assembly**

When creating a `BOMItem` for a placed item where `libraryItem.id.startsWith('shadowbox:')`, add:

```typescript
shadowboxId: placedItem.shadowBoxId ?? undefined,
```

- [ ] **Step 4: Run BOM tests**

```bash
npm run test:run -- src/hooks/useBillOfMaterials.test.ts
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useBillOfMaterials.ts src/hooks/useBillOfMaterials.test.ts
git commit -m "feat(shadowbox): include shadowboxId in BOM items for admin STL download"
```

---

### Task 14: E2E test

**Files:**
- Create: `e2e/tests/shadowbox.spec.ts`
- Create: `e2e/pages/ShadowboxPage.ts` (page object)

- [ ] **Step 1: Read an existing E2E spec**

Read one existing E2E spec to understand the page object pattern, fixture usage, and how auth is handled.

- [ ] **Step 2: Create page object `e2e/pages/ShadowboxPage.ts`**

```typescript
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
    await this.page.waitForURL('**/shadowbox/edit');
  }

  async clickGenerateAndSave() {
    await this.page.click('button:has-text("Generate")');
  }

  async waitForLibraryItem(name: string) {
    await this.page.waitForSelector(`.shadowbox-library-item:has-text("${name}")`);
  }
}
```

- [ ] **Step 3: Create `e2e/tests/shadowbox.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { ShadowboxPage } from '../pages/ShadowboxPage';
import path from 'path';

test.describe('Shadowbox creation flow', () => {
  test.beforeEach(async ({ page }) => {
    // Log in using existing auth fixture or helper
    // See existing E2E tests for the auth pattern used in this project
  });

  test('upload → edit → library section shows new item', async ({ page }) => {
    const shadowboxPage = new ShadowboxPage(page);
    await shadowboxPage.navigateToNew();

    const testImagePath = path.join(__dirname, '../fixtures/test-tool.jpg');
    await shadowboxPage.uploadPhoto(testImagePath);
    await shadowboxPage.fillName('e2e-test-tool');
    await shadowboxPage.clickProcess();

    await shadowboxPage.waitForEditor();
    expect(page.url()).toContain('/shadowbox/edit');

    await shadowboxPage.clickGenerateAndSave();

    await page.waitForURL('/');
    await shadowboxPage.waitForLibraryItem('e2e-test-tool');
    await expect(page.locator('.shadowbox-library-item:has-text("e2e-test-tool")')).toBeVisible();
  });
});
```

> **Note:** This E2E test requires the full stack (backend + sidecar) to be running. It should be run against a development or staging environment, not in CI without Docker. Add a skip condition or separate npm script if needed.

- [ ] **Step 4: Add a test fixture image**

Place a small test JPEG at `e2e/fixtures/test-tool.jpg`. This should be a simple photo of a tool on a white background with a red reference square (42×42 mm) visible.

- [ ] **Step 5: Commit**

```bash
git add e2e/tests/shadowbox.spec.ts e2e/pages/ShadowboxPage.ts e2e/fixtures/test-tool.jpg
git commit -m "feat(shadowbox): add E2E test for upload-to-library flow"
```

---

## Final Steps

- [ ] **Run full unit test suite one more time**

```bash
npm run test:run
```

Expected: All pass, no regressions.

- [ ] **Run linter**

```bash
npm run lint
```

Fix any errors before proceeding.

- [ ] **Commit any lint fixes**

```bash
git add -p
git commit -m "fix(shadowbox): lint fixes"
```

- [ ] **Push branch**

```bash
git push -u origin feat/shadowbox-integration
```
