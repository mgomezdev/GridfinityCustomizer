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
from stl_to_png import render_stl_to_png, render_stl_to_png_perspective

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

# Configuration constants
GRIDFINITY_UNIT_MM = 42.0  # Standard Gridfinity grid unit size in millimeters
DEFAULT_PNG_MAX_DIMENSION = 800  # Maximum dimension for rendered PNG images
DEFAULT_PNG_DPI = 100  # DPI for PNG rendering
XY_ALIGNMENT_ANGLE_STEP = 1  # Degree step for XY plane alignment optimization
MAX_REASONABLE_GRID_UNITS = 50  # Sanity check for dimension validation
MAX_FILE_SIZE_MB = 500  # Maximum STL file size to process (in MB)

# Perspective rendering configuration
RENDER_BOTH_MODES = True  # Render both orthographic and perspective versions
PERSPECTIVE_CAMERA_TILT = 22.5  # Camera tilt angle in degrees (0° = top-down, 45° = isometric)
PERSPECTIVE_FOV = 45  # Field of view in degrees


def cleanup_temp_file(temp_path):
    """
    Safely cleanup temporary file, ignoring errors.

    Args:
        temp_path: Path to temporary file to delete
    """
    if temp_path and os.path.exists(temp_path):
        try:
            os.unlink(temp_path)
        except Exception:
            pass  # Ignore cleanup errors


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

    # Validate geometry has vertices
    if not hasattr(geometry, 'vertices'):
        print("  WARNING: Geometry has no vertices attribute, skipping alignment")
        return

    if len(geometry.vertices) < 3:
        return  # Not enough vertices to align

    # Get vertices projected onto XY plane
    try:
        vertices = geometry.vertices[:, :2]  # Only X, Y coordinates
    except (IndexError, ValueError, TypeError) as e:
        print(f"  WARNING: Cannot extract XY coordinates from vertices: {e}, skipping alignment")
        return

    # Try rotations from 0 to 90 degrees (due to symmetry, only need 90°)
    # Find the rotation that minimizes bounding box area
    best_angle = 0
    best_area = float('inf')

    for angle_deg in range(0, 90, XY_ALIGNMENT_ANGLE_STEP):  # Check every degree
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
        Tuple of (width, height) as integers, or (None, None) if not found or invalid
    """
    # Look for pattern like "1x3" or "2x4"
    match = re.search(r'(\d+)x(\d+)', filename, re.IGNORECASE)
    if match:
        width = int(match.group(1))
        height = int(match.group(2))

        # Validate dimensions
        if width == 0 or height == 0:
            print(f"  WARNING: Invalid zero dimension in filename '{filename}': {width}x{height}")
            return None, None

        if width > MAX_REASONABLE_GRID_UNITS or height > MAX_REASONABLE_GRID_UNITS:
            print(f"  WARNING: Unusually large dimensions in filename '{filename}': {width}x{height}")
            print(f"  Typical Gridfinity grids are 1-{MAX_REASONABLE_GRID_UNITS} units. Proceeding with caution.")

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

    Raises:
        ValueError: If extents are invalid or result in zero dimensions

    Algorithm:
        1. Get bounding box extents [x, y, z] in mm
        2. Divide x and y by 42mm (Gridfinity grid unit)
        3. Round up to nearest integer (ceiling)
        4. Assign smaller value as width, larger as height
    """
    try:
        extents = geometry.extents  # [x, y, z] in mm

        # Validate extents format
        if not hasattr(extents, '__len__') or len(extents) < 2:
            raise ValueError("Invalid extents format")

        # Check for valid numeric values
        if not all(isinstance(ext, (int, float)) for ext in extents[:2]):
            raise ValueError("Extents contain non-numeric values")

        # Check for NaN or infinity
        if not all(math.isfinite(ext) for ext in extents[:2]):
            raise ValueError("Extents contain NaN or infinity")

        # Check for positive values
        if extents[0] <= 0 or extents[1] <= 0:
            raise ValueError(f"Invalid extents (must be > 0): X={extents[0]:.2f}mm, Y={extents[1]:.2f}mm")

        # Check for unreasonably large values (sanity check)
        max_extent_mm = MAX_REASONABLE_GRID_UNITS * GRIDFINITY_UNIT_MM
        if extents[0] > max_extent_mm or extents[1] > max_extent_mm:
            print(f"  WARNING: Very large extents detected: {extents[0]:.1f}mm × {extents[1]:.1f}mm")
            print(f"  Verify that STL file units are in millimeters")

        x_units = math.ceil(extents[0] / GRIDFINITY_UNIT_MM)
        y_units = math.ceil(extents[1] / GRIDFINITY_UNIT_MM)

        # Final sanity check
        if x_units == 0 or y_units == 0:
            raise ValueError(f"Calculated dimensions are zero: {x_units}x{y_units} units")

        # Smaller dimension is width
        width = min(x_units, y_units)
        height = max(x_units, y_units)

        return width, height

    except (AttributeError, TypeError, IndexError) as e:
        raise ValueError(f"Failed to access geometry extents: {e}")
    except Exception as e:
        raise ValueError(f"Failed to calculate dimensions: {e}")


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


def process_stl_file(stl_path, color_hex, output_dir=None, skip_existing_png=True, non_interactive=False,
                     render_both=None, camera_tilt=None, fov=None, rotation=0):
    """
    Process a single STL file: extract dimensions, render PNG(s), return metadata.

    Args:
        stl_path: Path to STL file
        color_hex: Hex color code for the item
        output_dir: Directory for PNG output (default: same as STL)
        skip_existing_png: If True, skip rendering if PNG already exists
        non_interactive: If True, skip files with missing dimensions
        render_both: If True, render both orthographic and perspective; if False, render orthographic only; if None, use default
        camera_tilt: Camera tilt angle in degrees (for perspective mode)
        fov: Field of view in degrees (for perspective mode)

    Returns:
        Dictionary with metadata, or None on failure
    """
    # Use default values if not specified
    if render_both is None:
        render_both = RENDER_BOTH_MODES
    if camera_tilt is None:
        camera_tilt = PERSPECTIVE_CAMERA_TILT
    if fov is None:
        fov = PERSPECTIVE_FOV
    filename = os.path.basename(stl_path)

    # Check file size
    try:
        file_size = os.path.getsize(stl_path)
        if file_size == 0:
            print(f"  ERROR: File is empty (0 bytes)")
            return None

        file_size_mb = file_size / (1024 * 1024)
        if file_size_mb > MAX_FILE_SIZE_MB:
            print(f"  WARNING: Very large file ({file_size_mb:.1f} MB)")
            print(f"  Processing may be slow or fail due to memory constraints")
    except OSError as e:
        print(f"  ERROR: Cannot read file: {e}")
        return None

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
        actual_x_units = math.ceil(extents[0] / GRIDFINITY_UNIT_MM)
        actual_y_units = math.ceil(extents[1] / GRIDFINITY_UNIT_MM)

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

    # Generate PNG filenames with format: [name] [width]x[height].png
    base_name = os.path.splitext(filename)[0]
    # Remove existing dimension pattern if present
    base_name = re.sub(r'\s*\d+x\d+\s*', ' ', base_name, flags=re.IGNORECASE).strip()

    # Orthographic version (for backwards compatibility)
    png_filename_ortho = f"{base_name} {width}x{height}.png"
    # Perspective version (optional)
    png_filename_persp = f"{base_name} {width}x{height}-perspective.png"

    # Use output_dir if provided, otherwise use STL directory
    png_dir = output_dir if output_dir else os.path.dirname(stl_path)
    png_path_ortho = os.path.join(png_dir, png_filename_ortho)
    png_path_persp = os.path.join(png_dir, png_filename_persp)

    # Prepare STL path for rendering (may be rotated)
    stl_to_render = stl_path
    temp_stl_path = None

    if needs_rotation:
        print(f"  Rotating geometry to match {width}x{height} orientation")
        temp_stl_fd = None
        try:
            import numpy as np

            # 90-degree rotation matrix around Z-axis
            rotation_matrix = trimesh.transformations.rotation_matrix(
                np.radians(90), [0, 0, 1]
            )

            # Apply rotation
            geometry.apply_transform(rotation_matrix)

            # Create temporary file
            try:
                temp_stl_fd = tempfile.NamedTemporaryFile(suffix='.stl', delete=False)
                temp_stl_path = temp_stl_fd.name
                temp_stl_fd.close()
            except (OSError, PermissionError) as e:
                print(f"  ERROR: Cannot create temporary file: {e}")
                raise

            # Export to temporary file (cleanup on failure)
            try:
                geometry.export(temp_stl_path, file_type='stl')
                stl_to_render = temp_stl_path
                print(f"  Created rotated temporary STL")
            except Exception as export_error:
                # Clean up immediately on export failure
                cleanup_temp_file(temp_stl_path)
                temp_stl_path = None
                raise export_error

        except Exception as e:
            print(f"  WARNING: Rotation failed: {e}")
            print(f"  Using original STL file")
            needs_rotation = False
            stl_to_render = stl_path
            temp_stl_path = None  # Ensure cleanup doesn't fail

    # Apply additional user-specified Z-axis rotation
    if rotation != 0:
        if geometry is not None:
            try:
                import numpy as np
                print(f"  Applying {rotation}° user rotation")
                user_rot_matrix = trimesh.transformations.rotation_matrix(
                    np.radians(rotation), [0, 0, 1]
                )
                geometry.apply_transform(user_rot_matrix)

                # Export rotated geometry to temp STL
                if temp_stl_path is None:
                    temp_stl_fd = tempfile.NamedTemporaryFile(suffix='.stl', delete=False)
                    temp_stl_path = temp_stl_fd.name
                    temp_stl_fd.close()

                geometry.export(temp_stl_path, file_type='stl')
                stl_to_render = temp_stl_path
            except Exception as e:
                print(f"  WARNING: User rotation failed: {e}")
                print(f"  Rendering without user rotation")
        else:
            print(f"  WARNING: Cannot apply user rotation (geometry not loaded)")

    # Render orthographic version (always, for backwards compatibility)
    if os.path.exists(png_path_ortho) and skip_existing_png:
        print(f"  Orthographic PNG already exists, skipping: {png_filename_ortho}")
    else:
        print(f"  Rendering orthographic PNG: {png_filename_ortho}")
        success_ortho = render_stl_to_png(
            stl_to_render, png_path_ortho,
            max_dimension=DEFAULT_PNG_MAX_DIMENSION, dpi=DEFAULT_PNG_DPI, quiet=True
        )
        if not success_ortho:
            print(f"  FAILED to render orthographic version of {filename}")
            cleanup_temp_file(temp_stl_path)
            return None

    # Render perspective version (optional)
    perspective_filename = None
    if render_both:
        if os.path.exists(png_path_persp) and skip_existing_png:
            print(f"  Perspective PNG already exists, skipping: {png_filename_persp}")
            perspective_filename = png_filename_persp
        else:
            print(f"  Rendering perspective PNG: {png_filename_persp}")
            success_persp = render_stl_to_png_perspective(
                stl_to_render, png_path_persp,
                max_dimension=DEFAULT_PNG_MAX_DIMENSION,
                camera_tilt=camera_tilt,
                fov=fov,
                dpi=DEFAULT_PNG_DPI,
                quiet=True
            )
            if success_persp:
                perspective_filename = png_filename_persp
            else:
                print(f"  WARNING: Failed to render perspective version, continuing with orthographic only")

    # Render rotation perspective variants (90°, 180°, 270°)
    if render_both and perspective_filename:
        for rot_angle in [90, 180, 270]:
            rot_filename = f"{base_name} {width}x{height}-perspective-{rot_angle}.png"
            rot_path = os.path.join(png_dir, rot_filename)
            if os.path.exists(rot_path) and skip_existing_png:
                print(f"  Perspective {rot_angle}° already exists, skipping: {rot_filename}")
            else:
                print(f"  Rendering perspective {rot_angle}° PNG: {rot_filename}")
                render_stl_to_png_perspective(
                    stl_to_render, rot_path,
                    max_dimension=DEFAULT_PNG_MAX_DIMENSION,
                    camera_tilt=camera_tilt,
                    fov=fov,
                    dpi=DEFAULT_PNG_DPI,
                    quiet=True,
                    rotation=rot_angle
                )

    # Clean up temporary rotated STL if created
    cleanup_temp_file(temp_stl_path)

    # Build metadata
    metadata = {
        'stl_file': filename,
        'png_file': png_filename_ortho,  # Orthographic for backwards compatibility
        'png_file_perspective': perspective_filename,  # Perspective version (optional)
        'width': width,
        'height': height,
        'color': color_hex
    }

    return metadata


def process_3mf_file(mf3_path, color_hex, output_dir=None, skip_existing_png=True, non_interactive=False,
                     render_both=None, camera_tilt=None, fov=None, rotation=0):
    """
    Process a 3MF file with multiple objects.

    Args:
        mf3_path: Path to 3MF file
        color_hex: Hex color code
        output_dir: Directory for PNG output (default: same as 3MF)
        skip_existing_png: Skip rendering if PNG exists
        non_interactive: Skip objects without auto-detectable dimensions
        render_both: If True, render both orthographic and perspective; if False, render orthographic only; if None, use default
        camera_tilt: Camera tilt angle in degrees (for perspective mode)
        fov: Field of view in degrees (for perspective mode)

    Returns:
        list[dict]: List of metadata dicts (one per object), empty on failure
    """
    # Use default values if not specified
    if render_both is None:
        render_both = RENDER_BOTH_MODES
    if camera_tilt is None:
        camera_tilt = PERSPECTIVE_CAMERA_TILT
    if fov is None:
        fov = PERSPECTIVE_FOV
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

            # Apply additional user-specified Z-axis rotation (after dimension calculation)
            if rotation != 0:
                try:
                    import numpy as np
                    user_rot_matrix = trimesh.transformations.rotation_matrix(
                        np.radians(rotation), [0, 0, 1]
                    )
                    geometry.apply_transform(user_rot_matrix)
                except Exception as e:
                    print(f"    WARNING: User rotation failed for {obj_name}: {e}")

            # Generate PNG filenames
            # Orthographic (for backwards compatibility)
            png_filename_ortho = generate_3mf_png_filename(mf3_basename, obj_name, width, height)
            # Perspective version
            png_filename_persp = f"{os.path.splitext(png_filename_ortho)[0]}-perspective.png"

            png_path_ortho = os.path.join(directory, png_filename_ortho)
            png_path_persp = os.path.join(directory, png_filename_persp)

            # Render orthographic version (always, for backwards compatibility)
            if os.path.exists(png_path_ortho) and skip_existing_png:
                print(f"    Orthographic PNG already exists for {obj_name}, skipping")
            else:
                # Export to temporary STL file
                temp_stl_name = None
                try:
                    try:
                        temp_stl = tempfile.NamedTemporaryFile(suffix='.stl', delete=False)
                        temp_stl_name = temp_stl.name
                        temp_stl.close()
                    except (OSError, PermissionError) as e:
                        print(f"    ERROR: Cannot create temporary file: {e}")
                        print(f"    Skipping {obj_name}")
                        continue

                    # Export geometry to STL
                    geometry.export(temp_stl_name, file_type='stl')

                    # Render orthographic version
                    print(f"    Rendering orthographic PNG for {obj_name}: {png_filename_ortho}")
                    success_ortho = render_stl_to_png(
                        temp_stl_name, png_path_ortho,
                        max_dimension=DEFAULT_PNG_MAX_DIMENSION, dpi=DEFAULT_PNG_DPI, quiet=True
                    )

                    if not success_ortho:
                        print(f"    FAILED to render orthographic version of {obj_name}")
                        continue

                finally:
                    # Always cleanup temp file
                    cleanup_temp_file(temp_stl_name)

            # Render perspective version (optional)
            perspective_filename = None
            if render_both:
                if os.path.exists(png_path_persp) and skip_existing_png:
                    print(f"    Perspective PNG already exists for {obj_name}, skipping")
                    perspective_filename = png_filename_persp
                else:
                    # Export to temporary STL file again for perspective rendering
                    temp_stl_name = None
                    try:
                        try:
                            temp_stl = tempfile.NamedTemporaryFile(suffix='.stl', delete=False)
                            temp_stl_name = temp_stl.name
                            temp_stl.close()
                        except (OSError, PermissionError) as e:
                            print(f"    WARNING: Cannot create temporary file for perspective: {e}")
                            print(f"    Skipping perspective rendering for {obj_name}")
                        else:
                            # Export geometry to STL
                            geometry.export(temp_stl_name, file_type='stl')

                            # Render perspective version
                            print(f"    Rendering perspective PNG for {obj_name}: {png_filename_persp}")
                            success_persp = render_stl_to_png_perspective(
                                temp_stl_name, png_path_persp,
                                max_dimension=DEFAULT_PNG_MAX_DIMENSION,
                                camera_tilt=camera_tilt,
                                fov=fov,
                                dpi=DEFAULT_PNG_DPI,
                                quiet=True
                            )

                            if success_persp:
                                perspective_filename = png_filename_persp
                            else:
                                print(f"    WARNING: Failed to render perspective version of {obj_name}")

                    finally:
                        # Always cleanup temp file
                        cleanup_temp_file(temp_stl_name)

            # Render rotation perspective variants (90°, 180°, 270°)
            if render_both and perspective_filename:
                for rot_angle in [90, 180, 270]:
                    rot_filename = f"{os.path.splitext(png_filename_ortho)[0]}-perspective-{rot_angle}.png"
                    rot_path = os.path.join(directory, rot_filename)
                    if os.path.exists(rot_path) and skip_existing_png:
                        print(f"    Perspective {rot_angle}° already exists for {obj_name}, skipping")
                    else:
                        temp_stl_name = None
                        try:
                            temp_stl = tempfile.NamedTemporaryFile(suffix='.stl', delete=False)
                            temp_stl_name = temp_stl.name
                            temp_stl.close()
                            geometry.export(temp_stl_name, file_type='stl')
                            print(f"    Rendering perspective {rot_angle}° PNG for {obj_name}: {rot_filename}")
                            render_stl_to_png_perspective(
                                temp_stl_name, rot_path,
                                max_dimension=DEFAULT_PNG_MAX_DIMENSION,
                                camera_tilt=camera_tilt,
                                fov=fov,
                                dpi=DEFAULT_PNG_DPI,
                                quiet=True,
                                rotation=rot_angle
                            )
                        except Exception as e:
                            print(f"    WARNING: Failed rotation {rot_angle}° for {obj_name}: {e}")
                        finally:
                            cleanup_temp_file(temp_stl_name)

            # Build metadata
            metadata = {
                'mf3_file': mf3_filename,
                'object_name': obj_name,
                'png_file': png_filename_ortho,  # Orthographic for backwards compatibility
                'png_file_perspective': perspective_filename,  # Perspective version (optional)
                'width': width,
                'height': height,
                'color': color_hex
            }
            metadata_list.append(metadata)

        return metadata_list

    except Exception as e:
        print(f"  ERROR loading 3MF file: {e}")
        return []


def build_library_item(stl_file, png_file, width, height, color_hex, custom_id=None, custom_name=None,
                       png_file_perspective=None):
    """
    Create a library item dictionary from metadata.

    Args:
        stl_file: STL/3MF filename (for default ID generation)
        png_file: PNG filename (orthographic)
        width: Width in grid units
        height: Height in grid units
        color_hex: Hex color code
        custom_id: Override ID (used for 3MF objects)
        custom_name: Override display name (used for 3MF objects)
        png_file_perspective: Optional perspective PNG filename

    Returns:
        Library item dictionary
    """
    item_id = custom_id if custom_id else to_kebab_case(stl_file)
    item_name = custom_name if custom_name else generate_display_name(stl_file, width, height)

    item = {
        'id': item_id,
        'name': item_name,
        'widthUnits': width,
        'heightUnits': height,
        'color': color_hex,
        'categories': [],
        'stlFile': stl_file,
        'imageUrl': png_file  # Orthographic (backwards compatible)
    }

    # Add perspective image URL if available
    if png_file_perspective:
        item['perspectiveImageUrl'] = png_file_perspective

    return item


def generate_library_json(directory, color_hex=None, output_file='index.json',
                         library_name=None, skip_existing=True, non_interactive=False,
                         render_both=None, camera_tilt=None, fov=None, rotation=0):
    """
    Main orchestration: scan directory, process STL and 3MF files, generate index.json.

    Args:
        directory: Directory to scan for model files
        color_hex: Pre-specified color hex code (or None to prompt)
        output_file: Output filename for library JSON
        library_name: Optional library name - creates subfolder for output
        skip_existing: Skip rendering if PNG already exists
        non_interactive: Skip files with missing dimensions
        render_both: If True, render both orthographic and perspective; if False, orthographic only; if None, use default
        camera_tilt: Camera tilt angle in degrees (for perspective mode)
        fov: Field of view in degrees (for perspective mode)

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

        metadata = process_stl_file(stl_path, color_hex, output_dir, skip_existing, non_interactive,
                                   render_both, camera_tilt, fov, rotation)

        if metadata is None:
            failures += 1
            continue

        # Build library item
        item = build_library_item(
            metadata['stl_file'],
            metadata['png_file'],
            metadata['width'],
            metadata['height'],
            metadata['color'],
            png_file_perspective=metadata.get('png_file_perspective')
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

        metadata_list = process_3mf_file(mf3_path, color_hex, output_dir, skip_existing, non_interactive,
                                        render_both, camera_tilt, fov, rotation)

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
                custom_name=custom_name,
                png_file_perspective=metadata.get('png_file_perspective')
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
    except PermissionError:
        print(f"ERROR: Permission denied writing to: {output_path}", file=sys.stderr)
        print(f"Check file permissions or try a different output directory.", file=sys.stderr)
        return False
    except OSError as e:
        print(f"ERROR: Cannot write file: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"ERROR: Unexpected error writing library file: {e}", file=sys.stderr)
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


def update_library_item(item, library_dir, force=False):
    """Generate missing images for a single library item in update mode.

    Reads the item's stlFile, derives expected image filenames, and renders
    any that are missing (or all of them when force=True).

    Args:
        item: Library item dict from index.json
        library_dir: Path to the library directory
        force: If True, regenerate even if files exist

    Returns:
        True if the index.json entry was modified, False otherwise
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

    base_stem = os.path.splitext(stl_file)[0]
    ortho_name = f"{base_stem}.png"
    perspective_name = f"{base_stem}-perspective.png"
    modified = False

    # --- Orthographic image ---
    ortho_path = os.path.join(library_dir, ortho_name)
    current_ortho = item.get('imageUrl')

    if force or not current_ortho or not os.path.exists(os.path.join(library_dir, current_ortho)):
        if force or not os.path.exists(ortho_path):
            print(f"  [{item_id}] Generating ortho: {ortho_name}")
            success = render_stl_to_png(
                stl_path, ortho_path,
                max_dimension=DEFAULT_PNG_MAX_DIMENSION, dpi=DEFAULT_PNG_DPI, quiet=True
            )
            if not success:
                print(f"  [{item_id}] FAILED to generate ortho")
                return modified
        else:
            print(f"  [{item_id}] Ortho exists on disk: {ortho_name}")

        if current_ortho != ortho_name:
            item['imageUrl'] = ortho_name
            modified = True

    # --- Perspective image ---
    perspective_path = os.path.join(library_dir, perspective_name)
    current_perspective = item.get('perspectiveImageUrl')

    if force or not current_perspective or not os.path.exists(os.path.join(library_dir, current_perspective)):
        if force or not os.path.exists(perspective_path):
            print(f"  [{item_id}] Generating perspective: {perspective_name}")
            success = render_stl_to_png_perspective(
                stl_path, perspective_path,
                max_dimension=DEFAULT_PNG_MAX_DIMENSION,
                camera_tilt=PERSPECTIVE_CAMERA_TILT,
                fov=PERSPECTIVE_FOV,
                dpi=DEFAULT_PNG_DPI,
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

    # --- Rotation variants (90°, 180°, 270°) ---
    for angle in [90, 180, 270]:
        rot_filename = f"{base_stem}-perspective-{angle}.png"
        rot_path = os.path.join(library_dir, rot_filename)

        if force or not os.path.exists(rot_path):
            print(f"  [{item_id}] Generating perspective {angle}°: {rot_filename}")
            success = render_stl_to_png_perspective(
                stl_path, rot_path,
                max_dimension=DEFAULT_PNG_MAX_DIMENSION,
                camera_tilt=PERSPECTIVE_CAMERA_TILT,
                fov=PERSPECTIVE_FOV,
                dpi=DEFAULT_PNG_DPI,
                quiet=True,
                rotation=angle
            )
            if not success:
                print(f"  [{item_id}] FAILED to generate perspective {angle}°")

    return modified


def update_library(library_dir, force=False):
    """Update images for all items in a single library directory.

    Reads index.json, generates any missing images, and rewrites index.json
    if any imageUrl/perspectiveImageUrl fields were added or corrected.

    Args:
        library_dir: Path to library directory containing index.json
        force: If True, regenerate all images

    Returns:
        True if index.json was modified, False otherwise
    """
    index_path = os.path.join(library_dir, 'index.json')
    if not os.path.exists(index_path):
        return False

    lib_name = os.path.basename(library_dir)
    print(f"\n{'=' * 60}")
    print(f"Updating library: {lib_name}")
    print(f"{'=' * 60}")

    with open(index_path, 'r', encoding='utf-8') as f:
        library = json.load(f)

    items = library.get('items', [])
    print(f"Found {len(items)} items")

    index_modified = False
    for item in items:
        if update_library_item(item, library_dir, force):
            index_modified = True

    if index_modified:
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(library, f, indent=2, ensure_ascii=False)
            f.write('\n')
        print(f"  Updated {index_path}")

    return index_modified


def update_all_libraries(libraries_dir, force=False):
    """Update images for all libraries under the given path.

    If libraries_dir itself contains an index.json, treats it as a single
    library. Otherwise iterates all subdirectories that have an index.json.

    Args:
        libraries_dir: Path to a library directory or parent of multiple libraries
        force: If True, regenerate all images

    Returns:
        True on success
    """
    # Single library dir (has its own index.json)
    if os.path.exists(os.path.join(libraries_dir, 'index.json')):
        update_library(libraries_dir, force)
        return True

    # Parent directory — iterate each subdirectory with an index.json
    updated_count = 0
    for entry in sorted(os.listdir(libraries_dir)):
        lib_dir = os.path.join(libraries_dir, entry)
        if not os.path.isdir(lib_dir):
            continue
        if not os.path.exists(os.path.join(lib_dir, 'index.json')):
            continue
        if update_library(lib_dir, force):
            updated_count += 1

    print(f"\n{'=' * 60}")
    print(f"Done. {updated_count} index.json file(s) updated.")
    print(f"{'=' * 60}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description='Generate index.json from a folder of STL files, or update images for existing libraries.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python build_library.py
  python build_library.py ./models --color blue
  python build_library.py --output my-library.json --skip-existing
  python build_library.py --non-interactive --color "#3B82F6"
  python build_library.py --library-name "my-bins" --color red
  python build_library.py ./models -n "storage" --color blue

  # Update mode: regenerate missing images for existing libraries
  python build_library.py ../../public/libraries --update
  python build_library.py ../../public/libraries/bins_standard --update
  python build_library.py ../../public/libraries --update --force
        """
    )

    parser.add_argument('directory', nargs='?', default='.',
                        help='Directory containing STL files, or libraries root (default: current directory)')
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

    # Update mode
    parser.add_argument('--update', action='store_true',
                        help='Update mode: read existing index.json files and generate missing images')
    parser.add_argument('--force', action='store_true',
                        help='Force regeneration of all images (use with --update)')

    # Rendering mode options
    parser.add_argument('--both-modes', action='store_true', default=None,
                       help='Render both orthographic and perspective versions (default)')
    parser.add_argument('--orthographic-only', action='store_true',
                       help='Render only orthographic version (no perspective)')

    # Perspective-specific options
    parser.add_argument('--camera-tilt', type=float, default=None,
                       help=f'Camera tilt angle in degrees for perspective mode (default: {PERSPECTIVE_CAMERA_TILT})')
    parser.add_argument('--fov', type=float, default=None,
                       help=f'Field of view in degrees for perspective mode (default: {PERSPECTIVE_FOV})')
    parser.add_argument('--rotate', type=int, default=0, choices=[0, 90, 180, 270],
                       help='Additional Z-axis rotation in degrees applied after auto-alignment (default: 0)')

    args = parser.parse_args()

    # Validate directory
    if not os.path.isdir(args.directory):
        print(f"Error: Directory not found: {args.directory}", file=sys.stderr)
        sys.exit(1)

    # --- Update mode ---
    if args.update:
        success = update_all_libraries(args.directory, force=args.force)
        sys.exit(0 if success else 1)

    # --- Build mode ---

    # Parse color if provided
    color_hex = None
    if args.color:
        color_hex = parse_color_input(args.color)
        if color_hex is None:
            print(f"Error: Invalid color: {args.color}", file=sys.stderr)
            print("Use a color name (e.g., 'blue') or hex code (e.g., '#3B82F6')")
            sys.exit(1)

    # Determine rendering mode
    render_both = None  # Use default from constant
    if args.orthographic_only:
        render_both = False
    elif args.both_modes:
        render_both = True

    # Generate library
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
        rotation=args.rotate
    )

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
