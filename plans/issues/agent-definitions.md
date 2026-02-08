# GitHub Issue: Create Agent Definition Files

**Title:** Create agent definition files for orchestrator subagents

---

## Overview

Create `agent.md` definition files for each specialized agent type identified in the reference image upload feature plan. These definitions will be used by the orchestrator to delegate tasks to appropriate subagents.

## Background

The [reference image upload plan](../reference-image-upload.md) identified 4 distinct agent types needed to implement the feature. Each agent needs a formal definition file that describes its capabilities, tools, and constraints.

## Agent Definitions Required

### 1. `agents/react-typescript.agent.md`

**Purpose:** Primary development agent for React/TypeScript implementation tasks.

**Capabilities:**
- Create and modify React functional components
- Implement custom React hooks with proper state management
- Write TypeScript interfaces, types, and type guards
- Handle async operations (Promises, async/await)
- Implement drag-and-drop using HTML5 Drag API
- Work with browser APIs (localStorage, File API, FileReader)
- Manage component props and state flow
- Apply React best practices (derived state, early returns, single responsibility)

**Tools Access:**
- Read files
- Write/Edit files
- Run TypeScript compiler (`tsc`)
- Run linter (`npm run lint`)
- Run dev server (`npm run dev`)

**Constraints:**
- Must follow project coding standards (see CLAUDE.md)
- No `any` types - use strict TypeScript
- Functional components only
- Props interface must be defined above component
- No setState during render or useEffect

**Files Typically Modified:**
- `src/components/*.tsx`
- `src/hooks/*.ts`
- `src/types/*.ts`
- `src/utils/*.ts`

---

### 2. `agents/test-writer.agent.md`

**Purpose:** Specialized agent for writing unit tests using Vitest and React Testing Library.

**Capabilities:**
- Write unit tests for React components
- Write unit tests for custom hooks (using `renderHook`)
- Write unit tests for utility functions
- Mock external dependencies (localStorage, fetch, timers)
- Mock callback props and verify they're called correctly
- Test async behavior and state updates
- Achieve comprehensive test coverage
- Follow Arrange-Act-Assert pattern

**Tools Access:**
- Read files (to understand what to test)
- Write/Edit test files
- Run tests (`npm run test:run`)
- Run tests in watch mode (`npm test`)

**Constraints:**
- Test files must use `.test.ts` or `.test.tsx` extension
- Mock external dependencies, not internal modules
- One test file per source file
- Tests should be independent (no shared mutable state)
- Use descriptive test names that explain the scenario

**Files Typically Modified:**
- `src/components/*.test.tsx`
- `src/hooks/*.test.ts`
- `src/utils/*.test.ts`

**Testing Patterns:**
```typescript
// Component testing
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

// Hook testing
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from './useMyHook';

// Mocking localStorage
const localStorageMock = { getItem: vi.fn(), setItem: vi.fn(), ... };
vi.stubGlobal('localStorage', localStorageMock);
```

---

### 3. `agents/css-styling.agent.md`

**Purpose:** Specialized agent for CSS styling, layout, and visual design.

**Capabilities:**
- Write CSS for React components
- Implement responsive layouts (flexbox, grid)
- Manage z-index layering and stacking contexts
- Create smooth transitions and animations
- Style form controls (sliders, buttons, toggles)
- Ensure visual consistency with existing UI
- Handle hover, focus, active, and disabled states
- Use CSS custom properties (variables) for theming

**Tools Access:**
- Read files (to understand existing styles)
- Write/Edit CSS files
- Run dev server to preview changes (`npm run dev`)

**Constraints:**
- Use kebab-case for class names (e.g., `.reference-image-overlay`)
- Use BEM-like modifiers (e.g., `.component--modifier`)
- No inline styles in components (except dynamic values)
- Must work across modern browsers
- Respect existing color scheme and spacing

**Files Typically Modified:**
- `src/App.css`
- `src/*.css` (component-specific stylesheets if they exist)

**CSS Patterns:**
```css
/* Component base */
.reference-image-overlay { ... }

/* State modifiers */
.reference-image-overlay--interactive { ... }
.reference-image-overlay--dragging { ... }
.reference-image-overlay--locked { ... }

/* Child elements */
.reference-image-overlay__handle { ... }
```

---

### 4. `agents/e2e-test-writer.agent.md`

**Purpose:** Specialized agent for writing end-to-end tests using Playwright.

**Capabilities:**
- Write E2E tests that simulate real user workflows
- Use Page Object Model pattern for maintainability
- Handle file uploads in browser context
- Test drag-and-drop interactions
- Verify visual state (opacity, position, visibility)
- Test localStorage persistence across page reloads
- Handle async operations and wait for elements
- Create test fixtures and utilities

**Tools Access:**
- Read files (to understand app behavior)
- Write/Edit E2E test files
- Run E2E tests (`npm run test:e2e`)
- Run E2E tests with UI (`npm run test:e2e:ui`)
- Run E2E tests in debug mode (`npm run test:e2e:debug`)

**Constraints:**
- Test files must use `.spec.ts` extension
- Use page objects from `e2e/pages/`
- Use test utilities from `e2e/utils/`
- Tests must be independent and idempotent
- Clean up test data after each test
- Use meaningful test descriptions

**Files Typically Modified:**
- `e2e/tests/*.spec.ts`
- `e2e/pages/*.ts` (page objects)
- `e2e/utils/*.ts` (test utilities)
- `e2e/fixtures/*.ts` (test data)

**E2E Patterns:**
```typescript
import { test, expect } from '@playwright/test';
import { GridPage } from '../pages/GridPage';

test.describe('Reference Images', () => {
  test('user can upload and adjust reference image', async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Upload image
    await gridPage.uploadReferenceImage('test-image.png');

    // Verify and interact
    await expect(gridPage.referenceImageOverlay).toBeVisible();
    await gridPage.setImageOpacity(50);
    // ...
  });
});
```

---

## File Structure

```
agents/
├── react-typescript.agent.md
├── test-writer.agent.md
├── css-styling.agent.md
└── e2e-test-writer.agent.md
```

## Acceptance Criteria

- [ ] All 4 agent definition files created in `agents/` directory
- [ ] Each file includes: purpose, capabilities, tools, constraints, typical files
- [ ] Each file includes example patterns relevant to this codebase
- [ ] Definitions are detailed enough for an orchestrator to make delegation decisions
- [ ] Definitions reference project-specific conventions from CLAUDE.md

## Labels

`enhancement`, `documentation`, `agents`

## Related

- Plan: `plans/reference-image-upload.md`
- Project conventions: `CLAUDE.md`
