#!/usr/bin/env python3
"""
Generate missing ortho and perspective preview images for library items.

Reads each library's index.json, which must have items with a "stlFile" field
pointing to the source STL. For each item, generates any missing:
  - Orthographic image (imageUrl)
  - Perspective image (perspectiveImageUrl)
  - Rotation variants (perspective at 90°, 180°, 270°)

Updates index.json with the generated image filenames.

Usage:
    python generate_images.py <libraries_dir>
    python generate_images.py <single_library_dir>
    python generate_images.py <libraries_dir> --force

Examples:
    python generate_images.py ../../public/libraries
    python generate_images.py ../../public/libraries/bins_standard
    python generate_images.py ../../public/libraries --force
"""

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))
from stl_to_png import render_stl_to_png, render_stl_to_png_perspective

MAX_DIMENSION = 800
DPI = 100
CAMERA_TILT = 22.5
FOV = 45
ROTATION_ANGLES = [90, 180, 270]


def derive_image_filenames(stl_file):
    """Derive ortho and perspective image filenames from the STL filename.

    Args:
        stl_file: STL filename (e.g. "bin_1x1.stl")

    Returns:
        Tuple of (ortho_filename, perspective_filename)
    """
    stem = Path(stl_file).stem
    return f"{stem}.png", f"{stem}-perspective.png"


def process_item(item, library_dir, force=False):
    """Process a single library item, generating any missing images.

    Args:
        item: Library item dict from index.json
        library_dir: Path to the library directory
        force: If True, regenerate even if files exist

    Returns:
        True if index.json entry was modified, False otherwise
    """
    item_id = item['id']
    stl_file = item.get('stlFile')

    if not stl_file:
        print(f"  [{item_id}] No stlFile defined, skipping")
        return False

    stl_path = os.path.join(library_dir, stl_file)
    if not os.path.exists(stl_path):
        print(f"  [{item_id}] STL file not found: {stl_file}, skipping")
        return False

    ortho_name, perspective_name = derive_image_filenames(stl_file)
    modified = False

    # --- Orthographic image ---
    ortho_path = os.path.join(library_dir, ortho_name)
    current_ortho = item.get('imageUrl')

    if force or not current_ortho or not os.path.exists(os.path.join(library_dir, current_ortho)):
        # Need to generate ortho
        if force or not os.path.exists(ortho_path):
            print(f"  [{item_id}] Generating ortho: {ortho_name}")
            success = render_stl_to_png(
                stl_path, ortho_path,
                max_dimension=MAX_DIMENSION, dpi=DPI, quiet=True
            )
            if not success:
                print(f"  [{item_id}] FAILED to generate ortho")
                return modified
        else:
            print(f"  [{item_id}] Ortho exists on disk: {ortho_name}")

        if current_ortho != ortho_name:
            item['imageUrl'] = ortho_name
            modified = True
    else:
        # imageUrl is set and file exists — check if file is on disk
        resolved = os.path.join(library_dir, current_ortho)
        if not os.path.exists(resolved):
            print(f"  [{item_id}] Ortho file missing on disk: {current_ortho}, regenerating")
            success = render_stl_to_png(
                stl_path, os.path.join(library_dir, current_ortho),
                max_dimension=MAX_DIMENSION, dpi=DPI, quiet=True
            )
            if not success:
                print(f"  [{item_id}] FAILED to regenerate ortho")

    # --- Perspective image ---
    perspective_path = os.path.join(library_dir, perspective_name)
    current_perspective = item.get('perspectiveImageUrl')

    if force or not current_perspective or not os.path.exists(os.path.join(library_dir, current_perspective)):
        if force or not os.path.exists(perspective_path):
            print(f"  [{item_id}] Generating perspective: {perspective_name}")
            success = render_stl_to_png_perspective(
                stl_path, perspective_path,
                max_dimension=MAX_DIMENSION,
                camera_tilt=CAMERA_TILT,
                fov=FOV,
                dpi=DPI,
                quiet=True,
                rotation=0
            )
            if not success:
                print(f"  [{item_id}] FAILED to generate perspective")
                return modified
        else:
            print(f"  [{item_id}] Perspective exists on disk: {perspective_name}")

        if current_perspective != perspective_name:
            item['perspectiveImageUrl'] = perspective_name
            modified = True

    # --- Rotation variants ---
    base_stem = Path(stl_file).stem
    for angle in ROTATION_ANGLES:
        rot_filename = f"{base_stem}-perspective-{angle}.png"
        rot_path = os.path.join(library_dir, rot_filename)

        if force or not os.path.exists(rot_path):
            print(f"  [{item_id}] Generating perspective {angle}°: {rot_filename}")
            success = render_stl_to_png_perspective(
                stl_path, rot_path,
                max_dimension=MAX_DIMENSION,
                camera_tilt=CAMERA_TILT,
                fov=FOV,
                dpi=DPI,
                quiet=True,
                rotation=angle
            )
            if not success:
                print(f"  [{item_id}] FAILED to generate perspective {angle}°")

    return modified


def process_library(library_dir, force=False):
    """Process a single library directory.

    Args:
        library_dir: Path to library directory containing index.json
        force: If True, regenerate all images

    Returns:
        Tuple of (generated_count, skipped_count, failed_count, index_updated)
    """
    index_path = os.path.join(library_dir, 'index.json')
    if not os.path.exists(index_path):
        return 0, 0, 0, False

    lib_name = os.path.basename(library_dir)
    print(f"\n{'=' * 60}")
    print(f"Processing library: {lib_name}")
    print(f"{'=' * 60}")

    with open(index_path, 'r', encoding='utf-8') as f:
        library = json.load(f)

    items = library.get('items', [])
    print(f"Found {len(items)} items")

    index_modified = False
    for item in items:
        if process_item(item, library_dir, force):
            index_modified = True

    if index_modified:
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(library, f, indent=2, ensure_ascii=False)
            f.write('\n')
        print(f"  Updated {index_path}")

    return index_modified


def process_all_libraries(libraries_dir, force=False):
    """Process all library directories under the given path.

    Args:
        libraries_dir: Path to the top-level libraries directory
        force: If True, regenerate all images

    Returns:
        True if all processing succeeded
    """
    # Check if this is a single library dir (has index.json)
    if os.path.exists(os.path.join(libraries_dir, 'index.json')):
        process_library(libraries_dir, force)
        return True

    # Otherwise, iterate subdirectories
    updated_count = 0
    for entry in sorted(os.listdir(libraries_dir)):
        lib_dir = os.path.join(libraries_dir, entry)
        if not os.path.isdir(lib_dir):
            continue
        if not os.path.exists(os.path.join(lib_dir, 'index.json')):
            continue
        if process_library(lib_dir, force):
            updated_count += 1

    print(f"\n{'=' * 60}")
    print(f"Done. {updated_count} index.json file(s) updated.")
    print(f"{'=' * 60}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description='Generate missing preview images for library items.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_images.py ../../public/libraries
  python generate_images.py ../../public/libraries/bins_standard
  python generate_images.py ../../public/libraries --force
        """
    )
    parser.add_argument('directory',
                        help='Libraries directory or single library directory')
    parser.add_argument('--force', action='store_true',
                        help='Regenerate all images even if they already exist')

    args = parser.parse_args()

    if not os.path.isdir(args.directory):
        print(f"Error: Directory not found: {args.directory}", file=sys.stderr)
        sys.exit(1)

    success = process_all_libraries(args.directory, force=args.force)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
