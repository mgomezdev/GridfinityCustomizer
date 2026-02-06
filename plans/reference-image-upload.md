# Reference Image Upload Feature Plan

## Overview

Enable users to upload reference images that render as overlays **on top of** the grid and all placed items. Users adjust image opacity to see their placed bins through the reference image, allowing them to visually fit-check their layout against the reference (e.g., a photo of items they want to organize). Each image has independent scale, opacity, and position controls.

## User Stories

1. **As a user**, I want to upload a reference image so I can visually fit-check my bin layout against real items
2. **As a user**, I want to adjust the opacity of each image so I can see placed bins through the reference
3. **As a user**, I want to scale images to match my grid dimensions
4. **As a user**, I want to reposition images by dragging them
5. **As a user**, I want to toggle between "image move mode" and "item move mode"
6. **As a user**, I want to remove reference images I no longer need
7. **As a user**, I want my reference images to persist between sessions

## Technical Design

### Data Model

```typescript
// src/types/gridfinity.ts

interface ReferenceImage {
  id: string;
  name: string;
  dataUrl: string;        // Base64 encoded image data
  x: number;              // Position X (percentage 0-100)
  y: number;              // Position Y (percentage 0-100)
  width: number;          // Width (percentage of container)
  height: number;         // Height (percentage of container)
  opacity: number;        // Opacity 0-1
  scale: number;          // Scale factor (1 = original)
  isLocked: boolean;      // Prevent accidental moves
}

type InteractionMode = 'items' | 'images';
```

### State Management

Create new hook: `src/hooks/useReferenceImages.ts`

```typescript
interface UseReferenceImagesReturn {
  images: ReferenceImage[];
  interactionMode: InteractionMode;

  // CRUD operations
  addImage: (file: File) => Promise<void>;
  removeImage: (id: string) => void;

  // Property updates
  updateImagePosition: (id: string, x: number, y: number) => void;
  updateImageScale: (id: string, scale: number) => void;
  updateImageOpacity: (id: string, opacity: number) => void;
  toggleImageLock: (id: string) => void;

  // Mode toggle
  setInteractionMode: (mode: InteractionMode) => void;
}
```

**Persistence**: Store in localStorage key `gridfinity-reference-images`

### Component Architecture

```
src/components/
├── ReferenceImageOverlay.tsx    # Single image overlay (renders on grid)
├── ReferenceImageControls.tsx   # Scale/opacity sliders, remove button
├── ReferenceImageUploader.tsx   # Upload button + file input
└── InteractionModeToggle.tsx    # Toggle between items/images mode
```

### Layer Hierarchy (z-index)

```
Layer 4: Reference images (z-index: 10) ← NEW (topmost)
Layer 3: Selected placed items (z-index: 2)
Layer 2: Placed items (z-index: 1)
Layer 1: Grid cells (z-index: 0)
Layer 0: Spacer overlays (z-index: -1)
```

Reference images render **on top of everything** so users see placed items through the image (controlled by opacity). This enables visual fit-checking against the reference.

### GridPreview Integration

Modify `GridPreview.tsx` to:
1. Accept `referenceImages` prop
2. Render `ReferenceImageOverlay` for each image
3. Accept `interactionMode` prop to control drag behavior
4. When in "images" mode, placed items are not draggable
5. When in "items" mode (default), reference images have `pointer-events: none`

### Component Details

#### ReferenceImageOverlay.tsx

```tsx
interface ReferenceImageOverlayProps {
  image: ReferenceImage;
  isInteractive: boolean;  // true when in "images" mode
  onPositionChange: (x: number, y: number) => void;
  onSelect: () => void;
}
```

- Absolute positioned within drawer-container
- When `isInteractive=true`: draggable, shows resize handles
- When `isInteractive=false`: `pointer-events: none` (click-through)
- Applies opacity from image.opacity
- Applies scale transform from image.scale

#### ReferenceImageControls.tsx

```tsx
interface ReferenceImageControlsProps {
  image: ReferenceImage;
  onScaleChange: (scale: number) => void;
  onOpacityChange: (opacity: number) => void;
  onRemove: () => void;
  onToggleLock: () => void;
}
```

- Renders when an image is selected (in "images" mode)
- Shows sliders for opacity (0-100%) and scale (10-200%)
- Shows lock/unlock button
- Shows remove button

#### ReferenceImageUploader.tsx

```tsx
interface ReferenceImageUploaderProps {
  onUpload: (file: File) => Promise<void>;
}
```

- Button that opens file picker
- Accepts image/* file types
- Validates file size (suggest max 5MB for localStorage)
- Converts to base64 dataUrl for storage

#### InteractionModeToggle.tsx

```tsx
interface InteractionModeToggleProps {
  mode: InteractionMode;
  onChange: (mode: InteractionMode) => void;
  hasImages: boolean;  // Disable when no images
}
```

- Toggle button or segmented control
- Icons: grid icon for "items", image icon for "images"
- Visual indicator of current mode
- Disabled when no reference images exist

### UI Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├───────────────────┬─────────────────────────────────────┤
│                   │                                     │
│  Library Panel    │     Grid Preview                    │
│                   │     ┌─────────────────────────────┐ │
│                   │     │ [Reference Image Layer] TOP │ │
│                   │     │ [Placed Items Layer]        │ │
│                   │     │ [Grid Cells Layer]          │ │
│                   │     └─────────────────────────────┘ │
│                   │                                     │
│                   │  ┌──────────────────────────────┐   │
│                   │  │ [Upload] [Items|Images Mode] │   │
│                   │  └──────────────────────────────┘   │
│                   │                                     │
│                   │  ┌──────────────────────────────┐   │
│                   │  │ Image Controls (when active) │   │
│                   │  │ Opacity: [====|----] 50%     │   │
│                   │  │ Scale:   [======|--] 75%     │   │
│                   │  │ [Lock] [Remove]              │   │
│                   │  └──────────────────────────────┘   │
├───────────────────┴─────────────────────────────────────┤
│ Footer / Bill of Materials                              │
└─────────────────────────────────────────────────────────┘
```

## Implementation Tasks

### Task Dependency Graph

```
PHASE 1 (Foundation)
┌─────────┐
│  T1.1   │ Types
└────┬────┘
     │
     ▼
┌─────────┐     ┌─────────┐
│  T1.2   │     │  T1.3   │  ← Can run in PARALLEL after T1.1
│  Hook   │     │  Utils  │
└────┬────┘     └────┬────┘
     │               │
     ▼               │
┌─────────┐          │
│  T1.4   │          │
│Hook Test│          │
└────┬────┘          │
     │               │
     ▼               ▼
PHASE 2 (Components) ─────────────────────────────────────────
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│  T2.1   │  │  T2.2   │  │  T2.3   │  │  T2.4   │  ← All PARALLEL
│ Overlay │  │ Controls│  │ Uploader│  │  Toggle │
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
     │            │            │            │
     ▼            ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ← All PARALLEL
│  T2.5   │  │  T2.6   │  │  T2.7   │  │  T2.8   │
│Ovly Test│  │Ctrl Test│  │Upld Test│  │Togl Test│
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
     │            │            │            │
     ▼            ▼            ▼            ▼
PHASE 3 (Integration) ────────────────────────────────────────
┌─────────┐  ┌─────────┐
│  T3.1   │  │  T3.2   │  ← Can run in PARALLEL
│GridPrvw │  │  CSS    │
└────┬────┘  └────┬────┘
     │            │
     └─────┬──────┘
           ▼
     ┌─────────┐
     │  T3.3   │
     │  App    │
     └────┬────┘
          │
          ▼
PHASE 4 (Polish & Test) ──────────────────────────────────────
┌─────────┐  ┌─────────┐
│  T4.1   │  │  T4.2   │  ← Can run in PARALLEL
│Keyboard │  │  Errors │
└────┬────┘  └────┬────┘
     │            │
     └─────┬──────┘
           ▼
     ┌─────────┐
     │  T4.3   │
     │ E2E Test│
     └─────────┘
```

---

### Phase 1: Foundation

#### T1.1 — Add Type Definitions
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `react-typescript` |
| **Skillset** | TypeScript, type design |
| **File** | `src/types/gridfinity.ts` |
| **Depends On** | None |
| **Parallel With** | None (blocks all other tasks) |

**Description:**
Add `ReferenceImage` interface and `InteractionMode` type to the types file. See Technical Design > Data Model section for exact type definitions.

**Acceptance:**
- Types exported from `src/types/gridfinity.ts`
- No TypeScript errors (`npm run lint` passes)

---

#### T1.2 — Create useReferenceImages Hook
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `react-typescript` |
| **Skillset** | React hooks, localStorage, state management |
| **File** | `src/hooks/useReferenceImages.ts` |
| **Depends On** | T1.1 |
| **Parallel With** | T1.3 |

**Description:**
Create the `useReferenceImages` hook implementing the interface in Technical Design > State Management. Must include:
- State for `images: ReferenceImage[]` and `interactionMode: InteractionMode`
- CRUD operations: `addImage`, `removeImage`
- Property updates: `updateImagePosition`, `updateImageScale`, `updateImageOpacity`, `toggleImageLock`
- Mode toggle: `setInteractionMode`
- localStorage persistence with key `gridfinity-reference-images`
- Load saved images on mount

**Acceptance:**
- Hook exports all functions defined in interface
- State persists across page reloads
- No TypeScript errors

---

#### T1.3 — Create File-to-Base64 Utility
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `react-typescript` |
| **Skillset** | JavaScript File API, async/await |
| **File** | `src/utils/imageUtils.ts` |
| **Depends On** | T1.1 |
| **Parallel With** | T1.2 |

**Description:**
Create utility function to convert File objects to base64 data URLs:
```typescript
export async function fileToDataUrl(file: File): Promise<string>
```
Should validate:
- File is an image type (`image/*`)
- File size under 5MB (configurable constant)
- Returns rejected promise with descriptive error on failure

**Acceptance:**
- Function handles valid images correctly
- Function rejects invalid files with clear error messages
- No TypeScript errors

---

#### T1.4 — Unit Tests for useReferenceImages Hook
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `test-writer` |
| **Skillset** | Vitest, React Testing Library, hook testing |
| **File** | `src/hooks/useReferenceImages.test.ts` |
| **Depends On** | T1.2 |
| **Parallel With** | None in Phase 1 |

**Description:**
Write comprehensive unit tests for the hook covering:
- Initial state (empty images, 'items' mode)
- Adding an image
- Removing an image
- Updating position, scale, opacity
- Toggling lock state
- Switching interaction mode
- localStorage persistence (mock localStorage)

**Acceptance:**
- All tests pass (`npm run test:run`)
- Coverage for all hook functions

---

### Phase 2: Components (All can run in PARALLEL after Phase 1)

#### T2.1 — Create ReferenceImageOverlay Component
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `react-typescript` |
| **Skillset** | React, CSS positioning, drag events |
| **File** | `src/components/ReferenceImageOverlay.tsx` |
| **Depends On** | T1.1, T1.2 |
| **Parallel With** | T2.2, T2.3, T2.4 |

**Description:**
Create component that renders a single reference image overlay. See Technical Design > Component Details > ReferenceImageOverlay.tsx for props interface.

Requirements:
- Absolute positioning within parent container
- Apply `opacity` style from props
- Apply `scale` transform from props
- When `isInteractive=true`: enable drag, show selection border
- When `isInteractive=false`: set `pointer-events: none`
- Call `onPositionChange` during drag
- Call `onSelect` on click

**Acceptance:**
- Component renders image at correct position
- Opacity and scale work correctly
- Drag works when interactive
- Click-through works when not interactive

---

#### T2.2 — Create ReferenceImageControls Component
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `react-typescript` |
| **Skillset** | React, form controls, UI/UX |
| **File** | `src/components/ReferenceImageControls.tsx` |
| **Depends On** | T1.1 |
| **Parallel With** | T2.1, T2.3, T2.4 |

**Description:**
Create component with controls for adjusting a selected reference image. See Technical Design > Component Details > ReferenceImageControls.tsx for props interface.

Requirements:
- Opacity slider (0-100%, displays as percentage)
- Scale slider (10-200%, displays as percentage)
- Lock/unlock toggle button (icon changes based on state)
- Remove button (with confirmation or undo capability)
- Display image name
- Compact, non-intrusive design

**Acceptance:**
- All controls render and are functional
- Slider values update in real-time
- Lock button shows correct state
- Remove triggers callback

---

#### T2.3 — Create ReferenceImageUploader Component
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `react-typescript` |
| **Skillset** | React, File input, async handling |
| **File** | `src/components/ReferenceImageUploader.tsx` |
| **Depends On** | T1.1, T1.3 |
| **Parallel With** | T2.1, T2.2, T2.4 |

**Description:**
Create component with button to upload reference images. See Technical Design > Component Details > ReferenceImageUploader.tsx for props interface.

Requirements:
- Button that opens file picker dialog
- Accept only image files (`accept="image/*"`)
- Show loading state during upload/conversion
- Display error messages for invalid files
- Call `onUpload` with selected file

**Acceptance:**
- File picker opens on button click
- Only image files selectable
- Loading indicator during processing
- Error handling for invalid/large files

---

#### T2.4 — Create InteractionModeToggle Component
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `react-typescript` |
| **Skillset** | React, accessibility, UI/UX |
| **File** | `src/components/InteractionModeToggle.tsx` |
| **Depends On** | T1.1 |
| **Parallel With** | T2.1, T2.2, T2.3 |

**Description:**
Create toggle component for switching between 'items' and 'images' modes. See Technical Design > Component Details > InteractionModeToggle.tsx for props interface.

Requirements:
- Segmented control or toggle button style
- Icons: grid/bin icon for "items", image icon for "images"
- Clear visual indication of current mode
- Disabled state when `hasImages=false`
- Accessible (keyboard navigable, proper ARIA)

**Acceptance:**
- Toggle switches modes correctly
- Visual feedback for current mode
- Disabled when no images
- Keyboard accessible

---

#### T2.5 — Unit Tests for ReferenceImageOverlay
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `test-writer` |
| **Skillset** | Vitest, React Testing Library |
| **File** | `src/components/ReferenceImageOverlay.test.tsx` |
| **Depends On** | T2.1 |
| **Parallel With** | T2.6, T2.7, T2.8 |

**Description:**
Test overlay component:
- Renders image with correct src
- Applies opacity and scale styles
- Drag behavior when interactive
- pointer-events when not interactive
- Callbacks fire correctly

---

#### T2.6 — Unit Tests for ReferenceImageControls
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `test-writer` |
| **Skillset** | Vitest, React Testing Library |
| **File** | `src/components/ReferenceImageControls.test.tsx` |
| **Depends On** | T2.2 |
| **Parallel With** | T2.5, T2.7, T2.8 |

**Description:**
Test controls component:
- Sliders render with correct initial values
- Slider changes call callbacks with new values
- Lock button toggles and shows correct icon
- Remove button calls callback

---

#### T2.7 — Unit Tests for ReferenceImageUploader
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `test-writer` |
| **Skillset** | Vitest, React Testing Library, mocking |
| **File** | `src/components/ReferenceImageUploader.test.tsx` |
| **Depends On** | T2.3 |
| **Parallel With** | T2.5, T2.6, T2.8 |

**Description:**
Test uploader component:
- Button renders
- File input triggered on click
- onUpload called with file
- Loading state shown during processing
- Error state for invalid files

---

#### T2.8 — Unit Tests for InteractionModeToggle
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `test-writer` |
| **Skillset** | Vitest, React Testing Library |
| **File** | `src/components/InteractionModeToggle.test.tsx` |
| **Depends On** | T2.4 |
| **Parallel With** | T2.5, T2.6, T2.7 |

**Description:**
Test toggle component:
- Renders with correct initial mode
- Click toggles mode and calls callback
- Disabled state when hasImages=false
- Keyboard accessibility

---

### Phase 3: Integration

#### T3.1 — Integrate Overlays into GridPreview
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `react-typescript` |
| **Skillset** | React, component composition |
| **File** | `src/components/GridPreview.tsx` |
| **Depends On** | T2.1, T2.5 |
| **Parallel With** | T3.2 |

**Description:**
Modify GridPreview to render reference image overlays:
- Add props: `referenceImages`, `interactionMode`, `selectedImageId`, image callbacks
- Render `ReferenceImageOverlay` for each image (on top of placed items)
- Pass `isInteractive` based on `interactionMode === 'images'`
- When in 'images' mode, disable drag on placed items
- When in 'items' mode, images have pointer-events: none

**Acceptance:**
- Images render on top of grid and placed items
- Mode switching changes interactivity correctly
- Existing placed item functionality unchanged in 'items' mode

---

#### T3.2 — Add CSS Styles
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `css-styling` |
| **Skillset** | CSS, z-index layering, responsive design |
| **File** | `src/App.css` |
| **Depends On** | T2.1, T2.2, T2.3, T2.4 |
| **Parallel With** | T3.1 |

**Description:**
Add CSS for all new components:
- `.reference-image-overlay`: absolute positioning, z-index: 10, transitions
- `.reference-image-overlay--interactive`: cursor grab, selection border
- `.reference-image-overlay--dragging`: cursor grabbing
- `.reference-image-controls`: panel styling, slider styling
- `.reference-image-uploader`: button styling
- `.interaction-mode-toggle`: segmented control styling, active state
- `.images-mode-indicator`: visual indicator when in images mode

**Acceptance:**
- All components styled consistently with existing UI
- z-index hierarchy correct (images on top)
- Responsive on different screen sizes

---

#### T3.3 — Wire Up in App.tsx
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `react-typescript` |
| **Skillset** | React, state management, component wiring |
| **File** | `src/App.tsx` |
| **Depends On** | T3.1, T3.2 |
| **Parallel With** | None |

**Description:**
Integrate all reference image functionality in App:
- Import and use `useReferenceImages` hook
- Add state for `selectedImageId`
- Render `ReferenceImageUploader` in toolbar area
- Render `InteractionModeToggle` in toolbar (near uploader)
- Pass all required props to `GridPreview`
- Render `ReferenceImageControls` when image selected (in images mode)
- Position controls panel appropriately in layout

**Acceptance:**
- Full feature works end-to-end
- All components wired correctly
- State flows properly through component tree

---

### Phase 4: Polish & Testing

#### T4.1 — Add Keyboard Shortcuts
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `react-typescript` |
| **Skillset** | React, keyboard events, accessibility |
| **File** | `src/App.tsx` (or new hook) |
| **Depends On** | T3.3 |
| **Parallel With** | T4.2 |

**Description:**
Add keyboard shortcuts for power users:
- `Tab` or `M`: Toggle interaction mode (when images exist)
- `Delete` or `Backspace`: Remove selected image (when in images mode)
- `Escape`: Deselect image / switch to items mode
- `L`: Toggle lock on selected image

**Acceptance:**
- Shortcuts work as specified
- Don't interfere with normal text input
- Documented in UI (tooltip or help)

---

#### T4.2 — Error Handling & Edge Cases
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `react-typescript` |
| **Skillset** | Error handling, UX, localStorage |
| **File** | Multiple files |
| **Depends On** | T3.3 |
| **Parallel With** | T4.1 |

**Description:**
Handle edge cases gracefully:
- localStorage quota exceeded: show clear error, suggest removing images
- Invalid/corrupt image data: show error, don't crash
- Image fails to load: show placeholder/error state
- Very large images: warn user, consider auto-resize option
- Browser doesn't support File API: graceful degradation message

**Acceptance:**
- No unhandled errors in console
- User-friendly error messages
- App doesn't crash on edge cases

---

#### T4.3 — E2E Tests
| | |
|---|---|
| **Status** | `pending` |
| **Agent** | `e2e-test-writer` |
| **Skillset** | Playwright, E2E testing |
| **File** | `e2e/tests/reference-images.spec.ts` |
| **Depends On** | T4.1, T4.2 |
| **Parallel With** | None |

**Description:**
Write comprehensive E2E tests:
- Upload a reference image
- Verify image renders on grid (on top of items)
- Adjust opacity slider, verify visual change
- Adjust scale slider, verify visual change
- Toggle interaction mode
- Drag image to new position (in images mode)
- Lock image, verify cannot drag
- Remove image
- Verify persistence (reload page, images still there)
- Verify placed items still draggable in items mode

**Acceptance:**
- All E2E tests pass (`npm run test:e2e`)
- Tests cover all acceptance criteria
- Existing E2E tests still pass

---

## Task Summary Table

| Task ID | Description | Agent | Depends On | Parallel Group |
|---------|-------------|-------|------------|----------------|
| T1.1 | Type definitions | `react-typescript` | — | — |
| T1.2 | useReferenceImages hook | `react-typescript` | T1.1 | A |
| T1.3 | File-to-base64 utility | `react-typescript` | T1.1 | A |
| T1.4 | Hook unit tests | `test-writer` | T1.2 | — |
| T2.1 | ReferenceImageOverlay | `react-typescript` | T1.1, T1.2 | B |
| T2.2 | ReferenceImageControls | `react-typescript` | T1.1 | B |
| T2.3 | ReferenceImageUploader | `react-typescript` | T1.1, T1.3 | B |
| T2.4 | InteractionModeToggle | `react-typescript` | T1.1 | B |
| T2.5 | Overlay unit tests | `test-writer` | T2.1 | C |
| T2.6 | Controls unit tests | `test-writer` | T2.2 | C |
| T2.7 | Uploader unit tests | `test-writer` | T2.3 | C |
| T2.8 | Toggle unit tests | `test-writer` | T2.4 | C |
| T3.1 | GridPreview integration | `react-typescript` | T2.1, T2.5 | D |
| T3.2 | CSS styles | `css-styling` | T2.1-T2.4 | D |
| T3.3 | App.tsx wiring | `react-typescript` | T3.1, T3.2 | — |
| T4.1 | Keyboard shortcuts | `react-typescript` | T3.3 | E |
| T4.2 | Error handling | `react-typescript` | T3.3 | E |
| T4.3 | E2E tests | `e2e-test-writer` | T4.1, T4.2 | — |

**Parallel Groups:**
- **Group A**: T1.2, T1.3 (after T1.1)
- **Group B**: T2.1, T2.2, T2.3, T2.4 (after Phase 1)
- **Group C**: T2.5, T2.6, T2.7, T2.8 (each after its component)
- **Group D**: T3.1, T3.2 (after Phase 2 tests)
- **Group E**: T4.1, T4.2 (after T3.3)

---

## Agent Types Required

| Agent Type | Tasks | Skills |
|------------|-------|--------|
| `react-typescript` | T1.1, T1.2, T1.3, T2.1, T2.2, T2.3, T2.4, T3.1, T3.3, T4.1, T4.2 | React, TypeScript, hooks, state management, drag-drop |
| `test-writer` | T1.4, T2.5, T2.6, T2.7, T2.8 | Vitest, React Testing Library, mocking |
| `css-styling` | T3.2 | CSS, z-index, responsive design, UI/UX |
| `e2e-test-writer` | T4.3 | Playwright, E2E testing patterns |

## File Changes Summary

### New Files

| File | Description |
|------|-------------|
| `src/hooks/useReferenceImages.ts` | State management hook |
| `src/components/ReferenceImageOverlay.tsx` | Image overlay on grid |
| `src/components/ReferenceImageControls.tsx` | Opacity/scale/remove UI |
| `src/components/ReferenceImageUploader.tsx` | Upload button component |
| `src/components/InteractionModeToggle.tsx` | Mode toggle component |
| `src/hooks/useReferenceImages.test.ts` | Hook unit tests |
| `src/components/ReferenceImageOverlay.test.tsx` | Overlay unit tests |
| `src/components/ReferenceImageControls.test.tsx` | Controls unit tests |
| `src/components/ReferenceImageUploader.test.tsx` | Uploader unit tests |
| `src/components/InteractionModeToggle.test.tsx` | Toggle unit tests |
| `e2e/tests/reference-images.spec.ts` | E2E tests |

### Modified Files

| File | Changes |
|------|---------|
| `src/types/gridfinity.ts` | Add `ReferenceImage`, `InteractionMode` types |
| `src/App.tsx` | Add reference images state, pass to components |
| `src/App.css` | Add styles for new components |
| `src/components/GridPreview.tsx` | Render reference image overlays |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Large images exceed localStorage quota | Limit file size, compress images, show clear error |
| Performance with multiple large images | Use CSS transforms, lazy load, limit image count |
| Drag conflicts between modes | Clear visual mode indicator, disable wrong interactions |
| Image position math complexity | Use same percentage-based system as placed items |

## Future Enhancements (Out of Scope)

- Cloud storage for images (avoid localStorage limits)
- Image cropping/rotation tools
- Multiple image layers with reordering
- Image snapping to grid lines
- Import images from URL

## Acceptance Criteria

1. User can upload one or more images
2. Images render **on top of** all placed items (highest z-index layer)
3. Each image has independent opacity control (0-100%) to see items through
4. Each image has independent scale control (10-200%)
5. User can drag images to reposition (when in images mode)
6. User can toggle between "items" and "images" interaction modes
7. User can lock images to prevent accidental movement
8. User can remove images
9. Images persist in localStorage between sessions
10. All unit and E2E tests pass
