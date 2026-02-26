# Design: Bin Context Menu + Duplicate Button

**Date:** 2026-02-22
**Status:** Approved

## Problem

All single-bin manipulation operations are accessible via keyboard shortcuts or the sidebar toolbar, but not all of them are reachable directly from the bin itself. Specifically, **Duplicate** has no on-bin button. Additionally, mouse users have no right-click context menu — a standard interaction pattern in design tools.

**Existing on-bin buttons:** Rotate CCW, Rotate CW, Delete, Customize
**Missing from bin:** Duplicate

## Scope

- Single-bin operations only
- Copy/paste excluded (not needed per user decision)
- Multi-select out of scope (future feature)

## Solution

Two complementary additions:

### 1. Duplicate Button in PlacedItemOverlay

Add a `⧉ Duplicate` button to the selected-state action row in `PlacedItemOverlay`, between Delete and Customize:

```
[ ↺ CCW ]  [ ↻ CW ]  [ × Delete ]  [ ⧉ Duplicate ]  [ ⚙ Customize ]
```

- **Icon:** `⧉` (U+29C9)
- **Tooltip:** `"Duplicate (Ctrl+D)"`
- **New prop:** `onDuplicate?: (instanceId: string) => void`
- **Wired from:** existing `handleDuplicateItem` in `App.tsx`

### 2. Right-Click Context Menu (BinContextMenu)

A `BinContextMenu` component rendered via React portal (`document.body`) to avoid clipping by `overflow: hidden` ancestors.

**Trigger:** `onContextMenu` on the bin root div in `PlacedItemOverlay`. Right-clicking selects the bin (if not already) then opens the menu at cursor position.

**Menu items:**
```
↺  Rotate CCW        Shift+R
↻  Rotate CW         R
─────────────────────────────
⧉  Duplicate         Ctrl+D
─────────────────────────────
⚙  Customize…
─────────────────────────────
×  Delete            Del
```

**Positioning:** Opens at cursor coordinates with viewport-edge detection — flips left if it would overflow right edge, flips up if it would overflow bottom edge.

**Dismiss:** Click outside, Escape key, or selecting any action.

**Selection on right-click:** If the right-clicked bin is not currently selected, it becomes selected before the menu opens (consistent with design tool conventions).

## Components

| Component | Change |
|---|---|
| `PlacedItemOverlay.tsx` | Add `onDuplicate` prop + button; add `onContextMenu` handler that calls `BinContextMenu` |
| `BinContextMenu.tsx` | New component — portal-based context menu with all single-bin operations |
| `BinContextMenu.css` | New styles for menu, items, dividers, keyboard hint labels |
| `App.tsx` | Pass `onDuplicate={handleDuplicateItem}` to each `PlacedItemOverlay` |

## Testing

- Unit tests for `BinContextMenu` (renders, positioning, dismiss behavior)
- Unit tests for `PlacedItemOverlay` duplicate button (renders when selected, calls callback)
- E2E test: right-click a bin → menu appears → click each action → correct behavior
- E2E test: right-clicking unselected bin selects it and shows menu
- E2E test: Escape and outside-click dismiss the menu
