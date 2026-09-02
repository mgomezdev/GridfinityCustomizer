# Data Model

`server/src/db/schema.ts`, drizzle-orm over `@libsql/client`. SQLite storage; most PKs are app-generated `text` ids or `integer autoincrement`.

## Core entities

- **libraries → libraryItems** (composite PK `libraryId, id`) — the built-in component library, seeded from `tools/library-builder` output. `libraryItems.paramHash` links to generation pipeline output on disk (`generated/library/<hash>/`).
- **categories ↔ libraryItems** via **itemCategories** (composite PK `libraryId, itemId, categoryId`) — many-to-many tagging.
- **layouts** — a saved design. `gridX/gridY`, `widthMm/depthMm`, spacer config, `thumbnailPath` (see `backend.md` § thumbnail volume gotcha), optional `customerId`. `userId` is nullable and unenforced — a holdover from the removed auth system.
- **placedItems** — items dropped onto a layout's grid (`layoutId` FK, cascade delete). `customization` is a JSON text blob (per-bin params like wall cutouts, height).
- **userStlUploads** — user-uploaded custom parts. `userId` nullable — parts are now global, not per-account. `status` is `pending|processing|error|ready`, driven by `stlProcessing.service.ts`.
- **refImages** (global library) vs **referenceImages** (per-layout placement, FK to `refImages` with `onDelete: 'set null'` — deleting a global ref image un-links placements rather than cascading their deletion).
- **bomGenerations** — one row per layout (`layoutId` unique FK). Tracks `status`, `exportJson`, `fileManifest` (JSON array of `{filename, qty}`), `threeMfPath`, and `themisProjectId` (see `integrations.md`).
- **favorites** — saved bin+customization combos. Global, no user ownership (`userId` kept for compat, unused).
- **sharedProjects** — public share links (`slug` unique), `createdBy` nullable, no user FK.
- **customers** + **customerParts** / **customerRefImages** — many-to-many join tables linking customer profiles to uploaded parts and ref images.

## Deprecated / vestigial

`users` and `refreshTokens` tables still exist (JWT/Argon2 auth was removed per CLAUDE.md) — kept for backward compat, not written by any active code path. Several other tables' `userId`/`createdBy` columns are nullable leftovers from the same removal; treat any `userId`-shaped column as effectively unused unless you find an active write path.

## Non-obvious constraints

- `bomGenerations.layoutId` has a `.unique()` constraint — one generation record per layout, upserted in place rather than appended.
- Cascade deletes: `placedItems`, `referenceImages`, `sharedProjects`, `bomGenerations`, `customerParts`, `customerRefImages` all cascade off their parent (`layouts` or `customers`). Deleting a layout or customer is destructive across all of these — there's no soft-delete layer.
- Count queries: see `backend.md` § libsql + drizzle COUNT(*) — don't write a new correlated-subquery count against this schema without the groupBy+Map workaround.
