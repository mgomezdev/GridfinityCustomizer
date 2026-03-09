#!/usr/bin/env python3
"""Generate all shadowbox library STLs (2x2 through 5x5, solid, h=4, with lip)."""
import subprocess, sys, os, tempfile, json

SCRIPT = os.path.join(os.path.dirname(__file__), "generate_bin.py")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "public", "libraries", "shadowbox")

os.makedirs(OUT_DIR, exist_ok=True)

sizes = [(w, d) for w in range(2, 6) for d in range(2, 6)]

for w, d in sizes:
    params = {"width": [w, 0], "depth": [d, 0], "height": [4, 0], "lip_style": "normal", "filled_in": "enabled"}
    outfile = os.path.join(OUT_DIR, f"shadowbox_{w}x{d}.stl")
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(params, f)
        tmppath = f.name
    print(f"Generating shadowbox_{w}x{d}.stl ...")
    result = subprocess.run(
        [sys.executable, SCRIPT, tmppath, "--output", outfile],
        capture_output=False
    )
    os.unlink(tmppath)
    if result.returncode != 0:
        print(f"FAILED: shadowbox_{w}x{d}.stl", file=sys.stderr)
        sys.exit(1)

print(f"\nDone — generated {len(sizes)} STLs in {OUT_DIR}")
