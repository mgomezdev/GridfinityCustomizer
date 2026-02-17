import type { LibraryItem } from '../../types/gridfinity';
import type { DataSourceAdapter, LibraryInfo } from './types';

export class ApiAdapter implements DataSourceAdapter {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getLibraries(): Promise<LibraryInfo[]> {
    const response = await fetch(`${this.baseUrl}/libraries`);
    if (!response.ok) throw new Error('Failed to fetch libraries');
    const json = await response.json();
    return json.data.map((lib: Record<string, unknown>) => ({
      id: lib.id as string,
      name: lib.name as string,
      path: '',
      description: lib.description as string | undefined,
      itemCount: lib.itemCount as number | undefined,
    }));
  }

  async getLibraryItems(libraryId: string): Promise<LibraryItem[]> {
    const response = await fetch(`${this.baseUrl}/libraries/${libraryId}/items`);
    if (!response.ok) throw new Error(`Failed to fetch items for ${libraryId}`);
    const json = await response.json();
    return json.data.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      name: item.name as string,
      widthUnits: item.widthUnits as number,
      heightUnits: item.heightUnits as number,
      color: item.color as string,
      categories: item.categories as string[],
      imageUrl: item.imagePath as string | undefined,
      perspectiveImageUrl: item.perspectiveImagePath as string | undefined,
    }));
  }

  resolveImageUrl(_libraryId: string, imagePath: string): string {
    if (imagePath.startsWith('http')) return imagePath;
    return `${this.baseUrl}/images/${imagePath}`;
  }
}
