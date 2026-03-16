import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import type { Request, Response, NextFunction } from 'express';
import { listAllForAdmin, getById } from '../services/shadowboxes.service.js';

export async function listAllHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await listAllForAdmin();
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        thicknessMm: r.thicknessMm,
        gridX: r.gridX,
        gridY: r.gridY,
        status: r.status,
        createdAt: r.createdAt,
        userId: r.userId,
        userName: r.userName,
      })),
    );
  } catch (err) {
    next(err);
  }
}

export async function downloadStlHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const row = await getById(id);
    if (!row || !row.stlPath) {
      res.status(404).json({ error: 'shadowbox not found' });
      return;
    }

    const safeName = `${row.name.replace(/[^a-zA-Z0-9._-]/g, '_')}.stl`;

    try {
      await access(row.stlPath);
    } catch {
      res.status(404).json({ error: 'STL file not found on disk' });
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    createReadStream(row.stlPath).pipe(res);
  } catch (err) {
    next(err);
  }
}
