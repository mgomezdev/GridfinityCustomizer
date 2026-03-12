# Customization Popover Placement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reposition the bin customization popover to appear near the ⚙ gear button that opens it, using viewport-aware fixed positioning to prevent clipping at any edge.

**Architecture:** Add a `ref` to the ⚙ gear button in `PlacedItemOverlay`. When the popover opens, compute `position: fixed` coordinates using `getBoundingClientRect()` — centered on the button, preferring above but flipping below when there is insufficient space above, and clamping horizontally within the viewport. A `resize` event listener recomputes placement while the popover is open.

**Tech Stack:** React 19, TypeScript, CSS custom properties (no new dependencies)

---

### Task 1: Add placement state and computation to PlacedItemOverlay

**Files:**
- Modify: `src/components/PlacedItemOverlay.tsx`

The popover currently renders with `position: absolute; top: 100%` (below the bin). We need to replace this with `position: fixed` at computed coordinates.

**Step 1: Write the failing test**

Open `src/components/PlacedItemOverlay.test.tsx`. Find the test block around line 1933 (`should toggle customization popover when clicked`). Add a new test immediately after it:

```tsx
it('should render popover with position fixed style', async () => {
  const { container } = render(
    <PlacedItemOverlay
      item={{ ...defaultItem, instanceId: 'i1' }}
      gridX={4} gridY={4}
      isSelected={true}
      onSelect={vi.fn()}
      getItemById={() => defaultLibraryItem}
      onCustomizationChange={vi.fn()}
      getLibraryMeta={async () => ({ customizableFields: ['lipStyle'], customizationDefaults: {} })}
    />
  );

  const customizeBtn = await waitFor(() => screen.getByRole('button', { name: 'Customize' }));
  fireEvent.click(customizeBtn);

  const popover = container.querySelector('.placed-item-customize-popover') as HTMLElement;
  expect(popover).toBeInTheDocument();
  expect(popover.style.position).toBe('fixed');
});
```

**Step 2: Run test to verify it fails**

```bash
cd C:/Users/mgome/Documents/projects/gridfinity-customizer
npx vitest run src/components/PlacedItemOverlay.test.tsx --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `expected '' to be 'fixed'`

**Step 3: Implement placement state and ref in PlacedItemOverlay**

In `src/components/PlacedItemOverlay.tsx`:

1. Add imports at top (after existing imports):
```tsx
import { memo, useState, useCallback, useEffect, useRef } from 'react';
```

2. Add `PopoverPos` type and state after the `const [showPopover, ...]` line:
```tsx
interface PopoverPos { top: number; left: number; direction: 'above' | 'below' }
const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
const gearButtonRef = useRef<HTMLButtonElement>(null);
```

3. Add a `computePopoverPos` function after the state declarations:
```tsx
const computePopoverPos = useCallback(() => {
  if (!gearButtonRef.current) return;
  const rect = gearButtonRef.current.getBoundingClientRect();
  const POPOVER_WIDTH = 260;
  const POPOVER_HEIGHT = 300;
  const MARGIN = 8;
  const GAP = 6;

  const rawLeft = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
  const left = Math.max(MARGIN, Math.min(rawLeft, window.innerWidth - POPOVER_WIDTH - MARGIN));

  const spaceAbove = rect.top - MARGIN;
  if (spaceAbove >= POPOVER_HEIGHT) {
    setPopoverPos({ top: rect.top - POPOVER_HEIGHT - GAP, left, direction: 'above' });
  } else {
    setPopoverPos({ top: rect.bottom + GAP, left, direction: 'below' });
  }
}, []);
```

4. Update `handleCustomizeClick` to compute position when opening:
```tsx
const handleCustomizeClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  e.preventDefault();
  setShowPopover(prev => {
    if (!prev) computePopoverPos();
    return !prev;
  });
};
```

5. Add a `useEffect` for resize listener (after existing useEffects):
```tsx
useEffect(() => {
  if (!showPopover) return;
  const handler = () => computePopoverPos();
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, [showPopover, computePopoverPos]);
```

6. Add `ref={gearButtonRef}` to the ⚙ gear button (around line 263):
```tsx
<button
  ref={gearButtonRef}
  className="placed-item-toolbar-btn"
  onClick={handleCustomizeClick}
  ...
>
```

7. Update the popover `<div>` (around line 287) to use fixed positioning:
```tsx
{showPopover && isSelected && onCustomizationChange && popoverPos && (
  <div
    className={`placed-item-customize-popover placed-item-customize-popover--${popoverPos.direction}`}
    role="dialog"
    style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left }}
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.stopPropagation()}
    onMouseDown={(e) => e.stopPropagation()}
    onPointerDown={(e) => e.stopPropagation()}
  >
```

Also update `handleClosePopover` to clear popover pos:
```tsx
const handleClosePopover = (e: React.MouseEvent) => {
  e.stopPropagation();
  e.preventDefault();
  setShowPopover(false);
  setPopoverPos(null);
};
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/PlacedItemOverlay.test.tsx --reporter=verbose 2>&1 | tail -20
```

Expected: PASS for new test. All existing popover tests should still pass.

**Step 5: Commit**

```bash
git add src/components/PlacedItemOverlay.tsx src/components/PlacedItemOverlay.test.tsx
git commit -m "feat(popover): compute fixed position anchored to gear button"
```

---

### Task 2: Update CSS for fixed popover positioning and direction arrows

**Files:**
- Modify: `src/App.css`

The existing `.placed-item-customize-popover` rule uses `position: absolute; top: 100%; left: 0`. This needs to be replaced with `position: fixed` (coordinates come from inline style) and direction-aware arrow pseudo-elements added.

**Step 1: Write the failing test**

In `src/components/PlacedItemOverlay.test.tsx`, add a test verifying the direction class:

```tsx
it('should add direction class to popover', async () => {
  const { container } = render(
    <PlacedItemOverlay
      item={{ ...defaultItem, instanceId: 'i1' }}
      gridX={4} gridY={4}
      isSelected={true}
      onSelect={vi.fn()}
      getItemById={() => defaultLibraryItem}
      onCustomizationChange={vi.fn()}
      getLibraryMeta={async () => ({ customizableFields: ['lipStyle'], customizationDefaults: {} })}
    />
  );

  const customizeBtn = await waitFor(() => screen.getByRole('button', { name: 'Customize' }));
  fireEvent.click(customizeBtn);

  const popover = container.querySelector('.placed-item-customize-popover') as HTMLElement;
  expect(popover).toBeInTheDocument();
  // jsdom has no real layout so top=0, space above=0, direction will be 'below'
  expect(
    popover.classList.contains('placed-item-customize-popover--above') ||
    popover.classList.contains('placed-item-customize-popover--below')
  ).toBe(true);
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/PlacedItemOverlay.test.tsx --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — neither class found (Task 1 adds the class, so if Task 1 is complete this may already pass)

**Step 3: Update CSS**

In `src/App.css`, find the block starting at line 1897. Replace the entire `.placed-item-customize-popover` rule and the `@keyframes popover-appear` block with:

```css
.placed-item-customize-popover {
  position: fixed;
  z-index: 1000;
  width: 260px;
  background: var(--bg-primary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15), 0 1px 4px rgba(0, 0, 0, 0.1);
  padding: var(--space-sm);
}

/* Arrow pointing down toward the button (popover is above) */
.placed-item-customize-popover--above::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--border-secondary);
}

.placed-item-customize-popover--above::before {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid var(--bg-primary);
  z-index: 1;
}

/* Arrow pointing up toward the button (popover is below) */
.placed-item-customize-popover--below::after {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid var(--border-secondary);
}

.placed-item-customize-popover--below::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 5px solid var(--bg-primary);
  z-index: 1;
}

@keyframes popover-appear {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Also remove `margin-top: 4px;` and `animation: popover-appear 0.15s ease-out;` from the old rule if they weren't replaced above (animation can be re-added to both direction classes if desired).

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/PlacedItemOverlay.test.tsx --reporter=verbose 2>&1 | tail -20
```

Expected: all popover tests PASS.

**Step 5: Run full unit test suite**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: all tests pass.

**Step 6: Commit**

```bash
git add src/App.css src/components/PlacedItemOverlay.test.tsx
git commit -m "feat(popover): fixed positioning with direction-aware arrow"
```

---

### Task 3: Manual verification

Start the dev server and verify visually.

**Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:5173` in browser.

**Step 2: Verify these scenarios**

1. **Normal bin (middle of grid):** Click ⚙ — popover appears above the toolbar, arrow points down toward the button
2. **Bin in top row:** Click ⚙ — popover appears *below* the toolbar (flipped), arrow points up
3. **Bin near left edge:** Popover stays within viewport, does not clip left
4. **Bin near right edge:** Popover stays within viewport, does not clip right
5. **Resize window:** While popover is open, resize window — popover repositions

**Step 3: Run E2E tests**

```bash
npx playwright test --reporter=list 2>&1 | tail -20
```

Expected: all E2E tests pass (no regressions).

**Step 4: Run lint**

```bash
npm run lint 2>&1 | tail -20
```

Expected: no errors.

**Step 5: Final commit if any fixups needed**

```bash
git add -A
git commit -m "fix(popover): address review fixups"
```
