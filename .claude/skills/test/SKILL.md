# Test Runner Skill

Run all tests (unit + E2E) for the Gridfinity Customizer project.

## Usage

```
/test           # Run all tests (unit + E2E)
/test unit      # Run only Vitest unit tests
/test e2e       # Run only Playwright E2E tests
/test coverage  # Run unit tests with coverage
```

## Commands

### All Tests
```bash
npm run test:run && npm run test:e2e
```

### Unit Tests Only (Vitest)
```bash
npm run test:run
```

### E2E Tests Only (Playwright)
```bash
npm run test:e2e
```

### Unit Tests with Coverage
```bash
npm run test:run -- --coverage
```

### Watch Mode (Development)
```bash
npm run test
```

## Guidelines

1. **Before committing**: Run `/test` to verify all tests pass
2. **After UI changes**: Run `/test e2e` to verify user workflows
3. **After logic changes**: Run `/test unit` for fast feedback
4. **For coverage reports**: Run `/test coverage` and check uncovered lines

## Test Locations

- Unit tests: `src/**/*.test.{ts,tsx}`
- E2E tests: `e2e/tests/*.spec.ts`
- E2E utilities: `e2e/utils/`, `e2e/pages/`
