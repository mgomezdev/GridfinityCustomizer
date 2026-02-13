#!/usr/bin/env python3
"""
Library Builder for Gridfinity Items
Automatically generates index.json files from folders of STL and 3MF files.

Supports:
- STL files (one file = one library entry)
- 3MF files with multiple objects (each object = separate library entry)
- Automatic dimension calculation from bounding boxes (42mm Gridfinity grid units)

Usage:
    python build_library.py [directory] [options]

Examples:
    python build_library.py                                    # Process current directory
    python build_library.py ./models --color blue              # Process models folder with blue color
    python build_library.py --non-interactive                  # Skip files with missing dimensions
    python build_library.py --library-name "my-library"        # Create subfolder for output files
    python build_library.py ./models -n "bins" --color red     # Create "bins" subfolder in models/

Installation:
    pip install -r requirements.txt

    Required: trimesh, lxml, networkx, numpy-stl, matplotlib, numpy
"""

import argparse
import json
import math
import os
import random
import re
import sys
import tempfile
from glob import glob
from stl_to_png import render_stl_to_png

try:
    import trimesh
except ImportError:
    trimesh = None


# Common color names to hex codes (using Tailwind CSS colors)
COLOR_MAP = {
    'blue': '#3B82F6',
    'green': '#10B981',
    'red': '#EF4444',
    'purple': '#A855F7',
    'yellow': '#F59E0B',
    'orange': '#F97316',
    'pink': '#EC4899',
    'indigo': '#6366F1',
    'teal': '#14B8A6',
    'cyan': '#06B6D4',
    'gray': '#6B7280',
    'grey': '#6B7280',
    'slate': '#64748B',
    'lime': '#84CC16',
    'emerald': '#10B981',
    'sky': '#0EA5E9',
    'violet': '#8B5CF6',
    'fuchsia': '#D946EF',
    'rose': '#F43F5E',
    'amber': '#F59E0B',
}


def align_geometry_xy_plane(geometry):
    """
    Align geometry in the XY plane to minimize bounding box area.
    Only rotates around Z-axis to keep the top-down view orientation.

    Args:
        geometry: trimesh geometry object

    Returns:
        None (modifies geometry in-place)
    """
    import numpy as np

    # Get vertices projected onto XY plane
    vertices = geometry.vertices[:, :2]  # Only X, Y coordinates

    if len(vertices) < 3:
        return  # Not enough vertices to align

    # Try rotations from 0 to 90 degrees (due to symmetry, only need 90°)
    # Find the rotation that minimizes bounding box area
    best_angle = 0
    best_area = float('inf')

    for angle_deg in range(0, 90, 1):  # Check every degree
        angle_rad = np.radians(angle_deg)
        cos_a = np.cos(angle_rad)
        sin_a = np.sin(angle_rad)

        # Rotation matrix (2D)
        rot_matrix = np.array([
            [cos_a, -sin_a],
            [sin_a, cos_a]
        ])

        # Rotate vertices
        rotated = vertices @ rot_matrix.T

        # Calculate bounding box area
        min_xy = rotated.min(axis=0)
        max_xy = rotated.max(axis=0)
        width = max_xy[0] - min_xy[0]
        height = max_xy[1] - min_xy[1]
        area = width * height

        if area < best_area:
            best_area = area
            best_angle = angle_deg

    # Apply the best rotation (only around Z-axis)
    if best_angle != 0:
        angle_rad = np.radians(best_angle)

        # 3D rotation matrix for Z-axis rotation
        rot_matrix_3d = np.array([
            [np.cos(angle_rad), -np.sin(angle_rad), 0, 0],
            [np.sin(angle_rad), np.cos(angle_rad), 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ])

        geometry.apply_transform(rot_matrix_3d)


def to_kebab_case(text):
    """
    Convert text to kebab-case format for IDs.

    Args:
        text: Input text (e.g., "Utensils 1x3.stl")

    Returns:
        Kebab-case string (e.g., "utensils-1x3")
    """
    # Remove file extension
    text = os.path.splitext(text)[0]
    # Convert to lowercase and replace spaces/underscores with hyphens
    text = text.lower().replace(' ', '-').replace('_', '-')
    # Remove any characters that aren't alphanumeric or hyphens
    text = re.sub(r'[^a-z0-9-]', '', text)
    # Replace multiple consecutive hyphens with a single hyphen
    text = re.sub(r'-+', '-', text)
    # Remove leading/trailing hyphens
    text = text.strip('-')
    return text


def extract_dimensions(filename):
    """
    Extract width and height dimensions from filename pattern.
    Looks for pattern like "1x3", "2x4", etc.

    Args:
        filename: Name of the file (e.g., "Utensils 1x3.stl")

    Returns:
        Tuple of (width, height) as integers, or (None, None) if not found
    """
    # Look for pattern like "1x3" or "2x4"
    match = re.search(r'(\d+)x(\d+)', filename, re.IGNORECASE)
    if match:
        width = int(match.group(1))
        height = int(match.group(2))
        return width, height
    return None, None


def generate_display_name(filename, width, height):
    """
    Generate a clean display name from filename.
    Format: "[width]x[height] [name]"

    Args:
        filename: Original filename (e.g., "Utensils 1x3.stl")
        width: Width in grid units
        height: Height in grid units

    Returns:
        Display name (e.g., "1x3 Utensils")
    """
    # Remove file extension
    name = os.path.splitext(filename)[0]
    # Remove dimension pattern from name
    name = re.sub(r'\s*\d+x\d+\s*', ' ', name, flags=re.IGNORECASE)
    # Clean up extra spaces
    name = ' '.join(name.split())
    # Format as "[dimensions] [name]"
    return f"{width}x{height} {name}".strip()


def parse_color_input(user_input):
    """
    Convert color name to hex code or validate hex code.

    Args:
        user_input: Color name (e.g., "blue") or hex code (e.g., "#3B82F6")

    Returns:
        Hex color code, or None if invalid
    """
    user_input = user_input.strip().lower()

    # Check if it's a color name in our map
    if user_input in COLOR_MAP:
        return COLOR_MAP[user_input]

    # Check if it's a hex code
    # Accept with or without # prefix
    if user_input.startswith('#'):
        hex_code = user_input
    else:
        hex_code = '#' + user_input

    # Validate hex code format (#RRGGBB)
    if re.match(r'^#[0-9A-Fa-f]{6}$', hex_code):
        return hex_code.upper()

    return None


def find_model_files(directory):
    """
    Find all STL and 3MF files in a directory.

    Args:
        directory: Path to directory to scan

    Returns:
        dict: {'stl': [sorted stl paths], '3mf': [sorted 3mf paths]}
    """
    stl_pattern = os.path.join(directory, '*.stl')
    mf3_pattern = os.path.join(directory, '*.3mf')
    return {
        'stl': sorted(glob(stl_pattern)),
        '3mf': sorted(glob(mf3_pattern))
    }


def calculate_gridfinity_dimensions(geometry):
    """
    Calculate Gridfinity grid dimensions from object bounding box.

    Args:
        geometry: trimesh.Trimesh object

    Returns:
        tuple: (width, height) in grid units

    Algorithm:
        1. Get bounding box extents [x, y, z] in mm
        2. Divide x and y by 42mm (Gridfinity grid unit)
        3. Round up to nearest integer (ceiling)
        4. Assign smaller value as width, larger as height
    """
    extents = geometry.extents  # [x, y, z] in mm
    x_units = math.ceil(extents[0] / 42.0)
    y_units = math.ceil(extents[1] / 42.0)

    # Smaller dimension is width
    width = min(x_units, y_units)
    height = max(x_units, y_units)

    return width, height


def generate_3mf_png_filename(mf3_basename, object_name, width, height):
    """
    Generate PNG filename for 3MF object.

    Format: [3mf_basename]_[object_name]_[WxH].png
    Example: "multi-model_Bin_1x3.png"
    """
    clean_obj_name = object_name.replace(' ', '_')
    return f"{mf3_basename}_{clean_obj_name}_{width}x{height}.png"


def generate_3mf_object_id(mf3_basename, object_name, width, height):
    """
    Generate unique kebab-case ID for 3MF object.

    Format: [3mf-basename]-[object-name]-[WxH]
    Example: "multi-model-bin-1x3"
    """
    combined = f"{mf3_basename} {object_name} {width}x{height}"
    return to_kebab_case(combined)


def generate_3mf_display_name(object_name, width, height):
    """
    Generate display name for 3MF object.

    Format: [WxH] [ObjectName]
    Example: "1x3 Bin"
    """
    clean_name = object_name.replace('_', ' ').strip()
    return f"{width}x{height} {clean_name}"


def prompt_for_dimensions(filename):
    """
    Interactively prompt user for dimensions when not found in filename.

    Args:
        filename: Name of the file

    Returns:
        Tuple of (width, height) as integers, or (None, None) if user cancels
    """
    print(f"\nDimensions not found in filename: {filename}")

    while True:
        try:
            width_input = input("Enter width (in grid units): ").strip()
            if not width_input:
                return None, None
            width = int(width_input)
            if width <= 0:
                print("Width must be a positive integer. Try again.")
                continue
            break
        except ValueError:
            print("Invalid input. Please enter a positive integer.")

    while True:
        try:
            height_input = input("Enter height (in grid units): ").strip()
            if not height_input:
                return None, None
            height = int(height_input)
            if height <= 0:
                print("Height must be a positive integer. Try again.")
                continue
            break
        except ValueError:
            print("Invalid input. Please enter a positive integer.")

    return width, height


def process_stl_file(stl_path, color_hex, output_dir=None, skip_existing_png=True, non_interactive=False):
    """
    Process a single STL file: extract dimensions, render PNG, return metadata.

    Args:
        stl_path: Path to STL file
        color_hex: Hex color code for the item
        output_dir: Directory for PNG output (default: same as STL)
        skip_existing_png: If True, skip rendering if PNG already exists
        non_interactive: If True, skip files with missing dimensions

    Returns:
        Dictionary with metadata, or None on failure
    """
    filename = os.path.basename(stl_path)

    # Extract dimensions from filename
    width, height = extract_dimensions(filename)

    if width is None or height is None:
        if non_interactive:
            print(f"  SKIPPED {filename} (dimensions not found, non-interactive mode)")
            return None
        else:
            width, height = prompt_for_dimensions(filename)
            if width is None or height is None:
                print(f"  SKIPPED {filename} (user cancelled)")
                return None
            print(f"  Using dimensions: {width}x{height}")
    else:
        print(f"  Found dimensions {width}x{height} in filename")

    # Load STL geometry to check orientation
    needs_rotation = False
    geometry = None
    if trimesh is not None:
        try:
            geometry = trimesh.load(stl_path)
        except Exception as e:
            print(f"  WARNING: Could not load geometry for orientation check: {e}")
            print(f"  Continuing with filename dimensions without rotation")

    # Check if rotation is needed
    if geometry is not None:
        # Calculate actual geometry dimensions
        extents = geometry.extents  # [x, y, z] in mm
        actual_x_units = math.ceil(extents[0] / 42.0)
        actual_y_units = math.ceil(extents[1] / 42.0)

        # Determine orientation from filename
        filename_is_landscape = width > height
        filename_is_portrait = height > width
        filename_is_square = width == height

        # Determine orientation from geometry
        geometry_is_landscape = actual_x_units > actual_y_units
        geometry_is_portrait = actual_y_units > actual_x_units
        geometry_is_square = actual_x_units == actual_y_units

        # Check if rotation needed (mismatch between filename and geometry)
        if not filename_is_square and not geometry_is_square:
            needs_rotation = (filename_is_landscape and geometry_is_portrait) or \
                            (filename_is_portrait and geometry_is_landscape)

    # Generate PNG filename with format: [name] [width]x[height].png
    base_name = os.path.splitext(filename)[0]
    # Remove existing dimension pattern if present
    base_name = re.sub(r'\s*\d+x\d+\s*', ' ', base_name, flags=re.IGNORECASE).strip()
    png_filename = f"{base_name} {width}x{height}.png"

    # Use output_dir if provided, otherwise use STL directory
    png_dir = output_dir if output_dir else os.path.dirname(stl_path)
    png_path = os.path.join(png_dir, png_filename)

    # Prepare STL path for rendering (may be rotated)
    stl_to_render = stl_path
    temp_stl_path = None

    if needs_rotation:
        print(f"  Rotating geometry to match {width}x{height} orientation")
        try:
            import numpy as np

            # 90-degree rotation matrix around Z-axis
            rotation_matrix = trimesh.transformations.rotation_matrix(
                np.radians(90), [0, 0, 1]
            )

            # Apply rotation
            geometry.apply_transform(rotation_matrix)

            # Export to temporary file
            temp_stl = tempfile.NamedTemporaryFile(suffix='.stl', delete=False)
            temp_stl.close()
            geometry.export(temp_stl.name, file_type='stl')
            temp_stl_path = temp_stl.name
            stl_to_render = temp_stl_path

            print(f"  Created rotated temporary STL")
        except Exception as e:
            print(f"  WARNING: Rotation failed: {e}")
            print(f"  Using original STL file")
            needs_rotation = False
            stl_to_render = stl_path

    # Check if PNG already exists
    if os.path.exists(png_path) and skip_existing_png:
        print(f"  PNG already exists, skipping render: {png_filename}")
    else:
        print(f"  Rendering PNG: {png_filename}")
        success = render_stl_to_png(
            stl_to_render, png_path,
            max_dimension=800, dpi=100, quiet=True
        )
        if not success:
            print(f"  FAILED to render {filename}")
            # Clean up temporary rotated STL if created
            if temp_stl_path and os.path.exists(temp_stl_path):
                try:
                    os.unlink(temp_stl_path)
                except:
                    pass
            return None

    # Clean up temporary rotated STL if created
    if temp_stl_path and os.path.exists(temp_stl_path):
        try:
            os.unlink(temp_stl_path)
        except:
            pass  # Ignore cleanup errors

    # Build metadata
    metadata = {
        'stl_file': filename,
        'png_file': png_filename,
        'width': width,
        'height': height,
        'color': color_hex
    }

    return metadata


def process_3mf_file(mf3_path, color_hex, output_dir=None, skip_existing_png=True, non_interactive=False):
    """
    Process a 3MF file with multiple objects.

    Args:
        mf3_path: Path to 3MF file
        color_hex: Hex color code
        output_dir: Directory for PNG output (default: same as 3MF)
        skip_existing_png: Skip rendering if PNG exists
        non_interactive: Skip objects without auto-detectable dimensions

    Returns:
        list[dict]: List of metadata dicts (one per object), empty on failure
    """
    if trimesh is None:
        print(f"  ERROR: trimesh library not installed. Install with: pip install trimesh lxml")
        return []

    mf3_filename = os.path.basename(mf3_path)
    mf3_basename = os.path.splitext(mf3_filename)[0]

    # Use output_dir if provided, otherwise use 3MF file's directory
    directory = output_dir if output_dir else (os.path.dirname(mf3_path) or '.')

    try:
        # Load 3MF file
        scene = trimesh.load(mf3_path)

        # Check if it's a Scene (multiple objects) or single geometry
        if hasattr(scene, 'geometry'):
            geometries = scene.geometry
        else:
            # Single object - wrap in dict
            geometries = {'Object': scene}

        if not geometries:
            print(f"  WARNING: No objects found in {mf3_filename}")
            return []

        metadata_list = []

        for obj_name, geometry in geometries.items():
            # Apply XY-plane alignment to ensure horizontal/vertical rendering
            try:
                align_geometry_xy_plane(geometry)
            except Exception as e:
                print(f"  WARNING: Could not align {obj_name}: {e}")
                # Continue with original geometry if alignment fails

            # Calculate dimensions from bounding box
            try:
                width, height = calculate_gridfinity_dimensions(geometry)
            except Exception as e:
                print(f"  ERROR calculating dimensions for {obj_name}: {e}")
                continue

            # Generate PNG filename
            png_filename = generate_3mf_png_filename(mf3_basename, obj_name, width, height)
            png_path = os.path.join(directory, png_filename)

            # Check if PNG already exists
            if os.path.exists(png_path) and skip_existing_png:
                print(f"    PNG already exists for {obj_name}, skipping render")
            else:
                # Export to temporary STL file
                temp_stl = None
                try:
                    temp_stl = tempfile.NamedTemporaryFile(suffix='.stl', delete=False)
                    temp_stl.close()

                    # Export geometry to STL
                    geometry.export(temp_stl.name, file_type='stl')

                    # Render with existing STL renderer
                    print(f"    Rendering PNG for {obj_name}: {png_filename}")
                    success = render_stl_to_png(
                        temp_stl.name, png_path,
                        max_dimension=800, dpi=100, quiet=True
                    )

                    if not success:
                        print(f"    FAILED to render {obj_name}")
                        continue

                finally:
                    # Always cleanup temp file
                    if temp_stl and os.path.exists(temp_stl.name):
                        try:
                            os.unlink(temp_stl.name)
                        except:
                            pass

            # Build metadata
            metadata = {
                'mf3_file': mf3_filename,
                'object_name': obj_name,
                'png_file': png_filename,
                'width': width,
                'height': height,
                'color': color_hex
            }
            metadata_list.append(metadata)

        return metadata_list

    except Exception as e:
        print(f"  ERROR loading 3MF file: {e}")
        return []


def build_library_item(stl_file, png_file, width, height, color_hex, custom_id=None, custom_name=None):
    """
    Create a library item dictionary from metadata.

    Args:
        stl_file: STL/3MF filename (for default ID generation)
        png_file: PNG filename
        width: Width in grid units
        height: Height in grid units
        color_hex: Hex color code
        custom_id: Override ID (used for 3MF objects)
        custom_name: Override display name (used for 3MF objects)

    Returns:
        Library item dictionary
    """
    item_id = custom_id if custom_id else to_kebab_case(stl_file)
    item_name = custom_name if custom_name else generate_display_name(stl_file, width, height)

    return {
        'id': item_id,
        'name': item_name,
        'widthUnits': width,
        'heightUnits': height,
        'color': color_hex,
        'categories': [],
        'imageUrl': png_file  # Just filename, not full path
    }


def generate_library_json(directory, color_hex=None, output_file='index.json',
                         library_name=None, skip_existing=True, non_interactive=False):
    """
    Main orchestration: scan directory, process STL and 3MF files, generate index.json.

    Args:
        directory: Directory to scan for model files
        color_hex: Pre-specified color hex code (or None to prompt)
        output_file: Output filename for library JSON
        library_name: Optional library name - creates subfolder for output
        skip_existing: Skip rendering if PNG already exists
        non_interactive: Skip files with missing dimensions

    Returns:
        True on success, False on failure
    """
    # Create output directory if library_name is provided
    output_dir = directory
    if library_name:
        output_dir = os.path.join(directory, library_name)
        os.makedirs(output_dir, exist_ok=True)
        print(f"Output directory: {os.path.abspath(output_dir)}")
        print()
    # Find all model files
    model_files = find_model_files(directory)
    stl_files = model_files['stl']
    mf3_files = model_files['3mf']

    total_files = len(stl_files) + len(mf3_files)

    if total_files == 0:
        print(f"No STL or 3MF files found in {os.path.abspath(directory)}")
        return False

    print(f"Found {len(stl_files)} STL file(s) and {len(mf3_files)} 3MF file(s) in {os.path.abspath(directory)}")
    print()

    # Pick random color if not provided
    if color_hex is None:
        color_name = random.choice(list(COLOR_MAP.keys()))
        color_hex = COLOR_MAP[color_name]
        print(f"No color specified - randomly selected: {color_name} ({color_hex})")
        print()

    # Process model files
    items = []
    successes = 0
    failures = 0
    file_count = 0

    # Process STL files
    for stl_path in stl_files:
        file_count += 1
        filename = os.path.basename(stl_path)
        print(f"[{file_count}/{total_files}] Processing {filename}...")

        metadata = process_stl_file(stl_path, color_hex, output_dir, skip_existing, non_interactive)

        if metadata is None:
            failures += 1
            continue

        # Build library item
        item = build_library_item(
            metadata['stl_file'],
            metadata['png_file'],
            metadata['width'],
            metadata['height'],
            metadata['color']
        )
        items.append(item)
        successes += 1
        print(f"  SUCCESS: Added {item['name']}")
        print()

    # Process 3MF files
    for mf3_path in mf3_files:
        file_count += 1
        mf3_filename = os.path.basename(mf3_path)
        mf3_basename = os.path.splitext(mf3_filename)[0]
        print(f"[{file_count}/{total_files}] Processing {mf3_filename}...")

        metadata_list = process_3mf_file(mf3_path, color_hex, output_dir, skip_existing, non_interactive)

        if not metadata_list:
            failures += 1
            continue

        print(f"  Found {len(metadata_list)} object(s) in 3MF file")

        for obj_idx, metadata in enumerate(metadata_list, 1):
            print(f"  [{obj_idx}/{len(metadata_list)}] {metadata['object_name']} ({metadata['width']}x{metadata['height']} units)")

            # Generate custom ID and name for 3MF objects
            custom_id = generate_3mf_object_id(
                mf3_basename,
                metadata['object_name'],
                metadata['width'],
                metadata['height']
            )
            custom_name = generate_3mf_display_name(
                metadata['object_name'],
                metadata['width'],
                metadata['height']
            )

            item = build_library_item(
                metadata['mf3_file'],
                metadata['png_file'],
                metadata['width'],
                metadata['height'],
                metadata['color'],
                custom_id=custom_id,
                custom_name=custom_name
            )
            items.append(item)
            successes += 1
            print(f"    SUCCESS: Added {item['name']}")

        print()

    # Build final library structure
    library = {
        'version': '1.0.0',
        'items': items
    }

    # Write to output file
    output_path = os.path.join(output_dir, output_file)
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(library, f, indent=2, ensure_ascii=False)
        print(f"Successfully wrote library to: {output_path}")
    except Exception as e:
        print(f"Error writing library file: {e}", file=sys.stderr)
        return False

    # Display summary
    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Successfully processed: {successes} item(s)")
    if failures > 0:
        print(f"Failed: {failures} item(s)")
    print(f"Output: {output_path}")
    print("=" * 60)

    return True


def main():
    parser = argparse.ArgumentParser(
        description='Generate index.json from a folder of STL files.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python build_library.py
  python build_library.py ./models --color blue
  python build_library.py --output my-library.json --skip-existing
  python build_library.py --non-interactive --color "#3B82F6"
  python build_library.py --library-name "my-bins" --color red
  python build_library.py ./models -n "storage" --color blue
        """
    )

    parser.add_argument('directory', nargs='?', default='.',
                        help='Directory containing STL files (default: current directory)')
    parser.add_argument('-o', '--output', default='index.json',
                        help='Output filename (default: index.json)')
    parser.add_argument('-c', '--color',
                        help='Color name or hex code (e.g., "blue" or "#3B82F6")')
    parser.add_argument('-n', '--library-name',
                        help='Library name - creates a subfolder for images and JSON')
    parser.add_argument('--skip-existing', action='store_true', default=True,
                        help='Skip rendering if PNG already exists (default: True)')
    parser.add_argument('--no-skip-existing', dest='skip_existing', action='store_false',
                        help='Always re-render PNGs even if they exist')
    parser.add_argument('--non-interactive', action='store_true',
                        help='Skip files with missing dimensions instead of prompting')

    args = parser.parse_args()

    # Validate directory
    if not os.path.isdir(args.directory):
        print(f"Error: Directory not found: {args.directory}", file=sys.stderr)
        sys.exit(1)

    # Parse color if provided
    color_hex = None
    if args.color:
        color_hex = parse_color_input(args.color)
        if color_hex is None:
            print(f"Error: Invalid color: {args.color}", file=sys.stderr)
            print("Use a color name (e.g., 'blue') or hex code (e.g., '#3B82F6')")
            sys.exit(1)

    # Generate library
    success = generate_library_json(
        args.directory,
        color_hex=color_hex,
        output_file=args.output,
        library_name=args.library_name,
        skip_existing=args.skip_existing,
        non_interactive=args.non_interactive
    )

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
