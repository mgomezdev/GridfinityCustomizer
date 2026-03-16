import fs from 'fs';
import type { Request, Response, NextFunction } from 'express';
import { listAllForAdmin, getStlPath, getById } from '../services/shadowboxes.service.js';

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
    const id = req.params.id as string;

    const stlPath = await getStlPath(id);
    if (!stlPath) {
      res.status(404).json({ error: 'shadowbox not found' });
      return;
    }

    const row = await getById(id);
    const filename = row ? `${row.name}.stl` : `${id}.stl`;

    if (!fs.existsSync(stlPath)) {
      res.status(404).json({ error: 'STL file not found on disk' });
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(stlPath).pipe(res);
  } catch (err) {
    next(err);
  }
}
