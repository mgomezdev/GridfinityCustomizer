# Reference Image Upload Feature Plan

## Overview

Enable users to upload reference images that render as overlays on the grid. Users can use these images as visual guides when placing library items. Each image has independent scale, opacity, and position controls.

## User Stories

1. **As a user**, I want to upload a reference image so I can visually plan my bin layout
2. **As a user**, I want to adjust the opacity of each image so placed items remain visible
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
Layer 3: Selected placed items (z-index: 2)
Layer 2: Placed items (z-index: 1)
Layer 1: Reference images (z-index: 0) ← NEW
Layer 0: Spacer overlays (z-index: -1) ← Adjust existing
```

Reference images render **above** spacers but **below** placed items.

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
│                   │     │ [Reference Image Layer]     │ │
│                   │     │ [Placed Items Layer]        │ │
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

### Phase 1: Core Infrastructure

- [ ] Add `ReferenceImage` and `InteractionMode` types to `src/types/gridfinity.ts`
- [ ] Create `useReferenceImages` hook with state and localStorage persistence
- [ ] Write unit tests for `useReferenceImages` hook

### Phase 2: Image Upload

- [ ] Create `ReferenceImageUploader` component
- [ ] Implement file-to-base64 conversion utility
- [ ] Add upload button to UI (near grid controls)
- [ ] Write unit tests for uploader component

### Phase 3: Image Rendering

- [ ] Create `ReferenceImageOverlay` component
- [ ] Integrate overlays into `GridPreview`
- [ ] Adjust spacer z-index to render below reference images
- [ ] Add CSS for image overlay positioning and opacity
- [ ] Write unit tests for overlay component

### Phase 4: Image Controls

- [ ] Create `ReferenceImageControls` component
- [ ] Add opacity slider functionality
- [ ] Add scale slider functionality
- [ ] Add remove button functionality
- [ ] Add lock/unlock toggle
- [ ] Write unit tests for controls

### Phase 5: Interaction Mode

- [ ] Create `InteractionModeToggle` component
- [ ] Implement mode switching in App state
- [ ] Update `GridPreview` to respect interaction mode
- [ ] Make placed items non-draggable in "images" mode
- [ ] Make reference images click-through in "items" mode
- [ ] Write unit tests for mode toggle

### Phase 6: Image Dragging

- [ ] Implement drag-to-reposition for reference images
- [ ] Add visual feedback during drag (cursor change, etc.)
- [ ] Constrain image position within grid bounds
- [ ] Respect lock state (prevent drag when locked)
- [ ] Write unit tests for drag functionality

### Phase 7: Polish & Testing

- [ ] Add keyboard shortcuts (e.g., Tab to toggle mode, Delete to remove)
- [ ] Add visual indicator when in "images" mode
- [ ] Handle edge cases (invalid images, storage quota exceeded)
- [ ] Write E2E tests for complete workflow
- [ ] Update any affected existing E2E tests

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
2. Images render above spacers but below placed items
3. Each image has independent opacity control (0-100%)
4. Each image has independent scale control (10-200%)
5. User can drag images to reposition (when in images mode)
6. User can toggle between "items" and "images" interaction modes
7. User can lock images to prevent accidental movement
8. User can remove images
9. Images persist in localStorage between sessions
10. All unit and E2E tests pass
