# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gridfinity Customizer is a web application for customizing Gridfinity modular storage system components. Users can configure bin dimensions, dividers, and other parameters, then export designs for 3D printing.

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Unit Testing**: Vitest + React Testing Library
- **E2E Testing**: Playwright
- **Linting**: ESLint

## Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run unit tests
npm run test:run

# Run unit tests in watch mode
npm test

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

## Architecture

```
src/
├── components/     # React components
├── hooks/          # Custom React hooks
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── test/           # Test setup

e2e/
├── tests/          # Playwright test specs
├── pages/          # Page object models
├── utils/          # Test utilities (drag-drop, localStorage)
└── fixtures/       # Test data
```

## Coding Standards

### TypeScript
- Use strict types; avoid `any`
- Define interfaces for component props
- Export types from `src/types/`

### React Components
- Functional components only
- Props interface above component: `interface FooProps { ... }`
- Derive state when possible; avoid redundant state
- No setState during render or in useEffect (use derived state pattern)

### Naming Conventions
- Components: `PascalCase` (e.g., `GridPreview.tsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `useGridItems.ts`)
- Utils: `camelCase` (e.g., `conversions.ts`)
- Tests: `*.test.ts(x)` for unit, `*.spec.ts` for E2E
- CSS classes: `kebab-case` (e.g., `.grid-container`)

### Code Style
- Keep functions small and focused
- Prefer early returns over nested conditionals
- Extract magic numbers to named constants
- No commented-out code; delete unused code

### Testing
- **Write tests first**: Create/update test cases before writing implementation code
- Unit test hooks and utilities
- E2E test user workflows
- Use page objects for E2E tests
- Mock external dependencies, not internal modules

## Git Workflow

```bash
# Create feature branch
git checkout -b feat/description

# Create fix branch
git checkout -b fix/description

# Commit format
type(scope): description

# Examples:
feat(grid): add zoom controls
fix(library): resolve drag-drop on touch devices
refactor(hooks): simplify state management
```

## Before Committing

1. Run `npm run lint` - fix all errors
2. Run `npm run test:run` - all unit tests pass
3. Run `npm run test:e2e` - all E2E tests pass
4. Keep commits focused; one logical change per commit

## Key Files

- `src/components/GridPreview.tsx` - Main grid rendering and drop target
- `src/components/LibraryItemCard.tsx` - Draggable library items
- `src/hooks/useGridItems.ts` - Placed item state management
- `src/types/gridfinity.ts` - Core type definitions
