# Gridfinity Library Builder

Automatically generate library index files from folders of STL and 3MF files for Gridfinity organizer systems.

## Features

- **STL Support**: Process individual STL files with automatic dimension extraction from filenames
- **3MF Support**: Handle multi-object 3MF files with automatic dimension calculation from geometry
- **Auto-Rotation**: Automatically rotates STL files to match filename orientation (fixes width/height mismatches)
- **Random Colors**: Automatically selects a color if none is specified
- **Organized Output**: Optional subfolder organization for generated files
- **Non-Interactive Mode**: Fully automated processing without user prompts

## Installation

### Requirements

- Python 3.7 or higher
- Required packages (install via requirements.txt)

### Install Dependencies

```bash
pip install -r requirements.txt
```

Required packages:
- `trimesh` - 3D mesh processing
- `lxml` - XML parsing for 3MF files
- `networkx` - Graph operations
- `numpy-stl` - STL file handling
- `matplotlib` - PNG rendering
- `numpy` - Numerical operations

## Quick Start

### Basic Usage

Process the current directory with automatic color selection:

```bash
python build_library.py
```

### Specify a Directory and Color

```bash
python build_library.py ./my-models --color blue
```

### Organized Output with Subfolder

```bash
python build_library.py ./models --library-name "storage-bins" --color red
```

This creates a `storage-bins/` subfolder containing all PNG images and the `index.json` file.

### Non-Interactive Mode

Skip files with missing dimensions instead of prompting:

```bash
python build_library.py --non-interactive --color green
```

## Usage Examples

### Example 1: Basic STL Processing

```bash
# Directory structure:
# my-models/
#   ├── 2x1-blank.stl
#   ├── 1x3-endcap.stl
#   └── 3x2-divider.stl

python build_library.py ./my-models --color blue

# Output:
# my-models/
#   ├── 2x1-blank.stl
#   ├── -blank 2x1.png          # Generated
#   ├── 1x3-endcap.stl
#   ├── -endcap 1x3.png         # Generated
#   ├── 3x2-divider.stl
#   ├── -divider 3x2.png        # Generated
#   └── index.json              # Generated
```

### Example 2: Organized Output

```bash
python build_library.py ./models --library-name "bins" --color purple

# Output:
# models/
#   ├── 2x1-blank.stl
#   ├── 1x3-endcap.stl
#   └── bins/                   # Subfolder created
#       ├── -blank 2x1.png
#       ├── -endcap 1x3.png
#       └── index.json
```

### Example 3: 3MF Files with Multiple Objects

```bash
# Input: multi-model.3mf contains:
#   - "Bin" object (84mm × 126mm → 2×3 units)
#   - "Divider" object (42mm × 84mm → 1×2 units)

python build_library.py --color teal

# Output:
#   multi-model_Bin_2x3.png
#   multi-model_Divider_1x2.png
#   index.json
```

## Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `directory` | - | Directory containing STL/3MF files | `.` (current) |
| `--output` | `-o` | Output filename for JSON | `index.json` |
| `--color` | `-c` | Color name or hex code | Random |
| `--library-name` | `-n` | Create subfolder for output | None |
| `--non-interactive` | - | Skip files with missing dimensions | Off |
| `--skip-existing` | - | Skip rendering if PNG exists | On (default) |
| `--no-skip-existing` | - | Always re-render PNGs | Off |
| `--both-modes` | - | Render both orthographic and perspective | On (default) |
| `--orthographic-only` | - | Render only orthographic (no perspective) | Off |
| `--camera-tilt` | - | Camera tilt angle in degrees (0-90) | 22.5 |
| `--fov` | - | Field of view in degrees | 45 |

## Color Options

### Available Color Names

```
blue, green, red, purple, yellow, orange, pink, indigo,
teal, cyan, gray, grey, slate, lime, emerald, sky,
violet, fuchsia, rose, amber
```

### Custom Hex Colors

You can specify any hex color:

```bash
python build_library.py --color "#FF5733"
python build_library.py --color FF5733  # # is optional
```

## Filename Conventions

### STL Files

STL files should include dimensions in the filename using the format `WxH`:

- `2x1-blank.stl` → 2 units wide × 1 unit tall
- `1x3 Utensil Holder.stl` → 1 unit wide × 3 units tall
- `Tool Organizer 3x2.stl` → 3 units wide × 2 units tall

**Note**: If dimensions are not found in the filename, you'll be prompted to enter them (unless using `--non-interactive` mode).

### 3MF Files

3MF files don't require dimensions in filenames. The tool automatically calculates dimensions from the 3D geometry:

- Measures bounding box in millimeters
- Divides by 42mm (standard Gridfinity unit)
- Rounds up to nearest integer

## Auto-Rotation Feature

The tool automatically detects when an STL file's geometry orientation doesn't match its filename dimensions and rotates it 90° to fix the mismatch.

**Example**:
- Filename: `3x2-endcap.stl` (indicates landscape: 3 wide × 2 tall)
- Geometry: Actually oriented as portrait (2 wide × 3 tall)
- **Result**: Tool automatically rotates the geometry 90° before rendering

Console output when rotation occurs:
```
Processing 3x2-endcap.stl...
  Found dimensions 3x2 in filename
  Rotating geometry to match 3x2 orientation
  Created rotated temporary STL
  Rendering PNG: -endcap 3x2.png
```

## Output Format

### index.json Structure

```json
{
  "version": "1.0.0",
  "items": [
    {
      "id": "2x1-blank",
      "name": "2x1 -blank",
      "widthUnits": 2,
      "heightUnits": 1,
      "color": "#3B82F6",
      "categories": [],
      "imageUrl": "-blank 2x1.png"
    }
  ]
}
```

### Generated PNG Files

- **Resolution**: 800px maximum dimension
- **DPI**: 100
- **Format**: PNG with transparency
- **Naming**: `[name] [W]x[H].png`
- **View**: Perspective rendering (default) or orthographic projection

## Dual Rendering: Orthographic + Perspective

By default, the tool generates **both orthographic and perspective** PNG images for each model, giving you the best of both worlds!

### How It Works

For each STL/3MF file, two PNG images are created:

1. **Orthographic** (e.g., `model 2x3.png`) - Flat top-down view
   - Used as `imageUrl` in JSON (backwards compatible)
   - Fast rendering (~0.5-1s per image)
   - Shows footprint layout

2. **Perspective** (e.g., `model 2x3-perspective.png`) - 3D angled view
   - Used as `perspectiveImageUrl` in JSON (optional field)
   - Shows walls, dividers, and vertical features
   - Better depth perception (~1-2s per image)

### JSON Output Format

```json
{
  "id": "utensils-2x5",
  "name": "2x5 Utensils",
  "widthUnits": 2,
  "heightUnits": 5,
  "color": "#3B82F6",
  "categories": [],
  "imageUrl": "Utensils 2x5.png",
  "perspectiveImageUrl": "Utensils 2x5-perspective.png"
}
```

The `perspectiveImageUrl` field is optional - if perspective rendering fails or is disabled, it won't be included.

### Rendering Mode Options

```bash
# Default: Render both orthographic and perspective (recommended)
python build_library.py

# Explicitly enable both modes
python build_library.py --both-modes

# Render only orthographic (no perspective)
python build_library.py --orthographic-only

# Customize perspective camera settings
python build_library.py --camera-tilt 30 --fov 50
```

**Camera Tilt Options:**
- `0°` - Pure top-down (walls invisible)
- `22.5°` - Default, good balance (recommended)
- `30-45°` - More dramatic angle, shows walls clearly
- `45°` - Isometric-like view

### Comparing Views

| Feature | Perspective | Orthographic |
|---------|------------|--------------|
| Shows walls | ✅ Yes | ❌ No (invisible) |
| Depth perception | ✅ Strong | ⚠️ Subtle shading only |
| Vertical features | ✅ Visible | ❌ Hidden |
| Rendering speed | ~1-2s per image | ~0.5-1s per image |
| Use case | 3D structure preview | Flat footprint view |
| JSON field | `perspectiveImageUrl` | `imageUrl` |

### Backwards Compatibility

Legacy systems that only read `imageUrl` will continue to work with the orthographic version. Modern systems can display the perspective version when `perspectiveImageUrl` is present.

### Using stl_to_png.py Standalone

The standalone tool still supports single-mode rendering:

```bash
# Perspective rendering
python stl_to_png.py model.stl -p

# Orthographic rendering
python stl_to_png.py model.stl --orthographic

# Custom perspective settings
python stl_to_png.py model.stl -p --camera-tilt 30 --fov 50

# Batch processing with perspective
python stl_to_png.py -b ./models -p
```

## Configuration Constants

You can modify these constants at the top of `build_library.py`:

```python
GRIDFINITY_UNIT_MM = 42.0            # Gridfinity grid unit size
DEFAULT_PNG_MAX_DIMENSION = 800      # PNG image size
DEFAULT_PNG_DPI = 100                # Rendering DPI
MAX_REASONABLE_GRID_UNITS = 50       # Dimension validation limit
MAX_FILE_SIZE_MB = 500               # Maximum STL file size

# Dual rendering configuration
RENDER_BOTH_MODES = True             # Render both orthographic + perspective
PERSPECTIVE_CAMERA_TILT = 22.5       # Camera tilt angle (degrees)
PERSPECTIVE_FOV = 45                 # Field of view (degrees)
```

## Limitations

### File Size

- **Maximum STL size**: 500 MB (configurable via `MAX_FILE_SIZE_MB`)
- Files larger than this will trigger a warning but will still be processed
- Very large files may cause memory issues

### Dimension Detection

- **STL files**: Dimensions extracted from filename only (no geometry analysis except for rotation)
- **3MF files**: Dimensions calculated from geometry (may not match filename)
- **Zero dimensions**: Files with `0x0`, `0x5`, etc. are rejected
- **Large dimensions**: Files with dimensions > 50 units trigger a warning

### Geometry Requirements

- **Valid mesh**: Must have vertices and faces
- **Finite extents**: No NaN or infinity values in coordinates
- **Positive dimensions**: Bounding box must have positive X, Y extents
- **Units**: Assumes geometry is in millimeters

### 3MF Orientation

- **Forced portrait**: 3MF objects are always assigned dimensions with `width < height`
- This can cause PNG/JSON orientation mismatches for landscape objects
- STL files respect filename orientation via auto-rotation

## Troubleshooting

### "Dimensions not found in filename"

**Cause**: STL filename doesn't contain a `WxH` pattern.

**Solutions**:
- Rename file to include dimensions: `model.stl` → `model 2x3.stl`
- Use interactive mode and enter dimensions when prompted
- Use `--non-interactive` to skip these files

### "File is empty (0 bytes)"

**Cause**: STL file has no content.

**Solutions**:
- Re-export the STL from your 3D modeling software
- Check if the file was corrupted during download/transfer

### "Invalid extents (must be > 0)"

**Cause**: 3MF geometry has zero or negative dimensions.

**Solutions**:
- Open the 3MF file in a 3D viewer to verify it's valid
- Check if all objects in the 3MF have valid geometry
- Try exporting as STL instead

### "Rotation failed"

**Cause**: Auto-rotation encountered an error (usually due to invalid geometry).

**Solutions**:
- Tool will fall back to original STL file orientation
- Check the STL file for corruption
- Manually rotate the STL in your 3D software before processing

### "Permission denied writing to: [path]"

**Cause**: No write permissions for output directory.

**Solutions**:
- Run with appropriate permissions
- Use `--library-name` to create output in a different location
- Check folder permissions

### "Cannot create temporary file"

**Cause**: No write permissions for system temp directory.

**Solutions**:
- Check temp directory permissions
- Verify system has disk space
- Run as administrator (Windows) or with sudo (Linux/Mac)

### "Very large extents detected"

**Cause**: Geometry dimensions seem unusually large (> 2100mm for 50 units).

**Solutions**:
- Verify STL file units are in millimeters (not inches or meters)
- If intentional, you can ignore this warning
- Increase `MAX_REASONABLE_GRID_UNITS` in the code if needed

## Advanced Usage

### Custom PNG Rendering Settings

Edit `build_library.py` constants:

```python
DEFAULT_PNG_MAX_DIMENSION = 1200  # Higher resolution
DEFAULT_PNG_DPI = 150             # Higher DPI
```

### Batch Processing Multiple Directories

```bash
#!/bin/bash
for dir in models/*/; do
  python build_library.py "$dir" --library-name "library" --color blue --non-interactive
done
```

### Force Re-render All PNGs

```bash
python build_library.py --no-skip-existing --color red
```

## Technical Details

### Gridfinity Unit Calculation

For 3MF files, dimensions are calculated as:

```
x_units = ceil(bounding_box_x / 42.0)
y_units = ceil(bounding_box_y / 42.0)
width = min(x_units, y_units)
height = max(x_units, y_units)
```

### XY-Plane Alignment

3MF objects are automatically rotated in the XY plane (around Z-axis) to minimize bounding box area. This ensures consistent horizontal/vertical rendering.

### Rotation Detection

For STL files, the tool:
1. Parses dimensions from filename (e.g., `3x2` → width=3, height=2)
2. Loads STL geometry to measure actual bounding box
3. Calculates actual grid units from geometry extents
4. Compares filename orientation vs. geometry orientation
5. Applies 90° Z-axis rotation if mismatch detected (landscape ↔ portrait)

## Contributing

Found a bug or have a feature request? Please open an issue on the repository.

## License

See LICENSE file for details.

## Support

For issues, questions, or contributions, please visit the project repository.

---

**Note**: This tool assumes standard Gridfinity dimensions (42mm grid units). Custom grid sizes are not currently supported.
