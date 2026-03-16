import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { ShadowboxLibrarySection } from './ShadowboxLibrarySection';

vi.mock('../api/shadowboxes.api', () => ({
  fetchShadowboxes: vi.fn().mockResolvedValue([
    { id: 'abc-123', name: 'screwdriver', gridX: 2, gridY: 3, status: 'ready', createdAt: 'now', thicknessMm: 8 },
    { id: 'def-456', name: 'pending-tool', gridX: 1, gridY: 1, status: 'pending', createdAt: 'now', thicknessMm: 5 },
  ]),
  deleteShadowbox: vi.fn().mockResolvedValue(undefined),
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, children);

describe('ShadowboxLibrarySection', () => {
  it('renders section header', async () => {
    render(createElement(ShadowboxLibrarySection, null), { wrapper });
    expect(await screen.findByText(/My Shadowboxes/i)).toBeInTheDocument();
  });

  it('renders ready items', async () => {
    render(createElement(ShadowboxLibrarySection, null), { wrapper });
    expect(await screen.findByText('screwdriver')).toBeInTheDocument();
  });

  it('shows pending indicator for in-progress items', async () => {
    render(createElement(ShadowboxLibrarySection, null), { wrapper });
    expect(await screen.findByText('pending-tool')).toBeInTheDocument();
  });

  it('renders a link to create new shadowbox', async () => {
    render(createElement(ShadowboxLibrarySection, null), { wrapper });
    const link = await screen.findByRole('link', { name: /new shadowbox/i });
    expect(link).toHaveAttribute('href', '/shadowbox/new');
  });
});
