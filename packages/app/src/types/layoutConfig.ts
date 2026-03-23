import type { LayoutStatus } from '@gridfinity/shared';
import type { GridSpacerConfig } from './gridfinity';
import type { RefImagePlacement } from '../hooks/useRefImagePlacements';
import type { PlacedItem } from './gridfinity';

export interface LoadedLayoutConfig {
  layoutId: number;
  layoutName: string;
  layoutDescription: string | null;
  layoutStatus: LayoutStatus;
  widthMm: number;
  depthMm: number;
  spacerConfig: GridSpacerConfig;
  placedItems: PlacedItem[];
  refImagePlacements?: RefImagePlacement[];
  ownerUsername?: string;
  ownerEmail?: string;
}
