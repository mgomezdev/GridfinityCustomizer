# Gridfinity Library Format

This document describes the structure of the library file used by the gridfinity-customizer tool.

## File Location
Place the created library file in the same folder as the stls that were used to generate it.

## Purpose
The library file defines a catalog of Gridfinity items that can be used in the customization tool. Each item represents a 3D model that occupies a certain grid space and can be placed on a Gridfinity grid.

## JSON Structure

### Top Level
```json
{
  "version": "1.0.0",
  "_template": { ... },
  "items": [ ... ]
}
```

- **version**: Library format version (currently "1.0.0")
- **_template**: Documentation template showing item structure with comments
- **items**: Array of library items

### Item Structure
Each item in the `items` array has the following properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier in kebab-case format (e.g., "bin-1x1", "utensil-simple-1x3") |
| `name` | string | Yes | Human-readable display name (e.g., "1x1 Bin", "1x3 Utensil Tray (simple)") |
| `widthUnits` | integer | Yes | Width in Gridfinity units (positive integer) |
| `heightUnits` | integer | Yes | Height in Gridfinity units (positive integer) |
| `color` | string | Yes | Hex color code for visual representation (e.g., "#3B82F6", "#FDFBD4") |
| `categories` | array | Yes | Array of category IDs this item belongs to (e.g., ["bin"], ["bin", "labeled"], ["utensil"]) |
| `imageUrl` | string | No | Path to preview image served from public/ directory. Format: "/images/filename.png" (NOT "public/images/...") |
| `perspectiveImageUrl` | string | No | Path to perspective preview image (e.g., `"bin 2x3-perspective.png"`) |
| `filamentGrams` | number | No | Filament used in grams, estimated by OrcaSlicer (e.g., `18.72`) |
| `printTimeSeconds` | number | No | Estimated print time in seconds, estimated by OrcaSlicer (e.g., `6480`) |

### Example Item
```json
{
  "id": "bin-2x3",
  "name": "2x3 Bin",
  "widthUnits": 2,
  "heightUnits": 3,
  "color": "#3B82F6",
  "categories": ["bin"],
  "imageUrl": "bin 2x3.png",
  "perspectiveImageUrl": "bin 2x3-perspective.png",
  "filamentGrams": 18.72,
  "printTimeSeconds": 6480
}
```
## Color Scheme
- Ask user for color scheme.  Use english names for common colors and save the hex value in the library file.

## Image URLs
- Images are stored alongside the STL files that generated them
- Image URL format: Just the filename (e.g., `"utensil-simple-1x3.png"`)

## Filename Convention
STL files should follow the pattern: `[name] [width]x[height].stl`
- Example: `Utensils 1x3.stl` → widthUnits: 1, heightUnits: 3
- Example: `Custom Tray 2x4.stl` → widthUnits: 2, heightUnits: 4
- If dimensions not found in filename, prompt user before processing
- Generated PNG will always include dimensions: `[name] [width]x[height].png`

## Workflow
1. **Batch Processing**: Process all STL files in a folder
2. **Output**: One library file (e.g., `library.json`) for all STLs in that folder
3. **Self-Contained**: STLs, PNGs, and library.json all stored together
4. **Future**: An importer will be created to load libraries into gridfinity-customizer

## Notes for Library Builder
1. Generate entries compatible with this format
2. For each STL file:
   - Try to extract widthUnits and heightUnits from filename pattern `[width]x[height]`
   - If not found, prompt user for dimensions BEFORE processing
   - Generate PNG with dimensions in filename: `[name] [width]x[height].png`
3. Auto-generate item IDs from STL filenames using kebab-case naming
4. Auto-generate display names from STL filenames (cleaned up for readability)
5. Prompt user for color scheme (accept color names, convert to hex)
6. Categories can be added later - skip for now
