import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import { replaceFileHandler } from './userStls.controller.js';
import { config } from '../config.js';
import type { Request, Response, NextFunction } from 'express';
import type { UploadRow } from '../services/userStls.service.js';

// Same derivation the controller uses, so "old path === new path" comparisons
// in these tests reflect reality rather than a hardcoded string mismatch.
const STL_PATH = path.join(config.USER_STL_DIR, 'global', 'part-1.stl');
const LEGACY_3MF_PATH = path.join(config.USER_STL_DIR, 'global', 'part-1.3mf');

const mocks = vi.hoisted(() => ({
  getUploadById: vi.fn(),
  resetToPending: vi.fn(),
  processUpload: vi.fn(),
  unlink: vi.fn(),
  rename: vi.fn(),
  clientExecute: vi.fn(),
  callOrder: [] as string[],
}));

vi.mock('../services/userStls.service.js', () => ({
  getUploadById: mocks.getUploadById,
  resetToPending: mocks.resetToPending,
}));

vi.mock('../services/stlProcessing.service.js', () => ({
  processUpload: mocks.processUpload,
  getImageOutputDir: vi.fn().mockReturnValue('/fake/images'),
}));

vi.mock('../db/connection.js', () => ({
  client: { execute: mocks.clientExecute },
}));

vi.mock('fs/promises', () => ({
  default: {
    unlink: (...args: unknown[]) => { mocks.callOrder.push('unlink'); return mocks.unlink(...args); },
    rename: (...args: unknown[]) => { mocks.callOrder.push('rename'); return mocks.rename(...args); },
  },
}));

function makeRow(overrides: Partial<UploadRow> = {}): UploadRow {
  return {
    id: 'part-1',
    userId: null,
    name: 'Part',
    originalFilename: 'part.stl',
    filePath: STL_PATH,
    imageUrl: null,
    perspImageUrls: null,
    gridX: null,
    gridY: null,
    gridZ: null,
    visibility: 'private',
    status: 'ready',
    errorMessage: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.callOrder = [];
  mocks.rename.mockResolvedValue(undefined);
  mocks.unlink.mockResolvedValue(undefined);
  mocks.clientExecute.mockResolvedValue(undefined);
  mocks.resetToPending.mockResolvedValue(undefined);
  mocks.processUpload.mockResolvedValue(undefined);
});

describe('replaceFileHandler', () => {
  it('rejects a non-.stl replacement without touching the original file', async () => {
    mocks.getUploadById.mockResolvedValue(makeRow());
    const req = {
      params: { id: 'part-1' },
      file: { originalname: 'model.3mf', path: '/tmp/upload-xyz' },
    } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    await replaceFileHandler(req, res, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    // Only the rejected temp upload is cleaned up — the original part file
    // must never be touched for a rejected replacement.
    expect(mocks.unlink).toHaveBeenCalledTimes(1);
    expect(mocks.unlink).toHaveBeenCalledWith('/tmp/upload-xyz');
    expect(mocks.rename).not.toHaveBeenCalled();
    expect(mocks.clientExecute).not.toHaveBeenCalled();
  });

  it('leaves the original file intact when the rename fails', async () => {
    mocks.getUploadById.mockResolvedValue(makeRow());
    mocks.rename.mockRejectedValue(new Error('EXDEV: cross-device link not permitted'));
    const req = {
      params: { id: 'part-1' },
      file: { originalname: 'model.stl', path: '/tmp/upload-xyz' },
    } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    await replaceFileHandler(req, res, next as NextFunction);

    expect(next).toHaveBeenCalled();
    // The original part file must never be unlinked when the rename failed.
    expect(mocks.unlink).not.toHaveBeenCalled();
    expect(mocks.clientExecute).not.toHaveBeenCalled();
  });

  it('writes the replacement before removing the old file, and updates the row', async () => {
    // Simulate a legacy row whose stored path has a different extension
    // than the new upload will get, so the old file needs an explicit unlink.
    mocks.getUploadById.mockResolvedValue(makeRow({ filePath: LEGACY_3MF_PATH }));
    const req = {
      params: { id: 'part-1' },
      file: { originalname: 'model.stl', path: '/tmp/upload-xyz' },
    } as unknown as Request;
    const res = makeRes();
    const next = vi.fn();

    await replaceFileHandler(req, res, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(mocks.rename).toHaveBeenCalledWith('/tmp/upload-xyz', STL_PATH);
    expect(mocks.unlink).toHaveBeenCalledWith(LEGACY_3MF_PATH);
    // Old file removal must happen only after the new file is safely in place.
    expect(mocks.callOrder).toEqual(['rename', 'unlink']);
    expect(mocks.clientExecute).toHaveBeenCalled();
    expect(mocks.resetToPending).toHaveBeenCalledWith(expect.anything(), 'part-1');
  });

  it('does not unlink anything when the new path equals the old path', async () => {
    // The common case: both old and new are `${id}.stl` at the same
    // uploadDir, so fs.rename's overwrite already replaces the old file.
    mocks.getUploadById.mockResolvedValue(makeRow()); // filePath already ".../part-1.stl"
    const req = {
      params: { id: 'part-1' },
      file: { originalname: 'model.stl', path: '/tmp/upload-xyz' },
    } as unknown as Request;

    await replaceFileHandler(req, makeRes(), vi.fn() as NextFunction);

    expect(mocks.rename).toHaveBeenCalled();
    expect(mocks.unlink).not.toHaveBeenCalled();
  });
});
