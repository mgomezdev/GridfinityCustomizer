# Ordinus Agent Docs — Index

The canonical contributor and architecture reference is `/CLAUDE.md` at the repo root. Start there — it covers stack, monorepo layout, commands, coding standards, and git workflow.

Supplementary files in this directory (may be stale — verify against source if in doubt):

- `backend.md` — Express/controllers/services layer: STL generation pipeline, image processing limits, thumbnail/user-STL file handling, the libsql `COUNT(*)` workaround.
- `frontend.md` — DataSourceAdapter pattern, provider wiring, TanStack Query usage, key contexts/hooks.
- `data-model.md` — table-level reference for `server/src/db/schema.ts`.
- `integrations.md` — the Ordinus → Themis send flow: dedup, resume, bidirectional linking, and where the current implementation has drifted from the original design spec.
- `conventions.md` — non-obvious invariants, mostly reverse-engineered from recent bug fixes. Highest-value file — skim before touching file storage, image processing, or the generation pipeline.
