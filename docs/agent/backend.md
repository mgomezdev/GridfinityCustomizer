# Backend Notes

Express + TypeScript, `server/src/`. Routes → controllers → services → drizzle/libsql (`db/connection.ts`).

## Generation pipeline (`services/generationPipeline.service.ts`)

`GenerationPipelineService` renders a Gridfinity bin STL + preview PNGs for a given param hash by shelling out to Python (`generate_bin.py`, then `stl_to_png.py` for ortho + 4 perspective rotations). Two entry points:

- `enqueue(hash, params, baseModelPath)` — user customization, written under `generated/custom/<hash>/`.
- `seed(hash, params, baseModelPath)` — library item pre-render, written under `generated/library/<hash>/`.

State is disk-derived, not DB-backed: `getStatus`/`checkDisk` look for `ortho.png` (complete), `error.txt` (failed), or just the directory existing (pending). The in-memory `jobs` Map exists only to dedup concurrent requests for the same hash within this process's lifetime — a restart loses in-flight job tracking but not completed/failed state, since that's readable straight off disk. A failed job is always retried on next enqueue/seed (`clearError` deletes `error.txt` before restarting), on the assumption prior failures may have been transient.

Emits `generation:complete` / `generation:failed` on the service's own `EventEmitter`; this backs the `/generation/events` SSE endpoint. See `conventions.md` for the SSE-drop backstop this required on the frontend.

## Image processing (`services/image.service.ts`)

`processAndSaveImage` re-encodes uploads with `sharp` to strip EXIF/embedded scripts. Two independent caps, both required:

- `MAX_INPUT_SIZE` (5 MB) — compressed byte size, checked before decode.
- `MAX_INPUT_PIXELS` (8000×8000 / 64MP) — passed as `sharp(buf, { limitInputPixels })`. Compressed size alone doesn't bound decode-time memory (a mostly-uniform PNG can be tiny on disk and huge decoded), so this is not redundant with the byte cap. A sharp pixel-limit rejection is caught and converted to a 400 `VALIDATION_ERROR`; without the catch it would otherwise bubble as an unhandled 500 or, pre-fix, just allocate the memory.

## User STL uploads (`controllers/userStls.controller.ts`)

Two code paths write to `USER_STL_DIR/global/<id>.<ext>`: initial upload and replace. Both must independently reject non-`.stl` extensions (multer's `fileFilter` on this route also accepts `.3mf`, so the extension check is not optional/redundant — the filter alone lets `.3mf` through). `replaceFileHandler` renames the new file into its final destination path *before* unlinking the old one — a failed rename then leaves the original part intact rather than deleted with nothing to replace it. Don't reorder this to unlink-then-rename.

## Thumbnail / generated / user-STL directory config

`config.ts` defines `IMAGE_DIR`, `USER_STL_DIR`, `USER_STL_IMAGE_DIR`, `GENERATED_STL_DIR`, `THUMBNAIL_DIR`, all defaulting to `./data/<name>`. In Docker these must all be:
1. Declared in `infra/Dockerfile`'s `ENV` block, pointing at `/data/<name>`.
2. Created in `infra/docker-entrypoint.sh`'s `mkdir -p` line.
3. Included in the `/data` `VOLUME` mount.

`THUMBNAIL_DIR` was added to `config.ts` without steps 1–3, so it silently resolved to a path inside the image layer instead of the mounted volume — thumbnails survived until the next rebuild, then vanished, with `layouts.thumbnailPath` rows left pointing at nothing. Any new persisted-file directory added to `config.ts` needs the same three-place wiring or it will repeat this failure mode.

## libsql + drizzle `COUNT(*)`

Drizzle subquery-based counts can fail against libsql. The working pattern (see `services/library.service.ts::getAllLibraries`): run a separate `.groupBy()` query selecting `sql<number>\`count(*)\`` per key, then build a `Map` and look up counts against the main result set in application code — don't nest the count as a correlated subquery in the main select.

## Themis integration

See `integrations.md`.
