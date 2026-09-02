# Conventions & Gotchas

Non-obvious invariants, mostly reverse-engineered from the last several bug-fix commits. **Skim before touching file storage, image processing, generation status tracking, or Docker config.**

## Invariants (don't reintroduce these bugs)

- **Every persisted-file `config.ts` directory needs three-place Docker wiring.** `THUMBNAIL_DIR` (and `IMAGE_DIR`/`USER_STL_DIR`/`USER_STL_IMAGE_DIR`/`GENERATED_STL_DIR`) must each appear in (1) `infra/Dockerfile`'s `ENV` block pointed at `/data/<name>`, (2) `infra/docker-entrypoint.sh`'s `mkdir -p` line, (3) inside the `/data` `VOLUME` mount. Missing any of these means the app runs fine until the next rebuild, then silently loses that directory's contents with DB rows still pointing at dead paths. See commit `97a3695`.
- **File replace = write-then-unlink, never unlink-then-write.** `userStls.controller.ts::replaceFileHandler` renames the new file into its final path before removing the old one. If you add another "replace an existing stored file" path anywhere, follow the same order — a failed rename must leave the original intact, not deleted. See commit `ac469c7`.
- **Extension allowlists must be checked at every write path, not just the multer filter.** `multer`'s `fileFilter` for STL uploads also accepts `.3mf` (needed elsewhere); routes that are STL-only re-check `path.extname(...).toLowerCase() === '.stl'` themselves. Don't assume the filter alone constrains what reaches a handler.
- **Compressed byte size does not bound decoded image memory.** Any new image-accepting endpoint using `sharp` needs `limitInputPixels` set explicitly (current cap: 8000×8000 / 64MP in `image.service.ts`), independent of any compressed-size cap. A uniform-color PNG can be tiny on disk and enormous decoded.
- **SSE (`EventSource`) reconnects silently drop messages.** Any client state driven by an `EventSource` stream needs a poll-based backstop for hashes/ids still in a pending state, re-checked on every `onopen` (fires on reconnect too, not just initial connect) — see `useGenerationState`/`useGenerationEvents` in `frontend.md`. Don't add a second bare `EventSource` consumer without the same pattern.
- **Drizzle count subqueries against libsql**: use a separate `.groupBy()` + `Map` join in application code, not a nested correlated-subquery `count(*)`. See `backend.md` / `library.service.ts::getAllLibraries`.
- **Mobile and desktop save are separate code paths.** `WorkspacePage.handleMobileSave` has its own try/catch and error state; it does not share the `updateLayoutMutation.isError` path the desktop toolbar relies on. An empty catch here previously left the mobile save button silently returning to "Save" with no user-visible failure — see commit `89644d6`. If you change save error handling, check both.
- **No password auth.** JWT/Argon2 were removed; `users`/`refreshTokens` tables and `userId` columns across the schema are vestigial compat leftovers, not an active auth boundary. Don't build new authorization logic on top of them without confirming first — see `data-model.md` § Deprecated.

## Style / testing conventions (from CLAUDE.md, restated for quick lookup)

- Tests mock the logger with `pino({ level: 'silent' })` — a plain object breaks `pino-http`.
- DB import is `{ db }` from `db/connection.ts` — the old `client.ts` shim is gone.
- Integration tests (e.g. `user-stl-processing.spec.ts`) only run with `TARGET=docker` or `RUN_INTEGRATION_TESTS=1`.

## Running things

```
npm run server:dev        # backend, tsx watch, :3001
npm run dev                # frontend, Vite HMR, :5173
npm run test:run           # unit tests, single run
npm run test:e2e           # Playwright
npm run lint
```
