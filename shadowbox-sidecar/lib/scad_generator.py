import math
import re

# Gridfinity standard dimensions (mm)
GRID_PITCH = 42.0
CORNER_RADIUS = 3.75
BASE_HEIGHT = 5.0       # height of the bottom floor
WALL_THICKNESS = 2.35
STACKING_LIP_H = 2.15  # height of the top stacking lip
BIN_TOLERANCE = 0.25   # gap between bin outer wall and grid pitch


class SCADGenerator:
    def __init__(
        self,
        svg_path: str,
        thickness_mm: float,
        rotation_deg: float,
        tolerance_mm: float,
        stackable: bool,
        gridfinity_lib: str,
    ):
        self.svg_path = svg_path
        self.thickness_mm = thickness_mm
        self.rotation_deg = rotation_deg
        self.tolerance_mm = tolerance_mm
        self.stackable = stackable
        self.gridfinity_lib = gridfinity_lib

    def generate(self) -> tuple[str, int, int]:
        points = _parse_svg_path(self.svg_path)
        if len(points) < 3:
            raise ValueError("SVG path must have at least 3 points")

        # Apply rotation
        if self.rotation_deg:
            points = _rotate_points(points, self.rotation_deg)

        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        tool_w = max(xs) - min(xs)
        tool_h = max(ys) - min(ys)

        # Add tolerance to determine required grid cells
        padded_w = tool_w + self.tolerance_mm * 2 + WALL_THICKNESS * 2
        padded_h = tool_h + self.tolerance_mm * 2 + WALL_THICKNESS * 2

        grid_x = max(1, math.ceil(padded_w / GRID_PITCH))
        grid_y = max(1, math.ceil(padded_h / GRID_PITCH))

        bin_outer_w = grid_x * GRID_PITCH - BIN_TOLERANCE
        bin_outer_d = grid_y * GRID_PITCH - BIN_TOLERANCE
        total_height = BASE_HEIGHT + self.thickness_mm

        points_str = ", ".join(f"[{x:.3f}, {y:.3f}]" for x, y in points)

        scad = f"""\
// Auto-generated Gridfinity Shadowbox Bin
// Grid: {grid_x}x{grid_y}  Tool: {tool_w:.1f}x{tool_h:.1f} mm  Thickness: {self.thickness_mm} mm

$fa = $preview ? 10 : 2;
$fs = $preview ? 1 : 0.5;

GRID_X      = {grid_x};
GRID_Y      = {grid_y};
BIN_W       = {bin_outer_w:.3f};   // outer width  (mm)
BIN_D       = {bin_outer_d:.3f};   // outer depth  (mm)
TOTAL_H     = {total_height:.3f};  // total height (mm)
BASE_H      = {BASE_HEIGHT:.3f};   // floor thickness
CORNER_R    = {CORNER_RADIUS};
WALL_T      = {WALL_THICKNESS};
TOLERANCE   = {self.tolerance_mm:.3f};
STACKABLE   = {"true" if self.stackable else "false"};

// Tool polygon (centered at origin, in mm)
tool_points = [{points_str}];

// --- Modules ---

module rounded_rect(w, d, h, r) {{
    hull() {{
        for (dx = [-(w/2 - r), (w/2 - r)])
        for (dy = [-(d/2 - r), (d/2 - r)])
            translate([dx, dy, 0]) cylinder(r=r, h=h);
    }}
}}

module bin_body() {{
    rounded_rect(BIN_W, BIN_D, TOTAL_H, CORNER_R);
}}

module cavity() {{
    translate([0, 0, BASE_H - 0.01])
    linear_extrude(TOTAL_H - BASE_H + 0.02)
    offset(delta = TOLERANCE)
    polygon(tool_points);
}}

module magnet_holes() {{
    hole_d = 6.5;
    hole_h = 2.4;
    inset = 13;
    for (dx = [-(BIN_W/2 - inset), (BIN_W/2 - inset)])
    for (dy = [-(BIN_D/2 - inset), (BIN_D/2 - inset)])
        translate([dx, dy, 0])
            cylinder(d=hole_d, h=hole_h);
}}

module stacking_lip() {{
    lip_h = {STACKING_LIP_H};
    translate([0, 0, TOTAL_H - lip_h])
    difference() {{
        rounded_rect(BIN_W, BIN_D, lip_h, CORNER_R);
        rounded_rect(BIN_W - WALL_T*2, BIN_D - WALL_T*2, lip_h + 0.1, CORNER_R - WALL_T);
    }}
}}

// --- Main ---

difference() {{
    bin_body();
    cavity();
    magnet_holes();
}}

if (STACKABLE) {{
    stacking_lip();
}}
"""
        return scad, grid_x, grid_y


# --- Helpers ---

def _parse_svg_path(path: str) -> list[tuple[float, float]]:
    """Parse 'M x y L x y ... Z' into a list of (x, y) tuples."""
    tokens = path.strip().split()
    points: list[tuple[float, float]] = []
    i = 0
    while i < len(tokens):
        cmd = tokens[i]
        if cmd in ("M", "L"):
            i += 1
            x = float(tokens[i])
            i += 1
            y = float(tokens[i])
            points.append((x, y))
        elif cmd == "Z":
            pass  # close path — no new point needed
        else:
            # Bare numbers after a command (implicit repeat)
            try:
                x = float(cmd)
                i += 1
                y = float(tokens[i])
                points.append((x, y))
            except (ValueError, IndexError):
                pass
        i += 1
    return points


def _rotate_points(
    points: list[tuple[float, float]], deg: float
) -> list[tuple[float, float]]:
    rad = math.radians(deg)
    cos_a, sin_a = math.cos(rad), math.sin(rad)
    return [
        (x * cos_a - y * sin_a, x * sin_a + y * cos_a)
        for x, y in points
    ]
