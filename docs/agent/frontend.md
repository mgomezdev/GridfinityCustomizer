# Frontend Notes

React 19 + TypeScript + Vite, `app/src/`.

## DataSourceAdapter pattern

`api/adapters/types.ts` defines `DataSourceAdapter` (`getLibraries`, `getLibraryItems`, `getLibraryMeta`, `resolveImageUrl`). `ApiAdapter` (`api/adapters/api.adapter.ts`) is the only implementation — a prior `StaticAdapter` was removed. `DataSourceProvider` (`contexts/DataSourceContext.tsx`) constructs the default `ApiAdapter` from `VITE_API_BASE_URL`; the `adapter?` prop is a test seam only, not a live second implementation — don't design new adapter-consuming code as if a swap is imminent.

## Provider wiring

Providers are composed in `main.tsx`, not `App.tsx`:

```
QueryClientProvider → CustomerProvider → DataSourceProvider → App
```

Storage migrations (`migrateStoredItems`, `migrateLibrarySelection`) run synchronously before `createRoot(...).render(...)`, so `useState` initializers inside `App` see already-migrated `localStorage` data.

## Data fetching

TanStack Query v5 (`useQuery`/`useQueries`) layered on top of `useDataSource()`. Query client is built once in `api/queryClient.ts` and passed down from `main.tsx`.

## Generation status: SSE + poll backstop

`useGenerationEvents` opens one `EventSource` to `/generation/events` for the app's lifetime. Browsers reconnect a dropped `EventSource` automatically but do **not** replay missed messages — a hash whose completion event fired during the drop would otherwise stay `pending` forever with no recovery short of a full reload.

`useGenerationState` compensates with two things layered on top of the SSE stream:
- A `setInterval` poll (10s) over currently-`pending` hashes via `getGenerationStatusApi` (`GET /generation/status/:hash`).
- An immediate poll pass triggered by `useGenerationEvents`'s `onOpen` callback, which fires both on the initial connection and after any browser-driven reconnect.

If you add a new generation-tracking consumer, route it through `useGenerationState` rather than opening a second `EventSource` — the poll backstop only covers hashes registered with this hook.

## Key contexts/hooks

- `CustomerContext` — active customer profile (replaces the removed auth/JWT flow; no password auth in this app).
- `useGridItems` — placed-item state on the grid.
- `useGridTransform` — zoom/pan transform state.
- `useLayouts` — saved layout CRUD/list state.

## Mobile save path

`WorkspacePage.handleMobileSave` is a separate code path from the desktop `WorkspaceToolbar` save flow and has its own error state (`mobileSaveError`) rendered via a `.mobile-save-toast` using the same `save-toast-error` markup desktop uses. If you touch save-error UX, check both paths — they don't share a component, only CSS classes.
