import { z } from 'zod';
import { AppError, ErrorCodes } from '@gridfinity/shared';
import type { ApiResponse, ApiBomSubmission } from '@gridfinity/shared';
import type { Request, Response, NextFunction } from 'express';
import * as bomService from '../services/bom.service.js';

const submitBomSchema = z.object({
  layoutId: z.number().int().positive().optional(),
  gridX: z.number().int().min(1).max(20),
  gridY: z.number().int().min(1).max(20),
  widthMm: z.number().positive(),
  depthMm: z.number().positive(),
  totalItems: z.number().int().min(0),
  totalUnique: z.number().int().min(0),
  exportJson: z.string().min(1),
});

export async function submitBom(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = submitBomSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', parsed.error.flatten());
    }

    const userId = req.user?.userId;
    const submission = await bomService.submitBom(parsed.data, userId);

    const body: ApiResponse<ApiBomSubmission> = { data: submission };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
}

export async function downloadBom(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid BOM submission ID');
    }

    const exportJson = await bomService.getBomDownload(id);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="bom-${id}.json"`);
    res.send(exportJson);
  } catch (err) {
    next(err);
  }
}
