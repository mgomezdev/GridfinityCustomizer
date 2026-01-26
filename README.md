# GridfinityCustomizer

A web application for customizing Gridfinity modular storage system components. Users can configure bin dimensions, drag-and-drop items onto a grid, rotate them, and plan layouts for 3D printing.

## Features

- Configure grid dimensions (width × height)
- Drag items from library onto grid
- Move and rotate placed items
- Collision detection with visual feedback
- Unit conversion (mm ↔ inches)

## Tech Stack

- React + TypeScript
- Vite
- Vitest for testing

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Branching Strategy (Gitflow)

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready releases |
| `develop` | Integration branch for features |
| `feature/*` | New features (branch from `develop`) |
| `release/*` | Release preparation (branch from `develop`) |
| `hotfix/*` | Urgent production fixes (branch from `main`) |

### Workflow

```bash
# Start a new feature
git checkout develop
git checkout -b feature/my-feature

# Finish feature (merge to develop)
git checkout develop
git merge feature/my-feature

# Create release
git checkout develop
git checkout -b release/1.0.0

# Finish release (merge to main and develop)
git checkout main
git merge release/1.0.0
git tag -a v1.0.0 -m "Release 1.0.0"
git checkout develop
git merge release/1.0.0
```
