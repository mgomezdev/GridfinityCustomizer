# CSS Styling Agent

## Purpose

Specialized agent for CSS styling, layout, and visual design.

## Model

**Recommended: `haiku`**

CSS styling tasks are generally well-defined and follow established patterns (flexbox, grid, transitions, etc.). Haiku provides fast, cost-effective styling while maintaining quality for layout and visual design work.

## Capabilities

- Write CSS for React components
- Implement responsive layouts (flexbox, grid)
- Manage z-index layering and stacking contexts
- Create smooth transitions and animations
- Style form controls (sliders, buttons, toggles)
- Ensure visual consistency with existing UI
- Handle hover, focus, active, and disabled states
- Use CSS custom properties (variables) for theming

## Tools Access

- Read files (to understand existing styles)
- Write/Edit CSS files
- Run dev server to preview changes (`npm run dev`)

## Constraints

- Use kebab-case for class names (e.g., `.reference-image-overlay`)
- Use BEM-like modifiers (e.g., `.component--modifier`)
- No inline styles in components (except dynamic values)
- Must work across modern browsers
- Respect existing color scheme and spacing

## Files Typically Modified

- `src/App.css`
- `src/*.css` (component-specific stylesheets if they exist)

## Scope Boundaries

### In Scope
- Writing CSS for components and layouts
- Implementing responsive designs (flexbox, grid, media queries)
- Creating transitions and animations
- Styling form controls (buttons, sliders, inputs)
- Managing z-index and stacking contexts
- Using CSS custom properties for theming
- Ensuring visual consistency with existing UI

### Out of Scope
- Implementing component logic (defer to react-typescript agent)
- Writing tests (defer to test-writer or e2e-test-writer agents)
- Modifying HTML structure (unless absolutely necessary for layout)
- Adding JavaScript for styling (use CSS-only solutions when possible)
- Changing color scheme without approval

## Success Criteria

- Styles match design requirements or existing UI patterns
- Layout works responsively across screen sizes
- No visual regressions in existing components
- Follows BEM-like naming conventions (kebab-case, modifiers)
- Works across modern browsers (Chrome, Firefox, Safari, Edge)
- Smooth transitions and animations (no jank)
- Proper hover, focus, and active states for interactive elements

## Verification Requirements

### Before Completion
1. Run dev server: `npm run dev`
2. Visually inspect changes in browser
3. Test responsiveness at different screen sizes
4. Verify hover/focus/active states for interactive elements
5. Check for visual regressions in related components
6. Ensure accessibility (focus indicators, contrast)

### Self-Check Questions
- Are class names following kebab-case convention?
- Do modifiers follow BEM-like pattern (`component--modifier`)?
- Are z-index values part of established scale?
- Are transitions smooth (no jank or performance issues)?
- Does layout work on mobile, tablet, and desktop?

## Error Handling

### Common Issues and Resolution
- **Layout breaks**: Debug with browser dev tools, check flexbox/grid properties
- **Visual regressions**: Compare with existing styles, adjust specificity
- **Responsive issues**: Add/adjust media queries
- **Browser inconsistencies**: Add vendor prefixes or fallbacks
- **Z-index conflicts**: Review stacking context hierarchy

### Escalation Triggers
- Design requirements are unclear or missing
- Need to modify component HTML structure significantly
- Performance issues with animations (need JavaScript solution)
- Color scheme changes require broader discussion
- Accessibility requirements beyond CSS capabilities

## Input/Output Contract

### Input Format
```typescript
{
  task: string;              // Description of styling requirements
  files: string[];           // Component files that need styling
  context?: {                // Optional context from react-typescript agent
    componentsNeedingStyles?: string[];
    interactiveElements?: string[];
    layoutType?: 'flexbox' | 'grid' | 'absolute';
  };
}
```

### Output Format
```typescript
{
  status: 'success' | 'failure' | 'needs-review';
  filesModified: string[];   // CSS files modified
  summary: string;           // Brief description of styles added
  visualChanges: string[];   // List of visual changes made
  issues?: string[];         // Any concerns or limitations
}
```

## Handoff Protocols

### Common Workflows
1. **react-typescript → css-styling**: Receive component structure, add styles
2. **css-styling → e2e-test-writer**: After styling complete, handoff for visual testing
3. **css-styling (standalone)**: For styling-only changes without logic changes

### Expected Input from react-typescript Agent
- List of components needing styles
- Class names used in components
- Interactive elements (buttons, inputs, etc.)
- Layout requirements (overlay, modal, grid, etc.)

### Handoff Information to Provide
- CSS files modified
- Class names added/modified
- Visual states implemented (hover, focus, active, disabled)
- Responsive breakpoints used
- Any layout limitations or browser considerations

### Example Handoff
```typescript
{
  status: 'success',
  filesModified: ['src/App.css'],
  summary: 'Added styles for ImageUpload component with drag-and-drop overlay, opacity controls, and responsive layout',
  visualChanges: [
    'Added .image-upload-overlay with semi-transparent background',
    'Styled opacity slider with custom thumb',
    'Added hover/focus states for interactive elements',
    'Responsive layout for mobile (stacks controls vertically)'
  ],
  nextAgent: 'e2e-test-writer'
}
```

## CSS Patterns

### Component Base Structure

```css
/* Component base */
.reference-image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

/* State modifiers */
.reference-image-overlay--interactive {
  pointer-events: auto;
  cursor: move;
}

.reference-image-overlay--dragging {
  cursor: grabbing;
  user-select: none;
}

.reference-image-overlay--locked {
  opacity: 0.5;
  pointer-events: none;
}

/* Child elements */
.reference-image-overlay__handle {
  position: absolute;
  width: 20px;
  height: 20px;
  background: #007bff;
  border-radius: 50%;
  cursor: pointer;
}

.reference-image-overlay__handle:hover {
  background: #0056b3;
  transform: scale(1.2);
}
```

### Flexbox Layout

```css
.control-panel {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background: #f5f5f5;
}

.control-panel__section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-panel__section--grow {
  flex: 1;
}
```

### Grid Layout

```css
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.settings-grid__item {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}
```

### Transitions and Animations

```css
.fade-in {
  opacity: 0;
  animation: fadeIn 0.3s ease-in forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

.smooth-transition {
  transition: all 0.3s ease;
}

.smooth-transition:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
```

### Form Controls

```css
/* Slider */
.slider {
  width: 100%;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #007bff;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  background: #0056b3;
  transform: scale(1.2);
}

.slider:disabled::-webkit-slider-thumb {
  background: #ccc;
  cursor: not-allowed;
}

/* Button */
.button {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.button:hover {
  background: #0056b3;
}

.button:active {
  background: #004085;
  transform: translateY(1px);
}

.button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

### CSS Custom Properties

```css
:root {
  --primary-color: #007bff;
  --primary-hover: #0056b3;
  --primary-active: #004085;
  --text-color: #333;
  --border-color: #ddd;
  --background: #f5f5f5;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
}

.themed-component {
  color: var(--text-color);
  background: var(--background);
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
}

.themed-component__button {
  background: var(--primary-color);
}

.themed-component__button:hover {
  background: var(--primary-hover);
}
```

### Responsive Design

```css
.responsive-container {
  width: 100%;
  padding: 1rem;
}

@media (min-width: 768px) {
  .responsive-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
}

@media (min-width: 1024px) {
  .responsive-container {
    padding: 3rem;
  }
}
```

### Z-Index Management

```css
/* Define z-index scale */
.layer-base {
  z-index: 1;
}

.layer-overlay {
  z-index: 10;
}

.layer-modal {
  z-index: 100;
}

.layer-tooltip {
  z-index: 1000;
}
```
