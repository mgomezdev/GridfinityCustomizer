import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse, ApiListResponse, ApiLibrary, ApiLibraryItem, ApiCategory } from '@gridfinity/shared';
import * as libraryService from '../services/library.service.js';

export async function listLibraries(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const activeOnly = req.query.active === 'true';
    const libraries = await libraryService.getAllLibraries(activeOnly);

    const body: ApiListResponse<ApiLibrary> = { data: libraries };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

export async function getLibrary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const library = await libraryService.getLibraryById(req.params.id);

    const body: ApiResponse<ApiLibrary> = { data: library };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

export async function listLibraryItems(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters = {
      category: req.query.category as string | undefined,
      width: req.query.width ? Number(req.query.width) : undefined,
      height: req.query.height ? Number(req.query.height) : undefined,
    };

    const items = await libraryService.getLibraryItems(req.params.libraryId, filters);

    const body: ApiListResponse<ApiLibraryItem> = { data: items };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

export async function getLibraryItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await libraryService.getLibraryItemById(
      req.params.libraryId,
      req.params.itemId,
    );

    const body: ApiResponse<ApiLibraryItem> = { data: item };
    res.json(body);
  } catch (err) {
    next(err);
  }
}

export async function listCategories(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await libraryService.getAllCategories();

    const body: ApiListResponse<ApiCategory> = { data: categories };
    res.json(body);
  } catch (err) {
    next(err);
  }
}
