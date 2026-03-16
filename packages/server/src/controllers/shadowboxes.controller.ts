import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import {
  SidecarError,
  processImage as sidecarProcess,
  generateShadowbox as sidecarGenerate,
} from '../services/shadowboxSidecar.service.js';
import {
  createPendingRow,
  updateToReady,
  updateToError,
  listByUser,
  getById,
  deleteShadowbox as dbDelete,
} from '../services/shadowboxes.service.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_MIME.has(file.mimetype));
  },
});

export async function processImageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'image file required' });
      return;
    }

    const { thicknessMm, name } = req.body as { thicknessMm: string; name: string };
    if (!thicknessMm) {
      res.status(400).json({ error: 'thicknessMm required' });
      return;
    }
    if (!name?.trim()) {
      res.status(400).json({ error: 'name required' });
      return;
    }

    const userId = req.user!.userId;

    const formData = new FormData();
    formData.append('image', new Blob([file.buffer as unknown as ArrayBuffer], { type: file.mimetype }), file.originalname);
    formData.append('thickness_mm', thicknessMm);

    let sidecarResult;
    try {
      sidecarResult = await sidecarProcess(formData);
    } catch (err) {
      if (err instanceof SidecarError) {
        res.status(err.statusCode >= 500 ? 502 : 400).json({ error: err.message });
        return;
      }
      res.status(502).json({ error: 'sidecar unavailable' });
      return;
    }

    const shadowboxId = await createPendingRow({
      userId,
      name: name.trim(),
      thicknessMm: parseFloat(thicknessMm),
    });

    res.status(200).json({
      shadowboxId,
      svgPath: sidecarResult.svgPath,
      widthMm: sidecarResult.widthMm,
      heightMm: sidecarResult.heightMm,
      scaleMmPerPx: sidecarResult.scaleMmPerPx,
    });
  } catch (err) {
    next(err);
  }
}

export async function generateShadowboxHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { shadowboxId, svgPath, rotationDeg, toleranceMm, stackable } = req.body as {
      shadowboxId: string;
      svgPath: string;
      rotationDeg: number;
      toleranceMm: number;
      stackable: boolean;
    };

    if (!shadowboxId || !svgPath) {
      res.status(400).json({ error: 'shadowboxId and svgPath required' });
      return;
    }

    const userId = req.user!.userId;

    const row = await getById(shadowboxId);
    if (!row) {
      res.status(404).json({ error: 'shadowbox not found' });
      return;
    }
    if (row.userId !== userId) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    let sidecarResult;
    try {
      sidecarResult = await sidecarGenerate({
        svgPath,
        thicknessMm: row.thicknessMm,
        rotationDeg: rotationDeg ?? 0,
        toleranceMm: toleranceMm ?? 0.4,
        stackable: stackable ?? false,
      });
    } catch (err) {
      await updateToError(shadowboxId);
      if (err instanceof SidecarError) {
        res.status(err.statusCode >= 500 ? 502 : 400).json({ error: err.message });
        return;
      }
      res.status(502).json({ error: 'sidecar unavailable' });
      return;
    }

    const stlBuffer = Buffer.from(sidecarResult.stlBase64, 'base64');
    const stlDir = path.join(config.SHADOWBOX_STL_DIR, String(userId));
    await fs.mkdir(stlDir, { recursive: true });
    const stlPath = path.join(stlDir, `${shadowboxId}.stl`);
    await fs.writeFile(stlPath, stlBuffer);

    await updateToReady(shadowboxId, {
      stlPath,
      gridX: sidecarResult.gridX,
      gridY: sidecarResult.gridY,
      svgPath,
      rotationDeg: rotationDeg ?? 0,
      toleranceMm: toleranceMm ?? 0.4,
      stackable: stackable ?? false,
    });

    res.status(201).json({
      id: shadowboxId,
      name: row.name,
      thicknessMm: row.thicknessMm,
      gridX: sidecarResult.gridX,
      gridY: sidecarResult.gridY,
      status: 'ready',
      createdAt: row.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

export async function listShadowboxesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const rows = await listByUser(userId);
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        thicknessMm: r.thicknessMm,
        gridX: r.gridX,
        gridY: r.gridY,
        status: r.status,
        createdAt: r.createdAt,
      })),
    );
  } catch (err) {
    next(err);
  }
}

export async function deleteShadowboxHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    const row = await getById(id);
    if (!row) {
      res.status(404).json({ error: 'shadowbox not found' });
      return;
    }
    if (row.userId !== userId) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    // Delete STL file if it exists
    if (row.stlPath) {
      await fs.unlink(row.stlPath).catch(() => {
        /* ignore missing file */
      });
    }

    await dbDelete(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
