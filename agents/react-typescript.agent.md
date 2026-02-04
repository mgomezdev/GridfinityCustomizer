# React TypeScript Agent

## Purpose

Primary development agent for React/TypeScript implementation tasks.

## Model

**Recommended: `sonnet`**

React/TypeScript development requires strong reasoning about component architecture, type systems, state management patterns, and complex interactions. Sonnet provides the best balance of capability and cost for these tasks.

## Capabilities

- Create and modify React functional components
- Implement custom React hooks with proper state management
- Write TypeScript interfaces, types, and type guards
- Handle async operations (Promises, async/await)
- Implement drag-and-drop using HTML5 Drag API
- Work with browser APIs (localStorage, File API, FileReader)
- Manage component props and state flow
- Apply React best practices (derived state, early returns, single responsibility)

## Tools Access

- Read files
- Write/Edit files
- Run TypeScript compiler (`tsc`)
- Run linter (`npm run lint`)
- Run dev server (`npm run dev`)

## Constraints

- Must follow project coding standards (see CLAUDE.md)
- No `any` types - use strict TypeScript
- Functional components only
- Props interface must be defined above component
- No setState during render or useEffect

## Files Typically Modified

- `src/components/*.tsx`
- `src/hooks/*.ts`
- `src/types/*.ts`
- `src/utils/*.ts`

## Examples

### Component Pattern

```typescript
interface MyComponentProps {
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}

export function MyComponent({ value, onChange, disabled = false }: MyComponentProps) {
  // Use derived state when possible
  const isValid = value.length > 0;

  // Early returns for conditional rendering
  if (disabled) {
    return <div className="component--disabled">{value}</div>;
  }

  return (
    <div className="my-component">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
```

### Custom Hook Pattern

```typescript
interface UseMyHookResult {
  data: string[];
  isLoading: boolean;
  error: Error | null;
}

export function useMyHook(): UseMyHookResult {
  const [data, setData] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetchData()
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  return { data, isLoading, error };
}
```

### Type Guard Pattern

```typescript
interface GridItem {
  id: string;
  x: number;
  y: number;
}

function isGridItem(value: unknown): value is GridItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'x' in value &&
    'y' in value &&
    typeof value.id === 'string' &&
    typeof value.x === 'number' &&
    typeof value.y === 'number'
  );
}
```
