import type { LibraryManifest, LibraryIndex, LibraryItem } from '../../types/gridfinity';
import type { DataSourceAdapter, LibraryInfo } from './types';

const MANIFEST_PATH = '/libraries/manifest.json';

export class StaticAdapter implements DataSourceAdapter {
  private manifestCache: LibraryManifest | null = null;

  async getLibraries(): Promise<LibraryInfo[]> {
    const manifest = await this.fetchManifest();

    // Fetch item counts in parallel
    const libraries = await Promise.all(
      manifest.libraries.map(async (lib) => {
        try {
          const response = await fetch(lib.path);
          const data: LibraryIndex = await response.json();
          return {
            id: lib.id,
            name: lib.name,
            path: lib.path,
            itemCount: data.items?.length ?? 0,
          };
        } catch {
          return { id: lib.id, name: lib.name, path: lib.path, itemCount: undefined };
        }
      })
    );

    return libraries;
  }

  async getLibraryItems(libraryId: string): Promise<LibraryItem[]> {
    const manifest = await this.fetchManifest();
    const lib = manifest.libraries.find((l) => l.id === libraryId);
    if (!lib) return [];

    const response = await fetch(lib.path);
    if (!response.ok) throw new Error(`Failed to fetch library ${libraryId}`);
    const data: LibraryIndex = await response.json();
    return data.items ?? [];
  }

  resolveImageUrl(libraryId: string, imagePath: string): string {
    // If the imagePath already starts with /libraries/ or is an absolute URL, return as-is
    if (imagePath.startsWith('/libraries/') || imagePath.startsWith('http')) {
      return imagePath;
    }
    // Otherwise resolve relative to library directory
    return `/libraries/${libraryId}/${imagePath}`;
  }

  private async fetchManifest(): Promise<LibraryManifest> {
    if (this.manifestCache) return this.manifestCache;
    const response = await fetch(MANIFEST_PATH);
    if (!response.ok) throw new Error('Failed to fetch library manifest');
    this.manifestCache = await response.json();
    return this.manifestCache!;
  }

  clearCache(): void {
    this.manifestCache = null;
  }
}
