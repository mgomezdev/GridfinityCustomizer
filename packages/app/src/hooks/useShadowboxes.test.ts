import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useShadowboxesQuery } from './useShadowboxes';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ getAccessToken: () => 'mock-token', isAuthenticated: true }),
}));

vi.mock('../api/shadowboxes.api', () => ({
  fetchShadowboxes: vi.fn().mockResolvedValue([
    { id: 'abc', name: 'screwdriver', gridX: 2, gridY: 3, status: 'ready', createdAt: 'now', thicknessMm: 8 },
  ]),
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, children);

describe('useShadowboxesQuery', () => {
  it('returns shadowboxes list', async () => {
    const { result } = renderHook(() => useShadowboxesQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name).toBe('screwdriver');
  });
});
