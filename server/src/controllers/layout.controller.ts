import { z } from 'zod';
import { AppError, ErrorCodes } from '@gridfinity/shared';
import type { ApiResponse, ApiListResponse, ApiLayout, ApiLayoutDetail } from '@gridfinity/shared';
import type { Request, Response, NextFunction } from 'express';
import * as layoutService from '../services/layout.service.js';

const placedItemSchema = z.object({
  itemId: z.string().min(1),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().min(1).max(10),
  height: z.number().int().min(1).max(10),
  rotation: z.number().refine((v) => [0, 90, 180, 270].includes(v), {
    message: 'Rotation must be 0, 90, 180, or 270',
  }),
});

const refImagePlacementSchema = z.object({
  refImageId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().positive().max(100),
  height: z.number().positive().max(100),
  opacity: z.number().min(0).max(1),
  scale: z.number().min(0.1).max(10),
  isLocked: z.boolean(),
  rotation: z.number().refine((v) => [0, 90, 180, 270].includes(v), {
    message: 'Rotation must be 0, 90, 180, or 270',
  }),
});

const createLayoutSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  gridX: z.number().int().min(1).max(20),
  gridY: z.number().int().min(1).max(20),
  widthMm: z.number().positive(),
  depthMm: z.number().positive(),
  spacerHorizontal: z.string().optional(),
  spacerVertical: z.string().optional(),
  placedItems: z.array(placedItemSchema).max(200),
  refImagePlacements: z.array(refImagePlacementSchema).max(50).optional(),
});

const updateLayoutMetaSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
}).refine(data => data.name !== undefined || data.description !== undefined, {
  message: 'At least one field must be provided',
});

export async function listLayouts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(ErrorCodes.AUTH_REQUIRED, 'Authentication required');
    }

    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limitStr = typeof req.query.limit === 'string' ? req.query.limit : '20';
    const limit = Math.min(Math.max(parseInt(limitStr, 10) || 20, 1), 100);

    const result = await layoutService.getLayoutsByUser(req.user.userId, cursor, limit);

    const body: ApiListResponse<ApiLayout> = {
      data: result.data,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

export async function getLayout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(ErrorCodes.AUTH_REQUIRED, 'Authentication required');
    }

    const layoutId = parseInt(req.params.id as string, 10);
    if (isNaN(layoutId)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid layout ID');
    }

    const layout = await layoutService.getLayoutById(layoutId, req.user.userId);

    const body: ApiResponse<ApiLayoutDetail> = { data: layout };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

export async function createLayout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(ErrorCodes.AUTH_REQUIRED, 'Authentication required');
    }

    const parsed = createLayoutSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', parsed.error.flatten());
    }

    const layout = await layoutService.createLayout(req.user.userId, parsed.data);

    const body: ApiResponse<ApiLayoutDetail> = { data: layout };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
}

export async function updateLayout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(ErrorCodes.AUTH_REQUIRED, 'Authentication required');
    }

    const layoutId = parseInt(req.params.id as string, 10);
    if (isNaN(layoutId)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid layout ID');
    }

    const parsed = createLayoutSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', parsed.error.flatten());
    }

    const layout = await layoutService.updateLayout(layoutId, req.user.userId, parsed.data);

    const body: ApiResponse<ApiLayoutDetail> = { data: layout };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

export async function updateLayoutMeta(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(ErrorCodes.AUTH_REQUIRED, 'Authentication required');
    }

    const layoutId = parseInt(req.params.id as string, 10);
    if (isNaN(layoutId)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid layout ID');
    }

    const parsed = updateLayoutMetaSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', parsed.error.flatten());
    }

    const layout = await layoutService.updateLayoutMeta(layoutId, req.user.userId, parsed.data);

    const body: ApiResponse<ApiLayout> = { data: layout };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

export async function deleteLayout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(ErrorCodes.AUTH_REQUIRED, 'Authentication required');
    }

    const layoutId = parseInt(req.params.id as string, 10);
    if (isNaN(layoutId)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid layout ID');
    }

    await layoutService.deleteLayout(layoutId, req.user.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
