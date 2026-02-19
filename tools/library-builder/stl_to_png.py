#!/usr/bin/env python3
"""
STL to PNG Renderer
Renders an STL file to a PNG image with top-down view using 2D projection
and normal-based shading for depth visualization.

Installation:
    pip install numpy-stl matplotlib numpy
"""

import numpy as np
from stl import mesh
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
import argparse
import os
import sys
from glob import glob

try:
    import trimesh
    from PIL import Image
except ImportError:
    trimesh = None
    Image = None


def debug_mesh_info(stl_mesh, quiet=False):
    """Print diagnostic info about the mesh geometry."""
    if quiet:
        return
    min_b = stl_mesh.min_
    max_b = stl_mesh.max_
    extents = max_b - min_b
    centroid = (min_b + max_b) / 2
    num_faces = len(stl_mesh.vectors)

    # Classify face normals by dominant direction
    normals = stl_mesh.normals.copy()
    norms = np.linalg.norm(normals, axis=1, keepdims=True)
    norms[norms == 0] = 1
    normals /= norms

    up = np.sum(normals[:, 2] > 0.9)
    down = np.sum(normals[:, 2] < -0.9)
    sideways = num_faces - up - down

    print(f"Mesh info:")
    print(f"  Bounds: X[{min_b[0]:.1f}, {max_b[0]:.1f}] Y[{min_b[1]:.1f}, {max_b[1]:.1f}] Z[{min_b[2]:.1f}, {max_b[2]:.1f}]")
    print(f"  Extents: {extents[0]:.1f} x {extents[1]:.1f} x {extents[2]:.1f} mm")
    print(f"  Centroid: ({centroid[0]:.1f}, {centroid[1]:.1f}, {centroid[2]:.1f})")
    print(f"  Faces: {num_faces} total — {up} up, {down} down, {sideways} side")


def render_stl_to_png(stl_path, output_path, max_dimension=800, dpi=100, quiet=False, rotation=0):
    """
    Render an STL file to a PNG image with top-down 2D projection.

    Args:
        stl_path: Path to input STL file
        output_path: Path to output PNG file
        max_dimension: Maximum width or height in pixels (default: 800)
        dpi: Dots per inch for output image
        quiet: If True, suppress verbose output (for batch mode)
    """
    try:
        # Load the STL file
        stl_mesh = mesh.Mesh.from_file(stl_path)

        # Print diagnostic info
        debug_mesh_info(stl_mesh, quiet=quiet)

        # Apply user rotation around Z-axis if specified
        if rotation != 0:
            angle_rad = np.radians(rotation)
            cos_a, sin_a = np.cos(angle_rad), np.sin(angle_rad)
            # Rotate vertices in-place (numpy-stl uses structured arrays)
            v = stl_mesh.vectors
            x_all = v[:, :, 0].copy()
            y_all = v[:, :, 1].copy()
            v[:, :, 0] = cos_a * x_all - sin_a * y_all
            v[:, :, 1] = sin_a * x_all + cos_a * y_all
            # Rotate normals in-place
            n = stl_mesh.normals
            nx = n[:, 0].copy()
            ny = n[:, 1].copy()
            n[:, 0] = cos_a * nx - sin_a * ny
            n[:, 1] = sin_a * nx + cos_a * ny
            # Invalidate numpy-stl cached bounds
            for attr in ('_min', '_max'):
                if hasattr(stl_mesh, attr):
                    delattr(stl_mesh, attr)

        # Get mesh bounds
        min_bounds = stl_mesh.min_
        max_bounds = stl_mesh.max_

        x_range = max_bounds[0] - min_bounds[0]
        y_range = max_bounds[1] - min_bounds[1]

        # Sort faces by average Z (painter's algorithm: draw lowest first)
        z_order = np.mean(stl_mesh.vectors[:, :, 2], axis=1)
        sort_idx = np.argsort(z_order)

        sorted_vectors = stl_mesh.vectors[sort_idx]
        sorted_normals = stl_mesh.normals[sort_idx]

        # Project to 2D: extract X,Y only
        polygons = sorted_vectors[:, :, :2]  # (N, 3, 2) — triangles in XY

        # Compute per-face shading from normals
        normals = sorted_normals.copy()
        norms = np.linalg.norm(normals, axis=1, keepdims=True)
        norms[norms == 0] = 1
        normals /= norms

        # Light from upper-left at 45° elevation
        el, az = np.radians(45), np.radians(225)
        light_dir = np.array([
            np.cos(el) * np.sin(az),
            np.cos(el) * np.cos(az),
            np.sin(el)
        ])
        light_dir /= np.linalg.norm(light_dir)

        ambient = 0.3
        diffuse = np.clip(np.dot(normals, light_dir), 0, 1)
        brightness = ambient + (1 - ambient) * diffuse

        base_color = np.array([0.7, 0.7, 0.75])
        face_colors = brightness[:, np.newaxis] * base_color
        # Add alpha channel (fully opaque faces)
        face_colors = np.column_stack([face_colors, np.ones(len(face_colors))])

        # Compute figure size from model aspect ratio
        aspect_ratio = x_range / y_range if y_range > 0 else 1.0
        if aspect_ratio >= 1.0:
            fig_width = max_dimension / dpi
            fig_height = (max_dimension / aspect_ratio) / dpi
        else:
            fig_width = (max_dimension * aspect_ratio) / dpi
            fig_height = max_dimension / dpi

        # Create 2D figure
        fig, ax = plt.subplots(figsize=(fig_width, fig_height), dpi=dpi)

        # Transparent background
        fig.patch.set_alpha(0)
        ax.patch.set_alpha(0)
        ax.set_axis_off()

        # Render with PolyCollection
        collection = PolyCollection(
            polygons,
            facecolors=face_colors,
            edgecolors=face_colors,
            linewidths=0.5,
        )
        ax.add_collection(collection)

        # Set axis limits with small padding
        pad_x = x_range * 0.02
        pad_y = y_range * 0.02
        ax.set_xlim(min_bounds[0] - pad_x, max_bounds[0] + pad_x)
        ax.set_ylim(min_bounds[1] - pad_y, max_bounds[1] + pad_y)
        ax.set_aspect('equal')

        # Remove all margins
        plt.subplots_adjust(left=0, right=1, top=1, bottom=0)

        # Save with transparency
        plt.savefig(output_path, bbox_inches='tight', pad_inches=0,
                    transparent=True, dpi=dpi)
        plt.close()

        actual_width = int(fig_width * dpi)
        actual_height = int(fig_height * dpi)
        if not quiet:
            print(f"Successfully rendered {stl_path} to {output_path}")
            print(f"Output dimensions: ~{actual_width}x{actual_height} pixels (aspect ratio: {aspect_ratio:.2f})")
        return True

    except FileNotFoundError:
        print(f"Error: STL file not found: {stl_path}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error rendering STL: {str(e)}", file=sys.stderr)
        return False


def render_stl_to_png_perspective(stl_path, output_path, max_dimension=800, camera_tilt=22.5,
                                   fov=45, dpi=100, quiet=False, rotation=0):
    """
    Render an STL file to a PNG image with 3D perspective using matplotlib.

    Uses matplotlib's mplot3d for headless 3D rendering — no OpenGL/pyglet required.

    Args:
        stl_path: Path to input STL file
        output_path: Path to output PNG file
        max_dimension: Maximum width or height in pixels (default: 800)
        camera_tilt: Camera tilt angle in degrees from top-down (default: 22.5)
        fov: Field of view in degrees (default: 45, unused — kept for API compat)
        dpi: Dots per inch for output image
        quiet: If True, suppress verbose output (for batch mode)
        rotation: Z-axis rotation in degrees (0, 90, 180, 270)

    Returns:
        True on success, False on failure
    """
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection

    try:
        # Use non-interactive backend for headless rendering
        import matplotlib
        matplotlib.use('Agg')

        stl_mesh = mesh.Mesh.from_file(stl_path)
        debug_mesh_info(stl_mesh, quiet=quiet)

        # Apply user rotation around Z-axis
        if rotation != 0:
            angle_rad = np.radians(rotation)
            cos_a, sin_a = np.cos(angle_rad), np.sin(angle_rad)
            v = stl_mesh.vectors
            x_all = v[:, :, 0].copy()
            y_all = v[:, :, 1].copy()
            v[:, :, 0] = cos_a * x_all - sin_a * y_all
            v[:, :, 1] = sin_a * x_all + cos_a * y_all
            n = stl_mesh.normals
            nx = n[:, 0].copy()
            ny = n[:, 1].copy()
            n[:, 0] = cos_a * nx - sin_a * ny
            n[:, 1] = sin_a * nx + cos_a * ny
            for attr in ('_min', '_max'):
                if hasattr(stl_mesh, attr):
                    delattr(stl_mesh, attr)

        min_b = stl_mesh.min_
        max_b = stl_mesh.max_
        extents = max_b - min_b

        # Compute per-face shading
        normals = stl_mesh.normals.copy()
        norms = np.linalg.norm(normals, axis=1, keepdims=True)
        norms[norms == 0] = 1
        normals /= norms

        # Light from upper-left at 45° elevation
        el, az = np.radians(45), np.radians(225)
        light_dir = np.array([
            np.cos(el) * np.sin(az),
            np.cos(el) * np.cos(az),
            np.sin(el)
        ])
        light_dir /= np.linalg.norm(light_dir)

        ambient = 0.3
        diffuse = np.clip(np.dot(normals, light_dir), 0, 1)
        brightness = ambient + (1 - ambient) * diffuse

        base_color = np.array([0.7, 0.7, 0.75])
        face_colors = brightness[:, np.newaxis] * base_color
        face_colors = np.column_stack([face_colors, np.ones(len(face_colors))])

        # Sort faces by distance from camera (painter's algorithm)
        # Camera elevation = 90 - camera_tilt (matplotlib convention)
        # Camera looks from azimuth = 0 (front), elevated above
        elev = 90 - camera_tilt  # e.g., 22.5° tilt → 67.5° elevation
        azim = -90  # Looking from front-left (matplotlib azimuth convention)

        # Approximate camera direction for depth sorting
        elev_rad = np.radians(elev)
        azim_rad = np.radians(azim)
        cam_dir = np.array([
            np.cos(elev_rad) * np.cos(azim_rad),
            np.cos(elev_rad) * np.sin(azim_rad),
            np.sin(elev_rad)
        ])
        centroids = np.mean(stl_mesh.vectors, axis=1)
        depths = np.dot(centroids, cam_dir)
        sort_idx = np.argsort(depths)

        sorted_vectors = stl_mesh.vectors[sort_idx]
        sorted_colors = face_colors[sort_idx]

        # Compute figure size from XY aspect ratio
        x_range = extents[0]
        y_range = extents[1]
        aspect_ratio = x_range / y_range if y_range > 0 else 1.0

        if aspect_ratio >= 1.0:
            fig_width = max_dimension / dpi
            fig_height = (max_dimension / aspect_ratio) / dpi
        else:
            fig_width = (max_dimension * aspect_ratio) / dpi
            fig_height = max_dimension / dpi

        fig = plt.figure(figsize=(fig_width, fig_height), dpi=dpi)
        ax = fig.add_subplot(111, projection='3d')

        # Transparent background
        fig.patch.set_alpha(0)
        ax.set_facecolor((0, 0, 0, 0))

        # Remove axes, ticks, grid, panes
        ax.set_axis_off()
        for pane in [ax.xaxis.pane, ax.yaxis.pane, ax.zaxis.pane]:
            pane.set_visible(False)

        # Add mesh polygons
        poly = Poly3DCollection(
            sorted_vectors,
            facecolors=sorted_colors,
            edgecolors=sorted_colors * [1, 1, 1, 0.3],  # Subtle edges
            linewidths=0.3,
        )
        ax.add_collection3d(poly)

        # Set axis limits with small padding
        pad = 0.02
        ax.set_xlim(min_b[0] - extents[0] * pad, max_b[0] + extents[0] * pad)
        ax.set_ylim(min_b[1] - extents[1] * pad, max_b[1] + extents[1] * pad)
        ax.set_zlim(min_b[2] - extents[2] * pad, max_b[2] + extents[2] * pad)

        # Set camera angle
        ax.view_init(elev=elev, azim=azim)

        # Remove all margins
        plt.subplots_adjust(left=0, right=1, top=1, bottom=0)

        plt.savefig(output_path, bbox_inches='tight', pad_inches=0,
                    transparent=True, dpi=dpi)
        plt.close()

        if not quiet:
            actual_width = int(fig_width * dpi)
            actual_height = int(fig_height * dpi)
            print(f"Successfully rendered {stl_path} to {output_path}")
            print(f"Output dimensions: ~{actual_width}x{actual_height} pixels (aspect ratio: {aspect_ratio:.2f})")
            print(f"Camera: tilt={camera_tilt}°, elev={elev}°, azim={azim}°")
        return True

    except FileNotFoundError:
        print(f"Error: STL file not found: {stl_path}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error rendering STL with perspective: {str(e)}", file=sys.stderr)
        import traceback
        if not quiet:
            traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Render an STL file to a PNG image. '
                    'Supports both perspective (shows walls/depth) and orthographic (flat top-down) modes. '
                    'Image dimensions automatically match model aspect ratio.'
    )
    parser.add_argument('stl_file', nargs='?', default=None,
                        help='Path to input STL file (omit with --batch)')
    parser.add_argument('-b', '--batch', nargs='?', const='.', default=None, metavar='DIR',
                        help='Process all .stl files in DIR (default: current directory)')
    parser.add_argument('-o', '--output', help='Path to output PNG file (default: input_name.png)')
    parser.add_argument('-s', '--size', type=int, default=800,
                        help='Maximum dimension in pixels (default: 800). '
                             'Other dimension scales to match model aspect ratio.')
    parser.add_argument('-d', '--dpi', type=int, default=100, help='DPI for output image (default: 100)')

    # Rendering mode options
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument('-p', '--perspective', action='store_true',
                           help='Use perspective rendering to show vertical features (default)')
    mode_group.add_argument('--orthographic', action='store_true',
                           help='Use orthographic (flat top-down) rendering')

    # Perspective-specific options
    parser.add_argument('--camera-tilt', type=float, default=22.5,
                       help='Camera tilt angle in degrees for perspective mode (default: 22.5)')
    parser.add_argument('--fov', type=float, default=45,
                       help='Field of view in degrees for perspective mode (default: 45)')
    parser.add_argument('--rotate', type=int, default=0, choices=[0, 90, 180, 270],
                       help='Additional Z-axis rotation in degrees (default: 0)')

    args = parser.parse_args()

    # Determine rendering mode (perspective is default)
    use_perspective = not args.orthographic

    # Validate argument combinations
    if args.batch is not None and args.stl_file:
        parser.error('Cannot use --batch with a positional STL file argument')
    if args.batch is not None and args.output:
        parser.error('Cannot use --output with --batch (output names are derived automatically)')
    if args.batch is None and args.stl_file is None:
        parser.error('Either provide an STL file or use --batch')

    # Check if perspective mode is available
    if use_perspective and (trimesh is None or Image is None):
        print("Warning: Perspective rendering requires trimesh and Pillow libraries.", file=sys.stderr)
        print("Install with: pip install trimesh pillow", file=sys.stderr)
        print("Falling back to orthographic rendering.", file=sys.stderr)
        use_perspective = False

    # Batch mode
    if args.batch is not None:
        stl_files = sorted(glob(os.path.join(args.batch, '*.stl')))
        if not stl_files:
            print(f'No .stl files found in {os.path.abspath(args.batch)}', file=sys.stderr)
            sys.exit(1)

        mode_str = "perspective" if use_perspective else "orthographic"
        print(f'Batch processing {len(stl_files)} STL file(s) in {os.path.abspath(args.batch)} ({mode_str} mode)...')
        successes = 0
        failures = 0

        for stl_file in stl_files:
            output_path = os.path.splitext(stl_file)[0] + '.png'
            if use_perspective:
                success = render_stl_to_png_perspective(
                    stl_file, output_path,
                    max_dimension=args.size,
                    camera_tilt=args.camera_tilt,
                    fov=args.fov,
                    dpi=args.dpi,
                    quiet=True,
                    rotation=args.rotate
                )
            else:
                success = render_stl_to_png(
                    stl_file, output_path,
                    max_dimension=args.size, dpi=args.dpi, quiet=True,
                    rotation=args.rotate
                )
            if success:
                print(f'  Rendered {stl_file} -> {output_path}')
                successes += 1
            else:
                print(f'  FAILED  {stl_file}', file=sys.stderr)
                failures += 1

        print(f'Done: {successes} succeeded, {failures} failed')
        sys.exit(0 if failures == 0 else 1)

    # Single-file mode
    if args.output is None:
        output_path = args.stl_file.rsplit('.', 1)[0] + '.png'
    else:
        output_path = args.output

    if use_perspective:
        success = render_stl_to_png_perspective(
            args.stl_file, output_path,
            max_dimension=args.size,
            camera_tilt=args.camera_tilt,
            fov=args.fov,
            dpi=args.dpi,
            rotation=args.rotate
        )
    else:
        success = render_stl_to_png(
            args.stl_file, output_path,
            max_dimension=args.size, dpi=args.dpi,
            rotation=args.rotate
        )

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
