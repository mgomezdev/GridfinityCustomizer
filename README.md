# Gridfinity Customizer

A web-based visual design tool for creating custom Gridfinity modular storage layouts. Plan your 3D-printable storage solutions with drag-and-drop simplicity, reference images for precise fitting, and automatic bill of materials generation.

## What is Gridfinity?

Gridfinity is a modular storage system designed for 3D printing, using standardized base units to create customizable organizational solutions. This customizer helps you plan layouts before printing.

## ✨ Features

### Grid Design
- **Configurable grid dimensions** - Set width and height in Gridfinity units
- **Drag-and-drop placement** - Add items from library to grid
- **Move and rotate items** - Reposition and orient items with mouse or keyboard
- **Collision detection** - Visual feedback prevents overlapping items
- **Unit conversion** - Switch between millimeters and inches

### Library & Categories
- **Pre-built library** - 41 common Gridfinity items (bins, dividers, organizers, utensil trays)
- **8 categories** - Organized by type (bins, utensil trays, labeled) and size (1x, 2x, 3x, 4x, 5x width)
- **Category filtering** - Show/hide items by category
- **Refresh library** - Reload items from library.json
- **Custom items** - Add your own items (persisted in browser)

### Reference Images
- **Image upload** - Import reference photos/diagrams
- **Position & scale** - Align images with grid for precise layouts
- **Opacity control** - Adjust transparency for overlay planning
- **Lock images** - Prevent accidental movement
- **Multiple images** - Support for multiple reference layers

### Item Management
- **Inline controls** - Delete, rotate, and modify items directly on grid
- **Keyboard shortcuts** - Quick actions with keyboard
  - `Delete` key - Remove selected item
  - `Ctrl+Shift+C` - Clear all items from grid
- **Interaction modes** - Switch between grid manipulation and item editing
- **Visual feedback** - Color-coded valid/invalid placement

### Export & Planning
- **Bill of Materials** - Automatic BOM generation with quantities
- **Export layout** - Save your design (future: STL export)

### Developer Features
- **E2E testing** - 47 Playwright tests for critical workflows
- **Unit testing** - 511 tests covering hooks, components, and utilities

## 🚀 Quick Start

### Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`

See [CLAUDE.md](CLAUDE.md) for detailed development setup and commands.

## 📖 Usage Guide

### Basic Workflow

1. **Set Grid Dimensions**
   - Adjust width and height using dimension controls
   - Each unit = 42mm (standard Gridfinity base)

2. **Browse Library**
   - Filter by category (bins, utensil trays, labeled, width-based)
   - View item dimensions and preview images

3. **Add Items to Grid**
   - Drag items from library onto grid
   - Green outline = valid placement
   - Red outline = collision detected

4. **Position Items**
   - Click and drag to move
   - Use rotate button or keyboard to change orientation
   - Delete with inline button or Delete key

5. **Use Reference Images** (Optional)
   - Upload photo/diagram with "Upload Reference Image"
   - Position and scale image to match real-world measurements
   - Adjust opacity to see through to grid
   - Lock image when positioned correctly

6. **Generate Bill of Materials**
   - View BOM panel for complete parts list
   - Shows quantities of each item type needed

7. **Clear & Start Over**
   - Use "Clear All" button or `Ctrl+Shift+C`
   - Removes all placed items (keeps grid settings)

### Tips

- **Reference Images**: Perfect for designing storage around existing tools/objects
- **Categories**: Use width-based categories (1x, 2x, 3x) to quickly find items of specific sizes
- **Keyboard Shortcuts**: Speed up workflow with Delete and Clear All shortcuts
- **Custom Library**: Add your own items and they'll persist in browser storage
- **Refresh Button**: Reload library/categories from files if manually edited

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Delete` | Remove selected item |
| `Ctrl+Shift+C` | Clear all items from grid |
| `Click + Drag` | Move item |

## 🔧 Development

This project uses React 19 + TypeScript + Vite.

For detailed development guidelines, coding standards, and architecture:
👉 See [CLAUDE.md](CLAUDE.md)

**Quick Commands:**
```bash
npm run dev          # Start dev server
npm test             # Run unit tests (watch mode)
npm run test:run     # Run all unit tests once
npm run test:e2e     # Run E2E tests (Playwright)
npm run build        # Production build
npm run lint         # Lint codebase
```

## 🚀 Deployment

This application is deployed on Cloudflare Pages with automatic builds from the main branch.

### Cloudflare Pages Setup

1. **Connect Repository**
   - Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to Workers & Pages > Create application > Pages > Connect to Git
   - Select GitHub repository: `mgomezdev/GridfinityCustomizer`

2. **Build Configuration**
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/` (leave empty)
   - Node version: `20` (set via environment variable `NODE_VERSION=20`)

3. **Deploy**
   - Cloudflare Pages automatically builds and deploys on push to main branch
   - Preview deployments are created automatically for pull requests
   - Access your site at `https://<project-name>.pages.dev`

### Custom Domain (Optional)

Configure a custom domain in Cloudflare Pages dashboard under Custom Domains.

## 📝 License

This project is open source. License details to be added.

## 🤝 Contributing

Contributions welcome! Please see [CLAUDE.md](CLAUDE.md) for:
- Development setup and commands
- Coding standards (TypeScript, React, testing)
- Git workflow (Gitflow branching strategy)
- Pull request guidelines

For bug reports and feature requests, please open an issue.
