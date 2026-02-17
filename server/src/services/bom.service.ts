import { eq } from 'drizzle-orm';
import { AppError, ErrorCodes } from '@gridfinity/shared';
import type { ApiBomSubmission } from '@gridfinity/shared';
import { db } from '../db/connection.js';
import { bomSubmissions } from '../db/schema.js';

interface SubmitBomData {
  layoutId?: number;
  gridX: number;
  gridY: number;
  widthMm: number;
  depthMm: number;
  totalItems: number;
  totalUnique: number;
  exportJson: string;
}

function formatBomSubmission(row: typeof bomSubmissions.$inferSelect): ApiBomSubmission {
  return {
    id: row.id,
    layoutId: row.layoutId,
    userId: row.userId,
    gridX: row.gridX,
    gridY: row.gridY,
    widthMm: row.widthMm,
    depthMm: row.depthMm,
    totalItems: row.totalItems,
    totalUnique: row.totalUnique,
    createdAt: row.createdAt,
  };
}

export async function submitBom(
  data: SubmitBomData,
  userId?: number,
): Promise<ApiBomSubmission> {
  const now = new Date().toISOString();

  const rows = await db
    .insert(bomSubmissions)
    .values({
      layoutId: data.layoutId ?? null,
      userId: userId ?? null,
      gridX: data.gridX,
      gridY: data.gridY,
      widthMm: data.widthMm,
      depthMm: data.depthMm,
      totalItems: data.totalItems,
      totalUnique: data.totalUnique,
      exportJson: data.exportJson,
      createdAt: now,
    })
    .returning();

  return formatBomSubmission(rows[0]);
}

export async function getBomDownload(id: number): Promise<string> {
  const rows = await db
    .select()
    .from(bomSubmissions)
    .where(eq(bomSubmissions.id, id))
    .limit(1);

  if (rows.length === 0) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'BOM submission not found');
  }

  return rows[0].exportJson;
}
