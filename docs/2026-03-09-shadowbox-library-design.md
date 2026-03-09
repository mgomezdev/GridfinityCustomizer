# Shadowbox Library & Per-Library Customization Design

**Date:** 2026-03-09
**Branch:** feat/gridfinity-generator-tool

## Overview

Add a "shadowbox" library of solid Gridfinity bins (2x2–5x5) intended for boolean subtraction workflows (e.g., tool shadowboxes). Overhaul the customization system to be data-driven: each library declares which fields are customizable and what the defaults are. The `BinCustomizationPanel` renders only the controls relevant to the placed item's library.

---

## 1. Data Layer

### `customizableFields` and `customizationDefaults` on Library

Each library's `index.json` gains two optional top-level fields:

```json
{
  "version": "1.0.0",
  "customizableFields": ["lipStyle", "wallPattern", "fingerSlide", "wallCutout"],
  "customizationDefaults": { "height": 4 },
  "items": [...]
}
```

- `customizableFields` — array of field names the user may customize for items in this library.
- `customizationDefaults` — partial overrides of the global `DEFAULT_BIN_CUSTOMIZATION` for items in this library. Used when placing an item and when "Reset to Defaults" is triggered.

### Per-library field assignments

| Library | `customizableFields` |
|---------|----------------------|
| bins_standard | `lipStyle`, `wallPattern`, `fingerSlide`, `wallCutout` |
| bins_labeled | `lipStyle`, `wallPattern`, `fingerSlide`, `wallCutout` |
| shadowbox | `lipStyle`, `fingerSlide`, `wallCutout`, `height` |
| simple-utensils | *(none)* |
| modular-utensil | *(none)* |

### New type

```ts
type CustomizableField = 'lipStyle' | 'wallPattern' | 'fingerSlide' | 'wallCutout' | 'height'
```

---

## 2. Types & State

### `Library` type

```ts
interface Library {
  // ...existing fields...
  customizableFields?: CustomizableField[]
  customizationDefaults?: Partial<BinCustomization>
}
```

### `BinCustomization` type

```ts
interface BinCustomization {
  wallPattern: WallPattern
  lipStyle: LipStyle
  fingerSlide: FingerSlide
  wallCutout: WallCutout
  height: number  // gridfinity units (1–20)
}
```

### Defaults

```ts
const DEFAULT_BIN_CUSTOMIZATION: BinCustomization = {
  wallPattern: 'none',
  lipStyle: 'normal',
  fingerSlide: 'none',
  wallCutout: 'none',
  height: 8,  // global default
}
```

The shadowbox library declares `"customizationDefaults": { "height": 4 }`, overriding the global default for its items.

### `isDefaultCustomization`

Updated to treat `height === 8` as default (global). Reset button uses the merged default (library override + global), so for shadowbox items it resets `height` to 4.

---

## 3. Shadowbox Library Assets

### STL generation

16 solid bins (2x2 through 5x5), generated via `tools/gridfinity-generator/generate_bin.py`:
- `filled_in: "enabled"` (solid block, no cavity)
- `height: [4, 0]` (4 gridfinity units = 28mm)
- `lip_style: "normal"`

Naming: `shadowbox_WxD.stl` — height is omitted from filename since it's a runtime customization.

### PNG renders

32 PNGs (orthographic + perspective) via `tools/library-builder/stl_to_png.py`.

### `public/libraries/shadowbox/index.json`

```json
{
  "version": "1.0.0",
  "customizableFields": ["lipStyle", "fingerSlide", "wallCutout", "height"],
  "customizationDefaults": { "height": 4 },
  "items": [
    {
      "id": "shadowbox-2x2",
      "name": "2x2 Shadowbox",
      "widthUnits": 2,
      "heightUnits": 2,
      "color": "#8B5CF6",
      "categories": ["shadowbox"],
      "stlFile": "shadowbox_2x2.stl",
      "imageUrl": "shadowbox_2x2.png",
      "perspectiveImageUrl": "shadowbox_2x2-perspective.png"
    }
    // ...15 more items (2x3–5x5)
  ]
}
```

Color: `#8B5CF6` (violet — visually distinct from standard blue `#3B82F6`).

### Manifest

`public/libraries/manifest.json` gains `"shadowbox"` entry.

### Category

`"shadowbox"` added to DB seed (`server/src/db/seed.ts`) so the backend recognizes it.

---

## 4. UI — BinCustomizationPanel

### Updated props

```ts
interface BinCustomizationPanelProps {
  customization: BinCustomization | undefined
  onChange: (customization: BinCustomization) => void
  onReset: () => void
  customizableFields: CustomizableField[]
  customizationDefaults?: Partial<BinCustomization>
  idPrefix?: string
}
```

### Rendering

- Only renders a control if its field name appears in `customizableFields`
- If `customizableFields` is empty, renders nothing (panel hidden by parent)
- Height renders as a number input, range 1–20, with hint showing mm (`× 7 = Xmm`)
- "Reset to Defaults" merges `customizationDefaults` over `DEFAULT_BIN_CUSTOMIZATION`, resets to that

### Data flow

Parent component (e.g., `BinContextMenu`, `BinCustomizationPopover`) looks up the placed item's library via `useLibraryData`, reads `customizableFields` and `customizationDefaults`, passes as props. If the library has none declared, passes `[]` → panel renders nothing.

---

## 5. Testing

- Unit tests for updated `BinCustomizationPanel` (renders correct fields per library config, hides absent fields)
- Unit tests for updated `BinCustomization` defaults and `isDefaultCustomization`
- Unit tests for updated `useGridItems` (height persisted in customization)
- E2E: place a shadowbox item → open customization → height field visible, wall pattern absent → change height → verify persisted
