export type UnitSystem = 'metric' | 'imperial';
export type ImperialFormat = 'decimal' | 'fractional';

export interface Dimensions {
  width: number;
  depth: number;
  unit: UnitSystem;
}

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

export interface LibraryItem {
  id: string;
  name: string;
  widthUnits: number;
  heightUnits: number;
  color: string;
  category: 'bin' | 'divider' | 'organizer';
}

export interface PlacedItem {
  instanceId: string;
  itemId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isRotated: boolean;
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
  category: 'bin' | 'divider' | 'organizer';
  quantity: number;
}
