import type { LibraryItem } from '../../types/gridfinity';

export interface LibraryInfo {
  id: string;
  name: string;
  path: string;
  description?: string;
  itemCount?: number;
}

export interface DataSourceAdapter {
  getLibraries(): Promise<LibraryInfo[]>;
  getLibraryItems(libraryId: string): Promise<LibraryItem[]>;
  resolveImageUrl(libraryId: string, imagePath: string): string;
}
