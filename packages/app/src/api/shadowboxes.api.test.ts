import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { fetchShadowboxes, deleteShadowbox } from './shadowboxes.api';

beforeEach(() => mockFetch.mockReset());

describe('fetchShadowboxes', () => {
  it('returns parsed array', async () => {
    const mockData = [{ id: 'abc', name: 'tool', gridX: 2, gridY: 3, status: 'ready', createdAt: 'now', thicknessMm: 8 }];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockData });
    const result = await fetchShadowboxes();
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/shadowboxes', expect.any(Object));
  });
});

describe('deleteShadowbox', () => {
  it('calls DELETE endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    await deleteShadowbox('abc-123');
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/shadowboxes/abc-123', expect.objectContaining({ method: 'DELETE' }));
  });
});
