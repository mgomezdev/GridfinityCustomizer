import { randomUUID } from 'crypto';
import type { Client } from '@libsql/client';

export interface PendingRowParams {
  userId: number;
  name: string;
  thicknessMm: number;
}

export interface ReadyParams {
  stlPath: string;
  gridX: number;
  gridY: number;
  svgPath: string;
  rotationDeg: number;
  toleranceMm: number;
  stackable: boolean;
}

export interface ShadowboxRow {
  id: string;
  userId: number;
  name: string;
  thicknessMm: number;
  svgPath: string | null;
  rotationDeg: number | null;
  toleranceMm: number | null;
  stackable: boolean | null;
  stlPath: string | null;
  gridX: number | null;
  gridY: number | null;
  status: string;
  createdAt: string;
}

export async function createPendingRow(
  client: Client,
  params: PendingRowParams
): Promise<string> {
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO shadowboxes (id, user_id, name, thickness_mm, status)
          VALUES (?, ?, ?, ?, 'pending')`,
    args: [id, params.userId, params.name, params.thicknessMm],
  });
  return id;
}

export async function updateToReady(
  client: Client,
  id: string,
  params: ReadyParams
): Promise<void> {
  await client.execute({
    sql: `UPDATE shadowboxes
          SET status = 'ready',
              stl_path = ?,
              grid_x = ?,
              grid_y = ?,
              svg_path = ?,
              rotation_deg = ?,
              tolerance_mm = ?,
              stackable = ?
          WHERE id = ?`,
    args: [
      params.stlPath,
      params.gridX,
      params.gridY,
      params.svgPath,
      params.rotationDeg,
      params.toleranceMm,
      params.stackable ? 1 : 0,
      id,
    ],
  });
}

export async function updateToError(client: Client, id: string): Promise<void> {
  await client.execute({
    sql: `UPDATE shadowboxes SET status = 'error' WHERE id = ?`,
    args: [id],
  });
}

export async function listByUser(
  client: Client,
  userId: number
): Promise<ShadowboxRow[]> {
  const result = await client.execute({
    sql: `SELECT id, user_id as userId, name, thickness_mm as thicknessMm,
                 svg_path as svgPath, rotation_deg as rotationDeg,
                 tolerance_mm as toleranceMm, stackable, stl_path as stlPath,
                 grid_x as gridX, grid_y as gridY, status, created_at as createdAt
          FROM shadowboxes
          WHERE user_id = ?
          ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows as unknown as ShadowboxRow[];
}

export async function getById(
  client: Client,
  id: string
): Promise<ShadowboxRow | null> {
  const result = await client.execute({
    sql: `SELECT id, user_id as userId, name, thickness_mm as thicknessMm,
                 svg_path as svgPath, rotation_deg as rotationDeg,
                 tolerance_mm as toleranceMm, stackable, stl_path as stlPath,
                 grid_x as gridX, grid_y as gridY, status, created_at as createdAt
          FROM shadowboxes WHERE id = ?`,
    args: [id],
  });
  return (result.rows[0] as unknown as ShadowboxRow) ?? null;
}

export async function deleteShadowbox(client: Client, id: string): Promise<void> {
  await client.execute({
    sql: `DELETE FROM shadowboxes WHERE id = ?`,
    args: [id],
  });
}

export async function listAllForAdmin(client: Client): Promise<(ShadowboxRow & { userName: string })[]> {
  const result = await client.execute({
    sql: `SELECT s.id, s.user_id as userId, u.username as userName,
                 s.name, s.thickness_mm as thicknessMm,
                 s.svg_path as svgPath, s.rotation_deg as rotationDeg,
                 s.tolerance_mm as toleranceMm, s.stackable,
                 s.stl_path as stlPath, s.grid_x as gridX, s.grid_y as gridY,
                 s.status, s.created_at as createdAt
          FROM shadowboxes s
          JOIN users u ON s.user_id = u.id
          ORDER BY s.created_at DESC`,
    args: [],
  });
  return result.rows as unknown as (ShadowboxRow & { userName: string })[];
}

export async function getStlPath(client: Client, id: string): Promise<string | null> {
  const row = await getById(client, id);
  return row?.stlPath ?? null;
}
