import { eq, and, sql } from 'drizzle-orm';
import { AppError, ErrorCodes } from '@gridfinity/shared';
import type { ApiLibrary, ApiLibraryItem, ApiCategory } from '@gridfinity/shared';
import { db } from '../db/connection.js';
import { libraries, libraryItems, categories, itemCategories } from '../db/schema.js';

export async function getAllLibraries(activeOnly?: boolean): Promise<ApiLibrary[]> {
  const conditions = activeOnly ? eq(libraries.isActive, true) : undefined;

  const libRows = await db
    .select()
    .from(libraries)
    .where(conditions)
    .orderBy(libraries.sortOrder);

  // Get item counts per library in a single query
  const countRows = await db
    .select({
      libraryId: libraryItems.libraryId,
      count: sql<number>`count(*)`,
    })
    .from(libraryItems)
    .groupBy(libraryItems.libraryId);

  const countMap = new Map(countRows.map((r) => [r.libraryId, Number(r.count)]));

  return libRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    version: row.version,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    itemCount: countMap.get(row.id) ?? 0,
  }));
}

export async function getLibraryById(id: string): Promise<ApiLibrary> {
  const rows = await db
    .select()
    .from(libraries)
    .where(eq(libraries.id, id))
    .limit(1);

  if (rows.length === 0) {
    throw new AppError(ErrorCodes.NOT_FOUND, `Library '${id}' not found`);
  }

  // Get item count for this library
  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(libraryItems)
    .where(eq(libraryItems.libraryId, id));

  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    version: row.version,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    itemCount: Number(countRows[0]?.count ?? 0),
  };
}

interface ItemFilters {
  category?: string;
  width?: number;
  height?: number;
}

export async function getLibraryItems(
  libraryId: string,
  filters?: ItemFilters,
): Promise<ApiLibraryItem[]> {
  // First verify the library exists
  const libRows = await db
    .select({ id: libraries.id })
    .from(libraries)
    .where(eq(libraries.id, libraryId))
    .limit(1);

  if (libRows.length === 0) {
    throw new AppError(ErrorCodes.NOT_FOUND, `Library '${libraryId}' not found`);
  }

  // Build conditions
  const conditions = [eq(libraryItems.libraryId, libraryId)];

  if (filters?.width !== undefined) {
    conditions.push(eq(libraryItems.widthUnits, filters.width));
  }
  if (filters?.height !== undefined) {
    conditions.push(eq(libraryItems.heightUnits, filters.height));
  }

  // If category filter, join through item_categories
  let itemRows;
  if (filters?.category) {
    itemRows = await db
      .selectDistinct({
        id: libraryItems.id,
        libraryId: libraryItems.libraryId,
        name: libraryItems.name,
        widthUnits: libraryItems.widthUnits,
        heightUnits: libraryItems.heightUnits,
        color: libraryItems.color,
        imagePath: libraryItems.imagePath,
        isActive: libraryItems.isActive,
        sortOrder: libraryItems.sortOrder,
      })
      .from(libraryItems)
      .innerJoin(
        itemCategories,
        and(
          eq(itemCategories.libraryId, libraryItems.libraryId),
          eq(itemCategories.itemId, libraryItems.id),
        ),
      )
      .where(and(...conditions, eq(itemCategories.categoryId, filters.category)))
      .orderBy(libraryItems.sortOrder);
  } else {
    itemRows = await db
      .select({
        id: libraryItems.id,
        libraryId: libraryItems.libraryId,
        name: libraryItems.name,
        widthUnits: libraryItems.widthUnits,
        heightUnits: libraryItems.heightUnits,
        color: libraryItems.color,
        imagePath: libraryItems.imagePath,
        isActive: libraryItems.isActive,
        sortOrder: libraryItems.sortOrder,
      })
      .from(libraryItems)
      .where(and(...conditions))
      .orderBy(libraryItems.sortOrder);
  }

  // Fetch categories for all items in one query
  const itemIds = itemRows.map((item) => item.id);
  if (itemIds.length === 0) {
    return [];
  }

  const catRows = await db
    .select({
      libraryId: itemCategories.libraryId,
      itemId: itemCategories.itemId,
      categoryId: itemCategories.categoryId,
    })
    .from(itemCategories)
    .where(eq(itemCategories.libraryId, libraryId));

  // Build a map of item -> categories
  const catMap = new Map<string, string[]>();
  for (const row of catRows) {
    const key = `${row.libraryId}:${row.itemId}`;
    const existing = catMap.get(key) ?? [];
    existing.push(row.categoryId);
    catMap.set(key, existing);
  }

  return itemRows.map((item) => ({
    id: item.id,
    libraryId: item.libraryId,
    name: item.name,
    widthUnits: item.widthUnits,
    heightUnits: item.heightUnits,
    color: item.color,
    imagePath: item.imagePath,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    categories: catMap.get(`${item.libraryId}:${item.id}`) ?? [],
  }));
}

export async function getLibraryItemById(
  libraryId: string,
  itemId: string,
): Promise<ApiLibraryItem> {
  const rows = await db
    .select({
      id: libraryItems.id,
      libraryId: libraryItems.libraryId,
      name: libraryItems.name,
      widthUnits: libraryItems.widthUnits,
      heightUnits: libraryItems.heightUnits,
      color: libraryItems.color,
      imagePath: libraryItems.imagePath,
      isActive: libraryItems.isActive,
      sortOrder: libraryItems.sortOrder,
    })
    .from(libraryItems)
    .where(and(eq(libraryItems.libraryId, libraryId), eq(libraryItems.id, itemId)))
    .limit(1);

  if (rows.length === 0) {
    throw new AppError(
      ErrorCodes.NOT_FOUND,
      `Item '${itemId}' not found in library '${libraryId}'`,
    );
  }

  const item = rows[0];

  // Fetch categories for this item
  const catRows = await db
    .select({ categoryId: itemCategories.categoryId })
    .from(itemCategories)
    .where(
      and(
        eq(itemCategories.libraryId, libraryId),
        eq(itemCategories.itemId, itemId),
      ),
    );

  return {
    id: item.id,
    libraryId: item.libraryId,
    name: item.name,
    widthUnits: item.widthUnits,
    heightUnits: item.heightUnits,
    color: item.color,
    imagePath: item.imagePath,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    categories: catRows.map((r) => r.categoryId),
  };
}

export async function getAllCategories(): Promise<ApiCategory[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      color: categories.color,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .orderBy(categories.sortOrder);

  return rows;
}
