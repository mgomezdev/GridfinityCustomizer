import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { ShadowboxEditorPage } from './ShadowboxEditorPage';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ getAccessToken: () => 'mock-token', isAuthenticated: true }),
}));

const mockNavigate = vi.fn();
vi.mock('../utils/navigate', () => ({
  navigate: (...args: unknown[]) => mockNavigate(...args),
}));

const mockGenerate = vi.fn();
vi.mock('../api/shadowboxes.api', () => ({
  generateShadowbox: (...args: unknown[]) => mockGenerate(...args),
}));

const locationState = {
  shadowboxId: 'uuid-1',
  svgPath: 'M -5 -5 L 5 -5 L 5 5 L -5 5 Z',
  widthMm: 10,
  heightMm: 10,
  scaleMmPerPx: 0.1,
  thicknessMm: 8,
  name: 'test-tool',
};

beforeEach(() => {
  sessionStorage.setItem('shadowbox-edit-uuid-1', JSON.stringify(locationState));
  Object.defineProperty(window, 'location', {
    value: { search: '?id=uuid-1', href: '' },
    writable: true,
  });
  mockGenerate.mockReset();
  mockNavigate.mockReset();
});

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, children);

describe('ShadowboxEditorPage', () => {
  it('renders SVG canvas with control points', () => {
    render(createElement(ShadowboxEditorPage), { wrapper });
    expect(screen.getByRole('img', { name: /shadowbox preview/i })).toBeInTheDocument();
  });

  it('shows tolerance and stackable controls', () => {
    render(createElement(ShadowboxEditorPage), { wrapper });
    expect(screen.getByLabelText(/tolerance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/stackable/i)).toBeInTheDocument();
  });

  it('calls generateShadowbox and navigates on save', async () => {
    mockGenerate.mockResolvedValueOnce({
      id: 'uuid-1', gridX: 2, gridY: 3, status: 'ready',
      name: 'test-tool', createdAt: 'now', thicknessMm: 8
    });

    render(createElement(ShadowboxEditorPage), { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ shadowboxId: 'uuid-1' }),
      'mock-token',
    ));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });
});
