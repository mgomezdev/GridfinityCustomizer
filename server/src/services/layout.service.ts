import { eq, and, lt, desc, sql, or } from 'drizzle-orm';
import { AppError, ErrorCodes } from '@gridfinity/shared';
import type { ApiLayout, ApiLayoutDetail, ApiPlacedItem } from '@gridfinity/shared';
import { db } from '../db/connection.js';
import { layouts, placedItems, userStorage } from '../db/schema.js';

interface CursorData {
  createdAt: string;
  id: number;
}

function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  // base64url encoding
  return Buffer.from(json).toString('base64url');
}

function decodeCursor(cursor: string): CursorData {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    const data = JSON.parse(json) as CursorData;
    if (typeof data.createdAt !== 'string' || typeof data.id !== 'number') {
      throw new Error('Invalid cursor shape');
    }
    return data;
  } catch {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid cursor');
  }
}

function formatLayout(row: typeof layouts.$inferSelect): ApiLayout {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    gridX: row.gridX,
    gridY: row.gridY,
    widthMm: row.widthMm,
    depthMm: row.depthMm,
    spacerHorizontal: row.spacerHorizontal,
    spacerVertical: row.spacerVertical,
    isPublic: row.isPublic,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function formatPlacedItem(row: typeof placedItems.$inferSelect): ApiPlacedItem {
  return {
    id: row.id,
    layoutId: row.layoutId,
    libraryId: row.libraryId,
    itemId: row.itemId,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    rotation: row.rotation,
    sortOrder: row.sortOrder,
  };
}

function unprefixItemId(prefixedId: string): { libraryId: string; itemId: string } {
  const colonIndex = prefixedId.indexOf(':');
  if (colonIndex === -1) {
    return { libraryId: 'default', itemId: prefixedId };
  }
  return {
    libraryId: prefixedId.substring(0, colonIndex),
    itemId: prefixedId.substring(colonIndex + 1),
  };
}

export async function getLayoutsByUser(
  userId: number,
  cursor?: string,
  limit: number = 20,
): Promise<{ data: ApiLayout[]; nextCursor?: string; hasMore: boolean }> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  let cursorCondition;
  if (cursor) {
    const cursorData = decodeCursor(cursor);
    cursorCondition = or(
      lt(layouts.createdAt, cursorData.createdAt),
      and(
        eq(layouts.createdAt, cursorData.createdAt),
        lt(layouts.id, cursorData.id),
      ),
    );
  }

  const conditions = cursorCondition
    ? and(eq(layouts.userId, userId), cursorCondition)
    : eq(layouts.userId, userId);

  const rows = await db
    .select()
    .from(layouts)
    .where(conditions)
    .orderBy(desc(layouts.createdAt), desc(layouts.id))
    .limit(safeLimit + 1);

  const hasMore = rows.length > safeLimit;
  const data = rows.slice(0, safeLimit).map(formatLayout);

  let nextCursor: string | undefined;
  if (hasMore && data.length > 0) {
    const lastItem = data[data.length - 1];
    nextCursor = encodeCursor({
      createdAt: lastItem.createdAt,
      id: lastItem.id,
    });
  }

  return { data, nextCursor, hasMore };
}

export async function getLayoutById(
  layoutId: number,
  userId: number,
): Promise<ApiLayoutDetail> {
  const rows = await db
    .select()
    .from(layouts)
    .where(eq(layouts.id, layoutId))
    .limit(1);

  if (rows.length === 0) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Layout not found');
  }

  const layout = rows[0];

  if (layout.userId !== userId) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied');
  }

  const itemRows = await db
    .select()
    .from(placedItems)
    .where(eq(placedItems.layoutId, layoutId))
    .orderBy(placedItems.sortOrder);

  return {
    ...formatLayout(layout),
    placedItems: itemRows.map(formatPlacedItem),
  };
}

interface CreateLayoutData {
  name: string;
  description?: string;
  gridX: number;
  gridY: number;
  widthMm: number;
  depthMm: number;
  spacerHorizontal?: string;
  spacerVertical?: string;
  placedItems: Array<{
    itemId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  }>;
}

async function ensureStorageRow(userId: number): Promise<typeof userStorage.$inferSelect> {
  const existing = await db
    .select()
    .from(userStorage)
    .where(eq(userStorage.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await db
    .insert(userStorage)
    .values({ userId, layoutCount: 0, imageBytes: 0 })
    .returning();

  return inserted[0];
}

export async function createLayout(
  userId: number,
  data: CreateLayoutData,
): Promise<ApiLayoutDetail> {
  // Check quota
  const storage = await ensureStorageRow(userId);
  if (storage.layoutCount >= storage.maxLayouts) {
    throw new AppError(
      ErrorCodes.QUOTA_EXCEEDED,
      `Layout limit reached (${storage.maxLayouts}). Delete existing layouts to save new ones.`,
    );
  }

  const now = new Date().toISOString();

  // Use a batch for transaction-like behavior
  const layoutRows = await db
    .insert(layouts)
    .values({
      userId,
      name: data.name,
      description: data.description ?? null,
      gridX: data.gridX,
      gridY: data.gridY,
      widthMm: data.widthMm,
      depthMm: data.depthMm,
      spacerHorizontal: data.spacerHorizontal ?? 'none',
      spacerVertical: data.spacerVertical ?? 'none',
      isPublic: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const layout = layoutRows[0];

  // Insert placed items
  const itemValues = data.placedItems.map((item, index) => {
    const { libraryId, itemId } = unprefixItemId(item.itemId);
    return {
      layoutId: layout.id,
      libraryId,
      itemId,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: item.rotation,
      sortOrder: index,
    };
  });

  let insertedItems: Array<typeof placedItems.$inferSelect> = [];
  if (itemValues.length > 0) {
    insertedItems = await db
      .insert(placedItems)
      .values(itemValues)
      .returning();
  }

  // Update storage quota
  await db
    .update(userStorage)
    .set({ layoutCount: sql`${userStorage.layoutCount} + 1` })
    .where(eq(userStorage.userId, userId));

  return {
    ...formatLayout(layout),
    placedItems: insertedItems.map(formatPlacedItem),
  };
}

export async function updateLayout(
  layoutId: number,
  userId: number,
  data: CreateLayoutData,
): Promise<ApiLayoutDetail> {
  // Verify ownership
  const existing = await db
    .select()
    .from(layouts)
    .where(eq(layouts.id, layoutId))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Layout not found');
  }

  if (existing[0].userId !== userId) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied');
  }

  const now = new Date().toISOString();

  // Update layout
  const updatedRows = await db
    .update(layouts)
    .set({
      name: data.name,
      description: data.description ?? null,
      gridX: data.gridX,
      gridY: data.gridY,
      widthMm: data.widthMm,
      depthMm: data.depthMm,
      spacerHorizontal: data.spacerHorizontal ?? 'none',
      spacerVertical: data.spacerVertical ?? 'none',
      updatedAt: now,
    })
    .where(eq(layouts.id, layoutId))
    .returning();

  // Delete old placed items
  await db
    .delete(placedItems)
    .where(eq(placedItems.layoutId, layoutId));

  // Insert new placed items
  const itemValues = data.placedItems.map((item, index) => {
    const { libraryId, itemId } = unprefixItemId(item.itemId);
    return {
      layoutId,
      libraryId,
      itemId,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: item.rotation,
      sortOrder: index,
    };
  });

  let insertedItems: Array<typeof placedItems.$inferSelect> = [];
  if (itemValues.length > 0) {
    insertedItems = await db
      .insert(placedItems)
      .values(itemValues)
      .returning();
  }

  return {
    ...formatLayout(updatedRows[0]),
    placedItems: insertedItems.map(formatPlacedItem),
  };
}

export async function updateLayoutMeta(
  layoutId: number,
  userId: number,
  data: { name?: string; description?: string },
): Promise<ApiLayout> {
  // Verify ownership
  const existing = await db
    .select()
    .from(layouts)
    .where(eq(layouts.id, layoutId))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Layout not found');
  }

  if (existing[0].userId !== userId) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied');
  }

  const now = new Date().toISOString();
  const setValues: Record<string, unknown> = { updatedAt: now };

  if (data.name !== undefined) setValues.name = data.name;
  if (data.description !== undefined) setValues.description = data.description;

  const updatedRows = await db
    .update(layouts)
    .set(setValues)
    .where(eq(layouts.id, layoutId))
    .returning();

  return formatLayout(updatedRows[0]);
}

export async function deleteLayout(
  layoutId: number,
  userId: number,
): Promise<void> {
  // Verify ownership
  const existing = await db
    .select()
    .from(layouts)
    .where(eq(layouts.id, layoutId))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'Layout not found');
  }

  if (existing[0].userId !== userId) {
    throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied');
  }

  // Delete layout (CASCADE will delete placed_items)
  await db.delete(layouts).where(eq(layouts.id, layoutId));

  // Decrement quota
  await db
    .update(userStorage)
    .set({ layoutCount: sql`MAX(${userStorage.layoutCount} - 1, 0)` })
    .where(eq(userStorage.userId, userId));
}
