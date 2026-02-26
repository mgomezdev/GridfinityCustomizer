# OrcaSlicer Pricing Calc Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate OrcaSlicer CLI into the library builder tool so that each model entry in `index.json` optionally includes `filamentGrams` and `printTimeSeconds`, extracted by slicing the model via OrcaSlicer.

**Architecture:** A new `slicer.py` module handles all OrcaSlicer interaction: cleanup of a dedicated temp directory, and a `slice_model()` function that invokes OrcaSlicer, parses the gcode header, and returns the two fields or `None` on any failure. `build_library.py` gains a `--slicer-config PATH` flag; when provided, it calls the slicer per model unless both fields already exist in `index.json` (idempotency). OrcaSlicer is bundled in a new Docker image for the tool via an extracted AppImage. A `docker-compose.yml` exposes `models` and `profiles` as env-var-driven bind mounts.

**Tech Stack:** Python 3.11, pytest (unit tests), OrcaSlicer Linux AppImage (headless, no FUSE), Docker, subprocess, re, shutil, uuid

---

### Task 1: `slicer.py` — time parsing and cleanup helpers

**Context:** This is the `tools/library-builder/` Python tool. There are no existing tests — we are creating the test infrastructure from scratch. Run all commands from inside `tools/library-builder/`.

**Files:**
- Create: `tools/library-builder/slicer.py`
- Create: `tools/library-builder/tests/__init__.py`
- Create: `tools/library-builder/tests/test_slicer.py`

**Step 1: Install pytest (if not already available)**

```bash
pip install pytest
```

**Step 2: Create `tools/library-builder/tests/__init__.py`**

Empty file — just `touch tests/__init__.py`.

**Step 3: Write failing tests for `_parse_time_str` and `cleanup_stale_temp_files`**

Create `tools/library-builder/tests/test_slicer.py`:

```python
import os
import pytest
from unittest.mock import patch


class TestParseTimeStr:
    def test_hours_minutes_seconds(self):
        from slicer import _parse_time_str
        assert _parse_time_str("1h 23m 45s") == 5025

    def test_minutes_seconds(self):
        from slicer import _parse_time_str
        assert _parse_time_str("23m 45s") == 1425

    def test_seconds_only(self):
        from slicer import _parse_time_str
        assert _parse_time_str("45s") == 45

    def test_hours_only(self):
        from slicer import _parse_time_str
        assert _parse_time_str("2h") == 7200

    def test_empty_string_returns_none(self):
        from slicer import _parse_time_str
        assert _parse_time_str("") is None

    def test_non_time_string_returns_none(self):
        from slicer import _parse_time_str
        assert _parse_time_str("not a time") is None


class TestCleanupStaleTempFiles:
    def test_creates_dir_when_absent(self, tmp_path, monkeypatch):
        target = str(tmp_path / "orca-slice")
        monkeypatch.setattr("slicer.TEMP_DIR", target)
        from slicer import cleanup_stale_temp_files
        cleanup_stale_temp_files()
        assert os.path.isdir(target)

    def test_wipes_existing_files(self, tmp_path, monkeypatch):
        target = tmp_path / "orca-slice"
        target.mkdir()
        (target / "stale.gcode").write_text("old data")
        monkeypatch.setattr("slicer.TEMP_DIR", str(target))
        from slicer import cleanup_stale_temp_files
        cleanup_stale_temp_files()
        assert os.path.isdir(str(target))
        assert list(target.iterdir()) == []
```

**Step 4: Run tests to confirm they fail**

```bash
cd tools/library-builder
python -m pytest tests/test_slicer.py -v
```

Expected: `ModuleNotFoundError: No module named 'slicer'`

**Step 5: Create `tools/library-builder/slicer.py` with helpers**

```python
import logging
import os
import re
import shutil
import subprocess
import uuid

logger = logging.getLogger(__name__)

TEMP_DIR = "/tmp/orca-slice"
ORCA_BINARY = "orca-slicer"
SLICE_TIMEOUT = 120


def cleanup_stale_temp_files() -> None:
    """Wipe and recreate TEMP_DIR on startup to clear any stale gcode files."""
    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR)
    os.makedirs(TEMP_DIR, exist_ok=True)


def _parse_time_str(s: str) -> int | None:
    """
    Parse OrcaSlicer time string to total seconds.

    Examples:
        "1h 23m 45s" -> 5025
        "23m 45s"    -> 1425
        "45s"        -> 45
        ""           -> None
    """
    total = 0
    matched = False
    for pattern, multiplier in [
        (r"(\d+)h", 3600),
        (r"(\d+)m(?!s)", 60),  # 'm' not followed by 's' to avoid matching 'ms'
        (r"(\d+)s", 1),
    ]:
        m = re.search(pattern, s)
        if m:
            total += int(m.group(1)) * multiplier
            matched = True
    return total if matched else None


def slice_model(stl_path: str, config_path: str) -> dict | None:
    """
    Slice stl_path using OrcaSlicer with config_path.

    Returns {"filamentGrams": float, "printTimeSeconds": int} or None on any failure.
    Failures are logged as warnings; they do not raise exceptions.
    """
    if not os.path.exists(config_path):
        logger.warning("Slicer config not found: %s", config_path)
        return None

    if shutil.which(ORCA_BINARY) is None:
        logger.warning("OrcaSlicer binary not on PATH: %s", ORCA_BINARY)
        return None

    os.makedirs(TEMP_DIR, exist_ok=True)
    temp_gcode = os.path.join(TEMP_DIR, f"{uuid.uuid4()}.gcode")

    try:
        result = subprocess.run(
            [ORCA_BINARY, "--slice", "--load", config_path, "-o", temp_gcode, stl_path],
            timeout=SLICE_TIMEOUT,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            logger.warning("OrcaSlicer failed for %s: %s", stl_path, result.stderr[:500])
            return None

        filament_grams = None
        print_time_seconds = None

        with open(temp_gcode, encoding="utf-8", errors="replace") as f:
            for i, line in enumerate(f):
                if i >= 100:
                    break
                if filament_grams is None:
                    m = re.match(r";\s*filament used \[g\]\s*=\s*([\d.]+)", line)
                    if m:
                        filament_grams = float(m.group(1))
                if print_time_seconds is None:
                    m = re.match(
                        r";\s*estimated printing time \(normal mode\)\s*=\s*(.+)", line
                    )
                    if m:
                        print_time_seconds = _parse_time_str(m.group(1).strip())
                if filament_grams is not None and print_time_seconds is not None:
                    break

        if filament_grams is None or print_time_seconds is None:
            logger.warning(
                "Could not parse slicer output for %s (filament=%s, time=%s)",
                stl_path,
                filament_grams,
                print_time_seconds,
            )
            return None

        return {"filamentGrams": filament_grams, "printTimeSeconds": print_time_seconds}

    except subprocess.TimeoutExpired:
        logger.warning("OrcaSlicer timed out after %ds for %s", SLICE_TIMEOUT, stl_path)
        return None
    except Exception as e:
        logger.warning("Unexpected error slicing %s: %s", stl_path, e)
        return None
    finally:
        if os.path.exists(temp_gcode):
            try:
                os.unlink(temp_gcode)
            except Exception:
                pass
```

**Step 6: Run tests to confirm they pass**

```bash
cd tools/library-builder
python -m pytest tests/test_slicer.py::TestParseTimeStr tests/test_slicer.py::TestCleanupStaleTempFiles -v
```

Expected: All 8 tests PASS.

**Step 7: Commit**

```bash
git add tools/library-builder/slicer.py tools/library-builder/tests/
git commit -m "feat(library-builder): add slicer.py helpers with tests"
```

---

### Task 2: `slicer.py` — `slice_model()` tests

**Context:** `slicer.py` already exists from Task 1. We are adding tests for `slice_model`. The trick for the "success" test is that `subprocess.run` needs to write gcode to the `-o` path; we accomplish this in a `side_effect` function.

**Files:**
- Modify: `tools/library-builder/tests/test_slicer.py` — append `TestSliceModel` class

**Step 1: Add `TestSliceModel` class to `test_slicer.py`**

Append to the bottom of `tests/test_slicer.py`:

```python
from unittest.mock import MagicMock, patch


class TestSliceModel:
    def test_returns_none_when_config_missing(self, tmp_path):
        from slicer import slice_model
        result = slice_model("/some/model.stl", str(tmp_path / "missing.json"))
        assert result is None

    def test_returns_none_when_orca_not_on_path(self, tmp_path):
        config = tmp_path / "config.json"
        config.write_text("{}")
        with patch("shutil.which", return_value=None):
            from slicer import slice_model
            result = slice_model("/some/model.stl", str(config))
        assert result is None

    def test_returns_none_on_nonzero_exit(self, tmp_path):
        config = tmp_path / "config.json"
        config.write_text("{}")
        mock_proc = MagicMock(returncode=1, stderr="slicing error")
        with patch("shutil.which", return_value="/usr/bin/orca-slicer"), \
             patch("subprocess.run", return_value=mock_proc):
            from slicer import slice_model
            result = slice_model("/some/model.stl", str(config))
        assert result is None

    def test_returns_dict_on_success(self, tmp_path, monkeypatch):
        config = tmp_path / "config.json"
        config.write_text("{}")
        monkeypatch.setattr("slicer.TEMP_DIR", str(tmp_path))

        gcode = (
            "; filament used [g] = 18.72\n"
            "; estimated printing time (normal mode) = 1h 48m\n"
        )

        def fake_run(cmd, **kwargs):
            out_path = cmd[cmd.index("-o") + 1]
            with open(out_path, "w") as f:
                f.write(gcode)
            return MagicMock(returncode=0)

        with patch("shutil.which", return_value="/usr/bin/orca-slicer"), \
             patch("subprocess.run", side_effect=fake_run):
            from slicer import slice_model
            result = slice_model("/some/model.stl", str(config))

        assert result == {"filamentGrams": 18.72, "printTimeSeconds": 6480}

    def test_returns_none_when_filament_line_missing(self, tmp_path, monkeypatch):
        config = tmp_path / "config.json"
        config.write_text("{}")
        monkeypatch.setattr("slicer.TEMP_DIR", str(tmp_path))

        gcode = "; estimated printing time (normal mode) = 45m\n"

        def fake_run(cmd, **kwargs):
            out_path = cmd[cmd.index("-o") + 1]
            with open(out_path, "w") as f:
                f.write(gcode)
            return MagicMock(returncode=0)

        with patch("shutil.which", return_value="/usr/bin/orca-slicer"), \
             patch("subprocess.run", side_effect=fake_run):
            from slicer import slice_model
            result = slice_model("/some/model.stl", str(config))

        assert result is None

    def test_returns_none_when_time_line_missing(self, tmp_path, monkeypatch):
        config = tmp_path / "config.json"
        config.write_text("{}")
        monkeypatch.setattr("slicer.TEMP_DIR", str(tmp_path))

        gcode = "; filament used [g] = 5.0\n"

        def fake_run(cmd, **kwargs):
            out_path = cmd[cmd.index("-o") + 1]
            with open(out_path, "w") as f:
                f.write(gcode)
            return MagicMock(returncode=0)

        with patch("shutil.which", return_value="/usr/bin/orca-slicer"), \
             patch("subprocess.run", side_effect=fake_run):
            from slicer import slice_model
            result = slice_model("/some/model.stl", str(config))

        assert result is None

    def test_cleans_up_temp_gcode_on_success(self, tmp_path, monkeypatch):
        config = tmp_path / "config.json"
        config.write_text("{}")
        monkeypatch.setattr("slicer.TEMP_DIR", str(tmp_path))

        gcode = (
            "; filament used [g] = 10.0\n"
            "; estimated printing time (normal mode) = 5m\n"
        )
        written_path = []

        def fake_run(cmd, **kwargs):
            out_path = cmd[cmd.index("-o") + 1]
            written_path.append(out_path)
            with open(out_path, "w") as f:
                f.write(gcode)
            return MagicMock(returncode=0)

        with patch("shutil.which", return_value="/usr/bin/orca-slicer"), \
             patch("subprocess.run", side_effect=fake_run):
            from slicer import slice_model
            slice_model("/some/model.stl", str(config))

        assert written_path, "subprocess.run was not called"
        assert not os.path.exists(written_path[0]), "temp gcode was not cleaned up"

    def test_cleans_up_temp_gcode_on_failure(self, tmp_path, monkeypatch):
        config = tmp_path / "config.json"
        config.write_text("{}")
        monkeypatch.setattr("slicer.TEMP_DIR", str(tmp_path))

        written_path = []

        def fake_run(cmd, **kwargs):
            out_path = cmd[cmd.index("-o") + 1]
            written_path.append(out_path)
            with open(out_path, "w") as f:
                f.write("")  # empty gcode — parse will fail
            return MagicMock(returncode=0)

        with patch("shutil.which", return_value="/usr/bin/orca-slicer"), \
             patch("subprocess.run", side_effect=fake_run):
            from slicer import slice_model
            slice_model("/some/model.stl", str(config))

        if written_path:
            assert not os.path.exists(written_path[0]), "temp gcode was not cleaned up"
```

**Step 2: Run tests to confirm they fail**

```bash
cd tools/library-builder
python -m pytest tests/test_slicer.py::TestSliceModel -v
```

Expected: Tests fail (the `slice_model` function exists but tests haven't verified its logic yet — actually they should pass since we wrote the implementation in Task 1). If they already pass, that's fine — no additional implementation needed.

**Step 3: Run full test suite to confirm all pass**

```bash
cd tools/library-builder
python -m pytest tests/ -v
```

Expected: All tests PASS.

**Step 4: Commit**

```bash
git add tools/library-builder/tests/test_slicer.py
git commit -m "test(library-builder): add slice_model tests"
```

---

### Task 3: `build_library.py` — `--slicer-config` flag and startup cleanup

**Context:** `build_library.py` lives in `tools/library-builder/`. The `main()` function is at line 1267, `generate_library_json()` at line 924. We add the CLI flag and wire up startup cleanup.

**Files:**
- Modify: `tools/library-builder/build_library.py`

**Step 1: Add the import at the top of `build_library.py`**

After line 36 (`from stl_to_png import ...`), add:

```python
from slicer import cleanup_stale_temp_files, slice_model
```

**Step 2: Add `--slicer-config` to the argparse block**

In `main()`, after the `--rotate` argument (~line 1319), add:

```python
    parser.add_argument(
        '--slicer-config',
        metavar='PATH',
        default=None,
        help='Path to OrcaSlicer .json config file (enables filament/time estimation per model)',
    )
```

**Step 3: Add `slicer_config` to the `generate_library_json` call in `main()`**

Change the call at ~line 1353 to include `slicer_config=args.slicer_config`:

```python
    success = generate_library_json(
        args.directory,
        color_hex=color_hex,
        output_file=args.output,
        library_name=args.library_name,
        skip_existing=args.skip_existing,
        non_interactive=args.non_interactive,
        render_both=render_both,
        camera_tilt=args.camera_tilt,
        fov=args.fov,
        rotation=args.rotate,
        slicer_config=args.slicer_config,
    )
```

**Step 4: Call `cleanup_stale_temp_files()` in `main()` when slicer is enabled**

Add this block just before the `generate_library_json` call in `main()`:

```python
    if args.slicer_config:
        print("Slicer config provided — clearing stale temp files...")
        cleanup_stale_temp_files()
```

**Step 5: Add `slicer_config=None` parameter to `generate_library_json`**

Change the function signature at line 924 from:

```python
def generate_library_json(directory, color_hex=None, output_file='index.json',
                         library_name=None, skip_existing=True, non_interactive=False,
                         render_both=None, camera_tilt=None, fov=None, rotation=0):
```

to:

```python
def generate_library_json(directory, color_hex=None, output_file='index.json',
                         library_name=None, skip_existing=True, non_interactive=False,
                         render_both=None, camera_tilt=None, fov=None, rotation=0,
                         slicer_config=None):
```

**Step 6: Verify the tool still runs without slicer flag**

```bash
cd tools/library-builder
python build_library.py --help
```

Expected: Help text now includes `--slicer-config PATH` in the options list. No error on startup.

**Step 7: Commit**

```bash
git add tools/library-builder/build_library.py
git commit -m "feat(library-builder): add --slicer-config flag and startup cleanup"
```

---

### Task 4: `build_library.py` — load existing index + STL slicer integration

**Context:** `generate_library_json()` currently starts fresh (no existing index.json awareness). We need to load `index.json` at the start and build a lookup dict. Then for each STL item, after `build_library_item()`, apply the skip/slice logic.

**Files:**
- Modify: `tools/library-builder/build_library.py` — inside `generate_library_json()`

**Step 1: Load existing index.json at the start of `generate_library_json()`**

In `generate_library_json()`, after `output_dir` is determined (~line 948, after the `os.makedirs` call), add:

```python
    # Load existing index.json to enable skip-if-already-sliced logic
    existing_by_id = {}
    output_path_check = os.path.join(output_dir, output_file)
    if os.path.exists(output_path_check):
        try:
            with open(output_path_check, encoding='utf-8') as f:
                existing_data = json.load(f)
            for entry in existing_data.get('items', []):
                if 'id' in entry:
                    existing_by_id[entry['id']] = entry
            print(f"Loaded {len(existing_by_id)} existing entries from {output_path_check}")
        except Exception as e:
            print(f"WARNING: Could not load existing index.json: {e}")
```

**Step 2: Apply slicer skip/slice logic after each STL item is built**

In the STL loop (after `item = build_library_item(...)`, before `items.append(item)`, ~line 999), add:

```python
        # Slicer integration: reuse existing values or slice now
        existing = existing_by_id.get(item['id'], {})
        if 'filamentGrams' in existing and 'printTimeSeconds' in existing:
            item['filamentGrams'] = existing['filamentGrams']
            item['printTimeSeconds'] = existing['printTimeSeconds']
            print(f"  Slicer: reusing existing values for {item['id']}")
        elif slicer_config:
            slicer_result = slice_model(stl_path, slicer_config)
            if slicer_result:
                item['filamentGrams'] = slicer_result['filamentGrams']
                item['printTimeSeconds'] = slicer_result['printTimeSeconds']
                print(f"  Slicer: {item['filamentGrams']}g, {item['printTimeSeconds']}s")
```

**Step 3: Run the tool on a real STL directory (without slicer config) to confirm no regression**

```bash
cd tools/library-builder
python build_library.py /path/to/some/stls --non-interactive --color blue
```

Or if no STLs are handy, verify `--help` still works and the existing test suite still passes:

```bash
python -m pytest tests/ -v
```

Expected: All tests pass. No regression.

**Step 4: Commit**

```bash
git add tools/library-builder/build_library.py
git commit -m "feat(library-builder): load existing index + STL slicer skip/slice logic"
```

---

### Task 5: `build_library.py` — 3MF slicer integration

**Context:** For 3MF files, the geometry is loaded and processed inside `process_3mf_file()`. The geometry object is available there and we can export it to a temp STL for slicing without reloading the file. We add `slicer_config` and `existing_by_id` params to `process_3mf_file()`, do the slicer work inside the object loop, and include the results in the per-object metadata dict.

**Files:**
- Modify: `tools/library-builder/build_library.py` — `process_3mf_file()` and the 3MF loop in `generate_library_json()`

**Step 1: Add `slicer_config` and `existing_by_id` params to `process_3mf_file()`**

Change the function signature at line 675 from:

```python
def process_3mf_file(mf3_path, color_hex, output_dir=None, skip_existing_png=True, non_interactive=False,
                     render_both=None, camera_tilt=None, fov=None, rotation=0):
```

to:

```python
def process_3mf_file(mf3_path, color_hex, output_dir=None, skip_existing_png=True, non_interactive=False,
                     render_both=None, camera_tilt=None, fov=None, rotation=0,
                     slicer_config=None, existing_by_id=None):
```

**Step 2: Add slicer logic inside the object loop of `process_3mf_file()`**

Inside the `for obj_name, geometry in geometries.items():` loop, just before the `# Build metadata` comment (~line 866), add:

```python
            # Slicer integration: check existing values or slice this object
            slicer_data = {}
            obj_id = generate_3mf_object_id(mf3_basename, obj_name, width, height)
            existing_entry = (existing_by_id or {}).get(obj_id, {})

            if 'filamentGrams' in existing_entry and 'printTimeSeconds' in existing_entry:
                slicer_data = {
                    'filamentGrams': existing_entry['filamentGrams'],
                    'printTimeSeconds': existing_entry['printTimeSeconds'],
                }
                print(f"    Slicer: reusing existing values for {obj_id}")
            elif slicer_config:
                temp_stl_name = None
                try:
                    temp_stl = tempfile.NamedTemporaryFile(suffix='.stl', delete=False)
                    temp_stl_name = temp_stl.name
                    temp_stl.close()
                    geometry.export(temp_stl_name, file_type='stl')
                    slicer_result = slice_model(temp_stl_name, slicer_config)
                    if slicer_result:
                        slicer_data = slicer_result
                        print(f"    Slicer: {slicer_data['filamentGrams']}g, {slicer_data['printTimeSeconds']}s")
                finally:
                    cleanup_temp_file(temp_stl_name)
```

**Step 3: Include `slicer_data` in the metadata dict**

Change the `# Build metadata` block (~line 866) from:

```python
            metadata = {
                'mf3_file': mf3_filename,
                'object_name': obj_name,
                'png_file': png_filename_ortho,
                'png_file_perspective': perspective_filename,
                'width': width,
                'height': height,
                'color': color_hex
            }
```

to:

```python
            metadata = {
                'mf3_file': mf3_filename,
                'object_name': obj_name,
                'png_file': png_filename_ortho,
                'png_file_perspective': perspective_filename,
                'width': width,
                'height': height,
                'color': color_hex,
                **slicer_data,
            }
```

**Step 4: Pass `slicer_config` and `existing_by_id` when calling `process_3mf_file()` in `generate_library_json()`**

In the 3MF loop (~line 1012), change:

```python
        metadata_list = process_3mf_file(mf3_path, color_hex, output_dir, skip_existing,
                                        non_interactive, render_both, camera_tilt, fov, rotation)
```

to:

```python
        metadata_list = process_3mf_file(mf3_path, color_hex, output_dir, skip_existing,
                                        non_interactive, render_both, camera_tilt, fov, rotation,
                                        slicer_config=slicer_config, existing_by_id=existing_by_id)
```

**Step 5: Carry `filamentGrams`/`printTimeSeconds` from metadata to the item in the 3MF item loop**

After `item = build_library_item(...)` in the 3MF object loop (~line 1037), add:

```python
            if 'filamentGrams' in metadata:
                item['filamentGrams'] = metadata['filamentGrams']
            if 'printTimeSeconds' in metadata:
                item['printTimeSeconds'] = metadata['printTimeSeconds']
```

**Step 6: Run the test suite to confirm no regression**

```bash
cd tools/library-builder
python -m pytest tests/ -v
```

Expected: All tests PASS.

**Step 7: Commit**

```bash
git add tools/library-builder/build_library.py
git commit -m "feat(library-builder): 3MF slicer integration"
```

---

### Task 6: `LIBRARY_FORMAT.md` — document new optional fields

**Context:** `tools/library-builder/LIBRARY_FORMAT.md` describes the JSON format. The Item Structure table currently ends at `imageUrl`. We add two new optional rows.

**Files:**
- Modify: `tools/library-builder/LIBRARY_FORMAT.md`

**Step 1: Add two rows to the Item Structure table**

Find the existing table header:
```
| Property | Type | Required | Description |
|----------|------|----------|-------------|
```

After the `imageUrl` row, add:

```markdown
| `perspectiveImageUrl` | string | No | Path to perspective preview image (e.g., `"bin 2x3-perspective.png"`) |
| `filamentGrams` | number | No | Filament used in grams, estimated by OrcaSlicer (e.g., `18.72`) |
| `printTimeSeconds` | number | No | Estimated print time in seconds, estimated by OrcaSlicer (e.g., `6480`) |
```

(Note: `perspectiveImageUrl` was already in use but may not be documented — add it too for completeness.)

**Step 2: Update the Example Item to show the new fields**

Replace the existing example JSON block with:

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

**Step 3: Commit**

```bash
git add tools/library-builder/LIBRARY_FORMAT.md
git commit -m "docs(library-builder): document filamentGrams and printTimeSeconds fields"
```

---

### Task 7: `Dockerfile` for the library builder tool

**Context:** A new Docker image bundles Python 3.11 + the library builder + OrcaSlicer (extracted AppImage, no FUSE). The Dockerfile lives in `tools/library-builder/`. This requires downloading OrcaSlicer from GitHub Releases during the image build — pin to a specific release version.

**IMPORTANT — binary path:** OrcaSlicer AppImage contents vary by version. After `--appimage-extract`, run `find squashfs-root -name "OrcaSlicer" -o -name "orca_slicer" | head -5` inside the build to locate the actual binary. The `RUN` command below includes this discovery step; update the `ln -s` line if the path differs.

**Files:**
- Create: `tools/library-builder/Dockerfile`

**Step 1: Create `tools/library-builder/Dockerfile`**

```dockerfile
FROM python:3.11-slim

# System deps for trimesh/matplotlib rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    wget \
    fuse \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install OrcaSlicer (extracted AppImage — no FUSE needed at runtime)
# Update the version tag and filename to match the latest release:
# https://github.com/SoftFever/OrcaSlicer/releases
ARG ORCA_VERSION=2.3.0
RUN wget -q \
    "https://github.com/SoftFever/OrcaSlicer/releases/download/v${ORCA_VERSION}/OrcaSlicer_Linux_V${ORCA_VERSION}.AppImage" \
    -O /opt/OrcaSlicer.AppImage \
    && chmod +x /opt/OrcaSlicer.AppImage \
    && cd /opt && /opt/OrcaSlicer.AppImage --appimage-extract \
    && rm /opt/OrcaSlicer.AppImage

# Locate and symlink the OrcaSlicer binary
# If the symlink fails, run: docker build --progress=plain . 2>&1 | grep "squashfs-root"
# and update the path below to match the actual binary location.
RUN find /opt/squashfs-root -maxdepth 4 \( -name "OrcaSlicer" -o -name "orca_slicer" \) -type f | head -1 \
    | xargs -I{} ln -s {} /usr/local/bin/orca-slicer \
    && orca-slicer --version || echo "WARNING: orca-slicer binary not found — check AppImage extraction"

# Copy library builder source
COPY *.py ./

ENTRYPOINT ["python", "build_library.py"]
CMD ["--help"]
```

**Step 2: Verify the Dockerfile builds (optional — requires Docker)**

If Docker is available locally:

```bash
cd tools/library-builder
docker build -t library-builder:local . --progress=plain 2>&1 | tail -30
```

Look for `WARNING: orca-slicer binary not found` — if it appears, inspect the find output in the build log and update the `ln -s` path.

**Step 3: Commit**

```bash
git add tools/library-builder/Dockerfile
git commit -m "feat(library-builder): add Dockerfile with OrcaSlicer AppImage"
```

---

### Task 8: `docker-compose.yml` for the library builder tool

**Context:** The docker-compose.yml wires up two bind-mount volumes with env-var-driven host paths and defaults: models (input) and profiles (OrcaSlicer print profiles). This is a separate file from the root `docker-compose.sample.yml`.

**Files:**
- Create: `tools/library-builder/docker-compose.yml`

**Step 1: Create `tools/library-builder/docker-compose.yml`**

```yaml
# Library Builder — Docker Compose
#
# Builds index.json for a folder of STL/3MF files, optionally running each
# model through OrcaSlicer to extract filament weight and estimated print time.
#
# Usage:
#   1. Set env vars (or create a .env file):
#        MODELS_DIR   - host path to your STL/3MF folder  (default: ./models)
#        PROFILES_DIR - host path to OrcaSlicer profiles   (default: ./profiles)
#   2. Export your OrcaSlicer print profile as a .json file into PROFILES_DIR
#   3. Run:
#        docker compose run --rm library-builder \
#          /models --slicer-config /profiles/my-profile.json --non-interactive --color blue
#
# Without --slicer-config the tool runs normally (no slicing, no filament/time data).
#
# Update the image:
#   docker compose build --no-cache

services:
  library-builder:
    build: .
    volumes:
      - ${MODELS_DIR:-./models}:/models
      - ${PROFILES_DIR:-./profiles}:/profiles
    environment:
      - PYTHONUNBUFFERED=1
```

**Step 2: Verify the compose file is valid (if Docker is available)**

```bash
cd tools/library-builder
docker compose config
```

Expected: Outputs the resolved compose config with no errors.

**Step 3: Commit**

```bash
git add tools/library-builder/docker-compose.yml
git commit -m "feat(library-builder): add docker-compose.yml with models and profiles volumes"
```

---

## Summary

After all tasks are complete, the library builder:

1. Accepts `--slicer-config /profiles/my-profile.json` to enable OrcaSlicer integration
2. Clears `/tmp/orca-slice/` on startup to remove stale temp files from crashed runs
3. Skips re-slicing for any model that already has both `filamentGrams` AND `printTimeSeconds` in the existing `index.json`
4. Adds `filamentGrams` (float) and `printTimeSeconds` (int) to each entry on success; omits both on any failure
5. Works for both standalone STL files and individual objects extracted from 3MF files
6. Can be run inside a Docker container with OrcaSlicer bundled (no FUSE required)

### Running the tool with Docker

```bash
cd tools/library-builder
docker compose run --rm library-builder \
  /models --slicer-config /profiles/my-profile.json \
  --non-interactive --color blue
```

### Running locally (OrcaSlicer on PATH)

```bash
cd tools/library-builder
python build_library.py ./my-models \
  --slicer-config ./profiles/my-profile.json \
  --color blue
```
