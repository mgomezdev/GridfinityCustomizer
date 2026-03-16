# Customization Popover Placement Design

**Date:** 2026-03-09
**Branch:** feat/customization-panel-improvements

## Problem

When a user clicks the ⚙ gear button on a placed bin, the customization popover appears at the bottom of the bin image (`top: 100%; left: 0` in CSS). This forces the user to scroll or move focus away from the button they just clicked, especially for bins near the top of the grid or in dense layouts.

## Solution

Reposition the popover using `position: fixed` with viewport-aware placement — centered above the ⚙ button by default, flipping below if there is insufficient space above, and horizontally clamped to stay within the viewport on both edges.

## Design

### Trigger

When `showPopover` transitions to `true`, measure the ⚙ button's position via `getBoundingClientRect()` and compute placement coordinates stored in state as `{ top: number; left: number; direction: 'above' | 'below' }`.

### Placement Logic

```
buttonRect = gearButtonRef.current.getBoundingClientRect()
popoverWidth = 260  (max-width)
popoverHeight = ~300  (estimated max)
margin = 8

// Horizontal: center on button, clamped to viewport
rawLeft = buttonRect.left + buttonRect.width / 2 - popoverWidth / 2
left = clamp(rawLeft, margin, viewportWidth - popoverWidth - margin)

// Vertical: prefer above, flip below if not enough room
spaceAbove = buttonRect.top - margin
if spaceAbove >= popoverHeight:
  top = buttonRect.top - popoverHeight - 6   // 6px gap
  direction = 'above'
else:
  top = buttonRect.bottom + 6
  direction = 'below'
```

### Rendering

The popover is rendered with `position: fixed; top: <computed>px; left: <computed>px` via inline styles. It is kept as a child of `PlacedItemOverlay` in the React tree (no portal needed — `position: fixed` already escapes any `overflow: hidden` ancestor).

A CSS arrow (`::before` pseudo-element) points toward the ⚙ button:
- `direction === 'above'`: downward arrow at bottom of popover
- `direction === 'below'`: upward arrow at top of popover

### Resize Handling

While the popover is open, a `resize` event listener on `window` recomputes placement. This handles window resize while popover is open.

### Changes Required

| File | Change |
|------|--------|
| `src/components/PlacedItemOverlay.tsx` | Add `gearButtonRef`, `popoverPos` state, `computePopoverPos()` function, `resize` listener, pass inline style to popover |
| `src/App.css` | Remove `top: 100%; left: 0` from `.placed-item-customize-popover`; add `position: fixed`; add `::before` arrow styles for `.above` / `.below` variants |

### Out of Scope

- Scroll-tracking while popover is open (popover closes on outside click, making this unnecessary)
- Smart repositioning when bin moves (drag-while-popover-open is not a supported interaction)
