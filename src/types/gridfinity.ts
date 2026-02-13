export type UnitSystem = 'metric' | 'imperial';
export type ImperialFormat = 'decimal' | 'fractional';

export interface Dimensions {
  width: number;
  depth: number;
  unit: UnitSystem;
}

export type Rotation = 0 | 90 | 180 | 270;

export type SpacerMode = 'none' | 'one-sided' | 'symmetrical';

export interface GridSpacerConfig {
  horizontal: SpacerMode;
  vertical: SpacerMode;
}

export interface ComputedSpacer {
  id: string;
  position: 'left' | 'right' | 'top' | 'bottom';
  size: number;
  renderX: number;
  renderY: number;
  renderWidth: number;
  renderHeight: number;
}

export interface GridResult {
  gridX: number;
  gridY: number;
  actualWidth: number;
  actualDepth: number;
  gapWidth: number;
  gapDepth: number;
  spacers?: ComputedSpacer[];
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  order?: number;
}

export interface LibraryItem {
  id: string;
  name: string;
  widthUnits: number;
  heightUnits: number;
  color: string;
  categories: string[];
  imageUrl?: string;
}

export interface PlacedItem {
  instanceId: string;
  itemId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: Rotation;
}

export interface PlacedItemWithValidity extends PlacedItem {
  isValid: boolean;
}

export interface DragData {
  type: 'library' | 'placed';
  itemId: string;
  instanceId?: string;
}

export interface BOMItem {
  itemId: string;
  name: string;
  widthUnits: number;
  heightUnits: number;
  color: string;
  categories: string[];
  quantity: number;
}

export interface ReferenceImage {
  id: string;
  name: string;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  scale: number;
  isLocked: boolean;
  rotation: Rotation;
}

export type InteractionMode = 'items' | 'images';

// Multi-library system types
export interface Library {
  id: string;
  name: string;
  path: string;
  isEnabled: boolean;
  itemCount?: number;
}

export interface LibraryManifest {
  version: string;
  libraries: {
    id: string;
    name: string;
    path: string;
  }[];
}

export interface LibraryIndex {
  version: string;
  items: LibraryItem[];
}
