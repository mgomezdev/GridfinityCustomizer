# CSS Styling Agent

## Purpose

Specialized agent for CSS styling, layout, and visual design.

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
