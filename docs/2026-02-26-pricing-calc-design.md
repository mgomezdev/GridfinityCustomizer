# Design: OrcaSlicer Integration for Library Builder (Pricing Calc)

**Date:** 2026-02-26
**Status:** Approved
**Branch:** feat/pricing-calc

## Goal

When the library builder processes a model (STL or individual 3MF object), optionally invoke OrcaSlicer CLI to slice it and extract filament weight (grams) and estimated print time (seconds), storing both in the JSON entry for that model.

## Approach

- **Slicing**: Slice each model to a temp gcode file, parse header comments, delete temp file (Approach A)
- **Activation**: Opt-in via `--slicer-config PATH` flag — slicing only runs when this flag is provided
- **Skip logic**: If an entry in the existing `index.json` already has **both** `filamentGrams` and `printTimeSeconds`, reuse those values and skip re-slicing
- **Failure handling**: Any failure (OrcaSlicer not found, config missing, timeout, parse error) logs a warning and omits both fields from the entry — no partial data
- **OrcaSlicer binary**: Bundled in the library builder Docker image (Linux AppImage extracted at build time, no FUSE required)

## Files

### New files
- `tools/library-builder/Dockerfile` — Python 3.11 slim + OrcaSlicer binary (extracted AppImage)
- `tools/library-builder/docker-compose.yml` — two env-var-driven bind mounts
- `tools/library-builder/slicer.py` — OrcaSlicer integration module

### Modified files
- `tools/library-builder/build_library.py` — `--slicer-config` flag, startup cleanup, skip logic, slicer call per model
- `tools/library-builder/LIBRARY_FORMAT.md` — document new JSON fields

## Docker Setup

### `docker-compose.yml` volumes

```yaml
volumes:
  - ${MODELS_DIR:-./models}:/models
  - ${PROFILES_DIR:-./profiles}:/profiles
```

Both host paths are env vars with defaults. Users export their OrcaSlicer print profile to `./profiles/` and reference it as `/profiles/my-profile.json`.

### `Dockerfile`

Base: `python:3.11-slim`. Steps:
1. Install system deps (existing Python requirements)
2. Download OrcaSlicer Linux AppImage for a pinned version
3. Extract AppImage in-place (`--appimage-extract`) to avoid FUSE requirement
4. Symlink `squashfs-root/orca_slicer` (or equivalent) to `/usr/local/bin/orca-slicer`

## `slicer.py` Module

Public API:
```python
def cleanup_stale_temp_files() -> None:
    """Wipe and recreate /tmp/orca-slice/ on startup."""

def slice_model(stl_path: str, config_path: str) -> dict | None:
    """
    Slice stl_path using OrcaSlicer with config_path.
    Returns {"filamentGrams": float, "printTimeSeconds": int} or None on failure.
    """
```

### `slice_model` internals

1. Verify `config_path` exists — log warning and return `None` if not
2. Verify `orca-slicer` is on PATH — log warning and return `None` if not
3. Write temp gcode to `/tmp/orca-slice/<uuid>.gcode`
4. Run: `orca-slicer --slice --load <config_path> -o <temp.gcode> <stl_path>`
   - `subprocess.run` with `timeout=120`, `capture_output=True`
5. On non-zero exit code: log stderr, delete temp file, return `None`
6. Scan first 100 lines of gcode for:
   - `; filament used [g] = <float>` → `filamentGrams`
   - `; estimated printing time (normal mode) = <Xh Xm Xs>` → parse to `printTimeSeconds`
7. Delete temp gcode file
8. If either value not found: log warning, return `None`
9. Return `{"filamentGrams": float, "printTimeSeconds": int}`

### Time parsing

Convert OrcaSlicer time string to seconds:
- `"1h 23m 45s"` → `(1×3600) + (23×60) + 45 = 5025`
- `"23m 45s"` → `(23×60) + 45`
- `"45s"` → `45`

## `build_library.py` Changes

### New CLI flag

```
--slicer-config PATH    Path to OrcaSlicer .json config file (enables slicing)
```

### Startup (when `--slicer-config` provided)

1. Call `cleanup_stale_temp_files()` to clear `/tmp/orca-slice/` from any previous crashed run

### Per-model flow (STL and extracted 3MF objects — same path)

```
1. Load existing index.json if present → build lookup dict by item id
2. For each model:
   a. Render PNG(s) as before
   b. Check existing entry by id:
      - If both filamentGrams + printTimeSeconds present → reuse, skip slicing
      - Else if --slicer-config given → call slice_model(temp_stl, config_path)
        - If result not None → add filamentGrams + printTimeSeconds to entry
        - If result is None → omit both fields (log warning already emitted)
      - Else → omit both fields (slicing not enabled)
```

### JSON output

Fields are **omitted entirely** when not available. No nulls.

```json
{
  "id": "bin-2x3",
  "name": "2x3 Bin",
  "widthUnits": 2,
  "heightUnits": 3,
  "color": "#3B82F6",
  "categories": [],
  "imageUrl": "bin 2x3.png",
  "perspectiveImageUrl": "bin 2x3-perspective.png",
  "filamentGrams": 18.72,
  "printTimeSeconds": 6480
}
```

## LIBRARY_FORMAT.md Updates

Add two new optional fields to the item structure table:

| Property | Type | Required | Description |
|---|---|---|---|
| `filamentGrams` | number | No | Filament used in grams (from OrcaSlicer) |
| `printTimeSeconds` | number | No | Estimated print time in seconds (from OrcaSlicer) |

## What Does NOT Change

- Existing STL/3MF processing logic
- PNG rendering pipeline
- JSON structure for fields other than the two new ones
- Non-Docker usage (tool still works locally without Docker; OrcaSlicer binary just needs to be on PATH manually)
