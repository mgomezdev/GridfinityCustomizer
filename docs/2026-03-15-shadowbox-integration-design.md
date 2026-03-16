# Design: Shadowbox Integration

**Date:** 2026-03-15
**Status:** Approved

## Problem

Users want to store custom-shaped items (e.g. tools, objects) in Gridfinity bins that perfectly match their silhouette. The existing `shadowbox-generator` Python tool (sibling repo `3d-modeling`) produces STL files from photos, but has no integration with the Gridfinity Customizer web app. Admins need to be able to download the generated STL to send to a slicer.

## Scope

- Logged-in users can create shadowbox bins from photos
- Shadowboxes appear as a private library section in the existing sidebar
- Admins can browse and download any user's STL by UUID
- BOM references shadowboxes via a stable UUID (avoids cross-user naming collisions)
- Deployed via Docker Compose (sidecar container pattern)
- Out of scope: user-facing STL download (admin-only), public/shared shadowboxes, re-generation of a completed shadowbox, batch admin operations, admin pagination (MVP: all shadowboxes returned), request queuing or concurrency limiting for the sidecar

## Architecture

### New containers

A **shadowbox sidecar** container runs the Python image-processing and OpenSCAD generation as a stateless HTTP API. Express calls it over the internal Docker network; it is never exposed externally.

```
Browser → Express backend → Sidecar (Python/Flask)
                ↓
         SQLite (LibSQL)       Docker volume
         shadowboxes table     data/shadowboxes/<userId>/<uuid>.stl
```

### Database changes

New table **`shadowboxes`**:

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID PK | no | stable identifier used in BOM |
| `userId` | FK → users | no | owner |
| `name` | text | no | 1–64 chars, unique per user |
| `thicknessMm` | real | no | ≥ 4; set at insert time from upload form |
| `svgPath` | text | yes | null until `/:id/generate` is called; stores the **client-edited** SVG path (not the original sidecar output) |
| `rotationDeg` | real | yes | null until `/:id/generate` is called |
| `toleranceMm` | real | yes | null until `/:id/generate` is called |
| `stackable` | boolean | yes | null until `/:id/generate` is called |
| `stlPath` | text | yes | null until `status` is `"ready"` |
| `status` | text | no | `"pending"` \| `"ready"` \| `"error"` |
| `createdAt` | datetime | no | |

Note: `widthMm`, `heightMm`, and `scaleMmPerPx` from `process-image` are **not stored in the DB** — they are display-only values used by the SVG editor. They are written to `sessionStorage` and discarded when the editor closes.

**Status lifecycle:**
- Row inserted with `status: "pending"`, `stlPath: null`, generation params null — only after `process-image` returns successfully. A `process-image` timeout (504) means no row is inserted.
- When `/:id/generate` is called, generation params (`svgPath`, `rotationDeg`, `toleranceMm`, `stackable`) are written to the row and the sidecar is called **synchronously** — Express awaits the full sidecar response before replying to the client. The POST takes as long as the sidecar needs (up to 60 s). The client shows a loading state while the request is in-flight; no polling is needed.
- On success: `stlPath` set, `status` → `"ready"`.
- On failure: `status` → `"error"`, generation params retained.
- Calling `/:id/generate` on a `"ready"` row returns **409 Conflict** (re-generation out of scope). Calling it on an `"error"` row is allowed and retries.

**`name` validation:** 1–64 characters, unique per user (unique constraint on `(userId, name)`). Duplicate name → 409 "You already have a shadowbox named '…'". Deleting an `"error"` row frees up its name for reuse.

Change to **`placed_items`**: add nullable `shadowboxId` FK referencing `shadowboxes.id` with `ON DELETE SET NULL`.

A placed item is identified as a shadowbox by `shadowboxId IS NOT NULL`. Additionally, shadowbox placed items use the sentinel `libraryId = "shadowbox"` and `itemId = <shadowboxId UUID>` so the existing BOM and placement code can distinguish them without reading the FK column. `libraryId` in `placed_items` is a free-text column (no enum constraint) — the sentinel value works without a schema migration.

**`placed_items` delete behavior:** Deleting a shadowbox nulls `shadowboxId` on referencing `placed_items` rows. The placed item remains in the layout as an orphan (visually flagged; see React section). No blocking on delete — the user's DELETE button is always available in the UI regardless of whether the shadowbox is currently placed.

### STL storage

Files stored in the existing `gridfinity-data` Docker volume under `data/shadowboxes/<userId>/<uuid>.stl`.

## Generation Flow

1. User fills out upload form (photo, thickness, name) on `/shadowbox/new`
2. Express calls sidecar `POST /process-image`. On success, inserts a `shadowboxes` row with `status: "pending"` and returns `{id, svgPath, widthMm, heightMm, scaleMmPerPx}` to the client. (`thicknessMm` and `name` are not in the server response — client keeps them from the form.)
3. Client writes editor state to `sessionStorage["shadowbox-editor:<uuid>"]`: `{svgPath, widthMm, heightMm, scaleMmPerPx, thicknessMm, name}`
4. Client navigates to `/shadowbox/edit?id=<uuid>`
5. User adjusts silhouette in React SVG editor. `scaleMmPerPx` is used by the editor to display real-world dimensions alongside the silhouette preview.
6. User hits "Generate & Save" → client POSTs `{svgPath, rotationDeg, toleranceMm, stackable}` to `POST /api/v1/shadowboxes/:id/generate` → Express validates, calls sidecar `POST /generate`, writes STL bytes to volume, updates row to `status: "ready"`
7. Client clears `sessionStorage["shadowbox-editor:<uuid>"]`, navigates back to layout, invalidates `shadowboxes` query

## Sidecar API

**`POST /process-image`** — multipart: `image` (file) + `thickness_mm` (float)
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`
- Maximum file size: 10 MB (enforced by Express before proxying; returns 413 if exceeded)
- Returns `{svg_path, width_mm, height_mm, scale_mm_per_px}` (snake_case). `shadowboxSidecar.service.ts` is responsible for translating to camelCase before returning to the controller.
- SVG path contract: uppercase M/L/Z only, space-separated tokens, mm coordinates, centroid at (0, 0), no curves. Example: `"M 12.3 -8.1 L 15.0 -8.1 L 15.0 5.2 Z"`. The sidecar guarantees this format.
- The red reference square is a **fixed sidecar constant: 42 × 42 mm** (matches the Gridfinity unit size; not user-configurable).
- Errors: 400 if no red reference square detected, 400 if no silhouette found, 422 for unsupported image format
- Timeout: **60 seconds** (same as generate). Timeout → 504 to client; no DB row inserted.

**`POST /generate`** — JSON: `{svg_path, thickness_mm, rotation_deg, tolerance_mm, stackable}`
- Parameter ranges: `thickness_mm ≥ 4`, `rotation_deg` 0–359 (normalized), `tolerance_mm` 0.5–3.0
- `svg_path` is validated by Express before forwarding with regex `^[MLZ \d\.\-]+$` (uppercase commands, space-separated). This is a basic sanity check against tampered client input — it rejects obviously malformed strings. The sidecar is the authoritative validator for well-formedness. Requests failing the Express regex check get 400.
- The SVG editor (ported from `shadowbox-generator`) only moves control points and updates coordinates — it never reformats the path string structure. The editor always outputs space-separated uppercase tokens (same invariant as the sidecar output), so the format is preserved through editing.
- Returns raw STL bytes (`application/octet-stream`)
- Stateless — no files persisted by the sidecar
- Timeout: Express sets a **60-second** timeout; returns 504, row → `"error"`
- Errors: 400 for out-of-range params, 500 for OpenSCAD failure

### gridfinity-rebuilt-openscad library

The sidecar packages `gridfinity-rebuilt-openscad` (https://github.com/kennetek/gridfinity-rebuilt-openscad) at the same Git commit as the sibling `3d-modeling` repo. Dockerfile should copy or clone the library at a pinned commit SHA. Keep in sync with `3d-modeling/gridfinity-rebuilt-openscad`.

### Sidecar Dockerfile (outline)

Base image: `python:3.12-slim`. Install steps:
1. Install OpenSCAD via `apt-get` (or download the AppImage used in `3d-modeling` if the apt version is too old — check the `3d-modeling` README for the required version)
2. Install Python dependencies: Flask, opencv-python, numpy (match `3d-modeling/requirements.txt`)
3. Copy `gridfinity-rebuilt-openscad` library into image
4. Copy the Flask service code
5. Expose port 5000; entrypoint: `flask run --host=0.0.0.0 --port=5000`

The Flask service is a new file (`shadowbox-sidecar/app.py`). It copies `lib/image_processor.py` and `lib/scad_generator.py` verbatim from the sibling `3d-modeling` repo (or mounts them via a shared volume in dev). Key interfaces used:
- `image_processor.process_image(image_path, thickness_mm) → {svg_path, width_mm, height_mm, scale_mm_per_px}` — raises `ValueError` for detection failures
- `scad_generator.generate_scad(svg_path, rotation_deg, tolerance_mm, thickness_mm, stackable, output_path, lib_base)` — writes `.scad` file; raises on parse/size error
- OpenSCAD is then invoked to render the `.scad` to `.stl`, bytes read and returned

## Express Routes

### Auth middleware

`requireAuth` is in `server/src/middleware/auth.ts`. `requireAdmin` is in `server/src/middleware/admin.ts`. Both are already used by existing routes.

### User routes (`requireAuth`)

**Important:** register `POST /api/v1/shadowboxes/process-image` *before* `POST /api/v1/shadowboxes/:id/generate` in the router to prevent Express matching `"process-image"` as an `:id` param.

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/shadowboxes/process-image` | Call sidecar process-image; insert pending row; return `{id, svgPath, widthMm, heightMm, scaleMmPerPx}` |
| POST | `/api/v1/shadowboxes/:id/generate` | Validate body; call sidecar generate; write STL; update row to ready |
| GET | `/api/v1/shadowboxes` | List user's own shadowboxes |
| DELETE | `/api/v1/shadowboxes/:id` | Delete (ownership-checked) |

**`POST /api/v1/shadowboxes/:id/generate` request body:**
```ts
{
  svgPath: string;       // client-edited path; validated ^[MLZ \d\.\-]+$
  rotationDeg: number;   // 0–359
  toleranceMm: number;   // 0.5–3.0
  stackable: boolean;
}
```
`thicknessMm` is **not** in the request body — Express reads it from the DB row (`shadowboxes.thicknessMm`) and includes it when calling the sidecar. The client does not need to re-send it.

Returns `{id, status: "ready"}` on success.

**`GET /api/v1/shadowboxes` response shape** (array of):
```ts
{
  id: string;
  name: string;
  status: "pending" | "ready" | "error";
  thicknessMm: number;
  stackable: boolean | null;   // null while pending
  createdAt: string;           // ISO 8601
}
```

**`DELETE /api/v1/shadowboxes/:id`** — delete order: (1) delete DB row, (2) if `stlPath` is non-null, delete STL file from volume. If `stlPath` is null (pending or error row), skip the file delete. If file delete fails, log a warning but return 200 — a stale file on the volume is acceptable; a missing DB row with an orphaned file is preferable to a failed delete that leaves a dangling reference.

### Admin routes (`requireAuth + requireAdmin`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/admin/shadowboxes` | All users' shadowboxes (no pagination at MVP) |
| GET | `/api/v1/admin/shadowboxes/:id/stl` | Stream STL file by UUID |

**`GET /api/v1/admin/shadowboxes` response shape** (array of):
```ts
{
  id: string;
  name: string;
  status: "pending" | "ready" | "error";
  thicknessMm: number;
  stackable: boolean | null;
  createdAt: string;
  userId: string;
  userName: string;    // `users.username` column (unique, not email)
}
```

**`GET /api/v1/admin/shadowboxes/:id/stl`** — streams the STL file. `Content-Disposition: attachment; filename="<name>.stl"`. Returns 404 if no row found or `status !== "ready"`.

### BOM integration

No new BOM routes are needed. The existing BOM export reads `placed_items`. The BOM output row for a placed shadowbox should include `shadowboxId` alongside the standard placed-item fields (itemId, quantity, etc.) so admins can cross-reference the UUID with the admin STL download endpoint. The change is in the existing BOM formatting logic — add `shadowboxId` to the output when the placed item has one.

## React Pages & Components

**`ShadowboxUploadPage`** (`/shadowbox/new`, protected route)
- Photo file input (accept: `image/jpeg,image/png,image/webp`; 10 MB limit enforced client-side before upload with clear error)
- Thickness slider (4–20 mm, default 8 mm)
- Name field (1–64 chars, required)
- On submit: `POST /api/v1/shadowboxes/process-image`
- On success: write editor state to `sessionStorage["shadowbox-editor:<uuid>"]`; navigate to `/shadowbox/edit?id=<uuid>`

**`ShadowboxEditorPage`** (`/shadowbox/edit?id=<uuid>`, protected route)
- On mount: read `id` from query string; load state from `sessionStorage["shadowbox-editor:<id>"]`
- If key not found: redirect to `/shadowbox/new` with toast "Session expired — please upload your photo again"
- SVG editor (ported from `shadowbox-generator`): draggable control points, free rotation handle (0–359°), tolerance slider (0.5–3.0 mm, step 0.25, default 1.5), stackable toggle, best-fit hint, real-world dimension display using `scaleMmPerPx`
- On "Generate & Save": `POST /api/v1/shadowboxes/:id/generate` with `{svgPath, rotationDeg, toleranceMm, stackable}`
- On success: delete `sessionStorage["shadowbox-editor:<id>"]`, navigate back to layout, invalidate `shadowboxes` query
- On failure: retain `sessionStorage["shadowbox-editor:<id>"]` so the user can fix parameters and retry without re-uploading

**`ShadowboxLibrarySection`** (added to existing library sidebar; only rendered when `isAuthenticated`)
- Fetches via TanStack Query → `GET /api/v1/shadowboxes`
- `"ready"` items: draggable (existing drag interface); dropping sets `placed_items.shadowboxId`
- `"pending"` items: show spinner, not draggable
- `"error"` items: show red error indicator + inline delete button, not draggable
- "+" link → `/shadowbox/new`
- Per-item context menu delete for `"ready"` items

**Orphaned placed item display:** The grid placed-item renderer checks if a placed item has type `"shadowbox"` with a null `shadowboxId`. If so, it renders a yellow warning overlay on that cell. This is a conditional in the existing placed-item renderer — no new component required.

## Docker Compose Changes

```yaml
shadowbox-sidecar:
  build: ./shadowbox-sidecar
  restart: unless-stopped
  environment:
    - OPENSCAD_PATH=/usr/bin/openscad
  networks:
    - internal

backend:
  environment:
    - SHADOWBOX_SIDECAR_URL=http://shadowbox-sidecar:5000  # new
```

Sidecar is stateless and not exposed on any external port.

## Database Migrations

Drizzle ORM with LibSQL; migrations run automatically on backend startup. Two additive migrations:

1. **Create `shadowboxes` table** — new `server/src/db/schema/shadowboxes.ts`; run `npx drizzle-kit generate`, commit SQL to `server/src/db/migrations/`
2. **Add `shadowboxId` to `placed_items`** — update `server/src/db/schema/placedItems.ts`; generate second migration the same way

Migrations must be generated and committed **in order**: migration 1 (create `shadowboxes`) first, then migration 2 (add FK to `placed_items`). Drizzle orders migrations by filename timestamp — generate each separately and commit before generating the next. The FK migration will fail at runtime if `shadowboxes` does not exist.

## New Files

**Server:**
- `server/src/controllers/shadowboxes.controller.ts`
- `server/src/controllers/adminShadowboxes.controller.ts`
- `server/src/routes/shadowboxes.routes.ts`
- `server/src/routes/adminShadowboxes.routes.ts`
- `server/src/services/shadowboxSidecar.service.ts`
- `server/src/db/schema/shadowboxes.ts`
- `shadowbox-sidecar/` — Dockerfile + `app.py` wrapping sidecar logic

**Frontend:**
- `src/pages/ShadowboxUploadPage.tsx`
- `src/pages/ShadowboxEditorPage.tsx`
- `src/components/ShadowboxLibrarySection.tsx`
- `src/api/shadowboxes.api.ts`

**Modified:**
- `server/src/db/schema/index.ts` — export new table
- `server/src/db/schema/placedItems.ts` — add `shadowboxId` nullable FK with `ON DELETE SET NULL`
- `server/src/routes/index.ts` — mount new routers (process-image route registered before `:id` routes)
- `src/components/LibrarySidebar.tsx` (or equivalent) — add `ShadowboxLibrarySection`
- `src/App.tsx` (or router file) — add new protected routes
- `docker-compose.yml` — add sidecar service + env var on backend
- Grid placed-item renderer — add orphaned shadowbox warning overlay
- BOM formatter — include `shadowboxId` in shadowbox placed-item rows

## Error Handling

| Scenario | HTTP | User message |
|---|---|---|
| Sidecar unreachable | 503 | "Shadowbox service unavailable, please try again" |
| Sidecar timeout (> 60 s) | 504 | "Processing timed out, please try again" |
| No red square | 400 | "Could not detect the red reference square — place a 42 × 42 mm red square next to the item before photographing" |
| No silhouette | 400 | "Could not extract a silhouette — ensure the item contrasts with the background" |
| Unsupported image format | 422 | "Unsupported image format — use JPEG, PNG, or WebP" |
| File too large | 413 | "Image must be under 10 MB" |
| Duplicate name | 409 | "You already have a shadowbox named '…'" |
| Generate on `"ready"` row | 409 | — (should not be reachable from UI) |
| OpenSCAD failure | 500 | "Generation failed, please try again" (row → `"error"`) |
| Admin STL not found / not ready | 404 | — |
| Editor session expired | redirect | Toast: "Session expired — please upload your photo again" |

## Testing

- Unit tests for `shadowboxSidecar.service.ts`: mock HTTP calls, timeout behavior (60 s), 503 on unreachable
- Unit tests for shadowboxes controller: ownership check on DELETE, 409 on re-generate of ready row, retry allowed on error row, name uniqueness 409, pending row creation only on sidecar success
- Unit tests for `ShadowboxLibrarySection`: ready items draggable, pending not draggable (spinner shown), error not draggable (delete button shown)
- Unit test for grid placed-item renderer: item with type `"shadowbox"` + null `shadowboxId` renders warning overlay
- E2E test: upload photo → adjust editor → generate → verify item appears in sidebar as ready, is draggable
- E2E test: admin views shadowbox list, downloads STL by UUID
- E2E test: delete a placed shadowbox → layout item shows warning overlay, is not removed
