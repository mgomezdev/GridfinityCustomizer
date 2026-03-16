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
- Out of scope: public/shared shadowboxes, re-generation from stored SVG after save, batch admin operations

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

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | stable identifier used in BOM |
| `userId` | FK → users | owner |
| `name` | text | user-supplied |
| `thicknessMm` | real | ≥ 4 |
| `svgPath` | text | absolute M/L/Z path, mm coords, centroid at origin |
| `rotationDeg` | real | applied during generation |
| `toleranceMm` | real | cavity expansion |
| `stackable` | boolean | |
| `stlPath` | text | path within Docker volume |
| `status` | text | `"ready"` \| `"error"` |
| `createdAt` | datetime | |

Change to **`placed_items`**: add nullable `shadowboxId` FK column referencing `shadowboxes.id`.

### STL storage

Files stored in the existing `gridfinity-data` Docker volume under `data/shadowboxes/<userId>/<uuid>.stl` — same volume used for reference images.

## Generation Flow

1. User uploads photo + thickness on `/shadowbox/new`
2. Express proxies to sidecar `POST /process-image` → returns SVG path + dimensions
3. User adjusts silhouette in React SVG editor (`/shadowbox/edit`)
4. User hits "Generate & Save" → Express calls sidecar `POST /generate` → streams STL bytes back → writes to volume → inserts `shadowboxes` row
5. New shadowbox appears in sidebar; user can drag it into a layout

## Sidecar API

**`POST /process-image`** — multipart: `image` (file) + `thickness_mm` (float)
- Returns `{svg_path, width_mm, height_mm, scale_mm_per_px}`
- SVG path: absolute M/L/Z only, mm coordinates, centroid at (0, 0), no curves
- Errors: 400 if no red reference square detected, 400 if no silhouette found

**`POST /generate`** — JSON: `{svg_path, thickness_mm, rotation_deg, tolerance_mm, stackable}`
- Returns raw STL bytes (`application/octet-stream`)
- Stateless — no files persisted by the sidecar
- Errors: 400 for invalid svg_path or thickness_mm < 4, 500 for OpenSCAD failure

## Express Routes

### User routes (`requireAuth`)

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/shadowboxes/process-image` | Proxy to sidecar process-image |
| POST | `/api/v1/shadowboxes` | Generate + save shadowbox |
| GET | `/api/v1/shadowboxes` | List user's own shadowboxes |
| DELETE | `/api/v1/shadowboxes/:id` | Delete (ownership-checked) |

### Admin routes (`requireAuth + requireAdmin`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/admin/shadowboxes` | All users' shadowboxes (with userName) |
| GET | `/api/v1/admin/shadowboxes/:id/stl` | Stream STL file by UUID |

The STL download endpoint is how admins get the file for slicing. The BOM records `shadowboxId` UUID; admin looks it up via this endpoint.

## React Pages & Components

**`ShadowboxUploadPage`** (`/shadowbox/new`, protected route)
- Photo file input, thickness slider (4–20 mm), name field
- On submit: `POST /api/v1/shadowboxes/process-image`
- On success: navigate to editor, pass `{svgPath, widthMm, heightMm, thicknessMm, name}` via route state

**`ShadowboxEditorPage`** (`/shadowbox/edit`, protected route)
- SVG editor ported from `shadowbox-generator` editor (draggable control points, free rotation handle, tolerance slider, stackable toggle, best-fit hint)
- On "Generate & Save": `POST /api/v1/shadowboxes`
- On success: navigate back to layout, invalidate `shadowboxes` query

**`ShadowboxLibrarySection`** (added to existing library sidebar)
- Only rendered when `isAuthenticated`
- Fetches via TanStack Query → `GET /api/v1/shadowboxes`
- Items draggable using existing drag interface; dropping sets `placed_items.shadowboxId`
- "+" link navigates to `/shadowbox/new`
- Per-item delete via context menu

## Docker Compose Changes

New service in `docker-compose.yml`:

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

The sidecar image packages: Python 3.12, Flask, OpenCV, OpenSCAD, and the `gridfinity-rebuilt-openscad` library. It is stateless and not exposed on any external port.

## New Files

**Server:**
- `server/src/controllers/shadowboxes.controller.ts`
- `server/src/controllers/adminShadowboxes.controller.ts`
- `server/src/routes/shadowboxes.routes.ts`
- `server/src/routes/adminShadowboxes.routes.ts`
- `server/src/services/shadowboxSidecar.service.ts`
- `server/src/db/schema/shadowboxes.ts`
- `shadowbox-sidecar/` — new Docker build context (Dockerfile + Python service)

**Frontend:**
- `src/pages/ShadowboxUploadPage.tsx`
- `src/pages/ShadowboxEditorPage.tsx`
- `src/components/ShadowboxLibrarySection.tsx`
- `src/api/shadowboxes.api.ts`

**Modified:**
- `server/src/db/schema/index.ts` — export new table
- `server/src/db/schema/placedItems.ts` — add `shadowboxId` nullable FK
- `server/src/routes/index.ts` — mount new routers
- `src/components/LibrarySidebar.tsx` (or equivalent) — add `ShadowboxLibrarySection`
- `src/App.tsx` (or router file) — add new protected routes
- `docker-compose.yml` — add sidecar service + env var on backend

## Error Handling

- Sidecar unreachable: Express returns 503 with user-friendly message
- No red square in photo: 400 with message "Could not detect the red reference square — ensure a 42×42 mm red square is visible in the photo"
- OpenSCAD failure: 500 logged server-side; user sees "Generation failed, please try again"
- STL file missing on admin download (volume issue): 404

## Testing

- Unit tests for `shadowboxSidecar.service.ts` (mock HTTP calls to sidecar)
- Unit tests for controllers (mock service layer)
- Unit tests for `ShadowboxLibrarySection` (mock query, verify items render + drag interface present)
- E2E test: upload photo → adjust editor → generate → verify item appears in sidebar
- E2E test: admin downloads STL by UUID
