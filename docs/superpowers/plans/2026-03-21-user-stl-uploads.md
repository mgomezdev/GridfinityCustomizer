# User STL Uploads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace shadowbox creation with a personal STL/3MF upload system where logged-in users upload Gridfinity models that are auto-processed (dimension detection + preview image generation) and appear in an orange personal library section.

**Architecture:** Node.js backend spawns a Python subprocess (`process_stl.py`) for each upload — detecting grid dimensions from geometry and rendering preview images. An in-memory semaphore limits concurrent Python processes. Frontend polls for status changes and renders items in a new `UserStlLibrarySection` sidebar component.

**Tech Stack:** React 19 + TypeScript + TanStack Query (frontend); Express + @libsql/client + drizzle-orm (backend); Python 3 + numpy-stl + trimesh + matplotlib (processing); Vitest + React Testing Library + Playwright (tests)

**Spec:** `docs/superpowers/specs/2026-03-21-user-stl-uploads-design.md`

---

## Phase 1 — Remove Shadowbox Code

### Task 1: Remove shadowbox backend files and route wiring

**Files:**
- Delete: `packages/server/src/routes/shadowboxes.routes.ts`
- Delete: `packages/server/src/routes/adminShadowboxes.routes.ts`
- Delete: `packages/server/src/controllers/shadowboxes.controller.ts`
- Delete: `packages/server/src/controllers/adminShadowboxes.controller.ts`
- Delete: `packages/server/src/services/shadowboxes.service.ts`
- Modify: `packages/server/src/app.ts` — remove shadowbox route imports + registrations
- Modify: `packages/server/src/config.ts` — remove `SHADOWBOX_SIDECAR_URL`, `SHADOWBOX_STL_DIR`; add `USER_STL_DIR`, `USER_STL_IMAGE_DIR`
- Delete: `shadowbox-sidecar/` — entire directory

- [ ] **Step 1: Delete shadowbox backend files**
```bash
rm packages/server/src/routes/shadowboxes.routes.ts
rm packages/server/src/routes/adminShadowboxes.routes.ts
rm packages/server/src/controllers/shadowboxes.controller.ts
rm packages/server/src/controllers/adminShadowboxes.controller.ts
rm packages/server/src/services/shadowboxes.service.ts
rm -rf shadowbox-sidecar/
```

- [ ] **Step 2: Update `packages/server/src/config.ts`**

Remove `SHADOWBOX_SIDECAR_URL` and `SHADOWBOX_STL_DIR`. Add:
```typescript
USER_STL_DIR: z.string().default('./data/user-stls'),
USER_STL_IMAGE_DIR: z.string().default('./data/user-stl-images'),
MAX_STL_WORKERS: z.coerce.number().default(2),
```

- [ ] **Step 3: Remove shadowbox routes from `packages/server/src/app.ts`**

Remove lines importing and registering `shadowboxes.routes.ts` and `adminShadowboxes.routes.ts`. The app should compile cleanly after this step.

- [ ] **Step 4: Verify backend compiles**
```bash
cd packages/server && npx tsc --noEmit
```
Expected: no errors (ignore missing type references that will be fixed in Task 2).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "chore: remove shadowbox backend — routes, controllers, service, sidecar"
```

---

### Task 2: Remove shadowbox frontend files and update dependent code

**Files:**
- Delete: `packages/app/src/components/ShadowboxUploadPage.tsx`
- Delete: `packages/app/src/components/ShadowboxEditorPage.tsx`
- Delete: `packages/app/src/components/ShadowboxLibrarySection.tsx`
- Delete: `packages/app/src/hooks/useShadowboxes.ts`
- Delete: `packages/app/src/api/shadowboxes.api.ts`
- Delete: `packages/app/src/utils/shadowboxPhotoStore.ts`
- Delete: `packages/app/src/utils/navigate.ts`
- Delete: test files for all of the above
- Modify: `packages/app/src/App.tsx`
- Modify: `packages/app/src/hooks/useLibraryData.ts`
- Modify: `packages/app/src/hooks/useBillOfMaterials.ts`
- Modify: `packages/app/src/components/PlacedItemOverlay.tsx`

- [ ] **Step 1: Delete shadowbox frontend files**
```bash
rm packages/app/src/components/ShadowboxUploadPage.tsx
rm packages/app/src/components/ShadowboxEditorPage.tsx
rm packages/app/src/components/ShadowboxLibrarySection.tsx
rm packages/app/src/hooks/useShadowboxes.ts
rm packages/app/src/api/shadowboxes.api.ts
rm packages/app/src/utils/shadowboxPhotoStore.ts
rm packages/app/src/utils/navigate.ts
# delete test files too
rm packages/app/src/components/ShadowboxUploadPage.test.tsx
rm packages/app/src/components/ShadowboxEditorPage.test.tsx
rm packages/app/src/components/ShadowboxLibrarySection.test.tsx
rm packages/app/src/hooks/useShadowboxes.test.ts
```

- [ ] **Step 2: Update `packages/app/src/App.tsx`**

Remove imports of `ShadowboxUploadPage`, `ShadowboxEditorPage`, `ShadowboxLibrarySection`, `navigate`, `useShadowboxesQuery`.

Remove the pathname routing block that handles `/shadowbox/new` and `/shadowbox/edit`.

Remove `{isAuthenticated && <ShadowboxLibrarySection />}` from JSX.

Keep the `pathname` + `popstate` listener pattern in place (will be used for future navigation if needed, or remove if truly unused).

- [ ] **Step 3: Update `packages/app/src/hooks/useLibraryData.ts`**

Remove the `shadowboxToLibraryItem` function, `useShadowboxesQuery` import, `ApiShadowbox` import, and the `shadowboxLibraryItems` memo. Remove `shadowboxLibraryItems` from the `items` merge. The hook should now only return items from `useQueries`.

- [ ] **Step 4: Update `packages/app/src/hooks/useBillOfMaterials.ts`**

Remove the `shadowboxId` logic — the lines that extract `shadowboxId` from `libraryItem.id.startsWith('shadowbox:')` and include it in the BOM item.

- [ ] **Step 5: Update `packages/app/src/components/PlacedItemOverlay.tsx`**

Remove the orphaned shadowbox warning block (`item.itemId.startsWith('shadowbox:') && item.shadowBoxId === null`).

- [ ] **Step 6: Update `packages/app/src/hooks/useLibraryData.test.ts` and similar test files**

Remove all `vi.mock` calls for `useShadowboxes` and `AuthContext` that were only needed for shadowbox integration. Search for stale shadowbox mocks:
```bash
grep -r "shadowbox\|useShadowboxes\|ShadowboxPhotoStore\|navigate.*shadowbox" packages/app/src --include="*.test.*" -l
```
Fix each file found.

- [ ] **Step 7: Run tests to confirm no shadowbox references remain**
```bash
npm run test:run 2>&1 | head -50
```
Expected: tests pass (some count change is expected due to deleted test files).

- [ ] **Step 8: Commit**
```bash
git add -A
git commit -m "chore: remove shadowbox frontend — components, hooks, api, utils"
```

---

### Task 3: Remove ApiShadowbox from shared types and update DB schema

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/server/src/db/schema.ts`
- Modify: `packages/server/src/db/migrate.ts`

- [ ] **Step 1: Update `packages/shared/src/types.ts`**

Remove `ApiShadowbox` and `ApiShadowboxAdmin` interfaces.

Remove `shadowboxId?: string` from `BOMItem`.

- [ ] **Step 2: Update `packages/server/src/db/schema.ts`**

Remove the `shadowboxes` table definition (the `sqliteTable('shadowboxes', ...)` block) and its relations (`shadowboxesRelations`).

Remove `shadowBoxId` column from the `placedItems` table definition.

- [ ] **Step 3: Update `packages/server/src/db/migrate.ts`**

Replace the shadowboxes `CREATE TABLE IF NOT EXISTS` block with a drop-if-exists cleanup migration:
```typescript
// Drop legacy shadowboxes table (replaced by user_stl_uploads)
try {
  await client.execute(`DROP TABLE IF EXISTS shadowboxes;`);
} catch {
  // ignore
}
```

Remove the `ALTER TABLE placed_items ADD COLUMN shadow_box_id` migration block.

- [ ] **Step 4: Verify compilation**
```bash
cd packages/server && npx tsc --noEmit
cd packages/app && npx tsc --noEmit
```

- [ ] **Step 5: Run tests**
```bash
npm run test:run
```
Expected: all passing.

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "chore: remove ApiShadowbox shared types and shadowboxes DB schema"
```

---

## Phase 2 — Python Processing Pipeline

### Task 4: Python scripts — detect_dimensions and render_previews

**Files:**
- Create: `packages/server/scripts/py/requirements.txt`
- Create: `packages/server/scripts/py/lib/__init__.py`
- Create: `packages/server/scripts/py/lib/detect_dimensions.py`
- Create: `packages/server/scripts/py/lib/render_previews.py`

- [ ] **Step 1: Create `packages/server/scripts/py/requirements.txt`**
```
numpy-stl>=3.0.0
trimesh>=4.0.0
lxml>=4.9.0
matplotlib>=3.5.0
numpy>=1.21.0
pillow>=9.0.0
networkx>=3.0
```

- [ ] **Step 2: Create `packages/server/scripts/py/lib/__init__.py`** (empty)

- [ ] **Step 3: Create `packages/server/scripts/py/lib/detect_dimensions.py`**
```python
"""Detect Gridfinity grid dimensions from STL or 3MF geometry."""
import math
from pathlib import Path


GRIDFINITY_UNIT_MM = 42.0


def detect_from_stl(file_path: str) -> tuple[int, int]:
    """Load STL, compute bounding box, return (grid_x, grid_y)."""
    from stl import mesh  # numpy-stl
    import numpy as np

    m = mesh.Mesh.from_file(file_path)
    min_x = m.x.min()
    max_x = m.x.max()
    min_y = m.y.min()
    max_y = m.y.max()

    extent_x = max_x - min_x
    extent_y = max_y - min_y

    grid_x = max(1, math.ceil(extent_x / GRIDFINITY_UNIT_MM))
    grid_y = max(1, math.ceil(extent_y / GRIDFINITY_UNIT_MM))
    return grid_x, grid_y


def detect_from_3mf(file_path: str) -> tuple[int, int]:
    """Load 3MF via trimesh, compute bounding box, return (grid_x, grid_y)."""
    import trimesh

    scene = trimesh.load(file_path, force='scene')
    if hasattr(scene, 'dump'):
        meshes = scene.dump(concatenate=True)
    else:
        meshes = scene

    bounds = meshes.bounds  # [[min_x, min_y, min_z], [max_x, max_y, max_z]]
    extent_x = bounds[1][0] - bounds[0][0]
    extent_y = bounds[1][1] - bounds[0][1]

    grid_x = max(1, math.ceil(extent_x / GRIDFINITY_UNIT_MM))
    grid_y = max(1, math.ceil(extent_y / GRIDFINITY_UNIT_MM))
    return grid_x, grid_y


def detect_dimensions(file_path: str) -> tuple[int, int]:
    """Auto-detect grid dimensions based on file extension."""
    path = Path(file_path)
    ext = path.suffix.lower()
    if ext == '.stl':
        return detect_from_stl(file_path)
    elif ext == '.3mf':
        return detect_from_3mf(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")
```

- [ ] **Step 4: Create `packages/server/scripts/py/lib/render_previews.py`**

Copy the rendering logic inline from `tools/library-builder/stl_to_png.py` rather than importing it — the import path would break in Docker where the repo layout may differ. Copy the `render_stl_to_png` and `render_stl_to_png_perspective` functions verbatim from `tools/library-builder/stl_to_png.py` into this file, then add a `render_all` wrapper:

```python
"""Render STL/3MF preview images: 1 orthographic + 4 perspective rotations.

The render_stl_to_png and render_stl_to_png_perspective functions are copied
from tools/library-builder/stl_to_png.py to avoid fragile sys.path manipulation.
"""
from pathlib import Path

# --- Copy render_stl_to_png and render_stl_to_png_perspective from
#     tools/library-builder/stl_to_png.py here verbatim ---
# (implementer: open tools/library-builder/stl_to_png.py and copy both functions)


def render_all(file_path: str, output_dir: str, item_id: str) -> dict:
    """
    Render preview images for the given STL/3MF file.
    Returns dict with 'imageUrl' (ortho) and 'perspImageUrls' (list of 4).
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    # Orthographic (top-down)
    ortho_filename = f"{item_id}.png"
    ortho_path = str(out / ortho_filename)
    ok = render_stl_to_png(file_path, ortho_path, max_dimension=800, quiet=True)
    if not ok:
        raise RuntimeError(f"Orthographic render failed for {file_path}")

    # 4 perspective rotations (0, 90, 180, 270 degrees around Z)
    persp_filenames = []
    for deg in [0, 90, 180, 270]:
        filename = f"{item_id}-p{deg}.png"
        p = str(out / filename)
        ok = render_stl_to_png_perspective(
            file_path, p, max_dimension=800, rotation=deg, quiet=True
        )
        if not ok:
            raise RuntimeError(f"Perspective render failed at {deg}° for {file_path}")
        persp_filenames.append(filename)

    return {
        "imageUrl": ortho_filename,
        "perspImageUrls": persp_filenames,
    }
```

- [ ] **Step 5: Install Python dependencies and do a smoke test**

With a test STL file (use `tools/gridfinity-generator/bin_2x3x4_solid.stl` which already exists):
```bash
cd packages/server/scripts/py
pip install -r requirements.txt
python3 -c "
from lib.detect_dimensions import detect_dimensions
x, y = detect_dimensions('../../../../tools/gridfinity-generator/bin_2x3x4_solid.stl')
print(f'Detected: {x}x{y}')
assert x > 0 and y > 0, 'Detection failed'
print('detect_dimensions OK')
"
```
Expected: prints detected dimensions without error.

- [ ] **Step 6: Commit**
```bash
git add packages/server/scripts/
git commit -m "feat(user-stl): add Python detect_dimensions and render_previews scripts"
```

---

### Task 5: Python entry point — process_stl.py with magic byte validation

**Files:**
- Create: `packages/server/scripts/py/process_stl.py`

- [ ] **Step 1: Create `packages/server/scripts/py/process_stl.py`**
```python
#!/usr/bin/env python3
"""
CLI entry point for STL/3MF processing.
Usage: python3 process_stl.py --input /path/to/file.stl --output-dir /path/to/images --id abc123

Outputs JSON to stdout on success:
  {"gridX": 2, "gridY": 1, "imageUrl": "abc123.png", "perspImageUrls": ["abc123-p0.png", ...]}

Exits non-zero with error message to stderr on failure.
"""
import argparse
import json
import sys
from pathlib import Path


def validate_magic_bytes(file_path: str) -> str:
    """
    Validate file header to determine actual format.
    Returns 'stl' or '3mf'.
    Raises ValueError if format is unrecognized.
    """
    path = Path(file_path)
    with open(file_path, 'rb') as f:
        header = f.read(4)

    # 3MF is a ZIP container: starts with PK\x03\x04
    if header[:4] == b'PK\x03\x04':
        return '3mf'

    # STL: binary (80-byte header not starting with 'solid') or ASCII (starts with 'solid')
    # Try reading as text to check for ASCII STL
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            first_line = f.readline().strip().lower()
        if first_line.startswith('solid'):
            return 'stl'
        # Binary STL: 80-byte header, no magic bytes required
        # If file is >= 84 bytes, treat as binary STL
        if path.stat().st_size >= 84:
            return 'stl'
    except Exception:
        pass

    raise ValueError(f"File does not appear to be a valid STL or 3MF: {file_path}")


def main():
    parser = argparse.ArgumentParser(description='Process STL/3MF file for Gridfinity library.')
    parser.add_argument('--input', required=True, help='Path to input STL/3MF file')
    parser.add_argument('--output-dir', required=True, help='Directory to write preview images')
    parser.add_argument('--id', required=True, help='Upload ID (used as image filename prefix)')
    args = parser.parse_args()

    try:
        # Validate file format via magic bytes
        fmt = validate_magic_bytes(args.input)

        # Detect grid dimensions
        from lib.detect_dimensions import detect_dimensions
        grid_x, grid_y = detect_dimensions(args.input)

        # Render preview images
        from lib.render_previews import render_all
        image_result = render_all(args.input, args.output_dir, args.id)

        result = {
            "gridX": grid_x,
            "gridY": grid_y,
            "imageUrl": image_result["imageUrl"],
            "perspImageUrls": image_result["perspImageUrls"],
        }
        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Smoke test the full pipeline**
```bash
cd packages/server/scripts/py
mkdir -p /tmp/stl-test-out
python3 process_stl.py \
  --input ../../../../tools/gridfinity-generator/bin_2x3x4_solid.stl \
  --output-dir /tmp/stl-test-out \
  --id test123
```
Expected: prints JSON with gridX, gridY, imageUrl, perspImageUrls. Check `/tmp/stl-test-out/` for 5 PNG files.

- [ ] **Step 3: Commit**
```bash
git add packages/server/scripts/py/process_stl.py
git commit -m "feat(user-stl): add process_stl.py CLI entry point with magic byte validation"
```

---

## Phase 3 — Backend DB + Services

### Task 6: DB migration — user_stl_uploads table + userStorage.maxUserStls

**Files:**
- Modify: `packages/server/src/db/schema.ts`
- Modify: `packages/server/src/db/migrate.ts`

- [ ] **Step 1: Add `userStlUploads` table to `packages/server/src/db/schema.ts`**

Add after the existing `userStorage` table definition:
```typescript
export const userStlUploads = sqliteTable('user_stl_uploads', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  originalFilename: text('original_filename').notNull(),
  filePath: text('file_path').notNull(),
  imageUrl: text('image_url'),
  perspImageUrls: text('persp_image_urls'), // JSON array string
  gridX: integer('grid_x'),
  gridY: integer('grid_y'),
  status: text('status').notNull().default('pending'), // 'pending'|'processing'|'ready'|'error'
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull().default(''),
  updatedAt: text('updated_at').notNull().default(''),
});

export const userStlUploadsRelations = relations(userStlUploads, ({ one }) => ({
  user: one(users, {
    fields: [userStlUploads.userId],
    references: [users.id],
  }),
}));
```

Also update `userStorage` table in schema.ts to add `maxUserStls`:
```typescript
maxUserStls: integer('max_user_stls').notNull().default(50),
```

Update `usersRelations` to include `stlUploads: many(userStlUploads)`.

- [ ] **Step 2: Add migrations to `packages/server/src/db/migrate.ts`**

Add after the `user_storage` CREATE TABLE block:
```typescript
// Add max_user_stls column to user_storage if missing (existing databases)
try {
  await client.execute(`ALTER TABLE user_storage ADD COLUMN max_user_stls INTEGER NOT NULL DEFAULT 50;`);
} catch {
  // Column already exists — ignore
}

await client.execute(`
  CREATE TABLE IF NOT EXISTS user_stl_uploads (
    id TEXT NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    image_url TEXT,
    persp_image_urls TEXT,
    grid_x INTEGER,
    grid_y INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

await client.execute(`
  CREATE INDEX IF NOT EXISTS idx_user_stl_uploads_user ON user_stl_uploads(user_id);
`);

await client.execute(`
  CREATE INDEX IF NOT EXISTS idx_user_stl_uploads_status ON user_stl_uploads(status);
`);
```

- [ ] **Step 3: Verify compilation**
```bash
cd packages/server && npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git add packages/server/src/db/
git commit -m "feat(user-stl): add user_stl_uploads table and maxUserStls to userStorage"
```

---

### Task 7: Shared types — ApiUserStl and ApiUserStlAdmin

**Files:**
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: Write failing test** — there are no unit tests for shared types (they're compile-time contracts), but verify the type compiles:

Add to `packages/shared/src/types.ts`:
```typescript
export interface ApiUserStl {
  id: string;
  name: string;
  gridX: number | null;
  gridY: number | null;
  imageUrl: string | null;
  perspImageUrls: string[];
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage: string | null;
  createdAt: string;
}

export interface ApiUserStlAdmin extends ApiUserStl {
  userId: number;
  userName: string;
  originalFilename: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Verify compilation across packages**
```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 3: Commit**
```bash
git add packages/shared/src/types.ts
git commit -m "feat(user-stl): add ApiUserStl and ApiUserStlAdmin shared types"
```

---

### Task 8: userStls.service.ts — CRUD, quota check

**Files:**
- Create: `packages/server/src/services/userStls.service.ts`
- Create: `packages/server/src/services/userStls.service.test.ts`

- [ ] **Step 1: Write failing tests in `packages/server/src/services/userStls.service.test.ts`**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@libsql/client';
import { runMigrations } from '../db/migrate.js';
import {
  createUpload,
  getUploadById,
  listByUser,
  updateUploadStatus,
  deleteUpload,
  checkQuota,
} from './userStls.service.js';

let client: ReturnType<typeof createClient>;

beforeEach(async () => {
  client = createClient({ url: ':memory:' });
  await runMigrations(client);
});

describe('createUpload', () => {
  it('creates a row with pending status', async () => {
    const id = await createUpload(client, {
      userId: 1,
      name: 'My Bin',
      originalFilename: 'bin.stl',
      filePath: '/data/user-stls/1/abc.stl',
    });
    expect(typeof id).toBe('string');
    const row = await getUploadById(client, id);
    expect(row?.status).toBe('pending');
    expect(row?.name).toBe('My Bin');
  });
});

describe('checkQuota', () => {
  it('returns false when under quota', async () => {
    const exceeded = await checkQuota(client, 1);
    expect(exceeded).toBe(false);
  });
});

describe('updateUploadStatus', () => {
  it('updates to ready with image data', async () => {
    const id = await createUpload(client, {
      userId: 1, name: 'Test', originalFilename: 'a.stl', filePath: '/f',
    });
    await updateUploadStatus(client, id, 'ready', {
      imageUrl: 'abc.png',
      perspImageUrls: ['abc-p0.png', 'abc-p90.png', 'abc-p180.png', 'abc-p270.png'],
      gridX: 2,
      gridY: 1,
    });
    const row = await getUploadById(client, id);
    expect(row?.status).toBe('ready');
    expect(row?.gridX).toBe(2);
    expect(JSON.parse(row?.perspImageUrls ?? '[]')).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**
```bash
npx vitest run packages/server/src/services/userStls.service.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `packages/server/src/services/userStls.service.ts`**
```typescript
import { randomUUID } from 'crypto';
import type { Client } from '@libsql/client';

export interface CreateUploadParams {
  userId: number;
  name: string;
  originalFilename: string;
  filePath: string;
}

export interface UploadRow {
  id: string;
  userId: number;
  name: string;
  originalFilename: string;
  filePath: string;
  imageUrl: string | null;
  perspImageUrls: string | null; // raw JSON string
  gridX: number | null;
  gridY: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function createUpload(client: Client, params: CreateUploadParams): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO user_stl_uploads
      (id, user_id, name, original_filename, file_path, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    args: [id, params.userId, params.name, params.originalFilename, params.filePath, now, now],
  });
  return id;
}

export async function getUploadById(client: Client, id: string): Promise<UploadRow | null> {
  const result = await client.execute({
    sql: `SELECT id, user_id, name, original_filename, file_path, image_url,
                 persp_image_urls, grid_x, grid_y, status, error_message, created_at, updated_at
          FROM user_stl_uploads WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return rowToUpload(result.rows[0]);
}

export async function listByUser(client: Client, userId: number): Promise<UploadRow[]> {
  const result = await client.execute({
    sql: `SELECT id, user_id, name, original_filename, file_path, image_url,
                 persp_image_urls, grid_x, grid_y, status, error_message, created_at, updated_at
          FROM user_stl_uploads WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows.map(rowToUpload);
}

export async function listAllForAdmin(client: Client): Promise<(UploadRow & { userName: string })[]> {
  const result = await client.execute({
    sql: `SELECT u.id, u.user_id, u.name, u.original_filename, u.file_path, u.image_url,
                 u.persp_image_urls, u.grid_x, u.grid_y, u.status, u.error_message,
                 u.created_at, u.updated_at, us.username as user_name
          FROM user_stl_uploads u
          JOIN users us ON us.id = u.user_id
          ORDER BY u.updated_at DESC`,
    args: [],
  });
  return result.rows.map((row) => ({ ...rowToUpload(row), userName: String(row.user_name) }));
}

export async function updateUploadStatus(
  client: Client,
  id: string,
  status: 'pending' | 'processing' | 'ready' | 'error',
  data?: {
    imageUrl?: string;
    perspImageUrls?: string[];
    gridX?: number;
    gridY?: number;
    errorMessage?: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await client.execute({
    sql: `UPDATE user_stl_uploads SET
            status = ?,
            image_url = COALESCE(?, image_url),
            persp_image_urls = COALESCE(?, persp_image_urls),
            grid_x = COALESCE(?, grid_x),
            grid_y = COALESCE(?, grid_y),
            error_message = ?,
            updated_at = ?
          WHERE id = ?`,
    args: [
      status,
      data?.imageUrl ?? null,
      data?.perspImageUrls ? JSON.stringify(data.perspImageUrls) : null,
      data?.gridX ?? null,
      data?.gridY ?? null,
      data?.errorMessage ?? null,
      now,
      id,
    ],
  });
}

export async function updateUploadMeta(
  client: Client,
  id: string,
  params: { name?: string; gridX?: number | null; gridY?: number | null },
): Promise<void> {
  const now = new Date().toISOString();
  await client.execute({
    sql: `UPDATE user_stl_uploads SET
            name = COALESCE(?, name),
            grid_x = ?,
            grid_y = ?,
            updated_at = ?
          WHERE id = ?`,
    args: [params.name ?? null, params.gridX ?? null, params.gridY ?? null, now, id],
  });
}

export async function deleteUpload(client: Client, id: string): Promise<void> {
  await client.execute({ sql: `DELETE FROM user_stl_uploads WHERE id = ?`, args: [id] });
}

/** Resets status to 'pending' for re-processing. */
export async function resetToPending(client: Client, id: string): Promise<void> {
  const now = new Date().toISOString();
  await client.execute({
    sql: `UPDATE user_stl_uploads SET status = 'pending', error_message = NULL, updated_at = ? WHERE id = ?`,
    args: [now, id],
  });
}

/** Returns IDs of all rows currently in 'pending' or 'processing' state. */
export async function getPendingAndProcessingIds(client: Client): Promise<string[]> {
  const result = await client.execute({
    sql: `SELECT id FROM user_stl_uploads WHERE status IN ('pending', 'processing')`,
    args: [],
  });
  return result.rows.map((r) => String(r.id));
}

/**
 * Checks whether the user has reached their upload quota.
 * Returns true if quota is exceeded (caller should reject with 409).
 */
export async function checkQuota(client: Client, userId: number): Promise<boolean> {
  const countResult = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM user_stl_uploads WHERE user_id = ?`,
    args: [userId],
  });
  const count = Number(countResult.rows[0].cnt);

  const storageResult = await client.execute({
    sql: `SELECT max_user_stls FROM user_storage WHERE user_id = ?`,
    args: [userId],
  });
  // If no userStorage row, use default of 50
  const maxUserStls = storageResult.rows.length > 0
    ? Number(storageResult.rows[0].max_user_stls)
    : 50;

  return count >= maxUserStls;
}

function rowToUpload(row: Record<string, unknown>): UploadRow {
  return {
    id: String(row.id),
    userId: Number(row.user_id),
    name: String(row.name),
    originalFilename: String(row.original_filename),
    filePath: String(row.file_path),
    imageUrl: row.image_url ? String(row.image_url) : null,
    perspImageUrls: row.persp_image_urls ? String(row.persp_image_urls) : null,
    gridX: row.grid_x != null ? Number(row.grid_x) : null,
    gridY: row.grid_y != null ? Number(row.grid_y) : null,
    status: String(row.status),
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
```

- [ ] **Step 4: Run tests**
```bash
npx vitest run packages/server/src/services/userStls.service.test.ts
```
Expected: all passing.

- [ ] **Step 5: Commit**
```bash
git add packages/server/src/services/userStls.service.ts packages/server/src/services/userStls.service.test.ts
git commit -m "feat(user-stl): add userStls.service with CRUD and quota check"
```

---

### Task 9: stlQueue.service.ts — in-memory semaphore

**Files:**
- Create: `packages/server/src/services/stlQueue.service.ts`
- Create: `packages/server/src/services/stlQueue.service.test.ts`

- [ ] **Step 1: Write failing tests**
```typescript
// packages/server/src/services/stlQueue.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { StlQueue } from './stlQueue.service.js';

describe('StlQueue', () => {
  it('runs jobs up to concurrency limit immediately', async () => {
    const queue = new StlQueue(2);
    const calls: number[] = [];
    const job = (n: number) => () =>
      new Promise<void>((resolve) => {
        calls.push(n);
        resolve();
      });

    await Promise.all([
      queue.enqueue(job(1)),
      queue.enqueue(job(2)),
    ]);
    expect(calls).toContain(1);
    expect(calls).toContain(2);
  });

  it('queues jobs beyond concurrency limit', async () => {
    const queue = new StlQueue(1);
    const order: number[] = [];
    let resolveFirst!: () => void;
    const firstJob = () =>
      new Promise<void>((resolve) => {
        order.push(1);
        resolveFirst = resolve;
      });
    const secondJob = () =>
      new Promise<void>((resolve) => {
        order.push(2);
        resolve();
      });

    const p1 = queue.enqueue(firstJob);
    const p2 = queue.enqueue(secondJob);
    // Second job shouldn't start until first finishes
    expect(order).toEqual([1]);
    resolveFirst();
    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**
```bash
npx vitest run packages/server/src/services/stlQueue.service.test.ts
```

- [ ] **Step 3: Create `packages/server/src/services/stlQueue.service.ts`**
```typescript
type Job = () => Promise<void>;

export class StlQueue {
  private running = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly maxWorkers: number) {}

  enqueue(job: Job): Promise<void> {
    return new Promise((resolve, reject) => {
      const run = () => {
        this.running++;
        job()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.running--;
            const next = this.queue.shift();
            if (next) next();
          });
      };

      if (this.running < this.maxWorkers) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }
}

// Singleton instance — configured via MAX_STL_WORKERS env var
import { config } from '../config.js';
export const stlQueue = new StlQueue(config.MAX_STL_WORKERS);
```

- [ ] **Step 4: Run tests**
```bash
npx vitest run packages/server/src/services/stlQueue.service.test.ts
```
Expected: all passing.

- [ ] **Step 5: Commit**
```bash
git add packages/server/src/services/stlQueue.service.ts packages/server/src/services/stlQueue.service.test.ts
git commit -m "feat(user-stl): add StlQueue in-memory semaphore service"
```

---

### Task 10: stlProcessing.service.ts — spawns Python subprocess

**Files:**
- Create: `packages/server/src/services/stlProcessing.service.ts`
- Create: `packages/server/src/services/stlProcessing.service.test.ts`

- [ ] **Step 1: Write failing tests**
```typescript
// packages/server/src/services/stlProcessing.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawn } from 'child_process';

vi.mock('child_process');
vi.mock('../db/client.js', () => ({ client: {} }));
vi.mock('./userStls.service.js', () => ({
  updateUploadStatus: vi.fn(),
  getUploadById: vi.fn(),
}));
vi.mock('./stlQueue.service.js', () => ({
  stlQueue: { enqueue: (job: () => Promise<void>) => job() },
}));

const mockSpawn = vi.mocked(spawn);

describe('processUpload', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates status to ready on successful processing', async () => {
    const { updateUploadStatus, getUploadById } = await import('./userStls.service.js');
    vi.mocked(getUploadById).mockResolvedValue({
      id: 'abc', userId: 1, name: 'test', originalFilename: 'a.stl',
      filePath: '/data/a.stl', imageUrl: null, perspImageUrls: null,
      gridX: null, gridY: null, status: 'pending', errorMessage: null,
      createdAt: '', updatedAt: '',
    });

    const fakeChild = {
      stdout: { on: vi.fn((e, cb) => { if (e === 'data') cb(Buffer.from('{"gridX":2,"gridY":1,"imageUrl":"abc.png","perspImageUrls":["abc-p0.png","abc-p90.png","abc-p180.png","abc-p270.png"]}')); }) },
      stderr: { on: vi.fn() },
      on: vi.fn((e, cb) => { if (e === 'close') cb(0); }),
    };
    mockSpawn.mockReturnValue(fakeChild as unknown as ReturnType<typeof spawn>);

    const { processUpload } = await import('./stlProcessing.service.js');
    await processUpload('abc', '/data/a.stl', '/data/images', 1);

    expect(updateUploadStatus).toHaveBeenCalledWith(expect.anything(), 'abc', 'ready', expect.objectContaining({
      gridX: 2,
      gridY: 1,
      imageUrl: 'abc.png',
    }));
  });

  it('updates status to error when process exits non-zero', async () => {
    const { updateUploadStatus, getUploadById } = await import('./userStls.service.js');
    vi.mocked(getUploadById).mockResolvedValue({
      id: 'abc', userId: 1, name: 'test', originalFilename: 'a.stl',
      filePath: '/data/a.stl', imageUrl: null, perspImageUrls: null,
      gridX: null, gridY: null, status: 'pending', errorMessage: null,
      createdAt: '', updatedAt: '',
    });

    const fakeChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn((e, cb) => { if (e === 'data') cb(Buffer.from('Invalid file format')); }) },
      on: vi.fn((e, cb) => { if (e === 'close') cb(1); }),
    };
    mockSpawn.mockReturnValue(fakeChild as unknown as ReturnType<typeof spawn>);

    const { processUpload } = await import('./stlProcessing.service.js');
    await processUpload('abc', '/data/a.stl', '/data/images', 1);

    expect(updateUploadStatus).toHaveBeenCalledWith(expect.anything(), 'abc', 'error', expect.objectContaining({
      errorMessage: 'Invalid file format',
    }));
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**
```bash
npx vitest run packages/server/src/services/stlProcessing.service.test.ts
```

- [ ] **Step 3: Create `packages/server/src/services/stlProcessing.service.ts`**
```typescript
import { spawn } from 'child_process';
import path from 'path';
import { client } from '../db/client.js';
import { updateUploadStatus } from './userStls.service.js';
import { stlQueue } from './stlQueue.service.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

const PYTHON_SCRIPT = path.resolve(
  new URL(import.meta.url).pathname,
  '../../../../../../packages/server/scripts/py/process_stl.py'
);

export function processUpload(
  uploadId: string,
  filePath: string,
  imageOutputDir: string,
  _userId: number,
): Promise<void> {
  return stlQueue.enqueue(async () => {
    await updateUploadStatus(client, uploadId, 'processing');

    await new Promise<void>((resolve) => {
      let stdout = '';
      let stderr = '';

      const child = spawn('python3', [
        PYTHON_SCRIPT,
        '--input', filePath,
        '--output-dir', imageOutputDir,
        '--id', uploadId,
      ]);

      child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      child.on('close', async (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim()) as {
              gridX: number;
              gridY: number;
              imageUrl: string;
              perspImageUrls: string[];
            };
            await updateUploadStatus(client, uploadId, 'ready', {
              gridX: result.gridX,
              gridY: result.gridY,
              imageUrl: result.imageUrl,
              perspImageUrls: result.perspImageUrls,
            });
          } catch (e) {
            logger.error({ uploadId, err: e }, 'Failed to parse process_stl.py output');
            await updateUploadStatus(client, uploadId, 'error', {
              errorMessage: 'Failed to parse processing output',
            });
          }
        } else {
          const errorMessage = stderr.trim() || 'Processing failed with unknown error';
          logger.error({ uploadId, code, stderr }, 'process_stl.py exited non-zero');
          await updateUploadStatus(client, uploadId, 'error', { errorMessage });
        }
        resolve();
      });
    });
  });
}

export async function getImageOutputDir(userId: number): Promise<string> {
  return path.join(config.USER_STL_IMAGE_DIR, String(userId));
}
```

**Note:** The `PYTHON_SCRIPT` path computation needs to be verified based on your actual directory structure. The script lives at `packages/server/scripts/py/process_stl.py` relative to repo root. In production, resolve it from `config` or an env var: add `PYTHON_SCRIPT_DIR: z.string().default('./scripts/py')` to config.ts and use `path.join(config.PYTHON_SCRIPT_DIR, 'process_stl.py')` instead of the hardcoded path.

- [ ] **Step 4: Update config to include PYTHON_SCRIPT_DIR**

In `packages/server/src/config.ts`, add:
```typescript
PYTHON_SCRIPT_DIR: z.string().default('./scripts/py'),
```

Update `stlProcessing.service.ts` to use:
```typescript
const PYTHON_SCRIPT = path.resolve(config.PYTHON_SCRIPT_DIR, 'process_stl.py');
```

- [ ] **Step 5: Run tests**
```bash
npx vitest run packages/server/src/services/stlProcessing.service.test.ts
```
Expected: passing.

- [ ] **Step 6: Commit**
```bash
git add packages/server/src/services/stlProcessing.service.ts packages/server/src/services/stlProcessing.service.test.ts packages/server/src/config.ts
git commit -m "feat(user-stl): add stlProcessing.service to spawn Python subprocess"
```

---

## Phase 4 — Backend Routes + Controllers

### Task 11: User STL routes and controller

**Files:**
- Create: `packages/server/src/controllers/userStls.controller.ts`
- Create: `packages/server/src/routes/userStls.routes.ts`

- [ ] **Step 1: Create `packages/server/src/routes/userStls.routes.ts`**

Uses multer for disk storage (50MB limit, `.stl`/`.3mf` only):
```typescript
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/userStls.controller.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Temp location; moved to userId subdir after we know the upload ID
    cb(null, config.USER_STL_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.stl' || ext === '.3mf') {
      cb(null, true);
    } else {
      cb(new Error('Only .stl and .3mf files are allowed'));
    }
  },
});

const router = Router();

router.post('/', requireAuth, upload.single('file'), ctrl.uploadHandler);
router.get('/', requireAuth, ctrl.listHandler);
router.get('/:id', requireAuth, ctrl.getOneHandler);
router.put('/:id', requireAuth, ctrl.updateMetaHandler);
router.delete('/:id', requireAuth, ctrl.deleteHandler);
router.put('/:id/file', requireAuth, upload.single('file'), ctrl.replaceFileHandler);
router.post('/:id/reprocess', requireAuth, ctrl.reprocessHandler);
router.get('/:id/file', requireAuth, ctrl.downloadFileHandler);
router.get('/:id/images/:filename', requireAuth, ctrl.serveImageHandler);

export default router;
```

- [ ] **Step 2: Create `packages/server/src/controllers/userStls.controller.ts`**
```typescript
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { client } from '../db/client.js';
import { config } from '../config.js';
import {
  createUpload,
  getUploadById,
  listByUser,
  updateUploadMeta,
  deleteUpload,
  resetToPending,
  checkQuota,
} from '../services/userStls.service.js';
import { processUpload, getImageOutputDir } from '../services/stlProcessing.service.js';
import type { ApiUserStl } from '@gridfinity/shared';

function toApiUserStl(row: Awaited<ReturnType<typeof getUploadById>>): ApiUserStl {
  if (!row) throw new Error('Row not found');
  return {
    id: row.id,
    name: row.name,
    gridX: row.gridX,
    gridY: row.gridY,
    imageUrl: row.imageUrl,
    perspImageUrls: row.perspImageUrls ? JSON.parse(row.perspImageUrls) : [],
    status: row.status as ApiUserStl['status'],
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
  };
}

function checkOwnership(row: { userId: number }, req: Request, res: Response): boolean {
  if (req.user.userId !== row.userId && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

export async function uploadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: 'File required' });
    const name: string = (req.body.name as string) || req.file.originalname;
    if (!name.trim()) return res.status(400).json({ error: 'Name required' });

    // Quota check
    const exceeded = await checkQuota(client, req.user.userId);
    if (exceeded) return res.status(409).json({ error: 'Upload quota exceeded' });

    // Determine destination path, then create the DB row with the correct filePath
    const userDir = path.join(config.USER_STL_DIR, String(req.user.userId));
    await fs.mkdir(userDir, { recursive: true });
    const ext = path.extname(req.file.originalname).toLowerCase();

    // Generate a UUID for the upload ID so we know the filename before DB insert
    const { randomUUID } = await import('crypto');
    const uploadId = randomUUID();
    const destPath = path.join(userDir, `${uploadId}${ext}`);
    await fs.rename(req.file.path, destPath);

    // Create DB row with the correct filePath from the start (no placeholder needed)
    await createUpload(client, {
      id: uploadId,           // pass the pre-generated ID
      userId: req.user.userId,
      name: name.trim(),
      originalFilename: req.file.originalname,
      filePath: destPath,
    });

    // Note: createUpload must accept an optional `id` param. Update its signature:
    //   export async function createUpload(client, params: CreateUploadParams & { id?: string })
    // and use `params.id ?? randomUUID()` inside the function.

    // Enqueue processing (fire-and-forget)
    const imageDir = await getImageOutputDir(req.user.userId);
    void processUpload(uploadId, destPath, imageDir, req.user.userId);

    const row = await getUploadById(client, uploadId);
    return res.status(201).json(toApiUserStl(row!));
  } catch (err) {
    next(err);
  }
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await listByUser(client, req.user.userId);
    return res.json(rows.map(toApiUserStl));
  } catch (err) {
    next(err);
  }
}

export async function getOneHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await getUploadById(client, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (!checkOwnership(row, req, res)) return;
    return res.json(toApiUserStl(row));
  } catch (err) {
    next(err);
  }
}

export async function updateMetaHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await getUploadById(client, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (!checkOwnership(row, req, res)) return;

    const { name, gridX, gridY } = req.body as { name?: string; gridX?: number; gridY?: number };
    await updateUploadMeta(client, req.params.id, { name, gridX, gridY });

    const updated = await getUploadById(client, req.params.id);
    return res.json(toApiUserStl(updated!));
  } catch (err) {
    next(err);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await getUploadById(client, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (!checkOwnership(row, req, res)) return;

    // Delete files
    await fs.unlink(row.filePath).catch(() => {});
    if (row.imageUrl) {
      const imageDir = path.join(config.USER_STL_IMAGE_DIR, String(row.userId));
      await fs.unlink(path.join(imageDir, row.imageUrl)).catch(() => {});
      const persp: string[] = row.perspImageUrls ? JSON.parse(row.perspImageUrls) : [];
      for (const f of persp) {
        await fs.unlink(path.join(imageDir, f)).catch(() => {});
      }
    }

    await deleteUpload(client, req.params.id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function replaceFileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await getUploadById(client, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (!checkOwnership(row, req, res)) return;
    if (!req.file) return res.status(400).json({ error: 'File required' });

    // Delete old file
    await fs.unlink(row.filePath).catch(() => {});

    // Move new file
    const userDir = path.join(config.USER_STL_DIR, String(row.userId));
    const ext = path.extname(req.file.originalname).toLowerCase();
    const destPath = path.join(userDir, `${row.id}${ext}`);
    await fs.rename(req.file.path, destPath);

    await client.execute({
      sql: `UPDATE user_stl_uploads SET file_path = ?, original_filename = ?, updated_at = ? WHERE id = ?`,
      args: [destPath, req.file.originalname, new Date().toISOString(), row.id],
    });
    await resetToPending(client, row.id);

    const imageDir = await getImageOutputDir(row.userId);
    void processUpload(row.id, destPath, imageDir, row.userId);

    const updated = await getUploadById(client, row.id);
    return res.json(toApiUserStl(updated!));
  } catch (err) {
    next(err);
  }
}

export async function reprocessHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await getUploadById(client, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (!checkOwnership(row, req, res)) return;

    await resetToPending(client, row.id);
    const imageDir = await getImageOutputDir(row.userId);
    void processUpload(row.id, row.filePath, imageDir, row.userId);

    return res.status(202).json({ message: 'Reprocessing started' });
  } catch (err) {
    next(err);
  }
}

export async function downloadFileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await getUploadById(client, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (!checkOwnership(row, req, res)) return;

    res.setHeader('Content-Disposition', `attachment; filename="${row.originalFilename}"`);
    return res.sendFile(row.filePath);
  } catch (err) {
    next(err);
  }
}

export async function serveImageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await getUploadById(client, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (!checkOwnership(row, req, res)) return;

    const { filename } = req.params;
    // Path traversal guard
    if (filename.includes('..') || filename.includes('/') || filename.includes('\0')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const imageDir = path.join(config.USER_STL_IMAGE_DIR, String(row.userId));
    const resolved = path.resolve(imageDir, filename);
    if (!resolved.startsWith(path.resolve(imageDir))) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    return res.sendFile(resolved);
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 3: Commit**
```bash
git add packages/server/src/routes/userStls.routes.ts packages/server/src/controllers/userStls.controller.ts
git commit -m "feat(user-stl): add user STL routes and controller"
```

---

### Task 12: Admin STL routes and controller, wire up in app.ts, startup recovery in index.ts

**Files:**
- Create: `packages/server/src/controllers/adminUserStls.controller.ts`
- Create: `packages/server/src/routes/adminUserStls.routes.ts`
- Modify: `packages/server/src/app.ts`
- Modify: `packages/server/src/index.ts`

- [ ] **Step 1: Create `packages/server/src/controllers/adminUserStls.controller.ts`**
```typescript
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { client } from '../db/client.js';
import { config } from '../config.js';
import { listAllForAdmin, getUploadById } from '../services/userStls.service.js';
import type { ApiUserStlAdmin } from '@gridfinity/shared';

function toApiAdmin(row: Awaited<ReturnType<typeof listAllForAdmin>>[number]): ApiUserStlAdmin {
  return {
    id: row.id,
    name: row.name,
    gridX: row.gridX,
    gridY: row.gridY,
    imageUrl: row.imageUrl,
    perspImageUrls: row.perspImageUrls ? JSON.parse(row.perspImageUrls) : [],
    status: row.status as ApiUserStlAdmin['status'],
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    userId: row.userId,
    userName: row.userName,
    originalFilename: row.originalFilename,
    updatedAt: row.updatedAt,
  };
}

export async function listAllHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await listAllForAdmin(client);
    return res.json(rows.map(toApiAdmin));
  } catch (err) {
    next(err);
  }
}

export async function promoteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await getUploadById(client, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.status !== 'ready') return res.status(409).json({ error: 'Upload is not ready' });

    const destDir = path.join('public', 'libraries', 'user-uploads');
    await fs.mkdir(destDir, { recursive: true });

    // Copy STL file
    const stlDest = path.join(destDir, `${row.id}${path.extname(row.filePath)}`);
    await fs.copyFile(row.filePath, stlDest);

    // Copy images
    const imageDir = path.join(config.USER_STL_IMAGE_DIR, String(row.userId));
    const persp: string[] = row.perspImageUrls ? JSON.parse(row.perspImageUrls) : [];
    const allImages = [...(row.imageUrl ? [row.imageUrl] : []), ...persp];
    for (const img of allImages) {
      await fs.copyFile(path.join(imageDir, img), path.join(destDir, img)).catch(() => {});
    }

    // Update index.json atomically
    const indexPath = path.join(destDir, 'index.json');
    let index: { items: unknown[] } = { items: [] };
    try {
      const raw = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(raw) as typeof index;
    } catch {
      // file doesn't exist yet
    }

    const entry = {
      id: row.id,
      name: row.name,
      widthUnits: row.gridX ?? 1,
      heightUnits: row.gridY ?? 1,
      imageUrl: row.imageUrl ?? undefined,
      perspImageUrls: persp,
    };

    index.items = [...index.items.filter((i: unknown) => (i as { id: string }).id !== row.id), entry];

    const tmpPath = indexPath + '.tmp';
    await fs.writeFile(tmpPath, JSON.stringify(index, null, 2));
    await fs.rename(tmpPath, indexPath);

    return res.json({ message: 'Promoted successfully' });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 2: Create `packages/server/src/routes/adminUserStls.routes.ts`**
```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { listAllHandler, promoteHandler } from '../controllers/adminUserStls.controller.js';

const router = Router();
router.get('/admin/user-stls', requireAuth, requireAdmin, listAllHandler);
router.post('/admin/user-stls/:id/promote', requireAuth, requireAdmin, promoteHandler);
export default router;
```

- [ ] **Step 3: Register routes in `packages/server/src/app.ts`**

Import and register the two new route files in the same pattern as existing routes:
```typescript
import userStlsRouter from './routes/userStls.routes.js';
import adminUserStlsRouter from './routes/adminUserStls.routes.js';

// In app setup, after existing routes:
app.use('/api/v1/user-stls', userStlsRouter);
app.use('/api/v1', adminUserStlsRouter);
```

Also ensure the `USER_STL_DIR` directory is created at startup if it doesn't exist. Add to `packages/server/src/index.ts`:
```typescript
import fs from 'fs/promises';
import { config } from './config.js';

// After runMigrations(), before listen():
await fs.mkdir(config.USER_STL_DIR, { recursive: true });
await fs.mkdir(config.USER_STL_IMAGE_DIR, { recursive: true });
```

- [ ] **Step 4: Startup recovery in `packages/server/src/index.ts`**

After directory creation, add:
```typescript
import { getPendingAndProcessingIds, getUploadById, resetToPending } from './services/userStls.service.js';
import { processUpload, getImageOutputDir } from './services/stlProcessing.service.js';

// Reset stuck processing rows and re-enqueue pending on startup
const stuckIds = await getPendingAndProcessingIds(client);
for (const id of stuckIds) {
  await resetToPending(client, id);
  const row = await getUploadById(client, id);
  if (row) {
    const imageDir = await getImageOutputDir(row.userId);
    void processUpload(id, row.filePath, imageDir, row.userId);
  }
}
```

- [ ] **Step 5: Verify compilation**
```bash
cd packages/server && npx tsc --noEmit
```

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat(user-stl): add admin routes, wire up all routes, add startup recovery"
```

---

## Phase 5 — Frontend

### Task 13: userStls.api.ts — typed API client

**Files:**
- Create: `packages/app/src/api/userStls.api.ts`

- [ ] **Step 1: Create `packages/app/src/api/userStls.api.ts`**
```typescript
import type { ApiUserStl, ApiUserStlAdmin } from '@gridfinity/shared';

const API_BASE = '/api/v1/user-stls';

async function apiFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
  const isMultipart = init?.body instanceof FormData;
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res;
}

export async function fetchUserStls(token: string): Promise<ApiUserStl[]> {
  const res = await apiFetch(API_BASE, token);
  return res.json() as Promise<ApiUserStl[]>;
}

export async function uploadUserStl(
  file: File,
  name: string,
  token: string,
): Promise<ApiUserStl> {
  const form = new FormData();
  form.append('file', file);
  form.append('name', name);
  const res = await apiFetch(API_BASE, token, { method: 'POST', body: form });
  return res.json() as Promise<ApiUserStl>;
}

export async function updateUserStl(
  id: string,
  data: { name?: string; gridX?: number | null; gridY?: number | null },
  token: string,
): Promise<ApiUserStl> {
  const res = await apiFetch(`${API_BASE}/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.json() as Promise<ApiUserStl>;
}

export async function deleteUserStl(id: string, token: string): Promise<void> {
  await apiFetch(`${API_BASE}/${id}`, token, { method: 'DELETE' });
}

export async function reprocessUserStl(id: string, token: string): Promise<void> {
  await apiFetch(`${API_BASE}/${id}/reprocess`, token, { method: 'POST' });
}

export async function replaceUserStlFile(id: string, file: File, token: string): Promise<ApiUserStl> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiFetch(`${API_BASE}/${id}/file`, token, { method: 'PUT', body: form });
  return res.json() as Promise<ApiUserStl>;
}

export function getUserStlImageUrl(id: string, filename: string): string {
  return `${API_BASE}/${id}/images/${encodeURIComponent(filename)}`;
}

// Admin
export async function fetchAdminUserStls(token: string): Promise<ApiUserStlAdmin[]> {
  const res = await apiFetch('/api/v1/admin/user-stls', token);
  return res.json() as Promise<ApiUserStlAdmin[]>;
}

export async function promoteUserStl(id: string, token: string): Promise<void> {
  await apiFetch(`/api/v1/admin/user-stls/${id}/promote`, token, { method: 'POST' });
}
```

- [ ] **Step 2: Commit**
```bash
git add packages/app/src/api/userStls.api.ts
git commit -m "feat(user-stl): add userStls.api.ts typed API client"
```

---

### Task 14: useUserStls.ts — TanStack Query hooks with polling

**Files:**
- Create: `packages/app/src/hooks/useUserStls.ts`
- Create: `packages/app/src/hooks/useUserStls.test.ts`

- [ ] **Step 1: Write failing tests in `packages/app/src/hooks/useUserStls.test.ts`**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useUserStlsQuery } from './useUserStls.js';

vi.mock('../api/userStls.api.js', () => ({
  fetchUserStls: vi.fn().mockResolvedValue([
    { id: '1', name: 'Test', status: 'ready', gridX: 2, gridY: 1,
      imageUrl: null, perspImageUrls: [], errorMessage: null, createdAt: '' },
  ]),
}));

vi.mock('../contexts/AuthContext.js', () => ({
  useAuth: () => ({ getAccessToken: () => 'test-token', isAuthenticated: true }),
}));

describe('useUserStlsQuery', () => {
  it('returns user STL items', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useUserStlsQuery(), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data![0].name).toBe('Test');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**
```bash
npx vitest run packages/app/src/hooks/useUserStls.test.ts
```

- [ ] **Step 3: Create `packages/app/src/hooks/useUserStls.ts`**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchUserStls,
  uploadUserStl,
  updateUserStl,
  deleteUserStl,
  reprocessUserStl,
  replaceUserStlFile,
} from '../api/userStls.api';
import type { ApiUserStl } from '@gridfinity/shared';

export const USER_STLS_QUERY_KEY = ['user-stls'] as const;

const POLL_INTERVAL_MS = 3000;

function hasActiveJobs(items: ApiUserStl[]): boolean {
  return items.some((i) => i.status === 'pending' || i.status === 'processing');
}

export function useUserStlsQuery() {
  const { getAccessToken, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: USER_STLS_QUERY_KEY,
    queryFn: () => {
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return fetchUserStls(token);
    },
    enabled: isAuthenticated,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data && hasActiveJobs(data) ? POLL_INTERVAL_MS : false;
    },
  });
}

export function useUploadUserStlMutation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, name }: { file: File; name: string }) => {
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return uploadUserStl(file, name, token);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: USER_STLS_QUERY_KEY }); },
  });
}

export function useUpdateUserStlMutation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; gridX?: number | null; gridY?: number | null }) => {
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return updateUserStl(id, data, token);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: USER_STLS_QUERY_KEY }); },
  });
}

export function useDeleteUserStlMutation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return deleteUserStl(id, token);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: USER_STLS_QUERY_KEY }); },
  });
}

export function useReprocessUserStlMutation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return reprocessUserStl(id, token);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: USER_STLS_QUERY_KEY }); },
  });
}

export function useReplaceUserStlFileMutation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return replaceUserStlFile(id, file, token);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: USER_STLS_QUERY_KEY }); },
  });
}
```

- [ ] **Step 4: Run tests**
```bash
npx vitest run packages/app/src/hooks/useUserStls.test.ts
```
Expected: passing.

- [ ] **Step 5: Commit**
```bash
git add packages/app/src/hooks/useUserStls.ts packages/app/src/hooks/useUserStls.test.ts
git commit -m "feat(user-stl): add useUserStls hooks with polling for active jobs"
```

---

### Task 15: UserStlUploadModal and UserStlEditModal components

**Files:**
- Create: `packages/app/src/components/UserStlUploadModal.tsx`
- Create: `packages/app/src/components/UserStlUploadModal.test.tsx`
- Create: `packages/app/src/components/UserStlEditModal.tsx`
- Create: `packages/app/src/components/UserStlEditModal.test.tsx`

- [ ] **Step 1: Write failing tests for UserStlUploadModal**
```typescript
// packages/app/src/components/UserStlUploadModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserStlUploadModal } from './UserStlUploadModal.js';

vi.mock('../contexts/AuthContext.js', () => ({
  useAuth: () => ({ getAccessToken: () => 'tok', isAuthenticated: true }),
}));

const mockUpload = vi.fn();
vi.mock('../hooks/useUserStls.js', () => ({
  useUploadUserStlMutation: () => ({
    mutateAsync: mockUpload,
    isPending: false,
    error: null,
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('UserStlUploadModal', () => {
  it('shows error when file not selected and form submitted', async () => {
    const onClose = vi.fn();
    render(<UserStlUploadModal onClose={onClose} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('rejects non-STL files with client-side error', async () => {
    const onClose = vi.fn();
    render(<UserStlUploadModal onClose={onClose} />, { wrapper });
    const input = screen.getByLabelText(/file/i);
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);
    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/stl|3mf/i);
  });

  it('calls mutateAsync with file and name on valid submit', async () => {
    mockUpload.mockResolvedValue({ id: '1', status: 'pending' });
    const onClose = vi.fn();
    render(<UserStlUploadModal onClose={onClose} />, { wrapper });
    const file = new File(['binary'], 'widget.stl', { type: 'application/octet-stream' });
    const input = screen.getByLabelText(/file/i);
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);
    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith({ file, name: 'widget' }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**
```bash
npx vitest run packages/app/src/components/UserStlUploadModal.test.tsx
```

- [ ] **Step 3: Create `packages/app/src/components/UserStlUploadModal.tsx`**
```tsx
import { useState } from 'react';
import { useUploadUserStlMutation } from '../hooks/useUserStls';

interface UserStlUploadModalProps {
  onClose: () => void;
}

export function UserStlUploadModal({ onClose }: UserStlUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync, isPending } = useUploadUserStlMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !name) {
      setName(f.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) { setError('Please select a file.'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'stl' && ext !== '3mf') {
      setError('Only .stl and .3mf files are supported.');
      return;
    }
    if (!name.trim()) { setError('Please enter a name.'); return; }
    try {
      await mutateAsync({ file, name: name.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Upload Model</h2>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="form-field">
            <label htmlFor="stl-file">File (.stl or .3mf)</label>
            <input
              id="stl-file"
              type="file"
              accept=".stl,.3mf"
              onChange={handleFileChange}
            />
          </div>
          <div className="form-field">
            <label htmlFor="stl-name">Name</label>
            <input
              id="stl-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && <div role="alert" className="upload-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" disabled={isPending}>
              {isPending ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run UserStlUploadModal tests**
```bash
npx vitest run packages/app/src/components/UserStlUploadModal.test.tsx
```

- [ ] **Step 5: Create `packages/app/src/components/UserStlEditModal.tsx`**
```tsx
import { useState } from 'react';
import type { ApiUserStl } from '@gridfinity/shared';
import {
  useUpdateUserStlMutation,
  useDeleteUserStlMutation,
  useReprocessUserStlMutation,
  useReplaceUserStlFileMutation,
} from '../hooks/useUserStls';
import { useAuth } from '../contexts/AuthContext';

interface UserStlEditModalProps {
  item: ApiUserStl;
  onClose: () => void;
}

export function UserStlEditModal({ item, onClose }: UserStlEditModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [name, setName] = useState(item.name);
  const [gridX, setGridX] = useState<string>(item.gridX != null ? String(item.gridX) : '');
  const [gridY, setGridY] = useState<string>(item.gridY != null ? String(item.gridY) : '');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { mutateAsync: update, isPending: isSaving } = useUpdateUserStlMutation();
  const { mutateAsync: remove, isPending: isDeleting } = useDeleteUserStlMutation();
  const { mutateAsync: reprocess, isPending: isReprocessing } = useReprocessUserStlMutation();
  const { mutateAsync: replaceFile, isPending: isReplacing } = useReplaceUserStlFileMutation();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await update({
        id: item.id,
        name: name.trim() || undefined,
        gridX: gridX ? Number(gridX) : null,
        gridY: gridY ? Number(gridY) : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    }
  };

  const handleDelete = async () => {
    try {
      await remove(item.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleReprocess = async () => {
    setError(null);
    try {
      await reprocess(item.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reprocess failed.');
    }
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      await replaceFile({ id: item.id, file });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Replace failed.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Model</h2>
        <form onSubmit={(e) => void handleSave(e)}>
          <div className="form-field">
            <label htmlFor="edit-name">Name</label>
            <input id="edit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="edit-gridx">Grid X</label>
            <input id="edit-gridx" type="number" min="1" value={gridX} onChange={(e) => setGridX(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="edit-gridy">Grid Y</label>
            <input id="edit-gridy" type="number" min="1" value={gridY} onChange={(e) => setGridY(e.target.value)} />
          </div>

          {error && <div role="alert" className="upload-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>

        <div className="modal-secondary-actions">
          <label className="replace-file-btn">
            {isReplacing ? 'Replacing…' : 'Replace file'}
            <input type="file" accept=".stl,.3mf" onChange={(e) => void handleReplaceFile(e)} style={{ display: 'none' }} />
          </label>

          {isAdmin && (
            <button type="button" onClick={() => void handleReprocess()} disabled={isReprocessing}>
              {isReprocessing ? 'Reprocessing…' : 'Reprocess'}
            </button>
          )}

          {!confirmDelete ? (
            <button type="button" className="delete-btn" onClick={() => setConfirmDelete(true)}>Delete</button>
          ) : (
            <span>
              Are you sure?{' '}
              <button type="button" onClick={() => void handleDelete()} disabled={isDeleting}>Yes, delete</button>
              <button type="button" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write basic tests for UserStlEditModal**
```typescript
// packages/app/src/components/UserStlEditModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserStlEditModal } from './UserStlEditModal.js';

const mockItem = {
  id: '1', name: 'My Bin', gridX: 2, gridY: 1, status: 'ready' as const,
  imageUrl: null, perspImageUrls: [], errorMessage: null, createdAt: '',
};

vi.mock('../contexts/AuthContext.js', () => ({
  useAuth: () => ({ user: { role: 'user' }, getAccessToken: () => 'tok', isAuthenticated: true }),
}));

const mockUpdate = vi.fn().mockResolvedValue(mockItem);
vi.mock('../hooks/useUserStls.js', () => ({
  useUpdateUserStlMutation: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteUserStlMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReprocessUserStlMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReplaceUserStlFileMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('UserStlEditModal', () => {
  it('pre-fills name and grid values', () => {
    render(<UserStlEditModal item={mockItem} onClose={vi.fn()} />, { wrapper });
    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('My Bin');
    expect((screen.getByLabelText(/grid x/i) as HTMLInputElement).value).toBe('2');
  });

  it('calls update and closes on save', async () => {
    const onClose = vi.fn();
    render(<UserStlEditModal item={mockItem} onClose={onClose} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('does not show Reprocess button for non-admin users', () => {
    render(<UserStlEditModal item={mockItem} onClose={vi.fn()} />, { wrapper });
    expect(screen.queryByRole('button', { name: /reprocess/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run all new component tests**
```bash
npx vitest run packages/app/src/components/UserStlUploadModal.test.tsx packages/app/src/components/UserStlEditModal.test.tsx
```
Expected: all passing.

- [ ] **Step 8: Commit**
```bash
git add packages/app/src/components/UserStlUploadModal.tsx packages/app/src/components/UserStlUploadModal.test.tsx packages/app/src/components/UserStlEditModal.tsx packages/app/src/components/UserStlEditModal.test.tsx
git commit -m "feat(user-stl): add UserStlUploadModal and UserStlEditModal components"
```

---

### Task 16: UserStlLibrarySection + useLibraryData integration + App.tsx

**Files:**
- Create: `packages/app/src/components/UserStlLibrarySection.tsx`
- Create: `packages/app/src/components/UserStlLibrarySection.test.tsx`
- Modify: `packages/app/src/hooks/useLibraryData.ts`
- Modify: `packages/app/src/App.tsx`

- [ ] **Step 1: Write failing tests for UserStlLibrarySection**

Use a controllable mock so the empty-state test can swap data without `require()`:

```typescript
// packages/app/src/components/UserStlLibrarySection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserStlLibrarySection } from './UserStlLibrarySection.js';

vi.mock('../contexts/AuthContext.js', () => ({
  useAuth: () => ({ getAccessToken: () => 'tok', isAuthenticated: true }),
}));

// Mutable reference so individual tests can override data
let mockData = [
  { id: '1', name: 'Pending Item', status: 'pending', gridX: null, gridY: null,
    imageUrl: null, perspImageUrls: [], errorMessage: null, createdAt: '' },
  { id: '2', name: 'Ready Item', status: 'ready', gridX: 2, gridY: 1,
    imageUrl: 'img.png', perspImageUrls: [], errorMessage: null, createdAt: '' },
  { id: '3', name: 'Error Item', status: 'error', gridX: null, gridY: null,
    imageUrl: null, perspImageUrls: [], errorMessage: 'Parse failed', createdAt: '' },
];

vi.mock('../hooks/useUserStls.js', () => ({
  useUserStlsQuery: () => ({ data: mockData, isLoading: false }),
  useDeleteUserStlMutation: () => ({ mutate: vi.fn() }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('UserStlLibrarySection', () => {
  it('shows pending spinner for pending items', () => {
    render(<UserStlLibrarySection />, { wrapper });
    expect(screen.getByText('Pending Item')).toBeInTheDocument();
    expect(screen.getByTitle(/processing/i)).toBeInTheDocument();
  });

  it('makes ready items draggable', () => {
    render(<UserStlLibrarySection />, { wrapper });
    const readyItem = screen.getByText('Ready Item').closest('[draggable]');
    expect(readyItem).toHaveAttribute('draggable', 'true');
  });

  it('shows error badge with message for error items', () => {
    render(<UserStlLibrarySection />, { wrapper });
    expect(screen.getByTitle('Parse failed')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    mockData = [];
    render(<UserStlLibrarySection />, { wrapper });
    expect(screen.getByText(/no models yet/i)).toBeInTheDocument();
    // Restore for subsequent tests
    mockData = [
      { id: '1', name: 'Pending Item', status: 'pending', gridX: null, gridY: null,
        imageUrl: null, perspImageUrls: [], errorMessage: null, createdAt: '' },
    ];
  });

  it('opens upload modal when Upload model is clicked', () => {
    render(<UserStlLibrarySection />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /upload model/i }));
    expect(screen.getByRole('heading', { name: /upload model/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Create `packages/app/src/components/UserStlLibrarySection.tsx`**
```tsx
import { useState } from 'react';
import type { ApiUserStl } from '@gridfinity/shared';
import { useUserStlsQuery } from '../hooks/useUserStls';
import { UserStlUploadModal } from './UserStlUploadModal';
import { UserStlEditModal } from './UserStlEditModal';
import { getUserStlImageUrl } from '../api/userStls.api';

export function UserStlLibrarySection() {
  const { data: items = [], isLoading } = useUserStlsQuery();
  const [showUpload, setShowUpload] = useState(false);
  const [editItem, setEditItem] = useState<ApiUserStl | null>(null);

  if (isLoading) return <div className="library-loading">Loading…</div>;

  return (
    <div className="user-stl-library-section">
      <div className="library-section-header">
        <span>My Models</span>
        <button className="upload-model-btn" onClick={() => setShowUpload(true)}>
          Upload model
        </button>
      </div>

      {items.length === 0 && (
        <div className="library-empty-state">No models yet — upload your first one</div>
      )}

      {items.map((item) => (
        <UserStlItem key={item.id} item={item} onEdit={() => setEditItem(item)} />
      ))}

      {showUpload && <UserStlUploadModal onClose={() => setShowUpload(false)} />}
      {editItem && <UserStlEditModal item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  );
}

interface UserStlItemProps {
  item: ApiUserStl;
  onEdit: () => void;
}

function UserStlItem({ item, onEdit }: UserStlItemProps) {
  const isReady = item.status === 'ready';
  const isActive = item.status === 'pending' || item.status === 'processing';

  const dragData = JSON.stringify({ type: 'library', itemId: `user-stl:${item.id}` });

  return (
    <div
      className={`user-stl-item${isReady ? ' user-stl-item--ready' : ''}`}
      draggable={isReady}
      onDragStart={(e) => {
        if (!isReady) return;
        e.dataTransfer.setData('application/json', dragData);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      {item.imageUrl && isReady && (
        <img
          className="user-stl-thumb"
          src={getUserStlImageUrl(item.id, item.imageUrl)}
          alt={item.name}
        />
      )}
      <span className="user-stl-name">{item.name}</span>

      {isActive && (
        <span className="user-stl-badge" title="Processing…" aria-label="Processing">⏳</span>
      )}
      {item.status === 'error' && (
        <span
          className="user-stl-badge user-stl-badge--error"
          title={item.errorMessage ?? 'Processing failed'}
          aria-label="Error"
        >⚠</span>
      )}

      <button className="user-stl-edit-btn" onClick={onEdit} aria-label={`Edit ${item.name}`}>✎</button>
    </div>
  );
}
```

- [ ] **Step 4: Update `packages/app/src/hooks/useLibraryData.ts`** — add user STL integration

After the existing `useQueries` block, add:
```typescript
import { useUserStlsQuery } from './useUserStls';
import { getUserStlImageUrl } from '../api/userStls.api';
import type { ApiUserStl } from '@gridfinity/shared';

function userStlToLibraryItem(item: ApiUserStl): LibraryItem {
  return {
    id: `user-stl:${item.id}`,
    name: item.name,
    widthUnits: item.gridX ?? 1,
    heightUnits: item.gridY ?? 1,
    color: '#F97316',
    categories: ['user-upload'],
    imageUrl: item.imageUrl ? getUserStlImageUrl(item.id, item.imageUrl) : undefined,
    perspectiveImageUrl: item.perspImageUrls[0]
      ? getUserStlImageUrl(item.id, item.perspImageUrls[0])
      : undefined,
  };
}
```

In the `useLibraryData` function body, after the `useQueries` block:
```typescript
const { data: userStls = [] } = useUserStlsQuery();
const userStlItems = useMemo(
  () => userStls.filter((s) => s.status === 'ready').map(userStlToLibraryItem),
  [userStls]
);

const items = useMemo(() => {
  return [...queries.flatMap((q) => q.data ?? []), ...userStlItems];
}, [queries, userStlItems]);
```

- [ ] **Step 5: Update `packages/app/src/App.tsx`**

Add import:
```typescript
import { UserStlLibrarySection } from './components/UserStlLibrarySection';
```

Replace `{isAuthenticated && <ShadowboxLibrarySection />}` with:
```tsx
{isAuthenticated && <UserStlLibrarySection />}
```

Remove the `pathname` routing block for shadowbox pages (the `if (pathname === '/shadowbox/new' || ...)` block) — these routes no longer exist. Remove the `pathname` state and `popstate` listener if they're no longer needed for anything else. If App.tsx still needs reactive pathname for other reasons, keep it.

- [ ] **Step 6: Run UserStlLibrarySection tests**
```bash
npx vitest run packages/app/src/components/UserStlLibrarySection.test.tsx
```

- [ ] **Step 7: Run full test suite**
```bash
npm run test:run
```
Expected: all passing.

- [ ] **Step 8: Commit**
```bash
git add -A
git commit -m "feat(user-stl): add UserStlLibrarySection, integrate into useLibraryData and App.tsx"
```

---

## Phase 6 — Admin Panel

### Task 17: Add "User Models" tab to AdminSubmissionsDialog

**Files:**
- Modify: `packages/app/src/components/admin/AdminSubmissionsDialog.tsx`
- Modify: `packages/app/src/components/admin/AdminSubmissionsDialog.test.tsx`

- [ ] **Step 1: Read current AdminSubmissionsDialog** to understand tab structure before modifying.

- [ ] **Step 2: Add admin API hook**

In `useUserStls.ts`, add:
```typescript
import { fetchAdminUserStls, promoteUserStl } from '../api/userStls.api';

export const ADMIN_USER_STLS_QUERY_KEY = ['admin-user-stls'] as const;

export function useAdminUserStlsQuery() {
  const { getAccessToken } = useAuth();
  return useQuery({
    queryKey: ADMIN_USER_STLS_QUERY_KEY,
    queryFn: () => {
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return fetchAdminUserStls(token);
    },
  });
}

export function usePromoteUserStlMutation() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const token = getAccessToken();
      if (!token) throw new Error('Not authenticated');
      return promoteUserStl(id, token);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ADMIN_USER_STLS_QUERY_KEY }); },
  });
}
```

- [ ] **Step 3: Add "User Models" tab to AdminSubmissionsDialog**

Read the file first. Then add a new tab panel after the existing layouts tab. The tab should show a table with columns: username, filename, name, grid dimensions, status, updatedAt. Per-row actions: Reprocess, Edit (opens UserStlEditModal), Download (links to `GET /:id/file`), Delete, Promote (only on ready items).

Follow the exact tab pattern already in `AdminSubmissionsDialog.tsx`.

- [ ] **Step 4: Run tests**
```bash
npx vitest run packages/app/src/components/admin/AdminSubmissionsDialog.test.tsx
```
Fix any failures (add mocks for new hooks used).

- [ ] **Step 5: Run full test suite**
```bash
npm run test:run
```

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat(user-stl): add User Models tab to AdminSubmissionsDialog"
```

---

## Phase 7 — E2E Tests + Final Verification

### Task 18: E2E tests

**Files:**
- Create: `e2e/tests/user-stl-upload.spec.ts`
- Create: `e2e/pages/UserStlPage.ts` (page object)

- [ ] **Step 1: Read existing E2E test structure** — look at one spec file and page object to understand patterns.

- [ ] **Step 2: Create page object `e2e/pages/UserStlPage.ts`**
```typescript
import type { Page } from '@playwright/test';

export class UserStlPage {
  constructor(private readonly page: Page) {}

  get uploadButton() { return this.page.getByRole('button', { name: /upload model/i }); }
  get fileInput() { return this.page.locator('input[type="file"][accept*=".stl"]'); }
  get nameInput() { return this.page.getByLabel(/name/i); }
  get submitButton() { return this.page.getByRole('button', { name: /^upload$/i }); }
  get errorAlert() { return this.page.getByRole('alert'); }

  async openUploadModal() { await this.uploadButton.click(); }

  async uploadFile(filePath: string, name: string) {
    await this.fileInput.setInputFiles(filePath);
    await this.nameInput.clear();
    await this.nameInput.fill(name);
    await this.submitButton.click();
  }

  itemByName(name: string) { return this.page.getByText(name); }
  processingBadge() { return this.page.getByLabel('Processing'); }
}
```

- [ ] **Step 3: Create `e2e/tests/user-stl-upload.spec.ts`**

Note: E2E tests require a running server and real Python environment. Mark processing-dependent tests with appropriate waits.

```typescript
import { test, expect } from '@playwright/test';
import { UserStlPage } from '../pages/UserStlPage';
import path from 'path';

const TEST_STL = path.resolve('tools/gridfinity-generator/bin_2x3x4_solid.stl');

test.describe('User STL upload', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as test user — follow existing auth pattern in e2e tests
    await page.goto('/');
    // ... login flow
  });

  test('upload modal validates file extension client-side', async ({ page }) => {
    const stlPage = new UserStlPage(page);
    await stlPage.openUploadModal();
    // Try uploading a non-STL file
    await page.locator('input[type="file"]').setInputFiles({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake'),
    });
    await stlPage.submitButton.click();
    await expect(stlPage.errorAlert).toContainText(/stl|3mf/i);
  });

  test('uploading an STL closes modal and shows processing item', async ({ page }) => {
    const stlPage = new UserStlPage(page);
    await stlPage.openUploadModal();
    await stlPage.uploadFile(TEST_STL, 'My Test Bin');
    // Modal closes — no heading visible
    await expect(page.getByRole('heading', { name: /upload model/i })).not.toBeVisible();
    // Item appears in library with processing indicator
    await expect(stlPage.itemByName('My Test Bin')).toBeVisible();
  });
});
```

- [ ] **Step 4: Run E2E tests** (requires dev server + Python environment)
```bash
npm run test:e2e -- --grep "user-stl"
```

- [ ] **Step 5: Run full test suite**
```bash
npm run test:run
npm run lint
```

- [ ] **Step 6: Final commit**
```bash
git add -A
git commit -m "feat(user-stl): add E2E tests for upload flow"
```

---

## Completion Checklist

- [ ] All shadowbox code removed (frontend, backend, sidecar)
- [ ] `ApiShadowbox` and `shadowboxId` removed from shared types
- [ ] Python scripts in `packages/server/scripts/py/` with requirements.txt
- [ ] `user_stl_uploads` table created via migration
- [ ] `maxUserStls` added to `user_storage` table
- [ ] `config.ts` has `USER_STL_DIR`, `USER_STL_IMAGE_DIR`, `MAX_STL_WORKERS`, `PYTHON_SCRIPT_DIR`
- [ ] `ApiUserStl` and `ApiUserStlAdmin` in shared types
- [ ] `userStls.service.ts` with CRUD + quota check
- [ ] `stlQueue.service.ts` semaphore (all tests pass)
- [ ] `stlProcessing.service.ts` (all tests pass)
- [ ] User STL routes + controller (all endpoints)
- [ ] Admin STL routes + controller (list + promote)
- [ ] Routes registered in `app.ts`
- [ ] Directory creation + startup recovery in `index.ts`
- [ ] `userStls.api.ts` frontend client
- [ ] `useUserStls.ts` hooks with polling
- [ ] `UserStlUploadModal` (tests pass)
- [ ] `UserStlEditModal` (tests pass)
- [ ] `UserStlLibrarySection` (tests pass)
- [ ] `useLibraryData.ts` integrates user STLs with `user-stl:` prefix
- [ ] `App.tsx` renders `UserStlLibrarySection` for authenticated users
- [ ] Admin "User Models" tab in `AdminSubmissionsDialog`
- [ ] E2E tests for upload modal and upload flow
- [ ] `npm run test:run` passes
- [ ] `npm run lint` passes
