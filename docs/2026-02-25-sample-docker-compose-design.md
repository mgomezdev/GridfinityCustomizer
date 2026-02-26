# Design: Sample Self-Hosting Docker Compose

**Date:** 2026-02-25
**Status:** Approved

## Goal

Provide a minimal, copy-paste-ready deployment artifact so users can run the app with no source code. The library catalog and SQLite database must live outside the container for persistence and easy backup.

## Approach

Two new files at the project root (Approach B: compose + `.env.sample`). The existing `docker-compose.yml` dev workflow is untouched.

## Files

### `docker-compose.sample.yml`

Single service using the pre-built `ninjabuffalo/gridfinity-customizer:latest` image (nginx + backend bundled). Two bind mounts driven by env vars with defaults:

```yaml
services:
  app:
    image: ninjabuffalo/gridfinity-customizer:latest
    ports:
      - "${PORT:-8080}:80"
    env_file: .env
    volumes:
      - ${LIBRARY_DIR:-./library}:/libraries
      - ${DATA_DIR:-./data}:/data
    restart: unless-stopped
```

### `.env.sample`

Full list of env vars with comments. Users copy to `.env` and fill in secrets.

Key variables:
- `PORT` — host port (default `8080`)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — **must be changed** before production use
- `LIBRARY_DIR` — host path for library JSON + images (default `./library`)
- `DATA_DIR` — host path for SQLite DB and image cache (default `./data`)
- `DB_PATH`, `IMAGE_DIR`, `LIBRARIES_DIR` — container-internal paths (change only if volumes are remapped)
- `LOG_LEVEL` — pino log level

### Library starter pack (`library-starter.zip`)

The existing `public/libraries/` folder packaged as a zip, attached to GitHub Releases. Users extract it into their `LIBRARY_DIR`. No backend code changes needed — `LIBRARIES_DIR` env var is already wired in `reseedLibraries.ts`.

## Volume design

| Host path (default) | Container path | Contents |
|---|---|---|
| `./library` | `/libraries` | `manifest.json` + library subdirs with JSON + images |
| `./data` | `/data` | `gridfinity.db` + `images/` (seeded image cache) |

The backend re-seeds library data from `LIBRARIES_DIR` on every boot and writes the SQLite DB to `DB_PATH`.

## User setup flow

1. Download `docker-compose.sample.yml` → rename to `docker-compose.yml`
2. Download `library-starter.zip` from the release → extract to `./library/`
3. Copy `.env.sample` → `.env`, set `JWT_SECRET` and `JWT_REFRESH_SECRET`
4. `mkdir -p data`
5. `docker compose up -d`
6. App at `http://localhost:8080`

## What does NOT change

- Existing `docker-compose.yml` (dev build workflow)
- No backend or frontend code changes
- `LIBRARIES_DIR`, `DB_PATH`, `IMAGE_DIR` already supported in `server/src/config.ts`
