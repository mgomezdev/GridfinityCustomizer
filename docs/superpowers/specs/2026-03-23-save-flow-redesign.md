# Save Flow Redesign — Design Spec

## Goal

Replace the single Save button in the workspace toolbar with context-aware save buttons that eliminate unnecessary modal friction when updating an existing layout.

## Summary

| Layout state | Buttons shown | Behavior |
|---|---|---|
| Unsaved (`layoutMeta.id === null`) | **Save** | Opens naming modal → creates new layout |
| Saved, not delivered | **Save as New** + **Save Changes** | Save Changes updates silently + toast; Save as New opens modal |
| Delivered (`isReadOnly`) | **Build from This** | Opens naming modal → creates new layout copy |

---

## Button Logic — WorkspacePage Toolbar

All save buttons are only shown when `isAuthenticated === true`. The current single `Save` button (and the separate `Clone` button in delivered state) are replaced by this conditional rendering:

```tsx
{/* Unsaved layout */}
{isAuthenticated && !isReadOnly && !layoutMeta.id && (
  <button
    className="layout-toolbar-btn layout-save-btn"
    onClick={() => dialogDispatch({ type: 'OPEN', dialog: 'save' })}
    type="button"
    disabled={placedItems.length === 0 && refImagePlacements.length === 0}
  >
    Save
  </button>
)}

{/* Saved layout — draft or submitted */}
{isAuthenticated && !isReadOnly && layoutMeta.id && (
  <>
    <button
      className="layout-toolbar-btn"
      onClick={() => dialogDispatch({ type: 'OPEN', dialog: 'save' })}
      type="button"
    >
      Save as New
    </button>
    <button
      className="layout-toolbar-btn layout-save-btn"
      onClick={handleDirectSave}
      type="button"
      disabled={updateLayoutMutation.isPending}
    >
      {updateLayoutMutation.isPending ? 'Saving…' : 'Save Changes'}
    </button>
  </>
)}

{/* Delivered (read-only) layout */}
{isAuthenticated && isReadOnly && (
  <button
    className="layout-toolbar-btn layout-save-btn"
    onClick={() => dialogDispatch({ type: 'OPEN', dialog: 'save' })}
    type="button"
  >
    Build from This
  </button>
)}
```

The existing `Clone` button block (`isAuthenticated && isReadOnly`) is **removed** — `Build from This` replaces it.

---

## Direct Save — `handleDirectSave`

A new callback in `WorkspacePage` that calls the update mutation without opening a modal.

```tsx
const updateLayoutMutation = useUpdateLayoutMutation();

const handleDirectSave = useCallback(async () => {
  if (!layoutMeta.id) return;
  try {
    const payload = buildPayload(
      layoutMeta.name,
      layoutMeta.description,
      gridResult.gridX,
      gridResult.gridY,
      ws.drawerWidth,   // mm value from context, same as AppShell passes to SaveLayoutDialog
      ws.drawerDepth,
      spacerConfig,
      placedItems,
      refImagePlacements,
    );
    const result = await updateLayoutMutation.mutateAsync({ id: layoutMeta.id, data: payload });
    handleSaveComplete(result.id, result.name, result.status);
    setToast({ visible: true, isError: false });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 1500);
  } catch {
    setToast({ visible: true, isError: true });
  }
}, [layoutMeta, gridResult, ws.drawerWidth, ws.drawerDepth, spacerConfig, placedItems,
    refImagePlacements, updateLayoutMutation, handleSaveComplete]);
```

`buildPayload` must be **exported** from `SaveLayoutDialog.tsx` so WorkspacePage can import it.

`handleSaveComplete` is already available from `useWorkspace()` — add it to the WorkspacePage destructure list.

`ws.drawerWidth` / `ws.drawerDepth` are the mm-converted values already passed to `SaveLayoutDialog` from AppShell. Access them via the `ws` reference (`const ws = useWorkspace()`) already present in WorkspacePage.

---

## Toast Component — `<SaveToast>`

A small inline component rendered inside `WorkspacePage`, positioned below the toolbar.

### State

```tsx
const [toast, setToast] = useState<{ visible: boolean; isError: boolean }>({
  visible: false,
  isError: false,
});
```

### JSX

```tsx
{toast.visible && (
  <div className={`save-toast ${toast.isError ? 'save-toast-error' : 'save-toast-success'}`}>
    {toast.isError ? (
      <>
        <span>Save failed. Try again.</span>
        <button
          type="button"
          className="save-toast-dismiss"
          onClick={() => setToast(t => ({ ...t, visible: false }))}
          aria-label="Dismiss"
        >
          ×
        </button>
      </>
    ) : (
      <span>Saved!</span>
    )}
  </div>
)}
```

### CSS

```css
.save-toast {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.save-toast-success {
  background: var(--color-success-bg, #1a3a2a);
  border: 1px solid var(--color-success-border, #2a5a3a);
  color: var(--color-success-text, #a0e0b0);
}

.save-toast-error {
  background: var(--color-error-bg, #3a1a1a);
  border: 1px solid var(--color-error-border, #5a2a2a);
  color: var(--color-error-text, #f0a0a0);
}

.save-toast-dismiss {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  opacity: 0.7;
}

.save-toast-dismiss:hover {
  opacity: 1;
}
```

Toast placement: rendered alongside the toolbar buttons inside `.reference-image-toolbar`.

---

## SaveLayoutDialog Changes

The dialog is now always in "create new" mode. The `Update` button and its conditional logic are removed.

### Props removed

- `currentLayoutStatus` — no longer needed (archived notice logic removed from dialog)

> **Note:** `currentLayoutId`, `currentLayoutName`, `currentLayoutDescription` are retained — they pre-fill the name/description fields when opening "Save as New" from a saved layout so the user can modify and save a copy.

### `SaveLayoutForm` changes

1. Remove `isDelivered` / `isExistingLayout` variables
2. Remove `updateLayoutMutation` and `handleUpdate`
3. Remove the archived layout notice (`<div className="layout-dialog-notice">`)
4. Remove the `Update` button from `layout-dialog-actions`
5. Change the `Enter` key handler to always call `handleSaveNew`
6. Dialog title: always `'Save Layout'` (the `isExistingLayout && !isDelivered` condition is gone)
7. The `Save as New` button label changes to `Save` (it is the only action now)
8. Button style: always `submit-button` (primary, no conditional class)

### AppShell prop update

`currentLayoutStatus` is passed to `SaveLayoutDialog` in `AppShell.tsx` — remove that prop from the call site.

---

## Files Changed

| File | Change |
|---|---|
| `packages/app/src/components/layouts/SaveLayoutDialog.tsx` | Export `buildPayload`; remove Update button, `handleUpdate`, `isDelivered`/`isExistingLayout` logic, archived notice, `currentLayoutStatus` prop |
| `packages/app/src/pages/WorkspacePage.tsx` | Replace Save + Clone buttons with conditional three-state rendering; add `handleDirectSave` + `useUpdateLayoutMutation`; add `<SaveToast>` |
| `packages/app/src/AppShell.tsx` | Remove `currentLayoutStatus` from `<SaveLayoutDialog>` props |
| `packages/app/src/App.css` | Add `.save-toast`, `.save-toast-success`, `.save-toast-error`, `.save-toast-dismiss` |

---

## Testing

### WorkspacePage (App.test.tsx)

- **Unsaved state:** Only `Save` button renders; no `Save Changes` or `Save as New`
- **Saved state:** Both `Save Changes` and `Save as New` render; no `Save` alone
- **Delivered state:** Only `Build from This` renders
- **Save Changes success:** Calls update mutation; success toast appears; toast auto-dismisses
- **Save Changes error:** Error toast appears and does not auto-dismiss; dismiss button clears it

### SaveLayoutDialog (SaveLayoutDialog.test.tsx, if exists)

- No `Update` button renders for any input combination
- `Save` button (formerly "Save as New") is always the primary action
- Name pre-filled when `currentLayoutName` is provided
- No archived layout notice renders

---

## Out of Scope

- Keyboard shortcut (Ctrl+S) — separate concern, not part of this change
- Toast system reuse for other actions — only needed for `Save Changes`; extract later if needed
- Auto-save / dirty-state tracking — no unsaved changes indicator
