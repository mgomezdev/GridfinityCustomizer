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

# Run tests
npm test

# Run single test file
npm test -- path/to/test.ts
```

## Architecture

The application follows a standard React structure:

- `src/components/` - Reusable UI components
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions for gridfinity calculations

## Git Workflow (Gitflow)

- Feature branches merge into `develop`
- Only `develop` merges into `main`
- No cherry-picking
