import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('../src/config.js', () => ({
  config: { SHADOWBOX_SIDECAR_URL: 'http://mock-sidecar:5001' },
}));

import { processImage, generateShadowbox } from '../src/services/shadowboxSidecar.service.js';

describe('shadowboxSidecar.service', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('processImage sends multipart and returns camelCase result', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        svg_path: 'M 0 0 L 10 0 Z',
        width_mm: 38.4,
        height_mm: 22.1,
        scale_mm_per_px: 0.14,
      }),
    });

    const formData = new FormData();
    formData.append('image', new Blob(['fake'], { type: 'image/jpeg' }));
    formData.append('thickness_mm', '8');

    const result = await processImage(formData);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://mock-sidecar:5001/process-image',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toEqual({
      svgPath: 'M 0 0 L 10 0 Z',
      widthMm: 38.4,
      heightMm: 22.1,
      scaleMmPerPx: 0.14,
    });
  });

  it('generateShadowbox sends JSON and returns camelCase result', async () => {
    const fakeBase64 = Buffer.from('fake-stl').toString('base64');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stl_base64: fakeBase64, grid_x: 2, grid_y: 3 }),
    });

    const result = await generateShadowbox({
      svgPath: 'M 0 0 Z',
      thicknessMm: 8,
      rotationDeg: 0,
      toleranceMm: 0.4,
      stackable: false,
    });

    expect(result).toEqual({
      stlBase64: fakeBase64,
      gridX: 2,
      gridY: 3,
    });
  });

  it('throws SidecarError when sidecar returns non-ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'no red square found' }),
    });

    const formData = new FormData();
    await expect(processImage(formData)).rejects.toThrow('no red square found');
  });
});
