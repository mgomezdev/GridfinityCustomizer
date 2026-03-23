# Saved Configs Full Page & Order Summary Page — Design Spec

**Date:** 2026-03-22
**Tasks:** #50 (Saved Configs full page), #51 (Order Summary / BOM full page)
**Design system:** DrawerArchitect (Inter, #007AFF, #f8f9fa, 4px radius, dark status bar)

---

## Goal

Convert two existing modal flows into full-page views accessible via React Router:

1. **Saved Configs** (`/configs`) — browse, edit, duplicate, and submit saved layouts
2. **Order Summary** (`/order`) — review BOM with pricing, export PDF, and submit the current layout

---

## Architecture

### Routing

Add `react-router-dom` v6. Three routes under a persistent `AppShell`:

| Route | Component | Auth required |
|-------|-----------|---------------|
| `/` | `WorkspacePage` | No |
| `/configs` | `SavedConfigsPage` | Yes |
| `/order` | `OrderSummaryPage` | Yes |

`App.tsx` becomes thin: sets up `<BrowserRouter>` + `<Routes>` + `<AppShell>`.

A `<RequireAuth>` guard component redirects unauthenticated visitors from `/configs` and `/order` to `/`.

### AppShell (`src/AppShell.tsx`)

Renders the persistent chrome (nav bar + status bar) and a `<Outlet>` for page content. Owns and provides `WorkspaceContext` so workspace state persists across navigation.

`<NavLink>` components replace the current `<button>` tab elements in the nav, giving real URL-based active states.

### WorkspaceContext (`src/contexts/WorkspaceContext.tsx`)

Extracts all workspace state currently in `App.tsx` (placed items, grid dimensions, BOM, layout meta, spacer config, library data, ref images, etc.) into a context + provider. `WorkspacePage` and `OrderSummaryPage` consume it.

This is a refactor of `App.tsx` — no behaviour changes, only state lifted out.

---

## Saved Configs Page (`src/pages/SavedConfigsPage.tsx`)

### Layout

Full-width page inside the shell `<main>`. No sidebar or library panel.

### Content

**Page header**
- Title: "My Saved Configs"
- Subtitle: "Review and manage your gridfinity layouts."

**Card grid**
- CSS: `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))`
- One `SavedConfigCard` component per layout

**SavedConfigCard** (`src/components/layouts/SavedConfigCard.tsx`)
- Thumbnail area: placeholder with grid dimensions (e.g. `4×4`) and item count badge — no thumbnail generation yet (see todo #58)
- Layout name (bold)
- Last-saved date (secondary text)
- Status badge — reuses existing `.layout-status-badge` / `.layout-status-{status}` CSS classes
- Action row:
  - **Edit** — calls `handleLoadLayout` from `WorkspaceContext`, navigates to `/`
  - **Duplicate** — calls existing clone mutation, stays on `/configs`
  - **Submit** — visible on `draft` layouts only; calls submit mutation
  - **Withdraw** — visible on `submitted` layouts only; calls withdraw mutation

**New Configuration card** (dashed border)
- `+` icon + "New Configuration" label + "Start fresh" subtitle
- Clears workspace state, navigates to `/`

**Empty state**
- Shown when the layout list is empty: friendly message + "Start your first layout" CTA linking to `/`

### Data

Reuses the existing `useLayouts` hook (already used by `LoadLayoutDialog`). The `LayoutList` component is retired; its logic moves into `SavedConfigCard`.

---

## Order Summary Page (`src/pages/OrderSummaryPage.tsx`)

### Trigger

"Review & Submit →" in the status bar navigates to `/order` instead of calling submit directly. Submission happens from this page.

If the layout has no saved ID (unsaved work), the page shows a Save prompt before allowing submission.

### Layout

Two-column layout:
- **Left (main):** BOM table + drawer info
- **Right (panel):** Order total + actions

### Left Column

**Breadcrumb:** `WORKSPACE › ORDER SUMMARY` — "WORKSPACE" is a `<Link to="/">`

**Title:** "Order Summary & BOM"

**Subtitle:** "Review your layout before submitting. Items marked 'Price TBD' will receive a confirmed quote before any build or shipment."

**BOM table** (columns: Component Item | Qty | Unit Price | Total)
- Component Item: color swatch + item name + size (e.g. `2×3`)
- Unit Price:
  - Known price: formatted as currency (e.g. `$12.50`)
  - Unknown: "Price TBD" chip (amber background, `#b45309` text, pill shape)
- Total: `qty × unit price` when price is known; `—` when TBD
- Empty state: "No items placed — go back to the workspace to add items."

**Drawer Dimensions section**
- Displays `{W}mm × {D}mm` and grid units (`{gridX} × {gridY}`)

**Capacity section**
- Percentage bar (same calculation as status bar: items placed / total grid cells)

### Right Column (Order Panel)

**ORDER TOTAL card**
- Subtotal: sum of all known-price line totals
- TBD disclaimer (shown when any item has no price): "† One or more items are Price TBD. A quote will follow before any build or shipment."
- Total line: shows subtotal if no TBD items; "Pending quote" if any TBD items

**Action buttons (stacked, full-width)**
1. **Download PDF** — calls existing `exportToPdf(gridEl, bomItems, { gridResult, spacerConfig, unitSystem, layoutName })`; requires a hidden `<div>` ref containing the grid preview for the screenshot
2. **Submit Layout** (blue) — calls submit mutation; on success navigates to `/configs`; disabled if `totalPlaced === 0` or mutation is pending
3. **Save & Exit** — saves layout (opens `SaveLayoutDialog` or auto-saves if already saved), then navigates to `/configs`

**Read-only state** (delivered layouts): Submit button hidden; shows "This layout has been fulfilled." message.

### Pricing Data

Add optional `price?: number` to:
- `LibraryItem` type (`src/types/gridfinity.ts`)
- `BOMItem` type (`src/types/gridfinity.ts`)

`useBillOfMaterials` hook propagates `price` from `LibraryItem` → `BOMItem` (if present).

No backend schema changes in this task — prices default to `undefined` for all items. Backend price management is a future task.

---

## Files Created / Modified

| File | Action |
|------|--------|
| `packages/app/src/App.tsx` | Refactor: becomes thin router setup |
| `packages/app/src/AppShell.tsx` | **Create**: persistent nav + status bar + Outlet |
| `packages/app/src/contexts/WorkspaceContext.tsx` | **Create**: extract workspace state from App.tsx |
| `packages/app/src/pages/WorkspacePage.tsx` | **Create**: current App.tsx main content |
| `packages/app/src/pages/SavedConfigsPage.tsx` | **Create**: full-page saved configs |
| `packages/app/src/pages/OrderSummaryPage.tsx` | **Create**: full-page order summary |
| `packages/app/src/components/layouts/SavedConfigCard.tsx` | **Create**: card for one saved layout |
| `packages/app/src/components/RequireAuth.tsx` | **Create**: auth guard wrapper |
| `packages/app/src/types/gridfinity.ts` | Modify: add `price?: number` to LibraryItem + BOMItem |
| `packages/app/src/hooks/useBillOfMaterials.ts` | Modify: propagate price field |
| `packages/app/src/App.css` | Modify: add page + card grid styles |

---

## Testing

**Unit tests:**
- `SavedConfigCard` — renders name, date, status badge, correct action buttons per status
- `OrderSummaryPage` — renders BOM table, TBD chips for unpriced items, price calculations for priced items
- `WorkspaceContext` — state persists across navigation (mock router)
- `RequireAuth` — redirects unauthenticated users

**E2E tests (Playwright):**
- Navigate to `/configs` → see saved layouts list
- Click Edit on a card → lands on `/`, workspace loads that layout
- Click "Review & Submit →" → navigates to `/order`, BOM visible
- Click "Download PDF" → PDF download triggered
- Click "Submit Layout" → submit mutation called, navigates to `/configs`
- Unauthenticated user visiting `/configs` → redirected to `/`

---

## Out of Scope

- Thumbnail generation for Saved Configs cards (todo #58)
- Backend price management / admin pricing UI
- Actual payment processing
