import { describe, it, expect, afterEach } from 'vitest';
import { rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import sharp from 'sharp';
import { AppError } from '@gridfinity/shared';
import { config } from '../config.js';
import { processAndSaveImage, deleteImage } from './image.service.js';

const TEST_SUBDIR = 'test-image-service';

afterEach(async () => {
  await rm(resolve(config.IMAGE_DIR, TEST_SUBDIR), { recursive: true, force: true });
});

describe('processAndSaveImage', () => {
  it('processes a small valid PNG', async () => {
    const png = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
    }).png().toBuffer();

    const result = await processAndSaveImage(png, TEST_SUBDIR);
    expect(result.filePath).toContain(TEST_SUBDIR);
    await deleteImage(join(TEST_SUBDIR, result.filePath.split('/').pop()!));
  });

  it('rejects an image whose decoded dimensions exceed the pixel limit, even though the compressed file is tiny', async () => {
    // A solid-color PNG compresses to a few KB no matter the dimensions, so
    // this file is well under MAX_INPUT_SIZE — only a pixel-count guard at
    // decode time can catch it before it balloons into a huge allocation.
    const oversized = await sharp({
      create: { width: 9000, height: 9000, channels: 3, background: { r: 10, g: 20, b: 30 } },
    }).png().toBuffer();
    expect(oversized.length).toBeLessThan(1024 * 1024); // sanity: tiny on disk

    await expect(processAndSaveImage(oversized, TEST_SUBDIR)).rejects.toThrow(AppError);
    await expect(processAndSaveImage(oversized, TEST_SUBDIR)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
