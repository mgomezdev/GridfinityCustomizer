# User STL/3MF Upload — Design Spec
**Date:** 2026-03-21
**Status:** Approved

---

## Overview

Replace the shadowbox creation feature with a personal STL/3MF upload system. Logged-in users can upload their own Gridfinity models, which are processed server-side to detect grid dimensions and generate preview images. Items appear in a personal orange-colored library section. Admins can retrigger processing and promote items to the shared static library.

---

## What Gets Removed

All shadowbox functionality is deleted:

**Frontend:**
- `ShadowboxUploadPage.tsx`, `ShadowboxEditorPage.tsx`, `ShadowboxLibrarySection.tsx`
- `/shadowbox/new`, `/shadowbox/edit` routes in `App.tsx`
- `useShadowboxes.ts` hook
- `shadowboxes.api.ts` client
- `shadowboxPhotoStore.ts` utility
- `navigate.ts` utility (was only used for shadowbox routing)
- Shadowbox-related code in `useLibraryData.ts`, `useBillOfMaterials.ts`, `PlacedItemOverlay.tsx`

**Backend:**
- `shadowboxes.routes.ts`, `adminShadowboxes.routes.ts`
- `shadowboxes.controller.ts`, `adminShadowboxes.controller.ts`
- `shadowboxes.service.ts`
- `shadowboxes` DB table (migration to drop)

**Shared types:**
- `ApiShadowbox`, `ApiShadowboxAdmin`
- `shadowboxId` field on `BOMItem`

**Infrastructure:**
- `shadowbox-sidecar/` — entire directory removed

---

## Data Model

### New table: `user_stl_uploads`

```sql
id              TEXT  NOT NULL PRIMARY KEY   -- UUID
userId          INT   NOT NULL REFERENCES users(id)
name            TEXT  NOT NULL               -- display name, user-editable
originalFilename TEXT NOT NULL              -- original uploaded filename
filePath        TEXT  NOT NULL               -- absolute path to stored STL/3MF
imageUrl        TEXT                         -- orthographic preview (relative path)
perspImageUrls  TEXT                         -- JSON array: [0°, 90°, 180°, 270°] paths
gridX           INT                          -- auto-detected or user-corrected
gridY           INT                          -- auto-detected or user-corrected
status          TEXT  NOT NULL               -- 'pending' | 'processing' | 'ready' | 'error'
errorMessage    TEXT                         -- populated on error
createdAt       TEXT  NOT NULL               -- ISO timestamp
updatedAt       TEXT  NOT NULL               -- ISO timestamp
```

**File storage:**
- Uploaded files: `packages/server/data/user-stls/{userId}/{id}.{ext}`
- Preview images: `packages/server/data/user-stl-images/{userId}/{id}.png`, `{id}-p90.png`, `{id}-p180.png`, `{id}-p270.png`

### Shared types (`packages/shared/src/types.ts`)

```typescript
export interface ApiUserStl {
  id: string;
  name: string;
  gridX: number | null;
  gridY: number | null;
  imageUrl: string | null;
  perspImageUrls: string[];      // up to 4 rotation previews
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage: string | null;
  createdAt: string;
}

export interface ApiUserStlAdmin extends ApiUserStl {
  userId: number;
  userName: string;
  originalFilename: string;
}
```

**Color:** Always orange (`#F97316`). Not stored — hardcoded in `userStlToLibraryItem`.

---

## Processing Pipeline

### Python scripts: `packages/server/scripts/py/`

```
packages/server/scripts/py/
├── requirements.txt          # Python dependencies
├── process_stl.py            # CLI entry point — called by Node
└── lib/
    ├── detect_dimensions.py  # bounding box ÷ 42mm → gridX, gridY (STL + 3MF)
    └── render_previews.py    # STL/3MF → 1 ortho PNG + 4 perspective PNGs
```

**`process_stl.py` interface:**

```bash
python3 process_stl.py --input /path/to/file.stl --output-dir /path/to/images --id abc123
```

Outputs JSON to stdout on success:
```json
{
  "gridX": 2,
  "gridY": 1,
  "imageUrl": "abc123.png",
  "perspImageUrls": ["abc123-p0.png", "abc123-p90.png", "abc123-p180.png", "abc123-p270.png"]
}
```

Exits non-zero with error message on stderr on failure.

**`detect_dimensions.py`:**
Loads geometry via `numpy-stl` (STL) or `trimesh` (3MF), computes bounding box extents, applies `ceil(extent / 42.0)` for both X and Y. This is a geometry-based enhancement over the CLI tool's filename-based approach — works regardless of filename.

**`render_previews.py`:**
Adapted from `tools/library-builder/stl_to_png.py`. Renders:
- 1 orthographic (top-down) PNG
- 4 perspective PNGs at 0°, 90°, 180°, 270° Z-axis rotation

**`requirements.txt`:**
```
numpy-stl>=3.0.0
trimesh>=4.0.0
lxml>=4.9.0
matplotlib>=3.5.0
numpy>=1.21.0
pillow>=9.0.0
networkx>=3.0
```

### Node.js services

**`stlProcessing.service.ts`:**
Spawns `process_stl.py` as a child process, pipes stdout/stderr, parses JSON result, updates DB row to `ready` or `error`.

**`stlQueue.service.ts`:**
Simple in-memory semaphore. Configurable via `MAX_STL_WORKERS` env var (default: 2). Jobs beyond the concurrency limit wait in an in-memory array. On server startup, resets any rows stuck in `'processing'` back to `'pending'` and re-enqueues them.

```typescript
class StlQueue {
  private running = 0;
  private queue: Array<() => void> = [];
  enqueue(job: () => Promise<void>): void { ... }
}
```

### Container setup

Root-level `Dockerfile`:
```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv
COPY packages/server/scripts/py/requirements.txt /app/scripts/py/requirements.txt
RUN pip3 install --no-cache-dir -r /app/scripts/py/requirements.txt
# ... rest of Node app setup
```

`MAX_STL_WORKERS` documented in `.env.example`.

---

## API Endpoints

### User endpoints (`/api/v1/user-stls`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/` | user | Upload STL/3MF (multipart, 50MB limit). Creates `pending` row, enqueues processing. Returns `ApiUserStl`. |
| `GET` | `/` | user | List current user's uploads |
| `GET` | `/:id` | user | Get single upload |
| `PUT` | `/:id` | owner or admin | Edit name, gridX, gridY |
| `DELETE` | `/:id` | owner or admin | Delete record + files on disk |
| `PUT` | `/:id/file` | owner or admin | Replace STL/3MF file, resets to `pending`, re-enqueues |
| `POST` | `/:id/reprocess` | owner or admin | Retrigger image generation, resets to `pending` |

**Ownership check:** `if (req.user.id !== upload.userId && req.user.role !== 'admin') → 403`

**Accepted file types:** `.stl`, `.3mf`. MIME type checked by extension (browser MIME reporting for 3D files is inconsistent). File size limit: 50MB.

### Admin endpoints (`/api/v1/admin/user-stls`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all users' uploads (`ApiUserStlAdmin[]`) |
| `POST` | `/:id/promote` | Export item to `public/libraries/user-uploads/`, update `index.json` |

**Promote flow:**
1. Copy STL/3MF + all images to `public/libraries/user-uploads/`
2. Read (or create) `public/libraries/user-uploads/index.json`
3. Append item entry with name, widthUnits, heightUnits, imageUrl, perspImageUrls
4. Atomic write of `index.json`

---

## Frontend

### Removed
All shadowbox components, hooks, routes, and API client (listed in "What Gets Removed").

### Added

**`UserStlLibrarySection`** (sidebar, items tab, visible when authenticated):
Lists user's uploads. Status badges: spinner for `pending`/`processing`, warning for `error`, draggable card for `ready`. "Upload model" button opens the upload modal.

**`UserStlUploadModal`** (modal, not a separate page):
Fields: file picker (`.stl`/`.3mf`), name (pre-filled from filename). On submit: modal closes, item appears immediately with processing spinner.

**`UserStlEditModal`**:
Fields: name, gridX, gridY (pre-filled from detected values). Actions: save, replace file, delete. Admins additionally see a "Reprocess" button.

**Hooks/API client:**
- `useUserStls.ts` — query (list) + mutations (upload, edit, delete, reprocess, replace file)
- `userStls.api.ts` — API client functions

**Library integration:**
`useLibraryData` calls `userStlToLibraryItem` to convert `ready` uploads to `LibraryItem` entries. Color hardcoded as `#F97316` (orange). Grid units from `gridX`/`gridY`.

### Routing
The `/shadowbox/*` routes in `App.tsx` are removed. No new routes — upload and edit are modals, avoiding page-reload auth issues.

---

## Admin Panel

New "User Models" tab in `AdminSubmissionsDialog`:

- Table: username, filename, name, grid dimensions, status, date
- Error rows show `errorMessage` inline
- Per-row actions: **Reprocess**, **Edit** (opens `UserStlEditModal`), **Delete**, **Promote** (ready items only)
- Promote writes item to `public/libraries/user-uploads/index.json`

The existing submissions badge and tab are unchanged — user STL uploads are tracked separately.

---

## Testing Strategy

**Unit tests:**
- `stlQueue.service.ts` — semaphore concurrency, startup recovery
- `stlProcessing.service.ts` — child process spawn, stdout parsing, error handling (mock `child_process`)
- `userStls.service.ts` — DB operations
- `UserStlUploadModal`, `UserStlLibrarySection`, `UserStlEditModal` — component tests with mocked hooks

**E2E tests:**
- Upload flow: select file → processing state → ready → drag to grid
- Edit metadata (name + grid correction)
- Admin reprocess + promote flows
