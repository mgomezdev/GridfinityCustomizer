# Onboarding Walkthrough Design

**Date:** 2026-02-22

## Overview

A first-login guided walkthrough that uses a spotlight + popover overlay to walk new users through three core actions: placing a bin, saving their layout, and submitting it as an order.

Includes a side quest: make the Submit button always visible when authenticated, with a save-then-submit flow for unsaved layouts.

---

## Trigger & Persistence

- Walkthrough auto-starts immediately after a user logs in or registers for the first time.
- Seen-state is stored in `localStorage` under a new `WALKTHROUGH_SEEN` key added to `STORAGE_KEYS`.
- Skipping (mid-tour dismiss) and completing (finishing all steps) both set `WALKTHROUGH_SEEN = true`.
- Once seen, the walkthrough never auto-starts on login again.
- A **"Take the tour"** option in the `UserMenu` dropdown calls `startTour()` manually at any time, regardless of seen-state.

---

## Architecture

### `WalkthroughContext`

Provides tour state and actions to the whole app via React context.

```ts
interface WalkthroughContextValue {
  isActive: boolean;
  currentStep: number;
  startTour: () => void;
  nextStep: () => void;
  dismissTour: () => void;
}
```

- `startTour()` — sets `isActive: true`, `currentStep: 0`.
- `nextStep()` — advances step; on the last step calls `dismissTour()`.
- `dismissTour()` — sets `isActive: false`, writes `WALKTHROUGH_SEEN = true` to localStorage.

### `useWalkthrough()`

Convenience hook wrapping `useContext(WalkthroughContext)`.

### Steps constant

```ts
const WALKTHROUGH_STEPS = [
  {
    id: 'place-bin',
    title: 'Drag a bin onto your grid',
    body: 'Pick any bin from the library on the left and drag it onto the grid to place it.',
    target: '.library-item-card',
  },
  {
    id: 'save-grid',
    title: 'Save your layout',
    body: 'Give your layout a name and save it — you can come back and edit it anytime.',
    target: '.layout-save-btn',
  },
  {
    id: 'submit-order',
    title: 'Submit your order',
    body: 'When your layout is ready, hit Submit to send it in as an order. You can track it from your layouts panel.',
    target: '.layout-submit-btn',
  },
];
```

### `WalkthroughOverlay`

Renders as a React portal into `document.body` when the tour is active. Two visual layers:

**Spotlight cutout**
- Full-viewport transparent `div` absolutely positioned to match the target element's `getBoundingClientRect()`.
- `box-shadow: 0 0 0 9999px rgba(0,0,0,0.55)` punches the backdrop from a single element, avoiding SVG clip-path complexity.
- `border-radius: 6px` + `2px` solid blue outline ring.
- 200ms CSS transition on `top`/`left`/`width`/`height` when advancing between steps.
- A `ResizeObserver` on the target element keeps the rect current if the window is resized.
- If `document.querySelector(target)` returns `null`, the spotlight is hidden and the card renders centered on screen.

**Floating step card**
- Positioned below the spotlight rect by default; flips above if the card would overflow the viewport bottom.
- Contents:
  - Step counter: `Step N of 3` (muted, small)
  - Title: bold heading
  - Body: 1–2 sentence instruction
  - Footer: `Skip tour` ghost button (left) + `Next →` / `Finish` primary blue button (right)

---

## Auto-start Integration

In `App.tsx`, detect the `isAuthenticated` transition from `false → true`:

```ts
const prevAuthenticated = useRef(false);
useEffect(() => {
  if (isAuthenticated && !prevAuthenticated.current) {
    if (!localStorage.getItem(STORAGE_KEYS.WALKTHROUGH_SEEN)) {
      startTour();
    }
  }
  prevAuthenticated.current = isAuthenticated;
}, [isAuthenticated, startTour]);
```

---

## Re-trigger via UserMenu

Add a "Take the tour" menu item to the `UserMenu` dropdown that calls `startTour()`. This resets the tour to step 0 and sets `isActive: true` regardless of seen-state (but does not clear the seen-state — manual re-trigger is always available).

---

## Side Quest: Always-Visible Submit Button

### Current behavior
Submit only renders when `isAuthenticated && layoutMeta.id && layoutMeta.status === 'draft'`.

### New behavior
Submit renders whenever `isAuthenticated`. Its click handler branches on layout state:

| State | Action |
|-------|--------|
| No saved layout (`layoutMeta.id` is null) | Open Save dialog with `submitAfterSave` flag |
| Saved, status `draft` | Submit directly (existing behavior) |
| Status `submitted` | Hidden — Withdraw button renders instead (no change) |
| Status `delivered` | Button disabled, title: "This layout has been fulfilled" |

### `submitAfterSave` flag

A `useRef<boolean>` in `App.tsx`. Set to `true` before opening the Save dialog from the Submit button. The existing `onSaveComplete` callback checks this ref, fires the submit mutation, then clears the ref.

```ts
const submitAfterSave = useRef(false);

const handleSubmitClick = () => {
  if (!layoutMeta.id) {
    submitAfterSave.current = true;
    dialogDispatch({ type: 'OPEN', dialog: 'save' });
  } else {
    handleSubmitLayout();
  }
};

const handleSaveComplete = (layoutId, name, status) => {
  handleSetLayoutMeta(layoutId, name, status);
  if (submitAfterSave.current) {
    submitAfterSave.current = false;
    handleSubmitLayout();
  }
};
```

---

## New Files

- `src/contexts/WalkthroughContext.tsx` — context + provider + `useWalkthrough` hook
- `src/components/WalkthroughOverlay.tsx` — spotlight + card rendering
- `src/components/WalkthroughOverlay.css` — overlay styles

## Modified Files

- `src/utils/storageKeys.ts` — add `WALKTHROUGH_SEEN` key
- `src/App.tsx` — auto-start logic, always-visible Submit, `submitAfterSave` ref, `handleSubmitClick`
- `src/components/auth/UserMenu.tsx` — "Take the tour" menu item

## Testing

- Unit tests for `WalkthroughContext`: startTour, nextStep (advances), nextStep on last step (calls dismiss), dismissTour (sets localStorage)
- Unit tests for `WalkthroughOverlay`: renders portal when active, hidden when inactive, displays correct step content, Next/Skip buttons call correct handlers
- Unit tests for Submit button: shows when authenticated + no layout saved, triggers save dialog with flag, auto-submits after save completes
- E2E test `e2e/tests/onboarding-walkthrough.spec.ts`: full three-step tour flow against container
