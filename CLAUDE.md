# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gridfinity Customizer is a web application for customizing Gridfinity modular storage system components. Users can configure bin dimensions, dividers, and other parameters, then export designs for 3D printing.

## Tech Stack

- **Frontend**: React + TypeScript
- **Build Tool**: Vite
- **3D Rendering**: TBD (to be added later)

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
npm test

# Run single test file
npm test -- path/to/test.ts

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

## Architecture

The application follows a standard React structure:

- `src/components/` - Reusable UI components
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions for gridfinity calculations
- `e2e/` - End-to-end tests with Playwright
  - `e2e/tests/` - Test specifications
  - `e2e/pages/` - Page object models
  - `e2e/utils/` - Test utilities (drag-drop helpers, localStorage)
