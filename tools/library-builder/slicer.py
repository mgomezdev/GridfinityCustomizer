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

    if not os.path.exists(stl_path):
        logger.warning("STL file not found: %s", stl_path)
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
                # OrcaSlicer writes metadata comments at the top of the gcode file.
                # 100 lines is sufficient for all known OrcaSlicer versions.
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
