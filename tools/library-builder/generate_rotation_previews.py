#!/usr/bin/env python3
"""
Generate perspective preview images (base + rotation variants) for all library items.

For each item:
  1. If no base perspective image exists, generate one and update index.json
  2. Generate rotation variants (90°, 180°, 270°) if missing

Usage:
    python generate_rotation_previews.py <libraries_dir>

Example:
    python generate_rotation_previews.py ../../public/libraries
"""

import json
import os
import sys
from glob import glob

sys.path.insert(0, os.path.dirname(__file__))
from stl_to_png import render_stl_to_png_perspective

ROTATION_ANGLES = [90, 180, 270]
MAX_DIMENSION = 800
DPI = 100
CAMERA_TILT = 22.5
FOV = 45


def find_stl_for_item(library_dir, item):
    """Find the STL file that corresponds to a library item."""
    item_id = item['id']

    # Pattern 1: ID-based (e.g., bin-1x1 -> bin_1x1.stl)
    id_filename = item_id.replace('-', '_') + '.stl'
    id_path = os.path.join(library_dir, id_filename)
    if os.path.exists(id_path):
        return id_path

    # Pattern 2: Direct ID as filename (e.g., 1x1-blank -> 1x1-blank.stl)
    direct_path = os.path.join(library_dir, item_id + '.stl')
    if os.path.exists(direct_path):
        return direct_path

    # Pattern 3: Dimension-based match (look for STL containing WxH)
    w = item.get('widthUnits', 0)
    h = item.get('heightUnits', 0)
    dim_pattern = f'{w}x{h}'

    # Try exact dimension match first
    candidates = []
    for stl_path in glob(os.path.join(library_dir, '*.stl')):
        stl_name = os.path.basename(stl_path).lower()
        if dim_pattern in stl_name:
            candidates.append(stl_path)

    # If item_id has extra parts (e.g., utensils-1x3), try matching more specifically
    if len(candidates) > 1:
        for stl_path in candidates:
            stl_name = os.path.basename(stl_path).lower()
            # Check if the STL name relates to the item ID
            id_parts = item_id.lower().replace('-', ' ').split()
            if all(p in stl_name.replace('-', ' ').replace('_', ' ') for p in id_parts):
                return stl_path

    if candidates:
        return candidates[0]

    return None


def derive_perspective_filename(item):
    """Derive the perspective image filename from an item's existing image naming."""
    # If item has an imageUrl, derive perspective name from its basename
    image_url = item.get('imageUrl', '')
    if image_url and image_url.endswith('.png'):
        basename = os.path.basename(image_url)
        base = basename[:-4]  # Remove .png
        return f"{base}-perspective.png"

    # Fallback: derive from item ID
    return f"{item['id']}-perspective.png"


def generate_all_perspectives(libraries_dir):
    """Generate base perspective + rotation images for all libraries."""
    total_generated = 0
    total_skipped = 0
    total_failed = 0
    total_index_updated = 0

    for lib_dir in sorted(glob(os.path.join(libraries_dir, '*'))):
        if not os.path.isdir(lib_dir):
            continue

        index_path = os.path.join(lib_dir, 'index.json')
        if not os.path.exists(index_path):
            continue

        lib_name = os.path.basename(lib_dir)
        print(f"\n{'='*60}")
        print(f"Processing library: {lib_name}")
        print(f"{'='*60}")

        with open(index_path, 'r', encoding='utf-8') as f:
            library = json.load(f)

        items = library.get('items', [])
        print(f"Found {len(items)} items")
        index_modified = False

        for item in items:
            # Find the STL file for this item
            stl_path = find_stl_for_item(lib_dir, item)
            if not stl_path:
                print(f"  [{item['id']}] No STL file found, skipping")
                continue

            # --- Step 1: Ensure base perspective image exists ---
            perspective_url = item.get('perspectiveImageUrl')
            if not perspective_url:
                # Generate base perspective and update index.json
                perspective_url = derive_perspective_filename(item)
                persp_path = os.path.join(lib_dir, perspective_url)

                if os.path.exists(persp_path):
                    print(f"  [{item['id']}] Base perspective exists on disk, adding to index: {perspective_url}")
                else:
                    print(f"  [{item['id']}] Generating base perspective: {perspective_url}")
                    success = render_stl_to_png_perspective(
                        stl_path, persp_path,
                        max_dimension=MAX_DIMENSION,
                        camera_tilt=CAMERA_TILT,
                        fov=FOV,
                        dpi=DPI,
                        quiet=True,
                        rotation=0
                    )
                    if not success:
                        print(f"  [{item['id']}] FAILED to generate base perspective")
                        total_failed += 1
                        continue
                    total_generated += 1

                # Update index.json entry
                item['perspectiveImageUrl'] = perspective_url
                index_modified = True
                total_index_updated += 1

            # Validate perspective URL format
            if not perspective_url.endswith('-perspective.png'):
                print(f"  [{item['id']}] Non-standard perspective naming: {perspective_url}, skipping rotations")
                continue

            # --- Step 2: Generate rotation variants ---
            base_name = perspective_url.replace('-perspective.png', '')
            for angle in ROTATION_ANGLES:
                rot_filename = f"{base_name}-perspective-{angle}.png"
                rot_path = os.path.join(lib_dir, rot_filename)

                if os.path.exists(rot_path):
                    total_skipped += 1
                    continue

                print(f"  [{item['id']}] Generating {angle}°: {rot_filename}")
                success = render_stl_to_png_perspective(
                    stl_path, rot_path,
                    max_dimension=MAX_DIMENSION,
                    camera_tilt=CAMERA_TILT,
                    fov=FOV,
                    dpi=DPI,
                    quiet=True,
                    rotation=angle
                )

                if success:
                    total_generated += 1
                else:
                    print(f"  [{item['id']}] FAILED to generate {angle}°")
                    total_failed += 1

        # Write updated index.json if modified
        if index_modified:
            with open(index_path, 'w', encoding='utf-8') as f:
                json.dump(library, f, indent=2, ensure_ascii=False)
                f.write('\n')
            print(f"  Updated index.json with {total_index_updated} new perspectiveImageUrl entries")

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Generated: {total_generated}")
    print(f"Skipped (already exist): {total_skipped}")
    print(f"Failed: {total_failed}")
    print(f"Index entries added: {total_index_updated}")
    print(f"{'='*60}")

    return total_failed == 0


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python generate_rotation_previews.py <libraries_dir>")
        sys.exit(1)

    libraries_dir = sys.argv[1]
    if not os.path.isdir(libraries_dir):
        print(f"Error: Directory not found: {libraries_dir}", file=sys.stderr)
        sys.exit(1)

    success = generate_all_perspectives(libraries_dir)
    sys.exit(0 if success else 1)
