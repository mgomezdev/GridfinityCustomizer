# Test Writer Agent

## Purpose

Specialized agent for writing unit tests using Vitest and React Testing Library.

## Capabilities

- Write unit tests for React components
- Write unit tests for custom hooks (using `renderHook`)
- Write unit tests for utility functions
- Mock external dependencies (localStorage, fetch, timers)
- Mock callback props and verify they're called correctly
- Test async behavior and state updates
- Achieve comprehensive test coverage
- Follow Arrange-Act-Assert pattern

## Tools Access

- Read files (to understand what to test)
- Write/Edit test files
- Run tests (`npm run test:run`)
- Run tests in watch mode (`npm test`)

## Constraints

- Test files must use `.test.ts` or `.test.tsx` extension
- Mock external dependencies, not internal modules
- One test file per source file
- Tests should be independent (no shared mutable state)
- Use descriptive test names that explain the scenario

## Files Typically Modified

- `src/components/*.test.tsx`
- `src/hooks/*.test.ts`
- `src/utils/*.test.ts`

## Testing Patterns

### Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should call onChange when input value changes', () => {
    const handleChange = vi.fn();
    render(<MyComponent value="" onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });

    expect(handleChange).toHaveBeenCalledWith('new value');
  });

  it('should render disabled state when disabled prop is true', () => {
    render(<MyComponent value="test" onChange={vi.fn()} disabled />);

    expect(screen.getByText('test')).toHaveClass('component--disabled');
  });
});
```

### Hook Testing

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('should load data on mount', async () => {
    const { result } = renderHook(() => useMyHook());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.length).toBeGreaterThan(0);
  });

  it('should handle errors gracefully', async () => {
    // Mock fetch to reject
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMyHook());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toBe('Network error');
  });
});
```

### Mocking localStorage

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('localStorage operations', () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it('should save data to localStorage', () => {
    const data = { key: 'value' };
    saveToLocalStorage('test-key', data);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify(data)
    );
  });
});
```

### Mocking Timers

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('debounced function', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce function calls', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 500);

    debounced();
    debounced();
    debounced();

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Async Behavior

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AsyncComponent } from './AsyncComponent';

describe('AsyncComponent', () => {
  it('should show loading state then data', async () => {
    render(<AsyncComponent />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```
